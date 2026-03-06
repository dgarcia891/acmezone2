import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow } from "date-fns";

interface KanbanCardProps {
  idea: any;
  onClick: () => void;
}

const priorityDot: Record<string, string> = {
  urgent: "bg-destructive",
  high: "bg-orange-500",
  low: "bg-muted-foreground/50",
};

function viabilityColor(score: number | undefined | null) {
  if (score == null) return "secondary";
  if (score >= 7) return "default";
  if (score >= 4) return "outline";
  return "destructive";
}

export default function KanbanCard({ idea, onClick }: KanbanCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: idea.id,
    data: { status: idea.status },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const score = idea.analysis?.commercial_viability_score;
  const thumb = idea.sticker_design_url || idea.tshirt_design_url;
  const priority = idea.priority || "normal";
  const text = idea.idea_text || "Untitled idea";

  return (
    <Card
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="p-3 cursor-grab active:cursor-grabbing hover:shadow-md transition-shadow border-border"
      onClick={(e) => {
        // Don't open sheet if dragging
        if (!isDragging) onClick();
      }}
    >
      <div className="flex items-start gap-2">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate text-foreground">{text.length > 60 ? text.slice(0, 60) + "…" : text}</p>
          <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
            {score != null && (
              <Badge variant={viabilityColor(score)} className="text-[10px] px-1.5 py-0">
                {score}/10
              </Badge>
            )}
            {priority !== "normal" && priorityDot[priority] && (
              <span className={`inline-block w-2 h-2 rounded-full ${priorityDot[priority]}`} title={priority} />
            )}
            <span className="text-[10px] text-muted-foreground">
              {idea.created_at ? formatDistanceToNow(new Date(idea.created_at), { addSuffix: true }) : ""}
            </span>
          </div>
        </div>
        {thumb && (
          <img src={thumb} alt="" className="w-10 h-10 rounded object-cover flex-shrink-0" />
        )}
      </div>
    </Card>
  );
}
