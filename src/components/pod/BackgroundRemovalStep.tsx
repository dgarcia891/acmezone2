import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Send, ThumbsDown, Loader2, XCircle, ArrowLeft } from "lucide-react";
import { AspectRatio } from "@/components/ui/aspect-ratio";

interface Props {
  idea: any;
  productType: string;
  onApprove: () => void;
  onReject: () => void;
  onBack: () => void;
  onDropDesign?: (type: "sticker" | "tshirt") => void;
  isApproving: boolean;
  isBgRemoving?: boolean;
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

export default function BackgroundRemovalStep({ idea, productType, onApprove, onReject, onBack, onDropDesign, isApproving, isBgRemoving }: Props) {
  const hasSticker = (productType === "both" || productType === "sticker") && idea?.sticker_design_url;
  const hasTshirt = (productType === "both" || productType === "tshirt") && idea?.tshirt_design_url;
  const canDrop = productType === "both";
  const processing = isBgRemoving || false;

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-xl font-semibold">Review Designs</h2>
        <p className="text-sm text-muted-foreground">
          {processing
            ? "Removing backgrounds… please wait."
            : "Background removed successfully! Compare the before & after below, then approve to generate listings."}
        </p>
      </div>

      {processing ? (
        <div className="flex flex-col items-center justify-center gap-3 py-12">
          <Loader2 className="h-10 w-10 text-primary animate-spin" />
          <p className="text-sm text-muted-foreground">Processing background removal…</p>
        </div>
      ) : (
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
      )}

      <div className="flex justify-between gap-3">
        <div className="flex gap-3">
          <Button variant="outline" onClick={onBack} disabled={isApproving || processing}>
            <ArrowLeft className="h-4 w-4 mr-2" /> Back to Generate
          </Button>
          <Button variant="outline" onClick={onReject} disabled={isApproving || processing}>
            <ThumbsDown className="h-4 w-4 mr-2" /> Reject Idea
          </Button>
        </div>
        <Button onClick={onApprove} disabled={isApproving || processing} className="bg-primary hover:bg-primary/90">
          {isApproving ? (
            <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Generating Listings…</>
          ) : (
            <><Send className="h-4 w-4 mr-2" /> Approve &amp; Generate Listings</>
          )}
        </Button>
      </div>
    </div>
  );
}
