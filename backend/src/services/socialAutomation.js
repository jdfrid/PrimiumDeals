/**
 * Social Media Automation Service
 * Handles automated posting to various social platforms
 */

import { prepare, saveDatabase } from '../config/database.js';

class SocialAutomationService {
  constructor() {
    this.minDiscount = Number(process.env.TELEGRAM_MIN_DISCOUNT) || 15;
    this.platforms = {
      telegram: {
        enabled: false,
        botToken: process.env.TELEGRAM_BOT_TOKEN,
        channelId: process.env.TELEGRAM_CHANNEL_ID
      },
      twitter: {
        enabled: false,
        apiKey: process.env.TWITTER_API_KEY,
        apiSecret: process.env.TWITTER_API_SECRET,
        accessToken: process.env.TWITTER_ACCESS_TOKEN,
        accessSecret: process.env.TWITTER_ACCESS_SECRET
      }
    };
  }

  /** Bot token + at least one channel (DB or env). */
  isTelegramConfigured() {
    const botToken = (process.env.TELEGRAM_BOT_TOKEN || '').trim();
    if (!botToken) return false;
    const dbChannels = this.getActiveChannels();
    const mainChannel = (process.env.TELEGRAM_CHANNEL_ID || '').trim();
    return dbChannels.length > 0 || !!mainChannel;
  }

  getChannelIds() {
    const dbChannels = this.getActiveChannels();
    const mainChannel = (process.env.TELEGRAM_CHANNEL_ID || '').trim();
    const channelIds = dbChannels.map((c) => c.channel_id);
    if (mainChannel && !channelIds.includes(mainChannel)) {
      channelIds.push(mainChannel);
    }
    return channelIds;
  }

  /**
   * Deals eligible for auto-post (never posted, active, has image, meets min discount).
   * Includes recently created OR recently updated listings (Query Rules often update existing rows).
   */
  getUnpostedDeals(limit = 5, { dealIds = null, skipRecencyFilter = false } = {}) {
    try {
      const minDiscount = this.minDiscount;
      const recencyClause = skipRecencyFilter
        ? ''
        : `AND (
            d.created_at > datetime('now', '-14 days')
            OR d.updated_at > datetime('now', '-3 days')
          )`;

      const idClause =
        Array.isArray(dealIds) && dealIds.length > 0
          ? `AND d.id IN (${dealIds.map(() => '?').join(',')})`
          : '';

      const sql = `
        SELECT 
          d.id, d.title, d.image_url, d.original_price, d.current_price, 
          d.discount_percent, d.ebay_url, d.source,
          c.name as category_name
        FROM deals d
        LEFT JOIN categories c ON d.category_id = c.id
        LEFT JOIN social_posts sp ON d.id = sp.deal_id AND sp.platform = 'telegram'
        WHERE d.is_active = 1 
          AND COALESCE(d.discount_percent, 0) >= ?
          AND d.image_url IS NOT NULL AND TRIM(d.image_url) != ''
          AND sp.id IS NULL
          ${recencyClause}
          ${idClause}
        ORDER BY d.discount_percent DESC, d.updated_at DESC
        LIMIT ?
      `;

      const params =
        Array.isArray(dealIds) && dealIds.length > 0
          ? [minDiscount, ...dealIds, limit]
          : [minDiscount, limit];

      return prepare(sql).all(...params);
    } catch (error) {
      console.error('Error getting unposted deals:', error);
      return [];
    }
  }

  /** Health / admin diagnostics */
  getTelegramStatus() {
    const botTokenConfigured = !!(process.env.TELEGRAM_BOT_TOKEN || '').trim();
    const channelIds = this.getChannelIds();
    let unpostedEligible = 0;
    try {
      const row = prepare(`
        SELECT COUNT(*) as c
        FROM deals d
        LEFT JOIN social_posts sp ON d.id = sp.deal_id AND sp.platform = 'telegram'
        WHERE d.is_active = 1
          AND COALESCE(d.discount_percent, 0) >= ?
          AND d.image_url IS NOT NULL AND TRIM(d.image_url) != ''
          AND sp.id IS NULL
          AND (
            d.created_at > datetime('now', '-14 days')
            OR d.updated_at > datetime('now', '-3 days')
          )
      `).get(this.minDiscount);
      unpostedEligible = Number(row?.c ?? 0);
    } catch (e) {
      /* ignore */
    }
    return {
      botTokenConfigured,
      channelCount: channelIds.length,
      configured: botTokenConfigured && channelIds.length > 0,
      minDiscount: this.minDiscount,
      unpostedEligible
    };
  }

