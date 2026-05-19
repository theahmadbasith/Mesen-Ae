import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import AdminApp from "./admin/AdminApp";
import CustomerApp from "./customer/CustomerApp";
import ErrorBoundary from "@/components/ErrorBoundary";
import { isDbConfigured } from "./lib/db";
import { queryClient } from '@/lib/query-client';

function DatabaseWarning() {
  if (isDbConfigured) return null;
  const isAdminPath = typeof window !== 'undefined' && window.location.pathname.startsWith('/admin');
  return (
    <div className="w-full bg-red-600 text-white text-sm py-2 px-4 text-center z-50">
      Database belum dikonfigurasi. Pastikan `SPREADSHEET_ID` dan `FOLDER_UTAMA_ID` sudah diisi.
      {isAdminPath ? ' Untuk admin, juga pastikan `GOOGLE_SERVICE_ACCOUNT_JSON` dan `ADMIN_API_KEY` sudah diset di environment server.' : ' Cek `.env.example` untuk contoh lengkap.'}
    </div>
  );
}

const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <DatabaseWarning />
        <Toaster />
        <Sonner />
        <ErrorBoundary>
          <BrowserRouter>
            <Routes>
              <Route path="/admin/*" element={<AdminApp />} />
              <Route path="/*" element={<CustomerApp />} />
            </Routes>
          </BrowserRouter>
        </ErrorBoundary>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
