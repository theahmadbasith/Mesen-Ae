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

// Helper: resolve fontSize from either numeric or legacy string enum
function resolveFontSize(val: any): string {
  if (typeof val === 'number') return `${val}px`;
  const map: Record<string, string> = { xs: '9px', sm: '11px', md: '13px', lg: '15px', xl: '17px' };
  return map[val] || '11px';
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
  const fontSizeVal = typo.fontSize ?? 'sm';
  const lineHeightVal = typo.lineHeight || 'normal';
  const paperWidthVal = typo.paperWidth || '58mm';
  const rawTemplate = (storeSettings as any)?.receiptTemplate ?? 'fnb';
  const template = rawTemplate === 'finedining' ? 'classic' : rawTemplate;
  const showLogo = (storeSettings as any)?.receiptShowLogo ?? true;

  // Custom Styles
  const footerStyles = (storeSettings as any)?.receiptFooterStyles || {};
  const line1Bold = footerStyles.line1?.bold ?? false;
  const line1Italic = footerStyles.line1?.italic ?? false;
  const line1Underline = footerStyles.line1?.underline ?? false;
  const line2Bold = footerStyles.line2?.bold ?? false;
  const line2Italic = footerStyles.line2?.italic ?? false;
  const line2Underline = footerStyles.line2?.underline ?? false;

  const getFooterStyle = (block: string) => {
    const isLine1 = block === 'line1';
    const bold = isLine1 ? line1Bold : line2Bold;
    const italic = isLine1 ? line1Italic : line2Italic;
    const underline = isLine1 ? line1Underline : line2Underline;
    return {
      fontWeight: bold ? 'bold' : 'normal',
      fontStyle: italic ? 'italic' : 'normal',
      textDecoration: underline ? 'underline' : 'none'
    };
  };

  if (!transaction) return null;
  const safeItems = Array.isArray(items) ? items : [];
  const tableVal = transaction.tableNumber || (transaction as any).table_number;
  const isTakeAway = tableVal && (
    String(tableVal).toLowerCase() === 'bawa pulang' ||
    String(tableVal).toLowerCase() === 'take away' ||
    String(tableVal).toLowerCase() === 'ambil sendiri'
  );

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
        backgroundColor: null,
        scale: 3,
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
      
      // Store Logo — always shown
      if (storeSettings?.logo) {
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
      
      lines.push('\x1B\x61\x00'); // Left align
      lines.push(`No: ${transaction.receiptNumber}\n`);
      lines.push(`${format(new Date(transaction.date), 'dd/MM/yyyy HH:mm')}\n`);
      
      // Metadata — always shown
      const cashierNameVal = transaction.cashierName || (transaction as any).cashier_name;
      if (cashierNameVal) {
        lines.push(`Kasir: ${cashierNameVal}\n`);
      }
      
      const buyerNameVal = transaction.customerName || (transaction as any).customer_name;
      if (buyerNameVal) {
        lines.push(`Pelanggan: ${buyerNameVal}\n`);
      }
      
      const tableVal = transaction.tableNumber || (transaction as any).table_number;
      if (tableVal) {
        const displayTable = String(tableVal).toLowerCase() === 'bawa pulang' || String(tableVal).toLowerCase() === 'take away'
          ? 'Bawa Pulang'
          : 'Meja ' + String(tableVal).replace(/^(meja\s+)+/i, '');
        lines.push(`Meja/Tipe: ${displayTable}\n`);
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
      
      // Render footer items in order
      lines.push('\x1B\x61\x01'); // Center align
      const footerOrder: string[] = (storeSettings as any)?.receiptFooterOrder || ['line1', 'line2', 'image'];
      const footerLines: string[] = (storeSettings as any)?.receiptFooterLines || [];
      const footerImgUrl = (storeSettings as any)?.receiptFooterImg;

      for (const block of footerOrder) {
        if (block === 'line1' && footerLines[0]?.trim()) {
          footerLines[0].split('\n').forEach(sub => { if (sub.trim()) lines.push(`${sub}\n`); });
        }
        if (block === 'line2' && footerLines[1]?.trim()) {
          footerLines[1].split('\n').forEach(sub => { if (sub.trim()) lines.push(`${sub}\n`); });
        }
        if (block === 'image' && footerImgUrl) {
          try {
            const rasterData = await convertImageUrlToEscPosRaster(footerImgUrl);
            if (rasterData) {
              lines.push('\x1B\x61\x01');
              lines.push(rasterData);
              lines.push('\n');
            }
          } catch (e) {
            console.warn('Gagal memformat gambar footer ke printer:', e);
          }
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

  // Footer order & data
  const footerOrder: string[] = (storeSettings as any)?.receiptFooterOrder || ['line1', 'line2', 'image'];
  const footerLinesData: string[] = (storeSettings as any)?.receiptFooterLines || [];
  const footerImgData = (storeSettings as any)?.receiptFooterImg || (storeSettings as any)?.receiptFooterImage;

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

        {/* Kertas Struk */}
        <div 
          className={cn(
            "relative mx-auto bg-white text-black p-6 shadow-lg mb-6 overflow-hidden flex-shrink-0 transition-all duration-300",
            paperWidthVal === '58mm' ? "w-full max-w-[280px]" : "w-full max-w-[360px]"
          )}
          style={{ 
            fontFamily: fontFamilyVal === 'monospace' ? 'monospace' : fontFamilyVal === 'sans-serif' ? 'sans-serif' : fontFamilyVal === 'receipt-font' ? 'monospace' : "'Courier New', Courier, monospace",
            fontSize: resolveFontSize(fontSizeVal),
            lineHeight: lineHeightVal === 'tight' ? '1.15' : lineHeightVal === 'relaxed' ? '1.5' : '1.3',
            letterSpacing: fontFamilyVal === 'receipt-font' ? '-0.05em' : 'normal',
            clipPath: 'polygon(0 0, 100% 0, 100% calc(100% - 6px), 98% 100%, 96% calc(100% - 6px), 94% 100%, 92% calc(100% - 6px), 90% 100%, 88% calc(100% - 6px), 86% 100%, 84% calc(100% - 6px), 82% 100%, 80% calc(100% - 6px), 78% 100%, 76% calc(100% - 6px), 74% 100%, 72% calc(100% - 6px), 70% 100%, 68% calc(100% - 6px), 66% 100%, 64% calc(100% - 6px), 62% 100%, 60% calc(100% - 6px), 58% 100%, 56% calc(100% - 6px), 54% 100%, 52% calc(100% - 6px), 50% 100%, 48% calc(100% - 6px), 46% 100%, 44% calc(100% - 6px), 42% 100%, 40% calc(100% - 6px), 38% 100%, 36% calc(100% - 6px), 34% 100%, 32% calc(100% - 6px), 30% 100%, 28% calc(100% - 6px), 26% 100%, 24% calc(100% - 6px), 22% 100%, 20% calc(100% - 6px), 18% 100%, 16% calc(100% - 6px), 14% 100%, 12% calc(100% - 6px), 10% 100%, 8% calc(100% - 6px), 6% 100%, 4% calc(100% - 6px), 2% 100%, 0 calc(100% - 6px))'
          }}
        >
          
          <div ref={receiptRef} className="relative z-10 bg-white text-black">

            {/* ── MINIMARKET TEMPLATE ── */}
            {template === 'minimarket' && (
              <div className="w-full text-left uppercase text-[0.85em] relative z-10">
                {showLogo && storeSettings?.logo && (
                  <div className="mb-3 text-center">
                    <img src={storeSettings.logo} alt="Logo" className="w-28 h-8 object-contain mx-auto mb-2 grayscale" />
                  </div>
                )}
                <div className="mb-2">
                  <h2 className="font-extrabold text-[1.1em]">{storeSettings?.storeName?.toUpperCase() || 'TOKO'}</h2>
                  {storeSettings?.address && <p className="text-[0.9em] leading-tight">{storeSettings.address.toUpperCase()}</p>}
                  {storeSettings?.phone && <p className="text-[0.9em] leading-tight">{storeSettings.phone}</p>}
                </div>
                <div className="mb-2 text-[0.95em] uppercase font-medium space-y-0.5">
                  <div>No. Struk: {transaction.receiptNumber}</div>
                  <div className="flex justify-between w-full">
                    <span>TGL: {format(new Date(transaction.date), 'dd.MM.yy-HH:mm')}</span>
                    <span>KASIR: {String(transaction.cashierName || (transaction as any).cashier_name || 'Staff').toUpperCase()}</span>
                  </div>
                  {(transaction.customerName || tableVal) && (
                    <div className="flex justify-between w-full">
                      <span>PELANGGAN: {transaction.customerName ? String(transaction.customerName).toUpperCase() : '-'}</span>
                      <span>{isTakeAway ? 'Tipe: TAKE AWAY' : `MEJA: ${tableVal ? String(tableVal).replace(/^(meja\s+)+/i, '').toUpperCase() : '-'}`}</span>
                    </div>
                  )}
                </div>
                <div className="border-t border-dashed border-black my-2" />
                
                {/* Items */}
                <div className="space-y-1">
                  {safeItems.map((item: any, i: number) => {
                    const pName = item.productName || item.product_name || 'Produk';
                    return (
                      <div key={i} className="flex leading-tight font-medium py-0.5">
                        <span className="flex-1 pr-1 break-words whitespace-normal text-left">{pName.toUpperCase()}</span>
                        <span className="w-4 text-center shrink-0">{item.quantity}</span>
                        <span className="w-14 text-right shrink-0">{rp(item.price)}</span>
                        <span className="w-14 text-right shrink-0">{rp(item.subtotal)}</span>
                      </div>
                    );
                  })}
                </div>
                
                <div className="border-t border-dashed border-black my-2" />
                <div className="space-y-0.5 text-[0.95em] font-medium">
                  <div className="flex justify-end gap-4">
                    <span>HARGA JUAL :</span><span className="w-20 text-right">{rp(transaction.subtotal)}</span>
                  </div>
                  {txDiscountAmount > 0 && (
                    <div className="flex justify-end gap-4">
                      <span>DISKON :</span><span className="w-20 text-right">-{rp(txDiscountAmount)}</span>
                    </div>
                  )}
                  {((transaction.tax_and_service || transaction.taxAndService) > 0) && (
                    <div className="flex justify-end gap-4">
                      <span>BIAYA ADMIN :</span><span className="w-20 text-right">{rp(transaction.tax_and_service || transaction.taxAndService)}</span>
                    </div>
                  )}
                  <div className="border-t border-dashed border-black my-1" />
                  <div className="flex justify-end gap-4 font-extrabold text-[1.05em]">
                    <span>TOTAL :</span><span className="w-20 text-right">{rp(transaction.total)}</span>
                  </div>
                  <div className="flex justify-end gap-4">
                    <span>TUNAI/QRIS :</span><span className="w-20 text-right">{rp(txPaymentAmount || transaction.total)}</span>
                  </div>
                  <div className="flex justify-end gap-4">
                    <span>KEMBALI :</span><span className="w-20 text-right">{rp(transaction.change)}</span>
                  </div>
                </div>
              </div>
            )}

            {/* ── FNB (Kafe/Resto) TEMPLATE ── */}
            {template === 'fnb' && (
              <div className="w-full text-left text-[0.85em] relative z-10">
                <div className="text-center mb-4">
                  {showLogo && storeSettings?.logo && (
                    <div className="w-14 h-14 mx-auto mb-2 grayscale">
                      <img src={storeSettings.logo} alt="Logo" className="w-full h-full object-contain mx-auto" />
                    </div>
                  )}
                  <h2 className="font-bold text-[1.25em]">{storeSettings?.storeName?.toUpperCase() || 'TOKO'}</h2>
                  {storeSettings?.address && <p className="opacity-90">{storeSettings.address}</p>}
                  {storeSettings?.phone && <p className="opacity-90 leading-tight">{storeSettings.phone}</p>}
                </div>
                <div className="mb-2 font-medium">
                  <div className="grid grid-cols-[65px_auto] gap-x-1">
                    <span>No Struk</span><span>: {transaction.receiptNumber}</span>
                    <span>Tanggal</span><span>: {format(new Date(transaction.date), 'dd MMM yyyy, HH:mm', { locale: id })}</span>
                    <span>Kasir</span><span>: {transaction.cashierName || (transaction as any).cashier_name || 'Staff'}</span>
                    {transaction.customerName && (
                      <><span>Nama</span><span>: {transaction.customerName}</span></>
                    )}
                    {tableVal && (
                      <>
                        <span>{isTakeAway ? 'Tipe' : 'Meja'}</span>
                        <span>: {
                          isTakeAway
                            ? 'Take Away'
                            : String(tableVal).replace(/^(meja\s+)+/i, '')
                        }</span>
                      </>
                    )}
                  </div>
                </div>
                <div className="border-t border-dashed border-black my-2" />
                
                {/* Items */}
                <div className="space-y-2">
                  {safeItems.map((item: any, i: number) => {
                    const pName = item.productName || item.product_name || 'Produk';
                    let variants = item.selectedVariants || item.selected_variants || [];
                    if (typeof variants === 'string') {
                      try { variants = JSON.parse(variants); } catch (e) { variants = []; }
                    }
                    return (
                      <div key={i} className="leading-tight font-medium">
                        <div className="font-bold break-words whitespace-normal text-left">{pName}</div>
                        <div className="flex justify-between text-[0.95em] mt-0.5">
                          <span>{item.quantity} x {rp(item.price)}</span>
                          <span>{rp(item.subtotal)}</span>
                        </div>
                        {Array.isArray(variants) && variants.length > 0 && (
                          <div className="opacity-80 text-[0.9em] pl-1">+ {variants.map((v: any) => v.optionName || v.option_name).join(', ')}</div>
                        )}
                        {item.notes && <div className="opacity-80 text-[0.9em] pl-1">Catatan: {item.notes}</div>}
                      </div>
                    );
                  })}
                </div>
                
                <div className="border-t border-dashed border-black my-2" />
                <div className="grid grid-cols-[80px_auto] gap-x-1 ml-auto max-w-[200px] font-medium text-[0.95em]">
                  <span>Subtotal</span><span>: {rp(transaction.subtotal)}</span>
                  {txDiscountAmount > 0 && (
                    <><span>Diskon</span><span>: -{rp(txDiscountAmount)}</span></>
                  )}
                  {((transaction.tax_and_service || transaction.taxAndService) > 0) && (
                    <><span>Biaya Admin</span><span>: {rp(transaction.tax_and_service || transaction.taxAndService)}</span></>
                  )}
                  <span className="font-extrabold text-[1.1em]">Total</span><span className="font-extrabold text-[1.1em]">: {rp(transaction.total)}</span>
                  <span>Bayar</span><span>: {paymentMethodName}</span>
                  <span>Kembali</span><span>: {rp(transaction.change)}</span>
                </div>
              </div>
            )}

            {/* ── CLASSIC TEMPLATE ── */}
            {template === 'classic' && (
              <div className="w-full text-[0.85em] relative z-10">
                <div className="text-center mb-3">
                  {showLogo && storeSettings?.logo && (
                    <div className="w-16 h-16 mx-auto mb-2 grayscale">
                      <img src={storeSettings.logo} alt="Logo" className="w-full h-full object-contain mx-auto" />
                    </div>
                  )}
                  <h2 className="font-extrabold text-[1.25em] tracking-wide">{storeSettings?.storeName || 'TOKO'}</h2>
                  {storeSettings?.address && <p className="text-[0.9em] mt-1 leading-tight">{storeSettings.address}</p>}
                  {storeSettings?.phone && <p className="text-[0.9em] leading-tight">{storeSettings.phone}</p>}
                </div>
                <div className="border-t border-dashed border-black/60 my-2" />
                <div className="space-y-0.5 font-medium">
                  <div className="flex justify-between"><span>No. Struk: {transaction.receiptNumber}</span><span>{paymentMethodName}</span></div>
                  <div className="flex justify-between">
                    <span>{format(new Date(transaction.date), 'dd/MM/yyyy')}</span>
                    <span>{format(new Date(transaction.date), 'HH:mm')}</span>
                  </div>
                </div>
                <div className="border-t border-dashed border-black/40 my-2" />
                <div className="space-y-0.5 text-left font-medium">
                  <div className="flex justify-between"><span className="text-gray-500">Kasir:</span><span className="font-semibold">{transaction.cashierName || (transaction as any).cashier_name || 'Staff'}</span></div>
                  {transaction.customerName && (
                    <div className="flex justify-between"><span className="text-gray-500">Pelanggan:</span><span className="font-semibold">{transaction.customerName}</span></div>
                  )}
                  {tableVal && (
                    <div className="flex justify-between">
                      <span className="text-gray-500">{isTakeAway ? 'Tipe' : 'Meja / Tipe'}:</span>
                      <span className="font-bold">{
                        isTakeAway
                          ? 'Take Away'
                          : 'Meja ' + String(tableVal).replace(/^(meja\s+)+/i, '')
                      }</span>
                    </div>
                  )}
                </div>
                <div className="border-t border-dashed border-black/60 my-2" />
                
                {/* Items */}
                <div className="space-y-1.5 font-medium">
                  {safeItems.map((item: any, i: number) => {
                    const pName = item.productName || item.product_name || 'Produk';
                    let variants = item.selectedVariants || item.selected_variants || [];
                    if (typeof variants === 'string') {
                      try { variants = JSON.parse(variants); } catch (e) { variants = []; }
                    }
                    return (
                      <div key={i}>
                        <div className="flex justify-between font-semibold">
                          <span className="break-words whitespace-normal text-left">{pName}</span>
                          <span>{rp(item.subtotal)}</span>
                        </div>
                        <div className="text-[0.9em] text-gray-500 pl-2 text-left">
                          {item.quantity} x {rp(item.price)}
                          {Array.isArray(variants) && variants.length > 0 && ` (+ ${variants.map((v: any) => v.optionName || v.option_name).join(', ')})`}
                          {item.notes && ` (Catatan: ${item.notes})`}
                        </div>
                      </div>
                    );
                  })}
                </div>
                
                <div className="border-t border-dashed border-black/60 my-2" />
                <div className="space-y-1 font-medium">
                  <div className="flex justify-between"><span className="text-gray-600">Subtotal</span><span>{rp(transaction.subtotal)}</span></div>
                  {txDiscountAmount > 0 && (
                    <div className="flex justify-between"><span className="text-gray-600">Diskon</span><span>-{rp(txDiscountAmount)}</span></div>
                  )}
                  {((transaction.tax_and_service || transaction.taxAndService) > 0) && (
                    <div className="flex justify-between"><span className="text-gray-600">Biaya Admin</span><span>{rp(transaction.tax_and_service || transaction.taxAndService)}</span></div>
                  )}
                  <div className="flex justify-between font-black text-[1.1em] border-t border-gray-300 pt-1.5 mt-1.5"><span>Total</span><span>{rp(transaction.total)}</span></div>
                  <div className="flex justify-between mt-1"><span className="text-gray-600">Bayar</span><span>{rp(txPaymentAmount || transaction.total)}</span></div>
                  <div className="flex justify-between"><span className="text-gray-600">Kembali</span><span>{rp(transaction.change)}</span></div>
                </div>
              </div>
            )}

            {/* ── MINIMALIS TEMPLATE ── */}
            {template === 'minimalis' && (
              <div className="w-full text-center text-[0.85em] relative z-10">
                <div className="mb-4">
                  {showLogo && storeSettings?.logo && (
                    <div className="w-10 h-10 mx-auto mb-2 grayscale">
                      <img src={storeSettings.logo} alt="Logo" className="w-full h-full object-contain mx-auto" />
                    </div>
                  )}
                  <h2 className="font-bold text-[1.15em]">{storeSettings?.storeName || 'Toko'}</h2>
                  {storeSettings?.address && <p className="text-[0.9em] opacity-75">{storeSettings.address}</p>}
                </div>
                <div className="border-t border-solid border-black/20 my-3" />
                <div className="opacity-80 flex justify-between font-medium">
                  <span>{format(new Date(transaction.date), 'dd/MM/yyyy')}</span>
                  <span>{transaction.receiptNumber}</span>
                </div>
                <div className="text-left space-y-0.5 mt-1 mb-2 font-medium">
                  <div className="flex justify-between"><span className="opacity-60">Kasir</span><span>{transaction.cashierName || (transaction as any).cashier_name || 'Staff'}</span></div>
                  {transaction.customerName && (
                    <div className="flex justify-between"><span className="opacity-60">Pelanggan</span><span>{transaction.customerName}</span></div>
                  )}
                  {tableVal && (
                    <div className="flex justify-between">
                      <span className="opacity-60">{isTakeAway ? 'Tipe' : 'Meja'}</span>
                      <span>{
                        isTakeAway
                          ? 'Take Away'
                          : String(tableVal).replace(/^(meja\s+)+/i, '')
                      }</span>
                    </div>
                  )}
                </div>
                <div className="border-t border-solid border-black/20 my-3" />
                
                {/* Items */}
                <div className="space-y-1.5 text-left font-medium">
                  {safeItems.map((item: any, i: number) => {
                    const pName = item.productName || item.product_name || 'Produk';
                    let variants = item.selectedVariants || item.selected_variants || [];
                    if (typeof variants === 'string') {
                      try { variants = JSON.parse(variants); } catch (e) { variants = []; }
                    }
                    return (
                      <div key={i} className="flex justify-between">
                        <span className="break-words whitespace-normal text-left pr-2">
                          {item.quantity}x {pName}
                          {Array.isArray(variants) && variants.length > 0 && ` (+${variants.map((v: any) => v.optionName || v.option_name).join(', ')})`}
                          {item.notes && ` (*${item.notes})`}
                        </span>
                        <span className="shrink-0">{rp(item.subtotal)}</span>
                      </div>
                    );
                  })}
                </div>
                
                <div className="border-t border-solid border-black/20 my-3" />
                <div className="space-y-0.5 font-medium">
                  <div className="flex justify-between">
                    <span>Subtotal</span><span>{rp(transaction.subtotal)}</span>
                  </div>
                  {txDiscountAmount > 0 && (
                    <div className="flex justify-between">
                      <span>Diskon</span><span>-{rp(txDiscountAmount)}</span>
                    </div>
                  )}
                  {((transaction.tax_and_service || transaction.taxAndService) > 0) && (
                    <div className="flex justify-between">
                      <span>Biaya Admin</span><span>{rp(transaction.tax_and_service || transaction.taxAndService)}</span>
                    </div>
                  )}
                  <div className="flex justify-between font-bold text-[1.1em] pt-1 mt-1 border-t border-dashed border-gray-300">
                    <span>Total</span><span>{rp(transaction.total)}</span>
                  </div>
                </div>
                <div className="flex justify-between opacity-80 mt-1.5 font-medium">
                  <span>Pembayaran</span><span>{paymentMethodName}</span>
                </div>
                <div className="flex justify-between opacity-80 font-medium">
                  <span>Kembali</span><span>{rp(transaction.change)}</span>
                </div>
              </div>
            )}

            {/* ── Dynamic Footer ── */}
            <div className="border-t border-black mt-4 mb-3 opacity-40" />
            <div className="relative z-10 pt-1 pb-3 space-y-2 text-gray-500 text-[0.85em] text-center">
              {footerOrder.map((block: string, idx: number) => {
                if (block === 'line1' && footerLinesData[0]?.trim()) {
                  return (
                    <p 
                      key={idx} 
                      className="whitespace-pre-wrap leading-relaxed" 
                      style={getFooterStyle('line1')}
                    >
                      {footerLinesData[0].trim()}
                    </p>
                  );
                }
                if (block === 'line2' && footerLinesData[1]?.trim()) {
                  return (
                    <p 
                      key={idx} 
                      className="whitespace-pre-wrap leading-relaxed" 
                      style={getFooterStyle('line2')}
                    >
                      {footerLinesData[1].trim()}
                    </p>
                  );
                }
                if (block === 'image' && footerImgData) {
                  return (
                    <div key={idx} className="my-2.5 text-center">
                      <img 
                        src={footerImgData} 
                        alt="Footer" 
                        className="h-16 w-auto mx-auto object-contain rounded-xl grayscale opacity-75 shadow-sm select-none" 
                        style={{ filter: 'grayscale(1) contrast(1.2)' }}
                      />
                    </div>
                  );
                }
                return null;
              })}
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
