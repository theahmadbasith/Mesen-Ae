import React, { useState, useMemo, useEffect } from 'react';
import { ChevronLeft, Users, CreditCard, Banknote, CheckCircle2, ArrowRight } from 'lucide-react';
import { FORMAT_IDR, saveLocalTransactionId } from '@/lib/utils';
import { CartItem } from './CartView';
import { toast } from 'sonner';
import { MidtransPaymentModal, MidtransPaymentType } from '../../components/MidtransPaymentModal';
import { 
  createTransaction, createTransactionItems, updateProductStock, db, 
  fetchTransactionByReceiptNumber, appendPaymentToTransactionByReceipt 
} from '../../lib/db';
import { signalBus } from '@/lib/signal-bus';

interface Variant {
  name?: string;
  price: number;
}

interface SplitViewProps {
  setView: (view: string) => void;
  cart: CartItem[];
  totals: { total: number; subtotal: number };
  customerName?: string | null;
  setFinalOrderData: (data: any) => void;
  setCart: (cart: CartItem[]) => void;
  tableNumber?: string | number;
}

export default function SplitView({ setView, cart, totals, customerName, setFinalOrderData, setCart, tableNumber }: SplitViewProps) {
  const [step, setStep] = useState<'setup' | 'pay'>('setup');
  const [splitCount, setSplitCount] = useState<number>(2);
  const [isProcessing, setIsProcessing] = useState(false);
  
  const [receiptNumber, setReceiptNumber] = useState<string>('');
  const [txId, setTxId] = useState<string | number | null>(null);
  const [paidSplits, setPaidSplits] = useState<boolean[]>([]);
  
  // Simpan total ke state agar tidak jadi 0 saat cart dikosongkan
  const [fixedTotal, setFixedTotal] = useState<number>(totals.total);
  
  const [midtransOpen, setMidtransOpen] = useState(false);
  const [activeSplitIndex, setActiveSplitIndex] = useState<number | null>(null);

  // Update fixedTotal if totals.total changes while in setup
  useEffect(() => {
    if (step === 'setup' && totals.total > 0) {
      setFixedTotal(totals.total);
    }
  }, [totals.total, step]);

  const maxSplit = 2; // Hanya Non-Tunai yang diizinkan di Customer App
  const splitAmount = fixedTotal / splitCount;

  const handleCreateSplit = async () => {
    if (cart.length === 0) {
      toast.error('Keranjang kosong!');
      setView('cart');
      return;
    }
    
    setIsProcessing(true);
    try {
      const newReceipt = `TX${Date.now()}`;
      setReceiptNumber(newReceipt);
      
      const totalProfit = cart.reduce((sum, item) => sum + ((item.price - (item.hpp || 0)) * item.qty), 0);
      
      const txData: any = {
        subtotal: totals.subtotal > 0 ? totals.subtotal : fixedTotal,
        discount_type: null,
        discount_value: 0,
        discount_amount: 0,
        total: fixedTotal,
        payment_method_id: 0,
        payment_amount: 0,
        payments: [],
        change: 0,
        profit: totalProfit,
        date: new Date().toISOString(),
        receipt_number: newReceipt,
        status: 'belum lunas',
        kitchen_status: 'pending',
        customer_name: (customerName || 'Tamu').trim(),
        table_number: (tableNumber?.toString() || '').trim(),
        opened_at: new Date().toISOString(),
        remarks: `Split Bill (${splitCount}x) - Non-Tunai`
      };

      const createdId = await createTransaction(txData);
      if (!createdId) throw new Error('Gagal membuat transaksi');
      setTxId(createdId);
      saveLocalTransactionId(createdId);

      const itemRecords = cart.map(c => ({
        transaction_id: createdId,
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
        transaction: { ...txData, id: createdId },
        items: itemRecords,
        paymentMethodName: 'Split Bill'
      });

      signalBus.broadcast({
        type: 'TRANSACTION_STATUS_UPDATE',
        transactionId: createdId,
        kitchenStatus: txData.kitchen_status,
        status: txData.status,
        receiptNumber: newReceipt,
        timestamp: Date.now(),
      });

      setCart([]);
      setPaidSplits(new Array(splitCount).fill(false));
      setStep('pay');
      
    } catch (err: any) {
      console.error(err);
      toast.error('Gagal membuat Split Bill');
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePayClick = (index: number) => {
    setActiveSplitIndex(index);
    setMidtransOpen(true);
  };

  const onMidtransSuccess = async () => {
    setMidtransOpen(false);
    if (activeSplitIndex === null) return;
    
    setIsProcessing(true);
    try {
      await appendPaymentToTransactionByReceipt(receiptNumber, {
        method_id: 0,
        method_name: 'Midtrans (Split)',
        amount: splitAmount,
        date: new Date().toISOString()
      });
      
      const newPaidSplits = [...paidSplits];
      newPaidSplits[activeSplitIndex] = true;
      setPaidSplits(newPaidSplits);
      
      toast.success(`Tagihan ${activeSplitIndex + 1} Lunas!`);
      
      if (newPaidSplits.every(Boolean)) {
        signalBus.broadcast({
          type: 'TRANSACTION_STATUS_UPDATE',
          transactionId: txId,
          kitchenStatus: 'diproses',
          status: 'lunas',
          receiptNumber: receiptNumber,
          timestamp: Date.now(),
        });
        setView('success');
      }
    } catch (error) {
      console.error(error);
      toast.error('Gagal memverifikasi pembayaran split.');
    } finally {
      setIsProcessing(false);
      setActiveSplitIndex(null);
    }
  };

  const checkStatus = () => {
    if (paidSplits.every(Boolean)) setView('success');
    else setView('tracking');
  };

  return (
    <div className="flex-1 flex flex-col bg-slate-50 dark:bg-slate-950 min-h-screen">
      <div className="sticky top-0 z-20 bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl px-4 pt-6 pb-4 border-b border-slate-200/60 dark:border-slate-800/60 flex items-center shadow-[0_4px_20px_rgba(0,0,0,0.02)]">
        <button 
          onClick={() => step === 'pay' ? checkStatus() : setView('cart')} 
          className="w-11 h-11 flex items-center justify-center bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-full active:scale-95 transition-all shrink-0"
        >
          <ChevronLeft size={22} className="text-slate-700 dark:text-slate-300" />
        </button>
        <h1 className="flex-1 text-center font-bold text-lg text-slate-900 dark:text-white pr-11">
          {step === 'setup' ? 'Setup Split Bill' : 'Bayar Split Bill'}
        </h1>
      </div>

      <div className="flex-1 p-5 space-y-6 overflow-y-auto pb-[100px]">
        
        {step === 'setup' && (
          <>
            <div className="bg-gradient-to-br from-indigo-600 to-purple-700 rounded-[1.5rem] p-6 text-white text-center shadow-lg">
              <p className="text-indigo-100 text-sm mb-1">Total Tagihan Keseluruhan</p>
              <h2 className="text-4xl font-black tracking-tight">{FORMAT_IDR(fixedTotal)}</h2>
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-[1.5rem] p-5 border border-slate-100 dark:border-slate-800 shadow-sm space-y-5">
              
              <div className="bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 p-4 rounded-xl text-sm border border-blue-100 dark:border-blue-800">
                <p><strong>Catatan:</strong> Fitur Split Bill pada menu ini khusus untuk pembayaran <strong>Non-Tunai</strong> (maksimal 2 orang). Pembayaran otomatis akan ditagihkan ke masing-masing melalui Qris/E-Wallet.</p>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 block">Dibagi Berapa Orang?</label>
                <div className="flex items-center gap-4">
                  <button 
                    onClick={() => setSplitCount(Math.max(2, splitCount - 1))}
                    className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-xl font-bold text-slate-700 dark:text-slate-300 active:scale-95 transition-all"
                  >-</button>
                  <div className="flex-1 text-center text-3xl font-black text-slate-900 dark:text-white">{splitCount}</div>
                  <button 
                    onClick={() => setSplitCount(Math.min(maxSplit, splitCount + 1))}
                    className={`w-12 h-12 rounded-xl flex items-center justify-center text-xl font-bold active:scale-95 transition-all ${splitCount >= maxSplit ? 'bg-slate-100 text-slate-400' : 'bg-blue-100 text-blue-600'}`}
                    disabled={splitCount >= maxSplit}
                  >+</button>
                </div>
                <p className="text-center text-[10px] text-slate-400 mt-2">Maksimal {maxSplit} orang untuk metode Non-Tunai</p>
              </div>
              
              <div className="h-[1px] bg-slate-100 dark:bg-slate-800" />
              
              <div className="text-center bg-blue-50 dark:bg-blue-900/20 rounded-xl p-4">
                <p className="text-sm font-bold text-slate-600 dark:text-slate-400 mb-1">Masing-masing membayar:</p>
                <p className="text-2xl font-black text-blue-600 dark:text-blue-400">{FORMAT_IDR(splitAmount)}</p>
              </div>

              <button
                onClick={handleCreateSplit}
                disabled={isProcessing || fixedTotal <= 0}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl py-4 font-bold flex justify-center items-center gap-2 active:scale-95 transition-all"
              >
                {isProcessing ? 'Memproses...' : 'Buat Transaksi Split Bill'}
              </button>
            </div>
          </>
        )}

        {step === 'pay' && (
          <div className="space-y-4">
             <div className="bg-amber-50 dark:bg-amber-900/20 text-amber-800 dark:text-amber-400 p-4 rounded-xl border border-amber-200 dark:border-amber-800 text-sm font-medium text-center">
              Transaksi berhasil dibuat! Silakan bayar masing-masing tagihan di bawah ini.
            </div>

            {Array.from({ length: splitCount }).map((_, idx) => (
              <div key={idx} className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-100 dark:border-slate-800 shadow-sm flex items-center justify-between">
                <div>
                  <p className="text-sm font-bold text-slate-500 mb-1">Tagihan {idx + 1}</p>
                  <p className="text-xl font-black text-slate-900 dark:text-white">{FORMAT_IDR(splitAmount)}</p>
                </div>
                <div>
                  {paidSplits[idx] ? (
                    <div className="flex items-center gap-2 text-green-600 bg-green-50 px-3 py-2 rounded-lg font-bold text-sm">
                      <CheckCircle2 size={16} /> Lunas
                    </div>
                  ) : (
                    <button
                      onClick={() => handlePayClick(idx)}
                      disabled={isProcessing}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl font-bold text-sm active:scale-95 transition-all shadow-md shadow-blue-600/20"
                    >
                      Bayar
                    </button>
                  )}
                </div>
              </div>
            ))}


          </div>
        )}

      </div>
      
      <MidtransPaymentModal
        isOpen={midtransOpen}
        paymentType="lainnya" 
        amount={splitAmount}
        customerName={customerName || 'Customer Web'}
        orderId={activeSplitIndex !== null ? `${receiptNumber}-SPLIT${activeSplitIndex + 1}` : undefined}
        onSuccess={onMidtransSuccess}
        onPending={() => { setMidtransOpen(false); toast.info('Pembayaran diproses. Cek secara berkala.'); }}
        onError={() => { setMidtransOpen(false); toast.error('Pembayaran gagal'); }}
        onClose={() => setMidtransOpen(false)}
      />

    </div>
  );
}
