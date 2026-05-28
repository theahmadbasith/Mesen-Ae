import { Suspense, lazy, useEffect } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { requestForToken } from "@/lib/fcm";
import { toast } from "sonner";
import AppLayout from "@/admin/components/layout/AppLayout";
import { usePermissions, UserPermissions } from "@/hooks/use-permissions";
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
const Categories = lazy(() => import("./pages/Categories"));
const Settings = lazy(() => import("./pages/Settings"));
const SupplierPage = lazy(() => import("./pages/Supplier"));
const StockInPage = lazy(() => import("./pages/StockIn"));
const StockOutPage = lazy(() => import("./pages/StockOut"));
const TransactionHistory = lazy(() => import("./pages/TransactionHistory"));
const StockReport = lazy(() => import("./pages/StockReport"));
const ActiveOrders = lazy(() => import("./pages/ActiveOrders"));
const Kitchen = lazy(() => import("./pages/Kitchen"));
const QrCodeMenu = lazy(() => import("./pages/QrCodeMenu"));
const QrisDinamisMenu = lazy(() => import("./pages/QrisDinamisMenu"));
const Vouchers = lazy(() => import("./pages/Vouchers"));
const BannerPromo = lazy(() => import("./pages/BannerPromo"));
const BannerEditor = lazy(() => import("./pages/BannerEditor"));
const BarcodePrint = lazy(() => import("./pages/BarcodePrint"));

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
    localStorage.removeItem('admin_auth');
    return <Navigate to="/login" replace />;
  }
  
  return <>{children}</>;
};

// Admin Only Route Wrapper (or cashier if allowed)
const ProtectedModuleRoute = ({ children, moduleName }: { children: React.ReactNode, moduleName: keyof UserPermissions }) => {
  const authString = localStorage.getItem('admin_auth');
  if (!authString) return <Navigate to="/login" replace />;
  
  try {
    const auth = JSON.parse(authString);
    if (auth.role === 'admin') {
      return <>{children}</>;
    }

    // Check permissions
    const permissions = auth.permissions || {};
    if (permissions[moduleName]?.view) {
      return <>{children}</>;
    }
  } catch (e) {}
  
  return <Navigate to="/admin" replace />;
};

export default function AdminApp() {
  const authData = JSON.parse(localStorage.getItem('admin_auth') || '{}');
  const role = authData.role || 'admin';
  const name = authData.name || 'Admin';

  // Request notification permission on mount
  useEffect(() => {
    if (role && name) {
      requestForToken('admin', name).then(token => {
        if (token) {
          console.log('Web push token updated successfully');
        }
      });
    }
  }, [role, name]);

  return (
    <Routes>
      <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
        <Route path="" element={
          <ProtectedModuleRoute moduleName="dashboard">
            <Suspense fallback={<DashboardSkeleton />}>
              <Dashboard />
            </Suspense>
          </ProtectedModuleRoute>
        } />
        <Route path="cashier" element={
          <ProtectedModuleRoute moduleName="cashier">
            <Suspense fallback={<PageSkeleton />}>
              <Cashier />
            </Suspense>
          </ProtectedModuleRoute>
        } />
        <Route path="orders" element={
          <ProtectedModuleRoute moduleName="activeOrders">
            <Suspense fallback={<PageSkeleton />}>
              <ActiveOrders />
            </Suspense>
          </ProtectedModuleRoute>
        } />
        <Route path="kitchen" element={
          <ProtectedModuleRoute moduleName="kitchen">
            <Suspense fallback={<PageSkeleton />}>
              <Kitchen />
            </Suspense>
          </ProtectedModuleRoute>
        } />
        <Route path="products" element={
          <ProtectedModuleRoute moduleName="products">
            <Suspense fallback={<ProductsSkeleton />}>
              <Products />
            </Suspense>
          </ProtectedModuleRoute>
        } />
        <Route path="categories" element={
          <ProtectedModuleRoute moduleName="categories">
            <Suspense fallback={<PageSkeleton />}>
              <Categories />
            </Suspense>
          </ProtectedModuleRoute>
        } />
        <Route path="reports" element={
          <ProtectedModuleRoute moduleName="reports">
            <Suspense fallback={<ReportsSkeleton />}>
              <Reports />
            </Suspense>
          </ProtectedModuleRoute>
        } />
        <Route path="settings" element={
          <ProtectedModuleRoute moduleName="settings">
            <Suspense fallback={<SettingsSkeleton />}>
              <Settings />
            </Suspense>
          </ProtectedModuleRoute>
        } />
        <Route path="supplier" element={
          <ProtectedModuleRoute moduleName="suppliers">
            <Suspense fallback={<PageSkeleton />}>
              <SupplierPage />
            </Suspense>
          </ProtectedModuleRoute>
        } />
        <Route path="stock-in" element={
          <ProtectedModuleRoute moduleName="stockIn">
            <Suspense fallback={<PageSkeleton />}>
              <StockInPage />
            </Suspense>
          </ProtectedModuleRoute>
        } />
        <Route path="stock-out" element={
          <ProtectedModuleRoute moduleName="stockOut">
            <Suspense fallback={<PageSkeleton />}>
              <StockOutPage />
            </Suspense>
          </ProtectedModuleRoute>
        } />
        <Route path="barcode" element={
          <ProtectedModuleRoute moduleName="tools">
            <Suspense fallback={<PageSkeleton />}>
              <BarcodePrint />
            </Suspense>
          </ProtectedModuleRoute>
        } />
        <Route path="history" element={
          <ProtectedModuleRoute moduleName="history">
            <Suspense fallback={<TransactionHistorySkeleton />}>
              <TransactionHistory />
            </Suspense>
          </ProtectedModuleRoute>
        } />
        <Route path="stock-report" element={
          <ProtectedModuleRoute moduleName="reports">
            <Suspense fallback={<PageSkeleton />}>
              <StockReport />
            </Suspense>
          </ProtectedModuleRoute>
        } />
        <Route path="qr-code" element={
          <ProtectedModuleRoute moduleName="marketing">
            <Suspense fallback={<PageSkeleton />}>
              <QrCodeMenu />
            </Suspense>
          </ProtectedModuleRoute>
        } />
        <Route path="qris-dinamis" element={
          <ProtectedModuleRoute moduleName="tools">
            <Suspense fallback={<PageSkeleton />}>
              <QrisDinamisMenu />
            </Suspense>
          </ProtectedModuleRoute>
        } />
        <Route path="vouchers" element={
          <ProtectedModuleRoute moduleName="marketing">
            <Suspense fallback={<VouchersSkeleton />}>
              <Vouchers />
            </Suspense>
          </ProtectedModuleRoute>
        } />
        <Route path="banner" element={
          <ProtectedModuleRoute moduleName="marketing">
            <Suspense fallback={<PageSkeleton />}>
              <BannerPromo />
            </Suspense>
          </ProtectedModuleRoute>
        } />
        <Route path="banner/edit/:id" element={
          <ProtectedModuleRoute moduleName="marketing">
            <Suspense fallback={<PageSkeleton />}>
              <BannerEditor />
            </Suspense>
          </ProtectedModuleRoute>
        } />
      </Route>
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}
