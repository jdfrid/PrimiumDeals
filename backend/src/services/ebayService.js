// eBay Browse API Service (RESTful API - recommended)
// https://developer.ebay.com/api-docs/buy/browse/overview.html

const BROWSE_API_BASE = 'https://api.ebay.com/buy/browse/v1/item_summary/search';
const OAUTH_URL = 'https://api.ebay.com/identity/v1/oauth2/token';

// Cache configuration
const CACHE_TTL = 30 * 60 * 1000; // 30 minutes
const cache = new Map();

// Token cache
let cachedToken = null;
let tokenExpiry = 0;

class EbayService {
  constructor() {
    /** Application Key “App ID (Client ID)” */
    this.appId = (process.env.EBAY_APP_ID || '').trim();
    /** Cert ID / Client Secret — never hardcode; required for OAuth */
    this.certId = (process.env.EBAY_CERT_ID || process.env.EBAY_CLIENT_SECRET || '').trim();
    this.campaignId = process.env.EBAY_CAMPAIGN_ID;
    /** Browse API client-credentials scope (override only if eBay keys page differs) */
    this.oauthScope =
      (process.env.EBAY_OAUTH_SCOPE || 'https://api.ebay.com/oauth/api_scope').trim();
    
    // Clean expired cache entries every 10 minutes
    setInterval(() => this.cleanExpiredCache(), 10 * 60 * 1000);
  }

  /** Both Client ID + Client Secret must be set for Browse API OAuth */
  isConfigured() {
    return !!(this.appId && this.certId);
  }

