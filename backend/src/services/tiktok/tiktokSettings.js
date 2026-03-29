import { prepare } from '../../config/database.js';

const KEYS = [
  'tiktok_enabled',
  'tiktok_openai_api_key',
  'tiktok_openai_model',
  'tiktok_tts_model',
  'tiktok_tts_voice',
  'tiktok_cron',
  'tiktok_site_base_url',
  'tiktok_min_discount',
  'tiktok_repeat_days'
];

export function getTikTokSettings() {
  const out = {};
  for (const k of KEYS) {
    const row = prepare('SELECT value FROM settings WHERE key = ?').get(k);
    out[k] = row?.value ?? '';
  }
  return out;
}

export function getSiteBaseUrl(settings) {
  const fromSetting = (settings.tiktok_site_base_url || '').trim();
  if (fromSetting) return fromSetting.replace(/\/$/, '');
  const env = (process.env.PUBLIC_SITE_URL || '').trim();
  if (env) return env.replace(/\/$/, '');
  return 'https://dealsluxy.com';
}
