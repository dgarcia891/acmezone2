import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { products } from "@/data/products";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
        <section className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3 animate-enter">
          {products.map((p) => (
            <Card key={p.id} className="overflow-hidden hover-scale transition-shadow shadow-sm hover:shadow-lg">
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
        </section>
      </main>
      <Footer />
    </>
  );
};

export default Products;
