import React from 'react';
import { Home, Coffee, ReceiptText, User, LucideIcon } from 'lucide-react';

// 1. Definisikan Props Utama
interface BottomNavProps {
  currentView: string;
  setView: (view: string) => void;
}

// 2. Definisikan tipe untuk setiap item navigasi
interface NavItem {
  id: string;
  icon: LucideIcon;
  label: string;
}

export default function BottomNav({ currentView, setView }: BottomNavProps) {
  // Tema disesuaikan untuk F&B / Coffee Shop
  const navItems: NavItem[] = [
    { id: 'landing', icon: Home, label: 'Beranda' },
    { id: 'menu', icon: Coffee, label: 'Menu' }, // Menggunakan ikon Coffee untuk restoran/kafe
    { id: 'tracking', icon: ReceiptText, label: 'Pesanan' }, // Ikon struk yang lebih detail
    { id: 'others', icon: User, label: 'Profil' },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-white/90 dark:bg-slate-900/90 backdrop-blur-2xl border-t border-slate-200/50 dark:border-slate-800/50 shadow-[0_-10px_40px_rgba(0,0,0,0.04)]">
      {/* Container max-w-md agar tampilannya tetap proporsional di tablet/desktop */}
      <div 
        className="max-w-md mx-auto flex justify-between items-center px-6 pt-2 pb-4 sm:pb-3" 
        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 12px)' }}
      >
        {navItems.map((item: NavItem) => {
          const isActive = currentView === item.id;
          const Icon = item.icon;
          
          return (
            <button 
              key={item.id} 
              onClick={() => setView(item.id)}
              className="relative flex flex-col items-center justify-center w-16 group tap-highlight-transparent"
            >
              {/* Box Ikon dengan Animasi Melayang */}
              <div 
                className={`relative flex items-center justify-center w-11 h-9 rounded-2xl transition-all duration-300 ease-out ${
                  isActive 
                    ? 'bg-blue-50 dark:bg-blue-500/20 text-blue-700 dark:text-blue-400 -translate-y-1.5 shadow-sm' 
                    : 'text-slate-400 dark:text-slate-500 group-hover:text-blue-600 dark:group-hover:text-blue-400 group-hover:bg-slate-50 dark:group-hover:bg-slate-800/50'
                }`}
              >
                <Icon size={22} strokeWidth={isActive ? 2.5 : 2} />
              </div>
              
              {/* Label Teks */}
              <span 
                className={`text-[10px] mt-1 transition-all duration-300 ${
                  isActive 
                    ? 'font-bold text-blue-700 dark:text-blue-400' 
                    : 'font-medium text-slate-500 dark:text-slate-400 -translate-y-0.5'
                }`}
              >
                {item.label}
              </span>
              
              {/* Indikator Garis Elegan di Bawah (Pill Indicator) */}
              {isActive && (
                <div className="absolute -bottom-2 w-3.5 h-1 bg-blue-600 dark:bg-blue-500 rounded-full animate-in zoom-in duration-300" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
