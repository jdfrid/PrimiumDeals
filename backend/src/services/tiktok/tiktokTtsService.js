import fs from 'fs';
import { ttsSave } from 'edge-tts/out/index.js';

const GTX_TTS_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

/** Split narration for Google translate_tts GET (URL length limits). */
function chunkTextForGtxTts(text, maxLen = 160) {
  const t = text.replace(/\s+/g, ' ').trim();
  if (!t.length) return [];
  if (t.length <= maxLen) return [t];
  const out = [];
  let i = 0;
  while (i < t.length) {
    let end = Math.min(i + maxLen, t.length);
    if (end < t.length) {
      const space = t.lastIndexOf(' ', end);
      if (space > i) end = space;
    }
    const piece = t.slice(i, end).trim();
    if (piece) out.push(piece);
    i = end < t.length ? end + 1 : t.length;
  }
  return out;
}

/**
 * Unofficial Google Translate TTS (client=gtx). No API key; quality is basic. Fallback when Edge WSS is 403.
 */
export async function synthesizeGoogleGtxTts({ text, outPath }) {
  const safe = text.replace(/\s+/g, ' ').trim().slice(0, 2800);
  if (!safe) throw new Error('No narration text for TTS');
  const chunks = chunkTextForGtxTts(safe);
  const bufs = [];
  for (let i = 0; i < chunks.length; i++) {
    if (i > 0) await new Promise(r => setTimeout(r, 180));
    const url = `https://translate.google.com/translate_tts?ie=UTF-8&client=gtx&q=${encodeURIComponent(chunks[i])}&tl=en`;
    const r = await fetch(url, { headers: { 'User-Agent': GTX_TTS_UA } });
    if (!r.ok) throw new Error(`Google TTS HTTP ${r.status}`);
    const buf = Buffer.from(await r.arrayBuffer());
    if (buf.length < 80) throw new Error('Google TTS returned empty audio');
    bufs.push(buf);
  }
  fs.writeFileSync(outPath, Buffer.concat(bufs));
}

/** Edge TTS uses WSS to Microsoft; many cloud IPs get HTTP 403 on the socket handshake. */
function isEdgeTtsConnectionBlockedError(err) {
  const m = String(err?.message || err || '');
  return (
    m.includes('403') ||
    m.includes('401') ||
    m.toLowerCase().includes('unexpected server response')
  );
}

export async function synthesizeOpenAITts({ apiKey, model, voice, text, outPath }) {
  const res = await fetch('https://api.openai.com/v1/audio/speech', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: model || 'tts-1',
      voice: voice || 'alloy',
      input: text.slice(0, 4096)
    })
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`OpenAI TTS error ${res.status}: ${err.slice(0, 200)}`);
  }

  const buf = Buffer.from(await res.arrayBuffer());
  fs.writeFileSync(outPath, buf);
}

/**
 * Microsoft Edge online TTS — no API key. Subject to Microsoft terms; package license is CC BY-NC-SA (verify for commercial use).
 */
export async function synthesizeEdgeTts({ text, outPath, voice }) {
  const v = (voice || 'en-US-AriaNeural').trim();
  const safe = text.replace(/\s+/g, ' ').trim().slice(0, 2800);
  if (!safe) throw new Error('No narration text for TTS');
  await ttsSave(safe, outPath, { voice: v });
}

/**
 * @param {object} settings — video_tts_provider: edge | openai
 */
export async function synthesizeVideoTts(settings, text, outPath) {
  const provider = (settings.video_tts_provider || 'edge').trim().toLowerCase();

  if (provider === 'openai') {
    const key = (settings.tiktok_openai_api_key || '').trim();
    if (!key) throw new Error('OpenAI TTS selected but no OpenAI API key configured');
    return synthesizeOpenAITts({
      apiKey: key,
      model: settings.tiktok_tts_model,
      voice: settings.tiktok_tts_voice,
      text,
      outPath
    });
  }

  try {
    return await synthesizeEdgeTts({
      text,
      outPath,
      voice: settings.edge_tts_voice
    });
  } catch (e) {
    if (!isEdgeTtsConnectionBlockedError(e)) throw e;
    const key = (settings.tiktok_openai_api_key || '').trim();
    if (key) {
      console.warn('[video] Edge TTS blocked (403) from this host; using OpenAI TTS for this job.');
      return synthesizeOpenAITts({
        apiKey: key,
        model: settings.tiktok_tts_model,
        voice: settings.tiktok_tts_voice,
        text,
        outPath
      });
    }
    try {
      console.warn('[video] Edge TTS blocked; trying Google Translate TTS (no API key, unofficial endpoint).');
      return await synthesizeGoogleGtxTts({ text, outPath });
    } catch (gErr) {
      throw new Error(
        `${e.message || e} — Edge TTS is blocked on this host. Google TTS fallback failed: ${gErr.message || gErr}. ` +
          'Add an OpenAI API key in Short videos → Settings (Voice can stay Edge; OpenAI is used when Edge fails), or choose OpenAI under Voice (TTS).'
      );
    }
  }
}
