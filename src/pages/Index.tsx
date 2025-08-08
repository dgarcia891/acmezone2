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
      <main className="min-h-[60vh] bg-background">
        <section className="container mx-auto flex flex-col items-center gap-6 py-16 text-center">
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">Build, Buy, and Ship Better Software</h1>
          <p className="max-w-2xl text-lg text-muted-foreground">A curated collection of modern tools and extensions—fast, reliable, and designed for clarity.</p>
          <div className="flex gap-3">
            <Button asChild><Link to="/products">Browse Products</Link></Button>
            <Button variant="outline" asChild><Link to="/contact">Contact Us</Link></Button>
          </div>
        </section>
        <section className="container mx-auto pb-16">
          <h2 className="text-2xl font-semibold tracking-tight">Featured</h2>
          <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {featured.map((p) => (
              <Card key={p.id} className="overflow-hidden">
                <img src={p.image} alt={`${p.name} product image`} loading="lazy" className="h-40 w-full object-cover" />
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