  /**
   * Post specific deals right after Query Rules add/update them (skips recency filter).
   */
  async postNewDeals(dealIds, limit = 5) {
    if (!this.isTelegramConfigured()) {
      console.log('⚠️ Telegram not configured — skip posting new deals');
      return { total: 0, skipped: 'not_configured' };
    }
    const ids = [...new Set((dealIds || []).map(Number).filter(Boolean))];
    if (ids.length === 0) return { total: 0 };

    const deals = this.getUnpostedDeals(Math.min(limit, ids.length), {
      dealIds: ids,
      skipRecencyFilter: true
    });
    if (deals.length === 0) {
      console.log(`📱 No eligible new deals to post (${ids.length} id(s) checked)`);
      return { total: 0, checked: ids.length };
    }

    console.log(`📱 Posting ${deals.length} new deal(s) to Telegram after rule run...`);
    let total = 0;
    for (const deal of deals) {
      const result = await this.postToTelegram(deal);
      if (result?.ok) total++;
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }
    return { total, dealIds: deals.map((d) => d.id) };
  }

  /**
   * Mark a deal as posted
   */
  markAsPosted(dealId, platform, postId = null) {
    try {
      prepare(`
        INSERT INTO social_posts (deal_id, platform, post_id, posted_at)
        VALUES (?, ?, ?, CURRENT_TIMESTAMP)
      `).run(dealId, platform, postId);
      saveDatabase();
    } catch (error) {
      console.error('Error marking deal as posted:', error);
    }
  }

  /**
   * Generate content for different platforms
   */
  generateContent(deal, platform) {
    const trackingUrl = `https://dealsluxy.com/api/track/click/${deal.id}?utm_source=${platform}&utm_medium=social&utm_campaign=auto_post`;
    const savings = deal.original_price - deal.current_price;

    const templates = {
      telegram: {
        text: `🔥 <b>${deal.discount_percent}% OFF!</b>\n\n` +
              `${deal.title}\n\n` +
              `💰 <s>$${deal.original_price.toFixed(0)}</s> → <b>$${deal.current_price.toFixed(0)}</b>\n` +
              `💵 Save $${savings.toFixed(0)}!\n\n` +
              `<a href="${trackingUrl}">🛒 Get This Deal</a>`,
        parse_mode: 'HTML'
      },
      twitter: {
        text: `🔥 ${deal.discount_percent}% OFF!\n\n` +
              `${deal.title.substring(0, 100)}...\n\n` +
              `💰 $${deal.original_price.toFixed(0)} → $${deal.current_price.toFixed(0)}\n\n` +
              `🛒 ${trackingUrl}\n\n` +
              `#deals #luxury #sale`
      },
      instagram: {
        caption: `🔥 DEAL ALERT: ${deal.discount_percent}% OFF!\n\n` +
                 `${deal.title}\n\n` +
                 `💰 Was: $${deal.original_price.toFixed(0)}\n` +
                 `✨ Now: $${deal.current_price.toFixed(0)}\n` +
                 `💵 You Save: $${savings.toFixed(0)}!\n\n` +
                 `🛒 Link in bio\n\n` +
                 `#luxurydeals #designersale #fashiondeals #luxuryfashion #sale #discount #shopping`,
        image_url: deal.image_url
      }
    };

    return templates[platform] || templates.telegram;
  }

