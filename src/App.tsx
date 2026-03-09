import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { AuthProvider } from "@/hooks/useAuth";
import ProtectedRoute from "@/components/ProtectedRoute";
import LandingPage from "./pages/LandingPage";
import Login from "./pages/Login";
import Register from "./pages/Register";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import ListsOverview from "./pages/ListsOverview";
import ListDetail from "./pages/ListDetail";
import ScanReceiptPage from "./pages/ScanReceiptPage";
import CalendarPage from "./pages/CalendarPage";
import SurveyPage from "./pages/SurveyPage";
import SharedListPage from "./pages/SharedListPage";
import SettingsPage from "./pages/SettingsPage";
import OnboardingPage from "./pages/OnboardingPage";
import ImpressumPage from "./pages/ImpressumPage";
import DatenschutzPage from "./pages/DatenschutzPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
      <TooltipProvider>
        <Toaster />
        <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/login" element={<Login />} />
            <Route path="/registrieren" element={<Register />} />
            <Route path="/passwort-vergessen" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/listen" element={
              <ProtectedRoute><ListsOverview /></ProtectedRoute>
            } />
            <Route path="/listen/:id" element={
              <ProtectedRoute><ListDetail /></ProtectedRoute>
            } />
            <Route path="/kalender" element={
              <ProtectedRoute><CalendarPage /></ProtectedRoute>
            } />
            <Route path="/umfrage" element={
              <ProtectedRoute><SurveyPage /></ProtectedRoute>
            } />
            <Route path="/einstellungen" element={
              <ProtectedRoute><SettingsPage /></ProtectedRoute>
            } />
            <Route path="/willkommen" element={
              <ProtectedRoute><OnboardingPage /></ProtectedRoute>
            } />
            {/* Public shared list page - no auth required */}
            <Route path="/teilen/:token" element={<SharedListPage />} />
            <Route path="/datenschutz" element={<DatenschutzPage />} />
            <Route path="/impressum" element={<ImpressumPage />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

const PlaceholderPage = ({ title }: { title: string }) => (
  <div className="container py-20 max-w-2xl">
    <h1 className="text-3xl font-bold mb-4">{title}</h1>
    <p className="text-muted-foreground">Inhalt folgt.</p>
  </div>
);

export default App;
