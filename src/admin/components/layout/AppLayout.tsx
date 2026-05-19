import { Outlet } from 'react-router-dom';
import { useDbQuery, dbInsert, dbUpdate, dbDelete } from '@/hooks/db-hooks';
import { useEffect, useState } from 'react';
import { useThemeColor } from '@/hooks/use-theme-color';
import AppSidebar from './AppSidebar';
import AppTopbar from './AppTopbar';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Menu, Store, Maximize, Minimize } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { Skeleton } from '@/admin/components/SkeletonLoaders';

export default function AppLayout() {
  useThemeColor(); // Apply saved theme color on mount
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch((err) => {
        console.error(`Error attempting to enable fullscreen: ${err.message}`);
      });
    } else {
      document.exitFullscreen();
    }
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);


  // Close mobile sidebar on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  const allSettings = useDbQuery('storeSettings');
  const storeSettings = allSettings?.[0];
  // NOTE: Seeding default store settings automatically on admin layout mount
  // has been removed to prevent accidental writes. Store settings should be
  // created/modified explicitly via the Settings page or via sheet editing.

  // Loading state — show skeleton layout
  if (allSettings === undefined) {
    return (
      <div className="flex h-screen w-full bg-background overflow-hidden">
        {/* Desktop Sidebar Skeleton */}
        <div className="hidden lg:flex h-full w-64 shrink-0 flex-col border-r bg-card p-4 gap-4">
          <div className="flex items-center gap-3 px-2 py-3">
            <Skeleton className="w-9 h-9 rounded-xl" />
            <Skeleton className="h-5 w-24" />
          </div>
          <div className="space-y-1.5 flex-1">
            {[1,2,3,4,5,6,7].map(i => (
              <Skeleton key={i} className="h-10 w-full rounded-lg" />
            ))}
          </div>
        </div>

        {/* Main Content Skeleton */}
        <div className="flex-1 flex flex-col h-full overflow-hidden">
          <div className="lg:hidden flex items-center justify-between p-4 border-b bg-card">
            <div className="flex items-center gap-2">
              <Skeleton className="w-8 h-8 rounded-lg" />
              <Skeleton className="h-5 w-20" />
            </div>
            <Skeleton className="w-9 h-9 rounded-lg" />
          </div>
          <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
            <div className="space-y-4">
              <div className="flex justify-between">
                <Skeleton className="h-7 w-40" />
                <Skeleton className="h-9 w-24 rounded-lg" />
              </div>
              {[1,2,3,4].map(i => (
                <Skeleton key={i} className="h-16 w-full rounded-xl" />
              ))}
            </div>
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen w-full bg-background overflow-hidden">
      {/* Desktop Sidebar */}
      <div className="hidden lg:block h-full">
        <AppSidebar />
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-full overflow-hidden relative">
        {/* Mobile Sidebar Drawer Sheet */}
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetContent side="left" className="p-0 w-64 border-r-0 bg-[#0a1128]">
            <AppSidebar isMobile={true} />
          </SheetContent>
        </Sheet>

        {/* Main Scrollable Content */}
        <main className="flex-1 overflow-y-auto w-full max-w-[1600px] mx-auto p-4 md:p-6 lg:p-8 space-y-6">
          {/* Topbar for desktop & mobile */}
          <AppTopbar 
            isFullscreen={isFullscreen} 
            onToggleFullscreen={toggleFullscreen} 
            onToggleMobileSidebar={() => setMobileOpen(true)}
          />
          <Outlet />
        </main>
      </div>
    </div>
  );
}
