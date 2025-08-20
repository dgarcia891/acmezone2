import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Coins, RefreshCw, TrendingUp } from 'lucide-react';
import { useCredits } from '@/hooks/useCredits';

interface CreditBalanceProps {
  onRefresh?: () => void;
}

export const CreditBalance = ({ onRefresh }: CreditBalanceProps) => {
  const { balance, loading, error, refreshBalance } = useCredits();

  const handleRefresh = () => {
    refreshBalance();
    onRefresh?.();
  };

  const formatBalance = (balance: number): string => {
    return balance.toLocaleString();
  };

  const getAnalysesRemaining = (balance: number): number => {
    return Math.floor(balance / 100);
  };

  return (
    <Card className="elevated">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">Credit Balance</CardTitle>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleRefresh}
          disabled={loading}
          className="h-8 w-8 p-0"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
        </Button>
      </CardHeader>
      <CardContent>
        <div className="flex items-center space-x-2">
          <Coins className="h-5 w-5 text-primary" />
          <div className="text-2xl font-bold">
            {loading ? '...' : error ? 'Error' : formatBalance(balance)}
          </div>
        </div>
        {!loading && !error && (
          <div className="flex items-center space-x-1 text-xs text-muted-foreground mt-1">
            <TrendingUp className="h-3 w-3" />
            <span>{getAnalysesRemaining(balance)} analyses remaining</span>
          </div>
        )}
        {error && (
          <p className="text-xs text-destructive mt-1">{error}</p>
        )}
      </CardContent>
    </Card>
  );
};