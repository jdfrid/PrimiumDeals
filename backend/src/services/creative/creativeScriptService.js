import { getToneById } from './creativeAssets.js';

function hashString(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** When the client writes in Hebrew/Cyrillic/etc., Pexels needs English queries — rotate concrete sets per job. */
const TEMPLATE_QUERY_SETS = [
  ['coffee shop interior', 'couple cafe conversation', 'hands holding cup', 'warm ambient lights vertical'],
  ['city street walking', 'urban lifestyle portrait', 'golden hour people', 'vertical b-roll lifestyle'],
  ['home cozy morning', 'window natural light', 'slow living aesthetic', 'indoor plants vertical'],
  ['workspace desk setup', 'typing laptop close', 'creative office vibe', 'modern interior vertical'],
  ['beach sunset silhouette', 'ocean waves vertical', 'travel moment handheld', 'summer outdoor people'],
  ['fitness gym energy', 'workout motivation vertical', 'healthy lifestyle clip', 'training close up'],
  ['cooking kitchen hands', 'food preparation vertical', 'restaurant kitchen steam', 'dining table setup'],
  ['night city lights', 'neon bokeh vertical', 'car interior pov', 'rainy window mood']
];

const TEMPLATE_LATIN_TAIL_SETS = [
  'authentic moment vertical',
  'real life b-roll portrait',
  'cinematic handheld clip',
  'soft natural lighting vertical',
  'everyday lifestyle footage',
  'close detail emotional beat',
  'urban mood vertical video',
  'calm aesthetic b-roll'
];

function hasNonLatinScript(text) {
  return /[^\u0000-\u007F\u0080-\u024F]/.test(text);
}

const BRIEF_SCHEMA = `Return ONLY valid JSON:
{
  "title": "short hook line for the video (English)",
  "narration": "single voiceover paragraph: MUST be fluent English. If the client wrote in Hebrew or another language, translate the full story into natural spoken English (same plot, characters, beats). Max ~110 words, under ~55 seconds at normal pace.",
  "pexels_search_queries": ["2-4 short search phrases for stock B-roll, in English, tightly matching the story (who/where/what)"],
  "scenes": [
    { "text": "on-screen caption, max 8 words", "start_sec": 0, "duration_sec": 4 }
  ],
  "shotstack_voice": "Matthew",
  "tts_language": "en-US",
  "production_notes": "optional notes for editors (camera, pacing, brand)"
}
Rules:
- narration + on-screen caption text: English only (translation OK when input was not English).
- scenes: 4–7 items; each caption must name a concrete beat from the client's idea (not generic filler like "Quick tip" or "Stay tuned").
- start_sec non-overlapping in order; total visual coverage ~0–48s.
- pexels_search_queries: concrete English visual search terms a stock site would return (e.g. "coffee shop couple hands", "diamond ring close up").
- shotstack_voice: one of Matthew, Joanna, Amy, Brian, Emma, Geraint, Nicole, Russell, Raveena, Joey, Justin, Kendra, Kimberly, Salli — pick one that fits the tone.
- tts_language: use en-US whenever narration is English (default). Omit or en-US unless Shotstack docs list another code you need.`;

function isLlmQuotaOrRateLimitError(err) {
  const m = String(err?.message || err || '').toLowerCase();
  return (
    m.includes('429') ||
    m.includes('quota') ||
    m.includes('rate limit') ||
    m.includes('resource exhausted')
  );
}

function parseBrief(raw, label) {
  let p;
  try {
    p = JSON.parse(raw);
  } catch {
    throw new Error(`${label} returned non-JSON`);
  }
  if (!p.narration || typeof p.narration !== 'string') {
    throw new Error(`${label} JSON missing narration`);
  }
  if (!Array.isArray(p.pexels_search_queries) || p.pexels_search_queries.length < 1) {
    p.pexels_search_queries = ['lifestyle vertical video'];
  }
  if (!Array.isArray(p.scenes)) {
    p.scenes = [];
  }
  p.narration = p.narration.replace(/\s+/g, ' ').trim().slice(0, 4500);
  if (p.tts_language && typeof p.tts_language === 'string') {
    p.tts_language = p.tts_language.trim().slice(0, 16);
  }
  return p;
}

function unwrapJsonFence(raw) {
  let s = String(raw).trim();
  if (s.startsWith('```')) {
    s = s.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/u, '');
  }
  return s.trim();
}

