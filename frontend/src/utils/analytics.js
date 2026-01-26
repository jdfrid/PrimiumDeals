/**
 * Analytics & Tracking Utility
 * Handles GA4, Google Ads conversions, UTM tracking, and remarketing
 */

// Store UTM parameters for the session
let utmParams = null;

/**
 * Initialize analytics - call on app load
 */
export function initAnalytics() {
  // Capture UTM parameters from URL
  captureUtmParams();
  
  // Track page view
  trackPageView();
  
  // Set up scroll depth tracking
  setupScrollTracking();
  
  // Track time on site
  setupTimeTracking();
}

/**
 * Capture and store UTM parameters
 */
export function captureUtmParams() {
  const params = new URLSearchParams(window.location.search);
  
  utmParams = {
    utm_source: params.get('utm_source') || sessionStorage.getItem('utm_source'),
    utm_medium: params.get('utm_medium') || sessionStorage.getItem('utm_medium'),
    utm_campaign: params.get('utm_campaign') || sessionStorage.getItem('utm_campaign'),
    utm_term: params.get('utm_term') || sessionStorage.getItem('utm_term'),
    utm_content: params.get('utm_content') || sessionStorage.getItem('utm_content'),
    gclid: params.get('gclid') || sessionStorage.getItem('gclid'), // Google Ads click ID
  };
  
  // Store in sessionStorage for persistence
  Object.entries(utmParams).forEach(([key, value]) => {
    if (value) sessionStorage.setItem(key, value);
  });
  
  // Also store landing page
  if (!sessionStorage.getItem('landing_page')) {
    sessionStorage.setItem('landing_page', window.location.pathname);
  }
  
  return utmParams;
}

/**
 * Get current UTM parameters
 */
export function getUtmParams() {
  return utmParams || captureUtmParams();
}

/**
 * Track page view
 */
export function trackPageView(pagePath = window.location.pathname) {
  if (typeof window.gtag === 'function') {
    window.gtag('event', 'page_view', {
      page_path: pagePath,
      page_title: document.title,
      page_location: window.location.href,
      ...getUtmParams()
    });
  }
}

/**
 * Track conversion event - for Google Ads
 * @param {string} conversionType - Type of conversion (click_out, subscribe, etc.)
 * @param {object} data - Additional conversion data
 */
export function trackConversion(conversionType, data = {}) {
  const utm = getUtmParams();
  
  // GA4 Event
  if (typeof window.gtag === 'function') {
    window.gtag('event', conversionType, {
      ...data,
      ...utm,
      landing_page: sessionStorage.getItem('landing_page'),
      session_duration: getSessionDuration()
    });
    
    // If this is a valuable conversion, also send to Google Ads
    // Replace 'AW-CONVERSION_ID' with your actual Google Ads conversion ID
    if (['click_out', 'subscribe'].includes(conversionType)) {
      // Google Ads conversion tracking (uncomment when you have conversion ID)
      // window.gtag('event', 'conversion', {
      //   'send_to': 'AW-CONVERSION_ID/CONVERSION_LABEL',
      //   'value': data.value || 0,
      //   'currency': 'USD'
      // });
    }
  }
  
  // Also send to backend for UTM analytics
  try {
    fetch('/api/track/conversion', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: conversionType,
        ...utm,
        value: data.value || data.price || 0,
        item_id: data.item_id || '',
        landing_page: sessionStorage.getItem('landing_page') || ''
      })
    }).catch(() => {}); // Silently fail
  } catch (e) {
    // Ignore errors
  }
  
  console.log(`📊 Conversion: ${conversionType}`, data);
}

/**
 * Track deal click (click_out conversion)
 */
