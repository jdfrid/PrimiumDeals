/**
 * Magnific API — Kling 4K text-to-video
 * https://docs.magnific.com/api-reference/video/post-kling-4k-t2v
 *
 * Auth: header x-magnific-api-key
 */

const BASE_URL = (process.env.MAGNIFIC_API_BASE_URL || 'https://api.magnific.com').replace(/\/$/, '');

const ALLOWED_DURATIONS = [3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15];

export function getMagnificApiKeyFromSettings(settings) {
  const fromDb = (settings?.creative_magnific_api_key || '').trim();
  const fromEnv = (process.env.CREATIVE_MAGNIFIC_API_KEY || '').trim();
  return fromEnv || fromDb;
}

export function isMagnificConfigured(settings) {
  return getMagnificApiKeyFromSettings(settings).length > 0;
}

/** Snap to Magnific enum (3–15 seconds). */
export function clampMagnificDuration(secondsHint) {
  const n = Math.round(Number(secondsHint));
  const raw = Number.isFinite(n) ? n : 5;
  const clamped = Math.min(15, Math.max(3, raw));
  return ALLOWED_DURATIONS.reduce((best, d) => (Math.abs(d - clamped) < Math.abs(best - clamped) ? d : best));
}

function extractTaskId(json) {
  const id = json?.data?.task_id ?? json?.data?.taskId ?? json?.task_id ?? json?.taskId;
  return id ? String(id) : null;
}

/**
 * @param {string} apiKey
 * @param {{ prompt: string, aspect_ratio?: string, duration?: number, cfg_scale?: number, negative_prompt?: string }} body
 */
export async function createKling4kT2vTask(apiKey, body) {
  const res = await fetch(`${BASE_URL}/v1/ai/video/kling-4k-t2v`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-magnific-api-key': apiKey
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(120000)
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = json?.message || json?.problem?.message || JSON.stringify(json).slice(0, 500);
    throw new Error(`Magnific Kling 4K T2V ${res.status}: ${msg}`);
  }
  const taskId = extractTaskId(json);
  if (!taskId) throw new Error(`Magnific did not return task_id: ${JSON.stringify(json).slice(0, 300)}`);
  return taskId;
}

export async function getKling4kT2vTask(apiKey, taskId) {
  const res = await fetch(`${BASE_URL}/v1/ai/video/kling-4k-t2v/${encodeURIComponent(taskId)}`, {
    headers: { 'x-magnific-api-key': apiKey },
    signal: AbortSignal.timeout(90000)
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = json?.message || JSON.stringify(json).slice(0, 400);
    throw new Error(`Magnific task ${res.status}: ${msg}`);
  }
  const data = json?.data ?? json;
  const status = String(data?.status ?? '').toUpperCase();
  const generated = Array.isArray(data?.generated) ? data.generated.filter(Boolean) : [];
  return { status, generated, task_id: data?.task_id ? String(data.task_id) : String(taskId) };
}

/**
 * Poll until COMPLETED or FAILED.
 * @returns {{ url: string, generated: string[] }}
 */
export async function waitForKling4kT2v(apiKey, taskId, opts = {}) {
  const maxMs = opts.maxWaitMs ?? 22 * 60 * 1000;
  const interval = opts.intervalMs ?? 6000;
  const start = Date.now();

  while (Date.now() - start < maxMs) {
    const t = await getKling4kT2vTask(apiKey, taskId);
    if (t.status === 'COMPLETED' && t.generated.length) {
      return { url: t.generated[0], generated: t.generated };
    }
    if (t.status === 'FAILED') {
      throw new Error(`Magnific Kling task ${taskId} FAILED`);
    }
    await new Promise(r => setTimeout(r, interval));
  }
  throw new Error('Magnific Kling task timed out while polling');
}
