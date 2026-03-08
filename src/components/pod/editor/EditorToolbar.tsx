import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";
import { Crop, Pencil, Eraser, Type, SlidersHorizontal, RotateCw, RotateCcw, Undo2, Redo2, Move } from "lucide-react";

export type EditorTool = "select" | "crop" | "draw" | "eraser" | "text" | "adjust" | "rotate";

interface Props {
  activeTool: EditorTool;
  onToolChange: (tool: EditorTool) => void;
  onRotateCW: () => void;
  onRotateCCW: () => void;
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
}

const tools: { id: EditorTool; label: string; icon: React.ElementType }[] = [
  { id: "select", label: "Select / Pan", icon: Move },
  { id: "crop", label: "Crop", icon: Crop },
  { id: "draw", label: "Draw", icon: Pencil },
  { id: "eraser", label: "Eraser", icon: Eraser },
  { id: "text", label: "Add Text", icon: Type },
  { id: "adjust", label: "Adjustments", icon: SlidersHorizontal },
];

export default function EditorToolbar({ activeTool, onToolChange, onRotateCW, onRotateCCW, onUndo, onRedo, canUndo, canRedo }: Props) {
  return (
    <TooltipProvider delayDuration={200}>
      <div className="flex items-center gap-1 flex-wrap">
        {tools.map(({ id, label, icon: Icon }) => (
          <Tooltip key={id}>
            <TooltipTrigger asChild>
              <Button
                variant={activeTool === id ? "default" : "ghost"}
                size="icon"
                className="h-9 w-9"
                onClick={() => onToolChange(id)}
                aria-label={label}
              >
                <Icon className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="text-xs">{label}</TooltipContent>
          </Tooltip>
        ))}

        <div className="w-px h-6 bg-border mx-1" />

        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" className="h-9 w-9" onClick={onRotateCCW} aria-label="Rotate left">
              <RotateCcw className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="text-xs">Rotate Left 90°</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" className="h-9 w-9" onClick={onRotateCW} aria-label="Rotate right">
              <RotateCw className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="text-xs">Rotate Right 90°</TooltipContent>
        </Tooltip>

        <div className="w-px h-6 bg-border mx-1" />

        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" className="h-9 w-9" onClick={onUndo} disabled={!canUndo} aria-label="Undo">
              <Undo2 className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="text-xs">Undo</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" className="h-9 w-9" onClick={onRedo} disabled={!canRedo} aria-label="Redo">
              <Redo2 className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="text-xs">Redo</TooltipContent>
        </Tooltip>
      </div>
    </TooltipProvider>
  );
}
