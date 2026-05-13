/**
 * Normalizes VITE_API_URL: trims slashes and strips a trailing `/api`
 * so we never build URLs like https://host/api/api/...
 */
export function getApiOrigin() {
  let base = (import.meta.env.VITE_API_URL || '').trim().replace(/\/+$/, '');
  if (/\/api$/i.test(base)) {
    base = base.slice(0, -4).replace(/\/+$/, '');
  }
  return base;
}
