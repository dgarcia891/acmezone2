import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { X, Plus, ChevronDown, Eye, CheckCircle2, AlertTriangle } from "lucide-react";
import { useUpdateListing } from "@/hooks/usePodListings";

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

export default function ListingEditor({ listing }: Props) {
  const [title, setTitle] = useState(listing.title || "");
  const [description, setDescription] = useState(listing.description || "");
  const [tags, setTags] = useState<string[]>(listing.tags || []);
  const [etsyTitle, setEtsyTitle] = useState(listing.etsy_title || "");
  const [ebayTitle, setEbayTitle] = useState(listing.ebay_title || "");
  const [blueprintId, setBlueprintId] = useState(listing.printify_blueprint_id || "");
  const [printProviderId, setPrintProviderId] = useState(listing.printify_print_provider_id || "");
  const [newTag, setNewTag] = useState("");
  const updateListing = useUpdateListing();

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
          <label className="text-[10px] font-medium text-muted-foreground mb-0.5 block">Print Provider ID</label>
          <Input
            value={printProviderId}
            onChange={(e) => setPrintProviderId(e.target.value)}
            onBlur={() => printProviderId !== (listing.printify_print_provider_id || "") && save({ printify_print_provider_id: printProviderId || null })}
            placeholder="e.g. 99"
            className="text-xs h-7"
          />
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
    </div>
  );
}
