import { useEffect, useRef, useState } from "react";
import QRCode from "qrcode";
import { parseQRIS } from "../../../lib/qris-dinamis/index";
import { Button } from "@/components/ui/button";
import { Check, Copy, Download, QrCode } from "lucide-react";

interface Props {
  qrisString: string;
}

export function QRISResult({ qrisString }: Props) {
  const cardCanvasRef = useRef<HTMLCanvasElement>(null);
  const [copied, setCopied] = useState(false);
  const [nmid, setNmid] = useState<string>("");
  const [isRendered, setIsRendered] = useState(false);

  const parsed = parseQRIS(qrisString);

  // Fungsi untuk mengurai NMID (Tag 59)
  const extractNmid = (string: string): string => {
    const match = string.match(/59[0-9]{2}ID([0-9]+)/);
    return match ? `ID${match[1]}` : "";
  };

  useEffect(() => {
    const currentNmid = extractNmid(qrisString);
    setNmid(currentNmid);
    setIsRendered(false);

    if (cardCanvasRef.current && qrisString) {
      const canvas = cardCanvasRef.current;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      // Resolusi tinggi untuk hasil Download PNG (Skala 4x)
      const scale = 4;
      const width = 400; // Lebar logic
      const height = 640; // Tinggi logic
      const radius = 24;

      canvas.width = width * scale;
      canvas.height = height * scale;
      
      // Reset transform dan bersihkan canvas
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.scale(scale, scale);

      // 1. Gambar Base Kartu Putih dengan Sudut Melengkung
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
      
      // Aplikasikan bayangan halus untuk base card
      ctx.shadowColor = "rgba(0, 0, 0, 0.05)";
      ctx.shadowBlur = 10;
      ctx.shadowOffsetY = 4;
      ctx.fillStyle = "#FFFFFF";
      ctx.fill();
      
      // Matikan shadow agar elemen di dalamnya bersih
      ctx.shadowColor = "transparent";
      ctx.shadowBlur = 0;
      ctx.shadowOffsetY = 0;

      // Buat mask (clipping path) agar warna merah tidak keluar dari sudut kartu
      ctx.save();
      ctx.clip();

      // 2. Gambar Aksen Merah Khas QRIS
      const qrisRed = "#D62128";
      ctx.fillStyle = qrisRed;

      // Merah Kiri (Segitiga sejajar dengan QR Code)
      ctx.beginPath();
      ctx.moveTo(0, 230);
      ctx.lineTo(65, 300);
      ctx.lineTo(0, 370);
      ctx.closePath();
      ctx.fill();

      // Merah Kanan Bawah (Poligon presisi)
      ctx.beginPath();
      ctx.moveTo(250, 640);
      ctx.lineTo(340, 520);
      ctx.lineTo(400, 520);
      ctx.lineTo(400, 640);
      ctx.closePath();
      ctx.fill();

      // Lepaskan mask
      ctx.restore();

      // 3. Render Teks
      // Nama Merchant
      ctx.fillStyle = "#000000";
      ctx.textAlign = "center";
      ctx.font = "500 28px 'Inter', system-ui, sans-serif";
      // Membatasi panjang teks agar tidak tumpah
      const merchantName = parsed.merchantName.length > 25 
        ? parsed.merchantName.substring(0, 23) + "..." 
        : parsed.merchantName;
      ctx.fillText(merchantName, width / 2, 180);

      // NMID
      if (currentNmid) {
        ctx.fillStyle = "#333333";
        ctx.font = "400 14px 'Inter', system-ui, sans-serif";
        ctx.fillText(`NMID: ${currentNmid}`, width / 2, 215);
      }

      // 4. Proses Render Async (Logo & QR Code)
      const renderAssets = async () => {
        try {
          // A. Generate QR Code ke kanvas virtual
          const qrCanvas = document.createElement("canvas");
          await QRCode.toCanvas(qrCanvas, qrisString, {
            width: 270,
            margin: 1.5,
            color: {
              dark: "#000000",
              light: "#FFFFFF",
            },
            errorCorrectionLevel: "M",
          });

          // Draw QR Code ke canvas utama
          ctx.drawImage(qrCanvas, (width - 270) / 2, 245, 270, 270);

          // B. Load & Draw Logo
          const logo = new Image();
          logo.crossOrigin = "anonymous";
          logo.src = "/ico/qris.png";
          
          await new Promise((resolve, reject) => {
            logo.onload = resolve;
            logo.onerror = reject;
          });

          // Menggambar logo dengan rasio yang tepat
          ctx.drawImage(logo, 35, 45, 100, 32);

          // Teks di samping Logo
          ctx.fillStyle = "#000000";
          ctx.textAlign = "left";
          ctx.font = "500 12px 'Inter', system-ui, sans-serif";
          ctx.fillText("QR Code Standar", 145, 55);
          ctx.font = "400 12px 'Inter', system-ui, sans-serif";
          ctx.fillText("Pembayaran Nasional", 145, 72);

          setIsRendered(true);
        } catch (error) {
          console.error("Gagal me-render aset QRIS:", error);
          // Fallback teks jika logo gagal di-load
          ctx.fillStyle = "#000000";
          ctx.textAlign = "left";
          ctx.font = "900 24px 'Inter', system-ui, sans-serif";
          ctx.fillText("QRIS", 35, 70);
          ctx.font = "500 12px 'Inter', system-ui, sans-serif";
          ctx.fillText("QR Code Standar", 120, 55);
          ctx.fillText("Pembayaran Nasional", 120, 72);
          setIsRendered(true);
        }
      };

      renderAssets();
    }
  }, [qrisString, parsed.merchantName]);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(qrisString);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    if (!cardCanvasRef.current || !isRendered) return;
    const link = document.createElement("a");
    link.download = `QRIS-${parsed.merchantName.replace(/\s+/g, "-").toUpperCase()}.png`;
    link.href = cardCanvasRef.current.toDataURL("image/png");
    link.click();
  };

  return (
    <div className="rounded-2xl border border-border/50 bg-card overflow-hidden shadow-sm animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="px-5 py-4 border-b border-border/50 bg-muted/20">
        <h2 className="text-sm font-semibold flex items-center gap-2">
          <QrCode className="w-4 h-4 text-emerald-500" />
          Kartu QRIS Dinamis
        </h2>
      </div>

      <div className="p-6 flex flex-col items-center space-y-6">
        
        {/* Area Preview Card */}
        <div className="bg-muted/10 p-3 rounded-[32px] border border-border/50 shadow-inner">
          <canvas 
            ref={cardCanvasRef} 
            // Tampilan di UI diperkecil agar rapi (Resolusi aslinya 4x lebih besar)
            className="w-[300px] h-[480px] rounded-[24px] shadow-sm pointer-events-none" 
          />
        </div>

        {/* Informasi Pembayaran (UI Only) */}
        <div className="text-center space-y-1">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-widest">Total Pembayaran</p>
          <p className="text-3xl font-extrabold text-foreground">
            Rp {Number(parsed.amount ?? 0).toLocaleString("id-ID")}
          </p>
          
          {/* Detail Tambahan Biaya/Tip */}
          {parsed.tipIndicator === "fixed" && parsed.tipFixed && (
            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-muted rounded-full mt-2">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              <p className="text-xs font-medium text-muted-foreground">
                Termasuk Biaya Rp {Number(parsed.tipFixed).toLocaleString("id-ID")}
              </p>
            </div>
          )}
          {parsed.tipIndicator === "percentage" && parsed.tipPercentage && (
            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-muted rounded-full mt-2">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              <p className="text-xs font-medium text-muted-foreground">
                Termasuk Biaya {parsed.tipPercentage}%
              </p>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-3 w-full max-w-[340px]">
          <Button
            variant="outline"
            onClick={handleCopy}
            className="h-11 rounded-xl gap-2 border-border/80 font-semibold"
          >
            {copied ? (
              <>
                <Check className="w-4 h-4 text-emerald-500" />
                Tersalin
              </>
            ) : (
              <>
                <Copy className="w-4 h-4 text-muted-foreground" />
                Salin String
              </>
            )}
          </Button>

          <Button
            onClick={handleDownload}
            disabled={!isRendered}
            className="h-11 rounded-xl gap-2 font-semibold shadow-md shadow-primary/20"
          >
            <Download className="w-4 h-4" />
            Simpan PNG
          </Button>
        </div>
        
      </div>
    </div>
  );
}
