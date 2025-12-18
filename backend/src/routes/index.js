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

// Reset admin password (GET for easy access)
router.get('/auth/reset-admin', async (req, res) => {
  try {
    const bcrypt = await import('bcryptjs');
    const email = 'jdfrid@gmail.com';
    const password = '12345678';
    const hashedPassword = await bcrypt.default.hash(password, 10);
    
    console.log('🔐 Resetting admin...');
    
    // Delete ALL existing admins
    const deleteResult = prepare('DELETE FROM users WHERE role = ?').run('admin');
    console.log(`Deleted ${deleteResult.changes} existing admins`);
    
    // Create new admin
    const insertResult = prepare('INSERT INTO users (email, password, name, role) VALUES (?, ?, ?, ?)').run(
      email, hashedPassword, 'Administrator', 'admin'
    );
    console.log(`Created admin with ID: ${insertResult.lastInsertRowid}`);
    
    // Verify it was created
    const user = prepare('SELECT id, email, role FROM users WHERE email = ?').get(email);
    console.log('Admin user:', user);
    
    res.json({ 
      success: true,
      message: 'Admin created!', 
      email,
      password,
      userId: user?.id,
      loginUrl: '/admin'
    });
  } catch (error) {
    console.error('Reset admin error:', error);
    res.status(500).json({ error: 'Failed to reset admin: ' + error.message });
  }
});

