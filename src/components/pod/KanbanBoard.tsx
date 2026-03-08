import { useState, useMemo } from "react";
import { DndContext, DragEndEvent, PointerSensor, useSensor, useSensors, DragOverlay, closestCenter } from "@dnd-kit/core";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { ChevronDown, ChevronRight } from "lucide-react";
import KanbanColumn, { type ColumnDef } from "./KanbanColumn";
import KanbanCard from "./KanbanCard";
import { usePodIdeas } from "@/hooks/usePodPipeline";
import { useUpdateIdeaStatus } from "@/hooks/usePodKanban";

const COLUMNS: ColumnDef[] = [
  { status: "pending", label: "New", emoji: "📥" },
  { status: "designing", label: "Designing", emoji: "🎨" },
  { status: "listings", label: "Listings", emoji: "📝" },
  { status: "ready", label: "Ready", emoji: "✅" },
  { status: "production", label: "Production", emoji: "📦" },
  { status: "live", label: "Live", emoji: "🚀" },
];

interface Props {
  onCardClick: (idea: any) => void;
}

export default function KanbanBoard({ onCardClick }: Props) {
  const { data: ideas = [] } = usePodIdeas();
  const updateStatus = useUpdateIdeaStatus();
  const [rejectedOpen, setRejectedOpen] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [collapsedColumns, setCollapsedColumns] = useState<Record<string, boolean>>({});

  const toggleCollapse = (status: string) => {
    setCollapsedColumns((prev) => ({ ...prev, [status]: !prev[status] }));
  };

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  const groupedIdeas = useMemo(() => {
    const map: Record<string, any[]> = {};
    COLUMNS.forEach((c) => (map[c.status] = []));
    map["rejected"] = [];
    const statusMap: Record<string, string> = {
      "analyzed": "designing",
      "designs_generated": "designing",
      "bg_removed": "ready",
      "approved": "ready",
      "qc": "ready",
    };
    ideas.forEach((idea: any) => {
      const s = idea.status || "pending";
      const mappedStatus = statusMap[s] || s;
      if (!map[mappedStatus]) map[mappedStatus] = [];
      map[mappedStatus].push(idea);
    });
    return map;
  }, [ideas]);

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveId(null);
    const { active, over } = event;
    if (!over) return;
    const ideaId = active.id as string;
    const newStatus = over.id as string;
    const idea = ideas.find((i: any) => i.id === ideaId);
    if (!idea || idea.status === newStatus) return;
    updateStatus.mutate({ id: ideaId, status: newStatus });
  };

  const activeIdea = activeId ? ideas.find((i: any) => i.id === activeId) : null;
  const rejectedIdeas = groupedIdeas["rejected"] || [];

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={(e) => setActiveId(e.active.id as string)}
      onDragEnd={handleDragEnd}
    >
      <ScrollArea className="w-full">
        <div className="flex gap-3 pb-4 min-w-max">
          {COLUMNS.map((col) => (
            <KanbanColumn
              key={col.status}
              column={col}
              ideas={groupedIdeas[col.status] || []}
              onCardClick={onCardClick}
              collapsed={!!collapsedColumns[col.status]}
              onToggleCollapse={() => toggleCollapse(col.status)}
            />
          ))}
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>

      <DragOverlay>
        {activeIdea ? (
          <div className="w-[260px]">
            <KanbanCard idea={activeIdea} onClick={() => {}} />
          </div>
        ) : null}
      </DragOverlay>

      {/* Rejected section */}
      {rejectedIdeas.length > 0 && (
        <div className="mt-4 border border-border rounded-lg">
          <button
            className="flex items-center gap-2 w-full px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground"
            onClick={() => setRejectedOpen(!rejectedOpen)}
          >
            {rejectedOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            ❌ Rejected
            <Badge variant="secondary" className="text-[10px] px-1.5">{rejectedIdeas.length}</Badge>
          </button>
          {rejectedOpen && (
            <div className="px-3 pb-3 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
              {rejectedIdeas.map((idea: any) => (
                <KanbanCard key={idea.id} idea={idea} onClick={() => onCardClick(idea)} />
              ))}
            </div>
          )}
        </div>
      )}
    </DndContext>
  );
}
