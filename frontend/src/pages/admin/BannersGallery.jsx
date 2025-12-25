import { useState, useEffect } from 'react';
import { Image, Download, RefreshCw, Wand2, Eye, Copy, Check, Filter, LayoutGrid, Layers } from 'lucide-react';
import api from '../../services/api';

// Size dimensions for display
const SIZE_INFO = {
  instagram_square: { label: 'Instagram Square', width: 1080, height: 1080, icon: '📱' },
  instagram_story: { label: 'Instagram Story', width: 1080, height: 1920, icon: '📲' },
  facebook_post: { label: 'Facebook Post', width: 1200, height: 630, icon: '👥' },
  twitter_post: { label: 'Twitter Post', width: 1200, height: 675, icon: '🐦' },
  pinterest_pin: { label: 'Pinterest Pin', width: 1000, height: 1500, icon: '📌' },
  telegram: { label: 'Telegram', width: 800, height: 600, icon: '✈️' }
};

const STYLE_INFO = {
  gradient_orange: { label: 'Orange', color: '#f97316' },
  gradient_purple: { label: 'Purple', color: '#8b5cf6' },
  gradient_blue: { label: 'Blue', color: '#3b82f6' },
  dark: { label: 'Dark', color: '#1f2937' },
  light: { label: 'Light', color: '#f8fafc' }
};

function BannerCard({ banner, onView, onCopyUrl }) {
  const sizeInfo = SIZE_INFO[banner.size] || { label: banner.size, icon: '🖼️' };
  const styleInfo = STYLE_INFO[banner.style] || { label: banner.style, color: '#888' };
  const bannerUrl = `/api/banners/${banner.banner_id}`;
  
  return (
    <div className="bg-midnight-800 rounded-xl overflow-hidden border border-midnight-700 hover:border-brand-500 transition-all group">
      {/* Preview */}
      <div className="aspect-video bg-midnight-900 relative overflow-hidden">
        <iframe 
          src={bannerUrl}
          className="absolute inset-0 w-full h-full transform scale-[0.3] origin-top-left"
          style={{ width: '333%', height: '333%' }}
          title={`Banner ${banner.banner_id}`}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-midnight-900/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-center pb-4 gap-2">
          <button
            onClick={() => onView(banner)}
            className="bg-brand-500 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 hover:bg-brand-600"
          >
            <Eye size={16} /> View
          </button>
          <button
            onClick={() => onCopyUrl(bannerUrl)}
            className="bg-midnight-700 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 hover:bg-midnight-600"
          >
            <Copy size={16} /> Copy URL
          </button>
        </div>
      </div>
      
      {/* Info */}
      <div className="p-4">
        <div className="flex items-start justify-between mb-2">
          <h3 className="font-medium text-white text-sm line-clamp-2 flex-1">
            {banner.deal_title?.substring(0, 50)}...
          </h3>
          <span className="text-lg ml-2">{sizeInfo.icon}</span>
        </div>
        
        <div className="flex items-center gap-2 text-xs text-midnight-400">
          <span className="bg-midnight-700 px-2 py-1 rounded">{sizeInfo.label}</span>
          <span 
            className="px-2 py-1 rounded flex items-center gap-1"
            style={{ background: styleInfo.color + '30', color: styleInfo.color }}
          >
            <span className="w-2 h-2 rounded-full" style={{ background: styleInfo.color }}></span>
            {styleInfo.label}
          </span>
        </div>
        
        <div className="mt-2 text-xs text-midnight-500">
          {new Date(banner.created_at).toLocaleString('he-IL')}
        </div>
      </div>
    </div>
  );
}

