import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { ArrowRight } from "lucide-react";
import { trackEvent } from "@/utils/analytics";

interface WaitlistFormProps {
  productName: string;
}

export function WaitlistForm({ productName }: WaitlistFormProps) {
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleWaitlistSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !name) {
      toast({ title: "Error", description: "Please provide both name and email.", variant: "destructive" });
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch("https://bnzylhssukmctoqqtzqy.supabase.co/functions/v1/contact-notify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          email,
          message: `I am interested in joining the ${productName} Beta.`,
          source: `${productName} Beta Waitlist`,
          timestamp: new Date().toISOString()
        })
      });

      if (!response.ok) throw new Error("Failed to submit");
      
      trackEvent('join_waitlist', { product: productName.toLowerCase() });
      
      toast({ title: "Success!", description: "You have been added to the beta waitlist. We'll be in touch." });
      setEmail("");
      setName("");
    } catch (err) {
      console.error(err);
      toast({ title: "Error", description: "Failed to join waitlist. Please try again later.", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-card elevated p-6 flex flex-col gap-4 max-w-md border border-border/50">
      <div>
        <h3 className="font-semibold text-lg mb-1">Get Early Access</h3>
        <p className="text-sm text-muted-foreground">Pricing is free for beta users.</p>
      </div>
      <form onSubmit={handleWaitlistSubmit} className="flex flex-col gap-3">
        <Input 
          placeholder="Your Name" 
          value={name} 
          onChange={(e) => setName(e.target.value)}
          required
          className="bg-background"
        />
        <Input 
          type="email" 
          placeholder="name@example.com" 
          value={email} 
          onChange={(e) => setEmail(e.target.value)}
          required
          className="bg-background"
        />
        <Button type="submit" disabled={isSubmitting} className="w-full">
          {isSubmitting ? "Joining..." : "Join Beta Waitlist"} <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </form>
    </div>
  );
}
