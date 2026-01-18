import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ChevronRight, Tag, Clock, Filter, TrendingDown, ShoppingBag, Grid, List } from 'lucide-react';
import api from '../services/api';
import NewsletterFooter from '../components/NewsletterFooter';

// Category configurations with SEO data
const CATEGORIES = {
  'watches': {
    name: 'Watches',
    title: 'Luxury Watches Sale',
    subtitle: 'Premium Timepieces Up to 60% Off',
    description: 'Discover incredible deals on luxury watches. Rolex, Omega, TAG Heuer, Cartier and more prestigious brands at unbeatable prices.',
    icon: '⌚',
    color: 'from-blue-600 to-blue-800',
    relatedBrands: ['rolex', 'omega', 'tag-heuer', 'cartier'],
    keywords: ['luxury watches', 'designer watches', 'rolex sale', 'omega deals']
  },
  'handbags': {
    name: 'Handbags',
    title: 'Designer Handbags Sale',
    subtitle: 'Luxury Bags Up to 70% Off',
    description: 'Shop authentic designer handbags at amazing prices. Louis Vuitton, Gucci, Prada, Chanel and more luxury brands.',
    icon: '👜',
    color: 'from-pink-600 to-rose-700',
    relatedBrands: ['louis-vuitton', 'gucci', 'prada', 'chanel', 'hermes'],
    keywords: ['designer bags', 'luxury handbags', 'gucci sale', 'lv bags']
  },
  'jewelry': {
    name: 'Jewelry',
    title: 'Fine Jewelry Sale',
    subtitle: 'Luxury Jewelry Up to 65% Off',
    description: 'Exquisite jewelry from top designers. Diamonds, gold, silver and precious gems at exceptional prices.',
    icon: '💎',
    color: 'from-purple-600 to-purple-800',
    relatedBrands: ['cartier', 'tiffany'],
    keywords: ['fine jewelry', 'diamond jewelry', 'gold jewelry', 'luxury jewelry']
  },
  'sunglasses': {
    name: 'Sunglasses',
    title: 'Designer Sunglasses Sale',
    subtitle: 'Premium Eyewear Up to 60% Off',
    description: 'Shop designer sunglasses from Ray-Ban, Gucci, Prada, Oakley and more top brands at discounted prices.',
    icon: '🕶️',
    color: 'from-amber-600 to-orange-700',
    relatedBrands: ['gucci', 'prada'],
    keywords: ['designer sunglasses', 'luxury eyewear', 'ray-ban sale']
  },
  'shoes': {
    name: 'Shoes',
    title: 'Designer Shoes Sale',
    subtitle: 'Luxury Footwear Up to 65% Off',
    description: 'Step into luxury with designer shoes. Louboutin, Jimmy Choo, Gucci and more at amazing prices.',
    icon: '👟',
    color: 'from-red-600 to-red-800',
    relatedBrands: ['gucci', 'balenciaga', 'prada'],
    keywords: ['designer shoes', 'luxury footwear', 'louboutin sale']
  },
  'accessories': {
    name: 'Accessories',
    title: 'Luxury Accessories Sale',
    subtitle: 'Designer Accessories Up to 70% Off',
    description: 'Complete your look with luxury accessories. Belts, wallets, scarves and more from top designers.',
    icon: '✨',
    color: 'from-teal-600 to-teal-800',
    relatedBrands: ['hermes', 'gucci', 'louis-vuitton'],
    keywords: ['luxury accessories', 'designer belts', 'silk scarves']
  },
  'fragrances': {
    name: 'Fragrances',
    title: 'Luxury Perfume Sale',
    subtitle: 'Designer Fragrances Up to 50% Off',
    description: 'Discover luxury perfumes and colognes. Chanel, Dior, Tom Ford and more premium fragrances.',
    icon: '🌸',
    color: 'from-violet-600 to-violet-800',
    relatedBrands: ['chanel'],
    keywords: ['luxury perfume', 'designer fragrance', 'chanel perfume']
  }
};

