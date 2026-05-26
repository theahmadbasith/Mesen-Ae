/**
 * PrintActionModal — Modal pilihan cetak yang muncul di seluruh aplikasi.
 * Menampilkan tombol-tombol cetak yang tersedia tergantung konteks:
 * - Struk Pelanggan (jika `showCustomerReceipt = true`)
 * - Struk Dapur (jika `showKitchenReceipt = true`)
 * - Label Varian (jika ada item yang punya varian)
 *
 * Setelah user memilih, modal ini menutup diri dan memanggil callback yang sesuai.
 */
import { useState } from 'react';
import { FileText, ChefHat, Tag, X, Printer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import type { Transaction, TransactionItemRecord, StoreSettings } from '@/hooks/db-hooks';

// Import komponen struk yang ada
import Receipt from '@/components/Receipt';
import KitchenReceiptModal from '@/kitchen/components/KitchenReceiptModal';
import VariantLabelModal from '@/components/VariantLabelModal';

interface PrintActionModalProps {
  open: boolean;
  onClose: () => void;
  transaction: Transaction;
  items: TransactionItemRecord[];
  storeSettings?: StoreSettings;
  paymentMethodName?: string;
  /** Tampilkan tombol struk pelanggan */
  showCustomerReceipt?: boolean;
  /** Tampilkan tombol struk dapur */
  showKitchenReceipt?: boolean;
}

export default function PrintActionModal({
  open,
  onClose,
  transaction,
  items,
  storeSettings,
  paymentMethodName = 'Tunai',
  showCustomerReceipt = false,
  showKitchenReceipt = true,
}: PrintActionModalProps) {
  const [openCustomer, setOpenCustomer] = useState(false);
  const [openKitchen, setOpenKitchen] = useState(false);
  const [openVariant, setOpenVariant] = useState(false);

  const hasVariants = items.some(
    (it) => it.selectedVariants && it.selectedVariants.length > 0
  );
  const variantCount = items.filter(
    (it) => it.selectedVariants && it.selectedVariants.length > 0
  ).length;

  return (
    <>
      {/* Modal Pilihan Cetak */}
      <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
        <DialogContent className="max-w-xs w-[90vw] rounded-3xl p-0 bg-zinc-950 border border-zinc-800 shadow-[0_10px_50px_rgba(0,0,0,0.6)] overflow-hidden">
          {/* Header */}
          <DialogHeader className="px-6 pt-6 pb-4 border-b border-zinc-800/80">
            <DialogTitle className="text-center text-white flex items-center justify-center gap-2 text-lg font-black tracking-tight">
              <Printer className="w-5 h-5 text-zinc-400" />
              Pilih Cetak
            </DialogTitle>
            <p className="text-center text-xs text-zinc-500 font-medium mt-1">
              {transaction.receiptNumber}
              {transaction.tableNumber ? ` · Meja ${transaction.tableNumber}` : ' · Bawa Pulang'}
            </p>
          </DialogHeader>

          {/* Pilihan Tombol */}
          <div className="p-5 space-y-3">
            {/* Struk Pelanggan */}
            {showCustomerReceipt && (
              <button
                onClick={() => { onClose(); setOpenCustomer(true); }}
                className="w-full flex items-center gap-4 p-4 rounded-2xl bg-zinc-900 border border-zinc-800 hover:border-blue-500/50 hover:bg-zinc-800/80 transition-all group text-left"
              >
                <div className="w-10 h-10 rounded-xl bg-blue-500/15 border border-blue-500/20 flex items-center justify-center shrink-0 group-hover:bg-blue-500/25 transition-colors">
                  <FileText className="w-5 h-5 text-blue-400" />
                </div>
                <div>
                  <p className="font-bold text-white text-sm">Struk Pelanggan</p>
                  <p className="text-xs text-zinc-500 mt-0.5">Struk pembayaran lengkap</p>
                </div>
              </button>
            )}

            {/* Struk Dapur */}
            {showKitchenReceipt && (
              <button
                onClick={() => { onClose(); setOpenKitchen(true); }}
                className="w-full flex items-center gap-4 p-4 rounded-2xl bg-zinc-900 border border-zinc-800 hover:border-orange-500/50 hover:bg-zinc-800/80 transition-all group text-left"
              >
                <div className="w-10 h-10 rounded-xl bg-orange-500/15 border border-orange-500/20 flex items-center justify-center shrink-0 group-hover:bg-orange-500/25 transition-colors">
                  <ChefHat className="w-5 h-5 text-orange-400" />
                </div>
                <div>
                  <p className="font-bold text-white text-sm">Struk Dapur</p>
                  <p className="text-xs text-zinc-500 mt-0.5">Tiket untuk barista / koki</p>
                </div>
              </button>
            )}

            {/* Label Varian */}
            {hasVariants && (
              <button
                onClick={() => { onClose(); setOpenVariant(true); }}
                className="w-full flex items-center gap-4 p-4 rounded-2xl bg-zinc-900 border border-zinc-800 hover:border-amber-500/50 hover:bg-zinc-800/80 transition-all group text-left"
              >
                <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/20 flex items-center justify-center shrink-0 group-hover:bg-amber-500/25 transition-colors">
                  <Tag className="w-5 h-5 text-amber-400" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-bold text-white text-sm">Label Varian</p>
                    <Badge className="bg-amber-500/20 text-amber-300 border-amber-500/20 text-[10px] px-1.5">
                      {variantCount} Item
                    </Badge>
                  </div>
                  <p className="text-xs text-zinc-500 mt-0.5">Label stiker per produk varian</p>
                </div>
              </button>
            )}

            {/* Tutup */}
            <button
              onClick={onClose}
              className="w-full flex items-center justify-center gap-2 p-3 rounded-2xl text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900 transition-all text-sm font-medium mt-1"
            >
              <X className="w-4 h-4" />
              Tutup
            </button>
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
