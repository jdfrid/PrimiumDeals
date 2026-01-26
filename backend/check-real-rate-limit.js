// Check real eBay rate limits using Analytics API
// https://developer.ebay.com/api-docs/developer/analytics/overview.html

const EBAY_APP_ID = process.env.EBAY_APP_ID;
const EBAY_CERT_ID = process.env.EBAY_CERT_ID;

if (!EBAY_APP_ID || !EBAY_CERT_ID) {
  console.log('❌ Please set EBAY_APP_ID and EBAY_CERT_ID environment variables');
  process.exit(1);
}

async function getOAuthToken() {
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
    throw new Error(data.error_description || 'Failed to get token');
  }
  
  console.log('✅ Got OAuth token!');
  return data.access_token;
}

async function getRateLimits(token) {
  console.log('\n📊 Checking rate limits...');
  
  // Check general rate limits
  const response = await fetch('https://api.ebay.com/developer/analytics/v1_beta/rate_limit/', {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  });
  
  console.log(`Status: ${response.status}`);
  
  const text = await response.text();
  
  if (response.ok) {
    try {
      const data = JSON.parse(text);
      console.log('\n=== Rate Limit Information ===\n');
      console.log(JSON.stringify(data, null, 2));
      return data;
    } catch (e) {
      console.log('Response:', text);
    }
  } else {
    console.log('❌ Error:', text);
  }
}

async function main() {
  console.log('=====================================');
  console.log('  eBay Real Rate Limit Checker');
  console.log('=====================================\n');
  
  try {
    const token = await getOAuthToken();
    await getRateLimits(token);
  } catch (error) {
    console.log('\n❌ Error:', error.message);
  }
  
  console.log('\n=====================================');
}

main();

