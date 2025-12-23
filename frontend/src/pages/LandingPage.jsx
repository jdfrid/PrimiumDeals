import { useState, useEffect } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { ChevronRight, Tag, Clock, Shield, Truck, Star, TrendingDown, ShoppingBag } from 'lucide-react';
import api from '../services/api';

// Landing page configurations
const LANDING_PAGES = {
  'designer-sale': {
    title: 'Designer Sale 2024',
    subtitle: 'Up to 70% Off Luxury Brands',
    description: 'Discover exclusive deals on authentic designer items. Handbags, watches, jewelry, and accessories from top luxury brands at unbeatable prices.',
    keywords: ['luxury', 'designer', 'sale', 'discount'],
    heroImage: '/images/designer-sale-hero.jpg',
    categories: null, // All categories
    faq: [
      { q: 'Are these products authentic?', a: 'Yes, all products are sourced from verified sellers on eBay with authenticity guarantees.' },
      { q: 'How much can I save?', a: 'Discounts range from 20% to 70% off retail prices, with new deals added daily.' },
      { q: 'Is shipping worldwide?', a: 'Most sellers offer international shipping. Check individual listings for details.' },
      { q: 'How often are deals updated?', a: 'Our system automatically finds and updates deals multiple times per day.' }
    ]
  },
  'luxury-watches-sale': {
    title: 'Luxury Watches Sale',
    subtitle: 'Premium Timepieces Up to 60% Off',
    description: 'Shop luxury watches from renowned brands. Rolex, Omega, TAG Heuer, Cartier, and more at incredible discounts.',
    keywords: ['watches', 'luxury watches', 'timepieces', 'rolex', 'omega'],
    heroImage: '/images/watches-sale-hero.jpg',
    categories: ['Watches'],
    faq: [
      { q: 'Are the watches authentic?', a: 'All watches come from verified sellers with authenticity verification.' },
      { q: 'Do watches come with warranty?', a: 'Warranty varies by seller. Check individual listings for warranty information.' },
      { q: 'Can I find vintage watches?', a: 'Yes, we feature both new and pre-owned vintage timepieces.' }
    ]
  },
  'designer-bags-sale': {
    title: 'Designer Bags Sale',
    subtitle: 'Luxury Handbags Up to 70% Off',
    description: 'Find your dream designer handbag at a fraction of the price. Louis Vuitton, Gucci, Prada, Chanel, and more.',
    keywords: ['handbags', 'designer bags', 'luxury bags', 'purses'],
    heroImage: '/images/bags-sale-hero.jpg',
    categories: ['Handbags'],
    faq: [
      { q: 'How do I verify authenticity?', a: 'Many listings include certificates of authenticity. Sellers are verified by eBay.' },
      { q: 'Are there new bags available?', a: 'Yes, we feature both new with tags and pre-owned designer bags.' },
      { q: 'What brands are included?', a: 'Louis Vuitton, Gucci, Prada, Chanel, Hermès, Balenciaga, and many more.' }
    ]
  }
};

