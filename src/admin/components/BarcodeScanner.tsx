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
      <DialogContent className="max-w-[95vw] rounded-xl p-0 overflow-hidden">
        <DialogHeader className="p-4 pb-0">
          <DialogTitle className="flex items-center gap-2">
            <Camera className="w-5 h-5" />
            Scan Barcode
          </DialogTitle>
        </DialogHeader>

        <div className="relative">
          {/* Scanner viewport */}
          <div id={scannerId} className="w-full aspect-[4/3] bg-black" />

          {/* Overlay controls */}
          <div className="absolute top-3 right-3 flex gap-2">
            {hasFlash && (
              <Button
                variant="secondary"
                size="icon"
                className="h-10 w-10 rounded-full shadow-lg bg-black/50 hover:bg-black/70 border-0"
                onClick={toggleFlash}
              >
                <ZapIcon className={`w-5 h-5 ${flashOn ? 'text-yellow-400' : 'text-white'}`} />
              </Button>
            )}
            {cameras.length > 1 && (
              <Button
                variant="secondary"
                size="icon"
                className="h-10 w-10 rounded-full shadow-lg bg-black/50 hover:bg-black/70 border-0"
                onClick={switchCamera}
                title="Ganti kamera"
              >
                <Camera className="w-5 h-5 text-white" />
              </Button>
            )}
          </div>

          {/* Hint text */}
          <div className="absolute bottom-4 left-0 right-0 flex justify-center">
            <div className="bg-black/60 backdrop-blur-sm px-4 py-2 rounded-full">
              <p className="text-white text-xs text-center">
                Arahkan barcode ke dalam kotak scan
              </p>
            </div>
          </div>
        </div>

        <div className="p-4 pt-2">
          <Button variant="outline" className="w-full" onClick={handleClose}>
            <CameraOff className="w-4 h-4 mr-2" />
            Batal
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
