import { Helmet } from "react-helmet-async";
import { useParams, Link } from "react-router-dom";
import { useState, useEffect } from "react";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { useProducts, Product } from "@/hooks/useProducts";
import { useAdmin } from "@/hooks/useAdmin";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Pencil } from "lucide-react";
import ProductEditor from "@/components/admin/ProductEditor";
import { WaitlistForm } from "@/components/ui/WaitlistForm";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
  type CarouselApi
} from "@/components/ui/carousel";

const ProductDetail = () => {
  const { slug } = useParams<{ slug: string }>();
  const { getProductBySlug, fetchProducts } = useProducts();
  const { isAdmin } = useAdmin();
  
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [carouselApi, setCarouselApi] = useState<CarouselApi>();
  const [isEditorOpen, setIsEditorOpen] = useState(false);

  useEffect(() => {
    const loadProduct = async () => {
      if (!slug) return;
      setLoading(true);
      const data = await getProductBySlug(slug);
      setProduct(data);
      setLoading(false);
    };
    loadProduct();
  }, [slug, getProductBySlug]);

  useEffect(() => {
    if (!carouselApi) return;

    carouselApi.on("select", () => {
      setCurrentImageIndex(carouselApi.selectedScrollSnap());
    });
  }, [carouselApi]);

  const handleProductSave = async () => {
    if (slug) {
      const data = await getProductBySlug(slug);
      setProduct(data);
    }
  };

  if (loading) {
    return (
      <>
        <Header />
        <main className="container mx-auto py-12">
          <article className="grid gap-8 lg:grid-cols-12">
            <div className="lg:col-span-5">
              <Skeleton className="w-full aspect-video rounded-lg" />
            </div>
            <div className="lg:col-span-7 space-y-4">
              <Skeleton className="h-10 w-2/3" />
              <Skeleton className="h-6 w-full" />
              <Skeleton className="h-4 w-1/3" />
              <div className="space-y-2 mt-6">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
              </div>
            </div>
          </article>
        </main>
        <Footer />
      </>
    );
  }

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
    description: product.seo_description || product.summary,
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
  const title = product.seo_title || `${product.name} | Acme Zone`;
  const description = product.seo_description || product.summary;

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
            {product.images && product.images.length > 1 ? (
              <div className="relative">
                <Carousel 
                  className="w-full"
                  setApi={setCarouselApi}
                  opts={{ loop: true }}
                >
                  <CarouselContent>
                    {product.images.map((image, index) => (
                      <CarouselItem key={index}>
                        <div className="relative">
                          <img 
                            src={image} 
                            alt={`${product.name} screenshot ${index + 1}`} 
                            className="w-full h-auto object-contain rounded-lg border shadow-md"
                          />
                        </div>
                      </CarouselItem>
                    ))}
                  </CarouselContent>
                  
                  {/* Custom positioned arrows */}
                  <CarouselPrevious className="absolute left-2 top-1/2 -translate-y-1/2 bg-background hover:bg-accent border-2 shadow-xl w-10 h-10 text-foreground hover:text-accent-foreground" />
                  <CarouselNext className="absolute right-2 top-1/2 -translate-y-1/2 bg-background hover:bg-accent border-2 shadow-xl w-10 h-10 text-foreground hover:text-accent-foreground" />
                </Carousel>
                
                {/* Dots indicator */}
                <div className="flex justify-center mt-4 gap-2">
                  {product.images.map((_, index) => (
                    <button
                      key={index}
                      onClick={() => {
                        carouselApi?.scrollTo(index);
                        setCurrentImageIndex(index);
                      }}
                      className={`w-2 h-2 rounded-full transition-all duration-200 ${
                        index === currentImageIndex 
                          ? 'bg-primary scale-125' 
                          : 'bg-muted-foreground/30 hover:bg-muted-foreground/50'
                      }`}
                      aria-label={`Go to image ${index + 1}`}
                    />
                  ))}
                </div>
              </div>
            ) : (
              <img src={product.image} alt={`${product.name} cover image`} className="w-full rounded-lg border shadow-md" />
            )}
          </div>
          <div className="lg:col-span-7">
            <div className="flex items-start justify-between gap-4">
              <h1 className="text-3xl font-semibold tracking-tight">{product.name}</h1>
              {isAdmin && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsEditorOpen(true)}
                  className="flex-shrink-0"
                >
                  <Pencil className="w-4 h-4 mr-2" />
                  Edit
                </Button>
              )}
            </div>
            <p className="mt-2 text-muted-foreground">{product.summary}</p>
            <div className="mt-4 text-sm text-muted-foreground">
              <span className="mr-4">Category: {product.category}</span>
              {product.type && <span>Type: {product.type}</span>}
            </div>
            {product.price_label && (
              <div className="mt-2 text-sm">Pricing: {product.price_label}</div>
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
            {product.slug === "insightreel" && (
              <div className="mt-6 p-4 bg-muted/50 rounded-lg border-l-4 border-primary">
                <p className="text-sm text-muted-foreground">
                  🚀 <strong>Coming Soon:</strong> Visit{" "}
                  <a 
                    href="https://insight-reels.com/" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-primary hover:underline font-medium"
                  >
                    insight-reels.com
                  </a>{" "}
                  where you'll be able to save your video insights and retrieve them later across all your devices.
                </p>
              </div>
            )}
            <div className="mt-8 flex gap-3 flex-col sm:flex-row sm:items-start">
              {product.price_label === 'Early Access' ? (
                <div className="w-full sm:w-auto">
                  <WaitlistForm productName={product.name} />
                </div>
              ) : (
                product.link && (
                  <Button asChild>
                    <a href={product.link} target="_blank" rel="noopener noreferrer">Get the Extension</a>
                  </Button>
                )
              )}
              <div className="mt-2 sm:mt-0">
                <Button variant="outline" asChild>
                  <Link to="/products">Back to Products</Link>
                </Button>
              </div>
            </div>
          </div>
        </article>
      </main>
      <Footer />

      {isAdmin && (
        <ProductEditor
          product={product}
          open={isEditorOpen}
          onClose={() => setIsEditorOpen(false)}
          onSave={handleProductSave}
        />
      )}
    </>
  );
};

export default ProductDetail;
