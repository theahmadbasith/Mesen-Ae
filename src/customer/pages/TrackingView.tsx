import React, { useState, useEffect } from 'react';
import { 
  Plus, Bell, MessageCircle,
  ClipboardList, ChefHat, PackageOpen, BellRing, CheckCircle2,
  MapPin, Receipt, LucideIcon, Banknote
} from 'lucide-react';
import { 
  fetchTransactionByOrderNumber, 
  subscribeToTransactionUpdates,
  fetchTransactionsByCustomerName,
  fetchTransactionItems
} from '@/lib/db';
import { FORMAT_IDR } from '@/lib/utils';
import { toast } from 'sonner';
import ReceiptModal from '../../components/Receipt';

// ==========================================
// Tipe Data & Interfaces (TypeScript)
// ==========================================

export interface StoreSettings {
  phone?: string;
  [key: string]: any;
}

export interface TransactionInfo {
  id?: string | number;
  receipt_number?: string;
  receiptNumber?: string;
  table_number?: string;
  tableNumber?: string;
  kitchen_status?: string;
  kitchenStatus?: string;
  status?: string;
  [key: string]: any;
}

export interface FinalOrderData {
  transaction?: TransactionInfo;
  [key: string]: any;
}

export interface TrackingViewProps {
  setView: (view: string) => void;
  finalOrderData: FinalOrderData | null;
  tableNumber?: string | number;
  storeSettings: StoreSettings | null;
  customerName?: string | null;
}

interface Step {
  id: string;
  title: string;
  desc: string;
  icon: LucideIcon;
}

