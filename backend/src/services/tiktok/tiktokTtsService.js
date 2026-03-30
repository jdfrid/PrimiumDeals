import fs from 'fs';
import { ttsSave } from 'edge-tts/out/index.js';

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
    throw new Error(
      `${e.message || e} — Edge TTS is often blocked on cloud servers. ` +
        'In Short videos → Settings, add an OpenAI API key and set Voice (TTS) to OpenAI, or run the backend from a network that can reach speech.platform.bing.com.'
    );
  }
}
