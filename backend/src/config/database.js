import initSqlJs from 'sql.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Determine data directory - try persistent disk first, then fallback
function getDataDir() {
  const persistentPath = '/app/backend/data';
  const localPath = path.join(__dirname, '../../data');
  
  if (process.env.NODE_ENV === 'production') {
    try {
      if (fs.existsSync(persistentPath)) return persistentPath;
      fs.mkdirSync(persistentPath, { recursive: true });
      return persistentPath;
    } catch (e) {
      const fallbackPath = path.join(__dirname, '../../data');
      if (!fs.existsSync(fallbackPath)) fs.mkdirSync(fallbackPath, { recursive: true });
      return fallbackPath;
    }
  }
  
  if (!fs.existsSync(localPath)) fs.mkdirSync(localPath, { recursive: true });
  return localPath;
}

const dataDir = getDataDir();
const dbPath = path.join(dataDir, 'deals.db');
console.log(`📁 Database path: ${dbPath}`);

let db = null;

export async function initDatabase() {
  const SQL = await initSqlJs();
  
  // Load existing database or create new one
  if (fs.existsSync(dbPath)) {
    const buffer = fs.readFileSync(dbPath);
    db = new SQL.Database(buffer);
  } else {
    db = new SQL.Database();
  }

  // Initialize tables
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      name TEXT NOT NULL,
      role TEXT DEFAULT 'viewer' CHECK(role IN ('admin', 'editor', 'viewer')),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL,
      name_he TEXT,
      ebay_category_id TEXT,
      icon TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS deals (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ebay_item_id TEXT UNIQUE NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      image_url TEXT,
      original_price REAL,
      current_price REAL NOT NULL,
      discount_percent REAL,
      currency TEXT DEFAULT 'USD',
      seller_name TEXT,
      seller_rating REAL,
      condition TEXT,
      ebay_url TEXT NOT NULL,
      category_id INTEGER,
      is_active INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (category_id) REFERENCES categories(id)
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS query_rules (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      keywords TEXT,
      ebay_category_ids TEXT,
      min_price REAL,
      max_price REAL,
      min_discount REAL DEFAULT 30,
      schedule_cron TEXT DEFAULT '0 0 * * *',
      is_active INTEGER DEFAULT 1,
      last_run DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS query_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      rule_id INTEGER,
      status TEXT,
      items_found INTEGER DEFAULT 0,
      items_added INTEGER DEFAULT 0,
      error_message TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (rule_id) REFERENCES query_rules(id)
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS providers (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      enabled INTEGER DEFAULT 0,
      settings TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Click tracking table
  db.run(`
    CREATE TABLE IF NOT EXISTS clicks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      deal_id INTEGER,
      ip_address TEXT,
      user_agent TEXT,
      referer TEXT,
      ebay_url TEXT,
      deal_title TEXT,
      deal_price REAL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (deal_id) REFERENCES deals(id)
    )
  `);

  // Site settings table
  db.run(`
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
  
  // Contact messages table
  db.run(`
    CREATE TABLE IF NOT EXISTS contact_messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT,
      email TEXT,
      subject TEXT,
      message TEXT,
      ip_address TEXT,
      is_read INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Affiliate earnings/transactions table
  db.run(`
    CREATE TABLE IF NOT EXISTS affiliate_transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      transaction_id TEXT UNIQUE,
      transaction_date DATETIME,
      item_id TEXT,
      item_title TEXT,
      item_price REAL,
      quantity INTEGER DEFAULT 1,
      commission_percent REAL,
      commission_amount REAL,
      currency TEXT DEFAULT 'USD',
      status TEXT DEFAULT 'pending',
      is_paid INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Newsletter subscribers table
  db.run(`
    CREATE TABLE IF NOT EXISTS subscribers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      name TEXT,
      preferences TEXT DEFAULT '{}',
      source TEXT DEFAULT 'website',
      is_active INTEGER DEFAULT 1,
      confirmed INTEGER DEFAULT 0,
      confirm_token TEXT,
      unsubscribe_token TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Conversions/UTM tracking table
  db.run(`
    CREATE TABLE IF NOT EXISTS conversions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      type TEXT NOT NULL,
      utm_source TEXT,
      utm_medium TEXT,
      utm_campaign TEXT,
      utm_term TEXT,
      utm_content TEXT,
      gclid TEXT,
      value REAL DEFAULT 0,
      item_id TEXT,
      landing_page TEXT,
      ip_address TEXT,
      user_agent TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Social media posts tracking
  db.run(`
    CREATE TABLE IF NOT EXISTS social_posts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      deal_id INTEGER NOT NULL,
      platform TEXT NOT NULL,
      post_id TEXT,
      posted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (deal_id) REFERENCES deals(id)
    )
  `);

  // Marketing banners
  db.run(`
    CREATE TABLE IF NOT EXISTS banners (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      deal_id INTEGER NOT NULL,
      banner_id TEXT UNIQUE NOT NULL,
      size TEXT NOT NULL,
      style TEXT NOT NULL,
      html_content TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (deal_id) REFERENCES deals(id)
    )
  `);

  // Telegram channels/groups for posting
  db.run(`
    CREATE TABLE IF NOT EXISTS telegram_channels (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      channel_id TEXT UNIQUE NOT NULL,
      description TEXT,
      is_active INTEGER DEFAULT 1,
      post_count INTEGER DEFAULT 0,
      last_post_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
  
  // Add source column to deals table if not exists
  try {
    db.run(`ALTER TABLE deals ADD COLUMN source TEXT DEFAULT 'ebay'`);
    console.log('✅ Added source column to deals table');
  } catch (e) {
    // Column already exists
  }

  // Add source_item_id column to deals table if not exists (for Banggood product IDs)
  try {
    db.run(`ALTER TABLE deals ADD COLUMN source_item_id TEXT`);
    console.log('✅ Added source_item_id column to deals table');
  } catch (e) {
    // Column already exists
  }

  // Create unique index on source_item_id to prevent duplicates
  try {
    db.run(`CREATE UNIQUE INDEX IF NOT EXISTS idx_deals_source_item_id ON deals(source_item_id) WHERE source_item_id IS NOT NULL AND source_item_id != ''`);
    console.log('✅ Created unique index on source_item_id');
  } catch (e) {
    // Index already exists or can't create (duplicates exist)
    console.log('⚠️ Could not create unique index on source_item_id (duplicates may exist)');
  }

  // Populate source_item_id from ebay_item_id for existing records
  try {
    db.run(`UPDATE deals SET source_item_id = ebay_item_id WHERE source_item_id IS NULL OR source_item_id = ''`);
  } catch (e) {
    // Ignore
  }

  // Initialize default settings if not exist
  const defaultSettings = [
    ['contact_email', 'jdfrid@gmail.com'],
    ['site_name', 'Premium Deals'],
    ['min_discount_display', '10'],
    ['deals_per_page', '50'],
    ['banggood_enabled', 'false'],
    ['banggood_app_key', ''],
    ['banggood_app_secret', '']
  ];
  for (const [key, value] of defaultSettings) {
    const existing = db.exec(`SELECT key FROM settings WHERE key = '${key}'`);
    if (existing.length === 0 || existing[0].values.length === 0) {
      db.run(`INSERT OR IGNORE INTO settings (key, value) VALUES ('${key}', '${value}')`);
    }
  }

  // Initialize default providers
  const defaultProviders = [
    { id: 'ebay', name: 'eBay', enabled: true },
    { id: 'banggood', name: 'Banggood', enabled: false }
  ];
  for (const provider of defaultProviders) {
    const existing = db.exec(`SELECT id FROM providers WHERE id = '${provider.id}'`);
    if (existing.length === 0 || existing[0].values.length === 0) {
      db.run(`INSERT OR IGNORE INTO providers (id, name, enabled, settings) VALUES ('${provider.id}', '${provider.name}', ${provider.enabled ? 1 : 0}, '{}')`);
    }
  }

  saveDatabase();
  console.log('✅ Database initialized');
  return db;
}

export function saveDatabase() {
  if (db) {
    const data = db.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(dbPath, buffer);
  }
}

export function getDb() {
  return db;
}

// Helper functions to make queries easier
export function prepare(sql) {
  return {
    get: (...params) => {
      const stmt = db.prepare(sql);
      stmt.bind(params);
      if (stmt.step()) {
        const row = stmt.getAsObject();
        stmt.free();
        return row;
      }
      stmt.free();
      return null;
    },
    all: (...params) => {
      const results = [];
      const stmt = db.prepare(sql);
      stmt.bind(params);
      while (stmt.step()) {
        results.push(stmt.getAsObject());
      }
      stmt.free();
      return results;
    },
    run: (...params) => {
      db.run(sql, params);
      saveDatabase();
      return { 
        lastInsertRowid: db.exec("SELECT last_insert_rowid()")[0]?.values[0][0],
        changes: db.getRowsModified()
      };
    }
  };
}

export default { initDatabase, getDb, prepare, saveDatabase };