  // Get OAuth token (cached)
  async getAccessToken() {
    // Return cached token if still valid (with 5 min buffer)
    if (cachedToken && Date.now() < tokenExpiry - 300000) {
      return cachedToken;
    }

    if (!this.isConfigured()) {
      throw new Error(
        'eBay OAuth missing credentials: set EBAY_APP_ID (Client ID) and EBAY_CERT_ID or EBAY_CLIENT_SECRET (Client Secret) from developer.ebay.com → Application Keys.'
      );
    }

    console.log('🔑 Getting new OAuth token...');

    const credentials = Buffer.from(`${this.appId}:${this.certId}`).toString('base64');

    const response = await fetch(OAUTH_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: `Basic ${credentials}`
      },
      body: `grant_type=client_credentials&scope=${encodeURIComponent(this.oauthScope)}`
    });

    const raw = await response.text();
    let data;
    try {
      data = JSON.parse(raw);
    } catch {
      console.error('❌ OAuth non-JSON response:', raw.slice(0, 400));
      throw new Error(
        `eBay OAuth returned ${response.status}. Check EBAY_APP_ID / EBAY_CERT_ID (Client Secret). Raw: ${raw.slice(0, 120)}`
      );
    }

    if (!response.ok) {
      console.error('❌ OAuth Error:', data);
      const msg =
        data.error_description ||
        data.error?.message ||
        data.error ||
        data.errors?.[0]?.message ||
        `HTTP ${response.status}`;
      throw new Error(`eBay OAuth failed: ${msg}`);
    }

    cachedToken = data.access_token;
    tokenExpiry = Date.now() + (data.expires_in * 1000);
    console.log('✅ Got OAuth token (expires in', data.expires_in, 'seconds)');
    
    return cachedToken;
  }

  // Generate cache key from search parameters
  getCacheKey(params) {
    const { keywords = '', categoryIds = [], minPrice = 0, maxPrice = 10000, minDiscount = 30, limit = 100 } = params;
    const catKey = Array.isArray(categoryIds) ? categoryIds.join('-') : categoryIds;
    return `browse|${keywords}|${catKey}|${minPrice}|${maxPrice}|${minDiscount}|${limit}`;
  }

  // Check if cached result is still valid
  getCachedResult(key) {
    const cached = cache.get(key);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      return cached.data;
    }
    if (cached) {
      cache.delete(key);
    }
    return null;
  }

  // Store result in cache
  setCachedResult(key, data) {
    cache.set(key, { data, timestamp: Date.now() });
  }

  // Remove expired cache entries
  cleanExpiredCache() {
    const now = Date.now();
    for (const [key, value] of cache.entries()) {
      if (now - value.timestamp >= CACHE_TTL) {
        cache.delete(key);
      }
    }
    console.log(`🧹 Cache cleanup: ${cache.size} entries remaining`);
  }

  // Get cache statistics
  getCacheStats() {
    return {
      size: cache.size,
      ttlMinutes: CACHE_TTL / 60000
    };
  }

  // Clear all cache entries
  clearCache() {
    const size = cache.size;
    cache.clear();
    console.log(`🧹 Cleared ${size} cache entries`);
    return size;
  }

  async searchItems(params) {
    const { keywords = '', categoryIds = [], minPrice = 0, maxPrice = 10000, minDiscount = 30, limit = 100 } = params;

    // Check cache first
    const cacheKey = this.getCacheKey(params);
    const cachedResult = this.getCachedResult(cacheKey);
    
    if (cachedResult) {
      console.log(`\n${'='.repeat(50)}`);
      console.log(`💾 CACHE HIT at ${new Date().toISOString()}`);
      console.log(`💾 Keywords: "${keywords}", Returning ${cachedResult.length} cached items`);
      console.log(`${'='.repeat(50)}`);
      return cachedResult;
    }

    // Normalize categoryIds to array
    const catArray = Array.isArray(categoryIds) ? categoryIds : (categoryIds ? [categoryIds] : []);

    console.log(`\n${'='.repeat(50)}`);
    console.log(`🔍 eBay Browse API CALL at ${new Date().toISOString()}`);
    console.log(`🔍 Keywords: "${keywords}", Price: $${minPrice}-$${maxPrice}`);
    console.log(`📂 Categories: ${catArray.length > 0 ? catArray.join(', ') : 'All'}`);
    console.log(`📊 Cache size: ${cache.size} entries`);
    console.log(`${'='.repeat(50)}`);
    
    if (!this.isConfigured()) {
      console.error('❌ eBay Browse API: EBAY_APP_ID and EBAY_CERT_ID (or EBAY_CLIENT_SECRET) are required');
      throw new Error(
        'eBay API credentials not configured — add EBAY_APP_ID and EBAY_CERT_ID (Client Secret) on the server.'
      );
    }

    try {
      // Get OAuth token
      const token = await this.getAccessToken();

      // Build query parameters for Browse API
      const searchParams = new URLSearchParams();
      searchParams.set('q', keywords || 'luxury watch');
      searchParams.set('limit', Math.min(limit, 200).toString()); // Browse API max is 200
      
      // Add category filter if specified
      if (catArray.length > 0) {
        searchParams.set('category_ids', catArray.join(','));
        console.log(`📂 Filtering by categories: ${catArray.join(',')}`);
      }
      
      // Build filter string
      const filters = [];
      if (minPrice > 0 || maxPrice < 10000) {
        filters.push(`price:[${minPrice}..${maxPrice}]`);
        filters.push('priceCurrency:USD');
      }
      if (filters.length > 0) {
        searchParams.set('filter', filters.join(','));
      }

      const url = `${BROWSE_API_BASE}?${searchParams.toString()}`;
      console.log(`🌐 Browse API URL: ${url.substring(0, 200)}...`);

      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'X-EBAY-C-MARKETPLACE-ID': 'EBAY_US'
        }
      });

      const responseText = await response.text();
      console.log(`📡 eBay Response Status: ${response.status}`);

      if (!response.ok) {
        console.error('❌ eBay Browse API Error:', response.status);
        console.error('❌ Response:', responseText.substring(0, 500));

        let errorMsg = responseText.substring(0, 300);
        try {
          const errorData = JSON.parse(responseText);
          errorMsg = errorData.errors?.[0]?.message || errorMsg;
        } catch {
          /* keep truncated body */
        }
        let hint = '';
        if (response.status === 403) {
          hint +=
            ' — Production Buy/Browse access may require eBay approval: https://developer.ebay.com/api-docs/buy/static/buy-requirements.html';
        }
        throw new Error(`eBay Browse API HTTP ${response.status}: ${errorMsg}${hint}`);
      }

      let data;
      try {
        data = JSON.parse(responseText);
      } catch (e) {
        console.error('❌ Failed to parse eBay response:', responseText.substring(0, 500));
        throw new Error('Invalid response from eBay API');
      }

      const results = this.parseBrowseResults(data, minDiscount);
      
      // Cache the results
      this.setCachedResult(cacheKey, results);
      console.log(`💾 Cached ${results.length} items for "${keywords}"`);
      
      return results;
    } catch (error) {
      console.error('eBay search error:', error.message);
      throw error;
    }
  }

  parseBrowseResults(data, minDiscount) {
    const results = [];
    try {
      const items = data.itemSummaries || [];
      console.log(`📦 Browse API returned ${items.length} items`);
      
      for (const item of items) {
        const currentPrice = parseFloat(item.price?.value || 0);
        
        // Check for original/strikethrough price
        const originalPriceData = item.marketingPrice?.originalPrice?.value;
        const discountPercentData = item.marketingPrice?.discountPercentage;
        
        let originalPrice, discountPercent;
        
        if (originalPriceData) {
          originalPrice = parseFloat(originalPriceData);
          discountPercent = discountPercentData || ((originalPrice - currentPrice) / originalPrice * 100);
        } else {
          // Estimate discount for items without explicit discount info
          originalPrice = currentPrice * 1.4;
          discountPercent = 28; // Default estimate
        }
        
        // Apply minimum discount filter
        if (discountPercent >= minDiscount || !originalPriceData) {
          const imageUrl = item.image?.imageUrl || item.thumbnailImages?.[0]?.imageUrl || '';
          
          // Get category info from categories array (Browse API structure)
          const category = item.categories?.[0] || {};
          const categoryId = category.categoryId || item.categoryId || '';
          const categoryName = category.categoryName || item.categoryPath || '';
          
          results.push({
            ebayItemId: item.itemId || '',
            title: item.title || '',
            imageUrl: imageUrl,
            originalPrice: originalPrice,
            currentPrice: currentPrice,
            discountPercent: Math.round(discountPercent),
            currency: item.price?.currency || 'USD',
            condition: item.condition || 'Unknown',
            ebayUrl: item.itemWebUrl || item.itemAffiliateWebUrl || '',
            categoryId: categoryId,
            categoryName: categoryName
          });
        }
      }
      console.log(`✅ ${results.length} items passed discount filter`);
    } catch (error) { 
      console.error('Error parsing Browse API results:', error); 
    }
    return results;
  }

  getAffiliateUrl(itemId, originalUrl) {
    const looksLikeSearch =
      !originalUrl ||
      typeof originalUrl !== 'string' ||
      /\/sch\//i.test(originalUrl) ||
      /[?&]_nkw=/i.test(originalUrl);

    // Never attach affiliate params to a search URL — use listing URL from item id
    if (originalUrl && !looksLikeSearch) {
      const separator = originalUrl.includes('?') ? '&' : '?';
      return `${originalUrl}${separator}mkcid=1&mkrid=711-53200-19255-0&siteid=0&campid=${this.campaignId}&toolid=10001&mkevt=1`;
    }
    
    // Fallback: try to extract legacy item ID from Browse API format (v1|123456789|0)
    let legacyItemId = itemId;
    if (itemId && itemId.includes('|')) {
      const parts = itemId.split('|');
      if (parts.length >= 2) {
        legacyItemId = parts[1];
      }
    }
    
    return `https://www.ebay.com/itm/${legacyItemId}?mkcid=1&mkrid=711-53200-19255-0&siteid=0&campid=${this.campaignId}&toolid=10001&mkevt=1`;
  }

  /**
   * Real listing rows for empty-DB bootstrap (avoid sch/i.html placeholders).
   * Best-effort: returns [] if API keys missing or all calls fail.
   */
  async getListingCandidatesForSeed({ maxTotal = 480 } = {}) {
    const queries = [
      'luxury mens watch chronograph',
      'designer leather handbag women',
      'gold jewelry necklace',
      'polarized designer sunglasses',
      'premium leather belt men'
    ];
    const out = [];
    const seenIds = new Set();
    const cap = typeof maxTotal === 'number' && maxTotal > 0 ? maxTotal : 480;

    for (const keywords of queries) {
      if (out.length >= cap || !this.isConfigured()) break;
      try {
        const batch = await this.searchItems({
          keywords,
          minDiscount: 10,
          minPrice: 25,
          maxPrice: 20000,
          limit: Math.min(120, cap - out.length + 30),
        });
        for (const item of batch) {
          const iid = item.ebayItemId || '';
          if (!iid || seenIds.has(iid)) continue;
          const affiliate = this.getAffiliateUrl(item.ebayItemId, item.ebayUrl);
          if (!affiliate || /\/sch\//i.test(affiliate)) continue;
          seenIds.add(iid);
          out.push({ ...item, affiliateUrl: affiliate });
          if (out.length >= cap) break;
        }
      } catch (e) {
        console.warn(`⚠️ Seed pool skip "${keywords}":`, e.message || e);
      }
    }

    return out;
  }

  // Check if a single item is still available
  async checkItemAvailability(itemId) {
    try {
      const token = await this.getAccessToken();
      
      // Extract legacy item ID if needed
      let legacyItemId = itemId;
      if (itemId && itemId.includes('|')) {
        const parts = itemId.split('|');
        if (parts.length >= 2) {
          legacyItemId = parts[1];
        }
      }
      
      // Use eBay Get Item API
      const url = `https://api.ebay.com/buy/browse/v1/item/v1|${legacyItemId}|0`;
      
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'X-EBAY-C-MARKETPLACE-ID': 'EBAY_US',
          'Accept': 'application/json'
        }
      });
      
      if (response.status === 404) {
        console.log(`❌ Item ${legacyItemId} not found (404)`);
        return { available: false, reason: 'not_found' };
      }
      
      if (!response.ok) {
        const text = await response.text();
        console.log(`⚠️ Item ${legacyItemId} check failed: ${response.status}`);
        // Don't mark as unavailable on API errors
        return { available: true, reason: 'api_error', status: response.status };
      }
      
      const data = await response.json();
      
      // Check if item is ended or unavailable
      if (data.itemEndDate) {
        const endDate = new Date(data.itemEndDate);
        if (endDate < new Date()) {
          console.log(`❌ Item ${legacyItemId} ended on ${endDate.toISOString()}`);
          return { available: false, reason: 'ended' };
        }
      }
      
      // Check availability status
      const availability = data.estimatedAvailabilities?.[0];
      if (availability) {
        if (availability.availabilityStatus === 'OUT_OF_STOCK' || 
            availability.estimatedAvailableQuantity === 0) {
          console.log(`❌ Item ${legacyItemId} out of stock`);
          return { available: false, reason: 'out_of_stock' };
        }
      }
      
      return { available: true, item: data };
    } catch (error) {
      console.error(`Error checking item ${itemId}:`, error.message);
      // On error, assume still available (don't remove items due to API issues)
      return { available: true, reason: 'error', error: error.message };
    }
  }

  // Check multiple items and return unavailable ones
  async checkItemsAvailability(itemIds, batchSize = 10) {
    const unavailableItems = [];
    
    // Process in batches to avoid rate limits
    for (let i = 0; i < itemIds.length; i += batchSize) {
      const batch = itemIds.slice(i, i + batchSize);
      
      const results = await Promise.all(
        batch.map(async (itemId) => {
          const result = await this.checkItemAvailability(itemId);
          return { itemId, ...result };
        })
      );
      
      for (const result of results) {
        if (!result.available) {
          unavailableItems.push(result);
        }
      }
      
      // Small delay between batches
      if (i + batchSize < itemIds.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    
    return unavailableItems;
  }
}

export default new EbayService();
