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
   * Generate HTML banner for a deal
   */
  generateBannerHTML(deal, size = 'instagram_square', style = 'gradient_orange') {
    const sizeConfig = BANNER_SIZES[size] || BANNER_SIZES.instagram_square;
    const styleConfig = BANNER_STYLES[style] || BANNER_STYLES.gradient_orange;
    const savings = deal.original_price - deal.current_price;
    const trackingUrl = `https://dealsluxy.com/api/track/click/${deal.id}`;

    // Calculate font sizes based on banner dimensions
    const baseFontSize = Math.min(sizeConfig.width, sizeConfig.height) / 20;
    const isVertical = sizeConfig.height > sizeConfig.width;

    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta property="og:title" content="${deal.discount_percent}% OFF - ${deal.title?.substring(0, 60)}">
  <meta property="og:image" content="${deal.image_url}">
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;900&display=swap" rel="stylesheet">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    
    .banner {
      width: ${sizeConfig.width}px;
      height: ${sizeConfig.height}px;
      background: ${styleConfig.background};
      font-family: 'Inter', system-ui, sans-serif;
      color: ${styleConfig.textColor};
      display: flex;
      flex-direction: ${isVertical ? 'column' : 'row'};
      overflow: hidden;
      position: relative;
    }
    
    .image-section {
      ${isVertical ? `
        width: 100%;
        height: 55%;
      ` : `
        width: 45%;
        height: 100%;
      `}
      position: relative;
      overflow: hidden;
    }
    
    .deal-image {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
    
    .discount-badge {
      position: absolute;
      ${isVertical ? 'top: 20px; left: 20px;' : 'top: 30px; left: 30px;'}
      background: ${styleConfig.accentColor};
      color: ${style === 'light' ? '#ffffff' : '#000000'};
      padding: ${baseFontSize * 0.5}px ${baseFontSize}px;
      border-radius: ${baseFontSize * 0.5}px;
      font-weight: 900;
      font-size: ${baseFontSize * 1.5}px;
      box-shadow: 0 4px 20px rgba(0,0,0,0.3);
      transform: rotate(-5deg);
    }
    
    .content-section {
      flex: 1;
      padding: ${baseFontSize * 1.5}px;
      display: flex;
      flex-direction: column;
      justify-content: center;
      ${isVertical ? 'align-items: center; text-align: center;' : ''}
    }
    
    .sale-tag {
      background: rgba(255,255,255,0.2);
      padding: ${baseFontSize * 0.3}px ${baseFontSize * 0.8}px;
      border-radius: ${baseFontSize * 0.3}px;
      font-size: ${baseFontSize * 0.7}px;
      font-weight: 600;
      letter-spacing: 2px;
      text-transform: uppercase;
      margin-bottom: ${baseFontSize * 0.5}px;
      display: inline-block;
    }
    
    .title {
      font-size: ${baseFontSize * (isVertical ? 1.3 : 1.1)}px;
      font-weight: 700;
      line-height: 1.2;
      margin-bottom: ${baseFontSize}px;
      ${isVertical ? '' : 'max-width: 90%;'}
    }
    
    .prices {
      display: flex;
      align-items: center;
      gap: ${baseFontSize}px;
      margin-bottom: ${baseFontSize * 0.8}px;
      ${isVertical ? 'justify-content: center;' : ''}
    }
    
    .old-price {
      font-size: ${baseFontSize * 1.2}px;
      text-decoration: line-through;
      opacity: 0.6;
    }
    
    .new-price {
      font-size: ${baseFontSize * 2}px;
      font-weight: 900;
    }
    
    .savings-box {
      background: rgba(255,255,255,0.15);
      padding: ${baseFontSize * 0.5}px ${baseFontSize}px;
      border-radius: ${baseFontSize * 0.4}px;
      font-size: ${baseFontSize * 0.9}px;
      font-weight: 600;
      margin-bottom: ${baseFontSize}px;
      display: inline-block;
    }
    
    .cta-button {
      background: ${style === 'light' ? '#ef4444' : 'rgba(255,255,255,0.95)'};
      color: ${style === 'light' ? '#ffffff' : '#000000'};
      padding: ${baseFontSize * 0.7}px ${baseFontSize * 1.5}px;
      border-radius: ${baseFontSize * 0.5}px;
      font-weight: 700;
      font-size: ${baseFontSize * 0.9}px;
      display: inline-block;
      box-shadow: 0 4px 15px rgba(0,0,0,0.2);
    }
    
    .logo {
      position: absolute;
      bottom: ${baseFontSize}px;
      right: ${baseFontSize}px;
      font-size: ${baseFontSize * 0.8}px;
      font-weight: 700;
      opacity: 0.8;
    }
    
    .watermark {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%) rotate(-30deg);
      font-size: ${baseFontSize * 4}px;
      font-weight: 900;
      opacity: 0.03;
      white-space: nowrap;
      pointer-events: none;
    }
  </style>
</head>
<body>
  <div class="banner">
    <div class="watermark">DEALSLUXY</div>
    
    <div class="image-section">
      <img class="deal-image" src="${deal.image_url}" alt="${deal.title}" />
      <div class="discount-badge">-${deal.discount_percent}%</div>
    </div>
    
    <div class="content-section">
      <span class="sale-tag">🔥 LIMITED DEAL</span>
      <h2 class="title">${deal.title?.substring(0, isVertical ? 60 : 80)}${deal.title?.length > (isVertical ? 60 : 80) ? '...' : ''}</h2>
      
      <div class="prices">
        <span class="old-price">$${deal.original_price?.toFixed(0)}</span>
        <span class="new-price">$${deal.current_price?.toFixed(0)}</span>
      </div>
      
      <div class="savings-box">💰 You Save $${savings?.toFixed(0)}!</div>
      
      <div class="cta-button">🛒 Shop Now</div>
    </div>
    
    <div class="logo">DEALSLUXY.COM</div>
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

