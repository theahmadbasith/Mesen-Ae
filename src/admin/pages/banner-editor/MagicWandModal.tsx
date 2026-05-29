import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { 
  X, Check, Wand2, ZoomIn, ZoomOut, Save, Moon, Sun, 
  Eraser, Paintbrush, Hand, Undo2, Redo2, Crop
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface MagicWandModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  imageUrl: string | null;
  onSave: (newBase64: string) => void;
}

type ToolMode = 'wand' | 'brush' | 'restore' | 'crop' | 'pan';
type BrushHardness = 'hard' | 'soft';

// Definisi state history agar mendukung undo/redo fitur Crop
interface HistoryState {
  imgData: ImageData;
  originalImageCanvas: HTMLCanvasElement;
  width: number;
  height: number;
}

export default function MagicWandModal({ open, onOpenChange, imageUrl, onSave }: MagicWandModalProps) {
  const [activeTool, setActiveTool] = useState<ToolMode>('wand');
  const [patternMode, setPatternMode] = useState<'light' | 'dark'>('light');
  
  // States untuk Tools
  const [tolerance, setTolerance] = useState(32);
  const [brushSize, setBrushSize] = useState(30);
  const [brushHardness, setBrushHardness] = useState<BrushHardness>('hard');
  
  // Workspace & Canvas States
  const [zoom, setZoom] = useState(100);
  const [imageSize, setImageSize] = useState({ width: 0, height: 0 });
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const originalImageRef = useRef<HTMLCanvasElement | HTMLImageElement | null>(null);
  
  // States History & Tools Interaksi
  const [history, setHistory] = useState<HistoryState[]>([]);
  const [historyIndex, setHistoryIndex] = useState(0);
  const isDrawing = useRef(false);
  const isPanning = useRef(false);
  const lastPos = useRef<{ x: number, y: number } | null>(null);

  // States untuk Crop Tool
  const [cropStart, setCropStart] = useState<{ x: number, y: number } | null>(null);
  const [cropEnd, setCropEnd] = useState<{ x: number, y: number } | null>(null);

  const saveToHistory = useCallback(() => {
    const cvs = canvasRef.current;
    if (!cvs || !originalImageRef.current) return;
    const ctx = cvs.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;
    
    const imgData = ctx.getImageData(0, 0, cvs.width, cvs.height);
    
    // Simpan juga versi aslinya jika crop dilakukan agar bisa di-undo
    const clonedOrig = document.createElement('canvas');
    clonedOrig.width = cvs.width;
    clonedOrig.height = cvs.height;
    clonedOrig.getContext('2d')?.drawImage(originalImageRef.current, 0, 0);

    const newHist = history.slice(0, historyIndex + 1);
    const stateToSave: HistoryState = {
      imgData,
      originalImageCanvas: clonedOrig,
      width: cvs.width,
      height: cvs.height
    };
    
    setHistory([...newHist, stateToSave]);
    setHistoryIndex(newHist.length);
  }, [history, historyIndex]);

  useEffect(() => {
    if (open && imageUrl) {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        setImageSize({ width: img.width, height: img.height });
        originalImageRef.current = img;
        
        const cvs = canvasRef.current;
        if (cvs) {
          cvs.width = img.width;
          cvs.height = img.height;
          const ctx = cvs.getContext('2d', { willReadFrequently: true });
          if (ctx) {
            ctx.clearRect(0, 0, cvs.width, cvs.height);
            ctx.drawImage(img, 0, 0);
            
            const clonedOrig = document.createElement('canvas');
            clonedOrig.width = img.width; clonedOrig.height = img.height;
            clonedOrig.getContext('2d')?.drawImage(img, 0, 0);

            setHistory([{
              imgData: ctx.getImageData(0, 0, cvs.width, cvs.height),
              originalImageCanvas: clonedOrig,
              width: img.width,
              height: img.height
            }]);
            setHistoryIndex(0);
          }
          fitToScreen(img.width, img.height);
        }
      };
      img.src = imageUrl;
      setPatternMode('light');
      setActiveTool('wand');
      setCropStart(null);
      setCropEnd(null);
    }
  }, [open, imageUrl]);

  const fitToScreen = (imgW = imageSize.width, imgH = imageSize.height) => {
    const container = containerRef.current;
    if (container && imgW && imgH) {
      const maxW = container.clientWidth - 64;
      const maxH = container.clientHeight - 64;
      const scaleX = maxW / imgW;
      const scaleY = maxH / imgH;
      const minScale = Math.min(scaleX, scaleY, 1);
      setZoom(Math.floor(minScale * 100));
    }
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

  const applyBrushOrRestore = (x: number, y: number, mode: 'point' | 'line') => {
    const cvs = canvasRef.current;
    const ctx = cvs?.getContext('2d');
    if (!cvs || !ctx || !originalImageRef.current) return;

    // Untuk memastikan goresan halus (soft) tidak menumpuk aneh, kita gunakan kanvas sementara
    const tempCvs = document.createElement('canvas');
    tempCvs.width = cvs.width;
    tempCvs.height = cvs.height;
    const tCtx = tempCvs.getContext('2d');
    if (!tCtx) return;

    tCtx.lineCap = 'round';
    tCtx.lineJoin = 'round';
    tCtx.lineWidth = brushSize;
    if (brushHardness === 'soft') {
      tCtx.filter = `blur(${brushSize * 0.15}px)`;
    }

    if (mode === 'point') {
      tCtx.beginPath();
      tCtx.arc(x, y, brushSize / 2, 0, Math.PI * 2);
      tCtx.fill();
    } else if (lastPos.current) {
      tCtx.beginPath();
      tCtx.moveTo(lastPos.current.x, lastPos.current.y);
      tCtx.lineTo(x, y);
      tCtx.stroke();
    }

    if (activeTool === 'brush') {
      // Hapus piksel utama
      ctx.globalCompositeOperation = 'destination-out';
      ctx.drawImage(tempCvs, 0, 0);
      ctx.globalCompositeOperation = 'source-over';
    } else if (activeTool === 'restore') {
      // Ambil piksel asli dari bentuk brush lalu timpa ke kanvas utama
      tCtx.globalCompositeOperation = 'source-in';
      tCtx.drawImage(originalImageRef.current, 0, 0, cvs.width, cvs.height);
      ctx.globalCompositeOperation = 'source-over';
      ctx.drawImage(tempCvs, 0, 0);
    }
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (activeTool === 'pan') return;

    const { x, y } = getCanvasMousePos(e);

    if (activeTool === 'crop') {
      setCropStart({ x, y });
      setCropEnd({ x, y });
      return;
    }

    if (activeTool === 'brush' || activeTool === 'restore') {
      isDrawing.current = true;
      lastPos.current = { x, y };
      applyBrushOrRestore(x, y, 'point');
      return;
    }

    if (activeTool === 'wand') {
      const cvs = canvasRef.current;
      if (!cvs) return;
      const ctx = cvs.getContext('2d', { willReadFrequently: true });
      if (!ctx) return;

      if (x < 0 || y < 0 || x >= cvs.width || y >= cvs.height) return;

      const imgData = ctx.getImageData(0, 0, cvs.width, cvs.height);
      const data = imgData.data;
      const w = cvs.width;
      const h = cvs.height;

      const targetIdx = (y * w + x) * 4;
      const tr = data[targetIdx], tg = data[targetIdx + 1], tb = data[targetIdx + 2], ta = data[targetIdx + 3];
      if (ta === 0) return;

      const colorMatch = (r: number, g: number, b: number, a: number) => {
        if (a === 0) return false;
        return Math.abs(r - tr) <= tolerance && Math.abs(g - tg) <= tolerance && Math.abs(b - tb) <= tolerance && Math.abs(a - ta) <= tolerance;
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
    if (activeTool === 'crop' && cropStart) {
      setCropEnd(getCanvasMousePos(e));
      return;
    }

    if ((activeTool === 'brush' || activeTool === 'restore') && isDrawing.current && lastPos.current) {
      const { x, y } = getCanvasMousePos(e);
      applyBrushOrRestore(x, y, 'line');
      lastPos.current = { x, y };
    }
  };

  const handlePointerUp = () => {
    if ((activeTool === 'brush' || activeTool === 'restore') && isDrawing.current) {
      isDrawing.current = false;
      lastPos.current = null;
      saveToHistory();
    }
  };

  const executeCrop = () => {
    if (!cropStart || !cropEnd) return;
    const rx = Math.min(cropStart.x, cropEnd.x);
    const ry = Math.min(cropStart.y, cropEnd.y);
    const rw = Math.abs(cropStart.x - cropEnd.x);
    const rh = Math.abs(cropStart.y - cropEnd.y);
    
    if (rw < 20 || rh < 20) {
      setCropStart(null); setCropEnd(null);
      return;
    }

    const cvs = canvasRef.current;
    const ctx = cvs?.getContext('2d');
    if (!cvs || !ctx || !originalImageRef.current) return;

    // Crop main canvas
    const tempMain = document.createElement('canvas');
    tempMain.width = rw; tempMain.height = rh;
    tempMain.getContext('2d')?.drawImage(cvs, -rx, -ry);

    // Crop original reference image
    const tempOrig = document.createElement('canvas');
    tempOrig.width = rw; tempOrig.height = rh;
    tempOrig.getContext('2d')?.drawImage(originalImageRef.current, -rx, -ry);

    // Apply
    cvs.width = rw; cvs.height = rh;
    ctx.drawImage(tempMain, 0, 0);
    originalImageRef.current = tempOrig;
    setImageSize({ width: rw, height: rh });
    
    setCropStart(null);
    setCropEnd(null);
    saveToHistory();
  };

  const undo = () => {
    if (historyIndex <= 0) return;
    const newIdx = historyIndex - 1;
    applyHistoryState(history[newIdx]);
    setHistoryIndex(newIdx);
  };

  const redo = () => {
    if (historyIndex >= history.length - 1) return;
    const newIdx = historyIndex + 1;
    applyHistoryState(history[newIdx]);
    setHistoryIndex(newIdx);
  };

  const applyHistoryState = (state: HistoryState) => {
    const cvs = canvasRef.current;
    const ctx = cvs?.getContext('2d', { willReadFrequently: true });
    if (!cvs || !ctx) return;
    
    cvs.width = state.width;
    cvs.height = state.height;
    ctx.putImageData(state.imgData, 0, 0);
    setImageSize({ width: state.width, height: state.height });
    
    const clonedOrig = document.createElement('canvas');
    clonedOrig.width = state.width; clonedOrig.height = state.height;
    clonedOrig.getContext('2d')?.drawImage(state.originalImageCanvas, 0, 0);
    originalImageRef.current = clonedOrig;
  };

  const handleSave = () => {
    const cvs = canvasRef.current;
    if (!cvs) return;
    onSave(cvs.toDataURL('image/png'));
    onOpenChange(false);
  };

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
      container.scrollLeft = scrollLeft - (moveEvent.pageX - container.offsetLeft - startX);
      container.scrollTop = scrollTop - (moveEvent.pageY - container.offsetTop - startY);
    };
    const onUp = () => {
      isPanning.current = false;
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
    
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  };

  // Dinamis Kursor Lingkaran untuk Brush / Repair
  const getCursorStyle = () => {
    if (activeTool === 'pan') return 'grab';
    if (activeTool === 'crop' || activeTool === 'wand') return 'crosshair';
    
    const size = Math.max(brushSize * (zoom / 100), 4);
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}"><circle cx="${size/2}" cy="${size/2}" r="${(size/2)-1}" fill="none" stroke="black" stroke-width="1"/><circle cx="${size/2}" cy="${size/2}" r="${(size/2)-2}" fill="none" stroke="white" stroke-width="1"/></svg>`;
    return `url('data:image/svg+xml;utf8,${encodeURIComponent(svg)}') ${size/2} ${size/2}, auto`;
  };

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-[100] flex flex-col bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 overflow-hidden font-sans">
      
      {/* Header Panel */}
      <div className="h-16 shrink-0 border-b border-border bg-white dark:bg-zinc-900 flex items-center justify-between px-4 shadow-sm z-20">
        <div className="flex items-center gap-3">
          <button onClick={() => onOpenChange(false)} className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors">
            <X className="w-5 h-5" />
          </button>
          <div className="flex flex-col">
            <span className="font-bold text-sm sm:text-base leading-tight">Hapus Latar Belakang</span>
            <span className="text-[10px] sm:text-xs text-zinc-500 font-medium">Editor Profesional</span>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-4">
          <div className="flex items-center gap-1 bg-zinc-100 dark:bg-zinc-800 p-1 rounded-lg">
            <button onClick={undo} disabled={historyIndex <= 0} className="w-8 h-8 flex items-center justify-center rounded hover:bg-white dark:hover:bg-zinc-700 disabled:opacity-30 transition-colors"><Undo2 className="w-4 h-4" /></button>
            <button onClick={redo} disabled={historyIndex >= history.length - 1} className="w-8 h-8 flex items-center justify-center rounded hover:bg-white dark:hover:bg-zinc-700 disabled:opacity-30 transition-colors"><Redo2 className="w-4 h-4" /></button>
          </div>

          <button onClick={() => setPatternMode(p => p === 'light' ? 'dark' : 'light')} className="w-9 h-9 rounded-lg flex items-center justify-center bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors">
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
          <ToolButton icon={<Wand2 />} label="Magic Wand" active={activeTool === 'wand'} onClick={() => { setActiveTool('wand'); setCropStart(null); }} />
          <ToolButton icon={<Eraser />} label="Hapus Manual (Brush)" active={activeTool === 'brush'} onClick={() => { setActiveTool('brush'); setCropStart(null); }} />
          <ToolButton icon={<Paintbrush />} label="Kembalikan (Repair)" active={activeTool === 'restore'} onClick={() => { setActiveTool('restore'); setCropStart(null); }} />
          <ToolButton icon={<Crop />} label="Potong Kanvas (Crop)" active={activeTool === 'crop'} onClick={() => setActiveTool('crop')} />
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

          {(activeTool === 'brush' || activeTool === 'restore') && (
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-3">
                <span className="text-xs font-semibold text-zinc-500 uppercase">Ukuran</span>
                <input type="range" min="1" max="200" value={brushSize} onChange={e => setBrushSize(Number(e.target.value))} className="w-24 sm:w-32 accent-blue-600" />
                <span className="text-xs font-mono w-8 text-right font-medium">{brushSize}px</span>
              </div>
              <div className="w-px h-4 bg-border" />
              <div className="flex bg-zinc-100 dark:bg-zinc-800 rounded p-0.5">
                <button onClick={() => setBrushHardness('hard')} className={cn("px-2 py-1 text-xs font-medium rounded transition-colors", brushHardness === 'hard' ? "bg-white dark:bg-zinc-600 shadow-sm" : "text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100")}>Kasar</button>
                <button onClick={() => setBrushHardness('soft')} className={cn("px-2 py-1 text-xs font-medium rounded transition-colors", brushHardness === 'soft' ? "bg-white dark:bg-zinc-600 shadow-sm" : "text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100")}>Halus</button>
              </div>
            </div>
          )}

          {activeTool === 'crop' && (
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-zinc-500 uppercase px-2">Seleksi area potong</span>
              {cropStart && cropEnd && (
                <button onClick={executeCrop} className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium px-3 py-1.5 rounded flex items-center gap-1.5"><Check className="w-3.5 h-3.5"/> Terapkan</button>
              )}
            </div>
          )}

          {activeTool === 'pan' && <span className="text-xs font-semibold text-zinc-500 uppercase px-2">Mode Navigasi (Bisa Zoom Bebas)</span>}

          <div className="w-px h-4 bg-border mx-2" />

          {/* Zoom Controls */}
          <div className="flex items-center gap-1">
            <button onClick={() => setZoom(z => Math.max(10, z - 10))} className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800"><ZoomOut className="w-4 h-4" /></button>
            <span className="text-xs font-mono font-bold w-12 text-center cursor-pointer hover:text-blue-600" onClick={() => fitToScreen()} title="Fit to screen">{zoom}%</span>
            <button onClick={() => setZoom(z => Math.min(500, z + 10))} className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800"><ZoomIn className="w-4 h-4" /></button>
          </div>
        </div>

        {/* Workspace / Canvas Area */}
        <div 
          ref={containerRef}
          className={cn("flex-1 overflow-auto bg-zinc-200/50 dark:bg-zinc-950/50 touch-none", activeTool === 'pan' ? "cursor-grab active:cursor-grabbing" : "")}
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
              style={{ width: `${imageSize.width * (zoom / 100)}px`, height: `${imageSize.height * (zoom / 100)}px` }}
            >
              {/* Pattern Latar Belakang (White/Gray Default & Tahan Banting dari Dark Mode) */}
              <div 
                className="absolute inset-0 z-0 pointer-events-none rounded"
                style={{
                  backgroundColor: patternMode === 'light' ? '#ffffff' : '#18181b',
                  backgroundImage: `linear-gradient(45deg, ${patternMode === 'light' ? '#e5e7eb' : '#27272a'} 25%, transparent 25%, transparent 75%, ${patternMode === 'light' ? '#e5e7eb' : '#27272a'} 75%, ${patternMode === 'light' ? '#e5e7eb' : '#27272a'}), linear-gradient(45deg, ${patternMode === 'light' ? '#e5e7eb' : '#27272a'} 25%, transparent 25%, transparent 75%, ${patternMode === 'light' ? '#e5e7eb' : '#27272a'} 75%, ${patternMode === 'light' ? '#e5e7eb' : '#27272a'})`,
                  backgroundSize: '20px 20px',
                  backgroundPosition: '0 0, 10px 10px',
                }}
              />
              
              <canvas 
                ref={canvasRef}
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onPointerLeave={handlePointerUp}
                className={cn("absolute inset-0 z-10 rounded w-full h-full", activeTool === 'pan' && "pointer-events-none")}
                style={{ touchAction: 'none', cursor: getCursorStyle() }}
              />

              {/* Garis Potong (Crop Box) */}
              {activeTool === 'crop' && cropStart && cropEnd && (
                <div 
                  className="absolute z-20 pointer-events-none border-2 border-blue-500 border-dashed"
                  style={{
                    left: `${Math.min(cropStart.x, cropEnd.x) * (zoom / 100)}px`,
                    top: `${Math.min(cropStart.y, cropEnd.y) * (zoom / 100)}px`,
                    width: `${Math.abs(cropStart.x - cropEnd.x) * (zoom / 100)}px`,
                    height: `${Math.abs(cropStart.y - cropEnd.y) * (zoom / 100)}px`,
                    boxShadow: '0 0 0 9999px rgba(0,0,0,0.4)',
                  }}
                />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}

function ToolButton({ icon, label, active, onClick }: { icon: React.ReactNode, label: string, active: boolean, onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      title={label}
      className={cn(
        "w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-200 relative group",
        active ? "bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400" : "text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 dark:text-zinc-400"
      )}
    >
      {React.cloneElement(icon as React.ReactElement, { className: "w-5 h-5" })}
      <span className="absolute left-full ml-3 px-2 py-1 bg-zinc-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50">
        {label}
      </span>
    </button>
  );
}
