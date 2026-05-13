import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import bcrypt from 'bcryptjs';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// Determine data directory - try persistent disk first, then fallback
function getDataDir() {
  const persistentPath = '/app/backend/data';
  const localPath = path.join(__dirname, '../data');
  
  // In production, try persistent disk first
  if (process.env.NODE_ENV === 'production') {
    try {
      if (fs.existsSync(persistentPath)) {
        return persistentPath;
      }
      // Try to create it (will work if disk is mounted)
      fs.mkdirSync(persistentPath, { recursive: true });
      return persistentPath;
    } catch (e) {
      console.log('⚠️ Persistent disk not available, using local storage');
      // Fall back to project directory
      const fallbackPath = path.join(__dirname, '../data');
      if (!fs.existsSync(fallbackPath)) fs.mkdirSync(fallbackPath, { recursive: true });
      return fallbackPath;
    }
  }
  
  // Local development
  if (!fs.existsSync(localPath)) fs.mkdirSync(localPath, { recursive: true });
  return localPath;
}

const dataDir = getDataDir();
console.log(`📂 Data directory: ${dataDir}`);

import { initDatabase, prepare, getDb, saveDatabase } from './config/database.js';
import { bootstrapEmptyDatabaseWithSamples } from './services/sampleDealsSeed.js';
import routes from './routes/index.js';
import scheduler from './services/scheduler.js';
import { recoverStuckVideoJobs } from './services/tiktok/tiktokEngine.js';
import { recoverStuckCreativeJobs } from './services/creative/creativeVideoEngine.js';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());
// Register API before static so POST /api/* never hits the SPA or a stray file under dist/.
app.use('/api', routes);

const distDir = path.join(__dirname, '../../frontend/dist');

app.use(express.static(distDir));

/**
 * Public storefront uses index.html; admin UI is a separate SPA (admin.html) so routing cannot bleed.
 */
app.get('*', (req, res) => {
  res.set({
    'Cache-Control': 'no-store, private, max-age=0',
    Pragma: 'no-cache'
  });
  const p = req.path;
  const spaFile =
    p === '/admin' || p.startsWith('/admin/')
      ? 'admin.html'
      : 'index.html';
  res.sendFile(path.join(distDir, spaFile));
});

async function initializeAdmin() {
  const adminEmail = process.env.ADMIN_EMAIL || 'jdfrid@gmail.com';
  const defaultPassword = '12345678';
  
  // Check if admin exists
  const existingAdmin = prepare('SELECT id FROM users WHERE email = ?').get(adminEmail);
  if (!existingAdmin) {
    // Only create admin if doesn't exist
    const hashedPassword = await bcrypt.hash(defaultPassword, 10);
    prepare('INSERT INTO users (email, password, name, role) VALUES (?, ?, ?, ?)').run(adminEmail, hashedPassword, 'Administrator', 'admin');
    console.log(`✅ Admin user created: ${adminEmail} (default password: ${defaultPassword})`);
  } else {
    // Admin exists - DON'T reset password on every restart!
    console.log(`✅ Admin user exists: ${adminEmail}`);
  }
}

function initializeCategories() {
  const cats = [
    { name: 'Watches', name_he: 'שעונים', ebay_category_id: '31387', icon: '⌚' },
    { name: 'Handbags', name_he: 'תיקים', ebay_category_id: '169291', icon: '👜' },
    { name: 'Jewelry', name_he: 'תכשיטים', ebay_category_id: '281', icon: '💎' },
    { name: 'Sunglasses', name_he: 'משקפי שמש', ebay_category_id: '79720', icon: '🕶️' },
    { name: 'Accessories', name_he: 'אקססוריס', ebay_category_id: '4250', icon: '✨' }
  ];
  for (const cat of cats) {
    const existing = prepare('SELECT id FROM categories WHERE name = ?').get(cat.name);
    if (!existing) prepare('INSERT INTO categories (name, name_he, ebay_category_id, icon) VALUES (?, ?, ?, ?)').run(cat.name, cat.name_he, cat.ebay_category_id, cat.icon);
  }
}

function initializeDefaultRule() {
  const existing = prepare('SELECT id FROM query_rules LIMIT 1').get();
  if (!existing) {
    prepare('INSERT INTO query_rules (name, keywords, ebay_category_ids, min_price, max_price, min_discount, schedule_cron, is_active) VALUES (?, ?, ?, ?, ?, ?, ?, ?)').run('Luxury Items $500-$1000', 'luxury watch, designer handbag, gold jewelry, premium sunglasses', '31387,169291,281,79720', 500, 1000, 30, '0 0 * * *', 1);
    console.log('✅ Default query rule created');
  }
}

async function initializeSampleDeals() {
  const result = await bootstrapEmptyDatabaseWithSamples({ prepare, getDb, saveDatabase });
  if (!result.skipped && (result.mode === 'synthetic_search' || result.mode === 'synthetic_topup')) {
    console.warn(
      '💡 Configure eBay API (EBAY_APP_ID, EBAY_CERT_ID, EBAY_CAMPAIGN_ID) so new sample deals use real /itm/ listing URLs instead of search pages.'
    );
  }
}

/** Backfill discount_percent when NULL so public API filter does not drop rows. */
function repairDealDiscountPercents() {
  try {
    prepare(`
      UPDATE deals SET discount_percent =
        CAST(ROUND(((original_price - current_price) * 100.0) / original_price) AS REAL)
      WHERE discount_percent IS NULL
        AND original_price IS NOT NULL AND original_price > 0
        AND current_price IS NOT NULL
        AND original_price > current_price
    `).run();
  } catch (e) {
    console.warn('repairDealDiscountPercents:', e.message || e);
  }
}

async function runDeferredInit() {
  await initializeAdmin();
  initializeCategories();
  initializeDefaultRule();
  repairDealDiscountPercents();
  await initializeSampleDeals();
  scheduler.init();
  console.log('✅ Deferred init (admin seed, scheduler) finished');
}

async function start() {
  try {
    await initDatabase();
    try {
      recoverStuckVideoJobs();
    } catch (e) {
      console.warn('recoverStuckVideoJobs skipped:', e.message || e);
    }
    try {
      recoverStuckCreativeJobs(45);
    } catch (e) {
      console.warn('recoverStuckCreativeJobs skipped:', e.message || e);
    }

    try {
      await runDeferredInit();
    } catch (e) {
      console.error('❌ Deferred init failed — deals/admin seed may be incomplete:', e);
    }

    app.listen(PORT, '0.0.0.0', () => {
      console.log(`🚀 Server listening on 0.0.0.0:${PORT}`);
      console.log(`📊 Admin: /admin  ·  Health: /api/health`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

start();
