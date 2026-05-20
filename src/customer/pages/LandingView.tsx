import React, { JSX, useState, useEffect, useRef } from 'react';
import { 
  MapPin, Flame, Moon, Sun, Gift, Package, 
  Image as ImageIcon, ArrowRight, Store
} from 'lucide-react';

import { FORMAT_IDR } from '@/lib/utils';
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
}

export default function LandingView({
  setView,
  customerName,
  isDarkMode,
  setIsDarkMode,
  tableNumber,
  setSelectedItem,
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

  // Penawaran dinamis hasil konfigurasi di Tab 2 Admin
  const activeBanners = React.useMemo(() => {
    if (storeSettings?.promoBanners && Array.isArray(storeSettings.promoBanners)) {
      return storeSettings.promoBanners.filter((b: any) => b.isActive);
    }
    return [];
  }, [storeSettings?.promoBanners]);

  const displayOffers = React.useMemo(() => {
    if (activeBanners.length > 0) {
      return activeBanners;
    }
    // Fallback ke voucher aktif jika belum ada banner kustom diatur
    return activeVouchers.map((v) => ({
      id: v.id,
      type: 'voucher',
      title: v.type === 'percentage' ? `Diskon Spesial ${v.value}%` : `Potongan Harga Spesial`,
      description: v.description || v.desc || 'Nikmati penawaran spesial terbaik untuk pesanan menu favorit Anda hari ini!',
      imageUrl: null,
      isActive: true,
    }));
  }, [activeBanners, activeVouchers]);

  const [activeDotIndex, setActiveDotIndex] = useState(0);
  const carouselRef = useRef<HTMLDivElement>(null);

  const handleScroll = () => {
    if (!carouselRef.current || displayOffers.length <= 1) return;
    const scrollLeft = carouselRef.current.scrollLeft;
    const width = carouselRef.current.clientWidth;
    if (width > 0) {
      const totalIndex = Math.round(scrollLeft / width);
      const activeIndex = totalIndex % displayOffers.length;
      setActiveDotIndex(activeIndex);

      // Silent reset if reaching boundaries to support infinite loop
      if (totalIndex < displayOffers.length) {
        carouselRef.current.scrollLeft = (totalIndex + displayOffers.length) * width;
      } else if (totalIndex >= displayOffers.length * 2) {
        carouselRef.current.scrollLeft = (totalIndex - displayOffers.length) * width;
      }
    }
  };

  // Set initial scroll position to the middle copy on mount
  useEffect(() => {
    if (displayOffers.length <= 1 || !carouselRef.current || loading) return;
    const width = carouselRef.current.clientWidth;
    if (width > 0) {
      carouselRef.current.scrollLeft = displayOffers.length * width;
      setActiveDotIndex(0);
    } else {
      const timeout = setTimeout(() => {
        if (carouselRef.current) {
          const w = carouselRef.current.clientWidth;
          carouselRef.current.scrollLeft = displayOffers.length * w;
        }
      }, 150);
      return () => clearTimeout(timeout);
    }
  }, [displayOffers.length, loading]);

  useEffect(() => {
    if (displayOffers.length <= 1 || loading) return;

    const interval = setInterval(() => {
      if (!carouselRef.current) return;
      const width = carouselRef.current.clientWidth;
      if (width > 0) {
        const scrollLeft = carouselRef.current.scrollLeft;
        const totalIndex = Math.round(scrollLeft / width);
        carouselRef.current.scrollTo({
          left: (totalIndex + 1) * width,
          behavior: 'smooth'
        });
      }
    }, 4500);

    return () => clearInterval(interval);
  }, [displayOffers.length, loading]);

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
                  {[...displayOffers, ...displayOffers, ...displayOffers].map((promo, index) => (
                    <div 
                      key={`${promo.id}-${index}`}
                      className="rounded-[1.5rem] p-6 text-white relative overflow-hidden snap-start shrink-0 w-full min-h-[180px] flex flex-col justify-between shadow-md"
                    >
                      {promo.imageUrl ? (
                        <div className="absolute inset-0 z-0">
                          <img src={promo.imageUrl} alt={promo.title} className="w-full h-full object-cover" />
                          <div className="absolute inset-0 bg-gradient-to-r from-slate-950/95 via-slate-900/80 to-transparent" />
                          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/60 to-transparent" />
                        </div>
                      ) : (
                        <div className="absolute inset-0 z-0 bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-600">
                          <Gift size={160} strokeWidth={1} className="absolute -right-4 -bottom-8 text-white/10 rotate-[-15deg] z-0" />
                        </div>
                      )}

                      <div className="relative z-10 w-[70%] mt-auto">
                        <span className={cn(
                          "text-[10px] px-2.5 py-1 rounded-md backdrop-blur-md font-bold mb-3 inline-block uppercase tracking-wider border shadow-sm",
                          promo.imageUrl ? "bg-white/10 border-white/20 text-white" : "bg-white/20 border-white/10"
                        )}>
                          {promo.type === 'voucher' ? 'Promo' : promo.type === 'menu' ? 'Menu Baru' : 'Penawaran Spesial'}
                        </span>
                        <h4 className="font-extrabold text-2xl mb-1.5 leading-tight line-clamp-1 drop-shadow-md">
                          {promo.title}
                        </h4>
                        <p className="text-xs text-slate-200 mb-5 font-medium line-clamp-2 leading-relaxed drop-shadow-sm">
                          {promo.description}
                        </p>
                        <button 
                          onClick={() => setView('menu')}
                          className="bg-white text-slate-900 text-sm font-bold px-6 py-2.5 rounded-xl shadow-lg hover:bg-slate-100 active:scale-95 transition-all flex items-center gap-2"
                        >
                          Lihat Sekarang <ArrowRight size={16} />
                        </button>
                      </div>
                    </div>
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
                        // Target slide index in the middle copy: i + displayOffers.length
                        carouselRef.current.scrollTo({ left: (i + displayOffers.length) * width, behavior: 'smooth' });
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
              <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 rounded-[1.5rem] p-6 text-white shadow-lg shadow-blue-600/20 relative overflow-hidden min-h-[160px] flex flex-col justify-between">
                {displayOffers[0].imageUrl ? (
                  <div className="absolute inset-0 z-0">
                    <img src={displayOffers[0].imageUrl} alt={displayOffers[0].title} className="w-full h-full object-cover opacity-35" />
                    <div className="absolute inset-0 bg-gradient-to-r from-blue-900/95 to-indigo-900/40" />
                  </div>
                ) : (
                  <Gift size={140} strokeWidth={1} className="absolute -right-6 -bottom-6 text-white/15 rotate-[-15deg] z-0" />
                )}

                <div className="relative z-10 w-2/3">
                  <span className="bg-white/20 text-[10px] px-2.5 py-1 rounded-md backdrop-blur-md font-bold mb-3 inline-block uppercase tracking-wider border border-white/10">
                    {displayOffers[0].type === 'voucher' ? 'Promo' : displayOffers[0].type === 'menu' ? 'Menu Baru' : 'Spesial'}
                  </span>
                  <h4 className="font-extrabold text-2xl mb-1.5 leading-tight line-clamp-1">
                    {displayOffers[0].title}
                  </h4>
                  <p className="text-xs text-blue-50 mb-5 font-medium line-clamp-2 leading-relaxed">
                    {displayOffers[0].description}
                  </p>
                  <button 
                    onClick={() => setView('menu')}
                    className="bg-white text-blue-600 text-sm font-bold px-5 py-2.5 rounded-xl shadow-sm hover:bg-blue-50 active:scale-95 transition-all"
                  >
                    Cek Katalog
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          // Fallback jika tidak ada promo sama sekali
          <div>
            <div className="flex justify-between items-end mb-4">
              <h3 className="font-extrabold text-lg tracking-tight text-slate-900 dark:text-white">Penawaran Menarik</h3>
            </div>
            <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 rounded-[1.5rem] p-6 text-white shadow-lg shadow-blue-600/20 relative overflow-hidden">
              <div className="relative z-10 w-2/3">
                <span className="bg-white/20 text-[10px] px-2.5 py-1 rounded-md backdrop-blur-md font-bold mb-3 inline-block uppercase tracking-wider border border-white/10">
                  Terbatas
                </span>
                <h4 className="font-extrabold text-2xl mb-1.5 leading-tight">
                  Diskon Spesial
                </h4>
                <p className="text-sm text-blue-50 mb-5 font-medium line-clamp-2">
                  Gunakan promo menarik dari kami untuk pesanan Anda hari ini.
                </p>
                <button 
                  onClick={() => setView('menu')}
                  className="bg-white text-blue-600 text-sm font-bold px-5 py-2.5 rounded-xl shadow-sm hover:bg-blue-50 active:scale-95 transition-all"
                >
                  Cek Katalog
                </button>
              </div>
              {/* Dekorasi Ikon Kado Besar */}
              <Gift size={140} strokeWidth={1} className="absolute -right-6 -bottom-6 text-white/15 rotate-[-15deg]" />
            </div>
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
          
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3.5 mt-2">
            {products.slice(0, 8).map((item) => {
              const isOutOfStock = item.stock <= 0;
              
              return (
                <div 
                  key={item.id} 
                  onClick={() => !isOutOfStock && setSelectedItem(item)}
                  className={`bg-white dark:bg-slate-900 rounded-[1.5rem] p-3 border transition-all ${
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
