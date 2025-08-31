import { Helmet } from "react-helmet-async";
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

const Support = () => {
  const faqItems = [
    {
      id: "installation",
      question: "How do I install TrelloBridge?",
      answer: "TrelloBridge is available on the Chrome Web Store. Simply visit the store, search for 'TrelloBridge', and click 'Add to Chrome'. The extension will be automatically installed and ready to use."
    },
    {
      id: "setup",
      question: "How do I set up TrelloBridge with my Trello account?",
      answer: "After installation, click the TrelloBridge icon in your browser toolbar. You'll be prompted to connect your Trello account. Follow the authorization steps to grant the necessary permissions. Your boards will then be accessible through the extension."
    },
    {
      id: "sync",
      question: "Why aren't my Trello boards syncing?",
      answer: "If boards aren't syncing, try these steps: 1) Check your internet connection, 2) Refresh the extension by clicking the reload button, 3) Ensure you're logged into the correct Trello account, 4) Clear the extension's cache in Chrome settings."
    },
    {
      id: "permissions",
      question: "What permissions does TrelloBridge need?",
      answer: "TrelloBridge requires read and write access to your Trello boards to sync data and create cards. We also need storage permissions to cache your boards locally for faster access. Your data is never shared with third parties."
    },
    {
      id: "offline",
      question: "Can I use TrelloBridge offline?",
      answer: "TrelloBridge can display previously cached boards when offline, but you won't be able to create new cards or sync changes until you're back online. Any actions performed offline will sync automatically when connection is restored."
    },
    {
      id: "troubleshooting",
      question: "The extension isn't working properly. What should I do?",
      answer: "First, try refreshing the page and reloading the extension. If issues persist, try disabling and re-enabling TrelloBridge in Chrome's extension settings. For persistent problems, contact our support team with details about your browser version and the specific issue."
    },
    {
      id: "data-security",
      question: "How secure is my data with TrelloBridge?",
      answer: "We take data security seriously. TrelloBridge uses secure API connections to Trello, encrypts stored data, and follows industry best practices. Your Trello credentials are never stored locally - we only store temporary access tokens."
    },
    {
      id: "multiple-accounts",
      question: "Can I use multiple Trello accounts with TrelloBridge?",
      answer: "Currently, TrelloBridge supports one Trello account per browser profile. To use multiple accounts, you can create separate Chrome profiles or use incognito windows with different Trello logins."
    },
    {
      id: "updates",
      question: "How do I update TrelloBridge?",
      answer: "TrelloBridge updates automatically through the Chrome Web Store. You can manually check for updates by going to Chrome's Extensions page (chrome://extensions/), enabling 'Developer mode', and clicking 'Update extensions'."
    },
    {
      id: "uninstall",
      question: "How do I uninstall TrelloBridge?",
      answer: "To uninstall TrelloBridge, go to Chrome's Extensions page (chrome://extensions/), find TrelloBridge in the list, and click 'Remove'. All local data will be deleted, but your Trello boards remain unchanged."
    }
  ];

  return (
    <>
      <Helmet>
        <title>TrelloBridge Support - Frequently Asked Questions</title>
        <meta name="description" content="Get help with TrelloBridge Chrome extension. Find answers to common questions about installation, setup, troubleshooting, and more." />
        <meta name="keywords" content="TrelloBridge support, Chrome extension help, Trello integration FAQ, troubleshooting" />
      </Helmet>

      <div className="min-h-screen bg-gradient-to-br from-background to-secondary/20">
        <Header />
        
        <main className="container mx-auto px-4 py-16">
          <div className="max-w-4xl mx-auto">
            {/* Header Section */}
            <div className="text-center mb-12">
              <h1 className="text-4xl font-bold text-foreground mb-4">
                TrelloBridge Support
              </h1>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                Find answers to frequently asked questions about TrelloBridge, troubleshooting tips, and how to get the most out of your Chrome extension experience.
              </p>
            </div>

            {/* Contact Cards */}
            <div className="grid md:grid-cols-2 gap-6 mb-12">
              <Card className="text-center">
                <CardHeader>
                  <Mail className="w-8 h-8 mx-auto mb-2 text-primary" />
                  <CardTitle>Email Support</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground mb-4">
                    Get personalized help from our support team
                  </p>
                  <Button asChild>
                    <a href="mailto:support@acme.zone">Contact Support</a>
                  </Button>
                </CardContent>
              </Card>

              <Card className="text-center">
                <CardHeader>
                  <MessageCircle className="w-8 h-8 mx-auto mb-2 text-primary" />
                  <CardTitle>Community</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground mb-4">
                    Join our community for tips and discussions
                  </p>
                  <Button variant="outline" asChild>
                    <a href="#" onClick={(e) => e.preventDefault()}>Join Community</a>
                  </Button>
                </CardContent>
              </Card>
            </div>

            {/* FAQ Section */}
            <Card>
              <CardHeader>
                <CardTitle className="text-2xl">Frequently Asked Questions</CardTitle>
              </CardHeader>
              <CardContent>
                <Accordion type="single" collapsible className="space-y-2">
                  {faqItems.map((item) => (
                    <AccordionItem key={item.id} value={item.id}>
                      <AccordionTrigger className="text-left font-medium">
                        {item.question}
                      </AccordionTrigger>
                      <AccordionContent className="text-muted-foreground leading-relaxed">
                        {item.answer}
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </CardContent>
            </Card>

            {/* Still Need Help Section */}
            <Card className="mt-8 text-center">
              <CardContent className="pt-8">
                <h3 className="text-xl font-semibold mb-4">Still need help?</h3>
                <p className="text-muted-foreground mb-6">
                  Can't find what you're looking for? Our support team is here to help you with any questions or issues.
                </p>
                <Button asChild size="lg">
                  <a href="mailto:support@acme.zone">Get in Touch</a>
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