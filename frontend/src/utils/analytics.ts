export const Analytics = {
  // Product Performance Metrics
  trackProductView: (product: any) => {
    if (!window.gtag) return;
    window.gtag('event', 'view_item', {
      currency: 'ZAR',
      items: [{
        item_id: product.id,
        item_name: product.name,
        item_category: product.category,
        item_brand: product.brand,
        price: product.price
      }]
    });
  },

  trackCategoryView: (category: string) => {
    if (!window.gtag) return;
    window.gtag('event', 'view_item_list', {
      item_list_id: category,
      item_list_name: category
    });
  },

  trackAddToCart: (product: any, quantity: number) => {
    if (!window.gtag) return;
    window.gtag('event', 'add_to_cart', {
      currency: 'ZAR',
      value: product.price * quantity,
      items: [{
        item_id: product.id,
        item_name: product.name,
        item_category: product.category,
        price: product.price,
        quantity: quantity
      }]
    });
  },

  // User Behavior Metrics
  trackTimeOnPage: (pageTitle: string, timeSpentSeconds: number) => {
    if (!window.gtag) return;
    window.gtag('event', 'time_on_page', {
      page_title: pageTitle,
      time_seconds: timeSpentSeconds
    });
  },

  trackScrollDepth: (depth: number, pageTitle: string) => {
    if (!window.gtag) return;
    window.gtag('event', 'scroll_depth', {
      depth_percentage: depth,
      page_title: pageTitle
    });
  },

  trackCartAbandonment: (items: any[], value: number) => {
    if (!window.gtag) return;
    window.gtag('event', 'cart_abandonment', {
      currency: 'ZAR',
      value: value,
      items: items.map(item => ({
        item_id: item.product.id,
        item_name: item.product.name,
        quantity: item.qty,
        price: item.product.price
      }))
    });
  },

  trackCheckoutStep: (step: number, option: string) => {
    if (!window.gtag) return;
    window.gtag('event', 'checkout_progress', {
      checkout_step: step,
      checkout_option: option
    });
  },

  // Technical Performance Metrics
  trackApiError: (endpoint: string, errorCode: number, errorMessage: string) => {
    if (!window.gtag) return;
    window.gtag('event', 'api_error', {
      api_endpoint: endpoint,
      error_code: errorCode,
      error_message: errorMessage
    });
  },

  trackFormCompletion: (formName: string, successful: boolean, errorType?: string) => {
    if (!window.gtag) return;
    window.gtag('event', 'form_completion', {
      form_name: formName,
      successful: successful,
      error_type: errorType || 'none'
    });
  },

  trackPageLoad: (pageName: string, loadTime: number) => {
    if (!window.gtag) return;
    window.gtag('event', 'page_load', {
      page_name: pageName,
      load_time_ms: loadTime
    });
  },

  trackUserPath: (fromPage: string, toPage: string, interaction?: string) => {
    if (!window.gtag) return;
    window.gtag('event', 'user_navigation', {
      from_page: fromPage,
      to_page: toPage,
      interaction_type: interaction || 'navigation'
    });
  }
};

// TypeScript interfaces
declare global {
  interface Window {
    gtag?: (...args: any[]) => void;
  }
}