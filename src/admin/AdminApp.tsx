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
const ActiveOrders = lazy(() => import("./pages/ActiveOrders"));
const Kitchen = lazy(() => import("./pages/Kitchen"));
const QrCodeMenu = lazy(() => import("./pages/QrCodeMenu"));
const Vouchers = lazy(() => import("./pages/Vouchers"));
const BannerPromo = lazy(() => import("./pages/BannerPromo"));

// Protected Route Wrapper
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const authString = localStorage.getItem('admin_auth');
  if (!authString) {
    return <Navigate to="/login" replace />;
  }
  
  try {
    const auth = JSON.parse(authString);
    if (!auth || !auth.role) return <Navigate to="/login" replace />;
    
    // Check if session has expired
    if (auth.expiresAt && Date.now() > auth.expiresAt) {
      localStorage.removeItem('admin_auth');
      return <Navigate to="/login" replace />;
    }
  } catch (e) {
    // If it's a legacy 'true', let it pass
    if (authString !== 'true') {
      return <Navigate to="/login" replace />;
    }
  }
  
  return <>{children}</>;
};

// Role Guard Wrapper
const AdminOnlyRoute = ({ children, allowedForUser = false }: { children: React.ReactNode, allowedForUser?: boolean }) => {
  const authString = localStorage.getItem('admin_auth');
  try {
    const auth = JSON.parse(authString || '{}');
    
    // Check expiration even in Role Guard just to be safe
    if (auth.expiresAt && Date.now() > auth.expiresAt) {
      localStorage.removeItem('admin_auth');
      return <Navigate to="/login" replace />;
    }

    if (auth.role === 'user' && !allowedForUser) return <Navigate to="/admin/kitchen" replace />;
  } catch (e) {
    // legacy
  }
  return <>{children}</>;
};

import { useEffect } from "react";
import { requestForToken, onMessageListener } from "@/lib/fcm";
import { toast } from "sonner";

export default function AdminApp() {
  useEffect(() => {
    // Request token for admin
    requestForToken('admin', 'admin_user').then((token) => {
      if (token) console.log('Admin FCM Ready');
    });

    // Listen for foreground messages
    onMessageListener().then((payload: any) => {
      toast.success(payload?.notification?.title || 'Pesanan Baru!', {
        description: payload?.notification?.body || 'Cek daftar pesanan aktif.',
      });
    }).catch(err => console.log('failed: ', err));
  }, []);

  return (
    <Routes>
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
        <Route path="banner" element={
          <AdminOnlyRoute>
            <Suspense fallback={<PageSkeleton />}>
              <BannerPromo />
            </Suspense>
          </AdminOnlyRoute>
        } />
      </Route>
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}
