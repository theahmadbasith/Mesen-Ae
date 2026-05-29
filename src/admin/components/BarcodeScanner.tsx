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

  // Bersihkan dan matikan scanner dengan aman
  const stopScanner = async () => {
    if (scannerRef.current) {
      try {
        if (scannerRef.current.getState() === 2) {
          await scannerRef.current.stop();
        }
        scannerRef.current.clear();
      } catch (error) {
        console.warn("Kesalahan saat menghentikan pemindai:", error);
      }
      scannerRef.current = null;
    }
    setScanning(false);
    setIsInitializing(false);
  };

  // Inisialisasi pemindai khusus Barcode (1D)
  const startScanner = async (cameraId?: string) => {
    await stopScanner();
    setIsInitializing(true);

    // Jeda singkat untuk memastikan DOM siap
    await new Promise(resolve => setTimeout(resolve, 150));

    try {
      const scanner = new Html5Qrcode(scannerId, {
        // HANYA mengaktifkan format 1D (Barcode batang) untuk kecepatan & akurasi maksimal
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
          fps: 30, // Frame rate maksimal untuk respon cepat
          qrbox: { width: 340, height: 120 }, // Area scan persegi panjang khusus barcode
          aspectRatio: 1.0, 
          disableFlip: false,
        },
        (decodedText) => {
          // Getaran pendek sebagai umpan balik sukses (jika didukung perangkat)
          if (typeof window !== 'undefined' && window.navigator && window.navigator.vibrate) {
            window.navigator.vibrate(100);
          }
          onScan(decodedText);
          stopScanner();
        },
        () => {} // Abaikan log error frame untuk performa
      );

      setScanning(true);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message.toLowerCase() : String(err).toLowerCase();
      
      if (msg.includes('notallowed') || msg.includes('permission')) {
        toast.error('Akses kamera ditolak. Izinkan kamera di pengaturan browser Anda.');
      } else if (msg.includes('notfound') || msg.includes('device not found')) {
        toast.error('Kamera tidak ditemukan di perangkat ini.');
      } else if (msg.includes('notreadable') || msg.includes('in use')) {
        toast.error('Kamera sedang digunakan aplikasi lain.');
      } else {
        toast.error('Gagal memulai sistem kamera.');
      }
      onClose();
    } finally {
      setIsInitializing(false);
    }
  };

  // Kelola siklus hidup kamera
  useEffect(() => {
    let mounted = true;

    const initSequence = async () => {
      if (!open) {
        await stopScanner();
        return;
      }

      setIsInitializing(true);

      // 1. Jalankan pemindai kamera secara instan dengan constraint default ideal
      if (mounted) {
        await startScanner();
      }

      // 2. Lakukan pencarian daftar kamera di background agar pemindai terbuka langsung
      try {
        const devices = await Html5Qrcode.getCameras();
        if (mounted && devices && devices.length > 0) {
          setCameras(devices);
          
          // Cari dan utamakan kamera belakang (environment)
          const rearIdx = devices.findIndex(d =>
            d.label.toLowerCase().includes('back') ||
            d.label.toLowerCase().includes('rear') ||
            d.label.toLowerCase().includes('environment') ||
            d.label.toLowerCase().includes('0')
          );
          
          const targetIdx = rearIdx >= 0 ? rearIdx : 0;
          setActiveCameraIdx(targetIdx);
        }
      } catch (err) {
        console.warn("Enumerasi kamera di background gagal:", err);
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

  // Identifikasi kamera depan untuk memberikan efek cermin (mirroring)
  const activeLabel = cameras[activeCameraIdx]?.label.toLowerCase() || "";
  const isFrontCamera = activeLabel.includes('front') || activeLabel.includes('depan') || activeLabel.includes('user');

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) handleClose(); }}>
      {/* Container utama dibuat responsif, rapi, dengan sudut rounded-2xl persis gaya QRIS Input */}
      <DialogContent className="max-w-[95vw] sm:max-w-[480px] rounded-2xl p-0 overflow-hidden border border-border shadow-2xl z-[100] bg-background [&>button]:hidden">
        
        <style dangerouslySetInnerHTML={{__html: `
          @keyframes barcode-laser {
            0% { top: 0%; opacity: 0; }
            10% { opacity: 1; }
            90% { opacity: 1; }
            100% { top: 100%; opacity: 0; }
          }
          .animate-barcode-laser {
            animation: barcode-laser 2.2s cubic-bezier(0.4, 0, 0.2, 1) infinite;
          }
          /* Hapus elemen watermark bawaan library */
          #${scannerId} img[alt="Info icon"], #${scannerId} a { display: none !important; }
          
          /* Hapus canvas overlay bawaan html5-qrcode agar tidak ada kotak putih ganda */
          #${scannerId} canvas { display: none !important; }
        `}} />

        {/* ── HEADER ── */}
        <div className="bg-background px-5 py-4 border-b border-border/50 relative z-20">
          <DialogHeader className="text-left space-y-1">
            <DialogTitle className="text-foreground text-[16px] font-bold flex items-center gap-2">
              <Barcode className="w-5 h-5 text-foreground" />
              Scan Barcode Produk
            </DialogTitle>
            <DialogDescription className="text-muted-foreground text-[12px] font-medium">
              Posisikan barcode sejajar dengan garis laser.
            </DialogDescription>
          </DialogHeader>
        </div>

        {/* ── AREA KAMERA ── */}
        <div className="relative bg-black w-full h-[55vh] max-h-[420px] overflow-hidden">
          
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
                    className="rounded-full w-10 h-10 bg-white/20 hover:bg-white/30 backdrop-blur-md border border-white/20 text-white shadow-lg transition-all"
                  >
                    <SwitchCamera className={`w-5 h-5 ${isInitializing ? 'animate-spin' : ''}`} />
                  </Button>
                </div>
              )}

              {/* Area Cutout Pemindai Khusus Barcode */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
                <div className="absolute inset-0 bg-black/60 backdrop-blur-[1px]" />
                
                {/* Zona Scan Persegi Panjang */}
                <div className="relative w-[85%] max-w-[340px] h-[120px] shadow-[0_0_0_9999px_rgba(0,0,0,0.6)] rounded-xl overflow-hidden">
                  
                  {/* Siku Sudut yang Bersih, Fungsional & Menyesuaikan Tema (Primary/Biru) */}
                  <div className="absolute top-0 left-0 w-6 h-6 border-t-[3px] border-l-[3px] border-primary rounded-tl-xl" />
                  <div className="absolute top-0 right-0 w-6 h-6 border-t-[3px] border-r-[3px] border-primary rounded-tr-xl" />
                  <div className="absolute bottom-0 left-0 w-6 h-6 border-b-[3px] border-l-[3px] border-primary rounded-bl-xl" />
                  <div className="absolute bottom-0 right-0 w-6 h-6 border-b-[3px] border-r-[3px] border-primary rounded-br-xl" />
                  
                  {/* Garis Laser Biru/Primary yang Menyala Indah */}
                  <div className="absolute left-[2%] right-[2%] h-[2px] bg-primary shadow-[0_0_12px_2px_hsl(var(--primary)/0.85)] animate-barcode-laser z-30" />
                </div>
              </div>
            </>
          ) : (
            // Indikator Loading Saat Menyiapkan Kamera
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-zinc-950 z-30">
              <div className="w-8 h-8 border-[3px] border-white/10 border-t-white rounded-full animate-spin mb-3" />
              <p className="text-white/80 text-sm font-medium">Memuat Kamera...</p>
            </div>
          )}
        </div>

        {/* ── FOOTER ── */}
        <div className="p-4 bg-background border-t border-border/50">
          <Button 
            variant="ghost" 
            className="w-full h-11 font-semibold text-[13px] rounded-xl bg-muted/40 hover:bg-muted/80 active:scale-[0.98] transition-all flex items-center justify-center text-foreground" 
            onClick={handleClose}
          >
            <CameraOff className="w-4 h-4 mr-2 opacity-70" />
            Batal & Tutup
          </Button>
        </div>
        
      </DialogContent>
    </Dialog>
  );
}
