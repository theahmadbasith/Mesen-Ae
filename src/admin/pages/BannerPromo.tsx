import { useDbQuery, dbUpdate, dbUploadFile, dbDeleteFile, dbInsert, dbDelete } from '@/hooks/db-hooks';
import { type Voucher, type Product } from '@/hooks/db-hooks';
import { useState, useRef, useCallback, useEffect } from 'react';
import {
  Plus, Edit2, Trash2, Image as ImageIcon, Sparkles, Clock, Minus,
  RotateCcw, RotateCw, FlipHorizontal, MousePointer2, X, Bold, Italic,
  AlignLeft, AlignCenter, AlignRight, Type, Palette, Layers, Layout,
  ChevronDown, ChevronUp, Eye, EyeOff, Lock, Unlock, Copy, Trash,
  Move, ZoomIn, ZoomOut, Grid, Sliders, RefreshCw, Download, Check,
  PanelLeft, CornerDownRight, Maximize2, FlipVertical, SquareDashed,
  Pipette, Sun, Contrast, Droplets, Blend, SlidersHorizontal, ArrowUpDown,
  GripVertical, Star, Square, Circle, Triangle, Hexagon, ArrowRight,
  ChevronLeft, ChevronRight, MoreVertical, Crosshair, Wand2, Pen
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { FORMAT_IDR } from '@/lib/utils';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

// ─── TYPES ─────────────────────────────────────────────────────────────────────

export interface TextLayer {
  id: string;
  type: 'text';
  content: string;
  x: number; y: number;
  fontSize: number;
  fontWeight: 'normal' | 'bold' | '900';
  fontStyle: 'normal' | 'italic';
  textAlign: 'left' | 'center' | 'right';
  color: string;
  bgColor: string;
  bgOpacity: number;
  shadow: boolean;
  letterSpacing: number;
  lineHeight: number;
  opacity: number;
  rotate: number;
  width: number;
  locked: boolean;
  visible: boolean;
  zIndex: number;
  fontFamily: string;
  textDecoration: 'none' | 'underline';
  uppercase: boolean;
  padding: number;
  borderRadius: number;
  backdropBlur: boolean;
}

export interface ImageLayer {
  id: string;
  type: 'image';
  src: string;
  x: number; y: number;
  width: number;
  rotate: number;
  flipX: boolean;
  flipY: boolean;
  opacity: number;
  brightness: number;
  contrast: number;
  saturate: number;
  blur: number;
  mixBlendMode: string;
  locked: boolean;
  visible: boolean;
  zIndex: number;
  borderRadius: number;
  shadow: boolean;
  grayscale: boolean;
  sepia: boolean;
}

export interface ShapeLayer {
  id: string;
  type: 'shape';
  shape: 'rect' | 'circle' | 'triangle' | 'hexagon' | 'star' | 'arrow';
  x: number; y: number;
  width: number; height: number;
  rotate: number;
  fillColor: string;
  strokeColor: string;
  strokeWidth: number;
  opacity: number;
  locked: boolean;
  visible: boolean;
  zIndex: number;
  shadow: boolean;
  borderRadius: number;
}

export type CanvasLayer = TextLayer | ImageLayer | ShapeLayer;

export interface PromoBanner {
  id: number | string;
  type: 'voucher' | 'menu' | 'custom';
  title: string;
  description: string;
  voucherId?: string | number;
  productId?: string | number;
  imageUrl?: string | null;
  isActive: boolean;
  bgType?: 'image' | 'solid' | 'gradient' | 'pattern';
  bgColor?: string;
  bgGradient?: string;
  bgPattern?: string;
  canvasLayers?: CanvasLayer[];
  canvasBgFilter?: { brightness: number; contrast: number; saturate: number; blur: number };
  buttonText?: string;
  link?: string;
}

// ─── CONSTANTS ─────────────────────────────────────────────────────────────────

const FONT_FAMILIES = [
  'Poppins', 'Inter', 'Playfair Display', 'Montserrat', 'Raleway',
  'DM Sans', 'Space Grotesk', 'Sora', 'Nunito', 'Quicksand',
  'Oswald', 'Lato', 'Bebas Neue', 'Lobster', 'Pacifico'
];

const BLEND_MODES = [
  'normal', 'multiply', 'screen', 'overlay', 'darken',
  'lighten', 'color-dodge', 'color-burn', 'hard-light', 'soft-light', 'difference'
];

const GRADIENT_PRESETS = [
  { name: 'Ocean', value: 'linear-gradient(135deg, #0061ff, #60efff)' },
  { name: 'Sunset', value: 'linear-gradient(135deg, #f093fb, #f5576c)' },
  { name: 'Forest', value: 'linear-gradient(135deg, #11998e, #38ef7d)' },
  { name: 'Royal', value: 'linear-gradient(135deg, #1a1a2e, #6a0dad)' },
  { name: 'Gold', value: 'linear-gradient(135deg, #f7971e, #ffd200)' },
  { name: 'Midnight', value: 'linear-gradient(135deg, #0f0c29, #302b63)' },
  { name: 'Rose', value: 'linear-gradient(135deg, #f953c6, #b91d73)' },
  { name: 'Slate', value: 'linear-gradient(135deg, #1E293B, #0F172A)' },
  { name: 'Crimson', value: 'linear-gradient(135deg, #7f0000, #ef4444)' },
  { name: 'Teal', value: 'linear-gradient(135deg, #134e5e, #71b280)' },
];

const COLOR_PALETTE = [
  '#FFFFFF', '#F8FAFC', '#E2E8F0', '#94A3B8', '#475569', '#1E293B', '#0F172A', '#000000',
  '#FEF2F2', '#FCA5A5', '#EF4444', '#B91C1C', '#7F1D1D',
  '#FFF7ED', '#FED7AA', '#F97316', '#C2410C', '#7C2D12',
  '#FEFCE8', '#FEF08A', '#EAB308', '#A16207', '#713F12',
  '#F0FDF4', '#86EFAC', '#22C55E', '#15803D', '#14532D',
  '#ECFEFF', '#67E8F9', '#06B6D4', '#0E7490', '#164E63',
  '#EFF6FF', '#93C5FD', '#3B82F6', '#1D4ED8', '#1E3A8A',
  '#F5F3FF', '#C4B5FD', '#8B5CF6', '#6D28D9', '#4C1D95',
  '#FDF4FF', '#E879F9', '#A21CAF', '#701A75',
];

const SHAPE_PRESETS = [
  { type: 'rect' as const, icon: Square, label: 'Kotak' },
  { type: 'circle' as const, icon: Circle, label: 'Lingkaran' },
  { type: 'triangle' as const, icon: Triangle, label: 'Segitiga' },
];

// ─── HELPERS ───────────────────────────────────────────────────────────────────

const generateId = () => Math.random().toString(36).slice(2, 9);

const defaultTextLayer = (extra?: Partial<TextLayer>): TextLayer => ({
  id: generateId(), type: 'text', content: 'Teks Baru',
  x: 50, y: 50, fontSize: 28, fontWeight: 'bold', fontStyle: 'normal',
  textAlign: 'left', color: '#FFFFFF', bgColor: '#000000', bgOpacity: 0,
  shadow: true, letterSpacing: 0, lineHeight: 1.3, opacity: 100, rotate: 0,
  width: 40, locked: false, visible: true, zIndex: 10, fontFamily: 'Poppins',
  textDecoration: 'none', uppercase: false, padding: 8, borderRadius: 8,
  backdropBlur: false, ...extra
});

const defaultImageLayer = (src: string, extra?: Partial<ImageLayer>): ImageLayer => ({
  id: generateId(), type: 'image', src,
  x: 50, y: 50, width: 30, rotate: 0, flipX: false, flipY: false,
  opacity: 100, brightness: 100, contrast: 100, saturate: 100, blur: 0,
  mixBlendMode: 'normal', locked: false, visible: true, zIndex: 20,
  borderRadius: 0, shadow: false, grayscale: false, sepia: false, ...extra
});

const defaultShapeLayer = (shape: ShapeLayer['shape']): ShapeLayer => ({
  id: generateId(), type: 'shape', shape,
  x: 50, y: 50, width: 20, height: 15, rotate: 0,
  fillColor: '#3B82F6', strokeColor: 'transparent', strokeWidth: 0,
  opacity: 100, locked: false, visible: true, zIndex: 5, shadow: false, borderRadius: 0
});

// ─── SHAPE SVG RENDER ───────────────────────────────────────────────────────────

function ShapeSVG({ layer }: { layer: ShapeLayer }) {
  const s = layer.strokeWidth > 0 ? layer.strokeColor : 'none';
  const f = layer.fillColor;
  switch (layer.shape) {
    case 'rect': return <rect x={layer.strokeWidth / 2} y={layer.strokeWidth / 2} width={`calc(100% - ${layer.strokeWidth}px)`} height={`calc(100% - ${layer.strokeWidth}px)`} rx={layer.borderRadius} fill={f} stroke={s} strokeWidth={layer.strokeWidth} />;
    case 'circle': return <ellipse cx="50%" cy="50%" rx={`calc(50% - ${layer.strokeWidth / 2}px)`} ry={`calc(50% - ${layer.strokeWidth / 2}px)`} fill={f} stroke={s} strokeWidth={layer.strokeWidth} />;
    case 'triangle': return <polygon points="50,0 100,100 0,100" fill={f} stroke={s} strokeWidth={layer.strokeWidth} style={{ vectorEffect: 'non-scaling-stroke' }} />;
    case 'star': return <polygon points="50,5 61,35 95,35 68,57 79,91 50,70 21,91 32,57 5,35 39,35" fill={f} stroke={s} strokeWidth={layer.strokeWidth} style={{ vectorEffect: 'non-scaling-stroke' }} />;
    default: return <rect width="100%" height="100%" fill={f} stroke={s} strokeWidth={layer.strokeWidth} />;
  }
}

// ─── PANEL SECTION ──────────────────────────────────────────────────────────────

function PanelSection({ title, icon: Icon, children, defaultOpen = true }: {
  title: string; icon?: any; children: React.ReactNode; defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border-b border-white/10 last:border-0">
      <button onClick={() => setOpen(o => !o)} className="w-full flex items-center justify-between px-4 py-3 text-xs font-black uppercase tracking-widest text-white/60 hover:text-white/90 transition-colors">
        <div className="flex items-center gap-2">{Icon && <Icon className="w-3.5 h-3.5" />}{title}</div>
        {open ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
      </button>
      {open && <div className="px-4 pb-4 space-y-3">{children}</div>}
    </div>
  );
}

// ─── COLOR PICKER MINI ──────────────────────────────────────────────────────────

function ColorGrid({ value, onChange }: { value: string; onChange: (c: string) => void }) {
  return (
    <div className="space-y-2">
      <div className="grid grid-cols-8 gap-1">
        {COLOR_PALETTE.map(c => (
          <button key={c} onClick={() => onChange(c)}
            className={cn("w-6 h-6 rounded-md border-2 transition-transform hover:scale-110", value.toUpperCase() === c.toUpperCase() ? 'border-white scale-110' : 'border-transparent')}
            style={{ backgroundColor: c }} />
        ))}
      </div>
      <div className="flex items-center gap-2 mt-1">
        <input type="color" value={value} onChange={e => onChange(e.target.value)} className="w-8 h-8 p-0.5 cursor-pointer rounded-lg bg-transparent border border-white/20 shrink-0" />
        <Input value={value} onChange={e => onChange(e.target.value)} className="h-8 bg-white/10 border-white/20 text-white text-xs font-mono uppercase rounded-lg" />
      </div>
    </div>
  );
}

// ─── SLIDER ROW ─────────────────────────────────────────────────────────────────

function SliderRow({ label, value, min, max, step = 1, unit = '', onChange }: {
  label: string; value: number; min: number; max: number; step?: number; unit?: string; onChange: (v: number) => void;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex justify-between items-center">
        <span className="text-[10px] font-bold uppercase tracking-wider text-white/50">{label}</span>
        <span className="text-[10px] font-mono font-black text-white/80">{value}{unit}</span>
      </div>
      <Slider value={[value]} min={min} max={max} step={step} onValueChange={([v]) => onChange(v)} className="accent-primary" />
    </div>
  );
}

// ─── MAIN COMPONENT ─────────────────────────────────────────────────────────────

export default function BannerPromo() {
  const vouchers = (useDbQuery<Voucher>('vouchers') as Voucher[]) ?? [];
  const products = (useDbQuery<Product>('products') as Product[]) ?? [];
  const bannerList = useDbQuery<PromoBanner>('banners');

  const [bannerDialogOpen, setBannerDialogOpen] = useState(false);
  const [deleteBannerId, setDeleteBannerId] = useState<string | number | null>(null);
  const [editBanner, setEditBanner] = useState<PromoBanner | null>(null);

  // Quick-form state
  const [bannerType, setBannerType] = useState<'voucher' | 'menu' | 'custom'>('custom');
  const [bannerTitle, setBannerTitle] = useState('');
  const [bannerDesc, setBannerDesc] = useState('');
  const [bannerVoucherId, setBannerVoucherId] = useState('');
  const [bannerProductId, setBannerProductId] = useState('');
  const [bannerLink, setBannerLink] = useState('');
  const [bannerButtonText, setBannerButtonText] = useState('');
  const [bannerIsActive, setBannerIsActive] = useState(true);
  const [bannerBgType, setBannerBgType] = useState<'image' | 'solid' | 'gradient'>('gradient');
  const [bannerBgColor, setBannerBgColor] = useState('#1E293B');
  const [bannerBgGradient, setBannerBgGradient] = useState(GRADIENT_PRESETS[0].value);
  const [bannerImage, setBannerImage] = useState<string | null>(null);

  // ── Canvas Editor State ──────────────────────────────────────────────────────
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [layers, setLayers] = useState<CanvasLayer[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [activePanel, setActivePanel] = useState<'layers' | 'elements' | 'bg' | 'props'>('elements');
  const [zoom, setZoom] = useState(100);
  const [showGrid, setShowGrid] = useState(false);
  const [bgFilter, setBgFilter] = useState({ brightness: 100, contrast: 100, saturate: 100, blur: 0 });
  const [history, setHistory] = useState<CanvasLayer[][]>([[]]);
  const [historyIndex, setHistoryIndex] = useState(0);

  const canvasRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const bgFileInputRef = useRef<HTMLInputElement>(null);
  const overlayFileInputRef = useRef<HTMLInputElement>(null);
  const dragState = useRef<{ id: string; startX: number; startY: number; origX: number; origY: number } | null>(null);

  // ── Layer helpers ────────────────────────────────────────────────────────────

  const pushHistory = useCallback((newLayers: CanvasLayer[]) => {
    setHistory(prev => {
      const trimmed = prev.slice(0, historyIndex + 1);
      return [...trimmed, newLayers].slice(-30);
    });
    setHistoryIndex(i => Math.min(i + 1, 29));
  }, [historyIndex]);

  const updateLayer = useCallback(<T extends CanvasLayer>(id: string, patch: Partial<T>) => {
    setLayers(prev => {
      const next = prev.map(l => l.id === id ? { ...l, ...patch } as CanvasLayer : l);
      pushHistory(next);
      return next;
    });
  }, [pushHistory]);

  const addLayer = useCallback((layer: CanvasLayer) => {
    setLayers(prev => {
      const next = [...prev, layer];
      pushHistory(next);
      return next;
    });
    setSelectedId(layer.id);
    setActivePanel('props');
  }, [pushHistory]);

  const removeLayer = useCallback((id: string) => {
    setLayers(prev => {
      const next = prev.filter(l => l.id !== id);
      pushHistory(next);
      return next;
    });
    if (selectedId === id) setSelectedId(null);
  }, [selectedId, pushHistory]);

  const duplicateLayer = useCallback((id: string) => {
    const layer = layers.find(l => l.id === id);
    if (!layer) return;
    const copy = { ...layer, id: generateId(), x: layer.x + 3, y: layer.y + 3, zIndex: layer.zIndex + 1 };
    addLayer(copy as CanvasLayer);
  }, [layers, addLayer]);

  const undo = () => {
    if (historyIndex > 0) {
      const idx = historyIndex - 1;
      setLayers(history[idx]);
      setHistoryIndex(idx);
    }
  };
  const redo = () => {
    if (historyIndex < history.length - 1) {
      const idx = historyIndex + 1;
      setLayers(history[idx]);
      setHistoryIndex(idx);
    }
  };

  const selectedLayer = layers.find(l => l.id === selectedId) || null;

  // ── Drag on canvas ───────────────────────────────────────────────────────────

  const onLayerPointerDown = (e: React.PointerEvent, id: string) => {
    e.stopPropagation();
    const layer = layers.find(l => l.id === id);
    if (!layer || layer.locked) return;
    setSelectedId(id);
    setActivePanel('props');
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    dragState.current = { id, startX: e.clientX, startY: e.clientY, origX: layer.x, origY: layer.y };

    const onMove = (me: PointerEvent) => {
      if (!dragState.current) return;
      const dx = (me.clientX - dragState.current.startX) / rect.width * 100;
      const dy = (me.clientY - dragState.current.startY) / rect.height * 100;
      let nx = Math.round((dragState.current.origX + dx) * 10) / 10;
      let ny = Math.round((dragState.current.origY + dy) * 10) / 10;
      // Snap to center
      if (Math.abs(nx - 50) < 1.5) nx = 50;
      if (Math.abs(ny - 50) < 1.5) ny = 50;
      nx = Math.max(0, Math.min(100, nx));
      ny = Math.max(0, Math.min(100, ny));
      setLayers(prev => prev.map(l => l.id === id ? { ...l, x: nx, y: ny } as CanvasLayer : l));
    };
    const onUp = () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      if (dragState.current) {
        const layer = layers.find(l => l.id === id);
        if (layer) pushHistory(layers);
      }
      dragState.current = null;
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  };

  // ── Background image select ──────────────────────────────────────────────────

  const handleBgImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => setBannerImage(ev.target?.result as string);
    reader.readAsDataURL(file);
    if (bgFileInputRef.current) bgFileInputRef.current.value = '';
  };

  // ── Overlay / image layer from file ─────────────────────────────────────────

  const handleAddImageFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      const src = ev.target?.result as string;
      addLayer(defaultImageLayer(src));
    };
    reader.readAsDataURL(file);
    if (overlayFileInputRef.current) overlayFileInputRef.current.value = '';
  };

  // ── Open editor ──────────────────────────────────────────────────────────────

  const openEditor = (banner?: PromoBanner) => {
    if (banner) {
      setEditBanner(banner);
      setBannerType(banner.type);
      setBannerTitle(banner.title);
      setBannerDesc(banner.description);
      setBannerVoucherId(String(banner.voucherId || ''));
      setBannerProductId(String(banner.productId || ''));
      setBannerLink(banner.link || '');
      setBannerButtonText(banner.buttonText || '');
      setBannerIsActive(banner.isActive);
      setBannerBgType((banner.bgType as any) || 'gradient');
      setBannerBgColor(banner.bgColor || '#1E293B');
      setBannerBgGradient(banner.bgGradient || GRADIENT_PRESETS[0].value);
      setBannerImage(banner.imageUrl || null);
      const initialLayers = (banner.canvasLayers || []) as CanvasLayer[];
      setLayers(initialLayers);
      setHistory([initialLayers]);
      setHistoryIndex(0);
      setBgFilter(banner.canvasBgFilter || { brightness: 100, contrast: 100, saturate: 100, blur: 0 });
    } else {
      setEditBanner(null);
      setBannerType('custom'); setBannerTitle(''); setBannerDesc('');
      setBannerVoucherId(''); setBannerProductId(''); setBannerLink('');
      setBannerButtonText(''); setBannerIsActive(true);
      setBannerBgType('gradient'); setBannerBgColor('#1E293B');
      setBannerBgGradient(GRADIENT_PRESETS[0].value); setBannerImage(null);
      // Seed with default text layers
      const seedLayers: CanvasLayer[] = [
        defaultTextLayer({ id: generateId(), content: 'Judul Banner Kamu', x: 8, y: 35, fontSize: 40, fontWeight: '900', color: '#FFFFFF', shadow: true, zIndex: 20, width: 55 }),
        defaultTextLayer({ id: generateId(), content: 'Deskripsi promo singkat di sini. Tarik perhatian pelanggan!', x: 8, y: 62, fontSize: 16, fontWeight: 'normal', color: '#CBD5E1', shadow: false, zIndex: 15, width: 55, lineHeight: 1.5 }),
        defaultTextLayer({ id: generateId(), content: 'Lihat Detail', x: 8, y: 82, fontSize: 14, fontWeight: 'bold', color: '#000000', bgColor: '#FFFFFF', bgOpacity: 100, shadow: false, zIndex: 15, width: 18, textAlign: 'center', padding: 12, borderRadius: 10 }),
      ];
      setLayers(seedLayers);
      setHistory([seedLayers]);
      setHistoryIndex(0);
      setBgFilter({ brightness: 100, contrast: 100, saturate: 100, blur: 0 });
    }
    setSelectedId(null);
    setActivePanel('elements');
    setZoom(100);
    setShowGrid(false);
    setIsEditorOpen(true);
  };

  // ── Save banner ──────────────────────────────────────────────────────────────

  const handleSaveBanner = async () => {
    if (!bannerTitle.trim()) { toast.error('Judul banner wajib diisi'); return; }

    let finalImageUrl = bannerImage;
    if (bannerImage?.startsWith('data:image')) {
      toast.loading('Mengunggah gambar latar...', { id: 'bg-up' });
      try {
        const url = await dbUploadFile('banners', `banner-bg-${Date.now()}.jpg`, bannerImage);
        if (url) finalImageUrl = url;
        toast.dismiss('bg-up');
      } catch { toast.dismiss('bg-up'); toast.error('Gagal upload gambar latar'); return; }
    }

    // Upload image layers with data URLs
    const processedLayers = await Promise.all(layers.map(async (layer) => {
      if (layer.type === 'image' && layer.src.startsWith('data:image')) {
        try {
          const url = await dbUploadFile('banners', `layer-img-${Date.now()}-${generateId()}.png`, layer.src);
          return { ...layer, src: url || layer.src };
        } catch { return layer; }
      }
      return layer;
    }));

    const bannerData = {
      type: bannerType, title: bannerTitle.trim(), description: bannerDesc.trim(),
      voucherId: bannerType === 'voucher' ? Number(bannerVoucherId) || null : null,
      productId: bannerType === 'menu' ? Number(bannerProductId) || null : null,
      imageUrl: finalImageUrl, buttonText: bannerButtonText.trim(), link: bannerLink.trim(),
      isActive: bannerIsActive, bgType: bannerBgType,
      bgColor: bannerBgType === 'solid' ? bannerBgColor : null,
      bgGradient: bannerBgType === 'gradient' ? bannerBgGradient : null,
      canvasLayers: processedLayers,
      canvasBgFilter: bgFilter,
    };

    try {
      if (editBanner) {
        if (editBanner.imageUrl && finalImageUrl && editBanner.imageUrl !== finalImageUrl && editBanner.imageUrl.includes('banners')) await dbDeleteFile(editBanner.imageUrl);
        await dbUpdate('banners', editBanner.id, bannerData);
        toast.success('Banner diperbarui');
      } else {
        await dbInsert('banners', { ...bannerData, createdAt: new Date().toISOString() });
        toast.success('Banner baru diterbitkan!');
      }
      setIsEditorOpen(false);
    } catch { toast.error('Gagal menyimpan banner'); }
  };

  const handleDeleteBanner = async () => {
    if (!deleteBannerId) return;
    const b = bannerList?.find(b => b.id === deleteBannerId);
    try {
      if (b?.imageUrl?.includes('banners')) await dbDeleteFile(b.imageUrl);
      await dbDelete('banners', deleteBannerId);
      toast.success('Banner dihapus');
    } catch { toast.error('Gagal menghapus banner'); } finally { setDeleteBannerId(null); }
  };

  const handleToggleActive = async (bId: string | number, cur: boolean) => {
    const b = bannerList?.find(b => b.id === bId);
    if (!b) return;
    await dbUpdate('banners', bId, { ...b, isActive: !cur });
    toast.success(!cur ? 'Banner diaktifkan' : 'Banner dinonaktifkan');
  };

  // ── Canvas background style ──────────────────────────────────────────────────

  const canvasBg = bannerBgType === 'solid' ? bannerBgColor : bannerBgType === 'gradient' ? bannerBgGradient : undefined;
  const bgFilterStyle = `brightness(${bgFilter.brightness}%) contrast(${bgFilter.contrast}%) saturate(${bgFilter.saturate}%) blur(${bgFilter.blur}px)`;

  // ── Layer render on canvas ───────────────────────────────────────────────────

  const renderCanvasLayer = (layer: CanvasLayer) => {
    if (!layer.visible) return null;
    const isSelected = selectedId === layer.id;
    const baseStyle: React.CSSProperties = {
      position: 'absolute',
      left: `${layer.x}%`,
      top: `${layer.y}%`,
      transform: 'translate(-50%, -50%)',
      zIndex: layer.zIndex,
      opacity: layer.opacity / 100,
      cursor: layer.locked ? 'not-allowed' : 'grab',
      userSelect: 'none',
    };

    if (layer.type === 'text') {
      const t = layer as TextLayer;
      return (
        <div key={t.id} style={{ ...baseStyle, width: `${t.width}%` }}
          className={cn(isSelected && 'ring-2 ring-blue-400 ring-offset-1 ring-offset-black/30 rounded-lg')}
          onPointerDown={e => onLayerPointerDown(e, t.id)}>
          <p style={{
            fontSize: `${t.fontSize}px`, fontWeight: t.fontWeight, fontStyle: t.fontStyle,
            textAlign: t.textAlign, color: t.color, letterSpacing: `${t.letterSpacing}px`,
            lineHeight: t.lineHeight, fontFamily: t.fontFamily,
            textDecoration: t.textDecoration, textTransform: t.uppercase ? 'uppercase' : 'none',
            padding: `${t.padding}px`, borderRadius: `${t.borderRadius}px`,
            backgroundColor: t.bgOpacity > 0 ? `${t.bgColor}${Math.round(t.bgOpacity * 2.55).toString(16).padStart(2, '0')}` : 'transparent',
            backdropFilter: t.backdropBlur ? 'blur(8px)' : undefined,
            textShadow: t.shadow ? '0 2px 12px rgba(0,0,0,0.8)' : undefined,
            margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word',
            transform: `rotate(${t.rotate}deg)`,
          }}>
            {t.content}
          </p>
        </div>
      );
    }

    if (layer.type === 'image') {
      const im = layer as ImageLayer;
      const filterStr = `brightness(${im.brightness}%) contrast(${im.contrast}%) saturate(${im.saturate}%) blur(${im.blur}px) ${im.grayscale ? 'grayscale(100%)' : ''} ${im.sepia ? 'sepia(100%)' : ''}`;
      return (
        <div key={im.id} style={{ ...baseStyle, width: `${im.width}%` }}
          className={cn(isSelected && 'ring-2 ring-blue-400 ring-offset-1 ring-offset-black/30 rounded-lg')}
          onPointerDown={e => onLayerPointerDown(e, im.id)}>
          <img src={im.src} alt=""
            style={{
              width: '100%', height: 'auto', display: 'block',
              transform: `rotate(${im.rotate}deg) scaleX(${im.flipX ? -1 : 1}) scaleY(${im.flipY ? -1 : 1})`,
              filter: filterStr, mixBlendMode: im.mixBlendMode as any,
              borderRadius: `${im.borderRadius}px`,
              boxShadow: im.shadow ? '0 8px 32px rgba(0,0,0,0.5)' : undefined,
            }} />
        </div>
      );
    }

    if (layer.type === 'shape') {
      const sh = layer as ShapeLayer;
      return (
        <div key={sh.id} style={{ ...baseStyle, width: `${sh.width}%`, aspectRatio: sh.shape === 'circle' ? '1' : 'auto' }}
          className={cn(isSelected && 'ring-2 ring-blue-400 ring-offset-1 ring-offset-black/30 rounded')}
          onPointerDown={e => onLayerPointerDown(e, sh.id)}>
          <svg viewBox={sh.shape === 'triangle' ? '0 0 100 100' : sh.shape === 'star' ? '0 0 100 100' : undefined}
            style={{ width: '100%', aspectRatio: sh.shape === 'rect' ? `${sh.width}/${sh.height}` : '1', transform: `rotate(${sh.rotate}deg)`, filter: sh.shadow ? 'drop-shadow(0 4px 16px rgba(0,0,0,0.5))' : undefined }}>
            <ShapeSVG layer={sh} />
          </svg>
        </div>
      );
    }

    return null;
  };

  // ── Right panel: properties ──────────────────────────────────────────────────

  const renderPropsPanel = () => {
    if (!selectedLayer) {
      return (
        <div className="flex flex-col items-center justify-center h-40 text-white/30 text-xs text-center px-4">
          <MousePointer2 className="w-8 h-8 mb-3 opacity-30" />
          Klik elemen di kanvas untuk mengedit propertinya
        </div>
      );
    }

    if (selectedLayer.type === 'text') {
      const t = selectedLayer as TextLayer;
      const upd = (p: Partial<TextLayer>) => updateLayer<TextLayer>(t.id, p);
      return (
        <div className="space-y-0">
          <PanelSection title="Konten" icon={Type}>
            <textarea value={t.content} onChange={e => upd({ content: e.target.value })} rows={3}
              className="w-full bg-white/10 border border-white/20 rounded-xl text-white text-sm p-3 resize-none focus:outline-none focus:ring-1 focus:ring-blue-400 font-medium" />
          </PanelSection>

          <PanelSection title="Font & Ukuran" icon={Bold}>
            <Select value={t.fontFamily} onValueChange={v => upd({ fontFamily: v })}>
              <SelectTrigger className="h-9 bg-white/10 border-white/20 text-white text-xs rounded-xl font-bold"><SelectValue /></SelectTrigger>
              <SelectContent className="rounded-xl max-h-48 overflow-y-auto">
                {FONT_FAMILIES.map(f => <SelectItem key={f} value={f} style={{ fontFamily: f }} className="text-sm">{f}</SelectItem>)}
              </SelectContent>
            </Select>
            <SliderRow label="Ukuran" value={t.fontSize} min={8} max={120} onChange={v => upd({ fontSize: v })} unit="px" />
            <SliderRow label="Lebar" value={t.width} min={5} max={100} onChange={v => upd({ width: v })} unit="%" />
            <div className="flex gap-2">
              {(['normal', 'bold', '900'] as const).map(w => (
                <button key={w} onClick={() => upd({ fontWeight: w })}
                  className={cn('flex-1 h-9 rounded-lg text-xs border transition-all', t.fontWeight === w ? 'bg-blue-500 border-blue-400 text-white' : 'bg-white/10 border-white/20 text-white/70 hover:bg-white/20')}
                  style={{ fontWeight: w === '900' ? 900 : w === 'bold' ? 700 : 400 }}>
                  {w === '900' ? 'Black' : w === 'bold' ? 'Bold' : 'Normal'}
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              {(['left', 'center', 'right'] as const).map(a => (
                <button key={a} onClick={() => upd({ textAlign: a })}
                  className={cn('flex-1 h-9 rounded-lg border transition-all flex items-center justify-center', t.textAlign === a ? 'bg-blue-500 border-blue-400 text-white' : 'bg-white/10 border-white/20 text-white/70 hover:bg-white/20')}>
                  {a === 'left' ? <AlignLeft className="w-4 h-4" /> : a === 'center' ? <AlignCenter className="w-4 h-4" /> : <AlignRight className="w-4 h-4" />}
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <button onClick={() => upd({ fontStyle: t.fontStyle === 'italic' ? 'normal' : 'italic' })}
                className={cn('flex-1 h-9 rounded-lg border text-xs font-bold italic transition-all', t.fontStyle === 'italic' ? 'bg-blue-500 border-blue-400 text-white' : 'bg-white/10 border-white/20 text-white/70 hover:bg-white/20')}>I</button>
              <button onClick={() => upd({ textDecoration: t.textDecoration === 'underline' ? 'none' : 'underline' })}
                className={cn('flex-1 h-9 rounded-lg border text-xs font-bold underline transition-all', t.textDecoration === 'underline' ? 'bg-blue-500 border-blue-400 text-white' : 'bg-white/10 border-white/20 text-white/70 hover:bg-white/20')}>U</button>
              <button onClick={() => upd({ uppercase: !t.uppercase })}
                className={cn('flex-1 h-9 rounded-lg border text-[10px] font-black uppercase transition-all', t.uppercase ? 'bg-blue-500 border-blue-400 text-white' : 'bg-white/10 border-white/20 text-white/70 hover:bg-white/20')}>AA</button>
            </div>
            <SliderRow label="Jarak Huruf" value={t.letterSpacing} min={-5} max={20} onChange={v => upd({ letterSpacing: v })} unit="px" />
            <SliderRow label="Tinggi Baris" value={t.lineHeight * 10} min={8} max={30} onChange={v => upd({ lineHeight: v / 10 })} unit="" />
          </PanelSection>

          <PanelSection title="Warna Teks" icon={Palette}>
            <ColorGrid value={t.color} onChange={v => upd({ color: v })} />
          </PanelSection>

          <PanelSection title="Background Teks" icon={Droplets} defaultOpen={false}>
            <ColorGrid value={t.bgColor} onChange={v => upd({ bgColor: v })} />
            <SliderRow label="Opasitas BG" value={t.bgOpacity} min={0} max={100} onChange={v => upd({ bgOpacity: v })} unit="%" />
            <SliderRow label="Sudut" value={t.borderRadius} min={0} max={50} onChange={v => upd({ borderRadius: v })} unit="px" />
            <SliderRow label="Padding" value={t.padding} min={0} max={40} onChange={v => upd({ padding: v })} unit="px" />
            <div className="flex gap-2 pt-1">
              <button onClick={() => upd({ backdropBlur: !t.backdropBlur })}
                className={cn('flex-1 h-9 rounded-lg border text-xs font-bold transition-all', t.backdropBlur ? 'bg-blue-500 border-blue-400 text-white' : 'bg-white/10 border-white/20 text-white/70')}>
                Blur BG
              </button>
            </div>
          </PanelSection>

          <PanelSection title="Transformasi" icon={CornerDownRight} defaultOpen={false}>
            <SliderRow label="Rotasi" value={t.rotate} min={-180} max={180} onChange={v => upd({ rotate: v })} unit="°" />
            <SliderRow label="Opasitas" value={t.opacity} min={0} max={100} onChange={v => upd({ opacity: v })} unit="%" />
            <div className="flex items-center justify-between pt-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-white/50">Bayangan</span>
              <Switch checked={t.shadow} onCheckedChange={v => upd({ shadow: v })} className="scale-75" />
            </div>
          </PanelSection>
        </div>
      );
    }

    if (selectedLayer.type === 'image') {
      const im = selectedLayer as ImageLayer;
      const upd = (p: Partial<ImageLayer>) => updateLayer<ImageLayer>(im.id, p);
      return (
        <div className="space-y-0">
          <PanelSection title="Ukuran & Posisi" icon={Move}>
            <SliderRow label="Lebar" value={im.width} min={5} max={100} onChange={v => upd({ width: v })} unit="%" />
          </PanelSection>

          <PanelSection title="Transformasi" icon={RotateCw}>
            <SliderRow label="Rotasi" value={im.rotate} min={-180} max={180} onChange={v => upd({ rotate: v })} unit="°" />
            <div className="flex gap-2 pt-1">
              <button onClick={() => upd({ flipX: !im.flipX })}
                className={cn('flex-1 h-9 rounded-lg border text-xs font-bold transition-all flex items-center justify-center gap-1.5', im.flipX ? 'bg-blue-500 border-blue-400 text-white' : 'bg-white/10 border-white/20 text-white/70')}>
                <FlipHorizontal className="w-3.5 h-3.5" /> H
              </button>
              <button onClick={() => upd({ flipY: !im.flipY })}
                className={cn('flex-1 h-9 rounded-lg border text-xs font-bold transition-all flex items-center justify-center gap-1.5', im.flipY ? 'bg-blue-500 border-blue-400 text-white' : 'bg-white/10 border-white/20 text-white/70')}>
                <FlipVertical className="w-3.5 h-3.5" /> V
              </button>
            </div>
            <SliderRow label="Opasitas" value={im.opacity} min={0} max={100} onChange={v => upd({ opacity: v })} unit="%" />
            <SliderRow label="Sudut" value={im.borderRadius} min={0} max={100} onChange={v => upd({ borderRadius: v })} unit="px" />
          </PanelSection>

          <PanelSection title="Filter Gambar" icon={Sliders} defaultOpen={false}>
            <SliderRow label="Kecerahan" value={im.brightness} min={0} max={200} onChange={v => upd({ brightness: v })} unit="%" />
            <SliderRow label="Kontras" value={im.contrast} min={0} max={200} onChange={v => upd({ contrast: v })} unit="%" />
            <SliderRow label="Saturasi" value={im.saturate} min={0} max={200} onChange={v => upd({ saturate: v })} unit="%" />
            <SliderRow label="Blur" value={im.blur} min={0} max={20} onChange={v => upd({ blur: v })} unit="px" />
            <div className="flex gap-2 pt-1">
              <button onClick={() => upd({ grayscale: !im.grayscale })}
                className={cn('flex-1 h-9 rounded-lg border text-xs font-bold transition-all', im.grayscale ? 'bg-blue-500 border-blue-400 text-white' : 'bg-white/10 border-white/20 text-white/70')}>
                Grayscale
              </button>
              <button onClick={() => upd({ sepia: !im.sepia })}
                className={cn('flex-1 h-9 rounded-lg border text-xs font-bold transition-all', im.sepia ? 'bg-blue-500 border-blue-400 text-white' : 'bg-white/10 border-white/20 text-white/70')}>
                Sepia
              </button>
            </div>
          </PanelSection>

          <PanelSection title="Blend Mode" icon={Blend} defaultOpen={false}>
            <Select value={im.mixBlendMode} onValueChange={v => upd({ mixBlendMode: v })}>
              <SelectTrigger className="h-9 bg-white/10 border-white/20 text-white text-xs rounded-xl"><SelectValue /></SelectTrigger>
              <SelectContent className="rounded-xl">
                {BLEND_MODES.map(m => <SelectItem key={m} value={m} className="text-xs capitalize">{m}</SelectItem>)}
              </SelectContent>
            </Select>
          </PanelSection>

          <PanelSection title="Efek" icon={Sparkles} defaultOpen={false}>
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-white/50">Bayangan</span>
              <Switch checked={im.shadow} onCheckedChange={v => upd({ shadow: v })} className="scale-75" />
            </div>
          </PanelSection>
        </div>
      );
    }

    if (selectedLayer.type === 'shape') {
      const sh = selectedLayer as ShapeLayer;
      const upd = (p: Partial<ShapeLayer>) => updateLayer<ShapeLayer>(sh.id, p);
      return (
        <div className="space-y-0">
          <PanelSection title="Ukuran" icon={Move}>
            <SliderRow label="Lebar" value={sh.width} min={3} max={100} onChange={v => upd({ width: v })} unit="%" />
            <SliderRow label="Tinggi" value={sh.height} min={3} max={100} onChange={v => upd({ height: v })} unit="%" />
          </PanelSection>

          <PanelSection title="Warna" icon={Palette}>
            <p className="text-[10px] uppercase tracking-wider text-white/40 font-bold mb-2">Isian</p>
            <ColorGrid value={sh.fillColor} onChange={v => upd({ fillColor: v })} />
          </PanelSection>

          <PanelSection title="Border" icon={SquareDashed} defaultOpen={false}>
            <ColorGrid value={sh.strokeColor} onChange={v => upd({ strokeColor: v })} />
            <SliderRow label="Tebal Border" value={sh.strokeWidth} min={0} max={20} onChange={v => upd({ strokeWidth: v })} unit="px" />
            <SliderRow label="Sudut" value={sh.borderRadius} min={0} max={50} onChange={v => upd({ borderRadius: v })} unit="px" />
          </PanelSection>

          <PanelSection title="Transformasi" icon={CornerDownRight} defaultOpen={false}>
            <SliderRow label="Rotasi" value={sh.rotate} min={-180} max={180} onChange={v => upd({ rotate: v })} unit="°" />
            <SliderRow label="Opasitas" value={sh.opacity} min={0} max={100} onChange={v => upd({ opacity: v })} unit="%" />
            <div className="flex items-center justify-between pt-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-white/50">Bayangan</span>
              <Switch checked={sh.shadow} onCheckedChange={v => upd({ shadow: v })} className="scale-75" />
            </div>
          </PanelSection>
        </div>
      );
    }
    return null;
  };

  // ── Layers panel ─────────────────────────────────────────────────────────────

  const renderLayersPanel = () => {
    const sorted = [...layers].sort((a, b) => b.zIndex - a.zIndex);
    return (
      <div className="space-y-1 px-3 py-2">
        {sorted.length === 0 && (
          <p className="text-white/30 text-xs text-center py-8">Belum ada layer. Tambahkan elemen dari tab Elements.</p>
        )}
        {sorted.map(layer => (
          <div key={layer.id}
            onClick={() => { setSelectedId(layer.id); setActivePanel('props'); }}
            className={cn('flex items-center gap-2 px-3 py-2 rounded-xl cursor-pointer transition-all group',
              selectedId === layer.id ? 'bg-blue-500/20 border border-blue-400/40' : 'hover:bg-white/5 border border-transparent')}>
            <div className="w-5 h-5 shrink-0 flex items-center justify-center text-white/40">
              {layer.type === 'text' ? <Type className="w-3.5 h-3.5" /> : layer.type === 'image' ? <ImageIcon className="w-3.5 h-3.5" /> : <Square className="w-3.5 h-3.5" />}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-white/80 truncate">
                {layer.type === 'text' ? (layer as TextLayer).content.slice(0, 20) : layer.type === 'image' ? 'Gambar' : `Shape: ${(layer as ShapeLayer).shape}`}
              </p>
              <p className="text-[10px] text-white/30 capitalize">{layer.type}</p>
            </div>
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <button onClick={e => { e.stopPropagation(); updateLayer(layer.id, { visible: !layer.visible }); }}
                className="w-6 h-6 flex items-center justify-center rounded-lg hover:bg-white/20 text-white/50">
                {layer.visible ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
              </button>
              <button onClick={e => { e.stopPropagation(); updateLayer(layer.id, { locked: !layer.locked }); }}
                className="w-6 h-6 flex items-center justify-center rounded-lg hover:bg-white/20 text-white/50">
                {layer.locked ? <Lock className="w-3 h-3" /> : <Unlock className="w-3 h-3" />}
              </button>
              <button onClick={e => { e.stopPropagation(); duplicateLayer(layer.id); }}
                className="w-6 h-6 flex items-center justify-center rounded-lg hover:bg-white/20 text-white/50">
                <Copy className="w-3 h-3" />
              </button>
              <button onClick={e => { e.stopPropagation(); removeLayer(layer.id); }}
                className="w-6 h-6 flex items-center justify-center rounded-lg hover:bg-red-500/30 text-white/50 hover:text-red-400">
                <Trash className="w-3 h-3" />
              </button>
            </div>
          </div>
        ))}
      </div>
    );
  };

  // ── Elements panel ───────────────────────────────────────────────────────────

  const renderElementsPanel = () => (
    <div className="space-y-4 px-4 py-4">
      <div>
        <p className="text-[10px] font-black uppercase tracking-wider text-white/40 mb-2">Tambah Teks</p>
        <div className="grid grid-cols-1 gap-2">
          {[
            { label: 'Heading', fontSize: 48, fontWeight: '900' as const, content: 'HEADING BESAR' },
            { label: 'Subheading', fontSize: 28, fontWeight: 'bold' as const, content: 'Subheading Keren' },
            { label: 'Body Text', fontSize: 16, fontWeight: 'normal' as const, content: 'Teks deskripsi di sini...' },
            { label: 'Badge / Label', fontSize: 13, fontWeight: 'bold' as const, content: 'PROMO EKSKLUSIF', uppercase: true, bgOpacity: 80, bgColor: '#3B82F6', borderRadius: 20, padding: 10 },
            { label: 'Tombol CTA', fontSize: 15, fontWeight: 'bold' as const, content: 'Lihat Detail', bgOpacity: 100, bgColor: '#FFFFFF', color: '#000000', borderRadius: 10, padding: 14, textAlign: 'center' as const, width: 20 },
          ].map(preset => (
            <button key={preset.label} onClick={() => addLayer(defaultTextLayer(preset))}
              className="w-full px-3 py-2.5 rounded-xl bg-white/5 hover:bg-white/15 border border-white/10 text-left transition-all group flex items-center justify-between">
              <span className="text-xs font-bold text-white/80 group-hover:text-white">{preset.label}</span>
              <Plus className="w-3.5 h-3.5 text-white/30 group-hover:text-white/70" />
            </button>
          ))}
        </div>
      </div>

      <div>
        <p className="text-[10px] font-black uppercase tracking-wider text-white/40 mb-2">Tambah Gambar</p>
        <input ref={overlayFileInputRef} type="file" accept="image/*" className="hidden" onChange={handleAddImageFile} />
        <button onClick={() => overlayFileInputRef.current?.click()}
          className="w-full h-12 rounded-xl bg-white/5 hover:bg-white/15 border border-dashed border-white/20 hover:border-white/40 transition-all flex items-center justify-center gap-2 text-xs font-bold text-white/60 hover:text-white">
          <ImageIcon className="w-4 h-4" /> Upload PNG / JPG
        </button>
      </div>

      <div>
        <p className="text-[10px] font-black uppercase tracking-wider text-white/40 mb-2">Tambah Shape</p>
        <div className="grid grid-cols-3 gap-2">
          {SHAPE_PRESETS.map(s => (
            <button key={s.type} onClick={() => addLayer(defaultShapeLayer(s.type))}
              className="h-16 rounded-xl bg-white/5 hover:bg-white/15 border border-white/10 hover:border-white/30 transition-all flex flex-col items-center justify-center gap-1.5 group">
              <s.icon className="w-5 h-5 text-white/50 group-hover:text-white" />
              <span className="text-[9px] font-bold text-white/30 group-hover:text-white/70">{s.label}</span>
            </button>
          ))}
          <button onClick={() => addLayer(defaultShapeLayer('star'))}
            className="h-16 rounded-xl bg-white/5 hover:bg-white/15 border border-white/10 hover:border-white/30 transition-all flex flex-col items-center justify-center gap-1.5 group">
            <Star className="w-5 h-5 text-white/50 group-hover:text-white" />
            <span className="text-[9px] font-bold text-white/30 group-hover:text-white/70">Bintang</span>
          </button>
        </div>
      </div>
    </div>
  );

  // ── Background panel ─────────────────────────────────────────────────────────

  const renderBgPanel = () => (
    <div className="space-y-4 px-4 py-4">
      <div>
        <p className="text-[10px] font-black uppercase tracking-wider text-white/40 mb-2">Tipe Background</p>
        <div className="grid grid-cols-3 gap-2">
          {(['solid', 'gradient', 'image'] as const).map(t => (
            <button key={t} onClick={() => setBannerBgType(t)}
              className={cn('h-9 rounded-xl border text-xs font-bold capitalize transition-all', bannerBgType === t ? 'bg-blue-500 border-blue-400 text-white' : 'bg-white/10 border-white/20 text-white/70 hover:bg-white/20')}>
              {t === 'solid' ? 'Solid' : t === 'gradient' ? 'Gradasi' : 'Gambar'}
            </button>
          ))}
        </div>
      </div>

      {bannerBgType === 'solid' && (
        <div>
          <p className="text-[10px] font-black uppercase tracking-wider text-white/40 mb-2">Warna</p>
          <ColorGrid value={bannerBgColor} onChange={setBannerBgColor} />
        </div>
      )}

      {bannerBgType === 'gradient' && (
        <div className="space-y-3">
          <p className="text-[10px] font-black uppercase tracking-wider text-white/40">Preset Gradasi</p>
          <div className="grid grid-cols-2 gap-2">
            {GRADIENT_PRESETS.map(g => (
              <button key={g.name} onClick={() => setBannerBgGradient(g.value)}
                className={cn('h-10 rounded-xl border text-xs font-black transition-all', bannerBgGradient === g.value ? 'border-white scale-[1.02]' : 'border-transparent hover:border-white/30')}
                style={{ background: g.value }}>
                <span className="text-white drop-shadow-md">{g.name}</span>
              </button>
            ))}
          </div>
          <p className="text-[10px] font-black uppercase tracking-wider text-white/40 mt-2">CSS Custom</p>
          <Input value={bannerBgGradient} onChange={e => setBannerBgGradient(e.target.value)} className="h-9 bg-white/10 border-white/20 text-white text-xs font-mono rounded-xl" />
        </div>
      )}

      {bannerBgType === 'image' && (
        <div className="space-y-3">
          <input ref={bgFileInputRef} type="file" accept="image/*" className="hidden" onChange={handleBgImageSelect} />
          <div className="w-full aspect-video rounded-xl border border-white/20 overflow-hidden bg-black/30 flex items-center justify-center cursor-pointer group hover:border-white/40 transition-all" onClick={() => bgFileInputRef.current?.click()}>
            {bannerImage ? (
              <img src={bannerImage} alt="BG" className="w-full h-full object-cover group-hover:opacity-80 transition-opacity" />
            ) : (
              <div className="flex flex-col items-center gap-2 text-white/30 group-hover:text-white/60 transition-colors">
                <ImageIcon className="w-8 h-8" />
                <span className="text-xs font-bold">Pilih gambar latar</span>
              </div>
            )}
          </div>
          {bannerImage && (
            <button onClick={() => setBannerImage(null)} className="w-full h-9 rounded-xl bg-red-500/20 border border-red-500/30 text-red-400 text-xs font-bold hover:bg-red-500/30 transition-all">
              Hapus Gambar Latar
            </button>
          )}

          <p className="text-[10px] font-black uppercase tracking-wider text-white/40 mt-3">Filter Gambar Latar</p>
          <SliderRow label="Kecerahan" value={bgFilter.brightness} min={0} max={200} onChange={v => setBgFilter(f => ({ ...f, brightness: v }))} unit="%" />
          <SliderRow label="Kontras" value={bgFilter.contrast} min={0} max={200} onChange={v => setBgFilter(f => ({ ...f, contrast: v }))} unit="%" />
          <SliderRow label="Saturasi" value={bgFilter.saturate} min={0} max={200} onChange={v => setBgFilter(f => ({ ...f, saturate: v }))} unit="%" />
          <SliderRow label="Blur" value={bgFilter.blur} min={0} max={20} onChange={v => setBgFilter(f => ({ ...f, blur: v }))} unit="px" />
        </div>
      )}
    </div>
  );

  // ── Banner info panel ────────────────────────────────────────────────────────

  const renderInfoPanel = () => (
    <div className="space-y-4 px-4 py-4">
      <div className="space-y-2">
        <Label className="text-[10px] font-black uppercase tracking-wider text-white/40">Tipe Banner</Label>
        <Select value={bannerType} onValueChange={(v: any) => setBannerType(v)}>
          <SelectTrigger className="h-10 bg-white/10 border-white/20 text-white text-xs rounded-xl font-bold"><SelectValue /></SelectTrigger>
          <SelectContent className="rounded-xl">
            <SelectItem value="voucher">Promo Voucher</SelectItem>
            <SelectItem value="menu">Menu / Produk</SelectItem>
            <SelectItem value="custom">Kustom Bebas</SelectItem>
          </SelectContent>
        </Select>
      </div>
      {bannerType === 'voucher' && (
        <div className="space-y-2">
          <Label className="text-[10px] font-black uppercase tracking-wider text-white/40">Voucher</Label>
          <Select value={bannerVoucherId} onValueChange={setBannerVoucherId}>
            <SelectTrigger className="h-10 bg-white/10 border-white/20 text-white text-xs rounded-xl font-bold"><SelectValue placeholder="Pilih voucher..." /></SelectTrigger>
            <SelectContent className="rounded-xl">
              {vouchers.map(v => <SelectItem key={v.id} value={v.id!.toString()}>{v.code}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      )}
      {bannerType === 'menu' && (
        <div className="space-y-2">
          <Label className="text-[10px] font-black uppercase tracking-wider text-white/40">Produk</Label>
          <Select value={bannerProductId} onValueChange={setBannerProductId}>
            <SelectTrigger className="h-10 bg-white/10 border-white/20 text-white text-xs rounded-xl font-bold"><SelectValue placeholder="Pilih produk..." /></SelectTrigger>
            <SelectContent className="rounded-xl">
              {products.map(p => <SelectItem key={p.id} value={p.id!.toString()}>{p.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      )}
      <div className="space-y-2">
        <Label className="text-[10px] font-black uppercase tracking-wider text-white/40">Judul Banner</Label>
        <Input value={bannerTitle} onChange={e => setBannerTitle(e.target.value)} maxLength={60} className="h-10 bg-white/10 border-white/20 text-white text-sm rounded-xl font-semibold" />
      </div>
      <div className="space-y-2">
        <Label className="text-[10px] font-black uppercase tracking-wider text-white/40">Deskripsi</Label>
        <textarea value={bannerDesc} onChange={e => setBannerDesc(e.target.value)} rows={3} maxLength={150}
          className="w-full p-3 bg-white/10 border border-white/20 rounded-xl text-white text-xs focus:outline-none focus:ring-1 focus:ring-blue-400 resize-none font-medium" />
      </div>
      <div className="space-y-2">
        <Label className="text-[10px] font-black uppercase tracking-wider text-white/40">Teks Tombol</Label>
        <Input value={bannerButtonText} onChange={e => setBannerButtonText(e.target.value)} placeholder="Lihat Detail" className="h-10 bg-white/10 border-white/20 text-white text-sm rounded-xl" />
      </div>
      {bannerType === 'custom' && (
        <div className="space-y-2">
          <Label className="text-[10px] font-black uppercase tracking-wider text-white/40">URL Tujuan</Label>
          <Input value={bannerLink} onChange={e => setBannerLink(e.target.value)} placeholder="https://..." className="h-10 bg-white/10 border-white/20 text-white text-sm rounded-xl" />
        </div>
      )}
      <div className="flex items-center justify-between py-2">
        <span className="text-xs font-bold text-white/60">Status Aktif</span>
        <Switch checked={bannerIsActive} onCheckedChange={setBannerIsActive} className="data-[state=checked]:bg-green-500" />
      </div>
    </div>
  );

  if (bannerList === undefined) {
    return (
      <div className="flex items-center justify-center p-12">
        <Clock className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  // ── FULL-SCREEN EDITOR ───────────────────────────────────────────────────────

  if (isEditorOpen) {
    return (
      <div className="fixed inset-0 z-[200] bg-[#0D0D10] flex flex-col overflow-hidden" style={{ fontFamily: 'system-ui, sans-serif' }}>

        {/* ─ Topbar ─ */}
        <div className="h-14 flex items-center justify-between px-4 border-b border-white/10 bg-[#141418] shrink-0 z-50">
          <div className="flex items-center gap-3">
            <button onClick={() => setIsEditorOpen(false)} className="h-9 px-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white/70 hover:text-white text-xs font-bold flex items-center gap-1.5 transition-all">
              <ChevronLeft className="w-4 h-4" /> Kembali
            </button>
            <div className="h-5 w-[1px] bg-white/10" />
            <div className="flex items-center gap-1">
              <button onClick={undo} disabled={historyIndex === 0} className="w-9 h-9 rounded-xl flex items-center justify-center text-white/50 hover:text-white hover:bg-white/10 disabled:opacity-25 transition-all">
                <RotateCcw className="w-4 h-4" />
              </button>
              <button onClick={redo} disabled={historyIndex >= history.length - 1} className="w-9 h-9 rounded-xl flex items-center justify-center text-white/50 hover:text-white hover:bg-white/10 disabled:opacity-25 transition-all">
                <RotateCw className="w-4 h-4" />
              </button>
            </div>
            <div className="h-5 w-[1px] bg-white/10" />
            <button onClick={() => setShowGrid(g => !g)}
              className={cn('w-9 h-9 rounded-xl flex items-center justify-center transition-all', showGrid ? 'bg-blue-500/20 text-blue-400 border border-blue-400/30' : 'text-white/50 hover:text-white hover:bg-white/10')}>
              <Grid className="w-4 h-4" />
            </button>
          </div>

          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-blue-400" />
            <span className="text-sm font-black text-white/80 hidden sm:block">Canvas Editor</span>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 bg-white/5 border border-white/10 rounded-xl px-3 h-9">
              <button onClick={() => setZoom(z => Math.max(30, z - 10))} className="text-white/50 hover:text-white"><ZoomOut className="w-3.5 h-3.5" /></button>
              <span className="text-xs font-mono font-black text-white/70 w-10 text-center">{zoom}%</span>
              <button onClick={() => setZoom(z => Math.min(200, z + 10))} className="text-white/50 hover:text-white"><ZoomIn className="w-3.5 h-3.5" /></button>
            </div>
            <button onClick={handleSaveBanner}
              className="h-9 px-5 rounded-xl bg-blue-500 hover:bg-blue-400 text-white text-xs font-black flex items-center gap-1.5 transition-all shadow-lg shadow-blue-500/20">
              <Check className="w-4 h-4" /> {editBanner ? 'Simpan' : 'Terbitkan'}
            </button>
          </div>
        </div>

        {/* ─ Body ─ */}
        <div className="flex-1 flex overflow-hidden">

          {/* ─ Left sidebar ─ */}
          <div className="w-[260px] shrink-0 bg-[#141418] border-r border-white/10 flex flex-col overflow-hidden">
            {/* Sidebar tab bar */}
            <div className="flex border-b border-white/10 shrink-0">
              {([
                { key: 'elements', icon: Plus, label: 'Elemen' },
                { key: 'layers', icon: Layers, label: 'Layer' },
                { key: 'bg', icon: Palette, label: 'BG' },
                { key: 'props', icon: SlidersHorizontal, label: 'Info' },
              ] as const).map(tab => (
                <button key={tab.key} onClick={() => setActivePanel(tab.key as any)}
                  className={cn('flex-1 flex flex-col items-center gap-1 py-2.5 text-[9px] font-black uppercase tracking-wider transition-all', activePanel === tab.key ? 'text-blue-400 border-b-2 border-blue-400 bg-blue-500/5' : 'text-white/30 hover:text-white/60')}>
                  <tab.icon className="w-4 h-4" />
                  {tab.label}
                </button>
              ))}
            </div>
            <div className="flex-1 overflow-y-auto custom-scrollbar">
              {activePanel === 'elements' && renderElementsPanel()}
              {activePanel === 'layers' && renderLayersPanel()}
              {activePanel === 'bg' && renderBgPanel()}
              {activePanel === 'props' && renderInfoPanel()}
            </div>
          </div>

          {/* ─ Canvas Area ─ */}
          <div className="flex-1 relative overflow-auto bg-[#0D0D10] flex items-center justify-center p-8"
            style={{ backgroundImage: showGrid ? 'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.07) 1px, transparent 0)' : undefined, backgroundSize: showGrid ? '24px 24px' : undefined }}
            onPointerDown={() => setSelectedId(null)}>
            {/* Snap guides */}
            {dragState.current && (
              <>
                <div className="absolute top-0 bottom-0 left-1/2 w-[1px] bg-blue-400/30 pointer-events-none" style={{ zIndex: 9999 }} />
                <div className="absolute left-0 right-0 top-1/2 h-[1px] bg-blue-400/30 pointer-events-none" style={{ zIndex: 9999 }} />
              </>
            )}

            <div
              ref={canvasRef}
              className="relative shadow-2xl overflow-hidden select-none"
              style={{
                width: `${zoom}%`, maxWidth: '1400px', aspectRatio: '21/9',
                background: canvasBg || '#0F172A',
                containerType: 'inline-size',
                borderRadius: '16px',
                outline: selectedId ? undefined : '2px solid rgba(255,255,255,0.05)',
              }}>
              {/* Background image */}
              {bannerBgType === 'image' && bannerImage && (
                <div className="absolute inset-0 z-0 pointer-events-none">
                  <img src={bannerImage} alt="bg" className="w-full h-full object-cover"
                    style={{ filter: bgFilterStyle }} />
                  <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-black/20 to-transparent" />
                </div>
              )}
              {bannerBgType === 'image' && !bannerImage && (
                <div className="absolute inset-0 bg-gradient-to-br from-slate-900 to-slate-800 pointer-events-none" />
              )}

              {/* Canvas Layers */}
              {[...layers].sort((a, b) => a.zIndex - b.zIndex).map(renderCanvasLayer)}
            </div>
          </div>

          {/* ─ Right sidebar: properties ─ */}
          {selectedId && (
            <div className="w-[260px] shrink-0 bg-[#141418] border-l border-white/10 flex flex-col overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 shrink-0">
                <span className="text-xs font-black uppercase tracking-wider text-white/60 flex items-center gap-2">
                  <SlidersHorizontal className="w-3.5 h-3.5" /> Properti
                </span>
                <div className="flex items-center gap-1">
                  {selectedLayer && (
                    <>
                      <button onClick={() => duplicateLayer(selectedId)} className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-white/10 text-white/40 hover:text-white transition-all">
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => { removeLayer(selectedId); }} className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-red-500/20 text-white/40 hover:text-red-400 transition-all">
                        <Trash className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => setSelectedId(null)} className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-white/10 text-white/40 hover:text-white transition-all">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* Z-index quick control */}
              {selectedLayer && (
                <div className="flex items-center gap-2 px-4 py-2 border-b border-white/10">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-white/40 flex-1">Z-Index</span>
                  <button onClick={() => updateLayer(selectedId, { zIndex: (selectedLayer.zIndex || 0) - 1 })}
                    className="w-7 h-7 bg-white/5 hover:bg-white/15 rounded-lg text-white/60 hover:text-white flex items-center justify-center transition-all">
                    <ChevronDown className="w-4 h-4" />
                  </button>
                  <span className="text-xs font-mono font-black text-white/70 w-8 text-center">{selectedLayer.zIndex}</span>
                  <button onClick={() => updateLayer(selectedId, { zIndex: (selectedLayer.zIndex || 0) + 1 })}
                    className="w-7 h-7 bg-white/5 hover:bg-white/15 rounded-lg text-white/60 hover:text-white flex items-center justify-center transition-all">
                    <ChevronUp className="w-4 h-4" />
                  </button>
                </div>
              )}

              <div className="flex-1 overflow-y-auto custom-scrollbar">
                {renderPropsPanel()}
              </div>
            </div>
          )}
        </div>

        {/* ─ Bottom statusbar ─ */}
        <div className="h-9 border-t border-white/10 bg-[#141418] flex items-center justify-between px-4 shrink-0">
          <div className="flex items-center gap-4 text-[10px] font-bold text-white/30">
            <span>{layers.length} layer</span>
            <span>|</span>
            <span>Rasio 21:9</span>
            <span>|</span>
            <span className="flex items-center gap-1"><div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" /> Auto-save aktif</span>
          </div>
          <div className="text-[10px] font-bold text-white/20">
            {selectedLayer ? `${selectedLayer.type.toUpperCase()} • x:${selectedLayer.x}% y:${selectedLayer.y}%` : 'Klik elemen untuk memilih'}
          </div>
        </div>
      </div>
    );
  }

  // ── MAIN LIST VIEW ───────────────────────────────────────────────────────────

  return (
    <div className="pt-8 pb-24 space-y-6 w-full mx-auto animate-in fade-in duration-300">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h3 className="text-2xl font-black text-foreground tracking-tight">Pengaturan Banner</h3>
          <p className="text-sm text-muted-foreground mt-1">Buat dan kelola banner promo di Beranda Pelanggan.</p>
        </div>
        <Button onClick={() => openEditor()} className="h-11 px-5 rounded-xl font-bold bg-primary hover:bg-primary/90 text-primary-foreground shadow-md transition-all shrink-0">
          <Plus className="w-5 h-5 mr-2" strokeWidth={3} /> Buat Banner
        </Button>
      </div>

      {bannerList.length === 0 ? (
        <div className="bg-card border border-dashed border-border rounded-[2rem] p-12 flex flex-col items-center justify-center text-center mt-6">
          <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mb-4">
            <Sparkles className="w-10 h-10 text-primary/50" strokeWidth={1.5} />
          </div>
          <h3 className="text-lg font-bold text-foreground mb-1">Belum Ada Banner</h3>
          <p className="text-sm text-muted-foreground max-w-sm">Buat banner pertamamu dengan editor seperti Canva!</p>
          <Button variant="outline" className="mt-6 rounded-xl font-bold" onClick={() => openEditor()}>
            Buka Editor
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 mt-6">
          {bannerList.map(b => (
            <Card key={b.id} className="border border-border/60 rounded-[2rem] overflow-hidden flex flex-col bg-card hover:shadow-xl transition-all duration-300">
              <div className="p-6 flex flex-col lg:flex-row gap-6 items-center">
                {/* Preview */}
                <div className="w-full lg:w-[420px] aspect-[21/9] rounded-2xl relative overflow-hidden shadow-md shrink-0 select-none bg-black border border-border/50 text-white"
                  style={{ background: b.bgType === 'solid' ? b.bgColor : b.bgType === 'gradient' ? b.bgGradient : undefined, containerType: 'inline-size' }}>
                  {b.imageUrl && (
                    <div className="absolute inset-0 z-0">
                      <img src={b.imageUrl} alt="Banner" className="w-full h-full object-cover opacity-60 mix-blend-overlay" />
                      <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/40 to-transparent" />
                    </div>
                  )}

                  {(b.canvasLayers || []).filter(l => l.visible !== false).sort((a, b) => a.zIndex - b.zIndex).map(layer => {
                    if (layer.type === 'text') {
                      const t = layer as TextLayer;
                      return (
                        <div key={t.id} style={{ position: 'absolute', left: `${t.x}%`, top: `${t.y}%`, transform: 'translate(-50%, -50%)', zIndex: t.zIndex, opacity: t.opacity / 100, width: `${t.width}%` }}>
                          <p style={{
                            fontSize: `${t.fontSize * 0.4}px`, fontWeight: t.fontWeight, fontStyle: t.fontStyle,
                            textAlign: t.textAlign, color: t.color, letterSpacing: `${t.letterSpacing * 0.4}px`,
                            lineHeight: t.lineHeight, fontFamily: t.fontFamily,
                            textDecoration: t.textDecoration, textTransform: t.uppercase ? 'uppercase' : 'none',
                            padding: `${t.padding * 0.4}px`, borderRadius: `${t.borderRadius * 0.4}px`,
                            backgroundColor: t.bgOpacity > 0 ? `${t.bgColor}${Math.round(t.bgOpacity * 2.55).toString(16).padStart(2, '0')}` : 'transparent',
                            textShadow: t.shadow ? '0 1px 6px rgba(0,0,0,0.8)' : undefined, margin: 0,
                            transform: `rotate(${t.rotate}deg)`, whiteSpace: 'pre-wrap', wordBreak: 'break-word',
                          }}>{t.content}</p>
                        </div>
                      );
                    }
                    if (layer.type === 'image') {
                      const im = layer as ImageLayer;
                      return (
                        <div key={im.id} style={{ position: 'absolute', left: `${im.x}%`, top: `${im.y}%`, transform: 'translate(-50%, -50%)', zIndex: im.zIndex, opacity: im.opacity / 100, width: `${im.width}%` }}>
                          <img src={im.src} style={{ width: '100%', height: 'auto', transform: `rotate(${im.rotate}deg) scaleX(${im.flipX ? -1 : 1}) scaleY(${im.flipY ? -1 : 1})`, borderRadius: `${im.borderRadius}px`, filter: `brightness(${im.brightness}%) contrast(${im.contrast}%) saturate(${im.saturate}%) ${im.grayscale ? 'grayscale(100%)' : ''} ${im.sepia ? 'sepia(100%)' : ''}`, mixBlendMode: im.mixBlendMode as any }} alt="" />
                        </div>
                      );
                    }
                    if (layer.type === 'shape') {
                      const sh = layer as ShapeLayer;
                      return (
                        <div key={sh.id} style={{ position: 'absolute', left: `${sh.x}%`, top: `${sh.y}%`, transform: 'translate(-50%, -50%)', zIndex: sh.zIndex, opacity: sh.opacity / 100, width: `${sh.width}%` }}>
                          <svg viewBox={sh.shape === 'triangle' || sh.shape === 'star' ? '0 0 100 100' : undefined} style={{ width: '100%', aspectRatio: '1', transform: `rotate(${sh.rotate}deg)` }}>
                            <ShapeSVG layer={sh} />
                          </svg>
                        </div>
                      );
                    }
                    return null;
                  })}
                </div>

                <div className="flex-1 w-full flex flex-col justify-between py-2">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className={cn("text-[10px] font-black uppercase px-2.5 py-0.5 rounded-md border-none tracking-widest", b.isActive ? "bg-green-500/10 text-green-600" : "bg-muted text-muted-foreground")}>
                        {b.isActive ? 'Aktif' : 'Nonaktif'}
                      </Badge>
                      <Badge variant="secondary" className="text-[10px] font-bold px-2 py-0.5 rounded-md">
                        {b.type === 'voucher' ? 'Voucher' : b.type === 'menu' ? 'Produk' : 'Kustom'}
                      </Badge>
                      {b.canvasLayers && <Badge variant="outline" className="text-[10px] font-bold px-2 py-0.5 rounded-md">{b.canvasLayers.length} layer</Badge>}
                    </div>
                    <h4 className="font-extrabold text-xl text-foreground leading-snug">{b.title || '(tanpa judul)'}</h4>
                    <p className="text-sm text-muted-foreground leading-relaxed line-clamp-2">{b.description}</p>
                  </div>

                  <div className="flex items-center justify-between mt-6 pt-4 border-t border-border w-full">
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Tampil</span>
                      <Switch checked={b.isActive} onCheckedChange={() => handleToggleActive(b.id, b.isActive)} className="data-[state=checked]:bg-green-500 scale-90" />
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" className="h-9 px-4 rounded-xl font-bold text-xs flex items-center gap-1.5" onClick={() => openEditor(b)}>
                        <Edit2 className="w-3.5 h-3.5" /> Edit di Canvas
                      </Button>
                      <Button variant="outline" size="icon" className="h-9 w-9 rounded-xl hover:bg-destructive/10 hover:text-destructive" onClick={() => setDeleteBannerId(b.id)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteBannerId} onOpenChange={() => setDeleteBannerId(null)}>
        <AlertDialogContent className="max-w-[400px] rounded-3xl p-6">
          <AlertDialogHeader>
            <div className="w-14 h-14 rounded-full bg-destructive/10 flex items-center justify-center mb-3 mx-auto">
              <Trash2 className="w-7 h-7 text-destructive" />
            </div>
            <AlertDialogTitle className="text-center text-xl font-extrabold tracking-tight">Hapus Banner?</AlertDialogTitle>
            <AlertDialogDescription className="text-center text-muted-foreground mt-2">
              Banner ini akan dihapus permanen beserta semua layer-nya.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-8 sm:justify-center flex-row gap-3">
            <AlertDialogCancel className="flex-1 mt-0 rounded-xl h-12 font-bold border-border">Batal</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteBanner} className="flex-1 rounded-xl h-12 font-bold bg-destructive hover:bg-destructive/90 text-white shadow-lg">Ya, Hapus</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
