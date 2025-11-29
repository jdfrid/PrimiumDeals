import { useState, useEffect } from 'react';
import { ShoppingBag, Tags, Users, Percent, Clock, TrendingUp } from 'lucide-react';
import api from '../../services/api';

function StatCard({ icon: Icon, label, value, color }) {
  return (
    <div className="glass rounded-xl p-6">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-midnight-400 text-sm mb-1">{label}</p>
          <p className="text-3xl font-bold">{value}</p>
        </div>
        <div className={`p-3 rounded-lg ${color}`}><Icon size={24} /></div>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getStats().then(setStats).catch(console.error).finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[...Array(6)].map((_, i) => <div key={i} className="glass rounded-xl p-6"><div className="h-20 shimmer rounded" /></div>)}
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8"><h1 className="text-2xl font-bold mb-2">Dashboard</h1><p className="text-midnight-400">Overview of your deals platform</p></div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <StatCard icon={ShoppingBag} label="Active Deals" value={stats?.totalDeals || 0} color="bg-blue-500/20 text-blue-400" />
        <StatCard icon={Tags} label="Categories" value={stats?.totalCategories || 0} color="bg-purple-500/20 text-purple-400" />
        <StatCard icon={Users} label="Team Members" value={stats?.totalUsers || 0} color="bg-green-500/20 text-green-400" />
        <StatCard icon={Percent} label="Avg. Discount" value={`${stats?.avgDiscount || 0}%`} color="bg-gold-500/20 text-gold-400" />
        <StatCard icon={Clock} label="New Today" value={stats?.recentDeals || 0} color="bg-pink-500/20 text-pink-400" />
        <StatCard icon={TrendingUp} label="Active Rules" value={stats?.activeRules || 0} color="bg-cyan-500/20 text-cyan-400" />
      </div>
      <div className="mt-8">
        <h2 className="text-lg font-semibold mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <a href="/admin/deals" className="glass rounded-xl p-4 hover:bg-midnight-800/50 transition-colors">
            <ShoppingBag className="text-gold-400 mb-2" size={24} /><p className="font-medium">Manage Deals</p><p className="text-sm text-midnight-400">View and edit all deals</p>
          </a>
          <a href="/admin/categories" className="glass rounded-xl p-4 hover:bg-midnight-800/50 transition-colors">
            <Tags className="text-gold-400 mb-2" size={24} /><p className="font-medium">Categories</p><p className="text-sm text-midnight-400">Organize your products</p>
          </a>
          <a href="/admin/rules" className="glass rounded-xl p-4 hover:bg-midnight-800/50 transition-colors">
            <Clock className="text-gold-400 mb-2" size={24} /><p className="font-medium">Query Rules</p><p className="text-sm text-midnight-400">Configure eBay searches</p>
          </a>
          <a href="/" target="_blank" className="glass rounded-xl p-4 hover:bg-midnight-800/50 transition-colors">
            <TrendingUp className="text-gold-400 mb-2" size={24} /><p className="font-medium">View Site</p><p className="text-sm text-midnight-400">See the public frontend</p>
          </a>
        </div>
      </div>
    </div>
  );
}

