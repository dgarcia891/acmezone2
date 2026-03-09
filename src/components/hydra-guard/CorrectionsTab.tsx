import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { statusBadgeClass, formatDate, PAGE_SIZE } from './severity-utils';
import { Clock, CheckCircle, XCircle, AlertCircle, ChevronLeft, ChevronRight, MessageSquare, Loader2 } from 'lucide-react';
import DetectionSnapshotView from '@/components/admin/sa/DetectionSnapshotView';

interface Correction {
  id: string;
  detection_id: string | null;
  url_hash: string;
  feedback: string;
  user_comment: string | null;
  review_status: string;
  reviewed_at: string | null;
  reviewed_by: string | null;
  ai_review_result: Record<string, unknown> | null;
  ai_analysis: Record<string, unknown> | null;
  detection_snapshot: Record<string, any> | null;
  created_at: string;
}

interface Stats { pending: number; approvedWeek: number; rejectedWeek: number; }

const CorrectionsTab = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [corrections, setCorrections] = useState<Correction[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<Stats>({ pending: 0, approvedWeek: 0, rejectedWeek: 0 });
  const [page, setPage] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [statusFilter, setStatusFilter] = useState('pending');
  const [selected, setSelected] = useState<Correction | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchStats = useCallback(async () => {
    const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString();
    const [{ count: pend }, { data: weekData }] = await Promise.all([
      supabase.from('sa_corrections').select('*', { count: 'exact', head: true }).eq('review_status', 'pending'),
      supabase.from('sa_corrections').select('review_status, reviewed_at').gte('reviewed_at', weekAgo),
    ]);
    const rows = (weekData as unknown as Correction[]) || [];
    setStats({
      pending: pend ?? 0,
      approvedWeek: rows.filter(r => r.review_status === 'approved').length,
      rejectedWeek: rows.filter(r => r.review_status === 'rejected').length,
    });
  }, []);

  const fetchData = useCallback(async () => {
    setLoading(true);
    let query = supabase.from('sa_corrections').select('*', { count: 'exact' });
    if (statusFilter !== 'all') query = query.eq('review_status', statusFilter);
    const from = page * PAGE_SIZE;
    const { data, count } = await query.order('created_at', { ascending: false }).range(from, from + PAGE_SIZE - 1);
    setCorrections((data as unknown as Correction[]) || []);
    setTotalCount(count ?? 0);
    setLoading(false);
  }, [page, statusFilter]);

  useEffect(() => { fetchStats(); }, [fetchStats]);
  useEffect(() => { fetchData(); }, [fetchData]);

  const handleApprove = async (id: string) => {
    setActionLoading(id);
    try {
      const { data, error } = await supabase.functions.invoke('approve-correction', {
        body: { correctionId: id }
      });

      if (error) {
        console.warn('Edge function not available, using direct update:', error);
        const { error: updateError } = await supabase
          .from('sa_corrections')
          .update({ review_status: 'approved', reviewed_by: user?.id, reviewed_at: new Date().toISOString() } as never)
          .eq('id', id);
        if (updateError) throw updateError;
      }

      toast({
        title: 'Correction Approved',
        description: data?.adjustment_count
          ? `Pattern confidence adjusted (${data.adjustment_count} patterns updated)`
          : 'Marked as approved',
      });
      fetchData();
      fetchStats();
      if (selected?.id === id) setSelected(null);
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (id: string) => {
    setActionLoading(id);
    const { error } = await supabase
      .from('sa_corrections')
      .update({ review_status: 'rejected', reviewed_by: user?.id, reviewed_at: new Date().toISOString() } as never)
      .eq('id', id);
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Correction Rejected', description: 'No pattern changes made.' });
      fetchData();
      fetchStats();
      if (selected?.id === id) setSelected(null);
    }
    setActionLoading(null);
  };

  const handleNeedsReview = async (id: string) => {
    setActionLoading(id);
    const { error } = await supabase
      .from('sa_corrections')
      .update({ review_status: 'needs_review', reviewed_by: user?.id, reviewed_at: new Date().toISOString() } as never)
      .eq('id', id);
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Marked for Review', description: 'Requires manual investigation.' });
      fetchData();
      fetchStats();
      if (selected?.id === id) setSelected(null);
    }
    setActionLoading(null);
  };

  const isPending = (status: string) => status === 'pending';
  const isLoading = (id: string) => actionLoading === id;
  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        {[
          { label: 'Pending Review', value: stats.pending, icon: Clock, color: 'text-yellow-600' },
          { label: 'Approved (7d)', value: stats.approvedWeek, icon: CheckCircle, color: 'text-green-600' },
          { label: 'Rejected (7d)', value: stats.rejectedWeek, icon: XCircle, color: 'text-red-600' },
        ].map(s => (
          <Card key={s.label}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">{s.label}</CardTitle>
              <s.icon className={`h-4 w-4 ${s.color}`} />
            </CardHeader>
            <CardContent><div className="text-2xl font-bold">{s.value}</div></CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <div className="flex gap-3">
        <Select value={statusFilter} onValueChange={v => { setStatusFilter(v); setPage(0); }}>
          <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            {['all', 'pending', 'approved', 'rejected', 'needs_review'].map(s => (
              <SelectItem key={s} value={s}>{s === 'all' ? 'All Statuses' : s.charAt(0).toUpperCase() + s.slice(1).replace('_', ' ')}</SelectItem>
            ))}
          </SelectContent>
        </Select>
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
                  <th className="text-left p-3 font-medium">Feedback</th>
                  <th className="text-left p-3 font-medium">Comment</th>
                  <th className="text-left p-3 font-medium">Status</th>
                  <th className="text-left p-3 font-medium">AI</th>
                  <th className="text-left p-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  [...Array(5)].map((_, i) => (
                    <tr key={i} className="border-b"><td colSpan={7} className="p-3"><Skeleton className="h-6 w-full" /></td></tr>
                  ))
                ) : corrections.length === 0 ? (
                  <tr><td colSpan={7} className="p-8 text-center text-muted-foreground"><MessageSquare className="mx-auto h-8 w-8 mb-2 opacity-40" />No corrections found</td></tr>
                ) : (
                  corrections.map(c => (
                    <tr key={c.id} className="border-b hover:bg-muted/30">
                      <td className="p-3 whitespace-nowrap">{formatDate(c.created_at)}</td>
                      <td className="p-3 font-mono text-xs max-w-[160px] truncate">{c.url_hash}</td>
                      <td className="p-3"><Badge variant="outline">{c.feedback}</Badge></td>
                      <td className="p-3 max-w-[200px] truncate text-muted-foreground">{c.user_comment || '—'}</td>
                      <td className="p-3"><Badge variant="outline" className={statusBadgeClass(c.review_status)}>{c.review_status}</Badge></td>
                      <td className="p-3">{c.ai_review_result ? <span className="text-green-600">✓</span> : '—'}</td>
                      <td className="p-3">
                        <div className="flex gap-1">
                          <Button variant="ghost" size="sm" onClick={() => setSelected(c)}>View</Button>
                          {isPending(c.review_status) && (
                            <>
                              <Button size="sm" variant="outline" className="text-green-600" disabled={isLoading(c.id)} onClick={() => handleApprove(c.id)}>
                                {isLoading(c.id) ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCircle className="h-3 w-3" />}
                              </Button>
                              <Button size="sm" variant="outline" className="text-red-600" disabled={isLoading(c.id)} onClick={() => handleReject(c.id)}>
                                <XCircle className="h-3 w-3" />
                              </Button>
                              <Button size="sm" variant="outline" className="text-orange-600" disabled={isLoading(c.id)} onClick={() => handleNeedsReview(c.id)}>
                                <AlertCircle className="h-3 w-3" />
                              </Button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          {totalPages > 1 && (
            <div className="flex items-center justify-between p-3 border-t">
              <span className="text-sm text-muted-foreground">Page {page + 1} of {totalPages}</span>
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
          <DialogHeader><DialogTitle>Correction Details</DialogTitle></DialogHeader>
          {selected && (
            <div className="space-y-4 text-sm">
              <div><span className="font-medium">URL Hash:</span> <span className="font-mono break-all">{selected.url_hash}</span></div>
              <div><span className="font-medium">Feedback:</span> <Badge variant="outline">{selected.feedback}</Badge></div>
              <div><span className="font-medium">Status:</span> <Badge variant="outline" className={statusBadgeClass(selected.review_status)}>{selected.review_status}</Badge></div>
              <div><span className="font-medium">Submitted:</span> {formatDate(selected.created_at)}</div>
              {selected.reviewed_at && <div><span className="font-medium">Reviewed:</span> {formatDate(selected.reviewed_at)}</div>}
              {selected.user_comment && <div><span className="font-medium">Comment:</span> {selected.user_comment}</div>}
              {selected.ai_review_result && (
                <div>
                  <span className="font-medium">AI Review:</span>
                  <pre className="mt-1 p-3 rounded bg-muted text-xs overflow-x-auto">{JSON.stringify(selected.ai_review_result, null, 2)}</pre>
                </div>
              )}
              {selected.ai_analysis && (
                <div>
                  <span className="font-medium">AI Analysis:</span>
                  <pre className="mt-1 p-3 rounded bg-muted text-xs overflow-x-auto">{JSON.stringify(selected.ai_analysis, null, 2)}</pre>
                </div>
              )}
              {isPending(selected.review_status) && (
                <div className="flex gap-2 pt-2">
                  <Button className="flex-1" variant="outline" disabled={isLoading(selected.id)} onClick={() => handleApprove(selected.id)}>
                    <CheckCircle className="h-4 w-4 mr-2" /> Approve & Adjust
                  </Button>
                  <Button className="flex-1" variant="outline" disabled={isLoading(selected.id)} onClick={() => handleReject(selected.id)}>
                    <XCircle className="h-4 w-4 mr-2" /> Reject
                  </Button>
                  <Button className="flex-1" variant="outline" disabled={isLoading(selected.id)} onClick={() => handleNeedsReview(selected.id)}>
                    <AlertCircle className="h-4 w-4 mr-2" /> Needs Review
                  </Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CorrectionsTab;
