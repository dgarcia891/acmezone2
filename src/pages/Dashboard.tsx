import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { LogOut, User, Shield, Zap, CreditCard, LayoutDashboard, ExternalLink } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { CreditBalance } from '@/components/credits/CreditBalance';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { toast } from 'sonner';

const Dashboard = () => {
  const { user, signOut, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
  }, [user, loading, navigate]);

  const [managingSubscription, setManagingSubscription] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  const handleManageSubscription = async () => {
    setManagingSubscription(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error('Please sign in first.');
        return;
      }
      const res = await supabase.functions.invoke('ir-manage-subscription', {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (res.error || !res.data?.url) {
        const msg = res.data?.message || 'Could not open subscription portal.';
        toast.error(msg);
        return;
      }
      window.open(res.data.url, '_blank');
    } catch {
      toast.error('Something went wrong.');
    } finally {
      setManagingSubscription(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <>
      <Helmet>
        <title>Dashboard - Pre-Apply AI</title>
        <meta name="description" content="Manage your Pre-Apply AI credit balance, purchase credits, and view your job analysis usage history." />
      </Helmet>

      <div className="min-h-screen flex flex-col">
        <Header />
        
        <main className="flex-1 container mx-auto px-4 py-8">
          {/* Welcome Section */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h1 className="text-3xl font-bold text-gradient-primary">Welcome back!</h1>
                <p className="text-muted-foreground mt-1">
                  Signed in as {user.email}
                </p>
              </div>
              <Button variant="outline" onClick={handleManageSubscription} disabled={managingSubscription}>
                <CreditCard className="w-4 h-4 mr-2" />
                {managingSubscription ? 'Loading…' : 'Manage Subscription'}
              </Button>
              <Button variant="outline" onClick={handleSignOut}>
                <LogOut className="w-4 h-4 mr-2" />
                Sign Out
              </Button>
            </div>

            {/* Quick Stats */}
            <div className="grid gap-6 md:grid-cols-3 mb-8">
              <CreditBalance />
              
              <Card className="elevated">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Account Status</CardTitle>
                  <User className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">Active</div>
                  <p className="text-xs text-muted-foreground">
                    Account created {new Date(user.created_at).toLocaleDateString()}
                  </p>
                </CardContent>
              </Card>

              <Card className="elevated">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Chrome Extension</CardTitle>
                  <Zap className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">Ready</div>
                  <p className="text-xs text-muted-foreground">
                    Extension connected & ready to use
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>

          <Separator className="my-8" />

          {/* Your Active Products Section */}
          <div className="mb-8">
            <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
              <LayoutDashboard className="h-6 w-6 text-primary" />
              Your Products
            </h2>
            <div className="grid gap-6 md:grid-cols-2">
              {/* InsightReel Product Card */}
              <Card className="elevated border-primary/20">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">InsightReel</CardTitle>
                    <span className="text-xs font-semibold bg-primary/10 text-primary px-2 py-1 rounded-full">Pro Active</span>
                  </div>
                  <CardDescription>AI-powered YouTube video insights &amp; analytics</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-4">
                    Access your recent video analyses, fact-checks, and manage your subscription.
                  </p>
                  <Button onClick={() => navigate('/insightreel/dashboard')} className="w-full">
                    Open Dashboard
                    <ExternalLink className="ml-2 h-4 w-4" />
                  </Button>
                </CardContent>
              </Card>

              {/* Placeholder for future products */}
              <Card className="elevated border-dashed">
                <CardHeader>
                  <CardTitle className="text-lg text-muted-foreground">More Apps Coming Soon</CardTitle>
                  <CardDescription>Stay tuned for more Acme Zone tools.</CardDescription>
                </CardHeader>
              </Card>
            </div>
          </div>

          <Separator className="my-8" />

          {/* Coming Soon Section */}
          <Card className="elevated border-dashed">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-muted-foreground">
                <Zap className="h-5 w-5" />
                Coming Soon
              </CardTitle>
              <CardDescription>
                These features are currently under development and will be available in a future update.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-3">
                <div className="rounded-lg border border-dashed p-4 text-center">
                  <CreditCard className="h-6 w-6 mx-auto mb-2 text-muted-foreground/50" />
                  <p className="text-sm font-medium text-muted-foreground">Purchase Credits</p>
                  <p className="text-xs text-muted-foreground/70 mt-1">Buy credits for pay-per-use tools</p>
                </div>
                <div className="rounded-lg border border-dashed p-4 text-center">
                  <LayoutDashboard className="h-6 w-6 mx-auto mb-2 text-muted-foreground/50" />
                  <p className="text-sm font-medium text-muted-foreground">Usage History</p>
                  <p className="text-xs text-muted-foreground/70 mt-1">Track your activity &amp; consumption</p>
                </div>
                <div className="rounded-lg border border-dashed p-4 text-center">
                  <Shield className="h-6 w-6 mx-auto mb-2 text-muted-foreground/50" />
                  <p className="text-sm font-medium text-muted-foreground">Chrome Extension</p>
                  <p className="text-xs text-muted-foreground/70 mt-1">Auto-connected credit integration</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </main>

        <Footer />
      </div>
    </>
  );
};

export default Dashboard;