import { useState, useEffect } from 'react';
import { ChevronDown, ExternalLink, Tag, Sparkles, Diamond, Star, TrendingUp, Shield, Zap } from 'lucide-react';
import api from '../services/api';

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
          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
          loading="lazy"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
        <div className="absolute top-3 left-3 discount-badge flex items-center gap-1.5">
          <Zap size={14} className="animate-pulse" />
          <span className="font-bold">-{deal.discount_percent}%</span>
        </div>
        {deal.category_name && (
          <div className="absolute top-3 right-3 bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-full text-xs font-medium border border-white/10">
            {deal.category_icon} {deal.category_name}
          </div>
        )}
        <div className="absolute bottom-4 left-4 right-4 opacity-0 group-hover:opacity-100 transition-all duration-500 transform translate-y-4 group-hover:translate-y-0">
          <div className="flex items-center justify-between">
            <span className="text-sm text-white/80">View on eBay</span>
            <div className="w-10 h-10 bg-gradient-to-r from-amber-500 to-orange-500 rounded-full flex items-center justify-center shadow-lg shadow-amber-500/30">
              <ExternalLink size={18} className="text-black" />
            </div>
          </div>
        </div>
      </div>
      <div className="p-5">
        <h3 className="font-semibold text-sm line-clamp-2 mb-3 group-hover:text-amber-400 transition-colors leading-relaxed">
          {deal.title}
        </h3>
        <div className="flex items-end justify-between">
          <div>
            <span className="text-gray-500 text-sm line-through">${deal.original_price?.toFixed(0)}</span>
            <div className="text-2xl font-bold bg-gradient-to-r from-amber-400 to-orange-400 bg-clip-text text-transparent">
              ${deal.current_price?.toFixed(0)}
            </div>
          </div>
          <div className="flex items-center gap-1 text-xs text-emerald-400">
            <TrendingUp size={14} />
            <span>Save ${(deal.original_price - deal.current_price)?.toFixed(0)}</span>
          </div>
        </div>
      </div>
    </a>
  );
}

function CategoryPill({ category, active, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`px-5 py-2.5 rounded-full text-sm font-medium transition-all duration-300 whitespace-nowrap border ${
        active 
          ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-black border-transparent shadow-lg shadow-amber-500/25' 
          : 'bg-white/5 hover:bg-white/10 text-gray-300 border-white/10 hover:border-amber-500/50'
      }`}
    >
      {category.icon && <span className="mr-2">{category.icon}</span>}
      {category.name}
      <span className={`ml-2 ${active ? 'text-black/60' : 'text-gray-500'}`}>({category.deal_count})</span>
    </button>
  );
}

