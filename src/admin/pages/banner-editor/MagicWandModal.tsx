import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { 
  X, Check, Wand2, ZoomIn, ZoomOut, Save, Moon, Sun, 
  Brush, Hand, Undo2, Redo2, Maximize
} from 'lucide-react';
import { cn } from '@/lib/utils';

// Asumsi Anda menggunakan toast dari sonner, Anda bisa menggunakannya di fungsi handleSave
// import { toast } from 'sonner';

interface MagicWandModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  imageUrl: string | null;
  onSave: (newBase64: string) => void;
}

type ToolMode = 'wand' | 'brush' | 'pan';

export default function MagicWandModal({ open, onOpenChange, imageUrl, onSave }: MagicWandModalProps) {
  const [activeTool, setActiveTool] = useState<ToolMode>('wand');
  const [patternMode, setPatternMode] = useState<'light' | 'dark'>('light');
  const [tolerance, setTolerance] = useState(32);
  const [brushSize, setBrushSize] = useState(20);
  const [zoom, setZoom] = useState(100);
  const [imageSize, setImageSize] = useState({ width: 0, height: 0 });
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  const [history, setHistory] = useState<ImageData[]>([]);
  const [historyIndex, setHistoryIndex] = useState(0);
  
  // State untuk menggambar brush & pan manual
  const isDrawing = useRef(false);
  const isPanning = useRef(false);
  const lastPos = useRef<{ x: number, y: number } | null>(null);

  useEffect(() => {
    if (open && imageUrl) {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        setImageSize({ width: img.width, height: img.height });
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
          fitToScreen(img.width, img.height);
        }
      };
      img.src = imageUrl;
      setPatternMode('light');
      setActiveTool('wand');
    }
  }, [open, imageUrl]);

  const fitToScreen = (imgW = imageSize.width, imgH = imageSize.height) => {
    const container = containerRef.current;
    if (container && imgW && imgH) {
      const maxW = container.clientWidth - 48;
      const maxH = container.clientHeight - 48;
      const scaleX = maxW / imgW;
      const scaleY = maxH / imgH;
      const minScale = Math.min(scaleX, scaleY, 1);
      setZoom(Math.floor(minScale * 100));
    }
  };

  const saveToHistory = () => {
    const cvs = canvasRef.current;
    if (!cvs) return;
    const ctx = cvs.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;
    const imgData = ctx.getImageData(0, 0, cvs.width, cvs.height);
    const newHist = history.slice(0, historyIndex + 1);
    setHistory([...newHist, imgData]);
    setHistoryIndex(newHist.length);
  };

  const getCanvasMousePos = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const cvs = canvasRef.current;
    if (!cvs) return { x: 0, y: 0 };
    const rect = cvs.getBoundingClientRect();
    const scaleX = cvs.width / rect.width;
    const scaleY = cvs.height / rect.height;
    return {
      x: Math.floor((e.clientX - rect.left) * scaleX),
      y: Math.floor((e.clientY - rect.top) * scaleY)
    };
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (activeTool === 'pan') return;

    if (activeTool === 'brush') {
      isDrawing.current = true;
      const { x, y } = getCanvasMousePos(e);
      lastPos.current = { x, y };
      
      const ctx = canvasRef.current?.getContext('2d');
      if (ctx) {
        ctx.globalCompositeOperation = 'destination-out';
        ctx.beginPath();
        ctx.arc(x, y, brushSize / 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalCompositeOperation = 'source-over';
      }
      return;
    }

    if (activeTool === 'wand') {
      const cvs = canvasRef.current;
      if (!cvs) return;
      const ctx = cvs.getContext('2d', { willReadFrequently: true });
      if (!ctx) return;

      const { x, y } = getCanvasMousePos(e);
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
          data[idx + 3] = 0;
          modified = true;

          if (cx > 0 && !seen[cy * w + (cx - 1)]) { seen[cy * w + (cx - 1)] = 1; queue.push([cx - 1, cy]); }
          if (cx < w - 1 && !seen[cy * w + (cx + 1)]) { seen[cy * w + (cx + 1)] = 1; queue.push([cx + 1, cy]); }
          if (cy > 0 && !seen[(cy - 1) * w + cx]) { seen[(cy - 1) * w + cx] = 1; queue.push([cx, cy - 1]); }
          if (cy < h - 1 && !seen[(cy + 1) * w + cx]) { seen[(cy + 1) * w + cx] = 1; queue.push([cx, cy + 1]); }
        }
      }

      if (modified) {
        ctx.putImageData(imgData, 0, 0);
        saveToHistory();
      }
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (activeTool !== 'brush' || !isDrawing.current || !lastPos.current) return;
    
    const { x, y } = getCanvasMousePos(e);
    const ctx = canvasRef.current?.getContext('2d');
    
    if (ctx) {
      ctx.globalCompositeOperation = 'destination-out';
      ctx.beginPath();
      ctx.lineWidth = brushSize;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.moveTo(lastPos.current.x, lastPos.current.y);
      ctx.lineTo(x, y);
      ctx.stroke();
      ctx.globalCompositeOperation = 'source-over';
      lastPos.current = { x, y };
    }
  };

  const handlePointerUp = () => {
    if (activeTool === 'brush' && isDrawing.current) {
      isDrawing.current = false;
      lastPos.current = null;
      saveToHistory();
    }
  };

  const undo = () => {
    if (historyIndex <= 0) return;
    const newIdx = historyIndex - 1;
    setHistoryIndex(newIdx);
    const ctx = canvasRef.current?.getContext('2d', { willReadFrequently: true });
    ctx?.putImageData(history[newIdx], 0, 0);
  };

  const redo = () => {
    if (historyIndex >= history.length - 1) return;
    const newIdx = historyIndex + 1;
    setHistoryIndex(newIdx);
    const ctx = canvasRef.current?.getContext('2d', { willReadFrequently: true });
    ctx?.putImageData(history[newIdx], 0, 0);
  };

  const handleSave = () => {
    const cvs = canvasRef.current;
    if (!cvs) return;
    const dataUrl = cvs.toDataURL('image/png');
    onSave(dataUrl);
    onOpenChange(false);
  };

  // --- Pan handling untuk wrapper ---
  const handleContainerPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (activeTool !== 'pan') return;
    const container = containerRef.current;
    if (!container) return;
    isPanning.current = true;
    
    const startX = e.pageX - container.offsetLeft;
    const startY = e.pageY - container.offsetTop;
    const scrollLeft = container.scrollLeft;
    const scrollTop = container.scrollTop;
    
    const onMove = (moveEvent: PointerEvent) => {
      if (!isPanning.current) return;
      const x = moveEvent.pageX - container.offsetLeft;
      const y = moveEvent.pageY - container.offsetTop;
      container.scrollLeft = scrollLeft - (x - startX);
      container.scrollTop = scrollTop - (y - startY);
    };
    
    const onUp = () => {
      isPanning.current = false;
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
    
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  };

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-[100] flex flex-col bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 overflow-hidden font-sans">
      
      {/* Header Panel */}
      <div className="h-16 shrink-0 border-b border-border bg-white dark:bg-zinc-900 flex items-center justify-between px-4 shadow-sm z-20">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => onOpenChange(false)} 
            className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="flex flex-col">
            <span className="font-bold text-sm sm:text-base leading-tight">Hapus Latar Belakang</span>
            <span className="text-[10px] sm:text-xs text-zinc-500 font-medium">Editor Profesional</span>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-4">
          <div className="flex items-center gap-1 bg-zinc-100 dark:bg-zinc-800 p-1 rounded-lg">
            <button onClick={undo} disabled={historyIndex <= 0} className="w-8 h-8 flex items-center justify-center rounded hover:bg-white dark:hover:bg-zinc-700 disabled:opacity-30 disabled:hover:bg-transparent transition-colors">
              <Undo2 className="w-4 h-4" />
            </button>
            <button onClick={redo} disabled={historyIndex >= history.length - 1} className="w-8 h-8 flex items-center justify-center rounded hover:bg-white dark:hover:bg-zinc-700 disabled:opacity-30 disabled:hover:bg-transparent transition-colors">
              <Redo2 className="w-4 h-4" />
            </button>
          </div>

          <button 
            onClick={() => setPatternMode(p => p === 'light' ? 'dark' : 'light')} 
            className="w-9 h-9 rounded-lg flex items-center justify-center bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors" 
            title="Ubah Tema Grid"
          >
            {patternMode === 'light' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
          </button>

          <button onClick={handleSave} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-medium px-4 h-9 rounded-lg shadow-sm transition-colors text-sm">
            <Save className="w-4 h-4" /> <span className="hidden sm:inline">Simpan Perubahan</span>
          </button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden relative">
        {/* Floating Sidebar Tools */}
        <div className="absolute left-4 top-1/2 -translate-y-1/2 z-20 flex flex-col gap-2 bg-white dark:bg-zinc-900 p-2 rounded-2xl shadow-xl border border-border">
          <ToolButton icon={<Wand2 />} label="Magic Wand" active={activeTool === 'wand'} onClick={() => setActiveTool('wand')} />
          <ToolButton icon={<Brush />} label="Penghapus Manual" active={activeTool === 'brush'} onClick={() => setActiveTool('brush')} />
          <div className="w-8 h-px bg-border mx-auto my-1" />
          <ToolButton icon={<Hand />} label="Geser (Pan)" active={activeTool === 'pan'} onClick={() => setActiveTool('pan')} />
        </div>

        {/* Floating Top Options (Contextual Toolbar) */}
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 flex items-center gap-4 bg-white dark:bg-zinc-900 px-5 py-2.5 rounded-full shadow-lg border border-border">
          {activeTool === 'wand' && (
            <div className="flex items-center gap-3">
              <span className="text-xs font-semibold text-zinc-500 uppercase">Toleransi</span>
              <input type="range" min="0" max="100" value={tolerance} onChange={e => setTolerance(Number(e.target.value))} className="w-24 sm:w-32 accent-blue-600" />
              <span className="text-xs font-mono w-6 text-right font-medium">{tolerance}</span>
            </div>
          )}
          {activeTool === 'brush' && (
            <div className="flex items-center gap-3">
              <span className="text-xs font-semibold text-zinc-500 uppercase">Ukuran</span>
              <input type="range" min="1" max="100" value={brushSize} onChange={e => setBrushSize(Number(e.target.value))} className="w-24 sm:w-32 accent-blue-600" />
              <span className="text-xs font-mono w-6 text-right font-medium">{brushSize}px</span>
            </div>
          )}
          {activeTool === 'pan' && (
            <span className="text-xs font-semibold text-zinc-500 uppercase px-2">Mode Navigasi Aktif</span>
          )}

          <div className="w-px h-4 bg-border mx-2" />

          {/* Zoom Controls */}
          <div className="flex items-center gap-1">
            <button onClick={() => setZoom(z => Math.max(10, z - 10))} className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-300">
              <ZoomOut className="w-4 h-4" />
            </button>
            <span className="text-xs font-mono font-bold w-12 text-center cursor-pointer hover:text-blue-600" onClick={() => fitToScreen()} title="Fit to screen">
              {zoom}%
            </span>
            <button onClick={() => setZoom(z => Math.min(500, z + 10))} className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-300">
              <ZoomIn className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Workspace / Canvas Area */}
        <div 
          ref={containerRef}
          className={cn(
            "flex-1 overflow-auto bg-zinc-200/50 dark:bg-zinc-950/50 touch-none",
            activeTool === 'pan' ? "cursor-grab active:cursor-grabbing" : ""
          )}
          onPointerDown={handleContainerPointerDown}
          onWheel={(e) => {
            if (e.ctrlKey || e.metaKey) {
              e.preventDefault();
              const delta = e.deltaY > 0 ? -10 : 10;
              setZoom(z => Math.max(10, Math.min(500, z + delta)));
            }
          }}
        >
          <div className="min-w-full min-h-full flex items-center justify-center p-8 sm:p-16">
            <div 
              className="relative shadow-2xl transition-all duration-150 ease-out"
              style={{ 
                width: `${imageSize.width * (zoom / 100)}px`, 
                height: `${imageSize.height * (zoom / 100)}px` 
              }}
            >
              {/* Checkered pattern background */}
              <div 
                className="absolute inset-0 z-0 pointer-events-none rounded bg-white dark:bg-[#18181b]"
                style={{
                  backgroundImage: `linear-gradient(45deg, ${patternMode === 'light' ? '#e5e7eb' : '#27272a'} 25%, transparent 25%, transparent 75%, ${patternMode === 'light' ? '#e5e7eb' : '#27272a'} 75%, ${patternMode === 'light' ? '#e5e7eb' : '#27272a'}), linear-gradient(45deg, ${patternMode === 'light' ? '#e5e7eb' : '#27272a'} 25%, transparent 25%, transparent 75%, ${patternMode === 'light' ? '#e5e7eb' : '#27272a'} 75%, ${patternMode === 'light' ? '#e5e7eb' : '#27272a'})`,
                  backgroundSize: '20px 20px',
                  backgroundPosition: '0 0, 10px 10px',
                }}
              />
              
              {/* The interactive canvas */}
              <canvas 
                ref={canvasRef}
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onPointerLeave={handlePointerUp}
                className={cn(
                  "absolute inset-0 z-10 rounded w-full h-full",
                  activeTool === 'wand' && "cursor-crosshair",
                  activeTool === 'brush' && "cursor-crosshair", // Bisa diganti cursor custom berbentuk bulat
                  activeTool === 'pan' && "pointer-events-none" // Biarkan container menangani drag
                )}
                style={{ touchAction: 'none' }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}

// Komponen Helper untuk Tombol Tool di Sidebar
function ToolButton({ icon, label, active, onClick }: { icon: React.ReactNode, label: string, active: boolean, onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      title={label}
      className={cn(
        "w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-200 relative group",
        active 
          ? "bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400" 
          : "text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 dark:text-zinc-400"
      )}
    >
      {React.cloneElement(icon as React.ReactElement, { className: "w-5 h-5" })}
      
      {/* Tooltip */}
      <span className="absolute left-full ml-3 px-2 py-1 bg-zinc-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50">
        {label}
      </span>
    </button>
  );
}
