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
   * Generate HTML banner for a deal - AGGRESSIVE STYLE
   */
  generateBannerHTML(deal, size = 'instagram_square', style = 'gradient_orange') {
    const sizeConfig = BANNER_SIZES[size] || BANNER_SIZES.instagram_square;
    const styleConfig = BANNER_STYLES[style] || BANNER_STYLES.gradient_orange;
    const savings = deal.original_price - deal.current_price;
    const isVertical = sizeConfig.height > sizeConfig.width;
    
    // Aggressive headlines based on discount
    const getHeadline = (discount) => {
      if (discount >= 70) return { text: '🔥 CRAZY DEAL', sub: 'ALMOST FREE!' };
      if (discount >= 50) return { text: '💥 MEGA SALE', sub: 'HALF PRICE!' };
      if (discount >= 40) return { text: '⚡ HOT DEAL', sub: 'MASSIVE SAVINGS!' };
      if (discount >= 30) return { text: '🎯 STEAL THIS', sub: 'LIMITED TIME!' };
      return { text: '✨ SPECIAL OFFER', sub: 'DON\'T MISS OUT!' };
    };
    
    const headline = getHeadline(deal.discount_percent);

    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <link href="https://fonts.googleapis.com/css2?family=Black+Ops+One&family=Inter:wght@700;900&display=swap" rel="stylesheet">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    
    .banner {
      width: ${sizeConfig.width}px;
      height: ${sizeConfig.height}px;
      background: #000;
      font-family: 'Inter', sans-serif;
      position: relative;
      overflow: hidden;
    }
    
    /* Full bleed image */
    .image-bg {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
      object-fit: cover;
      ${isVertical ? '' : 'object-position: center;'}
    }
    
    /* Dark overlay for text readability */
    .overlay {
      position: absolute;
      inset: 0;
      background: linear-gradient(
        ${isVertical ? '180deg' : '90deg'},
        rgba(0,0,0,0.1) 0%,
        rgba(0,0,0,0.3) 40%,
        rgba(0,0,0,0.85) 100%
      );
    }
    
    /* Discount explosion */
    .discount-burst {
      position: absolute;
      ${isVertical ? 'top: 30px; right: 30px;' : 'top: 40px; right: 40px;'}
      width: ${isVertical ? '180px' : '200px'};
      height: ${isVertical ? '180px' : '200px'};
      background: ${styleConfig.background};
      border-radius: 50%;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      box-shadow: 0 0 60px rgba(239,68,68,0.6), 0 0 100px rgba(239,68,68,0.3);
      animation: pulse 1.5s ease-in-out infinite;
      border: 4px solid rgba(255,255,255,0.3);
    }
    
    @keyframes pulse {
      0%, 100% { transform: scale(1); }
      50% { transform: scale(1.05); }
    }
    
    .discount-number {
      font-size: ${isVertical ? '72px' : '80px'};
      font-weight: 900;
      color: white;
      line-height: 1;
      text-shadow: 2px 2px 10px rgba(0,0,0,0.3);
    }
    
    .discount-percent {
      font-size: ${isVertical ? '28px' : '32px'};
      font-weight: 900;
      color: white;
      margin-top: -10px;
    }
    
    .discount-off {
      font-size: ${isVertical ? '20px' : '24px'};
      font-weight: 700;
      color: rgba(255,255,255,0.9);
      letter-spacing: 3px;
    }
    
    /* Content area - compact at bottom */
    .content {
      position: absolute;
      ${isVertical ? `
        bottom: 0;
        left: 0;
        right: 0;
        padding: 40px 30px 50px;
        background: linear-gradient(0deg, rgba(0,0,0,0.95) 0%, rgba(0,0,0,0.8) 70%, transparent 100%);
      ` : `
        bottom: 0;
        left: 0;
        right: 0;
        padding: 30px 40px 40px;
        background: linear-gradient(0deg, rgba(0,0,0,0.95) 0%, rgba(0,0,0,0.7) 80%, transparent 100%);
      `}
      color: white;
    }
    
    .headline {
      font-size: ${isVertical ? '42px' : '48px'};
      font-weight: 900;
      color: ${styleConfig.accentColor};
      text-transform: uppercase;
      letter-spacing: 2px;
      margin-bottom: 5px;
      text-shadow: 2px 2px 20px rgba(0,0,0,0.5);
    }
    
    .subheadline {
      font-size: ${isVertical ? '22px' : '26px'};
      font-weight: 700;
      color: white;
      letter-spacing: 4px;
      margin-bottom: 15px;
      opacity: 0.9;
    }
    
    .title {
      font-size: ${isVertical ? '20px' : '22px'};
      font-weight: 700;
      color: rgba(255,255,255,0.85);
      line-height: 1.3;
      margin-bottom: 20px;
      max-width: ${isVertical ? '100%' : '70%'};
    }
    
    .price-row {
      display: flex;
      align-items: center;
      gap: 20px;
      flex-wrap: wrap;
    }
    
    .old-price {
      font-size: ${isVertical ? '28px' : '32px'};
      color: rgba(255,255,255,0.5);
      text-decoration: line-through;
      font-weight: 700;
    }
    
    .new-price {
      font-size: ${isVertical ? '48px' : '56px'};
      font-weight: 900;
      color: #4ade80;
      text-shadow: 0 0 30px rgba(74,222,128,0.5);
    }
    
    .save-badge {
      background: #ef4444;
      color: white;
      padding: 8px 16px;
      font-size: ${isVertical ? '16px' : '18px'};
      font-weight: 900;
      border-radius: 6px;
      text-transform: uppercase;
      letter-spacing: 1px;
      box-shadow: 0 4px 15px rgba(239,68,68,0.4);
    }
    
    .cta {
      position: absolute;
      ${isVertical ? 'bottom: 50px; left: 30px; right: 30px;' : 'bottom: 40px; right: 40px;'}
      background: white;
      color: #000;
      padding: 16px 40px;
      font-size: ${isVertical ? '20px' : '22px'};
      font-weight: 900;
      border-radius: 50px;
      text-align: center;
      text-transform: uppercase;
      letter-spacing: 2px;
      box-shadow: 0 10px 40px rgba(0,0,0,0.3);
      ${isVertical ? '' : 'display: inline-block;'}
    }
    
    .logo {
      position: absolute;
      ${isVertical ? 'top: 30px; left: 30px;' : 'top: 40px; left: 40px;'}
      font-size: ${isVertical ? '18px' : '20px'};
      font-weight: 900;
      color: white;
      letter-spacing: 3px;
      text-shadow: 2px 2px 10px rgba(0,0,0,0.5);
      opacity: 0.9;
    }
    
    .urgency {
      position: absolute;
      ${isVertical ? 'top: 230px; right: 30px;' : 'top: 260px; right: 40px;'}
      background: rgba(0,0,0,0.7);
      color: #fbbf24;
      padding: 8px 16px;
      font-size: 14px;
      font-weight: 700;
      border-radius: 4px;
      text-transform: uppercase;
      letter-spacing: 1px;
      border: 1px solid #fbbf24;
    }
  </style>
</head>
<body>
  <div class="banner">
    <img class="image-bg" src="${deal.image_url}" alt="" />
    <div class="overlay"></div>
    
    <div class="logo">DEALSLUXY</div>
    
    <div class="discount-burst">
      <span class="discount-number">${deal.discount_percent}</span>
      <span class="discount-percent">%</span>
      <span class="discount-off">OFF</span>
    </div>
    
    <div class="urgency">⏰ Limited Time Only</div>
    
    <div class="content">
      <div class="headline">${headline.text}</div>
      <div class="subheadline">${headline.sub}</div>
      <div class="title">${deal.title?.substring(0, 50)}${deal.title?.length > 50 ? '...' : ''}</div>
      <div class="price-row">
        <span class="old-price">$${deal.original_price?.toFixed(0)}</span>
        <span class="new-price">$${deal.current_price?.toFixed(0)}</span>
        <span class="save-badge">Save $${savings?.toFixed(0)}</span>
      </div>
    </div>
    
    <div class="cta">🛒 Get This Deal</div>
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

