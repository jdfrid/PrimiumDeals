import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import bcrypt from 'bcryptjs';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.join(__dirname, '../data');
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

import { initDatabase, prepare } from './config/database.js';
import routes from './routes/index.js';
import scheduler from './services/scheduler.js';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../../frontend/dist')));
app.use('/api', routes);
app.get('*', (req, res) => res.sendFile(path.join(__dirname, '../../frontend/dist/index.html')));

async function initializeAdmin() {
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@example.com';
  const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';
  const existingAdmin = prepare('SELECT id FROM users WHERE email = ?').get(adminEmail);
  if (!existingAdmin) {
    const hashedPassword = await bcrypt.hash(adminPassword, 10);
    prepare('INSERT INTO users (email, password, name, role) VALUES (?, ?, ?, ?)').run(adminEmail, hashedPassword, 'Administrator', 'admin');
    console.log(`✅ Admin user created: ${adminEmail}`);
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

async function start() {
  try {
    await initDatabase();
    await initializeAdmin();
    initializeCategories();
    initializeDefaultRule();
    scheduler.init();
    app.listen(PORT, () => {
      console.log(`🚀 Server running on http://localhost:${PORT}`);
      console.log(`📊 Admin panel: http://localhost:${PORT}/admin`);
      console.log(`🛍️ Public site: http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

start();
