import { Helmet } from "react-helmet-async";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";
import { Check, X } from "lucide-react";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
  type CarouselApi,
} from "@/components/ui/carousel";
import { useState, useEffect } from "react";

const IMAGES = [
  "/lovable-uploads/ff84c184-f45b-4bef-ae67-83422faff51b.png",
  "/lovable-uploads/0bc8bf7c-eee5-4bbc-a87d-684fa5ca0f00.png",
];

const FEATURES = [
  { icon: "🔍", title: "Smart Auto-Discovery", desc: "Automatically scans your boards as you browse. The toolbar icon lights up to show matches: Green badge = Exact Match found, Yellow badge = Possible Match found." },
  { icon: "⚡", title: "Lightning-Fast Quick Create", desc: "Turn any webpage into a Trello card with one click. Title pre-filled from the page, description from your highlighted text. Choose board, list, and labels instantly." },
  { icon: "📸", title: "Screenshot Capture", desc: "Capture and attach a screenshot of the visible page to any card — new or existing — directly from the popup." },
  { icon: "📎", title: "File Attachments", desc: "Attach local files from your computer to cards during creation." },
  { icon: "💬", title: "Inline Comments", desc: "Add comments to any card without opening Trello. Highlighted text is automatically suggested as the comment." },
  { icon: "🏢", title: "Domain Intelligence", desc: "Built-in smart parsers for LinkedIn, Indeed, Glassdoor, and GitHub. Extracts company names, job IDs, ticket numbers, and PR references automatically." },
  { icon: "🔗", title: "Link Pages to Cards", desc: "Link the current page to an existing card with one click." },
  { icon: "✏️", title: "Full Card Management", desc: "Edit titles, move between lists and boards, preview descriptions, and delete cards from the popup." },
  { icon: "🔎", title: "Manual Search", desc: "Search your boards by keyword or paste a Trello card URL to jump to it." },
  { icon: "🕐", title: "Recent Cards Tray", desc: "See your most recently active cards across all boards." },
  { icon: "🎯", title: "Optimistic UI", desc: "Cards appear in results instantly. No spinners." },
  { icon: "⚙️", title: "Fully Configurable", desc: "Set fuzzy match thresholds, auto-check domains, strip title suffixes, add custom ID regex patterns, and filter by boards." },
  { icon: "🗃️", title: "Search Archived Cards", desc: "Toggle to include archived cards in search results." },
  { icon: "💾", title: "Draft Persistence", desc: "Form auto-saves if the popup closes, and restores when you reopen it." },
];

const PERFECT_FOR = [
  { title: "Recruiters & HR", desc: "Track candidates across LinkedIn, Indeed, and Glassdoor with automatic company and job ID matching." },
  { title: "Project Managers", desc: "Link Jira tickets, GitHub issues, and documentation to your Trello boards automatically." },
  { title: "Content Creators", desc: "Curate articles, inspiration, and research with screenshots and highlighted text attached." },
  { title: "Developers", desc: "Connect PRs, issues, and docs to task cards with smart ID extraction." },
  { title: "Sales Teams", desc: "Track prospects and opportunities across CRMs and websites." },
  { title: "Anyone", desc: "Stop tab-switching and copy-pasting. Build a knowledge base in Trello without breaking your flow." },
];

const PRICING_ROWS = [
  { label: "Price", free: "$0", pro: "$5/month" },
  { label: "Searches per day", free: "10", pro: "Unlimited" },
  { label: "Card creations per day", free: "10", pro: "Unlimited" },
  { label: "Screenshots per day", free: "1", pro: "Unlimited" },
  { label: "File attachments per day", free: "1", pro: "Unlimited" },
  { label: "All other features", free: true, pro: true },
];

