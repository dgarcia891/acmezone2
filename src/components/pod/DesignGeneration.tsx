import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ThumbsDown, Send, RefreshCw, ImageIcon } from "lucide-react";

interface Props {
  idea: any;
  productType: string;
  onReject: () => void;
  onApprove: () => void;
  onRegenerate: (type: "sticker" | "tshirt") => void;
  isLoading: boolean;
  isApproving: boolean;
}

function DesignCard({ label, url, prompt, onRegenerate, isLoading }: {
  label: string; url?: string | null; prompt?: string; onRegenerate: () => void; isLoading: boolean;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{label}</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="aspect-square w-full rounded-lg" />
        ) : url ? (
          <img src={url} alt={label} className="rounded-lg object-contain w-full aspect-square bg-muted" />
        ) : (
          <div className="aspect-square w-full rounded-lg bg-muted flex flex-col items-center justify-center gap-2">
            <ImageIcon className="h-12 w-12 text-muted-foreground" />
            <p className="text-sm text-muted-foreground text-center px-4">
              Image generation failed — design prompt saved for manual generation
            </p>
          </div>
        )}
        <Button variant="outline" size="sm" className="mt-3" onClick={onRegenerate} disabled={isLoading}>
          <RefreshCw className="h-3 w-3 mr-1" />
          Regenerate
        </Button>
      </CardContent>
    </Card>
  );
}

export default function DesignGeneration({ idea, productType, onReject, onApprove, onRegenerate, isLoading, isApproving }: Props) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {(productType === "both" || productType === "sticker") && (
          <DesignCard
            label="Sticker Design"
            url={idea?.sticker_design_url}
            prompt={idea?.sticker_design_prompt}
            onRegenerate={() => onRegenerate("sticker")}
            isLoading={isLoading}
          />
        )}
        {(productType === "both" || productType === "tshirt") && (
          <DesignCard
            label="T-Shirt Design"
            url={idea?.tshirt_design_url}
            prompt={idea?.tshirt_design_prompt}
            onRegenerate={() => onRegenerate("tshirt")}
            isLoading={isLoading}
          />
        )}
      </div>

      <div className="flex justify-end gap-3">
        <Button variant="outline" onClick={onReject} disabled={isLoading || isApproving}>
          <ThumbsDown className="h-4 w-4 mr-2" />
          Reject
        </Button>
        <Button
          onClick={onApprove}
          disabled={isLoading || isApproving}
          className="bg-green-600 hover:bg-green-700"
        >
          <Send className="h-4 w-4 mr-2" />
          Approve & Send to Trello
        </Button>
      </div>
    </div>
  );
}
