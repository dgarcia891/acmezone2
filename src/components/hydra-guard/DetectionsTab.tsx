import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/integrations/supabase/client';
import { severityBadgeClass, formatDate, PAGE_SIZE } from './severity-utils';
import { Activity, AlertTriangle, Shield, Eye, ChevronLeft, ChevronRight, Search } from 'lucide-react';

interface Detection {
  id: string;
  url_hash: string;
  severity: string;
  signals: Record<string, unknown>;
  ai_verdict: string | null;
  ai_confidence: number | null;
  extension_version: string | null;
  created_at: string;
}

interface Stats {
  total7d: number;
  criticalHigh: number;
  topSeverity: string;
  aiRate: number;
}

const DetectionsTab = () => {
  const [detections, setDetections] = useState<Detection[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<Stats>({ total7d: 0, criticalHigh: 0, topSeverity: '-', aiRate: 0 });
  const [page, setPage] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [severityFilter, setSeverityFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Detection | null>(null);

  const fetchStats = useCallback(async () => {
    const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString();
    const { data } = await supabase
      .from('sa_detections')
      .select('severity, ai_verdict, created_at')
      .gte('created_at', weekAgo);
    const rows = (data as unknown as Detection[]) || [];
    const critHigh = rows.filter(r => ['critical', 'high'].includes(r.severity?.toLowerCase())).length;
    const withAi = rows.filter(r => r.ai_verdict).length;
    const sevCounts: Record<string, number> = {};
    rows.forEach(r => { sevCounts[r.severity] = (sevCounts[r.severity] || 0) + 1; });
    const topSev = Object.entries(sevCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? '-';
    setStats({ total7d: rows.length, criticalHigh: critHigh, topSeverity: topSev, aiRate: rows.length ? Math.round((withAi / rows.length) * 100) : 0 });
  }, []);

  const fetchData = useCallback(async () => {
    setLoading(true);
    let query = supabase.from('sa_detections').select('*', { count: 'exact' });
    if (severityFilter !== 'all') query = query.eq('severity', severityFilter);
    if (search) query = query.ilike('url_hash', `%${search}%`);
    const from = page * PAGE_SIZE;
    const { data, count } = await query.order('created_at', { ascending: false }).range(from, from + PAGE_SIZE - 1);
    setDetections((data as unknown as Detection[]) || []);
    setTotalCount(count ?? 0);
    setLoading(false);
  }, [page, severityFilter, search]);

  useEffect(() => { fetchStats(); }, [fetchStats]);
  useEffect(() => { fetchData(); }, [fetchData]);

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        {[
          { label: 'Detections (7d)', value: stats.total7d, icon: Activity },
          { label: 'Critical / High', value: stats.criticalHigh, icon: AlertTriangle },
          { label: 'Most Common', value: stats.topSeverity, icon: Shield },
          { label: 'AI Verified', value: `${stats.aiRate}%`, icon: Eye },
        ].map(s => (
          <Card key={s.label}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">{s.label}</CardTitle>
              <s.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent><div className="text-2xl font-bold">{s.value}</div></CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <Select value={severityFilter} onValueChange={v => { setSeverityFilter(v); setPage(0); }}>
          <SelectTrigger className="w-[160px]"><SelectValue placeholder="Severity" /></SelectTrigger>
          <SelectContent>
            {['all', 'critical', 'high', 'medium', 'low', 'caution', 'safe'].map(s => (
              <SelectItem key={s} value={s}>{s === 'all' ? 'All Severities' : s.charAt(0).toUpperCase() + s.slice(1)}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search url hash..." className="pl-9" value={search} onChange={e => { setSearch(e.target.value); setPage(0); }} />
        </div>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="text-left p-3 font-medium">Timestamp</th>
                  <th className="text-left p-3 font-medium">URL Hash</th>
                  <th className="text-left p-3 font-medium">Severity</th>
                  <th className="text-left p-3 font-medium">AI Verdict</th>
                  <th className="text-left p-3 font-medium">Version</th>
                  <th className="text-left p-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  [...Array(5)].map((_, i) => (
                    <tr key={i} className="border-b"><td colSpan={6} className="p-3"><Skeleton className="h-6 w-full" /></td></tr>
                  ))
                ) : detections.length === 0 ? (
                  <tr><td colSpan={6} className="p-8 text-center text-muted-foreground">No detections found</td></tr>
                ) : (
                  detections.map(d => (
                    <tr key={d.id} className="border-b hover:bg-muted/30 cursor-pointer" onClick={() => setSelected(d)}>
                      <td className="p-3 whitespace-nowrap">{formatDate(d.created_at)}</td>
                      <td className="p-3 font-mono text-xs max-w-[200px] truncate">{d.url_hash}</td>
                      <td className="p-3"><Badge variant="outline" className={severityBadgeClass(d.severity)}>{d.severity}</Badge></td>
                      <td className="p-3">{d.ai_verdict ? <span className="text-green-600">✓ {d.ai_confidence}%</span> : <span className="text-muted-foreground">—</span>}</td>
                      <td className="p-3 text-muted-foreground">{d.extension_version || '—'}</td>
                      <td className="p-3"><Button variant="ghost" size="sm" onClick={e => { e.stopPropagation(); setSelected(d); }}>View</Button></td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between p-3 border-t">
              <span className="text-sm text-muted-foreground">Page {page + 1} of {totalPages} ({totalCount} total)</span>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(p => p - 1)}><ChevronLeft className="h-4 w-4" /></Button>
                <Button variant="outline" size="sm" disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}><ChevronRight className="h-4 w-4" /></Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Detail Dialog */}
      <Dialog open={!!selected} onOpenChange={() => setSelected(null)}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Detection Details</DialogTitle></DialogHeader>
          {selected && (
            <div className="space-y-4 text-sm">
              <div><span className="font-medium">URL Hash:</span> <span className="font-mono break-all">{selected.url_hash}</span></div>
              <div><span className="font-medium">Severity:</span> <Badge variant="outline" className={severityBadgeClass(selected.severity)}>{selected.severity}</Badge></div>
              <div><span className="font-medium">Detected:</span> {formatDate(selected.created_at)}</div>
              {selected.ai_verdict && <div><span className="font-medium">AI Verdict:</span> {selected.ai_verdict} ({selected.ai_confidence}%)</div>}
              {selected.extension_version && <div><span className="font-medium">Extension:</span> v{selected.extension_version}</div>}
              <div>
                <span className="font-medium">Signals:</span>
                <pre className="mt-1 p-3 rounded bg-muted text-xs overflow-x-auto">{JSON.stringify(selected.signals, null, 2)}</pre>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default DetectionsTab;
