import { useState, useCallback, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { statusBadgeClass, formatDate, PAGE_SIZE } from './severity-utils';
import { Search, ChevronLeft, ChevronRight, MessageSquare, Loader2, CheckCircle, XCircle } from 'lucide-react';

interface Suggestion {
  id: string;
  phrase: string;
  category: string;
  context: string | null;
  submitter_ip: string | null;
  status: string;
  reviewed_by: string | null;
  reviewed_at: string | null;
  promoted_pattern_id: string | null;
  created_at: string;
}

interface Stats { pending: number; approvedWeek: number; rejectedWeek: number; }

const CATEGORIES = ['general', 'gift_card', 'command', 'finance', 'vague_lure', 'authority_pressure', 'urgency', 'securityKeywords'];

export default function PhraseSuggestionsTab() {
  const { toast } = useToast();
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<Stats>({ pending: 0, approvedWeek: 0, rejectedWeek: 0 });
  
  const [page, setPage] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [statusFilter, setStatusFilter] = useState('pending');
  const [search, setSearch] = useState('');
  
  const [selected, setSelected] = useState<Suggestion | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Approval state
  const [approveDialogOpen, setApproveDialogOpen] = useState(false);
  const [approveCategory, setApproveCategory] = useState('general');
  const [approveWeight, setApproveWeight] = useState(50);

  const fetchStats = useCallback(async () => {
    const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString();
    const [{ count: pend }, { data: weekData }] = await Promise.all([
      supabase.from('sa_phrase_suggestions').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
      supabase.from('sa_phrase_suggestions').select('status, reviewed_at').gte('reviewed_at', weekAgo),
    ]);
    const rows = (weekData as unknown as Suggestion[]) || [];
    setStats({
      pending: pend ?? 0,
      approvedWeek: rows.filter(r => r.status === 'approved').length,
      rejectedWeek: rows.filter(r => r.status === 'rejected').length,
    });
  }, []);

  const fetchData = useCallback(async () => {
    setLoading(true);
    let query = supabase.from('sa_phrase_suggestions').select('*', { count: 'exact' });
    if (statusFilter !== 'all') query = query.eq('status', statusFilter);
    if (search) query = query.ilike('phrase', `%${search}%`);
    const from = page * PAGE_SIZE;
    const { data, count } = await query.order('created_at', { ascending: false }).range(from, from + PAGE_SIZE - 1);
    setSuggestions((data as unknown as Suggestion[]) || []);
    setTotalCount(count ?? 0);
    setLoading(false);
  }, [page, statusFilter, search]);

  useEffect(() => { fetchStats(); }, [fetchStats]);
  useEffect(() => { fetchData(); }, [fetchData]);

  // Real-time updates for new pending suggestions
  useEffect(() => {
    const channel = supabase
      .channel('phrase-suggestions-changes')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'sa_phrase_suggestions' }, () => {
        fetchStats();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [fetchStats]);

  const initiateApproval = (suggestion: Suggestion) => {
    setSelected(suggestion);
    setApproveCategory(suggestion.category);
    setApproveWeight(50); // Default middle weight
    setApproveDialogOpen(true);
  };

  const handleApprove = async () => {
    if (!selected) return;
    setActionLoading(selected.id);
    setApproveDialogOpen(false);

    try {
      const { data, error } = await supabase.rpc('sa_approve_phrase_suggestion', {
        p_suggestion_id: selected.id,
        p_phrase: selected.phrase,
        p_category: approveCategory,
        p_severity_weight: approveWeight
      });

      if (error) throw error;

      toast({
        title: 'Suggestion Approved',
        description: 'Phrase has been added to the active detection library.',
      });
      fetchData();
      fetchStats();
      setSelected(null);
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (suggestion: Suggestion) => {
    setActionLoading(suggestion.id);
    try {
      const { error } = await supabase
        .from('sa_phrase_suggestions')
        .update({ status: 'rejected', reviewed_by: (await supabase.auth.getUser()).data.user?.id, reviewed_at: new Date().toISOString() })
        .eq('id', suggestion.id);

      if (error) throw error;
      
      toast({ title: 'Suggestion Rejected', description: 'Phrase discarded.' });
      fetchData();
      fetchStats();
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setActionLoading(null);
      if (selected?.id === suggestion.id) setSelected(null);
    }
  };

  const isPending = (s: string) => s === 'pending';
  const totalPages = Math.ceil(totalCount / PAGE_SIZE) || 1;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Pending Review</CardTitle>
            <MessageSquare className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold">{stats.pending}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Approved (7d)</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold">{stats.approvedWeek}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Rejected (7d)</CardTitle>
            <XCircle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold">{stats.rejectedWeek}</div></CardContent>
        </Card>
      </div>

      <div className="flex flex-wrap gap-3">
        <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(0); }}>
          <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            {['all', 'pending', 'approved', 'rejected'].map(s => (
              <SelectItem key={s} value={s}>{s === 'all' ? 'All Statuses' : s.charAt(0).toUpperCase() + s.slice(1)}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search phrase..." className="pl-9" value={search} onChange={e => { setSearch(e.target.value); setPage(0); }} />
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 border-b">
                <tr>
                  <th className="text-left font-medium p-4">Submitted</th>
                  <th className="text-left font-medium p-4">Phrase</th>
                  <th className="text-left font-medium p-4">Category</th>
                  <th className="text-left font-medium p-4">Status</th>
                  <th className="text-left font-medium p-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  [...Array(5)].map((_, i) => (
                    <tr key={i} className="border-b"><td colSpan={5} className="p-4"><Skeleton className="h-6 w-full" /></td></tr>
                  ))
                ) : suggestions.length === 0 ? (
                  <tr><td colSpan={5} className="p-8 text-center text-muted-foreground">No suggestions found in queue.</td></tr>
                ) : (
                  suggestions.map(s => (
                    <tr key={s.id} className="border-b hover:bg-muted/30 cursor-pointer" onClick={() => setSelected(s)}>
                      <td className="p-4 whitespace-nowrap">{formatDate(s.created_at)}</td>
                      <td className="p-4 font-medium max-w-[250px] truncate">{s.phrase}</td>
                      <td className="p-4"><Badge variant="outline">{s.category}</Badge></td>
                      <td className="p-4"><Badge className={statusBadgeClass(s.status)} variant="outline">{s.status}</Badge></td>
                      <td className="p-4">
                        <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                          <Button variant="ghost" size="sm" onClick={() => setSelected(s)}>View</Button>
                          {isPending(s.status) && (
                            <>
                              <Button size="sm" variant="outline" className="text-green-600" disabled={actionLoading === s.id} onClick={() => initiateApproval(s)}>
                                {actionLoading === s.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCircle className="h-3 w-3" />}
                              </Button>
                              <Button size="sm" variant="outline" className="text-red-600" disabled={actionLoading === s.id} onClick={() => handleReject(s)}>
                                <XCircle className="h-3 w-3" />
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
            <div className="flex items-center justify-between p-4 border-t">
              <span className="text-sm text-muted-foreground">Page {page + 1} of {totalPages}</span>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}><ChevronLeft className="w-4 h-4" /></Button>
                <Button variant="outline" size="sm" onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1}><ChevronRight className="w-4 h-4" /></Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Approve Dialog */}
      <Dialog open={approveDialogOpen} onOpenChange={setApproveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Approve & Promote Phrase</DialogTitle>
            <DialogDescription>Review the final pattern details before committing it to the active detection library.</DialogDescription>
          </DialogHeader>
          {selected && (
            <div className="space-y-4 py-4">
              <div>
                <label className="text-sm font-medium mb-1 block">Exact Phrase</label>
                <Input value={selected.phrase} disabled className="bg-muted" />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Category</label>
                <Select value={approveCategory} onValueChange={setApproveCategory}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block flex justify-between">
                  Severity Weight <span className="text-primary font-mono">{approveWeight}</span>
                </label>
                <input 
                  type="range" 
                  min="1" max="100" 
                  value={approveWeight} 
                  onChange={(e) => setApproveWeight(Number(e.target.value))}
                  className="w-full" 
                />
                <div className="flex justify-between text-xs text-muted-foreground mt-1">
                  <span>Low Risk (1-29)</span>
                  <span>Med (30-49)</span>
                  <span>High (50+)</span>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setApproveDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleApprove}>Confirm & Promote</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Details View Dialog (View Only) */}
      <Dialog open={!!selected && !approveDialogOpen} onOpenChange={(open) => !open && setSelected(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Suggestion Details</DialogTitle></DialogHeader>
          {selected && (
            <div className="space-y-4 text-sm mt-4">
              <div><span className="font-semibold block">Phrase:</span><p className="bg-muted p-2 rounded mt-1">{selected.phrase}</p></div>
              <div><span className="font-semibold block">Category:</span> {selected.category}</div>
              <div><span className="font-semibold block">Submitter IP:</span> <span className="font-mono">{selected.submitter_ip || 'Unknown'}</span></div>
              <div><span className="font-semibold block">Status:</span> <Badge className={statusBadgeClass(selected.status)}>{selected.status}</Badge></div>
              <div>
                <span className="font-semibold block">Context/Reasoning:</span>
                <p className="mt-1 text-muted-foreground">{selected.context || 'No context provided by user.'}</p>
              </div>
              {selected.reviewed_at && <div><span className="font-semibold block">Reviewed At:</span> {formatDate(selected.reviewed_at)}</div>}
            </div>
          )}
        </DialogContent>
      </Dialog>

    </div>
  );
}
