import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { ShoppingBag, ChevronRight, Database, AlertCircle } from 'lucide-react';

// Pastikan module-module ini sudah mendukung atau memiliki deklarasi TypeScript
import { useDbQuery } from '@/hooks/db-hooks';
import { isDbConfigured } from '@/lib/db';
import { FORMAT_IDR } from '@/lib/utils';
import { useThemeColor } from '@/hooks/use-theme-color';

// Pages
import SplashScreen from './pages/SplashScreen';
import LandingView from './pages/LandingView';
import MenuView from './pages/MenuView';
import CartView from './pages/CartView';
import CheckoutView from './pages/CheckoutView';
import TrackingView from './pages/TrackingView';
import OthersView from './pages/OthersView';
import HistoryView from './pages/HistoryView';
import SuccessView from './pages/SuccessView';
import SplitView from './pages/SplitView';

// Components
import BottomNav from './components/BottomNav';
import MenuDetailSheet from './components/MenuDetailSheet';
import CustomerInfoModal from './components/CustomerInfoModal';


// ==========================================
// Tipe Data & Interfaces
// ==========================================

export interface Variant {
  id: string | number;
  name: string;
  price: number;
}

export interface MenuItem {
  id: string | number;
  name: string;
  price: number;
  image?: string;
  description?: string;
  stock?: number;
  [key: string]: unknown; // Menggunakan unknown untuk menghindari 'any' yang tidak aman
}

export interface CartItem extends MenuItem {
  cartId: number;
  qty: number;
  notes: string;
  selectedVariants: Variant[];
}

export interface CartTotals {
  subtotal: number;
  tax: number;
  service: number;
  total: number;
}

// Format final data transaksi untuk dikirim antar page
export interface FinalOrderData {
  transaction: {
    id?: string | number;
    receipt_number?: string;
    [key: string]: unknown;
  };
  items: unknown[];
  paymentMethodName: string;
}

