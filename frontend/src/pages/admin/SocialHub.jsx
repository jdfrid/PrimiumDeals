import { useState, useEffect } from 'react';
import { Share2, Download, Copy, Check, Facebook, Instagram, Send, RefreshCw, ExternalLink, Image, MessageCircle, Zap } from 'lucide-react';
import api from '../../services/api';

function TelegramAutoPost() {
  const [posting, setPosting] = useState(false);
  const [result, setResult] = useState(null);

  const triggerAutoPost = async () => {
    setPosting(true);
    setResult(null);
    try {
      const res = await api.request('/admin/social/post', {
        method: 'POST',
        body: JSON.stringify({ limit: 3 })
      });
      setResult({ success: true, message: `Posted ${res.results?.total || 0} deals to Telegram!` });
    } catch (error) {
      setResult({ success: false, message: error.message || 'Failed to post' });
    } finally {
      setPosting(false);
    }
  };

  return (
    <div className="flex items-center gap-3">
      {result && (
        <span className={`text-sm ${result.success ? 'text-green-400' : 'text-red-400'}`}>
          {result.message}
        </span>
      )}
      <button
        onClick={triggerAutoPost}
        disabled={posting}
        className="bg-cyan-600 hover:bg-cyan-700 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 disabled:opacity-50"
      >
        {posting ? <RefreshCw size={16} className="animate-spin" /> : <Zap size={16} />}
        {posting ? 'Posting...' : 'Post Now'}
      </button>
    </div>
  );
}

