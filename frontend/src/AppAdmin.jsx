import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './hooks/useAuth.jsx';
import AdminLogin from './pages/admin/AdminLogin';
import AdminLayout from './pages/admin/AdminLayout';
import Dashboard from './pages/admin/Dashboard';
import DealsManager from './pages/admin/DealsManager';
import CategoriesManager from './pages/admin/CategoriesManager';
import UsersManager from './pages/admin/UsersManager';
import RulesManager from './pages/admin/RulesManager';
import LogsViewer from './pages/admin/LogsViewer';
import ProvidersManager from './pages/admin/ProvidersManager';
import AnalyticsPage from './pages/admin/AnalyticsPage';
import SettingsPage from './pages/admin/SettingsPage';
import MessagesPage from './pages/admin/MessagesPage';
import EarningsPage from './pages/admin/EarningsPage';
import BannersGallery from './pages/admin/BannersGallery';
import SocialHub from './pages/admin/SocialHub';
import TelegramChannels from './pages/admin/TelegramChannels';

function ProtectedRoute({ children, roles }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-midnight-950">
        <div className="w-12 h-12 border-4 border-gold-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (roles && !roles.includes(user.role)) {
    return <Navigate to="/" replace />;
  }

  return children;
}

export default function AppAdmin() {
  return (
    <Routes>
      <Route path="login" element={<AdminLogin />} />
      <Route path="/" element={<ProtectedRoute><AdminLayout /></ProtectedRoute>}>
        <Route index element={<Dashboard />} />
        <Route path="deals" element={<DealsManager />} />
        <Route path="categories" element={<CategoriesManager />} />
        <Route path="users" element={<ProtectedRoute roles={['admin']}><UsersManager /></ProtectedRoute>} />
        <Route path="rules" element={<ProtectedRoute roles={['admin']}><RulesManager /></ProtectedRoute>} />
        <Route path="logs" element={<ProtectedRoute roles={['admin']}><LogsViewer /></ProtectedRoute>} />
        <Route path="providers" element={<ProtectedRoute roles={['admin']}><ProvidersManager /></ProtectedRoute>} />
        <Route path="analytics" element={<ProtectedRoute roles={['admin']}><AnalyticsPage /></ProtectedRoute>} />
        <Route path="settings" element={<ProtectedRoute roles={['admin']}><SettingsPage /></ProtectedRoute>} />
        <Route path="messages" element={<ProtectedRoute roles={['admin']}><MessagesPage /></ProtectedRoute>} />
        <Route path="earnings" element={<ProtectedRoute roles={['admin']}><EarningsPage /></ProtectedRoute>} />
        <Route path="banners" element={<ProtectedRoute roles={['admin']}><BannersGallery /></ProtectedRoute>} />
        <Route path="social" element={<ProtectedRoute roles={['admin']}><SocialHub /></ProtectedRoute>} />
        <Route path="telegram" element={<ProtectedRoute roles={['admin']}><TelegramChannels /></ProtectedRoute>} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
