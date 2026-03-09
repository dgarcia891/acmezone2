import { FormEvent, useCallback, useMemo, useState } from "react";
import { Helmet } from "react-helmet-async";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";

function generateCaptcha() {
  const a = Math.floor(Math.random() * 20) + 1;
  const b = Math.floor(Math.random() * 20) + 1;
  return { a, b, expected: a + b };
}

const Contact = () => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [hp, setHp] = useState(""); // honeypot
  const [loading, setLoading] = useState(false);

  const [captcha, setCaptcha] = useState(generateCaptcha);
  const [captchaAnswer, setCaptchaAnswer] = useState("");

  const captchaSolved = useMemo(
    () => captchaAnswer.trim() !== "" && parseInt(captchaAnswer, 10) === captcha.expected,
    [captchaAnswer, captcha.expected]
  );

  const resetCaptcha = useCallback(() => {
    setCaptcha(generateCaptcha());
    setCaptchaAnswer("");
  }, []);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();

    // Honeypot: if filled, quietly succeed
    if (hp) {
      toast({ title: "Thanks!", description: "We received your message." });
      setName(""); setEmail(""); setMessage(""); setHp("");
      resetCaptcha();
      return;
    }

    if (!name || !email || !message) {
      toast({ title: "Missing fields", description: "Please fill all fields.", variant: "destructive" });
      return;
    }

    if (!captchaSolved) return;

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('contact-notify', {
        body: { name, email, message, timestamp: new Date().toISOString(), source: window.location.origin },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast({ title: "Request Sent", description: "Please check your inbox for follow-up." });
      setName(""); setEmail(""); setMessage("");
      resetCaptcha();
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
      <main id="main-content" className="container mx-auto py-12">
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
              <label className="block text-sm font-medium mb-1" htmlFor="name">Name</label>
              <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" autoComplete="name" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1" htmlFor="email">Email</label>
              <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" autoComplete="email" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1" htmlFor="message">Message</label>
              <Textarea id="message" value={message} onChange={(e) => setMessage(e.target.value)} placeholder="How can we help?" rows={6} />
            </div>

            {/* Math CAPTCHA */}
            <fieldset className="rounded-md border border-border bg-muted/40 p-4 space-y-2">
              <legend className="text-sm font-medium">
                Quick check: What is {captcha.a} + {captcha.b}?
              </legend>
              <Input
                id="captcha"
                type="number"
                inputMode="numeric"
                value={captchaAnswer}
                onChange={(e) => setCaptchaAnswer(e.target.value)}
                placeholder="Your answer"
                className="max-w-[160px]"
                aria-label="Captcha answer"
              />
            </fieldset>

            {/* Submit only visible when CAPTCHA solved */}
            <div
              className={`transition-all duration-300 ${captchaSolved ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2 pointer-events-none"}`}
              aria-hidden={!captchaSolved}
            >
              <Button type="submit" disabled={loading} tabIndex={captchaSolved ? 0 : -1}>
                {loading ? "Sending..." : "Send Message"}
              </Button>
            </div>
          </form>
        </section>
      </main>
      <Footer />
    </>
  );
};

export default Contact;
