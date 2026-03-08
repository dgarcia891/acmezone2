import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export const useAdmin = () => {
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const { user, loading: authLoading } = useAuth();

  useEffect(() => {
    // Don't check until auth is settled
    if (authLoading) return;

    if (!user) {
      setIsAdmin(false);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);

    const checkAdminRole = async () => {
      try {
        const { data, error } = await supabase.rpc('get_my_role');
        
        if (cancelled) return;

        if (error) {
          console.error('Error checking role:', error);
          setIsAdmin(false);
        } else {
          setIsAdmin(data === 'admin');
        }
      } catch (err) {
        if (!cancelled) {
          console.error('Error checking admin status:', err);
          setIsAdmin(false);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    checkAdminRole();
    return () => { cancelled = true; };
  }, [user, authLoading]);

  return { isAdmin, loading };
};
