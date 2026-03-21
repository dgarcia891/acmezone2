import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import { AuthProvider } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import Index from "./pages/Index";
import InsightReelLanding from "./pages/InsightReelLanding";
import InsightReelPricing from "./pages/InsightReelPricing";
import InsightReelDashboard from "./pages/InsightReelDashboard";
import InsightReelSuccess from "./pages/InsightReelSuccess";
import NotFound from "./pages/NotFound";
import Products from "./pages/Products";
import ProductDetail from "./pages/ProductDetail";
import Contact from "./pages/Contact";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import AdminLayout from "./components/admin/AdminLayout";
import AdminOverview from "./pages/admin/AdminOverview";
import AdminAnalytics from "./pages/admin/AdminAnalytics";
import AdminProducts from "./pages/admin/AdminProducts";
import AdminPodPipeline from "./pages/admin/AdminPodPipeline";
import AdminDetections from "./pages/admin/AdminDetections";
import AdminCorrections from "./pages/admin/AdminCorrections";
import AdminPatterns from "./pages/admin/AdminPatterns";
import AdminUserReports from "./pages/admin/AdminUserReports";
import AdminSettings from "./pages/admin/AdminSettings";
import PaymentSuccess from "./pages/PaymentSuccess";
import PreApplyAI from "./pages/PreApplyAI";
import Support from "./pages/Support";
import ChromeExtensionImageEditor from "./pages/ChromeExtensionImageEditor";
import TrelloBridge from "./pages/TrelloBridge";
import BackgroundRemover from "./pages/BackgroundRemover";
import HeicToJpg from "./pages/HeicToJpg";
import ResuFill from "./pages/ResuFill";
import ScrollToTop from "./components/ScrollToTop";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <HelmetProvider>
        <AuthProvider>
          <div className="min-h-screen flex flex-col">
            <Toaster />
            <Sonner />
            <BrowserRouter>
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
                    <AdminLayout />
                  </ProtectedRoute>
                }>
                  <Route index element={<AdminOverview />} />
                  <Route path="users" element={<AdminOverview />} />
                  <Route path="products" element={<AdminProducts />} />
                  <Route path="analytics" element={<AdminAnalytics />} />
                  <Route path="pod-pipeline" element={<AdminPodPipeline />} />
                  <Route path="security/detections" element={<AdminDetections />} />
                  <Route path="security/corrections" element={<AdminCorrections />} />
                  <Route path="security/patterns" element={<AdminPatterns />} />
                  <Route path="security/reports" element={<AdminUserReports />} />
                  <Route path="settings" element={<AdminSettings />} />
                </Route>
                <Route path="/payment-success" element={
                  <ProtectedRoute>
                    <PaymentSuccess />
                  </ProtectedRoute>
                } />
                <Route path="/products" element={<Products />} />
                <Route path="/products/pre-apply-ai" element={<PreApplyAI />} />
                <Route path="/products/chrome-extension-image-editor" element={<ChromeExtensionImageEditor />} />
                <Route path="/products/heic-to-jpg" element={<HeicToJpg />} />
                <Route path="/products/resufill" element={<ResuFill />} />
                <Route path="/background-remover" element={<BackgroundRemover />} />
                <Route path="/products/trellobridge" element={<TrelloBridge />} />
                <Route path="/products/:slug" element={<ProductDetail />} />
                <Route path="/contact" element={<Contact />} />
                <Route path="/support" element={<Support />} />
                <Route path="/insightreel" element={<InsightReelLanding />} />
                <Route path="/insightreel/pricing" element={<InsightReelPricing />} />
                <Route path="/insightreel/dashboard" element={
                  <ProtectedRoute>
                    <InsightReelDashboard />
                  </ProtectedRoute>
                } />
                <Route path="/insightreel/success" element={
                  <ProtectedRoute>
                    <InsightReelSuccess />
                  </ProtectedRoute>
                } />
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
