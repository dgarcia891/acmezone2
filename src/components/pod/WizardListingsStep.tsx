import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { RefreshCw, CheckCircle2, ArrowLeft, Loader2, Store } from "lucide-react";
import ListingEditor from "./ListingEditor";
import { usePodListings, useGenerateListings, useApproveListings } from "@/hooks/usePodListings";
import { usePodSettings } from "@/hooks/usePodPipeline";

const MARKETPLACE_COLORS: Record<string, string> = {
  default: "bg-primary/10 text-primary",
  ebay: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  etsy: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
  shopify: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  other: "bg-muted text-muted-foreground",
};

interface Props {
  idea: any;
  onBack: () => void;
  onApproved: () => void;
}

export default function WizardListingsStep({ idea, onBack, onApproved }: Props) {
  const { data: listings = [], isLoading } = usePodListings(idea?.id ?? null);
  const generateListings = useGenerateListings();
  const approveListings = useApproveListings();
  const { data: settingsData } = usePodSettings();

  const primaryShopId = settingsData?.settings?.printify_shop_id;
  const additionalShops = settingsData?.additional_shops || [];

  const handleApprove = () => {
    approveListings.mutate(idea.id, {
      onSuccess: () => onApproved(),
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
                  <Badge className={`text-[10px] ${MARKETPLACE_COLORS.default}`}>
                    default
                  </Badge>
                  <span className="text-muted-foreground">({primaryShopId})</span>
                </div>
              )}
              {additionalShops
                .filter((s: any) => s.is_active)
                .map((shop: any) => (
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
              <ListingEditor key={listing.id} listing={listing} />
            ))
          )}
        </CardContent>
      </Card>

      <div className="flex justify-between gap-3">
        <Button variant="ghost" onClick={onBack}>
          <ArrowLeft className="h-4 w-4 mr-2" /> Back to Designs
        </Button>
        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={() => generateListings.mutate(idea.id)}
            disabled={generateListings.isPending}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${generateListings.isPending ? "animate-spin" : ""}`} />
            Regenerate
          </Button>
          <Button
            onClick={handleApprove}
            disabled={approveListings.isPending || listings.length === 0}
            className="bg-green-600 hover:bg-green-700"
          >
            {approveListings.isPending ? (
              <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Approving…</>
            ) : (
              <><CheckCircle2 className="h-4 w-4 mr-2" /> Approve Listings</>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
