import { useState, useEffect, useRef } from 'react';
import { ChevronDown, ExternalLink, Tag, Search, Heart, ShoppingBag, Percent, TrendingDown, Filter, ChevronLeft, ChevronRight, Flame, Star } from 'lucide-react';
import api from '../services/api';

// Source icons for different providers
const SourceIcon = ({ source }) => {
  if (source === 'banggood') {
    return (
      <div className="w-6 h-6 rounded bg-orange-500 flex items-center justify-center text-white text-xs font-bold shadow" title="Banggood">
        B
      </div>
    );
  }
  // Default to eBay
  return (
    <div className="w-6 h-6 rounded bg-blue-600 flex items-center justify-center shadow" title="eBay">
      <svg viewBox="0 0 24 24" className="w-4 h-4 fill-white">
        <path d="M5.517 8.058c-1.793 0-2.98 1.016-2.98 2.73v.167c0 1.594 1.065 2.73 2.98 2.73 1.092 0 1.835-.32 2.312-.97l-.935-.779c-.337.392-.74.598-1.377.598-.934 0-1.497-.473-1.614-1.28h4.115v-.466c0-1.714-1.187-2.73-2.501-2.73zm-.09 1.151c.72 0 1.208.4 1.282 1.186H3.458c.107-.72.574-1.186 1.97-1.186zm13.09-1.151c-1.793 0-2.98 1.016-2.98 2.73v.167c0 1.594 1.065 2.73 2.98 2.73 1.092 0 1.835-.32 2.312-.97l-.935-.779c-.337.392-.74.598-1.377.598-.934 0-1.497-.473-1.614-1.28h4.115v-.466c0-1.714-1.187-2.73-2.501-2.73zm-.09 1.151c.72 0 1.208.4 1.282 1.186h-2.251c.107-.72.574-1.186 1.97-1.186zM8.67 5.233v4.825h-.033c-.28-.533-.86-.928-1.704-.928-1.472 0-2.358 1.122-2.358 2.73v.167c0 1.608.886 2.73 2.358 2.73.844 0 1.424-.395 1.704-.928h.033v.786h1.319V5.233H8.67zm-1.48 5.048c.747 0 1.245.506 1.245 1.579v.167c0 1.073-.498 1.579-1.246 1.579-.747 0-1.245-.506-1.245-1.58v-.166c0-1.073.498-1.58 1.245-1.58zm6.727-2.223l-1.77 5.55h-.033l-1.77-5.55h-1.397l2.432 7.07-.148.433c-.165.482-.436.647-.886.647-.181 0-.363-.017-.526-.05v1.15c.23.05.479.084.754.084.992 0 1.533-.44 1.934-1.654l2.808-7.68h-1.398z"/>
      </svg>
    </div>
  );
};

