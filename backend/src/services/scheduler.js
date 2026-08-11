import cron from 'node-cron';
import socialAutomation from './socialAutomation.js';
import { prepare, saveDatabase } from '../config/database.js';
import ebayService from './ebayService.js';
import banggoodService from './banggoodService.js';

/** Comma-separated keywords; falls back when empty so Run never silently skips eBay. */
function parseRuleKeywords(raw) {
  const parsed = String(raw || '')
    .split(',')
    .map((k) => k.trim())
    .filter(Boolean);
  return parsed.length > 0 ? parsed : ['luxury watch'];
}

class Scheduler {
  constructor() {
    this.jobs = new Map();
  }

  init() {
    console.log('🕐 Initializing scheduler...');
    const rules = prepare('SELECT * FROM query_rules WHERE is_active = 1').all();
    for (const rule of rules) this.scheduleRule(rule);

    // Cleanup old deals daily at 2 AM
    cron.schedule('0 2 * * *', () => this.cleanupOldDeals());

    // Social media automation - every 4 hours
    cron.schedule('0 */4 * * *', async () => {
      console.log('📱 Running social media automation...');
      try {
        await socialAutomation.runAutomatedPosts(3);
      } catch (err) {
        console.error('Social automation error:', err.message);
      }
    });

    // Generate banners for new deals - every 2 hours
    cron.schedule('0 */2 * * *', async () => {
      console.log('🎨 Auto-generating banners...');
      try {
        const bannerService = (await import('./bannerService.js')).default;
        await bannerService.generateBannersForNewDeals(10);
      } catch (err) {
        console.error('Banner generation error:', err.message);
      }
    });

    console.log(`✅ Scheduled ${rules.length} query rules + social media + banner generation`);
  }

  scheduleRule(rule) {
    if (this.jobs.has(rule.id)) this.jobs.get(rule.id).stop();
    try {
      const job = cron.schedule(rule.schedule_cron || '0 0 * * *', async () => await this.executeRule(rule.id));
      this.jobs.set(rule.id, job);
      console.log(`📅 Scheduled rule "${rule.name}" with cron: ${rule.schedule_cron}`);
    } catch (error) {
      console.error(`Failed to schedule rule ${rule.id}:`, error);
    }
  }