function DealCard({ deal }) {
  const savings = deal.original_price - deal.current_price;
  const trackingUrl = `/api/track/click/${deal.id}`;
  
  const handleClick = () => {
    if (typeof window.gtag === 'function') {
      window.gtag('event', 'click_out', {
        item_id: deal.id?.toString(),
        item_name: deal.title?.substring(0, 100),
        value: deal.current_price,
        currency: 'USD'
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
        <h3 className="font-medium text-gray-800 text-sm line-clamp-2 mb-2">{deal.title}</h3>
        <div className="flex items-center justify-between">
          <div>
            <span className="text-gray-400 text-sm line-through">${deal.original_price?.toFixed(0)}</span>
            <div className="text-xl font-bold text-gray-900">${deal.current_price?.toFixed(0)}</div>
          </div>
          <div className="text-green-600 text-sm font-medium bg-green-50 px-2 py-1 rounded">
            Save ${savings?.toFixed(0)}
          </div>
        </div>
      </div>
    </a>
  );
}

export default function LandingPage() {
  const location = useLocation();
  const slug = location.pathname.replace('/', '');
  const [deals, setDeals] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const config = LANDING_PAGES[slug] || LANDING_PAGES['designer-sale'];
  
  useEffect(() => {
    loadDeals();
    
    // Update page title and meta
    document.title = `${config.title} - ${config.subtitle} | Dealsluxy`;
    
    // GA4: Track landing page view
    if (typeof window.gtag === 'function') {
      window.gtag('event', 'page_view', {
        page_title: config.title,
        page_location: window.location.href,
        page_path: `/${slug}`
      });
    }
  }, [slug]);
  
  const loadDeals = async () => {
    setLoading(true);
    try {
      const params = { limit: 20, sort: 'discount' };
      const data = await api.getPublicDeals(params);
      setDeals(data.deals || []);
    } catch (error) {
      console.error('Failed to load deals:', error);
    } finally {
      setLoading(false);
    }
  };
  
  const lastUpdated = new Date().toLocaleDateString('en-US', { 
    year: 'numeric', month: 'long', day: 'numeric' 
  });
  
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-orange-500 via-red-500 to-pink-500 text-white py-16">
        <div className="max-w-7xl mx-auto px-4">
          <nav className="flex items-center gap-2 text-white/80 text-sm mb-6">
            <Link to="/" className="hover:text-white">Home</Link>
            <ChevronRight size={14} />
            <span className="text-white">{config.title}</span>
          </nav>
          <h1 className="text-4xl md:text-5xl font-bold mb-4">{config.title}</h1>
          <p className="text-xl md:text-2xl text-white/90 mb-6">{config.subtitle}</p>
          <p className="text-white/80 max-w-2xl">{config.description}</p>
          <div className="flex items-center gap-2 mt-6 text-sm text-white/70">
            <Clock size={14} />
            <span>Last updated: {lastUpdated}</span>
          </div>
        </div>
      </div>
      
      {/* Trust Badges */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                <Shield className="text-green-600" size={20} />
              </div>
              <div>
                <div className="font-medium text-gray-800">Verified Sellers</div>
                <div className="text-sm text-gray-500">Authenticity guaranteed</div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                <Truck className="text-blue-600" size={20} />
              </div>
              <div>
                <div className="font-medium text-gray-800">Worldwide Shipping</div>
                <div className="text-sm text-gray-500">International delivery</div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center">
                <Tag className="text-orange-600" size={20} />
              </div>
              <div>
                <div className="font-medium text-gray-800">Up to 70% Off</div>
                <div className="text-sm text-gray-500">Best prices daily</div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-yellow-100 rounded-full flex items-center justify-center">
                <Star className="text-yellow-600" size={20} />
              </div>
              <div>
                <div className="font-medium text-gray-800">Top Rated</div>
                <div className="text-sm text-gray-500">5-star sellers only</div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Deals Grid */}
      <div className="max-w-7xl mx-auto px-4 py-12">
        <h2 className="text-2xl font-bold text-gray-800 mb-6">Today's Best Deals</h2>
        
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
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {deals.map(deal => <DealCard key={deal.id} deal={deal} />)}
          </div>
        )}
        
        <div className="text-center mt-8">
          <Link 
            to="/"
            className="inline-flex items-center gap-2 bg-gradient-to-r from-orange-500 to-red-500 text-white px-8 py-3 rounded-full font-medium hover:from-orange-600 hover:to-red-600 transition-all shadow-lg"
          >
            <ShoppingBag size={20} />
            View All Deals
          </Link>
        </div>
      </div>
      
      {/* FAQ Section */}
      <div className="bg-white py-12">
        <div className="max-w-3xl mx-auto px-4">
          <h2 className="text-2xl font-bold text-gray-800 mb-8 text-center">Frequently Asked Questions</h2>
          <div className="space-y-4">
            {config.faq.map((item, index) => (
              <details key={index} className="group border border-gray-200 rounded-lg">
                <summary className="flex items-center justify-between p-4 cursor-pointer font-medium text-gray-800 hover:bg-gray-50">
                  {item.q}
                  <ChevronRight className="transform group-open:rotate-90 transition-transform" size={20} />
                </summary>
                <div className="px-4 pb-4 text-gray-600">
                  {item.a}
                </div>
              </details>
            ))}
          </div>
        </div>
      </div>
      
      {/* Schema.org FAQ */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
        "@context": "https://schema.org",
        "@type": "FAQPage",
        "mainEntity": config.faq.map(item => ({
          "@type": "Question",
          "name": item.q,
          "acceptedAnswer": {
            "@type": "Answer",
            "text": item.a
          }
        }))
      })}} />
    </div>
  );
}

