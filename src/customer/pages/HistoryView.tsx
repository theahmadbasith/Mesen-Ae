import React, { useState, useEffect } from 'react';
import { 
  ChevronLeft, ShoppingBag, Clock, Receipt, 
  ChevronRight, CheckCircle2, Package, XCircle, FileText,
  LucideIcon
} from 'lucide-react';
import { FORMAT_IDR } from '@/lib/utils';
import { fetchTransactionsByCustomerName, fetchTransactionItems } from '@/lib/db';
import { toast } from 'sonner';
import ReceiptModal from '../../components/Receipt';

// 1. Definisikan tipe untuk Data Transaksi
interface Transaction {
  id: string | number;
  date?: string | Date;
  created_at?: string | Date;
  status?: string;
  receipt_number?: string;
  total: number;
  table_number?: string | number | null;
}

// 2. Definisikan tipe untuk Props Komponen
interface HistoryViewProps {
  setView: (view: string) => void;
  customerName?: string | null;
  storeSettings?: any;
}

// 3. Definisikan tipe untuk return value dari fungsi getStatusDisplay
interface StatusDisplay {
  bg: string;
  text: string;
  label: string;
  Icon: LucideIcon;
}

export default function HistoryView({ setView, customerName, storeSettings }: HistoryViewProps) {
  const [history, setHistory] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // States untuk Struk Modal
  const [selectedTx, setSelectedTx] = useState<any | null>(null);
  const [selectedItems, setSelectedItems] = useState<any[]>([]);
  const [selectedPmName, setSelectedPmName] = useState<string>('Pembayaran');
  const [receiptOpen, setReceiptOpen] = useState<boolean>(false);

  useEffect(() => {
    const loadHistory = async () => {
      setLoading(true);
      try {
        // Assertion as Transaction[] agar dikenali tipe objeknya
        const data = (await fetchTransactionsByCustomerName(customerName)) as Transaction[];
        
        // Pastikan mengurutkan dari yang terbaru jika API belum mengurutkan
        const sortedData = (data || []).sort((a, b) => {
          // Menambahkan fallback new Date() jika undefined untuk menghindari error Invalid Date
          const dateA = new Date(a.date || a.created_at || new Date()).getTime();
          const dateB = new Date(b.date || b.created_at || new Date()).getTime();
          return dateB - dateA;
        });
        setHistory(sortedData);
      } catch (error) {
        console.error("Gagal memuat riwayat", error);
        setHistory([]);
      } finally {
        setLoading(false);
      }
    };

    if (customerName) {
      loadHistory();
    } else {
      setLoading(false);
    }
  }, [customerName]);

  // Helper untuk styling status pesanan
  const getStatusDisplay = (status?: string): StatusDisplay => {
    const s = (status || '').toLowerCase();
    if (s === 'completed' || s === 'selesai') {
      return { 
        bg: 'bg-emerald-50 dark:bg-emerald-500/10', 
        text: 'text-emerald-600 dark:text-emerald-400', 
        label: 'Selesai', 
        Icon: CheckCircle2 
      };
    }
    if (s === 'processing' || s === 'diproses') {
      return { 
        bg: 'bg-blue-50 dark:bg-blue-500/10', 
        text: 'text-blue-600 dark:text-blue-400', 
        label: 'Diproses', 
        Icon: Package 
      };
    }
    if (s === 'cancelled' || s === 'batal') {
      return { 
        bg: 'bg-rose-50 dark:bg-rose-500/10', 
        text: 'text-rose-600 dark:text-rose-400', 
        label: 'Batal', 
        Icon: XCircle 
      };
    }
    if (s === 'open') {
      return { 
        bg: 'bg-amber-50 dark:bg-amber-500/10', 
        text: 'text-amber-600 dark:text-amber-400', 
        label: 'Bayar ke Kasir', 
        Icon: Clock 
      };
    }
    // Default / Pending
    return { 
      bg: 'bg-slate-100 dark:bg-slate-800', 
      text: 'text-slate-600 dark:text-slate-400', 
      label: status || 'Menunggu', 
      Icon: Clock 
    };
  };

  return (
    <div className="flex-1 flex flex-col bg-slate-50 dark:bg-slate-950 h-screen">
      
      {/* Sticky Header */}
      <div className="sticky top-0 z-20 bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl px-4 pt-6 pb-4 border-b border-slate-200/60 dark:border-slate-800/60 shadow-[0_4px_20px_rgba(0,0,0,0.02)] flex items-center">
        <button 
          onClick={() => setView('others')} 
          className="w-11 h-11 flex items-center justify-center bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-full active:scale-95 transition-all shrink-0"
        >
          <ChevronLeft size={22} className="text-slate-700 dark:text-slate-300" />
        </button>
        <h1 className="flex-1 text-center font-bold text-lg text-slate-900 dark:text-white pr-11">
          Riwayat Pesanan
        </h1>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 p-4 pb-[120px] overflow-y-auto">
        {loading ? (
          /* Skeleton Loading */
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="bg-white dark:bg-slate-900 rounded-[1.5rem] p-5 border border-slate-100 dark:border-slate-800 space-y-4 shadow-sm">
                <div className="flex justify-between items-start">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 bg-slate-200 dark:bg-slate-800 rounded-full animate-pulse" />
                      <div className="h-3 w-28 bg-slate-200 dark:bg-slate-800 animate-pulse rounded-full" />
                    </div>
                    <div className="h-5 w-36 bg-slate-200 dark:bg-slate-800 animate-pulse rounded-full" />
                  </div>
                  <div className="h-7 w-24 bg-slate-200 dark:bg-slate-800 animate-pulse rounded-full" />
                </div>
                <div className="border-t-2 border-dashed border-slate-100 dark:border-slate-800 pt-4 flex justify-between items-center">
                  <div className="space-y-2">
                    <div className="h-3 w-20 bg-slate-200 dark:bg-slate-800 animate-pulse rounded-full" />
                    <div className="h-6 w-32 bg-slate-200 dark:bg-slate-800 animate-pulse rounded-full" />
                  </div>
                  <div className="w-8 h-8 bg-slate-200 dark:bg-slate-800 animate-pulse rounded-full" />
                </div>
              </div>
            ))}
          </div>
        ) : history.length === 0 ? (
          /* Empty State */
          <div className="flex flex-col items-center justify-center h-full text-center px-6 mt-10">
            <div className="w-24 h-24 bg-blue-50 dark:bg-slate-800 rounded-full flex items-center justify-center mb-6 shadow-inner">
              <FileText size={40} strokeWidth={1.5} className="text-blue-500 dark:text-slate-400" />
            </div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
              Belum Ada Transaksi
            </h2>
            <p className="text-slate-500 dark:text-slate-400 text-sm max-w-[260px] leading-relaxed">
              Kelihatannya Anda belum membuat pesanan. Yuk, lihat katalog dan mulai belanja!
            </p>
            <button 
              onClick={() => setView('menu')} 
              className="mt-8 bg-blue-600 text-white px-8 py-3.5 rounded-full font-semibold shadow-lg shadow-blue-600/20 active:scale-95 transition-all hover:bg-blue-700"
            >
              Lihat Katalog
            </button>
          </div>
        ) : (
          /* Transaction List */
          <div className="space-y-4">
            {history.map((tx: Transaction) => {
              const statusInfo = getStatusDisplay(tx.status);
              const txDate = new Date(tx.date || tx.created_at || new Date());
              
              return (
                <div 
                  key={tx.id} 
                  className="group bg-white dark:bg-slate-900 rounded-[1.5rem] p-5 border border-slate-100 dark:border-slate-800 shadow-sm hover:shadow-md transition-all relative overflow-hidden active:scale-[0.98] cursor-pointer"
                  onClick={async () => {
                    const toastId = toast.loading('Memuat detail struk...');
                    try {
                      const items = await fetchTransactionItems(tx.id as number);
                      // Map receipt_number to receiptNumber for compatibility
                      const normalizedTx = {
                        ...tx,
                        receiptNumber: tx.receipt_number || `ORD-${tx.id.toString().slice(-5).toUpperCase()}`
                      };
                      setSelectedTx(normalizedTx);
                      setSelectedItems(items || []);
                      
                      let pmName = 'Pembayaran';
                      if ((tx as any).payments) {
                        try {
                          const parsed = typeof (tx as any).payments === 'string' ? JSON.parse((tx as any).payments) : (tx as any).payments;
                          if (Array.isArray(parsed) && parsed.length > 0) {
                            pmName = parsed[0].method_name || 'Pembayaran';
                          }
                        } catch (_) {}
                      }
                      if ((tx as any).payment_method_id === 0) {
                        pmName = 'Bayar di Kasir';
                      }
                      setSelectedPmName(pmName);
                      setReceiptOpen(true);
                      toast.dismiss(toastId);
                    } catch (error) {
                      console.error('Gagal mengambil item transaksi:', error);
                      toast.error('Gagal memuat detail struk');
                      toast.dismiss(toastId);
                    }
                  }}
                >
                  {/* Bagian Atas: Tanggal & Nomor Pesanan */}
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <div className="flex items-center space-x-1.5 text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5">
                        <Clock size={14} />
                        <span>
                          {txDate.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                          <span className="mx-1">•</span>
                          {txDate.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Receipt size={16} className="text-slate-400" />
                        <p className="font-extrabold text-slate-900 dark:text-white">
                          {tx.receipt_number || `ORD-${tx.id.toString().slice(-5).toUpperCase()}`}
                        </p>
                      </div>
                    </div>

                    {/* Badge Status */}
                    <div className={`flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-bold uppercase rounded-md tracking-wider border border-transparent ${statusInfo.bg} ${statusInfo.text}`}>
                      <statusInfo.Icon size={12} strokeWidth={3} />
                      {statusInfo.label}
                    </div>
                  </div>
                  
                  {/* Pemisah Struk (Dashed Line) */}
                  <div className="relative h-0 border-t-2 border-dashed border-slate-100 dark:border-slate-800 my-4">
                    {/* Lubang pinggir struk (opsional, detail UI estetik) */}
                    <div className="absolute -left-[26px] -top-2 w-4 h-4 bg-slate-50 dark:bg-slate-950 rounded-full border border-slate-100 dark:border-slate-800" />
                    <div className="absolute -right-[26px] -top-2 w-4 h-4 bg-slate-50 dark:bg-slate-950 rounded-full border border-slate-100 dark:border-slate-800" />
                  </div>

                  {/* Bagian Bawah: Total & Info Meja */}
                  <div className="flex justify-between items-end relative z-10">
                    <div>
                      <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-1">
                        Total Belanja
                      </p>
                      <p className="font-black text-xl text-blue-600 dark:text-blue-400">
                        {FORMAT_IDR(tx.total)}
                      </p>
                    </div>
                    
                    <div className="flex items-center gap-4">
                      {tx.table_number && (
                        <div className="text-right border-r border-slate-200 dark:border-slate-700 pr-4">
                          <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-1">
                            {String(tx.table_number) === 'Bawa Pulang' ? 'Tipe' : 'Meja'}
                          </p>
                          <p className="font-bold text-slate-900 dark:text-white">
                            {String(tx.table_number) === 'Bawa Pulang' ? 'Take Away' : tx.table_number}
                          </p>
                        </div>
                      )}
                      
                      {/* Chevron Detail Indicator */}
                      <div className="w-8 h-8 rounded-full bg-slate-50 dark:bg-slate-800 group-hover:bg-blue-50 dark:group-hover:bg-slate-700 flex items-center justify-center text-slate-400 group-hover:text-blue-600 transition-colors">
                        <ChevronRight size={18} strokeWidth={2.5} />
                      </div>
                    </div>
                  </div>

                  {/* Efek Cahaya / Glow Latar Belakang (Samar) */}
                  <div className="absolute -right-10 -bottom-10 w-32 h-32 bg-blue-500/5 rounded-full blur-2xl pointer-events-none" />
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Receipt Modal */}
      {selectedTx && (
        <ReceiptModal
          open={receiptOpen}
          onClose={() => {
            setReceiptOpen(false);
            setSelectedTx(null);
          }}
          transaction={selectedTx}
          items={selectedItems}
          storeSettings={storeSettings || undefined}
          paymentMethodName={selectedPmName}
        />
      )}
    </div>
  );
}
