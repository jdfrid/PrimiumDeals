import cron from 'node-cron';
import { prepare, saveDatabase } from '../config/database.js';
import ebayService from './ebayService.js';

class Scheduler {
  constructor() {
    this.jobs = new Map();
  }

  init() {
    console.log('🕐 Initializing scheduler...');
    const rules = prepare('SELECT * FROM query_rules WHERE is_active = 1').all();
    for (const rule of rules) this.scheduleRule(rule);
    cron.schedule('0 2 * * *', () => this.cleanupOldDeals());
    console.log(`✅ Scheduled ${rules.length} query rules`);
  }

  scheduleRule(rule) {
    if (this.jobs.has(rule.id)) this.jobs.get(rule.id).stop();
    try {
      const job = cron.schedule(rule.schedule_cron || '0 0 * * *', async () => await this.executeRule(rule.id));
      this.jobs.set(rule.id, job);
      console.log(`📅 Scheduled rule "${rule.name}" with cron: ${rule.schedule_cron}`);
    } catch (error) { console.error(`Failed to schedule rule ${rule.id}:`, error); }
  }

  async executeRule(ruleId) {
    const rule = prepare('SELECT * FROM query_rules WHERE id = ?').get(ruleId);
    if (!rule) return { success: false, error: 'Rule not found' };

    console.log(`🔍 Executing rule: ${rule.name}`);
    let itemsFound = 0, itemsAdded = 0, errorMessage = null;

    try {
      // Use first keyword only to minimize API calls
      const keywords = rule.keywords ? rule.keywords.split(',').map(k => k.trim()) : ['luxury'];
      const keyword = keywords[0]; // Just use first keyword to save API calls
      
      // Single API call with 100 results
      const items = await ebayService.searchItems({ 
        keywords: keyword, 
        categoryId: '', // Don't filter by category to get more results
        minPrice: rule.min_price || 0, 
        maxPrice: rule.max_price || 10000, 
        minDiscount: rule.min_discount || 30,
        limit: 100
      });
      itemsFound = items.length;

      for (const item of items) {
        try {
          let dbCategoryId = null;
          if (item.categoryName) {
            const existingCat = prepare('SELECT id FROM categories WHERE ebay_category_id = ?').get(item.categoryId);
            if (existingCat) dbCategoryId = existingCat.id;
            else {
              const result = prepare('INSERT INTO categories (name, ebay_category_id) VALUES (?, ?)').run(item.categoryName, item.categoryId);
              dbCategoryId = result.lastInsertRowid;
            }
          }
          const affiliateUrl = ebayService.getAffiliateUrl(item.ebayUrl);
          const existingDeal = prepare('SELECT id FROM deals WHERE ebay_item_id = ?').get(item.ebayItemId);
          if (existingDeal) {
            prepare('UPDATE deals SET title = ?, image_url = ?, original_price = ?, current_price = ?, discount_percent = ?, currency = ?, condition = ?, ebay_url = ?, category_id = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(item.title, item.imageUrl, item.originalPrice, item.currentPrice, item.discountPercent, item.currency, item.condition, affiliateUrl, dbCategoryId, existingDeal.id);
          } else {
            prepare('INSERT INTO deals (ebay_item_id, title, image_url, original_price, current_price, discount_percent, currency, condition, ebay_url, category_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').run(item.ebayItemId, item.title, item.imageUrl, item.originalPrice, item.currentPrice, item.discountPercent, item.currency, item.condition, affiliateUrl, dbCategoryId);
            itemsAdded++;
          }
        } catch (err) { console.error('Error saving deal:', err); }
      }
      
      prepare('UPDATE query_rules SET last_run = CURRENT_TIMESTAMP WHERE id = ?').run(ruleId);
    } catch (error) { console.error(`Error executing rule ${ruleId}:`, error); errorMessage = error.message; }

    prepare('INSERT INTO query_logs (rule_id, status, items_found, items_added, error_message) VALUES (?, ?, ?, ?, ?)').run(ruleId, errorMessage ? 'error' : 'success', itemsFound, itemsAdded, errorMessage);
    saveDatabase();
    console.log(`✅ Rule "${rule.name}" completed: ${itemsFound} found, ${itemsAdded} added`);
    return { success: !errorMessage, itemsFound, itemsAdded, error: errorMessage };
  }

  cleanupOldDeals() {
    const result = prepare("UPDATE deals SET is_active = 0 WHERE updated_at < datetime('now', '-7 days') AND is_active = 1").run();
    console.log(`🧹 Deactivated ${result.changes} old deals`);
  }

  refreshRule(ruleId) {
    const rule = prepare('SELECT * FROM query_rules WHERE id = ?').get(ruleId);
    if (rule && rule.is_active) this.scheduleRule(rule);
    else if (this.jobs.has(ruleId)) { this.jobs.get(ruleId).stop(); this.jobs.delete(ruleId); }
  }
}

export default new Scheduler();
