// Script to check eBay API rate limit and test the Finding API

const EBAY_APP_ID = process.env.EBAY_APP_ID;
const EBAY_CLIENT_SECRET = process.env.EBAY_CLIENT_SECRET;

if (!EBAY_APP_ID) {
  console.log('❌ Please set EBAY_APP_ID environment variable');
  process.exit(1);
}

async function checkFindingAPI() {
  console.log('\n=== Testing Finding API ===');
  console.log(`App ID: ${EBAY_APP_ID.substring(0, 15)}...`);
  
  const url = `https://svcs.ebay.com/services/search/FindingService/v1?OPERATION-NAME=findItemsByKeywords&SERVICE-VERSION=1.0.0&SECURITY-APPNAME=${EBAY_APP_ID}&RESPONSE-DATA-FORMAT=JSON&keywords=watch&paginationInput.entriesPerPage=1`;
  
  try {
    const response = await fetch(url);
    const text = await response.text();
    
    console.log(`Status: ${response.status}`);
    console.log(`Headers:`, Object.fromEntries(response.headers.entries()));
    
    if (response.ok) {
      const data = JSON.parse(text);
      const ack = data.findItemsByKeywordsResponse?.[0]?.ack?.[0];
      const errorMsg = data.findItemsByKeywordsResponse?.[0]?.errorMessage?.[0]?.error?.[0];
      
      if (errorMsg) {
        console.log('\n❌ API Error:', errorMsg.message?.[0]);
        console.log('Error ID:', errorMsg.errorId?.[0]);
      } else if (ack === 'Success') {
        const count = data.findItemsByKeywordsResponse?.[0]?.searchResult?.[0]?.['@count'];
        console.log(`\n✅ Finding API works! Found ${count} items`);
      } else {
        console.log('\n⚠️ Response:', text.substring(0, 500));
      }
    } else {
      console.log('\n❌ HTTP Error:', response.status);
      console.log('Response:', text.substring(0, 500));
    }
  } catch (error) {
    console.log('\n❌ Fetch Error:', error.message);
  }
}

async function getOAuthToken() {
  if (!EBAY_CLIENT_SECRET) {
    console.log('\n⚠️ EBAY_CLIENT_SECRET not set - cannot get OAuth token for Rate Limit API');
    return null;
  }
  
  console.log('\n=== Getting OAuth Token ===');
  
  const credentials = Buffer.from(`${EBAY_APP_ID}:${EBAY_CLIENT_SECRET}`).toString('base64');
  
  try {
    const response = await fetch('https://api.ebay.com/identity/v1/oauth2/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${credentials}`
      },
      body: 'grant_type=client_credentials&scope=https://api.ebay.com/oauth/api_scope'
    });
    
    const data = await response.json();
    
    if (response.ok) {
      console.log('✅ Got OAuth token');
      return data.access_token;
    } else {
      console.log('❌ OAuth Error:', data.error_description || data.error);
      return null;
    }
  } catch (error) {
    console.log('❌ OAuth Fetch Error:', error.message);
    return null;
  }
}

async function checkRateLimits(token) {
  if (!token) {
    console.log('\n=== Rate Limit API (requires OAuth token) ===');
    console.log('⚠️ Cannot check - no OAuth token available');
    console.log('\nTo enable Rate Limit checking, set EBAY_CLIENT_SECRET environment variable');
    return;
  }
  
  console.log('\n=== Checking Rate Limits ===');
  
  try {
    // Check for Finding API rate limits
    const response = await fetch('https://api.ebay.com/developer/analytics/v1_beta/rate_limit/?api_name=Finding', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log(`Status: ${response.status}`);
    
    if (response.ok) {
      const data = await response.json();
      console.log('\n📊 Rate Limit Info:');
      console.log(JSON.stringify(data, null, 2));
    } else {
      const text = await response.text();
      console.log('❌ Error:', text.substring(0, 500));
    }
  } catch (error) {
    console.log('❌ Fetch Error:', error.message);
  }
}

async function main() {
  console.log('====================================');
  console.log('  eBay API Rate Limit Checker');
  console.log('====================================');
  console.log(`Time: ${new Date().toISOString()}`);
  
  // Test Finding API directly
  await checkFindingAPI();
  
  // Try to get OAuth token and check rate limits
  const token = await getOAuthToken();
  await checkRateLimits(token);
  
  console.log('\n====================================');
  console.log('  Check Complete');
  console.log('====================================');
}

main();

