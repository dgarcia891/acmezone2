import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { products } from "@/data/products";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import ogImage from "@/assets/og-default.jpg";

const Index = () => {
  return (
    <>
      <Helmet>
        <title>Acme Zone | Custom Software Products and Tools</title>
        <meta name="description" content="Discover innovative software products and tools including InsightReel, Pre-Apply AI, and more. Built for speed, clarity, and efficiency." />
        <link rel="canonical" href="https://acme.zone/" />
        <meta property="og:type" content="website" />
        <meta property="og:title" content="Acme Zone | Custom Software Products and Tools" />
        <meta property="og:description" content="Discover innovative software products and tools. Built for speed, clarity, and efficiency." />
        <meta property="og:url" content="https://acme.zone/" />
        <meta property="og:image" content={ogImage} />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Acme Zone | Custom Software Products and Tools" />
        <meta name="twitter:description" content="Discover innovative software products and tools." />
        <meta name="twitter:image" content={ogImage} />
      </Helmet>
      <Header />
      <main className="flex-1">
        <section className="relative py-20 md:py-32">
          <div className="container mx-auto px-4">
            <div aria-hidden="true" className="pointer-events-none absolute -top-32 inset-x-0 flex justify-center">
              <span className="h-96 w-96 rounded-full bg-primary/20 blur-3xl" />
            </div>
            <div className="relative z-10 max-w-4xl mx-auto text-center animate-fade-in">
              <h1 className="font-display text-4xl md:text-5xl lg:text-6xl tracking-tight text-gradient-primary mb-8 leading-tight py-2">
                Acme Zone
              </h1>
              <p className="text-lg md:text-xl text-muted-foreground leading-relaxed mb-8 max-w-3xl mx-auto">
                Custom software products and tools built for speed, clarity, and efficiency. Discover innovative solutions for your workflow.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button size="lg" asChild className="hover-scale">
                  <Link to="/products">Browse Products</Link>
                </Button>
                <Button variant="outline" size="lg" asChild className="hover-scale">
                  <Link to="/contact">Contact Us</Link>
                </Button>
              </div>
            </div>
          </div>
        </section>
        <section className="py-16 md:py-24">
          <div className="container mx-auto px-4">
            <div className="text-center mb-12">
              <h2 className="font-display text-3xl lg:text-4xl tracking-tight mb-4">Featured Products</h2>
              <p className="text-muted-foreground text-lg max-w-2xl mx-auto">Discover tools and extensions designed for modern workflows</p>
            </div>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 animate-enter">
              {products.map((p) => (
                <Card key={p.id} className="overflow-hidden hover-scale transition-shadow shadow-sm hover:shadow-lg elevated">
                  <img src={p.image} alt={`${p.name} product image`} loading="lazy" className="h-40 w-full object-cover object-top" />
                  <CardHeader>
                    <CardTitle className="text-xl">{p.name}</CardTitle>
                    <CardDescription>{p.summary}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between text-sm text-muted-foreground mb-4">
                      <span>{p.category}</span>
                      {p.priceLabel && <span>{p.priceLabel}</span>}
                    </div>
                    <Button asChild className="w-full">
                      <Link to={`/products/${p.slug}`}>View Details</Link>
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
};

export default Index;
