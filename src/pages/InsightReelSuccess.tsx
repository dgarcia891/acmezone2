import { useEffect, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle2, Loader2, AlertCircle, Copy, Key } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export default function InsightReelSuccess() {
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get("session_id");
  const [licenseCode, setLicenseCode] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchLicense() {
      if (!sessionId) {
        setError("Missing session ID.");
        setLoading(false);
        return;
      }
      try {
        const res = await supabase.functions.invoke(`ir-dashboard-get-license?sessionId=${sessionId}`, {
          method: "GET"
        });

        if (res.error) throw new Error(res.error.message);
        if (res.data?.error) throw new Error(res.data.error);
        if (res.data?.licenseCode) {
          setLicenseCode(res.data.licenseCode);
          
          // Attempt to notify extension if present
          window.postMessage({ type: "INSIGHTREEL_PAYMENT_SUCCESS" }, "*");
          if (typeof window !== "undefined" && (window as any).chrome?.runtime?.sendMessage) {
             try {
               (window as any).chrome.runtime.sendMessage(undefined, { type: "INSIGHTREEL_PAYMENT_SUCCESS" }, () => {});
             } catch {}
          }
        }
      } catch (err: any) {
        setError(err.message || "Failed to retrieve license code.");
      } finally {
        setLoading(false);
      }
    }
    fetchLicense();
  }, [sessionId]);

  const copyLicense = () => {
    if (licenseCode) {
      navigator.clipboard.writeText(licenseCode);
      toast.success("License code copied to clipboard!");
    }
  };

  return (
    <>
      <Helmet>
        <title>Payment Successful – InsightReel Dashboard | Acme.zone</title>
      </Helmet>
      <Header />
      <main className="flex-1 flex items-center justify-center py-20 min-h-[70vh]">
        <div className="container max-w-lg mx-auto px-4">
          <Card className="elevated text-center">
            <CardContent className="pt-8 pb-8 space-y-6">
              {loading ? (
                <>
                  <Loader2 className="h-16 w-16 mx-auto text-primary animate-spin" />
                  <h1 className="text-2xl font-bold">Activating Dashboard...</h1>
                  <p className="text-muted-foreground">Please wait while we generate your access code.</p>
                </>
              ) : error ? (
                <>
                  <AlertCircle className="h-16 w-16 mx-auto text-destructive" />
                  <h1 className="text-2xl font-bold text-destructive">Activation Issue</h1>
                  <p className="text-muted-foreground">{error}</p>
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-16 w-16 mx-auto text-primary" />
                  <h1 className="text-2xl font-bold">You're Pro!</h1>
                  <p className="text-muted-foreground">
                    Your InsightReel Dashboard subscription is active. Here is your unique License Code to access your data:
                  </p>
                  
                  <div className="bg-muted p-6 rounded-lg border-2 border-primary/20 relative group">
                    <div className="flex items-center justify-center gap-3">
                      <Key className="text-primary w-6 h-6" />
                      <code className="text-2xl font-mono font-bold text-foreground">{licenseCode}</code>
                    </div>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={copyLicense}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                  <p className="text-sm text-yellow-600 dark:text-yellow-400 font-medium">
                    ⚠️ Save this code! You will need it to log into the dashboard from any device.
                  </p>

                  <div className="pt-4 flex flex-col gap-3">
                    <Button onClick={copyLicense} size="lg" className="w-full">
                      <Copy className="mr-2 h-4 w-4" /> Copy License Code
                    </Button>
                    <Button variant="outline" size="lg" className="w-full" asChild>
                      <Link to={`/insightreel/dashboard?license=${licenseCode}`}>
                        Go to InsightReel Dashboard
                      </Link>
                    </Button>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
      <Footer />
    </>
  );
}
