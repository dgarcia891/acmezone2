import { Helmet } from 'react-helmet-async';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';

const Terms = () => {
  return (
    <>
      <Helmet>
        <title>Terms of Service - Acme Zone</title>
        <meta name="description" content="Acme Zone terms of service covering subscriptions, service descriptions, and product context." />
      </Helmet>
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 container mx-auto px-4 py-12 max-w-3xl prose prose-neutral dark:prose-invert">
          <h1>Terms of Service</h1>
          <p className="text-muted-foreground">Last updated: February 25, 2026</p>

          <h2>Service Description</h2>
          <p>
            InsightReel Pro provides unlimited video analyses, subject to fair use monitoring to prevent
            platform abuse.
          </p>

          <h2>Subscriptions</h2>
          <p>
            All billing is recurring monthly. You may cancel at any time via the self-service Billing Portal
            accessible from the InsightReel Dashboard.
          </p>

          <h2>Product Context</h2>
          <p>
            InsightReel is a product of Acme Zone. Subscriptions apply specifically to the InsightReel feature
            set and are distinct from other Acme Zone credit systems.
          </p>

          <h2>Contact</h2>
          <p>
            For questions about these terms, please reach out via our{' '}
            <a href="/contact" className="text-primary underline">Contact page</a>.
          </p>
        </main>
        <Footer />
      </div>
    </>
  );
};

export default Terms;
