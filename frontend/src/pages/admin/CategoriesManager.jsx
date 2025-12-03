import { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, X, Save } from 'lucide-react';
import api from '../../services/api';

function CategoryModal({ category, onClose, onSave }) {
  const [form, setForm] = useState({ name: category?.name || '', name_he: category?.name_he || '', ebay_category_id: category?.ebay_category_id || '', icon: category?.icon || '' });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (category) await api.updateCategory(category.id, form);
      else await api.createCategory(form);
      onSave();
    } catch (error) { alert(error.message); }
    finally { setLoading(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="glass rounded-2xl p-6 w-full max-w-md">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold">{category ? 'Edit Category' : 'New Category'}</h2>
          <button onClick={onClose} className="p-2 hover:bg-midnight-700 rounded-lg"><X size={20} /></button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div><label className="block text-sm font-medium text-midnight-300 mb-2">Name (English)</label><input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required className="input-dark w-full" /></div>
          <div><label className="block text-sm font-medium text-midnight-300 mb-2">Name (Hebrew)</label><input type="text" value={form.name_he} onChange={(e) => setForm({ ...form, name_he: e.target.value })} className="input-dark w-full" dir="rtl" /></div>
          <div><label className="block text-sm font-medium text-midnight-300 mb-2">eBay Category ID</label><input type="text" value={form.ebay_category_id} onChange={(e) => setForm({ ...form, ebay_category_id: e.target.value })} className="input-dark w-full" placeholder="e.g., 31387" /></div>
          <div><label className="block text-sm font-medium text-midnight-300 mb-2">Icon (Emoji)</label><input type="text" value={form.icon} onChange={(e) => setForm({ ...form, icon: e.target.value })} className="input-dark w-full" placeholder="e.g., ⌚" /></div>
          <div className="flex gap-3 pt-4">
            <button type="button" onClick={onClose} className="btn-outline flex-1">Cancel</button>
            <button type="submit" disabled={loading} className="btn-gold flex-1 flex items-center justify-center gap-2">{loading ? <div className="w-5 h-5 border-2 border-midnight-950 border-t-transparent rounded-full animate-spin" /> : <><Save size={18} />Save</>}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function CategoriesManager() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingCategory, setEditingCategory] = useState(null);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => { loadCategories(); }, []);

  const loadCategories = async () => { try { setCategories(await api.getCategories()); } catch (e) { console.error(e); } finally { setLoading(false); } };
  const deleteCategory = async (id) => { if (confirm('Delete this category?')) { try { await api.deleteCategory(id); loadCategories(); } catch (e) { alert(e.message); } } };
  const openModal = (cat = null) => { setEditingCategory(cat); setShowModal(true); };
  const closeModal = () => { setEditingCategory(null); setShowModal(false); };
  const handleSave = () => { closeModal(); loadCategories(); };

  return (
    <div>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div><h1 className="text-2xl font-bold mb-1">Categories</h1><p className="text-midnight-400">Organize your deals by category</p></div>
        <button onClick={() => openModal()} className="btn-gold flex items-center gap-2"><Plus size={18} />Add Category</button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading ? [...Array(6)].map((_, i) => <div key={i} className="glass rounded-xl p-6"><div className="h-20 shimmer rounded" /></div>) : categories.length === 0 ? <div className="col-span-full text-center py-12 text-midnight-400">No categories yet</div> : categories.map(cat => (
          <div key={cat.id} className="glass rounded-xl p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <span className="text-3xl">{cat.icon || '📁'}</span>
                <div><h3 className="font-semibold">{cat.name}</h3>{cat.name_he && <p className="text-sm text-midnight-400" dir="rtl">{cat.name_he}</p>}</div>
              </div>
              <div className="flex items-center gap-1">
                <button onClick={() => openModal(cat)} className="p-2 rounded-lg hover:bg-midnight-700 text-midnight-400 hover:text-white transition-colors"><Edit size={16} /></button>
                <button onClick={() => deleteCategory(cat.id)} className="p-2 rounded-lg hover:bg-red-500/20 text-midnight-400 hover:text-red-400 transition-colors"><Trash2 size={16} /></button>
              </div>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-midnight-400">eBay ID: {cat.ebay_category_id || 'N/A'}</span>
              <span className="text-gold-400 font-medium">{cat.deal_count || 0} deals</span>
            </div>
          </div>
        ))}
      </div>
      {showModal && <CategoryModal category={editingCategory} onClose={closeModal} onSave={handleSave} />}
    </div>
  );
}


