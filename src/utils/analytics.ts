declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
  }
}

/**
 * Utility for tracking custom Google Analytics events.
 * 
 * @param eventName The name of the event (e.g., 'button_click', 'conversion', 'join_waitlist')
 * @param eventParams Optional key-value pairs with extra context (e.g., { button_id: 'hero_cta', page: 'resufill' })
 */
export const trackEvent = (eventName: string, eventParams?: Record<string, string | number | boolean>) => {
  if (typeof window !== 'undefined' && typeof window.gtag === 'function') {
    window.gtag('event', eventName, eventParams);
  } else {
    // If running locally or before gtag loads, just log for debugging
    console.debug(`[Analytics] Tracked Event: ${eventName}`, eventParams);
  }
};