export default function CustomerApp() {
  useThemeColor();

  useEffect(() => {
    import('@/lib/fcm').then(({ onMessageListener, showBrowserNotification, requestForToken }) => {
      onMessageListener().then((payload: any) => {
        const title = payload?.notification?.title || 'Pemberitahuan';
        const body = payload?.notification?.body || '';
        import('sonner').then(({ toast }) => {
          toast.success(title, { description: body });
        });
        showBrowserNotification(title, body);
      }).catch(err => console.log('FCM listen failed:', err));
    });
  }, []);

  // Ambil view awal dari URL jika ada
  const getInitialView = (): string => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      return params.get('view') || 'splash';
    }
    return 'splash';
  };

  // ==========================================
  // States
  // ==========================================
  const [viewState, setViewState] = useState<string>(getInitialView);
  const [customerName, setCustomerName] = useState<string>(() => {
    if (typeof window !== 'undefined') return localStorage.getItem('mesenae_customerName') || '';
    return '';
  });
  const [tableNumber, setTableNumber] = useState<string>(() => {
    if (typeof window !== 'undefined') return localStorage.getItem('mesenae_tableNumber') || 'Bawa Pulang';
    return 'Bawa Pulang';
  });

  // Modals
  const [showCustomerModal, setShowCustomerModal] = useState<boolean>(false);

  // Data States
  const [cart, setCart] = useState<CartItem[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const savedCart = localStorage.getItem('mesenae_cart');
        return savedCart ? JSON.parse(savedCart) : [];
      } catch {
        return [];
      }
    }
    return [];
  });

  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null);
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    const saved = localStorage.getItem('mesenae_darkMode');
    if (saved !== null) return saved === 'true';
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  });
  const [finalOrderData, setFinalOrderData] = useState<FinalOrderData | null>(null);

  // Gunakan optional chaining atau type assertion sesuai pengembalian useDbQuery
  const storeSettingsList = (useDbQuery('storeSettings') as unknown[]) ?? [];
  const storeSettings = storeSettingsList[0] || null;

  // ==========================================
  // Custom Navigation & History Management
  // ==========================================
  const setView = useCallback((newView: string, replace: boolean = false) => {
    if (newView === viewState) return;

    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      url.searchParams.set('view', newView);

      if (replace) {
        window.history.replaceState({ view: newView }, '', url.toString());
      } else {
        window.history.pushState({ view: newView }, '', url.toString());
      }
    }

    setViewState(newView);
  }, [viewState]);

  // Handle PopState (Back/Forward browser/device button)
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handlePopState = (event: PopStateEvent) => {
      // Tutup modal detail menu jika sedang terbuka saat user menekan back
      if (selectedItem) {
        setSelectedItem(null);
        return;
      }
      // Tutup modal customer info jika terbuka
      if (showCustomerModal) {
        setShowCustomerModal(false);
        return;
      }

      if (event.state && event.state.view) {
        setViewState(event.state.view);
      } else {
        const params = new URLSearchParams(window.location.search);
        setViewState(params.get('view') || 'landing');
      }
    };

    window.addEventListener('popstate', handlePopState);

    // Setup initial state di history
    if (!window.history.state) {
      const url = new URL(window.location.href);
      url.searchParams.set('view', viewState);
      window.history.replaceState({ view: viewState }, '', url.toString());
    }

    return () => window.removeEventListener('popstate', handlePopState);
  }, [viewState, selectedItem, showCustomerModal]);

  // ==========================================
  // Effect Syncs
  // ==========================================
  useEffect(() => {
    if (typeof window !== 'undefined') localStorage.setItem('mesenae_customerName', customerName);
  }, [customerName]);

  useEffect(() => {
    if (typeof window !== 'undefined') localStorage.setItem('mesenae_tableNumber', tableNumber);
  }, [tableNumber]);

  useEffect(() => {
    if (typeof window !== 'undefined') localStorage.setItem('mesenae_cart', JSON.stringify(cart));
  }, [cart]);

  // Sync dark mode to document root for desktop/global styles and persist
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      if (isDarkMode) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
      localStorage.setItem('mesenae_darkMode', String(isDarkMode));
    } catch (e) { console.warn('Storage write error', e); }
  }, [isDarkMode]);

  // Handle URL Query Params for direct table scan
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const table = params.get('table');

    if (table) {
      setTableNumber(table);
    }
  }, []);

  // Splash Screen & Routing Logic
  useEffect(() => {
    if (viewState === 'splash') {
      const timer = setTimeout(() => {
        if (!customerName) {
          setShowCustomerModal(true);
        }
        setView('landing', true);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [viewState, customerName, setView]);

  // ==========================================
  // Business Logic
  // ==========================================
  const addToCart = (item: MenuItem, qty: number, notes: string, selectedVariants: Variant[]) => {
    const existingIndex = cart.findIndex((c) =>
      c.id === item.id &&
      JSON.stringify(c.selectedVariants) === JSON.stringify(selectedVariants) &&
      c.notes === notes
    );

    if (existingIndex >= 0) {
      const newCart = [...cart];
      newCart[existingIndex].qty += qty;
      setCart(newCart);
    } else {
      setCart([...cart, { ...item, cartId: Date.now(), qty, notes, selectedVariants }]);
    }
    setSelectedItem(null);
  };

  const directBuy = (item: MenuItem, qty: number, notes: string, selectedVariants: Variant[]) => {
    addToCart(item, qty, notes, selectedVariants);
    setTimeout(() => setView('cart'), 100);
  };

  const handleCustomerInfoSubmit = (name: string, table: string) => {
    setCustomerName(name);
    setTableNumber(table);
    setShowCustomerModal(false);
  };

  const updateCartQty = (cartId: number, delta: number) => {
    setCart((prevCart) => {
      const newCart = prevCart.map((item) => {
        if (item.cartId === cartId) {
          const newQty = Math.max(0, item.qty + delta);
          return { ...item, qty: newQty };
        }
        return item;
      }).filter((item) => item.qty > 0);

      if (newCart.length === 0 && viewState === 'cart') {
        setTimeout(() => setView('menu'), 0);
      }
      return newCart;
    });
  };

  const cartTotal: CartTotals = useMemo(() => {
    const subtotal = cart.reduce((sum: number, item: CartItem) => {
      const itemPrice = item.price;
      const variantsPrice = item.selectedVariants?.reduce((a: number, b: Variant) => a + b.price, 0) || 0;
      return sum + ((itemPrice + variantsPrice) * item.qty);
    }, 0);
    // Asumsi: Pajak 11%, Layanan 5% (Bisa disesuaikan dari DB)
    const tax = subtotal * 0.11;
    const service = subtotal * 0.05;
    return { subtotal, tax, service, total: subtotal + tax + service };
  }, [cart]);

  // ==========================================
  // Render
  // ==========================================
  if (!isDbConfigured) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6 font-sans">
        <div className="max-w-md w-full bg-white rounded-[2rem] p-8 shadow-2xl shadow-slate-200/50 border border-slate-100 text-center animate-in zoom-in-95 duration-500">
          <div className="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-6 text-blue-600 shadow-inner">
            <Database size={32} strokeWidth={1.5} />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mb-3">Database Belum Siap</h1>
          <p className="text-sm text-slate-500 mb-6 leading-relaxed">
            Sistem tidak dapat dimuat. Pastikan Anda telah mengatur konfigurasi berikut pada Environment Variables:
          </p>
          <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 text-left text-sm space-y-2.5 mb-6">
            <div className="flex items-center gap-2 text-slate-700">
              <AlertCircle size={16} className="text-amber-500" />
              <span className="font-mono font-bold text-xs">SPREADSHEET_ID</span>
            </div>
            <div className="flex items-center gap-2 text-slate-700">
              <AlertCircle size={16} className="text-amber-500" />
              <span className="font-mono font-bold text-xs">FOLDER_UTAMA_ID</span>
            </div>
          </div>
          <p className="text-[11px] text-slate-400 font-medium">
            Jika baru saja diubah, harap tunggu beberapa menit hingga proses deployment server selesai.
          </p>
        </div>
      </div>
    );
  }

  return (
    // Background utama selaras tema; darkmode diterapkan hingga ke akar
    <div className={`min-h-[100dvh] font-sans flex flex-col transition-colors duration-300 bg-slate-50 dark:bg-slate-950`}>

      {/* 
        PERUBAHAN UTAMA DESKTOP RESPONSIVE:
        1. max-w-full untuk melebar hingga memenuhi batas
        2. shadow dihilangkan pada layar besar agar menyatu seperti web profesional
        3. rounded dihilangkan sepenuhnya (border-radius = 0)
        4. margin auto agar selalu pas di tengah (jika ada pembatas) 
      */}
      <div className={`w-full max-w-[1920px] mx-auto bg-white flex-1 relative flex flex-col md:border-x border-slate-200 dark:border-slate-800 shadow-sm md:shadow-none transition-all ${isDarkMode ? 'dark customer-theme' : 'customer-theme'}`}>

        {viewState === 'splash' && <SplashScreen />}

        {viewState === 'landing' && (
          <LandingView
            setView={setView}
            customerName={customerName}
            isDarkMode={isDarkMode}
            setIsDarkMode={setIsDarkMode}
            tableNumber={tableNumber}
            setSelectedItem={setSelectedItem}
            addToCart={addToCart as any}
            cartLength={cart.length}
          />
        )}

        {viewState === 'menu' && (
          <MenuView
            setView={setView}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            selectedCategory={selectedCategory}
            setSelectedCategory={setSelectedCategory}
            setSelectedItem={setSelectedItem}
            addToCart={addToCart as any}
            cartLength={cart.length}
          />
        )}

        {viewState === 'cart' && <CartView setView={setView} cart={cart as any} updateCartQty={updateCartQty} totals={cartTotal} setCart={setCart as any} />}
        {viewState === 'checkout' && <CheckoutView setView={setView} totals={cartTotal} cart={cart as any} customerName={customerName} setFinalOrderData={setFinalOrderData as any} setCart={setCart as any} tableNumber={tableNumber} setTableNumber={setTableNumber} />}
        {viewState === 'tracking' && <TrackingView setView={setView} finalOrderData={finalOrderData as any} tableNumber={tableNumber} storeSettings={storeSettings as any} customerName={customerName} />}
        {viewState === 'others' && <OthersView setView={setView} storeSettings={storeSettings as any} tableNumber={tableNumber} customerName={customerName} />}
        {viewState === 'history' && <HistoryView setView={setView} customerName={customerName} storeSettings={storeSettings as any} />}
        {viewState === 'success' && <SuccessView setView={setView} finalOrderData={finalOrderData as any} />}
        {viewState === 'split' && <SplitView setView={setView} cart={cart as any} totals={cartTotal} customerName={customerName} setFinalOrderData={setFinalOrderData as any} setCart={setCart as any} tableNumber={tableNumber} />}

        {/* Modal / Sheet Component */}
        {selectedItem && (
          <MenuDetailSheet
            item={selectedItem}
            onClose={() => setSelectedItem(null)}
            onAdd={addToCart}
            onDirectBuy={directBuy}
          />
        )}

        <CustomerInfoModal
          isOpen={showCustomerModal}
          onClose={() => setShowCustomerModal(false)}
          onSubmit={handleCustomerInfoSubmit}
          initialCustomerName={customerName}
          initialTableNumber={tableNumber}
        />

        {/* Floating Cart & Navigation */}
        {['menu', 'tracking', 'others', 'landing'].includes(viewState) && tableNumber && (
          <>
            {cart.length > 0 && viewState !== 'tracking' && viewState !== 'landing' && (
              <div className="fixed bottom-[88px] left-0 right-0 z-40 px-4 md:px-8 pointer-events-none flex justify-center animate-in slide-in-from-bottom-8 fade-in duration-300">
                {/* Pembungkus Cart Floating dengan lebar maksimal terkontrol agar tidak terlalu panjang di Desktop */}
                <div className="w-full max-w-md md:max-w-xl pointer-events-auto px-2">
                  <button
                    onClick={() => setView('cart')}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white p-3.5 px-5 rounded-[1.5rem] flex items-center justify-between active:scale-[0.98] transition-all border border-blue-500/50"
                  >
                    <div className="flex items-center gap-3.5">
                      <div className="relative">
                        <div className="bg-white/20 p-2.5 rounded-full backdrop-blur-md">
                          <ShoppingBag size={20} strokeWidth={2} />
                        </div>
                        <span className="absolute -top-1.5 -right-1.5 bg-rose-500 text-white text-[10px] min-w-[22px] h-[22px] px-1 flex items-center justify-center rounded-full font-black border-2 border-blue-600 shadow-sm">
                          {cart.reduce((a: number, b: CartItem) => a + b.qty, 0)}
                        </span>
                      </div>
                      <div className="text-left">
                        <p className="text-[10px] font-semibold text-blue-200 uppercase tracking-wider mb-0.5">Total Pesanan</p>
                        <p className="font-extrabold text-base leading-none">{FORMAT_IDR(cartTotal.total)}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 text-sm font-bold bg-white/10 px-3 py-2 rounded-xl hover:bg-white/20 transition-colors">
                      Checkout <ChevronRight size={18} strokeWidth={2.5} />
                    </div>
                  </button>
                </div>
              </div>
            )}

            <BottomNav currentView={viewState} setView={setView} />
          </>
        )}
      </div>
    </div>
  );
}
