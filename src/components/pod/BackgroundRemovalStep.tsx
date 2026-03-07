import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Eraser, Send, ThumbsDown, Loader2, CheckCircle2, ArrowRight } from "lucide-react";
import { AspectRatio } from "@/components/ui/aspect-ratio";

interface Props {
  idea: any;
  productType: string;
  onRemoveBg: () => void;
  onApprove: () => void;
  onReject: () => void;
  onBack: () => void;
  isRemoving: boolean;
  isApproving: boolean;
  bgRemoved: boolean;
}

function DesignPreview({ label, url, checkerboard }: { label: string; url?: string | null; checkerboard?: boolean }) {
  if (!url) return null;
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{label}</CardTitle>
      </CardHeader>
      <CardContent>
        <AspectRatio ratio={1}>
          <div className={`w-full h-full rounded-lg overflow-hidden ${checkerboard ? "bg-[length:20px_20px]" : "bg-muted"}`}
            style={checkerboard ? {
              backgroundImage: "linear-gradient(45deg, hsl(var(--muted)) 25%, transparent 25%), linear-gradient(-45deg, hsl(var(--muted)) 25%, transparent 25%), linear-gradient(45deg, transparent 75%, hsl(var(--muted)) 75%), linear-gradient(-45deg, transparent 75%, hsl(var(--muted)) 75%)",
              backgroundSize: "20px 20px",
              backgroundPosition: "0 0, 0 10px, 10px -10px, -10px 0px",
              backgroundColor: "white",
            } : undefined}
          >
            <img src={url} alt={label} className="w-full h-full object-contain" />
          </div>
        </AspectRatio>
      </CardContent>
    </Card>
  );
}

export default function BackgroundRemovalStep({ idea, productType, onRemoveBg, onApprove, onReject, onBack, isRemoving, isApproving, bgRemoved }: Props) {
  const hasSticker = (productType === "both" || productType === "sticker") && idea?.sticker_design_url;
  const hasTshirt = (productType === "both" || productType === "tshirt") && idea?.tshirt_design_url;

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-xl font-semibold">Background Removal</h2>
        <p className="text-sm text-muted-foreground">
          {bgRemoved
            ? "Background removed successfully! Review the transparent designs below before approving."
            : "Review your raw designs below, then remove the backgrounds to create transparent production-ready PNGs."}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {hasSticker && (
          <DesignPreview label={bgRemoved ? "Sticker (Transparent)" : "Sticker (Raw)"} url={idea.sticker_design_url} checkerboard={bgRemoved} />
        )}
        {hasTshirt && (
          <DesignPreview label={bgRemoved ? "T-Shirt (Transparent)" : "T-Shirt (Raw)"} url={idea.tshirt_design_url} checkerboard={bgRemoved} />
        )}
      </div>

      <div className="flex justify-between gap-3">
        <div className="flex gap-3">
          <Button variant="outline" onClick={onBack} disabled={isRemoving || isApproving}>
            Back to Generate
          </Button>
          <Button variant="outline" onClick={onReject} disabled={isRemoving || isApproving}>
            <ThumbsDown className="h-4 w-4 mr-2" /> Reject
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
