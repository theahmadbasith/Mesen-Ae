import { useRef, useState, useCallback, useEffect } from "react";
import jsQR from "jsqr";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Upload, Scan, X, AlertTriangle, XCircle } from "lucide-react";

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
  const [alertModal, setAlertModal] = useState({ open: false, title: "", message: "" });

  const showAlert = (title: string, message: string) => {
    setAlertModal({ open: true, title, message });
  };

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
            showAlert("Gagal Memindai", "Kode QR tidak ditemukan di dalam gambar. Silakan coba unggah gambar yang lebih jelas.");
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
      showAlert("Akses Ditolak", "Kamera tidak dapat diakses atau diblokir oleh browser Anda.");
    }
  };

  useEffect(() => {
    return () => stopCamera();
  }, [stopCamera]);

  const hasError = errors.length > 0;
  const hasValue = value.trim().length > 0;

  return (
    <div className="space-y-4">
      {/* Textarea Area */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-sm font-medium">String QRIS</Label>
          {hasValue && (
            <button
              type="button"
              onClick={onReset}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-destructive transition-colors"
            >
              <X className="w-3 h-3" />
              Hapus
            </button>
          )}
        </div>
        <div
          className={`relative rounded-xl border-2 transition-all duration-200 ${
            dragOver
              ? "border-primary bg-primary/5 shadow-[0_0_0_4px_hsl(var(--primary)/0.1)]"
              : hasError
                ? "border-destructive/60 bg-destructive/[0.02] shadow-[0_0_0_3px_hsl(var(--destructive)/0.08)]"
                : hasValue
                  ? "border-emerald-500/60 bg-emerald-50/30 dark:bg-emerald-950/10 shadow-[0_0_0_3px_hsl(142_76%_36%/0.08)]"
                  : "border-border hover:border-primary/40 bg-background"
          }`}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
        >
          <Textarea
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder="Paste string QRIS di sini, atau drag & drop gambar QR..."
            rows={6}
            className={`
              w-full border-0 shadow-none
              focus-visible:ring-0 focus-visible:outline-none
              resize-none bg-transparent
              font-mono text-sm leading-relaxed
              placeholder:text-muted-foreground/50
              pr-8
            `}
          />
          {dragOver && (
            <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-primary/5 pointer-events-none">
              <div className="text-center">
                <Upload className="w-8 h-8 text-primary mx-auto mb-2" />
                <p className="text-sm font-medium text-primary">Lepaskan untuk upload</p>
              </div>
            </div>
          )}
        </div>

        {/* Status indicator */}
        {hasValue && !hasError && (
          <p className="text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5 font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block animate-pulse" />
            String QRIS valid dan siap dikonversi
          </p>
        )}
        {!hasValue && (
          <p className="text-xs text-muted-foreground">
            Mendukung paste teks, drag & drop gambar, dan paste gambar dari clipboard
          </p>
        )}
      </div>

      {/* Error messages */}
      {hasError && (
        <div className="rounded-xl bg-destructive/8 border border-destructive/25 p-4 space-y-2 animate-in fade-in slide-in-from-top-2 duration-300">
          <p className="text-xs font-semibold text-destructive uppercase tracking-wider flex items-center gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5" />
            Ditemukan {errors.length} kesalahan
          </p>
          <ul className="space-y-1.5">
            {errors.map((err, i) => (
              <li key={i} className="flex items-start gap-2">
                <XCircle className="w-4 h-4 mt-0.5 shrink-0 text-destructive" />
                <span className="text-sm text-destructive/90 leading-snug">{err}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Action buttons */}
      <div className="grid grid-cols-2 gap-3">
        <Button
          type="button"
          variant="outline"
          size="lg"
          onClick={() => fileRef.current?.click()}
          className="gap-2 h-11 w-full text-sm font-semibold rounded-xl border-border/70 hover:border-primary/40 hover:bg-primary/5 hover:text-primary transition-all"
        >
          <Upload className="w-4 h-4" />
          Upload Gambar
        </Button>

        <Button
          type="button"
          variant={scanning ? "destructive" : "default"}
          size="lg"
          onClick={scanning ? stopCamera : startCamera}
          className={`gap-2 h-11 w-full text-sm font-semibold rounded-xl transition-all ${
            scanning ? "" : ""
          }`}
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
        <div className="relative rounded-2xl overflow-hidden border-2 border-primary/50 shadow-lg animate-in fade-in slide-in-from-top-4 duration-300">
          <video
            ref={videoRef}
            className="w-full object-cover"
            style={{ maxHeight: "60vh" }}
            playsInline
            muted
          />
          <canvas ref={canvasRef} className="hidden" />

          <div className="absolute inset-0 flex items-center justify-center pointer-events-none bg-black/20">
            <div className="w-56 h-56 border-2 border-white rounded-3xl relative">
              <div className="absolute -top-1 -left-1 w-6 h-6 border-t-4 border-l-4 border-primary rounded-tl-xl" />
              <div className="absolute -top-1 -right-1 w-6 h-6 border-t-4 border-r-4 border-primary rounded-tr-xl" />
              <div className="absolute -bottom-1 -left-1 w-6 h-6 border-b-4 border-l-4 border-primary rounded-bl-xl" />
              <div className="absolute -bottom-1 -right-1 w-6 h-6 border-b-4 border-r-4 border-primary rounded-br-xl" />
              <div className="w-full h-full border border-white/20 rounded-2xl animate-pulse" />
            </div>
          </div>

          <div className="absolute bottom-4 left-0 right-0 text-center">
            <span className="bg-black/60 backdrop-blur-md text-white text-sm font-medium px-4 py-2 rounded-full shadow-lg">
              Arahkan kamera ke kode QRIS
            </span>
          </div>
        </div>
      )}

      {/* Alert Modal */}
      <Dialog open={alertModal.open} onOpenChange={(open) => setAlertModal(prev => ({ ...prev, open }))}>
        <DialogContent className="sm:max-w-md text-center flex flex-col items-center rounded-2xl">
          <div className="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center mb-2">
            <AlertTriangle className="w-6 h-6 text-destructive" />
          </div>
          <DialogHeader>
            <DialogTitle className="text-center text-lg">{alertModal.title}</DialogTitle>
            <DialogDescription className="text-center pt-2">
              {alertModal.message}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="sm:justify-center w-full mt-4">
            <Button
              type="button"
              onClick={() => setAlertModal(prev => ({ ...prev, open: false }))}
              className="w-full sm:w-auto min-w-[120px] rounded-xl"
            >
              Mengerti
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
