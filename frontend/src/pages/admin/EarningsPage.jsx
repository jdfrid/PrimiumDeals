import { useState, useEffect } from 'react';
import { 
  DollarSign, TrendingUp, Clock, CheckCircle, RefreshCw, Plus, ExternalLink, 
  AlertCircle, Upload, MousePointer, BarChart3, Calendar, Target, Percent
} from 'lucide-react';
import api from '../../services/api';

function AddTransactionModal({ onClose, onSave }) {
  const [form, setForm] = useState({
    transaction_date: new Date().toISOString().split('T')[0],
    item_id: '',
    item_title: '',
    item_price: '',
    quantity: 1,
    commission_percent: 4,
    commission_amount: '',
    status: 'confirmed',
    is_paid: false
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (form.item_price && form.commission_percent) {
      const commission = (parseFloat(form.item_price) * parseFloat(form.commission_percent) / 100).toFixed(2);
      setForm(f => ({ ...f, commission_amount: commission }));
    }
  }, [form.item_price, form.commission_percent]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.request('/admin/earnings/add', { method: 'POST', body: JSON.stringify(form) });
      onSave();
    } catch (error) {
      alert('Failed to add: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="glass rounded-2xl p-6 w-full max-w-lg">
        <h2 className="text-xl font-bold mb-6">Add Transaction Manually</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-midnight-400 mb-1">Date</label>
              <input type="date" value={form.transaction_date} onChange={e => setForm({...form, transaction_date: e.target.value})} className="input-dark w-full" required />
            </div>
            <div>
              <label className="block text-sm text-midnight-400 mb-1">Item ID</label>
              <input type="text" value={form.item_id} onChange={e => setForm({...form, item_id: e.target.value})} className="input-dark w-full" placeholder="123456789" />
            </div>
          </div>
          <div>
            <label className="block text-sm text-midnight-400 mb-1">Item Title</label>
            <input type="text" value={form.item_title} onChange={e => setForm({...form, item_title: e.target.value})} className="input-dark w-full" placeholder="Product name" required />
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm text-midnight-400 mb-1">Price ($)</label>
              <input type="number" step="0.01" value={form.item_price} onChange={e => setForm({...form, item_price: e.target.value})} className="input-dark w-full" required />
            </div>
            <div>
              <label className="block text-sm text-midnight-400 mb-1">Qty</label>
              <input type="number" value={form.quantity} onChange={e => setForm({...form, quantity: parseInt(e.target.value)})} className="input-dark w-full" min="1" />
            </div>
            <div>
              <label className="block text-sm text-midnight-400 mb-1">Commission %</label>
              <input type="number" step="0.1" value={form.commission_percent} onChange={e => setForm({...form, commission_percent: e.target.value})} className="input-dark w-full" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-midnight-400 mb-1">Commission ($)</label>
              <input type="number" step="0.01" value={form.commission_amount} onChange={e => setForm({...form, commission_amount: e.target.value})} className="input-dark w-full bg-midnight-700" />
            </div>
            <div>
              <label className="block text-sm text-midnight-400 mb-1">Status</label>
              <select value={form.status} onChange={e => setForm({...form, status: e.target.value})} className="input-dark w-full">
                <option value="pending">Pending</option>
                <option value="confirmed">Confirmed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <input type="checkbox" id="is_paid" checked={form.is_paid} onChange={e => setForm({...form, is_paid: e.target.checked})} />
            <label htmlFor="is_paid">Already Paid</label>
          </div>
          <div className="flex gap-3 pt-4">
            <button type="button" onClick={onClose} className="btn-outline flex-1">Cancel</button>
            <button type="submit" disabled={loading} className="btn-gold flex-1">
              {loading ? 'Adding...' : 'Add Transaction'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function EarningsPage() {
  const [activeTab, setActiveTab] = useState('overview');
  const [data, setData] = useState(null);
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState(30);
  const [showAddModal, setShowAddModal] = useState(false);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    loadAllData();
  }, [days]);

  const loadAllData = async () => {
    setLoading(true);
    try {
      const [earningsResponse, dashboardResponse] = await Promise.all([
        api.request(`/admin/earnings?days=${days}`),
        api.request(`/admin/earnings/dashboard?days=${days}`)
      ]);
      setData(earningsResponse);
      setDashboard(dashboardResponse);
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };

  const syncEarnings = async () => {
    setSyncing(true);
    try {
      const response = await api.request('/admin/earnings/sync', { method: 'POST' });
      if (response.instructions) {
        alert('⚠️ Setup Required:\n\n' + response.instructions.join('\n'));
      } else if (response.success) {
        alert(`✅ Synced!\n\n${response.added} new, ${response.updated} updated`);
        loadAllData();
      }
    } catch (error) {
      alert('Failed to sync: ' + error.message);
    } finally {
      setSyncing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-gold-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const stats = data?.stats || {};
  const summary = dashboard?.summary || {};

  const tabs = [
    { id: 'overview', label: 'Overview', icon: BarChart3 },
    { id: 'campaigns', label: 'Campaigns', icon: Target },
    { id: 'clicks', label: 'Clicks', icon: MousePointer },
    { id: 'transactions', label: 'Transactions', icon: DollarSign },
  ];

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold mb-1">eBay Partner Earnings</h1>
          <p className="text-midnight-400">Track your affiliate performance and commissions</p>
        </div>
        <div className="flex items-center gap-3">
          <select value={days} onChange={e => setDays(parseInt(e.target.value))} className="input-dark">
            <option value={7}>Last 7 days</option>
            <option value={30}>Last 30 days</option>
            <option value={90}>Last 90 days</option>
            <option value={365}>Last year</option>
          </select>
          <button onClick={syncEarnings} disabled={syncing} className="btn-outline flex items-center gap-2">
            <RefreshCw size={16} className={syncing ? 'animate-spin' : ''} />
            {syncing ? 'Syncing...' : 'Sync'}
          </button>
          <a 
            href="https://partner.ebay.com/secure/mediapartner/report/viewReport.report?handle=ebay_partner_perf_by_campaign_v2" 
            target="_blank" 
            rel="noopener"
            className="btn-gold flex items-center gap-2"
          >
            <ExternalLink size={16} />
            EPN Reports
          </a>
        </div>
      </div>

      {/* API Status */}
      {dashboard && !dashboard.configured && (
        <div className="glass rounded-xl p-4 mb-6 border border-yellow-500/30 bg-yellow-500/5">
          <div className="flex items-start gap-3">
            <AlertCircle className="text-yellow-400 flex-shrink-0" size={20} />
            <div>
              <p className="font-medium text-yellow-400">EPN API Not Configured</p>
              <p className="text-sm text-midnight-400 mt-1">
                To see live data, add <code className="bg-midnight-800 px-1 rounded">EPN_ACCOUNT_SID</code> and <code className="bg-midnight-800 px-1 rounded">EPN_AUTH_TOKEN</code> to Render environment.
              </p>
              <a href="https://partner.ebay.com" target="_blank" rel="noopener" className="text-gold-400 text-sm hover:underline mt-2 inline-block">
                Get credentials from eBay Partner Network →
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="glass rounded-xl p-5">
          <div className="flex items-center gap-3 mb-2">
            <MousePointer className="text-blue-400" size={20} />
            <span className="text-midnight-400 text-sm">Total Clicks</span>
          </div>
          <div className="text-2xl font-bold text-blue-400">
            {(summary.totalClicks || 0).toLocaleString()}
          </div>
        </div>
        
        <div className="glass rounded-xl p-5">
          <div className="flex items-center gap-3 mb-2">
            <Target className="text-purple-400" size={20} />
            <span className="text-midnight-400 text-sm">Transactions</span>
          </div>
          <div className="text-2xl font-bold text-purple-400">
            {(summary.totalTransactions || stats.total_transactions || 0).toLocaleString()}
          </div>
        </div>
        
        <div className="glass rounded-xl p-5">
          <div className="flex items-center gap-3 mb-2">
            <TrendingUp className="text-cyan-400" size={20} />
            <span className="text-midnight-400 text-sm">Total Sales</span>
          </div>
          <div className="text-2xl font-bold text-cyan-400">
            ${(summary.totalSales || stats.total_sales || 0).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}
          </div>
        </div>
        
        <div className="glass rounded-xl p-5">
          <div className="flex items-center gap-3 mb-2">
            <DollarSign className="text-green-400" size={20} />
            <span className="text-midnight-400 text-sm">Earnings</span>
          </div>
          <div className="text-2xl font-bold text-green-400">
            ${(summary.totalEarnings || stats.total_earnings || 0).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg whitespace-nowrap transition-all ${
              activeTab === tab.id 
                ? 'bg-gold-500 text-black font-medium' 
                : 'bg-midnight-800 text-midnight-300 hover:bg-midnight-700'
            }`}
          >
            <tab.icon size={16} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Monthly Summary */}
          {data?.byMonth?.length > 0 && (
            <div className="glass rounded-xl p-6">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Calendar size={20} />
                Monthly Summary
              </h2>
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                {data.byMonth.map(month => (
                  <div key={month.month} className="bg-midnight-800/50 rounded-lg p-3 text-center">
                    <div className="text-sm text-midnight-400 mb-1">{month.month}</div>
                    <div className="text-lg font-bold text-green-400">${(month.earnings || 0).toFixed(2)}</div>
                    <div className="text-xs text-midnight-500">{month.transactions} sales</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Errors */}
          {dashboard?.errors?.length > 0 && (
            <div className="glass rounded-xl p-4 border border-red-500/30">
              <h3 className="font-medium text-red-400 mb-2">API Errors</h3>
              {dashboard.errors.map((err, idx) => (
                <p key={idx} className="text-sm text-midnight-400">
                  {err.report}: {err.error}
                </p>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'campaigns' && (
        <div className="glass rounded-xl overflow-hidden">
          <div className="p-4 border-b border-midnight-700">
            <h2 className="font-semibold flex items-center gap-2">
              <Target size={18} />
              Campaign Performance
            </h2>
          </div>
          {dashboard?.campaigns?.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-midnight-400 border-b border-midnight-700">
                    <th className="p-4">Campaign</th>
                    <th className="p-4 text-right">Clicks</th>
                    <th className="p-4 text-right">Transactions</th>
                    <th className="p-4 text-right">Sales</th>
                    <th className="p-4 text-right">Earnings</th>
                    <th className="p-4 text-right">EPC</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-midnight-800">
                  {dashboard.campaigns.map((campaign, idx) => (
                    <tr key={idx} className="hover:bg-midnight-800/30">
                      <td className="p-4">
                        <div className="font-medium">{campaign.campaign_name}</div>
                        <div className="text-xs text-midnight-500">ID: {campaign.campaign_id}</div>
                      </td>
                      <td className="p-4 text-right text-blue-400">{campaign.clicks.toLocaleString()}</td>
                      <td className="p-4 text-right text-purple-400">{campaign.transactions}</td>
                      <td className="p-4 text-right">${campaign.sales.toFixed(2)}</td>
                      <td className="p-4 text-right text-green-400 font-medium">${campaign.earnings.toFixed(2)}</td>
                      <td className="p-4 text-right text-cyan-400">${campaign.epc.toFixed(4)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-midnight-400 text-center py-12">No campaign data available</p>
          )}
        </div>
      )}

      {activeTab === 'clicks' && (
        <div className="glass rounded-xl overflow-hidden">
          <div className="p-4 border-b border-midnight-700">
            <h2 className="font-semibold flex items-center gap-2">
              <MousePointer size={18} />
              Recent Clicks
            </h2>
          </div>
          {dashboard?.clickDetails?.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-midnight-400 border-b border-midnight-700">
                    <th className="p-4">Date</th>
                    <th className="p-4">Campaign</th>
                    <th className="p-4">Category</th>
                    <th className="p-4">Device</th>
                    <th className="p-4">Country</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-midnight-800">
                  {dashboard.clickDetails.slice(0, 50).map((click, idx) => (
                    <tr key={idx} className="hover:bg-midnight-800/30">
                      <td className="p-4 whitespace-nowrap">
                        {click.click_date ? new Date(click.click_date).toLocaleString('he-IL') : '-'}
                      </td>
                      <td className="p-4">{click.campaign_name || click.campaign_id || '-'}</td>
                      <td className="p-4">{click.category || '-'}</td>
                      <td className="p-4">{click.device || '-'}</td>
                      <td className="p-4">{click.country || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-midnight-400 text-center py-12">No click data available</p>
          )}
        </div>
      )}

      {activeTab === 'transactions' && (
        <div className="glass rounded-xl overflow-hidden">
          <div className="p-4 border-b border-midnight-700 flex items-center justify-between">
            <h2 className="font-semibold flex items-center gap-2">
              <DollarSign size={18} />
              Transactions ({stats.total_transactions || 0})
            </h2>
            <button onClick={() => setShowAddModal(true)} className="btn-outline flex items-center gap-2 text-sm">
              <Plus size={14} />
              Add Manual
            </button>
          </div>
          
          {data?.transactions?.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-midnight-400 mb-4">No transactions yet</p>
              <a 
                href="https://partner.ebay.com/secure/mediapartner/report/viewReport.report?handle=ebay_partner_transaction_detail" 
                target="_blank" 
                rel="noopener"
                className="btn-gold inline-flex items-center gap-2"
              >
                <ExternalLink size={14} />
                View on eBay Partner Network
              </a>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-midnight-400 border-b border-midnight-700">
                    <th className="p-4">Date</th>
                    <th className="p-4">Item</th>
                    <th className="p-4">Price</th>
                    <th className="p-4">Commission</th>
                    <th className="p-4">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-midnight-800">
                  {data?.transactions?.map(tx => (
                    <tr key={tx.id} className="hover:bg-midnight-800/30">
                      <td className="p-4 whitespace-nowrap">
                        {new Date(tx.transaction_date).toLocaleDateString('he-IL')}
                      </td>
                      <td className="p-4">
                        <div className="max-w-xs">
                          <p className="truncate font-medium">{tx.item_title}</p>
                          <p className="text-xs text-midnight-500">ID: {tx.item_id}</p>
                        </div>
                      </td>
                      <td className="p-4">
                        <span className="text-white">${tx.item_price?.toFixed(2)}</span>
                        {tx.quantity > 1 && <span className="text-midnight-500"> x{tx.quantity}</span>}
                      </td>
                      <td className="p-4">
                        <div className="text-green-400 font-medium">${tx.commission_amount?.toFixed(2)}</div>
                        <div className="text-xs text-midnight-500">{tx.commission_percent?.toFixed(1)}%</div>
                      </td>
                      <td className="p-4">
                        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium ${
                          tx.is_paid 
                            ? 'bg-green-500/20 text-green-400' 
                            : tx.status === 'confirmed'
                              ? 'bg-blue-500/20 text-blue-400'
                              : tx.status === 'cancelled'
                                ? 'bg-red-500/20 text-red-400'
                                : 'bg-yellow-500/20 text-yellow-400'
                        }`}>
                          {tx.is_paid ? <><CheckCircle size={12} /> Paid</> : <><Clock size={12} /> {tx.status}</>}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {showAddModal && (
        <AddTransactionModal 
          onClose={() => setShowAddModal(false)} 
          onSave={() => { setShowAddModal(false); loadAllData(); }} 
        />
      )}
    </div>
  );
}
