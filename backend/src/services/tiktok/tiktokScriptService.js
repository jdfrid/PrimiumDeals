const JSON_INSTRUCTION = `You write punchy English scripts for short vertical promo videos (9:16).
Return ONLY valid JSON with this shape:
{
  "angle": "savings" | "luxury" | "surprise" | "utility" | "urgency",
  "hook": "string, first 0-2 seconds, scroll-stopping",
  "body": "string, present the product",
  "value": "string, price or deal angle",
  "cta": "string, tell viewer to check the link",
  "narration": "string, one continuous voiceover paragraph, ~45-90 words, natural spoken English",
  "screen_lines": [
    { "text": "string max ~6 words", "start": 0, "end": 2.5 },
    { "text": "string", "start": 2.5, "end": 6 },
    { "text": "string", "start": 6, "end": 10 },
    { "text": "string", "start": 10, "end": 14 }
  ],
  "caption": "string, one line for TikTok caption",
  "hashtags": ["array", "of", "5-8", "tags", "no", "#"]
}
Rules:
- English only.
- Do not claim stock levels or inventory you cannot verify; use soft urgency.
- screen_lines timings must cover roughly 0–14s; keep total narration suitable for 12–22s spoken at normal pace.
- Hashtags: lowercase, no # in JSON strings.`;

function dealUserBlock(deal) {
  const price = Number(deal.current_price) || 0;
  const was = Number(deal.original_price) || null;
  const discount = Number(deal.discount_percent) || 0;
  const category = deal.category_name || 'item';
  const currency = deal.currency || 'USD';

  return `Product title: ${deal.title}
Category: ${category}
Current price: ${currency} ${price.toFixed(2)}
${was && was > price ? `Original price: ${currency} ${was.toFixed(2)}\nDiscount: about ${Math.round(discount)}%` : 'Discount: highlight deal value'}

Choose the strongest angle for this product.`;
}

function parseScriptJson(raw, sourceLabel) {
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error(`${sourceLabel} returned non-JSON`);
  }
  if (!parsed.narration || !Array.isArray(parsed.screen_lines)) {
    throw new Error(`${sourceLabel} JSON missing narration or screen_lines`);
  }
  return parsed;
}

/**
 * OpenAI: English script JSON.
 */
export async function generateScriptOpenAI({ apiKey, model, deal }) {
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: model || 'gpt-4o-mini',
      response_format: { type: 'json_object' },
      temperature: 0.9,
      messages: [
        { role: 'system', content: JSON_INSTRUCTION },
        { role: 'user', content: dealUserBlock(deal) }
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
  return parseScriptJson(raw, 'OpenAI');
}

/**
 * Google Gemini (free tier via AI Studio key): same JSON output.
 */
export async function generateScriptGemini({ apiKey, model, deal }) {
  const m = (model || 'gemini-2.0-flash').trim();
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(m)}:generateContent?key=${encodeURIComponent(apiKey)}`;

  const fullPrompt = `${JSON_INSTRUCTION}\n\n---\n${dealUserBlock(deal)}`;

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ role: 'user', parts: [{ text: fullPrompt }] }],
      generationConfig: {
        responseMimeType: 'application/json',
        temperature: 0.9
      }
    })
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Gemini error ${res.status}: ${err.slice(0, 400)}`);
  }

  const data = await res.json();
  const raw = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!raw) throw new Error('Gemini returned empty content');
  return parseScriptJson(raw, 'Gemini');
}

/**
 * No API: deterministic English copy from deal fields.
 */
export function generateScriptTemplate({ deal }) {
  const price = Number(deal.current_price) || 0;
  const was = Number(deal.original_price) || null;
  const discount = Math.round(Number(deal.discount_percent) || 0);
  const currency = deal.currency || 'USD';
  const titleShort =
    deal.title.length > 72 ? `${deal.title.slice(0, 69)}…` : deal.title;

  const hook =
    was && was > price && discount > 0
      ? `Wait — this is about ${discount}% off right now.`
      : `This catch is worth a quick look.`;

  const body = `We're spotlighting: ${titleShort}.`;
  const value =
    was && was > price
      ? `It was around ${currency} ${was.toFixed(0)} — now about ${currency} ${price.toFixed(2)}.`
      : `Current price: ${currency} ${price.toFixed(2)}.`;
  const cta = `Tap the link for full details before the deal moves.`;
  const narration = `${hook} ${body} ${value} ${cta}`;

  return {
    angle: 'savings',
    hook,
    body,
    value,
    cta,
    narration,
    screen_lines: [
      { text: hook.replace(/\.$/, '').slice(0, 42), start: 0, end: 3 },
      { text: titleShort.slice(0, 36), start: 3, end: 7 },
      {
        text: `~${currency} ${price.toFixed(0)}`,
        start: 7,
        end: 11
      },
      { text: 'Link in caption', start: 11, end: 14 }
    ],
    caption: `${titleShort} — deal spotlight`,
    hashtags: ['deals', 'shopping', 'sale', 'bargain', 'savemoney', 'founditonline']
  };
}

/**
 * Route by admin setting video_llm_provider: template | gemini | openai
 */
export async function generateVideoScript(settings, deal) {
  const p = (settings.video_llm_provider || 'template').trim().toLowerCase();

  if (p === 'openai') {
    const key = (settings.tiktok_openai_api_key || '').trim();
    if (!key) throw new Error('OpenAI selected but no API key configured');
    return generateScriptOpenAI({
      apiKey: key,
      model: settings.tiktok_openai_model,
      deal
    });
  }

  if (p === 'gemini') {
    const key = (settings.gemini_api_key || '').trim();
    if (!key) throw new Error('Gemini selected but no API key configured (get one free at Google AI Studio)');
    return generateScriptGemini({
      apiKey: key,
      model: settings.gemini_model,
      deal
    });
  }

  return generateScriptTemplate({ deal });
}

/** @deprecated use generateVideoScript */
export async function generateTikTokScript({ apiKey, model, deal }) {
  return generateScriptOpenAI({ apiKey, model, deal });
}
