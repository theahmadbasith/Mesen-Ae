import { useRef, useState } from 'react';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import html2canvas from 'html2canvas';
import { Download, Share2, Printer, Loader2, CheckCircle2, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import type { Transaction, StoreSettings, TransactionItemRecord } from '@/hooks/db-hooks';
import { cn } from '@/lib/utils';

// Helper to convert image URL to ESC/POS raster bit image (binarized 1-bit GS v 0 format)
async function convertImageUrlToEscPosRaster(url: string): Promise<Uint8Array | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'Anonymous';
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        const printWidth = 384; // Standard width for 58mm printer
        const printHeight = Math.round((img.height / img.width) * printWidth);
        
        canvas.width = printWidth;
        canvas.height = printHeight;
        
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(null);
          return;
        }
        
        // Render grayscale and high contrast binarized image on canvas
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, printWidth, printHeight);
        ctx.drawImage(img, 0, 0, printWidth, printHeight);
        
        const imgData = ctx.getImageData(0, 0, printWidth, printHeight);
        const pixels = imgData.data;
        
        const xBytes = printWidth / 8; // 48 bytes
        const yLines = printHeight;
        
        // ESC/POS Command: GS v 0 0 xL xH yL yH
        const header = new Uint8Array([
          0x1D, 0x76, 0x30, 0x00, 
          xBytes & 0xFF, (xBytes >> 8) & 0xFF,
          yLines & 0xFF, (yLines >> 8) & 0xFF
        ]);
        
        const body = new Uint8Array(xBytes * yLines);
        
        for (let y = 0; y < yLines; y++) {
          for (let x = 0; x < xBytes; x++) {
            let byteVal = 0;
            for (let bit = 0; bit < 8; bit++) {
              const pixelX = x * 8 + bit;
              const idx = (y * printWidth + pixelX) * 4;
              const r = pixels[idx];
              const g = pixels[idx + 1];
              const b = pixels[idx + 2];
              const a = pixels[idx + 3];
              
              let isBlack = false;
              if (a > 30) {
                const luminance = 0.299 * r + 0.587 * g + 0.114 * b;
                isBlack = luminance < 128; // Simple thresholding
              }
              
              if (isBlack) {
                byteVal |= (1 << (7 - bit));
              }
            }
            body[y * xBytes + x] = byteVal;
          }
        }
        
        const combined = new Uint8Array(header.length + body.length);
        combined.set(header, 0);
        combined.set(body, header.length);
        resolve(combined);
      } catch (err) {
        console.error('Error generating raster bytes:', err);
        resolve(null);
      }
    };
    img.onerror = () => {
      resolve(null);
    };
    img.src = url;
  });
}

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

  // Parse dynamic receipt configuration settings
  const typo = (storeSettings as any)?.receiptTypography || {};
  const fontFamilyVal = typo.fontFamily || 'courier';
  const fontSizeVal = typo.fontSize || 'sm';
  const lineHeightVal = typo.lineHeight || 'normal';
  const alignmentVal = typo.alignment || 'center';
  const compactModeVal = typo.compactMode || false;
  const paperWidthVal = typo.paperWidth || '58mm';

  if (!transaction) return null;
  const safeItems = Array.isArray(items) ? items : [];

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

      // ESC/POS Formatter with binary and text chunks
      const lines: (string | Uint8Array)[] = [];

      lines.push('\x1B\x40'); // Initialize printer
      lines.push('\x1B\x61\x01'); // Center align
      
      // Store Logo (Cetak bila logo diaktifkan)
      const showLogo = (storeSettings as any)?.receiptShowLogo ?? true;
      if (showLogo && storeSettings?.logo) {
        try {
          const logoRaster = await convertImageUrlToEscPosRaster(storeSettings.logo);
          if (logoRaster) {
            lines.push(logoRaster);
            lines.push('\n');
          }
        } catch (e) {
          console.warn('Gagal memformat logo toko ke printer:', e);
        }
      }

      lines.push('\x1B\x61\x01'); // Center align
      lines.push('\x1B\x45\x01'); // Bold ON
      lines.push(`${storeSettings?.storeName || 'Toko'}\n`);
      lines.push('\x1B\x45\x00'); // Bold OFF
      
      if (storeSettings?.address) lines.push(`${storeSettings.address}\n`);
      if (storeSettings?.phone) lines.push(`${storeSettings.phone}\n`);
      
      lines.push('--------------------------------\n');
      lines.push('\x1B\x61\x01'); // Center align
      lines.push('\x1B\x45\x01'); // Bold ON
      lines.push(`${(storeSettings as any)?.receiptHeaderTitle || 'Struk Pembelian'}\n`);
      lines.push('\x1B\x45\x00'); // Bold OFF
      lines.push('--------------------------------\n');
      
      lines.push('\x1B\x61\x00'); // Left align
      lines.push(`No: ${transaction.receiptNumber}\n`);
      lines.push(`${format(new Date(transaction.date), 'dd/MM/yyyy HH:mm')}\n`);
      
      // Metadata Struk
      const showCashier = (storeSettings as any)?.receiptShowCashier ?? true;
      if (showCashier) {
        const cashierNameVal = transaction.cashierName || (transaction as any).cashier_name;
        if (cashierNameVal) {
          lines.push(`Kasir: ${cashierNameVal}\n`);
        }
      }
      
      const showCustomer = (storeSettings as any)?.receiptShowCustomer ?? true;
      if (showCustomer) {
        const buyerNameVal = transaction.customerName || (transaction as any).customer_name;
        if (buyerNameVal) {
          lines.push(`Pelanggan: ${buyerNameVal}\n`);
        }
      }
      
      const showTable = (storeSettings as any)?.receiptShowTable ?? true;
      if (showTable) {
        const tableVal = transaction.tableNumber || (transaction as any).table_number;
        if (tableVal) {
          const displayTable = String(tableVal).toLowerCase() === 'bawa pulang' || String(tableVal).toLowerCase() === 'take away'
            ? 'Bawa Pulang'
            : 'Meja ' + String(tableVal).replace(/^(meja\s+)+/i, '');
          lines.push(`Meja/Tipe: ${displayTable}\n`);
        }
      }
      lines.push('--------------------------------\n');

      lines.push('\x1B\x61\x00'); // Left align
      for (const item of safeItems) {
        lines.push(`${item.productName}\n`);
        let safeVariants = item.selectedVariants || item.selected_variants || [];
        if (typeof safeVariants === 'string') {
          try { safeVariants = JSON.parse(safeVariants); } catch (e) { safeVariants = []; }
        }
        if (!Array.isArray(safeVariants)) safeVariants = [];

        if (safeVariants.length > 0) {
          lines.push(`  + ${safeVariants.map((v: any) => v.optionName || v.option_name).join(', ')}\n`);
        }
        if (item.notes) lines.push(`  Catatan: ${item.notes}\n`);
        lines.push(`  ${item.quantity} x ${rp(item.price)}  ${rp(item.subtotal)}\n`);
      }

      lines.push('--------------------------------\n');
      lines.push(`Subtotal:  ${rp(transaction.subtotal)}\n`);
      const txTaxAmount = transaction.tax_and_service || transaction.taxAndService || 0;
      if (txTaxAmount > 0) {
        lines.push(`Biaya Admin: ${rp(txTaxAmount)}\n`);
      }
      if (txDiscountAmount > 0) {
        lines.push(`Diskon:   -${rp(txDiscountAmount)}\n`);
      }
      
      lines.push('\x1B\x45\x01'); // Bold ON for Total
      lines.push(`TOTAL:     ${rp(transaction.total)}\n`);
      lines.push('\x1B\x45\x00'); // Bold OFF
      
      let paymentsList = transaction.payments || [];
      if (typeof paymentsList === 'string') {
        try { paymentsList = JSON.parse(paymentsList); } catch (e) { paymentsList = []; }
      }
      if (!Array.isArray(paymentsList)) paymentsList = [];

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
      
      // Render footer items
      lines.push('\x1B\x61\x01'); // Center align
      const footerLines = (storeSettings as any)?.receiptFooterLines || [];
      if (footerLines && Array.isArray(footerLines) && footerLines.length > 0) {
        footerLines.forEach((lineText: string) => {
          if (lineText && lineText.trim()) {
            const subLines = lineText.split('\n');
            subLines.forEach(sub => {
              if (sub.trim()) {
                lines.push(`${sub}\n`);
              }
            });
          }
        });
      } else {
        lines.push(`${storeSettings?.receiptFooter || 'Terima kasih atas kunjungan Anda!'}\n`);
      }
      
      const footerImgUrl = (storeSettings as any)?.receiptFooterImg;
      if (footerImgUrl) {
        try {
          const rasterData = await convertImageUrlToEscPosRaster(footerImgUrl);
          if (rasterData) {
            lines.push('\x1B\x61\x01'); // Center align image
            lines.push(rasterData);
            lines.push('\n');
          }
        } catch (e) {
          console.warn('Gagal memformat gambar footer ke printer:', e);
        }
      }
      lines.push('\n\n\n');

      // Encode both text and binary chunks
      const chunkList: Uint8Array[] = [];
      const textEncoder = new TextEncoder();
      
      for (const item of lines) {
        if (typeof item === 'string') {
          chunkList.push(textEncoder.encode(item));
        } else if (item instanceof Uint8Array) {
          chunkList.push(item);
        }
      }
      
      let totalLength = 0;
      chunkList.forEach(c => totalLength += c.length);
      const data = new Uint8Array(totalLength);
      let offset = 0;
      chunkList.forEach(c => {
        data.set(c, offset);
        offset += c.length;
      });

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
        <div 
          className={cn(
            "relative mx-auto bg-white text-black p-6 shadow-lg mb-6 overflow-hidden flex-shrink-0 transition-all duration-300",
            paperWidthVal === '58mm' ? "w-full max-w-[280px]" : "w-full max-w-[360px]"
          )}
          style={{ 
            fontFamily: fontFamilyVal === 'monospace' ? 'monospace' : fontFamilyVal === 'sans-serif' ? 'sans-serif' : fontFamilyVal === 'receipt-font' ? 'monospace' : "'Courier New', Courier, monospace",
            fontSize: fontSizeVal === 'xs' ? '10px' : fontSizeVal === 'sm' ? '12px' : fontSizeVal === 'md' ? '14px' : fontSizeVal === 'lg' ? '16px' : '18px',
            lineHeight: lineHeightVal === 'tight' ? '1.15' : lineHeightVal === 'relaxed' ? '1.5' : '1.3',
            letterSpacing: fontFamilyVal === 'receipt-font' ? '-0.05em' : 'normal',
            clipPath: 'polygon(0 0, 100% 0, 100% calc(100% - 6px), 98% 100%, 96% calc(100% - 6px), 94% 100%, 92% calc(100% - 6px), 90% 100%, 88% calc(100% - 6px), 86% 100%, 84% calc(100% - 6px), 82% 100%, 80% calc(100% - 6px), 78% 100%, 76% calc(100% - 6px), 74% 100%, 72% calc(100% - 6px), 70% 100%, 68% calc(100% - 6px), 66% 100%, 64% calc(100% - 6px), 62% 100%, 60% calc(100% - 6px), 58% 100%, 56% calc(100% - 6px), 54% 100%, 52% calc(100% - 6px), 50% 100%, 48% calc(100% - 6px), 46% 100%, 44% calc(100% - 6px), 42% 100%, 40% calc(100% - 6px), 38% 100%, 36% calc(100% - 6px), 34% 100%, 32% calc(100% - 6px), 30% 100%, 28% calc(100% - 6px), 26% 100%, 24% calc(100% - 6px), 22% 100%, 20% calc(100% - 6px), 18% 100%, 16% calc(100% - 6px), 14% 100%, 12% calc(100% - 6px), 10% 100%, 8% calc(100% - 6px), 6% 100%, 4% calc(100% - 6px), 2% 100%, 0 calc(100% - 6px))'
          }}
        >
          
          <div ref={receiptRef} className="relative z-10 bg-white text-black">

            {/* Header Toko */}
            <div className={cn("text-center relative z-10", compactModeVal ? "mb-2.5" : "mb-4.5")}>
              {((storeSettings as any)?.receiptShowLogo ?? true) && storeSettings?.logo && (
                <img src={storeSettings.logo} alt="Logo" className="w-16 h-16 object-contain mx-auto mb-2 grayscale" />
              )}
              <h2 className="font-extrabold text-[1.25em] tracking-wide">{storeSettings?.storeName || 'Toko'}</h2>
              {storeSettings?.address && <p className="text-[0.85em] mt-1 leading-tight">{storeSettings.address}</p>}
              {storeSettings?.phone && <p className="text-[0.85em] leading-tight">{storeSettings.phone}</p>}
              
              <div className="border-t-[1.5px] border-dashed border-gray-400 my-2.5" />
              
              <h3 className="font-bold text-[1em] tracking-widest">{(storeSettings as any)?.receiptHeaderTitle || 'Struk Pembelian'}</h3>
            </div>

            <div className="border-t-[1.5px] border-dashed border-gray-400 my-3" />

            {/* Info Transaksi */}
            <div className="flex justify-between text-[0.9em] relative z-10">
              <span>No. Struk: {transaction.receiptNumber}</span>
              <span className="text-right font-medium">{paymentMethodName}</span>
            </div>
            <div className="flex justify-between text-[0.9em] mb-2 relative z-10">
              <span>{format(new Date(transaction.date), 'dd/MM/yyyy', { locale: id })}</span>
              <span>{format(new Date(transaction.date), 'HH:mm', { locale: id })}</span>
            </div>

            {/* Rincian Tambahan: Kasir, Pelanggan, Meja/Tipe */}
            {(((storeSettings as any)?.receiptShowCashier ?? true) || ((storeSettings as any)?.receiptShowCustomer ?? true) || ((storeSettings as any)?.receiptShowTable ?? true)) && (
              <div className="space-y-1 text-[0.85em] mb-2 relative z-10 text-left border-t border-dashed border-gray-300 pt-2">
                {((storeSettings as any)?.receiptShowCashier ?? true) && (() => {
                  const cashierNameVal = transaction.cashierName || (transaction as any).cashier_name || transaction.confirmedBy;
                  if (cashierNameVal) {
                    return (
                      <div className="flex justify-between">
                        <span className="text-gray-500">Kasir:</span>
                        <span className="font-semibold">{cashierNameVal}</span>
                      </div>
                    );
                  }
                  return null;
                })()}
                {((storeSettings as any)?.receiptShowCustomer ?? true) && (() => {
                  const buyerNameVal = transaction.customerName || (transaction as any).customer_name;
                  if (buyerNameVal) {
                    return (
                      <div className="flex justify-between">
                        <span className="text-gray-500">Pelanggan:</span>
                        <span className="font-semibold truncate max-w-[150px]">{buyerNameVal}</span>
                      </div>
                    );
                  }
                  return null;
                })()}
                {((storeSettings as any)?.receiptShowTable ?? true) && (() => {
                  const tableVal = transaction.tableNumber || (transaction as any).table_number;
                  if (tableVal) {
                    const displayTable = String(tableVal).toLowerCase() === 'bawa pulang' || String(tableVal).toLowerCase() === 'take away'
                      ? 'Bawa Pulang'
                      : 'Meja ' + String(tableVal).replace(/^(meja\s+)+/i, '');
                    return (
                      <div className="flex justify-between">
                        <span className="text-gray-500">Meja / Tipe:</span>
                        <span className="font-bold">{displayTable}</span>
                      </div>
                    );
                  }
                  return null;
                })()}
              </div>
            )}

            <div className="border-t-[1.5px] border-dashed border-gray-400 my-3" />

            {/* Daftar Item */}
            <div className="relative z-10 min-h-[60px] space-y-2">
              {safeItems.map((item: any, i: number) => {
                const pName = item.productName || item.product_name || 'Produk';
                let variants = item.selectedVariants || item.selected_variants || [];
                if (typeof variants === 'string') {
                  try { variants = JSON.parse(variants); } catch (e) { variants = []; }
                }
                if (!Array.isArray(variants)) variants = [];

                const discAmt = item.discountAmount || item.discount_amount || 0;
                
                return (
                  <div key={i} className="text-[0.95em]">
                    <div className="flex justify-between font-semibold">
                      <span>{pName}</span>
                      <span>{rp(item.subtotal)}</span>
                    </div>
                    {variants.length > 0 && (
                      <p className="text-[0.8em] text-gray-500 pl-2">  + {variants.map((v: any) => v.optionName || v.option_name).join(', ')}</p>
                    )}
                    {item.notes && <p className="text-[0.8em] text-gray-500 italic pl-2">  Catatan: {item.notes}</p>}
                    <div className="flex justify-between text-[0.85em] text-gray-500 pl-2 mt-0.5">
                      <span>{item.quantity} x {rp(item.price)}</span>
                    </div>
                    {discAmt > 0 && (
                      <div className="flex justify-between text-[0.85em] text-gray-500 pl-2">
                        <span>  Diskon</span>
                        <span>-{rp(discAmt)}</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="border-t-[1.5px] border-dashed border-gray-400 my-3" />

            {/* Kalkulasi Total */}
            <div className="space-y-1 text-[0.9em] relative z-10">
              <div className="flex justify-between">
                <span className="text-gray-600">Subtotal</span>
                <span>{rp(transaction.subtotal)}</span>
              </div>
              {((transaction.tax_and_service || transaction.taxAndService) > 0) && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Biaya Admin</span>
                  <span>{rp(transaction.tax_and_service || transaction.taxAndService)}</span>
                </div>
              )}
              {txDiscountAmount > 0 && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Diskon</span>
                  <span>-{rp(txDiscountAmount)}</span>
                </div>
              )}
              
              <div className="flex justify-between font-black text-[1.15em] border-t border-gray-300 pt-1.5 mt-1.5">
                <span>Total Tagihan</span>
                <span>{rp(transaction.total)}</span>
              </div>
              
              {(() => {
                let paymentsList = transaction.payments || [];
                if (typeof paymentsList === 'string') {
                  try { paymentsList = JSON.parse(paymentsList); } catch (e) { paymentsList = []; }
                }
                if (!Array.isArray(paymentsList)) paymentsList = [];

                if (paymentsList.length > 0) {
                  return (
                    <div className="mt-2 pt-2 border-t border-gray-300 space-y-1">
                      <span className="text-gray-600 block">Rincian Pembayaran:</span>
                      {paymentsList.map((p, idx) => (
                        <div key={idx} className="flex justify-between pl-2">
                          <span className="text-gray-500">{p.method_name || p.methodName || 'Pembayaran'}</span>
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

            <div className="border-t-[1.5px] border-dashed border-gray-400 my-3" />

            {/* Dynamic Textarea/Cropped Image Footer rendering */}
            <div 
              className={cn(
                "relative z-10 pt-1 pb-3 space-y-2 text-gray-500 text-[0.85em]",
                {
                  'text-left': alignmentVal === 'left',
                  'text-center': alignmentVal === 'center',
                  'text-right': alignmentVal === 'right'
                }
              )}
            >
              {(() => {
                const footerLines = (storeSettings as any)?.receiptFooterLines || [];
                if (footerLines && Array.isArray(footerLines) && footerLines.length > 0) {
                  return footerLines.map((line: string, idx: number) => (
                    line && line.trim() && <p key={idx} className="font-medium whitespace-pre-wrap leading-relaxed">{line.trim()}</p>
                  ));
                }
                
                // Fallback
                return (
                  <p className="font-medium whitespace-pre-wrap leading-relaxed">
                    {storeSettings?.receiptFooter || 'Terima kasih atas kunjungan Anda!'}
                  </p>
                );
              })()}

              {((storeSettings as any)?.receiptFooterImg || (storeSettings as any)?.receiptFooterImage) && (
                <div className="my-2.5 text-center">
                  <img 
                    src={(storeSettings as any).receiptFooterImg || (storeSettings as any).receiptFooterImage} 
                    alt="Footer Logo" 
                    className="h-16 w-auto mx-auto object-contain rounded-2xl grayscale opacity-75 shadow-sm bg-neutral-50/50 border border-neutral-200/40 select-none print:grayscale" 
                    style={{ filter: 'grayscale(1) contrast(1.2)' }}
                  />
                </div>
              )}
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
