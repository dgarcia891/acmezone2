import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ExternalLink, CheckCircle2, Loader2, ArrowLeft } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useSendToPrintify } from "@/hooks/usePodListings";
import { useUpdateIdeaStatus } from "@/hooks/usePodKanban";

interface Props {
  idea: any;
  onClose: () => void;
  onIdeaUpdated?: (updated: Partial<any>) => void;
}

const STATUS_LABELS: Record<string, { label: string; emoji: string }> = {
  ready: { label: "Ready", emoji: "✅" },
  production: { label: "Production", emoji: "📦" },
  live: { label: "Live", emoji: "🚀" },
};

export default function WizardSummaryStep({ idea, onClose, onIdeaUpdated }: Props) {
  const sendToPrintify = useSendToPrintify();
  const updateStatus = useUpdateIdeaStatus();

  const statusInfo = STATUS_LABELS[idea?.status] || { label: idea?.status, emoji: "" };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Idea Summary</CardTitle>
            <Badge variant="outline" className="text-sm">
              {statusInfo.emoji} {statusInfo.label}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Idea text */}
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-1">Idea</p>
            <p className="text-sm">{idea?.idea_text || "Untitled idea"}</p>
          </div>

          {/* Designs */}
          {(idea?.sticker_design_url || idea?.tshirt_design_url) && (
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-2">Designs</p>
              <div className="grid grid-cols-2 gap-3">
                {idea?.sticker_design_url && (
                  <div>
                    <p className="text-[10px] text-muted-foreground mb-1">Sticker</p>
                    <img src={idea.sticker_design_url} alt="Sticker" className="w-full rounded border border-border bg-muted aspect-square object-contain" />
                  </div>
                )}
                {idea?.tshirt_design_url && (
                  <div>
                    <p className="text-[10px] text-muted-foreground mb-1">T-Shirt</p>
                    <img src={idea.tshirt_design_url} alt="T-Shirt" className="w-full rounded border border-border bg-muted aspect-square object-contain" />
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Live status */}
          {idea?.status === "live" && (
            <div className="flex items-center gap-2 text-green-600">
              <CheckCircle2 className="h-5 w-5" />
              <span className="text-sm font-medium">Product is live!</span>
            </div>
          )}

          {/* Links */}
          <div className="space-y-2">
            {idea?.printify_product_url && (
              <a href={idea.printify_product_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-sm text-primary hover:underline">
                <ExternalLink className="h-3.5 w-3.5" /> View on Printify
              </a>
            )}
            {idea?.listing_url && (
              <a href={idea.listing_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-sm text-primary hover:underline">
                <ExternalLink className="h-3.5 w-3.5" /> View {idea.listing_platform || "marketplace"} listing
              </a>
            )}
          </div>

          {/* Timestamps */}
          <div className="text-[10px] text-muted-foreground space-y-0.5">
            <p>Created {idea?.created_at ? formatDistanceToNow(new Date(idea.created_at), { addSuffix: true }) : "—"}</p>
            <p>Updated {idea?.updated_at ? formatDistanceToNow(new Date(idea.updated_at), { addSuffix: true }) : "—"}</p>
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex justify-between gap-3">
        <Button variant="ghost" onClick={onClose}>
          <ArrowLeft className="h-4 w-4 mr-2" /> Back to Board
        </Button>
        <div className="flex gap-3">
          {idea?.status === "ready" && (
            <Button onClick={() => sendToPrintify.mutate(idea.id)} disabled={sendToPrintify.isPending}>
              {sendToPrintify.isPending ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Sending…</>
              ) : (
                "Send to Printify"
              )}
            </Button>
          )}
          {idea?.status === "production" && (
            <Button onClick={() => updateStatus.mutate({ id: idea.id, status: "live" })}>
              Mark as Live
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
