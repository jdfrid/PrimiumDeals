/** Must match `frontend/src/services/api.js` so outbound clicks hit the Node API (not the static host). */
const API_ORIGIN = (import.meta.env.VITE_API_URL || '').trim().replace(/\/$/, '');

/**
 * @param {string | number} dealId
 * @param {string} [query] optional query string without leading `?` (e.g. utm params)
 */
export function getTrackClickUrl(dealId, query) {
  const base = API_ORIGIN ? `${API_ORIGIN}/api/track/click` : '/api/track/click';
  const path = `${base}/${dealId}`;
  if (!query) return path;
  const q = query.startsWith('?') ? query.slice(1) : query;
  return `${path}?${q}`;
}
