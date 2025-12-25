/**
 * Banner Generation Service
 * Creates marketing banners for deals in multiple formats and sizes
 */

import { prepare, saveDatabase } from '../config/database.js';
import fs from 'fs';
import path from 'path';

// Banner templates and sizes
const BANNER_SIZES = {
  instagram_square: { width: 1080, height: 1080, name: 'Instagram Square' },
  instagram_story: { width: 1080, height: 1920, name: 'Instagram Story' },
  facebook_post: { width: 1200, height: 630, name: 'Facebook Post' },
  twitter_post: { width: 1200, height: 675, name: 'Twitter Post' },
  pinterest_pin: { width: 1000, height: 1500, name: 'Pinterest Pin' },
  telegram: { width: 800, height: 600, name: 'Telegram' }
};

const BANNER_STYLES = {
  gradient_orange: {
    name: 'Orange Gradient',
    background: 'linear-gradient(135deg, #f97316 0%, #ef4444 100%)',
    textColor: '#ffffff',
    accentColor: '#fbbf24'
  },
  gradient_purple: {
    name: 'Purple Gradient',
    background: 'linear-gradient(135deg, #8b5cf6 0%, #ec4899 100%)',
    textColor: '#ffffff',
    accentColor: '#f9a8d4'
  },
  gradient_blue: {
    name: 'Blue Gradient',
    background: 'linear-gradient(135deg, #3b82f6 0%, #06b6d4 100%)',
    textColor: '#ffffff',
    accentColor: '#67e8f9'
  },
  dark: {
    name: 'Dark Elegant',
    background: 'linear-gradient(135deg, #1f2937 0%, #111827 100%)',
    textColor: '#ffffff',
    accentColor: '#f59e0b'
  },
  light: {
    name: 'Light Clean',
    background: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)',
    textColor: '#1f2937',
    accentColor: '#ef4444'
  }
};

class BannerService {
  constructor() {
    // Ensure banners directory exists
    this.bannersDir = path.join(process.cwd(), 'public', 'banners');
    if (!fs.existsSync(this.bannersDir)) {
      fs.mkdirSync(this.bannersDir, { recursive: true });
    }
  }

  /**
   * Generate HTML banner for a deal - SIMPLE RELIABLE STYLE
   */
  generateBannerHTML(deal, size = 'instagram_square', style = 'gradient_orange') {
    const sizeConfig = BANNER_SIZES[size] || BANNER_SIZES.instagram_square;
    const styleConfig = BANNER_STYLES[style] || BANNER_STYLES.gradient_orange;
    const savings = deal.original_price - deal.current_price;
    const isVertical = sizeConfig.height > sizeConfig.width;
    const w = sizeConfig.width;
    const h = sizeConfig.height;
    
    // Aggressive headlines based on discount
    const getHeadline = (discount) => {
      if (discount >= 70) return '🔥 CRAZY DEAL';
      if (discount >= 50) return '💥 MEGA SALE';
      if (discount >= 40) return '⚡ HOT DEAL';
      if (discount >= 30) return '🎯 STEAL IT';
      return '✨ SPECIAL';
    };

    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: Arial, Helvetica, sans-serif; }
  </style>
</head>
<body>
  <div style="width:${w}px;height:${h}px;position:relative;overflow:hidden;background:#000;">
    
    <!-- RED DISCOUNT BANNER AT TOP -->
    <div style="position:absolute;top:0;left:0;right:0;z-index:100;background:linear-gradient(90deg,#dc2626,#ef4444,#dc2626);padding:${isVertical ? '15px 20px' : '18px 25px'};display:flex;align-items:center;justify-content:center;gap:15px;box-shadow:0 4px 20px rgba(0,0,0,0.4);">
      <span style="font-size:${isVertical ? '28px' : '32px'};font-weight:900;color:white;text-transform:uppercase;letter-spacing:2px;">🔥 ${deal.discount_percent}% OFF</span>
      <span style="background:white;color:#dc2626;padding:6px 14px;font-size:${isVertical ? '14px' : '16px'};font-weight:900;border-radius:4px;text-transform:uppercase;">LIMITED TIME</span>
    </div>
    
    <!-- Product Image -->
    <img src="${deal.image_url}" style="position:absolute;top:${isVertical ? '60px' : '70px'};left:0;width:100%;height:${isVertical ? '55%' : 'calc(100% - 70px)'};object-fit:cover;" />
    
