import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ExternalLink, CheckCircle2, Loader2, ArrowLeft, Package } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useSendToPrintify } from "@/hooks/usePodListings";
import { useUpdateIdeaStatus } from "@/hooks/usePodKanban";

interface PrintifyProductResult {
  product_type: string;
  printify_product_id: string;
  printify_url: string;
  title: string;
  shop_id?: string;
  marketplace?: string;
  shop_label?: string;
  images: { src: string; is_default: boolean }[];
  variants_count: number;
  variants_enabled: number;
  error?: string;
}

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

const MARKETPLACE_COLORS: Record<string, string> = {
  default: "bg-primary/10 text-primary",
  ebay: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  etsy: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
  shopify: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  other: "bg-muted text-muted-foreground",
};

function groupByMarketplace(results: PrintifyProductResult[]) {
  const groups: Record<string, PrintifyProductResult[]> = {};
  for (const r of results) {
    const key = r.shop_label || r.marketplace || "Primary Shop";
    if (!groups[key]) groups[key] = [];
    groups[key].push(r);
  }
  return groups;
}

export default function WizardSummaryStep({ idea, onClose, onIdeaUpdated }: Props) {
  const sendToPrintify = useSendToPrintify();
  const updateStatus = useUpdateIdeaStatus();
  const [printifyResults, setPrintifyResults] = useState<PrintifyProductResult[] | null>(null);

  const statusInfo = STATUS_LABELS[idea?.status] || { label: idea?.status, emoji: "" };

  const viewUrl = printifyResults?.[0]?.printify_url || idea?.printify_product_url;
  const grouped = printifyResults ? groupByMarketplace(printifyResults.filter(r => r.printify_product_id)) : null;
  const errors = printifyResults?.filter(r => r.error) || [];

  return (
    <div className="space-y-6">
      {/* Header with View in Printify button */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <CardTitle className="text-lg">Idea Summary</CardTitle>
              <Badge variant="outline" className="text-sm">
                {statusInfo.emoji} {statusInfo.label}
              </Badge>
            </div>
            {viewUrl && !grouped && (
              <Button
                variant="default"
                size="sm"
                className="shrink-0"
                onClick={() => window.open(viewUrl, "_blank")}
              >
                View in Printify
                <ExternalLink className="h-4 w-4 ml-2" />
              </Button>
            )}
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
                    <img src={idea.sticker_design_url} alt="Sticker design" className="w-full rounded border border-border bg-muted aspect-square object-contain" />
                  </div>
                )}
                {idea?.tshirt_design_url && (
                  <div>
                    <p className="text-[10px] text-muted-foreground mb-1">T-Shirt</p>
                    <img src={idea.tshirt_design_url} alt="T-Shirt design" className="w-full rounded border border-border bg-muted aspect-square object-contain" />
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

          {/* Marketplace link */}
          {idea?.listing_url && (
            <a href={idea.listing_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-sm text-primary hover:underline">
              <ExternalLink className="h-3.5 w-3.5" /> View {idea.listing_platform || "marketplace"} listing
            </a>
          )}

          {/* Timestamps */}
          <div className="text-[10px] text-muted-foreground space-y-0.5">
            <p>Created {idea?.created_at ? formatDistanceToNow(new Date(idea.created_at), { addSuffix: true }) : "—"}</p>
            <p>Updated {idea?.updated_at ? formatDistanceToNow(new Date(idea.updated_at), { addSuffix: true }) : "—"}</p>
          </div>
        </CardContent>
      </Card>

      {/* Printify Results grouped by shop/marketplace */}
      {grouped && Object.entries(grouped).map(([shopLabel, products]) => (
        <Card key={shopLabel} className="border-primary/30">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Package className="h-5 w-5 text-primary" />
                <CardTitle className="text-base">{shopLabel}</CardTitle>
                {products[0]?.marketplace && (
                  <Badge className={`text-[10px] ${MARKETPLACE_COLORS[products[0].marketplace] || MARKETPLACE_COLORS.other}`}>
                    {products[0].marketplace}
                  </Badge>
                )}
              </div>
              {products[0]?.printify_url && (
                <Button
                  variant="outline"
                  size="sm"
                  className="text-xs h-7"
                  onClick={() => window.open(products[0].printify_url, "_blank")}
                >
                  View in Printify <ExternalLink className="h-3 w-3 ml-1" />
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {products.map((result) => (
              <div key={result.printify_product_id} className="space-y-3">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div>
                    <p className="text-sm font-medium">{result.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {result.product_type} · {result.variants_enabled}/{result.variants_count} variants enabled
                    </p>
                  </div>
                  <Badge variant="secondary" className="text-[10px]">
                    {result.printify_product_id}
                  </Badge>
                </div>

                {result.images.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-2">Mockups</p>
                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                      {result.images.map((img, idx) => (
                        <div key={idx} className="relative">
                          <img
                            src={img.src}
                            alt={`Mockup ${idx + 1}`}
                            className="w-full rounded border border-border bg-muted aspect-square object-cover"
                            loading="lazy"
                          />
                          {img.is_default && (
                            <Badge variant="default" className="absolute top-1 left-1 text-[8px] px-1 py-0">
                              Default
                            </Badge>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      ))}

      {/* Error results */}
      {errors.length > 0 && (
        <Card className="border-destructive/30">
          <CardContent className="pt-4 space-y-2">
            {errors.map((e, i) => (
              <p key={i} className="text-xs text-destructive">
                ⚠ {e.shop_label && `${e.shop_label}: `}{e.error}
              </p>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Actions */}
      <div className="flex justify-between gap-3">
        <Button variant="ghost" onClick={onClose}>
          <ArrowLeft className="h-4 w-4 mr-2" /> Back to Board
        </Button>
        <div className="flex gap-3">
          {idea?.status === "ready" && (
            <Button
              onClick={() => sendToPrintify.mutate(idea.id, {
                onSuccess: (data) => {
                  setPrintifyResults(data?.products || []);
                  onIdeaUpdated?.({ status: "production" });
                },
              })}
              disabled={sendToPrintify.isPending}
            >
              {sendToPrintify.isPending ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Sending…</>
              ) : (
                "Send to Printify"
              )}
            </Button>
          )}
          {idea?.status === "production" && (
            <Button onClick={() => updateStatus.mutate({ id: idea.id, status: "live" }, {
              onSuccess: () => onIdeaUpdated?.({ status: "live" }),
            })}>
              Mark as Live
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
