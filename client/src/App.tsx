import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { AuthProvider } from "./contexts/AuthContext";
import Home from "./pages/Home";
import Auth from "./pages/Auth";
import ResetPassword from "./pages/ResetPassword";
import AdminPanel from "./pages/AdminPanel";
import AdminQuotations from "./pages/AdminQuotations";
import QuotationView from "./pages/QuotationView";
import ClientArea from "./pages/ClientArea";
import ProtectedRoute from "./components/ProtectedRoute";
import Billing from "./pages/Billing";
import Projects from "./pages/Projects";
import Quotations from "./pages/Quotations";
import Support from "./pages/Support";
import EmployeeAuth from "./pages/EmployeeAuth";
import EmployeeArea from "./pages/EmployeeArea";
import EmployeeRoute from "./components/EmployeeRoute";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import CookiePolicy from "./pages/CookiePolicy";
import TermsOfService from "./pages/TermsOfService";
import LegalNotice from "./pages/LegalNotice";
import CookieBanner from "./components/CookieBanner";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/auth" component={Auth} />
      <Route path="/auth/reset-password" component={ResetPassword} />
      <Route path="/admin" component={AdminPanel} />
      <Route path="/admin/presupuestos" component={AdminQuotations} />
      <Route path="/presupuesto/:id" component={QuotationView} />
      <Route path="/area-cliente" component={() => <ProtectedRoute><ClientArea /></ProtectedRoute>} />
      <Route path="/area-cliente/proyectos" component={() => <ProtectedRoute><Projects /></ProtectedRoute>} />
      <Route path="/area-cliente/presupuestos" component={() => <ProtectedRoute><Quotations /></ProtectedRoute>} />
      <Route path="/area-cliente/facturacion" component={() => <ProtectedRoute><Billing /></ProtectedRoute>} />
      <Route path="/area-cliente/soporte" component={() => <ProtectedRoute><Support /></ProtectedRoute>} />
      
      {/* Rutas de Empleados */}
      <Route path="/empleados/login" component={EmployeeAuth} />
      <Route path="/area-empleados" component={() => <EmployeeRoute><EmployeeArea /></EmployeeRoute>} />
      
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
