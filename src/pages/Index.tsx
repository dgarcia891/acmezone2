import { Helmet } from "react-helmet-async";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Link } from "react-router-dom";
import ogImage from "@/assets/og-default.jpg";

const Index = () => {
  return (
    <>
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
      <main className="min-h-[60vh]">
        <section className="container mx-auto relative overflow-hidden flex flex-col items-center gap-6 py-24 text-center animate-fade-in rounded-2xl ring-1 ring-border bg-gradient-to-b from-background to-muted/40">
          <div aria-hidden="true" className="pointer-events-none absolute -top-24 inset-x-0 flex justify-center">
            <span className="h-72 w-72 rounded-full bg-primary/20 blur-3xl" />
          </div>
          <h1 className="font-display text-5xl sm:text-6xl tracking-tight text-gradient-primary">Pre-Apply AI Credit System</h1>
          <p className="max-w-2xl text-lg text-muted-foreground leading-relaxed">Purchase credits for job analysis with our Chrome extension. Get company insights, red-flag detection, and spam analysis.</p>
          <div className="flex gap-3">
            <Button size="lg" asChild className="hover-scale">
              <Link to="/auth">Get Started</Link>
            </Button>
            <Button variant="outline" size="lg" asChild className="hover-scale">
              <Link to="/dashboard">Dashboard</Link>
            </Button>
          </div>
        </section>
        <section className="container mx-auto pb-16 mt-12">
          <h2 className="font-display text-3xl tracking-tight">Credit Packages</h2>
          <p className="text-muted-foreground mt-2 mb-6">Choose the perfect package for your job search analysis needs</p>
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
        </section>
      </main>
      <Footer />
    </>
  );
};

export default Index;
