import { useState, useEffect } from 'react';
import { Save, Plus, Trash2, ExternalLink, Key, Settings, ShoppingBag } from 'lucide-react';
import api from '../../services/api';

const providerIcons = {
  ebay: '🛒',
  amazon: '📦',
  aliexpress: '🌏'
};

const providerColors = {
  ebay: 'bg-blue-500',
  amazon: 'bg-orange-500',
  aliexpress: 'bg-red-500'
};

export default function ProvidersManager() {
  const [providers, setProviders] = useState([
    {
      id: 'ebay',
      name: 'eBay',
      enabled: true,
      appId: '',
      campaignId: '',
      devId: '',
      certId: ''
    },
    {
      id: 'amazon',
      name: 'Amazon',
      enabled: false,
      accessKey: '',
      secretKey: '',
      partnerId: '',
      region: 'US'
    },
    {
      id: 'aliexpress',
      name: 'AliExpress',
      enabled: false,
      appKey: '',
      appSecret: '',
      trackingId: ''
    }
  ]);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);

  useEffect(() => {
    loadProviders();
  }, []);

  const loadProviders = async () => {
    try {
      const data = await api.getProviders();
      if (data && data.length > 0) {
        setProviders(data);
      }
    } catch (error) {
      // Use default providers if API fails
      console.log('Using default provider settings');
    }
  };

  const handleProviderChange = (providerId, field, value) => {
    setProviders(prev => prev.map(p => 
      p.id === providerId ? { ...p, [field]: value } : p
    ));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.saveProviders(providers);
      setMessage({ type: 'success', text: 'Provider settings saved successfully!' });
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to save settings. Please try again.' });
    }
    setSaving(false);
    setTimeout(() => setMessage(null), 3000);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Provider Settings</h1>
          <p className="text-gray-400">Configure API credentials for deal providers</p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 bg-gradient-to-r from-green-500 to-emerald-500 text-white px-4 py-2 rounded-lg hover:from-green-600 hover:to-emerald-600 transition-all disabled:opacity-50"
        >
          <Save size={18} />
          {saving ? 'Saving...' : 'Save All Settings'}
        </button>
      </div>

      {/* Message */}
      {message && (
        <div className={`p-4 rounded-lg ${message.type === 'success' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
          {message.text}
        </div>
      )}

      {/* Providers */}
      <div className="space-y-6">
        {providers.map(provider => (
          <div key={provider.id} className="glass rounded-xl overflow-hidden">
            {/* Provider Header */}
            <div className={`${providerColors[provider.id]} px-6 py-4 flex items-center justify-between`}>
              <div className="flex items-center gap-3">
                <span className="text-2xl">{providerIcons[provider.id]}</span>
                <div>
                  <h2 className="text-xl font-bold text-white">{provider.name}</h2>
                  <p className="text-white/80 text-sm">
                    {provider.id === 'ebay' && 'eBay Partner Network'}
                    {provider.id === 'amazon' && 'Amazon Associates Program'}
                    {provider.id === 'aliexpress' && 'AliExpress Affiliate Program'}
                  </p>
                </div>
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <span className="text-white text-sm">{provider.enabled ? 'Enabled' : 'Disabled'}</span>
                <div className="relative">
                  <input
                    type="checkbox"
                    checked={provider.enabled}
                    onChange={(e) => handleProviderChange(provider.id, 'enabled', e.target.checked)}
                    className="sr-only"
                  />
                  <div className={`w-12 h-6 rounded-full transition-colors ${provider.enabled ? 'bg-white' : 'bg-white/30'}`}>
                    <div className={`w-5 h-5 rounded-full bg-gray-800 shadow-md transform transition-transform ${provider.enabled ? 'translate-x-6' : 'translate-x-0.5'} mt-0.5`} />
                  </div>
                </div>
              </label>
            </div>

            {/* Provider Settings */}
            <div className="p-6">
              {provider.id === 'ebay' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">App ID (Client ID)</label>
                    <input
                      type="text"
                      value={provider.appId}
                      onChange={(e) => handleProviderChange('ebay', 'appId', e.target.value)}
                      placeholder="your-app-id"
                      className="w-full input-dark"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">Campaign ID</label>
                    <input
                      type="text"
                      value={provider.campaignId}
                      onChange={(e) => handleProviderChange('ebay', 'campaignId', e.target.value)}
                      placeholder="5339122678"
                      className="w-full input-dark"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">Dev ID (Optional)</label>
                    <input
                      type="text"
                      value={provider.devId}
                      onChange={(e) => handleProviderChange('ebay', 'devId', e.target.value)}
                      placeholder="your-dev-id"
                      className="w-full input-dark"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">Cert ID (Optional)</label>
                    <input
                      type="text"
                      value={provider.certId}
                      onChange={(e) => handleProviderChange('ebay', 'certId', e.target.value)}
                      placeholder="your-cert-id"
                      className="w-full input-dark"
                    />
                  </div>
                </div>
              )}

              {provider.id === 'amazon' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">Access Key</label>
                    <input
                      type="text"
                      value={provider.accessKey}
                      onChange={(e) => handleProviderChange('amazon', 'accessKey', e.target.value)}
                      placeholder="AKIA..."
                      className="w-full input-dark"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">Secret Key</label>
                    <input
                      type="password"
                      value={provider.secretKey}
                      onChange={(e) => handleProviderChange('amazon', 'secretKey', e.target.value)}
                      placeholder="••••••••"
                      className="w-full input-dark"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">Partner/Associate ID</label>
                    <input
                      type="text"
                      value={provider.partnerId}
                      onChange={(e) => handleProviderChange('amazon', 'partnerId', e.target.value)}
                      placeholder="your-associate-id"
                      className="w-full input-dark"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">Region</label>
                    <select
                      value={provider.region}
                      onChange={(e) => handleProviderChange('amazon', 'region', e.target.value)}
                      className="w-full input-dark"
                    >
                      <option value="US">United States</option>
                      <option value="UK">United Kingdom</option>
                      <option value="DE">Germany</option>
                      <option value="FR">France</option>
                      <option value="JP">Japan</option>
                    </select>
                  </div>
                </div>
              )}

              {provider.id === 'aliexpress' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">App Key</label>
                    <input
                      type="text"
                      value={provider.appKey}
                      onChange={(e) => handleProviderChange('aliexpress', 'appKey', e.target.value)}
                      placeholder="your-app-key"
                      className="w-full input-dark"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">App Secret</label>
                    <input
                      type="password"
                      value={provider.appSecret}
                      onChange={(e) => handleProviderChange('aliexpress', 'appSecret', e.target.value)}
                      placeholder="••••••••"
                      className="w-full input-dark"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-400 mb-2">Tracking ID</label>
                    <input
                      type="text"
                      value={provider.trackingId}
                      onChange={(e) => handleProviderChange('aliexpress', 'trackingId', e.target.value)}
                      placeholder="your-tracking-id"
                      className="w-full input-dark"
                    />
                  </div>
                </div>
              )}

              {/* Help Link */}
              <div className="mt-4 pt-4 border-t border-gray-700">
                <a
                  href={
                    provider.id === 'ebay' ? 'https://developer.ebay.com/my/keys' :
                    provider.id === 'amazon' ? 'https://affiliate-program.amazon.com/' :
                    'https://portals.aliexpress.com/'
                  }
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-sm text-blue-400 hover:text-blue-300 transition-colors"
                >
                  <ExternalLink size={14} />
                  Get your {provider.name} API credentials
                </a>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Note */}
      <div className="glass rounded-xl p-6">
        <h3 className="font-bold text-white mb-2">📝 Note</h3>
        <p className="text-gray-400 text-sm">
          Currently, only eBay is fully implemented. Amazon and AliExpress integrations are coming soon. 
          You can save your credentials now and they will be used once the integrations are ready.
        </p>
      </div>
    </div>
  );
}






