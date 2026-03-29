import fs from 'fs';
import { ttsSave } from 'edge-tts/out/index.js';

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

  return synthesizeEdgeTts({
    text,
    outPath,
    voice: settings.edge_tts_voice
  });
}
