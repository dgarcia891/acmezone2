import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Sparkles, Printer, Eraser, CheckCircle2, XCircle, Save, Loader2, ShieldCheck, Plus, Trash2, Store, RefreshCw, Download } from "lucide-react";
import { usePodSettings, useSavePodSettings, useValidateRemoveBgKey, useAddShop, useRemoveShop, useToggleShop, useSetShopAutoPublish, useFetchPrintifyShops } from "@/hooks/usePodPipeline";

const MARKETPLACE_OPTIONS = [
  { value: "ebay", label: "eBay", description: "80 char title limit" },
  { value: "etsy", label: "Etsy", description: "140 char title limit" },
  { value: "shopify", label: "Shopify", description: "No title limit" },
  { value: "other", label: "Other", description: "Standard 140 char limit" },
];

const MARKETPLACE_COLORS: Record<string, string> = {
  ebay: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  etsy: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
  shopify: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  other: "bg-muted text-muted-foreground",
};

export default function PodSettingsForm() {
  const { data: settingsData, isLoading } = usePodSettings();
  const settings = settingsData?.settings;
  const additionalShops = settingsData?.additional_shops || [];
  const saveMutation = useSavePodSettings();
  const validateMutation = useValidateRemoveBgKey();
  const addShopMutation = useAddShop();
  const removeShopMutation = useRemoveShop();
  const toggleShopMutation = useToggleShop();
  const setAutoPublishMutation = useSetShopAutoPublish();
  const fetchShopsMutation = useFetchPrintifyShops();
  const [discoveredShops, setDiscoveredShops] = useState<Array<{ id: string; title: string; sales_channel: string }>>([]);

  const [form, setForm] = useState({
    printify_api_key: "",
    printify_shop_id: "",
    removebg_api_key: "",
  });

  const [primaryAutoPublish, setPrimaryAutoPublish] = useState(false);
  const [tshirtMargin, setTshirtMargin] = useState(100);
  const [stickerMargin, setStickerMargin] = useState(100);
  const [newShop, setNewShop] = useState({ shop_id: "", marketplace: "", label: "" });

  useEffect(() => {
    if (settings) {
      setForm({
        printify_api_key: "",
        printify_shop_id: settings.printify_shop_id || "",
        removebg_api_key: "",
      });
      setPrimaryAutoPublish(settings.auto_publish ?? false);
    }
  }, [settings]);

  const update = (key: string, val: string) => setForm((p) => ({ ...p, [key]: val }));

  const handleSave = async () => {
    const body: Record<string, any> = {};
    Object.entries(form).forEach(([k, v]) => {
      if (v) body[k] = v;
    });
    // Always send auto_publish for primary shop
    body.auto_publish = primaryAutoPublish;
    if (Object.keys(body).length === 0) return;

    if (body.removebg_api_key) {
      try {
        await validateMutation.mutateAsync(body.removebg_api_key);
      } catch {
        return;
      }
    }

    saveMutation.mutate(body);
  };

  const handleAddShop = () => {
    if (!newShop.shop_id || !newShop.marketplace) return;
    addShopMutation.mutate(newShop, {
      onSuccess: () => setNewShop({ shop_id: "", marketplace: "", label: "" }),
    });
  };

  function StatusIcon({ has }: { has: boolean }) {
    return has ? <CheckCircle2 className="h-4 w-4 text-green-500" /> : <XCircle className="h-4 w-4 text-muted-foreground" />;
  }

  if (isLoading) {
    return <div className="space-y-4">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div>;
  }

  const isSaving = saveMutation.isPending || validateMutation.isPending;

  return (
    <Card>
      <CardHeader>
        <CardTitle>API Configuration</CardTitle>
        <CardDescription>
          Configure your third-party service credentials for the POD pipeline. AI analysis and image generation are powered by Lovable AI — no external AI keys needed.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* AI Banner */}
        <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-4 flex items-start gap-3">
          <Sparkles className="h-5 w-5 text-blue-500 mt-0.5 shrink-0" />
          <p className="text-sm">
            <span className="font-medium">AI Powered by Lovable AI</span> — Content analysis uses{" "}
            <span className="font-medium">Gemini 3 Flash</span> and design generation uses{" "}
            <span className="font-medium">Nano Banana Pro</span>. These are built-in and require no API keys. Usage is billed through your Lovable AI balance.
          </p>
        </div>

        {/* Printify */}
        <div>
          <h3 className="flex items-center gap-2 font-medium mb-3">
            <Printer className="h-4 w-4" /> Printify
          </h3>
          <Separator className="mb-4" />
          <div className="space-y-4">
            <div>
              <label className="text-sm flex items-center gap-2 mb-1">
                Printify API Key <StatusIcon has={settings?.has_printify_api_key} />
              </label>
              <Input type="password" placeholder="Enter Printify API Key" value={form.printify_api_key} onChange={(e) => update("printify_api_key", e.target.value)} />
            </div>
            <div>
              <label className="text-sm flex items-center gap-2 mb-1">
                Primary Shop ID <StatusIcon has={settings?.has_printify_shop_id} />
              </label>
              <Input type="text" placeholder="Enter Printify Shop ID" value={form.printify_shop_id} onChange={(e) => update("printify_shop_id", e.target.value)} />
              <p className="text-xs text-muted-foreground mt-1">This is your default/primary Printify shop.</p>
            </div>
            <div className="flex items-center justify-between p-3 rounded-md border border-border bg-muted/30">
              <div>
                <Label className="text-sm font-medium">Auto-publish (Primary Shop)</Label>
                <p className="text-xs text-muted-foreground">When enabled, products sent to this shop will be published immediately instead of saved as draft.</p>
              </div>
              <Switch
                checked={primaryAutoPublish}
                onCheckedChange={setPrimaryAutoPublish}
              />
            </div>
          </div>
        </div>

        {/* Additional Shops */}
        <div>
          <h3 className="flex items-center gap-2 font-medium mb-3">
            <Store className="h-4 w-4" /> Additional Shops
          </h3>
          <Separator className="mb-4" />
          <p className="text-xs text-muted-foreground mb-3">
            Add Printify shops linked to specific marketplaces. Products will be posted to all active shops with marketplace-appropriate titles.
          </p>

          {/* Fetch Shops from Printify */}
          <div className="mb-4">
            <Button
              variant="outline"
              size="sm"
              className="text-xs h-8"
              onClick={async () => {
                const shops = await fetchShopsMutation.mutateAsync();
                setDiscoveredShops(shops);
              }}
              disabled={fetchShopsMutation.isPending || !settings?.has_printify_api_key}
            >
              {fetchShopsMutation.isPending ? <Loader2 className="h-3 w-3 mr-1.5 animate-spin" /> : <Download className="h-3 w-3 mr-1.5" />}
              Fetch Shops from Printify
            </Button>
            {!settings?.has_printify_api_key && (
              <p className="text-[10px] text-muted-foreground mt-1">Save your Printify API key first to fetch shops.</p>
            )}
          </div>

          {/* Discovered shops */}
          {discoveredShops.length > 0 && (
            <div className="mb-4 p-3 rounded-md border border-primary/30 bg-primary/5 space-y-2">
              <p className="text-xs font-medium">Discovered {discoveredShops.length} shop(s) from Printify:</p>
              {discoveredShops.map((shop) => {
                const alreadyAdded = additionalShops.some((s: any) => s.shop_id === shop.id) || form.printify_shop_id === shop.id;
                const guessedMarketplace = shop.sales_channel?.toLowerCase().includes("etsy") ? "etsy"
                  : shop.sales_channel?.toLowerCase().includes("ebay") ? "ebay"
                  : shop.sales_channel?.toLowerCase().includes("shopify") ? "shopify"
                  : "other";
                return (
                  <div key={shop.id} className="flex items-center gap-2 p-2 rounded-md border border-border bg-background">
                    <div className="flex-1 min-w-0">
                      <span className="text-xs font-medium">{shop.title}</span>
                      <span className="text-[10px] text-muted-foreground ml-2">ID: {shop.id}</span>
                      <span className="text-[10px] text-muted-foreground ml-2">({shop.sales_channel})</span>
                    </div>
                    {alreadyAdded ? (
                      <Badge variant="secondary" className="text-[10px] shrink-0">Already added</Badge>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-6 px-2 text-[10px] shrink-0"
                        onClick={() => {
                          addShopMutation.mutate(
                            { shop_id: shop.id, marketplace: guessedMarketplace, label: shop.title },
                            { onSuccess: () => setDiscoveredShops((prev) => prev.filter((s) => s.id !== shop.id)) }
                          );
                        }}
                        disabled={addShopMutation.isPending}
                      >
                        <Plus className="h-2.5 w-2.5 mr-0.5" /> Add
                      </Button>
                    )}
                  </div>
                );
              })}
              <Button
                variant="ghost"
                size="sm"
                className="text-[10px] h-6 px-2"
                onClick={() => setDiscoveredShops([])}
              >
                Dismiss
              </Button>
            </div>
          )}

          {/* Existing shops list */}
          {additionalShops.length > 0 && (
            <div className="space-y-2 mb-4">
              {additionalShops.map((shop: any) => (
                <div key={shop.id} className="flex items-center gap-2 p-2 rounded-md border border-border bg-muted/30">
                  <Switch
                    checked={shop.is_active}
                    onCheckedChange={(checked) => toggleShopMutation.mutate({ id: shop.id, is_active: checked })}
                    className="shrink-0"
                    aria-label={`Toggle ${shop.label || shop.marketplace} active`}
                  />
                  <Badge className={`text-[10px] shrink-0 ${MARKETPLACE_COLORS[shop.marketplace] || MARKETPLACE_COLORS.other}`}>
                    {shop.marketplace}
                  </Badge>
                  <span className="text-xs font-mono truncate flex-1">{shop.shop_id}</span>
                  {shop.label && <span className="text-xs text-muted-foreground truncate">{shop.label}</span>}
                  <div className="flex items-center gap-1 shrink-0 border-l border-border pl-2 ml-1">
                    <span className="text-[10px] text-muted-foreground">{shop.auto_publish ? "Publish" : "Draft"}</span>
                    <Switch
                      checked={shop.auto_publish ?? false}
                      onCheckedChange={(checked) => setAutoPublishMutation.mutate({ id: shop.id, auto_publish: checked })}
                      className="shrink-0 scale-75"
                      aria-label={`Auto-publish for ${shop.label || shop.marketplace}`}
                    />
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0 shrink-0 text-destructive hover:text-destructive"
                    onClick={() => removeShopMutation.mutate(shop.id)}
                    disabled={removeShopMutation.isPending}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))}
            </div>
          )}

          {/* Add new shop */}
          <div className="space-y-2 p-3 rounded-md border border-dashed border-border">
            <div className="grid grid-cols-2 gap-2">
              <Input
                placeholder="Shop ID"
                value={newShop.shop_id}
                onChange={(e) => setNewShop((p) => ({ ...p, shop_id: e.target.value }))}
                className="text-xs h-8"
              />
              <Select value={newShop.marketplace} onValueChange={(v) => setNewShop((p) => ({ ...p, marketplace: v }))}>
                <SelectTrigger className="text-xs h-8">
                  <SelectValue placeholder="Marketplace" />
                </SelectTrigger>
                <SelectContent>
                  {MARKETPLACE_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      <span>{opt.label}</span>
                      <span className="text-muted-foreground ml-1">({opt.description})</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-2">
              <Input
                placeholder="Label (optional, e.g. 'My eBay Store')"
                value={newShop.label}
                onChange={(e) => setNewShop((p) => ({ ...p, label: e.target.value }))}
                className="text-xs h-8 flex-1"
              />
              <Button
                variant="outline"
                size="sm"
                className="h-8 px-3 text-xs shrink-0"
                onClick={handleAddShop}
                disabled={!newShop.shop_id || !newShop.marketplace || addShopMutation.isPending}
              >
                {addShopMutation.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Plus className="h-3 w-3 mr-1" />}
                Add Shop
              </Button>
            </div>
          </div>
        </div>

        {/* Remove.bg */}
        <div>
          <h3 className="flex items-center gap-2 font-medium mb-3">
            <Eraser className="h-4 w-4" /> Remove.bg
          </h3>
          <Separator className="mb-4" />
          <div>
            <label className="text-sm flex items-center gap-2 mb-1">
              Remove.bg API Key <StatusIcon has={settings?.has_removebg_api_key} />
            </label>
            <Input type="password" placeholder="Enter Remove.bg API Key" value={form.removebg_api_key} onChange={(e) => update("removebg_api_key", e.target.value)} />
            <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
              <ShieldCheck className="h-3 w-3" /> Key will be validated against Remove.bg before saving
            </p>
          </div>
        </div>

        <Button className="w-full" onClick={handleSave} disabled={isSaving}>
          {isSaving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
          {validateMutation.isPending ? "Validating key..." : "Save Settings"}
        </Button>
      </CardContent>
    </Card>
  );
}
