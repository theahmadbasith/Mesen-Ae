import React, { JSX, useState } from 'react';
import { 
  ShoppingCart, ChevronLeft, Plus, Minus, ChevronRight, 
  Trash2, Receipt, Image as ImageIcon, Ticket, Share2, ArrowRight
} from 'lucide-react';
import { 
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, 
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle 
} from '@/components/ui/alert-dialog';

import { FORMAT_IDR } from '@/lib/utils';

// ==========================================
// Tipe Data & Interfaces (TypeScript)
// ==========================================

export interface SelectedVariant {
  optionName: string;
  price: number;
  [key: string]: any;
}

export interface CartItem {
  cartId: string | number;
  name: string;
  price: number;
  qty: number;
  photo?: string;
  notes?: string;
  selectedVariants?: SelectedVariant[];
  [key: string]: any;
}

export interface BillTotals {
  subtotal: number;
  tax: number;
  service: number;
  total: number;
}

export interface CartViewProps {
  setView: (view: string) => void;
  cart: CartItem[];
  updateCartQty: (cartId: string | number, delta: number) => void;
  totals: BillTotals;
  setCart: React.Dispatch<React.SetStateAction<CartItem[]>> | ((cart: CartItem[]) => void);
}

export default function CartView({ 
  setView, 
  cart, 
  updateCartQty, 
  totals, 
  setCart 
}: CartViewProps): JSX.Element {
  
  const [clearConfirmOpen, setClearConfirmOpen] = useState(false);
  
  const clearCart = (): void => {
    setClearConfirmOpen(true);
  };

  // Tampilan Jika Keranjang Kosong
  if (cart.length === 0) {
    return (
      <div className="flex-1 flex flex-col bg-slate-50 dark:bg-slate-950 min-h-screen">
        <div className="p-4 pt-6 flex items-center">
          <button 
            onClick={() => setView('landing')} 
            className="w-11 h-11 flex items-center justify-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-full active:scale-95 transition-all shadow-sm"
          >
            <ChevronLeft size={22} className="text-slate-700 dark:text-slate-300" />
          </button>
          <h1 className="flex-1 text-center font-bold text-lg text-slate-900 dark:text-white pr-11">
            Keranjang
          </h1>
        </div>
        
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center mt-[-10vh]">
          <div className="w-28 h-28 bg-blue-50 dark:bg-slate-800/50 rounded-full flex items-center justify-center mb-6 shadow-inner border-4 border-white dark:border-slate-900">
            <ShoppingCart size={48} strokeWidth={1.5} className="text-blue-500 dark:text-slate-400" />
          </div>
          <h2 className="text-xl font-extrabold text-slate-900 dark:text-white mb-2">Keranjang Masih Kosong</h2>
          <p className="text-slate-500 dark:text-slate-400 text-sm max-w-[260px] mx-auto mb-8 leading-relaxed">
            Sepertinya Anda belum memilih apapun. Yuk, jelajahi katalog kami dan temukan yang Anda suka!
          </p>
          <button 
            onClick={() => setView('menu')} 
            className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3.5 rounded-full font-bold shadow-lg shadow-blue-600/20 active:scale-95 transition-all flex items-center gap-2"
          >
            <ShoppingCart size={18} />
            Mulai Belanja
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-slate-50 dark:bg-slate-950 min-h-screen">
      
      {/* Sticky Header */}
      <div className="sticky top-0 z-20 bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl px-4 pt-6 pb-4 border-b border-slate-200/60 dark:border-slate-800/60 flex items-center justify-between shadow-[0_4px_20px_rgba(0,0,0,0.02)]">
        <button 
          onClick={() => setView('menu')} 
          className="w-11 h-11 flex items-center justify-center bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-full active:scale-95 transition-all shrink-0"
        >
          <ChevronLeft size={22} className="text-slate-700 dark:text-slate-300" />
        </button>
        
        <h1 className="font-bold text-lg text-slate-900 dark:text-white">
          Pesanan Anda
        </h1>
        
        <button 
          onClick={clearCart} 
          className="w-11 h-11 flex items-center justify-center text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-full active:scale-95 transition-all shrink-0"
          aria-label="Kosongkan keranjang"
        >
          <Trash2 size={20} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 pb-[140px] space-y-6 custom-scrollbar-hide">
        
        {/* Cart Items Card */}
        <div className="bg-white dark:bg-slate-900 rounded-[1.5rem] p-5 shadow-sm border border-slate-100 dark:border-slate-800">
          <div className="space-y-5">
            {cart.map((item, index) => {
              // Pengetikan eksplisit pada fungsi reduce untuk menghindari implisit 'any'
              const variantTotal = item.selectedVariants?.reduce((s: number, a: SelectedVariant) => s + a.price, 0) || 0;
              const itemTotal = (item.price + variantTotal) * item.qty;

              return (
                <div key={item.cartId}>
                  <div className="flex gap-4">
                    {/* Item Image */}
                    <div className="w-20 h-20 rounded-[1.2rem] overflow-hidden bg-slate-100 dark:bg-slate-800 shrink-0 flex items-center justify-center border border-slate-50 dark:border-slate-700">
                      {item.photo ? (
                        <img src={item.photo} alt={item.name} className="w-full h-full object-cover" />
                      ) : (
                        <ImageIcon size={28} className="text-slate-300 dark:text-slate-600" />
                      )}
                    </div>
                    
                    {/* Item Info */}
                    <div className="flex-1 flex flex-col justify-between py-0.5">
                      <div>
                        <h3 className="font-bold text-sm text-slate-900 dark:text-white leading-snug line-clamp-2 mb-1">
                          {item.name}
                        </h3>
                        
                        {/* Variants */}
                        {item.selectedVariants && item.selectedVariants.length > 0 && (
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 mb-1 leading-tight">
                            {item.selectedVariants.map((a) => a.optionName).join(', ')}
                          </p>
                        )}
                        
                        {/* Notes */}
                        {item.notes && (
                          <p className="text-[10px] font-semibold text-amber-700 bg-amber-50 dark:bg-amber-900/20 dark:text-amber-400 px-2 py-1 rounded-md inline-block mt-0.5">
                            Catatan: {item.notes}
                          </p>
                        )}
                      </div>
                      
                      {/* Price & Quantity Control */}
                      <div className="flex justify-between items-end mt-2">
                        <p className="font-extrabold text-blue-600 dark:text-blue-400 text-sm">
                          {FORMAT_IDR(itemTotal)}
                        </p>
                        
                        <div className="flex items-center bg-slate-50 dark:bg-slate-800 rounded-full border border-slate-200 dark:border-slate-700 p-0.5 shadow-sm">
                          <button 
                            onClick={() => updateCartQty(item.cartId, -1)} 
                            className="w-7 h-7 rounded-full bg-white dark:bg-slate-700 flex items-center justify-center text-slate-600 dark:text-slate-300 active:scale-95 transition-transform shadow-sm"
                          >
                            <Minus size={14} strokeWidth={2.5} />
                          </button>
                          <span className="text-xs font-bold w-7 text-center text-slate-900 dark:text-white">
                            {item.qty}
                          </span>
                          <button 
                            onClick={() => updateCartQty(item.cartId, 1)} 
                            className="w-7 h-7 rounded-full bg-blue-600 text-white flex items-center justify-center active:scale-95 transition-transform shadow-sm shadow-blue-600/20"
                          >
                            <Plus size={14} strokeWidth={2.5} />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Divider except for last item */}
                  {index < cart.length - 1 && (
                    <div className="h-[1px] bg-slate-100 dark:bg-slate-800 mt-5" />
                  )}
                </div>
              );
            })}
          </div>

          {/* Add More Button */}
          <button 
            onClick={() => setView('menu')} 
            className="w-full mt-5 py-3.5 text-sm font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-500/10 hover:bg-blue-100 dark:hover:bg-blue-500/20 rounded-[1.2rem] flex justify-center items-center transition-colors border border-blue-100 dark:border-blue-900/50"
          >
            <Plus size={18} className="mr-2" strokeWidth={2.5} /> 
            Tambah Produk Lain
          </button>
        </div>

        {/* Action List (Split Bill) */}
        <div className="bg-white dark:bg-slate-900 rounded-[1.5rem] border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden">
          <button 
            onClick={() => setView('split')} 
            className="w-full p-4 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/50 active:bg-slate-100 transition-colors"
          >
            <div className="flex items-center gap-3.5">
              <div className="bg-indigo-50 dark:bg-indigo-500/10 p-2.5 rounded-xl text-indigo-600 dark:text-indigo-400">
                <Share2 size={20} strokeWidth={2} />
              </div>
              <div className="text-left">
                <p className="font-semibold text-slate-700 dark:text-slate-200 text-sm">Split Bill</p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">Pisahkan tagihan pesanan Anda</p>
              </div>
            </div>
            <ChevronRight size={18} className="text-slate-400" />
          </button>
        </div>

        {/* Payment Summary */}
        <div className="bg-white dark:bg-slate-900 rounded-[1.5rem] p-5 shadow-sm border border-slate-100 dark:border-slate-800">
          <h3 className="font-bold text-sm mb-4 text-slate-900 dark:text-white flex items-center gap-2">
            <Receipt size={16} className="text-slate-500" />
            Ringkasan Tagihan
          </h3>
          
          <div className="space-y-2.5">
            <div className="flex justify-between text-sm text-slate-500 dark:text-slate-400">
              <span>Subtotal</span>
              <span className="font-medium text-slate-700 dark:text-slate-300">{FORMAT_IDR(totals.subtotal)}</span>
            </div>
            
            {totals.tax > 0 && (
              <div className="flex justify-between text-sm text-slate-500 dark:text-slate-400">
                <span>Pajak</span>
                <span className="font-medium text-slate-700 dark:text-slate-300">{FORMAT_IDR(totals.tax)}</span>
              </div>
            )}
            
            {totals.service > 0 && (
              <div className="flex justify-between text-sm text-slate-500 dark:text-slate-400">
                <span>Service Charge</span>
                <span className="font-medium text-slate-700 dark:text-slate-300">{FORMAT_IDR(totals.service)}</span>
              </div>
            )}
          </div>

          <div className="mt-4 pt-4 border-t border-dashed border-slate-200 dark:border-slate-700 flex justify-between items-end">
            <span className="font-bold text-slate-900 dark:text-white">Total Bayar</span>
            <span className="text-xl text-blue-600 dark:text-blue-400 font-black">
              {FORMAT_IDR(totals.total)}
            </span>
          </div>
        </div>
      </div>

      {/* Fixed Bottom Action Bar */}
      <div className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 p-4 z-30 shadow-[0_-10px_30px_rgba(0,0,0,0.05)]" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 16px)' }}>
        <button 
          onClick={() => setView('checkout')}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-2xl py-4 font-bold text-base shadow-lg shadow-blue-600/20 flex justify-center items-center gap-2 active:scale-[0.98] transition-all"
        >
          Lanjut Pembayaran
          <ArrowRight size={20} strokeWidth={2.5} />
        </button>
      </div>

      <AlertDialog open={clearConfirmOpen} onOpenChange={setClearConfirmOpen}>
        <AlertDialogContent className="max-w-[400px] w-[95vw] rounded-2xl p-6">
          <AlertDialogHeader>
            <div className="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center mb-2 mx-auto">
              <Trash2 className="w-6 h-6 text-destructive" />
            </div>
            <AlertDialogTitle className="text-center text-xl font-extrabold">Hapus Keranjang?</AlertDialogTitle>
            <AlertDialogDescription className="text-center">
              Semua item pesanan yang ada di keranjang Anda akan dihapus.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-6 sm:justify-center flex-row gap-3">
            <AlertDialogCancel className="flex-1 mt-0 rounded-xl h-11 font-bold">Batal</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => { setCart([]); setClearConfirmOpen(false); }} 
              className="flex-1 rounded-xl h-11 font-bold bg-destructive hover:bg-destructive/90 text-white shadow-md shadow-destructive/20"
            >
              Ya, Hapus
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <style dangerouslySetInnerHTML={{__html: `
        .custom-scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
      `}} />
    </div>
  );
}
