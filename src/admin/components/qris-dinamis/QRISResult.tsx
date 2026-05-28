import { useEffect, useRef, useState } from "react";
import QRCode from "qrcode";
import { parseQRIS } from "../../../lib/qris-dinamis/index";
import { Button } from "@/components/ui/button";
import { Check, Copy, Download, QrCode } from "lucide-react";
interface Props {
  qrisString: string;
}

export function QRISResult({ qrisString }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [copied, setCopied] = useState(false);

  const parsed = parseQRIS(qrisString);

  useEffect(() => {
    if (canvasRef.current && qrisString) {
      QRCode.toCanvas(canvasRef.current, qrisString, {
        width: 280,
        margin: 2,
        color: {
          dark: "#000000",
          light: "#FFFFFF",
        },
        errorCorrectionLevel: "M",
      });
    }
  }, [qrisString]);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(qrisString);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    if (!canvasRef.current) return;
    const link = document.createElement("a");
    link.download = `qris-dynamic-${parsed.merchantName.replace(/\s+/g, "-").toLowerCase()}.png`;
    link.href = canvasRef.current.toDataURL("image/png");
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
        {/* QR Code */}
        <div className="bg-white p-3 rounded-2xl shadow-sm border">
          <canvas ref={canvasRef} className="w-[200px] h-[200px]" />
        </div>

        {/* Info */}
        <div className="text-center space-y-1">
          <p className="text-sm font-medium text-muted-foreground">{parsed.merchantName}</p>
          <p className="text-3xl font-bold text-primary">
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
