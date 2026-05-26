import { useRef, useState } from 'react';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import html2canvas from 'html2canvas';
import { Download, Share2, Printer, Loader2, ChefHat } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import type { Transaction, StoreSettings, TransactionItemRecord } from '@/hooks/db-hooks';

// Definisi Props khusus untuk Kitchen Receipt (tanpa data pembayaran/harga)
interface KitchenReceiptProps {
  open: boolean;
  onClose: () => void;
  transaction: Transaction;
  items: TransactionItemRecord[];
  storeSettings?: StoreSettings;
}

export default function KitchenReceipt({ open, onClose, transaction, items, storeSettings }: KitchenReceiptProps) {
  const receiptRef = useRef<HTMLDivElement>(null);
  const [generating, setGenerating] = useState<boolean>(false);
  const [printing, setPrinting] = useState<boolean>(false);

  const captureReceipt = async (): Promise<HTMLCanvasElement | null> => {
    if (!receiptRef.current) return null;
    setGenerating(true);
    try {
      const canvas = await html2canvas(receiptRef.current, {
        backgroundColor: '#ffffff',
        scale: 3, // Skala lebih tinggi agar resolusi gambar tajam
        useCORS: true,
        logging: false,
      });
      return canvas;
    } catch {
      toast.error('Gagal membuat gambar struk dapur');
      return null;
    } finally {
      setGenerating(false);
    }
  };

  const handleDownload = async () => {
    const canvas = await captureReceipt();
    if (!canvas) return;
    const link = document.createElement('a');
    link.download = `Dapur-${transaction.receiptNumber}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
    toast.success('Struk Dapur berhasil diunduh');
  };

  const handleShare = async () => {
    const canvas = await captureReceipt();
    if (!canvas) return;

    try {
      const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/png'));
      if (!blob) return;

      if (navigator.share) {
        const file = new File([blob], `Dapur-${transaction.receiptNumber}.png`, { type: 'image/png' });
        await navigator.share({
          title: `Struk Dapur - ${transaction.receiptNumber}`,
          text: `Pesanan Dapur dari ${storeSettings?.storeName || 'Toko'}`,
          files: [file],
        });
      } else {
        // Fallback: buka WhatsApp dengan teks daftar pesanan
        let textList = `*DAPUR: ${storeSettings?.storeName || 'Toko'}*\n`;
        textList += `No: ${transaction.receiptNumber}\n`;
        textList += `Meja: ${transaction.tableNumber || '-'}\n`;
        textList += `Tanggal: ${format(new Date(transaction.date), 'dd MMM yyyy HH:mm', { locale: id })}\n\n`;
        textList += `*PESANAN:*\n`;
        
        items.forEach(item => {
          textList += `- [${item.quantity}x] ${item.productName}\n`;
          if (item.selectedVariants && item.selectedVariants.length > 0) {
            textList += `  + ${item.selectedVariants.map(v => v.optionName).join(', ')}\n`;
          }
          if (item.notes) textList += `  Catatan: ${item.notes}\n`;
        });

        const text = encodeURIComponent(textList);
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
      // @ts-expect-error Web Bluetooth API requires ignoring TS checks here
      const device = await navigator.bluetooth.requestDevice({
        filters: [{ services: ['000018f0-0000-1000-8000-00805f9b34fb'] }],
        optionalServices: ['000018f0-0000-1000-8000-00805f9b34fb'],
      });

      const server = await device.gatt.connect();
      const service = await server.getPrimaryService('000018f0-0000-1000-8000-00805f9b34fb');
      const characteristic = await service.getCharacteristic('00002af1-0000-1000-8000-00805f9b34fb');

      // Build ESC/POS text untuk Dapur
      const encoder = new TextEncoder();
      const lines: string[] = [];
      
      lines.push('\x1B\x40'); // Inisialisasi printer
      lines.push('\x1B\x61\x01'); // Center align
      
      // Header Toko & Label Dapur (Tebal)
      lines.push('\x1B\x45\x01'); // Bold ON
      lines.push(`${storeSettings?.storeName || 'Toko'}\n`);
      lines.push(`*** TIKET DAPUR ***\n`);
      lines.push('\x1B\x45\x00'); // Bold OFF
      
      lines.push('--------------------------------\n');
      lines.push(`No: ${transaction.receiptNumber}\n`);
      lines.push(`${format(new Date(transaction.date), 'dd/MM/yyyy HH:mm')}\n`);
      if (transaction.customerName) lines.push(`Pelanggan: ${transaction.customerName}\n`);
      
      // Meja ditebalkan agar pelayan/koki mudah melihat
      lines.push('\x1B\x45\x01'); // Bold ON
      lines.push(`MEJA: ${transaction.tableNumber || '-'}\n`);
      lines.push('\x1B\x45\x00'); // Bold OFF
      
      lines.push('--------------------------------\n');
      lines.push('\x1B\x61\x00'); // Left align
      
      // Daftar Menu
      for (const item of items) {
        // Nama menu dan kuantitas ditebalkan
        lines.push('\x1B\x45\x01'); // Bold ON
        lines.push(`[${item.quantity}x] ${item.productName}\n`);
        lines.push('\x1B\x45\x00'); // Bold OFF
        
        if (item.selectedVariants && item.selectedVariants.length > 0) {
          lines.push(`  + ${item.selectedVariants.map(v => v.optionName).join(', ')}\n`);
        }
        if (item.notes) {
          lines.push(`  Catatan: ${item.notes}\n`);
        }
        lines.push('\n'); // Spasi antar pesanan
      }
      
      lines.push('--------------------------------\n');
      lines.push('\x1B\x61\x01'); // Center
      lines.push(`-- SELESAI --\n\n\n`);

      const data = encoder.encode(lines.join(''));
      
      // Kirim data ke printer (maks 100 bytes per chunk agar tidak buffer overflow)
      for (let i = 0; i < data.length; i += 100) {
        const chunk = data.slice(i, i + 100);
        await characteristic.writeValue(chunk);
      }

      toast.success('Struk Dapur berhasil dicetak!');
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
      <DialogContent className="max-w-md w-[95vw] max-h-[90vh] overflow-y-auto rounded-2xl p-6 bg-slate-50 border-none">
        <DialogHeader className="mb-2">
          <DialogTitle className="text-center text-slate-800 flex items-center justify-center gap-2">
            <ChefHat className="text-orange-500 w-6 h-6" />
            Tiket Dapur
          </DialogTitle>
        </DialogHeader>

        {/* Preview Struk yang akan di-capture oleh html2canvas */}
        <div 
          ref={receiptRef} 
          className="relative bg-white text-slate-900 p-5 rounded-lg mx-auto shadow-sm border-2 border-slate-200" 
          style={{ width: '300px', fontFamily: "'Courier New', Courier, monospace" }}
        >
          {/* Header Toko & Tipe Struk */}
          <div className="text-center mb-3">
            <p className="font-bold text-sm tracking-widest uppercase">{storeSettings?.storeName || 'Toko'}</p>
            <div className="mt-1.5 text-xs font-black tracking-widest uppercase border border-slate-400 rounded px-2 py-0.5 inline-block">
              TIKET DAPUR
            </div>
          </div>

          <div className="border-t-2 border-dashed border-slate-300 my-3" />

          {/* Info Order: Fokus pada Meja dan Waktu */}
          <div className="text-xs space-y-1">
            <div className="flex justify-between">
              <span className="text-slate-500">No. Order</span>
              <span className="font-bold">{transaction.receiptNumber}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Waktu</span>
              <span>{format(new Date(transaction.date), 'dd/MM/yy HH:mm')}</span>
            </div>
            {transaction.customerName && (
              <div className="flex justify-between">
                <span className="text-slate-500">Pemesan</span>
                <span className="font-semibold">{transaction.customerName}</span>
              </div>
            )}
            <div className="flex justify-between items-center border border-slate-300 p-2 rounded-md mt-2">
              <span className="text-slate-600 font-bold text-xs">MEJA</span>
              <span className="font-black text-lg">{transaction.tableNumber || '-'}</span>
            </div>
          </div>

          <div className="border-t-2 border-dashed border-slate-300 my-3" />

          {/* Daftar Item Dapur - Harga Tidak Ditampilkan */}
          <div className="space-y-4 min-h-[100px]">
            {items.map((item, i) => (
              <div key={i} className="flex gap-2">
                {/* Kuantitas (Besar & Jelas) */}
                <div className="font-black text-base w-7 shrink-0">
                  {item.quantity}x
                </div>
                {/* Nama Menu & Detail */}
                <div className="flex-1">
                  <span className="font-bold text-sm uppercase leading-tight block">
                    {item.productName}
                  </span>
                  
                  {item.selectedVariants && item.selectedVariants.length > 0 && (
                    <div className="text-[11px] text-slate-500 font-medium mt-0.5">
                      + {item.selectedVariants.map(v => v.optionName).join(', ')}
                    </div>
                  )}
                  
                  {item.notes && (
                    <div className="text-[11px] italic text-slate-600 mt-0.5">
                      📝 {item.notes}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="border-t-2 border-dashed border-slate-300 mt-4 mb-2" />

          {/* Footer */}
          <p className="text-center text-[10px] text-slate-400 font-bold uppercase tracking-widest">
            -- SELESAI --
          </p>
        </div>

        {/* Tombol Aksi */}
        <div className="grid grid-cols-3 gap-3 mt-4">
          <Button 
            variant="outline" 
            className="flex flex-col items-center gap-2 h-auto py-3.5 bg-white hover:bg-slate-50 border-slate-200" 
            onClick={handleDownload} 
            disabled={generating || printing}
          >
            {generating ? <Loader2 className="w-5 h-5 animate-spin text-orange-500" /> : <Download className="w-5 h-5 text-slate-600" />}
            <span className="text-[11px] font-medium text-slate-600">Unduh</span>
          </Button>

          <Button 
            variant="outline" 
            className="flex flex-col items-center gap-2 h-auto py-3.5 bg-white hover:bg-slate-50 border-slate-200" 
            onClick={handleShare} 
            disabled={generating || printing}
          >
            {generating ? <Loader2 className="w-5 h-5 animate-spin text-orange-500" /> : <Share2 className="w-5 h-5 text-slate-600" />}
            <span className="text-[11px] font-medium text-slate-600">WA Dapur</span>
          </Button>

          <Button 
            variant="outline" 
            className="flex flex-col items-center gap-2 h-auto py-3.5 bg-white hover:bg-slate-50 border-slate-200" 
            onClick={handleBluetoothPrint} 
            disabled={generating || printing}
          >
            {printing ? <Loader2 className="w-5 h-5 animate-spin text-orange-500" /> : <Printer className="w-5 h-5 text-slate-600" />}
            <span className="text-[11px] font-medium text-slate-600">Cetak</span>
          </Button>
        </div>

        <Button 
          variant="secondary" 
          className="w-full mt-2 rounded-xl py-5 font-bold shadow-sm" 
          onClick={onClose}
        >
          Tutup
        </Button>
      </DialogContent>
    </Dialog>
  );
}
