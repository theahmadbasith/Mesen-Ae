import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  Plus, Edit2, Trash2, Image as ImageIcon, Sparkles, Clock, Minus,
  RotateCcw, RotateCw, FlipHorizontal, MousePointer2, X, Bold, Italic,
  AlignLeft, AlignCenter, AlignRight, Type, Palette, Layers, Layout,
  ChevronDown, ChevronUp, Eye, EyeOff, Lock, Unlock, Copy, Trash,
  Move, ZoomIn, ZoomOut, Grid, Sliders, RefreshCw, Download, Check,
  PanelLeft, CornerDownRight, Maximize2, FlipVertical, SquareDashed,
  Pipette, Sun, Contrast, Droplets, Blend, SlidersHorizontal, ArrowUpDown,
  GripVertical, Star, Square, Circle, Triangle, Hexagon, ArrowRight,
  ChevronLeft, ChevronRight, MoreVertical, Crosshair, Wand2, Pen,
  Moon
} from 'lucide-react';
import { toast } from 'sonner';
import { useDbQuery, dbInsert, dbUpdate, dbDelete, dbUploadFile } from '@/hooks/db-hooks';

// ============================================================================
// 2. TYPES & CONSTANTS
// ============================================================================

const FONT_FAMILIES = [
  'Poppins', 'Inter', 'Playfair Display', 'Montserrat', 'Raleway',
  'DM Sans', 'Space Grotesk', 'Sora', 'Nunito', 'Quicksand',
  'Oswald', 'Lato', 'Bebas Neue', 'Lobster', 'Pacifico'
];

const BLEND_MODES = [
  'normal', 'multiply', 'screen', 'overlay', 'darken',
  'lighten', 'color-dodge', 'color-burn', 'hard-light', 'soft-light', 'difference'
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

// Helpers
const cn = (...classes) => classes.filter(Boolean).join(' ');
const generateId = () => Math.random().toString(36).slice(2, 9);

const defaultTextLayer = (extra = {}) => ({
  id: generateId(), type: 'text', content: 'Teks Baru',
  x: 50, y: 50, fontSize: 32, fontWeight: 'bold', fontStyle: 'normal',
  textAlign: 'left', color: '#FFFFFF', bgColor: '#000000', bgOpacity: 0,
  shadow: true, letterSpacing: 0, lineHeight: 1.3, opacity: 100, rotate: 0,
  width: 50, locked: false, visible: true, zIndex: 10, fontFamily: 'Poppins',
  textDecoration: 'none', uppercase: false, padding: 8, borderRadius: 8,
  backdropBlur: false, role: 'none', borderWidth: 0, borderColor: '#FFFFFF', borderStyle: 'solid', ...extra
});

const defaultImageLayer = (src, extra = {}) => ({
  id: generateId(), type: 'image', src,
  x: 50, y: 50, width: 30, rotate: 0, flipX: false, flipY: false,
  opacity: 100, brightness: 100, contrast: 100, saturate: 100, blur: 0,
  mixBlendMode: 'normal', locked: false, visible: true, zIndex: 20,
  borderRadius: 0, shadow: false, grayscale: false, sepia: false, ...extra
});

// ============================================================================
// 3. INLINE UI COMPONENTS (Tailwind)
// ============================================================================

const Button = ({ children, className, variant = 'primary', size = 'md', ...props }) => {
  const base = "inline-flex items-center justify-center rounded-xl font-bold transition-all focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed";
  const variants = {
    primary: "bg-blue-600 hover:bg-blue-700 text-white shadow-md",
    secondary: "bg-zinc-200 dark:bg-zinc-800 hover:bg-zinc-300 dark:hover:bg-zinc-700 text-zinc-900 dark:text-zinc-100",
    outline: "border-2 border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 bg-transparent text-zinc-900 dark:text-zinc-100",
    ghost: "hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100",
    danger: "bg-red-500 hover:bg-red-600 text-white shadow-md",
  };
  const sizes = {
    sm: "h-8 px-3 text-xs",
    md: "h-10 px-4 text-sm",
    lg: "h-12 px-6 text-base",
    icon: "h-10 w-10 p-0",
  };
  return <button className={cn(base, variants[variant], sizes[size], className)} {...props}>{children}</button>;
};

const Input = ({ className, ...props }) => (
  <input className={cn("flex h-10 w-full rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2 text-sm placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-50 text-zinc-900 dark:text-zinc-100 transition-all", className)} {...props} />
);

const Label = ({ className, children, ...props }) => (
  <label className={cn("text-xs font-black uppercase tracking-wider text-zinc-500 dark:text-zinc-400 block mb-1.5", className)} {...props}>{children}</label>
);

const Switch = ({ checked, onCheckedChange }) => (
  <button type="button" role="switch" aria-checked={checked} onClick={() => onCheckedChange(!checked)}
    className={cn("relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2", checked ? "bg-blue-600" : "bg-zinc-300 dark:bg-zinc-700")}>
    <span className={cn("pointer-events-none block h-5 w-5 rounded-full bg-white shadow-lg ring-0 transition-transform", checked ? "translate-x-5" : "translate-x-0")} />
  </button>
);

const Slider = ({ value, min, max, step = 1, onValueChange, className }) => (
  <input type="range" min={min} max={max} step={step} value={value[0]} onChange={(e) => onValueChange([parseFloat(e.target.value)])}
    className={cn("w-full h-2 bg-zinc-200 dark:bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-blue-600", className)} />
);

const Badge = ({ children, variant = 'default', className }) => {
  const variants = {
    default: "bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100",
    primary: "bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300",
    success: "bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300",
  };
  return <span className={cn("inline-flex items-center rounded-md px-2 py-1 text-xs font-bold ring-1 ring-inset ring-zinc-500/20", variants[variant], className)}>{children}</span>;
}

const Card = ({ children, className }) => (
  <div className={cn("rounded-3xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-zinc-950 dark:text-zinc-50 shadow-sm", className)}>{children}</div>
);

// ============================================================================
// 4. EDITOR SUB-COMPONENTS
// ============================================================================

function PanelSection({ title, icon: Icon, children, defaultOpen = true }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border-b border-zinc-200 dark:border-zinc-800 last:border-0">
      <button onClick={() => setOpen(o => !o)} className="w-full flex items-center justify-between px-4 py-3 text-xs font-black uppercase tracking-widest text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200 transition-colors">
        <div className="flex items-center gap-2">{Icon && <Icon className="w-4 h-4" />}{title}</div>
        {open ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
      </button>
      {open && <div className="px-4 pb-4 space-y-4">{children}</div>}
    </div>
  );
}

function ColorGrid({ value, onChange }) {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-8 gap-1.5">
        {COLOR_PALETTE.map(c => (
          <button key={c} onClick={() => onChange(c)}
            className={cn("w-full aspect-square rounded-md border-2 transition-transform hover:scale-110", value.toUpperCase() === c.toUpperCase() ? 'border-blue-500 scale-110 shadow-md' : 'border-zinc-200 dark:border-zinc-700 shadow-sm')}
            style={{ backgroundColor: c }} />
        ))}
      </div>
      <div className="flex items-center gap-3 bg-zinc-100 dark:bg-zinc-800/50 p-2 rounded-xl">
        <input type="color" value={value} onChange={e => onChange(e.target.value)} className="w-10 h-10 p-0.5 cursor-pointer rounded-lg bg-transparent border border-zinc-300 dark:border-zinc-600 shrink-0" />
        <Input value={value} onChange={e => onChange(e.target.value)} className="h-10 text-xs font-mono uppercase bg-white dark:bg-zinc-900" />
      </div>
    </div>
  );
}

function SliderRow({ label, value, min, max, step = 1, unit = '', onChange }) {
  return (
    <div className="space-y-2">
      <div className="flex justify-between items-center">
        <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">{label}</span>
        <span className="text-[11px] font-mono font-black text-zinc-700 dark:text-zinc-300 bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 rounded-md">{value}{unit}</span>
      </div>
      <Slider value={[value]} min={min} max={max} step={step} onValueChange={([v]) => onChange(v)} />
    </div>
  );
}

// ============================================================================
// 5. MAIN COMPONENT
// ============================================================================

