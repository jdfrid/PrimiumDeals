/**
 * eBay Partner Network (EPN) Service
 * Fetches affiliate transaction data from EPN API
 */

class EPNService {
  constructor() {
    this.accountSid = process.env.EPN_ACCOUNT_SID;
    this.authToken = process.env.EPN_AUTH_TOKEN;
    this.baseUrl = 'https://api.partner.ebay.com/mediapartners';
  }

  isConfigured() {
    return !!(this.accountSid && this.authToken);
  }

  async fetchTransactions(startDate, endDate) {
    if (!this.isConfigured()) {
      throw new Error('EPN API not configured. Set EPN_ACCOUNT_SID and EPN_AUTH_TOKEN.');
    }

    // Format dates as YYYY-MM-DD
    const start = startDate || this.getDateDaysAgo(30);
    const end = endDate || this.getDateDaysAgo(0);

    const url = `${this.baseUrl}/${this.accountSid}/reports/ebay_partner_transaction_detail.json?start_date=${start}&end_date=${end}`;
    
    console.log(`📊 Fetching EPN transactions from ${start} to ${end}`);

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.authToken}`,
          'Accept': 'application/json'
        }
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('EPN API error:', response.status, errorText);
        throw new Error(`EPN API error: ${response.status}`);
      }

      const data = await response.json();
      console.log(`✅ EPN returned ${data.results?.length || 0} transactions`);
      
      return this.parseTransactions(data);
    } catch (error) {
      console.error('EPN fetch error:', error.message);
      throw error;
    }
  }

  parseTransactions(data) {
    const transactions = [];
    
    // EPN API returns results array
    const results = data.results || data.transactions || [];
    
    for (const item of results) {
      transactions.push({
        transaction_id: item.transaction_id || item.event_id || `EPN-${Date.now()}-${Math.random()}`,
        transaction_date: item.transaction_date || item.event_date || item.click_date,
        item_id: item.item_id || item.product_id || '',
        item_title: item.item_name || item.product_name || item.title || 'Unknown Item',
        item_price: parseFloat(item.sale_amount || item.transaction_amount || item.price || 0),
        quantity: parseInt(item.quantity || 1),
        commission_percent: parseFloat(item.commission_rate || item.payout_rate || 0) * 100,
        commission_amount: parseFloat(item.payout || item.commission || item.earnings || 0),
        currency: item.currency || 'USD',
        status: this.mapStatus(item.status || item.action_status),
        is_paid: item.payment_status === 'paid' || item.is_paid || false
      });
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

  // Get summary/snapshot data
  async fetchSnapshot(days = 7) {
    if (!this.isConfigured()) {
      throw new Error('EPN API not configured');
    }

    const start = this.getDateDaysAgo(days);
    const end = this.getDateDaysAgo(0);

    const url = `${this.baseUrl}/${this.accountSid}/reports/ebay_partner_campaign_snapshot.json?start_date=${start}&end_date=${end}`;

    try {
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${this.authToken}`,
          'Accept': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`EPN API error: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('EPN snapshot error:', error.message);
      throw error;
    }
  }
}

export default new EPNService();

