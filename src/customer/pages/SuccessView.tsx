import React, { useState, useEffect } from 'react';
import { Check, Receipt as ReceiptIcon, Home, ChefHat } from 'lucide-react';
import Receipt from '../../components/Receipt';
import { useDbQuery, StoreSettings } from '@/hooks/db-hooks';
import { FORMAT_IDR } from '@/lib/utils';

// ==========================================
// Tipe Data & Interfaces (TypeScript)
// ==========================================

export interface TransactionData {
  status?: string;
  receipt_number?: string;
  receiptNumber?: string;
  total?: number;
  [key: string]: any; // Untuk mendukung properti lain dari database
}

export interface FinalOrderData {
  transaction?: TransactionData;
  items?: any[]; // Bisa diganti dengan interface CartItem spesifik jika ada
  paymentMethodName?: string;
  [key: string]: any;
}

export interface SuccessViewProps {
  setView: (view: string) => void;
  finalOrderData: FinalOrderData | null;
}

export default function SuccessView({ setView, finalOrderData }: SuccessViewProps) {
  // Diubah ke false agar pengguna bisa melihat layar "Sukses" yang cantik ini
  // sebelum memutuskan untuk membuka popup Struk secara manual.
  const [receiptOpen, setReceiptOpen] = useState<boolean>(false); 
  
  // Mengambil dan menentukan tipe data query dari DB
  const storeSettingsList = (useDbQuery('storeSettings') as StoreSettings[]) ?? [];
  const storeSettings: StoreSettings | undefined = storeSettingsList[0] || undefined;
  
  // Ambil data transaksi secara real-time dari Firestore
  const allTransactions = (useDbQuery('transactions') as TransactionData[]) ?? [];
  const liveTransaction = allTransactions.find(t => t.id === finalOrderData?.transaction?.id) || finalOrderData?.transaction;

  // Memastikan layar kembali ke atas saat masuk ke halaman ini
  useEffect(() => {
    window.scrollTo(0, 0);
    
    // Minta izin notifikasi (FCM) secara elegan setelah berhasil pesan
    import('@/lib/fcm').then(({ requestForToken }) => {
      const custName = finalOrderData?.transaction?.customer_name || 'Tamu';
      requestForToken('customer', custName).then(token => {
        if (token) console.log('Customer Opt-In Push Notification');
      });
    });
  }, [finalOrderData]);

  if (!finalOrderData) return null;

  const isLunas: boolean = liveTransaction?.status === 'lunas' || liveTransaction?.status === 'completed';
  const orderNumber: string = liveTransaction?.receipt_number || liveTransaction?.receiptNumber || 'TX-???';
  const total: number = liveTransaction?.total || 0;

  return (
    <div className="flex-1 flex flex-col bg-slate-50 dark:bg-slate-950 min-h-screen items-center justify-center p-6 text-center animate-in fade-in duration-500">
      
      {/* Animated Success Icon */}
      <div className="relative mb-8">
        {/* Background pulsing glow */}
        <div className="absolute inset-0 bg-emerald-500/20 dark:bg-emerald-500/10 rounded-full animate-ping" style={{ animationDuration: '2s' }} />
        
        {/* Main Circle */}
        <div className="relative w-28 h-28 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center text-emerald-500 dark:text-emerald-400 shadow-inner border-4 border-white dark:border-slate-900">
          <Check size={56} strokeWidth={3} className="animate-in zoom-in spin-in-12 duration-500 delay-150" />
        </div>
      </div>

      {/* Typography */}
      <h2 className="text-3xl font-black text-slate-900 dark:text-white mb-3 tracking-tight">
        {isLunas ? 'Pembayaran Berhasil!' : 'Pesanan Telah Dicatat!'}
      </h2>
      <p className="text-slate-500 dark:text-slate-400 mb-8 max-w-[320px] mx-auto leading-relaxed text-sm">
        {isLunas 
          ? 'Terima kasih, pembayaran telah diterima dan pesanan Anda segera kami siapkan.' 
          : `Silakan siapkan uang tunai sebesar ${FORMAT_IDR(total)} dan lakukan pembayaran di kasir agar pesanan Anda dapat diproses.`}
      </p>

      {/* Mini Order Summary Card */}
      <div className="w-full max-w-sm bg-white dark:bg-slate-900 rounded-[1.5rem] p-5 shadow-sm border border-slate-100 dark:border-slate-800 mb-8 flex justify-between items-center text-left">
        <div>
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1">
            Nomor Pesanan
          </p>
          <p className="font-extrabold text-slate-900 dark:text-white text-lg">
            {orderNumber}
          </p>
        </div>
        <div className="text-right border-l border-slate-100 dark:border-slate-800 pl-5">
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1">
            Total
          </p>
          <p className="font-black text-blue-600 dark:text-blue-400 text-lg">
            {FORMAT_IDR(total)}
          </p>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="space-y-3 w-full max-w-sm">
        
        {/* Tombol Utama (Struk) */}
        <button 
          onClick={() => setReceiptOpen(true)}
          disabled={!isLunas}
          className={`w-full flex items-center justify-center gap-2 rounded-[1.2rem] py-4 font-bold text-base transition-all ${
            isLunas 
              ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-600/20 active:scale-[0.98]' 
              : 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 cursor-not-allowed border border-slate-200 dark:border-slate-700 shadow-inner'
          }`}
        >
          <ReceiptIcon size={20} strokeWidth={2.5} />
          {isLunas ? 'Lihat Struk Digital' : 'Menunggu Konfirmasi Kasir'}
        </button>

        {/* Tombol Sekunder (Split jadi 2) */}
        <div className="grid grid-cols-2 gap-3">
          <button 
            onClick={() => setView('tracking')}
            className="flex items-center justify-center gap-2 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-[1.2rem] py-3.5 font-bold text-sm active:scale-95 transition-all shadow-sm"
          >
            <ChefHat size={18} />
            Lacak Pesanan
          </button>
          
          <button 
            onClick={() => setView('landing')}
            className="flex items-center justify-center gap-2 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-[1.2rem] py-3.5 font-bold text-sm active:scale-95 transition-all shadow-sm"
          >
            <Home size={18} />
            Ke Beranda
          </button>
        </div>

      </div>

      {/* Komponen Struk Modal */}
      <Receipt 
        open={receiptOpen}
        onClose={() => setReceiptOpen(false)}
        transaction={finalOrderData.transaction as any}
        items={finalOrderData.items}
        storeSettings={storeSettings}
        paymentMethodName={finalOrderData.paymentMethodName}
      />
    </div>
  );
}
