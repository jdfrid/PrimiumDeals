import { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, X, Save, Play, Clock, CheckCircle, AlertCircle } from 'lucide-react';
import api from '../../services/api';

const DEFAULT_FORM = {
  name: '',
  keywords: '',
  ebay_category_ids: '',
  min_price: 100,
  max_price: 5000,
  min_discount: 15,
  schedule_cron: '0 0 * * *',
  is_active: 1
};

const SCHEDULE_LABELS = {
  '0 * * * *': 'Every hour',
  '0 */6 * * *': 'Every 6 hours',
  '0 */12 * * *': 'Every 12 hours',
  '0 0 * * *': 'Daily (midnight)'
};

function scheduleLabel(cron) {
  if (!cron) return 'Daily (midnight)';
  return SCHEDULE_LABELS[cron] || cron;
}

function ruleToForm(rule) {
  if (!rule) return { ...DEFAULT_FORM };
  return {
    name: rule.name ?? '',
    keywords: rule.keywords ?? '',
    ebay_category_ids: rule.ebay_category_ids ?? '',
    min_price: rule.min_price != null ? Number(rule.min_price) : DEFAULT_FORM.min_price,
    max_price: rule.max_price != null ? Number(rule.max_price) : DEFAULT_FORM.max_price,
    min_discount: rule.min_discount != null ? Number(rule.min_discount) : DEFAULT_FORM.min_discount,
    schedule_cron: rule.schedule_cron || DEFAULT_FORM.schedule_cron,
    is_active: rule.is_active ? 1 : 0
  };
}

