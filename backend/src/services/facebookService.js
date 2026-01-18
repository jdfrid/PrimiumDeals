/**
 * Facebook Page Service
 * Posts deals to Facebook Pages using Graph API
 */

import { prepare, saveDatabase } from '../config/database.js';

class FacebookService {
  constructor() {
    this.pageAccessToken = process.env.FACEBOOK_PAGE_ACCESS_TOKEN;
    this.pageId = process.env.FACEBOOK_PAGE_ID;
  }

  /**
   * Check if Facebook is configured
   */
  isConfigured() {
    return !!(this.pageAccessToken && this.pageId);
  }

  /**
   * Post a deal to Facebook Page
   */
  async postDeal(deal) {
    if (!this.isConfigured()) {
      console.log('⚠️ Facebook not configured');
      return null;
    }

    const trackingUrl = `https://dealsluxy.com/api/track/click/${deal.id}?utm_source=facebook&utm_medium=page&utm_campaign=auto_post`;
    const savings = deal.original_price - deal.current_price;

    const message = `🔥 ${deal.discount_percent}% OFF!\n\n` +
                   `${deal.title}\n\n` +
                   `💰 Was: $${deal.original_price.toFixed(0)}\n` +
                   `✨ Now: $${deal.current_price.toFixed(0)}\n` +
                   `💵 You Save: $${savings.toFixed(0)}!\n\n` +
                   `🛒 Get this deal: ${trackingUrl}\n\n` +
                   `#deals #sale #discount #shopping #dealsluxy`;

    try {
      // Post with image
      const response = await fetch(
        `https://graph.facebook.com/v18.0/${this.pageId}/photos`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            url: deal.image_url,
            message: message,
            access_token: this.pageAccessToken
          })
        }
      );

      const data = await response.json();

      if (data.id) {
        console.log(`✅ Posted to Facebook: ${deal.title.substring(0, 40)}...`);
        return { ok: true, post_id: data.id };
      } else {
        console.error('Facebook API error:', data.error?.message || 'Unknown error');
        return { ok: false, error: data.error?.message };
      }
    } catch (error) {
      console.error('Facebook post error:', error.message);
      return { ok: false, error: error.message };
    }
  }

  /**
   * Post text only (no image)
   */
  async postText(message, link = null) {
    if (!this.isConfigured()) {
      return null;
    }

    try {
      const body = {
        message: message,
        access_token: this.pageAccessToken
      };
      
      if (link) {
        body.link = link;
      }

      const response = await fetch(
        `https://graph.facebook.com/v18.0/${this.pageId}/feed`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body)
        }
      );

      const data = await response.json();
      return data.id ? { ok: true, post_id: data.id } : { ok: false, error: data.error?.message };
    } catch (error) {
      return { ok: false, error: error.message };
    }
  }

  /**
   * Get page info to verify connection
   */
  async getPageInfo() {
    if (!this.isConfigured()) {
      return { error: 'Facebook not configured' };
    }

    try {
      const response = await fetch(
        `https://graph.facebook.com/v18.0/${this.pageId}?fields=name,fan_count,link&access_token=${this.pageAccessToken}`
      );
      const data = await response.json();
      
      if (data.error) {
        return { error: data.error.message };
      }
      
      return {
        id: data.id,
        name: data.name,
        followers: data.fan_count,
        link: data.link
      };
    } catch (error) {
      return { error: error.message };
    }
  }
}

export default new FacebookService();



