import { useEffect, useRef, useState } from "react";
import QRCode from "qrcode";
import { parseQRIS } from "../../../lib/qris-dinamis/index";
import { Button } from "@/components/ui/button";
import { Check, Copy, Download, ShieldCheck } from "lucide-react";

interface Props {
  qrisString: string;
}

export function QRISResult({ qrisString }: Props) {
  const cardCanvasRef = useRef<HTMLCanvasElement>(null);
  const [copied, setCopied] = useState(false);
  const [nmid, setNmid] = useState<string>("");
  const [isRendered, setIsRendered] = useState(false);

  // Parse data string QRIS untuk mendapatkan Nominal, Tip, dan Nama Merchant
  const parsed = parseQRIS(qrisString);
  const nominalValue = Number(parsed.amount ?? 0);
  const formattedNominal = nominalValue.toLocaleString("id-ID");

  /**
   * Fungsi ekstraksi NMID (National Merchant ID).
   * Standar QRIS: Biasanya berada pada tag spesifik dan memiliki format 
   * awalan "ID" diikuti 11 hingga 15 karakter numerik/alfanumerik.
   */
  const extractNmid = (rawString: string): string => {
    const match = rawString.match(/ID[A-Za-z0-9]{11,15}/);
    return match ? match[0] : "";
  };

  useEffect(() => {
    // 1. Ekstrak dan set NMID asli dari string
    const currentNmid = extractNmid(qrisString);
    setNmid(currentNmid);
    setIsRendered(false);

    // 2. Render UI Kartu QRIS ke dalam Canvas
    if (cardCanvasRef.current && qrisString) {
      const canvas = cardCanvasRef.current;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      // Konfigurasi Dimensi Canvas & Resolusi (Scale 4x untuk PNG resolusi tinggi)
      const scale = 4;
      const width = 400;   // Lebar logis yang pas
      const height = 560;  // Tinggi logis, cukup padat dan tidak terlalu panjang
      const radius = 24;

      canvas.width = width * scale;
      canvas.height = height * scale;
      
      // Reset dan aplikasikan skala tinggi
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.scale(scale, scale);

      // ==========================================
      // A. BASE KARTU (Putih dengan Sudut Melengkung)
      // ==========================================
      ctx.beginPath();
      ctx.moveTo(radius, 0);
      ctx.lineTo(width - radius, 0);
      ctx.quadraticCurveTo(width, 0, width, radius);
      ctx.lineTo(width, height - radius);
      ctx.quadraticCurveTo(width, height, width - radius, height);
      ctx.lineTo(radius, height);
      ctx.quadraticCurveTo(0, height, 0, height - radius);
      ctx.lineTo(0, radius);
      ctx.quadraticCurveTo(0, 0, radius, 0);
      ctx.closePath();
      
      // Efek bayangan halus
      ctx.shadowColor = "rgba(0, 0, 0, 0.05)";
      ctx.shadowBlur = 20;
      ctx.shadowOffsetY = 8;
      ctx.fillStyle = "#FFFFFF";
      ctx.fill();
      
      // Reset shadow untuk layer berikutnya
      ctx.shadowColor = "transparent";
      ctx.shadowBlur = 0;
      ctx.shadowOffsetY = 0;

      // ==========================================
      // B. AKSEN MERAH STANDAR QRIS (Vector Masking)
      // ==========================================
      ctx.save();
      ctx.clip(); // Agar warna merah tidak meluber keluar batas radius kartu

      const qrisRed = "#ED1C24"; // Merah ofisial QRIS
      ctx.fillStyle = qrisRed;

      // Aksen Merah Kiri Tengah (Sejajar tinggi QR)
      ctx.beginPath();
      ctx.moveTo(0, 205);
      ctx.lineTo(65, 270);
      ctx.lineTo(0, 335);
      ctx.closePath();
      ctx.fill();

      // Aksen Merah Kanan Bawah
      ctx.beginPath();
      ctx.moveTo(260, height);
      ctx.lineTo(330, height - 85);
      ctx.lineTo(width, height - 85);
      ctx.lineTo(width, height);
      ctx.closePath();
      ctx.fill();

      ctx.restore(); 

      // ==========================================
      // C. RENDER TEKS (Merchant, NMID & Footer)
      // ==========================================
      // Pemotongan nama toko jika sangat panjang agar rapi
      const maxNameLength = 26;
      let displayName = parsed.merchantName;
      if (displayName.length > maxNameLength) {
        displayName = displayName.substring(0, maxNameLength - 3) + "...";
      }

      ctx.textAlign = "center";
      
      // Nama Toko (Tengah Atas)
      ctx.fillStyle = "#0f172a";
      ctx.font = "700 28px 'Inter', system-ui, sans-serif";
      ctx.fillText(displayName, width / 2, 135);

      // NMID (Di bawah nama toko)
      if (currentNmid) {
        ctx.fillStyle = "#475569"; // Abu-abu tegas
        ctx.font = "500 14px 'Inter', system-ui, sans-serif";
        ctx.fillText(`NMID: ${currentNmid}`, width / 2, 160);
      }

      // Teks Footer 1: Indikator QRIS Dinamis & Nominal
      ctx.fillStyle = "#0f172a";
      ctx.font = "700 15px 'Inter', system-ui, sans-serif";
      ctx.fillText(`QRIS Dinamis - Rp ${formattedNominal}`, width / 2, 505);

      // Teks Footer 2: Powered By
      ctx.fillStyle = "#94a3b8"; // Abu-abu muda
      ctx.font = "600 11px 'Inter', system-ui, sans-serif";
      ctx.fillText("Powered by MesenAe", width / 2, 528);

      // ==========================================
      // D. ASYNC RENDER (QR Code & Logo)
      // ==========================================
      const renderAssets = async () => {
        try {
          // 1. Render Barcode QRIS
          const qrVirtualCanvas = document.createElement("canvas");
          const qrSize = 280;
          await QRCode.toCanvas(qrVirtualCanvas, qrisString, {
            width: qrSize,
            margin: 1.5,
            color: { dark: "#000000", light: "#FFFFFF" },
            errorCorrectionLevel: "M", 
          });

          // Posisikan QR di bagian tengah
          const qrX = (width - qrSize) / 2;
          const qrY = 185; 
          ctx.drawImage(qrVirtualCanvas, qrX, qrY, qrSize, qrSize);

          // 2. Render Logo QRIS
          const logo = new Image();
          logo.crossOrigin = "anonymous";
          logo.src = "/ico/qris.png"; 
          
          await new Promise((resolve, reject) => {
            logo.onload = resolve;
            logo.onerror = reject;
          });

          // Kalkulasi tinggi/lebar logo yang diperbesar namun tetap proporsional
          const logoTargetHeight = 38; // Logo diperbesar dari versi sebelumnya
          const logoRatio = logo.width / logo.height;
          const logoTargetWidth = logoTargetHeight * logoRatio;
          const logoX = 35;
          const logoY = 32;

          ctx.drawImage(logo, logoX, logoY, logoTargetWidth, logoTargetHeight);

          // Teks di samping logo (Diperbesar agar jelas)
          const textStartX = logoX + logoTargetWidth + 16;
          
          ctx.fillStyle = "#0f172a";
          ctx.textAlign = "left";
          
          ctx.font = "700 13px 'Inter', system-ui, sans-serif"; // Lebih tebal dan besar
          ctx.fillText("QR Code Standar", textStartX, logoY + 16);
          
          ctx.fillStyle = "#334155";
          ctx.font = "500 12px 'Inter', system-ui, sans-serif";
          ctx.fillText("Pembayaran Nasional", textStartX, logoY + 32);

          // Sukses
          setIsRendered(true);
        } catch (error) {
          console.error("Gagal me-render QRIS Canvas:", error);
          
          // Fallback murni Canvas jika gambar Logo tidak ditemukan
          ctx.fillStyle = "#0f172a";
          ctx.textAlign = "left";
          ctx.font = "900 32px 'Inter', system-ui, sans-serif";
          ctx.fillText("QRIS", 35, 62);
          
          ctx.font = "700 13px 'Inter', system-ui, sans-serif";
          ctx.fillText("QR Code Standar", 125, 48);
          ctx.fillStyle = "#334155";
          ctx.font = "500 12px 'Inter', system-ui, sans-serif";
          ctx.fillText("Pembayaran Nasional", 125, 64);
          
          setIsRendered(true);
        }
      };

      renderAssets();
    }
  }, [qrisString, parsed.merchantName, formattedNominal]);

  // Handler Salin Teks
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(qrisString);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Gagal menyalin:", err);
    }
  };

  // Handler Download Gambar Kartu QRIS
  const handleDownload = () => {
    if (!cardCanvasRef.current || !isRendered) return;
    const link = document.createElement("a");
    const sanitizedName = parsed.merchantName.replace(/[^a-zA-Z0-9]/g, "-").toLowerCase();
    link.download = `qris-${sanitizedName || 'dinamis'}.png`;
    link.href = cardCanvasRef.current.toDataURL("image/png");
    link.click();
  };

  return (
    <div className="rounded-2xl border border-border/50 bg-card overflow-hidden shadow-sm animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* Header Label */}
      <div className="px-5 py-4 border-b border-border/50 bg-muted/20 flex items-center justify-between">
        <h2 className="text-sm font-semibold flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-500" />
          QRIS Dinamis Siap
        </h2>
      </div>

      <div className="p-6 flex flex-col items-center space-y-6">
        
        {/* ======================================= */}
        {/* AREA PREVIEW CANVAS KARTU QRIS          */}
        {/* ======================================= */}
        <div className="bg-slate-50/50 p-3 rounded-[28px] border border-border/60 shadow-inner">
          <canvas 
            ref={cardCanvasRef} 
            // Tampilan di UI diperkecil secara visual (skala CSS) tapi ukuran asli tetap 4x HD
            className="w-[300px] h-[420px] rounded-[20px] shadow-sm pointer-events-none transition-transform duration-300 hover:scale-[1.02]" 
          />
        </div>

        {/* ======================================= */}
        {/* RINGKASAN PEMBAYARAN (Teks UI)          */}
        {/* ======================================= */}
        <div className="text-center space-y-1 w-full">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">
            Nominal Pembayaran
          </p>
          <p className="text-3xl font-extrabold text-foreground tracking-tight">
            Rp {formattedNominal}
          </p>
          
          {/* Detail Tambahan Biaya/Tip (Bila Ada) */}
          {parsed.tipIndicator === "fixed" && parsed.tipFixed && (
            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-500/10 text-emerald-600 rounded-full mt-2">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              <p className="text-xs font-medium">
                Termasuk Biaya Rp {Number(parsed.tipFixed).toLocaleString("id-ID")}
              </p>
            </div>
          )}
          {parsed.tipIndicator === "percentage" && parsed.tipPercentage && (
            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-500/10 text-emerald-600 rounded-full mt-2">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              <p className="text-xs font-medium">
                Termasuk Biaya {parsed.tipPercentage}%
              </p>
            </div>
          )}
        </div>

        {/* ======================================= */}
        {/* KOLOM STRING & TOMBOL DOWNLOAD          */}
        {/* ======================================= */}
        <div className="w-full max-w-[340px] space-y-4 pt-2">
          
          {/* Kolom Teks String QRIS sebaris (dengan ellipsis) yang rapi */}
          <div className="flex items-center gap-2 p-1.5 bg-background rounded-xl border border-input shadow-sm">
            <div className="flex-1 px-3 text-xs font-mono text-muted-foreground truncate" title={qrisString}>
              {qrisString}
            </div>
            
            {/* Tombol Salin Terintegrasi di Kolom Teks */}
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={handleCopy}
              className="h-8 rounded-lg px-3 shrink-0 bg-muted hover:bg-muted/80 transition-colors"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-500 mr-1.5" />
                  <span className="text-emerald-600 text-[11px] font-semibold">Tersalin</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-foreground mr-1.5" />
                  <span className="text-[11px] font-semibold">Salin</span>
                </>
              )}
            </Button>
          </div>

          {/* Tombol Utama Download Tunggal, Besar, dan Eksklusif */}
          <Button
            onClick={handleDownload}
            disabled={!isRendered}
            className="w-full h-12 rounded-xl gap-2 text-[15px] font-bold shadow-lg shadow-primary/25 transition-all active:scale-95"
          >
            <Download className="w-5 h-5" />
            Simpan PNG
          </Button>
        </div>
        
      </div>
    </div>
  );
}