function FacebookPagePost() {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(false);
  const [pageInfo, setPageInfo] = useState(null);

  useEffect(() => {
    checkFacebookConnection();
  }, []);

  const checkFacebookConnection = async () => {
    try {
      const res = await api.request('/admin/facebook/info');
      if (res.name) {
        setPageInfo(res);
        setStatus({ success: true });
      } else {
        setStatus({ success: false, message: res.error || 'Not configured' });
      }
    } catch (error) {
      setStatus({ success: false, message: 'Not configured' });
    }
  };

  const testConnection = async () => {
    setLoading(true);
    try {
      const res = await api.request('/admin/facebook/test', { method: 'POST' });
      if (res.success) {
        setPageInfo(res.page);
        setStatus({ success: true, message: res.message });
      } else {
        setStatus({ success: false, message: res.error });
      }
    } catch (error) {
      setStatus({ success: false, message: error.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center gap-3">
      {pageInfo ? (
        <span className="text-sm text-green-400">
          ✅ Connected: {pageInfo.name} ({pageInfo.followers?.toLocaleString()} followers)
        </span>
      ) : (
        <span className="text-sm text-midnight-400">
          Not configured
        </span>
      )}
      <button
        onClick={testConnection}
        disabled={loading}
        className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 disabled:opacity-50"
      >
        {loading ? <RefreshCw size={16} className="animate-spin" /> : <Zap size={16} />}
        Test
      </button>
    </div>
  );
}

const PLATFORMS = {
  facebook: { name: 'Facebook', color: '#1877f2', icon: '👥' },
  instagram: { name: 'Instagram', color: '#e4405f', icon: '📸' },
  telegram: { name: 'Telegram', color: '#0088cc', icon: '✈️' },
  whatsapp: { name: 'WhatsApp', color: '#25d366', icon: '💬' },
  twitter: { name: 'X/Twitter', color: '#000000', icon: '🐦' }
};

function BannerShareCard({ banner, deal }) {
  const [copied, setCopied] = useState(null);
  const [showCaptions, setShowCaptions] = useState(false);
  
  const bannerUrl = `https://dealsluxy.com/api/banners/${banner.banner_id}`;
  const dealUrl = `https://dealsluxy.com/api/track/click/${deal?.id || banner.deal_id}?utm_source=social&utm_medium=post`;
  const savings = (deal?.original_price || 0) - (deal?.current_price || 0);
  
  // Generate captions for different platforms
  const captions = {
    facebook: `🔥 ${deal?.discount_percent || banner.discount_percent}% OFF - ${deal?.title || banner.deal_title}

💰 Was: $${deal?.original_price?.toFixed(0) || '---'}
✨ Now: $${deal?.current_price?.toFixed(0) || '---'}
💵 You Save: $${savings.toFixed(0)}!

🛒 Get this deal: ${dealUrl}

#luxurydeals #sale #discount #fashion #shopping`,

    instagram: `🔥 DEAL ALERT: ${deal?.discount_percent || banner.discount_percent}% OFF!

${deal?.title || banner.deal_title}

💰 Was: $${deal?.original_price?.toFixed(0) || '---'}
✨ Now: $${deal?.current_price?.toFixed(0) || '---'}
💵 Save: $${savings.toFixed(0)}!

🔗 Link in bio @dealsluxy

#luxurydeals #designersale #fashiondeals #luxuryfashion #sale #discount #shopping #deals #luxury #designer #fashion #style #ootd #fashionista`,

    telegram: `🔥 <b>${deal?.discount_percent || banner.discount_percent}% OFF!</b>

${deal?.title || banner.deal_title}

💰 <s>$${deal?.original_price?.toFixed(0) || '---'}</s> → <b>$${deal?.current_price?.toFixed(0) || '---'}</b>
💵 Save $${savings.toFixed(0)}!

<a href="${dealUrl}">🛒 Get This Deal</a>`,

    whatsapp: `🔥 *${deal?.discount_percent || banner.discount_percent}% OFF!*

${deal?.title || banner.deal_title}

💰 Was: $${deal?.original_price?.toFixed(0) || '---'}
✨ Now: *$${deal?.current_price?.toFixed(0) || '---'}*
💵 Save: $${savings.toFixed(0)}!

🛒 ${dealUrl}`,

    twitter: `🔥 ${deal?.discount_percent || banner.discount_percent}% OFF!

${(deal?.title || banner.deal_title || '').substring(0, 80)}...

💰 $${deal?.original_price?.toFixed(0)} → $${deal?.current_price?.toFixed(0)}

🛒 ${dealUrl}

#deals #luxury #sale`
  };

  const copyCaption = (platform) => {
    navigator.clipboard.writeText(captions[platform]);
    setCopied(platform);
    setTimeout(() => setCopied(null), 2000);
  };

  const openBanner = () => {
    window.open(bannerUrl, '_blank');
  };

  const shareToFacebook = () => {
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(dealUrl)}&quote=${encodeURIComponent(captions.facebook)}`, '_blank', 'width=600,height=400');
  };

  const shareToTwitter = () => {
    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(captions.twitter)}`, '_blank', 'width=600,height=400');
  };

  const shareToWhatsApp = () => {
    window.open(`https://wa.me/?text=${encodeURIComponent(captions.whatsapp)}`, '_blank');
  };

  const shareToTelegram = () => {
    window.open(`https://t.me/share/url?url=${encodeURIComponent(dealUrl)}&text=${encodeURIComponent(captions.telegram)}`, '_blank');
  };

  return (
    <div className="bg-midnight-800 rounded-xl overflow-hidden border border-midnight-700">
      {/* Banner Preview */}
      <div className="aspect-square bg-midnight-900 relative overflow-hidden">
        <iframe 
          src={bannerUrl}
          className="absolute inset-0 w-full h-full"
          style={{ transform: 'scale(0.25)', transformOrigin: 'top left', width: '400%', height: '400%' }}
          title="Banner Preview"
        />
        <div className="absolute bottom-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded">
          {banner.size?.replace('_', ' ')}
        </div>
      </div>

      {/* Info */}
      <div className="p-4">
        <h3 className="font-medium text-white text-sm line-clamp-2 mb-3">
          {deal?.title || banner.deal_title}
        </h3>
        
        <div className="flex items-center gap-2 mb-4">
          <span className="bg-red-500 text-white px-2 py-1 rounded text-sm font-bold">
            -{deal?.discount_percent || banner.discount_percent}%
          </span>
          <span className="text-green-400 font-bold">${deal?.current_price?.toFixed(0) || '---'}</span>
        </div>

        {/* Quick Share Buttons */}
        <div className="grid grid-cols-5 gap-2 mb-3">
          <button onClick={shareToFacebook} className="p-2 rounded-lg hover:opacity-80 transition-opacity" style={{background: PLATFORMS.facebook.color}} title="Share to Facebook">
            <span className="text-lg">{PLATFORMS.facebook.icon}</span>
          </button>
          <button onClick={() => { copyCaption('instagram'); alert('Caption copied! Now open Instagram and paste it with the banner image.'); }} className="p-2 rounded-lg hover:opacity-80 transition-opacity" style={{background: PLATFORMS.instagram.color}} title="Copy for Instagram">
            <span className="text-lg">{PLATFORMS.instagram.icon}</span>
          </button>
          <button onClick={shareToTelegram} className="p-2 rounded-lg hover:opacity-80 transition-opacity" style={{background: PLATFORMS.telegram.color}} title="Share to Telegram">
            <span className="text-lg">{PLATFORMS.telegram.icon}</span>
          </button>
          <button onClick={shareToWhatsApp} className="p-2 rounded-lg hover:opacity-80 transition-opacity" style={{background: PLATFORMS.whatsapp.color}} title="Share to WhatsApp">
            <span className="text-lg">{PLATFORMS.whatsapp.icon}</span>
          </button>
          <button onClick={shareToTwitter} className="p-2 rounded-lg hover:opacity-80 transition-opacity" style={{background: PLATFORMS.twitter.color}} title="Share to X">
            <span className="text-lg">{PLATFORMS.twitter.icon}</span>
          </button>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2">
          <button
            onClick={openBanner}
            className="flex-1 bg-brand-500 text-white py-2 rounded-lg text-sm font-medium flex items-center justify-center gap-2 hover:bg-brand-600"
          >
            <ExternalLink size={16} /> Open Banner
          </button>
          <button
            onClick={() => setShowCaptions(!showCaptions)}
            className="flex-1 bg-midnight-700 text-white py-2 rounded-lg text-sm font-medium flex items-center justify-center gap-2 hover:bg-midnight-600"
          >
            <Copy size={16} /> Captions
          </button>
        </div>

        {/* Captions Panel */}
        {showCaptions && (
          <div className="mt-4 space-y-3">
            {Object.entries(captions).map(([platform, caption]) => (
              <div key={platform} className="bg-midnight-900 rounded-lg p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-white flex items-center gap-2">
                    <span>{PLATFORMS[platform]?.icon}</span>
                    {PLATFORMS[platform]?.name}
                  </span>
                  <button
                    onClick={() => copyCaption(platform)}
                    className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                      copied === platform 
                        ? 'bg-green-500 text-white' 
                        : 'bg-midnight-700 text-midnight-300 hover:bg-midnight-600'
                    }`}
                  >
                    {copied === platform ? '✓ Copied!' : 'Copy'}
                  </button>
                </div>
                <pre className="text-xs text-midnight-400 whitespace-pre-wrap max-h-24 overflow-y-auto">
                  {caption}
                </pre>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function SocialHub() {
  const [banners, setBanners] = useState([]);
  const [deals, setDeals] = useState({});
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('instagram_square');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      // Get recent banners
      const bannersRes = await api.request('/admin/banners?limit=50');
      setBanners(bannersRes.banners || []);
      
      // Get deal details for each banner
      const dealIds = [...new Set((bannersRes.banners || []).map(b => b.deal_id))];
      const dealsMap = {};
      
      // Fetch today's deals to match
      const todayRes = await api.request('/deals/today?limit=100');
      (todayRes.deals || []).forEach(d => {
        dealsMap[d.id] = d;
      });
      
      setDeals(dealsMap);
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredBanners = banners.filter(b => filter === 'all' || b.size === filter);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <Share2 className="text-brand-400" />
            Social Media Hub
          </h1>
          <p className="text-midnight-400 mt-1">Share banners to Facebook, Instagram, Telegram & more</p>
        </div>
        <button
          onClick={loadData}
          className="px-4 py-2 bg-midnight-700 text-white rounded-lg hover:bg-midnight-600 flex items-center gap-2"
        >
          <RefreshCw size={18} />
          Refresh
        </button>
      </div>

      {/* Telegram Auto-Post */}
      <div className="bg-gradient-to-r from-cyan-900/30 to-blue-900/30 border border-cyan-500/30 rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            ✈️ Telegram Auto-Posting
          </h3>
          <TelegramAutoPost />
        </div>
        <p className="text-midnight-300 text-sm">
          Configure your Telegram bot to auto-post deals every 4 hours.
          Set <code className="bg-midnight-800 px-2 py-1 rounded">TELEGRAM_BOT_TOKEN</code> and <code className="bg-midnight-800 px-2 py-1 rounded">TELEGRAM_CHANNEL_ID</code> in Render environment variables.
        </p>
      </div>

      {/* Facebook Page */}
      <div className="bg-gradient-to-r from-blue-900/30 to-indigo-900/30 border border-blue-500/30 rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            👥 Facebook Page
          </h3>
          <FacebookPagePost />
        </div>
        <p className="text-midnight-300 text-sm">
          Post deals to your Facebook Page automatically.
          Set <code className="bg-midnight-800 px-2 py-1 rounded">FACEBOOK_PAGE_ID</code> and <code className="bg-midnight-800 px-2 py-1 rounded">FACEBOOK_PAGE_ACCESS_TOKEN</code> in Render.
        </p>
      </div>

      {/* Instructions */}
      <div className="bg-gradient-to-r from-blue-900/30 to-purple-900/30 border border-blue-500/30 rounded-xl p-6">
        <h3 className="text-lg font-bold text-white mb-3">📱 How to Share</h3>
        <div className="grid md:grid-cols-3 gap-4 text-sm">
          <div className="bg-midnight-900/50 rounded-lg p-4">
            <div className="text-2xl mb-2">👥 Facebook</div>
            <ol className="text-midnight-300 space-y-1 list-decimal list-inside">
              <li>Click the Facebook icon</li>
              <li>Or: Open banner → Screenshot → Post to group</li>
              <li>Paste the caption</li>
            </ol>
          </div>
          <div className="bg-midnight-900/50 rounded-lg p-4">
            <div className="text-2xl mb-2">📸 Instagram</div>
            <ol className="text-midnight-300 space-y-1 list-decimal list-inside">
              <li>Click "Open Banner"</li>
              <li>Screenshot or save image</li>
              <li>Click Instagram icon to copy caption</li>
              <li>Post to Instagram with image + caption</li>
            </ol>
          </div>
          <div className="bg-midnight-900/50 rounded-lg p-4">
            <div className="text-2xl mb-2">✈️ Telegram</div>
            <ol className="text-midnight-300 space-y-1 list-decimal list-inside">
              <li>Click the Telegram icon</li>
              <li>Select channel/group</li>
              <li>Done! Link will include preview</li>
            </ol>
          </div>
        </div>
      </div>

      {/* Filter */}
      <div className="flex gap-2 flex-wrap">
        <button
          onClick={() => setFilter('all')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            filter === 'all' ? 'bg-brand-500 text-white' : 'bg-midnight-800 text-midnight-300 hover:bg-midnight-700'
          }`}
        >
          All
        </button>
        <button
          onClick={() => setFilter('instagram_square')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            filter === 'instagram_square' ? 'bg-brand-500 text-white' : 'bg-midnight-800 text-midnight-300 hover:bg-midnight-700'
          }`}
        >
          📱 Instagram Square
        </button>
        <button
          onClick={() => setFilter('instagram_story')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            filter === 'instagram_story' ? 'bg-brand-500 text-white' : 'bg-midnight-800 text-midnight-300 hover:bg-midnight-700'
          }`}
        >
          📲 Instagram Story
        </button>
        <button
          onClick={() => setFilter('facebook_post')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            filter === 'facebook_post' ? 'bg-brand-500 text-white' : 'bg-midnight-800 text-midnight-300 hover:bg-midnight-700'
          }`}
        >
          👥 Facebook
        </button>
      </div>

      {/* Banners Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="bg-midnight-800 rounded-xl p-4 animate-pulse">
              <div className="aspect-square bg-midnight-700 rounded-lg mb-4"></div>
              <div className="h-4 bg-midnight-700 rounded mb-2"></div>
              <div className="h-8 bg-midnight-700 rounded"></div>
            </div>
          ))}
        </div>
      ) : filteredBanners.length === 0 ? (
        <div className="text-center py-20 bg-midnight-800 rounded-xl border border-midnight-700">
          <div className="text-6xl mb-4">📱</div>
          <h3 className="text-xl font-semibold mb-2 text-white">No banners to share</h3>
          <p className="text-midnight-400">Go to Banners page and generate some banners first!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredBanners.map(banner => (
            <BannerShareCard 
              key={banner.id} 
              banner={banner} 
              deal={deals[banner.deal_id]}
            />
          ))}
        </div>
      )}
    </div>
  );
}

