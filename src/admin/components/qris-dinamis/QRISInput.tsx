import { useRef, useState, useCallback, useEffect } from "react";
import jsQR from "jsqr";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Upload, Scan, XCircle, X } from "lucide-react";

interface Props {
  value: string;
  onChange: (value: string) => void;
  onReset: () => void;
  errors: string[];
}

export function QRISInput({ value, onChange, onReset, errors }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationRef = useRef<number>(0);
  const [scanning, setScanning] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  const decodeImageFile = useCallback(
    (file: File) => {
      const reader = new FileReader();
      reader.onload = () => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement("canvas");
          canvas.width = img.width;
          canvas.height = img.height;
          const ctx = canvas.getContext("2d");
          if (!ctx) return;
          ctx.drawImage(img, 0, 0);
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const code = jsQR(imageData.data, canvas.width, canvas.height);
          if (code) {
            onChange(code.data);
          } else {
            onChange("");
            alert("QR code not found in image. Please try another image.");
          }
        };
        img.src = reader.result as string;
      };
      reader.readAsDataURL(file);
    },
    [onChange]
  );

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) decodeImageFile(file);
    e.target.value = "";
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith("image/")) {
      decodeImageFile(file);
    }
  };

  const handlePaste = useCallback(
    (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      for (const item of items) {
        if (item.type.startsWith("image/")) {
          const file = item.getAsFile();
          if (file) {
            e.preventDefault();
            decodeImageFile(file);
            return;
          }
        }
      }
    },
    [decodeImageFile]
  );

  useEffect(() => {
    document.addEventListener("paste", handlePaste);
    return () => document.removeEventListener("paste", handlePaste);
  }, [handlePaste]);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    cancelAnimationFrame(animationRef.current);
    setScanning(false);
  }, []);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
      });
      streamRef.current = stream;
      setScanning(true);

      const video = videoRef.current;
      if (!video) return;
      video.srcObject = stream;
      await video.play();

      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const scan = () => {
        if (!streamRef.current) return;
        if (video.readyState === video.HAVE_ENOUGH_DATA) {
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          ctx.drawImage(video, 0, 0);
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const code = jsQR(imageData.data, canvas.width, canvas.height);
          if (code) {
            onChange(code.data);
            stopCamera();
            return;
          }
        }
        animationRef.current = requestAnimationFrame(scan);
      };
      scan();
    } catch {
      alert("Camera access denied or unavailable.");
    }
  };

  useEffect(() => {
    return () => stopCamera();
  }, [stopCamera]);

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>String QRIS Asal</Label>
        <div
          className={`relative rounded-xl border-2 transition-colors ${
            dragOver
              ? "border-primary bg-primary/5"
              : errors.length > 0
                ? "border-destructive/50 focus-within:border-destructive"
                : value
                  ? "border-emerald-500/50 focus-within:border-emerald-500"
                  : "border-border border-dashed focus-within:border-primary focus-within:border-solid"
          }`}
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
        >
          <Textarea
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder="Paste string QRIS di sini, atau drag & drop gambar QR..."
            rows={4}
            className="w-full border-0 focus-visible:ring-0 resize-none bg-transparent font-mono text-sm"
          />

          {value && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onReset}
              className="absolute top-2 right-2 h-6 w-6 text-muted-foreground hover:text-foreground hover:bg-muted"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Error messages */}
      {errors.length > 0 && (
        <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-3">
          <ul className="text-sm text-destructive space-y-1 font-medium">
            {errors.map((err, i) => (
              <li key={i} className="flex items-start gap-2">
                <XCircle className="w-4 h-4 mt-0.5 shrink-0" />
                <span>{err}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Action buttons */}
      <div className="grid grid-cols-2 gap-3">
        <Button
          variant="outline"
          onClick={() => fileRef.current?.click()}
          className="gap-2"
        >
          <Upload className="w-4 h-4" />
          Upload Gambar
        </Button>

        <Button
          variant={scanning ? "destructive" : "secondary"}
          onClick={scanning ? stopCamera : startCamera}
          className="gap-2"
        >
          <Scan className="w-4 h-4" />
          {scanning ? "Stop Kamera" : "Scan Kamera"}
        </Button>

        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          onChange={handleFileUpload}
          className="hidden"
        />
      </div>

      {/* Camera view */}
      {scanning && (
        <div className="relative rounded-xl overflow-hidden border border-gray-300 dark:border-gray-700">
          <video
            ref={videoRef}
            className="w-full"
            playsInline
            muted
          />
          <canvas ref={canvasRef} className="hidden" />
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-48 h-48 border-2 border-white/70 rounded-2xl" />
          </div>
          <div className="absolute bottom-3 left-0 right-0 text-center text-sm text-white/80 drop-shadow">
            Point camera at a QRIS code
          </div>
        </div>
      )}
    </div>
  );
}
