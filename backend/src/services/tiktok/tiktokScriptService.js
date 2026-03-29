/**
 * OpenAI: English script + on-screen lines + caption/hashtags (JSON).
 */
export async function generateTikTokScript({
  apiKey,
  model,
  deal
}) {
  const price = Number(deal.current_price) || 0;
  const was = Number(deal.original_price) || null;
  const discount = Number(deal.discount_percent) || 0;
  const category = deal.category_name || 'item';
  const currency = deal.currency || 'USD';

  const sys = `You write punchy English scripts for short vertical TikTok-style promo videos (9:16).
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

  const user = `Product title: ${deal.title}
Category: ${category}
Current price: ${currency} ${price.toFixed(2)}
${was && was > price ? `Original price: ${currency} ${was.toFixed(2)}\nDiscount: about ${Math.round(discount)}%` : 'Discount: highlight deal value'}

Choose the strongest angle for this product.`;

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
        { role: 'system', content: sys },
        { role: 'user', content: user }
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

  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error('OpenAI returned non-JSON');
  }

  if (!parsed.narration || !Array.isArray(parsed.screen_lines)) {
    throw new Error('OpenAI JSON missing narration or screen_lines');
  }

  return parsed;
}
