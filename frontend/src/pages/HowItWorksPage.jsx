import { Link } from 'react-router-dom';
import { Search, Filter, Bell, ShoppingBag, Shield, Clock, TrendingDown, CheckCircle, ExternalLink, Heart } from 'lucide-react';
import NewsletterFooter from '../components/NewsletterFooter';

export default function HowItWorksPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white py-16">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">How We Find The Best Deals</h1>
          <p className="text-xl text-white/80">
            Transparency is important to us. Here's exactly how Dealsluxy works.
          </p>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 py-12">
        
        {/* Our Process */}
        <section className="mb-16">
          <h2 className="text-2xl font-bold text-gray-800 mb-8 text-center">Our Deal-Finding Process</h2>
          
          <div className="grid md:grid-cols-3 gap-6">
            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center mb-4">
                <Search className="text-blue-600" size={24} />
              </div>
              <h3 className="font-bold text-gray-800 mb-2">1. Automated Search</h3>
              <p className="text-gray-600 text-sm">
                Our system searches major marketplaces like eBay multiple times per day, 
                looking for luxury items with significant discounts.
              </p>
            </div>
            
            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
              <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center mb-4">
                <Filter className="text-green-600" size={24} />
              </div>
              <h3 className="font-bold text-gray-800 mb-2">2. Smart Filtering</h3>
              <p className="text-gray-600 text-sm">
                We filter results to show only items with real discounts of 20% or more 
                from verified sellers with good ratings.
              </p>
            </div>
            
            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
              <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center mb-4">
                <Bell className="text-orange-600" size={24} />
              </div>
              <h3 className="font-bold text-gray-800 mb-2">3. Real-Time Updates</h3>
              <p className="text-gray-600 text-sm">
                Deals are updated automatically. When prices change or items sell out, 
                our system reflects these changes within hours.
              </p>
            </div>
          </div>
        </section>

        {/* Affiliate Disclosure */}
        <section className="bg-white rounded-xl p-8 shadow-sm border border-gray-100 mb-12">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center flex-shrink-0">
              <Heart className="text-amber-600" size={24} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-800 mb-3">Affiliate Disclosure</h2>
              <p className="text-gray-600 mb-4">
                <strong>Dealsluxy is a participant in the eBay Partner Network</strong>, an affiliate 
                advertising program designed to provide a means for sites to earn advertising fees 
                by linking to eBay.com.
              </p>
              <p className="text-gray-600 mb-4">
                When you click on a deal and make a purchase, we may earn a small commission at no 
                extra cost to you. This helps us keep the site running and continue finding great deals.
              </p>
              <p className="text-gray-600">
                <strong>Important:</strong> Our commission does not affect the price you pay. 
                We only feature deals we believe offer genuine value.
              </p>
            </div>
          </div>
        </section>

        {/* What We Look For */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold text-gray-800 mb-6">What Makes a Good Deal?</h2>
          
          <div className="space-y-4">
            <div className="flex items-start gap-4 bg-white rounded-lg p-4 border border-gray-100">
              <CheckCircle className="text-green-500 flex-shrink-0 mt-1" size={20} />
              <div>
                <h3 className="font-semibold text-gray-800">Minimum 20% Discount</h3>
                <p className="text-gray-600 text-sm">We only show items with verified discounts of at least 20% off the original price.</p>
              </div>
            </div>
            
            <div className="flex items-start gap-4 bg-white rounded-lg p-4 border border-gray-100">
              <CheckCircle className="text-green-500 flex-shrink-0 mt-1" size={20} />
              <div>
                <h3 className="font-semibold text-gray-800">Verified Sellers</h3>
                <p className="text-gray-600 text-sm">All deals come from established sellers with positive feedback ratings on eBay.</p>
              </div>
            </div>
            
            <div className="flex items-start gap-4 bg-white rounded-lg p-4 border border-gray-100">
              <CheckCircle className="text-green-500 flex-shrink-0 mt-1" size={20} />
              <div>
                <h3 className="font-semibold text-gray-800">Authentic Products</h3>
                <p className="text-gray-600 text-sm">We focus on authentic luxury items. eBay's authenticity guarantee adds an extra layer of protection.</p>
              </div>
            </div>
            
            <div className="flex items-start gap-4 bg-white rounded-lg p-4 border border-gray-100">
              <CheckCircle className="text-green-500 flex-shrink-0 mt-1" size={20} />
              <div>
                <h3 className="font-semibold text-gray-800">Fresh Inventory</h3>
                <p className="text-gray-600 text-sm">Our system removes sold items and adds new deals multiple times daily.</p>
              </div>
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold text-gray-800 mb-6">Frequently Asked Questions</h2>
          
          <div className="space-y-4">
            <details className="bg-white rounded-lg border border-gray-100 group">
              <summary className="p-4 cursor-pointer font-medium text-gray-800 hover:bg-gray-50">
                Why are the discounts so high?
              </summary>
              <div className="px-4 pb-4 text-gray-600 text-sm">
                We find deals from various sources: end-of-season sales, overstock items, 
                pre-owned luxury goods, and sellers looking to move inventory quickly. 
                These legitimate circumstances create genuine discount opportunities.
              </div>
            </details>
            
            <details className="bg-white rounded-lg border border-gray-100">
              <summary className="p-4 cursor-pointer font-medium text-gray-800 hover:bg-gray-50">
                Are these products authentic?
              </summary>
              <div className="px-4 pb-4 text-gray-600 text-sm">
                We source deals from eBay, which has an Authenticity Guarantee program for 
                luxury items. Many listings also include certificates of authenticity. 
                Always check individual listings for details.
              </div>
            </details>
            
            <details className="bg-white rounded-lg border border-gray-100">
              <summary className="p-4 cursor-pointer font-medium text-gray-800 hover:bg-gray-50">
                Do you sell products directly?
              </summary>
              <div className="px-4 pb-4 text-gray-600 text-sm">
                No, Dealsluxy is a deal discovery platform. We find and display deals, 
                but all purchases are made directly on eBay from individual sellers.
              </div>
            </details>
            
            <details className="bg-white rounded-lg border border-gray-100">
              <summary className="p-4 cursor-pointer font-medium text-gray-800 hover:bg-gray-50">
                How often are deals updated?
              </summary>
              <div className="px-4 pb-4 text-gray-600 text-sm">
                Our automated system scans for new deals multiple times per day. 
                Prices and availability are updated regularly to ensure accuracy.
              </div>
            </details>
            
            <details className="bg-white rounded-lg border border-gray-100">
              <summary className="p-4 cursor-pointer font-medium text-gray-800 hover:bg-gray-50">
                What if a deal is no longer available?
              </summary>
              <div className="px-4 pb-4 text-gray-600 text-sm">
                Popular deals sell fast! If an item shows as unavailable on eBay, 
                our system will remove it during the next update cycle. 
                Subscribe to our newsletter to get first access to new deals.
              </div>
            </details>
          </div>
        </section>

        {/* CTA */}
        <section className="text-center bg-gradient-to-r from-orange-500 to-red-500 rounded-2xl p-8 text-white">
          <h2 className="text-2xl font-bold mb-4">Ready to Start Saving?</h2>
          <p className="text-white/80 mb-6">Browse thousands of luxury deals updated daily.</p>
          <Link 
            to="/"
            className="inline-flex items-center gap-2 bg-white text-orange-600 px-8 py-3 rounded-full font-semibold hover:bg-gray-100 transition-colors"
          >
            <ShoppingBag size={20} />
            Browse Deals
          </Link>
        </section>
      </div>

      {/* Newsletter */}
      <NewsletterFooter />

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-8">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <p className="text-gray-400 text-sm">
            © {new Date().getFullYear()} Dealsluxy. All rights reserved. 
            <br />
            Participant in the eBay Partner Network affiliate program.
          </p>
        </div>
      </footer>
    </div>
  );
}

