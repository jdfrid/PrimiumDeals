import { Routes, Route, Navigate } from 'react-router-dom';
import DealsSiteLayout from './layouts/DealsSiteLayout';
import HomePage from './pages/HomePage';
import DealLandingPage from './pages/DealLandingPage';
import TodaysDealsPage from './pages/TodaysDealsPage';
import CategoryPage from './pages/CategoryPage';
import BrandPage from './pages/BrandPage';
import LandingPage from './pages/LandingPage';
import ContactPage from './pages/ContactPage';
import TermsPage from './pages/TermsPage';
import HowItWorksPage from './pages/HowItWorksPage';
import ShareChargeApp from './pages/ShareChargeApp';

/**
 * Public storefront SPA only (/). Admin runs from a separate bundle (admin.html) at /admin/*.
 */
function App() {
  return (
    <Routes>
      <Route path="/app" element={<ShareChargeApp />} />
      <Route path="/app/:role" element={<ShareChargeApp />} />
      <Route path="/" element={<DealsSiteLayout />}>
        <Route index element={<HomePage />} />
        <Route path="deal/:dealId" element={<DealLandingPage />} />
        <Route path="todays-deals" element={<TodaysDealsPage />} />
        <Route path="today" element={<TodaysDealsPage />} />
        <Route path="new" element={<TodaysDealsPage />} />
        <Route path="category/:categorySlug" element={<CategoryPage />} />
        <Route path="brand/:brandSlug" element={<BrandPage />} />
        <Route path="designer-sale" element={<LandingPage />} />
        <Route path="luxury-watches-sale" element={<LandingPage />} />
        <Route path="designer-bags-sale" element={<LandingPage />} />
        <Route path="contact" element={<ContactPage />} />
        <Route path="terms" element={<TermsPage />} />
        <Route path="how-it-works" element={<HowItWorksPage />} />
        <Route path="about" element={<HowItWorksPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
