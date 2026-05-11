import { TrendingDown, ShoppingBag } from 'lucide-react';
import { getTrackClickUrl } from '../utils/trackClickUrl';

function SourceBadge({ source }) {
  if (source === 'banggood') {
    return (
      <div className="w-8 h-8 rounded-lg bg-orange-500 flex items-center justify-center text-white text-xs font-bold shadow" title="Banggood">
        B
      </div>
    );
  }
  return (
    <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center shadow" title="eBay">
      <svg viewBox="0 0 24 24" className="w-5 h-5 fill-white">
        <path d="M5.517 8.058c-1.793 0-2.98 1.016-2.98 2.73v.167c0 1.594 1.065 2.73 2.98 2.73 1.092 0 1.835-.32 2.312-.97l-.935-.779c-.337.392-.74.598-1.377.598-.934 0-1.497-.473-1.614-1.28h4.115v-.466c0-1.714-1.187-2.73-2.501-2.73zm-.09 1.151c.72 0 1.208.4 1.282 1.186H3.458c.107-.72.574-1.186 1.97-1.186zm13.09-1.151c-1.793 0-2.98 1.016-2.98 2.73v.167c0 1.594 1.065 2.73 2.98 2.73 1.092 0 1.835-.32 2.312-.97l-.935-.779c-.337.392-.74.598-1.377.598-.934 0-1.497-.473-1.614-1.28h4.115v-.466c0-1.714-1.187-2.73-2.501-2.73zm-.09 1.151c.72 0 1.208.4 1.282 1.186h-2.251c.107-.72.574-1.186 1.97-1.186zM8.67 5.233v4.825h-.033c-.28-.533-.86-.928-1.704-.928-1.472 0-2.358 1.122-2.358 2.73v.167c0 1.608.886 2.73 2.358 2.73.844 0 1.424-.395 1.704-.928h.033v.786h1.319V5.233H8.67zm-1.48 5.048c.747 0 1.245.506 1.245 1.579v.167c0 1.073-.498 1.579-1.246 1.579-.747 0-1.245-.506-1.245-1.58v-.166c0-1.073.498-1.58 1.245-1.58zm6.727-2.223l-1.77 5.55h-.033l-1.77-5.55h-1.397l2.432 7.07-.148.433c-.165.482-.436.647-.886.647-.181 0-.363-.017-.526-.05v1.15c.23.05.479.084.754.084.992 0 1.533-.44 1.934-1.654l2.808-7.68h-1.398z" />
      </svg>
    </div>
  );
}

function formatMoney(amount, currency = 'USD') {
  const n = Number(amount);
  if (Number.isNaN(n)) return '—';
  const sym = currency === 'USD' ? '$' : `${currency} `;
  return `${sym}${n.toFixed(0)}`;
}

/**
 * Shared deal detail body for landing page and query-param modal.
 * @param {{ deal: object | null, loading?: boolean, error?: string | null, className?: string, footer?: import('react').ReactNode }} props
 */
export default function DealPreview({ deal, loading, error, className = '', footer }) {
  if (loading) {
    return (
      <div className={`animate-pulse space-y-4 ${className}`}>
        <div className="aspect-square max-w-md mx-auto bg-gray-200 rounded-xl" />
        <div className="h-6 bg-gray-200 rounded w-3/4 mx-auto" />
        <div className="h-4 bg-gray-200 rounded w-1/2 mx-auto" />
      </div>
    );
  }

  if (error) {
    return (
      <div className={`text-center py-8 ${className}`}>
        <p className="text-red-600 font-medium">{error}</p>
      </div>
    );
  }

  if (!deal) return null;

  const savings =
    deal.original_price != null && deal.current_price != null
      ? Number(deal.original_price) - Number(deal.current_price)
      : null;
  const currency = deal.currency || 'USD';

  return (
    <div className={className}>
      <div className="relative aspect-square max-w-md mx-auto overflow-hidden rounded-xl bg-gray-50 border border-gray-100">
        <img
          src={deal.image_url || '/placeholder.jpg'}
          alt={deal.title || ''}
          className="w-full h-full object-cover"
        />
        <div className="absolute top-3 left-3 bg-red-500 text-white px-2 py-1 rounded-lg text-sm font-bold shadow-lg">
          -{deal.discount_percent}%
        </div>
        <div className="absolute top-3 right-3">
          <SourceBadge source={deal.source} />
        </div>
        {deal.category_name && (
          <div className="absolute bottom-3 left-3 bg-white/95 backdrop-blur-sm px-2 py-1 rounded text-xs font-medium text-gray-600 shadow">
            {deal.category_icon} {deal.category_name}
          </div>
        )}
      </div>

      <div className="mt-6 space-y-4">
        <h1 className="text-xl md:text-2xl font-bold text-gray-900 leading-snug">{deal.title}</h1>

        <div className="flex flex-wrap items-end gap-3">
          <span className="text-gray-400 line-through">{formatMoney(deal.original_price, currency)}</span>
          <span className="text-3xl font-bold text-gray-900">{formatMoney(deal.current_price, currency)}</span>
          {savings != null && savings > 0 && (
            <span className="inline-flex items-center gap-1 text-green-600 text-sm font-medium bg-green-50 px-2 py-1 rounded">
              <TrendingDown size={14} />
              Save {formatMoney(savings, currency)}
            </span>
          )}
        </div>

        {deal.condition && (
          <p className="text-sm text-gray-600">
            <span className="font-medium text-gray-700">Condition:</span> {deal.condition}
          </p>
        )}

        <p className="text-sm text-gray-500 leading-relaxed border-t border-gray-100 pt-4">
          This item is sold and fulfilled by the marketplace seller ({deal.source === 'banggood' ? 'Banggood' : 'eBay'}).
          We link out for convenience; pricing and availability are determined by the seller.
        </p>
      </div>

      {footer != null ? <div className="mt-6 space-y-3">{footer}</div> : null}
    </div>
  );
}

export function DealPreviewTrackCta({ dealId, className = '' }) {
  if (dealId == null) return null;
  const href = getTrackClickUrl(dealId);
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={`flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-orange-500 to-red-500 text-white py-3 font-semibold shadow-md hover:from-orange-600 hover:to-red-600 transition-all ${className}`}
    >
      <ShoppingBag size={18} />
      Continue to seller
    </a>
  );
}
