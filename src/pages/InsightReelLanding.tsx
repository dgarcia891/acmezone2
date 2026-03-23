import { Helmet } from "react-helmet-async";
import JsonLd, { softwareAppSchema, faqSchema, SITE_URL } from "@/components/seo/JsonLd";
import FAQSection from "@/components/seo/FAQSection";
import { Link, useNavigate } from "react-router-dom";
import { useState } from "react";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  Check,
  Play,
  Brain,
  BarChart3,
  Zap,
  Shield,
  Key,
  Sparkles,
  ArrowRight,
  Chrome,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { trackEvent } from "@/utils/analytics";

const heroFeatures = [
  { icon: Brain, title: "AI-Powered Analysis", desc: "Get sentiment, key takeaways, and patterns from any video transcript." },
  { icon: Zap, title: "Instant Results", desc: "Analyze transcripts in seconds — no manual review needed." },
  { icon: Shield, title: "Privacy First", desc: "Your data stays secure. We only process what you send." },
  { icon: BarChart3, title: "Usage Dashboard", desc: "Track your analyses and manage your subscription effortlessly." },
];

const insightReelFaqs = [
  { question: "What is InsightReel?", answer: "InsightReel is a Chrome extension that uses AI to analyze video transcripts. It extracts key insights, sentiment analysis, and takeaways from any video — right in your browser." },
  { question: "How many free analyses do I get?", answer: "You get 3 free analyses with no credit card required. After that, you can upgrade to Pro ($8/month for 100 analyses) or use your own API key with the BYOK plan ($3/month, unlimited)." },
  { question: "What types of videos can I analyze?", answer: "InsightReel works with any video that has a transcript — YouTube, Vimeo, educational platforms, webinars, and more. If there's a transcript, InsightReel can analyze it." },
  { question: "Is my data private?", answer: "Yes. We only process the transcript text you send for analysis. We don't store video content or share your data with third parties." },
  { question: "How do I install InsightReel?", answer: "Visit the Chrome Web Store, search for InsightReel, and click 'Add to Chrome'. Sign in with your account and you're ready to analyze videos instantly." },
];

const tiers = [
  {
    name: "Free Trial",
    price: "Free",
    priceSub: "3 analyses included",
    description: "Try InsightReel risk-free — no credit card required.",
    features: [
      "3 free video analyses",
      "AI-powered insights",
      "Sentiment detection",
      "Key takeaway extraction",
    ],
    cta: "Get Started Free",
    variant: "outline" as const,
    highlight: false,
  },
  {
    name: "Pro",
    price: "$9.99",
    priceSub: "/month",
    description: "Unlimited analyses for power users who need daily insights.",
    features: [
      "Unlimited video analyses",
      "Priority processing speed",
      "Usage dashboard & history",
      "Fair-use: 100 analyses/day",
      "Cancel anytime",
    ],
    cta: "Subscribe to Pro",
    variant: "default" as const,
    highlight: true,
  },
  {
    name: "BYOK Lifetime",
    price: "$29",
    priceSub: "one-time",
    description: "Bring your own Gemini API key. Pay once, own it forever.",
    features: [
      "Lifetime access",
      "Use your own Gemini key",
      "No recurring fees",
      "Full feature access",
      "No daily limits",
    ],
    cta: "Buy Lifetime License",
    variant: "outline" as const,
    highlight: false,
  },
];

