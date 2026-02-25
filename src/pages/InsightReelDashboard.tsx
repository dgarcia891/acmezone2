import { useEffect, useState } from "react";
import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, BarChart3, Clock, CreditCard } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface HistoryEntry {
  id: string;
  action: string;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

export default function InsightReelDashboard() {
  const { user } = useAuth();
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [managingSubscription, setManagingSubscription] = useState(false);

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;
        const res = await supabase.functions.invoke("ir-get-history", {
          headers: { Authorization: `Bearer ${session.access_token}` },
        });
        if (res.data?.history) setHistory(res.data.history);
      } catch {
        toast.error("Failed to load history.");
      } finally {
        setLoading(false);
      }
    };
    fetchHistory();
  }, []);

  const handleManageSubscription = async () => {
    setManagingSubscription(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { toast.error("Please sign in first."); return; }
      const res = await supabase.functions.invoke("ir-manage-subscription", {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (res.error || !res.data?.url) {
        toast.error(res.data?.message || "Could not open portal.");
        return;
      }
      window.open(res.data.url, "_blank");
    } catch {
      toast.error("Something went wrong.");
    } finally {
      setManagingSubscription(false);
    }
  };

  return (
    <>
      <Helmet>
        <title>InsightReel Dashboard | Acme.zone</title>
        <meta name="description" content="View your InsightReel analysis history and manage your subscription." />
      </Helmet>

      <Header />

      <main className="flex-1 container max-w-3xl mx-auto px-4 py-12">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold">InsightReel Dashboard</h1>
            <p className="text-muted-foreground mt-1">Your recent analyses</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleManageSubscription} disabled={managingSubscription}>
              <CreditCard className="w-4 h-4 mr-2" />
              {managingSubscription ? "Loading…" : "Manage Subscription"}
            </Button>
            <Button variant="outline" asChild>
              <Link to="/insightreel/pricing">View Plan</Link>
            </Button>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : history.length === 0 ? (
          <Card className="elevated text-center py-12">
            <CardContent>
              <BarChart3 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No analyses yet. Start using the InsightReel extension to see your history here.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {history.map((entry) => (
              <Card key={entry.id} className="elevated">
                <CardHeader className="py-4">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <BarChart3 className="h-4 w-4 text-primary" />
                      {(entry.metadata as any)?.title || "Video Analysis"}
                    </CardTitle>
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {new Date(entry.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </CardHeader>
              </Card>
            ))}
          </div>
        )}
      </main>

      <Footer />
    </>
  );
}