const TrelloBridge = () => {
  const [carouselApi, setCarouselApi] = useState<CarouselApi>();
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (!carouselApi) return;
    carouselApi.on("select", () => setCurrentIndex(carouselApi.selectedScrollSnap()));
  }, [carouselApi]);

  const pageUrl = "https://acme.zone/products/trellobridge";

  return (
    <div className="flex flex-col min-h-screen">
      <Helmet>
        <title>TrelloBridge – Chrome Extension for Trello Integration | Acme Zone</title>
        <meta name="description" content="Bridge web browsing and Trello! Auto-find existing cards, create new ones instantly, capture screenshots, and manage boards — all without leaving your browser." />
        <link rel="canonical" href={pageUrl} />
        <meta property="og:type" content="product" />
        <meta property="og:title" content="TrelloBridge – Bridge the Gap Between the Web & Trello" />
        <meta property="og:description" content="Automatically find existing Trello cards for any webpage, create new ones in seconds, and manage your boards — all without leaving your browser." />
        <meta property="og:url" content={pageUrl} />
        <meta property="og:image" content="https://acme.zone/lovable-uploads/ff84c184-f45b-4bef-ae67-83422faff51b.png" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="TrelloBridge – Bridge the Gap Between the Web & Trello" />
        <meta name="twitter:image" content="https://acme.zone/lovable-uploads/ff84c184-f45b-4bef-ae67-83422faff51b.png" />
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Product",
            name: "TrelloBridge",
            description: "Bridge the Gap Between the Web & Trello. Automatically find existing Trello cards for any webpage, create new ones in seconds, and manage your boards.",
            category: "Extensions",
            brand: { "@type": "Brand", name: "Acme Zone" },
            url: pageUrl,
            image: ["https://acme.zone/lovable-uploads/ff84c184-f45b-4bef-ae67-83422faff51b.png"],
            offers: {
              "@type": "Offer",
              price: 5,
              priceCurrency: "USD",
              availability: "https://schema.org/InStock",
            },
          })}
        </script>
      </Helmet>

      <Header />

      <main className="flex-1">
        {/* Hero */}
        <section className="py-16 md:py-24">
          <div className="container mx-auto px-4">
            <article className="grid gap-10 lg:grid-cols-12">
              {/* Image carousel */}
              <div className="lg:col-span-5">
                <Carousel className="w-full" setApi={setCarouselApi} opts={{ loop: true }}>
                  <CarouselContent>
                    {IMAGES.map((img, i) => (
                      <CarouselItem key={i}>
                        <img
                          src={img}
                          alt={`TrelloBridge screenshot ${i + 1}`}
                          className="w-full h-auto object-contain rounded-lg border shadow-md"
                        />
                      </CarouselItem>
                    ))}
                  </CarouselContent>
                  <CarouselPrevious className="absolute left-2 top-1/2 -translate-y-1/2 bg-background hover:bg-accent border-2 shadow-xl w-10 h-10 text-foreground hover:text-accent-foreground" />
                  <CarouselNext className="absolute right-2 top-1/2 -translate-y-1/2 bg-background hover:bg-accent border-2 shadow-xl w-10 h-10 text-foreground hover:text-accent-foreground" />
                </Carousel>
                <div className="flex justify-center mt-4 gap-2">
                  {IMAGES.map((_, i) => (
                    <button
                      key={i}
                      onClick={() => { carouselApi?.scrollTo(i); setCurrentIndex(i); }}
                      className={`w-2 h-2 rounded-full transition-all duration-200 ${i === currentIndex ? "bg-primary scale-125" : "bg-muted-foreground/30 hover:bg-muted-foreground/50"}`}
                      aria-label={`Go to image ${i + 1}`}
                    />
                  ))}
                </div>
              </div>

              {/* Text */}
              <div className="lg:col-span-7 space-y-4">
                <h1 className="text-3xl md:text-4xl font-semibold tracking-tight">TrelloBridge</h1>
                <p className="text-lg text-muted-foreground leading-relaxed">
                  Bridge the Gap Between the Web &amp; Trello. Automatically find existing Trello cards for any webpage, create new ones in seconds, and manage your boards — all without leaving your browser.
                </p>
                <div className="flex flex-wrap gap-2 text-sm text-muted-foreground">
                  <Badge variant="secondary">Extensions</Badge>
                  <Badge variant="secondary">Chrome Extension</Badge>
                  <Badge variant="outline">$5/month (Free plan available)</Badge>
                </div>

                <div className="space-y-4 leading-relaxed text-base pt-2">
                  <p>
                    Transform how you work with Trello. TrelloBridge creates a seamless connection between your browser and your boards. It automatically scans every page you visit to find matching cards — by URL, page title, ticket ID, or even company name — preventing duplicates and keeping you organized. Need to save something new? Create a detailed card with screenshots and file attachments in seconds, without ever leaving the page.
                  </p>
                </div>

                <div className="flex gap-3 pt-4">
                  <Button asChild>
                    <a href="https://chrome.google.com/webstore" target="_blank" rel="noopener noreferrer">
                      Get the Extension
                    </a>
                  </Button>
                  <Button variant="outline" asChild>
                    <Link to="/products">Back to Products</Link>
                  </Button>
                </div>
              </div>
            </article>
          </div>
        </section>

        {/* Perfect For */}
        <section className="py-16 bg-muted/40">
          <div className="container mx-auto px-4">
            <h2 className="text-2xl md:text-3xl font-semibold tracking-tight text-center mb-10">Perfect For…</h2>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 max-w-5xl mx-auto">
              {PERFECT_FOR.map((item) => (
                <Card key={item.title} className="border bg-card">
                  <CardContent className="p-6">
                    <h3 className="font-medium text-base mb-1">{item.title}</h3>
                    <p className="text-sm text-muted-foreground">{item.desc}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* Why TrelloBridge */}
        <section className="py-16">
          <div className="container mx-auto px-4 max-w-3xl">
            <h2 className="text-2xl md:text-3xl font-semibold tracking-tight mb-6">Why TrelloBridge?</h2>
            <p className="text-base leading-relaxed text-muted-foreground">
              Stop wondering "Did I already save this?" TrelloBridge's 5-phase search engine checks your boards in real time as you browse. It matches by URL, ticket/job IDs, page title (with fuzzy matching), and even company name — so nothing slips through the cracks. Whether you're researching a project, recruiting candidates, or tracking bugs, TrelloBridge makes capturing the web effortless.
            </p>
          </div>
        </section>

        {/* Key Features */}
        <section className="py-16 bg-muted/40">
          <div className="container mx-auto px-4">
            <h2 className="text-2xl md:text-3xl font-semibold tracking-tight text-center mb-10">Key Features</h2>
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 max-w-6xl mx-auto">
              {FEATURES.map((f) => (
                <Card key={f.title} className="border bg-card">
                  <CardContent className="p-5">
                    <div className="text-2xl mb-2">{f.icon}</div>
                    <h3 className="font-medium text-sm mb-1">{f.title}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* Pricing Table */}
        <section className="py-16">
          <div className="container mx-auto px-4 max-w-2xl">
            <h2 className="text-2xl md:text-3xl font-semibold tracking-tight text-center mb-10">Pricing</h2>
            <div className="overflow-x-auto rounded-lg border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-muted">
                    <th className="text-left p-4 font-medium" />
                    <th className="p-4 font-semibold text-center">Free</th>
                    <th className="p-4 font-semibold text-center bg-primary/5">Pro</th>
                  </tr>
                </thead>
                <tbody>
                  {PRICING_ROWS.map((row) => (
                    <tr key={row.label} className="border-t">
                      <td className="p-4 font-medium">{row.label}</td>
                      <td className="p-4 text-center">
                        {typeof row.free === "boolean" ? (
                          row.free ? <Check className="mx-auto h-4 w-4 text-primary" /> : <X className="mx-auto h-4 w-4 text-muted-foreground" />
                        ) : (
                          row.free
                        )}
                      </td>
                      <td className="p-4 text-center bg-primary/5">
                        {typeof row.pro === "boolean" ? (
                          row.pro ? <Check className="mx-auto h-4 w-4 text-primary" /> : <X className="mx-auto h-4 w-4 text-muted-foreground" />
                        ) : (
                          <span className="font-medium">{row.pro}</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-sm text-muted-foreground text-center mt-4">
              Upgrade directly in the extension — secure checkout powered by Stripe.
            </p>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default TrelloBridge;
