import React, { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { RefreshCcw, ImagePlus, X, QrCode, Keyboard, AlertCircle } from 'lucide-react';

interface Props {
  showScanner: boolean;
  onOpenScanner: () => void;
  onOpenCustomerModal: () => void;
  onDetected: (text: string) => void;
  onCloseScanner: () => void;
}

export default function CustomerScanner({ 
  showScanner, 
  onOpenScanner, 
  onOpenCustomerModal, 
  onDetected, 
  onCloseScanner 
}: Props) {
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const [cameraList, setCameraList] = useState<Array<{ id: string; label: string }>>([]);
  const [activeCameraIndex, setActiveCameraIndex] = useState(0);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [scanError, setScanError] = useState('');
  const [isTransitioning, setIsTransitioning] = useState(false);

  const scannerId = 'customer-qr-scanner';

  const startScanner = async (cameraId?: string, modeOverride?: 'environment' | 'user') => {
    setScanError('');
    setIsTransitioning(true);
    
    try {
      if (scannerRef.current) {
        if (scannerRef.current.isScanning) {
          try {
            await scannerRef.current.stop();
          } catch (e) {
            console.warn("Stopping scanner error:", e);
          }
        }
        try {
          await scannerRef.current.clear();
        } catch (e) {
          console.warn("Clearing scanner error:", e);
        }
      }

      const container = document.getElementById(scannerId);
      if (!container) {
        setIsTransitioning(false);
        return;
      }

      scannerRef.current = new Html5Qrcode(scannerId, { verbose: false });

      const targetMode = modeOverride || facingMode;
      const targetInput = cameraId || { facingMode: targetMode };

      await scannerRef.current.start(
        targetInput,
        { 
          fps: 10, 
          qrbox: { width: 280, height: 280 }, 
          aspectRatio: 0.75
        },
        (decodedText) => {
          if (onDetected) onDetected(decodedText);
        },
        () => {}
      );
    } catch (error: any) {
      console.error(error);
      setScanError('Kamera gagal diakses. Pastikan izin diberikan atau gunakan galeri.');
    } finally {
      setIsTransitioning(false);
    }
  };

  useEffect(() => {
    let mounted = true;

    if (showScanner) {
      Html5Qrcode.getCameras()
        .then((cameras) => {
          if (!mounted) return;
          const list = (cameras || []).map((camera) => ({ 
            id: camera.id, 
            label: camera.label || 'Kamera' 
          }));
          setCameraList(list);
          if (list.length > 0) {
            const selectedId = list[0]?.id;
            setActiveCameraIndex(0);
            startScanner(selectedId);
          } else {
            startScanner();
          }
        })
        .catch(() => {
          if (mounted) {
            setScanError('Akses kamera tidak tersedia.');
          }
        });
    }

    return () => {
      mounted = false;
      if (scannerRef.current) {
        const instance = scannerRef.current;
        if (instance.isScanning) {
          instance.stop().then(() => {
            instance.clear().catch(() => {});
          }).catch(() => {});
        } else {
          instance.clear().catch(() => {});
        }
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showScanner]);

  const switchCamera = async () => {
    if (isTransitioning) return;
    setIsTransitioning(true);

    try {
      if (scannerRef.current && scannerRef.current.isScanning) {
        await scannerRef.current.stop();
      }

      if (cameraList.length >= 2) {
        const nextIndex = (activeCameraIndex + 1) % cameraList.length;
        setActiveCameraIndex(nextIndex);
        const nextCameraId = cameraList[nextIndex]?.id;
        await startScanner(nextCameraId);
      } else {
        const nextMode = facingMode === 'environment' ? 'user' : 'environment';
        setFacingMode(nextMode);
        await startScanner(undefined, nextMode);
      }
    } catch (err) {
      console.error("Failed to switch camera:", err);
      setScanError("Gagal mengganti kamera.");
    } finally {
      setIsTransitioning(false);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!scannerRef.current) {
      scannerRef.current = new Html5Qrcode(scannerId, { verbose: false });
    }

    try {
      const decodedText = await scannerRef.current.scanFile(file, true);
      if (decodedText && onDetected) {
        onDetected(decodedText as string);
      }
    } catch (error) {
      setScanError('QR Code tidak ditemukan pada gambar.');
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-0 md:p-6 font-sans">
      {/* Menggunakan h-screen dan w-full di mobile agar terasa seperti aplikasi penuh */}
      <div className="max-w-md w-full h-[100dvh] md:h-auto md:max-h-[90vh] bg-white md:rounded-[2rem] shadow-2xl overflow-hidden flex flex-col">
        
        {/* Konten Fleksibel */}
        <div className="flex-1 flex flex-col p-6 overflow-y-auto">
          
          {/* Header Singkat */}
          <div className="text-center mb-6 mt-4">
            <h2 className="text-2xl font-bold text-slate-900 mb-1">Scan QR Meja</h2>
            <p className="text-slate-500 text-sm">Arahkan kamera ke QR code di meja Anda.</p>
          </div>

          {showScanner ? (
            <div className="flex-1 flex flex-col animate-in fade-in zoom-in-95 duration-300">
              
              {/* Kamera Viewport Besar */}
              <div className="relative w-full aspect-[3/4] max-h-[65vh] rounded-[2rem] bg-black overflow-hidden shadow-inner ring-1 ring-black/5">
                
                {/* Container Video html5-qrcode */}
                <div id={scannerId} className="w-full h-full absolute inset-0" />

                {/* Overlay Tombol Kiri Atas (Tutup) */}
                <button
                  onClick={onCloseScanner}
                  className="absolute top-5 left-5 z-50 p-3 bg-black/40 hover:bg-black/60 text-white rounded-full backdrop-blur-md transition-all border border-white/20"
                >
                  <X size={22} />
                </button>

                {/* Overlay Kotak Fokus (Reticle) */}
                <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center">
                  <div className="relative w-3/4 aspect-square max-w-[280px]">
                    <div className="absolute top-0 left-0 w-12 h-12 border-t-4 border-l-4 border-white rounded-tl-3xl"></div>
                    <div className="absolute top-0 right-0 w-12 h-12 border-t-4 border-r-4 border-white rounded-tr-3xl"></div>
                    <div className="absolute bottom-0 left-0 w-12 h-12 border-b-4 border-l-4 border-white rounded-bl-3xl"></div>
                    <div className="absolute bottom-0 right-0 w-12 h-12 border-b-4 border-r-4 border-white rounded-br-3xl"></div>
                    {/* Garis Scan Animasi */}
                    <div className="absolute top-0 left-0 w-full h-0.5 bg-blue-500 shadow-[0_0_12px_3px_rgba(59,130,246,0.6)] animate-[ping_3s_ease-in-out_infinite]" style={{ animation: 'scan 2.5s linear infinite' }}></div>
                  </div>
                </div>

                {/* Overlay Tombol Bawah (Galeri & Putar Kamera) */}
                <div className="absolute bottom-6 left-0 right-0 z-50 flex justify-center gap-6 px-6">
                  
                  {/* Tombol Galeri */}
                  <label className="flex flex-col items-center gap-2 cursor-pointer group">
                    <div className="p-3.5 bg-black/40 group-hover:bg-black/60 text-white rounded-full backdrop-blur-md transition-all border border-white/20">
                      <ImagePlus size={24} />
                    </div>
                    <span className="text-white text-xs font-medium drop-shadow-md">Galeri</span>
                    <input type="file" accept="image/*" className="hidden" onChange={handleFileUpload} />
                  </label>

                  {/* Tombol Balik Kamera */}
                  <button
                    onClick={switchCamera}
                    disabled={isTransitioning}
                    className="flex flex-col items-center gap-2 group disabled:opacity-50"
                  >
                    <div className="p-3.5 bg-black/40 group-hover:bg-black/60 text-white rounded-full backdrop-blur-md transition-all border border-white/20">
                      <RefreshCcw size={24} className={isTransitioning ? 'animate-spin' : ''} />
                    </div>
                    <span className="text-white text-xs font-medium drop-shadow-md">Putar</span>
                  </button>

                </div>
              </div>

              {/* Error Alert */}
              {scanError && (
                <div className="flex items-start gap-2 mt-4 p-3 bg-red-50 text-red-600 rounded-xl text-sm">
                  <AlertCircle size={18} className="shrink-0 mt-0.5" />
                  <p>{scanError}</p>
                </div>
              )}

            </div>
          ) : (
            /* Mode Standby */
            <div className="flex-1 flex flex-col justify-center gap-4">
              <div className="bg-slate-50 border border-slate-100 rounded-[2rem] p-8 text-center mb-4">
                <div className="inline-flex p-4 rounded-full bg-blue-50 text-blue-600 mb-4">
                  <QrCode size={40} strokeWidth={1.5} />
                </div>
                <h3 className="text-lg font-semibold text-slate-800 mb-2">Kamera Mati</h3>
                <p className="text-slate-500 text-sm">Tekan tombol di bawah untuk mulai memindai QR meja Anda.</p>
              </div>

              <button
                onClick={onOpenScanner}
                className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white py-4 px-4 rounded-2xl font-semibold hover:bg-blue-700 active:scale-[0.98] transition-all shadow-lg shadow-blue-600/20"
              >
                <QrCode size={20} />
                Buka Kamera
              </button>

              <button
                onClick={onOpenCustomerModal}
                className="w-full flex items-center justify-center gap-2 bg-white border-2 border-slate-200 text-slate-700 py-4 px-4 rounded-2xl font-semibold hover:border-slate-300 hover:bg-slate-50 active:scale-[0.98] transition-all"
              >
                <Keyboard size={20} className="text-slate-500" />
                Input Manual
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Global Style untuk mengatasi format video html5-qrcode */}
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes scan {
          0% { transform: translateY(0); opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% { transform: translateY(270px); opacity: 0; }
        }
        
        #customer-qr-scanner {
          width: 100% !important;
          height: 100% !important;
        }
        
        /* Memaksa video untuk mengisi area layaknya cover */
        #customer-qr-scanner video {
          width: 100% !important;
          height: 100% !important;
          object-fit: cover !important;
        }

        /* Menyembunyikan UI bawaan library yang sering bocor */
        #customer-qr-scanner img, #customer-qr-scanner a, #customer-qr-scanner select {
          display: none !important;
        }
      `}} />
    </div>
  );
}
