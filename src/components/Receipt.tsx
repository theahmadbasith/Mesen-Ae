import { useRef, useState } from 'react';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import html2canvas from 'html2canvas';
import { Download, Share2, Printer, Loader2, CheckCircle2, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import type { Transaction, StoreSettings, TransactionItemRecord } from '@/hooks/db-hooks';

interface ReceiptProps {
  open: boolean;
  onClose: () => void;
  transaction: Transaction;
  items: TransactionItemRecord[];
  storeSettings: StoreSettings | undefined;
  paymentMethodName: string;
}

export default function Receipt({ open, onClose, transaction, items, storeSettings, paymentMethodName }: ReceiptProps) {
  const receiptRef = useRef<HTMLDivElement>(null);
  const [generating, setGenerating] = useState<boolean>(false);
  const [printing, setPrinting] = useState<boolean>(false);

  if (!transaction) return null;

  const isPaidTx = transaction.status === 'lunas' || transaction.status === 'completed';

  // Normalisasi data untuk menghindari error camelCase vs snake_case
  const txDiscountAmount = transaction.discountAmount ?? (transaction as any).discount_amount ?? 0;
  const txPaymentAmount = transaction.paymentAmount ?? (transaction as any).payment_amount ?? 0;
  const rp = (n: number) => `Rp ${n.toLocaleString('id-ID')}`;

  const captureReceipt = async (): Promise<HTMLCanvasElement | null> => {
    if (!receiptRef.current) return null;
    setGenerating(true);
    try {
      const canvas = await html2canvas(receiptRef.current, {
        backgroundColor: null, // Transparan agar efek shadow/gerigi tetap bagus jika diperlukan
        scale: 3, // Kualitas resolusi lebih tinggi
        useCORS: true,
        logging: false,
      });
      return canvas;
    } catch {
      toast.error('Gagal membuat gambar struk');
      return null;
    } finally {
      setGenerating(false);
    }
  };

  const handleDownload = async () => {
    const canvas = await captureReceipt();
    if (!canvas) return;
    const link = document.createElement('a');
    link.download = `Struk_${transaction.receiptNumber}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
    toast.success('Struk berhasil diunduh');
  };

  const handleShare = async () => {
    const canvas = await captureReceipt();
    if (!canvas) return;

    try {
      const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/png'));
      if (!blob) return;

      if (navigator.share) {
        const file = new File([blob], `Struk_${transaction.receiptNumber}.png`, { type: 'image/png' });
        await navigator.share({
          title: `Struk Pembayaran - ${transaction.receiptNumber}`,
          text: `Terima kasih! Berikut adalah struk pembayaran Anda dari ${storeSettings?.storeName || 'Toko'}.`,
          files: [file],
        });
      } else {
        // Fallback WhatsApp
        const text = encodeURIComponent(
          `*${storeSettings?.storeName || 'Toko'}*\n` +
          `No. Struk: ${transaction.receiptNumber}\n` +
          `Total: ${rp(transaction.total)}\n` +
          `Tanggal: ${format(new Date(transaction.date), 'dd MMM yyyy HH:mm', { locale: id })}`
        );
        window.open(`https://wa.me/?text=${text}`, '_blank');
      }
    } catch (err: unknown) {
      if (err instanceof Error && err.name !== 'AbortError') {
        toast.error('Gagal membagikan struk');
      }
    }
  };

  const handleBluetoothPrint = async () => {
    if (!('bluetooth' in navigator)) {
      toast.error('Bluetooth tidak tersedia di browser ini. Gunakan Chrome di Android.');
      return;
    }

    setPrinting(true);
    try {
      toast.info('Mencari printer Bluetooth...');
      // @ts-expect-error Web Bluetooth API is not fully typed
      const device = await navigator.bluetooth.requestDevice({
        filters: [{ services: ['000018f0-0000-1000-8000-00805f9b34fb'] }],
        optionalServices: ['000018f0-0000-1000-8000-00805f9b34fb'],
      });

      const server = await device.gatt.connect();
      const service = await server.getPrimaryService('000018f0-0000-1000-8000-00805f9b34fb');
      const characteristic = await service.getCharacteristic('00002af1-0000-1000-8000-00805f9b34fb');

      // ESC/POS Formatter
      const encoder = new TextEncoder();
      const lines: string[] = [];

      lines.push('\x1B\x40'); // Initialize printer
      lines.push('\x1B\x61\x01'); // Center align
      lines.push('\x1B\x45\x01'); // Bold ON
      lines.push(`${storeSettings?.storeName || 'Toko'}\n`);
      lines.push('\x1B\x45\x00'); // Bold OFF
      
      if (storeSettings?.address) lines.push(`${storeSettings.address}\n`);
      if (storeSettings?.phone) lines.push(`${storeSettings.phone}\n`);
      
      lines.push('--------------------------------\n');
      lines.push(`No: ${transaction.receiptNumber}\n`);
      lines.push(`${format(new Date(transaction.date), 'dd/MM/yyyy HH:mm')}\n`);
      if (transaction.customerName) lines.push(`Pelanggan: ${transaction.customerName}\n`);
      lines.push('--------------------------------\n');

      lines.push('\x1B\x61\x00'); // Left align
      for (const item of items) {
        lines.push(`${item.productName}\n`);
        if (item.selectedVariants && item.selectedVariants.length > 0) {
          lines.push(`  + ${item.selectedVariants.map(v => v.optionName).join(', ')}\n`);
        }
        if (item.notes) lines.push(`  Catatan: ${item.notes}\n`);
        lines.push(`  ${item.quantity} x ${rp(item.price)}  ${rp(item.subtotal)}\n`);
      }

      lines.push('--------------------------------\n');
      lines.push(`Subtotal:  ${rp(transaction.subtotal)}\n`);
      if (txDiscountAmount > 0) {
        lines.push(`Diskon:   -${rp(txDiscountAmount)}\n`);
      }
      
      lines.push('\x1B\x45\x01'); // Bold ON for Total
      lines.push(`TOTAL:     ${rp(transaction.total)}\n`);
      lines.push('\x1B\x45\x00'); // Bold OFF
      
      const paymentsList = (transaction.payments || []) as any[];
      if (paymentsList.length > 0) {
        lines.push('--------------------------------\n');
        lines.push('Rincian Pembayaran:\n');
        paymentsList.forEach(p => {
          const methodName = p.method_name || p.methodName || 'Pembayaran';
          lines.push(`${methodName}: ${rp(p.amount)}\n`);
        });
      } else {
        lines.push(`Bayar:     ${rp(txPaymentAmount)}\n`);
      }
      lines.push(`Kembali:   ${rp(transaction.change)}\n`);
      lines.push('--------------------------------\n');
      
      lines.push('\x1B\x61\x01'); // Center align
      lines.push(`${storeSettings?.receiptFooter || 'Terima kasih!'}\n\n\n`);

      const data = encoder.encode(lines.join(''));

      // Send in chunks of 100 bytes to avoid buffer overflow
      for (let i = 0; i < data.length; i += 100) {
        const chunk = data.slice(i, i + 100);
        await characteristic.writeValue(chunk);
      }

      toast.success('Struk berhasil dicetak!');
      await server.disconnect();
    } catch (err: unknown) {
      if (err instanceof Error && err.name !== 'NotFoundError') {
        toast.error('Gagal mencetak. Pastikan printer Bluetooth menyala.');
      }
    } finally {
      setPrinting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-md md:max-w-xl w-[95vw] max-h-[90vh] overflow-y-auto rounded-3xl p-6 bg-background border border-border shadow-2xl flex flex-col">
        <DialogHeader className="mb-4">
          <DialogTitle className="text-center text-foreground flex items-center justify-center gap-2">
            {isPaidTx ? (
              <>
                <CheckCircle2 className="text-emerald-500 w-6 h-6" />
                Pembayaran Berhasil
              </>
            ) : (
              <>
                <Clock className="text-amber-500 w-6 h-6 animate-pulse" />
                Detail Tagihan
              </>
            )}
          </DialogTitle>
        </DialogHeader>

        {/* Kertas Struk dengan Efek Visual */}
        <div className="relative mx-auto bg-white text-black p-6 shadow-lg w-full max-w-[340px] mb-6 overflow-hidden flex-shrink-0" 
             style={{ 
               fontFamily: "'Courier New', Courier, monospace", 
               fontSize: '12px',
               clipPath: 'polygon(0 0, 100% 0, 100% calc(100% - 6px), 98% 100%, 96% calc(100% - 6px), 94% 100%, 92% calc(100% - 6px), 90% 100%, 88% calc(100% - 6px), 86% 100%, 84% calc(100% - 6px), 82% 100%, 80% calc(100% - 6px), 78% 100%, 76% calc(100% - 6px), 74% 100%, 72% calc(100% - 6px), 70% 100%, 68% calc(100% - 6px), 66% 100%, 64% calc(100% - 6px), 62% 100%, 60% calc(100% - 6px), 58% 100%, 56% calc(100% - 6px), 54% 100%, 52% calc(100% - 6px), 50% 100%, 48% calc(100% - 6px), 46% 100%, 44% calc(100% - 6px), 42% 100%, 40% calc(100% - 6px), 38% 100%, 36% calc(100% - 6px), 34% 100%, 32% calc(100% - 6px), 30% 100%, 28% calc(100% - 6px), 26% 100%, 24% calc(100% - 6px), 22% 100%, 20% calc(100% - 6px), 18% 100%, 16% calc(100% - 6px), 14% 100%, 12% calc(100% - 6px), 10% 100%, 8% calc(100% - 6px), 6% 100%, 4% calc(100% - 6px), 2% 100%, 0 calc(100% - 6px))'
             }}>
          
          <div ref={receiptRef} className="relative z-10 bg-white">


            {/* Header Toko */}
            <div className="text-center mb-4 relative z-10">
              {storeSettings?.logo && (
                <img src={storeSettings.logo} alt="Logo" className="w-16 h-16 object-contain mx-auto mb-2 grayscale" />
              )}
              <h2 className="font-bold text-base uppercase tracking-wider">{storeSettings?.storeName || 'Toko'}</h2>
              {storeSettings?.address && <p className="text-[10px] mt-1">{storeSettings.address}</p>}
              {storeSettings?.phone && <p className="text-[10px]">{storeSettings.phone}</p>}
            </div>

            <div className="border-t-[1.5px] border-dashed border-border/50 my-3" />

            {/* Info Transaksi */}
            <div className="flex justify-between text-[10px] relative z-10">
              <span>No: {transaction.receiptNumber}</span>
              <span className="text-right">{paymentMethodName}</span>
            </div>
            <div className="flex justify-between text-[10px] mb-2 relative z-10">
              <span>{format(new Date(transaction.date), 'dd/MM/yyyy', { locale: id })}</span>
              <span>{format(new Date(transaction.date), 'HH:mm', { locale: id })}</span>
            </div>
            {transaction.customerName && (
              <div className="flex justify-between text-[10px] mb-1 relative z-10">
                <span className="text-gray-500">Pelanggan:</span>
                <span className="font-semibold uppercase truncate max-w-[150px]">{transaction.customerName}</span>
              </div>
            )}

            <div className="border-t-[1.5px] border-dashed border-border/50 my-3" />

            {/* Daftar Item */}
            <div className="relative z-10 min-h-[80px]">
              {items.map((item: any, i: number) => {
                const pName = item.productName || item.product_name || 'Produk';
                const variants = item.selectedVariants || item.selected_variants || [];
                const discAmt = item.discountAmount || item.discount_amount || 0;
                
                return (
                <div key={i} className="mb-2.5">
                  <p className="text-[11px] font-bold uppercase">{pName}</p>
                  {variants && variants.length > 0 && (
                    <p className="text-[9px] text-gray-500">  + {variants.map((v: any) => v.optionName || v.option_name).join(', ')}</p>
                  )}
                  {item.notes && <p className="text-[9px] text-gray-500 italic">  Catatan: {item.notes}</p>}
                  <div className="flex justify-between text-[10px] mt-0.5">
                    <span>{item.quantity} x {rp(item.price)}</span>
                    <span className="font-medium">{rp(item.subtotal)}</span>
                  </div>
                  {discAmt > 0 && (
                    <div className="flex justify-between text-[10px] text-gray-500">
                      <span>  Diskon</span>
                      <span>-{rp(discAmt)}</span>
                    </div>
                  )}
                </div>
              )})}
            </div>

            <div className="border-t-[1.5px] border-dashed border-border/50 my-3" />

            {/* Kalkulasi Total */}
            <div className="space-y-1 text-[11px] relative z-10">
              <div className="flex justify-between">
                <span className="text-gray-600">Subtotal</span>
                <span>{rp(transaction.subtotal)}</span>
              </div>
              {txDiscountAmount > 0 && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Diskon</span>
                  <span>-{rp(txDiscountAmount)}</span>
                </div>
              )}
              
              <div className="flex justify-between font-black text-[13px] border-t border-gray-300 pt-1.5 mt-1.5">
                <span>TOTAL</span>
                <span>{rp(transaction.total)}</span>
              </div>
              
              {(() => {
                const paymentsList = (transaction.payments || []) as any[];
                if (paymentsList.length > 0) {
                  return (
                    <div className="mt-2 pt-2 border-t border-gray-300">
                      <span className="text-gray-600 mb-1 block">Rincian Pembayaran:</span>
                      {paymentsList.map((p, idx) => (
                        <div key={idx} className="flex justify-between pl-2 mb-0.5">
                          <span className="text-gray-500 uppercase">{p.method_name || p.methodName || 'Pembayaran'}</span>
                          <span>{rp(p.amount)}</span>
                        </div>
                      ))}
                    </div>
                  );
                } else {
                  return (
                    <div className="flex justify-between mt-2">
                      <span className="text-gray-600">Bayar</span>
                      <span>{rp(txPaymentAmount)}</span>
                    </div>
                  );
                }
              })()}
              
              <div className="flex justify-between mt-1">
                <span className="text-gray-600">Kembali</span>
                <span>{rp(transaction.change)}</span>
              </div>
            </div>

            <div className="border-t-[1.5px] border-dashed border-border/50 my-3" />

            {/* Footer */}
            <div className="text-center text-[10px] text-gray-500 relative z-10 pt-1 pb-3">
              <p className="font-medium">{storeSettings?.receiptFooter || 'Terima kasih atas kunjungan Anda!'}</p>
            </div>
          </div>
        </div>

        {/* Tombol Aksi */}
        <div className="grid grid-cols-3 gap-3 mt-2">
          <Button 
            variant="outline" 
            className="flex flex-col items-center justify-center gap-2 h-20 bg-card border-border hover:bg-muted hover:border-primary/50 text-muted-foreground hover:text-primary rounded-2xl transition-all shadow-sm" 
            onClick={handleDownload} 
            disabled={generating || printing}
          >
            {generating ? <Loader2 className="w-6 h-6 animate-spin text-primary" /> : <Download className="w-6 h-6 text-muted-foreground group-hover:text-primary" />}
            <span className="text-[10px] font-bold uppercase tracking-wider">Unduh</span>
          </Button>

          <Button 
            variant="outline" 
            className="flex flex-col items-center justify-center gap-2 h-20 bg-card border-border hover:bg-muted hover:border-primary/50 text-muted-foreground hover:text-primary rounded-2xl transition-all shadow-sm" 
            onClick={handleShare} 
            disabled={generating || printing}
          >
            {generating ? <Loader2 className="w-6 h-6 animate-spin text-primary" /> : <Share2 className="w-6 h-6 text-muted-foreground group-hover:text-primary" />}
            <span className="text-[10px] font-bold uppercase tracking-wider">Bagikan</span>
          </Button>

          <Button 
            variant="outline" 
            className="flex flex-col items-center justify-center gap-2 h-20 bg-primary border-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/30 rounded-2xl transition-all" 
            onClick={handleBluetoothPrint} 
            disabled={generating || printing}
          >
            {printing ? <Loader2 className="w-6 h-6 animate-spin text-primary-foreground" /> : <Printer className="w-6 h-6 text-primary-foreground" />}
            <span className="text-[10px] font-bold uppercase tracking-wider">Cetak Struk</span>
          </Button>
        </div>

        <Button 
          variant="ghost" 
          className="w-full mt-2 rounded-2xl py-5 font-bold text-muted-foreground hover:text-foreground hover:bg-muted transition-all" 
          onClick={onClose}
        >
          Tutup Modal
        </Button>
      </DialogContent>
    </Dialog>
  );
}
