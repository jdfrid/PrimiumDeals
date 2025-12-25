/**
 * Image Generator Service
 * Converts HTML banners to PNG images using Puppeteer
 */

import puppeteer from 'puppeteer';
import { prepare } from '../config/database.js';
import bannerService from './bannerService.js';

class ImageGenerator {
  constructor() {
    this.browser = null;
  }

  async getBrowser() {
    if (!this.browser) {
      this.browser = await puppeteer.launch({
        headless: 'new',
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--disable-gpu',
          '--single-process'
        ]
      });
    }
    return this.browser;
  }

  /**
   * Convert HTML to PNG image buffer
   */
  async generateImageBuffer(html, width = 1080, height = 1080) {
    const browser = await this.getBrowser();
    const page = await browser.newPage();
    
    try {
      await page.setViewport({ width, height, deviceScaleFactor: 1 });
      await page.setContent(html, { waitUntil: 'networkidle0', timeout: 30000 });
      
      // Wait a bit for images to load
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const imageBuffer = await page.screenshot({
        type: 'png',
        clip: { x: 0, y: 0, width, height }
      });
      
      return imageBuffer;
    } finally {
      await page.close();
    }
  }

  /**
   * Generate image for a specific banner
   */
  async generateBannerImage(bannerId) {
    const banner = bannerService.getBanner(bannerId);
    if (!banner) {
      throw new Error('Banner not found');
    }

    // Get size dimensions
    const sizes = {
      instagram_square: { width: 1080, height: 1080 },
      instagram_story: { width: 1080, height: 1920 },
      facebook_post: { width: 1200, height: 630 },
      twitter_post: { width: 1200, height: 675 },
      pinterest_pin: { width: 1000, height: 1500 },
      telegram: { width: 800, height: 600 }
    };

    const size = sizes[banner.size] || sizes.instagram_square;
    const imageBuffer = await this.generateImageBuffer(banner.html_content, size.width, size.height);
    
    return imageBuffer;
  }

  /**
   * Generate image for a deal (creates banner + converts to image)
   */
  async generateDealImage(dealId, size = 'telegram', style = 'gradient_orange') {
    const deal = prepare(`
      SELECT d.*, c.name as category_name 
      FROM deals d 
      LEFT JOIN categories c ON d.category_id = c.id 
      WHERE d.id = ?
    `).get(dealId);

    if (!deal) {
      throw new Error('Deal not found');
    }

    const sizes = {
      instagram_square: { width: 1080, height: 1080 },
      instagram_story: { width: 1080, height: 1920 },
      facebook_post: { width: 1200, height: 630 },
      twitter_post: { width: 1200, height: 675 },
      pinterest_pin: { width: 1000, height: 1500 },
      telegram: { width: 800, height: 600 }
    };

    const sizeConfig = sizes[size] || sizes.telegram;
    const html = bannerService.generateBannerHTML(deal, size, style);
    const imageBuffer = await this.generateImageBuffer(html, sizeConfig.width, sizeConfig.height);
    
    return imageBuffer;
  }

  /**
   * Close browser when done
   */
  async close() {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }
}

export default new ImageGenerator();
