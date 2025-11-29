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

export default router;
