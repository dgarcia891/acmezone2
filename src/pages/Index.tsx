import { Helmet } from "react-helmet-async";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Link } from "react-router-dom";
import { products } from "@/data/products";
import ogImage from "@/assets/og-default.jpg";

const Index = () => {
  const featured = products.slice(0, 3);
  return (
    <>
      <Helmet>
        <title>Acme Zone | Custom Software Products</title>
        <meta name="description" content="Discover and buy custom software products like InsightReel. Clean, fast, and professional." />
        <meta property="og:title" content="Acme Zone | Custom Software Products" />
        <meta property="og:description" content="Discover and buy custom software products like InsightReel." />
        <meta property="og:image" content={ogImage} />
        <meta name="twitter:card" content="summary_large_image" />
        <link rel="canonical" href="https://acme.zone/" />
      </Helmet>
      <Header />
      <main className="min-h-[60vh]">
        <section className="container mx-auto relative overflow-hidden flex flex-col items-center gap-6 py-24 text-center animate-fade-in rounded-2xl ring-1 ring-border bg-gradient-to-b from-background to-muted/40">
          <div aria-hidden="true" className="pointer-events-none absolute -top-24 inset-x-0 flex justify-center">
            <span className="h-72 w-72 rounded-full bg-primary/20 blur-3xl" />
          </div>
          <h1 className="font-display text-5xl sm:text-6xl tracking-tight text-gradient-primary">Build, Buy, and Ship Better Software</h1>
          <p className="max-w-2xl text-lg text-muted-foreground leading-relaxed">A curated collection of modern tools and extensions—fast, reliable, and designed for clarity.</p>
          <div className="flex gap-3">
            <Button variant="hero" size="lg" asChild><Link to="/products">Browse Products</Link></Button>
            <Button variant="outline" size="lg" asChild><Link to="/contact">Contact Us</Link></Button>
          </div>
        </section>
        <section className="container mx-auto pb-16 mt-12">
          <h2 className="font-display text-3xl tracking-tight">Featured</h2>
          <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3 animate-enter">
            {featured.map((p) => (
              <Card key={p.id} className="overflow-hidden elevated hover-scale">
                <img src={p.image} alt={`${p.name} product image`} loading="lazy" className="h-40 w-full object-cover object-top" />
                <CardHeader>
                  <CardTitle className="text-xl">{p.name}</CardTitle>
                  <CardDescription>{p.summary}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between text-sm text-muted-foreground">
                    <span>{p.category}</span>
                    {p.priceLabel && <span>{p.priceLabel}</span>}
                  </div>
                  <div className="mt-4">
                    <Button asChild>
                      <Link to={`/products/${p.slug}`}>View details</Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
};

export default Index;
