import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export default function InsightReelSubscribe() {
  const [searchParams] = useSearchParams();
  const submitterId = searchParams.get("submitterId");
  const canceled = searchParams.get("canceled");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function createCheckout() {
      if (!submitterId) {
        setError("Missing submitterId parameter. Please initiate subscription from the extension.");
        return;
      }

      if (canceled) {
        setError("Checkout was canceled. You can try subscribing again via the extension.");
        return;
      }

      try {
        const res = await supabase.functions.invoke("ir-dashboard-checkout", {
          body: { submitterId }
        });

        if (res.error || !res.data?.url) {
          setError(res.error?.message || res.data?.error || "Failed to create checkout session.");
          return;
        }

        // Redirect to Stripe Checkout
        window.location.href = res.data.url;
      } catch (err: any) {
        setError(err.message || "An unexpected error occurred.");
      }
    }

    createCheckout();
  }, [submitterId, canceled]);

  return (
    <>
      <Helmet>
        <title>Subscribe to InsightReel Dashboard | Acme.zone</title>
      </Helmet>
      <Header />
      <main className="flex-1 flex items-center justify-center py-20 min-h-[60vh]">
        <div className="container max-w-md mx-auto px-4">
          <Card className="elevated text-center">
            <CardContent className="pt-8 pb-8 space-y-4">
              {error ? (
                <>
                  <AlertCircle className="h-12 w-12 mx-auto text-destructive" />
                  <h1 className="text-xl font-semibold text-destructive">Subscription Error</h1>
                  <p className="text-muted-foreground">{error}</p>
                </>
              ) : (
                <>
                  <Loader2 className="h-12 w-12 mx-auto text-primary animate-spin" />
                  <h1 className="text-xl font-semibold">Preparing Checkout...</h1>
                  <p className="text-muted-foreground text-sm">
                    You are being redirected to our secure payment processor to complete your dashboard subscription.
                  </p>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
      <Footer />
    </>
  );
}
