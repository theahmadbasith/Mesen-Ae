import { useRef, useState } from 'react';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import html2canvas from 'html2canvas';
import { Download, Share2, Printer, Loader2, Flame, Tag, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import type { Transaction, StoreSettings, TransactionItemRecord } from '@/hooks/db-hooks';
import { cn } from '@/lib/utils';

interface KitchenReceiptModalProps {
  open: boolean;
  onClose: () => void;
  transaction: Transaction;
  items: TransactionItemRecord[];
  storeSettings?: StoreSettings;
  /** Jika ada item varian, parent bisa passing callback ini untuk tampilkan modal label varian */
  onOpenVariantLabels?: () => void;
}

export default function KitchenReceiptModal({ open, onClose, transaction, items, storeSettings, onOpenVariantLabels }: KitchenReceiptModalProps) {
  const receiptRef = useRef<HTMLDivElement>(null);
  const [generating, setGenerating] = useState<boolean>(false);
  const [printing, setPrinting] = useState<boolean>(false);

  const captureReceipt = async (): Promise<HTMLCanvasElement | null> => {
    if (!receiptRef.current) return null;
    setGenerating(true);
    try {
      const canvas = await html2canvas(receiptRef.current, {
        backgroundColor: '#ffffff',
        scale: 3, 
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
    link.download = `Tiket-Dapur-${transaction.receiptNumber}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
    toast.success('Tiket berhasil diunduh');
  };

  const handleShare = async () => {
    const canvas = await captureReceipt();
    if (!canvas) return;

    try {
      const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/png'));
      if (!blob) return;

      if (navigator.share) {
        const file = new File([blob], `Tiket-Dapur-${transaction.receiptNumber}.png`, { type: 'image/png' });
        await navigator.share({
          title: `Tiket Dapur - ${transaction.receiptNumber}`,
          text: `Pesanan Dapur: ${storeSettings?.storeName || 'Resto'}`,
          files: [file],
        });
      } else {
        let textList = `*DAPUR: ${storeSettings?.storeName || 'Resto'}*\n`;
        textList += `No: ${transaction.receiptNumber}\n`;
        textList += `Meja: ${transaction.tableNumber || '-'}\n`;
        textList += `Waktu: ${format(new Date(transaction.date), 'HH:mm - dd MMM', { locale: id })}\n\n`;
        textList += `*RINCIAN PESANAN:*\n`;
        
        items.forEach(item => {
          textList += `- [${item.quantity}x] ${item.productName}\n`;
          if (item.selectedVariants && item.selectedVariants.length > 0) {
            textList += `  + ${item.selectedVariants.map(v => v.optionName).join(', ')}\n`;
          }
          if (item.notes) textList += `  📝 ${item.notes}\n`;
        });

        const text = encodeURIComponent(textList);
        window.open(`https://wa.me/?text=${text}`, '_blank');
      }
    } catch (err: unknown) {
      if (err instanceof Error && err.name !== 'AbortError') {
        toast.error('Gagal membagikan tiket');
      }
    }
  };

  const handleBluetoothPrint = async () => {
    if (!('bluetooth' in navigator)) {
      toast.error('Bluetooth API tidak didukung di browser ini.');
      return;
    }

    setPrinting(true);
    try {
      toast.info('Menyambungkan ke Printer Dapur...');
      // @ts-expect-error Web Bluetooth API
      const device = await navigator.bluetooth.requestDevice({
        filters: [{ services: ['000018f0-0000-1000-8000-00805f9b34fb'] }],
        optionalServices: ['000018f0-0000-1000-8000-00805f9b34fb'],
      });

      const server = await device.gatt.connect();
      const service = await server.getPrimaryService('000018f0-0000-1000-8000-00805f9b34fb');
      const characteristic = await service.getCharacteristic('00002af1-0000-1000-8000-00805f9b34fb');

      const encoder = new TextEncoder();
      const lines: string[] = [];
      
      lines.push('\x1B\x40'); // Init
      lines.push('\x1B\x61\x01'); // Align center
      
      lines.push('\x1B\x45\x01'); // Bold on
      lines.push(`${storeSettings?.storeName || 'RESTO'}\n`);
      lines.push(`*** TIKET DAPUR ***\n`);
      lines.push('\x1B\x45\x00'); // Bold off
      
      lines.push('--------------------------------\n');
      lines.push(`No: ${transaction.receiptNumber}\n`);
      lines.push(`Tgl: ${format(new Date(transaction.date), 'dd/MM/yyyy HH:mm')}\n`);
      
      lines.push('\x1B\x45\x01'); // Bold on
      lines.push(`MEJA: ${transaction.tableNumber || 'Bawa Pulang'}\n`);
      lines.push('\x1B\x45\x00'); // Bold off
      
      lines.push('--------------------------------\n');
      lines.push('\x1B\x61\x00'); // Align left
      
      for (const item of items) {
        lines.push('\x1B\x45\x01'); // Bold on
        lines.push(`[${item.quantity}x] ${item.productName}\n`);
        lines.push('\x1B\x45\x00'); // Bold off
        
        if (item.selectedVariants && item.selectedVariants.length > 0) {
          lines.push(`  + ${item.selectedVariants.map(v => v.optionName).join(', ')}\n`);
        }
        if (item.notes) {
          lines.push(`  Ket: ${item.notes}\n`);
        }
        lines.push('\n');
      }
      
      lines.push('--------------------------------\n');
      lines.push('\x1B\x61\x01'); // Align center
      lines.push(`-- SELESAI --\n\n\n`);

      const data = encoder.encode(lines.join(''));
      
      for (let i = 0; i < data.length; i += 100) {
        const chunk = data.slice(i, i + 100);
        await characteristic.writeValue(chunk);
      }

      toast.success('Tiket berhasil dicetak di Dapur!');
      await server.disconnect();
    } catch (err: unknown) {
      if (err instanceof Error && err.name !== 'NotFoundError') {
        toast.error('Koneksi printer gagal atau terputus.');
      }
    } finally {
      setPrinting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-md w-[95vw] max-h-[90vh] overflow-y-auto rounded-3xl p-6 bg-background border border-primary/20 shadow-2xl">
        <DialogHeader className="mb-4">
          <DialogTitle className="text-center text-foreground flex items-center justify-center gap-2 text-xl font-black tracking-tight">
            <Flame className="text-primary w-6 h-6" />
            TIKET DAPUR
          </DialogTitle>
        </DialogHeader>

        {/* ── Area Kertas Struk ── */}
        <div 
          ref={receiptRef} 
          className="relative bg-white text-black p-5 rounded-md mx-auto shadow-sm" 
          style={{ width: '300px', fontFamily: "'Courier New', Courier, monospace" }}
        >
          {/* Header */}
          <div className="text-center mb-3">
            <h1 className="font-extrabold text-base tracking-widest uppercase">{storeSettings?.storeName || 'RESTO'}</h1>
            <div className="inline-block mt-2 px-3 py-1 bg-black text-white font-black text-xs tracking-widest rounded-full uppercase">
              TIKET DAPUR
            </div>
          </div>

          <div className="border-t-2 border-dashed border-zinc-300 my-3" />

          {/* Info */}
          <div className="text-xs space-y-1 font-bold">
            <div className="flex justify-between">
              <span className="text-zinc-500">Order</span>
              <span>{transaction.receiptNumber}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-500">Waktu</span>
              <span>{format(new Date(transaction.date), 'dd/MM/yy HH:mm')}</span>
            </div>
            {transaction.customerName && (
              <div className="flex justify-between">
                <span className="text-zinc-500">Pemesan</span>
                <span className="font-black uppercase truncate max-w-[130px]">{transaction.customerName}</span>
              </div>
            )}
            <div className="flex justify-between items-center bg-zinc-100 border border-zinc-200 p-2 rounded mt-2">
              <span className="text-zinc-600">MEJA</span>
              <span className="font-black text-xl">
                {transaction.tableNumber ? transaction.tableNumber : <span className="text-base">Bawa Pulang</span>}
              </span>
            </div>
          </div>

          <div className="border-t-2 border-dashed border-zinc-300 my-3" />

          {/* Items */}
          <div className="space-y-3 min-h-[100px]">
            {items.map((item, i) => (
              <div key={i} className="flex gap-2">
                <div className="font-black text-base w-7 shrink-0">
                  {item.quantity}x
                </div>
                <div className="flex-1">
                  <span className="font-extrabold text-sm uppercase leading-tight block">
                    {item.productName}
                  </span>
                  
                  {item.selectedVariants && item.selectedVariants.length > 0 && (
                    <div className="text-[11px] text-zinc-600 font-semibold mt-0.5">
                      + {item.selectedVariants.map(v => v.optionName).join(', ')}
                    </div>
                  )}
                  
                  {item.notes && (
                    <div className="text-[11px] font-bold italic text-black bg-zinc-100 border border-zinc-200 inline-block px-1.5 py-0.5 rounded mt-1">
                      Catatan: {item.notes}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="border-t-2 border-dashed border-zinc-300 mt-4 mb-2" />
          <p className="text-center text-[10px] text-zinc-400 font-bold uppercase tracking-widest">
            -- SELESAI --
          </p>
        </div>

        {/* ── Action Buttons ── */}
        <div className="grid grid-cols-2 gap-3 mb-3 mt-6">
          <Button 
            variant="outline" 
            className="flex flex-col items-center gap-2 h-16 bg-card border-border hover:bg-muted hover:border-primary/50 text-muted-foreground hover:text-primary rounded-2xl transition-all shadow-sm"
            onClick={handleDownload} 
            disabled={downloading || printing}
          >
            {downloading ? <Loader2 className="w-5 h-5 animate-spin text-primary" /> : <Download className="w-5 h-5 text-muted-foreground" />}
            <span className="text-[10px] font-bold uppercase tracking-wider">Unduh</span>
          </Button>
          
          <Button 
            variant="outline" 
            className="flex flex-col items-center gap-2 h-16 bg-primary border border-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/30 rounded-2xl transition-all"
            onClick={handleBluetoothPrint} 
            disabled={downloading || printing}
          >
            {printing ? <Loader2 className="w-5 h-5 animate-spin text-primary-foreground" /> : <Printer className="w-5 h-5 text-primary-foreground" />}
            <span className="text-[10px] font-bold uppercase tracking-wider">Cetak ESC/POS</span>
          </Button>
        </div>

        {onOpenVariantLabels && items.some(it => it.selectedVariants && it.selectedVariants.length > 0) && (
          <Button 
            variant="outline" 
            className="w-full bg-card hover:bg-muted text-foreground border border-border hover:border-primary/50 rounded-2xl py-6 font-bold shadow-sm transition-all group"
            onClick={() => { onClose(); onOpenVariantLabels(); }}
          >
            <Tag className="w-4 h-4 mr-2 text-primary group-hover:text-primary" />
            Buka Label Varian ({items.filter(it => it.selectedVariants && it.selectedVariants.length > 0).length} Item)
          </Button>
        )}

        <Button 
          variant="ghost" 
          className="w-full mt-2 rounded-xl py-5 font-bold text-muted-foreground hover:text-foreground hover:bg-muted flex items-center justify-center gap-2 transition-all" 
          onClick={onClose}
        >
          <X className="w-4 h-4" />
          Tutup Modal
        </Button>
      </DialogContent>
    </Dialog>
  );
}
