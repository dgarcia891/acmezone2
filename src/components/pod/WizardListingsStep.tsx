import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  RefreshCw, CheckCircle2, ArrowLeft, Loader2, Store,
  ThumbsDown, ExternalLink, Package, Copy
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import ListingEditor from "./ListingEditor";
import { usePodListings, useGenerateListings, useApproveListings, useSendToPrintify } from "@/hooks/usePodListings";
import { useUpdateIdeaStatus } from "@/hooks/usePodKanban";
import { usePodSettings } from "@/hooks/usePodPipeline";

const MARKETPLACE_COLORS: Record<string, string> = {
  default: "bg-primary/10 text-primary",
  ebay: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  etsy: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
  shopify: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  other: "bg-muted text-muted-foreground",
};

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

function groupByMarketplace(results: PrintifyProductResult[]) {
  const groups: Record<string, PrintifyProductResult[]> = {};
  for (const r of results) {
    const key = r.shop_label || r.marketplace || "Primary Shop";
    if (!groups[key]) groups[key] = [];
    groups[key].push(r);
  }
  return groups;
}

interface Props {
  idea: any;
  onBack: () => void;
  onClose: () => void;
  onReject?: () => void;
  onDropDesign?: (type: "sticker" | "tshirt") => void;
  onIdeaUpdated?: (updated: Partial<any>) => void;
  onCreateVariant?: (idea: any) => void;
}

