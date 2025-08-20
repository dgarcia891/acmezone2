import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export const useCredits = () => {
  const [balance, setBalance] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  const fetchBalance = async () => {
    if (!user) {
      setBalance(0);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      const { data, error } = await supabase.functions.invoke('get-balance');
      
      if (error) {
        throw error;
      }
      
      if (data?.ok) {
        setBalance(data.balance || 0);
      } else {
        throw new Error(data?.error || 'Failed to fetch balance');
      }
    } catch (err: any) {
      console.error('Error fetching balance:', err);
      setError(err.message || 'Failed to fetch credit balance');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBalance();
  }, [user]);

  const refreshBalance = () => {
    fetchBalance();
  };

  return {
    balance,
    loading,
    error,
    refreshBalance,
  };
};