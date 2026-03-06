import { useState } from "react";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Eye, Lightbulb } from "lucide-react";
import { usePodIdeas } from "@/hooks/usePodPipeline";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

const statusColors: Record<string, string> = {
  pending: "bg-gray-500",
  analyzed: "bg-blue-500",
  designs_generated: "bg-yellow-500 text-black",
  approved: "bg-green-500",
  rejected: "bg-destructive",
};

export default function PodHistoryTable() {
  const { data: ideas, isLoading } = usePodIdeas();
  const [selected, setSelected] = useState<any | null>(null);

  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
      </div>
    );
  }

  if (!ideas?.length) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
        <Lightbulb className="h-12 w-12 mb-4" />
        <p>No ideas submitted yet. Start by submitting an idea in the Pipeline tab.</p>
      </div>
    );
  }

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Idea</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Viability</TableHead>
            <TableHead>Date</TableHead>
            <TableHead className="w-12" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {ideas.map((idea: any) => {
            const score = (idea.analysis as any)?.commercial_viability_score;
            return (
              <TableRow key={idea.id}>
                <TableCell className="max-w-[200px] truncate">{idea.idea_text?.substring(0, 60) || "—"}{(idea.idea_text?.length || 0) > 60 ? "…" : ""}</TableCell>
                <TableCell>
                  <Badge className={cn(statusColors[idea.status] || "bg-gray-500")}>
                    {(idea.status as string)?.replace(/_/g, " ").replace(/^\w/, (c: string) => c.toUpperCase())}
                  </Badge>
                </TableCell>
                <TableCell>
                  {score != null ? (
                    <Badge className={cn(
                      score >= 7 ? "bg-green-500" : score >= 4 ? "bg-yellow-500 text-black" : "bg-destructive"
                    )}>
                      {score}/10
                    </Badge>
                  ) : "—"}
                </TableCell>
                <TableCell>{format(new Date(idea.created_at), "MMM d, yyyy")}</TableCell>
                <TableCell>
                  <Button variant="ghost" size="icon" onClick={() => setSelected(idea)}>
                    <Eye className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>

      <Dialog open={!!selected} onOpenChange={() => setSelected(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Idea Details</DialogTitle>
          </DialogHeader>
          {selected?.analysis && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              {Object.entries(selected.analysis as Record<string, any>).map(([key, val]) => (
                <div key={key}>
                  <p className="font-medium text-muted-foreground">{key.replace(/_/g, " ").replace(/^\w/, (c) => c.toUpperCase())}</p>
                  <p className="mt-1">{typeof val === "object" ? JSON.stringify(val) : String(val)}</p>
                </div>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
