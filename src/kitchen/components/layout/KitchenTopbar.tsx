import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut, Maximize, Minimize, Moon, Sun } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useDbQuery } from '@/hooks/db-hooks';

export default function KitchenTopbar() {
  const navigate = useNavigate();
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isDark, setIsDark] = useState(() => document.documentElement.classList.contains('dark'));

  const toggleDarkMode = () => {
    const next = !isDark;
    setIsDark(next);
    document.documentElement.classList.toggle('dark', next);
    localStorage.setItem('mesenae-theme', next ? 'dark' : 'light');
  };

  const storeSettingsList = useDbQuery<any>('storeSettings') ?? [];
  const storeSettings = storeSettingsList[0] || null;

  const authData = JSON.parse(localStorage.getItem('kitchen_auth') || '{}');
  const username = authData.username || 'Koki Dapur';
  const displayName = authData.name || username;

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch((err) => {
        console.error(`Gagal masuk layar penuh: ${err.message}`);
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

  const handleLogout = () => {
    localStorage.removeItem('kitchen_auth');
    navigate('/login');
  };

  return (
    <header className="w-full shrink-0 border-b border-primary/20 bg-background/80 backdrop-blur-2xl px-6 py-4 flex items-center justify-between gap-4 relative shadow-[0_4px_30px_rgba(0,0,0,0.5)] z-10 transition-colors">
      
      {/* Glow efek dekoratif */}
      <div className="absolute top-0 left-[10%] w-[30%] h-[1px] bg-gradient-to-r from-transparent via-primary to-transparent opacity-50"></div>
      
      {/* Brand/Store Info */}
      <div className="flex items-center gap-3.5">
        <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center border border-primary/30 shadow-[0_0_15px_rgba(var(--primary),0.3)] shrink-0 overflow-hidden">
          <img src={storeSettings?.logo || "/logo.png"} alt="Store Logo" className={cn("w-10 h-10 object-contain drop-shadow-md", !storeSettings?.logo && "brightness-0 invert p-1")} />
        </div>
        <div className="flex flex-col justify-center">
          <h2 className="text-base font-black text-transparent bg-clip-text bg-gradient-to-r from-foreground to-foreground/70 tracking-tight leading-none uppercase">
            DAPUR {storeSettings?.storeName || 'MesenAe'}
          </h2>
          <div className="flex items-center gap-2 mt-1">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <p className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest leading-none">
              Sistem Online
            </p>
          </div>
        </div>
      </div>

      {/* Action Controls & Session */}
      <div className="flex items-center gap-4 shrink-0">
        
        {/* User Profile Badge */}
        <div className="hidden sm:flex items-center gap-3 px-3 py-1.5 rounded-xl border border-border bg-muted/50 shadow-inner transition-colors">
          <div className="w-7 h-7 rounded-lg bg-primary/10 border border-primary/20 text-primary font-black text-sm flex items-center justify-center">
            {displayName.charAt(0).toUpperCase()}
          </div>
          <div className="text-left pr-2 leading-tight">
            <p className="text-[11px] font-extrabold text-foreground">{displayName}</p>
            <p className="text-[9px] font-bold text-primary uppercase tracking-widest mt-0.5">User</p>
          </div>
        </div>

        <div className="w-px h-8 bg-border hidden sm:block"></div>

        <div className="flex items-center gap-2">
          {/* Dark Mode Button */}
          <Button 
            variant="outline" 
            size="icon" 
            onClick={toggleDarkMode} 
            className="border-border bg-muted/50 hover:bg-muted rounded-xl h-10 w-10 shrink-0 shadow-sm text-muted-foreground hover:text-foreground transition-all active:scale-95"
            title={isDark ? "Ganti ke Light Mode" : "Ganti ke Dark Mode"}
          >
            {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </Button>

          {/* Fullscreen Button */}
          <Button 
            variant="outline" 
            size="icon" 
            onClick={toggleFullscreen} 
            className="border-border bg-muted/50 hover:bg-muted rounded-xl h-10 w-10 shrink-0 shadow-sm text-muted-foreground hover:text-foreground transition-all active:scale-95"
            title={isFullscreen ? "Keluar Layar Penuh" : "Layar Penuh"}
          >
            {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
          </Button>

          {/* Logout Button */}
          <Button 
            variant="ghost" 
            size="icon"
            onClick={handleLogout}
            className="h-10 w-10 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-500 hover:text-red-600 rounded-xl shrink-0 transition-all active:scale-95"
            title="Keluar Dapur"
          >
            <LogOut className="w-4 h-4" />
          </Button>
        </div>

      </div>
    </header>
  );
}
