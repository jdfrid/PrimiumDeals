// Test the new Browse API implementation

const EBAY_APP_ID = process.env.EBAY_APP_ID;
const EBAY_CERT_ID = process.env.EBAY_CERT_ID;

if (!EBAY_APP_ID || !EBAY_CERT_ID) {
  console.log('❌ Please set EBAY_APP_ID and EBAY_CERT_ID environment variables');
  process.exit(1);
}

async function getToken() {
  console.log('🔑 Getting OAuth token...');
  
  const credentials = Buffer.from(`${EBAY_APP_ID}:${EBAY_CERT_ID}`).toString('base64');
  
  const response = await fetch('https://api.ebay.com/identity/v1/oauth2/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Authorization': `Basic ${credentials}`
    },
    body: 'grant_type=client_credentials&scope=https://api.ebay.com/oauth/api_scope'
  });

  const data = await response.json();
  
  if (!response.ok) {
    console.log('❌ OAuth Error:', data);
    throw new Error(data.error_description);
  }

  console.log('✅ Got token!');
  return data.access_token;
}

async function searchBrowseAPI(token) {
  console.log('\n🔍 Testing Browse API...');
  
  const url = 'https://api.ebay.com/buy/browse/v1/item_summary/search?q=luxury%20watch&limit=5&filter=price:[500..2000],priceCurrency:USD';
  
  const response = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      'X-EBAY-C-MARKETPLACE-ID': 'EBAY_US'
    }
  });

  console.log(`Status: ${response.status}`);

  if (!response.ok) {
    const text = await response.text();
    console.log('❌ Error:', text);
    return;
  }

  const data = await response.json();
  
  console.log(`\n✅ Found ${data.total || 0} items!`);
  console.log(`📦 Returned ${data.itemSummaries?.length || 0} in this page\n`);
  
  if (data.itemSummaries) {
    console.log('=== Sample Items ===\n');
    for (const item of data.itemSummaries.slice(0, 3)) {
      console.log(`📌 ${item.title?.substring(0, 60)}...`);
      console.log(`   💰 Price: $${item.price?.value} ${item.price?.currency}`);
      if (item.marketingPrice) {
        console.log(`   🏷️ Original: $${item.marketingPrice.originalPrice?.value}`);
        console.log(`   📉 Discount: ${item.marketingPrice.discountPercentage}%`);
      }
      console.log(`   🔗 ${item.itemWebUrl?.substring(0, 50)}...`);
      console.log('');
    }
  }
}

async function main() {
  console.log('=====================================');
  console.log('  eBay Browse API Test');
  console.log('=====================================\n');

  try {
    const token = await getToken();
    await searchBrowseAPI(token);
    console.log('✅ Browse API is working!');
  } catch (error) {
    console.log('\n❌ Error:', error.message);
  }
  
  console.log('\n=====================================');
}

main();

