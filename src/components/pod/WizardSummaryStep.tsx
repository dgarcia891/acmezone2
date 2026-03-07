import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { ExternalLink, CheckCircle2, Loader2, ArrowLeft, Package, Store } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useSendToPrintify } from "@/hooks/usePodListings";
import { useUpdateIdeaStatus } from "@/hooks/usePodKanban";
import { usePodSettings } from "@/hooks/usePodPipeline";

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
  const { data: settingsData } = usePodSettings();
  const [printifyResults, setPrintifyResults] = useState<PrintifyProductResult[] | null>(null);

  // Product type selection state
  const hasSticker = !!idea?.sticker_design_url;
  const hasTshirt = !!idea?.tshirt_design_url;
  const [stickerSelected, setStickerSelected] = useState(hasSticker);
  const [tshirtSelected, setTshirtSelected] = useState(hasTshirt);

  // Per-shop publish overrides: shop_id -> boolean
  const [publishOverrides, setPublishOverrides] = useState<Record<string, boolean>>({});

  // Build shop list from settings for the per-shop toggles
  const primaryShopId = settingsData?.settings?.printify_shop_id || "";
  const primaryAutoPublish = settingsData?.settings?.auto_publish ?? false;
  const additionalShops = (settingsData?.additional_shops || []).filter((s: any) => s.is_active);

  const allShops = [
    ...(primaryShopId ? [{ shop_id: primaryShopId, marketplace: "default", label: "Primary Shop", auto_publish: primaryAutoPublish }] : []),
    ...additionalShops.map((s: any) => ({
      shop_id: s.shop_id,
      marketplace: s.marketplace,
      label: s.label || `${s.marketplace} Shop`,
      auto_publish: s.auto_publish ?? false,
    })),
  ];

  // Initialize overrides from shop defaults when settings load
  useEffect(() => {
    if (allShops.length > 0 && Object.keys(publishOverrides).length === 0) {
      const defaults: Record<string, boolean> = {};
      for (const shop of allShops) {
        defaults[shop.shop_id] = shop.auto_publish;
      }
      setPublishOverrides(defaults);
    }
  }, [settingsData]);

  const toggleShopPublish = (shopId: string, value: boolean) => {
    setPublishOverrides((prev) => ({ ...prev, [shopId]: value }));
  };

  const selectedTypes: string[] = [];
  if (stickerSelected && hasSticker) selectedTypes.push("sticker");
  if (tshirtSelected && hasTshirt) selectedTypes.push("tshirt");

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

          {/* Designs with selection checkboxes */}
          {(hasSticker || hasTshirt) && (
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-2">
                {idea?.status === "ready" ? "Select products to publish" : "Designs"}
              </p>
              <div className="grid grid-cols-2 gap-3">
                {hasSticker && (
                  <div className="relative">
                    {idea?.status === "ready" && (
                      <div className="flex items-center gap-2 mb-1.5">
                        <Checkbox
                          id="select-sticker"
                          checked={stickerSelected}
                          onCheckedChange={(v) => setStickerSelected(!!v)}
                          aria-label="Include sticker"
                        />
                        <label htmlFor="select-sticker" className="text-xs font-medium cursor-pointer">
                          Sticker
                        </label>
                      </div>
                    )}
                    {idea?.status !== "ready" && (
                      <p className="text-[10px] text-muted-foreground mb-1">Sticker</p>
                    )}
                    <img
                      src={idea.sticker_design_url}
                      alt="Sticker design"
                      className={`w-full rounded border bg-muted aspect-square object-contain ${
                        idea?.status === "ready" && !stickerSelected
                          ? "opacity-40 border-border"
                          : "border-border"
                      }`}
                    />
                  </div>
                )}
                {hasTshirt && (
                  <div className="relative">
                    {idea?.status === "ready" && (
                      <div className="flex items-center gap-2 mb-1.5">
                        <Checkbox
                          id="select-tshirt"
                          checked={tshirtSelected}
                          onCheckedChange={(v) => setTshirtSelected(!!v)}
                          aria-label="Include t-shirt"
                        />
                        <label htmlFor="select-tshirt" className="text-xs font-medium cursor-pointer">
                          T-Shirt
                        </label>
                      </div>
                    )}
                    {idea?.status !== "ready" && (
                      <p className="text-[10px] text-muted-foreground mb-1">T-Shirt</p>
                    )}
                    <img
                      src={idea.tshirt_design_url}
                      alt="T-Shirt design"
                      className={`w-full rounded border bg-muted aspect-square object-contain ${
                        idea?.status === "ready" && !tshirtSelected
                          ? "opacity-40 border-border"
                          : "border-border"
                      }`}
                    />
                  </div>
                )}
              </div>
              {idea?.status === "ready" && selectedTypes.length === 0 && (
                <p className="text-xs text-destructive mt-2">Select at least one product type to publish.</p>
              )}
            </div>
          )}

          {/* Per-shop publish/draft toggles */}
          {idea?.status === "ready" && allShops.length > 0 && (
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1.5">
                <Store className="h-3.5 w-3.5" /> Publish settings per shop
              </p>
              <div className="space-y-2">
                {allShops.map((shop) => (
                  <div key={shop.shop_id} className="flex items-center justify-between gap-2 p-2 rounded-md border border-border bg-muted/30">
                    <div className="flex items-center gap-2 min-w-0">
                      <Badge className={`text-[10px] shrink-0 ${MARKETPLACE_COLORS[shop.marketplace] || MARKETPLACE_COLORS.other}`}>
                        {shop.marketplace === "default" ? "Primary" : shop.marketplace}
                      </Badge>
                      <span className="text-xs truncate">{shop.label}</span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Label className="text-xs text-muted-foreground cursor-pointer select-none">
                        {publishOverrides[shop.shop_id] ? "Publish" : "Draft"}
                      </Label>
                      <Switch
                        checked={publishOverrides[shop.shop_id] ?? shop.auto_publish}
                        onCheckedChange={(v) => toggleShopPublish(shop.shop_id, v)}
                        aria-label={`Publish toggle for ${shop.label}`}
                      />
                    </div>
                  </div>
                ))}
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
              onClick={() => sendToPrintify.mutate(
                { idea_id: idea.id, product_types: selectedTypes, publish_overrides: publishOverrides },
                {
                  onSuccess: (data) => {
                    setPrintifyResults(data?.products || []);
                    onIdeaUpdated?.({ status: "production" });
                  },
                }
              )}
              disabled={sendToPrintify.isPending || selectedTypes.length === 0}
            >
              {sendToPrintify.isPending ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Sending…</>
              ) : (
                `Send ${selectedTypes.length === 1 ? selectedTypes[0] : "both"} to Printify`
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
