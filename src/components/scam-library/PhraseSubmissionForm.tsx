import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { MessageSquarePlus, Loader2, Info } from "lucide-react";

const CATEGORIES = ['general', 'gift_card', 'command', 'finance', 'vague_lure', 'authority_pressure', 'urgency', 'securityKeywords'];

export default function PhraseSubmissionForm() {
  const { toast } = useToast();
  
  const [phrase, setPhrase] = useState("");
  const [category, setCategory] = useState("general");
  const [context, setContext] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!phrase.trim()) {
      toast({ title: "Validation Error", description: "Please enter a phrase.", variant: "destructive" });
      return;
    }
    
    if (phrase.trim().length < 3) {
      toast({ title: "Validation Error", description: "Phrase must be at least 3 characters.", variant: "destructive" });
      return;
    }

    setIsSubmitting(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('sa-submit-phrase', {
        body: {
          phrase: phrase.trim(),
          category,
          context: context.trim()
        }
      });

      if (error) {
        throw new Error(error.message || 'Network error');
      }

      if (data && data.error) {
        throw new Error(data.error);
      }

      toast({
        title: "Success",
        description: "Your phrase has been submitted for admin review.",
      });

      // Reset form
      setPhrase("");
      setContext("");
      setCategory("general");

    } catch (err: any) {
      toast({
        title: "Submission Failed",
        description: err.message || "An unknown error occurred.",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="shadow-md">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageSquarePlus className="w-5 h-5 text-primary" /> Suggest a Scam Phrase
        </CardTitle>
        <CardDescription>
          Seen a new scam pattern in your inbox? Submit it here to help protect the community. 
          All suggestions are reviewed by an administrator before entering the active library.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <label htmlFor="phrase" className="text-sm font-medium">Scam Phrase <span className="text-red-500">*</span></label>
            <Input 
              id="phrase"
              placeholder="e.g. 'Kindly purchase steam gift cards'"
              value={phrase}
              onChange={(e) => setPhrase(e.target.value)}
              disabled={isSubmitting}
              maxLength={200}
            />
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <Info className="w-3 h-3" /> Exact matching is used. Try to isolate the core suspicious sentence or phrase.
            </p>
          </div>

          <div className="space-y-2">
            <label htmlFor="category" className="text-sm font-medium">Category</label>
            <Select value={category} onValueChange={setCategory} disabled={isSubmitting}>
              <SelectTrigger id="category">
                <SelectValue placeholder="Select heuristic category" />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIES.map(c => (
                  <SelectItem key={c} value={c}>
                    {c.replace('_', ' ').charAt(0).toUpperCase() + c.slice(1)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label htmlFor="context" className="text-sm font-medium">Context / Reason (Optional)</label>
            <Textarea 
              id="context"
              placeholder="Where did you see this? Any variations worth noting?"
              className="resize-none"
              rows={3}
              value={context}
              onChange={(e) => setContext(e.target.value)}
              disabled={isSubmitting}
              maxLength={500}
            />
          </div>

          <div className="pt-2">
            <Button 
              type="submit" 
              className="w-full sm:w-auto" 
              disabled={isSubmitting || phrase.trim().length < 3}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Submitting...
                </>
              ) : (
                "Submit Pattern for Review"
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