export function trackDealClick(deal) {
  trackConversion('click_out', {
    item_id: deal.id?.toString(),
    item_name: deal.title?.substring(0, 100),
    item_category: deal.category_name || 'Uncategorized',
    item_brand: deal.source || 'ebay',
    price: deal.current_price,
    discount: deal.discount_percent,
    value: deal.current_price,
    currency: 'USD'
  });
  
  // Also send e-commerce select_item event
  if (typeof window.gtag === 'function') {
    window.gtag('event', 'select_item', {
      item_list_name: 'Deals',
      items: [{
        item_id: deal.id?.toString(),
        item_name: deal.title?.substring(0, 100),
        item_category: deal.category_name,
        price: deal.current_price,
        discount: deal.discount_percent
      }]
    });
  }
}

/**
 * Track newsletter subscription
 */
export function trackSubscribe(method = 'unknown', email = '') {
  trackConversion('subscribe', {
    method: method,
    email_domain: email.includes('@') ? email.split('@')[1] : 'unknown',
    value: 1, // Assign a value to subscriptions
    currency: 'USD'
  });
  
  // Also track as GA4 sign_up event
  if (typeof window.gtag === 'function') {
    window.gtag('event', 'sign_up', {
      method: 'newsletter'
    });
  }
}

/**
 * Track filter usage
 */
export function trackFilterUsed(filterType, filterValue) {
  if (typeof window.gtag === 'function') {
    window.gtag('event', 'filter_used', {
      filter_type: filterType,
      filter_value: filterValue,
      ...getUtmParams()
    });
  }
}

/**
 * Track search
 */
export function trackSearch(searchTerm) {
  if (typeof window.gtag === 'function') {
    window.gtag('event', 'search', {
      search_term: searchTerm
    });
  }
}

/**
 * Track view item list (category/brand page)
 */
export function trackViewItemList(listName, items = []) {
  if (typeof window.gtag === 'function') {
    window.gtag('event', 'view_item_list', {
      item_list_name: listName,
      items: items.slice(0, 10).map((deal, index) => ({
        item_id: deal.id?.toString(),
        item_name: deal.title?.substring(0, 100),
        item_category: deal.category_name || 'Uncategorized',
        price: deal.current_price,
        index: index
      }))
    });
  }
}

// Session tracking
let sessionStart = Date.now();

function getSessionDuration() {
  return Math.round((Date.now() - sessionStart) / 1000);
}

function setupTimeTracking() {
  // Track time spent milestones
  const milestones = [30, 60, 120, 300]; // seconds
  milestones.forEach(seconds => {
    setTimeout(() => {
      if (typeof window.gtag === 'function') {
        window.gtag('event', 'time_on_site', {
          seconds: seconds,
          ...getUtmParams()
        });
      }
    }, seconds * 1000);
  });
}

// Scroll depth tracking
function setupScrollTracking() {
  let maxScroll = 0;
  const milestones = [25, 50, 75, 90];
  const tracked = new Set();
  
  window.addEventListener('scroll', () => {
    const scrollPercent = Math.round(
      (window.scrollY / (document.body.scrollHeight - window.innerHeight)) * 100
    );
    
    if (scrollPercent > maxScroll) {
      maxScroll = scrollPercent;
      
      milestones.forEach(milestone => {
        if (scrollPercent >= milestone && !tracked.has(milestone)) {
          tracked.add(milestone);
          if (typeof window.gtag === 'function') {
            window.gtag('event', 'scroll_depth', {
              percent: milestone,
              ...getUtmParams()
            });
          }
        }
      });
    }
  }, { passive: true });
}

/**
 * Generate UTM link for marketing
 */
export function generateUtmLink(baseUrl, params = {}) {
  const url = new URL(baseUrl, window.location.origin);
  const defaultParams = {
    utm_source: 'dealsluxy',
    utm_medium: 'website',
    ...params
  };
  
  Object.entries(defaultParams).forEach(([key, value]) => {
    if (value) url.searchParams.set(key, value);
  });
  
  return url.toString();
}

export default {
  initAnalytics,
  trackPageView,
  trackConversion,
  trackDealClick,
  trackSubscribe,
  trackFilterUsed,
  trackSearch,
  trackViewItemList,
  getUtmParams,
  generateUtmLink
};

