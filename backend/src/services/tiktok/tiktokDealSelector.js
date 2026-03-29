import { prepare } from '../../config/database.js';

function scoreDeal(deal) {
  const hasImage = deal.image_url && String(deal.image_url).trim() ? 1 : 0;
  const discount = Math.min(100, Number(deal.discount_percent) || 0);
  const price = Number(deal.current_price) || 0;
  const priceFactor = price > 0 && price < 800 ? 12 : price > 0 ? 8 : 0;
  const variety = Math.random() * 25;
  return hasImage * 30 + discount * 0.25 + priceFactor + variety;
}

/**
 * Pick a deal for TikTok: smart-ish random among top scored candidates, with anti-repeat window.
 * @param {object} opts
 * @param {number} opts.minDiscount
 * @param {number} opts.repeatDays
 * @param {number|null} opts.forcedDealId
 */
export function selectDealForTikTok({ minDiscount, repeatDays, forcedDealId }) {
  if (forcedDealId) {
    const deal = prepare(`
      SELECT d.*, c.name as category_name
      FROM deals d
      LEFT JOIN categories c ON d.category_id = c.id
      WHERE d.id = ? AND d.is_active = 1
    `).get(forcedDealId);
    if (!deal) throw new Error('Deal not found or inactive');
    if (!deal.image_url || !String(deal.image_url).trim()) throw new Error('Deal has no image');
    if ((Number(deal.discount_percent) || 0) < minDiscount) {
      throw new Error(`Deal discount below minimum (${minDiscount}%)`);
    }
    return deal;
  }

  const excludedRows = prepare(`
    SELECT DISTINCT deal_id as id FROM tiktok_video_jobs
    WHERE status = 'completed'
    AND datetime(created_at) > datetime('now', '-' || ? || ' days')
  `).all(String(repeatDays));
  const excluded = new Set(excludedRows.map(r => r.id));

  const deals = prepare(`
    SELECT d.*, c.name as category_name
    FROM deals d
    LEFT JOIN categories c ON d.category_id = c.id
    WHERE d.is_active = 1
    AND d.image_url IS NOT NULL AND TRIM(d.image_url) != ''
    AND (d.discount_percent IS NOT NULL AND d.discount_percent >= ?)
  `).all(minDiscount);

  const candidates = deals.filter(d => !excluded.has(d.id));
  if (candidates.length === 0) {
    throw new Error('No eligible deals (check discount, images, or widen repeat window)');
  }

  const scored = candidates.map(d => ({ deal: d, score: scoreDeal(d) }));
  scored.sort((a, b) => b.score - a.score);
  const top = scored.slice(0, Math.min(15, scored.length));
  return top[Math.floor(Math.random() * top.length)].deal;
}
