import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ChevronsLeft, ChevronsRight } from "lucide-react";
import KanbanCard from "./KanbanCard";

export interface ColumnDef {
  status: string;
  label: string;
  emoji: string;
}

interface KanbanColumnProps {
  column: ColumnDef;
  ideas: any[];
  onCardClick: (idea: any) => void;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
}

export default function KanbanColumn({ column, ideas, onCardClick, collapsed, onToggleCollapse }: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id: column.status });

  if (collapsed) {
    return (
      <div
        ref={setNodeRef}
        role="button"
        tabIndex={0}
        aria-label={`Expand ${column.label} column (${ideas.length} items)`}
        onClick={onToggleCollapse}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onToggleCollapse?.();
          }
        }}
        className={`flex flex-col items-center w-[40px] min-w-[40px] rounded-lg border border-border bg-muted/30 min-h-[calc(100vh-280px)] cursor-pointer hover:bg-muted/60 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${isOver ? "ring-2 ring-primary/40" : ""}`}
      >
        <div className="flex flex-col items-center gap-1 py-3">
          <span className="text-base" aria-hidden="true">{column.emoji}</span>
          <Badge variant="secondary" className="text-[10px] px-1.5">{ideas.length}</Badge>
        </div>
        <span
          className="text-xs font-semibold text-muted-foreground mt-2"
          style={{ writingMode: "vertical-rl", textOrientation: "mixed" }}
          aria-hidden="true"
        >
          {column.label}
        </span>
      </div>
    );
  }

  return (
    <div
      className={`flex flex-col flex-1 min-w-[220px] rounded-lg border border-border bg-muted/30 min-h-[calc(100vh-280px)] ${isOver ? "ring-2 ring-primary/40" : ""}`}
    >
      <div className="flex items-center gap-2 px-3 py-2.5 border-b border-border">
        <span className="text-base">{column.emoji}</span>
        <span className="text-sm font-semibold text-foreground">{column.label}</span>
        <Badge variant="secondary" className="ml-auto text-[10px] px-1.5">
          {ideas.length}
        </Badge>
        {onToggleCollapse && (
          <button
            onClick={(e) => { e.stopPropagation(); onToggleCollapse(); }}
            className="p-0.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
            aria-label={`Collapse ${column.label} column`}
          >
            <ChevronsLeft className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
      <ScrollArea className="flex-1 max-h-[calc(100vh-240px)]">
        <div ref={setNodeRef} className="p-2 space-y-2 min-h-[60px]">
          <SortableContext items={ideas.map((i) => i.id)} strategy={verticalListSortingStrategy}>
            {ideas.map((idea) => (
              <KanbanCard key={idea.id} idea={idea} onClick={() => onCardClick(idea)} />
            ))}
          </SortableContext>
        </div>
      </ScrollArea>
    </div>
  );
}