  async executeRule(ruleId) {
    const rule = prepare('SELECT * FROM query_rules WHERE id = ?').get(ruleId);
    if (!rule) return { success: false, itemsFound: 0, itemsAdded: 0, itemsUpdated: 0, itemsRemoved: 0, error: 'Rule not found' };

    console.log(`🔍 Executing rule: ${rule.name}`);
    let itemsFound = 0,
      itemsAdded = 0,
      itemsUpdated = 0,
      itemsRemoved = 0,
      errorMessage = null;
    const searchErrors = [];
    const newDealIds = [];
    const ruleMinDiscount = rule.min_discount ?? 10;
    const ruleMinPrice = rule.min_price ?? 0;
    const ruleMaxPrice = rule.max_price ?? 10000;

    try {
      const keywords = parseRuleKeywords(rule.keywords);
      if (!String(rule.keywords || '').trim()) {
        console.warn(`⚠️ Rule "${rule.name}" has no keywords — using default: "${keywords[0]}"`);
      }
      const allItems = [];
      const seenIds = new Set();

      // Check which providers are enabled
      const ebayEnabled = ebayService.isConfigured();
      const banggoodProvider = prepare('SELECT enabled FROM providers WHERE id = ?').get('banggood');
      const banggoodEnabled = banggoodProvider?.enabled && process.env.BANGGOOD_APP_KEY;

      // === EBAY SEARCH ===
      if (ebayEnabled) {
        console.log(`\n${'🔍'.repeat(25)}`);
        console.log(`🔍 EBAY SEARCH - ${keywords.length} keywords to search`);
        console.log(`📋 Keywords list: ${keywords.slice(0, 10).join(', ')}${keywords.length > 10 ? '...' : ''}`);

        // Parse category IDs from rule
        const categoryIds = rule.ebay_category_ids ? rule.ebay_category_ids.split(',').map((c) => c.trim()).filter((c) => c) : [];
        console.log(`📂 Category IDs: ${categoryIds.length > 0 ? categoryIds.join(', ') : 'ALL CATEGORIES'}`);
        console.log(`💰 Price filter: $${rule.min_price || 0} - $${rule.max_price || 10000}`);
        console.log(`📉 Min discount: ${rule.min_discount || 10}%`);
        console.log(`${'🔍'.repeat(25)}\n`);

        let keywordIndex = 0;
        for (const keyword of keywords) {
          keywordIndex++;
          try {
            console.log(`\n[${keywordIndex}/${keywords.length}] 🔎 Searching: "${keyword}"`);
            const items = await ebayService.searchItems({
              keywords: keyword,
              categoryIds: categoryIds,
              minPrice: ruleMinPrice,
              maxPrice: ruleMaxPrice,
              minDiscount: ruleMinDiscount,
              limit: 100 // Increased from 50 to 100
            });

            for (const item of items) {
              const uniqueKey = `ebay_${item.ebayItemId}`;
              if (!seenIds.has(uniqueKey)) {
                seenIds.add(uniqueKey);
                allItems.push({ ...item, source: 'ebay' });
              }
            }
            console.log(`  ✓ eBay: ${items.length} items for "${keyword}"`);

            await new Promise((resolve) => setTimeout(resolve, 500));
          } catch (err) {
            console.error(`  ✗ eBay error "${keyword}":`, err.message);
            searchErrors.push(`"${keyword}": ${err.message}`);
          }
        }
      }

      // === BANGGOOD SEARCH ===
      if (banggoodEnabled) {
        console.log(`🛒 Searching Banggood for ${keywords.length} keywords...`);

        for (const keyword of keywords) {
          try {
            console.log(`  → Banggood: "${keyword}"`);
            const items = await banggoodService.searchProducts({
              keywords: keyword,
              minPrice: ruleMinPrice,
              maxPrice: ruleMaxPrice,
              minDiscount: ruleMinDiscount,
              limit: 50
            });

            for (const item of items) {
              const uniqueKey = `banggood_${item.sourceItemId}`;
              if (!seenIds.has(uniqueKey)) {
                seenIds.add(uniqueKey);
                allItems.push(item);
              }
            }
            console.log(`  ✓ Banggood: ${items.length} items for "${keyword}"`);

            await new Promise((resolve) => setTimeout(resolve, 500));
          } catch (err) {
            console.error(`  ✗ Banggood error "${keyword}":`, err.message);
          }
        }
      }

      if (!ebayEnabled && !banggoodEnabled) {
        throw new Error('No product sources configured. Please configure eBay or Banggood API credentials.');
      }

      console.log(`📦 Total unique items from all sources: ${allItems.length}`);
      itemsFound = allItems.length;

      if (ebayEnabled && itemsFound === 0 && searchErrors.length > 0) {
        errorMessage = `eBay search failed (${searchErrors.length} keyword(s)): ${searchErrors.slice(0, 2).join('; ')}`;
      }

      // Process items from all sources
      for (const item of allItems) {
        const source = item.source || 'ebay';
        const itemId = source === 'ebay' ? item.ebayItemId : item.sourceItemId;
        try {
          if (!itemId) {
            console.warn('Skipping item without id:', item.title?.slice(0, 60));
            continue;
          }
          const itemUrl =
            source === 'ebay' ? ebayService.getAffiliateUrl(item.ebayItemId, item.ebayUrl) : banggoodService.getAffiliateUrl(item.productUrl);

          let dbCategoryId = null;
          if (item.categoryName) {
            const existingCat = prepare('SELECT id FROM categories WHERE name = ? OR ebay_category_id = ?').get(item.categoryName, item.categoryId);
            if (existingCat) dbCategoryId = existingCat.id;
            else {
              const result = prepare('INSERT INTO categories (name, ebay_category_id) VALUES (?, ?)').run(item.categoryName, item.categoryId || '');
              dbCategoryId = result.lastInsertRowid;
            }
          }

          // Check for existing deal (using ebay_item_id field for both sources for backward compatibility)
          const existingDeal = prepare('SELECT id, current_price, discount_percent FROM deals WHERE ebay_item_id = ? OR source_item_id = ?').get(itemId, itemId);

          if (existingDeal) {
            const meetsMinDiscount = item.discountPercent >= ruleMinDiscount;
            const meetsMinPrice = item.currentPrice >= ruleMinPrice;
            const meetsMaxPrice = item.currentPrice <= ruleMaxPrice;

            if (meetsMinDiscount && meetsMinPrice && meetsMaxPrice) {
              prepare(
                'UPDATE deals SET title = ?, image_url = ?, original_price = ?, current_price = ?, discount_percent = ?, currency = ?, condition = ?, ebay_url = ?, category_id = ?, source = ?, is_active = 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?'
              ).run(item.title, item.imageUrl, item.originalPrice, item.currentPrice, item.discountPercent, item.currency, item.condition || 'New', itemUrl, dbCategoryId, source, existingDeal.id);

              if (existingDeal.current_price !== item.currentPrice || existingDeal.discount_percent !== item.discountPercent) {
                itemsUpdated++;
              }
            } else {
              prepare('UPDATE deals SET is_active = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(existingDeal.id);
              itemsRemoved++;
            }
          } else {
            const meetsMinDiscount = item.discountPercent >= ruleMinDiscount;
            const meetsMinPrice = item.currentPrice >= ruleMinPrice;
            const meetsMaxPrice = item.currentPrice <= ruleMaxPrice;

            if (meetsMinDiscount && meetsMinPrice && meetsMaxPrice) {
              // Double-check for duplicates before inserting (by source_item_id)
              const duplicateCheck = prepare('SELECT id FROM deals WHERE source_item_id = ?').get(itemId);
              if (duplicateCheck) {
                // Already exists, update instead
                prepare(
                  'UPDATE deals SET title = ?, image_url = ?, original_price = ?, current_price = ?, discount_percent = ?, currency = ?, condition = ?, ebay_url = ?, category_id = ?, source = ?, is_active = 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?'
                ).run(item.title, item.imageUrl, item.originalPrice, item.currentPrice, item.discountPercent, item.currency, item.condition || 'New', itemUrl, dbCategoryId, source, duplicateCheck.id);
              } else {
                // Insert new item
                const insertResult = prepare(
                  'INSERT INTO deals (ebay_item_id, source_item_id, source, title, image_url, original_price, current_price, discount_percent, currency, condition, ebay_url, category_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
                ).run(source === 'ebay' ? itemId : '', itemId, source, item.title, item.imageUrl, item.originalPrice, item.currentPrice, item.discountPercent, item.currency, item.condition || 'New', itemUrl, dbCategoryId);
                itemsAdded++;
                if (insertResult.lastInsertRowid) {
                  newDealIds.push(Number(insertResult.lastInsertRowid));
                }
              }
            }
          }
        } catch (err) {
          console.error('Error saving deal:', err.message, itemId || item.title?.slice(0, 40));
        }
      }

      if (!errorMessage && itemsFound === 0 && ebayEnabled) {
        console.warn(
          `⚠️ Rule "${rule.name}": 0 items from eBay. Widen price range or lower min discount (currently ${ruleMinDiscount}%).`
        );
      }

      prepare('UPDATE query_rules SET last_run = CURRENT_TIMESTAMP WHERE id = ?').run(ruleId);
    } catch (error) {
      console.error(`❌ Error executing rule ${ruleId}:`, error.message);
      errorMessage = error.message;

      // Check for common errors
      if (error.message.includes('500')) {
        errorMessage = 'eBay API rate limit exceeded. Please try again in a few minutes.';
      } else if (error.message.includes('credentials')) {
        errorMessage =
          'eBay API credentials not configured on server. Set EBAY_APP_ID (Client ID) and EBAY_CERT_ID or EBAY_CLIENT_SECRET (Client Secret).';
      }
    }

    prepare('INSERT INTO query_logs (rule_id, status, items_found, items_added, error_message) VALUES (?, ?, ?, ?, ?)').run(ruleId, errorMessage ? 'error' : 'success', itemsFound, itemsAdded, errorMessage);
    saveDatabase();

    let telegramPosted = 0;
    if (!errorMessage && newDealIds.length > 0) {
      try {
        const tgResult = await socialAutomation.postNewDeals(newDealIds, 5);
        telegramPosted = tgResult?.total ?? 0;
        if (telegramPosted > 0) {
          console.log(`📱 Telegram: posted ${telegramPosted} new deal(s) from rule "${rule.name}"`);
        }
      } catch (tgErr) {
        console.error('Telegram post after rule run:', tgErr.message);
      }
    }

    if (errorMessage) {
      console.log(`❌ Rule "${rule.name}" failed: ${errorMessage}`);
    } else {
      console.log(`✅ Rule "${rule.name}" completed: ${itemsFound} found, ${itemsAdded} added, ${itemsUpdated} updated, ${itemsRemoved} removed`);
    }

    return {
      success: !errorMessage,
      itemsFound,
      itemsAdded,
      itemsUpdated,
      itemsRemoved,
      telegramPosted,
      error: errorMessage,
      warning:
        !errorMessage && itemsAdded === 0 && itemsFound > 0
          ? `Found ${itemsFound} listings but all already exist in DB (0 new). Updated prices if changed.`
          : !errorMessage && itemsFound === 0
            ? 'No listings matched this rule on eBay. Try Edit → lower Min Discount or widen Price range, and add Keywords.'
            : null
    };
  }

  cleanupOldDeals() {
    const result = prepare("UPDATE deals SET is_active = 0 WHERE updated_at < datetime('now', '-7 days') AND is_active = 1").run();
    console.log(`🧹 Deactivated ${result.changes} old deals`);
  }

  refreshRule(ruleId) {
    const rule = prepare('SELECT * FROM query_rules WHERE id = ?').get(ruleId);
    if (rule && rule.is_active) this.scheduleRule(rule);
    else if (this.jobs.has(ruleId)) {
      this.jobs.get(ruleId).stop();
      this.jobs.delete(ruleId);
    }
  }
}

const scheduler = new Scheduler();
export default scheduler;
