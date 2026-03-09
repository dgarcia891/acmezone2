import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';

export default function HydraGuardSummary() {
  const [stats, setStats] = useState({ detections: 0, corrections: 0, patterns: 0, reports: 0 });

  useEffect(() => {
    async function fetchStats() {
      const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString();
      const [
        { count: detections },
        { count: corrections },
        { count: patterns },
        { count: reports }
      ] = await Promise.all([
        supabase.from('sa_detections').select('*', { count: 'exact', head: true }).gte('created_at', weekAgo),
        supabase.from('sa_corrections').select('*', { count: 'exact', head: true }).eq('review_status', 'pending'),
        supabase.from('sa_patterns').select('*', { count: 'exact', head: true }).eq('active', true),
        supabase.from('sa_user_reports' as any).select('*', { count: 'exact', head: true }).eq('review_status', 'pending'),
      ]);

      setStats({
        detections: detections || 0,
        corrections: corrections || 0,
        patterns: patterns || 0,
        reports: reports || 0
      });
    }
    fetchStats();
  }, []);

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
      <Card>
        <CardContent className="p-4 flex flex-col justify-center">
          <p className="text-sm font-medium text-muted-foreground">Detections (7d)</p>
          <p className="text-2xl font-bold">{stats.detections}</p>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="p-4 flex flex-col justify-center">
          <p className="text-sm font-medium text-muted-foreground">Corrections (Pending)</p>
          <p className="text-2xl font-bold">{stats.corrections}</p>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="p-4 flex flex-col justify-center">
          <p className="text-sm font-medium text-muted-foreground">Patterns (Active)</p>
          <p className="text-2xl font-bold">{stats.patterns}</p>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="p-4 flex flex-col justify-center">
          <p className="text-sm font-medium text-muted-foreground">User Reports (Pending)</p>
          <p className="text-2xl font-bold">{stats.reports}</p>
        </CardContent>
      </Card>
    </div>
  );
}
