import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Mail, MessageCircle } from "lucide-react";

interface FaqSection {
  title: string;
  items: { id: string; question: string; answer: string }[];
}

const faqSections: FaqSection[] = [
  {
    title: "General / Account",
    items: [
      { id: "gen-account", question: "How do I create an Acme Zone account?", answer: "Visit any product page and click 'Sign Up' to create a free account. Your single account gives you access to all Acme Zone products." },
      { id: "gen-password", question: "How do I reset my password?", answer: "Click 'Forgot password' on the login page. You'll receive an email with a reset link. If you don't see it, check your spam folder." },
      { id: "gen-billing", question: "How do I manage my subscription or billing?", answer: "Log in to your dashboard and navigate to Settings → Billing. From there you can upgrade, downgrade, or cancel your subscription." },
      { id: "gen-contact", question: "How do I contact support?", answer: "Use our Contact page to send a message directly to our team. We typically respond within one business day." },
    ],
  },
  {
    title: "InsightReel — AI YouTube Analysis",
    items: [
      { id: "ir-install", question: "How do I install InsightReel?", answer: "InsightReel is available as a Chrome extension on the Chrome Web Store. Search for 'InsightReel' and click 'Add to Chrome'." },
      { id: "ir-modes", question: "What analysis modes are available?", answer: "InsightReel offers Quick Summary, Deep Analysis, and Custom Prompt modes. Each provides different levels of detail about video content." },
      { id: "ir-webhook", question: "How does the webhook integration work?", answer: "In your dashboard, configure a webhook URL under Settings → Integrations. InsightReel will POST analysis results to your endpoint in real time." },
      { id: "ir-sub", question: "How do I manage my InsightReel subscription?", answer: "Visit your InsightReel dashboard and go to Settings → Subscription to view your plan, usage, and payment details." },
    ],
  },
  {
    title: "TrelloBridge — Web to Trello",
    items: [
      { id: "tb-install", question: "How do I install TrelloBridge?", answer: "TrelloBridge is available on the Chrome Web Store. Search for 'TrelloBridge', click 'Add to Chrome', and the extension will be installed automatically." },
      { id: "tb-setup", question: "How do I connect my Trello account?", answer: "After installation, click the TrelloBridge icon in your toolbar. You'll be prompted to authorize your Trello account. Follow the steps to grant the necessary permissions." },
      { id: "tb-sync", question: "Why aren't my boards syncing?", answer: "Try these steps: 1) Check your internet connection, 2) Refresh the extension, 3) Ensure you're logged into the correct Trello account, 4) Clear the extension's cache in Chrome settings." },
      { id: "tb-permissions", question: "What permissions does TrelloBridge need?", answer: "TrelloBridge requires read/write access to your Trello boards and storage permissions for local caching. Your data is never shared with third parties." },
      { id: "tb-offline", question: "Can I use TrelloBridge offline?", answer: "Previously cached boards are viewable offline, but new cards and syncing require an internet connection. Changes made offline sync automatically once you're back online." },
    ],
  },
  {
    title: "LinkedIn Job Scanner",
    items: [
      { id: "ljs-install", question: "How do I install LinkedIn Job Scanner?", answer: "Install LinkedIn Job Scanner from the Chrome Web Store. After installation, navigate to LinkedIn to activate the extension." },
      { id: "ljs-scan", question: "How does automated scanning work?", answer: "The extension scans job listings on LinkedIn pages you visit, highlighting key details and flagging potential issues based on your configured preferences." },
      { id: "ljs-alerts", question: "How do I set up job alerts?", answer: "Open the extension settings and configure your alert preferences — including keywords, location, and salary range — to receive notifications for matching jobs." },
    ],
  },
  {
    title: "Background Remover",
    items: [
      { id: "bgr-how", question: "How does Background Remover work?", answer: "Upload an image and the AI processes it entirely in your browser. No data is sent to external servers, keeping your images private." },
      { id: "bgr-privacy", question: "Is my data private?", answer: "Yes. All processing happens locally in your browser using on-device AI. Your images never leave your computer." },
      { id: "bgr-limits", question: "How many free uses do I get per day?", answer: "Free users get several uses per day. Create an account for additional daily credits, or upgrade to Pro for unlimited usage." },
    ],
  },
  {
    title: "Chrome Extension Image Editor",
    items: [
      { id: "ceie-sizes", question: "What image sizes does it generate?", answer: "The editor supports standard Chrome Web Store sizes including 128×128 icons, 440×280 small tiles, 920×680 large tiles, and 1280×800 screenshots." },
      { id: "ceie-bg", question: "How does background removal work?", answer: "The built-in background remover uses on-device AI to isolate subjects from their backgrounds, perfect for creating clean product images and icons." },
      { id: "ceie-formats", question: "What formats are supported?", answer: "Export images in PNG, JPEG, and WebP formats. PNG is recommended for icons and images requiring transparency." },
    ],
  },
];

