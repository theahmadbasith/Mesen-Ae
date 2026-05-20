import React, { useState, useEffect, useMemo } from 'react';
import { 
  FileText, ChevronRight, X, Smartphone, Ticket, User, MapPin, Scissors,
  MessageCircle, Headset 
} from 'lucide-react';
import { FORMAT_IDR } from '@/lib/utils';
import { useDbQuery } from '@/hooks/db-hooks';
import { toast } from 'sonner';

// 1. Definisikan tipe untuk pengaturan toko
interface StoreSettings {
  phone?: string;
  [key: string]: unknown;
}

// 2. Definisikan tipe untuk Voucher
interface Voucher {
  id: string | number;
  isActive?: boolean;
  is_active?: boolean;
  type: 'percentage' | 'nominal' | string; 
  value: number;
  code: string;
}

// 3. Definisikan tipe untuk Props Komponen
interface OthersViewProps {
  setView: (view: string) => void;
  storeSettings?: StoreSettings | null;
  tableNumber?: string | number | null;
  customerName?: string | null;
}

export default function OthersView({ 
  setView, 
  storeSettings, 
  tableNumber, 
  customerName 
}: OthersViewProps) {
  const [showCS, setShowCS] = useState<boolean>(false);
  const [showVouchers, setShowVouchers] = useState<boolean>(false);

  const vouchers = (useDbQuery('vouchers') as Voucher[]) ?? [];
  const users = (useDbQuery('users') as any[]) ?? [];
  
  const activeVouchers = useMemo(() => {
    return vouchers.filter((v: Voucher) => v.isActive || v.is_active);
  }, [vouchers]);

  const activeKasirWa = useMemo(() => {
    const kasir = users.find(u => u.whatsapp);
    return kasir?.whatsapp || storeSettings?.phone;
  }, [users, storeSettings?.phone]);

  // Modifikasi fungsi openWhatsApp untuk menerima pre-filled message
  const openWhatsApp = (phone?: string, message?: string) => {
    if (!phone) {
      toast.error('Nomor WhatsApp belum diatur');
      return;
    }
    let formattedPhone = phone.replace(/\D/g, '');
    if (formattedPhone.startsWith('0')) {
      formattedPhone = '62' + formattedPhone.substring(1);
    }
    
    // Gunakan URL API WhatsApp dengan parameter text
    const url = new URL(`https://wa.me/${formattedPhone}`);
    if (message) {
      url.searchParams.append('text', message);
    }
    
    window.open(url.toString(), '_blank');
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`Kode promo "${text}" disalin!`);
  };

  // Pre-filled messages templates
  const orderMessageTemplate = `Halo Admin, saya *${customerName || 'Tamu'}* ${tableNumber === 'Bawa Pulang' ? '(Take Away)' : tableNumber ? `(Meja ${tableNumber})` : ''}. Saya butuh bantuan terkait pesanan saya.`;
  const techMessageTemplate = `Halo Tim Support, saya *${customerName || 'Tamu'}*. Saya mengalami kendala teknis saat menggunakan aplikasi pemesanan.`;

  return (
    <div className="flex-1 flex flex-col bg-slate-50 dark:bg-slate-950 pb-[120px] overflow-y-auto">
      
      {/* Profil Header Card */}
      <div className="bg-white dark:bg-slate-900 pt-10 pb-8 px-6 rounded-b-[2rem] shadow-sm border-b border-slate-100 dark:border-slate-800 mb-6">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 bg-blue-50 dark:bg-slate-800 rounded-full flex items-center justify-center text-blue-600 dark:text-slate-400 shrink-0 border-2 border-white dark:border-slate-900 shadow-md">
            <User size={32} strokeWidth={1.5} />
          </div>
          <div>
            <h1 className="font-extrabold text-2xl text-slate-900 dark:text-white leading-tight">
              {customerName || 'Tamu'}
            </h1>
            <div className="flex items-center gap-1.5 mt-1 text-slate-500 dark:text-slate-400 text-sm font-medium">
              <MapPin size={14} />
              <span>{tableNumber === 'Bawa Pulang' ? 'Take Away' : tableNumber ? `Meja ${tableNumber}` : '-'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Menu List */}
      <div className="px-4 space-y-5">
        
        {/* Group 1: Aktivitas */}
        <div>
          <h3 className="px-4 text-[11px] font-bold uppercase tracking-widest text-slate-400 mb-2">Aktivitas Saya</h3>
          <div className="bg-white dark:bg-slate-900 rounded-[1.5rem] border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden">
            
            {/* Riwayat Pesanan */}
            <button 
              onClick={() => setView('history')} 
              className="w-full p-4 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/50 active:bg-slate-100 transition-colors"
            >
              <div className="flex items-center gap-3.5">
                <div className="bg-blue-50 dark:bg-blue-500/10 p-2.5 rounded-xl text-blue-600 dark:text-blue-400">
                  <FileText size={20} strokeWidth={2} />
                </div>
                <span className="font-semibold text-slate-700 dark:text-slate-200">Riwayat Pesanan</span>
              </div>
              <ChevronRight size={18} className="text-slate-400" />
            </button>

            <div className="h-[1px] bg-slate-100 dark:bg-slate-800 mx-4" />
            
            {/* Promo & Voucher */}
            <button 
              onClick={() => setShowVouchers(true)}
              className="w-full p-4 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/50 active:bg-slate-100 transition-colors"
            >
              <div className="flex items-center gap-3.5">
                <div className="bg-orange-50 dark:bg-orange-500/10 p-2.5 rounded-xl text-orange-600 dark:text-orange-400">
                  <Ticket size={20} strokeWidth={2} />
                </div>
                <span className="font-semibold text-slate-700 dark:text-slate-200">Promo & Voucher</span>
              </div>
              <div className="flex items-center gap-2">
                {activeVouchers.length > 0 && (
                  <span className="bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400 text-[10px] font-bold px-2 py-0.5 rounded-full">
                    {activeVouchers.length} Promo
                  </span>
                )}
                <ChevronRight size={18} className="text-slate-400" />
              </div>
            </button>
          </div>
        </div>

        {/* Group 2: Bantuan (Diperbarui agar lebih profesional) */}
        <div>
          <h3 className="px-4 text-[11px] font-bold uppercase tracking-widest text-slate-400 mb-2 mt-2">Pusat Bantuan</h3>
          <div className="bg-white dark:bg-slate-900 rounded-[1.5rem] border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden">
            
            {/* Customer Service Toggle */}
            <button 
              onClick={() => setShowCS(!showCS)} 
              className="w-full p-4 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/50 active:bg-slate-100 transition-colors"
            >
              <div className="flex items-center gap-3.5">
                <div className="bg-emerald-50 dark:bg-emerald-500/10 p-2.5 rounded-xl text-emerald-600 dark:text-emerald-400">
                  <Headset size={20} strokeWidth={2} />
                </div>
                <div className="text-left">
                  <span className="block font-semibold text-slate-700 dark:text-slate-200">Hubungi Kami</span>
                  <span className="block text-[11px] text-slate-400 mt-0.5">Butuh bantuan? Kami siap membantu</span>
                </div>
              </div>
              <ChevronRight size={18} className={`text-slate-400 transition-transform duration-300 ${showCS ? 'rotate-90' : ''}`} />
            </button>
            
            {/* CS Options Dropdown (Desain Baru) */}
            {showCS && (
              <div className="px-4 pb-5 pt-2 bg-slate-50/50 dark:bg-slate-800/10 space-y-3 animate-in slide-in-from-top-2 duration-300 border-t border-slate-100 dark:border-slate-800">
                
                {/* Opsi 1: Bantuan Kasir */}
                <button 
                  onClick={() => openWhatsApp(activeKasirWa, orderMessageTemplate)} 
                  className="w-full flex items-center gap-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-4 rounded-2xl active:scale-[0.98] hover:shadow-md hover:border-emerald-200 dark:hover:border-emerald-800 transition-all group"
                >
                  <div className="w-12 h-12 rounded-full bg-emerald-50 dark:bg-emerald-900/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400 group-hover:scale-110 transition-transform shrink-0">
                    <MessageCircle size={24} strokeWidth={1.5} />
                  </div>
                  <div className="text-left flex-1">
                    <h4 className="font-semibold text-sm text-slate-800 dark:text-slate-100">Bantuan Pesanan</h4>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-snug">Hubungi kasir untuk kendala menu atau pembayaran</p>
                  </div>
                  <ChevronRight size={16} className="text-slate-300 dark:text-slate-600 group-hover:text-emerald-500 transition-colors" />
                </button>

                {/* Opsi 2: Bantuan Teknis */}
                <button 
                  onClick={() => openWhatsApp('085159686554', techMessageTemplate)} 
                  className="w-full flex items-center gap-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-4 rounded-2xl active:scale-[0.98] hover:shadow-md hover:border-blue-200 dark:hover:border-blue-800 transition-all group"
                >
                  <div className="w-12 h-12 rounded-full bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400 group-hover:scale-110 transition-transform shrink-0">
                    <Smartphone size={24} strokeWidth={1.5} />
                  </div>
                  <div className="text-left flex-1">
                    <h4 className="font-semibold text-sm text-slate-800 dark:text-slate-100">Bantuan Teknis</h4>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-snug">Laporan error, bug, atau masalah pada aplikasi</p>
                  </div>
                  <ChevronRight size={16} className="text-slate-300 dark:text-slate-600 group-hover:text-blue-500 transition-colors" />
                </button>

              </div>
            )}
          </div>
        </div>

      </div>

      {/* Voucher Promo Dialog Modal (Tetap sama seperti sebelumnya) */}
      {showVouchers && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity" onClick={() => setShowVouchers(false)} />
          
          <div className="relative bg-white dark:bg-slate-900 w-full max-w-sm rounded-[2rem] p-6 shadow-2xl border border-slate-100 dark:border-slate-800 flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-200">
            
            <button 
              onClick={() => setShowVouchers(false)} 
              className="absolute top-4 right-4 p-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-500 rounded-full transition-colors z-10"
            >
              <X size={18} strokeWidth={2.5} />
            </button>
            
            <div className="text-center mb-6 pt-2">
              <div className="w-16 h-16 bg-orange-50 dark:bg-orange-500/10 rounded-full flex items-center justify-center mx-auto mb-4 text-orange-500 shadow-inner">
                <Ticket size={28} strokeWidth={1.5} />
              </div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">Promo Spesial</h2>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-[220px] mx-auto leading-relaxed">
                Salin kode di bawah dan gunakan saat melakukan pembayaran.
              </p>
            </div>

            <div className="flex-1 overflow-y-auto space-y-4 pr-1 custom-scrollbar-hide" style={{ scrollbarWidth: 'none' }}>
              {activeVouchers.length === 0 ? (
                <div className="text-center py-10">
                  <Ticket size={40} strokeWidth={1} className="mx-auto mb-3 text-slate-300 dark:text-slate-600" />
                  <p className="font-semibold text-slate-800 dark:text-slate-200">Belum Ada Promo</p>
                  <p className="text-xs text-slate-500 mt-1">Cek lagi nanti untuk promo menarik lainnya.</p>
                </div>
              ) : (
                activeVouchers.map((v: Voucher) => (
                  <div key={v.id} className="relative bg-white dark:bg-slate-800 border-2 border-orange-100 dark:border-slate-700 rounded-2xl overflow-hidden shadow-sm flex flex-col">
                    
                    <div className="absolute left-0 right-0 top-[60px] h-0 border-t-2 border-dashed border-orange-100 dark:border-slate-700" />
                    <div className="absolute -left-3 top-[52px] w-6 h-6 bg-white dark:bg-slate-900 rounded-full border-r-2 border-orange-100 dark:border-slate-700" />
                    <div className="absolute -right-3 top-[52px] w-6 h-6 bg-white dark:bg-slate-900 rounded-full border-l-2 border-orange-100 dark:border-slate-700" />

                    <div className="bg-orange-50/50 dark:bg-slate-800/50 p-4 pb-5">
                      <div className="flex justify-between items-start">
                        <div>
                          <span className="text-[10px] font-bold text-orange-600 dark:text-orange-400 uppercase tracking-widest bg-orange-100 dark:bg-orange-500/10 px-2 py-0.5 rounded-md inline-block mb-1">
                            Diskon
                          </span>
                          <h4 className="font-black text-2xl text-slate-900 dark:text-white leading-none">
                            {v.type === 'percentage' ? `${v.value}%` : FORMAT_IDR(v.value)}
                          </h4>
                        </div>
                      </div>
                    </div>
                    
                    <div className="p-4 pt-5 flex items-center justify-between bg-white dark:bg-slate-800">
                      <div>
                        <p className="text-[10px] text-slate-500 dark:text-slate-400 mb-0.5">Kode Promo:</p>
                        <span className="font-mono text-base font-bold text-slate-800 dark:text-slate-200 tracking-wider">
                          {v.code}
                        </span>
                      </div>
                      <button 
                        onClick={() => copyToClipboard(v.code)}
                        className="flex items-center gap-1.5 bg-slate-900 dark:bg-orange-600 hover:bg-slate-800 text-white text-xs font-bold px-4 py-2.5 rounded-xl active:scale-95 transition-all shadow-md shadow-slate-900/10"
                      >
                        <Scissors size={14} />
                        Salin
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      <style dangerouslySetInnerHTML={{__html: `
        .custom-scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
      `}} />
    </div>
  );
}
