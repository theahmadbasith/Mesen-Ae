import React, { useState, useMemo } from 'react';
import { 
  ChevronLeft, Clock, QrCode, CreditCard, Banknote, 
  ArrowRight, Smartphone, LayoutGrid, CheckCircle2, User, MapPin, LucideIcon
} from 'lucide-react';
import { FORMAT_IDR, saveLocalTransactionId } from '@/lib/utils';
import { MidtransPaymentModal } from '../../components/MidtransPaymentModal';
import { toast } from 'sonner';
// Import yang tidak terpakai dibiarkan sesuai aslinya untuk menjaga struktur file Anda
import { useDbQuery, dbInsert, dbUpdate, dbDelete } from '@/hooks/db-hooks';
import { 
  createTransaction, createTransactionItems, updateProductStock, db, 
  fetchTransactionByReceiptNumber, appendPaymentToTransactionByReceipt 
} from '../../lib/db';
import { toDatabaseTransaction, toDatabaseTransactionItem, mapVoucher } from '../../lib/sync';

// --- DEFINISI INTERFACE & TIPE DATA ---

interface Variant {
  name?: string;
  price: number;
}

interface CartItem {
  id: number | string;
  name: string;
  qty: number;
  price: number;
  hpp?: number;
  stock?: number;
  selectedVariants?: Variant[];
  notes?: string;
}

interface Totals {
  subtotal: number;
  total: number;
}

interface Voucher {
  id?: number;
  type: 'percentage' | 'nominal';
  value: number;
  code: string;
  isActive?: boolean;
  applicableProductIds?: number[];
}

interface PaymentRecord {
  method_id: number | string;
  method_name: string;
  amount: number;
  date: string;
}

interface TransactionData {
  id?: string | number;
  subtotal: number;
  discount_type: 'percentage' | 'nominal' | null;
  discount_value: number;
  discount_amount: number;
  total: number;
  payment_method_id: number | string;
  payment_amount: number;
  payments: PaymentRecord[];
  change: number;
  profit: number;
  date: string;
  receipt_number: string;
  status: string;
  kitchen_status: string;
  customer_name: string | null;
  table_number: string | null;
  opened_at: string;
  closed_at?: string | null;
  remarks?: string;
}

interface TransactionItemRecord {
  transaction_id: string | number;
  product_id: number | string;
  product_name: string;
  quantity: number;
  price: number;
  hpp: number;
  discount_type: string | null;
  discount_value: number;
  discount_amount: number;
  subtotal: number;
  selected_variants: Variant[];
  notes?: string;
}

interface FinalOrderData {
  transaction: TransactionData;
  items: TransactionItemRecord[];
  paymentMethodName: string;
}

interface CheckoutViewProps {
  setView: (view: string) => void;
  totals: Totals;
  cart: CartItem[];
  customerName?: string | null;
  setFinalOrderData: (data: FinalOrderData) => void;
  setCart: (cart: CartItem[]) => void;
  tableNumber?: string | number;
  setTableNumber: (val: string) => void;
}

interface PaymentMethod {
  id: number | string;
  name: string;
  category: string;
  icon: LucideIcon;
  desc: string;
}

// --- KOMPONEN UTAMA ---

