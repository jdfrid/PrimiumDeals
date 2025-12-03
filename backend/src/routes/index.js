import express from 'express';
import { authenticateToken, requireRole } from '../middleware/auth.js';
import * as authController from '../controllers/authController.js';
import * as usersController from '../controllers/usersController.js';
import * as dealsController from '../controllers/dealsController.js';
import * as categoriesController from '../controllers/categoriesController.js';
import * as rulesController from '../controllers/rulesController.js';
import { prepare } from '../config/database.js';

const router = express.Router();

// Public
router.post('/auth/login', authController.login);
router.get('/public/deals', dealsController.getPublicDeals);
router.get('/public/categories', categoriesController.getPublicCategories);

// Protected
router.get('/auth/profile', authenticateToken, authController.getProfile);
router.put('/auth/password', authenticateToken, authController.updatePassword);

// Users
router.get('/users', authenticateToken, requireRole('admin'), usersController.getUsers);
router.get('/users/:id', authenticateToken, requireRole('admin'), usersController.getUser);
router.post('/users', authenticateToken, requireRole('admin'), usersController.createUser);
router.put('/users/:id', authenticateToken, requireRole('admin'), usersController.updateUser);
router.delete('/users/:id', authenticateToken, requireRole('admin'), usersController.deleteUser);

// Deals
router.get('/deals', authenticateToken, dealsController.getDeals);
router.get('/deals/:id', authenticateToken, dealsController.getDeal);
router.post('/deals', authenticateToken, requireRole('admin', 'editor'), dealsController.createDeal);
router.put('/deals/:id', authenticateToken, requireRole('admin', 'editor'), dealsController.updateDeal);
router.delete('/deals/:id', authenticateToken, requireRole('admin'), dealsController.deleteDeal);
router.patch('/deals/:id/toggle', authenticateToken, requireRole('admin', 'editor'), dealsController.toggleDealActive);

// Categories
router.get('/categories', authenticateToken, categoriesController.getCategories);
router.get('/categories/:id', authenticateToken, categoriesController.getCategory);
router.post('/categories', authenticateToken, requireRole('admin', 'editor'), categoriesController.createCategory);
router.put('/categories/:id', authenticateToken, requireRole('admin', 'editor'), categoriesController.updateCategory);
router.delete('/categories/:id', authenticateToken, requireRole('admin'), categoriesController.deleteCategory);

// Rules
router.get('/rules', authenticateToken, requireRole('admin'), rulesController.getRules);
router.get('/rules/:id', authenticateToken, requireRole('admin'), rulesController.getRule);
router.post('/rules', authenticateToken, requireRole('admin'), rulesController.createRule);
router.put('/rules/:id', authenticateToken, requireRole('admin'), rulesController.updateRule);
router.delete('/rules/:id', authenticateToken, requireRole('admin'), rulesController.deleteRule);
router.post('/rules/:id/execute', authenticateToken, requireRole('admin'), rulesController.executeRule);
router.get('/rules/:id/logs', authenticateToken, requireRole('admin'), rulesController.getRuleLogs);
router.get('/logs', authenticateToken, requireRole('admin'), rulesController.getAllLogs);

// Stats
router.get('/stats', authenticateToken, (req, res) => {
  const stats = {
    totalDeals: prepare('SELECT COUNT(*) as count FROM deals WHERE is_active = 1').get().count,
    totalCategories: prepare('SELECT COUNT(*) as count FROM categories').get().count,
    activeRules: prepare('SELECT COUNT(*) as count FROM query_rules WHERE is_active = 1').get().count,
    avgDiscount: Math.round(prepare('SELECT AVG(discount_percent) as avg FROM deals WHERE is_active = 1').get().avg || 0),
    recentDeals: prepare("SELECT COUNT(*) as count FROM deals WHERE created_at > datetime('now', '-24 hours')").get().count,
    totalUsers: prepare('SELECT COUNT(*) as count FROM users').get().count
  };
  res.json(stats);
});

