import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
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
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Plus, Pencil, Trash2, RefreshCw, Search, Shield } from 'lucide-react';

interface Pattern {
  id: string;
  phrase: string;
  category: string;
  source: string;
  severity_weight: number;
  active: boolean;
  created_at: string;
  updated_at: string;
}

const CATEGORIES = ['keyword', 'phrase', 'domain', 'email_pattern', 'url_pattern'];
const SOURCES = ['manual', 'ai_promoted', 'community'];

const PatternManagement = () => {
  const { toast } = useToast();
  const [patterns, setPatterns] = useState<Pattern[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('all');

  const [editorOpen, setEditorOpen] = useState(false);
  const [editingPattern, setEditingPattern] = useState<Pattern | null>(null);
  const [form, setForm] = useState({ phrase: '', category: 'keyword', source: 'manual', severity_weight: 1, active: true });
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Pattern | null>(null);

  useEffect(() => { fetchPatterns(); }, []);

  const fetchPatterns = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('sa_patterns')
        .select('*')
        .order('updated_at', { ascending: false });
      if (error) throw error;
      setPatterns((data as unknown as Pattern[]) || []);
    } catch (err) {
      console.error('Error fetching patterns:', err);
      toast({ title: 'Error', description: 'Failed to load patterns.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const openCreate = () => {
    setEditingPattern(null);
    setForm({ phrase: '', category: 'keyword', source: 'manual', severity_weight: 1, active: true });
    setEditorOpen(true);
  };

  const openEdit = (p: Pattern) => {
    setEditingPattern(p);
    setForm({ phrase: p.phrase, category: p.category, source: p.source, severity_weight: p.severity_weight, active: p.active });
    setEditorOpen(true);
  };

  const handleSave = async () => {
    if (!form.phrase.trim()) {
      toast({ title: 'Validation', description: 'Phrase is required.', variant: 'destructive' });
      return;
    }
    try {
      setSaving(true);
      if (editingPattern) {
        const { error } = await supabase
          .from('sa_patterns')
          .update({ phrase: form.phrase.trim(), category: form.category, source: form.source, severity_weight: form.severity_weight, active: form.active })
          .eq('id', editingPattern.id);
        if (error) throw error;
        toast({ title: 'Updated', description: 'Pattern updated successfully.' });
      } else {
        const { error } = await supabase
          .from('sa_patterns')
          .insert({ phrase: form.phrase.trim(), category: form.category, source: form.source, severity_weight: form.severity_weight, active: form.active });
        if (error) throw error;
        toast({ title: 'Created', description: 'Pattern created successfully.' });
      }
      setEditorOpen(false);
      fetchPatterns();
    } catch (err: any) {
      console.error('Error saving pattern:', err);
      toast({ title: 'Error', description: err.message || 'Failed to save pattern.', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      const { error } = await supabase.from('sa_patterns').delete().eq('id', deleteTarget.id);
      if (error) throw error;
      toast({ title: 'Deleted', description: `Pattern "${deleteTarget.phrase}" deleted.` });
      setDeleteTarget(null);
      fetchPatterns();
    } catch (err) {
      console.error('Error deleting pattern:', err);
      toast({ title: 'Error', description: 'Failed to delete pattern.', variant: 'destructive' });
    }
  };

  const toggleActive = async (p: Pattern) => {
    try {
      const { error } = await supabase.from('sa_patterns').update({ active: !p.active }).eq('id', p.id);
      if (error) throw error;
      setPatterns(prev => prev.map(x => x.id === p.id ? { ...x, active: !x.active } : x));
    } catch (err) {
      console.error('Error toggling pattern:', err);
    }
  };

  const filtered = patterns.filter(p => {
    const matchesSearch = !search || p.phrase.toLowerCase().includes(search.toLowerCase());
    const matchesCat = filterCategory === 'all' || p.category === filterCategory;
    return matchesSearch && matchesCat;
  });

  return (
    <>
      <Card className="elevated">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5" />
                Scam Patterns
              </CardTitle>
              <CardDescription>{patterns.length} total patterns</CardDescription>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={fetchPatterns} disabled={loading}>
                <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
              <Button size="sm" onClick={openCreate}>
                <Plus className="w-4 h-4 mr-2" />
                Add Pattern
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Filters */}
          <div className="flex gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search phrases..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
            </div>
            <Select value={filterCategory} onValueChange={setFilterCategory}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {loading ? (
            <div className="space-y-2">
              {[...Array(5)].map((_, i) => <div key={i} className="animate-pulse h-10 bg-muted rounded" />)}
            </div>
          ) : filtered.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No patterns found</p>
          ) : (
            <div className="rounded-md border overflow-auto max-h-[500px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Phrase</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Source</TableHead>
                    <TableHead className="text-center">Weight</TableHead>
                    <TableHead className="text-center">Active</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map(p => (
                    <TableRow key={p.id} className={!p.active ? 'opacity-50' : ''}>
                      <TableCell className="font-mono text-sm max-w-[200px] truncate">{p.phrase}</TableCell>
                      <TableCell><Badge variant="outline">{p.category}</Badge></TableCell>
                      <TableCell>
                        <Badge variant={p.source === 'ai_promoted' ? 'default' : 'secondary'}>{p.source}</Badge>
                      </TableCell>
                      <TableCell className="text-center">{p.severity_weight}</TableCell>
                      <TableCell className="text-center">
                        <Switch checked={p.active} onCheckedChange={() => toggleActive(p)} />
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(p)}>
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => setDeleteTarget(p)}>
                            <Trash2 className="w-4 h-4" />
                          </Button>
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

      {/* Editor Dialog */}
      <Dialog open={editorOpen} onOpenChange={setEditorOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingPattern ? 'Edit Pattern' : 'Add Pattern'}</DialogTitle>
            <DialogDescription>Enter the scam pattern details below.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Phrase</Label>
              <Input value={form.phrase} onChange={e => setForm(f => ({ ...f, phrase: e.target.value }))} placeholder="e.g. send money now" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Category</Label>
                <Select value={form.category} onValueChange={v => setForm(f => ({ ...f, category: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Source</Label>
                <Select value={form.source} onValueChange={v => setForm(f => ({ ...f, source: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {SOURCES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Severity Weight (1-10)</Label>
                <Input type="number" min={1} max={10} value={form.severity_weight} onChange={e => setForm(f => ({ ...f, severity_weight: parseInt(e.target.value) || 1 }))} />
              </div>
              <div className="flex items-end gap-2 pb-1">
                <Switch checked={form.active} onCheckedChange={v => setForm(f => ({ ...f, active: v }))} />
                <Label>Active</Label>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditorOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>{saving ? 'Saving...' : editingPattern ? 'Update' : 'Create'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Pattern</AlertDialogTitle>
            <AlertDialogDescription>
              Delete "{deleteTarget?.phrase}"? This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default PatternManagement;