    <!-- Gradient Overlay -->
    <div style="position:absolute;inset:0;background:linear-gradient(${isVertical ? '180deg' : '135deg'},transparent 40%,rgba(0,0,0,0.95) 100%);"></div>
    
    <!-- Logo -->
    <div style="position:absolute;top:${isVertical ? '75px' : '90px'};left:${isVertical ? '20px' : '25px'};color:white;font-size:${isVertical ? '14px' : '16px'};font-weight:900;letter-spacing:2px;text-shadow:2px 2px 8px rgba(0,0,0,0.8);background:rgba(0,0,0,0.5);padding:6px 12px;border-radius:4px;">DEALSLUXY</div>
    
    <!-- Content Box -->
    <div style="position:absolute;bottom:0;left:0;right:0;padding:${isVertical ? '30px 25px 100px' : '25px 30px 30px'};background:linear-gradient(0deg,rgba(0,0,0,0.95) 60%,transparent);">
      
      <!-- Headline -->
      <div style="font-size:${isVertical ? '32px' : '36px'};font-weight:900;color:#fbbf24;text-transform:uppercase;letter-spacing:1px;margin-bottom:8px;text-shadow:2px 2px 10px rgba(0,0,0,0.5);">
        ${getHeadline(deal.discount_percent)}
      </div>
      
      <!-- Product Title -->
      <div style="font-size:${isVertical ? '18px' : '20px'};font-weight:700;color:rgba(255,255,255,0.9);line-height:1.3;margin-bottom:15px;max-width:${isVertical ? '100%' : '65%'};">
        ${deal.title?.substring(0, 45)}${deal.title?.length > 45 ? '...' : ''}
      </div>
      
      <!-- Prices -->
      <div style="display:flex;align-items:center;gap:15px;flex-wrap:wrap;">
        <span style="font-size:${isVertical ? '22px' : '26px'};color:rgba(255,255,255,0.5);text-decoration:line-through;font-weight:700;">$${deal.original_price?.toFixed(0)}</span>
        <span style="font-size:${isVertical ? '38px' : '44px'};font-weight:900;color:#4ade80;text-shadow:0 0 20px rgba(74,222,128,0.4);">$${deal.current_price?.toFixed(0)}</span>
        <span style="background:#ef4444;color:white;padding:6px 12px;font-size:${isVertical ? '14px' : '16px'};font-weight:900;border-radius:5px;text-transform:uppercase;">SAVE $${savings?.toFixed(0)}</span>
      </div>
    </div>
    
    <!-- CTA Button -->
    <div style="position:absolute;bottom:${isVertical ? '85px' : '75px'};${isVertical ? 'left:25px;right:25px;' : 'right:30px;'}background:white;color:#000;padding:${isVertical ? '14px 30px' : '12px 28px'};font-size:${isVertical ? '18px' : '20px'};font-weight:900;border-radius:50px;text-align:center;text-transform:uppercase;letter-spacing:1px;box-shadow:0 6px 20px rgba(0,0,0,0.3);">
      🛒 GET THIS DEAL
    </div>
    
    <!-- Website Footer -->
    <div style="position:absolute;bottom:0;left:0;right:0;background:linear-gradient(90deg,#1e1e1e,#2d2d2d,#1e1e1e);padding:${isVertical ? '18px 25px' : '15px 30px'};display:flex;align-items:center;justify-content:space-between;border-top:2px solid #fbbf24;">
      <div style="display:flex;align-items:center;gap:10px;">
        <span style="font-size:${isVertical ? '24px' : '28px'};font-weight:900;color:#fbbf24;letter-spacing:1px;">DEALSLUXY</span>
        <span style="color:rgba(255,255,255,0.5);font-size:${isVertical ? '14px' : '16px'};">|</span>
        <span style="color:rgba(255,255,255,0.7);font-size:${isVertical ? '14px' : '16px'};font-weight:600;">Luxury Deals Daily</span>
      </div>
      <div style="background:#fbbf24;color:#000;padding:${isVertical ? '8px 16px' : '6px 14px'};border-radius:6px;font-weight:900;font-size:${isVertical ? '14px' : '16px'};">
        DEALSLUXY.COM
      </div>
    </div>
    