function extractGeminiResponseText(data) {
  const err = data?.error;
  if (err) {
    throw new Error(`Gemini API: ${err.message || JSON.stringify(err).slice(0, 400)}`);
  }
  const feedback = data.promptFeedback;
  if (feedback?.blockReason) {
    throw new Error(`Gemini blocked the prompt (${feedback.blockReason}).`);
  }
  const candidates = data.candidates;
  if (!Array.isArray(candidates) || candidates.length === 0) {
    const msg = feedback ? JSON.stringify(feedback) : JSON.stringify(data).slice(0, 500);
    throw new Error(`Gemini returned no candidates — ${msg}`);
  }
  const cand = candidates[0];
  const reason = cand.finishReason;
  if (reason === 'SAFETY' || reason === 'RECITATION') {
    throw new Error(`Gemini refused output (finishReason=${reason}).`);
  }
  const parts = cand.content?.parts;
  if (!Array.isArray(parts)) {
    throw new Error('Gemini: missing content.parts in response');
  }
  const text = parts.map(p => (typeof p?.text === 'string' ? p.text : '')).join('');
  const trimmed = text.trim();
  if (!trimmed) {
    throw new Error(
      `Gemini returned empty text (finishReason=${reason || 'unknown'}). Try another model or shorten input.`
    );
  }
  return trimmed;
}

const LLM_RAW_MAX = 240_000;

function attachDebug(brief, { provider, model, userPrompt, llmRawText }) {
  const raw =
    llmRawText != null && String(llmRawText).trim()
      ? String(llmRawText).slice(0, LLM_RAW_MAX)
      : undefined;
  return {
    ...brief,
    debug: {
      ...(brief.debug || {}),
      llm_provider: provider,
      llm_model: model || null,
      prompt_user_block: userPrompt,
      ...(raw != null ? { llm_raw_text: raw } : {})
    }
  };
}

async function briefOpenAI({ apiKey, model, userBlock }) {
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: model || 'gpt-4o-mini',
      response_format: { type: 'json_object' },
      temperature: 0.85,
      messages: [
        { role: 'system', content: `You are a senior short-form video producer. ${BRIEF_SCHEMA}` },
        { role: 'user', content: userBlock }
      ]
    })
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`OpenAI chat error ${res.status}: ${err.slice(0, 300)}`);
  }
  const data = await res.json();
  const raw = data.choices?.[0]?.message?.content;
  if (!raw) throw new Error('OpenAI returned empty content');
  return { brief: parseBrief(raw, 'OpenAI'), llmRawText: String(raw) };
}

async function briefGemini({ apiKey, model, userBlock }) {
  const userTrim = String(userBlock || '').trim();
  if (!userTrim) {
    throw new Error('Gemini: client brief (user block) is empty');
  }

  const m = (model || 'gemini-2.0-flash').trim();
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(m)}:generateContent?key=${encodeURIComponent(apiKey)}`;

  const systemText = `You are a senior short-form video producer.

Read the entire user message after "CLIENT BRIEF". Output must reflect that input. Output ONLY one JSON object — no markdown fences, no extra text.

Schema and rules:
${BRIEF_SCHEMA}`;

  const userText = `=== CLIENT BRIEF ===\n\n${userTrim}`;

  const generationConfig = {
    temperature: 0.85,
    responseMimeType: 'application/json'
  };

  const bodyWithSystem = {
    systemInstruction: { parts: [{ text: systemText }] },
    contents: [{ role: 'user', parts: [{ text: userText }] }],
    generationConfig
  };

  const bodyFallback = {
    contents: [
      {
        role: 'user',
        parts: [{ text: `${systemText}\n\n---\n\n${userText}` }]
      }
    ],
    generationConfig
  };

  const post = async body =>
    fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(120000)
    });

  let res = await post(bodyWithSystem);
  let data = await res.json().catch(() => ({}));

  if (!res.ok && res.status === 400) {
    console.warn('[creative-video] Gemini systemInstruction failed; retrying combined message:', JSON.stringify(data).slice(0, 280));
    res = await post(bodyFallback);
    data = await res.json().catch(() => ({}));
  }

  if (!res.ok) {
    throw new Error(`Gemini error ${res.status}: ${JSON.stringify(data).slice(0, 450)}`);
  }

  const extracted = extractGeminiResponseText(data);
  const rawForParse = unwrapJsonFence(extracted);
  return { brief: parseBrief(rawForParse, 'Gemini'), llmRawText: extracted };
}

function userBlock({ videoDescription, toneId, userNotes, toneHint }) {
  return `Video idea from the client:\n${videoDescription}\n\nTone / audience style: ${toneId}\nTone direction: ${toneHint}\n\nExtra creative direction:\n${userNotes || '(none)'}`;
}

export function generateBriefTemplate({ videoDescription, toneId, userNotes }) {
  const tone = getToneById(toneId);
  const desc = videoDescription.replace(/\s+/g, ' ').trim().slice(0, 500);
  const notes = (userNotes || '').replace(/\s+/g, ' ').trim().slice(0, 400);

  /** Shotstack TTS uses en-US — never feed Hebrew/non-Latin into the voiceover string or it sounds broken. */
  const narration = hasNonLatinScript(desc)
    ? `This is a short vertical clip built around your idea. We paired stock footage with on-screen captions — the story you typed is kept in the brief for editors, but the voiceover stays in clear English so text-to-speech sounds natural. ${tone.hint}. ${
        notes ? 'We also kept your extra notes in mind for tone and pacing. ' : ''
      }If you need the spoken script to follow your exact plot, switch the studio to Gemini or OpenAI in settings. Thanks for watching.`
    : `Here's a quick take on something worth your attention: ${desc}. ${tone.hint}. ${
        notes ? `Keep in mind: ${notes}. ` : ''
      }If this resonates, save it for later and share it with someone who'd appreciate the tip. Stay curious — more ideas coming soon.`;

  const h = hashString(`${desc}\n${notes}`);
  let pexels_search_queries;
  let template_query_mode;
  if (hasNonLatinScript(desc)) {
    pexels_search_queries = [...TEMPLATE_QUERY_SETS[h % TEMPLATE_QUERY_SETS.length]];
    template_query_mode = 'rotated_english_set_non_latin';
  } else {
    const words = desc.split(/\s+/).filter(Boolean);
    const head = words.slice(0, 5).join(' ') || 'lifestyle inspiration';
    const tail = TEMPLATE_LATIN_TAIL_SETS[h % TEMPLATE_LATIN_TAIL_SETS.length];
    pexels_search_queries = [head, `${head} ${tail}`, tail, 'vertical lifestyle b-roll portrait'];
    template_query_mode = 'latin_head_plus_tail';
  }

  return {
    title: desc.slice(0, 72) || 'Quick idea',
    narration,
    pexels_search_queries,
    scenes: [
      { text: 'Quick idea', start_sec: 0, duration_sec: 3 },
      { text: 'Here is the takeaway', start_sec: 3, duration_sec: 4 },
      { text: 'Worth remembering', start_sec: 7, duration_sec: 4 },
      { text: 'Share if it helps', start_sec: 11, duration_sec: 4 },
      { text: 'More soon', start_sec: 15, duration_sec: 4 }
    ],
    shotstack_voice: 'Matthew',
    production_notes: `Template mode (no LLM). Tone=${tone.id}.`,
    debug: {
      llm_provider: 'template',
      template_query_mode,
      prompt_user_block: userBlock({
        videoDescription: desc,
        toneId: tone.id,
        userNotes: notes,
        toneHint: tone.hint
      })
    }
  };
}

