import { useEffect, useRef, useState } from 'react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { CameraOff, SwitchCamera, Barcode, ScanLine, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { toast } from 'sonner';

interface BarcodeScannerProps {
  open: boolean;
  onClose: () => void;
  onScan: (barcode: string) => void;
}

export default function BarcodeScanner({ open, onClose, onScan }: BarcodeScannerProps) {
  const scannerRef = useRef<Html5Qrcode | null>(null);
  
  const [scanning, setScanning] = useState(false);
  const [facingMode, setFacingMode] = useState<"environment" | "user">("environment");
  const [isInitializing, setIsInitializing] = useState(false);
  const [alertModal, setAlertModal] = useState({ open: false, title: "", message: "" });
  
  const scannerId = 'barcode-scanner-view';

  const showAlert = (title: string, message: string) => {
    setAlertModal({ open: true, title, message });
  };

  const stopScanner = async () => {
    if (scannerRef.current) {
      try {
        const state = scannerRef.current.getState();
        // Hanya stop jika statusnya sedang SCANNING (2) atau PAUSED (3)
        if (state === 2 || state === 3) {
          await scannerRef.current.stop();
        }
        scannerRef.current.clear();
      } catch (error) {
        console.warn("Pembersihan internal scanner gagal:", error);
      }
      scannerRef.current = null;
    }
    setScanning(false);
    setIsInitializing(false);
  };

  const startCamera = async (mode: "environment" | "user" = facingMode) => {
    setIsInitializing(true);
    await stopScanner();

    // Jeda DOM settling untuk transisi modal & pembersihan canvas
    await new Promise(resolve => setTimeout(resolve, 150));

    try {
      const scanner = new Html5Qrcode(scannerId, {
        // HANYA DUKUNG BARCODE (1D) agar kecepatan deteksi dan akurasi naik 1000%
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
      setFacingMode(mode);

      await scanner.start(
        { facingMode: mode },
        {
          fps: 30, // Frame rate maksimal untuk tangkapan super cepat
          qrbox: { width: 340, height: 120 }, // Area pembacaan khusus persegi panjang
          aspectRatio: 1.0, 
          disableFlip: false,
        },
        (decodedText) => {
          // Haptic Feedback / Getaran jika HP mendukung (seperti scanner fisik)
          if (typeof window !== 'undefined' && navigator.vibrate) {
            navigator.vibrate(100);
          }
          onScan(decodedText);
          stopScanner();
        },
        () => {} // Abaikan log error frame untuk performa maksimal
      );

      setScanning(true);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message.toLowerCase() : String(err).toLowerCase();
      
      let errorTitle = "Kamera Gagal";
      let errorMsg = "Terjadi kesalahan saat memulai sistem kamera.";
      
      if (msg.includes('notallowed') || msg.includes('permission')) {
        errorTitle = "Akses Ditolak";
        errorMsg = "Akses kamera ditolak. Silakan izinkan akses kamera di pengaturan browser Anda.";
      } else if (msg.includes('notfound') || msg.includes('device not found')) {
        errorTitle = "Kamera Tidak Ditemukan";
        errorMsg = "Perangkat Anda tidak memiliki kamera yang didukung/berfungsi.";
      } else if (msg.includes('notreadable') || msg.includes('in use')) {
        errorTitle = "Kamera Sedang Digunakan";
        errorMsg = "Kamera sedang digunakan oleh aplikasi atau tab lain. Tutup lalu coba lagi.";
      }

      toast.error(errorTitle);
      showAlert(errorTitle, errorMsg);
      onClose();
    } finally {
      setIsInitializing(false);
    }
  };

  useEffect(() => {
    if (open) {
      startCamera(facingMode);
    } else {
      stopScanner();
    }
    
    return () => {
      stopScanner();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const toggleCameraMode = () => {
    if (isInitializing) return;
    const newMode = facingMode === "environment" ? "user" : "environment";
    // Gunakan setTimeout kecil untuk menghindari race condition API Kamera
    stopScanner().then(() => {
      setTimeout(() => startCamera(newMode), 100);
    });
  };

  const handleClose = async () => {
    await stopScanner();
    onClose();
  };

  // Efek cermin jika menggunakan kamera depan
  const isFrontCamera = facingMode === "user";

  return (
    <>
      <Dialog open={open} onOpenChange={v => { if (!v) handleClose(); }}>
        <DialogContent className="max-w-[95vw] sm:max-w-[480px] rounded-2xl p-0 overflow-hidden border border-border shadow-2xl z-[100] bg-background [&>button]:hidden">
          
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
            
            /* CSS Reset untuk Html5Qrcode agar menyatu bersih seperti raw getUserMedia */
            #${scannerId} { width: 100% !important; height: 100% !important; display: flex; align-items: center; justify-content: center; }
            #${scannerId} video { object-fit: cover !important; width: 100% !important; height: 100% !important; border-radius: inherit; }
            
            /* Sembunyikan elemen, watermark, dan box bawaan html5-qrcode */
            #${scannerId} img[alt="Info icon"], #${scannerId} a { display: none !important; }
            #${scannerId} canvas { display: none !important; }
            #${scannerId} div { border: none !important; outline: none !important; }
          `}} />

          {/* ── HEADER ── */}
          <div className="bg-background px-5 py-4 border-b border-border/50 relative z-20">
            <DialogHeader className="text-left space-y-1">
              <DialogTitle className="text-foreground text-[16px] font-bold flex items-center gap-2">
                <Barcode className="w-5 h-5 text-foreground" />
                Scan Barcode Produk
              </DialogTitle>
              <DialogDescription className="text-muted-foreground text-[12px] font-medium">
                Posisikan barcode sejajar dengan garis laser merah.
              </DialogDescription>
            </DialogHeader>
          </div>

          {/* ── AREA KAMERA (Responsif & Tepat seperti QRIS Input) ── */}
          <div className="relative bg-black w-full h-[60vh] max-h-[400px] overflow-hidden group">
            
            {/* Viewport Render Kamera Html5Qrcode */}
            <div 
              id={scannerId} 
              className={`absolute inset-0 w-full h-full transition-transform duration-300 ${isFrontCamera ? "scale-x-[-1]" : ""}`} 
            />

            {scanning ? (
              <>
                {/* Tombol Putar Kamera Depan/Belakang */}
                <div className="absolute top-4 right-4 z-40">
                  <Button
                    type="button"
                    size="icon"
                    variant="secondary"
                    onClick={toggleCameraMode}
                    disabled={isInitializing}
                    className="rounded-full w-10 h-10 bg-white/20 hover:bg-white/40 backdrop-blur-md border border-white/30 text-white shadow-xl transition-all"
                  >
                    <SwitchCamera className={`w-5 h-5 ${isInitializing ? 'animate-spin' : ''}`} />
                  </Button>
                </div>

                {/* Overlay & Scan Area Jendela Presisi */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
                  <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" />
                  
                  {/* Zona Scan Persegi Panjang Khusus Barcode */}
                  <div className="relative w-[85%] max-w-[340px] h-[120px] shadow-[0_0_0_9999px_rgba(0,0,0,0.4)] rounded-2xl overflow-hidden">
                    
                    {/* Siku Sudut Minimalis & Rapi */}
                    <div className="absolute top-0 left-0 w-6 h-6 border-t-[3px] border-l-[3px] border-primary rounded-tl-2xl z-20" />
                    <div className="absolute top-0 right-0 w-6 h-6 border-t-[3px] border-r-[3px] border-primary rounded-tr-2xl z-20" />
                    <div className="absolute bottom-0 left-0 w-6 h-6 border-b-[3px] border-l-[3px] border-primary rounded-bl-2xl z-20" />
                    <div className="absolute bottom-0 right-0 w-6 h-6 border-b-[3px] border-r-[3px] border-primary rounded-br-2xl z-20" />
                    
                    {/* Laser Merah Dinamis */}
                    <div className="absolute left-[2%] right-[2%] h-[2px] bg-red-500 shadow-[0_0_12px_2px_rgba(239,68,68,0.8)] animate-barcode-laser z-30" />
                  </div>
                </div>

                {/* Floating Hint Bawah */}
                <div className="absolute bottom-6 left-0 right-0 flex justify-center pointer-events-none z-30">
                  <span className="bg-black/70 backdrop-blur-md text-white text-sm font-medium px-5 py-2.5 rounded-full shadow-lg flex items-center gap-2">
                    <ScanLine className="w-4 h-4 text-primary" />
                    Arahkan ke barcode batang
                  </span>
                </div>
              </>
            ) : (
              // Indikator Loading Saat Menyiapkan Kamera
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-zinc-950 z-30">
                <div className="w-10 h-10 border-[3px] border-white/10 border-t-white rounded-full animate-spin mb-4" />
                <p className="text-white/80 text-sm font-medium">Mempersiapkan Kamera...</p>
              </div>
            )}
          </div>

          {/* ── FOOTER ── */}
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

      {/* ── Alert Modal (Penanganan Error) ── */}
      <Dialog open={alertModal.open} onOpenChange={(open) => setAlertModal(prev => ({ ...prev, open }))}>
        <DialogContent className="sm:max-w-md text-center flex flex-col items-center rounded-2xl z-[110]">
          <div className="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center mb-2">
            <AlertTriangle className="w-6 h-6 text-destructive" />
          </div>
          <DialogHeader>
            <DialogTitle className="text-center text-lg">{alertModal.title}</DialogTitle>
            <DialogDescription className="text-center pt-2">
              {alertModal.message}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="sm:justify-center w-full mt-4">
            <Button
              type="button"
              onClick={() => setAlertModal(prev => ({ ...prev, open: false }))}
              className="w-full sm:w-auto min-w-[120px] rounded-xl font-semibold"
            >
              Mengerti
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
