// Banggood Open API Service
// Documentation: https://open.banggood.com/

import crypto from 'crypto';
import { prepare } from '../config/database.js';

const API_BASE = 'https://affiliate.banggood.com/api';

class BanggoodService {
  constructor() {
    this.accessToken = null;
    this.tokenExpiry = 0;
  }

  // Get credentials from env vars or database settings
  getCredentials() {
    let appKey = process.env.BANGGOOD_APP_KEY;
    let appSecret = process.env.BANGGOOD_APP_SECRET;
    
    // If not in env, try to get from database settings
    if (!appKey || !appSecret) {
      try {
        const keyResult = prepare('SELECT value FROM settings WHERE key = ?').get('banggood_app_key');
        const secretResult = prepare('SELECT value FROM settings WHERE key = ?').get('banggood_app_secret');
        if (keyResult?.value) appKey = keyResult.value;
        if (secretResult?.value) appSecret = secretResult.value;
      } catch (e) {
        // Database not initialized yet
      }
    }
    
    return { appKey, appSecret };
  }

  get appKey() {
    return this.getCredentials().appKey;
  }

  get appSecret() {
    return this.getCredentials().appSecret;
  }

  // Generate MD5 signature for API requests
  generateSign(params) {
    const sortedKeys = Object.keys(params).sort();
    let signStr = '';
    for (const key of sortedKeys) {
      if (params[key] !== undefined && params[key] !== '') {
        signStr += `${key}${params[key]}`;
      }
    }
    signStr = this.appSecret + signStr + this.appSecret;
    return crypto.createHash('md5').update(signStr).digest('hex').toUpperCase();
  }

  // Get access token
  async getAccessToken() {
    if (this.accessToken && Date.now() < this.tokenExpiry - 300000) {
      return this.accessToken;
    }

    console.log('🔑 Getting Banggood access token...');
    
    const timestamp = Math.floor(Date.now() / 1000);
    const params = {
      app_id: this.appKey,
      app_secret: this.appSecret,
      timestamp: timestamp.toString()
    };

    try {
      const response = await fetch(`${API_BASE}/getAccessToken`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params)
      });

      const data = await response.json();
      
