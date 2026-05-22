import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ShoppingBag, LogIn, ChevronRight } from 'lucide-react';
import { useThemeColor } from '@/hooks/use-theme-color';
import { useDbQuery } from '@/hooks/db-hooks';

export default function Home() {
  useThemeColor();
  const navigate = useNavigate();
  const storeSettingsList = useDbQuery<any>('storeSettings') ?? [];
  const storeSettings = storeSettingsList[0] || null;

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-zinc-950 text-slate-100 relative overflow-hidden px-6">
      {/* Background Decor */}
      <div className="absolute inset-0 bg-gradient-to-br from-zinc-950 via-zinc-900 to-zinc-950" />
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-primary/10 blur-[120px] mix-blend-screen" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-orange-600/5 blur-[120px] mix-blend-screen" />

      <div className="relative z-10 w-full max-w-md flex flex-col items-center text-center">
        {/* Logo */}
        <div className="w-24 h-24 mb-8 bg-white/5 backdrop-blur-md rounded-3xl flex items-center justify-center shadow-2xl border border-white/10 relative group p-2 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-tr from-primary/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-3xl" />
          <img
            src={storeSettings?.logo || "/icon-192.png"}
            alt={storeSettings?.storeName || "MesenAe Logo"}
            className="w-full h-full object-contain drop-shadow-2xl transition-transform duration-500 group-hover:scale-110"
            onError={(e) => {
              const target = e.currentTarget;
              target.style.display = 'none';
            }}
          />
        </div>

        <h1 className="text-4xl font-black tracking-tight mb-4 text-transparent bg-clip-text bg-gradient-to-r from-white via-slate-100 to-orange-400">
          {storeSettings?.storeName || "MesenAe"}
        </h1>
        <p className="text-sm text-zinc-400 mb-12 font-medium px-4">
          Selamat datang di portal MesenAe. Silakan pilih layanan yang ingin Anda akses.
        </p>

        <div className="w-full space-y-4">
          <Button
            onClick={() => navigate('/order')}
            className="w-full h-14 text-base font-bold rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/20 hover:shadow-primary/30 flex items-center justify-between px-6"
          >
            <span className="flex items-center gap-3">
              <ShoppingBag className="w-5 h-5" />
              Self Order Customer
            </span>
            <ChevronRight className="w-5 h-5 opacity-70" />
          </Button>

          <Button
            onClick={() => navigate('/login')}
            variant="outline"
            className="w-full h-14 text-base font-bold rounded-xl border-zinc-800 bg-zinc-900/50 hover:bg-zinc-800 text-white flex items-center justify-between px-6"
          >
            <span className="flex items-center gap-3">
              <LogIn className="w-5 h-5" />
              Login Admin & Staf
            </span>
            <ChevronRight className="w-5 h-5 opacity-70" />
          </Button>
        </div>
      </div>
    </div>
  );
}
