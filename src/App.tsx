import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import { AuthProvider } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import { usePageTracking } from "@/hooks/usePageTracking";
import ScrollToTop from "./components/ScrollToTop";

// Public pages
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import Products from "./pages/Products";
import ProductDetail from "./pages/ProductDetail";
import Contact from "./pages/Contact";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import PaymentSuccess from "./pages/PaymentSuccess";
import PreApplyAI from "./pages/PreApplyAI";
import Support from "./pages/Support";
import ChromeExtensionImageEditor from "./pages/ChromeExtensionImageEditor";
import BackgroundRemover from "./pages/BackgroundRemover";
import HeicToJpgConverter from "./pages/HeicToJpgConverter";
import InsightReelLanding from "./pages/InsightReelLanding";
import InsightReelPricing from "./pages/InsightReelPricing";
import InsightReelSuccess from "./pages/InsightReelSuccess";
import InsightReelDashboard from "./pages/InsightReelDashboard";
import Privacy from "./pages/Privacy";
import Terms from "./pages/Terms";

// Admin layout + sub-pages
import AdminLayout from "./components/admin/AdminLayout";
import AdminOverview from "./pages/admin/AdminOverview";
import AdminProducts from "./pages/admin/AdminProducts";
import AdminAnalytics from "./pages/admin/AdminAnalytics";
import AdminDetections from "./pages/admin/AdminDetections";
import AdminCorrections from "./pages/admin/AdminCorrections";
import AdminPatterns from "./pages/admin/AdminPatterns";
import AdminUserReports from "./pages/admin/AdminUserReports";
import AdminSettings from "./pages/admin/AdminSettings";
import AdminPodPipeline from "./pages/admin/AdminPodPipeline";

const queryClient = new QueryClient();

const PageTracker = () => {
  usePageTracking();
  return null;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <HelmetProvider>
        <AuthProvider>
          <div className="min-h-screen flex flex-col">
            {/* Skip to main content — ADA / WCAG 2.1 */}
            <a
              href="#main-content"
              className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[100] focus:px-4 focus:py-2 focus:rounded-md focus:bg-primary focus:text-primary-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            >
              Skip to main content
            </a>
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <PageTracker />
              <ScrollToTop />
              <Routes>
                <Route path="/" element={<Index />} />
                <Route path="/auth" element={<Auth />} />
                <Route path="/dashboard" element={
                  <ProtectedRoute><Dashboard /></ProtectedRoute>
                } />
                <Route path="/payment-success" element={
                  <ProtectedRoute><PaymentSuccess /></ProtectedRoute>
                } />
                <Route path="/products" element={<Products />} />
                <Route path="/products/pre-apply-ai" element={<PreApplyAI />} />
                <Route path="/products/chrome-extension-image-editor" element={<ChromeExtensionImageEditor />} />
                <Route path="/background-remover" element={<BackgroundRemover />} />
                <Route path="/heic-to-jpg" element={<HeicToJpgConverter />} />
                <Route path="/insightreel" element={<InsightReelLanding />} />
                <Route path="/insightreel/pricing" element={<InsightReelPricing />} />
                <Route path="/insightreel/success" element={
                  <ProtectedRoute><InsightReelSuccess /></ProtectedRoute>
                } />
                <Route path="/insightreel/dashboard" element={
                  <ProtectedRoute><InsightReelDashboard /></ProtectedRoute>
                } />

                {/* Admin area — nested routes with sidebar layout */}
                <Route path="/admin" element={<AdminLayout />}>
                  <Route index element={<AdminOverview />} />
                  <Route path="users" element={<AdminOverview />} />
                  <Route path="products" element={<AdminProducts />} />
                  <Route path="analytics" element={<AdminAnalytics />} />
                  <Route path="security/detections" element={<AdminDetections />} />
                  <Route path="security/corrections" element={<AdminCorrections />} />
                  <Route path="security/patterns" element={<AdminPatterns />} />
                  <Route path="security/reports" element={<AdminUserReports />} />
                  <Route path="pod-pipeline" element={<AdminPodPipeline />} />
                  <Route path="settings" element={<AdminSettings />} />
                </Route>

                {/* Backward-compat redirects */}
                <Route path="/pod-pipeline" element={<Navigate to="/admin/pod-pipeline" replace />} />
                <Route path="/hydra-guard/admin" element={<Navigate to="/admin" replace />} />

                <Route path="/products/:slug" element={<ProductDetail />} />
                <Route path="/contact" element={<Contact />} />
                <Route path="/support" element={<Support />} />
                <Route path="/privacy" element={<Privacy />} />
                <Route path="/terms" element={<Terms />} />
                {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                <Route path="*" element={<NotFound />} />
              </Routes>
            </BrowserRouter>
          </div>
        </AuthProvider>
      </HelmetProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
