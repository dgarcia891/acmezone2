import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useSuggestIdeas, type TrendingSuggestion } from "@/hooks/usePodPipeline";
import { Sparkles, RefreshCw, TrendingUp, Flame, Minus, Users, Target } from "lucide-react";

interface TrendingIdeasDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectIdea: (suggestion: TrendingSuggestion) => void;
}

function viabilityColor(score: number) {
  if (score >= 8) return "bg-green-500/15 text-green-700 dark:text-green-400 border-green-500/30";
  if (score >= 5) return "bg-yellow-500/15 text-yellow-700 dark:text-yellow-400 border-yellow-500/30";
  return "bg-red-500/15 text-red-700 dark:text-red-400 border-red-500/30";
}

function MomentumIcon({ momentum }: { momentum: string }) {
  switch (momentum) {
    case "rising":
      return <TrendingUp className="h-3.5 w-3.5 text-green-600 dark:text-green-400" />;
    case "peaking":
      return <Flame className="h-3.5 w-3.5 text-orange-500" />;
    default:
      return <Minus className="h-3.5 w-3.5 text-muted-foreground" />;
  }
}

function momentumLabel(m: string) {
  return m.charAt(0).toUpperCase() + m.slice(1);
}

export default function TrendingIdeasDialog({ open, onOpenChange, onSelectIdea }: TrendingIdeasDialogProps) {
  const suggestMutation = useSuggestIdeas();
  const [ideas, setIdeas] = useState<TrendingSuggestion[]>([]);
  const [hasLoaded, setHasLoaded] = useState(false);

  const fetchIdeas = async () => {
    const result = await suggestMutation.mutateAsync({ count: 5 });
    if (result) {
      setIdeas(result);
      setHasLoaded(true);
    }
  };

  // Auto-fetch when opened for the first time or when refreshing
  const handleOpenChange = (isOpen: boolean) => {
    onOpenChange(isOpen);
    if (isOpen && !hasLoaded && !suggestMutation.isPending) {
      fetchIdeas();
    }
  };

  const handleRefresh = () => {
    setIdeas([]);
    fetchIdeas();
  };

  const handleSelect = (suggestion: TrendingSuggestion) => {
    onSelectIdea(suggestion);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2 text-xl">
              <Sparkles className="h-5 w-5 text-primary" />
              Trending Ideas
            </DialogTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={suggestMutation.isPending}
              className="gap-1.5"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${suggestMutation.isPending ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            AI-generated trending product ideas ranked by commercial viability
          </p>
        </DialogHeader>

        <div className="space-y-3 mt-2">
          {suggestMutation.isPending && ideas.length === 0 ? (
            Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="rounded-lg border p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <Skeleton className="h-6 w-10 rounded-full" />
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-4 w-16" />
                </div>
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
              </div>
            ))
          ) : ideas.length > 0 ? (
            ideas.map((idea, idx) => (
              <div
                key={idx}
                className="rounded-lg border bg-card p-4 space-y-2.5 hover:border-primary/40 transition-colors"
              >
                {/* Top row: rank, viability, momentum, category, product type */}
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-bold text-muted-foreground w-5">#{idx + 1}</span>
                  <Badge variant="outline" className={`text-xs font-semibold ${viabilityColor(idea.estimated_viability)}`}>
                    <Target className="h-3 w-3 mr-1" />
                    {idea.estimated_viability}/10
                  </Badge>
                  <Badge variant="outline" className="text-xs gap-1">
                    <MomentumIcon momentum={idea.trend_momentum} />
                    {momentumLabel(idea.trend_momentum)}
                  </Badge>
                  <Badge variant="secondary" className="text-xs">
                    {idea.category}
                  </Badge>
                  <Badge variant="outline" className="text-xs capitalize">
                    {idea.product_type}
                  </Badge>
                </div>

                {/* Idea text */}
                <p className="text-sm font-medium leading-relaxed">{idea.idea_text}</p>

                {/* Target audience */}
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Users className="h-3 w-3" />
                  {idea.target_audience}
                </div>

                {/* Reasoning */}
                <p className="text-xs text-muted-foreground italic">{idea.reasoning}</p>

                {/* Action */}
                <div className="pt-1">
                  <Button size="sm" variant="default" onClick={() => handleSelect(idea)} className="gap-1.5">
                    Use This Idea
                  </Button>
                </div>
              </div>
            ))
          ) : hasLoaded ? (
            <p className="text-center text-muted-foreground py-8">No ideas returned. Try refreshing.</p>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}
