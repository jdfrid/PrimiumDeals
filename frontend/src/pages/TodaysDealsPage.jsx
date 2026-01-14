import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Calendar, Clock, TrendingDown, ShoppingBag, Share2, Copy, Check, ExternalLink } from 'lucide-react';
import api from '../services/api';

function DealCard({ deal, onShare }) {
  const savings = deal.original_price - deal.current_price;
  const trackingUrl = `/api/track/click/${deal.id}`;
  
  return (
    <div className="bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 border border-gray-100">
      <a
        href={trackingUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="block"
      >
        <div className="relative aspect-square overflow-hidden bg-gray-50">
          <img
            src={deal.image_url || '/placeholder.jpg'}
            alt={deal.title}
            className="w-full h-full object-cover transition-transform duration-500 hover:scale-105"
            loading="lazy"
          />
          <div className="absolute top-2 left-2 bg-red-500 text-white px-2 py-1 rounded-lg text-sm font-bold shadow-lg">
            -{deal.discount_percent}%
          </div>
          <div className="absolute top-2 right-2 bg-green-500 text-white px-2 py-1 rounded-lg text-xs font-medium shadow">
            NEW
          </div>
        </div>
        <div className="p-4">
          <h3 className="font-medium text-gray-800 text-sm line-clamp-2 mb-2 hover:text-blue-600 transition-colors">
            {deal.title}
          </h3>
          <div className="flex items-center justify-between mb-3">
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
      <div className="px-4 pb-4 flex gap-2">
        <a
          href={trackingUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex-1 bg-gradient-to-r from-orange-500 to-red-500 text-white py-2 rounded-lg font-medium text-sm hover:from-orange-600 hover:to-red-600 transition-all flex items-center justify-center gap-2"
        >
          <ShoppingBag size={16} />
          View Deal
        </a>
        <button
          onClick={() => onShare(deal)}
          className="px-3 py-2 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          title="Share"
        >
          <Share2 size={16} className="text-gray-500" />
        </button>
      </div>
    </div>
  );
}

function ShareModal({ deal, onClose }) {
  const [copied, setCopied] = useState(false);
  
  if (!deal) return null;
  
  const shareUrl = `https://dealsluxy.com/api/track/click/${deal.id}`;
  const shareText = `🔥 ${deal.discount_percent}% OFF! ${deal.title?.substring(0, 60)}...\n\n💰 Was: $${deal.original_price?.toFixed(0)} → Now: $${deal.current_price?.toFixed(0)}\n\n🛒 Get it here: ${shareUrl}\n\n#deals #luxury #sale`;
  
  const copyToClipboard = () => {
    navigator.clipboard.writeText(shareText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  
  const shareToTwitter = () => {
    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}`, '_blank');
  };
  
  const shareToFacebook = () => {
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`, '_blank');
  };
  
  const shareToWhatsApp = () => {
    window.open(`https://wa.me/?text=${encodeURIComponent(shareText)}`, '_blank');
  };
  
  const shareToTelegram = () => {
    window.open(`https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(shareText)}`, '_blank');
  };
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6" onClick={e => e.stopPropagation()}>
        <h3 className="text-xl font-bold text-gray-800 mb-4">Share This Deal</h3>
        
        <div className="bg-gray-50 rounded-lg p-3 mb-4">
          <p className="text-sm text-gray-600 whitespace-pre-line">{shareText}</p>
        </div>
        
        <div className="grid grid-cols-4 gap-3 mb-4">
          <button onClick={shareToTwitter} className="flex flex-col items-center gap-1 p-3 rounded-lg hover:bg-gray-100">
            <div className="w-10 h-10 bg-black rounded-full flex items-center justify-center text-white font-bold">X</div>
            <span className="text-xs text-gray-600">Twitter</span>
          </button>
          <button onClick={shareToFacebook} className="flex flex-col items-center gap-1 p-3 rounded-lg hover:bg-gray-100">
            <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold">f</div>
            <span className="text-xs text-gray-600">Facebook</span>
          </button>
          <button onClick={shareToWhatsApp} className="flex flex-col items-center gap-1 p-3 rounded-lg hover:bg-gray-100">
            <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center text-white font-bold">W</div>
            <span className="text-xs text-gray-600">WhatsApp</span>
          </button>
          <button onClick={shareToTelegram} className="flex flex-col items-center gap-1 p-3 rounded-lg hover:bg-gray-100">
            <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center text-white font-bold">T</div>
            <span className="text-xs text-gray-600">Telegram</span>
          </button>
        </div>
        
        <button
          onClick={copyToClipboard}
          className="w-full flex items-center justify-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-800 py-3 rounded-lg font-medium transition-colors"
        >
          {copied ? <Check size={18} className="text-green-600" /> : <Copy size={18} />}
          {copied ? 'Copied!' : 'Copy to Clipboard'}
        </button>
        
        <button onClick={onClose} className="w-full mt-3 text-gray-500 text-sm hover:text-gray-700">
          Close
        </button>
      </div>
    </div>
  );
}

export default function TodaysDealsPage() {
  const [deals, setDeals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [shareModal, setShareModal] = useState(null);
  
  useEffect(() => {
    loadTodaysDeals();
    document.title = "Latest Deals | Dealsluxy";
  }, []);
  
  const loadTodaysDeals = async () => {
    setLoading(true);
    try {
      const response = await api.request('/deals/today');
      setDeals(response.deals || []);
    } catch (error) {
      console.error('Failed to load deals:', error);
    } finally {
      setLoading(false);
    }
  };
  
  const today = new Date().toLocaleDateString('en-US', { 
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' 
  });
  
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero */}
      <div className="bg-gradient-to-r from-green-500 to-teal-600 text-white py-12">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
              <Calendar size={24} />
            </div>
            <div>
              <h1 className="text-3xl md:text-4xl font-bold">Latest Deals</h1>
              <p className="text-white/80">{today}</p>
            </div>
          </div>
          <p className="text-white/70 max-w-2xl">
            Fresh deals added recently! Be the first to grab these amazing discounts before they're gone.
          </p>
          <div className="flex items-center gap-4 mt-4 text-sm text-white/60">
            <div className="flex items-center gap-1">
              <Clock size={14} />
              <span>Updated every hour</span>
            </div>
            <div className="flex items-center gap-1">
              <ShoppingBag size={14} />
              <span>{deals.length} deals</span>
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
            <h3 className="text-xl font-semibold mb-2 text-gray-800">Loading fresh deals...</h3>
            <p className="text-gray-500 mb-4">Our system is searching for the best deals. Check back soon!</p>
            <Link 
              to="/"
              className="inline-flex items-center gap-2 bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
            >
              Browse All Deals
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {deals.map(deal => (
              <DealCard key={deal.id} deal={deal} onShare={setShareModal} />
            ))}
          </div>
        )}
      </div>
      
      {/* Share Modal */}
      <ShareModal deal={shareModal} onClose={() => setShareModal(null)} />
      
      {/* Footer */}
      <footer className="bg-gray-900 text-white py-8 mt-12">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <p className="text-gray-400 text-sm">
            © {new Date().getFullYear()} Dealsluxy. New deals added daily.
          </p>
        </div>
      </footer>
    </div>
  );
}


