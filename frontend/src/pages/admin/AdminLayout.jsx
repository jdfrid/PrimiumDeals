import { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { LayoutDashboard, ShoppingBag, Tags, Users, LogOut, Menu, Crown, FileText, Play } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';

const navItems = [
  { path: '/admin', icon: LayoutDashboard, label: 'Dashboard', exact: true },
  { path: '/admin/deals', icon: ShoppingBag, label: 'Deals' },
  { path: '/admin/categories', icon: Tags, label: 'Categories' },
  { path: '/admin/users', icon: Users, label: 'Users', roles: ['admin'] },
  { path: '/admin/rules', icon: Play, label: 'Query Rules', roles: ['admin'] },
  { path: '/admin/logs', icon: FileText, label: 'Logs', roles: ['admin'] },
];

export default function AdminLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => { logout(); navigate('/admin/login'); };
  const filteredNavItems = navItems.filter(item => !item.roles || item.roles.includes(user?.role));

  return (
    <div className="min-h-screen flex">
      {sidebarOpen && <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />}
      <aside className={`fixed lg:static inset-y-0 left-0 z-50 w-64 admin-sidebar transform transition-transform duration-300 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
        <div className="h-full flex flex-col p-4">
          <div className="flex items-center gap-3 px-2 py-4 mb-6">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-gold-400 to-gold-600 flex items-center justify-center">
              <Crown size={20} className="text-midnight-950" />
            </div>
            <div>
              <div className="font-display font-semibold text-lg text-gradient">Premium Deals</div>
              <div className="text-xs text-midnight-500">Admin Panel</div>
            </div>
          </div>
          <nav className="flex-1 space-y-1">
            {filteredNavItems.map(item => (
              <NavLink key={item.path} to={item.path} end={item.exact} className={({ isActive }) => `admin-nav-item ${isActive ? 'active' : ''}`} onClick={() => setSidebarOpen(false)}>
                <item.icon size={20} /><span>{item.label}</span>
              </NavLink>
            ))}
          </nav>
          <div className="border-t border-midnight-700 pt-4 mt-4">
            <div className="flex items-center gap-3 px-2 py-3">
              <div className="w-10 h-10 rounded-full bg-midnight-700 flex items-center justify-center">
                <span className="text-gold-400 font-semibold">{user?.name?.charAt(0).toUpperCase()}</span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-medium truncate">{user?.name}</div>
                <div className="text-xs text-midnight-500 capitalize">{user?.role}</div>
              </div>
            </div>
            <button onClick={handleLogout} className="admin-nav-item w-full text-red-400 hover:text-red-300 hover:bg-red-500/10">
              <LogOut size={20} /><span>Sign Out</span>
            </button>
          </div>
        </div>
      </aside>
      <div className="flex-1 flex flex-col min-h-screen">
        <header className="h-16 glass border-b border-midnight-700 flex items-center px-4 lg:px-6">
          <button onClick={() => setSidebarOpen(true)} className="lg:hidden p-2 rounded-lg hover:bg-midnight-800"><Menu size={24} /></button>
          <div className="flex-1" />
          <a href="/" target="_blank" className="text-sm text-midnight-400 hover:text-gold-400 transition-colors">View Public Site →</a>
        </header>
        <main className="flex-1 p-4 lg:p-6 overflow-auto"><Outlet /></main>
      </div>
    </div>
  );
}