/** @param {Record<string, string>} settings — Creative studio only (see creativeStudioSettings.js). */
export async function generateCreativeBrief(settings, { videoDescription, toneId, userNotes }) {
  const tone = getToneById(toneId);
  const vd = String(videoDescription ?? '').trim();
  if (!vd) {
    throw new Error('חסר תיאור סרטון — לא ניתן לבקש תסריט מהמודל');
  }
  const block = userBlock({
    videoDescription: vd,
    toneId: tone.id,
    userNotes,
    toneHint: tone.hint
  });

  const p = (settings.creative_llm_provider || 'template').trim().toLowerCase();

  if (p === 'openai') {
    const key = (settings.creative_openai_api_key || '').trim();
    if (!key) throw new Error('Creative studio: OpenAI selected but no API key configured');
    try {
      const { brief, llmRawText } = await briefOpenAI({
        apiKey: key,
        model: settings.creative_openai_model,
        userBlock: block
      });
      return attachDebug(brief, {
        provider: 'openai',
        model: settings.creative_openai_model || 'gpt-4o-mini',
        userPrompt: block,
        llmRawText
      });
    } catch (e) {
      if (isLlmQuotaOrRateLimitError(e)) {
        console.warn('[creative-video] OpenAI quota/rate limit; using template brief.');
        const t = generateBriefTemplate({ videoDescription: vd, toneId: tone.id, userNotes });
        t.debug = { ...(t.debug || {}), fallback_from_llm: 'openai_quota_or_rate_limit' };
        return t;
      }
      throw e;
    }
  }

  if (p === 'gemini') {
    const key = (settings.creative_gemini_api_key || '').trim();
    if (!key) {
      throw new Error(
        'Creative studio: נבחר Gemini אבל אין מפתח — שמרו בהגדרות או הגדירו CREATIVE_GEMINI_API_KEY בסביבה'
      );
    }
    try {
      const { brief, llmRawText } = await briefGemini({
        apiKey: key,
        model: settings.creative_gemini_model,
        userBlock: block
      });
      return attachDebug(brief, {
        provider: 'gemini',
        model: settings.creative_gemini_model || 'gemini-2.0-flash',
        userPrompt: block,
        llmRawText
      });
    } catch (e) {
      if (isLlmQuotaOrRateLimitError(e)) {
        console.warn('[creative-video] Gemini quota/rate limit; using template brief.');
        const t = generateBriefTemplate({ videoDescription: vd, toneId: tone.id, userNotes });
        t.debug = { ...(t.debug || {}), fallback_from_llm: 'gemini_quota_or_rate_limit' };
        return t;
      }
      throw e;
    }
  }

  return generateBriefTemplate({ videoDescription: vd, toneId: tone.id, userNotes });
}
