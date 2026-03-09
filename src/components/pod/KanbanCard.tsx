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
  const priority = idea.priority || "normal";
  const text = idea.idea_text || "Untitled idea";

  // Collect all available images for preview
  const images = [idea.sticker_design_url, idea.tshirt_design_url, idea.image_url].filter(Boolean) as string[];

  return (
    <Card
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      role="button"
      tabIndex={0}
      aria-label={`Idea: ${text.length > 60 ? text.slice(0, 60) + "…" : text}. Priority: ${priority}${score != null ? `. Viability: ${score}/10` : ""}`}
      className="p-2 cursor-grab active:cursor-grabbing hover:shadow-md transition-shadow border-border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      onClick={(e) => {
        if (!isDragging) onClick();
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          if (!isDragging) onClick();
        }
      }}
    >
      {images.length > 0 && (
        <div className={`mb-2 gap-1 ${images.length === 1 ? "flex" : "grid grid-cols-2"}`}>
          {images.slice(0, 4).map((url, i) => (
            <img
              key={i}
              src={url}
              alt={`Design preview ${i + 1} for ${text.length > 30 ? text.slice(0, 30) + "…" : text}`}
              className={`rounded object-cover w-full ${images.length === 1 ? "h-24" : "h-16"}`}
              loading="lazy"
            />
          ))}
        </div>
      )}
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
    </Card>
  );
}
