import { Helmet } from "react-helmet-async";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Link } from "react-router-dom";
import ogImage from "@/assets/og-default.jpg";

const Index = () => {
  return (
    <div className="flex flex-col min-h-screen">
      <Helmet>
        <title>Pre-Apply AI | Chrome Extension Credit System</title>
        <meta name="description" content="Purchase credits for Pre-Apply AI Chrome extension. Get company insights, red-flag detection, and spam analysis for job applications." />
        <meta property="og:title" content="Pre-Apply AI | Chrome Extension Credit System" />
        <meta property="og:description" content="Purchase credits for job analysis with our Chrome extension." />
        <meta property="og:image" content={ogImage} />
        <meta name="twitter:card" content="summary_large_image" />
        <link rel="canonical" href="https://pre-apply.ai/" />
      </Helmet>
      <Header />
      <main className="flex-1">
        <section className="relative py-20 md:py-32">
          <div className="container mx-auto px-4">
            <div aria-hidden="true" className="pointer-events-none absolute -top-32 inset-x-0 flex justify-center">
              <span className="h-96 w-96 rounded-full bg-primary/20 blur-3xl" />
            </div>
            <div className="relative z-10 max-w-4xl mx-auto text-center animate-fade-in">
              <h1 className="font-display text-4xl md:text-5xl lg:text-6xl tracking-tight text-gradient-primary mb-6">
                Pre-Apply AI Credit System
              </h1>
              <p className="text-lg md:text-xl text-muted-foreground leading-relaxed mb-8 max-w-3xl mx-auto">
                Purchase credits for job analysis with our Chrome extension. Get company insights, red-flag detection, and spam analysis for smarter job applications.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button size="lg" asChild className="hover-scale">
                  <Link to="/auth">Get Started</Link>
                </Button>
                <Button variant="outline" size="lg" asChild className="hover-scale">
                  <Link to="/dashboard">Dashboard</Link>
                </Button>
              </div>
            </div>
          </div>
        </section>
        <section className="py-16 md:py-24">
          <div className="container mx-auto px-4">
            <div className="text-center mb-12">
              <h2 className="font-display text-3xl lg:text-4xl tracking-tight mb-4">Credit Packages</h2>
              <p className="text-muted-foreground text-lg max-w-2xl mx-auto">Choose the perfect package for your job search analysis needs</p>
            </div>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            <Card className="elevated hover-scale">
              <CardHeader>
                <CardTitle>Starter Pack</CardTitle>
                <CardDescription>Perfect for light usage</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold mb-2">$10</div>
                <div className="text-sm text-muted-foreground mb-4">1,000 credits • 10 analyses</div>
                <Button asChild className="w-full">
                  <Link to="/auth">Get Started</Link>
                </Button>
              </CardContent>
            </Card>
            
            <Card className="elevated hover-scale ring-2 ring-primary">
              <CardHeader>
                <CardTitle>Professional</CardTitle>
                <CardDescription>Most popular choice</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold mb-2">$40</div>
                <div className="text-sm text-muted-foreground mb-4">5,000 credits • 50 analyses</div>
                <Button asChild className="w-full">
                  <Link to="/auth">Get Started</Link>
                </Button>
              </CardContent>
            </Card>
            
            <Card className="elevated hover-scale">
              <CardHeader>
                <CardTitle>Enterprise</CardTitle>
                <CardDescription>For heavy users</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold mb-2">$99</div>
                <div className="text-sm text-muted-foreground mb-4">15,000 credits • 150 analyses</div>
                <Button asChild className="w-full">
                  <Link to="/auth">Get Started</Link>
                </Button>
              </CardContent>
            </Card>
            
            <Card className="elevated hover-scale">
              <CardHeader>
                <CardTitle>Professional+</CardTitle>
                <CardDescription>Maximum value</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold mb-2">$299</div>
                <div className="text-sm text-muted-foreground mb-4">50,000 credits • 500 analyses</div>
                <Button asChild className="w-full">
                  <Link to="/auth">Get Started</Link>
                </Button>
              </CardContent>
            </Card>
          </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default Index;
