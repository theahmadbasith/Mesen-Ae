import { Suspense, lazy } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import AppLayout from "@/admin/components/layout/AppLayout";
import {
  DashboardSkeleton,
  ProductsSkeleton,
  ReportsSkeleton,
  TransactionHistorySkeleton,
  VouchersSkeleton,
  SettingsSkeleton,
  PageSkeleton,
} from "@/admin/components/SkeletonLoaders";

const Dashboard = lazy(() => import("./pages/Dashboard"));
const Cashier = lazy(() => import("./pages/Cashier"));
const Products = lazy(() => import("./pages/Products"));
const Reports = lazy(() => import("./pages/Reports"));
const Settings = lazy(() => import("./pages/Settings"));
const SupplierPage = lazy(() => import("./pages/Supplier"));
const StockInPage = lazy(() => import("./pages/StockIn"));
const StockOutPage = lazy(() => import("./pages/StockOut"));
const TransactionHistory = lazy(() => import("./pages/TransactionHistory"));
const StockReport = lazy(() => import("./pages/StockReport"));
const NotFound = lazy(() => import("./pages/NotFound"));
const Login = lazy(() => import("./pages/Login"));
const ActiveOrders = lazy(() => import("./pages/ActiveOrders"));
const Kitchen = lazy(() => import("./pages/Kitchen"));
const QrCodeMenu = lazy(() => import("./pages/QrCodeMenu"));
const Vouchers = lazy(() => import("./pages/Vouchers"));

// Protected Route Wrapper
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const authString = localStorage.getItem('admin_auth');
  if (!authString) {
    return <Navigate to="/admin/login" replace />;
  }
  
  try {
    const auth = JSON.parse(authString);
    if (!auth || !auth.role) return <Navigate to="/admin/login" replace />;
  } catch (e) {
    // If it's a legacy 'true', let it pass
    if (authString !== 'true') {
      return <Navigate to="/admin/login" replace />;
    }
  }
  
  return <>{children}</>;
};

// Role Guard Wrapper
const AdminOnlyRoute = ({ children, allowedForUser = false }: { children: React.ReactNode, allowedForUser?: boolean }) => {
  const authString = localStorage.getItem('admin_auth');
  try {
    const auth = JSON.parse(authString || '{}');
    if (auth.role === 'user' && !allowedForUser) return <Navigate to="/admin/kitchen" replace />;
  } catch (e) {
    // legacy
  }
  return <>{children}</>;
};

export default function AdminApp() {
  return (
    <Routes>
      <Route path="login" element={
        <Suspense fallback={
          <div className="min-h-screen flex bg-background">
            <div className="hidden lg:block lg:w-1/2 xl:w-[55%] bg-gradient-to-br from-primary/80 via-primary/50 to-primary/30 animate-pulse" />
            <div className="flex-1 flex items-center justify-center p-6">
              <div className="w-full max-w-md space-y-6">
                <div className="h-8 w-32 bg-muted animate-pulse rounded-lg mx-auto" />
                <div className="bg-card border rounded-3xl p-8 space-y-5">
                  <div className="space-y-2">
                    <div className="h-4 w-28 bg-muted animate-pulse rounded" />
                    <div className="h-8 w-48 bg-muted animate-pulse rounded" />
                    <div className="h-3 w-full bg-muted animate-pulse rounded" />
                  </div>
                  <div className="space-y-4">
                    <div className="h-12 w-full bg-muted animate-pulse rounded-xl" />
                    <div className="h-12 w-full bg-muted animate-pulse rounded-xl" />
                    <div className="h-12 w-full bg-primary/20 animate-pulse rounded-xl" />
                  </div>
                  <div className="h-16 w-full bg-muted animate-pulse rounded-xl" />
                </div>
              </div>
            </div>
          </div>
        }>
          <Login />
        </Suspense>
      } />
      <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
        <Route path="" element={
          <AdminOnlyRoute>
            <Suspense fallback={<DashboardSkeleton />}>
              <Dashboard />
            </Suspense>
          </AdminOnlyRoute>
        } />
        <Route path="cashier" element={
          <AdminOnlyRoute>
            <Suspense fallback={<PageSkeleton />}>
              <Cashier />
            </Suspense>
          </AdminOnlyRoute>
        } />
        <Route path="active-orders" element={
          <AdminOnlyRoute allowedForUser>
            <Suspense fallback={<PageSkeleton />}>
              <ActiveOrders />
            </Suspense>
          </AdminOnlyRoute>
        } />
        <Route path="kitchen" element={
          <Suspense fallback={<PageSkeleton />}>
            <Kitchen />
          </Suspense>
        } />
        <Route path="products" element={
          <AdminOnlyRoute>
            <Suspense fallback={<ProductsSkeleton />}>
              <Products />
            </Suspense>
          </AdminOnlyRoute>
        } />
        <Route path="reports" element={
          <AdminOnlyRoute>
            <Suspense fallback={<ReportsSkeleton />}>
              <Reports />
            </Suspense>
          </AdminOnlyRoute>
        } />
        <Route path="settings" element={
          <AdminOnlyRoute>
            <Suspense fallback={<SettingsSkeleton />}>
              <Settings />
            </Suspense>
          </AdminOnlyRoute>
        } />
        <Route path="supplier" element={
          <AdminOnlyRoute>
            <Suspense fallback={<PageSkeleton />}>
              <SupplierPage />
            </Suspense>
          </AdminOnlyRoute>
        } />
        <Route path="stock-in" element={
          <AdminOnlyRoute>
            <Suspense fallback={<PageSkeleton />}>
              <StockInPage />
            </Suspense>
          </AdminOnlyRoute>
        } />
        <Route path="stock-out" element={
          <AdminOnlyRoute>
            <Suspense fallback={<PageSkeleton />}>
              <StockOutPage />
            </Suspense>
          </AdminOnlyRoute>
        } />
        <Route path="history" element={
          <AdminOnlyRoute allowedForUser>
            <Suspense fallback={<TransactionHistorySkeleton />}>
              <TransactionHistory />
            </Suspense>
          </AdminOnlyRoute>
        } />
        <Route path="stock-report" element={
          <AdminOnlyRoute>
            <Suspense fallback={<PageSkeleton />}>
              <StockReport />
            </Suspense>
          </AdminOnlyRoute>
        } />
        <Route path="qr-code" element={
          <AdminOnlyRoute>
            <Suspense fallback={<PageSkeleton />}>
              <QrCodeMenu />
            </Suspense>
          </AdminOnlyRoute>
        } />
        <Route path="vouchers" element={
          <AdminOnlyRoute>
            <Suspense fallback={<VouchersSkeleton />}>
              <Vouchers />
            </Suspense>
          </AdminOnlyRoute>
        } />
      </Route>
      <Route path="*" element={
        <Suspense fallback={<PageSkeleton />}>
          <NotFound />
        </Suspense>
      } />
    </Routes>
  );
}