function RuleModal({ rule, onClose, onSave }) {
  const [form, setForm] = useState(() => ruleToForm(rule));
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setForm(ruleToForm(rule));
  }, [rule]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!String(form.keywords || '').trim()) {
      alert('Add at least one search keyword (comma-separated).');
      return;
    }
    setLoading(true);
    try {
      const payload = {
        ...form,
        min_price: Number(form.min_price) || 0,
        max_price: Number(form.max_price) || 10000,
        min_discount: Number(form.min_discount) || 10,
        is_active: form.is_active ? 1 : 0
      };
      if (rule?.id) await api.updateRule(rule.id, payload);
      else await api.createRule(payload);
      onSave();
    } catch (error) {
      alert(error.message);
    } finally {
      setLoading(false);
    }
  };

  const setNum = (field, raw) => {
    const n = parseFloat(raw);
    setForm({ ...form, [field]: Number.isFinite(n) ? n : '' });
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="glass rounded-2xl p-6 w-full max-w-lg my-8 text-midnight-100">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-white">{rule?.id ? 'Edit Rule' : 'New Rule'}</h2>
          <button type="button" onClick={onClose} className="p-2 hover:bg-midnight-700 rounded-lg text-midnight-300">
            <X size={20} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-midnight-300 mb-2">Rule Name</label>
            <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required className="input-dark w-full" />
          </div>

          <div className="bg-midnight-800/50 rounded-lg p-4 border border-gold-500/30">
            <label className="block text-sm font-medium text-gold-400 mb-2">Search Keywords</label>
            <textarea
              value={form.keywords}
              onChange={(e) => setForm({ ...form, keywords: e.target.value })}
              rows={3}
              className="input-dark w-full resize-none"
              placeholder="luxury watch, designer bag, jewelry, rolex, gucci"
            />
            <p className="text-xs text-midnight-400 mt-2">Comma-separated. Each keyword is searched on eBay separately.</p>
          </div>

          <div className="bg-midnight-800/50 rounded-lg p-4">
            <label className="block text-sm font-medium text-midnight-300 mb-3">Price &amp; Discount</label>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-xs text-midnight-400 mb-1">Min Price ($)</label>
                <input type="number" value={form.min_price} onChange={(e) => setNum('min_price', e.target.value)} className="input-dark w-full" min="0" />
              </div>
              <div>
                <label className="block text-xs text-midnight-400 mb-1">Max Price ($)</label>
                <input type="number" value={form.max_price} onChange={(e) => setNum('max_price', e.target.value)} className="input-dark w-full" min="0" />
              </div>
              <div>
                <label className="block text-xs text-midnight-400 mb-1">Min Discount (%)</label>
                <input type="number" value={form.min_discount} onChange={(e) => setNum('min_discount', e.target.value)} className="input-dark w-full" min="0" max="90" />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-midnight-300 mb-2">eBay Category IDs (optional)</label>
            <input
              type="text"
              value={form.ebay_category_ids}
              onChange={(e) => setForm({ ...form, ebay_category_ids: e.target.value })}
              className="input-dark w-full"
              placeholder="31387, 169291, 281, 79720"
            />
            <p className="text-xs text-midnight-400 mt-1">Multiple IDs OK — searched one at a time.</p>
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
            <input
              type="checkbox"
              id="active"
              checked={!!form.is_active}
              onChange={(e) => setForm({ ...form, is_active: e.target.checked ? 1 : 0 })}
              className="w-5 h-5"
            />
            <label htmlFor="active" className="text-midnight-200">Active</label>
          </div>

          <div className="flex gap-3 pt-4">
            <button type="button" onClick={onClose} className="btn-outline flex-1">Cancel</button>
            <button type="submit" disabled={loading} className="btn-gold flex-1 flex items-center justify-center gap-2">
              {loading ? <div className="w-5 h-5 border-2 border-midnight-950 border-t-transparent rounded-full animate-spin" /> : <><Save size={18} />Save</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function RuleDetail({ label, value, mono }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs font-medium text-midnight-400 uppercase tracking-wide mb-1">{label}</dt>
      <dd className={`text-sm text-midnight-100 break-words ${mono ? 'font-mono text-xs' : ''}`}>{value}</dd>
    </div>
  );
}

export default function RulesManager() {
  const [rules, setRules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingRule, setEditingRule] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [executing, setExecuting] = useState(null);
  const [ebayHealth, setEbayHealth] = useState(null);

  useEffect(() => {
    loadRules();
    api.getHealth().then(setEbayHealth).catch(() => setEbayHealth(null));
  }, []);

  const loadRules = async () => {
    try {
      const data = await api.getRules();
      setRules(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error(e);
      alert(`Failed to load rules: ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  const executeRule = async (id) => {
    setExecuting(id);
    try {
      const r = await api.executeRule(id);
      if (r.error) {
        alert(`❌ Error:\n${r.error}`);
      } else {
        const lines = [
          `Found on eBay: ${r.itemsFound}`,
          `New deals added: ${r.itemsAdded}`,
          `Updated: ${r.itemsUpdated ?? 0}`,
          r.warning ? `\n⚠️ ${r.warning}` : ''
        ].filter(Boolean);
        alert(`✅ Run finished\n\n${lines.join('\n')}`);
      }
      loadRules();
    } catch (e) {
      alert(`❌ Error: ${e.message}`);
    } finally {
      setExecuting(null);
    }
  };

  const deleteRule = async (id) => {
    if (!confirm('Delete this rule?')) return;
    await api.deleteRule(id);
    loadRules();
  };

  const openModal = async (rule = null) => {
    if (rule?.id) {
      try {
        const full = await api.getRule(rule.id);
        setEditingRule(full);
      } catch {
        setEditingRule(rule);
      }
    } else {
      setEditingRule(null);
    }
    setShowModal(true);
  };

  const closeModal = () => {
    setEditingRule(null);
    setShowModal(false);
  };

  const handleSave = () => {
    closeModal();
    loadRules();
  };

  return (
    <div className="text-midnight-100">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white mb-1">Query Rules</h1>
          <p className="text-midnight-400">Configure automatic eBay API searches</p>
        </div>
        <button type="button" onClick={() => openModal()} className="btn-gold flex items-center gap-2">
          <Plus size={18} />
          Add Rule
        </button>
      </div>

      {ebayHealth && ebayHealth.ebayBrowseConfigured === false && (
        <div className="mb-4 rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
          <strong className="text-amber-300">eBay API not configured on server.</strong>{' '}
          {ebayHealth.ebayOAuthHint || 'Set EBAY_APP_ID and EBAY_CERT_ID in Render → Environment, then redeploy.'}
        </div>
      )}

      <div className="space-y-4">
        {loading ? (
          [...Array(3)].map((_, i) => (
            <div key={i} className="glass rounded-xl p-6">
              <div className="h-24 shimmer rounded" />
            </div>
          ))
        ) : rules.length === 0 ? (
          <div className="glass rounded-xl text-center py-12 text-midnight-400">No rules yet</div>
        ) : (
          rules.map((rule) => (
            <div key={rule.id} className="glass rounded-xl p-6">
              <div className="flex flex-col gap-4">
                <div className="flex flex-wrap items-center gap-3 mb-1">
                  <h3 className="font-semibold text-lg text-white">{rule.name || `Rule #${rule.id}`}</h3>
                  <span
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${
                      rule.is_active ? 'bg-green-500/20 text-green-400' : 'bg-midnight-700 text-midnight-400'
                    }`}
                  >
                    {rule.is_active ? <CheckCircle size={12} /> : <AlertCircle size={12} />}
                    {rule.is_active ? 'Active' : 'Inactive'}
                  </span>
                </div>

                <dl className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  <RuleDetail
                    label="Keywords"
                    value={rule.keywords?.trim() || '(uses default: luxury watch)'}
                  />
                  <RuleDetail
                    label="Price range"
                    value={`$${rule.min_price ?? 0} – $${rule.max_price ?? 10000}`}
                  />
                  <RuleDetail label="Min discount" value={`${rule.min_discount ?? 10}%+`} />
                  <RuleDetail label="Schedule" value={scheduleLabel(rule.schedule_cron)} mono />
                  {rule.ebay_category_ids?.trim() ? (
                    <RuleDetail label="eBay categories" value={rule.ebay_category_ids} mono />
                  ) : null}
                </dl>

                {rule.last_run && (
                  <p className="text-xs text-midnight-400 flex items-center gap-1">
                    <Clock size={12} />
                    Last run: {new Date(rule.last_run).toLocaleString()}
                  </p>
                )}

                <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-midnight-700/80">
                  <button
                    type="button"
                    onClick={() => executeRule(rule.id)}
                    disabled={executing === rule.id}
                    className="btn-gold inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold shrink-0"
                  >
                    {executing === rule.id ? (
                      <div className="w-4 h-4 border-2 border-midnight-950 border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <Play size={18} fill="currentColor" className="opacity-90" />
                    )}
                    Run now
                  </button>
                  <button type="button" onClick={() => openModal(rule)} className="btn-outline inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm">
                    <Edit size={16} />
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => deleteRule(rule.id)}
                    className="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-red-400 hover:bg-red-500/15 border border-red-500/30"
                  >
                    <Trash2 size={16} />
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {showModal && (
        <RuleModal key={editingRule?.id ?? 'new'} rule={editingRule} onClose={closeModal} onSave={handleSave} />
      )}
    </div>
  );
}
