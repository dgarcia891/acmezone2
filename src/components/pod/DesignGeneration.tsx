import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ThumbsDown, Check, RefreshCw, ImageIcon, Loader2, ChevronDown, ChevronUp, XCircle } from "lucide-react";
import DesignGallery from "@/components/pod/DesignGallery";
import type { DesignVersion } from "@/hooks/usePodPipeline";

interface Props {
  idea: any;
  productType: string;
  onReject: () => void;
  onApprove: () => void;
  onRegenerate: (type: "sticker" | "tshirt", customPrompt?: string) => void;
  onGenerate?: () => void;
  onCancel?: (type: "sticker" | "tshirt") => void;
  onDropDesign?: (type: "sticker" | "tshirt") => void;
  loadingTypes: Set<string>;
  isApproving: boolean;
  versions?: DesignVersion[];
  onSelectVersion?: (versionId: string, productType: string) => void;
  onDeleteVersion?: (versionId: string) => void;
  isSelectingVersion?: boolean;
  isDeletingVersion?: boolean;
}

const statusMessages = [
  "Sending prompt to AI model…",
  "Generating your design…",
  "Rendering artwork…",
  "Applying finishing touches…",
  "Uploading to storage…",
  "Almost there…",
];

function ElapsedTimer() {
  const [seconds, setSeconds] = useState(0);
  useEffect(() => {
    const interval = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(interval);
  }, []);
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return (
    <span className="text-xs text-muted-foreground tabular-nums">
      {mins}:{secs.toString().padStart(2, "0")}
    </span>
  );
}

function LoadingSpinner({ onCancel }: { onCancel?: () => void }) {
  const [msgIndex, setMsgIndex] = useState(0);
  useEffect(() => {
    const interval = setInterval(() => {
      setMsgIndex((i) => (i + 1) % statusMessages.length);
    }, 4000);
    return () => clearInterval(interval);
  }, []);
  return (
    <div className="aspect-square w-full rounded-lg bg-muted flex flex-col items-center justify-center gap-3">
      <Loader2 className="h-10 w-10 text-primary animate-spin" />
      <p className="text-sm text-muted-foreground animate-pulse">{statusMessages[msgIndex]}</p>
      <ElapsedTimer />
      {onCancel && (
        <Button variant="ghost" size="sm" onClick={onCancel} className="text-xs text-destructive hover:text-destructive mt-1">
          <XCircle className="h-3.5 w-3.5 mr-1" /> Cancel
        </Button>
      )}
    </div>
  );
}

function DesignCard({ label, url, prompt, onRegenerate, isLoading, onCancel, onDrop, canDrop, versions, productType, onSelectVersion, onDeleteVersion, isSelectingVersion, isDeletingVersion }: {
  label: string; url?: string | null; prompt?: string; onRegenerate: (customPrompt?: string) => void; isLoading: boolean;
  onCancel?: () => void;
  onDrop?: () => void;
  canDrop?: boolean;
  versions?: DesignVersion[]; productType: "sticker" | "tshirt";
  onSelectVersion?: (versionId: string, productType: string) => void;
  onDeleteVersion?: (versionId: string) => void;
  isSelectingVersion?: boolean; isDeletingVersion?: boolean;
}) {
  const [editedPrompt, setEditedPrompt] = useState(prompt || "");
  const [showPrompt, setShowPrompt] = useState(false);

  useEffect(() => {
    if (prompt) setEditedPrompt(prompt);
  }, [prompt]);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base">{label}</CardTitle>
        {canDrop && onDrop && !isLoading && (
          <Button variant="ghost" size="sm" onClick={onDrop} className="text-xs text-destructive hover:text-destructive h-7 px-2">
            <XCircle className="h-3.5 w-3.5 mr-1" /> Drop
          </Button>
        )}
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <LoadingSpinner onCancel={onCancel} />
        ) : url ? (
          <img src={url} alt={label} className="rounded-lg object-contain w-full aspect-square bg-muted" />
        ) : (
          <div className="aspect-square w-full rounded-lg bg-muted flex flex-col items-center justify-center gap-2">
            <ImageIcon className="h-12 w-12 text-muted-foreground" />
            <p className="text-sm text-muted-foreground text-center px-4">
              No design yet — use Regenerate below to generate one
            </p>
          </div>
        )}

        {/* Feedback & regeneration controls */}
        <div className="mt-4 space-y-3">
          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground">Want changes? Describe what to adjust:</label>
            <Textarea
              value={editedPrompt}
              onChange={(e) => setEditedPrompt(e.target.value)}
              className="text-xs min-h-[80px] resize-y"
              placeholder="e.g. Make the text bigger, change colors to blue and gold, add more detail to the background…"
            />
          </div>
          <Button variant="outline" size="sm" onClick={() => onRegenerate(editedPrompt !== prompt ? editedPrompt : undefined)} disabled={isLoading}>
            <RefreshCw className="h-3 w-3 mr-1" />
            Regenerate{editedPrompt !== prompt ? " with changes" : ""}
          </Button>
        </div>

        {versions && onSelectVersion && onDeleteVersion && (
          <DesignGallery
            versions={versions}
            productType={productType}
            onSelect={(versionId) => onSelectVersion(versionId, productType)}
            onDelete={onDeleteVersion}
            isSelecting={isSelectingVersion || false}
            isDeleting={isDeletingVersion || false}
          />
        )}
      </CardContent>
    </Card>
  );
}

