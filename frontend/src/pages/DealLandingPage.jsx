import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Copy, Check } from 'lucide-react';
import api from '../services/api';
import DealPreview, { DealPreviewTrackCta } from '../components/DealPreview';
import { getDealShareUrl } from '../utils/dealShareUrl';

export default function DealLandingPage() {
  const { dealId } = useParams();
  const [deal, setDeal] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const row = await api.getPublicDealById(dealId);
        if (!cancelled) {
          setDeal(row);
          document.title = `${row.title?.slice(0, 80) || 'Deal'} | Dealsluxy`;
        }
      } catch (e) {
        if (!cancelled) setError(e.message || 'Deal not found');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [dealId]);

  const shareUrl = deal ? getDealShareUrl(deal.id) : '';

  const copyShareLink = async () => {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore */
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center gap-4">
          <Link to="/" className="flex items-center gap-2 text-gray-600 hover:text-gray-900 text-sm font-medium">
            <ArrowLeft size={18} />
            All deals
          </Link>
        </div>
      </div>

      <main className="max-w-2xl mx-auto px-4 py-8">
        <DealPreview
          deal={deal}
          loading={loading}
          error={error}
          footer={
            deal ? (
              <>
                <DealPreviewTrackCta dealId={deal.id} />
                <button
                  type="button"
                  onClick={copyShareLink}
                  className="w-full flex items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white py-3 font-medium text-gray-800 hover:bg-gray-50 transition-colors"
                >
                  {copied ? <Check size={18} className="text-green-600" /> : <Copy size={18} />}
                  {copied ? 'Copied!' : 'Copy share link'}
                </button>
              </>
            ) : null
          }
        />
      </main>
    </div>
  );
}
