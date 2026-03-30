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
  Loader,
  Share2
} from 'lucide-react';
import api from '../../services/api';

const tabs = [
  { id: 'dashboard', label: 'Create video', icon: Play },
  { id: 'library', label: 'Video library', icon: LayoutGrid },
  { id: 'tiktok', label: 'TikTok (publish)', icon: Share2 },
  { id: 'config', label: 'Settings & keys', icon: Settings }
];

/** Keys persisted by PUT /admin/tiktok/settings (must match backend). Never include *_configured or secrets from state. */
const SETTINGS_PAYLOAD_KEYS = [
  'video_engine_auto_enabled',
  'video_utm_source',
  'video_llm_provider',
  'video_tts_provider',
  'gemini_model',
  'edge_tts_voice',
  'tiktok_enabled',
  'tiktok_openai_model',
  'tiktok_tts_model',
  'tiktok_tts_voice',
  'tiktok_cron',
  'tiktok_site_base_url',
  'tiktok_min_discount',
  'tiktok_repeat_days'
];

export default function TikTokStudio() {
  const [tab, setTab] = useState('dashboard');
  const [busy, setBusy] = useState(false);
  const [jobs, setJobs] = useState([]);
  const [settings, setSettings] = useState({
    video_engine_auto_enabled: 'false',
    video_utm_source: 'short_video',
    video_llm_provider: 'template',
    video_tts_provider: 'edge',
    gemini_model: 'gemini-2.0-flash',
    edge_tts_voice: 'en-US-AriaNeural',
    tiktok_enabled: 'false',
    tiktok_openai_model: 'gpt-4o-mini',
    tiktok_tts_model: 'tts-1',
    tiktok_tts_voice: 'alloy',
    tiktok_cron: '0 8 * * *',
    tiktok_site_base_url: '',
    tiktok_min_discount: '15',
    tiktok_repeat_days: '14',
    tiktok_openai_key_configured: false,
    gemini_key_configured: false
  });
  const [openaiKeyInput, setOpenaiKeyInput] = useState('');
  const [geminiKeyInput, setGeminiKeyInput] = useState('');
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
    const s = await api.getVideoEngineStatus();
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
    if (tab !== 'dashboard' && tab !== 'library' && tab !== 'tiktok') return undefined;
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
      const payload = {};
      for (const k of SETTINGS_PAYLOAD_KEYS) {
        const v = settings[k];
        if (v === undefined || v === null) continue;
        payload[k] = typeof v === 'boolean' ? (v ? 'true' : 'false') : String(v);
      }
      if (openaiKeyInput.trim()) {
        payload.tiktok_openai_api_key = openaiKeyInput.trim();
      }
      if (geminiKeyInput.trim()) {
        payload.gemini_api_key = geminiKeyInput.trim();
      }
      if (
        (settings.video_llm_provider || 'template') === 'gemini' &&
        !geminiKeyInput.trim() &&
        !settings.gemini_key_configured
      ) {
        setMessage({ type: 'error', text: 'נא להדביק את מפתח ה-Gemini (AIza…) לפני שמירה.' });
        setSaving(false);
        return;
      }
      await api.saveTikTokSettings(payload);
      setOpenaiKeyInput('');
      setGeminiKeyInput('');
      await loadSettings();
      setMessage({ type: 'ok', text: 'Settings saved.' });
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
      const r = await api.runVideoEngineJob(dealId);
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
            Short-form video engine
          </h1>
          <p className="text-midnight-400">
            Create 9:16 MP4 + English voiceover here. Default mode uses a <strong>free template script</strong> and <strong>Edge TTS (no API key)</strong> — configure in Settings. Optional: Google Gemini (free API key) or OpenAI for richer copy.
            Posting to TikTok remains separate — see “TikTok (publish)”.
          </p>
          <p className="text-sm text-midnight-300 mt-2 rounded-lg bg-midnight-800/60 border border-midnight-600/50 px-3 py-2" dir="rtl">
            <strong className="text-gold-400">איפה מפעילים:</strong> טאב <strong>Create video</strong> (הרצה ידנית) או מעמוד{' '}
            <a href="/admin/deals" className="text-gold-400 underline">Deals</a> — כפתור <strong>Make video</strong> ליד כל מוצר. אוטומציה יומית: טאב <strong>Settings</strong> ← סמן “Automatic daily video”.
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

      {tab === 'tiktok' && (
        <div className="glass rounded-xl p-6 max-w-2xl space-y-3">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Share2 className="text-gold-400" size={22} />
            TikTok distribution
          </h2>
          <p className="text-sm text-midnight-300">
            The app does <strong>not</strong> upload to TikTok automatically. You generate the asset in “Create video” or from <strong>Deals</strong> (film icon per row), then download the MP4 from the library and publish in TikTok yourself.
          </p>
          <p className="text-sm text-midnight-500">
            A future step can add TikTok API / OAuth here without changing how videos are rendered.
          </p>
        </div>
      )}

      {tab === 'dashboard' && (
        <div className="grid lg:grid-cols-2 gap-6">
          <div className="glass rounded-xl p-6 space-y-4">
            <h2 className="text-lg font-semibold">Manual video run</h2>
            <p className="text-sm text-midnight-400">
              Leave deal empty to auto-pick a strong listing (min discount + anti-repeat). Or enter a deal ID for <strong>that item only</strong> — no extra discount rule. You can also start from <strong>Deals</strong> with the film icon. One render at a time.
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
              checked={settings.video_engine_auto_enabled === 'true'}
              onChange={e =>
                setSettings({ ...settings, video_engine_auto_enabled: e.target.checked ? 'true' : 'false' })
              }
            />
            <span>Automatic daily video (one MP4 per run — generates only, does not post anywhere)</span>
          </label>
          <p className="text-xs text-midnight-500 -mt-2">
            Uses cron below, min discount, and anti-repeat. Manual runs and per-deal buttons work even when this is off.
            If you previously used “tiktok enabled” only, turn this on — legacy <code className="text-midnight-400">tiktok_enabled=true</code> still enables automation until you set this explicitly.
          </p>
          <div>
            <label className="block text-sm text-midnight-300 mb-1">UTM source for tracking links in captions</label>
            <input
              className="input-dark w-full font-mono max-w-md"
              value={settings.video_utm_source || 'short_video'}
              onChange={e => setSettings({ ...settings, video_utm_source: e.target.value })}
              placeholder="short_video"
            />
            <p className="text-xs text-midnight-500 mt-1">Example: short_video, instagram, tiktok_manual — used in <code className="text-midnight-400">utm_source</code> on click tracking URLs.</p>
          </div>

          <div className="border border-midnight-600 rounded-lg p-4 space-y-4 bg-midnight-900/20">
            <h3 className="text-sm font-semibold text-gold-300">Script (LLM) — no OpenAI required</h3>
            <p className="text-xs text-midnight-400" dir="rtl">
              ברירת מחדל: <strong>Template</strong> = תסריט אנגלית אוטומטי מהמחיר והכותרת (בלי API).
              <strong> Gemini</strong> = טקסט חכם יותר עם מפתח חינמי מ־
              <a href="https://aistudio.google.com/apikey" className="text-gold-400 underline" target="_blank" rel="noreferrer">Google AI Studio</a>.
            </p>
            <div>
              <label className="block text-sm text-midnight-300 mb-1">Script source</label>
              <select
                className="input-dark w-full max-w-lg"
                value={settings.video_llm_provider || 'template'}
                onChange={e => setSettings({ ...settings, video_llm_provider: e.target.value })}
              >
                <option value="template">Template (free, no API)</option>
                <option value="gemini">Google Gemini (free tier API key)</option>
                <option value="openai">OpenAI</option>
              </select>
              <p className="text-xs text-midnight-500 mt-1">
                If Gemini or OpenAI returns a quota / rate limit (429), this run automatically uses the free Template script so the MP4 still renders.
              </p>
            </div>
            {(settings.video_llm_provider || 'template') === 'gemini' && (
              <>
                <div>
                  <label className="block text-sm text-midnight-300 mb-1">Gemini API key</label>
                  <p className="text-xs text-midnight-500 mb-1">
                    {settings.gemini_key_configured ? 'Key saved — paste only to replace.' : 'Not set.'}
                  </p>
                  <input
                    type="text"
                    className="input-dark w-full font-mono text-sm"
                    value={geminiKeyInput}
                    onChange={e => setGeminiKeyInput(e.target.value)}
                    placeholder="AIza…"
                    autoComplete="off"
                    data-lpignore="true"
                    data-1p-ignore="true"
                    spellCheck={false}
                  />
                </div>
                <div>
                  <label className="block text-sm text-midnight-300 mb-1">Gemini model id</label>
                  <input
                    className="input-dark w-full font-mono max-w-lg"
                    value={settings.gemini_model || 'gemini-2.0-flash'}
                    onChange={e => setSettings({ ...settings, gemini_model: e.target.value })}
                    placeholder="gemini-2.0-flash"
                  />
                  <p className="text-xs text-midnight-500 mt-1">Try gemini-2.0-flash or gemini-1.5-flash if a model is unavailable in your region.</p>
                </div>
              </>
            )}
            {(settings.video_llm_provider || 'template') === 'openai' && (
              <>
                <div>
                  <label className="block text-sm text-midnight-300 mb-1">OpenAI API key</label>
                  <p className="text-xs text-midnight-500 mb-1">
                    {settings.tiktok_openai_key_configured ? 'Key stored.' : 'Not configured.'}
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
                <div>
                  <label className="block text-sm text-midnight-300 mb-1">OpenAI chat model</label>
                  <input
                    className="input-dark w-full max-w-md"
                    value={settings.tiktok_openai_model}
                    onChange={e => setSettings({ ...settings, tiktok_openai_model: e.target.value })}
                  />
                </div>
              </>
            )}
          </div>

          <div className="border border-midnight-600 rounded-lg p-4 space-y-4 bg-midnight-900/20">
            <h3 className="text-sm font-semibold text-gold-300">Voice (TTS)</h3>
            <p className="text-xs text-midnight-400" dir="rtl">
              ברירת מחדל: <strong>Microsoft Edge TTS</strong> (ללא מפתח). לשימוש מסחרי בדוק את תנאי השירות של מיקרוסoft.
            </p>
            <div>
              <label className="block text-sm text-midnight-300 mb-1">TTS engine</label>
              <select
                className="input-dark w-full max-w-lg"
                value={settings.video_tts_provider || 'edge'}
                onChange={e => setSettings({ ...settings, video_tts_provider: e.target.value })}
              >
                <option value="edge">Edge / Bing online (no API key)</option>
                <option value="openai">OpenAI speech (needs OpenAI key)</option>
              </select>
              <p className="text-xs text-midnight-500 mt-1">
                On many hosts Edge TTS returns 403 — the backend then tries free Google Translate–style TTS (basic quality). For best reliability, save an OpenAI key; we use it automatically when Edge fails.
              </p>
            </div>
            {(settings.video_tts_provider || 'edge') === 'edge' && (
              <div>
                <label className="block text-sm text-midnight-300 mb-1">Edge voice id (English)</label>
                <select
                  className="input-dark w-full max-w-lg font-mono text-sm"
                  value={settings.edge_tts_voice || 'en-US-AriaNeural'}
                  onChange={e => setSettings({ ...settings, edge_tts_voice: e.target.value })}
                >
                  {['en-US-AriaNeural', 'en-US-GuyNeural', 'en-US-JennyNeural', 'en-GB-SoniaNeural', 'en-AU-NatashaNeural'].map(v => (
                    <option key={v} value={v}>{v}</option>
                  ))}
                </select>
              </div>
            )}
            {(settings.video_tts_provider || 'edge') === 'openai' && (
              <div className="space-y-4">
                {(settings.video_llm_provider || 'template') !== 'openai' && (
                  <div>
                    <label className="block text-sm text-midnight-300 mb-1">OpenAI API key (for TTS)</label>
                    <p className="text-xs text-midnight-500 mb-1">
                      {settings.tiktok_openai_key_configured ? 'Key stored — paste to replace.' : 'Required for OpenAI speech.'}
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
                )}
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-midnight-300 mb-1">OpenAI TTS model</label>
                    <input
                      className="input-dark w-full"
                      value={settings.tiktok_tts_model}
                      onChange={e => setSettings({ ...settings, tiktok_tts_model: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-midnight-300 mb-1">OpenAI TTS voice</label>
                    <select
                      className="input-dark w-full"
                      value={settings.tiktok_tts_voice}
                      onChange={e => setSettings({ ...settings, tiktok_tts_voice: e.target.value })}
                    >
                      {['alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer'].map(v => (
                        <option key={v} value={v}>{v}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            )}
          </div>
          <div>
            <label className="block text-sm text-midnight-300 mb-1">Cron (server time)</label>
            <input
              className="input-dark w-full font-mono"
              value={settings.tiktok_cron}
              onChange={e => setSettings({ ...settings, tiktok_cron: e.target.value })}
            />
            <p className="text-xs text-midnight-500 mt-1">Example: 0 8 * * * — daily 08:00 (server/UTC). Applies only when automatic daily video is enabled.</p>
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
            {saving ? 'Saving…' : 'Save video engine settings'}
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
