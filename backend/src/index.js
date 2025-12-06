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
  const adminEmail = process.env.ADMIN_EMAIL || 'jdfrid@gmail.com';
  const adminPassword = process.env.ADMIN_PASSWORD || '12345678';
  
  // Check if admin exists
  const existingAdmin = prepare('SELECT id FROM users WHERE email = ?').get(adminEmail);
  if (!existingAdmin) {
    const hashedPassword = await bcrypt.hash(adminPassword, 10);
    prepare('INSERT INTO users (email, password, name, role) VALUES (?, ?, ?, ?)').run(adminEmail, hashedPassword, 'Administrator', 'admin');
    console.log(`✅ Admin user created: ${adminEmail}`);
  } else {
    // Update password for existing admin
    const hashedPassword = await bcrypt.hash(adminPassword, 10);
    prepare('UPDATE users SET password = ? WHERE email = ?').run(hashedPassword, adminEmail);
    console.log(`✅ Admin password updated: ${adminEmail}`);
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

function initializeSampleDeals() {
  const existingDeals = prepare('SELECT COUNT(*) as count FROM deals').get();
  if (existingDeals.count > 0) return;

  console.log('📦 Adding sample deals...');
  const campaignId = process.env.EBAY_CAMPAIGN_ID || '5339122678';
  
  const brands = {
    Watches: ['Rolex', 'Omega', 'TAG Heuer', 'Breitling', 'Cartier', 'Patek Philippe', 'Audemars Piguet', 'IWC', 'Panerai', 'Hublot', 'Longines', 'Tissot', 'Tudor', 'Zenith', 'Chopard'],
    Handbags: ['Louis Vuitton', 'Gucci', 'Chanel', 'Hermès', 'Prada', 'Dior', 'Fendi', 'Balenciaga', 'Bottega Veneta', 'Saint Laurent', 'Celine', 'Loewe', 'Givenchy', 'Valentino', 'Burberry'],
    Jewelry: ['Cartier', 'Tiffany & Co', 'Bvlgari', 'Van Cleef & Arpels', 'Harry Winston', 'Chopard', 'David Yurman', 'Boucheron', 'Piaget', 'Mikimoto', 'Roberto Coin', 'John Hardy', 'Lagos', 'Ippolita', 'Messika'],
    Sunglasses: ['Ray-Ban', 'Prada', 'Gucci', 'Dior', 'Tom Ford', 'Versace', 'Dolce & Gabbana', 'Burberry', 'Chanel', 'Oakley', 'Persol', 'Maui Jim', 'Oliver Peoples', 'Gentle Monster', 'Celine'],
    Accessories: ['Hermès', 'Louis Vuitton', 'Gucci', 'Montblanc', 'Goyard', 'Berluti', 'Bottega Veneta', 'Salvatore Ferragamo', 'Dunhill', 'Tom Ford', 'Burberry', 'Prada', 'Fendi', 'Bally', 'Coach']
  };

  const products = {
    Watches: ['Submariner', 'Speedmaster', 'Carrera', 'Navitimer', 'Santos', 'Royal Oak', 'Nautilus', 'Portugieser', 'Luminor', 'Big Bang', 'Datejust', 'Day-Date', 'GMT Master', 'Daytona', 'Seamaster'],
    Handbags: ['Neverfull', 'Speedy', 'Marmont', 'Classic Flap', 'Birkin', 'Kelly', 'Galleria', 'City Bag', 'Jodie', 'Loulou', 'Luggage', 'Puzzle', 'Antigona', 'Rockstud', 'TB Bag'],
    Jewelry: ['Love Bracelet', 'Juste un Clou', 'Trinity Ring', 'Tennis Bracelet', 'Pearl Necklace', 'Diamond Studs', 'Serpenti', 'Alhambra', 'B.Zero1', 'Cable Bracelet', 'Icon Ring', 'Caviar Collection', 'Move', 'Possession', 'Clash'],
    Sunglasses: ['Aviator', 'Wayfarer', 'Clubmaster', 'Cat Eye', 'Oversized', 'Pilot', 'Square', 'Round', 'Shield', 'Geometric', 'Wraparound', 'Rectangle', 'Oval', 'Sport', 'Polarized'],
    Accessories: ['Silk Scarf', 'Leather Belt', 'Card Holder', 'Wallet', 'Tie', 'Cufflinks', 'Money Clip', 'Key Holder', 'Briefcase', 'Weekend Bag', 'Backpack', 'Watch Roll', 'Pen', 'Notebook', 'Gloves']
  };

  const images = {
    Watches: ['photo-1587836374828-4dbafa94cf0e', 'photo-1523275335684-37898b6baf30', 'photo-1522312346375-d1a52e2b99b8', 'photo-1524592094714-0f0654e20314', 'photo-1509048191080-d2984bad6ae5'],
    Handbags: ['photo-1584917865442-de89df76afd3', 'photo-1548036328-c9fa89d128fa', 'photo-1566150905458-1bf1fc113f0d', 'photo-1575032617751-6ddec2089882', 'photo-1590874103328-eac38a683ce7'],
    Jewelry: ['photo-1515562141207-7a88fb7ce338', 'photo-1599643478518-a784e5dc4c8f', 'photo-1605100804763-247f67b3557e', 'photo-1611591437281-460bfbe1220a', 'photo-1602173574767-37ac01994b2a'],
    Sunglasses: ['photo-1572635196237-14b3f281503f', 'photo-1511499767150-a48a237f0083', 'photo-1577803645773-f96470509666', 'photo-1473496169904-658ba7c44d8a', 'photo-1508296695146-257a814070b4'],
    Accessories: ['photo-1601924994987-69e26d50dc26', 'photo-1627123424574-724758594e93', 'photo-1608528577891-eb055944f2e7', 'photo-1606503825008-909a67e63c3d', 'photo-1585488763125-13e3d55ef2ed']
  };

  const categories = Object.keys(brands);
  let added = 0;
  
  for (let i = 0; i < 1000; i++) {
    const category = categories[i % categories.length];
    const brandList = brands[category];
    const productList = products[category];
    const imageList = images[category];
    
    const brand = brandList[Math.floor(Math.random() * brandList.length)];
    const product = productList[Math.floor(Math.random() * productList.length)];
    const image = imageList[Math.floor(Math.random() * imageList.length)];
    const suffix = ['Premium', 'Luxury', 'Classic', 'Limited Edition', 'Vintage', 'New'][Math.floor(Math.random() * 6)];
    
    const title = `${brand} ${product} ${suffix}`;
    const originalPrice = Math.floor(Math.random() * 9000) + 500;
    const discount = Math.floor(Math.random() * 20) + 30;
    const currentPrice = Math.floor(originalPrice * (1 - discount / 100));
    
    const cat = prepare('SELECT id FROM categories WHERE name = ?').get(category);
    const categoryId = cat ? cat.id : null;
    const ebayItemId = 'sample-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
    const baseUrl = 'https://www.ebay.com/sch/i.html?_nkw=' + encodeURIComponent(title);
    const ebayUrl = `${baseUrl}&mkcid=1&mkrid=711-53200-19255-0&siteid=0&campid=${campaignId}&toolid=10001&mkevt=1`;
    const imageUrl = `https://images.unsplash.com/${image}?w=400`;
    
    prepare('INSERT INTO deals (ebay_item_id, title, image_url, original_price, current_price, discount_percent, currency, condition, ebay_url, category_id, is_active) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').run(
      ebayItemId, title, imageUrl, originalPrice, currentPrice, discount, 'USD', 'New', ebayUrl, categoryId, 1
    );
    added++;
  }
  
  console.log(`✅ Added ${added} sample deals`);
}

async function start() {
  try {
    await initDatabase();
    await initializeAdmin();
    initializeCategories();
    initializeDefaultRule();
    initializeSampleDeals();
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
