import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2 } from "lucide-react";

interface Props {
  onReset: () => void;
}

export default function ApprovalSuccess({ onReset }: Props) {
  return (
    <Card>
      <CardContent className="flex flex-col items-center justify-center py-12 space-y-4">
        <CheckCircle2 className="h-16 w-16 text-green-500" />
        <h2 className="text-xl font-semibold">Design Approved & Listings Generated</h2>
        <p className="text-sm text-muted-foreground text-center">
          Your design has been approved and listing content has been generated. Review and edit listings on the Kanban board.
        </p>
        <Button onClick={onReset} className="mt-4">Start New Idea</Button>
      </CardContent>
    </Card>
  );
}
