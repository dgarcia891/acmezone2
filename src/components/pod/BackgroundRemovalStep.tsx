import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Eraser, Send, ThumbsDown, Loader2, XCircle } from "lucide-react";
import { AspectRatio } from "@/components/ui/aspect-ratio";

interface Props {
  idea: any;
  productType: string;
  onRemoveBg: () => void;
  onApprove: () => void;
  onReject: () => void;
  onBack: () => void;
  onDropDesign?: (type: "sticker" | "tshirt") => void;
  isRemoving: boolean;
  isApproving: boolean;
  bgRemoved: boolean;
}

const checkerboardStyle = {
  backgroundImage:
    "linear-gradient(45deg, hsl(var(--muted)) 25%, transparent 25%), linear-gradient(-45deg, hsl(var(--muted)) 25%, transparent 25%), linear-gradient(45deg, transparent 75%, hsl(var(--muted)) 75%), linear-gradient(-45deg, transparent 75%, hsl(var(--muted)) 75%)",
  backgroundSize: "20px 20px",
  backgroundPosition: "0 0, 0 10px, 10px -10px, -10px 0px",
  backgroundColor: "white",
};

function DesignPreview({ label, url, checkerboard }: { label: string; url?: string | null; checkerboard?: boolean }) {
  if (!url) return null;
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{label}</CardTitle>
      </CardHeader>
      <CardContent>
        <AspectRatio ratio={1}>
          <div
            className={`w-full h-full rounded-lg overflow-hidden ${checkerboard ? "bg-[length:20px_20px]" : "bg-muted"}`}
            style={checkerboard ? checkerboardStyle : undefined}
          >
            <img src={url} alt={label} className="w-full h-full object-contain" />
          </div>
        </AspectRatio>
      </CardContent>
    </Card>
  );
}

function BeforeAfterComparison({ type, rawUrl, transparentUrl, canDrop, onDrop }: {
  type: string; rawUrl?: string | null; transparentUrl?: string | null;
  canDrop?: boolean; onDrop?: () => void;
}) {
  if (!rawUrl && !transparentUrl) return null;
  const label = type === "sticker" ? "Sticker" : "T-Shirt";
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">{label}</h3>
        {canDrop && onDrop && (
          <Button variant="ghost" size="sm" onClick={onDrop} className="text-xs text-destructive hover:text-destructive h-7 px-2">
            <XCircle className="h-3.5 w-3.5 mr-1" /> Drop {label}
          </Button>
        )}
      </div>
      <div className="grid grid-cols-2 gap-4">
        <DesignPreview label="Before (Raw)" url={rawUrl} />
        <DesignPreview label="After (Transparent)" url={transparentUrl} checkerboard />
      </div>
    </div>
  );
}

export default function BackgroundRemovalStep({ idea, productType, onRemoveBg, onApprove, onReject, onBack, onDropDesign, isRemoving, isApproving, bgRemoved }: Props) {
  const hasSticker = (productType === "both" || productType === "sticker") && idea?.sticker_design_url;
  const hasTshirt = (productType === "both" || productType === "tshirt") && idea?.tshirt_design_url;
  const canDrop = productType === "both";

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-xl font-semibold">Background Removal</h2>
        <p className="text-sm text-muted-foreground">
          {bgRemoved
            ? "Background removed successfully! Compare the before & after below, then approve to generate listings."
            : "Review your raw designs below, then remove the backgrounds to create transparent production-ready PNGs."}
        </p>
      </div>

      {bgRemoved ? (
        <div className="space-y-6">
          {hasSticker && (
            <BeforeAfterComparison
              type="sticker"
              rawUrl={idea.sticker_raw_url}
              transparentUrl={idea.sticker_design_url}
              canDrop={canDrop}
              onDrop={onDropDesign ? () => onDropDesign("sticker") : undefined}
            />
          )}
          {hasTshirt && (
            <BeforeAfterComparison
              type="tshirt"
              rawUrl={idea.tshirt_raw_url}
              transparentUrl={idea.tshirt_design_url}
              canDrop={canDrop}
              onDrop={onDropDesign ? () => onDropDesign("tshirt") : undefined}
            />
          )}
        </div>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {hasSticker && (
              <div className="relative">
                <DesignPreview label="Sticker (Raw)" url={idea.sticker_design_url} />
                {canDrop && onDropDesign && (
                  <Button variant="ghost" size="sm" onClick={() => onDropDesign("sticker")}
                    className="absolute top-2 right-2 text-xs text-destructive hover:text-destructive h-7 px-2">
                    <XCircle className="h-3.5 w-3.5 mr-1" /> Drop
                  </Button>
                )}
              </div>
            )}
            {hasTshirt && (
              <div className="relative">
                <DesignPreview label="T-Shirt (Raw)" url={idea.tshirt_design_url} />
                {canDrop && onDropDesign && (
                  <Button variant="ghost" size="sm" onClick={() => onDropDesign("tshirt")}
                    className="absolute top-2 right-2 text-xs text-destructive hover:text-destructive h-7 px-2">
                    <XCircle className="h-3.5 w-3.5 mr-1" /> Drop
                  </Button>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      <div className="flex justify-between gap-3">
        <div className="flex gap-3">
          <Button variant="outline" onClick={onBack} disabled={isRemoving || isApproving}>
            Back to Generate
          </Button>
          <Button variant="outline" onClick={onReject} disabled={isRemoving || isApproving}>
            <ThumbsDown className="h-4 w-4 mr-2" /> Reject Idea
          </Button>
        </div>
        <div className="flex gap-3">
          {!bgRemoved ? (
            <Button onClick={onRemoveBg} disabled={isRemoving} className="bg-primary hover:bg-primary/90">
              {isRemoving ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Removing Background…</>
              ) : (
                <><Eraser className="h-4 w-4 mr-2" /> Remove Background</>
              )}
            </Button>
          ) : (
            <Button onClick={onApprove} disabled={isApproving} className="bg-primary hover:bg-primary/90">
              {isApproving ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Generating Listings…</>
              ) : (
                <><Send className="h-4 w-4 mr-2" /> Approve &amp; Generate Listings</>
              )}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
