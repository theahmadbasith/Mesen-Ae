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

      // Merah Kanan Bawah (Poligon presisi seperti di gambar pertama)
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
          console.
