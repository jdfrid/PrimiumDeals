import { prepare } from '../../config/database.js';

const KEYS = [
  'video_engine_auto_enabled',
  'video_utm_source',
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

/** Daily automation for MP4 generation only (not TikTok upload). */
export function isVideoAutomationEnabled(settings) {
  const v = (settings.video_engine_auto_enabled || '').trim();
  if (v === 'true') return true;
  if (v === 'false') return false;
  return (settings.tiktok_enabled || '').trim() === 'true';
}

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
