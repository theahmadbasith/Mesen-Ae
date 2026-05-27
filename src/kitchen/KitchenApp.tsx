import { Suspense, lazy } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import KitchenLayout from "./components/layout/KitchenLayout";

const KitchenDisplay = lazy(() => import("./pages/KitchenDisplay"));

// Kitchen Protected Route Wrapper
const KitchenProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const authString = localStorage.getItem('kitchen_auth');
  
  if (!authString) {
    return <Navigate to="/login" replace />;
  }
  
  try {
    const auth = JSON.parse(authString);
    if (!auth || !['admin', 'user', 'dapur'].includes(auth.role)) {
      return <Navigate to="/login" replace />;
    }
    
    // Check if session has expired
    if (auth.expiresAt && Date.now() > auth.expiresAt) {
      localStorage.removeItem('kitchen_auth');
      localStorage.removeItem('admin_auth');
      return <Navigate to="/login" replace />;
    }
  } catch (e) {
    return <Navigate to="/login" replace />;
  }
  
  return <>{children}</>;
};

export default function KitchenApp() {
  return (
    <Routes>
      <Route element={
        <KitchenProtectedRoute>
          <KitchenLayout />
        </KitchenProtectedRoute>
      }>
        <Route path="" element={
          <Suspense fallback={
            <div className="flex-1 flex items-center justify-center py-20">
              <div className="w-10 h-10 border-4 border-orange-500/30 border-t-orange-500 rounded-full animate-spin" />
            </div>
          }>
            <KitchenDisplay />
          </Suspense>
        } />
      </Route>
      
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}