const Support = () => {
  return (
    <>
      <Helmet>
        <title>Support — Acme Zone</title>
        <meta name="description" content="Get help with Acme Zone products. Browse FAQs for InsightReel, TrelloBridge, LinkedIn Job Scanner, Background Remover, and more." />
        <meta name="keywords" content="Acme Zone support, FAQ, help, Chrome extension, troubleshooting" />
      </Helmet>

      <div className="min-h-screen bg-gradient-to-br from-background to-secondary/20">
        <Header />

        <main className="container mx-auto px-4 py-16">
          <div className="max-w-4xl mx-auto">
            {/* Header */}
            <div className="text-center mb-12">
              <h1 className="text-4xl font-bold text-foreground mb-4">Acme Zone Support</h1>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                Find answers to frequently asked questions about our products, troubleshooting tips, and how to get the most out of your Acme Zone experience.
              </p>
            </div>

            {/* Contact Cards */}
            <div className="grid md:grid-cols-2 gap-6 mb-12">
              <Card className="text-center">
                <CardHeader>
                  <Mail className="w-8 h-8 mx-auto mb-2 text-primary" />
                  <CardTitle>Contact Support</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground mb-4">Get personalized help from our support team</p>
                  <Button asChild>
                    <Link to="/contact">Send a Message</Link>
                  </Button>
                </CardContent>
              </Card>

              <Card className="text-center">
                <CardHeader>
                  <MessageCircle className="w-8 h-8 mx-auto mb-2 text-primary" />
                  <CardTitle>Community</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground mb-4">Join our community for tips and discussions</p>
                  <Button variant="outline" asChild>
                    <a href="#" onClick={(e) => e.preventDefault()}>Join Community</a>
                  </Button>
                </CardContent>
              </Card>
            </div>

            {/* FAQ Sections */}
            {faqSections.map((section) => (
              <Card key={section.title} className="mb-6">
                <CardHeader>
                  <CardTitle className="text-xl">{section.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <Accordion type="single" collapsible className="space-y-1">
                    {section.items.map((item) => (
                      <AccordionItem key={item.id} value={item.id}>
                        <AccordionTrigger className="text-left font-medium">{item.question}</AccordionTrigger>
                        <AccordionContent className="text-muted-foreground leading-relaxed">{item.answer}</AccordionContent>
                      </AccordionItem>
                    ))}
                  </Accordion>
                </CardContent>
              </Card>
            ))}

            {/* Still Need Help */}
            <Card className="mt-8 text-center">
              <CardContent className="pt-8">
                <h3 className="text-xl font-semibold mb-4">Still need help?</h3>
                <p className="text-muted-foreground mb-6">
                  Can't find what you're looking for? Our support team is here to help.
                </p>
                <Button asChild size="lg">
                  <Link to="/contact">Get in Touch</Link>
                </Button>
              </CardContent>
            </Card>
          </div>
        </main>

        <Footer />
      </div>
    </>
  );
};

export default Support;
