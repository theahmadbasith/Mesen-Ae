import { useEffect, useRef, useState } from 'react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { CameraOff, SwitchCamera, Barcode } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { toast } from 'sonner';

interface BarcodeScannerProps {
  open: boolean;
  onClose: () => void;
  onScan: (barcode: string) => void;
}

export default function BarcodeScanner({ open, onClose, onScan }: BarcodeScannerProps) {
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const [scanning, setScanning] = useState(false);
  const [cameras, setCameras] = useState<{ id: string; label: string }[]>([]);
  const [activeCameraIdx, setActiveCameraIdx] = useState(0);
  const [isInitializing, setIsInitializing] = useState(false);
  
  const scannerId = 'barcode-scanner-view';

  const stopScanner = async () => {
    if (scannerRef.current) {
      try {
        if (scannerRef.current.getState() === 2) {
          await scannerRef.current.stop();
        }
        scannerRef.current.clear();
      } catch (error) {
        console.warn("Cleanup error:", error);
      }
      scannerRef.current = null;
    }
    setScanning(false);
    setIsInitializing(false);
  };

  const startScanner = async (cameraId?: string) => {
    await stopScanner();
    setIsInitializing(true);

    await new Promise(resolve => setTimeout(resolve, 150));

    try {
      const scanner = new Html5Qrcode(scannerId, {
        // HANYA format 1D Barcode untuk akurasi & kecepatan maksimal (mengabaikan QR)
        formatsToSupport: [
          Html5QrcodeSupportedFormats.EAN_13,
          Html5QrcodeSupportedFormats.EAN_8,
          Html5QrcodeSupportedFormats.UPC_A,
          Html5QrcodeSupportedFormats.UPC_E,
          Html5QrcodeSupportedFormats.CODE_128,
          Html5QrcodeSupportedFormats.CODE_39,
          Html5QrcodeSupportedFormats.ITF,
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
          fps: 30, // Frame rate maksimal
          qrbox: { width: 340, height: 120 }, // Area scan persegi panjang khusus barcode
          aspectRatio: 1.0, 
          disableFlip: false,
        },
        (decodedText) => {
          if (typeof window !== 'undefined' && window.navigator && window.navigator.vibrate) {
            window.navigator.vibrate(100);
          }
          onScan(decodedText);
          stopScanner();
        },
        () => {}
      );

      setScanning(true);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message.toLowerCase() : String(err).toLowerCase();
      
      if (msg.includes('notallowed') || msg.includes('permission')) {
        toast.error('Akses kamera ditolak. Izinkan kamera di pengaturan browser.');
      } else if (msg.includes('notfound') || msg.includes('device not found')) {
        toast.error('Kamera tidak ditemukan.');
      } else if (msg.includes('notreadable') || msg.includes('in use')) {
        toast.error('Kamera sedang digunakan aplikasi lain.');
      } else {
        toast.error('Gagal memulai kamera.');
      }
      onClose();
    } finally {
      setIsInitializing(false);
    }
  };

  useEffect(() => {
    let mounted = true;

    const initSequence = async () => {
      if (!open) {
        await stopScanner();
        return;
      }

      setIsInitializing(true);

      try {
        const devices = await Html5Qrcode.getCameras();
        if (mounted && devices && devices.length > 0) {
          setCameras(devices);
          
          const rearIdx = devices.findIndex(d =>
            d.label.toLowerCase().includes('back') ||
            d.label.toLowerCase().includes('rear') ||
            d.label.toLowerCase().includes('environment') ||
            d.label.toLowerCase().includes('0')
          );
          
          const targetIdx = rearIdx >= 0 ? rearIdx : 0;
          setActiveCameraIdx(targetIdx);
          await startScanner(devices[targetIdx].id);
        } else {
          if (mounted) await startScanner();
        }
      } catch (err) {
        if (mounted) await startScanner();
      }
    };

    initSequence();

    return () => {
      mounted = false;
      stopScanner();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const handleSwitchCamera = async () => {
    if (cameras.length < 2 || isInitializing) return;
    const nextIdx = (activeCameraIdx + 1) % cameras.length;
    setActiveCameraIdx(nextIdx);
    await startScanner(cameras[nextIdx].id);
  };

  const handleClose = async () => {
    await stopScanner();
    onClose();
  };

  const activeLabel = cameras[activeCameraIdx]?.label.toLowerCase() || "";
  const isFrontCamera = activeLabel.includes('front') || activeLabel.includes('depan') || activeLabel.includes('user');

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) handleClose(); }}>
      <DialogContent className="max-w-[95vw] sm:max-w-[500px] rounded-2xl p-0 overflow-hidden border border-border shadow-2xl z-[100] bg-background [&>button]:hidden">
        
        <style dangerouslySetInnerHTML={{__html: `
          @keyframes barcode-laser {
            0% { top: 0%; opacity: 0; }
            10% { opacity: 1; }
            90% { opacity: 1; }
            100% { top: 100%; opacity: 0; }
          }
          .animate-barcode-laser {
            animation: barcode-laser 2s cubic-bezier(0.4, 0, 0.2, 1) infinite;
          }
          #${scannerId} img[alt="Info icon"], #${scannerId} a { display: none !important; }
        `}} />

        {/* Header */}
        <div className="bg-background px-5 py-4 border-b border-border/50 relative z-20">
          <DialogHeader className="text-left space-y-1">
            <DialogTitle className="text-foreground text-[16px] font-bold flex items-center gap-2">
              <Barcode className="w-5 h-5 text-foreground" />
              Scan Barcode
            </DialogTitle>
            <DialogDescription className="text-muted-foreground text-[12px] font-medium">
              Arahkan garis merah pada barcode produk.
            </DialogDescription>
          </DialogHeader>
        </div>

        {/* Kamera Utama */}
        <div className="relative bg-black w-full h-[60vh] max-h-[400px] overflow-hidden">
          
          <div 
            id={scannerId} 
            className={`absolute inset-0 w-full h-full flex items-center justify-center bg-black
              [&>video]:object-cover [&>video]:w-full [&>video]:h-full transition-transform duration-300
              ${isFrontCamera ? "scale-x-[-1]" : ""}
            `} 
          />

          {scanning ? (
            <>
              {/* Tombol Putar Kamera */}
              {cameras.length > 1 && (
                <div className="absolute top-4 right-4 z-40">
                  <Button
                    type="button"
                    size="icon"
                    variant="secondary"
                    onClick={handleSwitchCamera}
                    disabled={isInitializing}
                    className="rounded-full w-12 h-12 bg-black/40 hover:bg-black/60 backdrop-blur-md border border-white/20 text-white shadow-xl transition-all"
                  >
                    <SwitchCamera className={`w-5 h-5 ${isInitializing ? 'animate-spin' : ''}`} />
                  </Button>
                </div>
              )}

              {/* Area Cutout Pemindai */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
                <div className="absolute inset-0 bg-black/60 backdrop-blur-[1px]" />
                
                {/* Zona Scan Persegi Panjang */}
                <div className="relative w-[85%] max-w-[340px] h-[120px] shadow-[0_0_0_9999px_rgba(0,0,0,0.6)] rounded-xl overflow-hidden">
                  
                  {/* Siku Sudut Minimalis */}
                  <div className="absolute top-0 left-0 w-8 h-8 border-t-[3px] border-l-[3px] border-white/70 rounded-tl-xl" />
                  <div className="absolute top-0 right-0 w-8 h-8 border-t-[3px] border-r-[3px] border-white/70 rounded-tr-xl" />
                  <div className="absolute bottom-0 left-0 w-8 h-8 border-b-[3px] border-l-[3px] border-white/70 rounded-bl-xl" />
                  <div className="absolute bottom-0 right-0 w-8 h-8 border-b-[3px] border-r-[3px] border-white/70 rounded-br-xl" />
                  
                  {/* Laser Merah */}
                  <div className="absolute left-[2%] right-[2%] h-[2px] bg-red-500 shadow-[0_0_12px_2px_rgba(239,68,68,0.8)] animate-barcode-laser z-30" />
                </div>
              </div>
            </>
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-zinc-950 z-30">
              <div className="w-10 h-10 border-[3px] border-white/10 border-t-white rounded-full animate-spin mb-4" />
              <p className="text-white/80 text-sm font-medium">Mempersiapkan Kamera...</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-background border-t border-border/50">
          <Button 
            variant="ghost" 
            className="w-full h-11 font-bold text-[13px] rounded-xl bg-muted/50 hover:bg-muted active:scale-[0.98] transition-all flex items-center justify-center text-foreground" 
            onClick={handleClose}
          >
            <CameraOff className="w-4 h-4 mr-2 opacity-70" />
            Tutup Kamera
          </Button>
        </div>
        
      </DialogContent>
    </Dialog>
  );
}
