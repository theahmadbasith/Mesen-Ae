import { Outlet } from 'react-router-dom';
import { useThemeColor } from '@/hooks/use-theme-color';
import KitchenTopbar from './KitchenTopbar';

export default function KitchenLayout() {
  useThemeColor(); // Apply saved theme color on mount

  return (
    <div className="flex flex-col h-screen w-full bg-background text-foreground overflow-hidden select-none">
      
      {/* ── KITCHEN TOPBAR PREMIUM ── */}
      <KitchenTopbar />

      {/* ── MAIN SCROLLABLE CONTENT ── */}
      <main className="flex-1 overflow-y-auto w-full p-6 space-y-6">
        <Outlet />
      </main>

    </div>
  );
}
