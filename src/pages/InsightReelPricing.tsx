import { Helmet } from "react-helmet-async";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Check, Zap, Shield, BarChart3 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";

const features = [
  "Unlimited video transcript analyses",
  "AI-powered insights & sentiment analysis",
  "Key takeaway extraction",
  "Priority processing speed",
  "Export & share reports",
  "Cancel anytime",
];

export default function InsightReelPricing() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const handleSubscribe = async () => {
    if (!user) {
      toast({ title: "Sign in required", description: "Please sign in to subscribe.", variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("ir-create-checkout", {
        body: { priceType: "monthly" },
      });

      if (error) throw error;
      if (data?.url) {
        window.location.href = data.url;
      }
    } catch (err: any) {
      console.error(err);
      toast({ title: "Error", description: "Could not start checkout. Please try again.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Helmet>
        <title>InsightReel Pro – Pricing | Acme.zone</title>
        <meta name="description" content="Unlock unlimited AI-powered video transcript analysis with InsightReel Pro for $9.99/month." />
      </Helmet>

      <Header />

      <main className="flex-1">
        {/* Hero */}
        <section className="py-20 text-center">
          <div className="container max-w-3xl mx-auto px-4">
            <span className="inline-block px-3 py-1 mb-4 text-xs font-semibold tracking-wider uppercase rounded-full bg-primary/10 text-primary">
              InsightReel
            </span>
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-4">
              Unlock <span className="text-gradient-primary">Pro Insights</span>
            </h1>
            <p className="text-lg text-muted-foreground max-w-xl mx-auto">
              Get unlimited AI-powered video transcript analysis, sentiment detection, and actionable takeaways.
            </p>
          </div>
        </section>

        {/* Pricing Card */}
        <section className="pb-24">
          <div className="container max-w-md mx-auto px-4">
            <Card className="elevated overflow-hidden">
              <CardHeader className="text-center pb-2">
                <CardTitle className="text-2xl">Monthly Pro</CardTitle>
                <CardDescription>Everything you need for deep video insights</CardDescription>
                <div className="mt-4">
                  <span className="text-5xl font-extrabold tracking-tight">$9.99</span>
                  <span className="text-muted-foreground ml-1">/month</span>
                </div>
              </CardHeader>
              <CardContent className="space-y-6 pt-4">
                <ul className="space-y-3">
                  {features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm">
                      <Check className="h-4 w-4 mt-0.5 text-primary shrink-0" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
                <Button
                  size="lg"
                  className="w-full"
                  onClick={handleSubscribe}
                  disabled={loading}
                >
                  {loading ? "Redirecting…" : "Subscribe Now"}
                </Button>
                <p className="text-xs text-center text-muted-foreground">
                  Secure payment via Stripe. Cancel anytime.
                </p>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Trust badges */}
        <section className="pb-20">
          <div className="container max-w-2xl mx-auto px-4">
            <div className="grid grid-cols-3 gap-6 text-center">
              {[
                { icon: Shield, label: "Secure Payments" },
                { icon: Zap, label: "Instant Access" },
                { icon: BarChart3, label: "Usage Dashboard" },
              ].map(({ icon: Icon, label }) => (
                <div key={label} className="flex flex-col items-center gap-2">
                  <Icon className="h-6 w-6 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">{label}</span>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
}
