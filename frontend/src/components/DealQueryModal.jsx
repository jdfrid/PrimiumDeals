import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { X } from 'lucide-react';
import api from '../services/api';
import DealPreview, { DealPreviewTrackCta } from './DealPreview';

export default function DealQueryModal() {
  const [searchParams, setSearchParams] = useSearchParams();
  const id = searchParams.get('deal');
  const [deal, setDeal] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!id) {
      setDeal(null);
      setError(null);
      return;
    }
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      setDeal(null);
      try {
        const row = await api.getPublicDealById(id);
        if (!cancelled) setDeal(row);
      } catch (e) {
        if (!cancelled) setError(e.message || 'Deal not found');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  const close = () => {
    const next = new URLSearchParams(searchParams);
    next.delete('deal');
    setSearchParams(next, { replace: true });
  };

  if (!id) return null;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50"
      role="dialog"
      aria-modal="true"
      aria-labelledby="deal-query-modal-title"
      onClick={close}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto p-6 relative"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={close}
          className="absolute top-4 left-4 p-2 rounded-lg hover:bg-gray-100 text-gray-500"
          aria-label="Close"
        >
          <X size={20} />
        </button>
        <h2 id="deal-query-modal-title" className="sr-only">
          Deal preview
        </h2>
        <DealPreview
          deal={deal}
          loading={loading}
          error={error}
          footer={
            deal ? (
              <>
                <DealPreviewTrackCta dealId={deal.id} />
                <button type="button" onClick={close} className="w-full text-sm text-gray-500 hover:text-gray-800 py-2">
                  Close
                </button>
              </>
            ) : null
          }
        />
      </div>
    </div>
  );
}
