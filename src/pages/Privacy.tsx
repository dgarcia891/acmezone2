import { Helmet } from 'react-helmet-async';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';

const Privacy = () => {
  return (
    <>
      <Helmet>
        <title>Privacy Policy - Acme Zone</title>
        <meta name="description" content="Acme Zone privacy policy covering data usage, AI disclosure, and third-party services." />
      </Helmet>
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 container mx-auto px-4 py-12 max-w-3xl prose prose-neutral dark:prose-invert">
          <h1>Privacy Policy</h1>
          <p className="text-muted-foreground">Last updated: February 25, 2026</p>

          <h2>Data Usage</h2>
          <p>
            InsightReel collects YouTube video transcripts only when a user explicitly initiates an analysis.
            We use the Google Identity API to associate your subscription with your Google account email.
          </p>

          <h2>AI Disclosure</h2>
          <p>
            Transcripts are processed through secure backend functions on Acme Zone and analyzed via AI models
            (utilizing Google Gemini). No user data is stored longer than necessary for processing or used to
            train AI models.
          </p>

          <h2>Third Parties</h2>
          <p>
            We use Stripe for payment processing. We do not store or see your financial information.
            Stripe's privacy policy applies to all payment data.
          </p>

          <h2>Contact</h2>
          <p>
            For privacy-related inquiries, please reach out via our{' '}
            <a href="/contact" className="text-primary underline">Contact page</a>.
          </p>
        </main>
        <Footer />
      </div>
    </>
  );
};

export default Privacy;
