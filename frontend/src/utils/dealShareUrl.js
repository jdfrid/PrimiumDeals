/** Full URL for sharing a deal detail page (pathname routing; works with SPA fallback). */
export function getDealShareUrl(dealId) {
  if (dealId == null || typeof window === 'undefined') return '';
  const { origin } = window.location;
  return `${origin}/deal/${dealId}`;
}