// Seed sample deals
router.post('/seed-deals', authenticateToken, requireRole('admin'), (req, res) => {
  const campaignId = process.env.EBAY_CAMPAIGN_ID || '5339122678';
  
  const brands = {
    Watches: ['Rolex', 'Omega', 'TAG Heuer', 'Breitling', 'Cartier', 'Patek Philippe', 'Audemars Piguet', 'IWC', 'Panerai', 'Hublot', 'Longines', 'Tissot', 'Seiko Presage', 'Tudor', 'Zenith', 'Jaeger-LeCoultre', 'Vacheron Constantin', 'Chopard', 'Bvlgari', 'Ulysse Nardin'],
    Handbags: ['Louis Vuitton', 'Gucci', 'Chanel', 'Hermès', 'Prada', 'Dior', 'Fendi', 'Balenciaga', 'Bottega Veneta', 'Saint Laurent', 'Celine', 'Loewe', 'Givenchy', 'Valentino', 'Burberry', 'Coach', 'Michael Kors', 'Kate Spade', 'Tory Burch', 'MCM'],
    Jewelry: ['Cartier', 'Tiffany & Co', 'Bvlgari', 'Van Cleef & Arpels', 'Harry Winston', 'Chopard', 'Graff', 'David Yurman', 'Boucheron', 'Piaget', 'Mikimoto', 'Pomellato', 'Roberto Coin', 'John Hardy', 'Lagos', 'Ippolita', 'Marco Bicego', 'Temple St. Clair', 'Stephen Webster', 'Messika'],
    Sunglasses: ['Ray-Ban', 'Prada', 'Gucci', 'Dior', 'Tom Ford', 'Versace', 'Dolce & Gabbana', 'Burberry', 'Chanel', 'Oakley', 'Persol', 'Maui Jim', 'Oliver Peoples', 'Gentle Monster', 'Celine', 'Saint Laurent', 'Fendi', 'Miu Miu', 'Bvlgari', 'Cartier'],
    Accessories: ['Hermès', 'Louis Vuitton', 'Gucci', 'Montblanc', 'Goyard', 'Berluti', 'Bottega Veneta', 'Salvatore Ferragamo', 'Dunhill', 'Tom Ford', 'Burberry', 'Prada', 'Fendi', 'Bally', 'Coach', 'MCM', 'Tumi', 'Smythson', 'Ettinger', 'Valextra']
  };

  const products = {
    Watches: ['Submariner', 'Speedmaster', 'Carrera', 'Navitimer', 'Santos', 'Royal Oak', 'Nautilus', 'Portugieser', 'Luminor', 'Big Bang', 'Master Collection', 'Seamaster', 'Datejust', 'Day-Date', 'GMT Master II', 'Daytona', 'Explorer', 'Aquanaut', 'Overseas', 'Constellation'],
    Handbags: ['Neverfull', 'Speedy', 'Marmont', 'Classic Flap', 'Birkin', 'Kelly', 'Galleria', 'City Bag', 'Jodie', 'Loulou', 'Luggage', 'Puzzle', 'Antigona', 'Rockstud', 'TB Bag', 'Tabby', 'Parker', 'Kira', 'Fleming', 'Stark'],
    Jewelry: ['Love Bracelet', 'Juste un Clou', 'Trinity Ring', 'Tennis Bracelet', 'Pearl Necklace', 'Diamond Studs', 'Serpenti', 'Alhambra', 'B.Zero1', 'Possession', 'Cable Bracelet', 'Akoya Pearls', 'Nudo Ring', 'Icon Ring', 'Caviar Collection', 'Rock Candy', 'Jaipur', 'Amulets', 'Thorn', 'Move'],
    Sunglasses: ['Aviator', 'Wayfarer', 'Clubmaster', 'Round', 'Cat Eye', 'Oversized', 'Pilot', 'Square', 'Butterfly', 'Shield', 'Geometric', 'Wraparound', 'Rectangle', 'Oval', 'Hexagonal', 'Browline', 'Sport', 'Rimless', 'Half Rim', 'Polarized'],
    Accessories: ['Silk Scarf', 'Leather Belt', 'Card Holder', 'Wallet', 'Tie', 'Cufflinks', 'Money Clip', 'Key Holder', 'Passport Cover', 'Briefcase', 'Weekend Bag', 'Backpack', 'Laptop Sleeve', 'Watch Roll', 'Jewelry Box', 'Pen', 'Notebook', 'Glasses Case', 'Gloves', 'Umbrella']
  };

  const images = {
    Watches: ['photo-1587836374828-4dbafa94cf0e', 'photo-1523275335684-37898b6baf30', 'photo-1522312346375-d1a52e2b99b8', 'photo-1524592094714-0f0654e20314', 'photo-1509048191080-d2984bad6ae5', 'photo-1533139502658-0198f920d8e8', 'photo-1614164185128-e4ec99c436d7', 'photo-1618220179428-22790b461013', 'photo-1612817159949-195b6eb9e31a', 'photo-1604242692760-2f7b0c26856d'],
    Handbags: ['photo-1584917865442-de89df76afd3', 'photo-1548036328-c9fa89d128fa', 'photo-1566150905458-1bf1fc113f0d', 'photo-1575032617751-6ddec2089882', 'photo-1590874103328-eac38a683ce7', 'photo-1594633312681-425c7b97ccd1', 'photo-1591561954557-26941169b49e', 'photo-1553062407-98eeb64c6a62', 'photo-1559563458-527698bf5295', 'photo-1606522754091-a3bbf9ad4cb3'],
    Jewelry: ['photo-1515562141207-7a88fb7ce338', 'photo-1599643478518-a784e5dc4c8f', 'photo-1605100804763-247f67b3557e', 'photo-1611591437281-460bfbe1220a', 'photo-1602173574767-37ac01994b2a', 'photo-1603561591411-07134e71a2a9', 'photo-1535632066927-ab7c9ab60908', 'photo-1617038260897-41a1f14a8ca0', 'photo-1601121141461-9d6647bca1ed', 'photo-1515377905703-c4788e51af15'],
    Sunglasses: ['photo-1572635196237-14b3f281503f', 'photo-1511499767150-a48a237f0083', 'photo-1577803645773-f96470509666', 'photo-1473496169904-658ba7c44d8a', 'photo-1508296695146-257a814070b4', 'photo-1574258495973-f010dfbb5371', 'photo-1606107557195-0e29a4b5b4aa', 'photo-1583394838336-acd977736f90', 'photo-1556306535-38febf6782e7', 'photo-1559070169-a3077159ee16'],
    Accessories: ['photo-1601924994987-69e26d50dc26', 'photo-1627123424574-724758594e93', 'photo-1608528577891-eb055944f2e7', 'photo-1606503825008-909a67e63c3d', 'photo-1590874103328-eac38a683ce7', 'photo-1553062407-98eeb64c6a62', 'photo-1585488763125-13e3d55ef2ed', 'photo-1611937663641-5cef5189d71b', 'photo-1548869206-93b036288d7e', 'photo-1603899122634-f086ca5f5ddd']
  };

  // Delete existing sample deals
  prepare("DELETE FROM deals WHERE ebay_item_id LIKE 'sample-%'").run();

  let added = 0;
  const categories = Object.keys(brands);
  
  for (let i = 0; i < 100; i++) {
    const category = categories[i % categories.length];
    const brandList = brands[category];
    const productList = products[category];
    const imageList = images[category];
    
    const brand = brandList[Math.floor(Math.random() * brandList.length)];
    const product = productList[Math.floor(Math.random() * productList.length)];
    const image = imageList[Math.floor(Math.random() * imageList.length)];
    
    const title = `${brand} ${product} ${['Premium', 'Luxury', 'Classic', 'Limited Edition', 'Vintage', 'New'][Math.floor(Math.random() * 6)]}`;
    const originalPrice = Math.floor(Math.random() * 9000) + 500;
    const discount = Math.floor(Math.random() * 20) + 30; // 30-50% discount
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

  res.json({ message: `Added ${added} sample deals with campaign ID ${campaignId}`, added, campaignId });
});

export default router;
