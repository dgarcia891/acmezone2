import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ThumbsDown, Wand2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  analysis: any;
  productType: string;
  onReject: () => void;
  onGenerate: () => void;
  isLoading: boolean;
}

function ScoreBadge({ score }: { score: number }) {
  return (
    <Badge
      className={cn(
        "text-lg px-3 py-1",
        score >= 7 && "bg-green-500 hover:bg-green-600",
        score >= 4 && score < 7 && "bg-yellow-500 hover:bg-yellow-600 text-black",
        score < 4 && "bg-destructive"
      )}
    >
      {score}/10
    </Badge>
  );
}

function Field({ label, value }: { label: string; value: any }) {
  if (!value) return null;
  return (
    <div>
      <p className="text-sm font-medium text-muted-foreground">{label}</p>
      <p className="text-sm mt-1">{typeof value === "object" ? JSON.stringify(value) : String(value)}</p>
    </div>
  );
}

export default function AnalysisReview({ analysis, productType, onReject, onGenerate, isLoading }: Props) {
  const a = analysis;
  const score = Number(a?.commercial_viability_score) || 0;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center gap-4">
        <CardTitle>Analysis Results</CardTitle>
        <ScoreBadge score={score} />
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <Field label="Content Text" value={a?.content_text && `"${a.content_text}"`} />
            <Field label="Platform" value={a?.platform} />
            <Field label="Engagement Score" value={a?.engagement_score} />
            <Field label="Viral Indicators" value={a?.viral_indicators} />
            <Field label="Target Audience" value={a?.target_audience} />
            <Field label="Copyright Status" value={a?.copyright_status} />
            <Field label="Usage Rights" value={a?.usage_rights} />
            <Field label="Legal Notes" value={a?.legal_notes} />
          </div>
          <div className="space-y-4">
            <Field label="Score Explanation" value={a?.score_explanation} />
            <Field label="Merchandise Applications" value={a?.merchandise_applications} />
            <Field label="Longevity Prediction" value={a?.longevity_prediction} />
            <Field label="Market Positioning" value={a?.market_positioning} />
            <Field label="Font Suggestions" value={a?.font_suggestions} />
            <Field label="Design Considerations" value={a?.design_considerations} />
            <Field label="Product Recommendations" value={a?.product_recommendations} />
            <Field label="Additional Notes" value={a?.additional_notes} />
          </div>
        </div>

        <Separator />

        <div className="bg-muted/50 rounded-lg p-4 space-y-3">
          {(productType === "both" || productType === "sticker") && (
            <div>
              <p className="text-sm font-medium text-muted-foreground">Sticker Design Prompt</p>
              <p className="text-sm mt-1">{a?.sticker_design_prompt}</p>
            </div>
          )}
          {(productType === "both" || productType === "tshirt") && (
            <div>
              <p className="text-sm font-medium text-muted-foreground">T-Shirt Design Prompt</p>
              <p className="text-sm mt-1">{a?.tshirt_design_prompt}</p>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={onReject} disabled={isLoading}>
            <ThumbsDown className="h-4 w-4 mr-2" />
            Reject
          </Button>
          <Button onClick={onGenerate} disabled={isLoading}>
            <Wand2 className="h-4 w-4 mr-2" />
            Generate Designs
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
