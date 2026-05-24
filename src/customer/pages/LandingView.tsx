import React, { JSX, useState, useEffect, useRef } from 'react';
import { 
  MapPin, Flame, Moon, Sun, Gift, Package, 
  Image as ImageIcon, ArrowRight, Store
} from 'lucide-react';
import { toast } from 'sonner';
import PromoBanner from '@/components/PromoBanner';

import { FORMAT_IDR, cn } from '@/lib/utils';
import { useDbQuery } from '@/hooks/db-hooks';

// ==========================================
// Tipe Data & Interfaces (TypeScript)
// ==========================================

export interface StoreSettings {
  storeName?: string;
  [key: string]: any;
}

export interface CategoryItem {
  id: number | string;
  name: string;
  icon?: string | JSX.Element;
  [key: string]: any;
}

export interface ProductItem {
  id: number | string;
  categoryId: number;
  name: string;
  stock: number;
  price: number;
  photo?: string;
  [key: string]: any;
}

export interface VoucherItem {
  id: number | string;
  isActive?: boolean;
  is_active?: boolean;
  type: 'percentage' | 'fixed';
  value: number;
  description?: string;
  desc?: string;
  [key: string]: any;
}

export interface LandingViewProps {
  setView: (view: string) => void;
  customerName: string;
  isDarkMode: boolean;
  setIsDarkMode: (darkMode: boolean) => void;
  tableNumber: string | number | null;
  setSelectedItem: (item: ProductItem) => void;
  addToCart?: (item: any, qty: number, notes: string, variants: any[]) => void;
  cartLength?: number;
}

