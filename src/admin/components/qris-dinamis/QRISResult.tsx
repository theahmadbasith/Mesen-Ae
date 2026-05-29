import { useEffect, useRef, useState } from "react";
import QRCode from "qrcode";
import { parseQRIS } from "../../../lib/qris-dinamis/index";
import { Button } from "@/components/ui/button";
import { Check, Copy, Download, ShieldCheck, Maximize2 } from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";

interface Props {
  qrisString: string;
}

export function QRISResult({ qrisString }: Props) {
  const cardCanvasRef = useRef<HTMLCanvasElement>(null);
  const [copied, setCopied] = useState(false);
  const [nmid, setNmid] = useState<string>("");
  const [isRendered, setIsRendered] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [imageUrl, setImageUrl] = useState("");

  const parsed = parseQRIS(qrisString);
  const nominalValue = Number(parsed.amount ?? 0);
  const formattedNominal = nominalValue.toLocaleString("id-ID");

  const extractNmid = (rawString: string): string => {
    const match = rawString.match(/0215(ID[A-Z0-9]{13})/);
    return match ? match[1] : ""; 
  };

  useEffect(() => {
    const currentNmid = extractNmid(qrisString);
    setNmid(currentNmid);
    setIsRendered(false);

    if (cardCanvasRef.current && qrisString) {
      const canvas = cardCanvasRef.current;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const scale = 4;
      const width = 400;   
      const height = 580;  
      const cardRadius = 24;

      canvas.width = width * scale;
      canvas.height = height * scale;
      
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.scale(scale, scale);

      const drawRoundedRect = (
        context: CanvasRenderingContext2D, 
        x: number, y: number, w: number, h: number, r: number
      ) => {
        context.beginPath();
        context.moveTo(x + r, y);
        context.lineTo(x + w - r, y);
        context.quadraticCurveTo(x + w, y, x + w, y + r);
        context.lineTo(x + w, y + h - r);
        context.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
        context.lineTo(x + r, y + h);
        context.quadraticCurveTo(x, y + h, x, y + h - r);
        context.lineTo(x, y + r);
        context.quadraticCurveTo(x, y, x + r, y);
        context.closePath();
      };

      // Base Kartu Putih
      drawRoundedRect(ctx, 0, 0, width, height, cardRadius);
      ctx.fillStyle = "#FFFFFF";
      ctx.shadowColor = "rgba(0, 0, 0, 0.08)";
      ctx.shadowBlur = 20;
      ctx.shadowOffsetY = 10;
      ctx.fill();
      
      ctx.shadowColor = "transparent";
      ctx.shadowBlur = 0;
      ctx.shadowOffsetY = 0;

      // Aksen Merah
      ctx.save();
      drawRoundedRect(ctx, 0, 0, width, height, cardRadius);
      ctx.clip(); 

      const qrisRed = "#DA291C"; 
      ctx.fillStyle = qrisRed;

      ctx.beginPath();
      ctx.moveTo(0, 180);
      ctx.lineTo(100, 270);
      ctx.lineTo(0, 400);
      ctx.fill();

      ctx.beginPath();
      ctx.moveTo(250, height);
      ctx.lineTo(400, height - 160);
      ctx.lineTo(400, height);
      ctx.fill();

      ctx.restore(); 

      // Footer
      const footerX = 25; 
      ctx.textAlign = "left";
      
      ctx.fillStyle = "#0f172a";
      ctx.font = "700 15px 'Inter', system-ui, sans-serif";
      ctx.fillText(`QRIS Dinamis - Rp ${formattedNominal}`, footerX, 540);

      ctx.fillStyle = "#64748b"; 
      ctx.font = "500 12px 'Inter', system-ui, sans-serif";
      ctx.fillText("Powered by MesenAe", footerX, 560);

      // Async Render Logo, Text, Auto-scale Nama Merchant, dan QR Code
      const renderAssets = async () => {
        try {
          const logo = new Image();
          logo.crossOrigin = "anonymous";
          logo.src = "/ico/qris.png"; 
          
          await new Promise((resolve, reject) => {
            logo.onload = resolve;
            logo.onerror = reject;
          });

          const logoTargetHeight = 32;
          const logoRatio = logo.width / logo.height;
          const logoTargetWidth = logoTargetHeight * logoRatio;
          const logoX = 25;
          const logoY = 30;

          ctx.drawImage(logo, logoX, logoY, logoTargetWidth, logoTargetHeight);

          const textStartX = logoX + logoTargetWidth + 14;
          ctx.fillStyle = "#000000";
          ctx.textAlign = "left";
          
          // Diturunkan sedikit posisinya dari logoY
          ctx.font = "700 14px 'Inter', system-ui, sans-serif";
          ctx.fillText("QR Code Standar", textStartX, logoY + 18); 
          
          ctx.fillStyle = "#334155";
          ctx.font = "400 13px 'Inter', system-ui, sans-serif";
          ctx.fillText("Pembayaran Nasional", textStartX, logoY + 36);

          // Auto-scaling font size untuk Merchant Name
          let fontSize = 28;
          ctx.font = `700 ${fontSize}px 'Inter', system-ui, sans-serif`;
          let displayName = parsed.merchantName;
          const maxTextWidth = 340; 

          while (ctx.measureText(displayName).width > maxTextWidth && fontSize > 16) {
            fontSize -= 1;
            ctx.font = `700 ${fontSize}px 'Inter', system-ui, sans-serif`;
          }

          if (ctx.measureText(displayName).width > maxTextWidth) {
            while (ctx.measureText(displayName + "...").width > maxTextWidth && displayName.length > 0) {
              displayName = displayName.slice(0, -1);
            }
            displayName += "...";
          }

          ctx.fillStyle = "#000000";
          ctx.textAlign = "center";
          ctx.fillText(displayName, width / 2, 135);

          if (currentNmid) {
            ctx.fillStyle = "#1E293B"; 
            ctx.font = "400 15px 'Inter', system-ui, sans-serif";
            ctx.fillText(`NMID: ${currentNmid}`, width / 2, 160);
          }

          // Cutout & QR Code
          const qrBoxSize = 310;
          const qrBoxX = (width - qrBoxSize) / 2; 
          const qrBoxY = 190;
          
          ctx.fillStyle = "#FFFFFF";
          drawRoundedRect(ctx, qrBoxX, qrBoxY, qrBoxSize, qrBoxSize, 20);
          ctx.fill();

          const qrVirtualCanvas = document.createElement("canvas");
          const qrInnerSize = 290; 
          await QRCode.toCanvas(qrVirtualCanvas, qrisString, {
            width: qrInnerSize,
            margin: 1, 
            color: { dark: "#000000", light: "#FFFFFF" },
            errorCorrectionLevel: "M", 
          });

          const qrInnerX = qrBoxX + (qrBoxSize - qrInnerSize) / 2;
          const qrInnerY = qrBoxY + (qrBoxSize - qrInnerSize) / 2;
          ctx.drawImage(qrVirtualCanvas, qrInnerX, qrInnerY, qrInnerSize, qrInnerSize);

          // Simpan URL gambar untuk Modal Preview
          setImageUrl(canvas.toDataURL("image/png", 1.0));
          setIsRendered(true);
        } catch (error) {
          console.error("Gagal me-render QRIS Canvas:", error);
          
          ctx.fillStyle = "#000000";
          ctx.textAlign = "left";
          ctx.font = "900 36px 'Inter', system-ui, sans-serif";
          ctx.fillText("QRIS", 25, 60); 
          ctx.font = "700 14px 'Inter', system-ui, sans-serif";
          ctx.fillText("QR Code Standar", 120, 50); 
          ctx.font = "400 13px 'Inter', system-ui, sans-serif";
          ctx.fillText("Pembayaran Nasional", 120, 68); 
          
          setImageUrl(canvas.toDataURL("image/png", 1.0));
          setIsRendered(true);
        }
      };

      renderAssets();
    }
  }, [qrisString, parsed.merchantName, formattedNominal]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(qrisString);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Gagal menyalin:", err);
    }
  };

  const handleDownload = () => {
    if (!imageUrl) return;
    const link = document.createElement("a");
    const sanitizedName = parsed.merchantName.replace(/[^a-zA-Z0-9]/g, "-").toLowerCase();
    link.download = `qris-${sanitizedName}.png`;
    link.href = imageUrl;
    link.click();
  };

  return (
    <>
      <div className="rounded-2xl border border-border/50 bg-card overflow-hidden shadow-sm animate-in fade-in slide-in-from-bottom-4 duration-500">
        
        <div className="px-5 py-4 border-b border-border/50 bg-muted/20 flex items-center justify-between">
          <h2 className="text-sm font-semibold flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-500" />
            QRIS Dinamis Siap
          </h2>
        </div>

        <div className="p-6 flex flex-col items-center space-y-6">
          
          {/* Preview Image with Modal Trigger */}
          <div 
            onClick={() => { if (isRendered) setPreviewOpen(true); }}
            className="group relative bg-slate-50/50 p-3 rounded-[28px] border border-border/60 shadow-inner cursor-pointer transition-all hover:ring-2 hover:ring-primary/50"
          >
            <canvas 
              ref={cardCanvasRef} 
              className="w-[300px] h-[435px] rounded-[20px] shadow-sm pointer-events-none transition-transform duration-300 group-hover:scale-[1.01]" 
            />
            {isRendered && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/10 rounded-[28px] transition-all duration-300">
                <div className="bg-background/90 backdrop-blur-sm text-foreground px-4 py-2 rounded-full font-medium text-sm flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300 translate-y-2 group-hover:translate-y-0">
                  <Maximize2 className="w-4 h-4" />
                  Perbesar
                </div>
              </div>
            )}
          </div>

          <div className="text-center space-y-1 w-full">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">
              Nominal Pembayaran
            </p>
            <p className="text-3xl font-extrabold text-foreground tracking-tight">
              Rp {formattedNominal}
            </p>
            
            {parsed.tipIndicator === "fixed" && parsed.tipFixed && (
              <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-500/10 text-emerald-600 rounded-full mt-2">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                <p className="text-xs font-medium">Termasuk Biaya Rp {Number(parsed.tipFixed).toLocaleString("id-ID")}</p>
              </div>
            )}
            {parsed.tipIndicator === "percentage" && parsed.tipPercentage && (
              <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-500/10 text-emerald-600 rounded-full mt-2">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                <p className="text-xs font-medium">Termasuk Biaya {parsed.tipPercentage}%</p>
              </div>
            )}
          </div>

          <div className="w-full max-w-[340px] space-y-4 pt-2">
            <div className="flex items-center gap-2 p-1.5 bg-background rounded-xl border border-input shadow-sm">
              <div className="flex-1 px-3 text-xs font-mono text-muted-foreground truncate" title={qrisString}>
                {qrisString}
              </div>
              
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

      {/* Modal Preview Gambar Besaran Penuh */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-[440px] w-[95vw] bg-transparent border-none shadow-none p-0 flex flex-col items-center justify-center outline-none">
          <div className="sr-only">
            <DialogTitle>Preview Kartu QRIS</DialogTitle>
          </div>
          {imageUrl && (
            <img 
              src={imageUrl} 
              alt="QRIS Result Preview" 
              className="w-full h-auto max-h-[85vh] object-contain rounded-[24px] shadow-2xl animate-in zoom-in-95 duration-300"
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
