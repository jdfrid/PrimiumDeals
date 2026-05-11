/** eBay SERP URLs do not land on a single listing — treat as unresolved. */
export function ebayUrlLooksLikeSearch(url) {
  if (!url || typeof url !== 'string') return true;
  const u = url.toLowerCase();
  if (u.includes('/sch/')) return true;
  if (u.includes('sch/i.html')) return true;
  if (/[?&]_nkw=/.test(u)) return true;
  return false;
}

/** Returns numeric legacy item id when possible (handles Browse API v1|id|hash). */
export function legacyEbayListingId(ebayItemId) {
  if (!ebayItemId || typeof ebayItemId !== 'string') return '';
  const id = ebayItemId.trim();
  if (/^sample-/i.test(id)) return '';
  if (id.includes('|')) {
    const parts = id.split('|').filter(Boolean);
    // Match ebayService.getAffiliateUrl: REST items often use v1|<legacy>|<rev>
    if (parts[0] === 'v1' && parts[1] && /^\d+$/.test(parts[1])) return parts[1];
    const mid = parts.find((p) => /^\d{4,}$/.test(p));
    if (mid) return mid;
  }
  if (/^\d{4,}$/.test(id)) return id;
  return '';
}

/** Prefer /itm/ URL when stored link is search-like but item id exists. */
export function resolveDealOutboundUrl(deal) {
  const source = (deal.source || 'ebay').toLowerCase();
  const stored = deal.ebay_url || '';
  if (source !== 'ebay') return stored;

  if (!ebayUrlLooksLikeSearch(stored)) return stored;

  const legacy = legacyEbayListingId(deal.ebay_item_id);
  if (!legacy) return stored;

  const campaignId = process.env.EBAY_CAMPAIGN_ID || '5339122678';
  return `https://www.ebay.com/itm/${legacy}?mkcid=1&mkrid=711-53200-19255-0&siteid=0&campid=${campaignId}&toolid=10001&mkevt=1`;
}
