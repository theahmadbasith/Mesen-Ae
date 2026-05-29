import { useEffect, useRef, useState } from 'react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { CameraOff, Zap, SwitchCamera, Barcode, ScanLine } from 'lucide-react';
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
        // Abaikan error saat stop
      }
      scannerRef.current = null;
    }
    setScanning(false);
    setHasFlash(false);
    setFlashOn(false);
  };

  const startScanner = async (cameraId?: string) => {
    await stopScanner();

    // Jeda singkat agar DOM siap setelah stop sebelumnya
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
          qrbox: { width: 280, height: 160 }, // Proporsi ideal untuk Barcode & QR
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

      // Cek ketersediaan Flash (Torch)
      try {
        const track = scanner.getRunningTrackCameraCapabilities();
        if (track && 'torchFeature' in track) {
          setHasFlash(true);
        }
      } catch {
        // Fitur flash tidak tersedia
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes('NotAllowedError') || msg.includes('Permission')) {
        toast.error('Izin kamera ditolak. Mohon izinkan akses kamera di pengaturan browser Anda.');
      } else if (msg.includes('NotFoundError') || msg.includes('Requested device not found')) {
        toast.error('Kamera tidak ditemukan di perangkat ini.');
      } else if (msg.includes('NotReadableError') || msg.includes('Could not start')) {
        toast.error('Kamera sedang digunakan aplikasi lain.');
      } else {
        toast.error('Gagal memulai kamera. Coba muat ulang dan izinkan akses kamera.');
      }
      onClose();
    }
  };

  useEffect(() => {
    if (!open) {
      stopScanner();
      return;
    }

    // Enumerasi daftar kamera yang tersedia
    Html5Qrcode.getCameras()
      .then((devices) => {
        if (devices && devices.length > 0) {
          setCameras(devices);
          // Prioritaskan kamera belakang (environment)
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
          // Jika tidak terdeteksi via getCameras, coba direct facingMode
          startScanner();
        }
      })
      .catch(() => {
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
      toast.error('Flash tidak didukung di perangkat/kamera ini');
    }
  };

  const handleClose = async () => {
    await stopScanner();
    onClose();
  };

  // Cek jika kamera yang sedang aktif adalah kamera depan (untuk mirroring)
  const isFrontCamera = cameras[activeCameraIdx]?.label.toLowerCase().includes('front') || 
                        cameras[activeCameraIdx]?.label.toLowerCase().includes('depan') || 
                        cameras[activeCameraIdx]?.label.toLowerCase().includes('user');

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) handleClose(); }}>
      <DialogContent className="max-w-[95vw] sm:max-w-[480px] rounded-[24px] p-0 overflow-hidden border border-border shadow-2xl z-[100] bg-background [&>button]:hidden">
        
        <style dangerouslySetInnerHTML={{__html: `
          @keyframes scan-laser {
            0% { top: 0; opacity: 0; }
            5% { opacity: 1; }
            95% { opacity: 1; }
            100% { top: 100%; opacity: 0; }
          }
          .scanner-laser-line {
            animation: scan-laser 2.5s infinite linear;
          }
        `}} />

        {/* ── Header ── */}
        <div className="bg-background px-6 py-5 border-b border-border/60">
          <DialogHeader className="text-left">
            <DialogTitle className="text-foreground text-lg font-bold flex items-center gap-2">
              <Barcode className="w-5 h-5 text-primary" />
              Scan Barcode / QRIS
            </DialogTitle>
            <DialogDescription className="text-muted-foreground text-xs mt-1">
              Arahkan barcode atau SKU produk ke dalam area pemindai. Sistem akan membaca secara otomatis.
            </DialogDescription>
          </DialogHeader>
        </div>

        {/* ── Camera Preview & Overlay Area ── */}
        <div className="relative bg-black w-full h-[60vh] sm:h-[400px] overflow-hidden group">
          
          {/* Viewport dari Html5Qrcode */}
          <div 
            id={scannerId} 
            className={`absolute inset-0 w-full h-full flex items-center justify-center [&>video]:object-cover [&>video]:w-full [&>video]:h-full transition-transform duration-300 ${isFrontCamera ? "scale-x-[-1]" : ""}`} 
          />

          {scanning ? (
            <>
              {/* Tombol Kiri Atas: Flash Toggle */}
              {hasFlash && (
                <div className="absolute top-4 left-4 z-30">
                  <Button
                    type="button"
                    size="icon"
                    variant="secondary"
                    onClick={toggleFlash}
                    className="rounded-full w-10 h-10 bg-white/20 hover:bg-white/40 backdrop-blur-md border border-white/30 text-white shadow-xl transition-all"
                    title="Nyalakan/Matikan Flash"
                  >
                    <Zap className={`w-5 h-5 ${flashOn ? 'text-yellow-400 fill-yellow-400' : 'text-white'}`} />
                  </Button>
                </div>
              )}

              {/* Tombol Kanan Atas: Switch Camera (Gaya QRIS Input) */}
              {cameras.length > 1 && (
                <div className="absolute top-4 right-4 z-30">
                  <Button
                    type="button"
                    size="icon"
                    variant="secondary"
                    onClick={switchCamera}
                    className="rounded-full w-10 h-10 bg-white/20 hover:bg-white/40 backdrop-blur-md border border-white/30 text-white shadow-xl transition-all"
                    title="Ganti Kamera Depan/Belakang"
                  >
                    <SwitchCamera className="w-5 h-5" />
                  </Button>
                </div>
              )}

              {/* ── Premium Scan Area Cutout ── */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
                {/* Background gelap dengan cutout transparan di tengah */}
                <div className="absolute inset-0 bg-black/50 backdrop-blur-[2px]" />
                
                {/* Kotak Scanner (Proporsi pas untuk Barcode & QR Code) */}
                <div className="relative w-[280px] h-[160px] shadow-[0_0_0_9999px_rgba(0,0,0,0.45)] rounded-[20px] overflow-hidden">
                  
                  {/* Laser Merah Menyala */}
                  <div className="absolute left-0 right-0 h-0.5 bg-primary/90 shadow-[0_0_12px_3px_hsl(var(--primary)/0.7)] scanner-laser-line z-10" />

                  {/* Siku Sudut (Corner Notches) */}
                  <div className="absolute top-0 left-0 w-8 h-8 border-t-[3px] border-l-[3px] border-primary rounded-tl-[20px] z-20" />
                  <div className="absolute top-0 right-0 w-8 h-8 border-t-[3px] border-r-[3px] border-primary rounded-tr-[20px] z-20" />
                  <div className="absolute bottom-0 left-0 w-8 h-8 border-b-[3px] border-l-[3px] border-primary rounded-bl-[20px] z-20" />
                  <div className="absolute bottom-0 right-0 w-8 h-8 border-b-[3px] border-r-[3px] border-primary rounded-br-[20px] z-20" />
                  
                  {/* Border Putih Berkedip Halus */}
                  <div className="w-full h-full border-[1.5px] border-white/20 rounded-[20px] animate-pulse" />
                </div>
              </div>

              {/* Hint Mengambang di Bawah */}
              <div className="absolute bottom-6 left-0 right-0 flex justify-center pointer-events-none z-20">
                <span className="bg-black/70 backdrop-blur-md text-white text-xs font-medium px-5 py-2.5 rounded-full shadow-lg flex items-center gap-2 border border-white/10">
                  <ScanLine className="w-4 h-4 text-primary" />
                  Posisikan Barcode di tengah kotak
                </span>
              </div>
            </>
          ) : (
            // Loading State Frame
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/90 z-20">
              <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin mb-4" />
              <p className="text-white/80 text-sm font-medium">Mengakses Kamera...</p>
            </div>
          )}
        </div>

        {/* ── Footer ── */}
        <div className="p-4 bg-background border-t border-border/50">
          <Button 
            variant="secondary" 
            className="w-full h-12 font-bold text-[13px] rounded-xl border-border hover:bg-muted active:scale-95 transition-all flex items-center justify-center text-foreground" 
            onClick={handleClose}
          >
            <CameraOff className="w-4 h-4 mr-2 text-muted-foreground" />
            Tutup & Batal Memindai
          </Button>
        </div>
        
      </DialogContent>
    </Dialog>
  );
}
