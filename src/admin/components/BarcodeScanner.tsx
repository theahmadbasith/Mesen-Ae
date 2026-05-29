import { useEffect, useRef, useState } from 'react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { X, Camera, CameraOff, ZapIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';

interface BarcodeScannerProps {
  open: boolean;
  onClose: () => void;
  onScan: (barcode: string) => void;
}

export default function BarcodeScanner({ open, onClose, onScan }: BarcodeScannerProps) {
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const [hasFlash, setHasFlash] = useState(false);
  const [flashOn, setFlashOn] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [cameras, setCameras] = useState<{ id: string; label: string }[]>([]);
  const [activeCameraIdx, setActiveCameraIdx] = useState(0);
  const scannerId = 'barcode-scanner-view';

  const stopScanner = async () => {
    if (scannerRef.current) {
      try {
        if (scannerRef.current.isScanning) {
          await scannerRef.current.stop();
        }
        scannerRef.current.clear();
      } catch {
        // ignore stop errors
      }
      scannerRef.current = null;
    }
    setScanning(false);
    setHasFlash(false);
    setFlashOn(false);
  };

  const startScanner = async (cameraId?: string) => {
    await stopScanner();

    // Small delay to let DOM settle after stop
    await new Promise(r => setTimeout(r, 150));

    try {
      const scanner = new Html5Qrcode(scannerId, {
        formatsToSupport: [
          Html5QrcodeSupportedFormats.EAN_13,
          Html5QrcodeSupportedFormats.EAN_8,
          Html5QrcodeSupportedFormats.UPC_A,
          Html5QrcodeSupportedFormats.UPC_E,
          Html5QrcodeSupportedFormats.CODE_128,
          Html5QrcodeSupportedFormats.CODE_39,
          Html5QrcodeSupportedFormats.ITF,
          Html5QrcodeSupportedFormats.CODE_93,
          Html5QrcodeSupportedFormats.QR_CODE,
          Html5QrcodeSupportedFormats.DATA_MATRIX,
        ],
        verbose: false,
      });

      scannerRef.current = scanner;

      const cameraConstraint = cameraId
        ? cameraId
        : { facingMode: { ideal: 'environment' } };

      await scanner.start(
        cameraConstraint as Parameters<typeof scanner.start>[0],
        {
          fps: 15,
          qrbox: { width: 260, height: 160 },
          aspectRatio: 1.5,
          disableFlip: false,
        },
        (decodedText) => {
          onScan(decodedText);
          stopScanner();
        },
        () => {}
      );

      setScanning(true);

      // Check torch capability
      try {
        const track = scanner.getRunningTrackCameraCapabilities();
        if (track && 'torchFeature' in track) {
          setHasFlash(true);
        }
      } catch {
        // torch not available
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes('NotAllowedError') || msg.includes('Permission')) {
        toast.error('Izin kamera ditolak. Mohon izinkan akses kamera di pengaturan browser.');
      } else if (msg.includes('NotFoundError') || msg.includes('Requested device not found')) {
        toast.error('Kamera tidak ditemukan di perangkat ini.');
      } else if (msg.includes('NotReadableError') || msg.includes('Could not start')) {
        toast.error('Kamera sedang digunakan aplikasi lain.');
      } else {
        toast.error('Gagal memulai kamera. Coba izinkan akses kamera.');
      }
      onClose();
    }
  };

  useEffect(() => {
    if (!open) {
      stopScanner();
      return;
    }

    // Enumerate cameras first
    Html5Qrcode.getCameras()
      .then((devices) => {
        if (devices && devices.length > 0) {
          setCameras(devices);
          // Prefer rear camera (environment)
          const rearIdx = devices.findIndex(d =>
            d.label.toLowerCase().includes('back') ||
            d.label.toLowerCase().includes('rear') ||
            d.label.toLowerCase().includes('environment') ||
            d.label.toLowerCase().includes('belakang')
          );
          const idx = rearIdx >= 0 ? rearIdx : 0;
          setActiveCameraIdx(idx);
          startScanner(devices[idx].id);
        } else {
          // No enumerated cameras, try environment facing mode directly
          startScanner();
        }
      })
      .catch(() => {
        // getCameras failed (e.g. permission not yet granted), try directly
        startScanner();
      });

    return () => {
      stopScanner();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const switchCamera = async () => {
    if (cameras.length < 2) return;
    const nextIdx = (activeCameraIdx + 1) % cameras.length;
    setActiveCameraIdx(nextIdx);
    await startScanner(cameras[nextIdx].id);
  };

  const toggleFlash = async () => {
    if (!scannerRef.current) return;
    try {
      const track = scannerRef.current.getRunningTrackCameraCapabilities();
      if (track && 'torchFeature' in track) {
        const torch = (track as unknown as { torchFeature: () => { apply: (on: boolean) => Promise<void> } }).torchFeature();
        await torch.apply(!flashOn);
        setFlashOn(!flashOn);
      }
    } catch {
      toast.error('Flash tidak didukung di perangkat ini');
    }
  };

  const handleClose = async () => {
    await stopScanner();
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) handleClose(); }}>
      <DialogContent className="max-w-[92vw] sm:max-w-[480px] rounded-2xl p-0 overflow-hidden border border-border bg-background shadow-2xl z-[100] [&>button]:z-[115] [&>button]:text-white [&>button]:hover:text-white/80 [&>button]:top-3 [&>button]:right-3">
        <style dangerouslySetInnerHTML={{__html: `
          @keyframes scan-animation {
            0% { top: 0; opacity: 0; }
            10% { opacity: 1; }
            90% { opacity: 1; }
            100% { top: 100%; opacity: 0; }
          }
          .scanner-line {
            animation: scan-animation 2s infinite linear;
          }
        `}} />

        {/* ── Header ── */}
        <div className="bg-gradient-to-br from-primary to-primary/80 p-4 text-white relative overflow-hidden text-left">
          <div className="absolute -right-8 -top-8 w-24 h-24 bg-white/10 rounded-full blur-2xl pointer-events-none" />
          <DialogHeader className="relative z-10 text-left">
            <DialogTitle className="text-white text-base font-bold flex items-center gap-2 tracking-tight">
              <Camera className="w-5 h-5" />
              Scan Barcode Produk
            </DialogTitle>
            <DialogDescription className="text-white/80 text-xs mt-0.5">
              Arahkan barcode / SKU barang ke dalam kotak kamera
            </DialogDescription>
          </DialogHeader>
        </div>

        {/* ── Camera Preview & Neon Cutout Overlay ── */}
        <div className="relative bg-black aspect-[4/3] w-full overflow-hidden">
          {/* Scanner viewport injected by html5-qrcode */}
          <div id={scannerId} className="w-full h-full [&>video]:object-cover" />

          {/* Action buttons (Top-Left) */}
          <div className="absolute top-4 left-4 z-30 flex gap-2">
            {hasFlash && (
              <Button
                type="button"
                size="icon"
                variant="secondary"
                onClick={toggleFlash}
                className="rounded-full w-10 h-10 bg-black/45 hover:bg-black/60 backdrop-blur-md border border-white/10 text-white shadow-xl transition-all active:scale-95"
              >
                <ZapIcon className={`w-5 h-5 ${flashOn ? 'text-yellow-400' : 'text-white'}`} />
              </Button>
            )}
            {cameras.length > 1 && (
              <Button
                type="button"
                size="icon"
                variant="secondary"
                onClick={switchCamera}
                className="rounded-full w-10 h-10 bg-black/45 hover:bg-black/60 backdrop-blur-md border border-white/10 text-white shadow-xl transition-all active:scale-95"
                title="Ganti Kamera"
              >
                <Camera className="w-5 h-5 text-white" />
              </Button>
            )}
          </div>

          {/* ── Premium Neon Laser Cutout Overlay ── */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
            {/* Dark background overlay with light blur */}
            <div className="absolute inset-0 bg-black/40 backdrop-blur-[1px]" />
            
            {/* Cutout box (Barcodes are wide, so we make it rectangular: 280x165) */}
            <div className="relative w-[280px] h-[165px] shadow-[0_0_0_9999px_rgba(0,0,0,0.5)] rounded-2xl overflow-hidden">
              {/* Sliding Neon Laser Line */}
              <div className="absolute left-0 right-0 h-0.5 bg-primary/80 shadow-[0_0_8px_2px_hsl(var(--primary)/0.6)] scanner-line z-10" />

              {/* Corner Notches */}
              <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-primary rounded-tl-2xl z-20" />
              <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-primary rounded-tr-2xl z-20" />
              <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-primary rounded-bl-2xl z-20" />
              <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-primary rounded-br-2xl z-20" />
              
              {/* Inner Pulsing Border */}
              <div className="w-full h-full border border-white/10 rounded-2xl animate-pulse" />
            </div>
          </div>

          {/* Bottom Floating Hint */}
          <div className="absolute bottom-6 left-0 right-0 flex justify-center pointer-events-none z-20">
            <span className="bg-black/75 backdrop-blur-md text-white text-xs font-semibold px-4 py-2 rounded-full shadow-lg border border-white/10">
              Posisikan Barcode di tengah kotak
            </span>
          </div>
        </div>

        {/* ── Footer Cancel Button ── */}
        <div className="p-4 bg-muted/20 border-t border-border/50">
          <Button 
            variant="outline" 
            className="w-full h-11 font-bold text-sm rounded-xl border-border/70 shadow-sm active:scale-95 transition-all" 
            onClick={handleClose}
          >
            <CameraOff className="w-4 h-4 mr-2" />
            Batal Memindai
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