function DealCard({ deal }) {
  const savings = deal.original_price - deal.current_price;
  // Use tracking URL to log clicks
  const trackingUrl = `/api/track/click/${deal.id}`;
  
  return (
    <a
      href={trackingUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="group bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 border border-gray-100 flex flex-col"
    >
      {/* Image Container */}
      <div className="relative aspect-square overflow-hidden bg-gray-50">
        <img
          src={deal.image_url || '/placeholder.jpg'}
          alt={deal.title}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          loading="lazy"
        />
        {/* Discount Badge */}
        <div className="absolute top-2 left-2 bg-red-500 text-white px-2 py-1 rounded-lg text-sm font-bold shadow-lg">
          -{deal.discount_percent}%
        </div>
        {/* Source Icon */}
        <div className="absolute top-2 right-2">
          <SourceIcon source={deal.source} />
        </div>
        {/* Category Tag */}
        {deal.category_name && (
          <div className="absolute bottom-2 left-2 bg-white/95 backdrop-blur-sm px-2 py-1 rounded text-xs font-medium text-gray-600 shadow">
            {deal.category_icon} {deal.category_name}
          </div>
        )}
      </div>
      
      {/* Content */}
      <div className="p-4 flex flex-col flex-1">
        <h3 className="font-medium text-gray-800 text-sm line-clamp-2 mb-3 leading-relaxed group-hover:text-blue-600 transition-colors">
          {deal.title}
        </h3>
        
        {/* Prices */}
        <div className="mt-auto">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-gray-400 text-sm line-through">${deal.original_price?.toFixed(0)}</span>
          </div>
          <div className="flex items-center justify-between">
            <div className="text-2xl font-bold text-gray-900">${deal.current_price?.toFixed(0)}</div>
            <div className="flex items-center gap-1 text-green-600 text-sm font-medium bg-green-50 px-2 py-1 rounded">
              <TrendingDown size={14} />
              <span>Save ${savings?.toFixed(0)}</span>
            </div>
          </div>
        </div>
        
        {/* CTA Button */}
        <button className="mt-3 w-full bg-gradient-to-r from-orange-500 to-red-500 text-white py-2.5 rounded-lg font-medium text-sm hover:from-orange-600 hover:to-red-600 transition-all flex items-center justify-center gap-2 shadow-md hover:shadow-lg">
          <ShoppingBag size={16} />
          View Deal
        </button>
      </div>
    </a>
  );
}

function CategoryButton({ category, active, onClick, count }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all whitespace-nowrap ${
        active 
          ? 'bg-blue-600 text-white shadow-md' 
          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
      }`}
    >
      {category.icon && <span>{category.icon}</span>}
      <span>{category.name}</span>
      <span className={`text-xs ${active ? 'text-blue-100' : 'text-gray-400'}`}>({count})</span>
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
  const [searchTerm, setSearchTerm] = useState('');
  const [randomSeed, setRandomSeed] = useState(null);

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
      // Use seed for consistent random pagination
      if (sortBy === 'random' && randomSeed) {
        params.seed = randomSeed;
      }
      const data = await api.getPublicDeals(params);
      setDeals(data.deals);
      setPagination(data.pagination);
      // Store seed for pagination
      if (data.seed && !randomSeed) {
        setRandomSeed(data.seed);
      }
    } catch (error) {
      console.error('Failed to load deals:', error);
    } finally {
      setLoading(false);
    }
  };
  
  // Reset seed when changing sort or category
  const handleSortChange = (newSort) => {
    setSortBy(newSort);
    setPage(1);
    if (newSort === 'random') {
      setRandomSeed(null); // New random seed
    }
  };
  
  const handleCategoryChange = (catId) => {
    setSelectedCategory(catId);
    setPage(1);
    if (sortBy === 'random') {
      setRandomSeed(null); // New random seed
    }
  };

  const filteredDeals = searchTerm 
    ? deals.filter(d => d.title.toLowerCase().includes(searchTerm.toLowerCase()))
    : deals;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top Bar */}
      <div className="bg-gray-900 text-white text-xs py-2">
        <div className="container mx-auto px-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Flame size={14} className="text-orange-400" />
            <span>Hot deals from eBay with worldwide shipping</span>
          </div>
          <div className="flex items-center gap-4">
            <a href="/terms" className="hover:text-orange-400 transition-colors">Terms of Service</a>
            <a href="/contact" className="hover:text-orange-400 transition-colors">Contact</a>
          </div>
        </div>
      </div>

      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-50">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between py-4">
            {/* Logo */}
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 bg-gradient-to-br from-orange-500 to-red-500 rounded-xl flex items-center justify-center shadow-lg">
                <Percent size={24} className="text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-800">Premium Deals</h1>
                <p className="text-xs text-gray-500">Luxury brands at best prices</p>
              </div>
            </div>

            {/* Search Bar */}
            <div className="flex-1 max-w-xl mx-8 hidden md:block">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search deals..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full px-4 py-3 pl-12 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all"
                />
                <Search size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
              </div>
            </div>

            {/* Stats */}
            <div className="flex items-center gap-6 text-center">
              <div>
                <div className="text-2xl font-bold text-orange-500">{pagination?.total || '100'}+</div>
                <div className="text-xs text-gray-500">Active Deals</div>
              </div>
              <div className="w-px h-10 bg-gray-200 hidden md:block" />
              <div className="hidden md:block">
                <div className="text-2xl font-bold text-green-500">50%</div>
                <div className="text-xs text-gray-500">Max Discount</div>
              </div>
            </div>
          </div>

          {/* Mobile Search */}
          <div className="md:hidden pb-3">
            <div className="relative">
              <input
                type="text"
                placeholder="Search deals..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-4 py-3 pl-12 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all"
              />
              <Search size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
            </div>
          </div>

          {/* Categories Bar with Scroll Buttons */}
          <div className="relative py-3">
            {/* Left Scroll Button */}
            <button 
              onClick={() => {
                const container = document.getElementById('categories-scroll');
                container?.scrollBy({ left: -200, behavior: 'smooth' });
              }}
              className="absolute left-0 top-1/2 -translate-y-1/2 z-10 w-8 h-8 bg-white shadow-lg rounded-full flex items-center justify-center hover:bg-gray-50 border border-gray-200 hidden md:flex"
            >
              <ChevronLeft size={18} />
            </button>
            
            {/* Categories Container */}
            <div 
              id="categories-scroll"
              className="flex items-center gap-2 overflow-x-auto scrollbar-hide px-0 md:px-10"
              style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
            >
              <CategoryButton 
                category={{ name: 'All', icon: '🏷️' }} 
                active={!selectedCategory} 
                onClick={() => handleCategoryChange(null)}
                count={pagination?.total || 0}
              />
              {categories.map(cat => (
                <CategoryButton 
                  key={cat.id} 
                  category={cat} 
                  active={selectedCategory === cat.id} 
                  onClick={() => handleCategoryChange(cat.id)}
                  count={cat.deal_count}
                />
              ))}
            </div>
            
            {/* Right Scroll Button */}
            <button 
              onClick={() => {
                const container = document.getElementById('categories-scroll');
                container?.scrollBy({ left: 200, behavior: 'smooth' });
              }}
              className="absolute right-0 top-1/2 -translate-y-1/2 z-10 w-8 h-8 bg-white shadow-lg rounded-full flex items-center justify-center hover:bg-gray-50 border border-gray-200 hidden md:flex"
            >
              <ChevronRight size={18} />
            </button>
          </div>
        </div>
      </header>

      {/* Hero Banner */}
      <div className="bg-gradient-to-r from-orange-500 via-red-500 to-pink-500 text-white py-8">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Star className="text-yellow-300 fill-yellow-300" size={20} />
                <span className="text-white/90 text-sm font-medium">Exclusive Luxury Deals</span>
              </div>
              <h2 className="text-2xl md:text-3xl font-bold mb-2">Premium Brands, Unbeatable Prices</h2>
              <p className="text-white/90">Watches, handbags, jewelry & accessories - all up to 50% off!</p>
            </div>
            <div className="text-center md:text-right">
              <div className="text-4xl md:text-5xl font-bold">30-50%</div>
              <div className="text-white/80">OFF Everything</div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6">
        {/* Toolbar */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6 bg-white p-4 rounded-xl shadow-sm">
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Filter size={18} />
            <span>Found <strong className="text-gray-900">{filteredDeals.length}</strong> deals</span>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">Sort by:</span>
              <select
                value={sortBy}
                onChange={(e) => handleSortChange(e.target.value)}
                className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-100 bg-white"
              >
                <option value="discount">Highest Discount</option>
                <option value="price_asc">Price: Low to High</option>
                <option value="price_desc">Price: High to Low</option>
                <option value="newest">Newest First</option>
                <option value="random">Random</option>
              </select>
            </div>
          </div>
        </div>

        {/* Deals Grid */}
        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {[...Array(10)].map((_, i) => (
              <div key={i} className="bg-white rounded-xl overflow-hidden shadow-sm">
                <div className="aspect-square bg-gray-200 animate-pulse" />
                <div className="p-4 space-y-3">
                  <div className="h-4 bg-gray-200 rounded animate-pulse" />
                  <div className="h-6 bg-gray-200 rounded w-1/2 animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        ) : filteredDeals.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-xl">
            <div className="text-6xl mb-4">🔍</div>
            <h3 className="text-xl font-semibold mb-2 text-gray-800">No deals found</h3>
            <p className="text-gray-500">Try adjusting your search or filters</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {filteredDeals.map((deal) => <DealCard key={deal.id} deal={deal} />)}
            </div>
            
            {/* Pagination */}
            {pagination && pagination.pages > 1 && (
              <div className="flex justify-center items-center gap-2 mt-8">
                <button 
                  onClick={() => setPage(p => Math.max(1, p - 1))} 
                  disabled={page === 1}
                  className="w-10 h-10 rounded-lg border border-gray-200 flex items-center justify-center hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronLeft size={20} />
                </button>
                
                {[...Array(Math.min(7, pagination.pages))].map((_, i) => {
                  let pageNum;
                  if (pagination.pages <= 7) {
                    pageNum = i + 1;
                  } else if (page <= 4) {
                    pageNum = i + 1;
                  } else if (page >= pagination.pages - 3) {
                    pageNum = pagination.pages - 6 + i;
                  } else {
                    pageNum = page - 3 + i;
                  }
                  
                  return (
                    <button
                      key={i}
                      onClick={() => setPage(pageNum)}
                      className={`w-10 h-10 rounded-lg font-medium transition-all ${
                        page === pageNum 
                          ? 'bg-blue-600 text-white shadow-md' 
                          : 'border border-gray-200 text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
                
                <button 
                  onClick={() => setPage(p => Math.min(pagination.pages, p + 1))} 
                  disabled={page === pagination.pages}
                  className="w-10 h-10 rounded-lg border border-gray-200 flex items-center justify-center hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronRight size={20} />
                </button>
              </div>
            )}
          </>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-gray-900 text-white mt-12">
        <div className="container mx-auto px-4 py-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* About */}
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 bg-gradient-to-br from-orange-500 to-red-500 rounded-lg flex items-center justify-center">
                  <Percent size={16} className="text-white" />
                </div>
                <span className="font-bold">Premium Deals</span>
              </div>
              <p className="text-gray-400 text-sm leading-relaxed">
                We bring you the best deals on luxury brands from eBay. 
                All products are verified and ship worldwide.
              </p>
            </div>
            
            {/* Quick Links */}
            <div>
              <h3 className="font-bold mb-4">Links</h3>
              <ul className="space-y-2 text-gray-400 text-sm">
                <li><a href="/terms" className="hover:text-white transition-colors">Terms of Service</a></li>
                <li><a href="/contact" className="hover:text-white transition-colors">Contact Us</a></li>
                <li><a href="https://www.ebay.com" target="_blank" rel="noopener" className="hover:text-white transition-colors">Visit eBay</a></li>
              </ul>
            </div>
            
            {/* Popular Brands */}
            <div>
              <h3 className="font-bold mb-4">Popular Brands</h3>
              <div className="flex flex-wrap gap-2">
                <span className="px-3 py-1 bg-gray-800 rounded-full text-sm text-gray-300">Rolex</span>
                <span className="px-3 py-1 bg-gray-800 rounded-full text-sm text-gray-300">Louis Vuitton</span>
                <span className="px-3 py-1 bg-gray-800 rounded-full text-sm text-gray-300">Gucci</span>
                <span className="px-3 py-1 bg-gray-800 rounded-full text-sm text-gray-300">Cartier</span>
                <span className="px-3 py-1 bg-gray-800 rounded-full text-sm text-gray-300">Omega</span>
              </div>
            </div>
          </div>
          
          <div className="border-t border-gray-800 mt-8 pt-6 flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-gray-500 text-sm">© {new Date().getFullYear()} Premium Deals. All rights reserved.</p>
            <p className="text-gray-500 text-sm">Participant in the eBay Partner Network affiliate program</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