export default function InsightReelLanding() {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [loading, setLoading] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleWaitlistSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !name) {
      toast({ title: "Error", description: "Please provide both name and email.", variant: "destructive" });
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch("https://bnzylhssukmctoqqtzqy.supabase.co/functions/v1/contact-notify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          email,
          message: "I am interested in joining the InsightReel Beta.",
          source: "InsightReel Beta Waitlist",
          timestamp: new Date().toISOString()
        })
      });

      if (!response.ok) throw new Error("Failed to submit");
      
      trackEvent('join_waitlist', { product: 'insightreel' });
      
      toast({ title: "Success!", description: "You have been added to the beta waitlist. We'll be in touch." });
      setEmail("");
      setName("");
    } catch (err) {
      console.error(err);
      toast({ title: "Error", description: "Failed to join waitlist. Please try again later.", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCta = async (tierName: string) => {
    if (!user) {
      navigate("/auth");
      return;
    }

    if (tierName === "Free Trial") {
      navigate("/insightreel/dashboard");
      return;
    }

    if (tierName === "Pro") {
      setLoading("Pro");
      try {
        const { data, error } = await supabase.functions.invoke("ir-create-checkout", {
          body: { priceType: "monthly" },
        });
        if (error) throw error;
        if (data?.url) window.location.href = data.url;
      } catch {
        toast({ title: "Error", description: "Could not start checkout. Please try again.", variant: "destructive" });
      } finally {
        setLoading(null);
      }
      return;
    }

    // BYOK — future checkout integration
    toast({ title: "Coming Soon", description: "BYOK Lifetime License checkout will be available shortly." });
  };

  return (
    <>
      <Helmet>
        <title>InsightReel | AI Video Transcript Analysis Chrome Extension</title>
        <meta name="description" content="Analyze any video transcript with AI. Get instant insights, sentiment analysis, and key takeaways in seconds. Free trial — 3 analyses, no credit card needed." />
        <link rel="canonical" href="https://acme.zone/insightreel" />
        <meta property="og:type" content="product" />
        <meta property="og:title" content="InsightReel | AI Video Transcript Analysis" />
        <meta property="og:description" content="Analyze any video transcript with AI. Free trial with 3 analyses." />
        <meta property="og:url" content="https://acme.zone/insightreel" />
        <meta property="og:site_name" content="Acme Zone" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="InsightReel | AI Video Transcript Analysis" />
        <meta name="twitter:description" content="Analyze any video transcript with AI. Free trial with 3 analyses." />
        <meta name="keywords" content="AI video analysis, transcript analysis, sentiment analysis, video insights, Chrome extension, InsightReel" />
      </Helmet>

      <JsonLd data={[
        softwareAppSchema({
          name: "InsightReel",
          description: "AI-powered Chrome extension for video transcript analysis. Get instant insights, sentiment analysis, and key takeaways.",
          url: `${SITE_URL}/insightreel`,
          category: "BrowserApplication",
          price: "0",
        }),
        faqSchema(insightReelFaqs),
      ]} />

      <Header />

      <main className="flex-1">
        {/* ── Hero ────────────────────────────────── */}
        <section className="relative pt-24 pb-12 md:pt-32 md:pb-16 overflow-hidden">
          <div aria-hidden="true" className="pointer-events-none absolute -top-40 inset-x-0 flex justify-center">
            <span className="h-[28rem] w-[28rem] rounded-full bg-primary/15 blur-3xl" />
          </div>

          <div className="container max-w-5xl mx-auto px-4 relative z-10 text-center">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 mb-6 text-xs font-semibold tracking-wider uppercase rounded-full bg-primary/10 text-primary">
              <Chrome className="h-3 w-3" /> Coming Soon
            </span>

            <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-6 leading-tight">
              Understand Any Video in{" "}
              <span className="text-gradient-primary">Seconds</span>
            </h1>

            <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed">
              InsightReel uses AI to analyze video transcripts and deliver concise insights,
              sentiment analysis, and key takeaways — right from your browser.
            </p>

            <div className="bg-card elevated p-6 flex flex-col gap-4 max-w-md mx-auto border border-border/50 text-left">
              <div>
                <h3 className="font-semibold text-lg mb-1">Get Early Access</h3>
                <p className="text-sm text-muted-foreground">The InsightReel extension beta is free.</p>
              </div>
              <form onSubmit={handleWaitlistSubmit} className="flex flex-col gap-3">
                <Input 
                  placeholder="Your Name" 
                  value={name} 
                  onChange={(e) => setName(e.target.value)}
                  required
                  className="bg-background"
                />
                <Input 
                  type="email" 
                  placeholder="name@example.com" 
                  value={email} 
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="bg-background"
                />
                <Button type="submit" disabled={isSubmitting} className="w-full">
                  {isSubmitting ? "Joining..." : "Join Beta Waitlist"} <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </form>
            </div>
          </div>
        </section>

        {/* ── Features Grid ──────────────────────── */}
        <section className="pt-8 pb-20">
          <div className="container max-w-5xl mx-auto px-4">
            <div className="text-center mb-14">
              <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">How It Works</h2>
              <p className="text-muted-foreground text-lg max-w-xl mx-auto">
                One click in your browser. Instant, AI-powered transcript analysis.
              </p>
            </div>

            <div className="grid gap-6 sm:grid-cols-2">
              {heroFeatures.map(({ icon: Icon, title, desc }) => (
                <Card key={title} className="elevated">
                  <CardContent className="flex items-start gap-4 pt-6">
                    <div className="shrink-0 flex items-center justify-center h-10 w-10 rounded-lg bg-primary/10">
                      <Icon className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold mb-1">{title}</h3>
                      <p className="text-sm text-muted-foreground leading-relaxed">{desc}</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* ── Pricing Tiers ──────────────────────── */}
        <section className="py-20">
          <div className="container max-w-6xl mx-auto px-4">
            <div className="text-center mb-14">
              <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">
                Simple, Flexible Pricing
              </h2>
              <p className="text-muted-foreground text-lg max-w-xl mx-auto">
                Start free. Upgrade when you're ready.
              </p>
            </div>

            <div className="grid gap-8 md:grid-cols-3 items-stretch">
              {tiers.map((tier) => (
                <Card
                  key={tier.name}
                  className={`elevated flex flex-col ${
                    tier.highlight
                      ? "border-primary/40 ring-2 ring-primary/20 relative"
                      : ""
                  }`}
                >
                  {tier.highlight && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                      <span className="inline-flex items-center gap-1 px-3 py-1 text-xs font-semibold rounded-full bg-primary text-primary-foreground">
                        <Sparkles className="h-3 w-3" /> Most Popular
                      </span>
                    </div>
                  )}

                  <CardHeader className="text-center pb-2 pt-8">
                    <CardTitle className="text-xl">{tier.name}</CardTitle>
                    <CardDescription className="mt-1">{tier.description}</CardDescription>
                    <div className="mt-5">
                      <span className="text-4xl font-extrabold tracking-tight">{tier.price}</span>
                      <span className="text-muted-foreground ml-1 text-sm">{tier.priceSub}</span>
                    </div>
                  </CardHeader>

                  <CardContent className="flex-1 flex flex-col pt-4">
                    <ul className="space-y-3 flex-1">
                      {tier.features.map((f) => (
                        <li key={f} className="flex items-start gap-2 text-sm">
                          <Check className="h-4 w-4 mt-0.5 text-primary shrink-0" />
                          <span>{f}</span>
                        </li>
                      ))}
                    </ul>

                    <Button
                      size="lg"
                      variant={tier.variant}
                      className="w-full mt-8"
                      onClick={() => handleCta(tier.name)}
                      disabled={loading === tier.name}
                    >
                      {loading === tier.name ? "Redirecting…" : tier.cta}
                      {tier.name === "BYOK Lifetime" && <Key className="ml-2 h-4 w-4" />}
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>

            <p className="text-xs text-center text-muted-foreground mt-8">
              All paid plans include secure payment via Stripe. BYOK requires a Google Gemini API key.
            </p>
          </div>
        </section>

        {/* ── CTA Banner ─────────────────────────── */}
        <section className="py-20">
          <div className="container max-w-3xl mx-auto px-4 text-center">
            <Card className="elevated p-8 md:p-12">
              <h2 className="text-2xl md:text-3xl font-bold tracking-tight mb-4">
                Ready to unlock smarter video insights?
              </h2>
              <p className="text-muted-foreground mb-8 max-w-lg mx-auto">
                Join our waitlist for early access to the beta program.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button size="lg" className="hover-scale gap-2" onClick={() => {
                  const el = document.querySelector('form');
                  el?.scrollIntoView({ behavior: 'smooth' });
                }}>
                  Join Waitlist <ArrowRight className="h-4 w-4" />
                </Button>
                <Button size="lg" variant="outline" className="hover-scale" asChild>
                  <Link to="/insightreel/pricing">View Full Pricing</Link>
                </Button>
              </div>
            </Card>
          </div>
        </section>
        <FAQSection faqs={insightReelFaqs} />
      </main>

      <Footer />
    </>
  );
}
