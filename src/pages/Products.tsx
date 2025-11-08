import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import { Check } from "lucide-react";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { products } from "@/data/products";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import ogImage from "@/assets/og-default.jpg";

const Products = () => {
  return (
    <>
      <Helmet>
        <title>Products | Custom Software Products</title>
        <meta name="description" content="Explore software products including InsightReel and more. Clean, modern, and fast." />
        <link rel="canonical" href="https://acme.zone/products" />
        <meta property="og:type" content="website" />
        <meta property="og:title" content="Products | Custom Software Products" />
        <meta property="og:description" content="Explore software products including InsightReel and more." />
        <meta property="og:url" content="https://acme.zone/products" />
        <meta property="og:image" content={ogImage} />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Products | Custom Software Products" />
        <meta name="twitter:description" content="Explore software products including InsightReel and more." />
        <meta name="twitter:image" content={ogImage} />
      </Helmet>
      <Header />
      <main className="container mx-auto py-12">
        <section>
          <h1 className="font-display text-4xl tracking-tight text-gradient-primary">Products</h1>
          <p className="mt-2 text-muted-foreground leading-relaxed">Discover tools and extensions built for speed and clarity.</p>
        </section>
        <section className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-1 animate-enter">
          {products.map((p) => (
            <Card key={p.id} className="overflow-hidden hover-scale transition-shadow shadow-sm hover:shadow-lg">
              <CardHeader className="space-y-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 space-y-2">
                    <CardTitle className="text-2xl font-bold">{p.name}</CardTitle>
                    <div className="flex items-center gap-2 text-sm">
                      <Badge variant="secondary">{p.category}</Badge>
                      {p.priceLabel && <Badge variant="outline">{p.priceLabel}</Badge>}
                    </div>
                  </div>
                  <Button asChild>
                    <Link to={p.link || `/products/${p.slug}`}>
                      {p.link ? 'Try Now' : 'View Details'}
                    </Link>
                  </Button>
                </div>
                <CardDescription className="text-base leading-relaxed">
                  {p.summary}
                </CardDescription>
                <div className="space-y-2 pt-2">
                  {p.features.slice(0, 4).map((feature, idx) => (
                    <div key={idx} className="flex items-start gap-2 text-sm text-muted-foreground">
                      <Check className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                      <span>{feature}</span>
                    </div>
                  ))}
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {p.tags.slice(0, 5).map((tag) => (
                    <Badge key={tag} variant="outline" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </section>
      </main>
      <Footer />
    </>
  );
};

export default Products;