  /**
   * Post to Telegram - all active channels
   */
  async postToTelegram(deal) {
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    if (!botToken) {
      console.log('⚠️ Telegram bot token not configured');
      return null;
    }

    const channelIds = this.getChannelIds();

    if (channelIds.length === 0) {
      console.log('⚠️ No Telegram channels configured');
      return null;
    }

    console.log(`📤 Posting to ${channelIds.length} channel(s)...`);
    
    let successCount = 0;
    for (const channelId of channelIds) {
      const result = await this.postToChannel(deal, channelId);
      if (result?.ok) {
        successCount++;
        try {
          prepare('UPDATE telegram_channels SET post_count = post_count + 1, last_post_at = CURRENT_TIMESTAMP WHERE channel_id = ?').run(channelId);
        } catch (e) {}
      }
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    if (successCount > 0) {
      console.log(`✅ Posted to ${successCount}/${channelIds.length} channels: ${deal.title.substring(0, 40)}...`);
      this.markAsPosted(deal.id, 'telegram', Date.now().toString());
      try { saveDatabase(); } catch (e) {}
      return { ok: true, channels: successCount };
    }
    
    return null;
  }

  /**
   * Get all active channels from database
   */
  getActiveChannels() {
    try {
      return prepare('SELECT * FROM telegram_channels WHERE is_active = 1').all();
    } catch (error) {
      // Table might not exist yet
      return [];
    }
  }

  /**
   * Post to a specific channel ID
   */
  async postToChannel(deal, channelId) {
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    if (!botToken) return null;

    const trackingUrl = `https://dealsluxy.com/api/track/click/${deal.id}?utm_source=telegram&utm_medium=social`;
    const savings = deal.original_price - deal.current_price;
    
    const caption = `🔥 <b>${deal.discount_percent}% OFF!</b>\n\n` +
                   `${deal.title}\n\n` +
                   `💰 <s>$${deal.original_price.toFixed(0)}</s> → <b>$${deal.current_price.toFixed(0)}</b>\n` +
                   `💵 Save $${savings.toFixed(0)}!\n\n` +
                   `🛒 <a href="${trackingUrl}">Get This Deal</a>\n\n` +
                   `━━━━━━━━━━━━━━━\n` +
                   `🏷️ <b>DEALSLUXY.COM</b>`;

    try {
      const response = await fetch(
        `https://api.telegram.org/bot${botToken}/sendPhoto`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: channelId,
            photo: deal.image_url,
            caption: caption,
            parse_mode: 'HTML'
          })
        }
      );
      const data = await response.json();
      this.logTelegramApiFailure(channelId, data);
      return data;
    } catch (error) {
      console.error(`Error posting to ${channelId}:`, error.message);
      return null;
    }
  }

  logTelegramApiFailure(channelId, result) {
    if (!result || result.ok) return;
    console.error(`❌ Telegram API ${channelId}: ${result.error_code || '?'} — ${result.description || JSON.stringify(result)}`);
  }

  /**
   * Run automated posting for all configured platforms
   */
  async runAutomatedPosts(limit = 3) {
    console.log(`\n${'='.repeat(50)}`);
    console.log(`🤖 Running Social Media Automation at ${new Date().toISOString()}`);
    console.log(`${'='.repeat(50)}`);

    const deals = this.getUnpostedDeals(limit);
    console.log(`📦 Found ${deals.length} unposted deals`);

    const channelIds = this.getChannelIds();

    console.log(`📢 Broadcasting to ${channelIds.length} channel(s)`);

    const results = {
      telegram: [],
      channels: channelIds.length,
      total: 0
    };

    if (channelIds.length === 0) {
      console.log('⚠️ No Telegram channels configured');
      return results;
    }

    for (const deal of deals) {
      let postedToAny = false;
      
      for (const channelId of channelIds) {
        console.log(`  📤 Posting to ${channelId}...`);
        const result = await this.postToChannel(deal, channelId);
        
        if (result?.ok) {
          console.log(`  ✅ Success: ${channelId}`);
          postedToAny = true;
          
          // Update channel stats in DB
          try {
            prepare('UPDATE telegram_channels SET post_count = post_count + 1, last_post_at = CURRENT_TIMESTAMP WHERE channel_id = ?').run(channelId);
          } catch (e) {}
        } else {
          console.log(`  ❌ Failed: ${channelId} - ${result?.description || 'Unknown error'}`);
        }
        
        // Rate limit between channels
        await new Promise(resolve => setTimeout(resolve, 1500));
      }
      
      if (postedToAny) {
        this.markAsPosted(deal.id, 'telegram', Date.now().toString());
        results.telegram.push(deal.id);
        results.total++;
      }
      
      // Rate limit between deals
      await new Promise(resolve => setTimeout(resolve, 2000));
    }

    try { saveDatabase(); } catch (e) {}
    console.log(`\n✅ Automation completed: ${results.total} deals posted to ${channelIds.length} channels`);
    return results;
  }

  /**
   * Get posting statistics
   */
  getStats(days = 7) {
    try {
      const total = prepare(`
        SELECT COUNT(*) as count FROM social_posts 
        WHERE posted_at > datetime('now', '-${days} days')
      `).get();

      const byPlatform = prepare(`
        SELECT platform, COUNT(*) as count 
        FROM social_posts 
        WHERE posted_at > datetime('now', '-${days} days')
        GROUP BY platform
      `).all();

      const byDay = prepare(`
        SELECT date(posted_at) as date, COUNT(*) as count 
        FROM social_posts 
        WHERE posted_at > datetime('now', '-${days} days')
        GROUP BY date(posted_at)
        ORDER BY date DESC
      `).all();

      return {
        period: `Last ${days} days`,
        total: total.count,
        byPlatform,
        byDay
      };
    } catch (error) {
      return { error: error.message };
    }
  }
}

export default new SocialAutomationService();

