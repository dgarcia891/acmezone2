import { useEffect } from "react";
import { Outlet, useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { useAuth } from "@/contexts/AuthContext";
import { useAdmin } from "@/hooks/useAdmin";
import { useToast } from "@/hooks/use-toast";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import AdminSidebar from "./AdminSidebar";

export default function AdminLayout() {
  const { user, loading: authLoading } = useAuth();
  const { isAdmin, loading: adminLoading } = useAdmin();
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
      return;
    }
    if (!adminLoading && !isAdmin) {
      toast({
        title: "Access Denied",
        description: "You don't have permission to view this page.",
        variant: "destructive",
      });
      navigate("/dashboard");
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
        <title>Admin Dashboard - Acme Zone</title>
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>

      <div className="min-h-screen flex flex-col">
        <Header />
        <SidebarProvider>
          <div className="flex-1 flex w-full">
            <AdminSidebar />
            <div className="flex-1 flex flex-col min-w-0">
              <div className="h-12 flex items-center border-b px-4">
                <SidebarTrigger />
              </div>
              <main className="flex-1 p-6">
                <Outlet />
              </main>
            </div>
          </div>
        </SidebarProvider>
        <Footer />
      </div>
    </>
  );
}
