export const Analytics = {
    // Product Performance Metrics
    trackProductView: (product) => {
        if (!window.gtag)
            return;
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
    trackCategoryView: (category) => {
        if (!window.gtag)
            return;
        window.gtag('event', 'view_item_list', {
            item_list_id: category,
            item_list_name: category
        });
    },
    trackAddToCart: (product, quantity) => {
        if (!window.gtag)
            return;
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
    trackTimeOnPage: (pageTitle, timeSpentSeconds) => {
        if (!window.gtag)
            return;
        window.gtag('event', 'time_on_page', {
            page_title: pageTitle,
            time_seconds: timeSpentSeconds
        });
    },
    trackScrollDepth: (depth, pageTitle) => {
        if (!window.gtag)
            return;
        window.gtag('event', 'scroll_depth', {
            depth_percentage: depth,
            page_title: pageTitle
        });
    },
    trackCartAbandonment: (items, value) => {
        if (!window.gtag)
            return;
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
    trackCheckoutStep: (step, option) => {
        if (!window.gtag)
            return;
        window.gtag('event', 'checkout_progress', {
            checkout_step: step,
            checkout_option: option
        });
    },
    // Technical Performance Metrics
    trackApiError: (endpoint, errorCode, errorMessage) => {
        if (!window.gtag)
            return;
        window.gtag('event', 'api_error', {
            api_endpoint: endpoint,
            error_code: errorCode,
            error_message: errorMessage
        });
    },
    trackFormCompletion: (formName, successful, errorType) => {
        if (!window.gtag)
            return;
        window.gtag('event', 'form_completion', {
            form_name: formName,
            successful: successful,
            error_type: errorType || 'none'
        });
    },
    trackPageLoad: (pageName, loadTime) => {
        if (!window.gtag)
            return;
        window.gtag('event', 'page_load', {
            page_name: pageName,
            load_time_ms: loadTime
        });
    },
    trackUserPath: (fromPage, toPage, interaction) => {
        if (!window.gtag)
            return;
        window.gtag('event', 'user_navigation', {
            from_page: fromPage,
            to_page: toPage,
            interaction_type: interaction || 'navigation'
        });
    }
};
