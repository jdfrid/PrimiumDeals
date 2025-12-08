const EBAY_API_BASE = 'https://svcs.ebay.com/services/search/FindingService/v1';

class EbayService {
  constructor() {
    this.appId = process.env.EBAY_APP_ID;
    this.campaignId = process.env.EBAY_CAMPAIGN_ID;
  }

  async searchItems(params) {
    const { keywords = '', categoryId = '', minPrice = 0, maxPrice = 10000, minDiscount = 30, limit = 100 } = params;

    console.log(`\n${'='.repeat(50)}`);
    console.log(`🔍 eBay API CALL at ${new Date().toISOString()}`);
    console.log(`🔍 Keywords: "${keywords}", Price: $${minPrice}-$${maxPrice}`);
    console.log(`${'='.repeat(50)}`);
    
    if (!this.appId) {
      console.error('❌ EBAY_APP_ID is not configured!');
      throw new Error('eBay API credentials not configured');
    }

    try {
      // Use simpler findItemsByKeywords operation
      const queryParams = new URLSearchParams({
        'OPERATION-NAME': 'findItemsByKeywords',
        'SERVICE-VERSION': '1.0.0',
        'SECURITY-APPNAME': this.appId,
        'RESPONSE-DATA-FORMAT': 'JSON',
        'REST-PAYLOAD': 'true',
        'paginationInput.entriesPerPage': limit.toString(),
        'itemFilter(0).name': 'MinPrice', 
        'itemFilter(0).value': minPrice.toString(), 
        'itemFilter(0).paramName': 'Currency', 
        'itemFilter(0).paramValue': 'USD',
        'itemFilter(1).name': 'MaxPrice', 
        'itemFilter(1).value': maxPrice.toString(), 
        'itemFilter(1).paramName': 'Currency', 
        'itemFilter(1).paramValue': 'USD',
        'keywords': keywords || 'watch'
      });

      console.log(`🌐 eBay API URL: ${EBAY_API_BASE}?OPERATION-NAME=findItemsByKeywords&SECURITY-APPNAME=${this.appId.substring(0,10)}...`);

      const response = await fetch(`${EBAY_API_BASE}?${queryParams.toString()}`);
      const responseText = await response.text();
      
      console.log(`📡 eBay Response Status: ${response.status}`);
      
      if (!response.ok) {
        console.error('❌ eBay API HTTP Error:', response.status);
        console.error('❌ eBay Response:', responseText.substring(0, 1000));
        
        // More specific error messages
        if (response.status === 500) {
          throw new Error(`eBay server error (500). This could be: rate limit, invalid API key, or eBay server issue. Response: ${responseText.substring(0, 200)}`);
        }
        throw new Error(`eBay API error: ${response.status} - ${responseText.substring(0, 200)}`);
      }
      
      let data;
      try {
        data = JSON.parse(responseText);
      } catch (e) {
        console.error('❌ Failed to parse eBay response:', responseText.substring(0, 500));
        throw new Error('Invalid response from eBay API');
      }
      
      // Check for API errors in response
      const errorMsg = data.findItemsByKeywordsResponse?.[0]?.errorMessage?.[0]?.error?.[0]?.message?.[0];
      if (errorMsg) {
        console.error('❌ eBay API Error:', errorMsg);
        throw new Error(errorMsg);
      }
      
      return this.parseSearchResults(data, minDiscount);
    } catch (error) {
      console.error('eBay search error:', error.message);
      throw error;
    }
  }

  parseSearchResults(data, minDiscount) {
    const results = [];
    try {
      // Handle both findItemsByKeywords and findItemsAdvanced responses
      const items = data.findItemsByKeywordsResponse?.[0]?.searchResult?.[0]?.item 
                 || data.findItemsAdvancedResponse?.[0]?.searchResult?.[0]?.item 
                 || [];
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

  getAffiliateUrl(itemId) {
    // Use direct item URL format: https://www.ebay.com/itm/{itemId}
    return `https://www.ebay.com/itm/${itemId}?mkcid=1&mkrid=711-53200-19255-0&siteid=0&campid=${this.campaignId}&toolid=10001&mkevt=1`;
  }
}

export default new EbayService();
