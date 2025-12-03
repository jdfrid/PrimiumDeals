// Quick test for eBay API
const EBAY_APP_ID = 'davidade-PrimiumD-PRD-26e774d48-9c51a1cc';
const EBAY_API_BASE = 'https://svcs.ebay.com/services/search/FindingService/v1';

async function testEbayAPI() {
  console.log('Testing eBay API with App ID:', EBAY_APP_ID.substring(0, 20) + '...');
  
  const queryParams = new URLSearchParams({
    'OPERATION-NAME': 'findItemsByKeywords',
    'SERVICE-VERSION': '1.0.0',
    'SECURITY-APPNAME': EBAY_APP_ID,
    'RESPONSE-DATA-FORMAT': 'JSON',
    'REST-PAYLOAD': 'true',
    'paginationInput.entriesPerPage': '5',
    'keywords': 'watch'
  });

  const url = `${EBAY_API_BASE}?${queryParams.toString()}`;
  console.log('\nCalling:', url.substring(0, 100) + '...\n');

  try {
    const response = await fetch(url);
    console.log('Response Status:', response.status);
    
    const text = await response.text();
    console.log('Response (first 1000 chars):\n', text.substring(0, 1000));
    
    if (response.ok) {
      const data = JSON.parse(text);
      const items = data.findItemsByKeywordsResponse?.[0]?.searchResult?.[0]?.item || [];
      console.log('\n✅ Found', items.length, 'items!');
      if (items.length > 0) {
        console.log('First item:', items[0].title?.[0]);
      }
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

testEbayAPI();

