import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
import { RefreshCw, AlertTriangle, Eye } from 'lucide-react';

interface Detection {
  id: string;
  url_hash: string;
  severity: string;
  signals: Record<string, unknown>;
  ai_confidence: number | null;
  ai_verdict: string | null;
  extension_version: string | null;
  created_at: string;
}

const severityColor = (s: string) => {
  switch (s) {
    case 'critical': return 'destructive';
    case 'high': return 'destructive';
    case 'medium': return 'default';
    default: return 'secondary';
  }
};

const DetectionViewer = () => {
  const { toast } = useToast();
  const [detections, setDetections] = useState<Detection[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Detection | null>(null);

  useEffect(() => { fetchDetections(); }, []);

  const fetchDetections = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('sa_detections')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(200);
      if (error) throw error;
      setDetections((data as unknown as Detection[]) || []);
    } catch (err) {
      console.error('Error fetching detections:', err);
      toast({ title: 'Error', description: 'Failed to load detections.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });

  return (
    <>
      <Card className="elevated">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5" />
                Detections
              </CardTitle>
              <CardDescription>{detections.length} detections (latest 200)</CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={fetchDetections} disabled={loading}>
              <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-2">
              {[...Array(5)].map((_, i) => <div key={i} className="animate-pulse h-10 bg-muted rounded" />)}
            </div>
          ) : detections.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No detections yet</p>
          ) : (
            <div className="rounded-md border overflow-auto max-h-[500px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>URL Hash</TableHead>
                    <TableHead>Severity</TableHead>
                    <TableHead>AI Verdict</TableHead>
                    <TableHead className="text-center">Confidence</TableHead>
                    <TableHead>Version</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Details</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {detections.map(d => (
                    <TableRow key={d.id}>
                      <TableCell className="font-mono text-xs max-w-[120px] truncate">{d.url_hash}</TableCell>
                      <TableCell>
                        <Badge variant={severityColor(d.severity) as any}>{d.severity}</Badge>
                      </TableCell>
                      <TableCell>{d.ai_verdict || '—'}</TableCell>
                      <TableCell className="text-center">{d.ai_confidence != null ? `${d.ai_confidence}%` : '—'}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{d.extension_version || '—'}</TableCell>
                      <TableCell className="text-xs text-muted-foreground whitespace-nowrap">{formatDate(d.created_at)}</TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setSelected(d)}>
                          <Eye className="w-4 h-4" />
                        </Button>
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
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Detection Details</DialogTitle>
            <DialogDescription>Full signal data for this detection.</DialogDescription>
          </DialogHeader>
          {selected && (
            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-2">
                <div><span className="text-muted-foreground">Severity:</span> <Badge variant={severityColor(selected.severity) as any}>{selected.severity}</Badge></div>
                <div><span className="text-muted-foreground">AI Verdict:</span> {selected.ai_verdict || '—'}</div>
                <div><span className="text-muted-foreground">Confidence:</span> {selected.ai_confidence != null ? `${selected.ai_confidence}%` : '—'}</div>
                <div><span className="text-muted-foreground">Version:</span> {selected.extension_version || '—'}</div>
              </div>
              <div>
                <span className="text-muted-foreground">URL Hash:</span>
                <p className="font-mono text-xs break-all mt-1">{selected.url_hash}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Signals:</span>
                <pre className="mt-1 p-3 bg-muted rounded text-xs overflow-auto max-h-[300px]">
                  {JSON.stringify(selected.signals, null, 2)}
                </pre>
              </div>
              <div className="text-xs text-muted-foreground">Created: {new Date(selected.created_at).toLocaleString()}</div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default DetectionViewer;
