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

  const parsed = parseQRIS(qrisString);

  // Fungsi untuk mengurai NMID (sering ditemukan di bawah tag 59 atau 62 di QRIS)
  // Ini mungkin perlu disesuaikan tergantung pada pustaka parseQRIS Anda
  const extractNmid = (string: string): string => {
    // Implementasi sederhana untuk mengurai NMID. 
    // Dalam QRIS standar Indonesia, NMID seringkali berada di bawah tag 59
    // dengan format IDxxxxxxxxxxx. Kita akan mencari tag 59
    const match = string.match(/59[0-9]{2}ID([0-9]+)/);
    return match ? `ID${match[1]}` : "";
  };

  useEffect(() => {
    const currentNmid = extractNmid(qrisString);
    setNmid(currentNmid);

    if (cardCanvasRef.current && qrisString) {
      const cardCanvas = cardCanvasRef.current;
      const ctx = cardCanvas.getContext("2d");
      if (!ctx) return;

      // Dimensi kartu kartu kartu kartu (meniru image_0.png)
      const cardWidth = 360;
      const cardHeight = 560;
      const borderRadius = 24;

      cardCanvas.width = cardWidth;
      cardCanvas.height = cardHeight;

      // Menggambar latar belakang putih dengan sudut membulat
      ctx.beginPath();
      ctx.moveTo(borderRadius, 0);
      ctx.lineTo(cardWidth - borderRadius, 0);
      ctx.quadraticCurveTo(cardWidth, 0, cardWidth, borderRadius);
      ctx.lineTo(cardWidth, cardHeight - borderRadius);
      ctx.quadraticCurveTo(cardWidth, cardHeight, cardWidth - borderRadius, cardHeight);
      ctx.lineTo(borderRadius, cardHeight);
      ctx.quadraticCurveTo(0, cardHeight, 0, cardHeight - borderRadius);
      ctx.lineTo(0, borderRadius);
      ctx.quadraticCurveTo(0, 0, borderRadius, 0);
      ctx.closePath();
      ctx.fillStyle = "#FFFFFF";
      ctx.fill();

      // Menggambar aksen merah (segitiga/poligon)
      const redColor = "#DA291C"; // Warna merah QRIS standar
      ctx.fillStyle = redColor;

      // Aksen kiri atas (di belakang Pedagang)
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(120, 0); // Atas
      ctx.lineTo(70, 150); // Miring
      ctx.lineTo(0, 150); // Kiri
      ctx.closePath();
      ctx.fill();

      // Aksen kanan bawah (di bawah QR Code)
      ctx.beginPath();
      ctx.moveTo(cardWidth, cardHeight);
      ctx.lineTo(cardWidth, cardHeight - 160); // Kanan
      ctx.lineTo(cardWidth - 140, cardHeight - 100); // Miring
      ctx.lineTo(cardWidth - 140, cardHeight); // Bawah
      ctx.closePath();
      ctx.fill();

      // Menulis Header
      ctx.fillStyle = "#000000";
      ctx.font = "bold 20px 'Inter', sans-serif";
      ctx.textAlign = "left";
      ctx.fillText("QRIS", 30, 40);

      ctx.fillStyle = "#5F6368"; // Abu-abu gelap
      ctx.font = "12px 'Inter', sans-serif";
      ctx.fillText("QR Code Standar", 30, 60);
      ctx.fillText("Pembayaran Nasional", 30, 75);

      // Menulis Detail Pedagang
      ctx.fillStyle = "#000000";
      ctx.font = "bold 28px 'Inter', sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(parsed.merchantName, cardWidth / 2, 120);

      if (currentNmid) {
        ctx.fillStyle = "#5F6368";
        ctx.font = "14px 'Inter', sans-serif";
        ctx.fillText(`NMID: ${currentNmid}`, cardWidth / 2, 145);
      }

      // Merender QR Code mentah ke kanvas sementara 200x200
      const qrCanvas = document.createElement("canvas");
      qrCanvas.width = 240;
      qrCanvas.height = 240;
      QRCode.toCanvas(qrCanvas, qrisString, {
        width: 240,
        margin: 2,
        color: {
          dark: "#000000",
          light: "#FFFFFF",
        },
        errorCorrectionLevel: "M",
      });

      // Menyalin kanvas QR code mentah ke kanvas kartu lengkap, dipusatkan di area bawah
      ctx.drawImage(qrCanvas, (cardWidth - 240) / 2, 220, 240, 240);
    }
  }, [qrisString]);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(qrisString);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    if (!cardCanvasRef.current) return;
    const link = document.createElement("a");
    link.download = `qris-dinamis-${parsed.merchantName.replace(/\s+/g, "-").toLowerCase()}.png`;
    link.href = cardCanvasRef.current.toDataURL("image/png");
    link.click();
  };

  return (
    <div className="rounded-xl border border-border/50 bg-background overflow-hidden shadow-sm animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="px-5 py-4 border-b border-border/50 bg-muted/30">
        <h2 className="text-sm font-semibold flex items-center gap-2">
          <QrCode className="w-4 h-4 text-emerald-500" />
          Hasil QRIS Dinamis
        </h2>
      </div>

      <div className="p-6 flex flex-col items-center space-y-6">
        {/* QR Code Card Preview */}
        <div className="p-2 bg-muted/20 rounded-3xl border border-border/50">
          <canvas ref={cardCanvasRef} className="w-[300px] h-[466px] rounded-3xl" />
        </div>

        {/* Info (Outside Canvas for accessibility) */}
        <div className="text-center space-y-1">
          <p className="text-sm font-medium text-muted-foreground">{parsed.merchantName}</p>
          {nmid && <p className="text-xs text-muted-foreground">NMID: {nmid}</p>}
          <p className="text-3xl font-bold text-primary mt-2">
            Rp {Number(parsed.amount ?? 0).toLocaleString("id-ID")}
          </p>
          {parsed.tipIndicator === "fixed" && parsed.tipFixed && (
            <p className="text-sm text-muted-foreground bg-muted inline-block px-3 py-1 rounded-full mt-2">
              + Biaya Rp {Number(parsed.tipFixed).toLocaleString("id-ID")}
                            </p>
          )}
          {parsed.tipIndicator === "percentage" && parsed.tipPercentage && (
            <p className="text-sm text-muted-foreground bg-muted inline-block px-3 py-1 rounded-full mt-2">
              + Biaya {parsed.tipPercentage}%
            </p>
          )}
        </div>

        {/* QRIS String */}
        <div className="w-full">
          <div className="bg-muted/50 border border-border/50 rounded-lg p-4 break-all font-mono text-xs text-muted-foreground max-h-32 overflow-y-auto">
            {qrisString}
          </div>
        </div>

        {/* Action buttons */}
        <div className="grid grid-cols-2 gap-3 w-full">
          <Button
            variant="outline"
            onClick={handleCopy}
            className="gap-2"
          >
            {copied ? (
              <>
                <Check className="w-4 h-4 text-emerald-500" />
                Tersalin!
              </>
            ) : (
              <>
                <Copy className="w-4 h-4" />
                Salin String
              </>
            )}
          </Button>

          <Button
            onClick={handleDownload}
            className="gap-2"
          >
            <Download className="w-4 h-4" />
            Download QR
          </Button>
        </div>
      </div>
    </div>
  );
}
