import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";

import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Suspense, lazy } from "react";
import AdminApp from "./admin/AdminApp";
import KitchenApp from "./kitchen/KitchenApp";
import ErrorBoundary from "@/components/ErrorBoundary";

import { useThemeColor } from "./hooks/use-theme-color";

const SharedLogin = lazy(() => import("./login/Login"));

// Database connection is managed via Firebase real-time sync.

const App = () => {
  useThemeColor(); // Activate global theme color sync

  return (
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <ErrorBoundary>
          <BrowserRouter>
            <Routes>
              {/* Paksa pengunjung root menuju login */}
              <Route path="/" element={<Navigate to="/login" replace />} />
              
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
            </Routes>
          </BrowserRouter>
        </ErrorBoundary>
      </TooltipProvider>
  );
};

export default App;