export default function App() {
  // --- Data Stores ---
  const banners = useDbQuery('banners');
  const vouchers = useDbQuery('vouchers');
  const products = useDbQuery('products');

  // --- Screens ---
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editBanner, setEditBanner] = useState(null);
  const [deleteBannerId, setDeleteBannerId] = useState(null);

  // --- Quick Form State ---
  const [bannerType, setBannerType] = useState('custom');
  const [bannerVoucherId, setBannerVoucherId] = useState('');
  const [bannerProductId, setBannerProductId] = useState('');
  const [bannerLink, setBannerLink] = useState('');
  const [bannerIsActive, setBannerIsActive] = useState(true);
  const [bannerBgType, setBannerBgType] = useState('gradient');
  const [bannerBgColor, setBannerBgColor] = useState('#1E293B');
  const [bannerGradientLeft, setBannerGradientLeft] = useState('#0061ff');
  const [bannerGradientRight, setBannerGradientRight] = useState('#60efff');
  const [bannerGradientAngle, setBannerGradientAngle] = useState(135);
  const [bannerImage, setBannerImage] = useState(null);
  const [bannerBadgeStyle, setBannerBadgeStyle] = useState('solid');

  // --- Canvas Editor State ---
  const [layers, setLayers] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [activePanel, setActivePanel] = useState('elements');
  const [zoom, setZoom] = useState(100);
  const [showGrid, setShowGrid] = useState(false);
  const [bgFilter, setBgFilter] = useState({ brightness: 100, contrast: 100, saturate: 100, blur: 0 });
  const [history, setHistory] = useState([[]]);
  const [historyIndex, setHistoryIndex] = useState(0);
  
  // For mobile bottom sheet
  const [isMobilePanelOpen, setIsMobilePanelOpen] = useState(false);

  const canvasRef = useRef(null);
  const bgFileInputRef = useRef(null);
  const overlayFileInputRef = useRef(null);
  const dragState = useRef(null);

  // --- Layer Management ---
  const pushHistory = useCallback((newLayers) => {
    setHistory(prev => {
      const trimmed = prev.slice(0, historyIndex + 1);
      return [...trimmed, newLayers].slice(-30);
    });
    setHistoryIndex(i => Math.min(i + 1, 29));
  }, [historyIndex]);
  const syncLayerByRole = useCallback((role, patch) => {
    setLayers(prev => {
      let changed = false;
      const next = prev.map(l => {
        if (l.role === role) {
          changed = true;
          return { ...l, ...patch };
        }
        return l;
      });
      if (changed) pushHistory(next);
      return next;
    });
  }, [pushHistory]);


  const updateLayer = useCallback((id, patch) => {
    setLayers(prev => {
      const next = prev.map(l => l.id === id ? { ...l, ...patch } : l);
      pushHistory(next);
      return next;
    });
  }, [pushHistory]);

  const addLayer = useCallback((layer) => {
    setLayers(prev => {
      const next = [...prev, layer];
      pushHistory(next);
      return next;
    });
    setSelectedId(layer.id);
    setActivePanel('props');
    if (window.innerWidth < 768) setIsMobilePanelOpen(true);
  }, [pushHistory]);

  const removeLayer = useCallback((id) => {
    setLayers(prev => {
      const next = prev.filter(l => l.id !== id);
      pushHistory(next);
      return next;
    });
    if (selectedId === id) setSelectedId(null);
  }, [selectedId, pushHistory]);

  const duplicateLayer = useCallback((id) => {
    const layer = layers.find(l => l.id === id);
    if (!layer) return;
    const copy = { ...layer, id: generateId(), x: Math.min(100, layer.x + 3), y: Math.min(100, layer.y + 3), zIndex: layer.zIndex + 1 };
    addLayer(copy);
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

  // --- Keyboard Shortcuts ---
  useEffect(() => {
    if (!isEditorOpen) return;
    const handleKeyDown = (e) => {
      // Don't trigger if typing in an input
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedId) {
        removeLayer(selectedId);
      }
      
      if (selectedId && (e.key.startsWith('Arrow'))) {
        e.preventDefault();
        const layer = layers.find(l => l.id === selectedId);
        if (!layer) return;
        const step = e.shiftKey ? 5 : 1;
        let nx = layer.x; let ny = layer.y;
        if (e.key === 'ArrowUp') ny -= step;
        if (e.key === 'ArrowDown') ny += step;
        if (e.key === 'ArrowLeft') nx -= step;
        if (e.key === 'ArrowRight') nx += step;
        updateLayer(selectedId, { x: nx, y: ny });
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isEditorOpen, selectedId, layers, removeLayer, updateLayer]);

  // --- Drag on Canvas (Touch & Mouse) ---
  const onLayerPointerDown = (e, id) => {
    e.stopPropagation();
    const layer = layers.find(l => l.id === id);
    if (!layer || layer.locked) return;
    
    setSelectedId(id);
    setActivePanel('props');
    
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    
    dragState.current = { id, startX: e.clientX, startY: e.clientY, origX: layer.x, origY: layer.y };

    const onMove = (me) => {
      if (!dragState.current) return;
      // Prevent default to stop scrolling on mobile while dragging
      if (me.cancelable) me.preventDefault(); 

      const dx = (me.clientX - dragState.current.startX) / rect.width * 100;
      const dy = (me.clientY - dragState.current.startY) / rect.height * 100;
      let nx = Math.round((dragState.current.origX + dx) * 10) / 10;
      let ny = Math.round((dragState.current.origY + dy) * 10) / 10;
      
      // Snap to center/edges
      if (Math.abs(nx - 50) < 1.5) nx = 50;
      if (Math.abs(ny - 50) < 1.5) ny = 50;
      if (Math.abs(nx - 0) < 1.5) nx = 0;
      if (Math.abs(nx - 100) < 1.5) nx = 100;
      if (Math.abs(ny - 0) < 1.5) ny = 0;
      if (Math.abs(ny - 100) < 1.5) ny = 100;
      
      setLayers(prev => prev.map(l => l.id === id ? { ...l, x: nx, y: ny } : l));
    };
    
    const onUp = () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      if (dragState.current) {
        pushHistory(layers); // Save state after drag
      }
      dragState.current = null;
    };
    
    window.addEventListener('pointermove', onMove, { passive: false });
    window.addEventListener('pointerup', onUp);
  };

  // --- Background/Image Handlers ---
  const handleBgImageSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => setBannerImage(ev.target.result);
    reader.readAsDataURL(file);
    if (bgFileInputRef.current) bgFileInputRef.current.value = '';
  };

  const handleAddImageFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      addLayer(defaultImageLayer(ev.target.result));
    };
    reader.readAsDataURL(file);
    if (overlayFileInputRef.current) overlayFileInputRef.current.value = '';
  };

  // --- Editor Open/Close ---
  const openEditor = (banner = null) => {
    if (banner) {
      setEditBanner(banner);
      setBannerType(banner.type || 'custom');
      setBannerBadgeStyle('solid');
      setBannerVoucherId(String(banner.voucherId || ''));
      setBannerProductId(String(banner.productId || ''));
      setBannerLink(banner.link || '');
      setBannerIsActive(banner.isActive !== false);
      setBannerBgType(banner.bgType || 'gradient');
      setBannerBgColor(banner.bgColor || '#1E293B');
      if (banner.bgGradient) {
        const match = banner.bgGradient.match(/linear-gradient\((\d+)deg,\s*(.+?),\s*(.+?)\)/);
        if (match) {
          setBannerGradientAngle(Number(match[1]));
          setBannerGradientLeft(match[2]);
          setBannerGradientRight(match[3]);
        } else {
          setBannerGradientLeft('#0061ff');
          setBannerGradientRight('#60efff');
          setBannerGradientAngle(135);
        }
      } else {
        setBannerGradientLeft('#0061ff');
        setBannerGradientRight('#60efff');
        setBannerGradientAngle(135);
      }
      setBannerImage(banner.imageUrl || null);
      
      const initialLayers = banner.canvasLayers || [];
      setLayers(initialLayers);
      setHistory([initialLayers]);
      setHistoryIndex(0);
      setBgFilter(banner.canvasBgFilter || { brightness: 100, contrast: 100, saturate: 100, blur: 0 });
    } else {
      setEditBanner(null);
      setBannerType('custom'); setBannerHeading(''); setBannerTitle(''); setBannerDesc(''); setBannerBadgeStyle('solid');
      setBannerVoucherId(''); setBannerProductId(''); setBannerLink('');
      setBannerButtonText(''); setBannerIsActive(true);
      setBannerBgType('gradient'); setBannerBgColor('#1E293B');
      setBannerGradientLeft('#0061ff'); setBannerGradientRight('#60efff'); setBannerGradientAngle(135);
      setBannerImage(null);
      
      const seedLayers = [
        defaultTextLayer({ role: 'heading', content: 'SPESIAL PENAWARAN', x: 25, y: 25, fontSize: 14, fontWeight: '900', color: '#FFFFFF', textAlign: 'left', shadow: false, width: 35, borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)', padding: 8, borderRadius: 4, bgOpacity: 20, backdropBlur: true, letterSpacing: 3 }),
        defaultTextLayer({ role: 'subheading', content: 'Promo Berkah Idul Adha', x: 30, y: 45, fontSize: 56, fontWeight: '900', color: '#FFFFFF', textAlign: 'left', shadow: true, width: 45, lineHeight: 1.1 }),
        defaultTextLayer({ role: 'body', content: 'Nikmati Keberkahan Idul Adha Promo Diskon 75% Dengan Kode Voucher BASITH', x: 30, y: 65, fontSize: 18, fontWeight: 'normal', color: '#E2E8F0', textAlign: 'left', shadow: true, width: 45, lineHeight: 1.4 }),
        defaultTextLayer({ role: 'button', content: 'Lihat Detail', x: 17, y: 82, fontSize: 16, fontWeight: '900', color: '#0F172A', bgColor: '#FFFFFF', bgOpacity: 100, textAlign: 'center', shadow: true, width: 18, padding: 12, borderRadius: 8 }),
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
    setIsMobilePanelOpen(false);
  };

  const handleSaveBanner = async () => {
    const titleLayer = layers.find(l => l.role === 'subheading');
    const derivedTitle = titleLayer ? titleLayer.content : 'Banner Baru';

    if (!derivedTitle.trim()) { toast.error('Judul (layer Subheading) tidak boleh kosong'); return; }

    const loadingToastId = toast.loading('Menyimpan banner...');
    
    try {
      let finalBannerImage = bannerImage;
      if (bannerImage && bannerImage.startsWith('data:image')) {
        const url = await dbUploadFile('banners', `bg_${Date.now()}`, bannerImage);
        if (url) finalBannerImage = url;
      }

      const finalLayers = [];
      for (const layer of layers) {
        if (layer.type === 'image' && layer.src && layer.src.startsWith('data:image')) {
          const url = await dbUploadFile('banners', `layer_${layer.id}_${Date.now()}`, layer.src);
          finalLayers.push({ ...layer, src: url || layer.src });
        } else {
          finalLayers.push(layer);
        }
      }

      const bannerData = {
        type: bannerType, 
        heading: '',
        title: derivedTitle.trim(), 
        description: '',
        voucherId: bannerType === 'voucher' ? Number(bannerVoucherId) : null,
        productId: bannerType === 'menu' ? Number(bannerProductId) : null,
        imageUrl: finalBannerImage, 
        buttonText: bannerButtonText.trim(), 
        link: bannerLink.trim(),
        isActive: bannerIsActive, 
        bgType: bannerBgType,
        bgColor: bannerBgType === 'solid' ? bannerBgColor : null,
        bgGradient: bannerBgType === 'gradient' ? `linear-gradient(${bannerGradientAngle}deg, ${bannerGradientLeft}, ${bannerGradientRight})` : null,
        canvasLayers: finalLayers,
        canvasBgFilter: bgFilter,
        createdAt: editBanner ? editBanner.createdAt : new Date().toISOString()
      };

      if (editBanner) {
        await dbUpdate('banners', editBanner.id, bannerData);
        toast.success('Banner diperbarui', { id: loadingToastId });
      } else {
        await dbInsert('banners', bannerData);
        toast.success('Banner baru diterbitkan!', { id: loadingToastId });
      }
      setIsEditorOpen(false);
    } catch (err) {
      console.error(err);
      toast.error('Gagal menyimpan banner', { id: loadingToastId });
    }
  };

  const handleDeleteBanner = async () => {
    if (!deleteBannerId) return;
    try {
      await dbDelete('banners', deleteBannerId);
      toast.success('Banner dihapus');
      setDeleteBannerId(null);
    } catch (err) {
      toast.error('Gagal menghapus banner');
    }
  };

  const handleToggleActive = async (id, cur) => {
    try {
      await dbUpdate('banners', id, { isActive: !cur });
      toast.success(!cur ? 'Banner diaktifkan' : 'Banner dinonaktifkan');
    } catch (err) {
      toast.error('Gagal mengubah status');
    }
  };

  // --- Rendering Functions ---
  const canvasBg = bannerBgType === 'solid' ? bannerBgColor : bannerBgType === 'gradient' ? `linear-gradient(${bannerGradientAngle}deg, ${bannerGradientLeft}, ${bannerGradientRight})` : undefined;
  const bgFilterStyle = `brightness(${bgFilter.brightness}%) contrast(${bgFilter.contrast}%) saturate(${bgFilter.saturate}%) blur(${bgFilter.blur}px)`;

  const renderCanvasLayer = (layer) => {
    if (!layer.visible) return null;
    const isSelected = selectedId === layer.id;
    const baseStyle = {
      position: 'absolute',
      left: `${layer.x}%`,
      top: `${layer.y}%`,
      transform: 'translate(-50%, -50%)',
      zIndex: layer.zIndex,
      opacity: layer.opacity / 100,
      cursor: layer.locked ? 'not-allowed' : 'grab',
      userSelect: 'none',
      touchAction: 'none', // Critical for mobile touch
    };

    if (layer.type === 'text') {
      return (
        <div key={layer.id} style={{ ...baseStyle, width: `${layer.width}%` }}
          className={cn(isSelected && 'ring-2 ring-blue-500 ring-offset-2 ring-offset-transparent rounded-lg')}
          onPointerDown={e => onLayerPointerDown(e, layer.id)}>
          <p style={{
            fontSize: `${layer.fontSize}px`, fontWeight: layer.fontWeight, fontStyle: layer.fontStyle,
            textAlign: layer.textAlign, color: layer.color, letterSpacing: `${layer.letterSpacing}px`,
            lineHeight: layer.lineHeight, fontFamily: layer.fontFamily,
            textDecoration: layer.textDecoration, textTransform: layer.uppercase ? 'uppercase' : 'none',
            padding: `${layer.padding}px`, borderRadius: `${layer.borderRadius}px`,
            backgroundColor: layer.bgOpacity > 0 ? `${layer.bgColor}${Math.round(layer.bgOpacity * 2.55).toString(16).padStart(2, '0')}` : 'transparent',
            border: (layer.borderWidth && layer.borderWidth > 0) ? `${layer.borderWidth}px ${layer.borderStyle} ${layer.borderColor}` : undefined,
            backdropFilter: layer.backdropBlur ? 'blur(8px)' : undefined,
            textShadow: layer.shadow ? '0 4px 16px rgba(0,0,0,0.6)' : undefined,
            margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word',
            transform: `rotate(${layer.rotate}deg)`,
          }}>
            {layer.content}
          </p>
        </div>
      );
    }

    if (layer.type === 'image') {
      const filterStr = `brightness(${layer.brightness}%) contrast(${layer.contrast}%) saturate(${layer.saturate}%) blur(${layer.blur}px) ${layer.grayscale ? 'grayscale(100%)' : ''} ${layer.sepia ? 'sepia(100%)' : ''}`;
      return (
        <div key={layer.id} style={{ ...baseStyle, width: `${layer.width}%` }}
          className={cn(isSelected && 'ring-2 ring-blue-500 ring-offset-2 ring-offset-transparent rounded-lg')}
          onPointerDown={e => onLayerPointerDown(e, layer.id)}>
          <img src={layer.src} alt="" draggable={false}
            style={{
              width: '100%', height: 'auto', display: 'block',
              transform: `rotate(${layer.rotate}deg) scaleX(${layer.flipX ? -1 : 1}) scaleY(${layer.flipY ? -1 : 1})`,
              filter: filterStr, mixBlendMode: layer.mixBlendMode,
              borderRadius: `${layer.borderRadius}px`,
              boxShadow: layer.shadow ? '0 12px 32px rgba(0,0,0,0.4)' : undefined,
            }} />
        </div>
      );
    }

    return null;
  };

  // --- Panels (Elements, Layers, Bg, Props) ---
  const renderElementsPanel = () => (
    <div className="space-y-6 px-4 py-5">
      <div>
        <p className="text-[10px] font-black uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-3">Preset Teks</p>
        <div className="grid grid-cols-1 gap-2">
          {[
            { label: 'Heading', fontSize: 56, fontWeight: '900', content: 'HEADING UTAMA', width: 80 },
            { label: 'Subheading', fontSize: 28, fontWeight: 'bold', content: 'Subheading Keren', width: 60 },
            { label: 'Body Text', fontSize: 18, fontWeight: 'normal', content: 'Teks deskripsi promo ada di sini...', width: 50 },
            { label: 'Badge', fontSize: 14, fontWeight: 'bold', content: 'PROMO BARU', uppercase: true, bgOpacity: 100, bgColor: '#EF4444', borderRadius: 20, padding: 10, width: 25, textAlign: 'center' },
          ].map(preset => (
            <button key={preset.label} onClick={() => addLayer(defaultTextLayer(preset))}
              className="w-full px-4 py-3 rounded-2xl bg-zinc-100 dark:bg-zinc-800/50 hover:bg-zinc-200 dark:hover:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-left transition-all group flex items-center justify-between">
              <span className="text-sm font-bold text-zinc-800 dark:text-zinc-200 group-hover:text-blue-600 dark:group-hover:text-blue-400">{preset.label}</span>
              <Plus className="w-4 h-4 text-zinc-400 group-hover:text-blue-600 dark:group-hover:text-blue-400" />
            </button>
          ))}
        </div>
      </div>

      <div>
        <p className="text-[10px] font-black uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-3">Upload Gambar</p>
        <input ref={overlayFileInputRef} type="file" accept="image/*" className="hidden" onChange={handleAddImageFile} />
        <button onClick={() => overlayFileInputRef.current?.click()}
          className="w-full h-14 rounded-2xl bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/40 border-2 border-dashed border-blue-200 dark:border-blue-800/50 hover:border-blue-400 transition-all flex items-center justify-center gap-2 text-sm font-bold text-blue-600 dark:text-blue-400">
          <ImageIcon className="w-5 h-5" /> Pilih PNG / JPG
        </button>
      </div>
    </div>
  );

  const renderLayersPanel = () => {
    const sorted = [...layers].sort((a, b) => b.zIndex - a.zIndex);
    return (
      <div className="space-y-2 px-3 py-4">
        {sorted.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-zinc-400">
            <Layers className="w-8 h-8 mb-3 opacity-20" />
            <p className="text-xs">Belum ada layer.</p>
          </div>
        )}
        {sorted.map(layer => (
          <div key={layer.id}
            onClick={() => { setSelectedId(layer.id); setActivePanel('props'); if(window.innerWidth < 768) setIsMobilePanelOpen(true); }}
            className={cn('flex items-center gap-3 px-3 py-3 rounded-2xl cursor-pointer transition-all border',
              selectedId === layer.id ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-300 dark:border-blue-800' : 'bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700')}>
            <div className="w-8 h-8 shrink-0 rounded-xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-500">
              {layer.type === 'text' ? <Type className="w-4 h-4" /> : <ImageIcon className="w-4 h-4" />}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-zinc-800 dark:text-zinc-200 truncate">
                {layer.type === 'text' ? layer.content : 'Gambar'}
              </p>
            </div>
            <div className="flex items-center gap-1">
              <button onClick={e => { e.stopPropagation(); updateLayer(layer.id, { visible: !layer.visible }); }}
                className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-400">
                {layer.visible ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
              </button>
              <button onClick={e => { e.stopPropagation(); removeLayer(layer.id); }}
                className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 text-zinc-400 hover:text-red-500">
                <Trash className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>
    );
  };

  const renderBgPanel = () => (
    <div className="space-y-6 px-4 py-5">
      <div>
        <p className="text-[10px] font-black uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-3">Tipe Background</p>
        <div className="flex bg-zinc-100 dark:bg-zinc-800 p-1 rounded-xl">
          {['solid', 'gradient', 'image'].map(t => (
            <button key={t} onClick={() => setBannerBgType(t)}
              className={cn('flex-1 h-9 rounded-lg text-xs font-bold capitalize transition-all', bannerBgType === t ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300')}>
              {t}
            </button>
          ))}
        </div>
      </div>

      {bannerBgType === 'solid' && (
        <div>
          <p className="text-[10px] font-black uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-3">Warna Solid</p>
          <ColorGrid value={bannerBgColor} onChange={setBannerBgColor} />
        </div>
      )}

      {bannerBgType === 'gradient' && (
        <div className="space-y-4">
          <p className="text-[10px] font-black uppercase tracking-wider text-zinc-500 dark:text-zinc-400">Pengaturan Gradasi</p>
          <div className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 space-y-4 bg-white dark:bg-zinc-900">
            <div>
              <Label>Warna Kiri (Mulai)</Label>
              <ColorGrid value={bannerGradientLeft} onChange={setBannerGradientLeft} />
            </div>
            <div className="pt-4 border-t border-zinc-200 dark:border-zinc-800">
              <Label>Warna Kanan (Akhir)</Label>
              <ColorGrid value={bannerGradientRight} onChange={setBannerGradientRight} />
            </div>
            <div className="pt-4 border-t border-zinc-200 dark:border-zinc-800">
              <SliderRow label="Sudut Kemiringan" value={bannerGradientAngle} min={0} max={360} onChange={setBannerGradientAngle} unit="°" />
            </div>
          </div>
        </div>
      )}

      {bannerBgType === 'image' && (
        <div className="space-y-4">
          <input ref={bgFileInputRef} type="file" accept="image/*" className="hidden" onChange={handleBgImageSelect} />
          <div className="w-full aspect-video rounded-2xl border-2 border-dashed border-zinc-300 dark:border-zinc-700 overflow-hidden bg-zinc-100 dark:bg-zinc-900 flex items-center justify-center cursor-pointer group hover:border-blue-400 transition-all relative" onClick={() => bgFileInputRef.current?.click()}>
            {bannerImage ? (
              <img src={bannerImage} alt="BG" className="w-full h-full object-cover group-hover:opacity-80 transition-opacity" style={{ filter: bgFilterStyle }} />
            ) : (
              <div className="flex flex-col items-center gap-2 text-zinc-400 group-hover:text-blue-500">
                <ImageIcon className="w-8 h-8" />
                <span className="text-xs font-bold">Upload Gambar Latar</span>
              </div>
            )}
            {bannerImage && (
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white font-bold text-sm">Ganti Gambar</div>
            )}
          </div>
          {bannerImage && (
            <Button variant="danger" className="w-full" onClick={() => setBannerImage(null)}>Hapus Gambar</Button>
          )}

          <div className="pt-4 border-t border-zinc-200 dark:border-zinc-800 space-y-4">
            <p className="text-[10px] font-black uppercase tracking-wider text-zinc-500 dark:text-zinc-400">Filter Latar Belakang</p>
            <SliderRow label="Kecerahan" value={bgFilter.brightness} min={0} max={200} onChange={v => setBgFilter(f => ({ ...f, brightness: v }))} unit="%" />
            <SliderRow label="Kontras" value={bgFilter.contrast} min={0} max={200} onChange={v => setBgFilter(f => ({ ...f, contrast: v }))} unit="%" />
            <SliderRow label="Blur" value={bgFilter.blur} min={0} max={20} onChange={v => setBgFilter(f => ({ ...f, blur: v }))} unit="px" />
          </div>
        </div>
      )}
    </div>
  );

  const renderPropsPanel = () => {
    if (!selectedLayer) {
      return (
        <div className="flex flex-col items-center justify-center h-full min-h-[200px] text-zinc-400 text-sm text-center px-6">
          <MousePointer2 className="w-10 h-10 mb-4 opacity-20" />
          Pilih elemen di kanvas untuk mengedit propertinya
        </div>
      );
    }

    if (selectedLayer.type === 'text') {
      const t = selectedLayer;
      const upd = (p) => updateLayer(t.id, p);
      return (
        <div className="space-y-0 pb-12">
          <PanelSection title="Konten Teks" icon={Type}>
            <textarea value={t.content} onChange={e => upd({ content: e.target.value })} rows={3}
              className="w-full bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-xl text-sm p-3 resize-none focus:ring-2 focus:ring-blue-500 outline-none transition-all" />
          </PanelSection>

          <PanelSection title="Tipografi" icon={Bold}>
            <div className="space-y-4">
              <select value={t.fontFamily} onChange={e => upd({ fontFamily: e.target.value })} className="w-full h-10 px-3 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-sm font-bold outline-none">
                {FONT_FAMILIES.map(f => <option key={f} value={f} style={{ fontFamily: f }}>{f}</option>)}
              </select>
              
              <SliderRow label="Ukuran Teks" value={t.fontSize} min={8} max={160} onChange={v => upd({ fontSize: v })} unit="px" />
              <SliderRow label="Lebar Area" value={t.width} min={5} max={100} onChange={v => upd({ width: v })} unit="%" />
              
              <div className="flex bg-zinc-100 dark:bg-zinc-800 p-1 rounded-xl">
                {['left', 'center', 'right'].map(a => (
                  <button key={a} onClick={() => upd({ textAlign: a })}
                    className={cn('flex-1 h-9 rounded-lg flex items-center justify-center transition-all', t.textAlign === a ? 'bg-white dark:bg-zinc-700 shadow text-blue-600 dark:text-blue-400' : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200')}>
                    {a === 'left' ? <AlignLeft className="w-4 h-4" /> : a === 'center' ? <AlignCenter className="w-4 h-4" /> : <AlignRight className="w-4 h-4" />}
                  </button>
                ))}
              </div>
              
              <div className="flex gap-2">
                <button onClick={() => upd({ fontWeight: t.fontWeight === 'bold' ? 'normal' : 'bold' })}
                  className={cn('flex-1 h-10 rounded-xl border font-bold transition-all', t.fontWeight === 'bold' ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400' : 'border-zinc-200 dark:border-zinc-700')}>B</button>
                <button onClick={() => upd({ fontStyle: t.fontStyle === 'italic' ? 'normal' : 'italic' })}
                  className={cn('flex-1 h-10 rounded-xl border italic font-bold transition-all', t.fontStyle === 'italic' ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400' : 'border-zinc-200 dark:border-zinc-700')}>I</button>
                <button onClick={() => upd({ uppercase: !t.uppercase })}
                  className={cn('flex-1 h-10 rounded-xl border text-xs font-black uppercase transition-all', t.uppercase ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400' : 'border-zinc-200 dark:border-zinc-700')}>AA</button>
              </div>
              
              <SliderRow label="Spasi Huruf" value={t.letterSpacing} min={-5} max={30} onChange={v => upd({ letterSpacing: v })} unit="px" />
              <SliderRow label="Jarak Baris" value={t.lineHeight * 10} min={8} max={30} onChange={v => upd({ lineHeight: v / 10 })} unit="" />
            </div>
          </PanelSection>

          <PanelSection title="Warna Teks" icon={Palette}>
            <ColorGrid value={t.color} onChange={v => upd({ color: v })} />
          </PanelSection>

          <PanelSection title="Background & Padding" icon={SquareDashed} defaultOpen={false}>
            <div className="space-y-4">
              <ColorGrid value={t.bgColor} onChange={v => upd({ bgColor: v })} />
              <SliderRow label="Opasitas BG" value={t.bgOpacity} min={0} max={100} onChange={v => upd({ bgOpacity: v })} unit="%" />
              <SliderRow label="Sudut Melengkung" value={t.borderRadius} min={0} max={50} onChange={v => upd({ borderRadius: v })} unit="px" />
              <SliderRow label="Padding Dalam" value={t.padding} min={0} max={60} onChange={v => upd({ padding: v })} unit="px" />
            </div>
          </PanelSection>

          <PanelSection title="Efek & Transformasi" icon={Sparkles} defaultOpen={false}>
            <div className="space-y-4">
              <SliderRow label="Rotasi" value={t.rotate} min={-180} max={180} onChange={v => upd({ rotate: v })} unit="°" />
              <SliderRow label="Transparansi" value={t.opacity} min={0} max={100} onChange={v => upd({ opacity: v })} unit="%" />
              <div className="flex items-center justify-between bg-zinc-100 dark:bg-zinc-800 p-3 rounded-xl">
                <span className="text-xs font-bold">Bayangan (Shadow)</span>
                <Switch checked={t.shadow} onCheckedChange={v => upd({ shadow: v })} />
              </div>
              <div className="flex items-center justify-between bg-zinc-100 dark:bg-zinc-800 p-3 rounded-xl">
                <span className="text-xs font-bold">Efek Glass (Blur BG)</span>
                <Switch checked={t.backdropBlur} onCheckedChange={v => upd({ backdropBlur: v })} />
              </div>
            </div>
          </PanelSection>
        </div>
      );
    }

    if (selectedLayer.type === 'image') {
      const im = selectedLayer;
      const upd = (p) => updateLayer(im.id, p);
      return (
        <div className="space-y-0 pb-12">
          <PanelSection title="Ukuran & Posisi" icon={Move}>
            <SliderRow label="Lebar" value={im.width} min={5} max={150} onChange={v => upd({ width: v })} unit="%" />
          </PanelSection>

          <PanelSection title="Transformasi" icon={RotateCw}>
             <div className="space-y-4">
               <SliderRow label="Rotasi" value={im.rotate} min={-180} max={180} onChange={v => upd({ rotate: v })} unit="°" />
               <div className="flex gap-2">
                 <button onClick={() => upd({ flipX: !im.flipX })}
                   className={cn('flex-1 h-10 rounded-xl border font-bold transition-all flex items-center justify-center gap-2', im.flipX ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400' : 'border-zinc-200 dark:border-zinc-700')}>
                   <FlipHorizontal className="w-4 h-4" /> Balik H
                 </button>
                 <button onClick={() => upd({ flipY: !im.flipY })}
                   className={cn('flex-1 h-10 rounded-xl border font-bold transition-all flex items-center justify-center gap-2', im.flipY ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400' : 'border-zinc-200 dark:border-zinc-700')}>
                   <FlipVertical className="w-4 h-4" /> Balik V
                 </button>
               </div>
               <SliderRow label="Opasitas" value={im.opacity} min={0} max={100} onChange={v => upd({ opacity: v })} unit="%" />
               <SliderRow label="Radius Sudut" value={im.borderRadius} min={0} max={100} onChange={v => upd({ borderRadius: v })} unit="px" />
               <div className="flex items-center justify-between bg-zinc-100 dark:bg-zinc-800 p-3 rounded-xl mt-2">
                 <span className="text-xs font-bold">Bayangan Lulus (Shadow)</span>
                 <Switch checked={im.shadow} onCheckedChange={v => upd({ shadow: v })} />
               </div>
             </div>
          </PanelSection>

          <PanelSection title="Filter Warna" icon={Sliders}>
            <div className="space-y-4">
              <SliderRow label="Kecerahan" value={im.brightness} min={0} max={200} onChange={v => upd({ brightness: v })} unit="%" />
              <SliderRow label="Kontras" value={im.contrast} min={0} max={200} onChange={v => upd({ contrast: v })} unit="%" />
              <SliderRow label="Saturasi" value={im.saturate} min={0} max={200} onChange={v => upd({ saturate: v })} unit="%" />
              <SliderRow label="Blur" value={im.blur} min={0} max={20} onChange={v => upd({ blur: v })} unit="px" />
              <div className="flex gap-2">
                <button onClick={() => upd({ grayscale: !im.grayscale })}
                  className={cn('flex-1 h-10 rounded-xl border font-bold text-xs transition-all', im.grayscale ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400' : 'border-zinc-200 dark:border-zinc-700')}>
                  Grayscale
                </button>
                <button onClick={() => upd({ sepia: !im.sepia })}
                  className={cn('flex-1 h-10 rounded-xl border font-bold text-xs transition-all', im.sepia ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400' : 'border-zinc-200 dark:border-zinc-700')}>
                  Sepia
                </button>
              </div>
            </div>
          </PanelSection>
        </div>
      );
    }

  };

  const renderInfoPanel = () => (
    <div className="space-y-5 px-4 py-5 pb-12">
      <div>
        <Label>Tipe Banner</Label>
        <select value={bannerType} onChange={(e) => setBannerType(e.target.value)} className="w-full h-10 px-3 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-sm outline-none">
          <option value="custom">Kustom Bebas</option>
          <option value="voucher">Promo Voucher</option>
          <option value="menu">Menu / Produk</option>
        </select>
      </div>

      {bannerType === 'voucher' && (
        <div>
          <Label>Voucher Terkait</Label>
          <select value={bannerVoucherId} onChange={(e) => setBannerVoucherId(e.target.value)} className="w-full h-10 px-3 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-sm outline-none">
            <option value="">-- Pilih Voucher --</option>
            {vouchers.map(v => <option key={v.id} value={v.id}>{v.code}</option>)}
          </select>
        </div>
      )}

      {bannerType === 'menu' && (
        <div>
          <Label>Produk Terkait</Label>
          <select value={bannerProductId} onChange={(e) => setBannerProductId(e.target.value)} className="w-full h-10 px-3 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-sm outline-none">
            <option value="">-- Pilih Produk --</option>
            {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>
      )}



      <div>
        <Label>Gaya Tombol (Badge)</Label>
        <select value={bannerBadgeStyle} onChange={(e) => {
          const style = e.target.value;
          setBannerBadgeStyle(style);
          const btn = layers.find(l => l.role === 'button');
          if (btn) {
              if (style === 'solid') {
                 updateLayer(btn.id, { bgColor: '#FFFFFF', color: '#0F172A', bgOpacity: 100, borderWidth: 0 });
              } else if (style === 'outline') {
                 updateLayer(btn.id, { bgColor: '#000000', color: '#FFFFFF', bgOpacity: 0, borderWidth: 2, borderColor: '#FFFFFF' });
              } else if (style === 'glass') {
                 updateLayer(btn.id, { bgColor: '#FFFFFF', color: '#FFFFFF', bgOpacity: 20, borderWidth: 1, borderColor: '#FFFFFF', backdropBlur: true });
              }
          }
        }} className="w-full h-10 px-3 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-sm outline-none">
          <option value="solid">Solid (Warna Penuh)</option>
          <option value="outline">Outline (Garis Tepi)</option>
          <option value="glass">Glassmorphism (Kaca)</option>
        </select>
      </div>

      {bannerType === 'custom' && (
        <div>
          <Label>Link Tujuan (Opsional)</Label>
          <Input value={bannerLink} onChange={e => setBannerLink(e.target.value)} placeholder="https://..." />
        </div>
      )}

      <div className="flex items-center justify-between bg-zinc-100 dark:bg-zinc-800 p-4 rounded-xl">
        <div>
          <p className="text-sm font-bold">Status Tayang</p>
          <p className="text-xs text-zinc-500">Tampilkan di aplikasi pelanggan</p>
        </div>
        <Switch checked={bannerIsActive} onCheckedChange={setBannerIsActive} />
      </div>
    </div>
  );

  // ============================================================================
  // RENDER EDITOR VIEW
  // ============================================================================
  if (isEditorOpen) {
    return (
      <div className="fixed inset-0 z-50 bg-white dark:bg-[#09090b] text-zinc-900 dark:text-zinc-100 flex flex-col overflow-hidden transition-colors duration-300">
        
        {/* --- Topbar --- */}
        <div className="h-14 sm:h-16 flex items-center justify-between px-3 sm:px-6 border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 shrink-0 z-40 relative">
          <div className="flex items-center gap-2 sm:gap-4">
            <Button variant="ghost" size="icon" onClick={() => setIsEditorOpen(false)} className="rounded-full">
              <ChevronLeft className="w-5 h-5" />
            </Button>
            <div className="h-6 w-[1px] bg-zinc-200 dark:bg-zinc-800 hidden sm:block" />
            
            <div className="flex items-center gap-1 bg-zinc-100 dark:bg-zinc-900 rounded-full p-1">
              <Button variant="ghost" size="icon" className="w-8 h-8 rounded-full" onClick={undo} disabled={historyIndex === 0}>
                <RotateCcw className="w-4 h-4" />
              </Button>
              <Button variant="ghost" size="icon" className="w-8 h-8 rounded-full" onClick={redo} disabled={historyIndex >= history.length - 1}>
                <RotateCw className="w-4 h-4" />
              </Button>
            </div>
          </div>

          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center gap-2">
            <Wand2 className="w-4 h-4 text-blue-500 hidden sm:block" />
            <span className="text-sm font-black tracking-tight hidden sm:block">Creative Studio</span>
            <span className="text-sm font-black tracking-tight sm:hidden">{layers.find(l => l.role === 'subheading')?.content || 'Banner Baru'}</span>
          </div>

          <div className="flex items-center gap-2 sm:gap-4">
            <div className="hidden sm:flex items-center gap-2 bg-zinc-100 dark:bg-zinc-900 rounded-full px-3 h-10">
              <button onClick={() => setZoom(z => Math.max(30, z - 10))} className="p-1 hover:text-blue-500 transition-colors"><ZoomOut className="w-4 h-4" /></button>
              <span className="text-xs font-mono font-bold w-12 text-center">{zoom}%</span>
              <button onClick={() => setZoom(z => Math.min(200, z + 10))} className="p-1 hover:text-blue-500 transition-colors"><ZoomIn className="w-4 h-4" /></button>
            </div>
            
            <Button variant="primary" size="sm" onClick={handleSaveBanner} className="rounded-full px-5 h-9 sm:h-10 text-xs sm:text-sm shadow-blue-500/20">
              <Check className="w-4 h-4 sm:mr-2" /> <span className="hidden sm:inline">{editBanner ? 'Simpan' : 'Terbitkan'}</span>
            </Button>
          </div>
        </div>

        {/* --- Main Workspace --- */}
        <div className="flex-1 flex overflow-hidden relative bg-zinc-50 dark:bg-[#09090b]">

          {/* Desktop Left Sidebar (Elements, Layers) */}
          <div className="hidden md:flex w-[320px] shrink-0 bg-white dark:bg-zinc-950 border-r border-zinc-200 dark:border-zinc-800 flex-col overflow-hidden z-20">
            <div className="flex p-2 border-b border-zinc-200 dark:border-zinc-800 gap-2 shrink-0">
              {['elements', 'layers'].map(tab => (
                <button key={tab} onClick={() => setActivePanel(tab)}
                  className={cn("flex-1 h-10 rounded-xl text-xs font-bold capitalize transition-all", activePanel === tab ? "bg-zinc-100 dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100" : "text-zinc-500 hover:bg-zinc-50 dark:hover:bg-zinc-900/50")}>
                  {tab === 'elements' ? 'Tambah' : 'Layer'}
                </button>
              ))}
            </div>
            <div className="flex-1 overflow-y-auto custom-scrollbar">
              {activePanel === 'elements' && renderElementsPanel()}
              {activePanel === 'layers' && renderLayersPanel()}
              {/* Fallback if user clicked a right-panel tab on mobile then resized to desktop */}
              {(activePanel === 'props' || activePanel === 'bg') && renderElementsPanel()} 
            </div>
          </div>

          {/* Center Canvas Area */}
          <div className="flex-1 relative overflow-auto flex items-center justify-center p-4 sm:p-12 pb-24 md:pb-12"
            style={{ 
              backgroundImage: showGrid ? 'radial-gradient(circle at 1px 1px, currentColor 1px, transparent 0)' : undefined, 
              backgroundSize: showGrid ? '32px 32px' : undefined,
              color: 'var(--tw-prose-body, rgba(150,150,150,0.1))'
            }}
            onPointerDown={() => setSelectedId(null)}>
            
            {/* Canvas Container */}
            <div ref={canvasRef} className="relative shadow-2xl overflow-hidden"
              style={{
                width: `${zoom}%`, minWidth: '300px', maxWidth: '1200px', aspectRatio: '21/9',
                background: canvasBg || '#ffffff',
                borderRadius: '16px',
                border: selectedId ? 'none' : '2px solid transparent',
                outline: selectedId ? undefined : '1px solid rgba(150,150,150,0.2)'
              }}>
              
              {/* Canvas Background Image */}
              {bannerBgType === 'image' && bannerImage && (
                <div className="absolute inset-0 z-0 pointer-events-none">
                  <img src={bannerImage} alt="bg" className="w-full h-full object-cover" style={{ filter: bgFilterStyle }} />
                </div>
              )}
              {bannerBgType === 'image' && !bannerImage && (
                <div className="absolute inset-0 bg-zinc-200 dark:bg-zinc-800 pointer-events-none flex flex-col items-center justify-center text-zinc-400">
                  <ImageIcon className="w-12 h-12 mb-2 opacity-20" />
                  <span className="text-sm font-bold opacity-50">Latar Belakang Kosong</span>
                </div>
              )}

              {/* Layers */}
              {[...layers].sort((a, b) => a.zIndex - b.zIndex).map(renderCanvasLayer)}
            </div>

            {/* Floating Action Menu inside canvas (Desktop) */}
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 hidden md:flex items-center gap-2 bg-white/90 dark:bg-zinc-900/90 backdrop-blur-md px-4 py-2 rounded-full shadow-lg border border-zinc-200/50 dark:border-zinc-800/50 z-30">
               <button onClick={() => setShowGrid(!showGrid)} className={cn("w-10 h-10 rounded-full flex items-center justify-center transition-all", showGrid ? "bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400" : "text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800")}>
                 <Grid className="w-4 h-4" />
               </button>
               <div className="w-[1px] h-6 bg-zinc-200 dark:bg-zinc-700" />
               <span className="text-xs font-bold text-zinc-500 px-2">{layers.length} Objek</span>
            </div>
          </div>

          {/* Desktop Right Sidebar (Props, Bg, Info) */}
          <div className="hidden md:flex w-[320px] shrink-0 bg-white dark:bg-zinc-950 border-l border-zinc-200 dark:border-zinc-800 flex-col overflow-hidden z-20">
             <div className="flex p-2 border-b border-zinc-200 dark:border-zinc-800 gap-2 shrink-0">
               {['props', 'bg', 'info'].map(tab => {
                 let label = tab === 'props' ? 'Properti' : tab === 'bg' ? 'Latar' : 'Detail';
                 return (
                   <button key={tab} onClick={() => { setActivePanel(tab); if(tab === 'props' && !selectedId && layers.length > 0) setSelectedId(layers[layers.length-1].id); }}
                     className={cn("flex-1 h-10 rounded-xl text-xs font-bold capitalize transition-all", activePanel === tab ? "bg-zinc-100 dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100" : "text-zinc-500 hover:bg-zinc-50 dark:hover:bg-zinc-900/50")}>
                     {label}
                   </button>
                 );
               })}
             </div>
             
             {/* Quick Actions for Selected Layer */}
             {selectedLayer && activePanel === 'props' && (
                <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50 shrink-0">
                  <div className="flex bg-zinc-200 dark:bg-zinc-800 rounded-lg p-0.5">
                    <button onClick={() => updateLayer(selectedId, { zIndex: (selectedLayer.zIndex || 0) - 1 })} className="w-7 h-7 flex items-center justify-center rounded hover:bg-white dark:hover:bg-zinc-700 shadow-sm"><ChevronDown className="w-4 h-4" /></button>
                    <span className="w-8 flex items-center justify-center text-xs font-mono font-bold">{selectedLayer.zIndex}</span>
                    <button onClick={() => updateLayer(selectedId, { zIndex: (selectedLayer.zIndex || 0) + 1 })} className="w-7 h-7 flex items-center justify-center rounded hover:bg-white dark:hover:bg-zinc-700 shadow-sm"><ChevronUp className="w-4 h-4" /></button>
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => duplicateLayer(selectedId)} className="w-8 h-8 flex items-center justify-center rounded-lg bg-zinc-200 dark:bg-zinc-800 hover:bg-zinc-300 dark:hover:bg-zinc-700 transition-colors"><Copy className="w-4 h-4 text-zinc-700 dark:text-zinc-300" /></button>
                    <button onClick={() => removeLayer(selectedId)} className="w-8 h-8 flex items-center justify-center rounded-lg bg-red-100 dark:bg-red-900/30 hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors"><Trash className="w-4 h-4 text-red-600 dark:text-red-400" /></button>
                  </div>
                </div>
             )}

             <div className="flex-1 overflow-y-auto custom-scrollbar">
                {activePanel === 'props' && renderPropsPanel()}
                {activePanel === 'bg' && renderBgPanel()}
                {activePanel === 'info' && renderInfoPanel()}
                {/* Fallback */}
                {(activePanel === 'elements' || activePanel === 'layers') && renderPropsPanel()}
             </div>
          </div>

          {/* --- MOBILE BOTTOM TABS & SHEET --- */}
          <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 pointer-events-none flex flex-col justify-end h-full">
            
            {/* Overlay for Bottom Sheet */}
            {isMobilePanelOpen && (
              <div className="absolute inset-0 bg-black/20 dark:bg-black/40 backdrop-blur-sm pointer-events-auto transition-opacity" onClick={() => setIsMobilePanelOpen(false)} />
            )}

            {/* Slide-up Sheet */}
            <div className={cn("bg-white dark:bg-zinc-950 rounded-t-3xl shadow-[0_-10px_40px_rgba(0,0,0,0.1)] dark:shadow-[0_-10px_40px_rgba(0,0,0,0.5)] border-t border-zinc-200 dark:border-zinc-800 transition-transform duration-300 ease-out pointer-events-auto flex flex-col max-h-[70vh]", isMobilePanelOpen ? "translate-y-0" : "translate-y-full")}>
              {/* Drag Handle & Close */}
              <div className="flex items-center justify-between px-6 py-3 border-b border-zinc-200 dark:border-zinc-800 shrink-0">
                <span className="text-sm font-black uppercase tracking-wider">{activePanel === 'elements' ? 'Tambah Elemen' : activePanel === 'layers' ? 'Layer Kanvas' : activePanel === 'props' ? 'Properti Objek' : activePanel === 'bg' ? 'Latar Belakang' : 'Detail Banner'}</span>
                <button onClick={() => setIsMobilePanelOpen(false)} className="w-8 h-8 bg-zinc-100 dark:bg-zinc-900 rounded-full flex items-center justify-center"><X className="w-4 h-4" /></button>
              </div>
              
              {/* Quick action bar for Props in mobile */}
              {activePanel === 'props' && selectedLayer && (
                 <div className="flex items-center justify-between px-4 py-2 border-b border-zinc-200 dark:border-zinc-800 shrink-0 overflow-x-auto gap-2">
                    <button onClick={() => duplicateLayer(selectedId)} className="shrink-0 h-8 px-3 rounded bg-zinc-100 dark:bg-zinc-800 text-xs font-bold flex items-center gap-2"><Copy className="w-3.5 h-3.5"/> Duplikat</button>
                    <button onClick={() => removeLayer(selectedId)} className="shrink-0 h-8 px-3 rounded bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 text-xs font-bold flex items-center gap-2"><Trash className="w-3.5 h-3.5"/> Hapus</button>
                    <div className="flex bg-zinc-100 dark:bg-zinc-800 rounded p-0.5 shrink-0">
                      <button onClick={() => updateLayer(selectedId, { zIndex: (selectedLayer.zIndex || 0) - 1 })} className="w-7 h-7 flex items-center justify-center"><ChevronDown className="w-4 h-4" /></button>
                      <span className="w-6 flex items-center justify-center text-[10px] font-mono font-bold">Z</span>
                      <button onClick={() => updateLayer(selectedId, { zIndex: (selectedLayer.zIndex || 0) + 1 })} className="w-7 h-7 flex items-center justify-center"><ChevronUp className="w-4 h-4" /></button>
                    </div>
                 </div>
              )}

              {/* Scrollable Content */}
              <div className="flex-1 overflow-y-auto custom-scrollbar pb-8">
                {activePanel === 'elements' && renderElementsPanel()}
                {activePanel === 'layers' && renderLayersPanel()}
                {activePanel === 'props' && renderPropsPanel()}
                {activePanel === 'bg' && renderBgPanel()}
                {activePanel === 'info' && renderInfoPanel()}
              </div>
            </div>

            {/* Bottom Tab Bar */}
            <div className="h-16 bg-white dark:bg-zinc-950 border-t border-zinc-200 dark:border-zinc-800 flex items-center justify-around shrink-0 pointer-events-auto pb-safe">
               {[
                 { id: 'elements', icon: Plus, label: 'Tambah' },
                 { id: 'layers', icon: Layers, label: 'Layer' },
                 { id: 'props', icon: SlidersHorizontal, label: 'Edit' },
                 { id: 'bg', icon: ImageIcon, label: 'Latar' },
                 { id: 'info', icon: Layout, label: 'Detail' }
               ].map(tab => (
                 <button key={tab.id} onClick={() => { setActivePanel(tab.id); setIsMobilePanelOpen(true); }}
                   className={cn("flex flex-col items-center justify-center w-16 h-full gap-1 transition-colors", activePanel === tab.id && isMobilePanelOpen ? "text-blue-600 dark:text-blue-400" : "text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200")}>
                   <tab.icon className={cn("w-5 h-5", activePanel === tab.id && isMobilePanelOpen && "scale-110 transition-transform")} />
                   <span className="text-[9px] font-bold">{tab.label}</span>
                 </button>
               ))}
            </div>
          </div>

        </div>
      </div>
    );
  }

  // ============================================================================
  // RENDER MAIN LIST
  // ============================================================================
  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-[#09090b] text-zinc-900 dark:text-zinc-100 p-4 sm:p-8 md:p-12 transition-colors duration-300">
      
      <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in duration-500">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-6 bg-white dark:bg-zinc-900 p-6 rounded-3xl shadow-sm border border-zinc-200 dark:border-zinc-800">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-2xl flex items-center justify-center">
                <Sparkles className="w-6 h-6" />
              </div>
              <h2 className="text-3xl font-black tracking-tight">Manajer Banner</h2>
            </div>
            <p className="text-zinc-500 dark:text-zinc-400">Buat desain banner interaktif langsung di peramban.</p>
          </div>
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <Button variant="primary" size="lg" onClick={() => openEditor()} className="rounded-2xl flex-1 sm:flex-none shadow-blue-500/25">
              <Plus className="w-5 h-5 mr-2" /> Buat Banner Baru
            </Button>
          </div>
        </div>

        {/* Content List */}
        {banners.length === 0 ? (
          <div className="bg-white dark:bg-zinc-900 border-2 border-dashed border-zinc-200 dark:border-zinc-800 rounded-3xl p-16 flex flex-col items-center justify-center text-center">
            <div className="w-24 h-24 bg-zinc-100 dark:bg-zinc-800 rounded-full flex items-center justify-center mb-6">
              <Layout className="w-12 h-12 text-zinc-400" strokeWidth={1.5} />
            </div>
            <h3 className="text-2xl font-black mb-2">Kanvas Kosong</h3>
            <p className="text-zinc-500 dark:text-zinc-400 max-w-sm mb-8">Belum ada banner yang dibuat. Klik tombol di atas untuk memulai mahakarya Anda!</p>
            <Button variant="primary" onClick={() => openEditor()} className="rounded-full px-8 shadow-lg">Mulai Desain</Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {banners.map(b => (
              <Card key={b.id} className="overflow-hidden flex flex-col hover:shadow-xl transition-all duration-300 border-2 hover:border-blue-500/50">
                
                {/* Visual Preview */}
                <div className="aspect-[21/9] w-full relative bg-zinc-950 overflow-hidden shrink-0 border-b border-zinc-200 dark:border-zinc-800"
                  style={{ background: b.bgType === 'solid' ? b.bgColor : b.bgType === 'gradient' ? b.bgGradient : undefined }}>
                  
                  {b.imageUrl && (
                    <div className="absolute inset-0 z-0">
                      <img src={b.imageUrl} alt="Banner" className="w-full h-full object-cover" style={{ filter: `brightness(${b.canvasBgFilter?.brightness || 100}%) blur(${b.canvasBgFilter?.blur || 0}px)` }} />
                    </div>
                  )}

                  <div className="absolute inset-0 pointer-events-none transform origin-top-left" style={{ transform: 'scale(0.5)', width: '200%', height: '200%' }}>
                    {(b.canvasLayers || []).filter(l => l.visible).sort((a, b) => a.zIndex - b.zIndex).map(layer => {
                      if (layer.type === 'text') {
                        return (
                          <div key={layer.id} style={{ position: 'absolute', left: `${layer.x}%`, top: `${layer.y}%`, transform: 'translate(-50%, -50%)', zIndex: layer.zIndex, opacity: layer.opacity / 100, width: `${layer.width}%` }}>
                            <p style={{
                              fontSize: `${layer.fontSize}px`, fontWeight: layer.fontWeight, fontStyle: layer.fontStyle, textAlign: layer.textAlign, color: layer.color, letterSpacing: `${layer.letterSpacing}px`, lineHeight: layer.lineHeight, fontFamily: layer.fontFamily, textDecoration: layer.textDecoration, textTransform: layer.uppercase ? 'uppercase' : 'none', padding: `${layer.padding}px`, borderRadius: `${layer.borderRadius}px`, backgroundColor: layer.bgOpacity > 0 ? `${layer.bgColor}${Math.round(layer.bgOpacity * 2.55).toString(16).padStart(2, '0')}` : 'transparent',
            border: (layer.borderWidth && layer.borderWidth > 0) ? `${layer.borderWidth}px ${layer.borderStyle} ${layer.borderColor}` : undefined, textShadow: layer.shadow ? '0 4px 16px rgba(0,0,0,0.8)' : undefined, margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word', transform: `rotate(${layer.rotate}deg)`,
                            }}>{layer.content}</p>
                          </div>
                        );
                      }
                      if (layer.type === 'image') {
                        return (
                          <div key={layer.id} style={{ position: 'absolute', left: `${layer.x}%`, top: `${layer.y}%`, transform: 'translate(-50%, -50%)', zIndex: layer.zIndex, opacity: layer.opacity / 100, width: `${layer.width}%` }}>
                            <img src={layer.src} style={{ width: '100%', height: 'auto', transform: `rotate(${layer.rotate}deg) scaleX(${layer.flipX ? -1 : 1}) scaleY(${layer.flipY ? -1 : 1})`, borderRadius: `${layer.borderRadius}px`, mixBlendMode: layer.mixBlendMode }} alt="" />
                          </div>
                        );
                      }
                      return null;
                    })}
                  </div>
                  
                  {/* Status Overlay */}
                  <div className="absolute top-4 right-4 flex gap-2">
                     <Badge variant={b.isActive ? "success" : "default"} className="shadow-lg backdrop-blur-md bg-white/90 dark:bg-zinc-900/90 text-xs">
                       {b.isActive ? 'Sedang Tayang' : 'Disembunyikan'}
                     </Badge>
                  </div>
                </div>

                {/* Info & Actions */}
                <div className="p-6 flex flex-col flex-1 bg-white dark:bg-zinc-950">
                  <div className="flex items-center gap-2 mb-3">
                    <Badge variant="primary" className="text-[10px] uppercase px-2">{b.type}</Badge>
                    <span className="text-xs font-bold text-zinc-400">{b.canvasLayers?.length || 0} Layer</span>
                  </div>
                  <h4 className="text-xl font-black mb-2 line-clamp-1">{b.title || '(Tanpa Judul)'}</h4>
                  <p className="text-sm text-zinc-500 dark:text-zinc-400 line-clamp-2 mb-6 flex-1">{b.description || 'Tidak ada deskripsi'}</p>
                  
                  <div className="flex items-center justify-between pt-4 border-t border-zinc-100 dark:border-zinc-800">
                    <div className="flex items-center gap-3">
                       <Switch checked={b.isActive} onCheckedChange={() => handleToggleActive(b.id, b.isActive)} />
                       <span className="text-xs font-bold text-zinc-500">Tampil</span>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="ghost" size="icon" className="rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-500 hover:text-blue-600" onClick={() => openEditor(b)}>
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="rounded-xl hover:bg-red-50 dark:hover:bg-red-900/20 text-zinc-500 hover:text-red-500" onClick={() => setDeleteBannerId(b.id)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Modern Delete Dialog */}
      {deleteBannerId && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center px-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-zinc-900 w-full max-w-md rounded-[2rem] p-8 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 text-red-500 rounded-2xl flex items-center justify-center mb-6 mx-auto">
              <Trash2 className="w-8 h-8" />
            </div>
            <h3 className="text-2xl font-black text-center mb-2">Hapus Banner?</h3>
            <p className="text-center text-zinc-500 dark:text-zinc-400 mb-8">
              Aksi ini tidak dapat dibatalkan. Semua layer dan desain akan terhapus secara permanen.
            </p>
            <div className="flex gap-3">
              <Button variant="secondary" className="flex-1 rounded-2xl h-12" onClick={() => setDeleteBannerId(null)}>Batal</Button>
              <Button variant="danger" className="flex-1 rounded-2xl h-12" onClick={handleDeleteBanner}>Ya, Hapus</Button>
            </div>
          </div>
        </div>
      )}
      
      {/* Global Style overrides */}
      <style dangerouslySetInnerHTML={{__html:`
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background-color: rgba(150,150,150,0.3); border-radius: 10px; }
        .pb-safe { padding-bottom: env(safe-area-inset-bottom, 0px); }
      `}} />
    </div>
  );
}
