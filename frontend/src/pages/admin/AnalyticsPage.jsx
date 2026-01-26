import { useState, useEffect } from 'react';
import { BarChart3, MousePointer, Users, TrendingUp, Clock, ExternalLink } from 'lucide-react';
import api from '../../services/api';

export default function AnalyticsPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState(7);

  useEffect(() => {
    loadAnalytics();
  }, [days]);

  const loadAnalytics = async () => {
    setLoading(true);
    try {
      const response = await api.request(`/analytics/clicks?days=${days}&limit=100`);
      setData(response);
    } catch (error) {
      console.error('Failed to load analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-gold-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold mb-1">Click Analytics</h1>
          <p className="text-midnight-400">Track user engagement with deals</p>
        </div>
        <select
          value={days}
          onChange={(e) => setDays(parseInt(e.target.value))}
          className="input-dark w-auto"
        >
          <option value={1}>Last 24 hours</option>
          <option value={7}>Last 7 days</option>
          <option value={30}>Last 30 days</option>
          <option value={90}>Last 90 days</option>
        </select>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="glass rounded-xl p-6">
          <div className="flex items-center gap-3 mb-2">
            <MousePointer className="text-gold-400" size={24} />
            <span className="text-midnight-400">Total Clicks</span>
          </div>
          <div className="text-3xl font-bold">{data?.stats?.total_clicks || 0}</div>
        </div>
        
        <div className="glass rounded-xl p-6">
          <div className="flex items-center gap-3 mb-2">
            <Users className="text-blue-400" size={24} />
            <span className="text-midnight-400">Unique Visitors</span>
          </div>
          <div className="text-3xl font-bold">{data?.stats?.unique_visitors || 0}</div>
        </div>
        
        <div className="glass rounded-xl p-6">
          <div className="flex items-center gap-3 mb-2">
            <TrendingUp className="text-green-400" size={24} />
            <span className="text-midnight-400">Deals Clicked</span>
          </div>
          <div className="text-3xl font-bold">{data?.stats?.deals_clicked || 0}</div>
        </div>
      </div>

      {/* Top Deals */}
      {data?.topDeals?.length > 0 && (
        <div className="glass rounded-xl p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <BarChart3 size={20} />
            Top Clicked Deals
          </h2>
          <div className="space-y-3">
            {data.topDeals.map((deal, index) => (
              <div key={deal.deal_id} className="flex items-center justify-between p-3 bg-midnight-800/50 rounded-lg">
                <div className="flex items-center gap-3">
                  <span className="text-gold-400 font-bold">#{index + 1}</span>
                  <span className="truncate max-w-md">{deal.deal_title}</span>
                </div>
                <span className="bg-gold-400/20 text-gold-400 px-3 py-1 rounded-full text-sm font-medium">
                  {deal.clicks} clicks
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent Clicks */}
      <div className="glass rounded-xl p-6">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Clock size={20} />
          Recent Clicks
        </h2>
        
        {data?.clicks?.length === 0 ? (
          <p className="text-midnight-400 text-center py-8">No clicks recorded yet</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-midnight-400 border-b border-midnight-700">
                  <th className="pb-3 pr-4">Time</th>
                  <th className="pb-3 pr-4">Deal</th>
                  <th className="pb-3 pr-4">Price</th>
                  <th className="pb-3 pr-4">IP</th>
                  <th className="pb-3">Source</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-midnight-800">
                {data?.clicks?.map((click) => (
                  <tr key={click.id} className="hover:bg-midnight-800/30">
                    <td className="py-3 pr-4 whitespace-nowrap">
                      {new Date(click.created_at).toLocaleString('he-IL')}
                    </td>
                    <td className="py-3 pr-4">
                      <div className="flex items-center gap-2 max-w-xs">
                        <span className="truncate">{click.deal_title || 'Unknown'}</span>
                        <a href={click.ebay_url} target="_blank" rel="noopener" className="text-gold-400 hover:text-gold-300">
                          <ExternalLink size={14} />
                        </a>
                      </div>
                    </td>
                    <td className="py-3 pr-4 text-green-400">
                      ${click.deal_price?.toFixed(0) || '-'}
                    </td>
                    <td className="py-3 pr-4 font-mono text-xs text-midnight-400">
                      {click.ip_address?.substring(0, 15)}
                    </td>
                    <td className="py-3 text-midnight-400 truncate max-w-[150px]">
                      {click.referer === 'direct' ? 'Direct' : new URL(click.referer || 'https://direct').hostname}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}





