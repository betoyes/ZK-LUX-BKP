import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { PageTransition } from "@/components/layout/PageTransition";
import { CookieConsent } from "@/components/CookieConsent";
import { WhatsAppButton } from "@/components/WhatsAppButton";
import { ProductProvider } from "@/context/ProductContext";
import { AuthProvider } from "@/context/AuthContext";
import NotFound from "@/pages/not-found";
import Home from "@/pages/Home";
import { Redirect } from "wouter";
import Shop from "@/pages/Shop";
import Product from "@/pages/Product";
import Cart from "@/pages/Cart";
import Checkout from "@/pages/Checkout";
import Dashboard from "@/pages/admin/Dashboard";
import Login from "@/pages/Login";
import AdminLogin from "@/pages/admin/AdminLogin";
import Account from "@/pages/Account";
import About from "@/pages/About";
import Contact from "@/pages/Contact";
import Wishlist from "@/pages/Wishlist";
import Journal from "@/pages/Journal";
import JournalPost from "@/pages/JournalPost";
import Lookbook from "@/pages/Lookbook";
import Collections from "@/pages/Collections";
import PrivacyPolicy from "@/pages/PrivacyPolicy";
import TermsOfUse from "@/pages/TermsOfUse";
import VerifyEmail from "@/pages/VerifyEmail";
import Manifesto from "@/pages/Manifesto";
import ForgotPassword from "@/pages/ForgotPassword";
import ResetPassword from "@/pages/ResetPassword";
import PrivacyDashboard from "@/pages/PrivacyDashboard";
import Noivas from "@/pages/Noivas";
import Atelier from "@/pages/Atelier";

function Router() {
  return (
    <PageTransition>
      <Switch>
        <Route path="/" component={Home} />
        <Route path="/login" component={Login} />
        <Route path="/register">{() => <Redirect to="/login?mode=register" />}</Route>
        <Route path="/account" component={Account} />
        <Route path="/privacy" component={PrivacyDashboard} />
        <Route path="/verify-email" component={VerifyEmail} />
        <Route path="/forgot-password" component={ForgotPassword} />
        <Route path="/reset-password" component={ResetPassword} />
        <Route path="/shop" component={Shop} />
        <Route path="/collections" component={Collections} />
        <Route path="/noivas" component={Noivas} />
        <Route path="/product/:id" component={Product} />
        <Route path="/cart" component={Cart} />
        <Route path="/checkout" component={Checkout} />
        <Route path="/admin" component={AdminLogin} />
        <Route path="/admin/login" component={AdminLogin} />
        <Route path="/admin/dashboard" component={Dashboard} />
        <Route path="/about" component={About} />
        <Route path="/contact" component={Contact} />
        <Route path="/wishlist" component={Wishlist} />
        <Route path="/journal" component={Journal} />
        <Route path="/journal/:id" component={JournalPost} />
        <Route path="/lookbook" component={Lookbook} />
        <Route path="/privacy-policy" component={PrivacyPolicy} />
        <Route path="/terms-of-use" component={TermsOfUse} />
        <Route path="/manifesto" component={Manifesto} />
        <Route path="/atelier" component={Atelier} />
        <Route component={NotFound} />
      </Switch>
    </PageTransition>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <AuthProvider>
          <ProductProvider>
            <div className="flex flex-col min-h-screen">
              <Navbar />
              <main className="flex-grow">
                <Router />
              </main>
              <Footer />
              <WhatsAppButton />
              <CookieConsent />
            </div>
          </ProductProvider>
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
