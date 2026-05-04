/** Full URL for sharing a deal detail page (HashRouter). */
export function getDealShareUrl(dealId) {
  if (dealId == null || typeof window === 'undefined') return '';
  const { origin, pathname } = window.location;
  return `${origin}${pathname}#/deal/${dealId}`;
}
