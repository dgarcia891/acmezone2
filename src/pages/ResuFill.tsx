import { Helmet } from "react-helmet-async";
import JsonLd, { softwareAppSchema, breadcrumbSchema, SITE_URL } from "@/components/seo/JsonLd";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { WaitlistForm } from "@/components/ui/WaitlistForm";
import { 
  Zap, 
  Brain, 
  ShieldCheck, 
  FileText, 
  CheckCircle2, 
  XCircle,
  Chrome
} from "lucide-react";

const features = [
  {
    icon: Brain,
    title: "Passive Learning",
    description: "Start applying immediately. ResuFill learns new fields and answers inline without tedious upfront setup."
  },
  {
    icon: Zap,
    title: "Multi-Page Auto-Advance",
    description: "Breeze through paginated Workday or Taleo forms. ResuFill fills and advances automatically."
  },
  {
    icon: FileText,
    title: "Paste & Upload Anywhere",
    description: "Seamlessly inject your PDF resume or paste plain text directly into complex HR forms."
  },
  {
    icon: ShieldCheck,
    title: "100% Local Privacy",
    description: "Your data stays on your device. Period. No cloud syncing or tracking in our free tier."
  }
];

export default function ResuFill() {

  return (
    <>
      <Helmet>
        <title>ResuFill | Intelligent Job Application Autofill</title>
        <meta name="description" content="ResuFill is a Chrome extension that learns from your behavior to automatically fill job applications across Workday, Greenhouse, and more. Join the free beta." />
        <link rel="canonical" href="https://acme.zone/products/resufill" />
        <meta property="og:type" content="product" />
        <meta property="og:title" content="ResuFill | Intelligent Job Application Autofill" />
        <meta property="og:description" content="A Chrome extension that learns from your behavior to effortlessly fill job applications." />
        <meta property="og:url" content="https://acme.zone/products/resufill" />
        <meta property="og:image" content={`${SITE_URL}/lovable-uploads/resufill-hero.png`} />
      </Helmet>

      <JsonLd data={[
        softwareAppSchema({
          name: "ResuFill",
          description: "Intelligent Job Application Autofill Chrome Extension.",
          url: `${SITE_URL}/products/resufill`,
          category: "BrowserApplication",
          price: "0",
        }),
        breadcrumbSchema([
          { name: "Home", url: SITE_URL },
          { name: "Products", url: `${SITE_URL}/products` },
          { name: "ResuFill", url: `${SITE_URL}/products/resufill` }
        ])
      ]} />

      <Header />

      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative py-24 md:py-32 overflow-hidden bg-background">
          <div className="absolute inset-0 bg-grid-white/[0.02] bg-[size:32px_32px]" />
          <div className="container max-w-6xl mx-auto px-4 relative z-10 grid lg:grid-cols-2 gap-12 items-center">
            
            <div className="space-y-8 animate-fade-up">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold tracking-wider uppercase rounded-full bg-primary/10 text-primary">
                <Chrome className="h-3 w-3" /> Coming Soon
              </span>
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight leading-tight">
                Job Applications on <span className="text-gradient-primary">Autopilot</span>
              </h1>
              <p className="text-lg md:text-xl text-muted-foreground leading-relaxed">
                Stop re-entering info. ResuFill learns your answers and fills up to 90% of fields across Workday, Greenhouse, and more. Passive learning first, zero configuration needed.
              </p>
              
              <WaitlistForm productName="ResuFill" />
            </div>

            <div className="relative aspect-[4/3] lg:aspect-square w-full rounded-2xl overflow-hidden elevated border border-white/10 animate-fade-in shadow-2xl">
                <img 
                  src="/lovable-uploads/resufill-hero.png" 
                  alt="ResuFill Autofill Interface" 
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-background/80 to-transparent pointer-events-none" />
            </div>

          </div>
        </section>

        {/* Features Section */}
        <section className="py-20 bg-secondary/30">
          <div className="container max-w-5xl mx-auto px-4">
            <div className="text-center mb-16 space-y-4">
              <h2 className="text-3xl md:text-4xl font-bold tracking-tight">Focus on interviews, not forms</h2>
              <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                Unlike competitors that require heavy upfront profile setup, ResuFill starts filling immediately and gets smarter with every submission.
              </p>
            </div>

            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-2">
              {features.map((feature, i) => (
                <Card key={i} className="elevated bg-card border-none">
                  <CardHeader>
                    <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                      <feature.icon className="h-6 w-6 text-primary" />
                    </div>
                    <CardTitle className="text-xl">{feature.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground leading-relaxed">
                      {feature.description}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* Comparison Section */}
        <section className="py-20 border-t border-border/50">
          <div className="container max-w-4xl mx-auto px-4">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold tracking-tight mb-4">Why choose ResuFill?</h2>
              <p className="text-lg text-muted-foreground">See how we stack up against the alternatives.</p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-border">
                    <th className="py-4 px-4 font-semibold text-muted-foreground w-1/3">Feature</th>
                    <th className="py-4 px-4 font-bold text-xl text-primary w-1/3">ResuFill</th>
                    <th className="py-4 px-4 font-semibold text-muted-foreground w-1/3">The Others</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {[
                    { feature: "Privacy-first (Local data)", ours: true, theirs: false },
                    { feature: "Multi-page auto-advance", ours: true, theirs: false },
                    { feature: "On-the-fly learning", ours: true, theirs: false },
                    { feature: "Resume paste + upload", ours: true, theirs: false },
                    { feature: "Basic field autofill", ours: true, theirs: true },
                  ].map((row, i) => (
                    <tr key={i} className="hover:bg-muted/50 transition-colors">
                      <td className="py-4 px-4 font-medium">{row.feature}</td>
                      <td className="py-4 px-4">
                        {row.ours ? <CheckCircle2 className="h-5 w-5 text-green-500" /> : <XCircle className="h-5 w-5 text-muted-foreground/50" />}
                      </td>
                      <td className="py-4 px-4">
                        {row.theirs ? <CheckCircle2 className="h-5 w-5 text-green-500" /> : <XCircle className="h-5 w-5 text-muted-foreground/50" />}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

      </main>
      <Footer />
    </>
  );
}