      if (data.code === 0 && data.access_token) {
        this.accessToken = data.access_token;
        this.tokenExpiry = Date.now() + (data.expire_time || 7200) * 1000;
        console.log('✅ Got Banggood access token');
        return this.accessToken;
      } else {
        console.error('❌ Banggood token error:', data);
        throw new Error(data.msg || 'Failed to get Banggood token');
      }
    } catch (error) {
      console.error('❌ Banggood token error:', error.message);
      throw error;
    }
  }

  // Search products
  async searchProducts(params = {}) {
    const { 
      keywords = '', 
      categoryId = '', 
      minPrice = 0, 
      maxPrice = 10000, 
      minDiscount = 30,
      limit = 50,
      page = 1
    } = params;

    if (!this.appKey || !this.appSecret) {
      console.log('⚠️ Banggood API not configured');
      return [];
    }

    console.log(`\n${'='.repeat(50)}`);
    console.log(`🛒 Banggood API CALL at ${new Date().toISOString()}`);
    console.log(`🔍 Keywords: "${keywords}", Price: $${minPrice}-$${maxPrice}`);
    console.log(`${'='.repeat(50)}`);

    try {
      const token = await this.getAccessToken();
      const timestamp = Math.floor(Date.now() / 1000);

      const requestParams = {
        access_token: token,
        app_id: this.appKey,
        timestamp: timestamp.toString(),
        keyword: keywords,
        page: page.toString(),
        page_size: Math.min(limit, 100).toString(),
        min_price: minPrice.toString(),
        max_price: maxPrice.toString(),
        currency: 'USD',
        lang: 'en'
      };

      if (categoryId) {
        requestParams.cat_id = categoryId;
      }

      requestParams.sign = this.generateSign(requestParams);

      const response = await fetch(`${API_BASE}/product/search`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestParams)
      });

      const data = await response.json();
      console.log(`📡 Banggood Response: code=${data.code}`);

      if (data.code === 0 && data.product_list) {
        const results = this.parseProducts(data.product_list, minDiscount);
        console.log(`✅ Banggood: ${results.length} products matched`);
        return results;
      } else {
        console.log(`⚠️ Banggood: ${data.msg || 'No products found'}`);
        return [];
      }
    } catch (error) {
      console.error('❌ Banggood search error:', error.message);
      return [];
    }
  }

  // Get products by category
  async getProductsByCategory(categoryId, limit = 50) {
    return this.searchProducts({ categoryId, limit });
  }

  // Get hot deals / promotional products
  async getHotDeals(limit = 50) {
    if (!this.appKey || !this.appSecret) {
      console.log('⚠️ Banggood API not configured');
      return [];
    }

    try {
      const token = await this.getAccessToken();
      const timestamp = Math.floor(Date.now() / 1000);

      const requestParams = {
        access_token: token,
        app_id: this.appKey,
        timestamp: timestamp.toString(),
        page: '1',
        page_size: Math.min(limit, 100).toString(),
        type: 'hot', // hot deals
        currency: 'USD',
        lang: 'en'
      };

      requestParams.sign = this.generateSign(requestParams);

      const response = await fetch(`${API_BASE}/product/list`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestParams)
      });

      const data = await response.json();
      
      if (data.code === 0 && data.product_list) {
        return this.parseProducts(data.product_list, 0);
      }
      return [];
    } catch (error) {
      console.error('❌ Banggood hot deals error:', error.message);
      return [];
    }
  }

  // Parse product data to our format
  parseProducts(products, minDiscount = 0) {
    const results = [];
    
    for (const product of products) {
      try {
        const originalPrice = parseFloat(product.price || product.original_price || 0);
        const currentPrice = parseFloat(product.sale_price || product.price || 0);
        
        let discountPercent = 0;
        if (originalPrice > currentPrice && originalPrice > 0) {
          discountPercent = Math.round((1 - currentPrice / originalPrice) * 100);
        } else if (product.discount) {
          discountPercent = parseInt(product.discount);
        }

        // Apply discount filter
        if (discountPercent < minDiscount) continue;

        results.push({
          sourceItemId: product.product_id || product.sku || '',
          source: 'banggood',
          title: product.title || product.product_name || '',
          imageUrl: product.image_url || product.img_url || product.thumb || '',
          originalPrice: originalPrice || currentPrice * 1.3,
          currentPrice: currentPrice,
          discountPercent: discountPercent || 28,
          currency: product.currency || 'USD',
          condition: 'New',
          productUrl: product.url || product.product_url || '',
          categoryId: product.cat_id || product.category_id || '',
          categoryName: product.cat_name || product.category_name || 'Electronics'
        });
      } catch (err) {
        console.error('Error parsing Banggood product:', err);
      }
    }

    return results;
  }

  // Generate affiliate URL
  getAffiliateUrl(productUrl) {
    if (!productUrl) return '';
    
    // Add affiliate tracking parameters
    const separator = productUrl.includes('?') ? '&' : '?';
    return `${productUrl}${separator}p=${this.appKey}&utm_source=affiliate`;
  }

  // Get categories
  async getCategories() {
    if (!this.appKey || !this.appSecret) {
      return [];
    }

    try {
      const token = await this.getAccessToken();
      const timestamp = Math.floor(Date.now() / 1000);

      const requestParams = {
        access_token: token,
        app_id: this.appKey,
        timestamp: timestamp.toString(),
        lang: 'en'
      };

      requestParams.sign = this.generateSign(requestParams);

      const response = await fetch(`${API_BASE}/category/list`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestParams)
      });

      const data = await response.json();
      
      if (data.code === 0 && data.category_list) {
        return data.category_list;
      }
      return [];
    } catch (error) {
      console.error('❌ Banggood categories error:', error.message);
      return [];
    }
  }
}

export default new BanggoodService();

