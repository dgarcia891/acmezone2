import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { severityBadgeClass, statusBadgeClass, formatDate, PAGE_SIZE } from './severity-utils';
import {
  FileWarning, Clock, CheckCircle, XCircle, AlertCircle,
  ChevronLeft, ChevronRight, Search, X, ExternalLink, Loader2, Sparkles, Shield
} from 'lucide-react';

interface UserReport {
  id: string;
  url: string;
  report_type: string;
  description: string | null;
  sender_email: string | null;
  subject: string | null;
  body_preview: string | null;
  user_notes: string | null;
  severity: string;
  indicators: unknown[];
  scan_result: Record<string, unknown>;
  extension_version: string | null;
  review_status: string;
  reviewed_by: string | null;
  reviewed_at: string | null;
  admin_notes: string | null;
  promoted_pattern_id: string | null;
  ai_analysis: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

interface Stats { pending: number; reviewedWeek: number; total: number; }

const UserReportsTab = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [reports, setReports] = useState<UserReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<Stats>({ pending: 0, reviewedWeek: 0, total: 0 });
  const [page, setPage] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [statusFilter, setStatusFilter] = useState('pending');
  const [severityFilter, setSeverityFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<UserReport | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [adminNotes, setAdminNotes] = useState('');

  const fetchStats = useCallback(async () => {
    const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString();
    const [{ count: pend }, { count: total }, { data: weekData }] = await Promise.all([
      supabase.from('sa_user_reports' as any).select('*', { count: 'exact', head: true }).eq('review_status', 'pending'),
      supabase.from('sa_user_reports' as any).select('*', { count: 'exact', head: true }),
      supabase.from('sa_user_reports' as any).select('review_status, reviewed_at').neq('review_status', 'pending').gte('reviewed_at', weekAgo),
    ]);
    setStats({
      pending: pend ?? 0,
      reviewedWeek: (weekData as any[])?.length ?? 0,
      total: total ?? 0,
    });
  }, []);

  const fetchData = useCallback(async () => {
    setLoading(true);
    let query = supabase.from('sa_user_reports' as any).select('*', { count: 'exact' });
    if (statusFilter !== 'all') query = query.eq('review_status', statusFilter);
    if (severityFilter !== 'all') query = query.eq('severity', severityFilter);
    if (search) query = query.ilike('url', `%${search}%`);
    const from = page * PAGE_SIZE;
    const { data, count } = await query.order('created_at', { ascending: false }).range(from, from + PAGE_SIZE - 1);
    setReports((data as unknown as UserReport[]) || []);
    setTotalCount(count ?? 0);
    setLoading(false);
  }, [page, statusFilter, severityFilter, search]);

  useEffect(() => { fetchStats(); }, [fetchStats]);
  useEffect(() => { fetchData(); }, [fetchData]);

  // Real-time subscription
  useEffect(() => {
    const channel = supabase
      .channel('user-reports-changes')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'sa_user_reports' },
        () => {
          toast({ title: 'New User Report', description: 'A new scam report was submitted.' });
          fetchData();
          fetchStats();
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [toast, fetchData, fetchStats]);

  const updateStatus = async (id: string, status: string) => {
    setActionLoading(id);
    const updatePayload: Record<string, unknown> = {
      review_status: status,
      reviewed_by: user?.id,
      reviewed_at: new Date().toISOString(),
    };
    if (adminNotes.trim()) updatePayload.admin_notes = adminNotes.trim();

    const { error } = await supabase
      .from('sa_user_reports' as any)
      .update(updatePayload as never)
      .eq('id', id);

    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      const label = status.charAt(0).toUpperCase() + status.slice(1).replace('_', ' ');
      toast({ title: `Report ${label}`, description: `Report marked as ${status}.` });
      fetchData();
      fetchStats();
      if (selected?.id === id) setSelected(null);
      setAdminNotes('');
    }
    setActionLoading(null);
  };

  const handleApproveAndBlock = async (report: UserReport) => {
    setActionLoading(report.id);
    try {
      // 1. Extract patterns from AI analysis or raw indicators
      let patternsToBlock: string[] = [];
      const aiData = report.ai_analysis as any;
      
      if (aiData?.suggested_patterns && Array.isArray(aiData.suggested_patterns)) {
         patternsToBlock = aiData.suggested_patterns;
      } else if (report.indicators && Array.isArray(report.indicators)) {
         patternsToBlock = report.indicators.map(i => String(i));
      }

      if (patternsToBlock.length === 0) {
        toast({ title: 'Notice', description: 'No patterns found to block.', variant: 'default' });
        updateStatus(report.id, 'reviewed'); // fallback
        return;
      }

      // 2. Insert into global sa_patterns
      const inserts = patternsToBlock.map(phrase => ({
        phrase,
        category: report.report_type === 'telemetry' ? 'telemetry_auto' : 'admin_added',
        severity_weight: 50,
        active: true,
        source: 'user_report_promotion'
      }));

      const { data: insertedPatterns, error: insertError } = await supabase
        .from('sa_patterns' as any)
        .insert(inserts as never)
        .select('id');

      if (insertError) throw insertError;

      // 3. Update the report to mark it as promoted
      const promotedId = insertedPatterns && insertedPatterns.length > 0 ? insertedPatterns[0].id : null;
      
      const { error: updateError } = await supabase
        .from('sa_user_reports' as any)
        .update({
          review_status: 'reviewed',
          reviewed_by: user?.id,
          reviewed_at: new Date().toISOString(),
          promoted_pattern_id: promotedId,
          admin_notes: ((adminNotes || '') + ' [Auto-blocked via Admin UI]').trim()
        } as never)
        .eq('id', report.id);
        
      if (updateError) throw updateError;
      
      toast({ 
        title: 'Successfully Blocked', 
        description: `Added ${patternsToBlock.length} patterns to the global blocklist.` 
      });
      
      fetchData();
      fetchStats();
      setSelected(null);
      setAdminNotes('');
      
    } catch (err: any) {
      toast({ title: 'Error', description: err.message || 'Failed to sync patterns.', variant: 'destructive' });
    } finally {
      setActionLoading(null);
    }
  };

  const openDetail = (r: UserReport) => {
    setSelected(r);
    setAdminNotes(r.admin_notes || '');
  };

  const isPending = (s: string) => s === 'pending';
  const isLoading = (id: string) => actionLoading === id;
  const totalPages = Math.ceil(totalCount / PAGE_SIZE);
  const hasActiveFilters = statusFilter !== 'pending' || severityFilter !== 'all' || search !== '';

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        {[
          { label: 'Pending Review', value: stats.pending, icon: Clock, color: 'text-yellow-600' },
          { label: 'Reviewed (7d)', value: stats.reviewedWeek, icon: CheckCircle, color: 'text-green-600' },
          { label: 'Total Reports', value: stats.total, icon: FileWarning, color: 'text-muted-foreground' },
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
      <div className="flex flex-wrap gap-3">
        <Select value={statusFilter} onValueChange={v => { setStatusFilter(v); setPage(0); }}>
          <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            {['all', 'pending', 'reviewed', 'dismissed', 'flagged'].map(s => (
              <SelectItem key={s} value={s}>{s === 'all' ? 'All Statuses' : s.charAt(0).toUpperCase() + s.slice(1)}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={severityFilter} onValueChange={v => { setSeverityFilter(v); setPage(0); }}>
          <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            {['all', 'CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'UNKNOWN'].map(s => (
              <SelectItem key={s} value={s}>{s === 'all' ? 'All Severities' : s}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search URL..." className="pl-9" value={search} onChange={e => { setSearch(e.target.value); setPage(0); }} />
        </div>
        {hasActiveFilters && (
          <Button variant="ghost" size="sm" onClick={() => { setStatusFilter('pending'); setSeverityFilter('all'); setSearch(''); setPage(0); }}>
            <X className="h-4 w-4 mr-1" /> Clear
          </Button>
        )}
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="text-left p-3 font-medium">Timestamp</th>
                  <th className="text-left p-3 font-medium">URL</th>
                  <th className="text-left p-3 font-medium">Type</th>
                  <th className="text-left p-3 font-medium">Severity</th>
                  <th className="text-left p-3 font-medium">Status</th>
                  <th className="text-left p-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  [...Array(5)].map((_, i) => (
                    <tr key={i} className="border-b"><td colSpan={6} className="p-3"><Skeleton className="h-6 w-full" /></td></tr>
                  ))
                ) : reports.length === 0 ? (
                  <tr><td colSpan={6} className="p-8 text-center text-muted-foreground">
                    <FileWarning className="mx-auto h-8 w-8 mb-2 opacity-40" />No reports found
                  </td></tr>
                ) : (
                  reports.map(r => (
                    <tr key={r.id} className="border-b hover:bg-muted/30 cursor-pointer" onClick={() => openDetail(r)}>
                      <td className="p-3 whitespace-nowrap">{formatDate(r.created_at)}</td>
                      <td className="p-3 max-w-[250px] truncate font-mono text-xs">{r.url}</td>
                      <td className="p-3"><Badge variant="outline">{r.report_type}</Badge></td>
                      <td className="p-3"><Badge variant="outline" className={severityBadgeClass(r.severity)}>{r.severity}</Badge></td>
                      <td className="p-3"><Badge variant="outline" className={statusBadgeClass(r.review_status)}>{r.review_status}</Badge></td>
                      <td className="p-3">
                        <div className="flex gap-1">
                          <Button variant="ghost" size="sm" onClick={e => { e.stopPropagation(); openDetail(r); }}>View</Button>
                          {isPending(r.review_status) && (
                            <>
                              <Button size="sm" variant="outline" className="text-green-600" disabled={isLoading(r.id)} onClick={e => { e.stopPropagation(); updateStatus(r.id, 'reviewed'); }}>
                                {isLoading(r.id) ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCircle className="h-3 w-3" />}
                              </Button>
                              <Button size="sm" variant="outline" className="text-red-600" disabled={isLoading(r.id)} onClick={e => { e.stopPropagation(); updateStatus(r.id, 'dismissed'); }}>
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
          <DialogHeader><DialogTitle>User Report Details</DialogTitle></DialogHeader>
          {selected && (
            <div className="space-y-4 text-sm">
              <div className="flex items-start gap-2">
                <span className="font-medium shrink-0">URL:</span>
                <a href={selected.url} target="_blank" rel="noopener noreferrer" className="font-mono break-all text-primary hover:underline flex items-center gap-1">
                  {selected.url} <ExternalLink className="h-3 w-3 shrink-0" />
                </a>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><span className="font-medium">Type:</span> <Badge variant="outline">{selected.report_type}</Badge></div>
                <div><span className="font-medium">Severity:</span> <Badge variant="outline" className={severityBadgeClass(selected.severity)}>{selected.severity}</Badge></div>
                <div><span className="font-medium">Status:</span> <Badge variant="outline" className={statusBadgeClass(selected.review_status)}>{selected.review_status}</Badge></div>
                <div><span className="font-medium">Submitted:</span> {formatDate(selected.created_at)}</div>
              </div>
              {selected.description && <div><span className="font-medium">Description:</span><p className="mt-1 text-muted-foreground">{selected.description}</p></div>}
              {selected.sender_email && <div><span className="font-medium">Sender Email:</span> <span className="font-mono">{selected.sender_email}</span></div>}
              {selected.subject && <div><span className="font-medium">Subject:</span> {selected.subject}</div>}
              {selected.body_preview && <div><span className="font-medium">Body Preview:</span><p className="mt-1 p-3 rounded bg-muted text-xs whitespace-pre-wrap">{selected.body_preview}</p></div>}
              {selected.user_notes && <div><span className="font-medium">User Notes:</span><p className="mt-1 text-muted-foreground">{selected.user_notes}</p></div>}
              {selected.extension_version && <div><span className="font-medium">Extension:</span> v{selected.extension_version}</div>}
              {Array.isArray(selected.indicators) && selected.indicators.length > 0 && (
                <div>
                  <span className="font-medium">Indicators:</span>
                  <pre className="mt-1 p-3 rounded bg-muted text-xs overflow-x-auto">{JSON.stringify(selected.indicators, null, 2)}</pre>
                </div>
              )}
              {selected.scan_result && Object.keys(selected.scan_result).length > 0 && (
                <div>
                  <span className="font-medium">Scan Result:</span>
                  <pre className="mt-1 p-3 rounded bg-muted text-xs overflow-x-auto">{JSON.stringify(selected.scan_result, null, 2)}</pre>
                </div>
              )}
              {selected.reviewed_at && <div><span className="font-medium">Reviewed:</span> {formatDate(selected.reviewed_at)}</div>}
              {selected.ai_analysis && Object.keys(selected.ai_analysis).length > 0 && (
                <div className="border rounded-lg p-3 bg-muted/30">
                  <div className="flex items-center gap-2 mb-2">
                    <Sparkles className="h-4 w-4 text-primary" />
                    <span className="font-medium">AI Analysis</span>
                    {(selected.ai_analysis as any).confidence != null && (
                      <Badge variant="outline">{(selected.ai_analysis as any).confidence}% confidence</Badge>
                    )}
                  </div>
                  {(selected.ai_analysis as any).verdict && (
                    <div className="mb-1"><span className="font-medium">Verdict:</span> <Badge variant="outline" className={
                      (selected.ai_analysis as any).verdict === 'SCAM' ? 'border-red-500 text-red-600' :
                      (selected.ai_analysis as any).verdict === 'SAFE' ? 'border-green-500 text-green-600' :
                      'border-yellow-500 text-yellow-600'
                    }>{(selected.ai_analysis as any).verdict}</Badge></div>
                  )}
                  {(selected.ai_analysis as any).reason && <p className="text-muted-foreground text-xs">{(selected.ai_analysis as any).reason}</p>}
                  {Array.isArray((selected.ai_analysis as any).suggested_patterns) && (selected.ai_analysis as any).suggested_patterns.length > 0 && (
                    <div className="mt-2">
                      <span className="text-xs font-medium">Suggested patterns:</span>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {(selected.ai_analysis as any).suggested_patterns.map((p: string, i: number) => (
                          <Badge key={i} variant="secondary" className="text-xs">{p}</Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
              {selected.admin_notes && !isPending(selected.review_status) && (
                <div><span className="font-medium">Admin Notes:</span><p className="mt-1 text-muted-foreground">{selected.admin_notes}</p></div>
              )}

              {isPending(selected.review_status) && (
                <div className="space-y-3 pt-2 border-t">
                  <Textarea
                    placeholder="Admin notes (optional)..."
                    value={adminNotes}
                    onChange={e => setAdminNotes(e.target.value)}
                    rows={2}
                  />
                  <div className="flex flex-col gap-2">
                    <Button 
                       className="w-full bg-red-600 hover:bg-red-700 text-white" 
                       disabled={isLoading(selected.id)} 
                       onClick={() => handleApproveAndBlock(selected)}
                    >
                      <Shield className="h-4 w-4 mr-2" /> Approve & Add to Blocklist
                    </Button>
                    <div className="flex gap-2">
                      <Button className="flex-1" variant="outline" disabled={isLoading(selected.id)} onClick={() => updateStatus(selected.id, 'reviewed')}>
                        <CheckCircle className="h-4 w-4 mr-2" /> Mark Reviewed
                      </Button>
                      <Button className="flex-1" variant="outline" disabled={isLoading(selected.id)} onClick={() => updateStatus(selected.id, 'dismissed')}>
                        <XCircle className="h-4 w-4 mr-2" /> Dismiss
                      </Button>
                      <Button className="flex-1" variant="outline" disabled={isLoading(selected.id)} onClick={() => updateStatus(selected.id, 'flagged')}>
                        <AlertCircle className="h-4 w-4 mr-2" /> Flag
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default UserReportsTab;