function DealCard({ deal }) {
  const savings = deal.original_price - deal.current_price;
  const trackingUrl = `/api/track/click/${deal.id}`;
  
  const handleClick = () => {
    if (typeof window.gtag === 'function') {
      window.gtag('event', 'select_item', {
        item_list_name: 'Category Page',
        items: [{
          item_id: deal.id?.toString(),
          item_name: deal.title?.substring(0, 100),
          item_category: deal.category_name,
          price: deal.current_price
        }]
      });
    }
  };
  
  return (
    <a
      href={trackingUrl}
      target="_blank"
      rel="noopener noreferrer"
      onClick={handleClick}
      className="group bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 border border-gray-100"
    >
      <div className="relative aspect-square overflow-hidden bg-gray-50">
        <img
          src={deal.image_url || '/placeholder.jpg'}
          alt={deal.title}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          loading="lazy"
        />
        <div className="absolute top-2 left-2 bg-red-500 text-white px-2 py-1 rounded-lg text-sm font-bold shadow-lg">
          -{deal.discount_percent}%
        </div>
      </div>
      <div className="p-4">
        <h3 className="font-medium text-gray-800 text-sm line-clamp-2 mb-2 group-hover:text-blue-600 transition-colors">{deal.title}</h3>
        <div className="flex items-center justify-between">
          <div>
            <span className="text-gray-400 text-sm line-through">${deal.original_price?.toFixed(0)}</span>
            <div className="text-xl font-bold text-gray-900">${deal.current_price?.toFixed(0)}</div>
          </div>
          <div className="flex items-center gap-1 text-green-600 text-sm font-medium bg-green-50 px-2 py-1 rounded">
            <TrendingDown size={14} />
            ${savings?.toFixed(0)}
          </div>
        </div>
      </div>
    </a>
  );
}

