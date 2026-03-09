import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { sourceBadgeVariant, formatDate, PAGE_SIZE } from './severity-utils';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { CardDescription } from '@/components/ui/card';
import PatternAdjustmentHistory from './PatternAdjustmentHistory';
import { Database, Plus, Search, ChevronLeft, ChevronRight, Pencil, Trash2, BarChart3, History, ChevronDown } from 'lucide-react';

interface Pattern {
  id: string;
  phrase: string;
  category: string;
  severity_weight: number;
  source: string;
  active: boolean;
  created_at: string;
  updated_at: string;
}

interface Stats { totalActive: number; recent7d: number; categories: Record<string, number>; }

const CATEGORIES = ['urgency', 'coercion', 'impersonation', 'financial', 'credential', 'typosquat', 'other'];

const defaultForm = { phrase: '', category: 'urgency', severity_weight: 5, source: 'manual' };

const PatternsTab = () => {
  const { toast } = useToast();
  const [patterns, setPatterns] = useState<Pattern[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<Stats>({ totalActive: 0, recent7d: 0, categories: {} });
  const [page, setPage] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [sourceFilter, setSourceFilter] = useState('all');
  const [activeFilter, setActiveFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(defaultForm);
  const [saving, setSaving] = useState(false);

  const fetchStats = useCallback(async () => {
    const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString();
    const [{ count: activeCount }, { data: recentData }, { data: catData }] = await Promise.all([
      supabase.from('sa_patterns').select('*', { count: 'exact', head: true }).eq('active', true),
      supabase.from('sa_patterns').select('id').gte('created_at', weekAgo),
      supabase.from('sa_patterns').select('category').eq('active', true),
    ]);
    const cats: Record<string, number> = {};
    ((catData as unknown as { category: string }[]) || []).forEach(r => { cats[r.category] = (cats[r.category] || 0) + 1; });
    setStats({ totalActive: activeCount ?? 0, recent7d: recentData?.length ?? 0, categories: cats });
  }, []);

  const fetchData = useCallback(async () => {
    setLoading(true);
    let query = supabase.from('sa_patterns').select('*', { count: 'exact' });
    if (categoryFilter !== 'all') query = query.eq('category', categoryFilter);
    if (sourceFilter !== 'all') query = query.eq('source', sourceFilter);
    if (activeFilter === 'active') query = query.eq('active', true);
    if (activeFilter === 'inactive') query = query.eq('active', false);
    if (search) query = query.ilike('phrase', `%${search}%`);
    const from = page * PAGE_SIZE;
    const { data, count } = await query.order('updated_at', { ascending: false }).range(from, from + PAGE_SIZE - 1);
    setPatterns((data as unknown as Pattern[]) || []);
    setTotalCount(count ?? 0);
    setLoading(false);
  }, [page, categoryFilter, sourceFilter, activeFilter, search]);

  useEffect(() => { fetchStats(); }, [fetchStats]);
  useEffect(() => { fetchData(); }, [fetchData]);

  const openAdd = () => { setEditingId(null); setForm(defaultForm); setDialogOpen(true); };
  const openEdit = (p: Pattern) => { setEditingId(p.id); setForm({ phrase: p.phrase, category: p.category, severity_weight: p.severity_weight, source: p.source }); setDialogOpen(true); };

  const handleSave = async () => {
    if (!form.phrase.trim()) { toast({ title: 'Error', description: 'Phrase is required.', variant: 'destructive' }); return; }
    setSaving(true);
    if (editingId) {
      const { error } = await supabase.from('sa_patterns').update({ phrase: form.phrase, category: form.category, severity_weight: form.severity_weight, source: form.source } as never).eq('id', editingId);
      if (error) toast({ title: 'Error', description: error.message, variant: 'destructive' });
      else toast({ title: 'Updated', description: 'Pattern updated.' });
    } else {
      const { data: existing } = await supabase
        .from('sa_patterns')
        .select('id, severity_weight')
        .ilike('phrase', form.phrase.trim())
        .maybeSingle();

      if (existing) {
        toast({ title: 'Duplicate Pattern', description: `Phrase already exists (weight ${existing.severity_weight}).`, variant: 'destructive' });
        setSaving(false);
        return;
      }

      const { error } = await supabase.from('sa_patterns').insert({ phrase: form.phrase, category: form.category, severity_weight: form.severity_weight, source: form.source } as never);
      if (error) toast({ title: 'Error', description: error.message, variant: 'destructive' });
      else toast({ title: 'Created', description: 'Pattern added.' });
    }
    setSaving(false);
    setDialogOpen(false);
    fetchData();
    fetchStats();
  };

  const toggleActive = async (id: string, current: boolean) => {
    await supabase.from('sa_patterns').update({ active: !current } as never).eq('id', id);
    fetchData();
    fetchStats();
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from('sa_patterns').delete().eq('id', id);
    if (error) toast({ title: 'Error', description: error.message, variant: 'destructive' });
    else { toast({ title: 'Deleted' }); fetchData(); fetchStats(); }
  };

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);
  const topCats = Object.entries(stats.categories).sort((a, b) => b[1] - a[1]).slice(0, 4);

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Active Patterns</CardTitle>
            <Database className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold">{stats.totalActive}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Added (7d)</CardTitle>
            <Plus className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold">{stats.recent7d}</div></CardContent>
        </Card>
        <Card className="md:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Top Categories</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {topCats.length === 0 ? <span className="text-muted-foreground text-sm">—</span> : topCats.map(([cat, count]) => (
                <Badge key={cat} variant="secondary">{cat} ({count})</Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters + Add */}
      <div className="flex flex-wrap items-center gap-3">
        <Select value={categoryFilter} onValueChange={v => { setCategoryFilter(v); setPage(0); }}>
          <SelectTrigger className="w-[150px]"><SelectValue placeholder="Category" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={sourceFilter} onValueChange={v => { setSourceFilter(v); setPage(0); }}>
          <SelectTrigger className="w-[150px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Sources</SelectItem>
            {['manual', 'ai_promoted', 'community'].map(s => <SelectItem key={s} value={s}>{s.replace('_', ' ')}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={activeFilter} onValueChange={v => { setActiveFilter(v as 'all' | 'active' | 'inactive'); setPage(0); }}>
          <SelectTrigger className="w-[130px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
          </SelectContent>
        </Select>
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search phrases..." className="pl-9" value={search} onChange={e => { setSearch(e.target.value); setPage(0); }} />
        </div>
        <Button onClick={openAdd}><Plus className="h-4 w-4 mr-2" />Add Pattern</Button>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="text-left p-3 font-medium">Phrase</th>
                  <th className="text-left p-3 font-medium">Category</th>
                  <th className="text-left p-3 font-medium">Weight</th>
                  <th className="text-left p-3 font-medium">Source</th>
                  <th className="text-left p-3 font-medium">Active</th>
                  <th className="text-left p-3 font-medium">Updated</th>
                  <th className="text-left p-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  [...Array(5)].map((_, i) => (
                    <tr key={i} className="border-b"><td colSpan={7} className="p-3"><Skeleton className="h-6 w-full" /></td></tr>
                  ))
                ) : patterns.length === 0 ? (
                  <tr><td colSpan={7} className="p-8 text-center text-muted-foreground">No patterns found</td></tr>
                ) : (
                  patterns.map(p => (
                    <tr key={p.id} className="border-b hover:bg-muted/30">
                      <td className="p-3 font-medium max-w-[250px] truncate">{p.phrase}</td>
                      <td className="p-3"><Badge variant="outline">{p.category}</Badge></td>
                      <td className="p-3">
                        <div className="flex items-center gap-2 min-w-[100px]">
                          <Progress value={p.severity_weight * 10} className="h-2 flex-1" />
                          <span className="text-xs text-muted-foreground w-4">{p.severity_weight}</span>
                        </div>
                      </td>
                      <td className="p-3"><Badge variant={sourceBadgeVariant(p.source)}>{p.source.replace('_', ' ')}</Badge></td>
                      <td className="p-3"><Switch checked={p.active} onCheckedChange={() => toggleActive(p.id, p.active)} /></td>
                      <td className="p-3 text-muted-foreground whitespace-nowrap">{formatDate(p.updated_at)}</td>
                      <td className="p-3">
                        <div className="flex gap-1">
                          <Button variant="ghost" size="sm" onClick={() => openEdit(p)}><Pencil className="h-3 w-3" /></Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild><Button variant="ghost" size="sm"><Trash2 className="h-3 w-3 text-destructive" /></Button></AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete pattern?</AlertDialogTitle>
                                <AlertDialogDescription>This will permanently remove "{p.phrase}".</AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleDelete(p.id)}>Delete</AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
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

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editingId ? 'Edit Pattern' : 'Add Pattern'}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Phrase</Label><Input value={form.phrase} onChange={e => setForm(f => ({ ...f, phrase: e.target.value }))} placeholder="e.g. verify your account" /></div>
            <div>
              <Label>Category</Label>
              <Select value={form.category} onValueChange={v => setForm(f => ({ ...f, category: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{CATEGORIES.map(c => <SelectItem key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Severity Weight ({form.severity_weight})</Label>
              <Slider min={1} max={10} step={1} value={[form.severity_weight]} onValueChange={v => setForm(f => ({ ...f, severity_weight: v[0] }))} className="mt-2" />
            </div>
            <div>
              <Label>Source</Label>
              <Select value={form.source} onValueChange={v => setForm(f => ({ ...f, source: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {['manual', 'ai_promoted', 'community'].map(s => <SelectItem key={s} value={s}>{s.replace('_', ' ')}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter><Button onClick={handleSave} disabled={saving}>{saving ? 'Saving...' : editingId ? 'Update' : 'Add'}</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Pattern Adjustment History */}
      <Collapsible className="mt-6">
        <CollapsibleTrigger asChild>
          <Button variant="outline" className="w-full">
            <History className="w-4 h-4 mr-2" />
            View Pattern Adjustment History
            <ChevronDown className="w-4 h-4 ml-auto" />
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <Card className="mt-4">
            <CardHeader>
              <CardTitle>Recent Pattern Adjustments</CardTitle>
              <CardDescription>Changes made based on user corrections</CardDescription>
            </CardHeader>
            <CardContent>
              <PatternAdjustmentHistory />
            </CardContent>
          </Card>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
};

export default PatternsTab;
