const EBAY_API_BASE = 'https://svcs.ebay.com/services/search/FindingService/v1';

class EbayService {
  constructor() {
    this.appId = process.env.EBAY_APP_ID;
    this.campaignId = process.env.EBAY_CAMPAIGN_ID;
  }

  async searchItems(params) {
    const { keywords = '', categoryId = '', minPrice = 0, maxPrice = 10000, minDiscount = 30, limit = 100 } = params;

    console.log(`🔍 eBay Search: keywords="${keywords}", category=${categoryId}, price=${minPrice}-${maxPrice}`);
    
    if (!this.appId) {
      console.error('❌ EBAY_APP_ID is not configured!');
      throw new Error('eBay API credentials not configured');
    }

    try {
      const queryParams = new URLSearchParams({
        'OPERATION-NAME': 'findItemsAdvanced',
        'SERVICE-VERSION': '1.0.0',
        'SECURITY-APPNAME': this.appId,
        'RESPONSE-DATA-FORMAT': 'JSON',
        'REST-PAYLOAD': 'true',
        'paginationInput.entriesPerPage': limit.toString(),
        'itemFilter(0).name': 'MinPrice', 'itemFilter(0).value': minPrice.toString(), 'itemFilter(0).paramName': 'Currency', 'itemFilter(0).paramValue': 'USD',
        'itemFilter(1).name': 'MaxPrice', 'itemFilter(1).value': maxPrice.toString(), 'itemFilter(1).paramName': 'Currency', 'itemFilter(1).paramValue': 'USD',
        'itemFilter(2).name': 'ListingType', 'itemFilter(2).value': 'FixedPrice',
        'sortOrder': 'BestMatch'
      });

      if (keywords) queryParams.append('keywords', keywords);
      if (categoryId) queryParams.append('categoryId', categoryId);

      const response = await fetch(`${EBAY_API_BASE}?${queryParams.toString()}`);
      const data = await response.json();
      
      // Check for API errors
      const errorMsg = data.findItemsAdvancedResponse?.[0]?.errorMessage?.[0]?.error?.[0]?.message?.[0];
      if (errorMsg) {
        console.error('❌ eBay API Error:', errorMsg);
        throw new Error(errorMsg);
      }
      
      if (!response.ok) throw new Error(`eBay API error: ${response.status}`);
      return this.parseSearchResults(data, minDiscount);
    } catch (error) {
      console.error('eBay search error:', error);
      throw error;
    }
  }

  parseSearchResults(data, minDiscount) {
    const results = [];
    try {
      const items = data.findItemsAdvancedResponse?.[0]?.searchResult?.[0]?.item || [];
      console.log(`📦 eBay returned ${items.length} items`);
      
      for (const item of items) {
        const currentPrice = parseFloat(item.sellingStatus?.[0]?.currentPrice?.[0]?.__value__ || 0);
        const apiOriginalPrice = item.discountPriceInfo?.[0]?.originalRetailPrice?.[0]?.__value__;
        
        // If eBay provides original price, use it. Otherwise estimate with higher multiplier
        const hasRealDiscount = !!apiOriginalPrice;
        const originalPrice = apiOriginalPrice ? parseFloat(apiOriginalPrice) : currentPrice * 1.5;
        let discountPercent = originalPrice > currentPrice ? ((originalPrice - currentPrice) / originalPrice) * 100 : 0;
        
        // If we don't have real discount info, be more lenient with filtering
        const effectiveMinDiscount = hasRealDiscount ? minDiscount : Math.min(minDiscount, 25);
        
        if (discountPercent >= effectiveMinDiscount) {
          results.push({
            ebayItemId: item.itemId?.[0] || '',
            title: item.title?.[0] || '',
            imageUrl: item.galleryURL?.[0] || '',
            originalPrice, currentPrice, discountPercent: Math.round(discountPercent),
            currency: item.sellingStatus?.[0]?.currentPrice?.[0]?.['@currencyId'] || 'USD',
            condition: item.condition?.[0]?.conditionDisplayName?.[0] || 'Unknown',
            ebayUrl: item.viewItemURL?.[0] || '',
            categoryId: item.primaryCategory?.[0]?.categoryId?.[0] || '',
            categoryName: item.primaryCategory?.[0]?.categoryName?.[0] || ''
          });
        }
      }
      console.log(`✅ ${results.length} items passed discount filter`);
    } catch (error) { console.error('Error parsing eBay results:', error); }
    return results;
  }

  getAffiliateUrl(itemUrl) {
    const separator = itemUrl.includes('?') ? '&' : '?';
    return `${itemUrl}${separator}mkcid=1&mkrid=711-53200-19255-0&siteid=0&campid=${this.campaignId}&toolid=10001&mkevt=1`;
  }
}

export default new EbayService();
