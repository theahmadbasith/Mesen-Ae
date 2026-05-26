/**
 * PaymentSuccessModal — Muncul di Pesanan Aktif setelah pembayaran berhasil.
 * Menampilkan animasi sukses + tombol-tombol cetak yang tersedia.
 */
import { useState } from 'react';
import { CheckCircle2, FileText, ChefHat, Tag, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import type { Transaction, TransactionItemRecord, StoreSettings } from '@/hooks/db-hooks';

import Receipt from '@/components/Receipt';
import KitchenReceiptModal from '@/kitchen/components/KitchenReceiptModal';
import VariantLabelModal from '@/components/VariantLabelModal';

interface PaymentSuccessModalProps {
  open: boolean;
  onClose: () => void;
  transaction: Transaction;
  items: TransactionItemRecord[];
  storeSettings?: StoreSettings;
  paymentMethodName?: string;
  /** Apakah pesanan masuk ke dapur? */
  needsKitchen?: boolean;
}

export default function PaymentSuccessModal({
  open,
  onClose,
  transaction,
  items,
  storeSettings,
  paymentMethodName = 'Tunai',
  needsKitchen = true,
}: PaymentSuccessModalProps) {
  const [openCustomer, setOpenCustomer] = useState(false);
  const [openKitchen, setOpenKitchen] = useState(false);
  const [openVariant, setOpenVariant] = useState(false);

  const hasVariants = items.some(
    (it) => it.selectedVariants && it.selectedVariants.length > 0
  );
  const variantCount = items.filter(
    (it) => it.selectedVariants && it.selectedVariants.length > 0
  ).length;

  const rp = (n: number) => `Rp ${(Number(n) || 0).toLocaleString('id-ID')}`;

  return (
    <>
      {/* Modal Sukses Pembayaran */}
      <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
        <DialogContent className="max-w-sm w-[92vw] rounded-3xl p-0 bg-zinc-950 border border-zinc-800 shadow-[0_10px_50px_rgba(0,0,0,0.7)] overflow-hidden">

          {/* Hero Section */}
          <div className="px-6 pt-8 pb-6 flex flex-col items-center text-center border-b border-zinc-800/80">
            {/* Ikon sukses animasi */}
            <div className="relative mb-4">
              <div className="w-20 h-20 rounded-full bg-emerald-500/15 border-2 border-emerald-500/30 flex items-center justify-center animate-in zoom-in duration-500">
                <CheckCircle2 className="w-10 h-10 text-emerald-400" strokeWidth={2} />
              </div>
              {/* Ping animation */}
              <div className="absolute inset-0 rounded-full bg-emerald-500/10 animate-ping" style={{ animationDuration: '2s' }} />
            </div>

            <h2 className="text-2xl font-black text-white tracking-tight mb-1">
              Pembayaran Berhasil!
            </h2>
            <p className="text-zinc-400 text-sm font-medium mb-4">
              {transaction.receiptNumber}
            </p>

            {/* Info ringkas */}
            <div className="w-full bg-zinc-900 rounded-2xl border border-zinc-800 divide-y divide-zinc-800/80">
              <div className="flex justify-between items-center px-4 py-3">
                <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Total</span>
                <span className="font-black text-white text-base">{rp(transaction.total)}</span>
              </div>
              <div className="flex justify-between items-center px-4 py-3">
                <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Metode</span>
                <span className="font-bold text-zinc-200 text-sm">{paymentMethodName}</span>
              </div>
              {transaction.tableNumber && (
                <div className="flex justify-between items-center px-4 py-3">
                  <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Meja</span>
                  <span className="font-black text-white text-sm">{transaction.tableNumber}</span>
                </div>
              )}
              {!transaction.tableNumber && (
                <div className="flex justify-between items-center px-4 py-3">
                  <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Tipe</span>
                  <span className="font-bold text-zinc-200 text-sm">Bawa Pulang</span>
                </div>
              )}
            </div>
          </div>

          {/* Tombol-tombol Cetak */}
          <div className="p-5 space-y-2.5">
            <p className="text-[11px] font-bold text-zinc-600 uppercase tracking-widest text-center mb-3">
              Pilihan Cetak
            </p>

            {/* Struk Pelanggan */}
            <button
              onClick={() => { onClose(); setOpenCustomer(true); }}
              className="w-full flex items-center gap-4 p-3.5 rounded-2xl bg-zinc-900 border border-zinc-800 hover:border-blue-500/50 hover:bg-zinc-800/80 transition-all group text-left"
            >
              <div className="w-9 h-9 rounded-xl bg-blue-500/15 border border-blue-500/20 flex items-center justify-center shrink-0 group-hover:bg-blue-500/25 transition-colors">
                <FileText className="w-4 h-4 text-blue-400" />
              </div>
              <div>
                <p className="font-bold text-white text-sm">Struk Pelanggan</p>
                <p className="text-[11px] text-zinc-500 mt-0.5">Struk pembayaran lengkap</p>
              </div>
            </button>

            {/* Struk Dapur */}
            {needsKitchen && (
              <button
                onClick={() => { onClose(); setOpenKitchen(true); }}
                className="w-full flex items-center gap-4 p-3.5 rounded-2xl bg-zinc-900 border border-zinc-800 hover:border-orange-500/50 hover:bg-zinc-800/80 transition-all group text-left"
              >
                <div className="w-9 h-9 rounded-xl bg-orange-500/15 border border-orange-500/20 flex items-center justify-center shrink-0 group-hover:bg-orange-500/25 transition-colors">
                  <ChefHat className="w-4 h-4 text-orange-400" />
                </div>
                <div>
                  <p className="font-bold text-white text-sm">Struk Dapur</p>
                  <p className="text-[11px] text-zinc-500 mt-0.5">Tiket untuk barista / koki</p>
                </div>
              </button>
            )}

            {/* Label Varian */}
            {hasVariants && (
              <button
                onClick={() => { onClose(); setOpenVariant(true); }}
                className="w-full flex items-center gap-4 p-3.5 rounded-2xl bg-zinc-900 border border-zinc-800 hover:border-amber-500/50 hover:bg-zinc-800/80 transition-all group text-left"
              >
                <div className="w-9 h-9 rounded-xl bg-amber-500/15 border border-amber-500/20 flex items-center justify-center shrink-0 group-hover:bg-amber-500/25 transition-colors">
                  <Tag className="w-4 h-4 text-amber-400" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-bold text-white text-sm">Label Varian</p>
                    <Badge className="bg-amber-500/20 text-amber-300 border-amber-500/20 text-[10px] px-1.5">
                      {variantCount} Item
                    </Badge>
                  </div>
                  <p className="text-[11px] text-zinc-500 mt-0.5">Label stiker per produk varian</p>
                </div>
              </button>
            )}

            {/* Tutup */}
            <Button
              variant="ghost"
              className="w-full mt-2 rounded-2xl py-5 font-bold text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900 flex items-center gap-2"
              onClick={onClose}
            >
              <X className="w-4 h-4" />
              Selesai
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal Struk Pelanggan */}
      {openCustomer && (
        <Receipt
          open={openCustomer}
          onClose={() => setOpenCustomer(false)}
          transaction={transaction}
          items={items}
          storeSettings={storeSettings}
          paymentMethodName={paymentMethodName}
        />
      )}

      {/* Modal Struk Dapur */}
      {openKitchen && (
        <KitchenReceiptModal
          open={openKitchen}
          onClose={() => setOpenKitchen(false)}
          transaction={transaction}
          items={items}
          storeSettings={storeSettings}
          onOpenVariantLabels={
            hasVariants
              ? () => { setOpenKitchen(false); setOpenVariant(true); }
              : undefined
          }
        />
      )}

      {/* Modal Label Varian */}
      {openVariant && (
        <VariantLabelModal
          open={openVariant}
          onClose={() => setOpenVariant(false)}
          items={items}
          transaction={transaction}
          storeSettings={storeSettings}
        />
      )}
    </>
  );
}
