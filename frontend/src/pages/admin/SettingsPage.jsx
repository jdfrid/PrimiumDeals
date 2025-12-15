import { useState, useEffect } from 'react';
import { Save, Mail, Globe, Percent, LayoutGrid, CheckCircle } from 'lucide-react';
import api from '../../services/api';

export default function SettingsPage() {
  const [settings, setSettings] = useState({
    contact_email: '',
    site_name: '',
    min_discount_display: '10',
    deals_per_page: '48'
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const data = await api.request('/admin/settings');
      setSettings(prev => ({ ...prev, ...data }));
    } catch (error) {
      console.error('Failed to load settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async () => {
    setSaving(true);
    setSaved(false);
    try {
      await api.request('/admin/settings', {
        method: 'PUT',
        body: JSON.stringify(settings)
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (error) {
      alert('Failed to save settings: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-gold-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold mb-1">Site Settings</h1>
          <p className="text-midnight-400">Configure your site settings</p>
        </div>
        <button 
          onClick={saveSettings} 
          disabled={saving}
          className="btn-gold flex items-center gap-2"
        >
          {saving ? (
            <div className="w-5 h-5 border-2 border-midnight-950 border-t-transparent rounded-full animate-spin" />
          ) : saved ? (
            <CheckCircle size={18} />
          ) : (
            <Save size={18} />
          )}
          {saved ? 'Saved!' : 'Save Settings'}
        </button>
      </div>

      <div className="space-y-6">
        {/* Contact Settings */}
        <div className="glass rounded-xl p-6">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Mail className="text-gold-400" size={20} />
            Contact Settings
          </h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-midnight-300 mb-2">
                Contact Email
              </label>
              <input
                type="email"
                value={settings.contact_email}
                onChange={(e) => setSettings({ ...settings, contact_email: e.target.value })}
                className="input-dark w-full max-w-md"
                placeholder="your@email.com"
              />
              <p className="text-xs text-midnight-500 mt-1">
                Contact form messages will be sent to this email
              </p>
            </div>
          </div>
        </div>

        {/* Site Settings */}
        <div className="glass rounded-xl p-6">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Globe className="text-blue-400" size={20} />
            Site Settings
          </h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-midnight-300 mb-2">
                Site Name
              </label>
              <input
                type="text"
                value={settings.site_name}
                onChange={(e) => setSettings({ ...settings, site_name: e.target.value })}
                className="input-dark w-full max-w-md"
                placeholder="Premium Deals"
              />
            </div>
          </div>
        </div>

        {/* Display Settings */}
        <div className="glass rounded-xl p-6">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <LayoutGrid className="text-green-400" size={20} />
            Display Settings
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-midnight-300 mb-2">
                <Percent size={14} className="inline mr-1" />
                Minimum Discount to Display (%)
              </label>
              <input
                type="number"
                value={settings.min_discount_display}
                onChange={(e) => setSettings({ ...settings, min_discount_display: e.target.value })}
                className="input-dark w-full"
                min="0"
                max="90"
              />
              <p className="text-xs text-midnight-500 mt-1">
                Only show deals with this discount or higher on the public site
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-midnight-300 mb-2">
                Deals Per Page
              </label>
              <select
                value={settings.deals_per_page}
                onChange={(e) => setSettings({ ...settings, deals_per_page: e.target.value })}
                className="input-dark w-full"
              >
                <option value="24">24</option>
                <option value="48">48</option>
                <option value="72">72</option>
                <option value="96">96</option>
              </select>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}


