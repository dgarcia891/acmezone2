import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2, ExternalLink } from "lucide-react";

interface Props {
  trelloCardUrl?: string | null;
  onReset: () => void;
}

export default function ApprovalSuccess({ trelloCardUrl, onReset }: Props) {
  return (
    <Card>
      <CardContent className="flex flex-col items-center justify-center py-12 space-y-4">
        <CheckCircle2 className="h-16 w-16 text-green-500" />
        <h2 className="text-xl font-semibold">Approved & Sent to Trello</h2>
        {trelloCardUrl && (
          <a
            href={trelloCardUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:underline flex items-center gap-1"
          >
            View Trello Card <ExternalLink className="h-4 w-4" />
          </a>
        )}
        <Button onClick={onReset} className="mt-4">Start New Idea</Button>
      </CardContent>
    </Card>
  );
}
