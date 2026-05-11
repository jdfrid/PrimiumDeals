import { useCallback, useEffect, useState } from 'react';
import {
  Sparkles,
  RefreshCw,
  CheckCircle,
  AlertCircle,
  Loader,
  ExternalLink,
  Settings,
  LayoutGrid,
  Clapperboard,
  Copy
} from 'lucide-react';
import api from '../../services/api';

const UI_API_ORIGIN = (import.meta.env.VITE_API_URL || '').trim().replace(/\/$/, '');

/** Absolute URL for completed creative outputs (Shotstack CDN or same-origin Magnific merged path). */
function resolveCreativeOutputUrl(u) {
  if (!u || typeof u !== 'string') return '';
  if (/^https?:\/\//i.test(u)) return u;
  if (u.startsWith('/api')) return UI_API_ORIGIN ? `${UI_API_ORIGIN}${u}` : u;
  return u;
}

const tabs = [
  { id: 'brief', label: 'יצירת סרטון', icon: Clapperboard },
  { id: 'jobs', label: 'היסטוריית Jobs', icon: LayoutGrid },
  { id: 'settings', label: 'הגדרות סטודיו', icon: Settings }
];

const SETTINGS_PAYLOAD_KEYS = [
  'creative_llm_provider',
  'creative_gemini_model',
  'creative_openai_model',
  'creative_video_provider',
  'creative_video_auto_enabled',
  'creative_video_cron',
  'creative_auto_description',
  'creative_auto_tone'
];

function urlTailLabel(u) {
  if (!u || typeof u !== 'string') return '';
  try {
    const path = new URL(u).pathname;
    const last = path.split('/').filter(Boolean).pop() || '';
    return last.length > 64 ? `${last.slice(0, 64)}…` : last;
  } catch {
    const s = u.replace(/\?.*$/, '');
    return s.length > 48 ? `…${s.slice(-48)}` : s;
  }
}

function normalizeCreateJobId(res) {
  const raw = res?.jobId ?? res?.job_id ?? res?.data?.jobId;
  if (raw == null || raw === '') return null;
  const n = typeof raw === 'number' ? raw : parseInt(String(raw), 10);
  return Number.isFinite(n) ? n : null;
}

function formatCleanDeliveryPlain(clean) {
  if (!clean || typeof clean !== 'object') return '';
  const caps = (clean.on_screen_captions || [])
    .map(s => `• ${Number(s.start_sec) || 0}s +${Number(s.duration_sec) || 0}s — ${s.text}`)
    .join('\n');
  const mats = clean.material_context || {};
  const matLines = [];
  for (const q of mats.pexels_search_queries || []) matLines.push(`• חיפוש Pexels: ${q}`);
  if (mats.character_image_url) matLines.push(`• תמונת דמות: ${mats.character_image_url}`);
  if (Array.isArray(mats.timeline_stock_video_urls) && mats.timeline_stock_video_urls.length) {
    matLines.push('• קליפי וידאו בטיימליין (מאגר מלאי):');
    mats.timeline_stock_video_urls.forEach((u, i) => matLines.push(`  ${i + 1}. ${u}`));
  }
  matLines.push(`• קול TTS: ${mats.shotstack_voice || ''} / ${mats.tts_language || ''}`);
  if (mats.production_notes) matLines.push(`• הערות הפקה (לא נכנסות לקריין): ${mats.production_notes}`);

  const kling = (clean.kling_scenes || [])
    .map(
      s =>
        `${s.label_he || s.role} (~${s.target_seconds_hint ?? '?'}s)\n` +
        `  נרטיב: ${s.narrative_beat}\n` +
        `  פרומפט ויזואלי (Kling 2.5 / Magnific / Freepik):\n  ${s.visual_prompt}`
    )
    .join('\n\n');

  return [
    'קריין',
    clean.voiceover_script || '',
    '',
    'שורת Hook',
    clean.hook_line || '—',
    '',
    'כיתובים על המסך',
    caps || '—',
    '',
    'הקשר חומרים',
    matLines.length ? matLines.join('\n') : '—',
    '',
    'שלוש סצנות גנרטיביות (~30 שניות סה״כ)',
    kling || '—',
    '',
    clean.pipeline_hint ? `זרימה: ${clean.pipeline_hint}` : ''
  ]
    .join('\n')
    .trim();
}

function CleanDeliveryBundleField({ clean, job }) {
  const [copiedPlain, setCopiedPlain] = useState(false);
  const [copiedJson, setCopiedJson] = useState(false);

  const plain = formatCleanDeliveryPlain(clean);
  const json = clean ? JSON.stringify(clean, null, 2) : '';

  const placeholder =
    !clean && job?.status === 'processing'
      ? 'מעבד תסריט וחומרים…'
      : !clean && job?.status === 'pending'
        ? 'ממתין בתור…'
        : !clean
          ? '— יופיע אחרי שנוצר התסריט (צריך job חדש אחרי העדכון, או טען מחדש job שהושלם).'
          : '';

  const copyPlain = () => {
    if (!plain) return;
    navigator.clipboard.writeText(plain).then(() => {
      setCopiedPlain(true);
      setTimeout(() => setCopiedPlain(false), 2000);
    });
  };

  const copyJson = () => {
    if (!json) return;
    navigator.clipboard.writeText(json).then(() => {
      setCopiedJson(true);
      setTimeout(() => setCopiedJson(false), 2000);
    });
  };

  return (
    <section className="space-y-1 ring-1 ring-gold-500/25 rounded-lg p-2 bg-midnight-950/40">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <h4 className="text-[11px] font-semibold text-gold-400">תסריט נקי + חומרים + 3 פרומפטי Kling</h4>
        <div className="flex items-center gap-1.5 flex-wrap">
          {clean && plain && (
            <button
              type="button"
              onClick={copyPlain}
              className="flex items-center gap-1 text-[10px] text-gold-400 hover:text-gold-300 border border-midnight-600 rounded px-2 py-0.5"
            >
              <Copy size={12} />
              {copiedPlain ? 'הועתק' : 'העתק טקסט'}
            </button>
          )}
          {clean && json && (
            <button
              type="button"
              onClick={copyJson}
              className="flex items-center gap-1 text-[10px] text-midnight-300 hover:text-midnight-200 border border-midnight-600 rounded px-2 py-0.5"
            >
              <Copy size={12} />
              {copiedJson ? 'הועתק' : 'העתק JSON'}
            </button>
          )}
        </div>
      </div>
      <p className="text-[10px] text-midnight-500 leading-snug">
        רק תוכן לצפייה ולרינדור — ללא הוראות הבריף שנשלחו ל־LLM. כולל פרומפט ויזואלי לכל סצנה ל־Kling 2.5 (Magnific/Freepik).
      </p>
      <textarea
        dir="rtl"
        readOnly
        className="w-full min-h-[200px] max-h-[min(52vh,460px)] overflow-y-auto rounded-md border border-midnight-700/80 bg-midnight-950/90 p-2 font-mono text-[10px] text-midnight-200 whitespace-pre-wrap"
        value={clean ? plain : placeholder}
      />
    </section>
  );
}

function RenderProviderPackageField({ pkg }) {
  const [copied, setCopied] = useState(false);
  const text = pkg ? JSON.stringify(pkg, null, 2) : '';

  const copy = () => {
    if (!text) return;
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <section className="space-y-1">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <h4 className="text-[11px] font-semibold text-gold-400">חבילה מלאה לספק הרינדור (שדה אחד)</h4>
        {pkg && (
          <button
            type="button"
            onClick={copy}
            className="flex items-center gap-1 text-[10px] text-gold-400 hover:text-gold-300 border border-midnight-600 rounded px-2 py-0.5"
          >
            <Copy size={12} />
            {copied ? 'הועתק' : 'העתק JSON'}
          </button>
        )}
      </div>
      <p className="text-[10px] text-midnight-500 leading-snug">
        Shotstack: גוף <code className="text-midnight-400">shotstack_request_body</code>. Magnific: ראה{' '}
        <code className="text-midnight-400">magnific_segments</code> ו־
        <code className="text-midnight-400">merged_mp4_auth_url</code>.
      </p>
      <textarea
        dir="ltr"
        readOnly
        className="w-full min-h-[220px] max-h-[min(50vh,420px)] overflow-y-auto rounded-md border border-midnight-700/80 bg-midnight-950/90 p-2 font-mono text-[10px] text-midnight-200"
        value={
          pkg
            ? text
            : '— יופיע אחרי שה-job הגיע לשלב הרינדור (Shotstack או Magnific).'
        }
      />
    </section>
  );
}

export default function CreativeStudio() {
  const [tab, setTab] = useState('brief');
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState(null);
  const [saving, setSaving] = useState(false);

  const [creativeBusy, setCreativeBusy] = useState(false);
  const [creativeJobs, setCreativeJobs] = useState([]);
  const [creativeCfg, setCreativeCfg] = useState({
    pexels_configured: false,
    shotstack_configured: false,
    magnific_configured: false
  });
  const [creativeOptions, setCreativeOptions] = useState({ characters: [], tones: [] });
  const [creativeDesc, setCreativeDesc] = useState('');
  const [creativeTone, setCreativeTone] = useState('adults');
  const [creativeNotes, setCreativeNotes] = useState('');
  const [creativeCharacterId, setCreativeCharacterId] = useState('');
  const [creativeStarting, setCreativeStarting] = useState(false);
  const [creativeDetail, setCreativeDetail] = useState(null);
  const [creativeRetryingId, setCreativeRetryingId] = useState(null);
  const [activeLogJobId, setActiveLogJobId] = useState(null);
  const [activeLogJob, setActiveLogJob] = useState(null);
  const [activeLogLoading, setActiveLogLoading] = useState(false);

  const [settings, setSettings] = useState({
    creative_llm_provider: 'template',
    creative_gemini_model: 'gemini-2.0-flash',
    creative_openai_model: 'gpt-4o-mini',
    creative_video_provider: 'shotstack',
    creative_video_auto_enabled: 'false',
    creative_video_cron: '0 14 * * *',
    creative_auto_description:
      'Short vertical video: practical tips about shopping smart and spotting real value online.',
    creative_auto_tone: 'adults',
    creative_openai_key_configured: false,
    creative_gemini_key_configured: false,
    creative_magnific_key_configured: false,
    creative_env_overrides: {}
  });
  const [openaiKeyInput, setOpenaiKeyInput] = useState('');
  const [geminiKeyInput, setGeminiKeyInput] = useState('');
  const [magnificKeyInput, setMagnificKeyInput] = useState('');

  const loadCreative = useCallback(async () => {
    const [st, jobs, opt] = await Promise.all([
      api.getCreativeVideoStatus(),
      api.getCreativeVideoJobs(50),
      api.getCreativeVideoOptions()
    ]);
    setCreativeBusy(!!st.busy);
    setCreativeCfg({
      pexels_configured: !!st.pexels_configured,
      shotstack_configured: !!st.shotstack_configured,
      magnific_configured: !!st.magnific_configured
    });
    setCreativeJobs(jobs.jobs || []);
    setCreativeOptions({ characters: opt.characters || [], tones: opt.tones || [] });
  }, []);

  const loadSettings = useCallback(async () => {
    const data = await api.getCreativeStudioSettings();
    setSettings(prev => ({ ...prev, ...data }));
  }, []);

  useEffect(() => {
    let cancel = false;
    (async () => {
      setLoading(true);
      try {
        await Promise.all([loadCreative(), loadSettings()]);
      } catch (e) {
        if (!cancel) setMessage({ type: 'error', text: e.message });
      } finally {
        if (!cancel) setLoading(false);
      }
    })();
    return () => {
      cancel = true;
    };
  }, [loadCreative, loadSettings]);

  useEffect(() => {
    const id = setInterval(() => {
      loadCreative().catch(() => {});
    }, 4000);
    return () => clearInterval(id);
  }, [loadCreative]);

  useEffect(() => {
    if (!activeLogJobId) {
      setActiveLogJob(null);
      setActiveLogLoading(false);
      return undefined;
    }
    let cancelled = false;
    const pull = async () => {
      setActiveLogLoading(true);
      try {
        const data = await api.getCreativeVideoJob(activeLogJobId);
        if (cancelled) return;
        setActiveLogJob(data.job);
        const st = String(data.job?.status || '').toLowerCase();
        if (st === 'completed' || st === 'failed') setActiveLogLoading(false);
      } catch {
        if (!cancelled) setActiveLogLoading(false);
      }
    };
    pull();
    const timer = setInterval(pull, 2000);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [activeLogJobId]);

  const saveStudioSettings = async () => {
    setSaving(true);
    setMessage(null);
    try {
      const payload = {};
      for (const k of SETTINGS_PAYLOAD_KEYS) {
        const v = settings[k];
        if (v === undefined || v === null) continue;
        payload[k] = typeof v === 'boolean' ? (v ? 'true' : 'false') : String(v);
      }
      if (openaiKeyInput.trim()) payload.creative_openai_api_key = openaiKeyInput.trim();
      if (geminiKeyInput.trim()) payload.creative_gemini_api_key = geminiKeyInput.trim();
      if (magnificKeyInput.trim()) payload.creative_magnific_api_key = magnificKeyInput.trim();
      if (
        (settings.creative_video_provider || 'shotstack') === 'magnific' &&
        !magnificKeyInput.trim() &&
        !settings.creative_magnific_key_configured
      ) {
        setMessage({
          type: 'error',
          text: 'נבחר Magnific — הדבק מפתח API או הגדר CREATIVE_MAGNIFIC_API_KEY בשרת.'
        });
        setSaving(false);
        return;
      }
      if (
        (settings.creative_llm_provider || 'template') === 'gemini' &&
        !geminiKeyInput.trim() &&
        !settings.creative_gemini_key_configured
      ) {
        setMessage({ type: 'error', text: 'נא להדביק מפתח Gemini לסטודיו Creative או לעבור ל-Template.' });
        setSaving(false);
        return;
      }
      if (
        (settings.creative_llm_provider || 'template') === 'openai' &&
        !openaiKeyInput.trim() &&
        !settings.creative_openai_key_configured
      ) {
        setMessage({ type: 'error', text: 'נא להדביק מפתח OpenAI לסטודיו Creative או לעבור ל-Template.' });
        setSaving(false);
        return;
      }
      await api.saveCreativeStudioSettings(payload);
      setOpenaiKeyInput('');
      setGeminiKeyInput('');
      setMagnificKeyInput('');
      await loadSettings();
      setMessage({ type: 'ok', text: 'הגדרות סטודיו Creative נשמרו.' });
    } catch (e) {
      setMessage({ type: 'error', text: e.message });
    } finally {
      setSaving(false);
    }
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
            <Sparkles className="text-gold-400" size={28} />
            סטודיו סרטונים (Creative)
          </h1>
          <p className="text-midnight-400 text-sm" dir="rtl">
            מערכת נפרדת מ־<strong>Short videos (MP4)</strong> שמבוססת על דילים: כאן תסריט + Pexels + Shotstack, או תסריט +
            שלושת פרומפטי Kling ב־Magnific (ללא Pexels בשלב הרינדור).
            אין קישור לזרימת TikTok/מוצרים — הגדרות LLM ומפתחות נשמרים רק כאן.
          </p>
        </div>
        {creativeBusy && (
          <div className="flex items-center gap-2 text-amber-400 text-sm">
            <Loader className="animate-spin" size={18} />
            רינדור Creative… (Shotstack או Magnific — עלול לקחת מספר דקות)
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

      {tab === 'brief' && (
        <div
          dir="ltr"
          className="grid grid-cols-1 md:grid-cols-[minmax(260px,340px)_minmax(0,1fr)] gap-4 items-start"
        >
          <div
            className="glass rounded-xl p-4 border-2 border-midnight-500/70 ring-1 ring-white/10 min-h-[280px] flex flex-col"
            dir="rtl"
          >
            <div className="font-mono text-[11px] uppercase tracking-wide text-midnight-400 mb-3">log:</div>

            {(() => {
              const job = activeLogJob;
              const logBrief = job?.brief;
              const logDebug = logBrief?.debug || {};
              const provider = String(logDebug.llm_provider || settings.creative_llm_provider || 'template').toLowerCase();
              const providerLabel =
                provider === 'gemini'
                  ? 'Gemini'
                  : provider === 'openai'
                    ? 'OpenAI'
                    : 'Template (ללא LLM)';

              const customerFromJob =
                job &&
                [job.video_description, job.user_notes].filter(Boolean).join('\n\n').trim();
              const customerPreview = [creativeDesc, creativeNotes && `הערות: ${creativeNotes}`]
                .filter(Boolean)
                .join('\n\n')
                .trim();
              const customerBlock =
                customerFromJob ||
                customerPreview ||
                '— (מלאו תיאור ולחצו ״צור סרטון״ — או לחצו למטה על ״הצג לוג של ה-job האחרון״)';

              const timelineUrls = Array.isArray(logDebug.pexels_timeline_urls) ? logDebug.pexels_timeline_urls : [];
              const firstClipName = timelineUrls.length ? urlTailLabel(timelineUrls[0]) : '';

              const extraQueries = (logBrief?.pexels_search_queries || []).filter(Boolean);

              return (
                <div className="text-xs space-y-4 flex-1 overflow-y-auto max-h-[75vh] pr-0.5">
                  <section className="space-y-1">
                    <h4 className="text-[11px] font-semibold text-gold-400">הוראות שנכתבו על ידי הלקוח</h4>
                    <pre
                      dir="auto"
                      className="bg-midnight-950/90 rounded-md p-2.5 text-[11px] text-midnight-200 whitespace-pre-wrap max-h-40 overflow-y-auto border border-midnight-700/80"
                    >
                      {customerBlock}
                    </pre>
                  </section>

                  <CleanDeliveryBundleField clean={logBrief?.clean_delivery} job={job} />

                  <details className="rounded-md border border-midnight-800/90 bg-midnight-950/50 p-2 space-y-2">
                    <summary className="text-[11px] font-semibold text-midnight-400 cursor-pointer hover:text-midnight-300">
                      דיבוג: יצירת תסריט ({providerLabel}
                      {logDebug.llm_model ? ` · ${logDebug.llm_model}` : ''})
                    </summary>
                    {logDebug.fallback_from_llm && (
                      <p className="text-amber-400 text-[10px] leading-snug">
                        נפילה לתבנית ({String(logDebug.fallback_from_llm)})
                      </p>
                    )}
                    {logBrief?.narration && (
                      <div className="space-y-0.5">
                        <span className="text-[10px] text-midnight-500">שדה narration גולמי (זהה לקריין בתסריט הנקי)</span>
                        <pre
                          dir="auto"
                          className="bg-midnight-950/90 rounded-md p-2 text-[10px] text-midnight-300 whitespace-pre-wrap max-h-32 overflow-y-auto border border-midnight-800/80"
                        >
                          {logBrief.narration}
                        </pre>
                      </div>
                    )}
                    {logDebug.prompt_user_block && (
                      <details className="text-[10px] text-midnight-500">
                        <summary className="cursor-pointer text-midnight-400 hover:text-midnight-300">
                          פרומפט מלא ל־LLM (כולל הוראות בריף מהלקוח)
                        </summary>
                        <pre dir="auto" className="mt-1 p-2 bg-midnight-900/60 rounded whitespace-pre-wrap max-h-32 overflow-y-auto">
                          {logDebug.prompt_user_block}
                        </pre>
                      </details>
                    )}
                    <div>
                      <h5 className="text-[10px] font-semibold text-gold-300 mb-1">תשובה גולמית מהמודל</h5>
                      <textarea
                        dir="ltr"
                        readOnly
                        className="w-full min-h-[120px] max-h-[240px] overflow-y-auto rounded-md border border-midnight-700/80 bg-midnight-950/90 p-2 font-mono text-[10px] text-midnight-200"
                        value={String(logDebug.llm_raw_text || 'אין תשובה גולמית לשימוש בתצוגה זו (Template או קריאה ישנה).')}
                      />
                    </div>
                  </details>

                  <section className="space-y-1">
                    <h4 className="text-[11px] font-semibold text-gold-400">סרטון שנמצא במאגר (Pexels → טיימליין)</h4>
                    {timelineUrls.length ? (
                      <ul className="space-y-1.5 text-[11px] text-midnight-300">
                        {timelineUrls.map((u, i) => (
                          <li key={i} className="flex flex-col gap-0.5 border-b border-midnight-800/80 pb-1.5 last:border-0">
                            <span className="font-mono text-midnight-400 truncate" title={u}>
                              {urlTailLabel(u) || `clip_${i + 1}`}
                            </span>
                            <a
                              href={u}
                              className="text-gold-400/90 hover:underline break-all"
                              target="_blank"
                              rel="noreferrer"
                            >
                              פתח מקור
                            </a>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-midnight-500 text-[11px]">
                        {job ? '— עדיין לא נבחרו קליפים (יעודכן אחרי חיפוש Pexels).' : '—'}
                      </p>
                    )}
                    {firstClipName && (
                      <p className="text-[10px] text-midnight-500">קליפ ראשון: {firstClipName}</p>
                    )}
                  </section>

                  <section className="space-y-1">
                    <h4 className="text-[11px] font-semibold text-gold-400">מקורות נוספים</h4>
                    {extraQueries.length ? (
                      <ul className="list-disc pr-4 text-midnight-400 space-y-0.5">
                        {extraQueries.map((q, i) => (
                          <li key={i}>{q}</li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-midnight-500 text-[11px]">—</p>
                    )}
                    {Array.isArray(logDebug.pexels_pages_used) && logDebug.pexels_pages_used.length > 0 && (
                      <ul className="mt-1 text-[10px] text-midnight-500 space-y-0.5 list-none">
                        {logDebug.pexels_pages_used.map((row, i) => (
                          <li key={i}>
                            חיפוש עמוד {row.page}: {row.query}
                          </li>
                        ))}
                      </ul>
                    )}
                  </section>

                  <RenderProviderPackageField pkg={logDebug.render_provider_package} />

                  <section className="space-y-1">
                    <h4 className="text-[11px] font-semibold text-gold-400">קובץ סופי</h4>
                    {job?.output_url ? (
                      <div className="space-y-1">
                        <a
                          href={resolveCreativeOutputUrl(job.output_url)}
                          className="text-gold-400 hover:underline break-all text-[11px] block"
                          target="_blank"
                          rel="noreferrer"
                        >
                          {urlTailLabel(job.output_url) || 'הורד / צפה ב־MP4'}
                        </a>
                        <span className="text-[10px] text-midnight-500 font-mono break-all">{job.output_url}</span>
                      </div>
                    ) : job?.status === 'failed' ? (
                      <p className="text-red-400 text-[11px]">ה-job נכשל — אין קובץ סופי.</p>
                    ) : (
                      <p className="text-midnight-500 text-[11px]">— (אחרי השלמת Shotstack או Magnific)</p>
                    )}
                  </section>

                  <div className="pt-2 border-t border-midnight-700/80 space-y-2">
                    {activeLogJobId != null && (
                      <p className="text-[10px] text-midnight-500 font-mono">
                        job #{activeLogJobId}
                        {job?.status ? ` · ${job.status}` : ''}
                      </p>
                    )}
                    {activeLogJobId && activeLogLoading && !job?.brief && (
                      <p className="text-midnight-400 text-[11px]">טוען פרטים מהשרת…</p>
                    )}
                    {job?.error_message && (
                      <pre className="text-red-300 whitespace-pre-wrap text-[10px]">{job.error_message}</pre>
                    )}
                    {creativeJobs[0] && (
                      <button
                        type="button"
                        className="text-[11px] text-gold-400 hover:underline"
                        onClick={async () => {
                          const id = creativeJobs[0].id;
                          setActiveLogJobId(id);
                          try {
                            const d = await api.getCreativeVideoJob(id);
                            setActiveLogJob(d.job);
                          } catch (e) {
                            setMessage({ type: 'error', text: e.message });
                          }
                        }}
                      >
                        הצג לוג של ה-job האחרון (#{creativeJobs[0].id})
                      </button>
                    )}
                  </div>
                </div>
              );
            })()}
          </div>

          <div className="glass rounded-xl p-6 space-y-4" dir="rtl">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Sparkles className="text-gold-400" size={22} />
              יצירת סרטון קצר
            </h2>
            <p className="text-sm text-midnight-400" dir="rtl">
              בריף ייצור (תסריט, כיתובים, שלושת פרומפטי Kling ב־
              <code className="text-midnight-300 mx-0.5">clean_delivery</code>), מלאי אופציונלי מ־
              <a href="https://www.pexels.com/" className="text-gold-400 underline mx-0.5" target="_blank" rel="noreferrer">
                Pexels
              </a>{' '}
              לזרימת Shotstack, או רינדור טקסט־לווידאו ב־
              <a href="https://docs.magnific.com/" className="text-gold-400 underline mx-0.5" target="_blank" rel="noreferrer">
                Magnific (Kling 4K T2V)
              </a>{' '}
              לפי התסריט הנקי. ל־Shotstack:{' '}
              <code className="text-midnight-300">PEXELS_API_KEY</code> +{' '}
              <code className="text-midnight-300">SHOTSTACK_API_KEY</code>. ל־Magnific:{' '}
              <code className="text-midnight-300">CREATIVE_MAGNIFIC_API_KEY</code> או מפתח בהגדרות.
            </p>
            <div className="flex flex-wrap gap-3 text-xs">
              <span className={creativeCfg.pexels_configured ? 'text-emerald-400' : 'text-amber-400'}>
                Pexels: {creativeCfg.pexels_configured ? 'מוגדר' : 'חסר מפתח'}
              </span>
              <span className={creativeCfg.shotstack_configured ? 'text-emerald-400' : 'text-amber-400'}>
                Shotstack: {creativeCfg.shotstack_configured ? 'מוגדר' : 'חסר מפתח'}
              </span>
              <span className={creativeCfg.magnific_configured ? 'text-emerald-400' : 'text-amber-400'}>
                Magnific: {creativeCfg.magnific_configured ? 'מוגדר' : 'חסר מפתח'}
              </span>
            </div>
            <div>
              <label className="block text-sm text-midnight-300 mb-1" dir="rtl">
                1. תיאור הסרטון
              </label>
              <textarea
                className="input-dark w-full min-h-[100px]"
                dir="rtl"
                value={creativeDesc}
                onChange={e => setCreativeDesc(e.target.value)}
                placeholder="למשל: טיפים לקנייה חכמה באונליין…"
              />
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-midnight-300 mb-1" dir="rtl">
                  2. סגנון תסריט
                </label>
                <select
                  className="input-dark w-full"
                  value={creativeTone}
                  onChange={e => setCreativeTone(e.target.value)}
                >
                  {(creativeOptions.tones || []).map(t => (
                    <option key={t.id} value={t.id}>
                      {t.label_he} ({t.id})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm text-midnight-300 mb-1" dir="rtl">
                  דמות / תמונת פינה (אופציונלי)
                </label>
                <select
                  className="input-dark w-full"
                  value={creativeCharacterId}
                  onChange={e => setCreativeCharacterId(e.target.value)}
                >
                  <option value="">ברירת מחדל</option>
                  {(creativeOptions.characters || []).map(c => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <label className="block text-sm text-midnight-300 mb-1" dir="rtl">
                3. הערות והנחיות
              </label>
              <textarea
                className="input-dark w-full min-h-[72px]"
                dir="rtl"
                value={creativeNotes}
                onChange={e => setCreativeNotes(e.target.value)}
                placeholder="קצב, שפה, מותג…"
              />
            </div>
            <button
              type="button"
              className="btn-gold flex items-center gap-2 disabled:opacity-50"
              disabled={creativeBusy || creativeStarting}
              onClick={async () => {
                setMessage(null);
                setCreativeStarting(true);
                try {
                  const res = await api.createCreativeVideoJob({
                    videoDescription: creativeDesc,
                    scriptTone: creativeTone,
                    userNotes: creativeNotes,
                    characterId: creativeCharacterId || undefined
                  });
                  const newId = normalizeCreateJobId(res);
                  if (newId != null) {
                    setActiveLogJobId(newId);
                    try {
                      const d = await api.getCreativeVideoJob(newId);
                      setActiveLogJob(d.job);
                    } catch {
                      /* polling effect ימשיך */
                    }
                  }
                  setMessage({
                    type: 'ok',
                    text: 'ה-job נשלח לתור. הלוג מוצג בעמודה הצרה משמאל (מ־md ומעלה) ומתעדכן אוטומטית.'
                  });
                  setCreativeBusy(true);
                  await loadCreative();
                } catch (e) {
                  setMessage({ type: 'error', text: e.message });
                } finally {
                  setCreativeStarting(false);
                }
              }}
            >
              <Sparkles size={18} />
              {creativeStarting ? 'מתחיל…' : 'צור סרטון (ענן)'}
            </button>
            <p className="text-xs text-midnight-500" dir="rtl">
              מקור התסריט: טאב <strong>הגדרות סטודיו</strong> (Template / Gemini / OpenAI). במצב Template תיאור בעברית לא מתורגם
              אוטומטית לשאילתות Pexels — מסתובבות סטים באנגלית; לדיוק לפי הפרומפט השתמשו ב־Gemini או OpenAI עם מפתח.
            </p>
          </div>
        </div>
      )}

      {tab === 'jobs' && (
        <div className="glass rounded-xl p-6">
          <h3 className="text-md font-semibold mb-3">Creative jobs</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-midnight-500 border-b border-midnight-700">
                  <th className="py-2 pr-2">#</th>
                  <th className="py-2 pr-2">Status</th>
                  <th className="py-2 pr-2">Trigger</th>
                  <th className="py-2 pr-2">Description</th>
                  <th className="py-2 pr-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {creativeJobs.map(j => (
                  <tr key={j.id} className="border-b border-midnight-800/80">
                    <td className="py-2 pr-2 font-mono">{j.id}</td>
                    <td className="py-2 pr-2 uppercase text-midnight-400">{j.status}</td>
                    <td className="py-2 pr-2 text-midnight-500">{j.trigger_source}</td>
                    <td className="py-2 pr-2 max-w-md truncate" title={j.video_description}>
                      {j.video_description}
                    </td>
                    <td className="py-2 pr-2 flex flex-wrap gap-2">
                      <button
                        type="button"
                        className="text-gold-400 hover:underline text-xs"
                        onClick={async () => {
                          try {
                            const d = await api.getCreativeVideoJob(j.id);
                            setCreativeDetail(d.job);
                          } catch (e) {
                            setMessage({ type: 'error', text: e.message });
                          }
                        }}
                      >
                        Details
                      </button>
                      {j.status === 'completed' && j.output_url && (
                        <a
                          href={resolveCreativeOutputUrl(j.output_url)}
                          target="_blank"
                          rel="noreferrer"
                          className="text-emerald-400 hover:underline text-xs flex items-center gap-0.5"
                        >
                          <ExternalLink size={12} /> MP4
                        </a>
                      )}
                      {j.status === 'failed' && (
                        <button
                          type="button"
                          className="text-amber-400 hover:underline text-xs flex items-center gap-1"
                          disabled={creativeRetryingId === j.id || creativeBusy}
                          onClick={async () => {
                            setCreativeRetryingId(j.id);
                            try {
                              await api.retryCreativeVideoJob(j.id);
                              setMessage({ type: 'ok', text: `Creative job #${j.id} retry started.` });
                              setCreativeBusy(true);
                              await loadCreative();
                            } catch (e) {
                              setMessage({ type: 'error', text: e.message });
                            } finally {
                              setCreativeRetryingId(null);
                            }
                          }}
                        >
                          <RefreshCw size={12} className={creativeRetryingId === j.id ? 'animate-spin' : ''} />
                          Retry
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!creativeJobs.length && <p className="text-midnight-500 text-sm py-4">אין jobs עדיין.</p>}
          </div>
        </div>
      )}

      {tab === 'settings' && (
        <div className="glass rounded-xl p-6 space-y-4 max-w-2xl">
          <h2 className="text-lg font-semibold">הגדרות סטודיו Creative בלבד</h2>
          <p className="text-xs text-midnight-400" dir="rtl">
            לא משפיע על <strong>Short videos</strong> או על מפתחות Gemini/OpenAI שם.
          </p>
          <div
            className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs text-amber-100/95"
            dir="rtl"
          >
            <strong className="text-amber-200">שמירה בענן (Render וכו׳):</strong> מסד הנתונים הוא קובץ SQLite על הדיסק
            של הקונטיינר. בלי <strong>דיסק קבוע</strong> או משתני סביבה — כל deploy / שינוי instance מוחק את הקובץ וההגדרות
            נראות &quot;נמחקות&quot;. מומלץ: להגדיר ב־Environment של השרת{' '}
            <code className="text-midnight-200">CREATIVE_GEMINI_API_KEY</code> (ואופציונלית{' '}
            <code className="text-midnight-200">CREATIVE_LLM_PROVIDER=gemini</code>,{' '}
            <code className="text-midnight-200">CREATIVE_GEMINI_MODEL</code>) ו/או דיסק שממופה ל־{' '}
            <code className="text-midnight-200">DATA_DIR</code>. ערכים מהסביבה גוברים על מה שנשמר ב־DB. לרינדור Magnific
            אפשר גם <code className="text-midnight-200">CREATIVE_MAGNIFIC_API_KEY</code>.
          </div>

          <div className="border border-midnight-600 rounded-lg p-4 space-y-4 bg-midnight-900/20">
            <h3 className="text-sm font-semibold text-gold-300">תסריט (LLM)</h3>
            <div>
              <label className="block text-sm text-midnight-300 mb-1">מקור תסריט</label>
              <select
                className="input-dark w-full max-w-lg"
                value={settings.creative_llm_provider || 'template'}
                onChange={e => setSettings({ ...settings, creative_llm_provider: e.target.value })}
              >
                <option value="template">Template (ללא API)</option>
                <option value="gemini">Google Gemini</option>
                <option value="openai">OpenAI</option>
              </select>
            </div>
            {(settings.creative_llm_provider || 'template') === 'gemini' && (
              <>
                {settings.creative_env_overrides?.gemini_api_from_env && (
                  <p className="text-xs text-emerald-400 mb-2" dir="rtl">
                    מפתח Gemini פעיל מ־<code className="text-midnight-200">CREATIVE_GEMINI_API_KEY</code> בסביבת
                    השרת — לא תלוי בקובץ ה־DB ולכן שורד deploy.
                  </p>
                )}
                <div>
                  <label className="block text-sm text-midnight-300 mb-1">Gemini API key (Creative)</label>
                  <p className="text-xs text-midnight-500 mb-1">
                    {settings.creative_gemini_key_configured ? 'מפתח שמור — הדבק רק להחלפה.' : 'לא הוגדר.'}
                  </p>
                  <input
                    type="text"
                    className="input-dark w-full font-mono text-sm"
                    value={geminiKeyInput}
                    onChange={e => setGeminiKeyInput(e.target.value)}
                    placeholder="AIza…"
                    autoComplete="off"
                    spellCheck={false}
                  />
                </div>
                <div>
                  <label className="block text-sm text-midnight-300 mb-1">מודל Gemini</label>
                  <input
                    className="input-dark w-full font-mono max-w-lg"
                    value={settings.creative_gemini_model || 'gemini-2.0-flash'}
                    onChange={e => setSettings({ ...settings, creative_gemini_model: e.target.value })}
                  />
                </div>
              </>
            )}
            {(settings.creative_llm_provider || 'template') === 'openai' && (
              <>
                {settings.creative_env_overrides?.openai_api_from_env && (
                  <p className="text-xs text-emerald-400 mb-2" dir="rtl">
                    מפתח OpenAI פעיל מ־<code className="text-midnight-200">CREATIVE_OPENAI_API_KEY</code> בסביבת השרת.
                  </p>
                )}
                <div>
                  <label className="block text-sm text-midnight-300 mb-1">OpenAI API key (Creative)</label>
                  <p className="text-xs text-midnight-500 mb-1">
                    {settings.creative_openai_key_configured ? 'מפתח שמור.' : 'לא הוגדר.'}
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
                  <label className="block text-sm text-midnight-300 mb-1">מודל OpenAI</label>
                  <input
                    className="input-dark w-full max-w-md"
                    value={settings.creative_openai_model || 'gpt-4o-mini'}
                    onChange={e => setSettings({ ...settings, creative_openai_model: e.target.value })}
                  />
                </div>
              </>
            )}
          </div>

          <div className="border border-midnight-600 rounded-lg p-4 space-y-4 bg-midnight-900/20">
            <h3 className="text-sm font-semibold text-gold-300">רינדור וידאו</h3>
            <p className="text-xs text-midnight-400" dir="rtl">
              Shotstack דורש Pexels + מפתח Shotstack בשרת. Magnific משתמש ב־
              <strong className="text-midnight-300">שלושת פרומפטי הווידאו</strong>
              מתוך <code className="text-midnight-300">clean_delivery.kling_scenes</code> (Hook / גוף / CTA), מפעיל{' '}
              <code className="text-midnight-300">kling-4k-t2v</code>, וממזג MP4 אחד (זמין גם ב־{' '}
              <code className="text-midnight-300">/api/admin/creative-videos/jobs/:id/merged.mp4</code>
              עם אימות).
            </p>
            <div>
              <label className="block text-sm text-midnight-300 mb-1">ספק רינדור</label>
              <select
                className="input-dark w-full max-w-lg"
                value={settings.creative_video_provider || 'shotstack'}
                onChange={e => setSettings({ ...settings, creative_video_provider: e.target.value })}
              >
                <option value="shotstack">Shotstack (Pexels + TTS)</option>
                <option value="magnific">Magnific — Kling 4K טקסט→ווידאו</option>
              </select>
            </div>
            {(settings.creative_video_provider || 'shotstack') === 'magnific' && (
              <>
                {settings.creative_env_overrides?.magnific_api_from_env && (
                  <p className="text-xs text-emerald-400 mb-2" dir="rtl">
                    מפתח Magnific פעיל מ־<code className="text-midnight-200">CREATIVE_MAGNIFIC_API_KEY</code> בסביבת השרת.
                  </p>
                )}
                <div>
                  <label className="block text-sm text-midnight-300 mb-1">Magnific API key</label>
                  <p className="text-xs text-midnight-500 mb-1">
                    {settings.creative_magnific_key_configured ? 'מפתח שמור — הדבק רק להחלפה.' : 'לא הוגדר.'}
                  </p>
                  <input
                    type="password"
                    className="input-dark w-full font-mono text-sm"
                    value={magnificKeyInput}
                    onChange={e => setMagnificKeyInput(e.target.value)}
                    placeholder="x-magnific-api-key"
                    autoComplete="off"
                  />
                </div>
              </>
            )}
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={settings.creative_video_auto_enabled === 'true'}
                onChange={e =>
                  setSettings({
                    ...settings,
                    creative_video_auto_enabled: e.target.checked ? 'true' : 'false'
                  })
                }
              />
              <span>אוטומציה מתוזמנת (נושא + טון למטה)</span>
            </label>
            <div>
              <label className="block text-sm text-midnight-300 mb-1">Cron (זמן שרת)</label>
              <input
                className="input-dark w-full font-mono"
                value={settings.creative_video_cron || '0 14 * * *'}
                onChange={e => setSettings({ ...settings, creative_video_cron: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm text-midnight-300 mb-1">תיאור לריצה אוטומטית</label>
              <textarea
                className="input-dark w-full min-h-[80px]"
                value={settings.creative_auto_description || ''}
                onChange={e => setSettings({ ...settings, creative_auto_description: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm text-midnight-300 mb-1">טון לריצה אוטומטית (id)</label>
              <input
                className="input-dark w-full max-w-xs font-mono"
                value={settings.creative_auto_tone || 'adults'}
                onChange={e => setSettings({ ...settings, creative_auto_tone: e.target.value })}
              />
            </div>
          </div>

          <button type="button" className="btn-gold" onClick={saveStudioSettings} disabled={saving}>
            {saving ? 'שומר…' : 'שמור הגדרות Creative'}
          </button>
        </div>
      )}

      {creativeDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70" onClick={() => setCreativeDetail(null)}>
          <div
            className="glass rounded-xl max-w-3xl w-full p-6 max-h-[85vh] overflow-y-auto"
            onClick={e => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold mb-2">Creative job #{creativeDetail.id}</h3>
            <div className="space-y-2 text-sm text-midnight-300">
              <p>
                <span className="text-midnight-500">Status:</span> {creativeDetail.status}
              </p>
              <p dir="rtl">
                <span className="text-midnight-500">תיאור:</span> {creativeDetail.video_description}
              </p>
              {creativeDetail.error_message && (
                <p className="text-red-400">
                  <span className="text-midnight-500">Error:</span> {creativeDetail.error_message}
                </p>
              )}
              <CleanDeliveryBundleField clean={creativeDetail.brief?.clean_delivery} job={creativeDetail} />
              <details className="text-xs border border-midnight-700 rounded-md p-2">
                <summary className="cursor-pointer text-midnight-400">דיבוג LLM</summary>
                {creativeDetail.brief?.debug?.llm_raw_text && (
                  <div className="mt-2">
                    <span className="text-midnight-500">LLM raw:</span>
                    <textarea
                      dir="ltr"
                      readOnly
                      className="mt-1 w-full min-h-[100px] max-h-48 overflow-y-auto rounded bg-midnight-900/80 p-2 font-mono text-[11px] text-midnight-100"
                      value={String(creativeDetail.brief.debug.llm_raw_text)}
                    />
                  </div>
                )}
              </details>
              <div className="mt-4 pt-3 border-t border-midnight-700/80">
                <RenderProviderPackageField pkg={creativeDetail.brief?.debug?.render_provider_package} />
              </div>
              {creativeDetail.output_url && (
                <a
                  href={resolveCreativeOutputUrl(creativeDetail.output_url)}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-gold-400 hover:underline"
                >
                  <ExternalLink size={14} /> Open MP4
                </a>
              )}
            </div>
            <div className="flex gap-3 mt-6">
              <button type="button" className="btn-gold flex-1" onClick={() => setCreativeDetail(null)}>
                סגור
              </button>
              {creativeDetail.status === 'failed' && (
                <button
                  type="button"
                  className="flex-1 border border-amber-500/50 text-amber-300 rounded-lg px-4 py-2"
                  disabled={!!creativeRetryingId || creativeBusy}
                  onClick={async () => {
                    const id = creativeDetail.id;
                    setCreativeRetryingId(id);
                    try {
                      await api.retryCreativeVideoJob(id);
                      setCreativeDetail(null);
                      setCreativeBusy(true);
                      await loadCreative();
                    } catch (e) {
                      setMessage({ type: 'error', text: e.message });
                    } finally {
                      setCreativeRetryingId(null);
                    }
                  }}
                >
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
