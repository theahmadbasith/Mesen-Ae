import { useEffect, useRef, useState } from "react";
import QRCode from "qrcode";
import { parseQRIS } from "../../../lib/qris-dinamis/index";
import { Button } from "@/components/ui/button";
import { Check, Copy, Download, QrCode, ShieldCheck } from "lucide-react";

interface Props {
  qrisString: string;
}

export function QRISResult({ qrisString }: Props) {
  const cardCanvasRef = useRef<HTMLCanvasElement>(null);
  const [copied, setCopied] = useState(false);
  const [nmid, setNmid] = useState<string>("");
  const [isRendered, setIsRendered] = useState(false);

  // Meng-parse data QRIS untuk mendapatkan Nama Merchant dan Nominal
  const parsed = parseQRIS(qrisString);

  /**
   * Fungsi untuk mengekstrak NMID (National Merchant ID).
   * Pada QRIS standar, NMID biasanya berada di tag 59 atau ID di tag 51/62.
   * Regex ini menangkap format ID diikuti 13-15 digit angka.
   */
  const extractNmid = (rawString: string): string => {
    const match = rawString.match(/ID[0-9]{10,15}/);
    return match ? match[0] : "";
  };

  useEffect(() => {
    // 1. Ekstrak NMID saat komponen dimuat
    const currentNmid = extractNmid(qrisString);
    setNmid(currentNmid);
    setIsRendered(false);

    // 2. Mulai proses rendering Canvas
    if (cardCanvasRef.current && qrisString) {
      const canvas = cardCanvasRef.current;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      // Konfigurasi Dimensi & Resolusi Tinggi (Scale 4x untuk ketajaman unduhan PNG)
      const scale = 4;
      const width = 400;   // Lebar logis kartu
      const height = 560;  // Tinggi logis kartu (lebih kompak dari sebelumnya)
      const radius = 24;   // Sudut melengkung (border-radius)

      // Sesuaikan ukuran asli canvas dengan skala
      canvas.width = width * scale;
      canvas.height = height * scale;
      
      // Reset matrix transformasi dan bersihkan kanvas
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.scale(scale, scale); // Terapkan skala HD

      // ==========================================
      // A. MENGGAMBAR BASE KARTU (Rounded White)
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
      
      // Efek bayangan (Shadow) lembut pada kartu
      ctx.shadowColor = "rgba(0, 0, 0, 0.06)";
      ctx.shadowBlur = 15;
      ctx.shadowOffsetY = 6;
      ctx.fillStyle = "#FFFFFF";
      ctx.fill();
      
      // Matikan shadow agar elemen di atasnya (teks/gambar) tidak ikut berbayang
      ctx.shadowColor = "transparent";
      ctx.shadowBlur = 0;
      ctx.shadowOffsetY = 0;

      // ==========================================
      // B. MENGGAMBAR AKSEN MERAH QRIS
      // ==========================================
      // Gunakan clipping mask agar aksen merah tidak keluar dari sudut membulat kartu
      ctx.save();
      ctx.clip();

      const qrisRed = "#ED1C24"; // Warna merah ofisial standar QRIS
      ctx.fillStyle = qrisRed;

      // 1. Aksen Merah Kiri (Segitiga sejajar sisi QR)
      ctx.beginPath();
      ctx.moveTo(0, 200);
      ctx.lineTo(60, 260);
      ctx.lineTo(0, 320);
      ctx.closePath();
      ctx.fill();

      // 2. Aksen Merah Kanan Bawah (Poligon membingkai sudut)
      ctx.beginPath();
      ctx.moveTo(270, height);
      ctx.lineTo(330, height - 80);
      ctx.lineTo(width, height - 80);
      ctx.lineTo(width, height);
      ctx.closePath();
      ctx.fill();

      ctx.restore(); // Lepaskan mask sudut membulat

      // ==========================================
      // C. RENDER TEKS (Merchant & NMID)
      // ==========================================
      // Memastikan nama tidak terlalu panjang agar tidak merusak layout kanvas
      const maxNameLength = 26;
      let displayName = parsed.merchantName;
      if (displayName.length > maxNameLength) {
        displayName = displayName.substring(0, maxNameLength - 3) + "...";
      }

      ctx.fillStyle = "#0f172a"; // Slate 900
      ctx.textAlign = "center";
      
      // Nama Toko
      ctx.font = "700 28px 'Inter', system-ui, -apple-system, sans-serif";
      ctx.fillText(displayName, width / 2, 125);

      // Baris NMID di bawah nama toko
      if (currentNmid) {
        ctx.fillStyle = "#475569"; // Slate 600
        ctx.font = "500 13px 'Inter', system-ui, -apple-system, sans-serif";
        ctx.fillText(`NMID: ${currentNmid}`, width / 2, 148);
      }

      // Teks Footer: Powered by MesenAe
      ctx.fillStyle = "#94a3b8"; // Slate 400
      ctx.font = "600 11px 'Inter', system-ui, sans-serif";
      ctx.fillText("Powered by MesenAe", width / 2, height - 25);

      // ==========================================
      // D. PROSES ASYNCHRONOUS (Render QR & Logo)
      // ==========================================
      const renderAssets = async () => {
        try {
          // 1. Generate QR Code ke Virtual Canvas
          const qrVirtualCanvas = document.createElement("canvas");
          const qrSize = 280;
          await QRCode.toCanvas(qrVirtualCanvas, qrisString, {
            width: qrSize,
            margin: 1.5,
            color: {
              dark: "#000000",
              light: "#FFFFFF",
            },
            errorCorrectionLevel: "M", // Medium (cukup aman untuk scan standar)
          });

          // Posisikan QR di tengah, sedikit ke bawah nama merchant
          const qrX = (width - qrSize) / 2;
          const qrY = 175;
          ctx.drawImage(qrVirtualCanvas, qrX, qrY, qrSize, qrSize);

          // 2. Load & Draw Logo secara presisi rasio (Mencegah lonjong)
          const logo = new Image();
          logo.crossOrigin = "anonymous";
          logo.src = "/ico/qris.png"; // Pastikan path public/ico/qris.png ini benar di project Anda
          
          await new Promise((resolve, reject) => {
            logo.onload = resolve;
            logo.onerror = reject;
          });

          // Kalkulasi aspek rasio agar logo tidak gepeng/lonjong
          const logoTargetHeight = 32;
          const logoRatio = logo.width / logo.height;
          const logoTargetWidth = logoTargetHeight * logoRatio;
          const logoX = 35;
          const logoY = 35;

          // Gambar logo dengan rasio yang tepat
          ctx.drawImage(logo, logoX, logoY, logoTargetWidth, logoTargetHeight);

          // Teks Header Pendamping Logo
          ctx.fillStyle = "#000000";
          ctx.textAlign = "left";
          
          // Posisi X teks disesuaikan dengan lebar logo dinamis + margin 15px
          const textStartX = logoX + logoTargetWidth + 15;
          
          ctx.font = "600 11px 'Inter', system-ui, sans-serif";
          ctx.fillText("QR Code Standar", textStartX, logoY + 12);
          
          ctx.font = "400 11px 'Inter', system-ui, sans-serif";
          ctx.fillText("Pembayaran Nasional", textStartX, logoY + 28);

          // Selesai render
          setIsRendered(true);
        } catch (error) {
          console.error("Gagal merender Logo QRIS/QRCode:", error);
          
          // --- FALLBACK JIKA LOGO GAGAL DILAPOR ---
          // Tetap tampilkan layout dengan teks "QRIS" jika logo gambar gagal diload
          ctx.fillStyle = "#0f172a";
          ctx.textAlign = "left";
          ctx.font = "900 28px 'Inter', system-ui, sans-serif";
          ctx.fillText("QRIS", 35, 60);
          
          ctx.font = "600 11px 'Inter', system-ui, sans-serif";
          ctx.fillText("QR Code Standar", 115, 48);
          ctx.font = "400 11px 'Inter', system-ui, sans-serif";
          ctx.fillText("Pembayaran Nasional", 115, 64);
          
          setIsRendered(true);
        }
      };

      // Jalankan fungsi asinkron
      renderAssets();
    }
  }, [qrisString, parsed.merchantName]);

  // Fungsi untuk menyalin string
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(qrisString);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  // Fungsi untuk mengunduh Canvas menjadi PNG High-Res
  const handleDownload = () => {
    if (!cardCanvasRef.current || !isRendered) return;
    const link = document.createElement("a");
    // Format nama file rapi: qris-[nama-toko].png
    const sanitizedName = parsed.merchantName.replace(/[^a-zA-Z0-9]/g, "-").toLowerCase();
    link.download = `qris-${sanitizedName || 'dinamis'}.png`;
    link.href = cardCanvasRef.current.toDataURL("image/png");
    link.click();
  };

  return (
    <div className="rounded-2xl border border-border/50 bg-card overflow-hidden shadow-sm animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* Header Panel */}
      <div className="px-5 py-4 border-b border-border/50 bg-muted/20 flex items-center justify-between">
        <h2 className="text-sm font-semibold flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-500" />
          QRIS Dinamis Siap
        </h2>
      </div>

      <div className="p-6 flex flex-col items-center space-y-6">
        
        {/* ======================================= */}
        {/* 1. AREA PREVIEW KARTU                   */}
        {/* ======================================= */}
        <div className="bg-slate-50/50 p-3 rounded-[28px] border border-border/60 shadow-inner">
          <canvas 
            ref={cardCanvasRef} 
            // Tampilan di-scale down melalui CSS agar muat di UI (Rasio asli Canvas adalah 400x560 * 4)
            className="w-[300px] h-[420px] rounded-[20px] shadow-sm pointer-events-none transition-transform duration-300 hover:scale-[1.02]" 
          />
        </div>

        {/* ======================================= */}
        {/* 2. RINGKASAN PEMBAYARAN (UI Only)       */}
        {/* ======================================= */}
        <div className="text-center space-y-1 w-full">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">
            Nominal Pembayaran
          </p>
          <p className="text-3xl font-extrabold text-foreground tracking-tight">
            Rp {Number(parsed.amount ?? 0).toLocaleString("id-ID")}
          </p>
          
          {/* Detail Tambahan Biaya/Tip (Jika Ada) */}
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
        {/* 3. INPUT STRING & BUTTONS ACTIONS       */}
        {/* ======================================= */}
        <div className="w-full max-w-[340px] space-y-3">
          
          {/* Menampilkan String QRIS dalam satu baris dengan ellipsis (rapi) */}
          <div className="flex items-center gap-2 p-1.5 bg-muted/40 rounded-xl border border-border/60">
            <div className="flex-1 px-3 text-xs font-mono text-muted-foreground truncate" title={qrisString}>
              {qrisString}
            </div>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={handleCopy}
              className="h-8 rounded-lg px-3 shrink-0"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
            </Button>
          </div>

          {/* Tombol Utama */}
          <div className="grid grid-cols-2 gap-3 pt-2">
            <Button
              variant="outline"
              onClick={handleCopy}
              className="h-11 rounded-xl gap-2 border-border/80 font-semibold bg-background hover:bg-muted/50"
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4 text-emerald-500" />
                  <span className="text-emerald-600">Tersalin</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4 text-muted-foreground" />
                  Salin Kode
                </>
              )}
            </Button>

            <Button
              onClick={handleDownload}
              disabled={!isRendered}
              className="h-11 rounded-xl gap-2 font-semibold shadow-md shadow-primary/20 transition-all active:scale-95"
            >
              <Download className="w-4 h-4" />
              Simpan PNG
            </Button>
          </div>
        </div>
        
      </div>
    </div>
  );
}
