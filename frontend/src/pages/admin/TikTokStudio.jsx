import { useCallback, useEffect, useState } from 'react';
import {
  Video,
  Play,
  RefreshCw,
  Download,
  Settings,
  LayoutGrid,
  Copy,
  CheckCircle,
  AlertCircle,
  Loader
} from 'lucide-react';
import api from '../../services/api';

const tabs = [
  { id: 'dashboard', label: 'Run / status', icon: Play },
  { id: 'library', label: 'Video library', icon: LayoutGrid },
  { id: 'config', label: 'Settings & keys', icon: Settings }
];

export default function TikTokStudio() {
  const [tab, setTab] = useState('dashboard');
  const [busy, setBusy] = useState(false);
  const [jobs, setJobs] = useState([]);
  const [settings, setSettings] = useState({
    tiktok_enabled: 'false',
    tiktok_openai_model: 'gpt-4o-mini',
    tiktok_tts_model: 'tts-1',
    tiktok_tts_voice: 'alloy',
    tiktok_cron: '0 8 * * *',
    tiktok_site_base_url: '',
    tiktok_min_discount: '15',
    tiktok_repeat_days: '14',
    tiktok_openai_key_configured: false
  });
  const [openaiKeyInput, setOpenaiKeyInput] = useState('');
  const [dealIdInput, setDealIdInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);
  const [selectedJob, setSelectedJob] = useState(null);
  const [retryingId, setRetryingId] = useState(null);

  const loadJobs = useCallback(async () => {
    const data = await api.getTikTokJobs(50);
    setJobs(data.jobs || []);
  }, []);

  const loadStatus = useCallback(async () => {
    const s = await api.getTikTokStatus();
    setBusy(!!s.busy);
  }, []);

  const loadSettings = useCallback(async () => {
    const data = await api.getTikTokSettings();
    setSettings(prev => ({ ...prev, ...data }));
  }, []);

  useEffect(() => {
    let cancel = false;
    (async () => {
      setLoading(true);
      try {
        await Promise.all([loadJobs(), loadSettings(), loadStatus()]);
      } catch (e) {
        if (!cancel) setMessage({ type: 'error', text: e.message });
      } finally {
        if (!cancel) setLoading(false);
      }
    })();
    return () => { cancel = true; };
  }, [loadJobs, loadSettings, loadStatus]);

  useEffect(() => {
    if (tab !== 'dashboard' && tab !== 'library') return undefined;
    const id = setInterval(() => {
      loadJobs().catch(() => {});
      loadStatus().catch(() => {});
    }, 4000);
    return () => clearInterval(id);
  }, [tab, loadJobs, loadStatus]);

  const saveConfig = async () => {
    setSaving(true);
    setMessage(null);
    try {
      const payload = { ...settings };
      if (openaiKeyInput.trim()) {
        payload.tiktok_openai_api_key = openaiKeyInput.trim();
      }
      await api.saveTikTokSettings(payload);
      setOpenaiKeyInput('');
      await loadSettings();
      setMessage({ type: 'ok', text: 'TikTok settings saved.' });
    } catch (e) {
      setMessage({ type: 'error', text: e.message });
    } finally {
      setSaving(false);
    }
  };

  const runJob = async () => {
    setMessage(null);
    try {
      const dealId = dealIdInput.trim() ? parseInt(dealIdInput.trim(), 10) : null;
      if (dealIdInput.trim() && Number.isNaN(dealId)) {
        setMessage({ type: 'error', text: 'Deal ID must be a number' });
        return;
      }
      const r = await api.runTikTokJob(dealId);
      setMessage({ type: 'ok', text: `Job #${r.jobId} started. Polls below refresh every few seconds.` });
      setBusy(true);
      await loadJobs();
    } catch (e) {
      setMessage({ type: 'error', text: e.message });
    }
  };

  const openDetail = async id => {
    setMessage(null);
    try {
      const data = await api.getTikTokJob(id);
      setSelectedJob(data.job);
    } catch (e) {
      setMessage({ type: 'error', text: e.message });
    }
  };

  const retryJob = async id => {
    setRetryingId(id);
    setMessage(null);
    try {
      await api.retryTikTokJob(id);
      setMessage({ type: 'ok', text: `Job #${id} rerun started.` });
      setSelectedJob(null);
      setBusy(true);
      await loadJobs();
    } catch (e) {
      setMessage({ type: 'error', text: e.message });
    } finally {
      setRetryingId(null);
    }
  };

  const copyText = text => {
    navigator.clipboard.writeText(text);
    setMessage({ type: 'ok', text: 'Copied.' });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-10 h-10 border-4 border-gold-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold mb-1 flex items-center gap-2">
            <Video className="text-gold-400" size={28} />
            TikTok video engine
          </h1>
          <p className="text-midnight-400">
            Daily 9:16 MP4 + English script & voice (OpenAI). Keys live in settings below — not in the frontend bundle.
          </p>
        </div>
        {busy && (
          <div className="flex items-center gap-2 text-amber-400 text-sm">
            <Loader className="animate-spin" size={18} />
            Rendering… (may take a few minutes)
          </div>
        )}
      </div>

      {message && (
        <div
          className={`mb-4 rounded-lg px-4 py-3 flex items-center gap-2 ${
            message.type === 'ok' ? 'bg-emerald-500/15 text-emerald-300' : 'bg-red-500/15 text-red-300'
          }`}
        >
          {message.type === 'ok' ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
          {message.text}
        </div>
      )}

      <div className="flex flex-wrap gap-2 mb-6">
        {tabs.map(t => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              tab === t.id
                ? 'bg-gold-500 text-midnight-950'
                : 'bg-midnight-800 text-midnight-200 hover:bg-midnight-700'
            }`}
          >
            <t.icon size={18} />
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'dashboard' && (
        <div className="grid lg:grid-cols-2 gap-6">
          <div className="glass rounded-xl p-6 space-y-4">
            <h2 className="text-lg font-semibold">Manual run</h2>
            <p className="text-sm text-midnight-400">
              Leave deal empty for automatic pick (discount + image + anti-repeat). One job at a time.
            </p>
            <div>
              <label className="block text-sm text-midnight-300 mb-1">Optional deal ID</label>
              <input
                className="input-dark w-full max-w-xs"
                value={dealIdInput}
                onChange={e => setDealIdInput(e.target.value)}
                placeholder="e.g. 42"
              />
            </div>
            <button
              type="button"
              className="btn-gold flex items-center gap-2 disabled:opacity-50"
              onClick={runJob}
              disabled={busy}
            >
              <Play size={18} />
              Generate TikTok video
            </button>
          </div>
          <div className="glass rounded-xl p-6 space-y-2">
            <h2 className="text-lg font-semibold">Latest jobs</h2>
            {(jobs.slice(0, 8)).map(j => (
              <button
                type="button"
                key={j.id}
                className="w-full text-left flex items-center justify-between gap-2 py-2 px-3 rounded-lg bg-midnight-800/50 hover:bg-midnight-800"
                onClick={() => openDetail(j.id)}
              >
                <span className="truncate text-sm">#{j.id} · {j.deal_title}</span>
                <span className="text-xs uppercase shrink-0 text-midnight-400">{j.status}</span>
              </button>
            ))}
            {jobs.length === 0 && <p className="text-midnight-500 text-sm">No jobs yet.</p>}
          </div>
        </div>
      )}

      {tab === 'library' && (
        <div className="glass rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-midnight-800/80 text-left text-midnight-400">
                <tr>
                  <th className="p-3">ID</th>
                  <th className="p-3">Deal</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Created</th>
                  <th className="p-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {jobs.map(j => (
                  <tr key={j.id} className="border-t border-midnight-700/80">
                    <td className="p-3 font-mono">{j.id}</td>
                    <td className="p-3 max-w-xs truncate">{j.deal_title}</td>
                    <td className="p-3">{j.status}</td>
                    <td className="p-3 text-midnight-400">{j.created_at}</td>
                    <td className="p-3 flex flex-wrap gap-2">
                      <button type="button" className="text-gold-400 hover:underline" onClick={() => openDetail(j.id)}>
                        Details
                      </button>
                      {j.status === 'completed' && j.file_path && (
                        <button
                          type="button"
                          className="text-gold-400 hover:underline flex items-center gap-1"
                          onClick={() => api.downloadTikTokVideo(j.id).catch(e => setMessage({ type: 'error', text: e.message }))}
                        >
                          <Download size={14} />
                          MP4
                        </button>
                      )}
                      {j.status === 'failed' && (
                        <button
                          type="button"
                          className="text-amber-400 hover:underline flex items-center gap-1"
                          disabled={retryingId === j.id || busy}
                          onClick={() => retryJob(j.id)}
                        >
                          <RefreshCw size={14} className={retryingId === j.id ? 'animate-spin' : ''} />
                          Retry
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'config' && (
        <div className="glass rounded-xl p-6 space-y-4 max-w-2xl">
          <h2 className="text-lg font-semibold">Backend-managed configuration</h2>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={settings.tiktok_enabled === 'true'}
              onChange={e => setSettings({ ...settings, tiktok_enabled: e.target.checked ? 'true' : 'false' })}
            />
            <span>Enable daily automated run (cron below)</span>
          </label>
          <div>
            <label className="block text-sm text-midnight-300 mb-1">OpenAI API key</label>
            <p className="text-xs text-midnight-500 mb-1">
              {settings.tiktok_openai_key_configured ? 'Key is stored. Paste a new key only to replace it.' : 'Not configured yet.'}
            </p>
            <input
              type="password"
              className="input-dark w-full font-mono text-sm"
              value={openaiKeyInput}
              onChange={e => setOpenaiKeyInput(e.target.value)}
              placeholder="sk-…"
              autoComplete="off"
            />
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-midnight-300 mb-1">Chat model</label>
              <input
                className="input-dark w-full"
                value={settings.tiktok_openai_model}
                onChange={e => setSettings({ ...settings, tiktok_openai_model: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm text-midnight-300 mb-1">TTS model</label>
              <input
                className="input-dark w-full"
                value={settings.tiktok_tts_model}
                onChange={e => setSettings({ ...settings, tiktok_tts_model: e.target.value })}
              />
            </div>
          </div>
          <div>
            <label className="block text-sm text-midnight-300 mb-1">TTS voice</label>
            <select
              className="input-dark w-full max-w-md"
              value={settings.tiktok_tts_voice}
              onChange={e => setSettings({ ...settings, tiktok_tts_voice: e.target.value })}
            >
              {['alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer'].map(v => (
                <option key={v} value={v}>{v}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm text-midnight-300 mb-1">Cron (server time)</label>
            <input
              className="input-dark w-full font-mono"
              value={settings.tiktok_cron}
              onChange={e => setSettings({ ...settings, tiktok_cron: e.target.value })}
            />
            <p className="text-xs text-midnight-500 mt-1">Example: 0 8 * * * — daily 08:00. Saved cron reapplies without restart.</p>
          </div>
          <div>
            <label className="block text-sm text-midnight-300 mb-1">Public site base URL (UTM / track links)</label>
            <input
              className="input-dark w-full"
              value={settings.tiktok_site_base_url}
              onChange={e => setSettings({ ...settings, tiktok_site_base_url: e.target.value })}
              placeholder="https://your-domain.com"
            />
            <p className="text-xs text-midnight-500 mt-1">If empty, uses PUBLIC_SITE_URL env or dealsluxy.com fallback.</p>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-midnight-300 mb-1">Min discount %</label>
              <input
                type="number"
                className="input-dark w-full"
                value={settings.tiktok_min_discount}
                onChange={e => setSettings({ ...settings, tiktok_min_discount: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm text-midnight-300 mb-1">Anti-repeat (days)</label>
              <input
                type="number"
                className="input-dark w-full"
                value={settings.tiktok_repeat_days}
                onChange={e => setSettings({ ...settings, tiktok_repeat_days: e.target.value })}
              />
            </div>
          </div>
          <button type="button" className="btn-gold" onClick={saveConfig} disabled={saving}>
            {saving ? 'Saving…' : 'Save TikTok settings'}
          </button>
        </div>
      )}

      {selectedJob && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70" onClick={() => setSelectedJob(null)}>
          <div
            className="glass rounded-xl max-w-lg w-full p-6 max-h-[85vh] overflow-y-auto"
            onClick={e => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold mb-2">Job #{selectedJob.id}</h3>
            <div className="space-y-2 text-sm text-midnight-300">
              <p><span className="text-midnight-500">Status:</span> {selectedJob.status}</p>
              <p><span className="text-midnight-500">Deal:</span> {selectedJob.deal_title}</p>
              {selectedJob.error_message && (
                <p className="text-red-400"><span className="text-midnight-500">Error:</span> {selectedJob.error_message}</p>
              )}
              {selectedJob.hook_text && <p><span className="text-midnight-500">Hook:</span> {selectedJob.hook_text}</p>}
              {selectedJob.caption && (
                <div>
                  <span className="text-midnight-500">Caption + tags:</span>
                  <pre className="mt-1 whitespace-pre-wrap text-xs bg-midnight-900/80 p-2 rounded">{selectedJob.caption}</pre>
                  <button type="button" className="text-gold-400 text-xs mt-1 flex items-center gap-1" onClick={() => copyText(selectedJob.caption)}>
                    <Copy size={12} /> Copy
                  </button>
                </div>
              )}
              {selectedJob.tracking_url && (
                <div>
                  <span className="text-midnight-500">Tracking URL:</span>
                  <div className="text-xs break-all text-gold-300/90 mt-1">{selectedJob.tracking_url}</div>
                  <button type="button" className="text-gold-400 text-xs mt-1 flex items-center gap-1" onClick={() => copyText(selectedJob.tracking_url)}>
                    <Copy size={12} /> Copy link
                  </button>
                </div>
              )}
            </div>
            <div className="flex gap-3 mt-6">
              <button type="button" className="btn-gold flex-1" onClick={() => setSelectedJob(null)}>Close</button>
              {selectedJob.status === 'completed' && selectedJob.file_path && (
                <button
                  type="button"
                  className="btn-gold flex-1 flex items-center justify-center gap-2"
                  onClick={() => api.downloadTikTokVideo(selectedJob.id).catch(e => setMessage({ type: 'error', text: e.message }))}
                >
                  <Download size={18} /> Download MP4
                </button>
              )}
              {selectedJob.status === 'failed' && (
                <button
                  type="button"
                  className="flex-1 border border-amber-500/50 text-amber-300 rounded-lg px-4 py-2 flex items-center justify-center gap-2"
                  disabled={!!retryingId || busy}
                  onClick={() => retryJob(selectedJob.id)}
                >
                  <RefreshCw size={18} className={retryingId === selectedJob.id ? 'animate-spin' : ''} />
                  Retry
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
