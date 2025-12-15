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
    if (!rule) return { success: false, itemsFound: 0, itemsAdded: 0, itemsUpdated: 0, itemsRemoved: 0, error: 'Rule not found' };

    console.log(`🔍 Executing rule: ${rule.name}`);
    let itemsFound = 0, itemsAdded = 0, itemsUpdated = 0, itemsRemoved = 0, errorMessage = null;

    try {
      // Check if eBay API is configured
      if (!process.env.EBAY_APP_ID) {
        throw new Error('eBay API credentials not configured. Please set EBAY_APP_ID in environment variables.');
      }

      // Search for ALL keywords
      const keywords = rule.keywords ? rule.keywords.split(',').map(k => k.trim()).filter(k => k) : ['luxury watch'];
      const allItems = [];
      const seenIds = new Set();
      
      console.log(`🔍 Searching eBay for ${keywords.length} keywords: ${keywords.join(', ')}`);
      
      // Search each keyword
      for (const keyword of keywords) {
        try {
          console.log(`  → Searching: "${keyword}"`);
          const items = await ebayService.searchItems({ 
            keywords: keyword, 
            categoryId: '', 
            minPrice: rule.min_price || 0, 
            maxPrice: rule.max_price || 10000, 
            minDiscount: rule.min_discount || 10,
            limit: 50 // 50 per keyword
          });
          
          // Add unique items only
          for (const item of items) {
            if (!seenIds.has(item.ebayItemId)) {
              seenIds.add(item.ebayItemId);
              allItems.push(item);
            }
          }
          console.log(`  ✓ Found ${items.length} items for "${keyword}"`);
          
          // Small delay between API calls
          await new Promise(resolve => setTimeout(resolve, 500));
        } catch (err) {
          console.error(`  ✗ Error searching "${keyword}":`, err.message);
        }
      }
      
      const items = allItems;
      console.log(`📦 Total unique items: ${items.length}`);
      itemsFound = items.length;

      // Track which eBay item IDs we found in this sync
      const foundEbayIds = new Set();

      for (const item of items) {
        try {
          foundEbayIds.add(item.ebayItemId);
          
          let dbCategoryId = null;
          if (item.categoryName) {
            const existingCat = prepare('SELECT id FROM categories WHERE ebay_category_id = ?').get(item.categoryId);
            if (existingCat) dbCategoryId = existingCat.id;
            else {
              const result = prepare('INSERT INTO categories (name, ebay_category_id) VALUES (?, ?)').run(item.categoryName, item.categoryId);
              dbCategoryId = result.lastInsertRowid;
            }
          }
          // Use the URL from eBay API and add affiliate parameters
          const affiliateUrl = ebayService.getAffiliateUrl(item.ebayItemId, item.ebayUrl);
          const existingDeal = prepare('SELECT id, current_price, discount_percent FROM deals WHERE ebay_item_id = ?').get(item.ebayItemId);
          
          if (existingDeal) {
            // Check if item still meets the rules criteria
            const meetsMinDiscount = item.discountPercent >= (rule.min_discount || 0);
            const meetsMinPrice = item.currentPrice >= (rule.min_price || 0);
            const meetsMaxPrice = item.currentPrice <= (rule.max_price || 999999);
            
            if (meetsMinDiscount && meetsMinPrice && meetsMaxPrice) {
              // Update the item with new data
              prepare('UPDATE deals SET title = ?, image_url = ?, original_price = ?, current_price = ?, discount_percent = ?, currency = ?, condition = ?, ebay_url = ?, category_id = ?, is_active = 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(item.title, item.imageUrl, item.originalPrice, item.currentPrice, item.discountPercent, item.currency, item.condition, affiliateUrl, dbCategoryId, existingDeal.id);
              
              // Count as updated if price or discount changed
              if (existingDeal.current_price !== item.currentPrice || existingDeal.discount_percent !== item.discountPercent) {
                itemsUpdated++;
                console.log(`  📝 Updated: "${item.title.substring(0, 40)}..." - Price: $${existingDeal.current_price} → $${item.currentPrice}, Discount: ${existingDeal.discount_percent}% → ${item.discountPercent}%`);
              }
            } else {
              // Item no longer meets criteria - deactivate it
              prepare('UPDATE deals SET is_active = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(existingDeal.id);
              itemsRemoved++;
              console.log(`  🗑️ Removed (no longer meets criteria): "${item.title.substring(0, 40)}..." - Discount: ${item.discountPercent}%, Price: $${item.currentPrice}`);
            }
          } else {
            // New item - check if it meets criteria before adding
            const meetsMinDiscount = item.discountPercent >= (rule.min_discount || 0);
            const meetsMinPrice = item.currentPrice >= (rule.min_price || 0);
            const meetsMaxPrice = item.currentPrice <= (rule.max_price || 999999);
            
            if (meetsMinDiscount && meetsMinPrice && meetsMaxPrice) {
              prepare('INSERT INTO deals (ebay_item_id, title, image_url, original_price, current_price, discount_percent, currency, condition, ebay_url, category_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').run(item.ebayItemId, item.title, item.imageUrl, item.originalPrice, item.currentPrice, item.discountPercent, item.currency, item.condition, affiliateUrl, dbCategoryId);
              itemsAdded++;
            }
          }
        } catch (err) { console.error('Error saving deal:', err); }
      }

      // Deactivate items that were not found in this sync (ended/sold/removed from eBay)
      const activeDeals = prepare('SELECT id, ebay_item_id, title FROM deals WHERE is_active = 1').all();
      for (const deal of activeDeals) {
        if (!foundEbayIds.has(deal.ebay_item_id)) {
          // Item not found in current sync - check if it's been missing for a while
          // For now, we'll mark items older than 24 hours as inactive if not found
          const staleCheck = prepare("SELECT id FROM deals WHERE id = ? AND updated_at < datetime('now', '-1 day')").get(deal.id);
          if (staleCheck) {
            prepare('UPDATE deals SET is_active = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(deal.id);
            itemsRemoved++;
            console.log(`  🗑️ Removed (not found in eBay): "${deal.title.substring(0, 40)}..."`);
          }
        }
      }
      
      prepare('UPDATE query_rules SET last_run = CURRENT_TIMESTAMP WHERE id = ?').run(ruleId);
    } catch (error) { 
      console.error(`❌ Error executing rule ${ruleId}:`, error.message); 
      errorMessage = error.message;
      
      // Check for common errors
      if (error.message.includes('500')) {
        errorMessage = 'eBay API rate limit exceeded. Please try again in a few minutes.';
      } else if (error.message.includes('credentials')) {
        errorMessage = 'eBay API credentials not configured. Check EBAY_APP_ID.';
      }
    }

    prepare('INSERT INTO query_logs (rule_id, status, items_found, items_added, error_message) VALUES (?, ?, ?, ?, ?)').run(ruleId, errorMessage ? 'error' : 'success', itemsFound, itemsAdded, errorMessage);
    saveDatabase();
    
    if (errorMessage) {
      console.log(`❌ Rule "${rule.name}" failed: ${errorMessage}`);
    } else {
      console.log(`✅ Rule "${rule.name}" completed: ${itemsFound} found, ${itemsAdded} added, ${itemsUpdated} updated, ${itemsRemoved} removed`);
    }
    
    return { success: !errorMessage, itemsFound, itemsAdded, itemsUpdated, itemsRemoved, error: errorMessage };
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
