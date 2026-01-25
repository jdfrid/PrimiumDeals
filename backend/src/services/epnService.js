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

  // Build URL without credentials (credentials go in header)
  buildUrl(reportName, params = {}) {
    const baseUrl = `https://api.partner.ebay.com/Mediapartners/${this.accountSid}/Reports/${reportName}.json`;
    const queryString = Object.entries(params)
      .filter(([_, v]) => v !== undefined && v !== null)
      .map(([k, v]) => `${k}=${encodeURIComponent(v)}`)
      .join('&');
    return queryString ? `${baseUrl}?${queryString}` : baseUrl;
  }

  // Get Basic Auth header
  getAuthHeader() {
    const credentials = Buffer.from(`${this.accountSid}:${this.authToken}`).toString('base64');
    return `Basic ${credentials}`;
  }

  async fetchTransactions(startDate, endDate) {
    if (!this.isConfigured()) {
      throw new Error('EPN API not configured. Set EPN_ACCOUNT_SID and EPN_AUTH_TOKEN.');
    }

    // Format dates as yyyy-mm-dd
    const start = startDate || this.getDateDaysAgo(30);
    const end = endDate || this.getDateDaysAgo(0);

    // Transaction Detail Report URL
    const url = this.buildUrl('ebay_partner_transaction_detail', {
      STATUS: 'ALL',
      START_DATE: start,
      END_DATE: end,
      date_type: 'update_date'
    });

    console.log(`📊 Fetching EPN transactions: ${url}`);
    console.log(`📊 Date range: ${start} to ${end}`);

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': this.getAuthHeader(),
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
      CHECKOUT_SITE: 0,
      START_DATE: start,
      END_DATE: end
    });

    console.log(`📊 Fetching EPN campaign performance: ${url}`);

    try {
      const response = await fetch(url, {
        headers: { 
          'Authorization': this.getAuthHeader(),
          'Accept': 'application/json' 
        }
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

    console.log(`📊 Fetching EPN daily performance: ${url}`);

    try {
      const response = await fetch(url, {
        headers: { 
          'Authorization': this.getAuthHeader(),
          'Accept': 'application/json' 
        }
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

  // Get click details report
  async fetchClickDetails(startDate, endDate) {
    if (!this.isConfigured()) {
      throw new Error('EPN API not configured');
    }

    const start = startDate || this.getDateDaysAgo(7);
    const end = endDate || this.getDateDaysAgo(0);

    const url = this.buildUrl('ebay_partner_click_detail', {
      START_DATE: start,
      END_DATE: end
    });

    console.log(`📊 Fetching EPN click details: ${url}`);

    try {
      const response = await fetch(url, {
        headers: { 
          'Authorization': this.getAuthHeader(),
          'Accept': 'application/json' 
        }
      });

      if (!response.ok) {
        const text = await response.text();
        throw new Error(`EPN API error: ${response.status} - ${text.substring(0, 100)}`);
      }

      const data = await response.json();
      return this.parseClickDetails(data);
    } catch (error) {
      console.error('EPN click details error:', error.message);
      throw error;
    }
  }

  parseClickDetails(data) {
    const results = Array.isArray(data) ? data : (data.results || data.clicks || []);
    
    return results.map(item => ({
      click_id: item.EpnClickId || item.ClickId || '',
      click_date: item.ClickTimestamp || item.EventDate || '',
      campaign_id: item.CampaignId || '',
      campaign_name: item.CampaignName || '',
      item_id: item.ItemId || '',
      category: item.MetaCategoryName || item.Category || '',
      device: item.DeviceType || 'Unknown',
      country: item.UserCountry || item.CheckoutSite || '',
      referrer: item.OriginalReferrer || ''
    }));
  }

  // Get performance by campaign v2
  async fetchCampaignPerformanceV2(startDate, endDate) {
    if (!this.isConfigured()) {
      throw new Error('EPN API not configured');
    }

    const start = startDate || this.getDateDaysAgo(30);
    const end = endDate || this.getDateDaysAgo(0);

    const url = this.buildUrl('ebay_partner_perf_by_campaign_v2', {
      START_DATE: start,
      END_DATE: end
    });

    console.log(`📊 Fetching EPN campaign performance v2: ${url}`);

    try {
      const response = await fetch(url, {
        headers: { 
          'Authorization': this.getAuthHeader(),
          'Accept': 'application/json' 
        }
      });

      if (!response.ok) {
        const text = await response.text();
        throw new Error(`EPN API error: ${response.status} - ${text.substring(0, 100)}`);
      }

      const data = await response.json();
      return this.parseCampaignPerformance(data);
    } catch (error) {
      console.error('EPN campaign v2 error:', error.message);
      throw error;
    }
  }

  parseCampaignPerformance(data) {
    const results = Array.isArray(data) ? data : (data.results || data.campaigns || []);
    
    return results.map(item => ({
      campaign_id: item.CampaignId || '',
      campaign_name: item.CampaignName || 'Unknown Campaign',
      clicks: parseInt(item.Clicks || item.TotalClicks || 0),
      ebay_traffic: parseInt(item.EbayTraffic || 0),
      transactions: parseInt(item.Transactions || item.Orders || 0),
      sales: parseFloat(item.Sales || item.Revenue || 0),
      earnings: parseFloat(item.Earnings || item.Commission || 0),
      epc: parseFloat(item.EPC || 0), // Earnings Per Click
      conversion_rate: parseFloat(item.ConversionRate || 0)
    }));
  }

  // Get comprehensive dashboard data
  async fetchDashboardData(days = 30) {
    if (!this.isConfigured()) {
      return {
        configured: false,
        error: 'EPN API not configured. Set EPN_ACCOUNT_SID and EPN_AUTH_TOKEN in environment variables.'
      };
    }

    const startDate = this.getDateDaysAgo(days);
    const endDate = this.getDateDaysAgo(0);

    const results = {
      configured: true,
      dateRange: { start: startDate, end: endDate },
      campaigns: null,
      dailyPerformance: null,
      clickDetails: null,
      transactions: null,
      errors: []
    };

    // Fetch all reports in parallel
    const promises = [
      this.fetchCampaignPerformanceV2(startDate, endDate)
        .then(data => { results.campaigns = data; })
        .catch(err => { results.errors.push({ report: 'campaigns', error: err.message }); }),
      
      this.fetchPerformanceByDay(startDate, endDate)
        .then(data => { results.dailyPerformance = data; })
        .catch(err => { results.errors.push({ report: 'daily', error: err.message }); }),
      
      this.fetchClickDetails(startDate, endDate)
        .then(data => { results.clickDetails = data; })
        .catch(err => { results.errors.push({ report: 'clicks', error: err.message }); }),
      
      this.fetchTransactions(startDate, endDate)
        .then(data => { results.transactions = data; })
        .catch(err => { results.errors.push({ report: 'transactions', error: err.message }); })
    ];

    await Promise.all(promises);

    // Calculate summary
    results.summary = {
      totalClicks: results.campaigns?.reduce((sum, c) => sum + c.clicks, 0) || 0,
      totalTransactions: results.campaigns?.reduce((sum, c) => sum + c.transactions, 0) || 0,
      totalSales: results.campaigns?.reduce((sum, c) => sum + c.sales, 0) || 0,
      totalEarnings: results.campaigns?.reduce((sum, c) => sum + c.earnings, 0) || 0
    };

    return results;
  }
}

export default new EPNService();

