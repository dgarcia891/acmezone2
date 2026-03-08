import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { RefreshCw, MessageSquare, Eye } from 'lucide-react';
import DetectionSnapshotView from './DetectionSnapshotView';

interface Correction {
  id: string;
  url_hash: string;
  feedback: string;
  user_comment: string | null;
  review_status: string;
  ai_review_result: Record<string, unknown> | null;
  reviewed_at: string | null;
  detection_id: string | null;
  detection_snapshot: Record<string, any> | null;
  created_at: string;
}

const statusColor = (s: string) => {
  switch (s) {
    case 'approved': return 'default';
    case 'rejected': return 'destructive';
    default: return 'secondary';
  }
};

const CorrectionViewer = () => {
  const { toast } = useToast();
  const [corrections, setCorrections] = useState<Correction[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Correction | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('all');

  useEffect(() => { fetchCorrections(); }, []);

  const fetchCorrections = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('sa_corrections')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(200);
      if (error) throw error;
      setCorrections((data as unknown as Correction[]) || []);
    } catch (err) {
      console.error('Error fetching corrections:', err);
      toast({ title: 'Error', description: 'Failed to load corrections.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (id: string, status: string) => {
    try {
      const { error } = await supabase
        .from('sa_corrections')
        .update({ review_status: status, reviewed_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
      setCorrections(prev => prev.map(c => c.id === id ? { ...c, review_status: status, reviewed_at: new Date().toISOString() } : c));
      toast({ title: 'Updated', description: `Correction marked as ${status}.` });
    } catch (err) {
      console.error('Error updating correction:', err);
      toast({ title: 'Error', description: 'Failed to update correction.', variant: 'destructive' });
    }
  };

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });

  const filtered = corrections.filter(c => filterStatus === 'all' || c.review_status === filterStatus);

  return (
    <>
      <Card className="elevated">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="w-5 h-5" />
                Corrections
              </CardTitle>
              <CardDescription>
                {corrections.filter(c => c.review_status === 'pending').length} pending of {corrections.length} total
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" size="sm" onClick={fetchCorrections} disabled={loading}>
                <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-2">
              {[...Array(5)].map((_, i) => <div key={i} className="animate-pulse h-10 bg-muted rounded" />)}
            </div>
          ) : filtered.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No corrections found</p>
          ) : (
            <div className="rounded-md border overflow-auto max-h-[500px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>URL Hash</TableHead>
                    <TableHead>Feedback</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>AI Review</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map(c => (
                    <TableRow key={c.id}>
                      <TableCell className="font-mono text-xs max-w-[120px] truncate">{c.url_hash}</TableCell>
                      <TableCell><Badge variant="outline">{c.feedback}</Badge></TableCell>
                      <TableCell>
                        <Badge variant={statusColor(c.review_status) as any}>{c.review_status}</Badge>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">{c.ai_review_result ? 'Yes' : '—'}</TableCell>
                      <TableCell className="text-xs text-muted-foreground whitespace-nowrap">{formatDate(c.created_at)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setSelected(c)}>
                            <Eye className="w-4 h-4" />
                          </Button>
                          {c.review_status === 'pending' && (
                            <>
                              <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={() => updateStatus(c.id, 'approved')}>
                                Approve
                              </Button>
                              <Button variant="ghost" size="sm" className="h-8 text-xs text-destructive" onClick={() => updateStatus(c.id, 'rejected')}>
                                Reject
                              </Button>
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Detail Dialog */}
      <Dialog open={!!selected} onOpenChange={() => setSelected(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Correction Details</DialogTitle>
            <DialogDescription>Full correction and AI review data.</DialogDescription>
          </DialogHeader>
          {selected && (
            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-2">
                <div><span className="text-muted-foreground">Feedback:</span> <Badge variant="outline">{selected.feedback}</Badge></div>
                <div><span className="text-muted-foreground">Status:</span> <Badge variant={statusColor(selected.review_status) as any}>{selected.review_status}</Badge></div>
              </div>
              <div>
                <span className="text-muted-foreground">URL Hash:</span>
                <p className="font-mono text-xs break-all mt-1">{selected.url_hash}</p>
              </div>
              {selected.user_comment && (
                <div>
                  <span className="text-muted-foreground">User Comment:</span>
                  <p className="mt-1 p-2 bg-muted rounded text-sm">{selected.user_comment}</p>
                </div>
              )}
              {selected.ai_review_result && (
                <div>
                  <span className="text-muted-foreground">AI Review Result:</span>
                  <pre className="mt-1 p-3 bg-muted rounded text-xs overflow-auto max-h-[200px]">
                    {JSON.stringify(selected.ai_review_result, null, 2)}
                  </pre>
                </div>
              )}

              {/* Detection Snapshot */}
              <div className="border-t border-border pt-3">
                <DetectionSnapshotView snapshot={selected.detection_snapshot} />
              </div>

              <div className="text-xs text-muted-foreground">
                Created: {new Date(selected.created_at).toLocaleString()}
                {selected.reviewed_at && <> • Reviewed: {new Date(selected.reviewed_at).toLocaleString()}</>}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default CorrectionViewer;
