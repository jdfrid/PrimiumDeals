import { useState, useEffect } from 'react';
import { ChevronDown, ExternalLink, Tag, Sparkles, Crown } from 'lucide-react';
import api from '../services/api';
import NewsletterPopup from '../components/NewsletterPopup';

function DealCard({ deal, index }) {
  return (
    <a
      href={deal.ebay_url}
      target="_blank"
      rel="noopener noreferrer"
      className="group card-hover glass rounded-2xl overflow-hidden animate-slide-up"
      style={{ animationDelay: `${index * 0.05}s`, animationFillMode: 'both' }}
    >
      <div className="relative aspect-square overflow-hidden bg-midnight-900">
        <img
          src={deal.image_url || '/placeholder.jpg'}
          alt={deal.title}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
          loading="lazy"
        />
        <div className="absolute top-3 left-3 badge-discount flex items-center gap-1">
          <Tag size={14} />
          <span>-{deal.discount_percent}%</span>
        </div>
        {deal.category_icon && (
          <div className="absolute top-3 right-3 bg-midnight-950/80 backdrop-blur-sm px-3 py-1 rounded-full text-sm">
            {deal.category_icon} {deal.category_name}
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-midnight-950 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        <div className="absolute bottom-4 right-4 opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-y-2 group-hover:translate-y-0">
          <div className="bg-gold-500 text-midnight-950 p-2 rounded-full">
            <ExternalLink size={18} />
          </div>
        </div>
      </div>
      <div className="p-4">
        <h3 className="font-medium text-sm line-clamp-2 mb-3 group-hover:text-gold-400 transition-colors">
          {deal.title}
        </h3>
        <div className="flex items-end justify-between">
          <div>
            <span className="text-midnight-400 text-sm line-through">${deal.original_price?.toFixed(2)}</span>
            <div className="text-2xl font-bold text-gradient">${deal.current_price?.toFixed(2)}</div>
          </div>
          <div className="text-xs text-midnight-400 uppercase tracking-wider">{deal.condition}</div>
        </div>
      </div>
    </a>
  );
}

function CategoryPill({ category, active, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`px-5 py-2.5 rounded-full text-sm font-medium transition-all duration-300 whitespace-nowrap ${
        active ? 'bg-gradient-to-r from-gold-600 to-gold-500 text-midnight-950' : 'glass hover:bg-midnight-800/50 text-midnight-200'
      }`}
    >
      {category.icon && <span className="mr-2">{category.icon}</span>}
      {category.name}
      <span className="ml-2 opacity-70">({category.deal_count})</span>
    </button>
  );
}

export default function HomePage() {
  const [deals, setDeals] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [sortBy, setSortBy] = useState('discount');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState(null);

  // Load categories only once on mount
  useEffect(() => {
    const loadCategories = async () => {
      try {
        const data = await api.getPublicCategories();
        setCategories(data);
      } catch (error) {
        console.error('Failed to load categories:', error);
      }
    };
    loadCategories();
  }, []);

  // Load deals with race condition protection
  useEffect(() => {
    let isCancelled = false;
    
    const loadDeals = async () => {
      setLoading(true);
      try {
        const params = { page, sort: sortBy };
        if (selectedCategory) params.category = selectedCategory;
        const data = await api.getPublicDeals(params);
        
        // Only update state if this request wasn't cancelled
        if (!isCancelled) {
          setDeals(data.deals);
          setPagination(data.pagination);
        }
      } catch (error) {
        if (!isCancelled) {
          console.error('Failed to load deals:', error);
        }
      } finally {
        if (!isCancelled) {
          setLoading(false);
        }
      }
    };
    
    loadDeals();
    
    // Cleanup function - cancels outdated requests
    return () => {
      isCancelled = true;
    };
  }, [selectedCategory, sortBy, page]);

  return (
    <div className="min-h-screen">
      <NewsletterPopup />
      <header className="relative overflow-hidden">
        <div className="absolute inset-0 opacity-30">
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-gold-500/20 rounded-full blur-[100px]" />
          <div className="absolute bottom-0 right-1/4 w-80 h-80 bg-gold-600/10 rounded-full blur-[80px]" />
        </div>
        <div className="relative container mx-auto px-4 py-8 md:py-16">
          <nav className="flex items-center justify-between mb-12 md:mb-20">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-gold-400 to-gold-600 flex items-center justify-center">
                <Crown size={20} className="text-midnight-950" />
              </div>
              <span className="font-display text-2xl font-semibold">
                <span className="text-gradient">Premium</span> Deals
              </span>
            </div>
            <a href="/admin" className="text-midnight-400 hover:text-gold-400 text-sm transition-colors">Admin</a>
          </nav>
          <div className="text-center max-w-4xl mx-auto">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass text-sm mb-6 animate-fade-in">
              <Sparkles size={16} className="text-gold-400" />
              <span>Luxury items at unbeatable prices</span>
            </div>
            <h1 className="font-display text-4xl md:text-6xl lg:text-7xl font-bold mb-6 animate-slide-up">
              Discover Premium<br /><span className="text-gradient">eBay Deals</span>
            </h1>
            <p className="text-midnight-300 text-lg md:text-xl max-w-2xl mx-auto mb-10 animate-slide-up" style={{ animationDelay: '0.1s' }}>
              Curated luxury watches, designer bags, fine jewelry, and exclusive accessories — all with at least <span className="text-gold-400 font-semibold">30% off</span>
            </p>
            <div className="flex items-center justify-center gap-8 md:gap-16 animate-slide-up" style={{ animationDelay: '0.2s' }}>
              <div><div className="text-3xl md:text-4xl font-bold text-gradient">{pagination?.total || '...'}</div><div className="text-midnight-400 text-sm">Active Deals</div></div>
              <div className="w-px h-12 bg-midnight-700" />
              <div><div className="text-3xl md:text-4xl font-bold text-gradient">30%+</div><div className="text-midnight-400 text-sm">Min Discount</div></div>
              <div className="w-px h-12 bg-midnight-700" />
              <div><div className="text-3xl md:text-4xl font-bold text-gradient">{categories.length}</div><div className="text-midnight-400 text-sm">Categories</div></div>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 md:py-12">
        <div className="flex flex-col md:flex-row gap-4 mb-8">
          <div className="flex-1 overflow-x-auto pb-2">
            <div className="flex gap-3">
              <CategoryPill category={{ name: 'All', deal_count: pagination?.total || 0 }} active={!selectedCategory} onClick={() => { setSelectedCategory(null); setPage(1); }} />
              {categories.map(cat => (
                <CategoryPill key={cat.id} category={cat} active={selectedCategory === cat.id} onClick={() => { setSelectedCategory(cat.id); setPage(1); }} />
              ))}
            </div>
          </div>
          <div className="relative">
            <select value={sortBy} onChange={(e) => { setSortBy(e.target.value); setPage(1); }} className="input-dark pr-10 appearance-none cursor-pointer min-w-[160px]">
              <option value="discount">Highest Discount</option>
              <option value="price_asc">Price: Low to High</option>
              <option value="price_desc">Price: High to Low</option>
              <option value="newest">Newest First</option>
            </select>
            <ChevronDown size={18} className="absolute right-3 top-1/2 -translate-y-1/2 text-midnight-400 pointer-events-none" />
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-6">
            {[...Array(10)].map((_, i) => (
              <div key={i} className="glass rounded-2xl overflow-hidden">
                <div className="aspect-square shimmer" />
                <div className="p-4 space-y-3"><div className="h-4 shimmer rounded w-3/4" /><div className="h-6 shimmer rounded w-1/2" /></div>
              </div>
            ))}
          </div>
        ) : deals.length === 0 ? (
          <div className="text-center py-20">
            <div className="text-6xl mb-4">🔍</div>
            <h3 className="text-xl font-semibold mb-2">No deals found</h3>
            <p className="text-midnight-400">Try adjusting your filters or check back later.</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-6">
              {deals.map((deal, index) => <DealCard key={deal.id} deal={deal} index={index} />)}
            </div>
            {pagination && pagination.pages > 1 && (
              <div className="flex justify-center items-center gap-3 mt-12">
                <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="btn-outline disabled:opacity-50 disabled:cursor-not-allowed">Previous</button>
                <span className="text-midnight-400">Page {page} of {pagination.pages}</span>
                <button onClick={() => setPage(p => Math.min(pagination.pages, p + 1))} disabled={page === pagination.pages} className="btn-outline disabled:opacity-50 disabled:cursor-not-allowed">Next</button>
              </div>
            )}
          </>
        )}
      </main>

      <footer className="border-t border-midnight-800 mt-16">
        <div className="container mx-auto px-4 py-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2 text-midnight-400">
              <Crown size={18} className="text-gold-500" />
              <span>Premium Deals © {new Date().getFullYear()}</span>
            </div>
            <p className="text-midnight-500 text-sm text-center">We are a participant in the eBay Partner Network, an affiliate program.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}


