import { useState, useEffect } from 'react';
import { DollarSign, TrendingUp, Clock, CheckCircle, RefreshCw, Plus, ExternalLink, AlertCircle, Upload } from 'lucide-react';
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

  // Auto-calculate commission
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
      await api.request('/admin/earnings/add', {
        method: 'POST',
        body: JSON.stringify(form)
      });
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
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState(30);
  const [showAddModal, setShowAddModal] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [importing, setImporting] = useState(false);

  useEffect(() => {
    loadEarnings();
  }, [days]);

  // CSV Import handler
  const handleCSVImport = async (event) => {
    const file = event.target.files[0];
    if (!file) return;
    
    setImporting(true);
    const reader = new FileReader();
    
    reader.onload = async (e) => {
      try {
        const text = e.target.result;
        const lines = text.split('\n');
        const headers = lines[0].toLowerCase().split(',').map(h => h.trim().replace(/"/g, ''));
        
        let imported = 0;
        
        for (let i = 1; i < lines.length; i++) {
          const values = lines[i].split(',').map(v => v.trim().replace(/"/g, ''));
          if (values.length < 3) continue;
          
          const row = {};
          headers.forEach((h, idx) => row[h] = values[idx]);
          
          // Map common CSV column names to our format
          const transaction = {
            transaction_id: row['transaction id'] || row['event id'] || row['id'] || `CSV-${Date.now()}-${i}`,
            transaction_date: row['transaction date'] || row['event date'] || row['date'] || new Date().toISOString(),
            item_id: row['item id'] || row['product id'] || row['listing id'] || '',
            item_title: row['item name'] || row['item title'] || row['product name'] || row['title'] || 'Unknown',
            item_price: parseFloat(row['sale amount'] || row['gmv'] || row['price'] || row['transaction amount'] || 0),
            quantity: parseInt(row['quantity'] || row['qty'] || 1),
            commission_percent: parseFloat(row['commission rate'] || row['rate'] || 0) * 100,
            commission_amount: parseFloat(row['earnings'] || row['payout'] || row['commission'] || row['epc'] || 0),
            status: 'confirmed',
            is_paid: (row['payment status'] || '').toLowerCase().includes('paid')
          };
          
          try {
            await api.request('/admin/earnings/add', {
              method: 'POST',
              body: JSON.stringify(transaction)
            });
            imported++;
          } catch (err) {
            console.log('Skip duplicate:', transaction.transaction_id);
          }
        }
        
        alert(`✅ Imported ${imported} transactions!`);
        loadEarnings();
      } catch (error) {
        alert('❌ Failed to parse CSV: ' + error.message);
      } finally {
        setImporting(false);
        event.target.value = '';
      }
    };
    
    reader.readAsText(file);
  };

  const loadEarnings = async () => {
    setLoading(true);
    try {
      const response = await api.request(`/admin/earnings?days=${days}`);
      setData(response);
    } catch (error) {
      console.error('Failed to load earnings:', error);
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
        alert(`✅ Synced successfully!\n\n${response.added} new transactions\n${response.updated} updated`);
        loadEarnings();
      } else {
        alert('⚠️ ' + (response.message || 'Unknown error'));
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

  return (
    <div>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold mb-1">Affiliate Earnings</h1>
          <p className="text-midnight-400">Track your eBay Partner Network commissions</p>
        </div>
        <div className="flex items-center gap-3">
          <select value={days} onChange={e => setDays(parseInt(e.target.value))} className="input-dark">
            <option value={7}>Last 7 days</option>
            <option value={30}>Last 30 days</option>
            <option value={90}>Last 90 days</option>
            <option value={365}>Last year</option>
            <option value={9999}>All time</option>
          </select>
          <label className={`btn-outline flex items-center gap-2 cursor-pointer ${importing ? 'opacity-50' : ''}`}>
            <Upload size={16} />
            {importing ? 'Importing...' : 'Import CSV'}
            <input 
              type="file" 
              accept=".csv" 
              onChange={handleCSVImport} 
              className="hidden" 
              disabled={importing}
            />
          </label>
          <button onClick={() => setShowAddModal(true)} className="btn-gold flex items-center gap-2">
            <Plus size={16} />
            Add
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="glass rounded-xl p-6">
          <div className="flex items-center gap-3 mb-2">
            <DollarSign className="text-green-400" size={24} />
            <span className="text-midnight-400">Total Earnings</span>
          </div>
          <div className="text-3xl font-bold text-green-400">
            ${(stats.total_earnings || 0).toFixed(2)}
          </div>
        </div>
        
        <div className="glass rounded-xl p-6">
          <div className="flex items-center gap-3 mb-2">
            <CheckCircle className="text-blue-400" size={24} />
            <span className="text-midnight-400">Paid</span>
          </div>
          <div className="text-3xl font-bold text-blue-400">
            ${(stats.paid_earnings || 0).toFixed(2)}
          </div>
        </div>
        
        <div className="glass rounded-xl p-6">
          <div className="flex items-center gap-3 mb-2">
            <Clock className="text-yellow-400" size={24} />
            <span className="text-midnight-400">Pending</span>
          </div>
          <div className="text-3xl font-bold text-yellow-400">
            ${(stats.pending_earnings || 0).toFixed(2)}
          </div>
        </div>
        
        <div className="glass rounded-xl p-6">
          <div className="flex items-center gap-3 mb-2">
            <TrendingUp className="text-purple-400" size={24} />
            <span className="text-midnight-400">Total Sales</span>
          </div>
          <div className="text-3xl font-bold text-purple-400">
            ${(stats.total_sales || 0).toFixed(2)}
          </div>
        </div>
      </div>

      {/* Info Box */}
      {(!data?.transactions || data.transactions.length === 0) && (
        <div className="glass rounded-xl p-6 mb-6 border border-gold-500/30">
          <div className="flex items-start gap-4">
            <AlertCircle className="text-gold-400 flex-shrink-0" size={24} />
            <div>
              <h3 className="font-semibold mb-2">📥 How to import your eBay earnings</h3>
              <p className="text-midnight-400 text-sm mb-3">
                Import your transaction data from eBay Partner Network:
              </p>
              <ol className="text-sm text-midnight-300 space-y-2 list-decimal list-inside mb-4">
                <li>Go to <a href="https://partner.ebay.com" target="_blank" rel="noopener" className="text-gold-400 hover:underline">partner.ebay.com</a></li>
                <li>Click <strong>Reports</strong> → <strong>Transaction Detail Report</strong></li>
                <li>Select date range and click <strong>Download CSV</strong></li>
                <li>Click <strong>"Import CSV"</strong> button above and select the file</li>
              </ol>
              <div className="flex gap-3">
                <a 
                  href="https://partner.ebay.com" 
                  target="_blank" 
                  rel="noopener"
                  className="btn-gold inline-flex items-center gap-2 text-sm"
                >
                  <ExternalLink size={14} />
                  Open eBay Partner Network
                </a>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Monthly Summary */}
      {data?.byMonth?.length > 0 && (
        <div className="glass rounded-xl p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">Monthly Summary</h2>
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

      {/* Transactions Table */}
      <div className="glass rounded-xl overflow-hidden">
        <div className="p-4 border-b border-midnight-700">
          <h2 className="font-semibold">Transactions ({stats.total_transactions || 0})</h2>
        </div>
        
        {data?.transactions?.length === 0 ? (
          <p className="text-midnight-400 text-center py-12">No transactions yet</p>
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
                      <div className="text-xs text-midnight-500">{tx.commission_percent}%</div>
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
                        {tx.is_paid ? (
                          <><CheckCircle size={12} /> Paid</>
                        ) : (
                          <><Clock size={12} /> {tx.status}</>
                        )}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showAddModal && (
        <AddTransactionModal 
          onClose={() => setShowAddModal(false)} 
          onSave={() => { setShowAddModal(false); loadEarnings(); }} 
        />
      )}
    </div>
  );
}

