import React, { useEffect, lazy, Suspense } from 'react';
import { Switch, Route, Router as WouterRouter, useLocation } from "wouter";
import { NavBar } from "@/components/NavBar";
import { Footer } from "@/components/Footer";
import { ScrollToTop } from "@/components/ScrollToTop";
import { AuthProvider } from "@/context/AuthContext";
import { getPublicSettings } from "@/lib/api";

import { Home } from "@/pages/Home";
import { Program } from "@/pages/Program";
import { Speakers } from "@/pages/Speakers";
import { VerifyCertificate } from "@/pages/VerifyCertificate";
import { Maintenance } from "@/pages/Maintenance";

// Lazy loaded page components
const Register = lazy(() => import("@/pages/Register").then(m => ({ default: m.Register })));
const Profile = lazy(() => import("@/pages/Profile").then(m => ({ default: m.Profile })));

// Lazy loaded admin components
const AdminLogin = lazy(() => import("@/pages/admin/AdminLogin").then(m => ({ default: m.AdminLogin })));
const AdminLayout = lazy(() => import("@/pages/admin/AdminLayout").then(m => ({ default: m.AdminLayout })));
import "./admin.css";

// Page level spinner fallback
const PageLoader = () => (
  <div style={{
    height: '70vh',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0D1117',
    color: '#F1F5F9',
    gap: '1rem'
  }}>
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ animation: 'spin-slow 2s linear infinite', color: '#3B8BD4' }}>
      <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
    </svg>
    <span style={{ fontSize: '0.95rem', fontWeight: 600, letterSpacing: '0.05em' }}>Loading...</span>
  </div>
);

// App level full-screen spinner fallback
const AppLoader = () => (
  <div style={{
    height: '100vh',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0D1117',
    color: '#F1F5F9',
    gap: '1rem'
  }}>
    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ animation: 'spin-slow 2s linear infinite', color: '#3B8BD4' }}>
      <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
    </svg>
    <span style={{ fontSize: '1rem', fontWeight: 600, letterSpacing: '0.05em' }}>Loading...</span>
  </div>
);

function Router() {
  return (
    <div className="page">
      <Switch>
        <Route path="/" component={Home} />
        <Route path="/program" component={Program} />
        <Route path="/program/:moduleIndex" component={Program} />
        <Route path="/speakers" component={Speakers} />
        <Route path="/register" component={Register} />
        <Route path="/login" component={Register} />
        <Route path="/profile" component={Profile} />
        <Route path="/verify/:id" component={VerifyCertificate} />
        
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
  const [isMaintenance, setIsMaintenance] = React.useState(false);
  const [loading, setLoading] = React.useState(true);

  // Global Referral Tracker
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const refCode = urlParams.get('ref');
    if (refCode) {
      localStorage.setItem('referralCode', refCode);
    }
  }, [location]);

  // Check Maintenance Mode
  useEffect(() => {
    getPublicSettings()
      .then(data => {
        setIsMaintenance(data?.isMaintenanceMode || false);
      })
      .catch(err => {
        console.error('Failed to fetch settings', err);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  if (loading) {
    return <AppLoader />;
  }

  if (isMaintenance && !isAdminRoute) {
    return <Maintenance />;
  }

  return (
    <>
      <ScrollToTop />
      {!isAdminRoute && <NavBar />}
      <Suspense fallback={<PageLoader />}>
        <Router />
        {!isAdminRoute && <Footer />}
      </Suspense>
    </>
  );
}

import { Toaster } from 'sonner';

function App() {
  return (
    <AuthProvider>
      <Toaster position="top-center" richColors />
      <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
        <Suspense fallback={<AppLoader />}>
          <MainLayout />
        </Suspense>
      </WouterRouter>
    </AuthProvider>
  );
}

export default App;
