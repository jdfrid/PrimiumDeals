import { useState, useEffect } from 'react';
import { Search, Trash2, Eye, EyeOff, ExternalLink, ChevronLeft, ChevronRight } from 'lucide-react';
import api from '../../services/api';

export default function DealsManager() {
  const [deals, setDeals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState(null);

  useEffect(() => { loadDeals(); }, [page, search]);

  const loadDeals = async () => {
    setLoading(true);
    try {
      const params = { page, limit: 20 };
      if (search) params.search = search;
      const data = await api.getDeals(params);
      setDeals(data.deals);
      setPagination(data.pagination);
    } catch (error) { console.error('Failed to load deals:', error); }
    finally { setLoading(false); }
  };

  const toggleActive = async (id) => { await api.toggleDealActive(id); loadDeals(); };
  const deleteDeal = async (id) => { if (confirm('Delete this deal?')) { await api.deleteDeal(id); loadDeals(); } };

  return (
    <div>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div><h1 className="text-2xl font-bold mb-1">Deals Manager</h1><p className="text-midnight-400">Manage all your eBay deals</p></div>
      </div>
      <div className="mb-6">
        <div className="relative max-w-md">
          <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-midnight-500" />
          <input type="text" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} placeholder="Search deals..." className="input-dark w-full pl-12" />
        </div>
      </div>
      <div className="glass rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="table-dark">
            <thead><tr><th>Product</th><th>Category</th><th>Price</th><th>Discount</th><th>Status</th><th className="text-right">Actions</th></tr></thead>
            <tbody>
              {loading ? [...Array(5)].map((_, i) => <tr key={i}><td colSpan="6"><div className="h-16 shimmer rounded" /></td></tr>) : deals.length === 0 ? <tr><td colSpan="6" className="text-center py-12 text-midnight-400">No deals found</td></tr> : deals.map(deal => (
                <tr key={deal.id}>
                  <td>
                    <div className="flex items-center gap-3">
                      <img src={deal.image_url || '/placeholder.jpg'} alt="" className="w-12 h-12 rounded-lg object-cover bg-midnight-800" />
                      <div className="max-w-xs"><p className="font-medium truncate">{deal.title}</p><p className="text-xs text-midnight-500">ID: {deal.ebay_item_id}</p></div>
                    </div>
                  </td>
                  <td><span className="text-sm text-midnight-300">{deal.category_name || 'Uncategorized'}</span></td>
                  <td><div><p className="text-gold-400 font-semibold">${deal.current_price}</p><p className="text-xs text-midnight-500 line-through">${deal.original_price}</p></div></td>
                  <td><span className="badge-discount">-{deal.discount_percent}%</span></td>
                  <td><span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium ${deal.is_active ? 'bg-green-500/20 text-green-400' : 'bg-midnight-700 text-midnight-400'}`}>{deal.is_active ? <Eye size={12} /> : <EyeOff size={12} />}{deal.is_active ? 'Active' : 'Hidden'}</span></td>
                  <td>
                    <div className="flex items-center justify-end gap-2">
                      <a href={deal.ebay_url} target="_blank" rel="noopener noreferrer" className="p-2 rounded-lg hover:bg-midnight-700 text-midnight-400 hover:text-white transition-colors"><ExternalLink size={16} /></a>
                      <button onClick={() => toggleActive(deal.id)} className="p-2 rounded-lg hover:bg-midnight-700 text-midnight-400 hover:text-white transition-colors">{deal.is_active ? <EyeOff size={16} /> : <Eye size={16} />}</button>
                      <button onClick={() => deleteDeal(deal.id)} className="p-2 rounded-lg hover:bg-red-500/20 text-midnight-400 hover:text-red-400 transition-colors"><Trash2 size={16} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {pagination && pagination.pages > 1 && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-midnight-700">
            <p className="text-sm text-midnight-400">Showing {(page - 1) * pagination.limit + 1} to {Math.min(page * pagination.limit, pagination.total)} of {pagination.total}</p>
            <div className="flex items-center gap-2">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="p-2 rounded-lg hover:bg-midnight-700 disabled:opacity-50 disabled:cursor-not-allowed"><ChevronLeft size={18} /></button>
              <span className="px-3">Page {page} of {pagination.pages}</span>
              <button onClick={() => setPage(p => Math.min(pagination.pages, p + 1))} disabled={page === pagination.pages} className="p-2 rounded-lg hover:bg-midnight-700 disabled:opacity-50 disabled:cursor-not-allowed"><ChevronRight size={18} /></button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}


