import { Helmet } from "react-helmet-async";
import { useParams, Link } from "react-router-dom";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { products } from "@/data/products";
import { Button } from "@/components/ui/button";

const ProductDetail = () => {
  const { slug } = useParams<{ slug: string }>();
  const product = products.find((p) => p.slug === slug);

  if (!product) {
    return (
      <>
        <Header />
        <main className="container mx-auto py-16">
          <h1 className="text-2xl font-semibold">Product not found</h1>
          <p className="mt-2 text-muted-foreground">Return to the products list.</p>
          <div className="mt-6">
            <Button asChild><Link to="/products">Back to Products</Link></Button>
          </div>
        </main>
        <Footer />
      </>
    );
  }

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: product.seoDescription || product.summary,
    category: product.category,
    brand: { "@type": "Brand", name: "Acme Zone" },
    url: `https://acme.zone/products/${product.slug}`,
    image: [product.image],
    offers: {
      "@type": "Offer",
      price: 0,
      priceCurrency: "USD",
      availability: "https://schema.org/InStock",
    },
  };

  const pageUrl = `https://acme.zone/products/${product.slug}`;
  const imageUrl = product.image.startsWith("http") ? product.image : `https://acme.zone${product.image}`;
  const title = product.seoTitle || `${product.name} | Acme Zone`;
  const description = product.seoDescription || product.summary;

  return (
    <>
      <Helmet>
        <title>{title}</title>
        <meta name="description" content={description} />
        <link rel="canonical" href={pageUrl} />
        {/* Open Graph */}
        <meta property="og:type" content="product" />
        <meta property="og:title" content={title} />
        <meta property="og:description" content={description} />
        <meta property="og:url" content={pageUrl} />
        <meta property="og:image" content={imageUrl} />
        {/* Twitter */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={title} />
        <meta name="twitter:description" content={description} />
        <meta name="twitter:image" content={imageUrl} />
        <script type="application/ld+json">{JSON.stringify(jsonLd)}</script>
      </Helmet>
      <Header />
      <main className="container mx-auto py-12">
        <article className="grid gap-8 lg:grid-cols-12">
          <div className="lg:col-span-5">
            <img src={product.image} alt={`${product.name} cover image`} className="w-full rounded-md border" />
          </div>
          <div className="lg:col-span-7">
            <h1 className="text-3xl font-semibold tracking-tight">{product.name}</h1>
            <p className="mt-2 text-muted-foreground">{product.summary}</p>
            <div className="mt-4 text-sm text-muted-foreground">
              <span className="mr-4">Category: {product.category}</span>
              {product.type && <span>Type: {product.type}</span>}
            </div>
            {product.priceLabel && (
              <div className="mt-2 text-sm">Pricing: {product.priceLabel}</div>
            )}
            <section className="mt-6">
              <div className="space-y-4 leading-relaxed text-base">
                {product.description.split("\n\n").map((para, idx) => (
                  <p key={idx}>{para}</p>
                ))}
              </div>
            </section>
            <section className="mt-6">
              <h2 className="text-lg font-medium">Key Features</h2>
              <ul className="mt-2 list-disc pl-6 text-sm text-muted-foreground">
                {product.features.map((f, i) => (
                  <li key={i}>{f}</li>
                ))}
              </ul>
            </section>
            <div className="mt-8 flex gap-3">
              {product.link && (
                <Button asChild>
                  <a href={product.link} target="_blank" rel="noopener noreferrer">Get the Extension</a>
                </Button>
              )}
              <Button variant="outline" asChild>
                <Link to="/products">Back to Products</Link>
              </Button>
            </div>
          </div>
        </article>
      </main>
      <Footer />
    </>
  );
};

export default ProductDetail;
