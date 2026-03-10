import { useMemo, useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  RefreshCw,
  CheckCircle2,
  ArrowLeft,
  Loader2,
  Store,
  ThumbsDown,
  ExternalLink,
  Package,
  Copy,
  Palette,
  DollarSign,
  Wand2,
  Check,
  X,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import ListingEditor from "./ListingEditor";
import SpreadshirtExport from "./SpreadshirtExport";
import { usePodListings, useGenerateListings, useApproveListings, useSendToPrintify } from "@/hooks/usePodListings";
import { useUpdateIdeaStatus } from "@/hooks/usePodKanban";
import { usePodSettings, useSetShopMargin, useSavePodSettings, useRefineForColor, useColorRefinedVersions } from "@/hooks/usePodPipeline";
import { useFetchVariantColors, useIdeaOverrides, useSaveIdeaOverride } from "@/hooks/usePodOverrides";
const checkerboardStyle = {
  backgroundImage:
    "linear-gradient(45deg, hsl(var(--muted)) 25%, transparent 25%), linear-gradient(-45deg, hsl(var(--muted)) 25%, transparent 25%), linear-gradient(45deg, transparent 75%, hsl(var(--muted)) 75%), linear-gradient(-45deg, transparent 75%, hsl(var(--muted)) 75%)",
  backgroundSize: "20px 20px",
  backgroundPosition: "0 0, 0 10px, 10px -10px, -10px 0px",
  backgroundColor: "hsl(var(--background))",
};

const MARKETPLACE_COLORS: Record<string, string> = {
  default: "bg-primary/10 text-primary",
  ebay: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  etsy: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
  shopify: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  other: "bg-muted text-muted-foreground",
};

// Data-driven swatches: keep them subtle + HSL-based; unknown names fall back to theme tokens.
const COLOR_SWATCH_HSL: Record<string, string> = {
  black: "hsl(0 0% 10%)",
  white: "hsl(0 0% 98%)",
  navy: "hsl(220 55% 25%)",
  blue: "hsl(215 75% 45%)",
  lightblue: "hsl(205 80% 75%)",
  red: "hsl(0 80% 52%)",
  maroon: "hsl(350 60% 30%)",
  green: "hsl(140 45% 35%)",
  forest: "hsl(140 45% 25%)",
  yellow: "hsl(45 95% 55%)",
  orange: "hsl(25 90% 55%)",
  pink: "hsl(330 85% 70%)",
  purple: "hsl(275 65% 55%)",
  grey: "hsl(0 0% 55%)",
  gray: "hsl(0 0% 55%)",
  charcoal: "hsl(0 0% 25%)",
  sand: "hsl(35 35% 75%)",
  natural: "hsl(35 25% 85%)",
};

function swatchForColorName(colorName: string): string {
  const key = colorName.toLowerCase().replace(/\s+/g, "");
  // Try exact key first
  if (COLOR_SWATCH_HSL[key]) return COLOR_SWATCH_HSL[key];

  // Try partial matches (e.g. "dark heather grey")
  for (const k of Object.keys(COLOR_SWATCH_HSL)) {
    if (key.includes(k)) return COLOR_SWATCH_HSL[k];
  }

  return "hsl(var(--muted))";
}
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
  color_analysis?: {
    dominance: "dark" | "light" | "medium";
    dominant_colors: string[];
    excluded_count: number;
  };
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

function ColorRefinePopover({
  colorName,
  bgHex,
  isRefining,
  onRefine,
}: {
  colorName: string;
  bgHex: string;
  isRefining: boolean;
  onRefine: (guidance: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [guidance, setGuidance] = useState(
    `Make text and details clearly visible on a ${colorName} background`
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          size="sm"
          variant="outline"
          className="h-6 text-[10px] gap-1 px-2 w-full"
          disabled={isRefining}
        >
          <Wand2 className="h-3 w-3" /> Refine
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72 space-y-3" side="top">
        <p className="text-xs font-medium">Refine design for {colorName}</p>
        <Textarea
          className="text-xs min-h-[60px]"
          value={guidance}
          onChange={(e) => setGuidance(e.target.value)}
          placeholder="Describe what to fix…"
        />
        <Button
          size="sm"
          className="w-full h-7 text-xs"
          onClick={() => {
            setOpen(false);
            onRefine(guidance);
          }}
          disabled={!guidance.trim()}
        >
          <Wand2 className="h-3 w-3 mr-1" /> Run AI Refinement
        </Button>
      </PopoverContent>
    </Popover>
  );
}

export default function WizardListingsStep({ idea, onBack, onClose, onReject, onDropDesign, onIdeaUpdated, onCreateVariant }: Props) {
  const cacheBust = (url: string | null | undefined) => (url ? `${url.split("?")[0]}?t=${encodeURIComponent(idea?.updated_at || Date.now())}` : url);
  const refineForColor = useRefineForColor();
  const { data: listings = [], isLoading } = usePodListings(idea?.id ?? null);
  const generateListings = useGenerateListings();
  const approveListings = useApproveListings();
  const sendToPrintify = useSendToPrintify();
  const updateStatus = useUpdateIdeaStatus();
  const { data: settingsData } = usePodSettings();

  const { data: overrideData, isLoading: overridesLoading } = useIdeaOverrides(idea?.id ?? null);
  const saveOverride = useSaveIdeaOverride();
  const setShopMargin = useSetShopMargin();
  const saveGlobalSettings = useSavePodSettings();
  const { data: colorRefinedMap = {} } = useColorRefinedVersions(idea?.id ?? null);

  const [printifyResults, setPrintifyResults] = useState<PrintifyProductResult[] | null>(null);

  // Product type selection
  const hasSticker = !!idea?.sticker_design_url;
  const hasTshirt = !!idea?.tshirt_design_url;
  const [stickerSelected, setStickerSelected] = useState(hasSticker);
  const [tshirtSelected, setTshirtSelected] = useState(hasTshirt);

  // Per-shop publish overrides
  const [publishOverrides, setPublishOverrides] = useState<Record<string, boolean>>({});

  // Local (immediate) overrides to drive real-time preview
  const [marginOverrides, setMarginOverrides] = useState<Record<string, { tshirt_margin_pct: number | null; sticker_margin_pct: number | null }>>({});
  const [tshirtVariantIds, setTshirtVariantIds] = useState<number[]>([]);
  const [hydratedOverrides, setHydratedOverrides] = useState(false);
  const [hydratedColors, setHydratedColors] = useState(false);
  const [refiningColor, setRefiningColor] = useState<string | null>(null);
  const [refinedPreview, setRefinedPreview] = useState<{ colorName: string; url: string; versionId?: string } | null>(null);

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

  // Hydrate local override state once
  useEffect(() => {
    if (hydratedOverrides) return;
    if (!overrideData) return;

    const next: Record<string, { tshirt_margin_pct: number | null; sticker_margin_pct: number | null }> = {};
    for (const shop of allShops) {
      const row = overrideData.perShop?.[shop.shop_id];
      next[shop.shop_id] = {
        tshirt_margin_pct: row?.tshirt_margin_pct ?? null,
        sticker_margin_pct: row?.sticker_margin_pct ?? null,
      };
    }

    setMarginOverrides(next);
    setHydratedOverrides(true);
  }, [hydratedOverrides, overrideData, allShops]);

  const tshirtListing = useMemo(() => listings.find((l: any) => l.product_type === "tshirt") || null, [listings]);
  const tshirtBlueprintId = tshirtListing?.printify_blueprint_id ?? null;
  const tshirtPrintProviderId = tshirtListing?.printify_print_provider_id ?? null;

  const variantsQuery = useFetchVariantColors({
    blueprintId: tshirtBlueprintId,
    printProviderId: tshirtPrintProviderId,
    imageUrl: idea?.tshirt_design_url || null,
  });

  const variantIdsSet = useMemo(() => new Set(tshirtVariantIds.map((n) => Number(n)).filter((n) => Number.isFinite(n))), [tshirtVariantIds]);

  const colorsByName = useMemo(() => {
    const map = new Map<string, number[]>();
    const variants = variantsQuery.data?.variants || [];

    for (const v of variants) {
      const raw = v.options?.color || v.options?.Color || v.title || "";
      const colorName = String(raw).split(" / ")[0].trim() || "Unknown";
      const list = map.get(colorName) || [];
      list.push(v.id);
      map.set(colorName, list);
    }

    return map;
  }, [variantsQuery.data?.variants]);

  const recommendedVariantSet = useMemo(() => {
    const ids = variantsQuery.data?.recommended_variant_ids || [];
    return new Set(ids.map((n) => Number(n)).filter((n) => Number.isFinite(n)));
  }, [variantsQuery.data?.recommended_variant_ids]);

  useEffect(() => {
    if (hydratedColors) return;
    if (!overrideData) return;
    if (!variantsQuery.data) return;

    const fromDb = overrideData.global?.tshirt_color_overrides;
    const dbIds = Array.isArray(fromDb) ? fromDb.map((n: any) => Number(n)).filter((n: number) => Number.isFinite(n)) : [];

    if (dbIds.length > 0) {
      setTshirtVariantIds(dbIds);
      setHydratedColors(true);
      return;
    }

    const recommended = variantsQuery.data.recommended_variant_ids || [];
    const recommendedIds = recommended.map((n: any) => Number(n)).filter((n: number) => Number.isFinite(n));
    if (recommendedIds.length > 0) {
      setTshirtVariantIds(recommendedIds);
      setHydratedColors(true);
      return;
    }

    const all = (variantsQuery.data.variants || []).map((v) => v.id);
    setTshirtVariantIds(all);
    setHydratedColors(true);
  }, [hydratedColors, overrideData, variantsQuery.data]);

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

  const setMarginField = (shopId: string, field: "tshirt_margin_pct" | "sticker_margin_pct", value: string) => {
    const num = value.trim() === "" ? null : Number(value);
    setMarginOverrides((prev) => ({
      ...prev,
      [shopId]: {
        tshirt_margin_pct: prev[shopId]?.tshirt_margin_pct ?? null,
        sticker_margin_pct: prev[shopId]?.sticker_margin_pct ?? null,
        [field]: num == null || Number.isNaN(num) ? null : Math.max(0, Math.min(500, Math.round(num))),
      },
    }));
  };

  const saveMarginsForShop = (shopId: string) => {
    if (!idea?.id) return;
    const row = marginOverrides[shopId] || { tshirt_margin_pct: null, sticker_margin_pct: null };
    saveOverride.mutate({
      ideaId: idea.id,
      shopId,
      patch: {
        tshirt_margin_pct: row.tshirt_margin_pct,
        sticker_margin_pct: row.sticker_margin_pct,
      },
    });
  };

  const resetMarginsForShop = (shopId: string) => {
    setMarginOverrides((prev) => ({
      ...prev,
      [shopId]: { tshirt_margin_pct: null, sticker_margin_pct: null },
    }));
    if (!idea?.id) return;
    saveOverride.mutate({
      ideaId: idea.id,
      shopId,
      patch: { tshirt_margin_pct: null, sticker_margin_pct: null },
    });
  };

  const setAsDefaultForShop = async (shop: any, effectiveTshirt: number, effectiveSticker: number) => {
    try {
      if (shop.marketplace === "default") {
        // Update global settings for primary shop
        await saveGlobalSettings.mutateAsync({
          tshirt_margin_pct: String(effectiveTshirt),
          sticker_margin_pct: String(effectiveSticker),
        });
      } else {
        // Update shop-specific defaults
        const additionalShopData = additionalShops.find((s: any) => s.shop_id === shop.shop_id);
        if (additionalShopData?.id) {
          await setShopMargin.mutateAsync({
            id: additionalShopData.id,
            tshirt_margin_pct: effectiveTshirt,
            sticker_margin_pct: effectiveSticker,
          });
        }
      }

      // Clear idea-level override since it's now the default
      if (idea?.id) {
        await saveOverride.mutateAsync({
          ideaId: idea.id,
          shopId: shop.shop_id,
          patch: { tshirt_margin_pct: null, sticker_margin_pct: null },
        });
      }

      // Update local state to reflect cleared override
      setMarginOverrides((prev) => ({
        ...prev,
        [shop.shop_id]: { tshirt_margin_pct: null, sticker_margin_pct: null },
      }));
    } catch (error) {
      console.error("Failed to set as default:", error);
    }
  };

  const toggleColorGroup = (colorName: string, checked: boolean) => {
    const ids = colorsByName.get(colorName) || [];
    setTshirtVariantIds((prev) => {
      const next = new Set(prev.map((n) => Number(n)).filter((n) => Number.isFinite(n)));
      if (checked) {
        ids.forEach((id) => next.add(id));
      } else {
        ids.forEach((id) => next.delete(id));
      }
      return Array.from(next);
    });
  };

  const saveTshirtColors = () => {
    if (!idea?.id) return;
    if (tshirtVariantIds.length === 0) return;
    saveOverride.mutate({
      ideaId: idea.id,
      shopId: null,
      patch: { tshirt_color_overrides: tshirtVariantIds },
    });
  };

  const selectAllTshirtColors = () => {
    const all = (variantsQuery.data?.variants || []).map((v) => v.id);
    setTshirtVariantIds(all);
  };

  const resetTshirtColorsToAi = () => {
    const ai = Array.from(recommendedVariantSet);
    if (ai.length > 0) setTshirtVariantIds(ai);
  };

  const selectedTypes: string[] = [];
  if (stickerSelected && hasSticker) selectedTypes.push("sticker");
  if (tshirtSelected && hasTshirt) selectedTypes.push("tshirt");

  const ideaStatus = idea?.status || "listings";
  const isReadyOrBeyond = ["ready", "production", "live"].includes(ideaStatus);
  const isProduction = ideaStatus === "production";
  const isLive = ideaStatus === "live";

  const grouped = printifyResults ? groupByMarketplace(printifyResults.filter((r) => r.printify_product_id)) : null;
  const errors = printifyResults?.filter((r) => r.error) || [];

  // Representative background color for T-shirt previews (first selected color, or white)
  const representativeTshirtColor = useMemo(() => {
    if (!colorsByName || colorsByName.size === 0) return "#FFFFFF";
    for (const [colorName, ids] of colorsByName.entries()) {
      if (ids.some((id) => variantIdsSet.has(id))) {
        return swatchForColorName(colorName);
      }
    }
    return "#FFFFFF";
  }, [colorsByName, variantIdsSet]);

  const tshirtVariantSelectionInvalid = tshirtSelected && hasTshirt && !!variantsQuery.data && tshirtVariantIds.length === 0;

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

      {/* Spreadshirt Export */}
      {listings.length > 0 && (
        <SpreadshirtExport idea={idea} listings={listings} />
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

      {/* Per-idea margin overrides */}
      {!isProduction && !isLive && allShops.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-1.5">
              <DollarSign className="h-3.5 w-3.5" /> Margin Overrides (This Idea)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-xs text-muted-foreground">
              Leave fields blank to inherit shop/global defaults. Changes are saved per shop.
            </p>

            <div className="space-y-2">
              {allShops.map((shop) => {
                const globalTshirtMargin = settingsData?.settings?.tshirt_margin_pct ?? 100;
                const globalStickerMargin = settingsData?.settings?.sticker_margin_pct ?? 100;
                const additionalShopData = additionalShops.find((s: any) => s.shop_id === shop.shop_id);

                const local = marginOverrides[shop.shop_id] || { tshirt_margin_pct: null, sticker_margin_pct: null };

                const shopTshirtDefault = additionalShopData?.tshirt_margin_pct ?? null;
                const shopStickerDefault = additionalShopData?.sticker_margin_pct ?? null;

                const effectiveTshirt = (local.tshirt_margin_pct ?? shopTshirtDefault ?? globalTshirtMargin) as number;
                const effectiveSticker = (local.sticker_margin_pct ?? shopStickerDefault ?? globalStickerMargin) as number;

                return (
                  <div key={shop.shop_id} className="rounded-md border border-border p-3 space-y-2">
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <Badge className={`text-[10px] ${MARKETPLACE_COLORS[shop.marketplace] || MARKETPLACE_COLORS.other}`}>
                            {shop.marketplace === "default" ? "Primary" : shop.marketplace}
                          </Badge>
                          <span className="text-xs font-medium truncate">{shop.label}</span>
                        </div>
                        <p className="text-[11px] text-muted-foreground mt-1">
                          Effective: Sticker <span className="font-mono">{effectiveSticker}%</span> · T-Shirt <span className="font-mono">{effectiveTshirt}%</span>
                        </p>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 text-xs"
                          onClick={() => setAsDefaultForShop(shop, effectiveTshirt, effectiveSticker)}
                          disabled={saveOverride.isPending || setShopMargin.isPending || saveGlobalSettings.isPending}
                        >
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                          Set as Default
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 text-xs"
                          onClick={() => resetMarginsForShop(shop.shop_id)}
                          disabled={saveOverride.isPending}
                        >
                          Reset
                        </Button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <Label className="text-xs">Sticker margin %</Label>
                        <Input
                          inputMode="numeric"
                          type="number"
                          min={0}
                          max={500}
                          placeholder={`${shopStickerDefault ?? globalStickerMargin}`}
                          value={local.sticker_margin_pct ?? ""}
                          onChange={(e) => setMarginField(shop.shop_id, "sticker_margin_pct", e.target.value)}
                          onBlur={() => saveMarginsForShop(shop.shop_id)}
                          disabled={saveOverride.isPending}
                        />
                        <p className="text-[11px] text-muted-foreground">
                          {local.sticker_margin_pct == null ? "Using default" : "Custom"}
                        </p>
                      </div>

                      <div className="space-y-1.5">
                        <Label className="text-xs">T-Shirt margin %</Label>
                        <Input
                          inputMode="numeric"
                          type="number"
                          min={0}
                          max={500}
                          placeholder={`${shopTshirtDefault ?? globalTshirtMargin}`}
                          value={local.tshirt_margin_pct ?? ""}
                          onChange={(e) => setMarginField(shop.shop_id, "tshirt_margin_pct", e.target.value)}
                          onBlur={() => saveMarginsForShop(shop.shop_id)}
                          disabled={saveOverride.isPending}
                        />
                        <p className="text-[11px] text-muted-foreground">
                          {local.tshirt_margin_pct == null ? "Using default" : "Custom"}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Per-idea t-shirt color selection */}
      {tshirtSelected && hasTshirt && !isProduction && !isLive && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between gap-2">
              <CardTitle className="text-sm flex items-center gap-1.5">
                <Palette className="h-3.5 w-3.5" /> T-Shirt Color Variants
              </CardTitle>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={selectAllTshirtColors}
                  disabled={!variantsQuery.data || saveOverride.isPending}
                >
                  Select all
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={resetTshirtColorsToAi}
                  disabled={recommendedVariantSet.size === 0 || saveOverride.isPending}
                >
                  Reset to AI
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {!tshirtListing || !tshirtBlueprintId || !tshirtPrintProviderId ? (
              <p className="text-xs text-muted-foreground">
                To customize colors, set a Blueprint ID and Print Provider ID on the T-Shirt listing.
              </p>
            ) : variantsQuery.isLoading ? (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading variants…
              </div>
            ) : (variantsQuery.data?.variants || []).length === 0 ? (
              <p className="text-xs text-muted-foreground">No variants found for this blueprint/provider.</p>
            ) : (
              <>
                <div className="flex items-center justify-between gap-3">
                  <p className="text-xs text-muted-foreground">
                    Selected <span className="font-mono">{tshirtVariantIds.length}</span> of <span className="font-mono">{variantsQuery.data?.variants.length}</span> variants
                  </p>
                  <Button
                    size="sm"
                    className="h-7 text-xs"
                    onClick={saveTshirtColors}
                    disabled={tshirtVariantIds.length === 0 || saveOverride.isPending}
                  >
                    {saveOverride.isPending ? (
                      <><Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> Saving…</>
                    ) : (
                      "Save colors"
                    )}
                  </Button>
                </div>

                {variantsQuery.data?.analysis && (
                  <p className="text-[11px] text-muted-foreground">
                    AI: <span className="font-medium">{variantsQuery.data.analysis.dominance}</span> design — recommended {recommendedVariantSet.size} variants.
                  </p>
                )}

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                  {Array.from(colorsByName.entries())
                    .sort(([a], [b]) => a.localeCompare(b))
                    .map(([colorName, ids]) => {
                      const enabledCount = ids.filter((id) => variantIdsSet.has(id)).length;
                      const checked = enabledCount === ids.length;
                      const indeterminate = enabledCount > 0 && enabledCount < ids.length;
                      const aiRecommended = ids.length > 0 && ids.every((id) => recommendedVariantSet.has(id));
                      const hasRefinedVersion = !!colorRefinedMap[colorName.toLowerCase().trim()];

                      return (
                        <div key={colorName} className="flex items-center gap-2 rounded-md border border-border p-2">
                          <Checkbox
                            checked={indeterminate ? "indeterminate" : checked}
                            onCheckedChange={(v) => toggleColorGroup(colorName, !!v)}
                            aria-label={`Toggle ${colorName}`}
                          />
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span
                                className="inline-block h-3.5 w-3.5 rounded-full border border-border"
                                style={{ backgroundColor: swatchForColorName(colorName) }}
                                aria-hidden="true"
                              />
                              <span className="text-xs truncate" title={colorName}>{colorName}</span>
                              {aiRecommended && (
                                <Badge variant="secondary" className="text-[10px]">AI</Badge>
                              )}
                              {hasRefinedVersion && (
                                <Badge variant="outline" className="text-[10px] gap-0.5 border-primary/40 text-primary">
                                  <Wand2 className="h-2.5 w-2.5" /> Refined
                                </Badge>
                              )}
                            </div>
                            <p className="text-[11px] text-muted-foreground">
                              {enabledCount}/{ids.length} enabled
                            </p>
                          </div>
                        </div>
                      );
                    })}
                </div>

                {/* Color Previews - inline */}
                {tshirtVariantIds.length > 0 && (() => {
                  const selectedColorNames = Array.from(colorsByName.entries())
                    .filter(([_, ids]) => ids.some((id) => variantIdsSet.has(id)))
                    .map(([colorName]) => colorName)
                    .sort((a, b) => a.localeCompare(b));

                  const maxPreviews = 12;
                  const displayedColors = selectedColorNames.slice(0, maxPreviews);
                  const hasMore = selectedColorNames.length > maxPreviews;

                  return (
                    <div className="mt-4 pt-4 border-t border-border space-y-3">
                      <div className="flex items-center gap-2">
                        <Palette className="h-4 w-4 text-muted-foreground" />
                        <h4 className="text-sm font-medium">Color Previews</h4>
                        <span className="text-xs text-muted-foreground ml-auto">
                          {selectedColorNames.length} {selectedColorNames.length === 1 ? 'color' : 'colors'} selected
                          {hasMore && ` (showing ${maxPreviews})`}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                        {displayedColors.map((colorName) => {
                          const designUrl = refinedPreview?.colorName === colorName
                            ? refinedPreview.url
                            : cacheBust(idea.tshirt_design_url || idea.tshirt_raw_url);
                          const bgColor = swatchForColorName(colorName);
                          const isRefining = refiningColor === colorName;
                          const hasRefinedPreview = refinedPreview?.colorName === colorName;

                          return (
                            <div key={colorName} className="flex flex-col gap-1.5">
                              <div
                                className="relative w-full aspect-square rounded-lg border border-border overflow-hidden p-[12%]"
                                style={{ backgroundColor: bgColor }}
                              >
                                {isRefining && (
                                  <div className="absolute inset-0 flex items-center justify-center bg-background/60 z-10">
                                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                                  </div>
                                )}
                                {designUrl && (
                                  <img
                                    src={designUrl}
                                    alt={`Design on ${colorName}`}
                                    className="w-full h-full object-contain"
                                  />
                                )}
                              </div>
                              <p className="text-xs text-center text-muted-foreground truncate" title={colorName}>
                                {colorName}
                              </p>

                              {/* Refine / Approve-Reject controls */}
                              {hasRefinedPreview ? (
                                <div className="flex items-center justify-center gap-1">
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-6 text-[10px] gap-1 px-2"
                                    onClick={() => {
                                      // Accept: update the main design URL
                                      onIdeaUpdated?.({ tshirt_design_url: refinedPreview.url });
                                      setRefinedPreview(null);
                                    }}
                                  >
                                    <Check className="h-3 w-3" /> Accept
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-6 text-[10px] gap-1 px-2"
                                    onClick={() => setRefinedPreview(null)}
                                  >
                                    <X className="h-3 w-3" /> Reject
                                  </Button>
                                </div>
                              ) : (
                                <ColorRefinePopover
                                  colorName={colorName}
                                  bgHex={bgColor}
                                  isRefining={isRefining}
                                  onRefine={(guidance) => {
                                    setRefiningColor(colorName);
                                    refineForColor.mutate(
                                      {
                                        idea_id: idea.id,
                                        color_name: colorName,
                                        bg_hex: bgColor,
                                        guidance,
                                      },
                                      {
                                        onSuccess: (data) => {
                                          setRefiningColor(null);
                                          setRefinedPreview({
                                            colorName,
                                            url: data.refined_url + `?t=${Date.now()}`,
                                            versionId: data.version?.id,
                                          });
                                        },
                                        onError: () => setRefiningColor(null),
                                      }
                                    );
                                  }}
                                />
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })()}
              </>
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
                  <div className={`w-full rounded border aspect-square overflow-hidden ${!stickerSelected ? "opacity-40" : ""}`} style={checkerboardStyle}>
                    <img src={cacheBust(idea.sticker_design_url)} alt="Sticker design" className="w-full h-full object-contain" />
                  </div>
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
                  <div className={`w-full rounded border aspect-square overflow-hidden flex items-center justify-center p-[12%] ${!tshirtSelected ? "opacity-40" : ""}`} style={{ backgroundColor: representativeTshirtColor }}>
                    <img src={cacheBust(idea.tshirt_design_url)} alt="T-Shirt design" className="w-full h-full object-contain" />
                  </div>
                </div>
              )}
            </div>
            {selectedTypes.length === 0 && (
              <p className="text-xs text-destructive">Select at least one product type to publish.</p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Completed design previews (for ready/production/live) */}
      {(hasSticker || hasTshirt) && isReadyOrBeyond && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Completed Designs</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {hasSticker && (
                <div>
                  <p className="text-xs font-medium mb-1.5">Sticker</p>
                  <div className="w-full rounded border border-border aspect-square overflow-hidden" style={checkerboardStyle}>
                    <img src={cacheBust(idea.sticker_design_url)} alt="Completed sticker design" className="w-full h-full object-contain" loading="lazy" />
                  </div>
                </div>
              )}
              {hasTshirt && (
                <div>
                  <p className="text-xs font-medium mb-1.5">T-Shirt</p>
                  <div className="w-full rounded border border-border aspect-square overflow-hidden flex items-center justify-center p-[12%]" style={{ backgroundColor: representativeTshirtColor }}>
                    <img src={cacheBust(idea.tshirt_design_url)} alt="Completed t-shirt design" className="w-full h-full object-contain" loading="lazy" />
                  </div>
                </div>
              )}
            </div>
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

      {/* Pricing Preview */}
      {!isProduction && !isLive && allShops.length > 0 && selectedTypes.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-1.5">
              <DollarSign className="h-3.5 w-3.5" /> Estimated Pricing Preview
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground mb-3">
              Retail prices are calculated as <span className="font-medium">production cost + margin %</span>, with a minimum $1.00 profit floor. Actual prices depend on Printify variant costs at publish time.
            </p>
            <div className="overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Shop</TableHead>
                    <TableHead className="text-xs">Product</TableHead>
                    <TableHead className="text-xs text-right">Margin</TableHead>
                    <TableHead className="text-xs text-right">Example ($12 cost)</TableHead>
                    <TableHead className="text-xs text-right">Example ($8 cost)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {allShops.flatMap((shop) => {
                    const globalTshirtMargin = settingsData?.settings?.tshirt_margin_pct ?? 100;
                    const globalStickerMargin = settingsData?.settings?.sticker_margin_pct ?? 100;

                    return selectedTypes.map((pt) => {
                      const isSticker = pt === "sticker";
                      const additionalShopData = additionalShops.find((s: any) => s.shop_id === shop.shop_id);

                      const shopDefault = isSticker ? additionalShopData?.sticker_margin_pct : additionalShopData?.tshirt_margin_pct;
                      const ideaOverride = isSticker ? marginOverrides[shop.shop_id]?.sticker_margin_pct : marginOverrides[shop.shop_id]?.tshirt_margin_pct;
                      const globalDefault = isSticker ? globalStickerMargin : globalTshirtMargin;

                      const effectiveMargin = (ideaOverride ?? shopDefault ?? globalDefault) as number;
                      const source = ideaOverride != null ? "custom" : shopDefault != null ? "shop" : "default";

                      const calcPrice = (costCents: number) => {
                        const raw = Math.round(costCents + (costCents * effectiveMargin / 100));
                        return Math.max(raw, costCents + 100);
                      };

                      return (
                        <TableRow key={`${shop.shop_id}-${pt}`}>
                          <TableCell className="text-xs py-2">
                            <div className="flex items-center gap-1.5">
                              <Badge className={`text-[10px] ${MARKETPLACE_COLORS[shop.marketplace] || MARKETPLACE_COLORS.other}`}>
                                {shop.marketplace === "default" ? "Primary" : shop.marketplace}
                              </Badge>
                              <span className="truncate max-w-[120px]">{shop.label}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-xs py-2 capitalize">{pt === "tshirt" ? "T-Shirt" : "Sticker"}</TableCell>
                          <TableCell className="text-xs py-2 text-right font-mono">
                            {effectiveMargin}%
                            {source !== "custom" && (
                              <span className="text-muted-foreground ml-1 text-[10px]">
                                ({source === "shop" ? "shop default" : "default"})
                              </span>
                            )}
                          </TableCell>
                          <TableCell className="text-xs py-2 text-right font-mono font-medium">
                            ${(calcPrice(1200) / 100).toFixed(2)}
                          </TableCell>
                          <TableCell className="text-xs py-2 text-right font-mono font-medium">
                            ${(calcPrice(800) / 100).toFixed(2)}
                          </TableCell>
                        </TableRow>
                      );
                    });
                  })}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

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
                    {result.color_analysis && result.color_analysis.excluded_count > 0 && (
                      <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                        <Palette className="h-3 w-3 text-accent-foreground shrink-0" />
                        <span className="text-[11px] text-muted-foreground">
                          🎨 Auto-excluded {result.color_analysis.excluded_count} {result.color_analysis.dominance} variant{result.color_analysis.excluded_count !== 1 ? "s" : ""} to avoid clashing
                        </span>
                        {result.color_analysis.dominant_colors.length > 0 && (
                          <div className="flex items-center gap-1 ml-0.5">
                            {result.color_analysis.dominant_colors.slice(0, 5).map((color, ci) => (
                              <span
                                key={ci}
                                className="inline-block h-3.5 w-3.5 rounded-full border border-border shadow-sm shrink-0"
                                style={{ backgroundColor: color.startsWith("#") || color.startsWith("rgb") ? color : color }}
                                title={color}
                                aria-label={`Dominant color: ${color}`}
                              />
                            ))}
                            <span className="text-[10px] text-muted-foreground/70 ml-0.5">
                              {result.color_analysis.dominant_colors.slice(0, 5).join(", ")}
                            </span>
                          </div>
                        )}
                      </div>
                    )}
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
              disabled={
                approveListings.isPending ||
                sendToPrintify.isPending ||
                saveOverride.isPending ||
                overridesLoading ||
                listings.length === 0 ||
                selectedTypes.length === 0 ||
                tshirtVariantSelectionInvalid
              }
              className="bg-primary text-primary-foreground hover:bg-primary/90"
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
