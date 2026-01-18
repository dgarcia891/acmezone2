import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';

export const usePageTracking = () => {
  const location = useLocation();

  useEffect(() => {
    const trackPageView = async () => {
      try {
        await supabase.functions.invoke('track-pageview', {
          body: {
            path: location.pathname,
            referrer: document.referrer,
            userAgent: navigator.userAgent,
          },
        });
      } catch (error) {
        // Silently fail - don't break the app for analytics
        console.debug('Page tracking error:', error);
      }
    };

    trackPageView();
  }, [location.pathname]);
};