export default function TrackingView({ 
  setView, 
  finalOrderData, 
  tableNumber, 
  storeSettings,
  customerName
}: TrackingViewProps) {
  
  const [liveTx, setLiveTx] = useState<TransactionInfo | undefined>(finalOrderData?.transaction);
  const [receiptOpen, setReceiptOpen] = useState<boolean>(false);
  const [activeItems, setActiveItems] = useState<any[]>(finalOrderData?.items || []);
  const [paymentMethodName, setPaymentMethodName] = useState<string>(finalOrderData?.paymentMethodName || 'Pembayaran');
  const [loadingActive, setLoadingActive] = useState<boolean>(!finalOrderData);

  const isPaid = liveTx?.status === 'lunas' || liveTx?.status === 'completed';

  const openWhatsApp = (phone: string | undefined, text: string) => {
    if (!phone) {
      toast.error('Nomor telepon restoran belum diatur');
      return;
    }
    let formattedPhone = phone.replace(/\D/g, '');
    if (formattedPhone.startsWith('0')) {
      formattedPhone = '62' + formattedPhone.substring(1);
    }
    window.open(`https://wa.me/${formattedPhone}?text=${encodeURIComponent(text)}`, '_blank');
  };

  // 1. Hook to scan/lookup the active transaction in the background on mount
  useEffect(() => {
    const lookupActiveTransaction = async () => {
      if (!customerName) {
        setLoadingActive(false);
        return;
      }
      try {
        const txs = await fetchTransactionsByCustomerName(customerName);
        const sorted = (txs || []).sort((a, b) => {
          const dateA = new Date(a.date || a.created_at || 0).getTime();
          const dateB = new Date(b.date || b.created_at || 0).getTime();
          return dateB - dateA;
        });

        const active = sorted.find(tx => {
          const status = (tx.status || '').toLowerCase();
          const kitchen = (tx.kitchen_status || tx.kitchenStatus || 'pending').toLowerCase();
          return status !== 'cancelled' && (status === 'open' || kitchen !== 'diantarkan');
        });

        if (active) {
          setLiveTx(active);
          const items = await fetchTransactionItems(active.id);
          setActiveItems(items || []);
          
          let pmName = 'Pembayaran';
          if (active.payments) {
            try {
              const parsed = typeof active.payments === 'string' ? JSON.parse(active.payments) : active.payments;
              if (Array.isArray(parsed) && parsed.length > 0) {
                pmName = parsed[0].method_name || 'Pembayaran';
              }
            } catch (_) {}
          }
          if (active.payment_method_id === 0) {
            pmName = 'Bayar di Kasir';
          }
          setPaymentMethodName(pmName);
        }
      } catch (err) {
        console.error('Error looking up active transaction:', err);
      } finally {
        setLoadingActive(false);
      }
    };

    lookupActiveTransaction();
  }, [customerName]);

  // Loading spinner during background lookup (if finalOrderData is not present)
  if (loadingActive) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6 bg-slate-50 dark:bg-slate-950 min-h-screen">
        <div className="w-12 h-12 border-4 border-blue-600/30 border-t-blue-600 rounded-full animate-spin mb-4" />
        <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">
          Sinkronisasi status pesanan...
        </p>
      </div>
    );
  }

  // If we don't have an order to track, show empty state
  if (!liveTx) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6 bg-slate-50 dark:bg-slate-950 min-h-screen">
        <div className="w-24 h-24 bg-blue-50 dark:bg-slate-800 rounded-full flex items-center justify-center mb-6 shadow-inner">
          <PackageOpen size={40} strokeWidth={1.5} className="text-blue-500 dark:text-slate-400" />
        </div>
        <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2 text-center">Belum Ada Pesanan</h2>
        <p className="text-slate-500 dark:text-slate-400 mb-8 text-center text-sm max-w-[250px] leading-relaxed">
          Anda tidak memiliki pesanan aktif yang sedang dilacak saat ini.
        </p>
        <button 
          onClick={() => setView('menu')} 
          className="bg-blue-600 text-white px-8 py-3.5 rounded-full font-bold shadow-lg shadow-blue-600/20 active:scale-95 transition-all hover:bg-blue-700"
        >
          Lihat Katalog Menu
        </button>
      </div>
    );
  }

  // Use realtime subscription for transaction updates
  useEffect(() => {
    const transactionId = liveTx?.id;
    const receiptNum = liveTx?.receipt_number || liveTx?.receiptNumber;

    if (!transactionId || !receiptNum) return;

    const loadInitialData = async () => {
      const tx = await fetchTransactionByOrderNumber(receiptNum as string);
      if (tx) setLiveTx(tx);
    };
    
    loadInitialData();

    const unsubscribe = subscribeToTransactionUpdates(
      transactionId as any,
      (updatedTx: TransactionInfo) => setLiveTx(updatedTx)
    );

    return () => {
      if (unsubscribe && typeof unsubscribe === 'function') {
        unsubscribe();
      }
    };
  }, [finalOrderData?.transaction?.id, finalOrderData?.transaction?.receiptNumber, finalOrderData?.transaction?.receipt_number]);

  const currentStatus = (liveTx?.kitchen_status || liveTx?.kitchenStatus || 'diproses').toLowerCase();

  const stepsList: Step[] = [
    { id: 'diproses', title: 'Pesanan Diterima', desc: 'Kasir telah menerima pesanan Anda', icon: ClipboardList },
    { id: 'dimasak', title: 'Sedang Dimasak', desc: 'Koki kami sedang menyiapkan hidangan', icon: ChefHat },
    { id: 'disiapkan', title: 'Sedang Disiapkan', desc: 'Pesanan sedang dikemas atau diplating', icon: PackageOpen },
    { id: 'siap', title: 'Pesanan Siap', desc: 'Menunggu pelayan mengantar ke meja', icon: BellRing },
    { id: 'diantarkan', title: 'Selesai', desc: 'Selamat menikmati pesanan Anda!', icon: CheckCircle2 },
  ];

  // Logic to find current active step
  let currentStepIndex = stepsList.findIndex(s => s.id === currentStatus);
  // Fallback if status doesn't match standard flow
  if (currentStepIndex === -1) currentStepIndex = 0; 

  if (liveTx?.status === 'lunas' && currentStatus !== 'diantarkan') {
    // If somehow fully done but kitchen status isn't updated
    // Depend on your exact business logic.
  }

  return (
    <div className="flex-1 flex flex-col bg-slate-50 dark:bg-slate-950 min-h-screen">
      
      {/* Sticky Header */}
      <div className="sticky top-0 z-20 bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl px-4 pt-6 pb-4 border-b border-slate-200/60 dark:border-slate-800/60 shadow-[0_4px_20px_rgba(0,0,0,0.02)]">
        <h1 className="text-center font-bold text-lg text-slate-900 dark:text-white">
          Pelacakan Langsung
        </h1>
      </div>

      <div className="flex-1 p-5 overflow-y-auto pb-[120px] custom-scrollbar-hide">
        
        {/* Hero Card: Order & Table Info */}
        <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-[1.5rem] p-6 shadow-lg shadow-blue-600/20 mb-6 flex justify-between items-center relative overflow-hidden">
          {/* Decorative blur */}
          <div className="absolute -right-4 -bottom-4 w-32 h-32 bg-white/10 rounded-full blur-2xl pointer-events-none"></div>
          
          <div className="relative z-10">
            <div className="flex items-center gap-1.5 text-blue-100/80 mb-1">
              <Receipt size={14} />
              <p className="text-[11px] uppercase font-bold tracking-widest">Nomor Order</p>
            </div>
            <p className="font-black text-2xl text-white tracking-tight">
              {liveTx?.receipt_number || liveTx?.receiptNumber || 'TX-???'}
            </p>
          </div>
          
          <div className="text-right relative z-10 border-l border-white/20 pl-5">
            <div className="flex items-center justify-end gap-1.5 text-blue-100/80 mb-1">
              <MapPin size={14} />
              <p className="text-[11px] uppercase font-bold tracking-widest">{(liveTx?.table_number || liveTx?.tableNumber) === 'Bawa Pulang' ? 'Take Away' : 'Meja'}</p>
            </div>
            <p className="font-black text-3xl text-white leading-none">
              {(liveTx?.table_number || liveTx?.tableNumber) === 'Bawa Pulang' ? '🛍️' : (liveTx?.table_number || liveTx?.tableNumber || '-')}
            </p>
          </div>
        </div>

        {/* Timeline Status / Payment Notice */}
        {!isPaid ? (
          /* Tampilan Khusus Belum Lunas (Bayar Ke Kasir) */
          <div className="bg-white dark:bg-slate-900 rounded-[1.5rem] p-6 shadow-sm border border-slate-100 dark:border-slate-800 text-center space-y-6 mb-6">
            <div className="w-16 h-16 bg-amber-50 dark:bg-amber-500/10 rounded-full flex items-center justify-center mx-auto text-amber-500 animate-pulse">
              <Banknote size={32} />
            </div>
            
            <div className="space-y-2">
              <h3 className="font-extrabold text-slate-900 dark:text-white text-lg">
                Siapkan Cash & Bayar ke Kasir
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed max-w-xs mx-auto">
                Silakan lakukan pembayaran ke petugas kasir agar pesanan Anda dapat segera diproses dan dipantau statusnya di sini.
              </p>
            </div>
            
            <div className="bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-4 border border-slate-100 dark:border-slate-800/80">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">
                Jumlah Uang Tunai (Cash)
              </p>
              <p className="font-black text-2xl text-blue-600 dark:text-blue-400">
                {FORMAT_IDR(liveTx?.total || 0)}
              </p>
            </div>

            <div className="pt-2 text-xs font-bold text-amber-600 dark:text-amber-400 flex items-center justify-center gap-1.5 animate-pulse">
              <span className="w-2 h-2 rounded-full bg-amber-500"></span>
              <span>Status Pesanan: Bayar ke Kasir</span>
            </div>
          </div>
        ) : (
          /* Timeline Status (Tampilan Standar saat sudah Lunas) */
          <div className="bg-white dark:bg-slate-900 rounded-[1.5rem] p-6 shadow-sm border border-slate-100 dark:border-slate-800 relative mb-6">
            <h3 className="font-extrabold text-slate-900 dark:text-white text-base mb-6">
              Status Pesanan
            </h3>
            
            {/* Timeline Container */}
            <div className="relative pl-2">
              {/* The vertical connector line */}
              <div className="absolute top-4 bottom-8 left-[1.3rem] w-0.5 bg-slate-100 dark:bg-slate-800 rounded-full" />
              
              <div className="space-y-6">
                {stepsList.map((step, index) => {
                  const isDone = index < currentStepIndex || currentStatus === 'diantarkan';
                  const isActive = index === currentStepIndex && currentStatus !== 'diantarkan';
                  const isPending = index > currentStepIndex;

                  return (
                    <div key={step.id} className="relative flex items-start gap-4 group">
                      
                      {/* Circle Indicator */}
                      <div className="relative z-10 flex flex-col items-center">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-500 shadow-sm
                          ${isDone ? 'bg-emerald-500 text-white border-2 border-emerald-500' : 
                            isActive ? 'bg-blue-600 text-white border-4 border-blue-100 dark:border-slate-800' : 
                            'bg-slate-50 dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 text-slate-400'}
                        `}>
                          <step.icon size={18} strokeWidth={isDone || isActive ? 2.5 : 2} />
                        </div>
                        
                        {/* Pulsing ring for active state */}
                        {isActive && (
                          <div className="absolute inset-0 w-10 h-10 rounded-full border-2 border-blue-500/50 animate-ping" />
                        )}
                      </div>
                      
                      {/* Text Content */}
                      <div className="pt-1.5 w-full">
                        <h4 className={`font-bold text-sm transition-colors duration-300 ${
                          isDone ? 'text-slate-900 dark:text-white' : 
                          isActive ? 'text-blue-600 dark:text-blue-400' : 
                          'text-slate-400 dark:text-slate-600'
                        }`}>
                          {step.title}
                        </h4>
                        <p className={`text-xs mt-1 transition-colors duration-300 leading-relaxed ${
                          isDone || isActive ? 'text-slate-500 dark:text-slate-400' : 'text-slate-300 dark:text-slate-700'
                        }`}>
                          {step.desc}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
        
        {/* Additional Actions */}
        <div className="space-y-3">
          {/* Tombol Lihat Struk Digital / Detail Tagihan */}
          <button
            onClick={() => setReceiptOpen(true)}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-[1.2rem] py-4 font-bold flex items-center justify-center text-sm shadow-lg shadow-blue-600/20 active:scale-[0.98] transition-all mb-1"
          >
            <Receipt size={18} className="mr-2" /> {isPaid ? 'Lihat Struk Digital' : 'Lihat Detail Tagihan'}
          </button>

          {/* Contact WhatsApp */}
          <button
            onClick={() => {
              const orderNum = liveTx?.receipt_number || liveTx?.receiptNumber || '';
              const tbl = liveTx?.table_number || liveTx?.tableNumber || '-';
              const tblLabel = tbl === 'Bawa Pulang' ? 'Take Away' : `Meja *${tbl}*`;
              const text = `Halo, saya ingin menanyakan status pesanan saya dengan nomor order *${orderNum}* (${tblLabel}). Terimakasih!`;
              openWhatsApp(storeSettings?.phone, text);
            }}
            className="w-full bg-[#25D366] hover:bg-[#20bd5a] text-white rounded-[1.2rem] py-4 font-bold flex items-center justify-center text-sm shadow-lg shadow-[#25D366]/20 active:scale-[0.98] transition-all"
          >
            <MessageCircle size={20} className="mr-2" /> Hubungi Dapur / Restoran
          </button>

          {/* Secondary Action Buttons */}
          <button 
            onClick={() => setView('menu')} 
            className="w-full bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-500/20 rounded-[1.2rem] py-4 font-bold flex items-center justify-center text-sm active:scale-[0.98] transition-all shadow-sm"
          >
            <Plus size={18} strokeWidth={2.5} className="mr-2" /> Pesan Lagi
          </button>
        </div>

      </div>

      {/* Komponen Struk Modal */}
      <ReceiptModal 
        open={receiptOpen}
        onClose={() => setReceiptOpen(false)}
        transaction={liveTx as any}
        items={activeItems}
        storeSettings={storeSettings as any}
        paymentMethodName={paymentMethodName}
      />

      <style dangerouslySetInnerHTML={{__html: `
        .custom-scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
      `}} />
    </div>
  );
}
