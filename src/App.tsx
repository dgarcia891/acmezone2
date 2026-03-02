import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import { AuthProvider } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import { usePageTracking } from "@/hooks/usePageTracking";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import Products from "./pages/Products";
import ProductDetail from "./pages/ProductDetail";
import Contact from "./pages/Contact";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import Admin from "./pages/Admin";
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
import HydraGuardAdmin from "./pages/HydraGuardAdmin";
import ScrollToTop from "./components/ScrollToTop";

const queryClient = new QueryClient();

// Component to handle page tracking inside BrowserRouter
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
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <PageTracker />
              <ScrollToTop />
              <Routes>
                <Route path="/" element={<Index />} />
                <Route path="/auth" element={<Auth />} />
                <Route path="/dashboard" element={
                  <ProtectedRoute>
                    <Dashboard />
                  </ProtectedRoute>
                } />
                <Route path="/admin" element={
                  <ProtectedRoute>
                    <Admin />
                  </ProtectedRoute>
                } />
                <Route path="/payment-success" element={
                  <ProtectedRoute>
                    <PaymentSuccess />
                  </ProtectedRoute>
                } />
                <Route path="/products" element={<Products />} />
                <Route path="/products/pre-apply-ai" element={<PreApplyAI />} />
                <Route path="/products/chrome-extension-image-editor" element={<ChromeExtensionImageEditor />} />
                <Route path="/background-remover" element={<BackgroundRemover />} />
                <Route path="/heic-to-jpg" element={<HeicToJpgConverter />} />
                <Route path="/insightreel" element={<InsightReelLanding />} />
                <Route path="/insightreel/pricing" element={<InsightReelPricing />} />
                <Route path="/insightreel/success" element={
                  <ProtectedRoute>
                    <InsightReelSuccess />
                  </ProtectedRoute>
                } />
                <Route path="/insightreel/dashboard" element={
                  <ProtectedRoute>
                    <InsightReelDashboard />
                  </ProtectedRoute>
                } />
                <Route path="/hydra-guard/admin" element={
                  <ProtectedRoute>
                    <HydraGuardAdmin />
                  </ProtectedRoute>
                } />
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
