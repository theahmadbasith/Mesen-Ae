import { useState, useCallback } from "react";
import { parseQRIS, convertQRIS, validateQRIS } from "../../lib/qris-dinamis/index";
import type { QRISData, ConvertOptions } from "../../lib/qris-dinamis/types";
import { QRISInput } from "../components/qris-dinamis/QRISInput";
import { QRISInfo } from "../components/qris-dinamis/QRISInfo";
import { ConvertForm } from "../components/qris-dinamis/ConvertForm";
import { QRISResult } from "../components/qris-dinamis/QRISResult";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { QrCode } from "lucide-react";

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
      setErrors(["Failed to parse QRIS data"]);
    }
  }, []);

  const handleConvert = useCallback(
    (options: ConvertOptions) => {
      if (!qrisString.trim()) return;

      try {
        const converted = convertQRIS(qrisString.trim(), options);
        setResult(converted);
      } catch {
        setErrors(["Failed to convert QRIS"]);
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

  return (
    <div className="pt-2 pb-24 space-y-6 w-full mx-auto animate-in fade-in duration-300">
      <Card className="shadow-sm border-border/50">
        <CardHeader className="pb-4 border-b border-border/50 bg-muted/30">
          <CardTitle className="flex items-center gap-2 text-lg">
            <QrCode className="w-5 h-5 text-muted-foreground" />
            Generator QRIS Dinamis
          </CardTitle>
          <CardDescription>
            Ubah QRIS Statis Anda menjadi QRIS Dinamis dengan nominal dan biaya admin khusus.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6 max-w-2xl mx-auto space-y-6 w-full">
          <QRISInput
            value={qrisString}
            onChange={handleQRISInput}
            onReset={handleReset}
            errors={errors}
          />

          {parsed && (
            <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
              <QRISInfo data={parsed} />
              <ConvertForm
                parsed={parsed}
                onConvert={handleConvert}
              />
            </div>
          )}

          {result && (
            <div className="animate-in slide-in-from-bottom-4 duration-500">
              <QRISResult qrisString={result} />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
