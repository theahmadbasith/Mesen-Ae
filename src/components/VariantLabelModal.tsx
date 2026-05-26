import { useRef, useState } from 'react';
import html2canvas from 'html2canvas';
import { Download, Printer, Loader2, Tag, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import type { TransactionItemRecord, Transaction, StoreSettings } from '@/hooks/db-hooks';

interface VariantLabelModalProps {
  open: boolean;
  onClose: () => void;
  /** Hanya item yang punya selectedVariants yang masuk sini */
  items: TransactionItemRecord[];
  transaction: Transaction;
  storeSettings?: StoreSettings;
}

/** Satu Label kecil untuk satu item (dapat di-capture dengan html2canvas) */
function LabelCard({
  item,
  transaction,
  storeSettings,
  labelRef,
}: {
  item: TransactionItemRecord;
  transaction: Transaction;
  storeSettings?: StoreSettings;
  labelRef: React.RefObject<HTMLDivElement>;
}) {
  return (
    <div
      ref={labelRef}
      className="bg-white text-black rounded-lg border-2 border-black mx-auto"
      style={{
        width: '240px',
        fontFamily: "'Courier New', Courier, monospace",
        padding: '12px',
      }}
    >
      {/* Header toko kecil */}
      <div className="text-center border-b border-dashed border-gray-400 pb-2 mb-2">
        <p className="font-black text-[10px] uppercase tracking-widest">{storeSettings?.storeName || 'CAFE'}</p>
      </div>

      {/* Nama Produk */}
      <p className="font-black text-sm uppercase leading-tight text-center mb-2">
        {item.productName}
      </p>

      {/* Varian */}
      <div className="space-y-1 mb-2">
        {item.selectedVariants?.map((v, idx) => (
          <div key={idx} className="flex items-start gap-1">
            <span className="text-[9px] font-bold text-gray-500 uppercase shrink-0 mt-0.5">{v.groupName}:</span>
            <span className="text-[11px] font-black text-black leading-tight">{v.optionName}</span>
          </div>
        ))}
      </div>

      {/* Catatan */}
      {item.notes && (
        <div className="bg-gray-100 rounded px-2 py-1 mb-2">
          <p className="text-[10px] font-bold italic text-gray-700">📝 {item.notes}</p>
        </div>
      )}

      {/* Info meja / qty */}
      <div className="border-t border-dashed border-gray-400 pt-2 flex justify-between items-center">
        <span className="text-[9px] text-gray-500 font-bold">
          {transaction.tableNumber ? `Meja ${transaction.tableNumber}` : 'Bawa Pulang'}
        </span>
        <span className="font-black text-xs bg-black text-white px-2 py-0.5 rounded">
          x{item.quantity}
        </span>
      </div>
    </div>
  );
}

export default function VariantLabelModal({
  open,
  onClose,
  items,
  transaction,
  storeSettings,
}: VariantLabelModalProps) {
  // Hanya tampilkan item yang punya varian
  const variantItems = items.filter(
    (it) => it.selectedVariants && it.selectedVariants.length > 0
  );

  const [currentIdx, setCurrentIdx] = useState(0);
  const [downloading, setDownloading] = useState(false);
  const [printing, setPrinting] = useState(false);
  const labelRef = useRef<HTMLDivElement>(null);

  const currentItem = variantItems[currentIdx];
  const total = variantItems.length;

  /** Capture canvas dari label card */
  const captureLabel = async (): Promise<HTMLCanvasElement | null> => {
    if (!labelRef.current) return null;
    try {
      return await html2canvas(labelRef.current, {
        backgroundColor: '#ffffff',
        scale: 4,
        useCORS: true,
        logging: false,
      });
    } catch {
      toast.error('Gagal membuat gambar label');
      return null;
    }
  };

  /** Download label item ini sebagai PNG */
  const handleDownloadSingle = async () => {
    setDownloading(true);
    try {
      const canvas = await captureLabel();
      if (!canvas) return;
      const link = document.createElement('a');
      link.download = `Label-${currentItem.productName.replace(/\s+/g, '-')}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
      toast.success('Label berhasil diunduh');
    } finally {
      setDownloading(false);
    }
  };

  /** Cetak label via Bluetooth ESC/POS thermal printer */
  const handleBluetoothPrint = async () => {
    if (!('bluetooth' in navigator)) {
      toast.error('Bluetooth tidak tersedia. Gunakan Chrome di Android.');
      return;
    }
    setPrinting(true);
    try {
      toast.info('Mencari printer Bluetooth...');
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
      lines.push('\x1B\x61\x01'); // Center

      // Nama toko kecil
      lines.push(`${storeSettings?.storeName || 'CAFE'}\n`);
      lines.push('------------------------\n');

      // Nama produk tebal
      lines.push('\x1B\x45\x01'); // Bold ON
      lines.push(`${currentItem.productName.toUpperCase()}\n`);
      lines.push('\x1B\x45\x00'); // Bold OFF

      lines.push('\x1B\x61\x00'); // Left

      // Varian
      if (currentItem.selectedVariants && currentItem.selectedVariants.length > 0) {
        currentItem.selectedVariants.forEach((v) => {
          lines.push(`${v.groupName}: `);
          lines.push('\x1B\x45\x01'); // Bold ON
          lines.push(`${v.optionName}\n`);
          lines.push('\x1B\x45\x00'); // Bold OFF
        });
      }

      // Catatan
      if (currentItem.notes) {
        lines.push(`Ket: ${currentItem.notes}\n`);
      }

      lines.push('------------------------\n');
      lines.push('\x1B\x61\x01'); // Center
      lines.push(
        `${transaction.tableNumber ? `Meja ${transaction.tableNumber}` : 'Bawa Pulang'}  |  x${currentItem.quantity}\n`
      );
      lines.push('\n\n'); // Feed paper

      const data = encoder.encode(lines.join(''));
      for (let i = 0; i < data.length; i += 100) {
        await characteristic.writeValue(data.slice(i, i + 100));
      }

      toast.success(`Label "${currentItem.productName}" berhasil dicetak!`);
      await server.disconnect();
    } catch (err: unknown) {
      if (err instanceof Error && err.name !== 'NotFoundError') {
        toast.error('Gagal cetak. Pastikan printer Bluetooth menyala.');
      }
    } finally {
      setPrinting(false);
    }
  };

  /** Cetak SEMUA label item sekaligus via Bluetooth */
  const handlePrintAll = async () => {
    if (!('bluetooth' in navigator)) {
      toast.error('Bluetooth tidak tersedia. Gunakan Chrome di Android.');
      return;
    }
    setPrinting(true);
    try {
      toast.info('Mencari printer Bluetooth...');
      // @ts-expect-error Web Bluetooth API
      const device = await navigator.bluetooth.requestDevice({
        filters: [{ services: ['000018f0-0000-1000-8000-00805f9b34fb'] }],
        optionalServices: ['000018f0-0000-1000-8000-00805f9b34fb'],
      });

      const server = await device.gatt.connect();
      const service = await server.getPrimaryService('000018f0-0000-1000-8000-00805f9b34fb');
      const characteristic = await service.getCharacteristic('00002af1-0000-1000-8000-00805f9b34fb');

      const encoder = new TextEncoder();

      for (const item of variantItems) {
        const lines: string[] = [];

        lines.push('\x1B\x40'); // Init
        lines.push('\x1B\x61\x01'); // Center
        lines.push(`${storeSettings?.storeName || 'CAFE'}\n`);
        lines.push('------------------------\n');
        lines.push('\x1B\x45\x01'); // Bold ON
        lines.push(`${item.productName.toUpperCase()}\n`);
        lines.push('\x1B\x45\x00'); // Bold OFF
        lines.push('\x1B\x61\x00'); // Left

        if (item.selectedVariants && item.selectedVariants.length > 0) {
          item.selectedVariants.forEach((v) => {
            lines.push(`${v.groupName}: `);
            lines.push('\x1B\x45\x01');
            lines.push(`${v.optionName}\n`);
            lines.push('\x1B\x45\x00');
          });
        }
        if (item.notes) {
          lines.push(`Ket: ${item.notes}\n`);
        }

        lines.push('------------------------\n');
        lines.push('\x1B\x61\x01'); // Center
        lines.push(
          `${transaction.tableNumber ? `Meja ${transaction.tableNumber}` : 'Bawa Pulang'}  |  x${item.quantity}\n`
        );
        lines.push('\n\n');

        const data = encoder.encode(lines.join(''));
        for (let i = 0; i < data.length; i += 100) {
          await characteristic.writeValue(data.slice(i, i + 100));
          await new Promise((r) => setTimeout(r, 20)); // kecil delay antar chunk
        }
        // Delay antar label agar tidak overlap
        await new Promise((r) => setTimeout(r, 200));
      }

      toast.success(`Semua ${variantItems.length} label berhasil dicetak!`);
      await server.disconnect();
    } catch (err: unknown) {
      if (err instanceof Error && err.name !== 'NotFoundError') {
        toast.error('Gagal cetak. Pastikan printer Bluetooth menyala.');
      }
    } finally {
      setPrinting(false);
    }
  };

  if (variantItems.length === 0) return null;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-sm w-[95vw] max-h-[90vh] overflow-y-auto rounded-3xl p-6 bg-background border border-amber-500/20 shadow-2xl">
        <DialogHeader className="mb-4">
          <DialogTitle className="text-center text-foreground flex items-center justify-center gap-2 text-lg font-black tracking-tight">
            <Tag className="text-amber-500 w-5 h-5" />
            Label Varian
          </DialogTitle>
        </DialogHeader>

        {/* Counter item */}
        <div className="flex items-center justify-between mb-4">
          <Badge className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 font-bold text-xs px-3">
            {currentIdx + 1} / {total} Item
          </Badge>
          <span className="text-xs text-muted-foreground font-medium">
            {transaction.tableNumber ? `Meja ${transaction.tableNumber}` : 'Bawa Pulang'}
          </span>
        </div>

        {/* Label Preview */}
        <div className="flex items-center gap-2 mb-5">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 shrink-0 text-muted-foreground hover:text-foreground hover:bg-muted rounded-xl disabled:opacity-30"
            disabled={currentIdx === 0}
            onClick={() => setCurrentIdx((i) => i - 1)}
          >
            <ChevronLeft className="w-5 h-5" />
          </Button>

          <div className="flex-1 overflow-hidden">
            <LabelCard
              item={currentItem}
              transaction={transaction}
              storeSettings={storeSettings}
              labelRef={labelRef as React.RefObject<HTMLDivElement>}
            />
          </div>

          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 shrink-0 text-muted-foreground hover:text-foreground hover:bg-muted rounded-xl disabled:opacity-30"
            disabled={currentIdx === total - 1}
            onClick={() => setCurrentIdx((i) => i + 1)}
          >
            <ChevronRight className="w-5 h-5" />
          </Button>
        </div>

        {/* Dot Indicators */}
        {total > 1 && (
          <div className="flex justify-center gap-1.5 mb-5">
            {variantItems.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setCurrentIdx(idx)}
                className={`w-2 h-2 rounded-full transition-all ${
                  idx === currentIdx
                    ? 'bg-amber-500 w-4'
                    : 'bg-muted-foreground/30 hover:bg-muted-foreground/60'
                }`}
              />
            ))}
          </div>
        )}

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-3 mb-3">
          <Button
            variant="outline"
            className="flex flex-col items-center gap-2 h-16 bg-card border border-border hover:bg-muted hover:border-amber-500/50 text-muted-foreground hover:text-foreground rounded-2xl transition-all shadow-sm"
            onClick={handleDownloadSingle}
            disabled={downloading || printing}
          >
            {downloading ? (
              <Loader2 className="w-5 h-5 animate-spin text-amber-500" />
            ) : (
              <Download className="w-5 h-5 text-muted-foreground" />
            )}
            <span className="text-[10px] font-bold uppercase tracking-wider">Unduh Label</span>
          </Button>

          <Button
            variant="outline"
            className="flex flex-col items-center gap-2 h-16 bg-amber-600 border border-amber-500 hover:bg-amber-500 text-white shadow-lg shadow-amber-500/30 rounded-2xl transition-all"
            onClick={handleBluetoothPrint}
            disabled={downloading || printing}
          >
            {printing ? (
              <Loader2 className="w-5 h-5 animate-spin text-white" />
            ) : (
              <Printer className="w-5 h-5 text-white" />
            )}
            <span className="text-[10px] font-bold uppercase tracking-wider">Cetak Label</span>
          </Button>
        </div>

        {/* Print All Button */}
        {total > 1 && (
          <Button
            className="w-full bg-card hover:bg-muted text-foreground border border-border hover:border-amber-500/50 rounded-2xl py-5 font-bold transition-all shadow-sm"
            onClick={handlePrintAll}
            disabled={downloading || printing}
          >
            {printing ? (
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
            ) : (
              <Printer className="w-4 h-4 mr-2" />
            )}
            Cetak Semua {total} Label Sekaligus
          </Button>
        )}

        {/* Close */}
        <Button
          variant="ghost"
          className="w-full mt-2 rounded-xl py-5 font-bold text-muted-foreground hover:text-foreground hover:bg-muted flex items-center gap-2 transition-all"
          onClick={onClose}
        >
          <X className="w-4 h-4" />
          Tutup
        </Button>
      </DialogContent>
    </Dialog>
  );
}
