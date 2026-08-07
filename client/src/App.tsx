import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { AuthProvider } from "./contexts/AuthContext";
import Home from "./pages/Home";
import AuthSupabase from "./pages/AuthSupabase";
import ResetPasswordSupabase from "./pages/ResetPasswordSupabase";
import AdminPanel from "./pages/AdminPanel";
import AdminQuotations from "./pages/AdminQuotations";
import QuotationView from "./pages/QuotationView";
import ClientAreaSupabase from "./pages/ClientAreaSupabase";
import ProtectedRouteSupabase from "./components/ProtectedRouteSupabase";
import Billing from "./pages/Billing";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import CookiePolicy from "./pages/CookiePolicy";
import TermsOfService from "./pages/TermsOfService";
import LegalNotice from "./pages/LegalNotice";
import CookieBanner from "./components/CookieBanner";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/auth" component={AuthSupabase} />
      <Route path="/auth/reset-password" component={ResetPasswordSupabase} />
      <Route path="/admin" component={AdminPanel} />
      <Route path="/admin/presupuestos" component={AdminQuotations} />
      <Route path="/presupuesto/:id" component={QuotationView} />
      <Route path="/area-cliente" component={() => <ProtectedRouteSupabase><ClientAreaSupabase /></ProtectedRouteSupabase>} />
      <Route path="/area-cliente/facturacion" component={Billing} />
      <Route path="/politica-privacidad" component={PrivacyPolicy} />
      <Route path="/politica-cookies" component={CookiePolicy} />
      <Route path="/terminos" component={TermsOfService} />
      <Route path="/aviso-legal" component={LegalNotice} />
      <Route path="/404" component={NotFound} />
      {/* Final fallback route */}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <ThemeProvider defaultTheme="light">
          <TooltipProvider>
            <Toaster />
            <Router />
            <CookieBanner />
          </TooltipProvider>
        </ThemeProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}

export default App;
