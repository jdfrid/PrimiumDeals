/**
 * eBay Partner Network (EPN) Service
 * Fetches affiliate transaction data from EPN API
 * 
 * API Documentation: https://partnerhelp.ebay.com/helpcenter/s/article/EPN-Transaction-Detail-Report-TDR-API-Documentation
 * 
 * URL Format: https://<AccountSID>:<AuthToken>@api.partner.ebay.com/Mediapartners/<AccountSID>/Reports/<ReportName>.json?<parameters>
 */

class EPNService {
  constructor() {
    this.accountSid = process.env.EPN_ACCOUNT_SID;
    this.authToken = process.env.EPN_AUTH_TOKEN;
  }

  isConfigured() {
    return !!(this.accountSid && this.authToken);
  }

  // Build the authenticated URL (credentials in URL as per EPN docs)
  buildUrl(reportName, params = {}) {
    const baseUrl = `https://${this.accountSid}:${this.authToken}@api.partner.ebay.com/Mediapartners/${this.accountSid}/Reports/${reportName}.json`;
    const queryString = Object.entries(params)
      .filter(([_, v]) => v !== undefined && v !== null)
      .map(([k, v]) => `${k}=${encodeURIComponent(v)}`)
      .join('&');
    return queryString ? `${baseUrl}?${queryString}` : baseUrl;
  }

  async fetchTransactions(startDate, endDate) {
    if (!this.isConfigured()) {
      throw new Error('EPN API not configured. Set EPN_ACCOUNT_SID and EPN_AUTH_TOKEN.');
    }

    // Format dates as yyyy-mm-dd
    const start = startDate || this.getDateDaysAgo(30);
    const end = endDate || this.getDateDaysAgo(0);

    // Transaction Detail Report URL with authentication in URL
    const url = this.buildUrl('ebay_partner_transaction_detail', {
      STATUS: 'ALL',
      START_DATE: start,
      END_DATE: end,
      date_type: 'update_date'
    });

    // Log URL without credentials
    const safeUrl = url.replace(/\/\/[^@]+@/, '//***:***@');
    console.log(`📊 Fetching EPN transactions: ${safeUrl}`);

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Accept': 'application/json'
        }
      });

      const responseText = await response.text();
      console.log(`📊 EPN Response status: ${response.status}`);
      console.log(`📊 EPN Response preview: ${responseText.substring(0, 500)}`);

      if (!response.ok) {
        throw new Error(`EPN API error ${response.status}: ${responseText.substring(0, 200)}`);
      }

      // Parse JSON response
      let data;
      try {
        data = JSON.parse(responseText);
      } catch (e) {
        throw new Error('EPN returned invalid JSON');
      }

      console.log(`✅ EPN returned ${Array.isArray(data) ? data.length : 'object'} items`);
      return this.parseTransactions(data);
    } catch (error) {
      console.error('❌ EPN fetch error:', error.message);
      throw error;
    }
  }

  parseTransactions(data) {
    const transactions = [];
    
    // EPN API returns array directly or in a wrapper
    const results = Array.isArray(data) ? data : (data.results || data.transactions || data.data || []);
    
    console.log(`📊 Parsing ${results.length} transactions from EPN`);
    
    for (const item of results) {
      // Map EPN fields to our schema (based on official EPN documentation)
      transactions.push({
        transaction_id: item.EpnTransactionId || item.EbayCheckoutTransactionId || `EPN-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        transaction_date: item.EventDate || item.UpdateDate || item.ClickTimestamp || new Date().toISOString(),
        item_id: item.ItemId || '',
        item_title: item.ItemName || 'Unknown Item',
        item_price: parseFloat(item.Sales || item.DeltaSales || 0),
        quantity: parseInt(item.Quantity || item.DeltaQuantity || 1),
        commission_percent: 0, // EPN doesn't always provide rate, calculate from earnings/sales
        commission_amount: parseFloat(item.Earnings || item.DeltaEarnings || 0),
        currency: 'USD',
        status: this.mapStatus(item.Status || item.EventName),
        is_paid: (item.Status || '').toLowerCase() === 'paid',
        // Additional EPN fields
        campaign_id: item.CampaignId || '',
        campaign_name: item.CampaignName || '',
        category: item.VerticalCategory || item.MetaCategoryName || '',
        checkout_site: item.CheckoutSite || 'US'
      });
    }

    // Calculate commission percent if we have both values
    for (const tx of transactions) {
      if (tx.item_price > 0 && tx.commission_amount > 0) {
        tx.commission_percent = (tx.commission_amount / tx.item_price) * 100;
      }
    }

    return transactions;
  }

  mapStatus(status) {
    if (!status) return 'pending';
    const s = status.toLowerCase();
    if (s.includes('confirm') || s.includes('approved')) return 'confirmed';
    if (s.includes('cancel') || s.includes('reverse')) return 'cancelled';
    if (s.includes('paid')) return 'paid';
    return 'pending';
  }

  getDateDaysAgo(days) {
    const date = new Date();
    date.setDate(date.getDate() - days);
    return date.toISOString().split('T')[0];
  }

  // Get performance by campaign data
  async fetchCampaignPerformance(startDate, endDate) {
    if (!this.isConfigured()) {
      throw new Error('EPN API not configured');
    }

    const start = startDate || this.getDateDaysAgo(30);
    const end = endDate || this.getDateDaysAgo(0);

    const url = this.buildUrl('ebay_partner_perf_by_campaign', {
      CHECKOUT_SITE: 0, // 0 = all sites
      START_DATE: start,
      END_DATE: end
    });

    const safeUrl = url.replace(/\/\/[^@]+@/, '//***:***@');
    console.log(`📊 Fetching EPN campaign performance: ${safeUrl}`);

    try {
      const response = await fetch(url, {
        headers: { 'Accept': 'application/json' }
      });

      if (!response.ok) {
        const text = await response.text();
        throw new Error(`EPN API error: ${response.status} - ${text.substring(0, 100)}`);
      }

      return await response.json();
    } catch (error) {
      console.error('EPN campaign error:', error.message);
      throw error;
    }
  }

  // Get performance by day
  async fetchPerformanceByDay(startDate, endDate) {
    if (!this.isConfigured()) {
      throw new Error('EPN API not configured');
    }

    const start = startDate || this.getDateDaysAgo(30);
    const end = endDate || this.getDateDaysAgo(0);

    const url = this.buildUrl('ebay_partner_perf_by_day', {
      START_DATE: start,
      END_DATE: end
    });

    const safeUrl = url.replace(/\/\/[^@]+@/, '//***:***@');
    console.log(`📊 Fetching EPN daily performance: ${safeUrl}`);

    try {
      const response = await fetch(url, {
        headers: { 'Accept': 'application/json' }
      });

      if (!response.ok) {
        const text = await response.text();
        throw new Error(`EPN API error: ${response.status} - ${text.substring(0, 100)}`);
      }

      return await response.json();
    } catch (error) {
      console.error('EPN daily error:', error.message);
      throw error;
    }
  }
}

export default new EPNService();

