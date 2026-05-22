import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";

import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { Suspense, lazy } from "react";
import AdminApp from "./admin/AdminApp";
import CustomerApp from "./customer/CustomerApp";
import KitchenApp from "./kitchen/KitchenApp";
import ErrorBoundary from "@/components/ErrorBoundary";
import { isDbConfigured } from "./lib/db";

import Home from "./Home";

const SharedLogin = lazy(() => import("./login/Login"));

// Database connection is managed via Firebase real-time sync.

function IndexRoute() {
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  
  // Jika path adalah / (root) dan tidak ada parameter table, tampilkan Home
  if (location.pathname === '/' && !searchParams.has('table')) {
    return <Home />;
  }
  
  // Jika /order, atau root yang ada parameter table, jalankan CustomerApp
  return <CustomerApp />;
}

const App = () => {
  return (

      <TooltipProvider>
        <Toaster />
        <Sonner />
        <ErrorBoundary>
          <BrowserRouter>
            <Routes>
              <Route path="/login" element={
                <Suspense fallback={
                  <div className="min-h-screen flex bg-zinc-950 items-center justify-center">
                    <div className="w-10 h-10 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
                  </div>
                }>
                  <SharedLogin />
                </Suspense>
              } />
              <Route path="/admin/*" element={<AdminApp />} />
              <Route path="/kitchen/*" element={<KitchenApp />} />
              <Route path="/*" element={<IndexRoute />} />
            </Routes>
          </BrowserRouter>
        </ErrorBoundary>
      </TooltipProvider>
  );
};

export default App;