export default function CheckoutView({ 
  setView, 
  totals, 
  cart, 
  customerName, 
  setFinalOrderData, 
  setCart, 
  tableNumber, 
  setTableNumber 
}: CheckoutViewProps) {
  const [method, setMethod] = useState<string>('cash');
  const [processing, setProcessing] = useState<boolean>(false);
  const [midtransOpen, setMidtransOpen] = useState<boolean>(false);
  const [pendingReceiptNumber, setPendingReceiptNumber] = useState<string | null>(null);
  
  // Voucher & promo state
  const [appliedVoucher, setAppliedVoucher] = useState<Voucher | null>(null);
  const [promoCode, setPromoCode] = useState<string>('');
  const [promoError, setPromoError] = useState<string>('');
  
  // Query vouchers dari database
  const allVouchers = (useDbQuery('vouchers') as Voucher[]) ?? [];

  // Payment methods
  const paymentMethods: PaymentMethod[] = [
    { id: 1, name: 'QRIS', category: 'qris', icon: QrCode, desc: 'Gopay, OVO, Dana, LinkAja' },
    { id: 2, name: 'E-Wallet', category: 'e-wallet', icon: Smartphone, desc: 'Gopay, ShopeePay' },
    { id: 3, name: 'Transfer Bank', category: 'transfer', icon: CreditCard, desc: 'BCA, BNI, BRI, Mandiri' },
    { id: 4, name: 'Lainnya', category: 'lainnya', icon: LayoutGrid, desc: 'Metode lainnya via Midtrans' },
  ];

  const getDiscountAmount = (): number => {
    if (!appliedVoucher) return 0;
    
    let eligibleSubtotal = totals.subtotal;
    if (appliedVoucher.applicableProductIds && appliedVoucher.applicableProductIds.length > 0) {
      eligibleSubtotal = cart.reduce((sum, item) => {
        if (appliedVoucher.applicableProductIds!.includes(item.id)) {
          return sum + (item.price * item.qty);
        }
        return sum;
      }, 0);
    }

    if (eligibleSubtotal === 0) return 0;

    if (appliedVoucher.type === 'percentage') {
      return (eligibleSubtotal * appliedVoucher.value) / 100;
    }
    
    return Math.min(appliedVoucher.value, eligibleSubtotal);
  };

  const finalTotal = Math.max(0, totals.total - getDiscountAmount());

  const getPayAmount = () => finalTotal;

  const handleApplyPromo = () => {
    if (!promoCode.trim()) {
      setPromoError('Masukkan kode promo');
      return;
    }
    
    const found = allVouchers.find(v => v.code.toUpperCase() === promoCode.trim().toUpperCase());
    
    if (!found) {
      setPromoError('Kode promo tidak ditemukan atau tidak valid');
      return;
    }
    
    if (!found.isActive) {
      setPromoError('Kode promo sudah tidak aktif');
      return;
    }
    
    setAppliedVoucher(found);
    toast.success(`Promo ${found.code} berhasil diterapkan`);
    setPromoError('');
    setPromoCode('');
  };

  const handlePay = async () => {
    if (!tableNumber) {
      toast.error('Terjadi kesalahan, coba muat ulang halaman.');
      setView('landing');
      return;
    }

    if (method === 'cash') {
      setProcessing(true);
      try {
        const receiptNumber = `TX${Date.now()}`;
        const payAmount = getPayAmount();
        
        const txData: TransactionData = {
          subtotal: totals.subtotal,
          discount_type: appliedVoucher?.type || null,
          discount_value: appliedVoucher?.value || 0,
          discount_amount: getDiscountAmount(),
          total: finalTotal,
          payment_method_id: 0,
          payment_amount: 0,
          payments: [],
          change: 0,
          profit: 0,
          date: new Date().toISOString(),
          receipt_number: receiptNumber,
          status: 'belum lunas',
          kitchen_status: 'pending',
          customer_name: (customerName || 'Tamu').trim(),
          table_number: (tableNumber?.toString() || '').trim(),
          opened_at: new Date().toISOString(),
        };

        txData.payment_amount = 0;
        txData.payments = [];
        txData.status = 'belum lunas';

        const txId = await createTransaction(txData);
        if (!txId) throw new Error('Failed to create transaction');
        
        saveLocalTransactionId(txId);

        const itemRecords: TransactionItemRecord[] = cart.map(c => ({
          transaction_id: txId,
          product_id: c.id,
          product_name: c.name,
          quantity: c.qty,
          price: c.price,
          hpp: c.hpp || 0,
          discount_type: null,
          discount_value: 0,
          discount_amount: 0,
          subtotal: (c.price + (c.selectedVariants?.reduce((s: number, a: Variant) => s + a.price, 0) || 0)) * c.qty,
          selected_variants: c.selectedVariants || [],
          notes: c.notes,
        }));
        
        await createTransactionItems(itemRecords);

        for (const item of cart) {
          const newStock = (item.stock || 0) - item.qty;
          await updateProductStock(item.id, newStock);
        }

        setFinalOrderData({
          transaction: { ...txData, id: txId },
          items: itemRecords,
          paymentMethodName: 'Bayar di Kasir'
        });



        setCart([]);
        setView('success');
      } catch (err: unknown) {
        console.error('Error:', err);
        toast.error("Gagal menyimpan pesanan");
      } finally {
        setProcessing(false);
      }
    } else {
      const receiptNumber = `TX${Date.now()}`;
      setPendingReceiptNumber(receiptNumber);
      setMidtransOpen(true);
    }
  };

  const onMidtransSuccess = async () => {
    setMidtransOpen(false);
    setProcessing(true);
    try {
      const pm = paymentMethods.find(p => p.category === method);
      const receiptNumber = pendingReceiptNumber || `TX${Date.now()}`;
      const totalProfit = cart.reduce((sum, item) => sum + ((item.price - (item.hpp || 0)) * item.qty), 0);
      const isFullPayment = true;

      const txData: TransactionData = {
        subtotal: totals.subtotal,
        discount_type: appliedVoucher?.type || null,
        discount_value: appliedVoucher?.value || 0,
        discount_amount: getDiscountAmount(),
        total: finalTotal,
        payment_method_id: pm ? pm.id : 0,
        payment_amount: finalTotal,
        payments: [{
          method_id: pm ? pm.id : 0,
          method_name: pm ? pm.name : method.toUpperCase(),
          amount: finalTotal,
          date: new Date().toISOString()
        }],
        change: 0,
        profit: totalProfit,
        date: new Date().toISOString(),
        receipt_number: receiptNumber,
        status: isFullPayment ? 'lunas' : 'belum lunas',
        kitchen_status: isFullPayment ? 'diproses' : 'pending',
        customer_name: (customerName || '').trim() || null,
        table_number: (tableNumber?.toString() || '').trim() || null,
        remarks: 'Pesanan dari Web',
        opened_at: new Date().toISOString(),
        closed_at: isFullPayment ? new Date().toISOString() : null,
      };

      const existing = await fetchTransactionByReceiptNumber(receiptNumber);
      let txId: string | number | null = null;

      if (existing) {
        await appendPaymentToTransactionByReceipt(receiptNumber, txData.payments[0]);
        txId = existing.id;
      } else {
        const createdId = await createTransaction(txData);
        if (!createdId) throw new Error('Failed to create transaction');
        
        saveLocalTransactionId(createdId);
        txId = createdId;

        const itemRecords: TransactionItemRecord[] = cart.map(c => ({
          transaction_id: txId as string | number,
          product_id: c.id,
          product_name: c.name,
          quantity: c.qty,
          price: c.price,
          hpp: c.hpp || 0,
          discount_type: null,
          discount_value: 0,
          discount_amount: 0,
          subtotal: (c.price + (c.selectedVariants?.reduce((s: number, a: Variant) => s + a.price, 0) || 0)) * c.qty,
          selected_variants: c.selectedVariants || [],
          notes: c.notes,
        }));
        await createTransactionItems(itemRecords);

        for (const item of cart) {
          const newStock = (item.stock || 0) - item.qty;
          await updateProductStock(item.id, newStock);
        }

        setFinalOrderData({
          transaction: { ...txData, id: txId },
          items: itemRecords,
          paymentMethodName: pm ? pm.name : method.toUpperCase()
        });



        setCart([]);
      }

      const updated = await fetchTransactionByReceiptNumber(receiptNumber);
      const updatedStatus = updated?.status || null;

      if (updatedStatus === 'lunas' || (!isFullPayment && method !== 'cash') || (method !== 'cash' && !isFullPayment)) {
        setView('success');
      } else if (method !== 'cash' && isFullPayment) {
        setView('tracking');
      } else {
        setView('success');
      }
    } catch (err: unknown) {
      console.error('Error:', err);
      toast.error("Gagal memproses transaksi");
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col bg-slate-50 dark:bg-slate-950 min-h-screen">
      
      {/* Sticky Header */}
      <div className="sticky top-0 z-20 bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl px-4 pt-6 pb-4 border-b border-slate-200/60 dark:border-slate-800/60 flex items-center shadow-[0_4px_20px_rgba(0,0,0,0.02)]">
        <button 
          onClick={() => setView('cart')} 
          className="w-11 h-11 flex items-center justify-center bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-full active:scale-95 transition-all shrink-0"
        >
          <ChevronLeft size={22} className="text-slate-700 dark:text-slate-300" />
        </button>
        <h1 className="flex-1 text-center font-bold text-lg text-slate-900 dark:text-white pr-11">
          Pembayaran
        </h1>
      </div>

      <div className="flex-1 p-5 space-y-6 overflow-y-auto pb-[140px] custom-scrollbar-hide">
        
        {/* Customer Info Card */}
        <div className="bg-white dark:bg-slate-900 rounded-[1.5rem] shadow-sm border border-slate-100 dark:border-slate-800 overflow-hidden">
          <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-blue-50 dark:bg-slate-800 flex items-center justify-center text-blue-600 dark:text-blue-400">
              <User size={18} />
            </div>
            <div>
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Nama Pemesan</p>
              <p className="font-bold text-slate-900 dark:text-white text-sm">{customerName || 'Tamu'}</p>
            </div>
          </div>
          <div className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-blue-50 dark:bg-slate-800 flex items-center justify-center text-blue-600 dark:text-blue-400">
              <MapPin size={18} />
            </div>
            <div className="flex-1">
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">{tableNumber === 'Bawa Pulang' ? 'Tipe Pesanan' : 'Meja Anda'}</p>
              <input 
                type="text"
                disabled={true}
                placeholder="-"
                value={tableNumber === 'Bawa Pulang' ? 'Take Away (Bawa Pulang)' : tableNumber ? `Meja ${tableNumber}` : '-'}
                className="w-full bg-transparent border-none pb-1 text-sm font-bold text-slate-900 dark:text-white outline-none cursor-not-allowed select-none placeholder-slate-400"
              />
            </div>
          </div>
        </div>

        {/* Total Bill Card */}
        <div className="relative bg-gradient-to-br from-blue-600 to-indigo-700 rounded-[1.5rem] p-6 text-white shadow-lg shadow-blue-600/20 overflow-hidden text-center">
          <div className="absolute top-[-20%] right-[-10%] w-32 h-32 bg-white/10 rounded-full blur-2xl pointer-events-none"></div>
          
          <p className="text-blue-100 text-sm font-medium mb-1">Total Tagihan</p>
          <h2 className="text-4xl font-black tracking-tight mb-4 drop-shadow-sm">
            {FORMAT_IDR(finalTotal)}
          </h2>
          
          {appliedVoucher && (
            <div className="inline-flex items-center gap-1.5 bg-white/20 backdrop-blur-md px-3 py-1.5 rounded-full text-xs font-bold text-white mb-4">
              <span>Promo {appliedVoucher.code}:</span>
              <span>-{FORMAT_IDR(getDiscountAmount())}</span>
            </div>
          )}
          
          <div className="inline-flex items-center gap-2 bg-black/20 backdrop-blur-sm px-4 py-2 rounded-full text-xs font-semibold">
            <Clock size={14} /> 
            <span>Selesaikan pembayaran Anda</span>
          </div>
        </div>

        {/* Promo Code Input Section */}
        <div className="bg-white dark:bg-slate-900 rounded-[1.5rem] shadow-sm border border-slate-100 dark:border-slate-800 p-5">
          <h3 className="font-bold text-sm text-slate-900 dark:text-white mb-3 uppercase tracking-wider">Kode Promo</h3>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Masukkan kode promo"
              value={promoCode}
              onChange={(e) => {
                setPromoCode(e.target.value.toUpperCase());
                setPromoError('');
              }}
              className="flex-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all dark:text-white placeholder-slate-400"
            />
            <button
              onClick={handleApplyPromo}
              className="px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm rounded-xl active:scale-95 transition-all"
            >
              Gunakan
            </button>
          </div>
          {promoError && <p className="text-xs text-red-500 mt-2">{promoError}</p>}
          {appliedVoucher && (
            <div className="mt-3 p-3 bg-green-50 dark:bg-green-500/10 rounded-lg border border-green-200 dark:border-green-900/50">
              <p className="text-xs font-semibold text-green-700 dark:text-green-400">✓ Promo {appliedVoucher.code} berhasil diterapkan</p>
            </div>
          )}
        </div>

        {/* Payment Methods */}
        <div>
          <h3 className="font-bold text-sm mb-3 ml-1 text-slate-900 dark:text-white uppercase tracking-wider">
            Pilih Pembayaran
          </h3>
          <div className="space-y-3">
            
            {/* Option: Cash */}
            <div 
              onClick={() => setMethod('cash')}
              className={`flex items-center justify-between p-4 rounded-[1.2rem] border-2 cursor-pointer transition-all ${
                method === 'cash' 
                  ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-500/10' 
                  : 'border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-200'
              }`}
            >
              <div className="flex items-center gap-4">
                <div className={`p-2.5 rounded-xl ${method === 'cash' ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/50 dark:text-blue-400' : 'bg-slate-100 text-slate-500 dark:bg-slate-800'}`}>
                  <Banknote size={24} strokeWidth={1.5} />
                </div>
                <div>
                  <h4 className={`font-bold text-sm ${method === 'cash' ? 'text-blue-700 dark:text-blue-400' : 'text-slate-900 dark:text-white'}`}>
                    Bayar di Kasir
                  </h4>
                  <p className="text-xs text-slate-500 mt-0.5">Bayar langsung ke petugas</p>
                </div>
              </div>
              {method === 'cash' ? (
                <CheckCircle2 className="text-blue-600 dark:text-blue-400" size={24} />
              ) : (
                <div className="w-6 h-6 rounded-full border-2 border-slate-200 dark:border-slate-700" />
              )}
            </div>

            {/* Other Options (Midtrans) */}
            {paymentMethods.map(pm => (
              <div 
                key={pm.id}
                onClick={() => setMethod(pm.category)}
                className={`flex items-center justify-between p-4 rounded-[1.2rem] border-2 cursor-pointer transition-all ${
                  method === pm.category 
                    ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-500/10' 
                    : 'border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-200'
                }`}
              >
                <div className="flex items-center gap-4">
                  <div className={`p-2.5 rounded-xl ${method === pm.category ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/50 dark:text-blue-400' : 'bg-slate-100 text-slate-500 dark:bg-slate-800'}`}>
                    <pm.icon size={24} strokeWidth={1.5} />
                  </div>
                  <div>
                    <h4 className={`font-bold text-sm ${method === pm.category ? 'text-blue-700 dark:text-blue-400' : 'text-slate-900 dark:text-white'}`}>
                      {pm.name}
                    </h4>
                    <p className="text-xs text-slate-500 mt-0.5">{pm.desc}</p>
                  </div>
                </div>
                {method === pm.category ? (
                  <CheckCircle2 className="text-blue-600 dark:text-blue-400" size={24} />
                ) : (
                  <div className="w-6 h-6 rounded-full border-2 border-slate-200 dark:border-slate-700" />
                )}
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* Fixed Bottom Action Bar */}
      <div className="fixed bottom-0 left-0 right-0 max-w-md mx-auto p-4 z-30" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 16px)' }}>
        <button 
          onClick={handlePay}
          disabled={processing || cart.length === 0}
          className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 disabled:text-slate-500 dark:disabled:bg-slate-800 dark:disabled:text-slate-600 text-white rounded-2xl py-4 font-bold text-base flex justify-center items-center gap-2 active:scale-[0.98] transition-all"
        >
          {processing ? (
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              <span>Memproses...</span>
            </div>
          ) : (
            <>
              <span>Lanjutkan Pembayaran</span>
              <ArrowRight size={20} strokeWidth={2.5} />
            </>
          )}
        </button>
      </div>

      <MidtransPaymentModal
        isOpen={midtransOpen}
        paymentType={method as any}
        amount={getPayAmount()}
        customerName={customerName || 'Customer Web'}
        orderId={pendingReceiptNumber || undefined}
        onSuccess={onMidtransSuccess}
        onPending={() => { setMidtransOpen(false); toast.info('Pembayaran pending / instruksi dikirim.'); }}
        onError={() => { setMidtransOpen(false); toast.error('Gagal membuka Gateway Pembayaran'); }}
        onClose={() => setMidtransOpen(false)}
      />

      <style dangerouslySetInnerHTML={{__html: `
        .custom-scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
      `}} />
    </div>
  );
}
