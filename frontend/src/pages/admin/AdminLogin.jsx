import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Crown, Lock, Mail, AlertCircle } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';

export default function AdminLogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { login, user } = useAuth();

  if (user) {
    navigate('/admin');
    return null;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      navigate('/admin');
    } catch (err) {
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-gold-500/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-gold-600/5 rounded-full blur-[100px]" />
      </div>
      <div className="w-full max-w-md relative">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-gold-400 to-gold-600 mb-4">
            <Crown size={32} className="text-midnight-950" />
          </div>
          <h1 className="font-display text-3xl font-bold"><span className="text-gradient">Admin</span> Panel</h1>
          <p className="text-midnight-400 mt-2">Sign in to manage your deals</p>
        </div>
        <form onSubmit={handleSubmit} className="glass rounded-2xl p-8">
          {error && (
            <div className="flex items-center gap-3 bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-3 rounded-lg mb-6">
              <AlertCircle size={18} /><span>{error}</span>
            </div>
          )}
          <div className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-midnight-300 mb-2">Email Address</label>
              <div className="relative">
                <Mail size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-midnight-500" />
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="admin@example.com" required className="input-dark w-full pl-12" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-midnight-300 mb-2">Password</label>
              <div className="relative">
                <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-midnight-500" />
                <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" required className="input-dark w-full pl-12" />
              </div>
            </div>
            <button type="submit" disabled={loading} className="btn-gold w-full flex items-center justify-center gap-2 disabled:opacity-50">
              {loading ? <div className="w-5 h-5 border-2 border-midnight-950 border-t-transparent rounded-full animate-spin" /> : <><Lock size={18} />Sign In</>}
            </button>
          </div>
        </form>
        <p className="text-center text-midnight-500 text-sm mt-6"><a href="/" className="hover:text-gold-400 transition-colors">← Back to homepage</a></p>
      </div>
    </div>
  );
}

