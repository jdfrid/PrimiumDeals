import { prepare } from '../../config/database.js';

/**
 * Optional env overrides (survive SQLite loss on ephemeral hosts like Render without a disk).
 * Values from env take precedence over the `settings` table.
 */
const CREATIVE_ENV_OVERRIDES = [
  ['CREATIVE_GEMINI_API_KEY', 'creative_gemini_api_key'],
  ['CREATIVE_OPENAI_API_KEY', 'creative_openai_api_key'],
  ['CREATIVE_MAGNIFIC_API_KEY', 'creative_magnific_api_key'],
  ['CREATIVE_LLM_PROVIDER', 'creative_llm_provider'],
  ['CREATIVE_GEMINI_MODEL', 'creative_gemini_model'],
  ['CREATIVE_OPENAI_MODEL', 'creative_openai_model']
];

/** Settings used only by the Creative video studio (Pexels + Shotstack) — independent from Short videos / deals pipeline. */
export const CREATIVE_STUDIO_SETTING_KEYS = [
  'creative_llm_provider',
  'creative_gemini_api_key',
  'creative_gemini_model',
  'creative_openai_api_key',
  'creative_openai_model',
  'creative_magnific_api_key',
  'creative_video_provider',
  'creative_video_auto_enabled',
  'creative_video_cron',
  'creative_auto_description',
  'creative_auto_tone'
];

export function getCreativeStudioSettings() {
  const out = {};
  for (const k of CREATIVE_STUDIO_SETTING_KEYS) {
    const row = prepare('SELECT value FROM settings WHERE key = ?').get(k);
    out[k] = row?.value ?? '';
  }
  for (const [envName, settingKey] of CREATIVE_ENV_OVERRIDES) {
    const v = (process.env[envName] || '').trim();
    if (v) out[settingKey] = v;
  }
  return out;
}

/** For admin UI: show whether secrets survive ephemeral SQLite. */
export function getCreativeStudioEnvOverrideFlags() {
  return {
    gemini_api_from_env: !!(process.env.CREATIVE_GEMINI_API_KEY || '').trim(),
    openai_api_from_env: !!(process.env.CREATIVE_OPENAI_API_KEY || '').trim(),
    magnific_api_from_env: !!(process.env.CREATIVE_MAGNIFIC_API_KEY || '').trim(),
    llm_provider_from_env: !!(process.env.CREATIVE_LLM_PROVIDER || '').trim(),
    gemini_model_from_env: !!(process.env.CREATIVE_GEMINI_MODEL || '').trim(),
    openai_model_from_env: !!(process.env.CREATIVE_OPENAI_MODEL || '').trim()
  };
}
