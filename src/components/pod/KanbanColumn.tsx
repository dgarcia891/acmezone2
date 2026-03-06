import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
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
}

export default function KanbanColumn({ column, ideas, onCardClick }: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id: column.status });

  return (
    <div
      className={`flex flex-col w-[280px] min-w-[280px] rounded-lg border border-border bg-muted/30 min-h-[calc(100vh-280px)] ${isOver ? "ring-2 ring-primary/40" : ""}`}
    >
      <div className="flex items-center gap-2 px-3 py-2.5 border-b border-border">
        <span className="text-base">{column.emoji}</span>
        <span className="text-sm font-semibold text-foreground">{column.label}</span>
        <Badge variant="secondary" className="ml-auto text-[10px] px-1.5">
          {ideas.length}
        </Badge>
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