export default function DesignGeneration({ idea, productType, onReject, onApprove, onRegenerate, onCancel, onDropDesign, loadingTypes, isApproving, versions, onSelectVersion, onDeleteVersion, isSelectingVersion, isDeletingVersion }: Props) {
  const anyLoading = loadingTypes.size > 0;
  const canDrop = productType === "both";
  const disabled = anyLoading || isApproving;
  const hasAnyDesign = idea?.sticker_design_url || idea?.tshirt_design_url;

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-xl font-semibold">Generate & Refine Designs</h2>
        <p className="text-sm text-muted-foreground">
          Review your designs below. Use the feedback box to request changes and regenerate until you're happy, then approve.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {(productType === "both" || productType === "sticker") && (
          <DesignCard
            key={`sticker-${idea?.sticker_design_url || "none"}`}
            label="Sticker Design" url={idea?.sticker_design_url} prompt={idea?.sticker_design_prompt}
            onRegenerate={(cp) => onRegenerate("sticker", cp)} isLoading={loadingTypes.has("sticker")}
            onCancel={onCancel ? () => onCancel("sticker") : undefined}
            onDrop={onDropDesign ? () => onDropDesign("sticker") : undefined}
            canDrop={canDrop}
            versions={versions} productType="sticker" onSelectVersion={onSelectVersion} onDeleteVersion={onDeleteVersion} isSelectingVersion={isSelectingVersion} isDeletingVersion={isDeletingVersion} />
        )}
        {(productType === "both" || productType === "tshirt") && (
          <DesignCard
            key={`tshirt-${idea?.tshirt_design_url || "none"}`}
            label="T-Shirt Design" url={idea?.tshirt_design_url} prompt={idea?.tshirt_design_prompt}
            onRegenerate={(cp) => onRegenerate("tshirt", cp)} isLoading={loadingTypes.has("tshirt")}
            onCancel={onCancel ? () => onCancel("tshirt") : undefined}
            onDrop={onDropDesign ? () => onDropDesign("tshirt") : undefined}
            canDrop={canDrop}
            versions={versions} productType="tshirt" onSelectVersion={onSelectVersion} onDeleteVersion={onDeleteVersion} isSelectingVersion={isSelectingVersion} isDeletingVersion={isDeletingVersion} />
        )}
      </div>

      <div className="flex justify-end gap-3">
        <Button variant="outline" onClick={onReject} disabled={disabled}>
          <ThumbsDown className="h-4 w-4 mr-2" /> Reject Idea
        </Button>
        <Button onClick={onApprove} disabled={disabled || !hasAnyDesign} className="bg-primary hover:bg-primary/90">
          <Check className="h-4 w-4 mr-2" /> Approve Designs
        </Button>
      </div>
    </div>
  );
}
