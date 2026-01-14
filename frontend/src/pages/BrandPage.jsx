import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ChevronRight, Tag, Clock, Shield, Star, TrendingDown, ShoppingBag, Search, Filter } from 'lucide-react';
import api from '../services/api';

// Brand configurations with SEO data
const BRANDS = {
  'rolex': {
    name: 'Rolex',
    logo: '⌚',
    description: 'Discover authentic Rolex watches at incredible prices. Submariner, Datejust, Day-Date, and more luxury timepieces.',
    longDescription: 'Rolex is the world\'s most recognized luxury watch brand. Founded in 1905, Rolex has set the standard for precision, durability, and prestige. Shop pre-owned and new Rolex watches at significant discounts.',
    keywords: ['rolex', 'rolex watch', 'submariner', 'datejust', 'day-date', 'oyster perpetual'],
    category: 'Watches',
    color: 'from-green-600 to-green-800'
  },
  'louis-vuitton': {
    name: 'Louis Vuitton',
    logo: '👜',
    description: 'Shop Louis Vuitton handbags, wallets, and accessories. Authentic LV items at up to 60% off retail prices.',
    longDescription: 'Louis Vuitton, founded in 1854, is synonymous with luxury travel and fashion. The iconic LV monogram is recognized worldwide. Find authentic Louis Vuitton bags and accessories at amazing prices.',
    keywords: ['louis vuitton', 'lv bag', 'lv wallet', 'neverfull', 'speedy', 'keepall'],
    category: 'Handbags',
    color: 'from-amber-700 to-amber-900'
  },
  'gucci': {
    name: 'Gucci',
    logo: '✨',
    description: 'Gucci sale - designer handbags, shoes, and accessories. Up to 70% off authentic Gucci items.',
    longDescription: 'Gucci is an Italian luxury fashion house known for its bold designs and the iconic GG logo. From the Dionysus to the Marmont, find your perfect Gucci piece at a fraction of retail.',
    keywords: ['gucci', 'gucci bag', 'gucci belt', 'dionysus', 'marmont', 'gg supreme'],
    category: 'Handbags',
    color: 'from-red-600 to-green-700'
  },
  'omega': {
    name: 'Omega',
    logo: '⌚',
    description: 'Omega watches on sale. Speedmaster, Seamaster, Constellation, and De Ville at discounted prices.',
    longDescription: 'Omega has been crafting exceptional timepieces since 1848. Famous for being the first watch on the moon, Omega combines Swiss precision with innovative design.',
    keywords: ['omega', 'omega watch', 'speedmaster', 'seamaster', 'constellation', 'moonwatch'],
    category: 'Watches',
    color: 'from-blue-700 to-blue-900'
  },
  'prada': {
    name: 'Prada',
    logo: '👜',
    description: 'Prada handbags and accessories sale. Authentic Prada items at up to 65% off.',
    longDescription: 'Prada, founded in Milan in 1913, represents Italian luxury at its finest. Known for minimalist elegance and the signature triangle logo, Prada remains a fashion icon.',
    keywords: ['prada', 'prada bag', 'prada wallet', 'saffiano', 'galleria', 'cahier'],
    category: 'Handbags',
    color: 'from-gray-800 to-black'
  },
  'chanel': {
    name: 'Chanel',
    logo: '👜',
    description: 'Chanel handbags and accessories. Classic Flap, Boy Bag, and more at discounted prices.',
    longDescription: 'Chanel, founded by Coco Chanel, is the epitome of Parisian elegance. The interlocking CC logo and quilted designs are instantly recognizable symbols of luxury.',
    keywords: ['chanel', 'chanel bag', 'classic flap', 'boy bag', '2.55', 'chanel wallet'],
    category: 'Handbags',
    color: 'from-black to-gray-800'
  },
  'cartier': {
    name: 'Cartier',
    logo: '💎',
    description: 'Cartier jewelry and watches on sale. Love bracelet, Tank watch, and more luxury items.',
    longDescription: 'Cartier, "The King of Jewelers, Jeweler to Kings," has been creating exceptional pieces since 1847. From the iconic Love bracelet to the timeless Tank watch.',
    keywords: ['cartier', 'cartier watch', 'love bracelet', 'tank watch', 'cartier ring', 'juste un clou'],
    category: 'Jewelry',
    color: 'from-red-700 to-red-900'
  },
  'hermes': {
    name: 'Hermès',
    logo: '🧣',
    description: 'Hermès sale - Birkin, Kelly, scarves, and accessories at exceptional prices.',
    longDescription: 'Hermès Paris, founded in 1837, represents the pinnacle of French craftsmanship. The Birkin and Kelly bags are among the most coveted luxury items in the world.',
    keywords: ['hermes', 'birkin', 'kelly bag', 'hermes scarf', 'hermes belt', 'constance'],
    category: 'Handbags',
    color: 'from-orange-500 to-orange-700'
  },
  'tag-heuer': {
    name: 'TAG Heuer',
    logo: '⌚',
    description: 'TAG Heuer watches on sale. Carrera, Monaco, Aquaracer at discounted prices.',
    longDescription: 'TAG Heuer has been at the forefront of Swiss watchmaking since 1860. Known for precision chronographs and motorsport heritage.',
    keywords: ['tag heuer', 'carrera', 'monaco', 'aquaracer', 'formula 1', 'tag watch'],
    category: 'Watches',
    color: 'from-green-700 to-black'
  },
  'balenciaga': {
    name: 'Balenciaga',
    logo: '👜',
    description: 'Balenciaga sale - City bags, sneakers, and accessories at up to 60% off.',
    longDescription: 'Balenciaga, founded in 1917, has become synonymous with avant-garde fashion. The City bag and Triple S sneakers are modern classics.',
    keywords: ['balenciaga', 'city bag', 'balenciaga sneakers', 'triple s', 'speed trainer'],
    category: 'Handbags',
    color: 'from-black to-gray-700'
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
        currency: 'USD',
        content_type: 'brand_page'
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

export default function BrandPage() {
  const { brandSlug } = useParams();
  const [deals, setDeals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState('discount');
  
  const brand = BRANDS[brandSlug];
  
  useEffect(() => {
    if (brand) {
      loadDeals();
      
      // Update page title
      document.title = `${brand.name} Sale - Up to 70% Off | Dealsluxy`;
      
      // GA4: Track brand page view
      if (typeof window.gtag === 'function') {
        window.gtag('event', 'view_brand_page', {
          brand_name: brand.name,
          page_path: `/brand/${brandSlug}`
        });
      }
    }
  }, [brandSlug, sortBy]);
  
  const loadDeals = async () => {
    setLoading(true);
    try {
      // Search for brand name in deals
      const params = { 
        limit: 40, 
        sort: sortBy,
        search: brand.name
      };
      const data = await api.getPublicDeals(params);
      setDeals(data.deals || []);
    } catch (error) {
      console.error('Failed to load deals:', error);
    } finally {
      setLoading(false);
    }
  };
  
  if (!brand) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-800 mb-4">Brand Not Found</h1>
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
      <div className={`bg-gradient-to-r ${brand.color} text-white py-16`}>
        <div className="max-w-7xl mx-auto px-4">
          <nav className="flex items-center gap-2 text-white/80 text-sm mb-6">
            <Link to="/" className="hover:text-white">Home</Link>
            <ChevronRight size={14} />
            <Link to="/designer-sale" className="hover:text-white">Brands</Link>
            <ChevronRight size={14} />
            <span className="text-white">{brand.name}</span>
          </nav>
          
          <div className="flex items-center gap-4 mb-4">
            <span className="text-5xl">{brand.logo}</span>
            <h1 className="text-4xl md:text-5xl font-bold">{brand.name} Sale</h1>
          </div>
          <p className="text-xl text-white/90 mb-4">Up to 70% Off Authentic {brand.name}</p>
          <p className="text-white/80 max-w-2xl">{brand.description}</p>
          
          <div className="flex items-center gap-4 mt-6 text-sm text-white/70">
            <div className="flex items-center gap-1">
              <Clock size={14} />
              <span>Updated: {lastUpdated}</span>
            </div>
            <div className="flex items-center gap-1">
              <Tag size={14} />
              <span>{deals.length} deals found</span>
            </div>
          </div>
        </div>
      </div>
      
      {/* Filters */}
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-gray-800">{brand.name} Deals</h2>
            <div className="flex items-center gap-2">
              <Filter size={16} className="text-gray-400" />
              <select 
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="border border-gray-200 rounded-lg px-3 py-2 text-sm"
              >
                <option value="discount">Biggest Discount</option>
                <option value="price_asc">Price: Low to High</option>
                <option value="price_desc">Price: High to Low</option>
                <option value="newest">Newest First</option>
              </select>
            </div>
          </div>
        </div>
      </div>
      
      {/* Deals Grid */}
      <div className="max-w-7xl mx-auto px-4 py-8">
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
            <div className="text-6xl mb-4">🔍</div>
            <h3 className="text-xl font-semibold mb-2 text-gray-800">No {brand.name} deals found</h3>
            <p className="text-gray-500 mb-4">Check back soon for new deals!</p>
            <Link 
              to="/"
              className="inline-flex items-center gap-2 bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
            >
              Browse All Deals
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {deals.map(deal => <DealCard key={deal.id} deal={deal} />)}
          </div>
        )}
      </div>
      
      {/* About Brand Section */}
      <div className="bg-white py-12">
        <div className="max-w-3xl mx-auto px-4">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">About {brand.name}</h2>
          <p className="text-gray-600 mb-6">{brand.longDescription}</p>
          
          <h3 className="font-semibold text-gray-800 mb-3">Popular {brand.name} Items:</h3>
          <div className="flex flex-wrap gap-2 mb-8">
            {brand.keywords.map((keyword, i) => (
              <span key={i} className="bg-gray-100 text-gray-700 px-3 py-1 rounded-full text-sm">
                {keyword}
              </span>
            ))}
          </div>
          
          <div className="flex items-center gap-4">
            <Link 
              to="/"
              className="inline-flex items-center gap-2 bg-gradient-to-r from-orange-500 to-red-500 text-white px-6 py-3 rounded-full font-medium hover:from-orange-600 hover:to-red-600"
            >
              <ShoppingBag size={18} />
              View All Deals
            </Link>
            <Link 
              to="/designer-sale"
              className="inline-flex items-center gap-2 border border-gray-300 text-gray-700 px-6 py-3 rounded-full font-medium hover:bg-gray-50"
            >
              Browse All Brands
            </Link>
          </div>
        </div>
      </div>
      
      {/* Related Brands */}
      <div className="max-w-7xl mx-auto px-4 py-12">
        <h2 className="text-xl font-bold text-gray-800 mb-6">Explore Other Luxury Brands</h2>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {Object.entries(BRANDS)
            .filter(([slug]) => slug !== brandSlug)
            .slice(0, 5)
            .map(([slug, b]) => (
              <Link 
                key={slug}
                to={`/brand/${slug}`}
                className="bg-white rounded-xl p-4 text-center hover:shadow-lg transition-shadow border border-gray-100"
              >
                <span className="text-3xl mb-2 block">{b.logo}</span>
                <span className="font-medium text-gray-800">{b.name}</span>
              </Link>
            ))}
        </div>
      </div>
      
      {/* Schema.org Brand */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
        "@context": "https://schema.org",
        "@type": "Brand",
        "name": brand.name,
        "description": brand.description,
        "url": `https://dealsluxy.com/brand/${brandSlug}`
      })}} />
      
      {/* Schema.org BreadcrumbList */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        "itemListElement": [
          { "@type": "ListItem", "position": 1, "name": "Home", "item": "https://dealsluxy.com" },
          { "@type": "ListItem", "position": 2, "name": "Brands", "item": "https://dealsluxy.com/designer-sale" },
          { "@type": "ListItem", "position": 3, "name": brand.name, "item": `https://dealsluxy.com/brand/${brandSlug}` }
        ]
      })}} />
    </div>
  );
}

// Export brands list for sitemap
export { BRANDS };