  </div>
</body>
</html>`;

    return html;
  }

  /**
   * Generate and save banner for a deal
   */
  async generateBanner(dealId, size = 'instagram_square', style = 'gradient_orange') {
    try {
      const deal = prepare(`
        SELECT d.*, c.name as category_name 
        FROM deals d 
        LEFT JOIN categories c ON d.category_id = c.id 
        WHERE d.id = ?
      `).get(dealId);

      if (!deal) {
        throw new Error('Deal not found');
      }

      const html = this.generateBannerHTML(deal, size, style);
      const bannerId = `${dealId}_${size}_${style}_${Date.now()}`;
      
      // Save banner record to database
      prepare(`
        INSERT INTO banners (deal_id, size, style, banner_id, html_content, created_at)
        VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      `).run(dealId, size, style, bannerId, html);
      
      saveDatabase();

      return {
        banner_id: bannerId,
        deal_id: dealId,
        size,
        style,
        url: `/api/banners/${bannerId}`,
        preview_url: `/api/banners/${bannerId}/preview`
      };
    } catch (error) {
      console.error('Banner generation error:', error);
      throw error;
    }
  }

  /**
   * Generate all banner sizes for a deal
   */
  async generateAllBanners(dealId, style = 'gradient_orange') {
    const results = [];
    
    for (const size of Object.keys(BANNER_SIZES)) {
      try {
        const banner = await this.generateBanner(dealId, size, style);
        results.push(banner);
      } catch (error) {
        console.error(`Failed to generate ${size} banner:`, error);
      }
    }
    
    return results;
  }

  /**
   * Generate banners for today's new deals
   */
  async generateBannersForNewDeals(limit = 10) {
    try {
      // Get today's deals that don't have banners yet
      const deals = prepare(`
        SELECT d.id 
        FROM deals d
        LEFT JOIN banners b ON d.id = b.deal_id
        WHERE d.is_active = 1 
          AND d.discount_percent >= 25
          AND d.image_url IS NOT NULL
          AND date(d.created_at) >= date('now', '-1 day')
          AND b.id IS NULL
        ORDER BY d.discount_percent DESC
        LIMIT ?
      `).all(limit);

      console.log(`\n🎨 Generating banners for ${deals.length} new deals...`);
      
      const results = [];
      for (const deal of deals) {
        // Generate main sizes
        const sizes = ['instagram_square', 'instagram_story', 'facebook_post'];
        for (const size of sizes) {
          try {
            const banner = await this.generateBanner(deal.id, size, 'gradient_orange');
            results.push(banner);
          } catch (e) {
            console.error(`Failed banner for deal ${deal.id}:`, e.message);
          }
        }
      }

      console.log(`✅ Generated ${results.length} banners`);
      return results;
    } catch (error) {
      console.error('Batch banner generation error:', error);
      return [];
    }
  }

  /**
   * Get banner by ID
   */
  getBanner(bannerId) {
    return prepare('SELECT * FROM banners WHERE banner_id = ?').get(bannerId);
  }

  /**
   * Get all banners for a deal
   */
  getBannersForDeal(dealId) {
    return prepare(`
      SELECT b.*, d.title as deal_title, d.image_url as deal_image
      FROM banners b
      JOIN deals d ON b.deal_id = d.id
      WHERE b.deal_id = ?
      ORDER BY b.created_at DESC
    `).all(dealId);
  }

  /**
   * Get recent banners
   */
  getRecentBanners(limit = 50) {
    return prepare(`
      SELECT b.*, d.title as deal_title, d.image_url as deal_image, 
             d.discount_percent, d.current_price
      FROM banners b
      JOIN deals d ON b.deal_id = d.id
      WHERE d.is_active = 1
      ORDER BY b.created_at DESC
      LIMIT ?
    `).all(limit);
  }

  /**
   * Get banner statistics
   */
  getStats() {
    const total = prepare('SELECT COUNT(*) as count FROM banners').get();
    const bySize = prepare(`
      SELECT size, COUNT(*) as count FROM banners GROUP BY size
    `).all();
    const byStyle = prepare(`
      SELECT style, COUNT(*) as count FROM banners GROUP BY style
    `).all();
    const today = prepare(`
      SELECT COUNT(*) as count FROM banners WHERE date(created_at) = date('now')
    `).get();

    return {
      total: total.count,
      today: today.count,
      bySize,
      byStyle
    };
  }

  /**
   * Get available sizes and styles
   */
  getOptions() {
    return {
      sizes: Object.entries(BANNER_SIZES).map(([key, value]) => ({
        id: key,
        ...value
      })),
      styles: Object.entries(BANNER_STYLES).map(([key, value]) => ({
        id: key,
        ...value
      }))
    };
  }
}

export default new BannerService();