function FeatureCard({ icon: Icon, title, description }) {
  return (
    <div className="text-center p-6">
      <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-amber-500/20 to-orange-500/20 flex items-center justify-center border border-amber-500/30">
        <Icon size={24} className="text-amber-400" />
      </div>
      <h3 className="font-semibold mb-2">{title}</h3>
      <p className="text-gray-400 text-sm">{description}</p>
    </div>
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

  useEffect(() => {
    loadCategories();
    loadDeals();
  }, [selectedCategory, sortBy, page]);

  const loadCategories = async () => {
    try {
      const data = await api.getPublicCategories();
      setCategories(data);
    } catch (error) {
      console.error('Failed to load categories:', error);
    }
  };

  const loadDeals = async () => {
    setLoading(true);
    try {
      const params = { page, sort: sortBy };
      if (selectedCategory) params.category = selectedCategory;
      const data = await api.getPublicDeals(params);
      setDeals(data.deals);
      setPagination(data.pagination);
    } catch (error) {
      console.error('Failed to load deals:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0f]">
      {/* Animated Background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-amber-500/10 rounded-full blur-[150px] animate-float" />
        <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-orange-500/10 rounded-full blur-[120px] animate-float-delayed" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-purple-500/5 rounded-full blur-[200px]" />
      </div>

      {/* Header */}
      <header className="relative">
        <nav className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            {/* Logo */}
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-400 via-orange-500 to-red-500 flex items-center justify-center shadow-lg shadow-amber-500/30">
                  <Diamond size={24} className="text-white" />
                </div>
                <div className="absolute -top-1 -right-1 w-4 h-4 bg-emerald-400 rounded-full flex items-center justify-center">
                  <Star size={10} className="text-black fill-current" />
                </div>
              </div>
              <div>
                <h1 className="text-xl font-bold tracking-tight">
                  <span className="bg-gradient-to-r from-amber-400 via-orange-400 to-red-400 bg-clip-text text-transparent">LUXE</span>
                  <span className="text-white">FINDS</span>
                </h1>
                <p className="text-[10px] text-gray-500 tracking-[0.2em] uppercase">Premium eBay Deals</p>
              </div>
            </div>
            <a href="/admin" className="text-gray-500 hover:text-amber-400 text-sm transition-colors">Admin</a>
          </div>
        </nav>

        {/* Hero */}
        <div className="container mx-auto px-4 pt-8 pb-16 md:pt-16 md:pb-24">
          <div className="text-center max-w-4xl mx-auto">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/20 text-sm mb-8 animate-fade-in">
              <Sparkles size={16} className="text-amber-400" />
              <span className="text-amber-200">Exclusive luxury deals updated daily</span>
            </div>
            
            <h2 className="text-4xl md:text-6xl lg:text-7xl font-bold mb-6 leading-tight animate-slide-up">
              <span className="text-white">Discover </span>
              <span className="bg-gradient-to-r from-amber-400 via-orange-400 to-red-400 bg-clip-text text-transparent">Luxury</span>
              <br />
              <span className="text-white">For Less</span>
            </h2>
            
            <p className="text-gray-400 text-lg md:text-xl max-w-2xl mx-auto mb-12 animate-slide-up leading-relaxed" style={{ animationDelay: '0.1s' }}>
              Handpicked premium watches, designer handbags, fine jewelry & exclusive accessories — 
              <span className="text-amber-400 font-semibold"> all 30-50% off</span>
            </p>

            {/* Stats */}
            <div className="flex flex-wrap items-center justify-center gap-6 md:gap-12 animate-slide-up" style={{ animationDelay: '0.2s' }}>
              <div className="text-center">
                <div className="text-3xl md:text-5xl font-bold bg-gradient-to-r from-amber-400 to-orange-400 bg-clip-text text-transparent">
                  {pagination?.total || '100'}+
                </div>
                <div className="text-gray-500 text-sm mt-1">Active Deals</div>
              </div>
              <div className="hidden md:block w-px h-16 bg-gradient-to-b from-transparent via-gray-700 to-transparent" />
              <div className="text-center">
                <div className="text-3xl md:text-5xl font-bold bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent">
                  30-50%
                </div>
                <div className="text-gray-500 text-sm mt-1">Savings</div>
              </div>
              <div className="hidden md:block w-px h-16 bg-gradient-to-b from-transparent via-gray-700 to-transparent" />
              <div className="text-center">
                <div className="text-3xl md:text-5xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                  {categories.length}
                </div>
                <div className="text-gray-500 text-sm mt-1">Categories</div>
              </div>
            </div>
          </div>
        </div>

        {/* Features */}
        <div className="container mx-auto px-4 pb-12">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto">
            <FeatureCard icon={Diamond} title="Authentic" description="100% genuine items" />
            <FeatureCard icon={Shield} title="Verified" description="Trusted sellers only" />
            <FeatureCard icon={Zap} title="Daily Updates" description="Fresh deals every day" />
            <FeatureCard icon={TrendingUp} title="Best Prices" description="Price tracked & verified" />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative container mx-auto px-4 py-8 md:py-12">
        {/* Filters */}
        <div className="flex flex-col md:flex-row gap-4 mb-8">
          <div className="flex-1 overflow-x-auto pb-2 scrollbar-hide">
            <div className="flex gap-3">
              <CategoryPill 
                category={{ name: 'All Deals', deal_count: pagination?.total || 0 }} 
                active={!selectedCategory} 
                onClick={() => { setSelectedCategory(null); setPage(1); }} 
              />
              {categories.map(cat => (
                <CategoryPill 
                  key={cat.id} 
                  category={cat} 
                  active={selectedCategory === cat.id} 
                  onClick={() => { setSelectedCategory(cat.id); setPage(1); }} 
                />
              ))}
            </div>
          </div>
          <div className="relative">
            <select 
              value={sortBy} 
              onChange={(e) => { setSortBy(e.target.value); setPage(1); }} 
              className="w-full md:w-auto bg-white/5 border border-white/10 text-white px-4 py-2.5 pr-10 rounded-xl appearance-none cursor-pointer hover:border-amber-500/50 transition-colors focus:outline-none focus:border-amber-500"
            >
              <option value="discount">Highest Discount</option>
              <option value="price_asc">Price: Low to High</option>
              <option value="price_desc">Price: High to Low</option>
              <option value="newest">Newest First</option>
            </select>
            <ChevronDown size={18} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
          </div>
        </div>

        {/* Deals Grid */}
        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-6">
            {[...Array(10)].map((_, i) => (
              <div key={i} className="glass rounded-2xl overflow-hidden">
                <div className="aspect-square shimmer" />
                <div className="p-5 space-y-3">
                  <div className="h-4 shimmer rounded w-3/4" />
                  <div className="h-6 shimmer rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : deals.length === 0 ? (
          <div className="text-center py-20">
            <div className="text-6xl mb-4">💎</div>
            <h3 className="text-xl font-semibold mb-2">No deals found</h3>
            <p className="text-gray-500">Try adjusting your filters or check back later for new luxury finds.</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-6">
              {deals.map((deal, index) => <DealCard key={deal.id} deal={deal} index={index} />)}
            </div>
            {pagination && pagination.pages > 1 && (
              <div className="flex justify-center items-center gap-4 mt-12">
                <button 
                  onClick={() => setPage(p => Math.max(1, p - 1))} 
                  disabled={page === 1} 
                  className="px-6 py-2.5 rounded-xl border border-white/10 text-gray-300 hover:bg-white/5 hover:border-amber-500/50 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                <div className="flex items-center gap-2">
                  {[...Array(Math.min(5, pagination.pages))].map((_, i) => {
                    const pageNum = i + 1;
                    return (
                      <button
                        key={i}
                        onClick={() => setPage(pageNum)}
                        className={`w-10 h-10 rounded-xl font-medium transition-all ${
                          page === pageNum 
                            ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-black' 
                            : 'text-gray-400 hover:bg-white/5'
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                </div>
                <button 
                  onClick={() => setPage(p => Math.min(pagination.pages, p + 1))} 
                  disabled={page === pagination.pages} 
                  className="px-6 py-2.5 rounded-xl border border-white/10 text-gray-300 hover:bg-white/5 hover:border-amber-500/50 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            )}
          </>
        )}
      </main>

      {/* Footer */}
      <footer className="relative border-t border-white/5 mt-16">
        <div className="container mx-auto px-4 py-12">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center">
                <Diamond size={18} className="text-white" />
              </div>
              <div>
                <span className="font-bold bg-gradient-to-r from-amber-400 to-orange-400 bg-clip-text text-transparent">LUXE</span>
                <span className="text-white font-bold">FINDS</span>
              </div>
            </div>
            <p className="text-gray-600 text-sm text-center">
              Participant in the eBay Partner Network affiliate program. All deals are verified and updated daily.
            </p>
            <p className="text-gray-600 text-sm">© {new Date().getFullYear()} LuxeFinds</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