function GenerateModal({ onClose, onGenerate }) {
  const [dealId, setDealId] = useState('');
  const [size, setSize] = useState('instagram_square');
  const [style, setStyle] = useState('gradient_orange');
  const [generating, setGenerating] = useState(false);
  
  const handleGenerate = async () => {
    if (!dealId) return;
    setGenerating(true);
    await onGenerate({ deal_id: parseInt(dealId), size, style });
    setGenerating(false);
    onClose();
  };
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70" onClick={onClose}>
      <div className="bg-midnight-800 rounded-2xl shadow-2xl max-w-md w-full p-6 border border-midnight-700" onClick={e => e.stopPropagation()}>
        <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
          <Wand2 className="text-brand-400" />
          Generate Banner
        </h3>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-midnight-300 mb-2">Deal ID</label>
            <input
              type="number"
              value={dealId}
              onChange={e => setDealId(e.target.value)}
              className="w-full bg-midnight-900 border border-midnight-700 rounded-lg px-4 py-3 text-white focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
              placeholder="Enter deal ID"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-midnight-300 mb-2">Size</label>
            <select
              value={size}
              onChange={e => setSize(e.target.value)}
              className="w-full bg-midnight-900 border border-midnight-700 rounded-lg px-4 py-3 text-white focus:border-brand-500"
            >
              {Object.entries(SIZE_INFO).map(([key, info]) => (
                <option key={key} value={key}>{info.icon} {info.label} ({info.width}x{info.height})</option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-midnight-300 mb-2">Style</label>
            <div className="grid grid-cols-5 gap-2">
              {Object.entries(STYLE_INFO).map(([key, info]) => (
                <button
                  key={key}
                  onClick={() => setStyle(key)}
                  className={`p-3 rounded-lg border-2 transition-all ${
                    style === key 
                      ? 'border-brand-500 bg-brand-500/20' 
                      : 'border-midnight-700 hover:border-midnight-600'
                  }`}
                  title={info.label}
                >
                  <div 
                    className="w-full aspect-square rounded-md"
                    style={{ background: info.color }}
                  ></div>
                </button>
              ))}
            </div>
          </div>
        </div>
        
        <div className="flex gap-3 mt-6">
          <button
            onClick={onClose}
            className="flex-1 py-3 border border-midnight-600 text-midnight-300 rounded-lg hover:bg-midnight-700"
          >
            Cancel
          </button>
          <button
            onClick={handleGenerate}
            disabled={!dealId || generating}
            className="flex-1 py-3 bg-brand-500 text-white rounded-lg hover:bg-brand-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {generating ? <RefreshCw className="animate-spin" size={18} /> : <Wand2 size={18} />}
            Generate
          </button>
        </div>
      </div>
    </div>
  );
}

function ViewerModal({ banner, onClose }) {
  const [copied, setCopied] = useState(false);
  
  if (!banner) return null;
  
  const bannerUrl = `${window.location.origin}/api/banners/${banner.banner_id}`;
  
  const copyUrl = () => {
    navigator.clipboard.writeText(bannerUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  
  const downloadBanner = () => {
    window.open(bannerUrl, '_blank');
  };
  
  const sizeInfo = SIZE_INFO[banner.size] || { label: banner.size, width: 1080, height: 1080 };
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80" onClick={onClose}>
      <div className="bg-midnight-800 rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden border border-midnight-700" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="p-4 border-b border-midnight-700 flex items-center justify-between">
          <div>
            <h3 className="font-bold text-white">{banner.deal_title}</h3>
            <p className="text-sm text-midnight-400">{sizeInfo.label} • {sizeInfo.width}x{sizeInfo.height}</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={copyUrl}
              className="px-4 py-2 bg-midnight-700 text-white rounded-lg hover:bg-midnight-600 flex items-center gap-2 text-sm"
            >
              {copied ? <Check size={16} className="text-green-500" /> : <Copy size={16} />}
              {copied ? 'Copied!' : 'Copy URL'}
            </button>
            <button
              onClick={downloadBanner}
              className="px-4 py-2 bg-brand-500 text-white rounded-lg hover:bg-brand-600 flex items-center gap-2 text-sm"
            >
              <Download size={16} /> Open Full Size
            </button>
          </div>
        </div>
        
        {/* Banner Preview */}
        <div className="p-4 bg-midnight-900 overflow-auto" style={{ maxHeight: '70vh' }}>
          <div className="mx-auto" style={{ 
            width: Math.min(sizeInfo.width, 800),
            aspectRatio: `${sizeInfo.width} / ${sizeInfo.height}`
          }}>
            <iframe 
              src={`/api/banners/${banner.banner_id}`}
              className="w-full h-full border-0 rounded-lg shadow-2xl"
              title="Banner Preview"
            />
          </div>
        </div>
        
        {/* Footer */}
        <div className="p-4 border-t border-midnight-700 bg-midnight-850">
          <div className="text-xs text-midnight-500 flex items-center justify-between">
            <span>Banner ID: {banner.banner_id}</span>
            <span>Created: {new Date(banner.created_at).toLocaleString('he-IL')}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function BannersGallery() {
  const [banners, setBanners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [viewingBanner, setViewingBanner] = useState(null);
  const [filterSize, setFilterSize] = useState('all');
  const [filterStyle, setFilterStyle] = useState('all');
  const [generating, setGenerating] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    loadBanners();
    loadStats();
  }, []);

  const loadBanners = async () => {
    setLoading(true);
    try {
      const response = await api.request('/admin/banners?limit=100');
      setBanners(response.banners || []);
    } catch (error) {
      console.error('Failed to load banners:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const response = await api.request('/admin/banners/stats');
      setStats(response);
    } catch (error) {
      console.error('Failed to load stats:', error);
    }
  };

  const handleGenerate = async (data) => {
    try {
      await api.request('/admin/banners/generate', {
        method: 'POST',
        body: JSON.stringify(data)
      });
      loadBanners();
      loadStats();
    } catch (error) {
      console.error('Failed to generate banner:', error);
      alert('Failed to generate banner: ' + error.message);
    }
  };

  const handleGenerateNewDeals = async () => {
    setGenerating(true);
    try {
      const response = await api.request('/admin/banners/generate-new', {
        method: 'POST',
        body: JSON.stringify({ limit: 20 })
      });
      alert(`Generated ${response.count} banners for new deals!`);
      loadBanners();
      loadStats();
    } catch (error) {
      console.error('Failed to generate banners:', error);
      alert('Failed to generate banners: ' + error.message);
    } finally {
      setGenerating(false);
    }
  };

  const copyUrl = (url) => {
    navigator.clipboard.writeText(window.location.origin + url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Filter banners
  const filteredBanners = banners.filter(b => {
    if (filterSize !== 'all' && b.size !== filterSize) return false;
    if (filterStyle !== 'all' && b.style !== filterStyle) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <Image className="text-brand-400" />
            Marketing Banners
          </h1>
          <p className="text-midnight-400 mt-1">Generate and manage promotional banners for social media</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={handleGenerateNewDeals}
            disabled={generating}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2 disabled:opacity-50"
          >
            {generating ? <RefreshCw className="animate-spin" size={18} /> : <Layers size={18} />}
            Auto-Generate
          </button>
          <button
            onClick={() => setShowGenerateModal(true)}
            className="px-4 py-2 bg-brand-500 text-white rounded-lg hover:bg-brand-600 flex items-center gap-2"
          >
            <Wand2 size={18} />
            Generate Banner
          </button>
        </div>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-4 gap-4">
          <div className="bg-midnight-800 rounded-xl p-4 border border-midnight-700">
            <div className="text-3xl font-bold text-white">{stats.total}</div>
            <div className="text-midnight-400 text-sm">Total Banners</div>
          </div>
          <div className="bg-midnight-800 rounded-xl p-4 border border-midnight-700">
            <div className="text-3xl font-bold text-green-400">{stats.today}</div>
            <div className="text-midnight-400 text-sm">Created Today</div>
          </div>
          <div className="bg-midnight-800 rounded-xl p-4 border border-midnight-700">
            <div className="text-3xl font-bold text-brand-400">{stats.bySize?.length || 0}</div>
            <div className="text-midnight-400 text-sm">Active Sizes</div>
          </div>
          <div className="bg-midnight-800 rounded-xl p-4 border border-midnight-700">
            <div className="text-3xl font-bold text-purple-400">{stats.byStyle?.length || 0}</div>
            <div className="text-midnight-400 text-sm">Active Styles</div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex items-center gap-4 bg-midnight-800 rounded-xl p-4 border border-midnight-700">
        <Filter size={18} className="text-midnight-400" />
        <select
          value={filterSize}
          onChange={e => setFilterSize(e.target.value)}
          className="bg-midnight-900 border border-midnight-700 rounded-lg px-3 py-2 text-white text-sm"
        >
          <option value="all">All Sizes</option>
          {Object.entries(SIZE_INFO).map(([key, info]) => (
            <option key={key} value={key}>{info.icon} {info.label}</option>
          ))}
        </select>
        <select
          value={filterStyle}
          onChange={e => setFilterStyle(e.target.value)}
          className="bg-midnight-900 border border-midnight-700 rounded-lg px-3 py-2 text-white text-sm"
        >
          <option value="all">All Styles</option>
          {Object.entries(STYLE_INFO).map(([key, info]) => (
            <option key={key} value={key}>{info.label}</option>
          ))}
        </select>
        <span className="text-midnight-400 text-sm ml-auto">
          Showing {filteredBanners.length} of {banners.length} banners
        </span>
      </div>

      {/* Banner Grid */}
      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="bg-midnight-800 rounded-xl p-4 animate-pulse">
              <div className="aspect-video bg-midnight-700 rounded-lg mb-4"></div>
              <div className="h-4 bg-midnight-700 rounded mb-2"></div>
              <div className="h-3 bg-midnight-700 rounded w-2/3"></div>
            </div>
          ))}
        </div>
      ) : filteredBanners.length === 0 ? (
        <div className="text-center py-20 bg-midnight-800 rounded-xl border border-midnight-700">
          <div className="text-6xl mb-4">🎨</div>
          <h3 className="text-xl font-semibold mb-2 text-white">No banners yet</h3>
          <p className="text-midnight-400 mb-4">Generate your first marketing banner!</p>
          <button
            onClick={() => setShowGenerateModal(true)}
            className="inline-flex items-center gap-2 bg-brand-500 text-white px-6 py-2 rounded-lg hover:bg-brand-600"
          >
            <Wand2 size={18} />
            Generate Banner
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filteredBanners.map(banner => (
            <BannerCard
              key={banner.id}
              banner={banner}
              onView={setViewingBanner}
              onCopyUrl={copyUrl}
            />
          ))}
        </div>
      )}

      {/* Modals */}
      {showGenerateModal && (
        <GenerateModal
          onClose={() => setShowGenerateModal(false)}
          onGenerate={handleGenerate}
        />
      )}
      
      {viewingBanner && (
        <ViewerModal
          banner={viewingBanner}
          onClose={() => setViewingBanner(null)}
        />
      )}

      {/* Copied Toast */}
      {copied && (
        <div className="fixed bottom-4 right-4 bg-green-600 text-white px-4 py-2 rounded-lg shadow-lg flex items-center gap-2 animate-fade-in">
          <Check size={18} />
          URL Copied!
        </div>
      )}
    </div>
  );
}

