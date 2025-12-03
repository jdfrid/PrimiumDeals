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
  
  const sampleDeals = [
    { title: 'Rolex Submariner Date 41mm Steel', originalPrice: 14500, currentPrice: 9800, discount: 32, image: 'https://images.unsplash.com/photo-1587836374828-4dbafa94cf0e?w=400', category: 'Watches' },
    { title: 'Omega Seamaster Professional 300M', originalPrice: 5200, currentPrice: 3400, discount: 35, image: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400', category: 'Watches' },
    { title: 'Louis Vuitton Neverfull MM Tote', originalPrice: 1960, currentPrice: 1290, discount: 34, image: 'https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=400', category: 'Handbags' },
    { title: 'Gucci GG Marmont Shoulder Bag', originalPrice: 2300, currentPrice: 1490, discount: 35, image: 'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=400', category: 'Handbags' },
    { title: 'Cartier Love Bracelet 18K Gold', originalPrice: 6900, currentPrice: 4600, discount: 33, image: 'https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=400', category: 'Jewelry' },
    { title: 'Tiffany & Co Diamond Pendant', originalPrice: 3200, currentPrice: 2100, discount: 34, image: 'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?w=400', category: 'Jewelry' },
    { title: 'Ray-Ban Aviator Classic Gold', originalPrice: 180, currentPrice: 115, discount: 36, image: 'https://images.unsplash.com/photo-1572635196237-14b3f281503f?w=400', category: 'Sunglasses' },
    { title: 'Prada PR 17WS Sunglasses', originalPrice: 420, currentPrice: 275, discount: 35, image: 'https://images.unsplash.com/photo-1511499767150-a48a237f0083?w=400', category: 'Sunglasses' },
    { title: 'Hermès Silk Scarf Carré 90', originalPrice: 450, currentPrice: 295, discount: 34, image: 'https://images.unsplash.com/photo-1601924994987-69e26d50dc26?w=400', category: 'Accessories' },
    { title: 'Montblanc Meisterstück Wallet', originalPrice: 530, currentPrice: 350, discount: 34, image: 'https://images.unsplash.com/photo-1627123424574-724758594e93?w=400', category: 'Accessories' },
  ];

  // First, delete existing sample deals
  prepare("DELETE FROM deals WHERE ebay_item_id LIKE 'sample-%'").run();

  let added = 0;
  for (const deal of sampleDeals) {
    const cat = prepare('SELECT id FROM categories WHERE name = ?').get(deal.category);
    const categoryId = cat ? cat.id : null;
    const ebayItemId = 'sample-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
    const baseUrl = 'https://www.ebay.com/sch/i.html?_nkw=' + encodeURIComponent(deal.title);
    const ebayUrl = `${baseUrl}&mkcid=1&mkrid=711-53200-19255-0&siteid=0&campid=${campaignId}&toolid=10001&mkevt=1`;
    
    prepare('INSERT INTO deals (ebay_item_id, title, image_url, original_price, current_price, discount_percent, currency, condition, ebay_url, category_id, is_active) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').run(
      ebayItemId, deal.title, deal.image, deal.originalPrice, deal.currentPrice, deal.discount, 'USD', 'New', ebayUrl, categoryId, 1
    );
    added++;
  }

  res.json({ message: `Added ${added} sample deals with campaign ID ${campaignId}`, added, campaignId });
});

export default router;
