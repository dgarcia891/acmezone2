import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Search, ChevronLeft, ChevronRight, BookOpen, AlertCircle } from "lucide-react";
import { useActivePatterns, ActivePattern } from "@/hooks/use-active-patterns";
import { Skeleton } from "@/components/ui/skeleton";

const PAGE_SIZE = 15;
const CATEGORIES = ['all', 'general', 'gift_card', 'command', 'finance', 'vague_lure', 'authority_pressure', 'urgency', 'securityKeywords'];

export default function PhraseLibraryTable() {
  const { data: patterns = [], isLoading, error } = useActivePatterns();
  
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [page, setPage] = useState(0);

  const filteredPatterns = useMemo(() => {
    return patterns.filter((p) => {
      const matchSearch = p.phrase.toLowerCase().includes(search.toLowerCase());
      const matchCat = category === "all" || p.category === category;
      return matchSearch && matchCat;
    });
  }, [patterns, search, category]);

  const totalPages = Math.ceil(filteredPatterns.length / PAGE_SIZE) || 1;
  // Ensure page stays in bounds if filters change shrinking the data
  const safePage = Math.min(page, totalPages - 1);
  const currentData = filteredPatterns.slice(safePage * PAGE_SIZE, (safePage + 1) * PAGE_SIZE);

  if (error) {
    return (
      <Card className="border-red-200">
        <CardContent className="p-8 text-center text-red-600">
          <AlertCircle className="w-8 h-8 mx-auto mb-4 opacity-50" />
          <p>Failed to load the active phrase library. Please try again later.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-primary" /> Active Detection Library
        </CardTitle>
        <CardDescription>
          Browse the public snapshot of {patterns.length || "active"} phrases currently feeding the Hydra Guard engine.
        </CardDescription>
      </CardHeader>
      
      <CardContent>
        {/* Toolbar */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Search phrases..." 
              value={search} 
              onChange={(e) => { setSearch(e.target.value); setPage(0); }}
              className="pl-9"
            />
          </div>
          <Select value={category} onValueChange={(v) => { setCategory(v); setPage(0); }}>
            <SelectTrigger className="w-full sm:w-[200px]">
              <SelectValue placeholder="Category filter" />
            </SelectTrigger>
            <SelectContent>
              {CATEGORIES.map(c => (
                <SelectItem key={c} value={c}>
                  {c === 'all' ? 'All Categories' : c.replace('_', ' ').charAt(0).toUpperCase() + c.slice(1)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Table */}
        <div className="rounded-md border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 border-b">
              <tr>
                <th className="text-left font-medium p-4">Phrase</th>
                <th className="text-left font-medium p-4 w-[150px]">Category</th>
                <th className="text-left font-medium p-4 w-[200px] hidden sm:table-cell">Severity Weight</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                [...Array(5)].map((_, i) => (
                  <tr key={i} className="border-b">
                    <td colSpan={3} className="p-4"><Skeleton className="h-6 w-full" /></td>
                  </tr>
                ))
              ) : currentData.length === 0 ? (
                <tr>
                  <td colSpan={3} className="p-8 text-center text-muted-foreground">
                    No matching phrases found.
                  </td>
                </tr>
              ) : (
                currentData.map((p, idx) => (
                  <tr key={idx} className="border-b hover:bg-muted/30 transition-colors">
                    <td className="p-4 font-semibold text-foreground/90">{p.phrase}</td>
                    <td className="p-4 flex items-center">
                      <Badge variant="outline" className="capitalize text-xs whitespace-nowrap">
                        {p.category.replace('_', ' ')}
                      </Badge>
                    </td>
                    <td className="p-4 hidden sm:table-cell">
                      <div className="flex items-center gap-3">
                        <Progress value={p.severity_weight} className="h-2 flex-1" />
                        <span className="text-xs text-muted-foreground w-6 font-mono">{p.severity_weight}</span>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between mt-4">
          <p className="text-xs text-muted-foreground">
            Showing {currentData.length} of {filteredPatterns.length} entries
          </p>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setPage(p => Math.max(0, p - 1))}
              disabled={safePage === 0 || isLoading}
            >
              <ChevronLeft className="w-4 h-4 mr-1" /> Prev
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
              disabled={safePage >= totalPages - 1 || isLoading}
            >
              Next <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