// Debug: Check users in database
router.get('/auth/check-users', (req, res) => {
  try {
    const users = prepare('SELECT id, email, name, role FROM users').all();
    res.json({ count: users.length, users });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Also support POST
router.post('/auth/reset-admin', async (req, res) => {
  try {
    const bcrypt = await import('bcryptjs');
    const email = 'jdfrid@gmail.com';
    const password = '12345678';
    const hashedPassword = await bcrypt.default.hash(password, 10);
    
    prepare('DELETE FROM users WHERE role = ?').run('admin');
    prepare('INSERT INTO users (email, password, name, role) VALUES (?, ?, ?, ?)').run(
      email, hashedPassword, 'Administrator', 'admin'
    );
    
    res.json({ success: true, message: 'Admin created!', email, password });
  } catch (error) {
    console.error('Reset admin error:', error);
    res.status(500).json({ error: 'Failed to reset admin: ' + error.message });
  }
});
router.get('/public/deals', dealsController.getPublicDeals);
router.get('/public/categories', categoriesController.getPublicCategories);

// Clear all deals to refresh with correct URLs
router.get('/debug/clear-deals', authenticateToken, (req, res) => {
  try {
    const result = prepare('DELETE FROM deals').run();
    res.json({ 
      success: true, 
      message: `Deleted ${result.changes} deals. Now run Query Rule to fetch fresh deals.`,
      deleted: result.changes
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Click tracking - redirect through this to log clicks
router.get('/track/click/:dealId', (req, res) => {
  try {
    const { dealId } = req.params;
    const deal = prepare('SELECT * FROM deals WHERE id = ?').get(dealId);
    
    if (!deal) {
      return res.status(404).json({ error: 'Deal not found' });
    }
    
    // Get IP address (handle proxies)
    const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() 
            || req.headers['x-real-ip'] 
            || req.socket?.remoteAddress 
            || 'unknown';
    
    const userAgent = req.headers['user-agent'] || 'unknown';
    const referer = req.headers['referer'] || req.headers['referrer'] || 'direct';
    
    // Log the click
    prepare(`
      INSERT INTO clicks (deal_id, ip_address, user_agent, referer, ebay_url, deal_title, deal_price)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      deal.id,
      ip,
      userAgent.substring(0, 500), // Limit length
      referer.substring(0, 500),
      deal.ebay_url,
      deal.title,
      deal.current_price
    );
    
    console.log(`📊 Click tracked: Deal #${dealId} from ${ip}`);
    
    // Redirect to eBay
    res.redirect(deal.ebay_url);
  } catch (error) {
    console.error('Click tracking error:', error);
    // Still redirect even if tracking fails
    const deal = prepare('SELECT ebay_url FROM deals WHERE id = ?').get(req.params.dealId);
    if (deal?.ebay_url) {
      res.redirect(deal.ebay_url);
    } else {
      res.status(500).json({ error: 'Failed to track click' });
    }
  }
});

// Public: Submit contact form
router.post('/public/contact', (req, res) => {
  try {
    const { name, email, subject, message } = req.body;
    
    if (!name || !email || !message) {
      return res.status(400).json({ error: 'Name, email and message are required' });
    }
    
    const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() 
            || req.headers['x-real-ip'] 
            || req.socket?.remoteAddress 
            || 'unknown';
    
    // Save to database
    prepare(`
      INSERT INTO contact_messages (name, email, subject, message, ip_address)
      VALUES (?, ?, ?, ?, ?)
    `).run(name, email, subject || 'General', message, ip);
    
    console.log(`📧 New contact message from ${email}`);
    
    res.json({ success: true, message: 'Message sent successfully' });
  } catch (error) {
    console.error('Contact form error:', error);
    res.status(500).json({ error: 'Failed to send message' });
  }
});

// Admin: Get contact messages
router.get('/admin/messages', authenticateToken, (req, res) => {
  try {
    const messages = prepare(`
      SELECT * FROM contact_messages 
      ORDER BY created_at DESC 
      LIMIT 100
    `).all();
    res.json(messages);
  } catch (error) {
    res.status(500).json({ error: 'Failed to get messages' });
  }
});

// Admin: Mark message as read
router.patch('/admin/messages/:id/read', authenticateToken, (req, res) => {
  try {
    prepare('UPDATE contact_messages SET is_read = 1 WHERE id = ?').run(req.params.id);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update message' });
  }
});

// Admin: Delete message
router.delete('/admin/messages/:id', authenticateToken, (req, res) => {
  try {
    prepare('DELETE FROM contact_messages WHERE id = ?').run(req.params.id);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete message' });
  }
});

// Admin: Check EPN API status
router.get('/admin/earnings/status', authenticateToken, async (req, res) => {
  try {
    const { default: epnService } = await import('../services/epnService.js');
    res.json({ 
      configured: epnService.isConfigured(),
      accountSid: process.env.EPN_ACCOUNT_SID ? `✓ Set (${process.env.EPN_ACCOUNT_SID.substring(0,8)}...)` : '✗ Missing',
      authToken: process.env.EPN_AUTH_TOKEN ? '✓ Set' : '✗ Missing'
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Admin: Test EPN API connection
router.get('/admin/earnings/test', authenticateToken, async (req, res) => {
  try {
    const accountSid = process.env.EPN_ACCOUNT_SID;
    const authToken = process.env.EPN_AUTH_TOKEN;
    
    if (!accountSid || !authToken) {
      return res.json({ error: 'Missing EPN credentials', accountSid: !!accountSid, authToken: !!authToken });
    }

    const today = new Date().toISOString().split('T')[0];
    const monthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    
    // Use Basic Auth header instead of credentials in URL
    const testUrl = `https://api.partner.ebay.com/Mediapartners/${accountSid}/Reports/ebay_partner_transaction_detail.json?STATUS=ALL&START_DATE=${monthAgo}&END_DATE=${today}&date_type=update_date`;
    const basicAuth = Buffer.from(`${accountSid}:${authToken}`).toString('base64');
    
    console.log('🔍 Testing EPN API:', testUrl);
    
    const response = await fetch(testUrl, {
      headers: { 
        'Authorization': `Basic ${basicAuth}`,
        'Accept': 'application/json' 
      }
    });
    
    const responseText = await response.text();
    console.log('📊 EPN Response:', response.status, responseText.substring(0, 500));
    
    res.json({
      status: response.status,
      statusText: response.statusText,
      url: testUrl,
      response: responseText.substring(0, 2000),
      success: response.ok
    });
  } catch (error) {
    res.json({ error: error.message });
  }
});

// Admin: Get affiliate transactions/earnings
router.get('/admin/earnings', authenticateToken, (req, res) => {
  try {
    const { days = 30, page = 1, limit = 50 } = req.query;
    const offset = (page - 1) * limit;
    
    const transactions = prepare(`
      SELECT * FROM affiliate_transactions 
      WHERE transaction_date > datetime('now', '-${parseInt(days)} days')
      ORDER BY transaction_date DESC
      LIMIT ? OFFSET ?
    `).all(parseInt(limit), offset);
    
    const stats = prepare(`
      SELECT 
        COUNT(*) as total_transactions,
        SUM(commission_amount) as total_earnings,
        SUM(CASE WHEN is_paid = 1 THEN commission_amount ELSE 0 END) as paid_earnings,
        SUM(CASE WHEN is_paid = 0 THEN commission_amount ELSE 0 END) as pending_earnings,
        SUM(item_price * quantity) as total_sales
      FROM affiliate_transactions
      WHERE transaction_date > datetime('now', '-${parseInt(days)} days')
    `).get();
    
    const byMonth = prepare(`
      SELECT 
        strftime('%Y-%m', transaction_date) as month,
        COUNT(*) as transactions,
        SUM(commission_amount) as earnings
      FROM affiliate_transactions
      GROUP BY strftime('%Y-%m', transaction_date)
      ORDER BY month DESC
      LIMIT 12
    `).all();
    
    res.json({ transactions, stats, byMonth });
  } catch (error) {
    console.error('Earnings error:', error);
    res.status(500).json({ error: 'Failed to get earnings' });
  }
});

// Admin: Sync earnings from eBay Partner Network (manual trigger)
router.post('/admin/earnings/sync', authenticateToken, async (req, res) => {
  try {
    // Dynamically import the EPN service
    const { default: epnService } = await import('../services/epnService.js');
    
    if (!epnService.isConfigured()) {
      return res.json({ 
        success: false, 
        message: 'eBay Partner Network API not configured',
        instructions: [
          '1. Go to https://partner.ebay.com → Tools → API',
          '2. Get your Account SID and Auth Token',
          '3. Add EPN_ACCOUNT_SID and EPN_AUTH_TOKEN to Render environment'
        ]
      });
    }

    const { days = 30 } = req.body;
    const transactions = await epnService.fetchTransactions();
    
    let added = 0, updated = 0;
    
    for (const tx of transactions) {
      const existing = prepare('SELECT id FROM affiliate_transactions WHERE transaction_id = ?').get(tx.transaction_id);
      
      if (existing) {
        prepare(`
          UPDATE affiliate_transactions 
          SET item_title = ?, item_price = ?, commission_amount = ?, status = ?, is_paid = ?, updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `).run(tx.item_title, tx.item_price, tx.commission_amount, tx.status, tx.is_paid ? 1 : 0, existing.id);
        updated++;
      } else {
        prepare(`
          INSERT INTO affiliate_transactions 
          (transaction_id, transaction_date, item_id, item_title, item_price, quantity, commission_percent, commission_amount, currency, status, is_paid)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          tx.transaction_id, tx.transaction_date, tx.item_id, tx.item_title, 
          tx.item_price, tx.quantity, tx.commission_percent, tx.commission_amount,
          tx.currency, tx.status, tx.is_paid ? 1 : 0
        );
        added++;
      }
    }

    console.log(`✅ EPN Sync: ${added} added, ${updated} updated`);
    res.json({ 
      success: true, 
      message: `Synced ${transactions.length} transactions`,
      added,
      updated
    });
  } catch (error) {
    console.error('EPN sync error:', error);
    res.status(500).json({ error: 'Failed to sync: ' + error.message });
  }
});

// Admin: Manually add transaction (for testing or manual entry)
router.post('/admin/earnings/add', authenticateToken, (req, res) => {
  try {
    const { transaction_id, transaction_date, item_id, item_title, item_price, quantity, commission_percent, commission_amount, status, is_paid } = req.body;
    
    prepare(`
      INSERT INTO affiliate_transactions 
      (transaction_id, transaction_date, item_id, item_title, item_price, quantity, commission_percent, commission_amount, status, is_paid)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      transaction_id || `MANUAL-${Date.now()}`,
      transaction_date || new Date().toISOString(),
      item_id,
      item_title,
      item_price,
      quantity || 1,
      commission_percent,
      commission_amount,
      status || 'confirmed',
      is_paid ? 1 : 0
    );
    
    res.json({ success: true, message: 'Transaction added' });
  } catch (error) {
    console.error('Add transaction error:', error);
    res.status(500).json({ error: 'Failed to add transaction' });
  }
});

// Admin: Get settings
router.get('/admin/settings', authenticateToken, (req, res) => {
  try {
    const settingsArray = prepare('SELECT key, value FROM settings').all();
    const settings = {};
    for (const s of settingsArray) {
      settings[s.key] = s.value;
    }
    res.json(settings);
  } catch (error) {
    res.status(500).json({ error: 'Failed to get settings' });
  }
});

// Admin: Update settings
router.put('/admin/settings', authenticateToken, requireRole('admin'), (req, res) => {
  try {
    const settings = req.body;
    for (const [key, value] of Object.entries(settings)) {
      prepare(`
        INSERT INTO settings (key, value, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP)
        ON CONFLICT(key) DO UPDATE SET value = ?, updated_at = CURRENT_TIMESTAMP
      `).run(key, value, value);
    }
    
    // Update providers table when banggood_enabled changes
    if (settings.banggood_enabled !== undefined) {
      const enabled = settings.banggood_enabled === 'true' ? 1 : 0;
      prepare('UPDATE providers SET enabled = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(enabled, 'banggood');
      console.log(`🛒 Banggood provider ${enabled ? 'enabled' : 'disabled'}`);
    }
    
    res.json({ success: true, message: 'Settings saved' });
  } catch (error) {
    console.error('Settings error:', error);
    res.status(500).json({ error: 'Failed to save settings' });
  }
});

// Admin: View click analytics
router.get('/analytics/clicks', authenticateToken, (req, res) => {
  try {
    const { days = 7, limit = 100 } = req.query;
    
    const clicks = prepare(`
      SELECT c.*, d.title as deal_title, d.current_price, d.image_url
      FROM clicks c
      LEFT JOIN deals d ON c.deal_id = d.id
      WHERE c.created_at > datetime('now', '-${parseInt(days)} days')
      ORDER BY c.created_at DESC
      LIMIT ?
    `).all(parseInt(limit));
    
    const stats = prepare(`
      SELECT 
        COUNT(*) as total_clicks,
        COUNT(DISTINCT ip_address) as unique_visitors,
        COUNT(DISTINCT deal_id) as deals_clicked
      FROM clicks
      WHERE created_at > datetime('now', '-${parseInt(days)} days')
    `).get();
    
    const topDeals = prepare(`
      SELECT deal_id, deal_title, COUNT(*) as clicks
      FROM clicks
      WHERE created_at > datetime('now', '-${parseInt(days)} days')
      GROUP BY deal_id
      ORDER BY clicks DESC
      LIMIT 10
    `).all();
    
    res.json({ clicks, stats, topDeals });
  } catch (error) {
    console.error('Analytics error:', error);
    res.status(500).json({ error: 'Failed to get analytics' });
  }
});

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

// Providers
router.get('/providers', authenticateToken, requireRole('admin'), (req, res) => {
  const providers = prepare('SELECT * FROM providers').all();
  res.json(providers);
});

router.post('/providers', authenticateToken, requireRole('admin'), (req, res) => {
  try {
    const { providers } = req.body;
    for (const provider of providers) {
      const existing = prepare('SELECT id FROM providers WHERE id = ?').get(provider.id);
      if (existing) {
        prepare('UPDATE providers SET name = ?, enabled = ?, settings = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
          .run(provider.name, provider.enabled ? 1 : 0, JSON.stringify(provider), provider.id);
      } else {
        prepare('INSERT INTO providers (id, name, enabled, settings) VALUES (?, ?, ?, ?)')
          .run(provider.id, provider.name, provider.enabled ? 1 : 0, JSON.stringify(provider));
      }
    }
    res.json({ message: 'Providers saved successfully' });
  } catch (error) {
    console.error('Save providers error:', error);
    res.status(500).json({ error: 'Failed to save providers' });
  }
});

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

// Restore recently deactivated deals (admin only)
router.post('/deals/restore-recent', authenticateToken, requireRole('admin'), (req, res) => {
  try {
    const { hours = 24 } = req.body;
    // Reactivate deals that were deactivated in the last X hours
    const result = prepare(`
      UPDATE deals 
      SET is_active = 1, updated_at = CURRENT_TIMESTAMP 
      WHERE is_active = 0 
      AND updated_at > datetime('now', '-${parseInt(hours)} hours')
    `).run();
    
    console.log(`♻️ Restored ${result.changes} recently deactivated deals`);
    res.json({ 
      message: `Restored ${result.changes} deals that were deactivated in the last ${hours} hours`,
      restored: result.changes 
    });
  } catch (error) {
    console.error('Restore deals error:', error);
    res.status(500).json({ error: 'Failed to restore deals' });
  }
});

// Get inactive deals count (for admin dashboard)
router.get('/deals/inactive-count', authenticateToken, requireRole('admin'), (req, res) => {
  try {
    const total = prepare('SELECT COUNT(*) as count FROM deals WHERE is_active = 0').get();
    const recent = prepare("SELECT COUNT(*) as count FROM deals WHERE is_active = 0 AND updated_at > datetime('now', '-24 hours')").get();
    res.json({ 
      totalInactive: total.count,
      recentlyDeactivated: recent.count 
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Debug Banggood API
router.get('/debug/banggood-test', async (req, res) => {
  try {
    const banggoodService = (await import('../services/banggoodService.js')).default;
    
    // Get credentials
    const appKey = banggoodService.appKey;
    const appSecret = banggoodService.appSecret;
    
    res.json({
      configured: !!(appKey && appSecret),
      appKey: appKey ? appKey.substring(0, 5) + '...' : 'NOT SET',
      appSecretSet: !!appSecret,
      message: appKey && appSecret ? 'Credentials configured, testing API...' : 'Missing credentials'
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Debug Banggood search with detailed logging
router.get('/debug/banggood-search', async (req, res) => {
  try {
    const { keyword = 'phone' } = req.query;
    const banggoodService = (await import('../services/banggoodService.js')).default;
    
    // Try to get token first
    let tokenResult = null;
    let tokenError = null;
    try {
      const token = await banggoodService.getAccessToken();
      tokenResult = token ? 'Got token: ' + token.substring(0, 10) + '...' : 'No token';
    } catch (e) {
      tokenError = e.message;
    }
    
    // Try search
    let searchResults = [];
    let searchError = null;
    try {
      searchResults = await banggoodService.searchProducts({ keywords: keyword, limit: 5 });
    } catch (e) {
      searchError = e.message;
    }
    
    res.json({
      keyword,
      tokenResult,
      tokenError,
      searchError,
      resultsCount: searchResults.length,
      results: searchResults.slice(0, 3)
    });
  } catch (error) {
    res.status(500).json({ error: error.message, stack: error.stack });
  }
});

// Clean duplicate deals
router.post('/admin/clean-duplicates', authenticateToken, requireRole('admin'), (req, res) => {
  try {
    // Find duplicates based on title similarity and price
    const duplicates = prepare(`
      SELECT d1.id, d1.title, d1.ebay_item_id, d1.current_price
      FROM deals d1
      INNER JOIN deals d2 ON d1.title = d2.title 
        AND d1.current_price = d2.current_price 
        AND d1.id > d2.id
      WHERE d1.is_active = 1
    `).all();
    
    // Also find exact ebay_item_id duplicates
    const exactDuplicates = prepare(`
      SELECT d1.id, d1.title, d1.ebay_item_id
      FROM deals d1
      INNER JOIN deals d2 ON d1.ebay_item_id = d2.ebay_item_id 
        AND d1.ebay_item_id != ''
        AND d1.id > d2.id
      WHERE d1.is_active = 1
    `).all();
    
    const allDuplicateIds = [...new Set([...duplicates.map(d => d.id), ...exactDuplicates.map(d => d.id)])];
    
    // Deactivate duplicates (keep the older ones)
    let removed = 0;
    for (const id of allDuplicateIds) {
      prepare('UPDATE deals SET is_active = 0 WHERE id = ?').run(id);
      removed++;
    }
    
    console.log(`🧹 Cleaned ${removed} duplicate deals`);
    res.json({ 
      message: `Cleaned ${removed} duplicate deals`,
      duplicatesFound: allDuplicateIds.length,
      removed
    });
  } catch (error) {
    console.error('Clean duplicates error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get duplicate count
router.get('/admin/duplicates-count', authenticateToken, requireRole('admin'), (req, res) => {
  try {
    const titleDuplicates = prepare(`
      SELECT COUNT(*) as count FROM (
        SELECT title, current_price, COUNT(*) as cnt 
        FROM deals WHERE is_active = 1 
        GROUP BY title, current_price 
        HAVING cnt > 1
      )
    `).get();
    
    const idDuplicates = prepare(`
      SELECT COUNT(*) as count FROM (
        SELECT ebay_item_id, COUNT(*) as cnt 
        FROM deals WHERE is_active = 1 AND ebay_item_id != ''
        GROUP BY ebay_item_id 
        HAVING cnt > 1
      )
    `).get();
    
    res.json({ 
      titleDuplicates: titleDuplicates.count,
      idDuplicates: idDuplicates.count
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Database status check
router.get('/debug/db-status', (req, res) => {
  try {
    const deals = prepare('SELECT COUNT(*) as count FROM deals').get();
    const activeDeals = prepare('SELECT COUNT(*) as count FROM deals WHERE is_active = 1').get();
    const categories = prepare('SELECT COUNT(*) as count FROM categories').get();
    const sampleDeals = prepare('SELECT id, title, ebay_item_id, ebay_url, discount_percent FROM deals LIMIT 5').all();
    
    res.json({
      totalDeals: deals.count,
      activeDeals: activeDeals.count,
      categories: categories.count,
      sampleDeals
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// API Debug - see all rules and logs (public for debugging)
router.get('/debug/api-usage', (req, res) => {
  try {
    const rules = prepare('SELECT id, name, schedule_cron, is_active, last_run FROM query_rules').all();
    const logsToday = prepare("SELECT COUNT(*) as count FROM query_logs WHERE date(created_at) = date('now')").get();
    const logsTotal = prepare("SELECT COUNT(*) as count FROM query_logs").get();
    const recentLogs = prepare(`
      SELECT l.created_at, l.status, l.items_found, l.items_added, l.error_message, r.name as rule_name 
      FROM query_logs l 
      LEFT JOIN query_rules r ON l.rule_id = r.id 
      ORDER BY l.created_at DESC 
      LIMIT 50
    `).all();
    
    // Calculate expected daily API calls
    let expectedDailyCalls = 0;
    for (const rule of rules) {
      if (rule.is_active) {
        const cron = rule.schedule_cron;
        if (cron === '0 * * * *') expectedDailyCalls += 24; // Every hour
        else if (cron === '0 */6 * * *') expectedDailyCalls += 4; // Every 6 hours
        else if (cron === '0 */12 * * *') expectedDailyCalls += 2; // Every 12 hours
        else expectedDailyCalls += 1; // Daily or other
      }
    }
    
    res.json({
      summary: {
        apiCallsToday: logsToday.count,
        totalApiCallsEver: logsTotal.count,
        activeRules: rules.filter(r => r.is_active).length,
        expectedDailyCalls,
        ebayDailyLimit: 5000
      },
      rules,
      recentLogs
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
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
    
    // Use sample ID for tracking
    const ebayItemId = 'sample-' + Date.now() + '-' + i;
    
    // Create search URL that will find real products on eBay
    const searchQuery = encodeURIComponent(`${brand} ${product}`);
    const ebayUrl = `https://www.ebay.com/sch/i.html?_nkw=${searchQuery}&_sacat=0&LH_BIN=1&mkcid=1&mkrid=711-53200-19255-0&siteid=0&campid=${campaignId}&toolid=10001&mkevt=1`;
    const imageUrl = `https://images.unsplash.com/${image}?w=400`;
    
    prepare('INSERT INTO deals (ebay_item_id, title, image_url, original_price, current_price, discount_percent, currency, condition, ebay_url, category_id, is_active) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').run(
      ebayItemId, title, imageUrl, originalPrice, currentPrice, discount, 'USD', 'New', ebayUrl, categoryId, 1
    );
    added++;
  }

  res.json({ message: `Added ${added} sample deals with campaign ID ${campaignId}`, added, campaignId });
});

export default router;
