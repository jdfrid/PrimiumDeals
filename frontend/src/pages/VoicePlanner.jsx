import { useCallback, useEffect, useRef, useState } from 'react';
import { CalendarPlus, CheckCircle2, KeyRound, ListTodo, Loader2, Mic, Square, Unplug } from 'lucide-react';
import api from '../services/api';

function VoicePlanner() {
  const [status, setStatus] = useState(null);
  const [recording, setRecording] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [transcript, setTranscript] = useState('');
  const [result, setResult] = useState(null);
  const [manualText, setManualText] = useState('');
  const [accessKey, setAccessKey] = useState(localStorage.getItem('voicePlannerAccessKey') || '');
  const recorderRef = useRef(null);
  const streamRef = useRef(null);
  const chunksRef = useRef([]);
  const timerRef = useRef(null);

  const loadStatus = useCallback(async () => {
    try {
      setError('');
      const data = await api.getVoicePlannerStatus();
      setStatus(data);
    } catch (err) {
      setError(err.message);
    }
  }, []);

  useEffect(() => {
    loadStatus();
    const params = new URLSearchParams(window.location.search);
    if (params.get('google') === 'connected') {
      setMessage('החיבור לחשבון Google נשמר בהצלחה.');
      window.history.replaceState({}, '', '/voice-planner');
    }
    if (params.get('google') === 'error') {
      setError(params.get('message') || 'החיבור ל-Google נכשל.');
      window.history.replaceState({}, '', '/voice-planner');
    }
  }, [loadStatus]);

  const saveAccessKey = async () => {
    if (accessKey.trim()) {
      localStorage.setItem('voicePlannerAccessKey', accessKey.trim());
    } else {
      localStorage.removeItem('voicePlannerAccessKey');
    }
    await loadStatus();
  };

  const connectGoogle = async () => {
    try {
      setError('');
      const data = await api.getVoicePlannerGoogleAuthUrl();
      window.location.href = data.url;
    } catch (err) {
      setError(err.message);
    }
  };

  const startRecording = async () => {
    try {
      setError('');
      setMessage('');
      setResult(null);
      setTranscript('');

      if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) {
        throw new Error('הדפדפן לא תומך בהקלטת אודיו.');
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : 'audio/webm';
      const recorder = new MediaRecorder(stream, { mimeType });
      chunksRef.current = [];
      streamRef.current = stream;
      recorderRef.current = recorder;

      recorder.ondataavailable = event => {
        if (event.data?.size) chunksRef.current.push(event.data);
      };

      recorder.onstop = async () => {
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || 'audio/webm' });
        stream.getTracks().forEach(track => track.stop());
        await processAudio(blob);
      };

      recorder.start();
      setRecording(true);
      setElapsed(0);
      timerRef.current = window.setInterval(() => setElapsed(value => value + 1), 1000);
    } catch (err) {
      setError(err.message);
    }
  };

  const stopRecording = () => {
    if (timerRef.current) window.clearInterval(timerRef.current);
    setRecording(false);
    recorderRef.current?.stop();
  };

  const processAudio = async blob => {
    try {
      setProcessing(true);
      const audioBase64 = await blobToBase64(blob);
      const data = await api.processVoicePlannerCommand({
        audioBase64,
        mimeType: blob.type || 'audio/webm',
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Jerusalem'
      });
      handleSuccess(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setProcessing(false);
    }
  };

  const submitManualText = async event => {
    event.preventDefault();
    if (!manualText.trim()) return;
    try {
      setProcessing(true);
      setError('');
      setResult(null);
      const data = await api.processVoicePlannerCommand({
        text: manualText.trim(),
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Jerusalem'
      });
      handleSuccess(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setProcessing(false);
    }
  };

  const handleSuccess = data => {
    setTranscript(data.transcript || '');
    setResult(data);
    setMessage(data.parsed?.type === 'task' ? 'המשימה נשמרה ב-Google Tasks.' : 'הזימון נשמר ב-Google Calendar.');
  };

  const ready = status?.googleConfigured && status?.googleConnected && status?.openaiConfigured;

  return (
    <div className="min-h-screen bg-slate-950 text-white" dir="rtl">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-4 py-10 sm:px-6">
        <header className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-2xl shadow-black/30">
          <p className="mb-3 text-sm text-cyan-200">Voice Planner</p>
          <h1 className="text-3xl font-bold sm:text-4xl">שמירת פגישות ומשימות בקול</h1>
          <p className="mt-4 max-w-3xl text-slate-300">
            התחל הקלטה במילה <span className="font-semibold text-white">משימה</span> כדי לשמור ב-Google Tasks,
            או במילה <span className="font-semibold text-white">זימון</span> כדי לשמור ב-Google Calendar.
          </p>
        </header>

        <section className="grid gap-4 md:grid-cols-3">
          <StatusCard icon={<Unplug />} label="Google" ok={status?.googleConnected} text={status?.googleConnected ? 'מחובר' : 'לא מחובר'} />
          <StatusCard icon={<KeyRound />} label="OAuth" ok={status?.googleConfigured} text={status?.googleConfigured ? 'מוגדר' : 'חסרים פרטי Google'} />
          <StatusCard icon={<Mic />} label="תמלול" ok={status?.openaiConfigured} text={status?.openaiConfigured ? 'OpenAI פעיל' : 'חסר OPENAI_API_KEY'} />
        </section>

        {status?.accessKeyRequired && (
          <div className="rounded-2xl border border-amber-400/30 bg-amber-400/10 p-4">
            <label className="mb-2 block text-sm font-semibold text-amber-100">מפתח גישה מקומי</label>
            <div className="flex gap-2">
              <input
                value={accessKey}
                onChange={event => setAccessKey(event.target.value)}
                className="min-w-0 flex-1 rounded-xl border border-white/10 bg-slate-900 px-4 py-3 text-white outline-none focus:border-cyan-300"
                placeholder="VOICE_PLANNER_ACCESS_KEY"
              />
              <button onClick={saveAccessKey} className="rounded-xl bg-amber-300 px-5 font-semibold text-slate-950">
                שמור
              </button>
            </div>
          </div>
        )}

        {!status?.googleConnected && (
          <div className="rounded-2xl border border-cyan-400/30 bg-cyan-400/10 p-5">
            <h2 className="mb-2 text-xl font-semibold">חיבור Google חד-פעמי</h2>
            <p className="mb-4 text-slate-300">יש לאשר גישה ליומן ולמשימות שלך. הטוקן נשמר מקומית בשרת.</p>
            <button onClick={connectGoogle} className="rounded-xl bg-cyan-300 px-5 py-3 font-semibold text-slate-950 hover:bg-cyan-200">
              התחבר עם Google
            </button>
          </div>
        )}

        <main className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <section className="rounded-3xl border border-white/10 bg-white p-6 text-slate-950 shadow-xl">
            <div className="flex flex-col items-center gap-5 text-center">
              <button
                onClick={recording ? stopRecording : startRecording}
                disabled={!ready || processing}
                className={`flex h-36 w-36 items-center justify-center rounded-full text-white shadow-2xl transition ${
                  recording ? 'bg-red-600 hover:bg-red-500' : 'bg-cyan-600 hover:bg-cyan-500'
                } disabled:cursor-not-allowed disabled:bg-slate-300`}
              >
                {recording ? <Square size={48} /> : <Mic size={54} />}
              </button>
              <div>
                <h2 className="text-2xl font-bold">{recording ? 'מקליט עכשיו...' : 'לחץ להקלטה'}</h2>
                <p className="mt-1 text-slate-500">
                  {recording ? `${elapsed} שניות` : ready ? 'אמור: "משימה..." או "זימון..."' : 'השלם חיבורים לפני הקלטה'}
                </p>
              </div>
              {processing && (
                <div className="flex items-center gap-2 rounded-full bg-slate-100 px-4 py-2 text-slate-700">
                  <Loader2 className="animate-spin" size={18} />
                  מפענח ושומר מול Google...
                </div>
              )}
            </div>

            <form onSubmit={submitManualText} className="mt-8 border-t border-slate-200 pt-6">
              <label className="mb-2 block text-sm font-semibold text-slate-600">בדיקה ידנית בלי הקלטה</label>
              <textarea
                value={manualText}
                onChange={event => setManualText(event.target.value)}
                rows={3}
                className="w-full rounded-2xl border border-slate-200 p-4 outline-none focus:border-cyan-500"
                placeholder='לדוגמה: "זימון פגישת עבודה ביום שלישי ב-10 בבוקר במשרד"'
              />
              <button disabled={!ready || processing} className="mt-3 rounded-xl bg-slate-950 px-5 py-3 font-semibold text-white disabled:bg-slate-300">
                שמור מהטקסט
              </button>
            </form>
          </section>

          <aside className="rounded-3xl border border-white/10 bg-white/5 p-6">
            <h2 className="mb-4 text-xl font-semibold">תוצאה אחרונה</h2>
            {message && (
              <div className="mb-4 flex items-center gap-2 rounded-2xl border border-emerald-400/30 bg-emerald-400/10 p-3 text-emerald-100">
                <CheckCircle2 size={20} />
                {message}
              </div>
            )}
            {error && <div className="mb-4 rounded-2xl border border-red-400/30 bg-red-400/10 p-3 text-red-100">{error}</div>}
            {transcript && (
              <div className="mb-4">
                <p className="mb-1 text-sm text-slate-400">תמלול</p>
                <p className="rounded-2xl bg-slate-900 p-4 text-slate-100">{transcript}</p>
              </div>
            )}
            {result?.parsed ? <ParsedResult parsed={result.parsed} googleResult={result.googleResult} /> : <p className="text-slate-400">עדיין אין תוצאה.</p>}
          </aside>
        </main>
      </div>
    </div>
  );
}

function StatusCard({ icon, label, ok, text }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
      <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 text-cyan-200">{icon}</div>
      <p className="text-sm text-slate-400">{label}</p>
      <p className={`font-semibold ${ok ? 'text-emerald-200' : 'text-amber-200'}`}>{text}</p>
    </div>
  );
}

function ParsedResult({ parsed, googleResult }) {
  const Icon = parsed.type === 'task' ? ListTodo : CalendarPlus;
  return (
    <div className="rounded-2xl bg-slate-900 p-4">
      <div className="mb-3 flex items-center gap-2 text-cyan-100">
        <Icon size={20} />
        {parsed.type === 'task' ? 'משימה' : 'זימון'}
      </div>
      <dl className="space-y-2 text-sm text-slate-200">
        <Row label="כותרת" value={parsed.title} />
        <Row label="תאריך" value={parsed.date || parsed.dueDate} />
        <Row label="שעה" value={parsed.startTime || parsed.dueTime} />
        <Row label="מיקום" value={parsed.location} />
      </dl>
      {googleResult?.htmlLink && (
        <a href={googleResult.htmlLink} target="_blank" rel="noreferrer" className="mt-4 inline-block text-cyan-200 underline">
          פתיחה ב-Google Calendar
        </a>
      )}
    </div>
  );
}

function Row({ label, value }) {
  if (!value) return null;
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-slate-400">{label}</dt>
      <dd className="text-left font-medium">{value}</dd>
    </div>
  );
}

function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

export default VoicePlanner;
