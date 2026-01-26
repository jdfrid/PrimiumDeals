import { useState, useEffect } from 'react';
import { X, Gift, Bell, Mail } from 'lucide-react';

export default function NewsletterPopup() {
  const [isVisible, setIsVisible] = useState(false);
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    // Check if user already saw the popup
    const hasSeenPopup = localStorage.getItem('newsletter_popup_seen');
    
    if (!hasSeenPopup) {
      // Show popup after 5 seconds delay
      const timer = setTimeout(() => {
        setIsVisible(true);
      }, 5000);
      
      return () => clearTimeout(timer);
    }
  }, []);

  const handleClose = () => {
    setIsVisible(false);
    // Mark as seen in localStorage
    localStorage.setItem('newsletter_popup_seen', 'true');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email) return;
    
    setIsSubmitting(true);
    
    // Simulate API call (replace with real API if needed)
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Mark as seen and submitted
    localStorage.setItem('newsletter_popup_seen', 'true');
    localStorage.setItem('newsletter_subscribed', email);
    
    setSubmitted(true);
    setIsSubmitting(false);
    
    // Close after showing success
    setTimeout(() => {
      setIsVisible(false);
    }, 2000);
  };

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
      <div 
        className="relative bg-white rounded-2xl overflow-hidden max-w-md w-full shadow-2xl animate-slide-up"
        style={{ animationDuration: '0.3s' }}
      >
        {/* Header with gradient */}
        <div className="bg-gradient-to-r from-orange-500 to-red-500 px-6 py-5 text-white">
          <button 
            onClick={handleClose}
            className="absolute top-4 right-4 p-1 hover:bg-white/20 rounded-full transition-colors"
          >
            <X size={20} />
          </button>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
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
          {submitted ? (
            <div className="text-center py-4">
              <div className="text-5xl mb-3">🎉</div>
              <h3 className="text-xl font-bold text-gray-800">You're in!</h3>
              <p className="text-gray-500">Check your email for exclusive deals.</p>
            </div>
          ) : (
            <>
              <ul className="space-y-3 mb-6">
                <li className="flex items-center gap-3 text-gray-700">
                  <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <Bell size={16} className="text-red-500" />
                  </div>
                  <span>Daily alerts on luxury deals up to 70% off</span>
                </li>
                <li className="flex items-center gap-3 text-gray-700">
                  <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <Gift size={16} className="text-green-500" />
                  </div>
                  <span>Exclusive subscriber-only discounts</span>
                </li>
                <li className="flex items-center gap-3 text-gray-700">
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <Mail size={16} className="text-blue-500" />
                  </div>
                  <span>Weekly top 10 deals curated for you</span>
                </li>
              </ul>

              <form onSubmit={handleSubmit}>
                <div className="flex gap-2">
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter your email"
                    required
                    className="flex-1 px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  />
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-6 py-3 bg-gradient-to-r from-orange-500 to-red-500 text-white font-semibold rounded-lg hover:from-orange-600 hover:to-red-600 transition-all disabled:opacity-50"
                  >
                    {isSubmitting ? '...' : 'Subscribe'}
                  </button>
                </div>
              </form>

              <p className="text-center text-gray-400 text-xs mt-4">
                No spam, unsubscribe anytime. We respect your privacy.
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

