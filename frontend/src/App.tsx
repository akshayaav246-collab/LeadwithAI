import { Switch, Route, Router as WouterRouter, useLocation } from "wouter";
import { NavBar } from "@/components/NavBar";
import { Footer } from "@/components/Footer";
import { ScrollToTop } from "@/components/ScrollToTop";
import { Home } from "@/pages/Home";
import { Program } from "@/pages/Program";
import { Speakers } from "@/pages/Speakers";
import { Register } from "@/pages/Register";
import { Profile } from "@/pages/Profile";
import { AuthProvider } from "@/context/AuthContext";

// Admin Imports
import { AdminLogin } from "@/pages/admin/AdminLogin";
import { AdminLayout } from "@/pages/admin/AdminLayout";
import "./admin.css";

function Router() {
  return (
    <div className="page">
      <Switch>
        <Route path="/" component={Home} />
        <Route path="/program" component={Program} />
        <Route path="/program/:moduleIndex" component={Program} />
        <Route path="/speakers" component={Speakers} />
        <Route path="/speakers" component={Speakers} />
        <Route path="/register" component={Register} />
        <Route path="/profile" component={Profile} />
        
        {/* Admin Routes */}
        <Route path="/admin/login" component={AdminLogin} />
        <Route path="/admin/:rest*">
          <AdminLayout />
        </Route>

        <Route component={Home} />
      </Switch>
    </div>
  );
}

function MainLayout() {
  const [location] = useLocation();
  const isAdminRoute = location.startsWith('/admin');

  return (
    <>
      <ScrollToTop />
      {!isAdminRoute && <NavBar />}
      <Router />
      {!isAdminRoute && <Footer />}
    </>
  );
}

function App() {
  return (
    <AuthProvider>
      <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
        <MainLayout />
      </WouterRouter>
    </AuthProvider>
  );
}

export default App;
