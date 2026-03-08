import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { X, Plus, ChevronDown, Eye, CheckCircle2, AlertTriangle } from "lucide-react";
import { useUpdateListing, usePrintifyProviders } from "@/hooks/usePodListings";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";

interface Shop {
  shop_id: string;
  marketplace: string;
  label: string;
}

interface Props {
  listing: any;
  shops?: Shop[];
}

function CharCounter({ value, max }: { value: string; max: number }) {
  const len = value.length;
  const over = len > max;
  return (
    <span className={`text-[10px] ${over ? "text-destructive font-medium" : "text-muted-foreground"}`}>
      {len}/{max}{over && " ⚠ over limit"}
    </span>
  );
}

export default function ListingEditor({ listing, shops = [] }: Props) {
  const [title, setTitle] = useState(listing.title || "");
  const [description, setDescription] = useState(listing.description || "");
  const [tags, setTags] = useState<string[]>(listing.tags || []);
  const [etsyTitle, setEtsyTitle] = useState(listing.etsy_title || "");
  const [ebayTitle, setEbayTitle] = useState(listing.ebay_title || "");
  const [blueprintId, setBlueprintId] = useState(listing.printify_blueprint_id || "");
  const [printProviderId, setPrintProviderId] = useState(listing.printify_print_provider_id || "");
  const [newTag, setNewTag] = useState("");
  const updateListing = useUpdateListing();
  const { data: providers, isLoading: providersLoading, isError: providersError } = usePrintifyProviders(listing.printify_blueprint_id || blueprintId || null);

  useEffect(() => {
    setTitle(listing.title || "");
    setDescription(listing.description || "");
    setTags(listing.tags || []);
    setEtsyTitle(listing.etsy_title || "");
    setEbayTitle(listing.ebay_title || "");
    setBlueprintId(listing.printify_blueprint_id || "");
    setPrintProviderId(listing.printify_print_provider_id || "");
  }, [listing.id]);

  const save = (updates: Record<string, any>) => {
    updateListing.mutate({ id: listing.id, ...updates });
  };

  const removeTag = (index: number) => {
    const next = tags.filter((_, i) => i !== index);
    setTags(next);
    save({ tags: next });
  };

  const addTag = () => {
    const t = newTag.trim();
    if (!t || tags.includes(t)) return;
    const next = [...tags, t];
    setTags(next);
    setNewTag("");
    save({ tags: next });
  };

  const productLabel = listing.product_type === "sticker" ? "🏷️ Sticker" : "👕 T-Shirt";

  return (
    <div className="border border-border rounded-lg p-3 space-y-3">
      <div className="flex items-center justify-between">
        <Badge variant="outline" className="text-[10px]">{productLabel}</Badge>
        {listing.is_approved && <Badge className="text-[10px] bg-green-600">Approved</Badge>}
      </div>

      <div>
        <label className="text-[10px] font-medium text-muted-foreground mb-0.5 block">Title</label>
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onBlur={() => title !== listing.title && save({ title })}
          className="text-xs h-8"
        />
      </div>

      <div>
        <label className="text-[10px] font-medium text-muted-foreground mb-0.5 block">Description</label>
        <Textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          onBlur={() => description !== listing.description && save({ description })}
          className="text-xs min-h-[80px] resize-y"
        />
      </div>

      <div>
        <label className="text-[10px] font-medium text-muted-foreground mb-0.5 block">Tags</label>
        <div className="flex flex-wrap gap-1 mb-1.5">
          {tags.map((tag: string, i: number) => (
            <Badge key={i} variant="secondary" className="text-[10px] gap-1 pr-1">
              {tag}
              <button onClick={() => removeTag(i)} className="hover:opacity-70"><X className="h-2.5 w-2.5" /></button>
            </Badge>
          ))}
        </div>
        <div className="flex gap-1">
          <Input
            value={newTag}
            onChange={(e) => setNewTag(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addTag())}
            placeholder="Add tag…"
            className="text-xs h-7 flex-1"
          />
          <Button variant="outline" size="sm" className="h-7 px-2 text-[10px]" onClick={addTag}>
            <Plus className="h-2.5 w-2.5" />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-[10px] font-medium text-muted-foreground mb-0.5 flex items-center justify-between">
            <span>Etsy Title</span>
            <CharCounter value={etsyTitle} max={140} />
          </label>
          <Input
            value={etsyTitle}
            onChange={(e) => setEtsyTitle(e.target.value)}
            onBlur={() => etsyTitle !== listing.etsy_title && save({ etsy_title: etsyTitle })}
            className="text-xs h-7"
          />
        </div>
        <div>
          <label className="text-[10px] font-medium text-muted-foreground mb-0.5 flex items-center justify-between">
            <span>eBay Title</span>
            <CharCounter value={ebayTitle} max={80} />
          </label>
          <Input
            value={ebayTitle}
            onChange={(e) => setEbayTitle(e.target.value)}
            onBlur={() => ebayTitle !== listing.ebay_title && save({ ebay_title: ebayTitle })}
            className={`text-xs h-7 ${ebayTitle.length > 80 ? "border-destructive" : ""}`}
          />
        </div>
      </div>

      {/* Printify Configuration */}
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-[10px] font-medium text-muted-foreground mb-0.5 block">Blueprint ID</label>
          <Input
            value={blueprintId}
            onChange={(e) => setBlueprintId(e.target.value)}
            onBlur={() => blueprintId !== (listing.printify_blueprint_id || "") && save({ printify_blueprint_id: blueprintId || null })}
            placeholder="e.g. 1268"
            className="text-xs h-7"
          />
        </div>
        <div>
          <label className="text-[10px] font-medium text-muted-foreground mb-0.5 block">Print Provider</label>
          {providersLoading ? (
            <Skeleton className="h-7 w-full rounded-md" />
          ) : providersError || !providers || providers.length === 0 ? (
            <>
              <Input
                value={printProviderId}
                onChange={(e) => setPrintProviderId(e.target.value)}
                onBlur={() => printProviderId !== (listing.printify_print_provider_id || "") && save({ printify_print_provider_id: printProviderId || null })}
                placeholder={!blueprintId ? "Enter Blueprint ID first" : "e.g. 99"}
                className="text-xs h-7"
              />
              {blueprintId && providersError && (
                <p className="text-[9px] text-destructive mt-0.5">Could not load providers</p>
              )}
              {blueprintId && providers && providers.length === 0 && (
                <p className="text-[9px] text-muted-foreground mt-0.5">No providers found for this blueprint</p>
              )}
            </>
          ) : (
            <Select
              value={printProviderId ? String(printProviderId) : undefined}
              onValueChange={(val) => {
                setPrintProviderId(val);
                save({ printify_print_provider_id: val });
              }}
            >
              <SelectTrigger className="text-xs h-7">
                <SelectValue placeholder="Select provider…" />
              </SelectTrigger>
              <SelectContent>
                {providers.map((p) => (
                  <SelectItem key={p.id} value={String(p.id)} className="text-xs">
                    {p.title}{p.location ? ` (${p.location})` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      </div>

      {listing.seo_keywords?.length > 0 && (
        <div>
          <label className="text-[10px] font-medium text-muted-foreground mb-0.5 block">SEO Keywords</label>
          <div className="flex flex-wrap gap-1">
            {listing.seo_keywords.map((kw: string, i: number) => (
              <Badge key={i} variant="outline" className="text-[10px]">{kw}</Badge>
            ))}
          </div>
        </div>
      )}

      {/* Marketplace Preview */}
      {shops.length > 0 && (
        <Collapsible>
          <CollapsibleTrigger className="flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground hover:text-foreground transition-colors w-full group">
            <Eye className="h-3 w-3" />
            <span>Marketplace Preview</span>
            <ChevronDown className="h-3 w-3 ml-auto transition-transform group-data-[state=open]:rotate-180" />
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-2 space-y-2">
            {shops.map((shop) => {
              const isEbay = shop.marketplace.toLowerCase() === "ebay";
              const isEtsy = shop.marketplace.toLowerCase() === "etsy";
              const resolvedTitle = isEbay ? (ebayTitle || title) : isEtsy ? (etsyTitle || title) : title;
              const charLimit = isEbay ? 80 : isEtsy ? 140 : null;
              const isOver = charLimit ? resolvedTitle.length > charLimit : false;

              const marketplaceColors: Record<string, string> = {
                ebay: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
                etsy: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
                shopify: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
                default: "bg-primary/10 text-primary",
              };
              const badgeClass = marketplaceColors[shop.marketplace.toLowerCase()] || marketplaceColors.default;

              return (
                <div key={shop.shop_id} className="rounded-md border border-border bg-muted/30 p-2.5 space-y-1.5">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-medium">{shop.label}</span>
                    <Badge className={`text-[9px] px-1.5 py-0 ${badgeClass}`}>{shop.marketplace}</Badge>
                    <div className="ml-auto flex items-center gap-1">
                      {charLimit && (
                        <span className={`text-[10px] ${isOver ? "text-destructive font-medium" : "text-muted-foreground"}`}>
                          {resolvedTitle.length}/{charLimit}
                        </span>
                      )}
                      {isOver ? (
                        <AlertTriangle className="h-3 w-3 text-destructive" />
                      ) : (
                        <CheckCircle2 className="h-3 w-3 text-green-600" />
                      )}
                    </div>
                  </div>
                  <div className="text-[11px]">
                    <span className="text-muted-foreground">Title: </span>
                    <span className={isOver ? "text-destructive" : ""}>{resolvedTitle || "—"}</span>
                  </div>
                  <div className="text-[11px]">
                    <span className="text-muted-foreground">Description: </span>
                    <span className="line-clamp-2">{description || "—"}</span>
                  </div>
                </div>
              );
            })}
          </CollapsibleContent>
        </Collapsible>
      )}
    </div>
  );
}
