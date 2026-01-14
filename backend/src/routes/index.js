import express from 'express';
import { authenticateToken, requireRole } from '../middleware/auth.js';
import * as authController from '../controllers/authController.js';
import * as usersController from '../controllers/usersController.js';
import * as dealsController from '../controllers/dealsController.js';
import * as categoriesController from '../controllers/categoriesController.js';
import * as rulesController from '../controllers/rulesController.js';
import { prepare, saveDatabase } from '../config/database.js';

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

// Validate and remove unavailable eBay items
router.post('/admin/validate-items', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    const ebayService = (await import('../services/ebayService.js')).default;
    const { limit = 50 } = req.body;
    
    // Get oldest checked active deals from eBay
    const deals = prepare(`
      SELECT id, ebay_item_id, source_item_id, title, source 
      FROM deals 
      WHERE is_active = 1 AND source = 'ebay' AND ebay_item_id != ''
      ORDER BY updated_at ASC 
      LIMIT ?
    `).all(parseInt(limit));
    
    if (deals.length === 0) {
      return res.json({ message: 'No eBay deals to validate', checked: 0, removed: 0 });
    }
    
    console.log(`🔍 Validating ${deals.length} eBay items...`);
    
    const itemIds = deals.map(d => d.ebay_item_id || d.source_item_id);
    const unavailable = await ebayService.checkItemsAvailability(itemIds, 5);
    
    // Remove unavailable items
    let removed = 0;
    for (const item of unavailable) {
      const deal = deals.find(d => (d.ebay_item_id === item.itemId || d.source_item_id === item.itemId));
      if (deal) {
        prepare('UPDATE deals SET is_active = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(deal.id);
        console.log(`🗑️ Removed unavailable: "${deal.title?.substring(0, 40)}..." (${item.reason})`);
        removed++;
      }
    }
    
    // Update checked timestamp for remaining items
    const checkedIds = deals.filter(d => !unavailable.some(u => u.itemId === d.ebay_item_id)).map(d => d.id);
    if (checkedIds.length > 0) {
      prepare(`UPDATE deals SET updated_at = CURRENT_TIMESTAMP WHERE id IN (${checkedIds.join(',')})`).run();
    }
    
    saveDatabase();
    
    res.json({
      message: `Validated ${deals.length} items, removed ${removed} unavailable`,
      checked: deals.length,
      removed,
      unavailableItems: unavailable.map(u => ({ itemId: u.itemId, reason: u.reason }))
    });
  } catch (error) {
    console.error('Validate items error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Check a single item availability
router.get('/admin/check-item/:dealId', authenticateToken, async (req, res) => {
  try {
    const ebayService = (await import('../services/ebayService.js')).default;
    const deal = prepare('SELECT * FROM deals WHERE id = ?').get(req.params.dealId);
    
    if (!deal) {
      return res.status(404).json({ error: 'Deal not found' });
    }
    
    if (deal.source !== 'ebay') {
      return res.json({ available: true, message: 'Only eBay items can be checked' });
    }
    
    const itemId = deal.ebay_item_id || deal.source_item_id;
    const result = await ebayService.checkItemAvailability(itemId);
    
    // If unavailable, deactivate the deal
    if (!result.available) {
      prepare('UPDATE deals SET is_active = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(deal.id);
      saveDatabase();
    }
    
    res.json({
      dealId: deal.id,
      title: deal.title,
      ...result,
      action: result.available ? 'none' : 'deactivated'
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// SEO ROUTES
// ============================================

// Dynamic Sitemap.xml
router.get('/sitemap.xml', (req, res) => {
  try {
    const baseUrl = 'https://dealsluxy.com';
    const today = new Date().toISOString().split('T')[0];
    
    // Brand pages for SEO
    const brands = [
      'rolex', 'louis-vuitton', 'gucci', 'omega', 'prada', 
      'chanel', 'cartier', 'hermes', 'tag-heuer', 'balenciaga'
    ];
    
    // Category pages for SEO
    const categoryPages = [
      'watches', 'handbags', 'jewelry', 'sunglasses', 'shoes', 'accessories', 'fragrances'
    ];
    
    // Get all active categories
    const categories = prepare(`
      SELECT c.id, c.name, MAX(d.updated_at) as last_updated
      FROM categories c
      LEFT JOIN deals d ON d.category_id = c.id AND d.is_active = 1
      GROUP BY c.id
      HAVING COUNT(d.id) > 0
    `).all();
    
    // Get recent deals for lastmod
    const recentDeal = prepare(`
      SELECT MAX(updated_at) as last_updated FROM deals WHERE is_active = 1
    `).get();
    
    let xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${baseUrl}/</loc>
    <lastmod>${new Date(recentDeal?.last_updated || Date.now()).toISOString().split('T')[0]}</lastmod>
    <changefreq>hourly</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>${baseUrl}/designer-sale</loc>
    <lastmod>${today}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.9</priority>
  </url>
  <url>
    <loc>${baseUrl}/luxury-watches-sale</loc>
    <lastmod>${today}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.9</priority>
  </url>
  <url>
    <loc>${baseUrl}/designer-bags-sale</loc>
    <lastmod>${today}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.9</priority>
  </url>`;

    // Add brand pages
    for (const brand of brands) {
      xml += `
  <url>
    <loc>${baseUrl}/brand/${brand}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.85</priority>
  </url>`;
    }

    // Add SEO category pages
    for (const catPage of categoryPages) {
      xml += `
  <url>
    <loc>${baseUrl}/category/${catPage}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.85</priority>
  </url>`;
    }

    // Add dynamic category pages from DB
    for (const cat of categories) {
      const slug = cat.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
      const lastmod = cat.last_updated ? new Date(cat.last_updated).toISOString().split('T')[0] : today;
      xml += `
  <url>
    <loc>${baseUrl}/category/${slug}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.8</priority>
  </url>`;
    }

    // Static pages
    xml += `
  <url>
    <loc>${baseUrl}/how-it-works</loc>
    <changefreq>monthly</changefreq>
    <priority>0.6</priority>
  </url>
  <url>
    <loc>${baseUrl}/terms</loc>
    <changefreq>monthly</changefreq>
    <priority>0.3</priority>
  </url>
  <url>
    <loc>${baseUrl}/contact</loc>
    <changefreq>monthly</changefreq>
    <priority>0.3</priority>
  </url>`;

    xml += `
</urlset>`;

    res.set('Content-Type', 'application/xml');
    res.send(xml);
  } catch (error) {
    console.error('Sitemap error:', error);
    res.status(500).send('Error generating sitemap');
  }
});

// Robots.txt
router.get('/robots.txt', (req, res) => {
  const robots = `User-agent: *
Allow: /
Disallow: /admin
Disallow: /api/admin
Disallow: /api/debug

Sitemap: https://dealsluxy.com/api/sitemap.xml
`;
  res.set('Content-Type', 'text/plain');
  res.send(robots);
});

// ============================================
// NEWSLETTER ROUTES
// ============================================

// Subscribe to newsletter (public)
router.post('/newsletter/subscribe', async (req, res) => {
  try {
    const { email, name, source = 'website', preferences = {} } = req.body;
    
    if (!email || !email.includes('@')) {
      return res.status(400).json({ error: 'Valid email is required' });
    }
    
    const crypto = await import('crypto');
    const confirmToken = crypto.randomBytes(32).toString('hex');
    const unsubscribeToken = crypto.randomBytes(32).toString('hex');
    
    // Check if already subscribed
    const existing = prepare('SELECT id, is_active FROM subscribers WHERE email = ?').get(email.toLowerCase());
    
    if (existing) {
      if (existing.is_active) {
        return res.json({ success: true, message: 'Already subscribed!', alreadySubscribed: true });
      } else {
        // Reactivate
        prepare('UPDATE subscribers SET is_active = 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(existing.id);
        return res.json({ success: true, message: 'Welcome back! Subscription reactivated.' });
      }
    }
    
    // New subscriber
    prepare(`
      INSERT INTO subscribers (email, name, preferences, source, confirm_token, unsubscribe_token)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(email.toLowerCase(), name || '', JSON.stringify(preferences), source, confirmToken, unsubscribeToken);
    
    console.log(`📧 New subscriber: ${email} from ${source}`);
    
    res.json({ 
      success: true, 
      message: 'Successfully subscribed! Check your email for confirmation.' 
    });
  } catch (error) {
    console.error('Subscribe error:', error);
    if (error.message?.includes('UNIQUE constraint')) {
      return res.json({ success: true, message: 'Already subscribed!' });
    }
    res.status(500).json({ error: 'Failed to subscribe' });
  }
});

// Unsubscribe (public)
router.get('/newsletter/unsubscribe/:token', (req, res) => {
  try {
    const { token } = req.params;
    const subscriber = prepare('SELECT id, email FROM subscribers WHERE unsubscribe_token = ?').get(token);
    
    if (!subscriber) {
      return res.status(404).send('<h1>Invalid unsubscribe link</h1>');
    }
    
    prepare('UPDATE subscribers SET is_active = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(subscriber.id);
    
    res.send(`
      <html>
        <head><title>Unsubscribed</title></head>
        <body style="font-family: sans-serif; text-align: center; padding: 50px;">
          <h1>You've been unsubscribed</h1>
          <p>You will no longer receive emails from Dealsluxy.</p>
          <p><a href="https://dealsluxy.com">Return to website</a></p>
        </body>
      </html>
    `);
  } catch (error) {
    res.status(500).send('Error processing request');
  }
});

// Get subscriber stats (admin)
router.get('/admin/newsletter/stats', authenticateToken, requireRole('admin'), (req, res) => {
  try {
    const total = prepare('SELECT COUNT(*) as count FROM subscribers').get();
    const active = prepare('SELECT COUNT(*) as count FROM subscribers WHERE is_active = 1').get();
    const today = prepare("SELECT COUNT(*) as count FROM subscribers WHERE date(created_at) = date('now')").get();
    const thisWeek = prepare("SELECT COUNT(*) as count FROM subscribers WHERE created_at > datetime('now', '-7 days')").get();
    
    const bySource = prepare(`
      SELECT source, COUNT(*) as count 
      FROM subscribers 
      WHERE is_active = 1 
      GROUP BY source 
      ORDER BY count DESC
    `).all();
    
    res.json({
      total: total.count,
      active: active.count,
      today: today.count,
      thisWeek: thisWeek.count,
      bySource
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get all subscribers (admin)
router.get('/admin/newsletter/subscribers', authenticateToken, requireRole('admin'), (req, res) => {
  try {
    const { page = 1, limit = 50, active } = req.query;
    const offset = (page - 1) * limit;
    
    let sql = 'SELECT id, email, name, source, is_active, created_at FROM subscribers';
    let countSql = 'SELECT COUNT(*) as count FROM subscribers';
    const params = [];
    
    if (active !== undefined) {
      sql += ' WHERE is_active = ?';
      countSql += ' WHERE is_active = ?';
      params.push(active === 'true' ? 1 : 0);
    }
    
    const total = prepare(countSql).get(...params);
    sql += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), offset);
    
    const subscribers = prepare(sql).all(...params);
    
    res.json({
      subscribers,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: total.count,
        pages: Math.ceil(total.count / limit)
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get today's new deals (public) - shows deals from last 24 hours
router.get('/deals/today', (req, res) => {
  try {
    const { limit = 50, hours = 24 } = req.query;
    
    // First try to get deals from today
    let deals = prepare(`
      SELECT 
        d.id, d.title, d.image_url, d.original_price, d.current_price, 
        d.discount_percent, d.currency, d.ebay_url, d.source, d.created_at,
        c.name as category_name, c.icon as category_icon
      FROM deals d
      LEFT JOIN categories c ON d.category_id = c.id
      WHERE d.is_active = 1 
        AND d.created_at >= datetime('now', '-' || ? || ' hours')
      ORDER BY d.created_at DESC, d.discount_percent DESC
      LIMIT ?
    `).all(parseInt(hours), parseInt(limit));
    
    // If no recent deals, show newest deals regardless of date
    if (deals.length === 0) {
      deals = prepare(`
        SELECT 
          d.id, d.title, d.image_url, d.original_price, d.current_price, 
          d.discount_percent, d.currency, d.ebay_url, d.source, d.created_at,
          c.name as category_name, c.icon as category_icon
        FROM deals d
        LEFT JOIN categories c ON d.category_id = c.id
        WHERE d.is_active = 1
        ORDER BY d.created_at DESC
        LIMIT ?
      `).all(parseInt(limit));
    }
    
    res.json({
      date: new Date().toISOString().split('T')[0],
      count: deals.length,
      deals,
      hours_range: parseInt(hours)
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get deals for social media posting (returns formatted content)
router.get('/deals/for-social', authenticateToken, (req, res) => {
  try {
    const { limit = 5, platform = 'all' } = req.query;
    
    // Get today's best deals that haven't been posted
    const deals = prepare(`
      SELECT 
        d.id, d.title, d.image_url, d.original_price, d.current_price, 
        d.discount_percent, d.ebay_url, d.source,
        c.name as category_name
      FROM deals d
      LEFT JOIN categories c ON d.category_id = c.id
      WHERE d.is_active = 1 
        AND d.discount_percent >= 30
        AND d.image_url IS NOT NULL
        AND date(d.created_at) >= date('now', '-1 day')
      ORDER BY d.discount_percent DESC
      LIMIT ?
    `).all(parseInt(limit));
    
    // Generate social media content for each deal
    const socialContent = deals.map(deal => {
      const trackingUrl = `https://dealsluxy.com/api/track/click/${deal.id}?utm_source=social&utm_medium=${platform}`;
      const savings = deal.original_price - deal.current_price;
      
      return {
        id: deal.id,
        image_url: deal.image_url,
        tracking_url: trackingUrl,
        
        // Twitter/X format (280 chars)
        twitter: `🔥 ${deal.discount_percent}% OFF!\n\n${deal.title.substring(0, 80)}...\n\n💰 $${deal.original_price.toFixed(0)} → $${deal.current_price.toFixed(0)}\n\n🛒 ${trackingUrl}\n\n#deals #luxury #sale`,
        
        // Instagram/Facebook format
        instagram: `🔥 DEAL ALERT: ${deal.discount_percent}% OFF!\n\n${deal.title}\n\n💰 Was: $${deal.original_price.toFixed(0)}\n✨ Now: $${deal.current_price.toFixed(0)}\n💵 You Save: $${savings.toFixed(0)}!\n\n🛒 Link in bio or visit dealsluxy.com\n\n#luxurydeals #designersale #fashiondeals #luxuryfashion #sale #discount #shopping #deals`,
        
        // Telegram format
        telegram: `🔥 <b>${deal.discount_percent}% OFF!</b>\n\n${deal.title}\n\n💰 <s>$${deal.original_price.toFixed(0)}</s> → <b>$${deal.current_price.toFixed(0)}</b>\n💵 Save $${savings.toFixed(0)}!\n\n<a href="${trackingUrl}">🛒 Get This Deal</a>`,
        
        // Pinterest format
        pinterest: {
          title: `${deal.discount_percent}% OFF - ${deal.title.substring(0, 100)}`,
          description: `Save $${savings.toFixed(0)}! Was $${deal.original_price.toFixed(0)}, now $${deal.current_price.toFixed(0)}. Shop luxury deals at Dealsluxy.`,
          link: trackingUrl
        }
      };
    });
    
    res.json({
      generated_at: new Date().toISOString(),
      platform,
      count: socialContent.length,
      posts: socialContent
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Generate HTML banner for a deal
router.get('/deals/:id/banner', (req, res) => {
  try {
    const deal = prepare(`
      SELECT d.*, c.name as category_name 
      FROM deals d 
      LEFT JOIN categories c ON d.category_id = c.id 
      WHERE d.id = ?
    `).get(req.params.id);
    
    if (!deal) {
      return res.status(404).json({ error: 'Deal not found' });
    }
    
    const savings = deal.original_price - deal.current_price;
    const trackingUrl = `https://dealsluxy.com/api/track/click/${deal.id}`;
    
    // Generate HTML banner
    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta property="og:title" content="${deal.discount_percent}% OFF - ${deal.title.substring(0, 60)}">
  <meta property="og:description" content="Save $${savings.toFixed(0)}! Was $${deal.original_price.toFixed(0)}, now $${deal.current_price.toFixed(0)}">
  <meta property="og:image" content="${deal.image_url}">
  <meta property="og:url" content="${trackingUrl}">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Inter', system-ui, sans-serif; }
    .banner {
      width: 1200px;
      height: 630px;
      background: linear-gradient(135deg, #f97316, #ef4444);
      display: flex;
      padding: 40px;
      color: white;
    }
    .image-container {
      width: 500px;
      height: 550px;
      background: white;
      border-radius: 20px;
      overflow: hidden;
      box-shadow: 0 20px 40px rgba(0,0,0,0.3);
    }
    .image-container img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
    .content {
      flex: 1;
      padding: 20px 40px;
      display: flex;
      flex-direction: column;
      justify-content: center;
    }
    .discount {
      font-size: 80px;
      font-weight: 900;
      line-height: 1;
      text-shadow: 0 4px 8px rgba(0,0,0,0.2);
    }
    .title {
      font-size: 28px;
      font-weight: 600;
      margin: 20px 0;
      line-height: 1.3;
    }
    .prices {
      display: flex;
      align-items: center;
      gap: 20px;
      margin: 20px 0;
    }
    .old-price {
      font-size: 32px;
      text-decoration: line-through;
      opacity: 0.7;
    }
    .new-price {
      font-size: 48px;
      font-weight: 900;
    }
    .savings {
      background: rgba(255,255,255,0.2);
      padding: 10px 20px;
      border-radius: 10px;
      font-size: 20px;
    }
    .logo {
      margin-top: auto;
      font-size: 24px;
      font-weight: 700;
      opacity: 0.9;
    }
  </style>
</head>
<body>
  <div class="banner">
    <div class="image-container">
      <img src="${deal.image_url}" alt="${deal.title}">
    </div>
    <div class="content">
      <div class="discount">${deal.discount_percent}% OFF</div>
      <div class="title">${deal.title.substring(0, 80)}${deal.title.length > 80 ? '...' : ''}</div>
      <div class="prices">
        <span class="old-price">$${deal.original_price.toFixed(0)}</span>
        <span class="new-price">$${deal.current_price.toFixed(0)}</span>
      </div>
      <div class="savings">💰 You Save $${savings.toFixed(0)}!</div>
      <div class="logo">🏷️ DEALSLUXY.COM</div>
    </div>
  </div>
</body>
</html>`;
    
    res.set('Content-Type', 'text/html');
    res.send(html);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get top weekly deals (public)
router.get('/deals/top-weekly', (req, res) => {
  try {
    const { limit = 10 } = req.query;
    
    // Get top deals from the last 7 days by discount + clicks
    const deals = prepare(`
      SELECT 
        d.id, d.title, d.image_url, d.original_price, d.current_price, 
        d.discount_percent, d.currency, d.ebay_url, d.source,
        c.name as category_name, c.icon as category_icon,
        COALESCE(clicks.click_count, 0) as click_count
      FROM deals d
      LEFT JOIN categories c ON d.category_id = c.id
      LEFT JOIN (
        SELECT deal_id, COUNT(*) as click_count 
        FROM clicks 
        WHERE created_at > datetime('now', '-7 days')
        GROUP BY deal_id
      ) clicks ON d.id = clicks.deal_id
      WHERE d.is_active = 1 
        AND d.discount_percent >= 25
        AND d.created_at > datetime('now', '-7 days')
      ORDER BY d.discount_percent DESC, click_count DESC
      LIMIT ?
    `).all(parseInt(limit));
    
    res.json({
      title: "This Week's Top Deals",
      subtitle: "Biggest discounts from the last 7 days",
      deals,
      generatedAt: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get featured deals (editor's picks)
router.get('/deals/featured', (req, res) => {
  try {
    const { limit = 6 } = req.query;
    
    // Get deals with highest discount that have good images
    const deals = prepare(`
      SELECT 
        d.id, d.title, d.image_url, d.original_price, d.current_price, 
        d.discount_percent, d.currency, d.ebay_url, d.source,
        c.name as category_name, c.icon as category_icon
      FROM deals d
      LEFT JOIN categories c ON d.category_id = c.id
      WHERE d.is_active = 1 
        AND d.discount_percent >= 30
        AND d.image_url IS NOT NULL
        AND d.image_url != ''
      ORDER BY d.discount_percent DESC, d.current_price DESC
      LIMIT ?
    `).all(parseInt(limit));
    
    res.json({ deals });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Track UTM conversions (public - called from frontend)
router.post('/track/conversion', (req, res) => {
  try {
    const { 
      type, 
      utm_source, 
      utm_medium, 
      utm_campaign, 
      utm_term,
      utm_content,
      gclid,
      value,
      item_id,
      landing_page
    } = req.body;
    
    // Store conversion for analytics
    prepare(`
      INSERT INTO conversions (
        type, utm_source, utm_medium, utm_campaign, utm_term, utm_content,
        gclid, value, item_id, landing_page, ip_address, user_agent, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    `).run(
      type || 'unknown',
      utm_source || '',
      utm_medium || '',
      utm_campaign || '',
      utm_term || '',
      utm_content || '',
      gclid || '',
      value || 0,
      item_id || '',
      landing_page || '',
      req.ip || req.headers['x-forwarded-for'] || '',
      req.headers['user-agent'] || ''
    );
    
    res.json({ success: true });
  } catch (error) {
    // Silently fail - don't break user experience
    console.error('Conversion tracking error:', error);
    res.json({ success: true });
  }
});

// Get conversion stats (admin)
router.get('/admin/conversions/stats', authenticateToken, requireRole('admin'), (req, res) => {
  try {
    const { days = 30 } = req.query;
    
    // Total conversions by type
    const byType = prepare(`
      SELECT type, COUNT(*) as count, SUM(value) as total_value
      FROM conversions 
      WHERE created_at > datetime('now', '-${days} days')
      GROUP BY type
      ORDER BY count DESC
    `).all();
    
    // By UTM source
    const bySource = prepare(`
      SELECT utm_source, COUNT(*) as count, SUM(value) as total_value
      FROM conversions 
      WHERE created_at > datetime('now', '-${days} days') AND utm_source != ''
      GROUP BY utm_source
      ORDER BY count DESC
      LIMIT 10
    `).all();
    
    // By campaign
    const byCampaign = prepare(`
      SELECT utm_campaign, COUNT(*) as count, SUM(value) as total_value
      FROM conversions 
      WHERE created_at > datetime('now', '-${days} days') AND utm_campaign != ''
      GROUP BY utm_campaign
      ORDER BY count DESC
      LIMIT 10
    `).all();
    
    // Daily trend
    const dailyTrend = prepare(`
      SELECT date(created_at) as date, type, COUNT(*) as count
      FROM conversions 
      WHERE created_at > datetime('now', '-${days} days')
      GROUP BY date(created_at), type
      ORDER BY date DESC
    `).all();
    
    // Google Ads clicks (gclid)
    const googleAdsClicks = prepare(`
      SELECT COUNT(*) as count, SUM(value) as total_value
      FROM conversions 
      WHERE created_at > datetime('now', '-${days} days') AND gclid != ''
    `).get();
    
    // Top landing pages
    const topLandingPages = prepare(`
      SELECT landing_page, COUNT(*) as count
      FROM conversions 
      WHERE created_at > datetime('now', '-${days} days') AND landing_page != ''
      GROUP BY landing_page
      ORDER BY count DESC
      LIMIT 10
    `).all();
    
    res.json({
      period: `Last ${days} days`,
      byType,
      bySource,
      byCampaign,
      dailyTrend,
      googleAdsClicks,
      topLandingPages
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Export subscribers as CSV (admin)
router.get('/admin/newsletter/export', authenticateToken, requireRole('admin'), (req, res) => {
  try {
    const subscribers = prepare(`
      SELECT email, name, source, is_active, created_at 
      FROM subscribers 
      WHERE is_active = 1 
      ORDER BY created_at DESC
    `).all();
    
    let csv = 'Email,Name,Source,Status,Subscribed Date\n';
    for (const s of subscribers) {
      csv += `"${s.email}","${s.name || ''}","${s.source}","${s.is_active ? 'Active' : 'Inactive'}","${s.created_at}"\n`;
    }
    
    res.set('Content-Type', 'text/csv');
    res.set('Content-Disposition', 'attachment; filename=subscribers.csv');
    res.send(csv);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// SOCIAL MEDIA AUTOMATION ROUTES
// ============================================

// Run social media automation manually (admin)
router.post('/admin/social/post', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    const socialAutomation = (await import('../services/socialAutomation.js')).default;
    const { limit = 3 } = req.body;
    
    const results = await socialAutomation.runAutomatedPosts(limit);
    
    res.json({
      success: true,
      message: `Posted ${results.total} deals to social media`,
      results
    });
  } catch (error) {
    console.error('Social automation error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Post a specific deal (admin)
router.post('/admin/social/post/:dealId', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    const socialAutomation = (await import('../services/socialAutomation.js')).default;
    const deal = prepare(`
      SELECT d.*, c.name as category_name 
      FROM deals d 
      LEFT JOIN categories c ON d.category_id = c.id 
      WHERE d.id = ?
    `).get(req.params.dealId);
    
    if (!deal) {
      return res.status(404).json({ error: 'Deal not found' });
    }
    
    const result = await socialAutomation.postToTelegram(deal);
    
    res.json({
      success: result?.ok || false,
      deal_id: deal.id,
      result
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get social posting stats (admin)
router.get('/admin/social/stats', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    const socialAutomation = (await import('../services/socialAutomation.js')).default;
    const { days = 7 } = req.query;
    
    const stats = socialAutomation.getStats(parseInt(days));
    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get unposted deals (admin)
router.get('/admin/social/unposted', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    const socialAutomation = (await import('../services/socialAutomation.js')).default;
    const { limit = 10 } = req.query;
    
    const deals = socialAutomation.getUnpostedDeals(parseInt(limit));
    res.json({ count: deals.length, deals });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Configure social platforms (admin)
router.put('/admin/social/config', authenticateToken, requireRole('admin'), (req, res) => {
  try {
    const { platform, config } = req.body;
    
    // Store config in settings
    for (const [key, value] of Object.entries(config)) {
      const settingKey = `social_${platform}_${key}`;
      prepare(`
        INSERT INTO settings (key, value, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP)
        ON CONFLICT(key) DO UPDATE SET value = ?, updated_at = CURRENT_TIMESTAMP
      `).run(settingKey, value, value);
    }
    
    saveDatabase();
    res.json({ success: true, message: `${platform} configuration saved` });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get social config (admin)
router.get('/admin/social/config', authenticateToken, requireRole('admin'), (req, res) => {
  try {
    const settings = prepare(`
      SELECT key, value FROM settings WHERE key LIKE 'social_%'
    `).all();
    
    const config = {};
    for (const s of settings) {
      const parts = s.key.replace('social_', '').split('_');
      const platform = parts[0];
      const key = parts.slice(1).join('_');
      
      if (!config[platform]) config[platform] = {};
      config[platform][key] = s.value;
    }
    
    res.json(config);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// TELEGRAM CHANNELS MANAGEMENT
// ============================================

// Get all Telegram channels
router.get('/admin/telegram/channels', authenticateToken, (req, res) => {
  try {
    const channels = prepare(`
      SELECT * FROM telegram_channels ORDER BY is_active DESC, post_count DESC
    `).all();
    res.json({ channels });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Add a new Telegram channel
router.post('/admin/telegram/channels', authenticateToken, requireRole('admin'), (req, res) => {
  try {
    const { name, channel_id, description } = req.body;
    
    if (!name || !channel_id) {
      return res.status(400).json({ error: 'Name and channel_id are required' });
    }
    
    // Check if already exists
    const existing = prepare('SELECT id FROM telegram_channels WHERE channel_id = ?').get(channel_id);
    if (existing) {
      return res.status(400).json({ error: 'Channel already exists' });
    }
    
    const result = prepare(`
      INSERT INTO telegram_channels (name, channel_id, description) VALUES (?, ?, ?)
    `).run(name, channel_id, description || '');
    
    saveDatabase();
    
    res.json({ 
      success: true, 
      id: result.lastInsertRowid,
      message: `Channel "${name}" added successfully`
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update a Telegram channel
router.put('/admin/telegram/channels/:id', authenticateToken, requireRole('admin'), (req, res) => {
  try {
    const { name, channel_id, description, is_active } = req.body;
    
    prepare(`
      UPDATE telegram_channels 
      SET name = COALESCE(?, name),
          channel_id = COALESCE(?, channel_id),
          description = COALESCE(?, description),
          is_active = COALESCE(?, is_active)
      WHERE id = ?
    `).run(name, channel_id, description, is_active, req.params.id);
    
    saveDatabase();
    res.json({ success: true, message: 'Channel updated' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete a Telegram channel
router.delete('/admin/telegram/channels/:id', authenticateToken, requireRole('admin'), (req, res) => {
  try {
    prepare('DELETE FROM telegram_channels WHERE id = ?').run(req.params.id);
    saveDatabase();
    res.json({ success: true, message: 'Channel deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Test posting to a specific channel
router.post('/admin/telegram/channels/:id/test', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    const channel = prepare('SELECT * FROM telegram_channels WHERE id = ?').get(req.params.id);
    if (!channel) {
      return res.status(404).json({ error: 'Channel not found' });
    }
    
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    if (!botToken) {
      return res.status(400).json({ error: 'TELEGRAM_BOT_TOKEN not configured' });
    }
    
    const response = await fetch(
      `https://api.telegram.org/bot${botToken}/sendMessage`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: channel.channel_id,
          text: `✅ Test message from Dealsluxy!\n\nThis channel is connected successfully.\n\n🏷️ dealsluxy.com`,
          parse_mode: 'HTML'
        })
      }
    );
    
    const data = await response.json();
    
    if (data.ok) {
      res.json({ success: true, message: 'Test message sent successfully!' });
    } else {
      res.status(400).json({ error: data.description || 'Failed to send test message' });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// FACEBOOK PAGE ROUTES
// ============================================

// Get Facebook page info
router.get('/admin/facebook/info', authenticateToken, async (req, res) => {
  try {
    const facebookService = (await import('../services/facebookService.js')).default;
    const info = await facebookService.getPageInfo();
    res.json(info);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Test Facebook connection
router.post('/admin/facebook/test', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    const facebookService = (await import('../services/facebookService.js')).default;
    
    if (!facebookService.isConfigured()) {
      return res.status(400).json({ 
        error: 'Facebook not configured. Set FACEBOOK_PAGE_ID and FACEBOOK_PAGE_ACCESS_TOKEN in environment variables.' 
      });
    }
    
    const info = await facebookService.getPageInfo();
    
    if (info.error) {
      return res.status(400).json({ error: info.error });
    }
    
    res.json({ 
      success: true, 
      message: `Connected to Facebook Page: ${info.name}`,
      page: info
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Post a deal to Facebook Page
router.post('/admin/facebook/post/:dealId', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    const facebookService = (await import('../services/facebookService.js')).default;
    
    const deal = prepare('SELECT * FROM deals WHERE id = ?').get(req.params.dealId);
    if (!deal) {
      return res.status(404).json({ error: 'Deal not found' });
    }
    
    const result = await facebookService.postDeal(deal);
    
    if (result?.ok) {
      res.json({ success: true, message: 'Posted to Facebook!', post_id: result.post_id });
    } else {
      res.status(400).json({ error: result?.error || 'Failed to post to Facebook' });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Post deal to all active channels
router.post('/admin/telegram/broadcast', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    const { deal_id } = req.body;
    
    const deal = prepare('SELECT * FROM deals WHERE id = ?').get(deal_id);
    if (!deal) {
      return res.status(404).json({ error: 'Deal not found' });
    }
    
    const channels = prepare('SELECT * FROM telegram_channels WHERE is_active = 1').all();
    if (channels.length === 0) {
      return res.status(400).json({ error: 'No active channels configured' });
    }
    
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    if (!botToken) {
      return res.status(400).json({ error: 'TELEGRAM_BOT_TOKEN not configured' });
    }
    
    const trackingUrl = `https://dealsluxy.com/api/track/click/${deal.id}?utm_source=telegram&utm_medium=broadcast`;
    const savings = deal.original_price - deal.current_price;
    
    const caption = `🔥 <b>${deal.discount_percent}% OFF!</b>\n\n` +
                   `${deal.title}\n\n` +
                   `💰 <s>$${deal.original_price.toFixed(0)}</s> → <b>$${deal.current_price.toFixed(0)}</b>\n` +
                   `💵 Save $${savings.toFixed(0)}!\n\n` +
                   `🛒 <a href="${trackingUrl}">Get This Deal</a>\n\n` +
                   `━━━━━━━━━━━━━━━\n` +
                   `🏷️ <b>DEALSLUXY.COM</b>`;
    
    const results = { success: 0, failed: 0, errors: [] };
    
    for (const channel of channels) {
      try {
        const response = await fetch(
          `https://api.telegram.org/bot${botToken}/sendPhoto`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: channel.channel_id,
              photo: deal.image_url,
              caption: caption,
              parse_mode: 'HTML'
            })
          }
        );
        
        const data = await response.json();
        
        if (data.ok) {
          results.success++;
          // Update post count
          prepare('UPDATE telegram_channels SET post_count = post_count + 1, last_post_at = CURRENT_TIMESTAMP WHERE id = ?').run(channel.id);
        } else {
          results.failed++;
          results.errors.push({ channel: channel.name, error: data.description });
        }
        
        // Rate limit: wait between posts
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (err) {
        results.failed++;
        results.errors.push({ channel: channel.name, error: err.message });
      }
    }
    
    saveDatabase();
    
    res.json({
      success: true,
      message: `Posted to ${results.success}/${channels.length} channels`,
      results
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// BANNER ROUTES
// ============================================

// Get banner options (sizes and styles)
router.get('/banners/options', (req, res) => {
  import('../services/bannerService.js').then(module => {
    res.json(module.default.getOptions());
  }).catch(err => res.status(500).json({ error: err.message }));
});

// Generate banner for a deal
router.post('/admin/banners/generate', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    const bannerService = (await import('../services/bannerService.js')).default;
    const { deal_id, size, style } = req.body;
    
    if (!deal_id) {
      return res.status(400).json({ error: 'deal_id is required' });
    }
    
    const banner = await bannerService.generateBanner(deal_id, size, style);
    res.json({ success: true, banner });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Generate all banner sizes for a deal
router.post('/admin/banners/generate-all/:dealId', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    const bannerService = (await import('../services/bannerService.js')).default;
    const { style = 'gradient_orange' } = req.body;
    
    const banners = await bannerService.generateAllBanners(req.params.dealId, style);
    res.json({ success: true, count: banners.length, banners });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Auto-generate banners for new deals
router.post('/admin/banners/generate-new', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    const bannerService = (await import('../services/bannerService.js')).default;
    const { limit = 10 } = req.body;
    
    const banners = await bannerService.generateBannersForNewDeals(limit);
    res.json({ success: true, count: banners.length, banners });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get all banners (admin gallery)
router.get('/admin/banners', authenticateToken, (req, res) => {
  import('../services/bannerService.js').then(module => {
    const { limit = 50 } = req.query;
    const banners = module.default.getRecentBanners(parseInt(limit));
    res.json({ count: banners.length, banners });
  }).catch(err => res.status(500).json({ error: err.message }));
});

// Get banners for a specific deal
router.get('/admin/banners/deal/:dealId', authenticateToken, (req, res) => {
  import('../services/bannerService.js').then(module => {
    const banners = module.default.getBannersForDeal(req.params.dealId);
    res.json({ count: banners.length, banners });
  }).catch(err => res.status(500).json({ error: err.message }));
});

// Get banner stats
router.get('/admin/banners/stats', authenticateToken, (req, res) => {
  import('../services/bannerService.js').then(module => {
    res.json(module.default.getStats());
  }).catch(err => res.status(500).json({ error: err.message }));
});

// View banner by ID (public - for viewing/downloading)
router.get('/banners/:bannerId', (req, res) => {
  import('../services/bannerService.js').then(module => {
    const banner = module.default.getBanner(req.params.bannerId);
    
    if (!banner) {
      return res.status(404).json({ error: 'Banner not found' });
    }
    
    res.set('Content-Type', 'text/html');
    res.send(banner.html_content);
  }).catch(err => res.status(500).json({ error: err.message }));
});

// Get banner preview info
router.get('/banners/:bannerId/info', (req, res) => {
  import('../services/bannerService.js').then(module => {
    const banner = module.default.getBanner(req.params.bannerId);
    
    if (!banner) {
      return res.status(404).json({ error: 'Banner not found' });
    }
    
    res.json({
      id: banner.id,
      banner_id: banner.banner_id,
      deal_id: banner.deal_id,
      size: banner.size,
      style: banner.style,
      created_at: banner.created_at,
      view_url: `/api/banners/${banner.banner_id}`,
      download_url: `/api/banners/${banner.banner_id}?download=1`
    });
  }).catch(err => res.status(500).json({ error: err.message }));
});

// Delete all banners (admin)
router.delete('/admin/banners/all', authenticateToken, requireRole('admin'), (req, res) => {
  try {
    const result = prepare('DELETE FROM banners').run();
    saveDatabase();
    res.json({ success: true, deleted: result.changes, message: 'All banners deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete single banner (admin)
router.delete('/admin/banners/:bannerId', authenticateToken, requireRole('admin'), (req, res) => {
  try {
    const result = prepare('DELETE FROM banners WHERE banner_id = ?').run(req.params.bannerId);
    saveDatabase();
    res.json({ success: true, deleted: result.changes });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// SEO metadata API for dynamic pages
router.get('/seo/page-data', (req, res) => {
  try {
    const { path } = req.query;
    const baseUrl = 'https://dealsluxy.com';
    
    // Default metadata
    let meta = {
      title: 'Premium Deals | Luxury Brands at Best Prices - Up to 70% Off',
      description: 'Discover exclusive deals on luxury brands. Designer handbags, watches, jewelry & accessories at up to 70% off. Authentic products with worldwide shipping.',
      canonical: baseUrl,
      og: {
        title: 'Premium Deals - Luxury Brands at Best Prices',
        description: 'Up to 70% off on designer brands. Handbags, watches, jewelry & more.',
        image: `${baseUrl}/og-image.jpg`,
        type: 'website'
      }
    };

    // Category specific metadata
    if (path?.startsWith('/category/')) {
      const slug = path.replace('/category/', '');
      const catName = slug.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
      meta = {
        title: `${catName} Sale - Up to 70% Off | Premium Deals`,
        description: `Shop ${catName.toLowerCase()} at incredible prices. Authentic designer ${catName.toLowerCase()} with up to 70% discount. Free worldwide shipping on orders.`,
        canonical: `${baseUrl}${path}`,
        og: {
          title: `${catName} Sale - Up to 70% Off`,
          description: `Discover amazing deals on ${catName.toLowerCase()}. Save big on authentic designer items.`,
          image: `${baseUrl}/og-${slug}.jpg`,
          type: 'website'
        }
      };
    }

    // Landing pages
    const landingPages = {
      '/designer-sale': {
        title: 'Designer Sale 2024 - Up to 70% Off Luxury Brands | Dealsluxy',
        description: 'Exclusive designer sale with up to 70% off luxury brands. Shop authentic designer handbags, watches, jewelry & accessories. Updated daily with new deals.',
      },
      '/luxury-watches-sale': {
        title: 'Luxury Watches Sale - Premium Timepieces Up to 60% Off | Dealsluxy',
        description: 'Shop luxury watches at incredible prices. Rolex, Omega, TAG Heuer & more at up to 60% off. Authentic timepieces with warranty.',
      },
      '/designer-bags-sale': {
        title: 'Designer Bags Sale - Luxury Handbags Up to 70% Off | Dealsluxy',
        description: 'Discover designer handbags at unbeatable prices. Louis Vuitton, Gucci, Prada & more at up to 70% off. Authentic luxury bags.',
      }
    };

    if (landingPages[path]) {
      meta = { ...meta, ...landingPages[path], canonical: `${baseUrl}${path}` };
    }

    res.json(meta);
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