export default function WizardListingsStep({ idea, onBack, onClose, onReject, onDropDesign, onIdeaUpdated, onCreateVariant }: Props) {
  const { data: listings = [], isLoading } = usePodListings(idea?.id ?? null);
  const generateListings = useGenerateListings();
  const approveListings = useApproveListings();
  const sendToPrintify = useSendToPrintify();
  const updateStatus = useUpdateIdeaStatus();
  const { data: settingsData } = usePodSettings();

  const [printifyResults, setPrintifyResults] = useState<PrintifyProductResult[] | null>(null);

  // Product type selection
  const hasSticker = !!idea?.sticker_design_url;
  const hasTshirt = !!idea?.tshirt_design_url;
  const [stickerSelected, setStickerSelected] = useState(hasSticker);
  const [tshirtSelected, setTshirtSelected] = useState(hasTshirt);

  // Per-shop publish overrides
  const [publishOverrides, setPublishOverrides] = useState<Record<string, boolean>>({});

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

  // Build shops array for listing editor marketplace preview
  const shops = allShops.map((s) => ({ shop_id: s.shop_id, marketplace: s.marketplace, label: s.label }));

  // Initialize overrides from shop defaults
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

  const ideaStatus = idea?.status || "listings";
  const isReadyOrBeyond = ["ready", "production", "live"].includes(ideaStatus);
  const isProduction = ideaStatus === "production";
  const isLive = ideaStatus === "live";

  const grouped = printifyResults ? groupByMarketplace(printifyResults.filter(r => r.printify_product_id)) : null;
  const errors = printifyResults?.filter(r => r.error) || [];

  const handleSendToPrintify = async () => {
    // Approve listings first, then send
    try {
      await approveListings.mutateAsync(idea.id);
      onIdeaUpdated?.({ status: "ready" });
    } catch {
      return; // Don't proceed if approval fails
    }

    sendToPrintify.mutate(
      { idea_id: idea.id, product_types: selectedTypes, publish_overrides: publishOverrides },
      {
        onSuccess: (data) => {
          setPrintifyResults(data?.products || []);
          onIdeaUpdated?.({ status: "production" });
        },
      }
    );
  };

  const handleMarkAsLive = () => {
    updateStatus.mutate({ id: idea.id, status: "live" }, {
      onSuccess: () => onIdeaUpdated?.({ status: "live" }),
    });
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Publishing To section */}
      {(primaryShopId || additionalShops.length > 0) && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Store className="h-4 w-4 text-muted-foreground" />
              <CardTitle className="text-sm">Publishing To</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {primaryShopId && (
                <div className="flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1.5 text-xs">
                  <span className="font-medium">Primary Shop</span>
                  <Badge className={`text-[10px] ${MARKETPLACE_COLORS.default}`}>default</Badge>
                  <span className="text-muted-foreground">({primaryShopId})</span>
                </div>
              )}
              {additionalShops.map((shop: any) => (
                <div key={shop.id} className="flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1.5 text-xs">
                  <span className="font-medium">{shop.label || `${shop.marketplace} Shop`}</span>
                  <Badge className={`text-[10px] ${MARKETPLACE_COLORS[shop.marketplace] || MARKETPLACE_COLORS.other}`}>
                    {shop.marketplace}
                  </Badge>
                  <span className="text-muted-foreground">({shop.shop_id})</span>
                </div>
              ))}
            </div>
            {!primaryShopId && additionalShops.length === 0 && (
              <p className="text-xs text-muted-foreground">No Printify shops configured. Add them in Settings.</p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Listings */}
      {!isProduction && !isLive && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Listing Content</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {listings.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                No listings generated yet.
              </p>
            ) : (
              listings.map((listing: any) => (
                <ListingEditor key={listing.id} listing={listing} shops={shops} />
              ))
            )}
          </CardContent>
        </Card>
      )}

      {/* Design Selection & Publish Controls */}
      {(hasSticker || hasTshirt) && !isProduction && !isLive && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Select Products to Publish</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              {hasSticker && (
                <div>
                  <div className="flex items-center gap-2 mb-1.5">
                    <Checkbox
                      id="select-sticker"
                      checked={stickerSelected}
                      onCheckedChange={(v) => setStickerSelected(!!v)}
                      aria-label="Include sticker"
                    />
                    <label htmlFor="select-sticker" className="text-xs font-medium cursor-pointer">Sticker</label>
                  </div>
                  <img
                    src={idea.sticker_design_url}
                    alt="Sticker design"
                    className={`w-full rounded border bg-muted aspect-square object-contain ${!stickerSelected ? "opacity-40" : ""}`}
                  />
                </div>
              )}
              {hasTshirt && (
                <div>
                  <div className="flex items-center gap-2 mb-1.5">
                    <Checkbox
                      id="select-tshirt"
                      checked={tshirtSelected}
                      onCheckedChange={(v) => setTshirtSelected(!!v)}
                      aria-label="Include t-shirt"
                    />
                    <label htmlFor="select-tshirt" className="text-xs font-medium cursor-pointer">T-Shirt</label>
                  </div>
                  <img
                    src={idea.tshirt_design_url}
                    alt="T-Shirt design"
                    className={`w-full rounded border bg-muted aspect-square object-contain ${!tshirtSelected ? "opacity-40" : ""}`}
                  />
                </div>
              )}
            </div>
            {selectedTypes.length === 0 && (
              <p className="text-xs text-destructive">Select at least one product type to publish.</p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Per-shop publish/draft toggles */}
      {!isProduction && !isLive && allShops.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-1.5">
              <Store className="h-3.5 w-3.5" /> Publish Settings Per Shop
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
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
          </CardContent>
        </Card>
      )}

      {/* Printify Results */}
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
                <Button variant="outline" size="sm" className="text-xs h-7" onClick={() => window.open(products[0].printify_url, "_blank")}>
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
                  <Badge variant="secondary" className="text-[10px]">{result.printify_product_id}</Badge>
                </div>
                {result.images.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-2">Mockups</p>
                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                      {result.images.map((img, idx) => (
                        <div key={idx} className="relative">
                          <img src={img.src} alt={`Mockup ${idx + 1}`} className="w-full rounded border border-border bg-muted aspect-square object-cover" loading="lazy" />
                          {img.is_default && (
                            <Badge variant="default" className="absolute top-1 left-1 text-[8px] px-1 py-0">Default</Badge>
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
              <p key={i} className="text-xs text-destructive">⚠ {e.shop_label && `${e.shop_label}: `}{e.error}</p>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Live status */}
      {isLive && (
        <Card>
          <CardContent className="pt-6 space-y-3">
            <div className="flex items-center gap-2 text-green-600">
              <CheckCircle2 className="h-5 w-5" />
              <span className="text-sm font-medium">Product is live!</span>
            </div>
            {idea?.listing_url && (
              <a href={idea.listing_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-sm text-primary hover:underline">
                <ExternalLink className="h-3.5 w-3.5" /> View {idea.listing_platform || "marketplace"} listing
              </a>
            )}
            <div className="text-[10px] text-muted-foreground space-y-0.5">
              <p>Created {idea?.created_at ? formatDistanceToNow(new Date(idea.created_at), { addSuffix: true }) : "—"}</p>
              <p>Updated {idea?.updated_at ? formatDistanceToNow(new Date(idea.updated_at), { addSuffix: true }) : "—"}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Actions */}
      <div className="flex justify-between gap-3">
        <div className="flex gap-3">
          {!isReadyOrBeyond && (
            <Button variant="ghost" onClick={onBack}>
              <ArrowLeft className="h-4 w-4 mr-2" /> Back to Designs
            </Button>
          )}
          {isReadyOrBeyond && (
            <Button variant="ghost" onClick={onClose}>
              <ArrowLeft className="h-4 w-4 mr-2" /> Back to Board
            </Button>
          )}
          {onReject && !isReadyOrBeyond && (
            <Button variant="outline" onClick={onReject}>
              <ThumbsDown className="h-4 w-4 mr-2" /> Reject Idea
            </Button>
          )}
        </div>
        <div className="flex gap-3">
          {!isReadyOrBeyond && (
            <Button
              variant="outline"
              onClick={() => generateListings.mutate(idea.id)}
              disabled={generateListings.isPending}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${generateListings.isPending ? "animate-spin" : ""}`} />
              Regenerate Listings
            </Button>
          )}
          {!isReadyOrBeyond && (
            <Button
              onClick={handleSendToPrintify}
              disabled={approveListings.isPending || sendToPrintify.isPending || listings.length === 0 || selectedTypes.length === 0}
              className="bg-green-600 hover:bg-green-700"
            >
              {(approveListings.isPending || sendToPrintify.isPending) ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Sending…</>
              ) : (
                `Send ${selectedTypes.length === 1 ? selectedTypes[0] : "both"} to Printify`
              )}
            </Button>
          )}
          {isProduction && (
            <Button onClick={handleMarkAsLive} disabled={updateStatus.isPending}>
              {updateStatus.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
              Mark as Live
            </Button>
          )}
          {isReadyOrBeyond && onCreateVariant && (
            <Button variant="outline" onClick={() => onCreateVariant(idea)}>
              <Copy className="h-4 w-4 mr-2" /> Create Variant
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
