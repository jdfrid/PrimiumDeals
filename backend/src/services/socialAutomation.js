/**
 * Social Media Automation Service
 * Handles automated posting to various social platforms
 */

import { prepare, saveDatabase } from '../config/database.js';

class SocialAutomationService {
  constructor() {
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

  /**
   * Get deals that haven't been posted yet
   */
  getUnpostedDeals(limit = 5) {
    try {
      return prepare(`
        SELECT 
          d.id, d.title, d.image_url, d.original_price, d.current_price, 
          d.discount_percent, d.ebay_url, d.source,
          c.name as category_name
        FROM deals d
        LEFT JOIN categories c ON d.category_id = c.id
        LEFT JOIN social_posts sp ON d.id = sp.deal_id
        WHERE d.is_active = 1 
          AND d.discount_percent >= 30
          AND d.image_url IS NOT NULL
          AND sp.id IS NULL
          AND d.created_at > datetime('now', '-2 days')
        ORDER BY d.discount_percent DESC
        LIMIT ?
      `).all(limit);
    } catch (error) {
      console.error('Error getting unposted deals:', error);
      return [];
    }
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
   * Post to Telegram with product image
   */
  async postToTelegram(deal) {
    if (!this.platforms.telegram.botToken || !this.platforms.telegram.channelId) {
      console.log('⚠️ Telegram not configured');
      return null;
    }

    const trackingUrl = `https://dealsluxy.com/api/track/click/${deal.id}?utm_source=telegram&utm_medium=social&utm_campaign=auto_post`;
    const savings = deal.original_price - deal.current_price;
    
    // Nice formatted caption
    const caption = `🔥 <b>${deal.discount_percent}% OFF!</b>\n\n` +
                   `${deal.title}\n\n` +
                   `💰 <s>$${deal.original_price.toFixed(0)}</s> → <b>$${deal.current_price.toFixed(0)}</b>\n` +
                   `💵 Save $${savings.toFixed(0)}!\n\n` +
                   `🛒 <a href="${trackingUrl}">Get This Deal</a>\n\n` +
                   `━━━━━━━━━━━━━━━\n` +
                   `🏷️ <b>DEALSLUXY.COM</b>`;
    
    try {
      const response = await fetch(
        `https://api.telegram.org/bot${this.platforms.telegram.botToken}/sendPhoto`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: this.platforms.telegram.channelId,
            photo: deal.image_url,
            caption: caption,
            parse_mode: 'HTML'
          })
        }
      );

      const data = await response.json();
      
      if (data.ok) {
        console.log(`✅ Posted to Telegram: ${deal.title.substring(0, 40)}...`);
        this.markAsPosted(deal.id, 'telegram', data.result.message_id);
        return data;
      } else {
        console.error('Telegram API error:', data.description);
        return null;
      }
    } catch (error) {
      console.error('Telegram post error:', error.message);
      return null;
    }
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

    const results = {
      telegram: [],
      twitter: [],
      total: 0
    };

    for (const deal of deals) {
      // Post to Telegram
      if (this.platforms.telegram.botToken) {
        const telegramResult = await this.postToTelegram(deal);
        if (telegramResult?.ok) {
          results.telegram.push(deal.id);
          results.total++;
        }
        // Rate limit: wait 3 seconds between posts
        await new Promise(resolve => setTimeout(resolve, 3000));
      }
    }

    console.log(`\n✅ Automation completed: ${results.total} posts created`);
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

