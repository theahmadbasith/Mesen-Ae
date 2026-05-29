import { useEffect, useRef, useState } from 'react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { CameraOff, SwitchCamera, Barcode, ScanLine, AlertTriangle, Loader2 } from 'lucide-react';
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
  
  const scannerId = 'professional-barcode-scanner-view';

  // ============================================================================
  // CORE SCANNER ENGINE: STOP & CLEANUP
  // ============================================================================
  const stopScanner = async () => {
    if (scannerRef.current) {
      try {
        const state = scannerRef.current.getState();
        // 2 = SCANNING. Hanya hentikan jika sedang berjalan.
        if (state === 2) {
          await scannerRef.current.stop();
        }
        scannerRef.current.clear();
      } catch (error) {
        console.warn("Cleanup scanner internal error:", error);
      }
      scannerRef.current = null;
    }
    setScanning(false);
    setIsInitializing(false);
  };

  // ============================================================================
  // CORE SCANNER ENGINE: START & CONFIGURE
  // ============================================================================
  const startScanner = async (cameraId?: string) => {
    await stopScanner();
    setIsInitializing(true);

    // Jeda singkat untuk memastikan DOM video sebelumnya benar-benar terhapus
    await new Promise(resolve => setTimeout(resolve, 200));

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

      // Konfigurasi kamera: Prioritaskan ID kamera spesifik, fallback ke kamera belakang
      const cameraConstraint = cameraId
        ? cameraId
        : { facingMode: { ideal: 'environment' } };

      await scanner.start(
        cameraConstraint as Parameters<typeof scanner.start>[0],
        {
          fps: 20, // Frame rate tinggi untuk responsivitas maksimal
          // Zona scan diatur sangat besar (300px) agar pembacaan lebih mudah
          qrbox: { width: 320, height: 320 }, 
          aspectRatio: 1.0, 
          disableFlip: false,
        },
        (decodedText) => {
          // --- HAPTIC FEEDBACK (Getar) SAAT SUKSES ---
          if (typeof window !== 'undefined' && window.navigator && window.navigator.vibrate) {
            window.navigator.vibrate([100, 50, 100]); // Getar 2 kali cepat
          }
          onScan(decodedText);
          stopScanner();
        },
        // Callback frame error diabaikan agar console tidak spamming
        () => {}
      );

      setScanning(true);
    } catch (err: unknown) {
      console.error("Scanner init error:", err);
      const msg = err instanceof Error ? err.message.toLowerCase() : String(err).toLowerCase();
      
      if (msg.includes('notallowed') || msg.includes('permission')) {
        toast.error('Akses kamera ditolak. Mohon izinkan kamera pada browser Anda.');
      } else if (msg.includes('notfound') || msg.includes('device not found')) {
        toast.error('Kamera tidak terdeteksi pada perangkat ini.');
      } else if (msg.includes('notreadable') || msg.includes('in use') || msg.includes('could not start')) {
        toast.error('Kamera sedang digunakan oleh aplikasi lain. Tutup aplikasi tersebut lalu coba lagi.');
      } else {
        toast.error('Gagal memulai sistem pemindai. Silakan muat ulang halaman.');
      }
      onClose();
    } finally {
      setIsInitializing(false);
    }
  };

  // ============================================================================
  // CAMERA ENUMERATION & LIFECYCLE
  // ============================================================================
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
          
          // Cari kamera utama (kamera belakang)
          const rearIdx = devices.findIndex(d =>
            d.label.toLowerCase().includes('back') ||
            d.label.toLowerCase().includes('rear') ||
            d.label.toLowerCase().includes('environment') ||
            d.label.toLowerCase().includes('belakang') ||
            d.label.toLowerCase().includes('0') // Seringkali kamera utama di index 0 pada mobile
          );
          
          const targetIdx = rearIdx >= 0 ? rearIdx : 0;
          setActiveCameraIdx(targetIdx);
          await startScanner(devices[targetIdx].id);
        } else {
          // Fallback jika enumerasi gagal mengembalikan array
          if (mounted) await startScanner();
        }
      } catch (err) {
        // Fallback langsung pakai constraints jika `getCameras()` di-block permission awal
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

  // ============================================================================
  // USER ACTIONS
  // ============================================================================
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

  // Deteksi mirror (untuk kamera depan agar UI dan gambar tidak terbalik membingungkan)
  const activeLabel = cameras[activeCameraIdx]?.label.toLowerCase() || "";
  const isFrontCamera = activeLabel.includes('front') || activeLabel.includes('depan') || activeLabel.includes('user');

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) handleClose(); }}>
      <DialogContent className="max-w-[95vw] sm:max-w-[500px] rounded-[28px] p-0 overflow-hidden border border-border shadow-2xl z-[100] bg-background [&>button]:hidden">
        
        {/* CSS KEYFRAMES UNTUK LASER SCANNER */}
        <style dangerouslySetInnerHTML={{__html: `
          @keyframes professional-laser {
            0% { top: 0%; opacity: 0; }
            10% { opacity: 1; }
            90% { opacity: 1; }
            100% { top: 100%; opacity: 0; }
          }
          .animate-professional-laser {
            animation: professional-laser 2.5s cubic-bezier(0.4, 0, 0.2, 1) infinite;
          }
          
          /* Menyembunyikan elemen bawaan html5-qrcode yang tidak diperlukan */
          #${scannerId} img[alt="Info icon"] { display: none !important; }
          #${scannerId} a { display: none !important; }
        `}} />

        {/* ── HEADER BORDERLESS ── */}
        <div className="bg-background/95 backdrop-blur-xl px-6 py-5 border-b border-border/50 relative z-20">
          <DialogHeader className="text-left space-y-1">
            <DialogTitle className="text-foreground text-[19px] font-extrabold flex items-center gap-2.5 tracking-tight">
              <Barcode className="w-5 h-5 text-primary" />
              Sistem Pemindai Pro
            </DialogTitle>
            <DialogDescription className="text-muted-foreground text-[13px] font-medium leading-relaxed">
              Arahkan garis merah ke Barcode atau QR Code produk.
            </DialogDescription>
          </DialogHeader>
        </div>

        {/* ── AREA KAMERA UTAMA ── */}
        <div className="relative bg-black w-full h-[65vh] max-h-[500px] overflow-hidden group">
          
          {/* Viewport Render Kamera */}
          <div 
            id={scannerId} 
            className={`absolute inset-0 w-full h-full flex items-center justify-center bg-black
              [&>video]:object-cover [&>video]:w-full [&>video]:h-full transition-transform duration-500
              ${isFrontCamera ? "scale-x-[-1]" : ""}
            `} 
          />

          {/* OVERLAY KETIKA KAMERA AKTIF */}
          {scanning ? (
            <>
              {/* TOMBOL GANTI KAMERA (KANAN ATAS) - Desain Premium Glassmorphism */}
              {cameras.length > 1 && (
                <div className="absolute top-5 right-5 z-40">
                  <Button
                    type="button"
                    size="icon"
                    variant="secondary"
                    onClick={handleSwitchCamera}
                    disabled={isInitializing}
                    className="rounded-full w-12 h-12 bg-black/40 hover:bg-black/60 backdrop-blur-xl border-2 border-white/20 text-white shadow-[0_8px_30px_rgb(0,0,0,0.12)] transition-all active:scale-90 disabled:opacity-50"
                    title="Putar Kamera"
                  >
                    <SwitchCamera className={`w-5 h-5 ${isInitializing ? 'animate-spin' : ''}`} />
                  </Button>
                </div>
              )}

              {/* ── ZONA CUTOUT PEMINDAI (LEBIH BESAR, TANPA KOTAK PUTIH) ── */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
                {/* Latar Belakang Gelap Tembus Pandang */}
                <div className="absolute inset-0 bg-black/55 backdrop-blur-[1px]" />
                
                {/* Kotak Zona Pemindai Utama 
                  Lebih Besar (320x320) atau 85% layar, cocok untuk QR & Barcode
                  Bayangan tajam memotong background gelap
                */}
                <div className="relative w-[85%] max-w-[320px] aspect-square shadow-[0_0_0_9999px_rgba(0,0,0,0.55)] rounded-[24px] overflow-hidden">
                  
                  {/* Siku-Siku Tepi (Corner Notches) - Lebih Tebal dan Jelas */}
                  <div className="absolute top-0 left-0 w-12 h-12 border-t-[5px] border-l-[5px] border-primary rounded-tl-[24px]" />
                  <div className="absolute top-0 right-0 w-12 h-12 border-t-[5px] border-r-[5px] border-primary rounded-tr-[24px]" />
                  <div className="absolute bottom-0 left-0 w-12 h-12 border-b-[5px] border-l-[5px] border-primary rounded-bl-[24px]" />
                  <div className="absolute bottom-0 right-0 w-12 h-12 border-b-[5px] border-r-[5px] border-primary rounded-br-[24px]" />
                  
                  {/* Laser Merah Dinamis */}
                  <div className="absolute left-[5%] right-[5%] h-[3px] bg-red-500 rounded-full shadow-[0_0_15px_4px_rgba(239,68,68,0.8)] animate-professional-laser z-30" />
                </div>
              </div>

              {/* Teks Instruksi Mengambang di Bawah */}
              <div className="absolute bottom-8 left-0 right-0 flex justify-center pointer-events-none z-30">
                <div className="bg-black/60 backdrop-blur-xl text-white text-[13px] font-semibold px-6 py-3 rounded-full shadow-2xl flex items-center gap-2.5 border border-white/10">
                  <ScanLine className="w-4 h-4 text-primary animate-pulse" />
                  Membaca Otomatis...
                </div>
              </div>
            </>
          ) : (
            // STATE LOADING / INISIALISASI KAMERA
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-zinc-950 z-30">
              <div className="relative flex items-center justify-center w-20 h-20 mb-6">
                <div className="absolute inset-0 rounded-full border-[3px] border-white/10" />
                <div className="absolute inset-0 rounded-full border-[3px] border-primary border-t-transparent animate-spin" />
                <CameraOff className="w-6 h-6 text-white/40" />
              </div>
              <p className="text-white/90 text-[15px] font-bold tracking-wide">Mempersiapkan Kamera</p>
              <p className="text-white/50 text-xs mt-2 text-center max-w-[250px]">
                Mohon tunggu, memastikan akses perangkat keras aman...
              </p>
            </div>
          )}
        </div>

        {/* ── FOOTER BUTTON BORDERLESS ── */}
        <div className="p-4 bg-background border-t border-border/30">
          <Button 
            variant="ghost" 
            className="w-full h-[52px] font-extrabold text-[14px] rounded-2xl bg-muted/40 hover:bg-destructive/10 hover:text-destructive active:scale-[0.98] transition-all flex items-center justify-center text-foreground" 
            onClick={handleClose}
          >
            <CameraOff className="w-5 h-5 mr-2.5 opacity-70" />
            Batal & Tutup Kamera
          </Button>
        </div>
        
      </DialogContent>
    </Dialog>
  );
}
