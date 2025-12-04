import { useState, useEffect } from 'react';
import { ChevronDown, ExternalLink, Tag, Search, Heart, ShoppingBag, Percent, TrendingDown, Filter, Grid, List, ChevronLeft, ChevronRight } from 'lucide-react';
import api from '../services/api';

function DealCard({ deal }) {
  const savings = deal.original_price - deal.current_price;
  
  return (
    <a
      href={deal.ebay_url}
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
        <div className="absolute top-2 right-2 bg-red-500 text-white px-2 py-1 rounded-lg text-sm font-bold shadow-lg">
          {deal.discount_percent}%−
        </div>
        {/* Wishlist Button */}
        <button 
          onClick={(e) => e.preventDefault()}
          className="absolute top-2 left-2 w-8 h-8 bg-white/90 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-md hover:bg-red-50"
        >
          <Heart size={16} className="text-gray-400 hover:text-red-500" />
        </button>
        {/* Category Tag */}
        {deal.category_name && (
          <div className="absolute bottom-2 right-2 bg-white/95 backdrop-blur-sm px-2 py-1 rounded text-xs font-medium text-gray-600 shadow">
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
            <span className="text-gray-400 text-sm line-through">₪{(deal.original_price * 3.7).toFixed(0)}</span>
            <span className="text-xs text-gray-400">|</span>
            <span className="text-gray-400 text-sm line-through">${deal.original_price?.toFixed(0)}</span>
          </div>
          <div className="flex items-center justify-between">
            <div className="text-2xl font-bold text-gray-900">${deal.current_price?.toFixed(0)}</div>
            <div className="flex items-center gap-1 text-green-600 text-sm font-medium bg-green-50 px-2 py-1 rounded">
              <TrendingDown size={14} />
              <span>חיסכון ${savings?.toFixed(0)}</span>
            </div>
          </div>
        </div>
        
        {/* CTA Button */}
        <button className="mt-3 w-full bg-gradient-to-r from-orange-500 to-red-500 text-white py-2.5 rounded-lg font-medium text-sm hover:from-orange-600 hover:to-red-600 transition-all flex items-center justify-center gap-2 shadow-md hover:shadow-lg">
          <ShoppingBag size={16} />
          לצפייה בדיל
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

  const filteredDeals = searchTerm 
    ? deals.filter(d => d.title.toLowerCase().includes(searchTerm.toLowerCase()))
    : deals;

  return (
    <div className="min-h-screen bg-gray-50" dir="rtl">
      {/* Top Bar */}
      <div className="bg-gray-900 text-white text-xs py-2">
        <div className="container mx-auto px-4 flex items-center justify-between">
          <span>🔥 דילים חמים מאיביי עם משלוח לישראל</span>
          <a href="/admin" className="hover:text-orange-400 transition-colors">כניסת מנהלים</a>
        </div>
      </div>

      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-50">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between py-4">
            {/* Logo */}
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-red-500 rounded-xl flex items-center justify-center shadow-lg">
                <Percent size={22} className="text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-800">דילים פרימיום</h1>
                <p className="text-xs text-gray-500">מותגי יוקרה במחירי רצפה</p>
              </div>
            </div>

            {/* Search Bar */}
            <div className="flex-1 max-w-xl mx-8">
              <div className="relative">
                <input
                  type="text"
                  placeholder="חיפוש דילים..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full px-4 py-3 pr-12 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all text-right"
                />
                <Search size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
              </div>
            </div>

            {/* Stats */}
            <div className="flex items-center gap-6 text-center">
              <div>
                <div className="text-2xl font-bold text-orange-500">{pagination?.total || '100'}+</div>
                <div className="text-xs text-gray-500">דילים פעילים</div>
              </div>
              <div className="w-px h-10 bg-gray-200" />
              <div>
                <div className="text-2xl font-bold text-green-500">50%</div>
                <div className="text-xs text-gray-500">הנחה מקסימלית</div>
              </div>
            </div>
          </div>

          {/* Categories Bar */}
          <div className="flex items-center gap-3 py-3 overflow-x-auto scrollbar-hide">
            <CategoryButton 
              category={{ name: 'הכל', icon: '🏷️' }} 
              active={!selectedCategory} 
              onClick={() => { setSelectedCategory(null); setPage(1); }}
              count={pagination?.total || 0}
            />
            {categories.map(cat => (
              <CategoryButton 
                key={cat.id} 
                category={cat} 
                active={selectedCategory === cat.id} 
                onClick={() => { setSelectedCategory(cat.id); setPage(1); }}
                count={cat.deal_count}
              />
            ))}
          </div>
        </div>
      </header>

      {/* Hero Banner */}
      <div className="bg-gradient-to-l from-orange-500 via-red-500 to-pink-500 text-white py-8">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-3xl font-bold mb-2">🎉 דילים בלעדיים ממותגי יוקרה</h2>
              <p className="text-white/90">שעונים, תיקים, תכשיטים ואקססוריז - הכל עד 50% הנחה!</p>
            </div>
            <div className="text-left">
              <div className="text-5xl font-bold">30-50%</div>
              <div className="text-white/80">הנחה על כל המוצרים</div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6">
        {/* Toolbar */}
        <div className="flex items-center justify-between mb-6 bg-white p-4 rounded-xl shadow-sm">
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Filter size={18} />
            <span>נמצאו <strong className="text-gray-900">{filteredDeals.length}</strong> דילים</span>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">מיון:</span>
              <select 
                value={sortBy} 
                onChange={(e) => { setSortBy(e.target.value); setPage(1); }}
                className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-100"
              >
                <option value="discount">אחוז הנחה</option>
                <option value="price_asc">מחיר: נמוך לגבוה</option>
                <option value="price_desc">מחיר: גבוה לנמוך</option>
                <option value="newest">חדש ביותר</option>
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
            <h3 className="text-xl font-semibold mb-2 text-gray-800">לא נמצאו דילים</h3>
            <p className="text-gray-500">נסה לשנות את החיפוש או הפילטרים</p>
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
                  <ChevronRight size={20} />
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
                  <ChevronLeft size={20} />
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
                <span className="font-bold">דילים פרימיום</span>
              </div>
              <p className="text-gray-400 text-sm leading-relaxed">
                אנחנו מביאים לכם את הדילים הטובים ביותר ממותגי יוקרה באיביי. 
                כל המוצרים נבדקו ומגיעים עם משלוח לישראל.
              </p>
            </div>
            
            {/* Quick Links */}
            <div>
              <h3 className="font-bold mb-4">קישורים מהירים</h3>
              <ul className="space-y-2 text-gray-400 text-sm">
                <li><a href="#" className="hover:text-white transition-colors">שעונים</a></li>
                <li><a href="#" className="hover:text-white transition-colors">תיקים</a></li>
                <li><a href="#" className="hover:text-white transition-colors">תכשיטים</a></li>
                <li><a href="#" className="hover:text-white transition-colors">משקפי שמש</a></li>
              </ul>
            </div>
            
            {/* Contact */}
            <div>
              <h3 className="font-bold mb-4">קטגוריות פופולריות</h3>
              <div className="flex flex-wrap gap-2">
                <span className="px-3 py-1 bg-gray-800 rounded-full text-sm text-gray-300">Rolex</span>
                <span className="px-3 py-1 bg-gray-800 rounded-full text-sm text-gray-300">Louis Vuitton</span>
                <span className="px-3 py-1 bg-gray-800 rounded-full text-sm text-gray-300">Gucci</span>
                <span className="px-3 py-1 bg-gray-800 rounded-full text-sm text-gray-300">Cartier</span>
              </div>
            </div>
          </div>
          
          <div className="border-t border-gray-800 mt-8 pt-6 flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-gray-500 text-sm">© {new Date().getFullYear()} דילים פרימיום. כל הזכויות שמורות.</p>
            <p className="text-gray-500 text-sm">אנחנו שותפים בתוכנית השותפים של eBay</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
