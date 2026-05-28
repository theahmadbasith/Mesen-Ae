import { useState, useCallback } from "react";
import { parseQRIS, convertQRIS, validateQRIS } from "../../lib/qris-dinamis/index";
import type { QRISData, ConvertOptions } from "../../lib/qris-dinamis/types";
import { Header } from "../components/qris-dinamis/Header";
import { QRISInput } from "../components/qris-dinamis/QRISInput";
import { QRISInfo } from "../components/qris-dinamis/QRISInfo";
import { ConvertForm } from "../components/qris-dinamis/ConvertForm";
import { QRISResult } from "../components/qris-dinamis/QRISResult";
import { Footer } from "../components/qris-dinamis/Footer";

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
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1 w-full max-w-2xl mx-auto px-4 py-8 space-y-6">
        <QRISInput
          value={qrisString}
          onChange={handleQRISInput}
          onReset={handleReset}
          errors={errors}
        />

        {parsed && (
          <>
            <QRISInfo data={parsed} />
            <ConvertForm
              parsed={parsed}
              onConvert={handleConvert}
            />
          </>
        )}

        {result && <QRISResult qrisString={result} />}
      </main>

      <Footer />
    </div>
  );
}
