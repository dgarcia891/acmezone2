import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Key, Video, AlertCircle, ExternalLink, LogOut, Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Label } from "@/components/ui/label";

interface VideoAnalysis {
  id: string;
  analysis_type: string;
  video_id: string;
  video_url: string;
  video_title: string;
  thumbnail_url: string;
  ai_results: any;
  created_at: string;
}

export default function InsightReelDashboard() {
  const [searchParams, setSearchParams] = useSearchParams();
  const urlLicense = searchParams.get("license");
  
  const [licenseCode, setLicenseCode] = useState(urlLicense || localStorage.getItem("ir_license_code") || "");
  const [inputCode, setInputCode] = useState(licenseCode);
  const [videos, setVideos] = useState<VideoAnalysis[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (licenseCode) {
      localStorage.setItem("ir_license_code", licenseCode);
      fetchDashboard(licenseCode);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [licenseCode]);

  async function fetchDashboard(code: string) {
    setLoading(true);
    setError(null);
    try {
      const res = await supabase.functions.invoke(`ir-dashboard-view?licenseCode=${code}`, {
        method: "GET"
      });

      if (res.error) throw new Error(res.error.message);
      if (res.data?.error) throw new Error(res.data.error);
      
      setVideos(res.data?.videos || []);
    } catch (err: any) {
      setError(err.message || "Failed to load dashboard data. Invalid or inactive license.");
      setVideos([]);
    } finally {
      setLoading(false);
    }
  }

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputCode.trim()) {
      toast.error("Please enter a license code");
      return;
    }
    setSearchParams({ license: inputCode.trim() });
    setLicenseCode(inputCode.trim());
  };

  const handleLogout = () => {
    localStorage.removeItem("ir_license_code");
    setLicenseCode("");
    setInputCode("");
    setSearchParams({});
    setVideos([]);
    setError(null);
  };

  return (
    <>
      <Helmet>
        <title>InsightReel Research Dashboard | Acme.zone</title>
      </Helmet>
      <Header />
      <main className="flex-1 min-h-[70vh] py-12 bg-muted/30">
        <div className="container max-w-5xl mx-auto px-4">
          {!licenseCode || error ? (
            <div className="max-w-md mx-auto mt-20">
              <Card className="elevated">
                <CardHeader className="text-center pb-4">
                  <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Key className="w-6 h-6 text-primary" />
                  </div>
                  <CardTitle className="text-2xl">Access Dashboard</CardTitle>
                  <CardDescription>
                    Enter your InsightReel License Code to view your synced research data.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleLogin} className="space-y-4">
                    {error && (
                      <div className="p-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm rounded-md flex items-start gap-2">
                        <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                        <p>{error}</p>
                      </div>
                    )}
                    <div className="space-y-2">
                      <Label htmlFor="license">License Code</Label>
                      <Input
                        id="license"
                        placeholder="e.g. IR-DASH-A1B2C3D4"
                        value={inputCode}
                        onChange={(e) => setInputCode(e.target.value)}
                        className="font-mono"
                        autoComplete="off"
                      />
                    </div>
                    <Button type="submit" className="w-full" disabled={loading}>
                      {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                      {loading ? "Verifying..." : "View Dashboard"}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </div>
          ) : (
            <div className="space-y-8">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <h1 className="text-3xl font-bold flex items-center gap-2">
                    <Video className="w-8 h-8 text-primary" />
                    Research Dashboard
                  </h1>
                  <p className="text-muted-foreground mt-1 text-sm bg-muted inline-block px-3 py-1 rounded-full font-mono">
                    License: {licenseCode}
                  </p>
                </div>
                <Button variant="outline" onClick={handleLogout} size="sm">
                  <LogOut className="w-4 h-4 mr-2" /> Sign Out
                </Button>
              </div>

              {loading ? (
                <div className="flex justify-center py-20">
                  <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                </div>
              ) : videos.length === 0 ? (
                <Card className="border-dashed border-2 py-20 text-center bg-transparent">
                  <CardContent>
                    <Video className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
                    <h3 className="text-xl font-semibold mb-2">No Research Data Yet</h3>
                    <p className="text-muted-foreground max-w-md mx-auto">
                      Use the InsightReel Chrome Extension while having an active dashboard subscription to sync your automated analysis here.
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {videos.map((vid) => (
                    <Card key={vid.id} className="overflow-hidden hover:shadow-md transition-shadow">
                      <div className="flex flex-col sm:flex-row h-full">
                        {vid.thumbnail_url && (
                          <div className="w-full sm:w-48 shrink-0 relative bg-black hidden sm:block">
                            <img 
                              src={vid.thumbnail_url} 
                              alt={vid.video_title}
                              className="absolute inset-0 w-full h-full object-cover opacity-80"
                            />
                            <div className="absolute top-2 left-2 bg-black/70 text-white text-xs px-2 py-1 rounded">
                              {vid.analysis_type}
                            </div>
                          </div>
                        )}
                        <CardContent className="p-5 flex-1 flex flex-col justify-between">
                          <div>
                            <div className="flex justify-between items-start mb-2">
                              <h3 className="font-semibold line-clamp-2 leading-tight">
                                {vid.video_title}
                              </h3>
                              <a 
                                href={vid.video_url} 
                                target="_blank" 
                                rel="noreferrer"
                                className="text-muted-foreground hover:text-primary transition-colors shrink-0 ml-2"
                              >
                                <ExternalLink className="w-4 h-4" />
                              </a>
                            </div>
                            <p className="text-sm text-muted-foreground flex items-center gap-1.5 mb-4">
                              <Clock className="w-3.5 h-3.5" />
                              {new Date(vid.created_at).toLocaleDateString()} at {new Date(vid.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                            </p>
                            
                            {/* Snippet of AI Results based on type */}
                            <div className="text-sm bg-muted/50 p-3 rounded-md line-clamp-3">
                              {vid.analysis_type === "NEWS" && vid.ai_results.aiAnalysisSummary && (
                                <p><strong>Summary:</strong> {vid.ai_results.aiAnalysisSummary}</p>
                              )}
                              {vid.analysis_type === "TUTORIAL" && vid.ai_results.tutorialWorkflow && (
                                <p><strong>Workflow:</strong> {vid.ai_results.tutorialWorkflow.substring(0, 100)}...</p>
                              )}
                              {vid.analysis_type === "CLICKBAIT" && vid.ai_results.clickbaitVerdict && (
                                <p><strong>Verdict:</strong> {vid.ai_results.clickbaitVerdict}</p>
                              )}
                              {!vid.ai_results.aiAnalysisSummary && !vid.ai_results.tutorialWorkflow && !vid.ai_results.clickbaitVerdict && (
                                <p className="italic text-muted-foreground">Detailed analysis data stored.</p>
                              )}
                            </div>
                          </div>
                          
                          <div className="mt-4 pt-4 border-t flex justify-end">
                            <Button variant="ghost" size="sm" onClick={() => {
                                // Real implementation would open a modal with full data
                                alert("Full JSON Data:\n\n" + JSON.stringify(vid.ai_results, null, 2));
                            }}>
                              View Full Analysis
                            </Button>
                          </div>
                        </CardContent>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}
