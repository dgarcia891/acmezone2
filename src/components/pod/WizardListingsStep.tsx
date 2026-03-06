import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RefreshCw, CheckCircle2, ArrowLeft, Loader2 } from "lucide-react";
import ListingEditor from "./ListingEditor";
import { usePodListings, useGenerateListings, useApproveListings } from "@/hooks/usePodListings";

interface Props {
  idea: any;
  onBack: () => void;
  onApproved: () => void;
}

export default function WizardListingsStep({ idea, onBack, onApproved }: Props) {
  const { data: listings = [], isLoading } = usePodListings(idea?.id ?? null);
  const generateListings = useGenerateListings();
  const approveListings = useApproveListings();

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
