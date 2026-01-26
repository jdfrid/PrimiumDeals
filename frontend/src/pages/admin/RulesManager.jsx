import { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, X, Save, Play, Clock, CheckCircle, AlertCircle } from 'lucide-react';
import api from '../../services/api';

function RuleModal({ rule, onClose, onSave }) {
  const [form, setForm] = useState({ name: rule?.name || '', keywords: rule?.keywords || '', ebay_category_ids: rule?.ebay_category_ids || '', min_price: rule?.min_price || 500, max_price: rule?.max_price || 1000, min_discount: rule?.min_discount || 30, schedule_cron: rule?.schedule_cron || '0 0 * * *', is_active: rule?.is_active ?? 1 });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (rule) await api.updateRule(rule.id, form);
      else await api.createRule(form);
      onSave();
    } catch (error) { alert(error.message); }
    finally { setLoading(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="glass rounded-2xl p-6 w-full max-w-lg my-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold">{rule ? 'Edit Rule' : 'New Rule'}</h2>
          <button onClick={onClose} className="p-2 hover:bg-midnight-700 rounded-lg"><X size={20} /></button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-midnight-300 mb-2">Rule Name</label>
            <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required className="input-dark w-full" />
          </div>
          
          {/* Keywords - Main Search Section */}
          <div className="bg-midnight-800/50 rounded-lg p-4 border border-gold-500/30">
            <label className="block text-sm font-medium text-gold-400 mb-2">🔍 Search Keywords</label>
            <textarea 
              value={form.keywords} 
              onChange={(e) => setForm({ ...form, keywords: e.target.value })} 
              rows={3} 
              className="input-dark w-full resize-none" 
              placeholder="luxury watch, designer bag, jewelry, handbag, rolex, gucci"
            />
            <p className="text-xs text-midnight-500 mt-2">Separate multiple keywords with commas. Each keyword will be searched separately.</p>
          </div>
          
          {/* Price & Discount Section */}
          <div className="bg-midnight-800/50 rounded-lg p-4">
            <label className="block text-sm font-medium text-midnight-300 mb-3">💰 Price & Discount Filters</label>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-xs text-midnight-400 mb-1">Min Price ($)</label>
                <input type="number" value={form.min_price} onChange={(e) => setForm({ ...form, min_price: parseFloat(e.target.value) })} className="input-dark w-full" />
              </div>
              <div>
                <label className="block text-xs text-midnight-400 mb-1">Max Price ($)</label>
                <input type="number" value={form.max_price} onChange={(e) => setForm({ ...form, max_price: parseFloat(e.target.value) })} className="input-dark w-full" />
              </div>
              <div>
                <label className="block text-xs text-midnight-400 mb-1">Min Discount (%)</label>
                <input type="number" value={form.min_discount} onChange={(e) => setForm({ ...form, min_discount: parseFloat(e.target.value) })} className="input-dark w-full" min="0" max="90" />
              </div>
            </div>
            <p className="text-xs text-midnight-500 mt-2">Only items with this discount or higher will be imported.</p>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-midnight-300 mb-2">eBay Category IDs (optional)</label>
            <input type="text" value={form.ebay_category_ids} onChange={(e) => setForm({ ...form, ebay_category_ids: e.target.value })} className="input-dark w-full" placeholder="31387, 169291" />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-midnight-300 mb-2">Schedule</label>
            <select value={form.schedule_cron} onChange={(e) => setForm({ ...form, schedule_cron: e.target.value })} className="input-dark w-full">
              <option value="0 * * * *">Every hour</option>
              <option value="0 */6 * * *">Every 6 hours</option>
              <option value="0 */12 * * *">Every 12 hours</option>
              <option value="0 0 * * *">Daily (midnight)</option>
            </select>
          </div>
          
          <div className="flex items-center gap-3">
            <input type="checkbox" id="active" checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked ? 1 : 0 })} className="w-5 h-5" />
            <label htmlFor="active">Active</label>
          </div>
          <div className="flex gap-3 pt-4">
            <button type="button" onClick={onClose} className="btn-outline flex-1">Cancel</button>
            <button type="submit" disabled={loading} className="btn-gold flex-1 flex items-center justify-center gap-2">{loading ? <div className="w-5 h-5 border-2 border-midnight-950 border-t-transparent rounded-full animate-spin" /> : <><Save size={18} />Save</>}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function RulesManager() {
  const [rules, setRules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingRule, setEditingRule] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [executing, setExecuting] = useState(null);

  useEffect(() => { loadRules(); }, []);

  const loadRules = async () => { try { setRules(await api.getRules()); } catch (e) { console.error(e); } finally { setLoading(false); } };
  const executeRule = async (id) => { 
    setExecuting(id); 
    try { 
      const r = await api.executeRule(id); 
      if (r.error) {
        alert(`❌ Error: ${r.error}`);
      } else {
        alert(`✅ Found: ${r.itemsFound}, Added: ${r.itemsAdded}`); 
      }
      loadRules(); 
    } catch (e) { 
      alert(`❌ Error: ${e.message}`); 
    } finally { 
      setExecuting(null); 
    } 
  };
  const deleteRule = async (id) => { if (confirm('Delete this rule?')) { await api.deleteRule(id); loadRules(); } };
  const openModal = (rule = null) => { setEditingRule(rule); setShowModal(true); };
  const closeModal = () => { setEditingRule(null); setShowModal(false); };
  const handleSave = () => { closeModal(); loadRules(); };

  return (
    <div>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div><h1 className="text-2xl font-bold mb-1">Query Rules</h1><p className="text-midnight-400">Configure automatic eBay API searches</p></div>
        <button onClick={() => openModal()} className="btn-gold flex items-center gap-2"><Plus size={18} />Add Rule</button>
      </div>
      <div className="space-y-4">
        {loading ? [...Array(3)].map((_, i) => <div key={i} className="glass rounded-xl p-6"><div className="h-24 shimmer rounded" /></div>) : rules.length === 0 ? <div className="glass rounded-xl text-center py-12 text-midnight-400">No rules yet</div> : rules.map(rule => (
          <div key={rule.id} className="glass rounded-xl p-6">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h3 className="font-semibold text-lg">{rule.name}</h3>
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${rule.is_active ? 'bg-green-500/20 text-green-400' : 'bg-midnight-700 text-midnight-400'}`}>{rule.is_active ? <CheckCircle size={12} /> : <AlertCircle size={12} />}{rule.is_active ? 'Active' : 'Inactive'}</span>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div><span className="text-midnight-500">Keywords:</span><p className="truncate">{rule.keywords || 'None'}</p></div>
                  <div><span className="text-midnight-500">Price:</span><p>${rule.min_price} - ${rule.max_price}</p></div>
                  <div><span className="text-midnight-500">Discount:</span><p>{rule.min_discount}%+</p></div>
                  <div><span className="text-midnight-500">Schedule:</span><p className="font-mono text-xs">{rule.schedule_cron}</p></div>
                </div>
                {rule.last_run && <p className="text-xs text-midnight-500 mt-3 flex items-center gap-1"><Clock size={12} />Last: {new Date(rule.last_run).toLocaleString()}</p>}
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => executeRule(rule.id)} disabled={executing === rule.id} className="btn-outline flex items-center gap-2 text-sm">{executing === rule.id ? <div className="w-4 h-4 border-2 border-gold-400 border-t-transparent rounded-full animate-spin" /> : <Play size={16} />}Run</button>
                <button onClick={() => openModal(rule)} className="p-2 rounded-lg hover:bg-midnight-700 text-midnight-400 hover:text-white transition-colors"><Edit size={18} /></button>
                <button onClick={() => deleteRule(rule.id)} className="p-2 rounded-lg hover:bg-red-500/20 text-midnight-400 hover:text-red-400 transition-colors"><Trash2 size={18} /></button>
              </div>
            </div>
          </div>
        ))}
      </div>
      {showModal && <RuleModal rule={editingRule} onClose={closeModal} onSave={handleSave} />}
    </div>
  );
}


