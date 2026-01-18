import { FormEvent, useState } from "react";
import { Helmet } from "react-helmet-async";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/use-toast";

const WEBHOOK_URL = "https://n8n.srv946115.hstgr.cloud/form-test/contact-us";

const Contact = () => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [hp, setHp] = useState(""); // honeypot
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();

    // Honeypot: if filled, quietly succeed
    if (hp) {
      toast({ title: "Thanks!", description: "We received your message." });
      setName(""); setEmail(""); setMessage(""); setHp("");
      return;
    }

    if (!name || !email || !message) {
      toast({ title: "Missing fields", description: "Please fill all fields.", variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      await fetch(WEBHOOK_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        mode: "no-cors",
        body: JSON.stringify({ name, email, message, timestamp: new Date().toISOString(), source: window.location.origin }),
      });
      toast({ title: "Request Sent", description: "Please check your inbox for follow-up." });
      setName(""); setEmail(""); setMessage("");
    } catch (err) {
      console.error(err);
      toast({ title: "Error", description: "Failed to send. Try again.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Helmet>
        <title>Contact | Acme Zone</title>
        <meta name="description" content="Contact Acme Zone for product inquiries and support." />
        <link rel="canonical" href="https://acme.zone/contact" />
      </Helmet>
      <Header />
      <main className="container mx-auto py-12">
        <section>
          <h1 className="text-3xl font-semibold tracking-tight">Contact Us</h1>
          <p className="mt-2 text-muted-foreground">We'd love to hear from you.</p>
        </section>
        <section className="mt-8 max-w-xl">
          <form onSubmit={onSubmit} className="space-y-4">
            {/* Honeypot field */}
            <div className="hidden" aria-hidden="true">
              <label htmlFor="company">Company</label>
              <input id="company" value={hp} onChange={(e) => setHp(e.target.value)} />
            </div>

            <div>
              <label className="text-sm" htmlFor="name">Name</label>
              <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" />
            </div>
            <div>
              <label className="text-sm" htmlFor="email">Email</label>
              <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
            </div>
            <div>
              <label className="text-sm" htmlFor="message">Message</label>
              <Textarea id="message" value={message} onChange={(e) => setMessage(e.target.value)} placeholder="How can we help?" rows={6} />
            </div>
            <Button type="submit" disabled={loading}>{loading ? "Sending..." : "Send Message"}</Button>
          </form>
        </section>
      </main>
      <Footer />
    </>
  );
};

export default Contact;
