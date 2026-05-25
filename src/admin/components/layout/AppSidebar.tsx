import { NavLink, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  History,
  QrCode,
  UtensilsCrossed,
  FileText,
  Settings,
  ChevronDown,
  Ticket,
  ChevronLeft,
  ChevronRight,
  LogOut,
  ClipboardList,
  Image as ImageIcon
} from "lucide-react";
import { useState, useEffect } from "react";
import { useDbQuery } from '@/hooks/db-hooks';
import { Badge } from "@/components/ui/badge";

interface AppSidebarProps {
  isMobile?: boolean;
}

export default function AppSidebar({ isMobile = false }: AppSidebarProps) {
  const location = useLocation();
  const [isProductsOpen, setIsProductsOpen] = useState(() => {
    const paths = ["/admin/products", "/admin/supplier", "/admin/stock-in", "/admin/stock-out", "/admin/stock-report"];
    return paths.some(p => location.pathname.startsWith(p));
  });
  const [isPromoOpen, setIsPromoOpen] = useState(() => {
    const paths = ["/admin/qr-menu", "/admin/banners", "/admin/vouchers"];
    return paths.some(p => location.pathname.startsWith(p));
  });
  const [isCollapsed, setIsCollapsed] = useState(() => {
    if (isMobile) return false;
    return localStorage.getItem('mesenae_sidebar_collapsed') === 'true';
  });

  useEffect(() => {
    if (!isMobile) {
      localStorage.setItem('mesenae_sidebar_collapsed', String(isCollapsed));
    }
  }, [isCollapsed, isMobile]);

  useEffect(() => {
    const paths = ["/admin/products", "/admin/supplier", "/admin/stock-in", "/admin/stock-out", "/admin/stock-report"];
    if (paths.some(p => location.pathname.startsWith(p))) {
      setIsProductsOpen(true);
    }
  }, [location.pathname]);

  const storeSettingsList = useDbQuery<any>('storeSettings') ?? [];
  const storeSettings = storeSettingsList[0] || null;

  const openBillsCount = (useDbQuery<any>('transactions') || []).filter((t: any) => {
    const isUnpaid = t.status === 'belum lunas' || t.status === 'open';
    const isPaidButCooking = t.status === 'lunas' && t.kitchenStatus && !['diantarkan', 'batal'].includes(t.kitchenStatus);
    return isUnpaid || isPaidButCooking;
  }).length;
  const processingCount = (useDbQuery<any>('transactions') || []).filter((t: any) => t.kitchenStatus && t.kitchenStatus !== 'diantarkan' && t.kitchenStatus !== 'pending').length;

  const authData = JSON.parse(localStorage.getItem('admin_auth') || '{}');
  const role = authData.role || 'admin';

  // Komponen NavItem dengan warna kontras navy & modern
  const NavItem = ({ to, icon: Icon, label, badge = 0, exact = false }: any) => {
    const isActive = exact 
      ? location.pathname === to || location.pathname === to + '/' 
      : location.pathname.startsWith(to);
    
    return (
      <NavLink
        to={to}
        title={isCollapsed ? label : undefined}
        className={cn(
          "group relative flex items-center px-3 py-2.5 my-0.5 rounded-lg transition-all duration-200 text-sm font-medium outline-none",
          isCollapsed ? "justify-center" : "gap-3",
          isActive 
            ? "bg-primary text-primary-foreground font-bold shadow-md shadow-primary/20" 
            : "text-slate-400 hover:bg-white/5 hover:text-white"
        )}
      >
        {/* Indikator aktif vertikal di sisi kiri */}
        {isActive && !isCollapsed && (
          <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1.5 h-5 bg-white rounded-r-full shadow-[0_0_8px_rgba(255,255,255,0.6)]" />
        )}
        
        <Icon className={cn(
          "w-5 h-5 shrink-0 transition-colors", 
          isActive ? "text-primary-foreground text-white" : "text-slate-400 group-hover:text-white"
        )} />
        
        {!isCollapsed && <span className="flex-1 truncate">{label}</span>}
        
        {badge > 0 && (
          <Badge 
            variant={isActive ? "default" : "secondary"} 
            className={cn(
              "text-[10px] px-1.5 h-5 justify-center rounded-full flex shrink-0 items-center font-bold", 
              isActive ? "bg-white text-primary shadow-sm border-none" : "bg-white/10 text-slate-300 border-none",
              isCollapsed ? "absolute top-1 right-1 px-1 h-4 min-w-[16px] text-[8px]" : "min-w-[20px]"
            )}
          >
            {badge > 99 ? '99+' : badge}
          </Badge>
        )}
      </NavLink>
    );
  };

  // Label Grup untuk merapikan hierarki
  const NavGroupLabel = ({ children }: { children: React.ReactNode }) => {
    if (isCollapsed) return <div className="h-4" />;
    return (
      <div className="px-3 text-[10px] font-extrabold uppercase tracking-wider text-slate-500 mt-5 mb-1.5 select-none">
        {children}
      </div>
    );
  };

  return (
    <div className={cn(
      "flex flex-col text-slate-200 shadow-xl shadow-slate-950/20 transition-all duration-300 relative z-20 overflow-visible", 
      isMobile 
        ? "h-full w-full m-0 rounded-none border-none bg-gradient-to-b from-[#0a1128] to-[#101f42]" 
        : "h-screen m-0 rounded-none border-r border-white/10 bg-gradient-to-b from-[#0a1128] to-[#101f42]",
      isCollapsed && !isMobile ? "w-[80px]" : "w-64"
    )}>
      {/* Tombol Toggle Sidebar melayang */}
      {!isMobile && (
        <button 
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="absolute -right-3.5 top-8 bg-[#0a1128] border border-white/10 text-slate-400 hover:text-white p-1.5 rounded-full shadow-lg z-30 transition-all hover:scale-110 focus:outline-none"
        >
          {isCollapsed ? <ChevronRight size={14} strokeWidth={3} /> : <ChevronLeft size={14} strokeWidth={3} />}
        </button>
      )}

      {/* Profil Toko / Brand Header */}
      <div className={cn("flex items-center mt-7 mb-5", isCollapsed ? "justify-center" : "gap-3 px-5")}>
        <div className="w-10 h-10 bg-white/5 backdrop-blur-md rounded-lg shrink-0 flex items-center justify-center shadow-lg border border-white/10 p-1 relative overflow-hidden group">
          {storeSettings?.logo ? (
            <img src={storeSettings.logo} alt="Logo" className="w-full h-full object-contain rounded-lg transition-transform group-hover:scale-105" />
          ) : (
            <img src="/icon-192.png" alt="MesenAe Logo" className="w-full h-full object-contain rounded-lg transition-transform group-hover:scale-105" />
          )}
        </div>
        {!isCollapsed && (
          <div className="flex flex-col overflow-hidden">
            <span className="font-extrabold text-base tracking-tight text-white truncate leading-tight">
              {storeSettings?.storeName || 'MesenAe POS'}
            </span>
            <span className="text-[11px] font-bold text-slate-400 truncate mt-0.5">
              {role === 'admin' ? 'Administrator' : 'Staff'}
            </span>
          </div>
        )}
      </div>

      {/* Navigasi Utama */}
      <nav className="flex-1 px-3 space-y-1 overflow-y-auto custom-scrollbar pb-6">
        
        {/* Grup 1: Ringkasan & Operasional */}
        <NavGroupLabel>Operasional</NavGroupLabel>
        {role === 'admin' && <NavItem to="/admin" exact icon={LayoutDashboard} label="Dashboard" />}
        {role === 'admin' && <NavItem to="/admin/cashier" icon={ShoppingCart} label="Kasir (POS)" />}
        <NavItem to="/admin/orders" icon={ClipboardList} label="Pesanan & Dapur" badge={openBillsCount} />
        <NavItem to="/admin/history" icon={History} label="Riwayat Transaksi" />
        
        {/* Grup 2: Manajemen */}
        {role === 'admin' && (
          <>
            <NavGroupLabel>Manajemen</NavGroupLabel>
            
            {/* Menu Dropdown Produk */}
            <div className="mb-0.5">
              <button
                onClick={() => {
                  if (isCollapsed) setIsCollapsed(false);
                  setIsProductsOpen(!isProductsOpen);
                }}
                title={isCollapsed ? "Inventori" : undefined}
                className={cn(
                  "w-full flex items-center px-3 py-2.5 rounded-lg transition-all duration-200 text-sm font-medium outline-none group", 
                  isCollapsed ? "justify-center" : "gap-3",
                  isProductsOpen && !isCollapsed ? "bg-white/5 text-white font-bold" : "text-slate-400 hover:bg-white/5 hover:text-white"
                )}
              >
                <Package className="w-5 h-5 shrink-0 group-hover:text-white transition-colors" />
                {!isCollapsed && (
                  <>
                    <span className="flex-1 text-left truncate">Inventori</span>
                    <ChevronDown className={cn(
                      "w-4 h-4 shrink-0 transition-transform duration-300", 
                      isProductsOpen ? "rotate-180 text-white" : "text-slate-500"
                    )} />
                  </>
                )}
              </button>
              
              {/* Isi Dropdown */}
              <div className={cn(
                "grid transition-all duration-300 ease-in-out",
                isProductsOpen && !isCollapsed ? "grid-rows-[1fr] opacity-100 mt-1 mb-2" : "grid-rows-[0fr] opacity-0"
              )}>
                <div className="overflow-hidden">
                  <div className="ml-5 space-y-1 border-l border-white/10 pl-3 py-1">
                    {[
                      { to: "/admin/products", label: "Daftar Produk" },
                      { to: "/admin/categories", label: "Kategori" },
                      { to: "/admin/supplier", label: "Supplier" },
                      { to: "/admin/stock-in", label: "Stok Masuk" },
                      { to: "/admin/stock-out", label: "Stok Keluar" },
                    ].map((item) => (
                      <NavLink 
                        key={item.to} 
                        to={item.to} 
                        className={({isActive}) => cn(
                          "block py-2 px-3 rounded-lg text-xs font-semibold transition-colors outline-none", 
                          isActive 
                            ? "text-white font-bold bg-primary/20" 
                            : "text-slate-400 hover:text-white hover:bg-white/5"
                        )}
                      >
                        {item.label}
                      </NavLink>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Menu Dropdown Marketing */}
            <div className="mb-0.5">
              <button
                onClick={() => {
                  if (isCollapsed) setIsCollapsed(false);
                  setIsPromoOpen(!isPromoOpen);
                }}
                title={isCollapsed ? "Marketing" : undefined}
                className={cn(
                  "w-full flex items-center px-3 py-2.5 rounded-lg transition-all duration-200 text-sm font-medium outline-none group", 
                  isCollapsed ? "justify-center" : "gap-3",
                  isPromoOpen && !isCollapsed ? "bg-white/5 text-white font-bold" : "text-slate-400 hover:bg-white/5 hover:text-white"
                )}
              >
                <Ticket className="w-5 h-5 shrink-0 group-hover:text-white transition-colors" />
                {!isCollapsed && (
                  <>
                    <span className="flex-1 text-left truncate">Marketing</span>
                    <ChevronDown className={cn(
                      "w-4 h-4 shrink-0 transition-transform duration-300", 
                      isPromoOpen ? "rotate-180 text-white" : "text-slate-500"
                    )} />
                  </>
                )}
              </button>
              
              {/* Isi Dropdown Pemasaran */}
              <div className={cn(
                "grid transition-all duration-300 ease-in-out",
                isPromoOpen && !isCollapsed ? "grid-rows-[1fr] opacity-100 mt-1 mb-2" : "grid-rows-[0fr] opacity-0"
              )}>
                <div className="overflow-hidden">
                  <div className="ml-5 space-y-1 border-l border-white/10 pl-3 py-1">
                    {[
                      { to: "/admin/qr-code", label: "QR Code Meja", icon: QrCode },
                      { to: "/admin/banner", label: "Banner Promo", icon: ImageIcon },
                      { to: "/admin/vouchers", label: "Kode Voucher", icon: Ticket },
                    ].map((item) => (
                      <NavLink 
                        key={item.to} 
                        to={item.to} 
                        className={({isActive}) => cn(
                          "flex items-center gap-2 py-2 px-3 rounded-lg text-xs font-semibold transition-colors outline-none", 
                          isActive 
                            ? "text-white font-bold bg-primary/20" 
                            : "text-slate-400 hover:text-white hover:bg-white/5"
                        )}
                      >
                        <item.icon className="w-3.5 h-3.5" />
                        {item.label}
                      </NavLink>
                    ))}
                  </div>
                </div>
              </div>
            </div>
            <NavItem to="/admin/reports" icon={FileText} label="Laporan Bisnis" />
            <NavItem to="/admin/settings" icon={Settings} label="Pengaturan Sistem" />
          </>
        )}
      </nav>
      
      {/* Footer Area */}
      <div className="p-4 border-t border-white/10 bg-white/3">
        <button 
          onClick={() => {
            localStorage.removeItem('admin_auth');
            window.location.href = '/login';
          }}
          title={isCollapsed ? "Keluar Aplikasi" : undefined}
          className={cn(
            "w-full flex items-center justify-center p-2.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-500/10 font-bold transition-colors group", 
            !isCollapsed && "gap-3"
          )}
        >
          <LogOut size={18} className="group-hover:scale-110 transition-transform" />
          {!isCollapsed && <span className="text-sm">Keluar</span>}
        </button>
      </div>
    </div>
  );
}
