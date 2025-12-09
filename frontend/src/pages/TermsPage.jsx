import { ArrowLeft, Shield, AlertTriangle, ExternalLink } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="container mx-auto px-4 py-4">
          <Link to="/" className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors">
            <ArrowLeft size={20} />
            <span>Back to Deals</span>
          </Link>
        </div>
      </header>

      {/* Content */}
      <main className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="bg-white rounded-2xl shadow-sm p-8 md:p-12">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
              <Shield size={24} className="text-blue-600" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900">Terms of Service</h1>
          </div>

          <p className="text-gray-500 mb-8">Last updated: {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</p>

          {/* Disclaimer Box */}
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-6 mb-8">
            <div className="flex items-start gap-3">
              <AlertTriangle className="text-amber-600 flex-shrink-0 mt-1" size={24} />
              <div>
                <h2 className="font-bold text-amber-800 mb-2">Important Disclaimer</h2>
                <p className="text-amber-700">
                  This website is an <strong>affiliate marketing platform</strong>. We are NOT the seller of any products displayed on this site. 
                  All purchases are made directly through eBay or other third-party retailers. We have no control over and assume no responsibility 
                  for the content, products, pricing, availability, or any transactions conducted on external websites.
                </p>
              </div>
            </div>
          </div>

          <div className="prose prose-gray max-w-none">
            <h2 className="text-xl font-bold text-gray-900 mt-8 mb-4">1. About This Website</h2>
            <p className="text-gray-600 mb-4">
              Premium Deals ("we", "our", or "us") operates as an affiliate marketing website. We aggregate and display deals from third-party 
              retailers including but not limited to eBay, Amazon, and AliExpress. When you click on a deal and make a purchase, we may earn 
              a commission from the retailer at no additional cost to you.
            </p>

            <h2 className="text-xl font-bold text-gray-900 mt-8 mb-4">2. No Responsibility for Content</h2>
            <p className="text-gray-600 mb-4">
              We do not guarantee the accuracy, completeness, or reliability of any information displayed on this website, including but not limited to:
            </p>
            <ul className="list-disc list-inside text-gray-600 mb-4 space-y-2">
              <li>Product prices and discounts</li>
              <li>Product descriptions and images</li>
              <li>Product availability</li>
              <li>Seller ratings and reviews</li>
              <li>Shipping information and costs</li>
            </ul>
            <p className="text-gray-600 mb-4">
              All product information is provided by third-party retailers and may change at any time without notice. 
              Always verify the current price and details on the retailer's website before making a purchase.
            </p>

            <h2 className="text-xl font-bold text-gray-900 mt-8 mb-4">3. Third-Party Websites</h2>
            <p className="text-gray-600 mb-4">
              This website contains links to third-party websites. We are not responsible for:
            </p>
            <ul className="list-disc list-inside text-gray-600 mb-4 space-y-2">
              <li>The content, products, or services offered on third-party websites</li>
              <li>Any transactions you conduct with third-party sellers</li>
              <li>The privacy practices of third-party websites</li>
              <li>Any damages or losses resulting from your use of third-party websites</li>
            </ul>

            <h2 className="text-xl font-bold text-gray-900 mt-8 mb-4">4. No Warranty</h2>
            <p className="text-gray-600 mb-4">
              This website is provided "as is" without any warranties, expressed or implied. We do not warrant that:
            </p>
            <ul className="list-disc list-inside text-gray-600 mb-4 space-y-2">
              <li>The website will be available at all times</li>
              <li>The information displayed will be accurate or up-to-date</li>
              <li>The deals shown will still be valid when you visit the retailer's website</li>
            </ul>

            <h2 className="text-xl font-bold text-gray-900 mt-8 mb-4">5. Limitation of Liability</h2>
            <p className="text-gray-600 mb-4">
              To the fullest extent permitted by law, we shall not be liable for any direct, indirect, incidental, special, 
              consequential, or punitive damages arising from your use of this website or any third-party websites linked from this site.
            </p>

            <h2 className="text-xl font-bold text-gray-900 mt-8 mb-4">6. Affiliate Disclosure</h2>
            <p className="text-gray-600 mb-4">
              We participate in affiliate programs including the eBay Partner Network. This means we may earn a commission when you 
              click on links and make purchases through our website. This does not affect the price you pay for any products.
            </p>

            <h2 className="text-xl font-bold text-gray-900 mt-8 mb-4">7. Changes to Terms</h2>
            <p className="text-gray-600 mb-4">
              We reserve the right to modify these terms at any time. Continued use of this website after any changes constitutes 
              your acceptance of the new terms.
            </p>

            <h2 className="text-xl font-bold text-gray-900 mt-8 mb-4">8. Contact</h2>
            <p className="text-gray-600 mb-4">
              If you have any questions about these Terms of Service, please <Link to="/contact" className="text-blue-600 hover:underline">contact us</Link>.
            </p>
          </div>

          {/* Back to Deals Button */}
          <div className="mt-12 pt-8 border-t border-gray-200">
            <Link 
              to="/" 
              className="inline-flex items-center gap-2 bg-gradient-to-r from-orange-500 to-red-500 text-white px-6 py-3 rounded-xl font-medium hover:from-orange-600 hover:to-red-600 transition-all shadow-md"
            >
              <ArrowLeft size={18} />
              Back to Deals
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}



