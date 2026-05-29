import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Check, Wand2, ZoomIn, ZoomOut, Save, Moon, Sun } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface MagicWandModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  imageUrl: string | null;
  onSave: (newBase64: string) => void;
}

export default function MagicWandModal({ open, onOpenChange, imageUrl, onSave }: MagicWandModalProps) {
  const [patternMode, setPatternMode] = useState<'light' | 'dark'>('light');
  const [tolerance, setTolerance] = useState(32);
  const [zoom, setZoom] = useState(100);
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const originalImageRef = useRef<HTMLImageElement | null>(null);
  const [history, setHistory] = useState<ImageData[]>([]);
  const [historyIndex, setHistoryIndex] = useState(0);

  useEffect(() => {
    if (open && imageUrl) {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        originalImageRef.current = img;
        const cvs = canvasRef.current;
        if (cvs) {
          cvs.width = img.width;
          cvs.height = img.height;
          const ctx = cvs.getContext('2d', { willReadFrequently: true });
          if (ctx) {
            ctx.clearRect(0, 0, cvs.width, cvs.height);
            ctx.drawImage(img, 0, 0);
            setHistory([ctx.getImageData(0, 0, cvs.width, cvs.height)]);
            setHistoryIndex(0);
          }
          const container = containerRef.current;
          if (container) {
            const maxW = container.clientWidth - 32;
            const maxH = container.clientHeight - 32;
            const scaleX = maxW / img.width;
            const scaleY = maxH / img.height;
            const minScale = Math.min(scaleX, scaleY, 1);
            setZoom(Math.floor(minScale * 100));
          } else {
            setZoom(100);
          }
        }
      };
      img.src = imageUrl;
      setPatternMode('light');
    }
  }, [open, imageUrl]);

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const cvs = canvasRef.current;
    if (!cvs) return;
    const ctx = cvs.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;

    const rect = cvs.getBoundingClientRect();
    const scaleX = cvs.width / rect.width;
    const scaleY = cvs.height / rect.height;
    const x = Math.floor((e.clientX - rect.left) * scaleX);
    const y = Math.floor((e.clientY - rect.top) * scaleY);

    if (x < 0 || y < 0 || x >= cvs.width || y >= cvs.height) return;

    const imgData = ctx.getImageData(0, 0, cvs.width, cvs.height);
    const data = imgData.data;
    const w = cvs.width;
    const h = cvs.height;

    const targetIdx = (y * w + x) * 4;
    const tr = data[targetIdx];
    const tg = data[targetIdx + 1];
    const tb = data[targetIdx + 2];
    const ta = data[targetIdx + 3];

    // If already fully transparent, ignore
    if (ta === 0) return;

    const colorMatch = (r: number, g: number, b: number, a: number) => {
      if (a === 0) return false;
      return Math.abs(r - tr) <= tolerance &&
             Math.abs(g - tg) <= tolerance &&
             Math.abs(b - tb) <= tolerance &&
             Math.abs(a - ta) <= tolerance;
    };

    const queue = [[x, y]];
    const seen = new Uint8Array(w * h);
    seen[y * w + x] = 1;

    let modified = false;

    while (queue.length > 0) {
      const [cx, cy] = queue.pop()!;
      const idx = (cy * w + cx) * 4;

      if (colorMatch(data[idx], data[idx + 1], data[idx + 2], data[idx + 3])) {
        data[idx + 3] = 0; // Set alpha to 0
        modified = true;

        if (cx > 0 && !seen[cy * w + (cx - 1)]) {
          seen[cy * w + (cx - 1)] = 1;
          queue.push([cx - 1, cy]);
        }
        if (cx < w - 1 && !seen[cy * w + (cx + 1)]) {
          seen[cy * w + (cx + 1)] = 1;
          queue.push([cx + 1, cy]);
        }
        if (cy > 0 && !seen[(cy - 1) * w + cx]) {
          seen[(cy - 1) * w + cx] = 1;
          queue.push([cx, cy - 1]);
        }
        if (cy < h - 1 && !seen[(cy + 1) * w + cx]) {
          seen[(cy + 1) * w + cx] = 1;
          queue.push([cx, cy + 1]);
        }
      }
    }

    if (modified) {
      ctx.putImageData(imgData, 0, 0);
      const newHist = history.slice(0, historyIndex + 1);
      setHistory([...newHist, imgData]);
      setHistoryIndex(newHist.length);
    }
  };

  const undo = () => {
    if (historyIndex <= 0) return;
    const newIdx = historyIndex - 1;
    setHistoryIndex(newIdx);
    
    const cvs = canvasRef.current;
    if (cvs && history[newIdx]) {
      const ctx = cvs.getContext('2d', { willReadFrequently: true });
      ctx?.putImageData(history[newIdx], 0, 0);
    }
  };

  const redo = () => {
    if (historyIndex >= history.length - 1) return;
    const newIdx = historyIndex + 1;
    setHistoryIndex(newIdx);
    
    const cvs = canvasRef.current;
    if (cvs && history[newIdx]) {
      const ctx = cvs.getContext('2d', { willReadFrequently: true });
      ctx?.putImageData(history[newIdx], 0, 0);
    }
  };

  const handleSave = () => {
    const cvs = canvasRef.current;
    if (!cvs) return;
    const dataUrl = cvs.toDataURL('image/png');
    onSave(dataUrl);
    onOpenChange(false);
  };

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-[100] flex flex-col bg-background text-foreground overflow-hidden">
      {/* Header */}
      <div className="h-14 sm:h-16 shrink-0 border-b border-border bg-card flex items-center justify-between px-4">
        <div className="flex items-center gap-2 sm:gap-3">
          <button onClick={() => onOpenChange(false)} className="w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center hover:bg-secondary transition-colors">
            <X className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
          <div className="flex items-center gap-1.5 sm:gap-2 font-bold text-sm sm:text-base">
            <Wand2 className="w-4 h-4 text-primary shrink-0" />
            <span className="hidden sm:inline">Hapus Latar</span>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-4">
          <div className="hidden sm:flex items-center gap-2">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Toleransi</span>
            <input 
              type="range" 
              min="0" 
              max="100" 
              value={tolerance} 
              onChange={e => setTolerance(Number(e.target.value))}
              className="w-24 accent-primary"
            />
            <span className="text-xs font-mono w-6 text-right">{tolerance}</span>
          </div>

          <div className="w-px h-6 bg-border hidden sm:block" />

          <button onClick={() => setPatternMode(p => p === 'light' ? 'dark' : 'light')} 
            className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg flex items-center justify-center hover:bg-secondary transition-colors border border-border" title="Ubah tema kotak transparan">
            {patternMode === 'light' ? <Moon className="w-4 h-4 sm:w-5 sm:h-5" /> : <Sun className="w-4 h-4 sm:w-5 sm:h-5" />}
          </button>

          <button onClick={undo} disabled={historyIndex <= 0} className={cn("text-[10px] sm:text-xs font-bold px-2 sm:px-3 py-1.5 rounded-lg border", historyIndex <= 0 ? "opacity-50 cursor-not-allowed border-border" : "border-border hover:bg-secondary")}>
            Undo
          </button>
          
          <button onClick={redo} disabled={historyIndex >= history.length - 1} className={cn("text-[10px] sm:text-xs font-bold px-2 sm:px-3 py-1.5 rounded-lg border", historyIndex >= history.length - 1 ? "opacity-50 cursor-not-allowed border-border" : "border-border hover:bg-secondary")}>
            Redo
          </button>

          <button onClick={handleSave} className="flex items-center gap-1.5 bg-primary text-primary-foreground font-bold px-3 sm:px-4 h-8 sm:h-9 rounded-full shadow-md active:scale-95 transition-transform text-xs sm:text-sm">
            <Check className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> Simpan
          </button>
        </div>
      </div>

      {/* Toolbar for mobile */}
      <div className="sm:hidden flex items-center justify-between p-3 border-b border-border bg-card shrink-0">
        <div className="flex items-center gap-2 w-full">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider shrink-0">Tol:</span>
          <input 
            type="range" 
            min="0" 
            max="100" 
            value={tolerance} 
            onChange={e => setTolerance(Number(e.target.value))}
            className="w-full accent-primary"
          />
          <span className="text-xs font-mono w-6 text-right shrink-0">{tolerance}</span>
        </div>
      </div>

      {/* Workspace */}
      <div className="flex-1 relative flex flex-col bg-zinc-100 dark:bg-zinc-900 overflow-hidden">
        {/* Workspace controls */}
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 flex items-center gap-1 bg-card/90 backdrop-blur shadow-lg border border-border p-1 rounded-full">
          <button onClick={() => setZoom(z => Math.max(10, z - 10))} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-secondary">
            <ZoomOut className="w-4 h-4" />
          </button>
          <span className="text-xs font-mono font-bold w-12 text-center">{zoom}%</span>
          <button onClick={() => setZoom(z => Math.min(500, z + 10))} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-secondary">
            <ZoomIn className="w-4 h-4" />
          </button>
        </div>

        {/* Canvas area */}
        <div 
          ref={containerRef}
          className="flex-1 overflow-auto flex items-center justify-center relative p-2 sm:p-8"
        >
          <div 
            className="relative shadow-2xl transition-transform duration-200"
            style={{ 
              transform: `scale(${zoom / 100})`,
              transformOrigin: 'center center'
            }}
          >
            {/* Checkered pattern background */}
            <div 
              className="absolute inset-0 z-0 pointer-events-none rounded"
              style={{
                backgroundImage: `linear-gradient(45deg, ${patternMode === 'light' ? '#e5e7eb' : '#27272a'} 25%, transparent 25%, transparent 75%, ${patternMode === 'light' ? '#e5e7eb' : '#27272a'} 75%, ${patternMode === 'light' ? '#e5e7eb' : '#27272a'}), linear-gradient(45deg, ${patternMode === 'light' ? '#e5e7eb' : '#27272a'} 25%, transparent 25%, transparent 75%, ${patternMode === 'light' ? '#e5e7eb' : '#27272a'} 75%, ${patternMode === 'light' ? '#e5e7eb' : '#27272a'})`,
                backgroundSize: '20px 20px',
                backgroundPosition: '0 0, 10px 10px',
                backgroundColor: patternMode === 'light' ? '#ffffff' : '#18181b'
              }}
            />
            {/* The interactive canvas */}
            <canvas 
              ref={canvasRef}
              onPointerDown={handlePointerDown}
              className="relative z-10 cursor-crosshair rounded max-w-none"
              style={{ touchAction: 'none' }}
            />
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
