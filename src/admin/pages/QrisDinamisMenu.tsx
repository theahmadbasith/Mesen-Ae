import { useState, useCallback } from "react";
import { parseQRIS, convertQRIS, validateQRIS } from "../../lib/qris-dinamis/index";
import type { QRISData, ConvertOptions } from "../../lib/qris-dinamis/types";
import { QRISInput } from "../components/qris-dinamis/QRISInput";
import { QRISInfo } from "../components/qris-dinamis/QRISInfo";
import { ConvertForm } from "../components/qris-dinamis/ConvertForm";
import { QRISResult } from "../components/qris-dinamis/QRISResult";
import { QrCode, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function QrisDinamisMenu() {
  const [qrisString, setQrisString] = useState("");
  const [parsed, setParsed] = useState<QRISData | null>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const [result, setResult] = useState("");

  const handleQRISInput = useCallback((value: string) => {
    setQrisString(value);
    setResult("");
    setErrors([]);
    setParsed(null);

    if (!value.trim()) return;

    const validation = validateQRIS(value.trim());
    if (!validation.valid) {
      setErrors(validation.errors);
      return;
    }

    try {
      const data = parseQRIS(value.trim());
      setParsed(data);
    } catch {
      setErrors(["Gagal membaca data QRIS"]);
    }
  }, []);

  const handleConvert = useCallback(
    (options: ConvertOptions) => {
      if (!qrisString.trim()) return;

      try {
        const converted = convertQRIS(qrisString.trim(), options);
        setResult(converted);
      } catch {
        setErrors(["Gagal mengkonversi QRIS"]);
      }
    },
    [qrisString]
  );

  const handleReset = useCallback(() => {
    setQrisString("");
    setParsed(null);
    setErrors([]);
    setResult("");
  }, []);

  const hasData = qrisString || parsed || result;

  return (
    <div className="pb-24 space-y-6 w-full animate-in fade-in duration-300">
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        
        {/* Kolom Kiri — Input */}
        <div className="xl:col-span-5 space-y-4">
          <div className="rounded-2xl border border-border/60 bg-card shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-border/50 bg-muted/20 flex items-center justify-between">
              <div>
                <h2 className="text-sm font-semibold flex items-center gap-2">
                  <QrCode className="w-4 h-4 text-primary" />
                  Data QRIS
                </h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Scan atau paste string QRIS
                </p>
              </div>
              
              {/* Tombol Hapus (Reset) Global yang Rapi */}
              {hasData && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleReset}
                  className="h-8 px-3 text-xs font-medium text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors rounded-lg"
                >
                  <Trash2 className="w-3.5 h-3.5 mr-1.5" />
                  Hapus
                </Button>
              )}
            </div>
            
            <div className="p-5">
              <QRISInput
                value={qrisString}
                onChange={handleQRISInput}
                onReset={handleReset}
                errors={errors}
              />
            </div>
          </div>
        </div>

        {/* Kolom Kanan — Info + Convert + Result */}
        <div className="xl:col-span-7 space-y-4">
          
          {/* Tampilan Empty State yang Minimalis */}
          {!parsed && !result && (
            <div className="rounded-2xl border border-dashed border-border/50 bg-muted/10 flex flex-col items-center justify-center h-full min-h-[300px] text-center px-6">
              <div className="w-14 h-14 rounded-full bg-muted/40 flex items-center justify-center mb-4">
                <QrCode className="w-6 h-6 text-muted-foreground/40" />
              </div>
              <p className="text-sm font-semibold text-foreground/70">Belum ada data</p>
              <p className="text-xs text-muted-foreground mt-1">Input QRIS di panel kiri untuk melihat hasil</p>
            </div>
          )}

          {parsed && (
            <div className="space-y-4 animate-in slide-in-from-bottom-4 duration-500">
              <QRISInfo data={parsed} />
              <ConvertForm parsed={parsed} onConvert={handleConvert} />
            </div>
          )}

          {result && (
            <div className="animate-in slide-in-from-bottom-4 duration-500">
              <QRISResult qrisString={result} />
            </div>
          )}
        </div>
        
      </div>
    </div>
  );
}
