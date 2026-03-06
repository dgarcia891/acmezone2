import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ThumbsDown, Send, RefreshCw, ImageIcon, Loader2, ChevronDown, ChevronUp } from "lucide-react";

interface Props {
  idea: any;
  productType: string;
  onReject: () => void;
  onApprove: () => void;
  onRegenerate: (type: "sticker" | "tshirt", customPrompt?: string) => void;
  isLoading: boolean;
  isApproving: boolean;
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

function LoadingSpinner() {
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
    </div>
  );
}

function DesignCard({ label, url, prompt, onRegenerate, isLoading }: {
  label: string; url?: string | null; prompt?: string; onRegenerate: (customPrompt?: string) => void; isLoading: boolean;
}) {
  const [editedPrompt, setEditedPrompt] = useState(prompt || "");
  const [showPrompt, setShowPrompt] = useState(false);

  useEffect(() => {
    if (prompt) setEditedPrompt(prompt);
  }, [prompt]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{label}</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <LoadingSpinner />
        ) : url ? (
          <img src={url} alt={label} className="rounded-lg object-contain w-full aspect-square bg-muted" />
        ) : (
          <div className="aspect-square w-full rounded-lg bg-muted flex flex-col items-center justify-center gap-2">
            <ImageIcon className="h-12 w-12 text-muted-foreground" />
            <p className="text-sm text-muted-foreground text-center px-4">
              Image generation failed — design prompt saved for manual generation
            </p>
          </div>
        )}
        <div className="mt-3 space-y-2">
          <Button variant="ghost" size="sm" className="text-xs px-0" onClick={() => setShowPrompt(!showPrompt)}>
            {showPrompt ? <ChevronUp className="h-3 w-3 mr-1" /> : <ChevronDown className="h-3 w-3 mr-1" />}
            {showPrompt ? "Hide prompt" : "Edit prompt"}
          </Button>
          {showPrompt && (
            <Textarea value={editedPrompt} onChange={(e) => setEditedPrompt(e.target.value)} className="text-xs min-h-[80px] resize-y" placeholder="Describe what you want the design to look like…" />
          )}
        </div>
        <Button variant="outline" size="sm" className="mt-2" onClick={() => onRegenerate(editedPrompt !== prompt ? editedPrompt : undefined)} disabled={isLoading}>
          <RefreshCw className="h-3 w-3 mr-1" />
          Regenerate{editedPrompt !== prompt ? " with edits" : ""}
        </Button>
      </CardContent>
    </Card>
  );
}

export default function DesignGeneration({ idea, productType, onReject, onApprove, onRegenerate, isLoading, isApproving }: Props) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {(productType === "both" || productType === "sticker") && (
          <DesignCard label="Sticker Design" url={idea?.sticker_design_url} prompt={idea?.sticker_design_prompt} onRegenerate={(cp) => onRegenerate("sticker", cp)} isLoading={isLoading} />
        )}
        {(productType === "both" || productType === "tshirt") && (
          <DesignCard label="T-Shirt Design" url={idea?.tshirt_design_url} prompt={idea?.tshirt_design_prompt} onRegenerate={(cp) => onRegenerate("tshirt", cp)} isLoading={isLoading} />
        )}
      </div>
      <div className="flex justify-end gap-3">
        <Button variant="outline" onClick={onReject} disabled={isLoading || isApproving}>
          <ThumbsDown className="h-4 w-4 mr-2" /> Reject
        </Button>
        <Button onClick={onApprove} disabled={isLoading || isApproving} className="bg-green-600 hover:bg-green-700">
          <Send className="h-4 w-4 mr-2" /> Approve & Send to Trello
        </Button>
      </div>
    </div>
  );
}