export default function CategoryPage() {
  const { categorySlug } = useParams();
  const [deals, setDeals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState('discount');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState(null);
  
  const category = CATEGORIES[categorySlug];
  
  useEffect(() => {
    if (category) {
      loadDeals();
      
      // Update page title
      document.title = `${category.title} - ${category.subtitle} | Dealsluxy`;
      
      // Update meta description
      const metaDesc = document.querySelector('meta[name="description"]');
      if (metaDesc) {
        metaDesc.setAttribute('content', category.description);
      }
      
      // GA4: Track category page view
      if (typeof window.gtag === 'function') {
        window.gtag('event', 'view_item_list', {
          item_list_name: category.name,
          item_list_id: categorySlug
        });
      }
    }
  }, [categorySlug, sortBy, page]);
  
  const loadDeals = async () => {
    setLoading(true);
    try {
      // Get category ID from API
      const categories = await api.getPublicCategories();
      const dbCategory = categories.find(c => 
        c.name.toLowerCase().replace(/\s+/g, '-') === categorySlug ||
        c.name.toLowerCase() === categorySlug.replace(/-/g, ' ')
      );
      
      const params = { 
        limit: 40, 
        sort: sortBy,
        page
      };
      
      if (dbCategory) {
        params.category = dbCategory.id;
      }
      
      const data = await api.getPublicDeals(params);
      setDeals(data.deals || []);
      setPagination(data.pagination);
    } catch (error) {
      console.error('Failed to load deals:', error);
    } finally {
      setLoading(false);
    }
  };
  
  if (!category) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-800 mb-4">Category Not Found</h1>
          <Link to="/" className="text-blue-600 hover:underline">Return to Home</Link>
        </div>
      </div>
    );
  }
  
  const lastUpdated = new Date().toLocaleDateString('en-US', { 
    year: 'numeric', month: 'long', day: 'numeric' 
  });
  
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section */}
      <div className={`bg-gradient-to-r ${category.color} text-white py-12`}>
        <div className="max-w-7xl mx-auto px-4">
          <nav className="flex items-center gap-2 text-white/80 text-sm mb-4">
            <Link to="/" className="hover:text-white">Home</Link>
            <ChevronRight size={14} />
            <span className="text-white">{category.name}</span>
          </nav>
          
          <div className="flex items-center gap-3 mb-3">
            <span className="text-4xl">{category.icon}</span>
            <div>
              <h1 className="text-3xl md:text-4xl font-bold">{category.title}</h1>
              <p className="text-white/80">{category.subtitle}</p>
            </div>
          </div>
          
          <p className="text-white/70 max-w-2xl mt-4">{category.description}</p>
          
          <div className="flex items-center gap-4 mt-4 text-sm text-white/60">
            <div className="flex items-center gap-1">
              <Clock size={14} />
              <span>Updated: {lastUpdated}</span>
            </div>
            <div className="flex items-center gap-1">
              <Tag size={14} />
              <span>{pagination?.total || deals.length} deals</span>
            </div>
          </div>
        </div>
      </div>
      
      {/* Filters Bar */}
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Filter size={16} className="text-gray-400" />
              <span className="text-sm text-gray-600">{pagination?.total || 0} results</span>
            </div>
            <select 
              value={sortBy}
              onChange={(e) => { setSortBy(e.target.value); setPage(1); }}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            >
              <option value="discount">Biggest Discount</option>
              <option value="price_asc">Price: Low to High</option>
              <option value="price_desc">Price: High to Low</option>
              <option value="newest">Newest First</option>
            </select>
          </div>
        </div>
      </div>
      
      {/* Related Brands */}
      {category.relatedBrands && category.relatedBrands.length > 0 && (
        <div className="max-w-7xl mx-auto px-4 py-6">
          <h2 className="text-sm font-medium text-gray-600 mb-3">Shop by Brand</h2>
          <div className="flex flex-wrap gap-2">
            {category.relatedBrands.map(brandSlug => (
              <Link 
                key={brandSlug}
                to={`/brand/${brandSlug}`}
                className="px-4 py-2 bg-white border border-gray-200 rounded-full text-sm text-gray-700 hover:border-blue-500 hover:text-blue-600 transition-colors"
              >
                {brandSlug.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
              </Link>
            ))}
          </div>
        </div>
      )}
      
      {/* Deals Grid */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {[...Array(10)].map((_, i) => (
              <div key={i} className="bg-white rounded-xl p-4 animate-pulse">
                <div className="aspect-square bg-gray-200 rounded-lg mb-4"></div>
                <div className="h-4 bg-gray-200 rounded mb-2"></div>
                <div className="h-4 bg-gray-200 rounded w-2/3"></div>
              </div>
            ))}
          </div>
        ) : deals.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-xl">
            <div className="text-6xl mb-4">{category.icon}</div>
            <h3 className="text-xl font-semibold mb-2 text-gray-800">No {category.name} deals found</h3>
            <p className="text-gray-500 mb-4">Check back soon for new deals!</p>
            <Link 
              to="/"
              className="inline-flex items-center gap-2 bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
            >
              Browse All Deals
            </Link>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {deals.map(deal => <DealCard key={deal.id} deal={deal} />)}
            </div>
            
            {/* Pagination */}
            {pagination && pagination.pages > 1 && (
              <div className="flex justify-center items-center gap-2 mt-8">
                <button 
                  onClick={() => setPage(p => Math.max(1, p - 1))} 
                  disabled={page === 1}
                  className="px-4 py-2 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-50"
                >
                  Previous
                </button>
                <span className="px-4 py-2 text-gray-600">
                  Page {page} of {pagination.pages}
                </span>
                <button 
                  onClick={() => setPage(p => Math.min(pagination.pages, p + 1))} 
                  disabled={page === pagination.pages}
                  className="px-4 py-2 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            )}
          </>
        )}
      </div>
      
      {/* SEO Content */}
      <div className="bg-white py-12 mt-8">
        <div className="max-w-3xl mx-auto px-4">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">About {category.name}</h2>
          <p className="text-gray-600 mb-6">{category.description}</p>
          
          <h3 className="font-semibold text-gray-800 mb-3">Popular Searches:</h3>
          <div className="flex flex-wrap gap-2 mb-8">
            {category.keywords.map((keyword, i) => (
              <span key={i} className="bg-gray-100 text-gray-700 px-3 py-1 rounded-full text-sm">
                {keyword}
              </span>
            ))}
          </div>
          
          <Link 
            to="/"
            className="inline-flex items-center gap-2 bg-gradient-to-r from-orange-500 to-red-500 text-white px-6 py-3 rounded-full font-medium hover:from-orange-600 hover:to-red-600"
          >
            <ShoppingBag size={18} />
            View All Deals
          </Link>
        </div>
      </div>
      
      {/* Newsletter */}
      <NewsletterFooter />
      
      {/* Schema.org */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
        "@context": "https://schema.org",
        "@type": "CollectionPage",
        "name": category.title,
        "description": category.description,
        "url": `https://dealsluxy.com/category/${categorySlug}`,
        "breadcrumb": {
          "@type": "BreadcrumbList",
          "itemListElement": [
            { "@type": "ListItem", "position": 1, "name": "Home", "item": "https://dealsluxy.com" },
            { "@type": "ListItem", "position": 2, "name": category.name, "item": `https://dealsluxy.com/category/${categorySlug}` }
          ]
        }
      })}} />
    </div>
  );
}

export { CATEGORIES };



