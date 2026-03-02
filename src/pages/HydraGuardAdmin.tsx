import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useAdmin } from '@/hooks/useAdmin';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import DetectionsTab from '@/components/hydra-guard/DetectionsTab';
import CorrectionsTab from '@/components/hydra-guard/CorrectionsTab';
import PatternsTab from '@/components/hydra-guard/PatternsTab';
import { Shield, Eye, MessageSquare, Database, ArrowLeft } from 'lucide-react';

const HydraGuardAdmin = () => {
  const { user, loading: authLoading } = useAuth();
  const { isAdmin, loading: adminLoading } = useAdmin();
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
      return;
    }
    if (!adminLoading && !isAdmin) {
      toast({ title: 'Access Denied', description: "You don't have permission to view this page.", variant: 'destructive' });
      navigate('/dashboard');
    }
  }, [user, authLoading, isAdmin, adminLoading, navigate, toast]);

  if (authLoading || adminLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!isAdmin) return null;

  return (
    <>
      <Helmet>
        <title>Hydra Guard Admin - Acme Zone</title>
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>

      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 container mx-auto px-4 py-8">
          <div className="flex items-center justify-between mb-8">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <Shield className="h-8 w-8 text-primary" />
                <h1 className="text-3xl font-bold text-gradient-primary">Hydra Guard Admin</h1>
              </div>
              <p className="text-muted-foreground">Monitor detections, review corrections, and manage patterns</p>
            </div>
            <Button variant="outline" onClick={() => navigate('/admin')}>
              <ArrowLeft className="w-4 h-4 mr-2" />Back to Admin
            </Button>
          </div>

          <Tabs defaultValue="corrections" className="space-y-6">
            <TabsList>
              <TabsTrigger value="detections" className="gap-2"><Eye className="h-4 w-4" />Detections</TabsTrigger>
              <TabsTrigger value="corrections" className="gap-2"><MessageSquare className="h-4 w-4" />Corrections</TabsTrigger>
              <TabsTrigger value="patterns" className="gap-2"><Database className="h-4 w-4" />Patterns</TabsTrigger>
            </TabsList>
            <TabsContent value="detections"><DetectionsTab /></TabsContent>
            <TabsContent value="corrections"><CorrectionsTab /></TabsContent>
            <TabsContent value="patterns"><PatternsTab /></TabsContent>
          </Tabs>
        </main>
        <Footer />
      </div>
    </>
  );
};

export default HydraGuardAdmin;
