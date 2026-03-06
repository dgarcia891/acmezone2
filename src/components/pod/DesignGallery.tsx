import { useState } from "react";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Star, Trash2 } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import type { DesignVersion } from "@/hooks/usePodPipeline";

interface Props {
  versions: DesignVersion[];
  productType: "sticker" | "tshirt";
  onSelect: (versionId: string) => void;
  onDelete: (versionId: string) => void;
  isSelecting: boolean;
  isDeleting: boolean;
}

export default function DesignGallery({ versions, productType, onSelect, onDelete, isSelecting, isDeleting }: Props) {
  const filtered = versions.filter((v) => v.product_type === productType);
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  if (filtered.length < 2) return null;

  return (
    <div className="mt-3">
      <p className="text-xs text-muted-foreground mb-2">
        Version history ({filtered.length})
      </p>
      <ScrollArea className="w-full whitespace-nowrap">
        <div className="flex gap-2 pb-2">
          {filtered.map((v) => (
            <TooltipProvider key={v.id} delayDuration={300}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div
                    className={`relative shrink-0 w-24 h-24 rounded-lg overflow-hidden border-2 cursor-pointer transition-all ${
                      v.is_selected
                        ? "border-primary ring-2 ring-primary/30"
                        : "border-border hover:border-primary/50"
                    }`}
                    onMouseEnter={() => setHoveredId(v.id)}
                    onMouseLeave={() => setHoveredId(null)}
                    onClick={() => !v.is_selected && onSelect(v.id)}
                  >
                    <img
                      src={v.image_url}
                      alt={`v${v.version_number}`}
                      className="w-full h-full object-cover"
                    />
                    <Badge
                      variant={v.is_selected ? "default" : "secondary"}
                      className="absolute top-1 left-1 text-[10px] px-1.5 py-0"
                    >
                      v{v.version_number}
                    </Badge>
                    {v.is_selected && (
                      <Star className="absolute top-1 right-1 h-3.5 w-3.5 text-primary fill-primary" />
                    )}
                    {hoveredId === v.id && !v.is_selected && (
                      <div className="absolute inset-0 bg-black/50 flex items-center justify-center gap-1.5">
                        <Button
                          variant="secondary"
                          size="icon"
                          className="h-7 w-7"
                          disabled={isSelecting}
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelect(v.id);
                          }}
                        >
                          <Star className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="destructive"
                          size="icon"
                          className="h-7 w-7"
                          disabled={isDeleting}
                          onClick={(e) => {
                            e.stopPropagation();
                            onDelete(v.id);
                          }}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    )}
                  </div>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="max-w-xs">
                  <p className="text-xs">
                    {v.is_selected ? "Currently selected" : "Click to select"} — v{v.version_number}
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          ))}
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
    </div>
  );
}
