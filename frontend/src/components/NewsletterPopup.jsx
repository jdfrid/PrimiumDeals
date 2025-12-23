import { useState, useEffect } from 'react';
import { X, Mail, Gift, Bell, Check } from 'lucide-react';
import api from '../services/api';

export default function NewsletterPopup() {
  const [isOpen, setIsOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    // Check if user has already seen/dismissed the popup
    const dismissed = localStorage.getItem('newsletter_dismissed');
    const subscribed = localStorage.getItem('newsletter_subscribed');
    
    if (dismissed || subscribed) return;
    
    // Show popup after 15 seconds or 30% scroll
    const timer = setTimeout(() => {
      setIsOpen(true);
    }, 15000);
    
    const handleScroll = () => {
      const scrollPercent = (window.scrollY / (document.body.scrollHeight - window.innerHeight)) * 100;
      if (scrollPercent > 30 && !isOpen) {
        setIsOpen(true);
      }
    };
    
    window.addEventListener('scroll', handleScroll);
    
    return () => {
      clearTimeout(timer);
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  const handleClose = () => {
    setIsOpen(false);
    localStorage.setItem('newsletter_dismissed', Date.now().toString());
  };

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
          source: 'popup'
        })
      });
      
      if (response.success) {
        setSuccess(true);
        localStorage.setItem('newsletter_subscribed', 'true');
        
        // GA4: Track subscription
        if (typeof window.gtag === 'function') {
          window.gtag('event', 'subscribe', {
            method: 'popup',
            email_domain: email.split('@')[1]
          });
        }
        
        // Close after 3 seconds
        setTimeout(() => {
          setIsOpen(false);
        }, 3000);
      }
    } catch (err) {
      setError('Failed to subscribe. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden animate-slideUp">
        {/* Header with gradient */}
        <div className="bg-gradient-to-r from-orange-500 to-red-500 p-6 text-white relative">
          <button 
            onClick={handleClose}
            className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/20 flex items-center justify-center hover:bg-white/30 transition-colors"
          >
            <X size={18} />
          </button>
          
          <div className="flex items-center gap-3 mb-3">
            <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
              <Gift size={24} />
            </div>
            <div>
              <h2 className="text-xl font-bold">Get Exclusive Deals!</h2>
              <p className="text-white/80 text-sm">Join 10,000+ smart shoppers</p>
            </div>
          </div>
        </div>
        
        {/* Content */}
        <div className="p-6">
          {success ? (
            <div className="text-center py-4">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Check size={32} className="text-green-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-800 mb-2">You're In! 🎉</h3>
              <p className="text-gray-600">Check your inbox for the best deals.</p>
            </div>
          ) : (
            <>
              <div className="space-y-3 mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <Bell size={16} className="text-orange-600" />
                  </div>
                  <span className="text-gray-700 text-sm">Daily alerts on luxury deals up to 70% off</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <Gift size={16} className="text-green-600" />
                  </div>
                  <span className="text-gray-700 text-sm">Exclusive subscriber-only discounts</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <Mail size={16} className="text-blue-600" />
                  </div>
                  <span className="text-gray-700 text-sm">Weekly top 10 deals curated for you</span>
                </div>
              </div>
              
              <form onSubmit={handleSubmit}>
                <div className="flex gap-2">
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter your email"
                    className="flex-1 px-4 py-3 border border-gray-200 rounded-lg focus:border-orange-500 focus:ring-2 focus:ring-orange-100 outline-none transition-all"
                    disabled={loading}
                  />
                  <button
                    type="submit"
                    disabled={loading}
                    className="bg-gradient-to-r from-orange-500 to-red-500 text-white px-6 py-3 rounded-lg font-medium hover:from-orange-600 hover:to-red-600 transition-all disabled:opacity-50 whitespace-nowrap"
                  >
                    {loading ? '...' : 'Subscribe'}
                  </button>
                </div>
                
                {error && (
                  <p className="text-red-500 text-sm mt-2">{error}</p>
                )}
              </form>
              
              <p className="text-center text-xs text-gray-400 mt-4">
                No spam, unsubscribe anytime. We respect your privacy.
              </p>
            </>
          )}
        </div>
      </div>
      
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideUp {
          from { transform: translateY(20px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        .animate-fadeIn { animation: fadeIn 0.3s ease-out; }
        .animate-slideUp { animation: slideUp 0.3s ease-out; }
      `}</style>
    </div>
  );
}

