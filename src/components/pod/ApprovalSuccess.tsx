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
        <h2 className="text-xl font-semibold">Design Approved</h2>
        <p className="text-sm text-muted-foreground text-center">
          Your design has been approved. Listing content will be generated next.
        </p>
        <Button onClick={onReset} className="mt-4">Start New Idea</Button>
      </CardContent>
    </Card>
  );
}
