import { useEffect, useState } from "react";
import { Helmet } from "react-helmet-async";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

export default function InsightReelSuccess() {
  const [messageSent, setMessageSent] = useState(false);

  useEffect(() => {
    // Attempt to notify the Chrome Extension that payment succeeded
    try {
      if (typeof window !== "undefined" && (window as any).chrome?.runtime?.sendMessage) {
        // Use a generic approach — extension listens for messages on the page
        (window as any).chrome.runtime.sendMessage(
          // If extension ID is known, pass it here. Otherwise use wildcard approach below.
          undefined,
          { type: "INSIGHTREEL_PAYMENT_SUCCESS" },
          (response: any) => {
            if (response?.received) setMessageSent(true);
          }
        );
      }
    } catch {
      // Not in extension context — that's fine
    }

    // Fallback: postMessage for externally_connectable or content scripts
    window.postMessage({ type: "INSIGHTREEL_PAYMENT_SUCCESS" }, "*");
  }, []);

  return (
    <>
      <Helmet>
        <title>Payment Successful – InsightReel | Acme.zone</title>
      </Helmet>

      <Header />

      <main className="flex-1 flex items-center justify-center py-20">
        <div className="container max-w-md mx-auto px-4">
          <Card className="elevated text-center">
            <CardContent className="pt-8 pb-8 space-y-4">
              <CheckCircle2 className="h-16 w-16 mx-auto text-primary" />
              <h1 className="text-2xl font-bold">You're Pro!</h1>
              <p className="text-muted-foreground">
                Your InsightReel Pro subscription is now active. You can start using unlimited analyses right away.
              </p>

              {messageSent && (
                <p className="text-xs text-muted-foreground flex items-center justify-center gap-1">
                  <CheckCircle2 className="h-3 w-3" /> Extension notified
                </p>
              )}

              <div className="pt-4 flex flex-col gap-2">
                <Button asChild>
                  <Link to="/insightreel/dashboard">Go to InsightReel Dashboard</Link>
                </Button>
                <Button variant="outline" asChild>
                  <Link to="/insightreel/pricing">View Plan</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>

      <Footer />
    </>
  );
}
