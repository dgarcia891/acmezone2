import { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/integrations/supabase/client';
import { TrendingUp, TrendingDown, History } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface Adjustment {
  id: string;
  phrase_id: string | null;
  correction_id: string | null;
  old_weight: number;
  new_weight: number;
  adjustment_reason: string | null;
  adjusted_by: string | null;
  created_at: string;
  phrase: {
    phrase: string;
    severity_weight: number;
  } | null;
}

const PatternAdjustmentHistory = () => {
  const [adjustments, setAdjustments] = useState<Adjustment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      setLoading(true);
      const { data } = await supabase
        .from('pattern_adjustments')
        .select(`
          *,
          phrase:phrase_id (
            phrase,
            severity_weight
          )
        `)
        .order('created_at', { ascending: false })
        .limit(20);
      setAdjustments((data as unknown as Adjustment[]) || []);
      setLoading(false);
    };
    fetch();
  }, []);

  if (loading) {
    return (
      <div className="space-y-3">
        {[...Array(3)].map((_, i) => (
          <Skeleton key={i} className="h-16 w-full animate-pulse" />
        ))}
        <p className="text-sm text-muted-foreground text-center">Loading adjustment history...</p>
      </div>
    );
  }

  if (adjustments.length === 0) {
    return (
      <div className="py-8 text-center">
        <History className="mx-auto h-8 w-8 mb-2 opacity-40" />
        <p className="text-muted-foreground">No pattern adjustments yet</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {adjustments.map(a => {
        const increased = a.new_weight > a.old_weight;
        const diff = a.new_weight - a.old_weight;
        return (
          <div key={a.id} className="flex items-center justify-between p-3 rounded-lg border bg-card">
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm truncate">
                "{a.phrase?.phrase || 'Deleted pattern'}"
              </p>
              {a.adjustment_reason && (
                <p className="text-xs text-muted-foreground mt-1 truncate">{a.adjustment_reason}</p>
              )}
              <p className="text-xs text-muted-foreground mt-1">
                {formatDistanceToNow(new Date(a.created_at), { addSuffix: true })}
              </p>
            </div>
            <div className="flex items-center gap-3 ml-4 shrink-0">
              <div className="flex items-center gap-1 text-sm">
                <span className="text-muted-foreground">{a.old_weight}</span>
                <span className="text-muted-foreground">→</span>
                <span className="font-medium">{a.new_weight}</span>
              </div>
              <div className="flex items-center gap-1">
                {increased ? (
                  <TrendingUp className="h-4 w-4 text-green-600" />
                ) : (
                  <TrendingDown className="h-4 w-4 text-orange-600" />
                )}
                <Badge variant="outline" className={increased ? 'text-green-600' : 'text-orange-600'}>
                  {diff > 0 ? `+${diff}` : diff}
                </Badge>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default PatternAdjustmentHistory;