export default function LandingView({
  setView,
  customerName,
  isDarkMode,
  setIsDarkMode,
  tableNumber,
  setSelectedItem,
  addToCart,
  cartLength = 0,
}: LandingViewProps): JSX.Element {
  
  // Mengambil data dengan asersi tipe (Type Assertion) yang aman
  const storeSettingsList = (useDbQuery('storeSettings') as StoreSettings[]) ?? [];
  const categories = (useDbQuery('categories') as CategoryItem[]) ?? [];
  const products = (useDbQuery('products') as ProductItem[]) ?? [];
  const vouchers = (useDbQuery('vouchers') as VoucherItem[]) ?? [];

  const storeSettings = storeSettingsList[0] || null;
  const activeVouchers = vouchers.filter((v) => v.isActive || v.is_active);
  const loading = categories.length === 0 && products.length === 0;

  const storeName = storeSettings?.storeName || 'Toko Kami';

  const bannersResult = useDbQuery<any>('banners');
  const banners = React.useMemo(() => bannersResult || [], [bannersResult]);

  // Penawaran dinamis hasil konfigurasi di Tab Banner Admin
  const activeBanners = React.useMemo(() => {
    return banners.filter((b: any) => b.isActive);
  }, [banners]);

  const displayOffers = React.useMemo(() => {
    return activeBanners;
  }, [activeBanners]);

  const [activeDotIndex, setActiveDotIndex] = useState(0);
  const carouselRef = useRef<HTMLDivElement>(null);

  const handleScroll = () => {
    if (!carouselRef.current || displayOffers.length <= 1) return;
    const scrollLeft = carouselRef.current.scrollLeft;
    const width = carouselRef.current.clientWidth;
    if (width > 0) {
      const activeIndex = Math.round(scrollLeft / width);
      setActiveDotIndex(activeIndex);
    }
  };

  // Render Skeleton saat Kondisi Loading
  if (loading) {
    return (
      <div className="flex-1 overflow-y-auto pb-32 bg-slate-50 dark:bg-slate-950">
        {/* Hero skeleton */}
        <div className="bg-slate-200 dark:bg-slate-800 rounded-b-[2.5rem] p-6 pt-12 space-y-6 h-56 animate-pulse">
          <div className="flex justify-between items-start">
            <div className="space-y-3">
              <div className="h-4 w-32 bg-white/40 dark:bg-white/10 rounded-full" />
              <div className="h-8 w-48 bg-white/40 dark:bg-white/10 rounded-full" />
            </div>
            <div className="w-10 h-10 bg-white/40 dark:bg-white/10 rounded-full" />
          </div>
        </div>
        
        <div className="p-6 space-y-8 -mt-10">
          {/* Promo banner skeleton */}
          <div className="h-40 bg-white dark:bg-slate-900 shadow-sm animate-pulse rounded-[1.5rem] border border-slate-100 dark:border-slate-800" />
          
          {/* Categories skeleton */}
          <div className="space-y-4">
            <div className="h-5 w-36 bg-slate-200 dark:bg-slate-800 animate-pulse rounded-full" />
            <div className="flex space-x-4 overflow-hidden">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="flex flex-col items-center space-y-3 min-w-[72px]">
                  <div className="w-16 h-16 rounded-[1.2rem] bg-slate-200 dark:bg-slate-800 animate-pulse" />
                  <div className="h-3 w-12 bg-slate-200 dark:bg-slate-800 animate-pulse rounded-full" />
                </div>
              ))}
            </div>
          </div>
          
          {/* Products skeleton */}
          <div className="space-y-4">
            <div className="h-5 w-40 bg-slate-200 dark:bg-slate-800 animate-pulse rounded-full" />
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="bg-white dark:bg-slate-900 rounded-[1.5rem] p-3 space-y-3 border border-slate-100 dark:border-slate-800 shadow-sm">
                  <div className="h-32 rounded-xl bg-slate-200 dark:bg-slate-800 animate-pulse" />
                  <div className="h-4 w-3/4 bg-slate-200 dark:bg-slate-800 animate-pulse rounded-full" />
                  <div className="h-4 w-1/2 bg-slate-200 dark:bg-slate-800 animate-pulse rounded-full" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto pb-32 bg-slate-50 dark:bg-slate-950 font-sans">
      
      {/* Hero Section */}
      <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-b-[2.5rem] p-6 pt-10 pb-16 text-white relative overflow-hidden shadow-md">
        {/* Dekorasi Latar */}
        <div className="absolute top-[-20%] right-[-10%] w-64 h-64 bg-white/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-[-20%] left-[-10%] w-48 h-48 bg-blue-400/20 rounded-full blur-2xl"></div>
        
        <div className="flex justify-between items-start relative z-10">
          <div className="space-y-1">
            <p className="text-blue-100/90 text-sm font-medium flex items-center gap-1.5">
              Halo, {customerName || 'Tamu'} <span className="animate-wave origin-bottom-right inline-block">👋</span>
            </p>
            <h2 className="text-3xl font-extrabold tracking-tight leading-tight mb-2">
              {storeName}
            </h2>
            <p className="text-sm text-blue-100/80 max-w-xs leading-relaxed hidden sm:block">
              Pilih produk dan layanan favorit Anda langsung dari tempat Anda tanpa perlu antre panjang.
            </p>
          </div>
          
          <button 
            onClick={() => setIsDarkMode(!isDarkMode)}
            className="p-3 bg-white/10 hover:bg-white/20 rounded-full backdrop-blur-md border border-white/10 transition-all active:scale-95"
            aria-label="Toggle Tema"
          >
            {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
          </button>
        </div>
      </div>

      {/* Floating Card: Posisi/Meja */}
      <div className="px-6 -mt-8 relative z-20 mb-8">
        <div className="bg-white dark:bg-slate-900 rounded-[1.5rem] p-4 shadow-xl shadow-slate-200/50 dark:shadow-slate-900/50 flex items-center justify-between border border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-4">
            <div className="bg-blue-50 dark:bg-blue-500/10 p-3.5 rounded-2xl text-blue-600 dark:text-blue-400">
              <MapPin size={24} strokeWidth={2} />
            </div>
            <div>
              <p className="text-[11px] uppercase font-bold tracking-widest text-slate-400 dark:text-slate-500 mb-0.5">
                {tableNumber === 'Bawa Pulang' ? 'Tipe Pesanan' : 'Lokasi Anda'}
              </p>
              <p className="font-extrabold text-lg text-slate-800 dark:text-white leading-none">
                {tableNumber === 'Bawa Pulang' ? 'Take Away (Bawa Pulang)' : tableNumber ? `Meja ${tableNumber}` : 'Belum Ada Meja'}
              </p>
            </div>
          </div>
          <button 
            onClick={() => setView('menu')}
            className="w-10 h-10 bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center text-slate-600 dark:text-slate-300 transition-colors"
          >
            <ArrowRight size={18} />
          </button>
        </div>
      </div>

      <div className="px-6 space-y-10">
        
        {/* Banner Promo Spesial */}
        {displayOffers.length > 0 ? (
          <div>
            <div className="flex justify-between items-end mb-4">
              <h3 className="font-extrabold text-lg tracking-tight text-slate-900 dark:text-white">Penawaran Menarik</h3>
            </div>
            
            {displayOffers.length > 1 ? (
              <div className="relative">
                <div 
                  ref={carouselRef}
                  onScroll={handleScroll}
                  className="flex w-full overflow-x-auto snap-x snap-mandatory scroll-smooth rounded-[1.5rem] shadow-lg shadow-blue-600/20 custom-scrollbar-hide" 
                  style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                >
                  {displayOffers.map((promo, index) => (
                    <PromoBanner 
                      key={`${promo.id || index}`}
                      banner={promo}
                      className="snap-start shrink-0 w-full min-h-[220px]"
                      onAction={() => setView('menu')}
                    />
                  ))}
                </div>
                
                {/* Dots Indicators */}
                <div className="flex justify-center gap-1.5 mt-3">
                  {displayOffers.map((_, i) => (
                    <button
                      key={i}
                      onClick={() => {
                        if (!carouselRef.current) return;
                        const width = carouselRef.current.clientWidth;
                        carouselRef.current.scrollTo({ left: i * width, behavior: 'smooth' });
                        setActiveDotIndex(i);
                      }}
                      className={`h-1.5 rounded-full transition-all duration-300 ${i === activeDotIndex ? 'w-4 bg-blue-600' : 'w-1.5 bg-slate-300 dark:bg-slate-700'}`}
                      aria-label={`Go to slide ${i + 1}`}
                    />
                  ))}
                </div>
              </div>
            ) : (
              // Jika cuma 1 promo aktif, tampilkan full width banner
              <PromoBanner 
                banner={displayOffers[0]}
                className="w-full min-h-[220px] shadow-lg shadow-blue-600/20"
                onAction={() => setView('menu')}
              />
            )}
          </div>
        ) : (
          // Fallback jika tidak ada promo sama sekali
          <div>
            <div className="flex justify-between items-end mb-4">
              <h3 className="font-extrabold text-lg tracking-tight text-slate-900 dark:text-white">Penawaran Menarik</h3>
            </div>
            <PromoBanner 
              banner={{ id: -1, title: 'Diskon Spesial', description: 'Gunakan promo menarik dari kami untuk pesanan Anda hari ini.', imageUrl: '', isActive: true }}
              className="w-full min-h-[160px]"
              onAction={() => setView('menu')}
            />
          </div>
        )}

        {/* Quick Categories */}
        <div>
          <h3 className="font-extrabold text-lg tracking-tight mb-4 text-slate-900 dark:text-white">Kategori Pilihan</h3>
          <div className="flex space-x-3.5 overflow-x-auto pb-3 custom-scrollbar-hide" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
            {categories.map((cat) => (
              <button 
                key={cat.id}
                onClick={() => setView('menu')}
                className="flex flex-col items-center space-y-2.5 min-w-[76px] group"
              >
                <div className="w-[4.5rem] h-[4.5rem] rounded-[1.2rem] bg-white dark:bg-slate-900 shadow-sm border border-slate-100 dark:border-slate-800 flex items-center justify-center text-slate-700 dark:text-slate-300 transition-all group-hover:shadow-md group-hover:border-blue-200 dark:group-hover:border-blue-900 group-hover:text-blue-600 dark:group-hover:text-blue-400 group-active:scale-95">
                  {cat.icon || <Package size={26} strokeWidth={1.5} />}
                </div>
                <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 text-center w-full truncate px-1">
                  {cat.name}
                </span>
              </button>
            ))}
            
            {/* Tombol "Lihat Semua" */}
            <button 
              onClick={() => setView('menu')}
              className="flex flex-col items-center space-y-2.5 min-w-[76px] group"
            >
              <div className="w-[4.5rem] h-[4.5rem] rounded-[1.2rem] bg-slate-50 dark:bg-slate-800/50 border border-slate-200 border-dashed dark:border-slate-700 flex items-center justify-center text-slate-500 transition-all group-active:scale-95">
                <Store size={26} strokeWidth={1.5} />
              </div>
              <span className="text-[11px] font-semibold text-slate-500 text-center w-full">
                Semua
              </span>
            </button>
          </div>
        </div>

        {/* Populer / Rekomendasi */}
        <div>
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-extrabold text-lg tracking-tight flex items-center text-slate-900 dark:text-white">
              <Flame size={20} className="text-orange-500 mr-2 fill-orange-500/20" /> 
              Populer Hari Ini
            </h3>
            <button onClick={() => setView('menu')} className="text-sm font-bold text-blue-600 hover:text-blue-700 dark:text-blue-400">
              Lihat Semua
            </button>
          </div>
          
          <div className="flex space-x-3.5 mt-2 overflow-x-auto pb-4 snap-x snap-mandatory custom-scrollbar-hide" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
            {products.slice(0, 10).map((item) => {
              const isOutOfStock = item.stock <= 0;
              
              return (
                <div 
                  key={item.id} 
                  onClick={() => {
                    if (isOutOfStock) return;
                    if (cartLength === 0) {
                      setSelectedItem(item);
                    } else if (item.variants && item.variants.length > 0) {
                      setSelectedItem(item);
                    } else {
                      if (addToCart) {
                        addToCart(item, 1, '', []);
                        toast.success(`${item.name} ditambahkan ke keranjang`);
                      } else {
                        setSelectedItem(item);
                      }
                    }
                  }}
                  className={`bg-white dark:bg-slate-900 rounded-[1.5rem] p-3 border transition-all shrink-0 snap-start w-[150px] sm:w-[180px] ${
                    isOutOfStock 
                      ? 'border-slate-100 dark:border-slate-800 opacity-60 grayscale' 
                      : 'border-slate-100 dark:border-slate-800 shadow-sm hover:shadow-md hover:border-blue-200 dark:hover:border-blue-900 cursor-pointer active:scale-[0.98]'
                  }`}
                >
                  <div className="h-32 rounded-xl bg-slate-100 dark:bg-slate-800 mb-3 overflow-hidden relative flex items-center justify-center">
                    {item.photo ? (
                      <img src={item.photo} alt={item.name} loading="lazy" className="w-full h-full object-cover" />
                    ) : (
                      <ImageIcon size={32} strokeWidth={1.5} className="text-slate-300 dark:text-slate-600" />
                    )}
                    
                    {/* Badge Status */}
                    <div className="absolute top-2 left-2 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md px-2 py-1 rounded-md text-[9px] font-bold tracking-wide uppercase shadow-sm">
                      {isOutOfStock ? (
                        <span className="text-slate-600 dark:text-slate-400">Habis</span>
                      ) : (
                        <span className="text-blue-600 dark:text-blue-400">Tersedia</span>
                      )}
                    </div>
                  </div>
                  
                  <div className="px-1">
                    <h4 className="font-bold text-sm text-slate-900 dark:text-white line-clamp-1 mb-1.5 leading-snug">
                      {item.name}
                    </h4>
                    <div className="flex items-center justify-between gap-1">
                      <p className="text-blue-600 dark:text-blue-400 font-extrabold text-[13px]">
                        {FORMAT_IDR(item.price)}
                      </p>
                      {!isOutOfStock && (
                        <div className="w-7 h-7 bg-slate-50 hover:bg-blue-50 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-full flex items-center justify-center text-slate-400 hover:text-blue-600 transition-colors">
                          <ArrowRight size={14} strokeWidth={2.5} />
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <style dangerouslySetInnerHTML={{__html: `
        .custom-scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
        @keyframes wave {
          0% { transform: rotate(0deg); }
          10% { transform: rotate(14deg); }
          20% { transform: rotate(-8deg); }
          30% { transform: rotate(14deg); }
          40% { transform: rotate(-4deg); }
          50% { transform: rotate(10deg); }
          60% { transform: rotate(0deg); }
          100% { transform: rotate(0deg); }
        }
        .animate-wave {
          animation: wave 2.5s infinite;
        }
      `}} />
    </div>
  );
}
