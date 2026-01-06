import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { History, TrendingDown, TrendingUp } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface UsageLog {
  id: number;
  created_at: string;
  provider: string;
  company: string | null;
  job_title: string | null;
  tokens_in: number;
  tokens_out: number;
  cost_cents: number;
  cached: boolean;
}

interface CreditTransaction {
  id: number;
  created_at: string;
  delta: number;
  reason: string | null;
}

export const UsageHistory = () => {
  const [usageHistory, setUsageHistory] = useState<UsageLog[]>([]);
  const [creditHistory, setCreditHistory] = useState<CreditTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;

    const fetchHistory = async () => {
      try {
        setLoading(true);
        // Tables don't exist yet - show empty state
        setUsageHistory([]);
        setCreditHistory([]);
      } catch (error) {
        console.error('Error fetching history:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchHistory();
  }, [user]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getReasonDisplay = (reason: string | null) => {
    if (!reason) return 'Unknown';
    
    const reasonMap: Record<string, string> = {
      'signup_bonus': 'Welcome Bonus',
      'purchase': 'Credit Purchase',
      'analysis': 'Job Analysis',
      'refund': 'Refund',
    };
    
    return reasonMap[reason] || reason;
  };

  if (loading) {
    return (
      <Card className="elevated">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <History className="w-5 h-5" />
            <span>Usage History</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="h-4 bg-muted rounded w-3/4 mb-2"></div>
                <div className="h-3 bg-muted rounded w-1/2"></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  // Combine and sort all transactions
  const allTransactions = [
    ...creditHistory.map(t => ({
      ...t,
      type: 'credit' as const,
      amount: t.delta,
    })),
    ...usageHistory.map(t => ({
      ...t,
      type: 'usage' as const,
      amount: -100, // Each analysis costs 100 credits
    }))
  ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  return (
    <Card className="elevated">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <History className="w-5 h-5" />
          <span>Recent Activity</span>
        </CardTitle>
        <CardDescription>
          Your credit purchases and usage history
        </CardDescription>
      </CardHeader>
      <CardContent>
        {allTransactions.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <History className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>No activity yet</p>
            <p className="text-sm">Your usage history will appear here</p>
            <div className="mt-4 p-4 bg-muted/50 rounded-lg text-left">
              <p className="text-sm font-medium mb-2">Next steps:</p>
              <ul className="text-xs space-y-1">
                <li>• Purchase credits above to get started</li>
                <li>• Use your Chrome extension for job analyses</li>
                <li>• Track your usage and balance here</li>
              </ul>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {allTransactions.slice(0, 10).map((transaction, index) => (
              <div key={`${transaction.type}-${transaction.id}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    {transaction.type === 'credit' ? (
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                        <TrendingUp className="w-4 h-4 text-primary" />
                      </div>
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-destructive/10 flex items-center justify-center">
                        <TrendingDown className="w-4 h-4 text-destructive" />
                      </div>
                    )}
                    
                    <div>
                      <p className="text-sm font-medium">
                        {transaction.type === 'credit' 
                          ? getReasonDisplay((transaction as CreditTransaction).reason)
                          : `Analysis: ${(transaction as UsageLog).company || 'Unknown Company'}`
                        }
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatDate(transaction.created_at)}
                      </p>
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <Badge variant={transaction.amount > 0 ? "default" : "secondary"}>
                      {transaction.amount > 0 ? '+' : ''}{transaction.amount.toLocaleString()}
                    </Badge>
                    {transaction.type === 'usage' && (transaction as UsageLog).cached && (
                      <p className="text-xs text-muted-foreground mt-1">Cached</p>
                    )}
                  </div>
                </div>
                
                {index < allTransactions.length - 1 && (
                  <Separator className="mt-3" />
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};