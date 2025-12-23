import { useState } from 'react';
import { Mail, ArrowRight, Check, Loader } from 'lucide-react';
import api from '../services/api';

export default function NewsletterFooter() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!email || !email.includes('@')) {
      setError('Please enter a valid email');
      return;
    }
    
    setLoading(true);
    setError('');
    
    try {
      const response = await api.request('/newsletter/subscribe', {
        method: 'POST',
        body: JSON.stringify({ 
          email,
          source: 'footer'
        })
      });
      
      if (response.success) {
        setSuccess(true);
        setEmail('');
        
        // GA4: Track subscription
        if (typeof window.gtag === 'function') {
          window.gtag('event', 'subscribe', {
            method: 'footer',
            email_domain: email.split('@')[1]
          });
        }
      }
    } catch (err) {
      setError('Failed to subscribe. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-gradient-to-r from-gray-900 to-gray-800 text-white py-12">
      <div className="max-w-7xl mx-auto px-4">
        <div className="max-w-2xl mx-auto text-center">
          <div className="w-14 h-14 bg-orange-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <Mail size={24} />
          </div>
          <h3 className="text-2xl font-bold mb-2">Never Miss a Deal</h3>
          <p className="text-gray-400 mb-6">
            Subscribe to get the best luxury deals delivered to your inbox daily.
          </p>
          
          {success ? (
            <div className="flex items-center justify-center gap-2 text-green-400">
              <Check size={20} />
              <span>Successfully subscribed! Check your inbox.</span>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
                className="flex-1 px-4 py-3 rounded-lg bg-white/10 border border-white/20 text-white placeholder-gray-400 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 outline-none transition-all"
                disabled={loading}
              />
              <button
                type="submit"
                disabled={loading}
                className="bg-gradient-to-r from-orange-500 to-red-500 text-white px-6 py-3 rounded-lg font-medium hover:from-orange-600 hover:to-red-600 transition-all disabled:opacity-50 flex items-center justify-center gap-2 whitespace-nowrap"
              >
                {loading ? (
                  <Loader size={18} className="animate-spin" />
                ) : (
                  <>
                    Subscribe <ArrowRight size={18} />
                  </>
                )}
              </button>
            </form>
          )}
          
          {error && (
            <p className="text-red-400 text-sm mt-2">{error}</p>
          )}
          
          <p className="text-xs text-gray-500 mt-4">
            By subscribing, you agree to receive marketing emails. Unsubscribe anytime.
          </p>
        </div>
      </div>
    </div>
  );
}

