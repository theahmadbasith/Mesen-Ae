import React, { useState, useRef, useCallback, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

import {
  Plus, Edit2, Trash2, Image as ImageIcon, Sparkles,
  RotateCcw, RotateCw, FlipHorizontal, X, Bold,
  Type, Palette, Layers, Layout,
  ChevronDown, ChevronUp, Check, SlidersHorizontal,
  ChevronLeft, Trash, Undo2, Redo2
} from 'lucide-react';
import { toast } from 'sonner';

import { useDbQuery, dbInsert, dbUpdate, dbDelete, dbUploadFile } from '@/hooks/db-hooks';
import { compressImage } from '@/lib/image-utils';
import PhotoCropModal from '@/admin/components/PhotoCropModal';

// ============================================================================
// 2. CONSTANTS
// ============================================================================

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

const cn = (...classes) => classes.filter(Boolean).join(' ');

// ============================================================================
// 3. UI COMPONENTS
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
  <label className={cn("text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400 block mb-1.5", className)} {...props}>{children}</label>
);

const Switch = ({ checked, onCheckedChange }) => (
  <button type="button" role="switch" aria-checked={checked} onClick={() => onCheckedChange(!checked)}
    className={cn("relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2", checked ? "bg-blue-600" : "bg-zinc-300 dark:bg-zinc-700")}>
    <span className={cn("pointer-events-none block h-5 w-5 rounded-full bg-white shadow-lg ring-0 transition-transform", checked ? "translate-x-5" : "translate-x-0")} />
  </button>
);

const Slider = ({ value, min, max, step = 1, onValueChange, onPointerUp, className }) => (
  <input type="range" min={min} max={max} step={step} value={value[0]} onChange={(e) => onValueChange([parseFloat(e.target.value)])} onPointerUp={onPointerUp}
    className={cn("w-full h-2 bg-zinc-200 dark:bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-blue-600", className)} />
);

const Badge = ({ children, variant = 'default', className }) => {
  const variants = {
    default: "bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100",
    primary: "bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300",
    success: "bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300",
  };
  return <span className={cn("inline-flex items-center rounded-md px-2 py-1 text-xs font-normal ring-1 ring-inset ring-zinc-500/20", variants[variant], className)}>{children}</span>;
}

const Card = ({ children, className }) => (
  <div className={cn("rounded-3xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-zinc-950 dark:text-zinc-50 shadow-sm", className)}>{children}</div>
);

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

function ColorPicker({ value, onChange }) {
  return (
    <div className="space-y-2">
      {/* Quick-access swatches – scrollable single row */}
      <div className="flex gap-1 overflow-x-auto pb-1 hide-scrollbar">
        {COLOR_PALETTE.map(c => (
          <button key={c} onClick={() => onChange(c)}
            style={{ backgroundColor: c }}
            className={cn(
              "shrink-0 w-6 h-6 rounded-full border-2 transition-all hover:scale-110",
              value?.toUpperCase() === c.toUpperCase()
                ? 'border-blue-500 scale-110 ring-2 ring-blue-400/40'
                : 'border-white/30 dark:border-zinc-600'
            )}
          />
        ))}
      </div>
      {/* Hex input + native color picker */}
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={value || '#000000'}
          onChange={e => onChange(e.target.value)}
          className="w-9 h-9 p-0.5 rounded-lg border border-zinc-300 dark:border-zinc-600 cursor-pointer bg-transparent shrink-0"
        />
        <Input
          value={value || ''}
          onChange={e => onChange(e.target.value)}
          className="h-9 text-xs font-mono uppercase"
          placeholder="#000000"
        />
      </div>
    </div>
  );
}

function SliderRow({ label, value, min, max, step = 1, unit = '', defaultValue, onChange, onPointerUp }) {
  const handleDoubleClick = () => {
    if (defaultValue !== undefined) {
      onChange(defaultValue);
      toast.info(`Reset ke ${defaultValue}${unit}`);
      setTimeout(() => onPointerUp?.(), 50);
    }
  };
  return (
    <div className="space-y-1.5">
      <div className="flex justify-between items-center select-none">
        <span className="text-[10px] font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">{label}</span>
        <span className="text-[11px] font-mono text-zinc-700 dark:text-zinc-300 bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 rounded-md">{value}{unit}</span>
      </div>
      <div onDoubleClick={handleDoubleClick} title="Double-click untuk reset">
        <Slider value={[value]} min={min} max={max} step={step} onValueChange={([v]) => onChange(v)} onPointerUp={onPointerUp} />
      </div>
    </div>
  );
}

function RichTextEditor({ value, onChange, placeholder, minHeight = '36px' }) {
  const editorRef = useRef(null);
  useEffect(() => {
    if (editorRef.current && document.activeElement !== editorRef.current) {
      editorRef.current.innerHTML = value || '';
    }
  }, [value]);
  const applyFormat = (cmd) => {
    editorRef.current?.focus();
    document.execCommand(cmd, false, null);
    onChange(editorRef.current?.innerHTML || '');
  };
  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-0.5 p-1 bg-zinc-100 dark:bg-zinc-800 rounded-lg border border-zinc-200 dark:border-zinc-700">
        {[{ cmd: 'bold', label: 'B', cls: 'font-bold' }, { cmd: 'italic', label: 'I', cls: 'italic' }, { cmd: 'underline', label: 'U', cls: 'underline' }].map(({ cmd, label, cls }) => (
          <button key={cmd} type="button"
            onMouseDown={e => { e.preventDefault(); applyFormat(cmd); }}
            className={cn('w-7 h-7 rounded text-sm flex items-center justify-center transition-colors text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700', cls)}
          >{label}</button>
        ))}
      </div>
      <div
        ref={editorRef}
        contentEditable
        suppressContentEditableWarning
        onInput={e => onChange(e.currentTarget.innerHTML)}
        style={{ minHeight }}
        className="w-full rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500 rte-placeholder transition-all"
        data-placeholder={placeholder}
      />
    </div>
  );
}

// ============================================================================
// 4. MAIN COMPONENT
// ============================================================================


export default function BannerEditor() {
  // --- Data Stores ---
  const banners = useDbQuery('banners');
  const products = useDbQuery('products');
  const storeSettingsList = useDbQuery('storeSettings') ?? [];
  const storeSettings = storeSettingsList[0] || null;

  // --- Screens ---
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const hasInitialized = useRef(false);
  const [editBanner, setEditBanner] = useState(null);
  const [deleteBannerId, setDeleteBannerId] = useState(null);

  // --- Form & Canvas Unified State ---
  const [bannerType, setBannerType] = useState('custom');
  const [bannerProductId, setBannerProductId] = useState('');
  const [bannerLink, setBannerLink] = useState('');
  const [bannerIsActive, setBannerIsActive] = useState(true);
  const [bannerBgType, setBannerBgType] = useState('gradient');
  const [bannerBgColor, setBannerBgColor] = useState('#1E293B');
  const [bannerGradientLeft, setBannerGradientLeft] = useState('#0061ff');
  const [bannerGradientRight, setBannerGradientRight] = useState('#60efff');
  const [bannerGradientAngle, setBannerGradientAngle] = useState(135);
  const [bannerImage, setBannerImage] = useState(null);
  
  // Badge Style & Heading Style
  const [bannerBadgeStyle, setBannerBadgeStyle] = useState('solid');
  const [bannerHeadingStyle, setBannerHeadingStyle] = useState('glass');

  const [bannerHeading, setBannerHeading] = useState('SPESIAL PENAWARAN');
  const [bannerTitle, setBannerTitle] = useState('Promo Berkah Idul Adha');
  const [bannerDescription, setBannerDescription] = useState('Nikmati Keberkahan Idul Adha Promo Diskon 75% Dengan Kode Voucher BASITH');
  const [bannerButtonText, setBannerButtonText] = useState('Lihat Detail');

  const [bannerOverlayImageUrl, setBannerOverlayImageUrl] = useState(null);
  const [bannerOverlayFlipX, setBannerOverlayFlipX] = useState(false);
  const [bannerOverlayRotate, setBannerOverlayRotate] = useState(0);
  const [bannerOverlayScale, setBannerOverlayScale] = useState(1);
  const [bannerOverlayBorderRadius, setBannerOverlayBorderRadius] = useState(0);

  // Canvas Grid & Magnet Snap
  const [showGrid, setShowGrid] = useState(false);
  const [snapEnabled, setSnapEnabled] = useState(true);
  const [activeSnapX, setActiveSnapX] = useState(null);
  const [activeSnapY, setActiveSnapY] = useState(null);

  // Canvas coordinates
  const [layers, setLayers] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [zoom, setZoom] = useState(100);
  const [bgFilter, setBgFilter] = useState({ brightness: 100, contrast: 100, saturate: 100, blur: 0 });
  const [overlayFilter, setOverlayFilter] = useState({ brightness: 100, contrast: 100, saturate: 100, blur: 0 });

  // Background Gradient Overlay (Adjustable dark overlay)
  const [bgGradientOverlayEnabled, setBgGradientOverlayEnabled] = useState(false);
  const [bgGradientOverlayColor, setBgGradientOverlayColor] = useState('#000000');
  const [bgGradientOverlayOpacityLeft, setBgGradientOverlayOpacityLeft] = useState(70);
  const [bgGradientOverlayOpacityRight, setBgGradientOverlayOpacityRight] = useState(0);
  const [bgGradientOverlayAngle, setBgGradientOverlayAngle] = useState(90);

  // Undo / Redo History states
  const [history, setHistory] = useState([]);
  const [historyIndex, setHistoryIndex] = useState(-1);


  // Mobile drawer
  const [isMobilePanelOpen, setIsMobilePanelOpen] = useState(false);

  // --- Crop State ---
  const [cropBgFile, setCropBgFile] = useState<File | null>(null);
  const [cropBgOpen, setCropBgOpen] = useState(false);

  const canvasRef = useRef(null);
  const bgFileInputRef = useRef(null);
  const overlayFileInputRef = useRef(null);
  const dragState = useRef(null);

  const getSnapshot = () => ({
    heading: bannerHeading,
    headingStyle: bannerHeadingStyle,
    title: bannerTitle,
    description: bannerDescription,
    buttonText: bannerButtonText,
    badgeStyle: bannerBadgeStyle,
    link: bannerLink,
    type: bannerType,
    productId: bannerProductId,
    bgType: bannerBgType,
    bgColor: bannerBgColor,
    gradientLeft: bannerGradientLeft,
    gradientRight: bannerGradientRight,
    gradientAngle: bannerGradientAngle,
    image: bannerImage,
    overlayImageUrl: bannerOverlayImageUrl,
    overlayFlipX: bannerOverlayFlipX,
    overlayRotate: bannerOverlayRotate,
    overlayScale: bannerOverlayScale,
    overlayBorderRadius: bannerOverlayBorderRadius,
    bgFilter,
    overlayFilter,
    bgGradientOverlay: {
      enabled: bgGradientOverlayEnabled,
      color: bgGradientOverlayColor,
      opacityLeft: bgGradientOverlayOpacityLeft,
      opacityRight: bgGradientOverlayOpacityRight,
      angle: bgGradientOverlayAngle
    },
    layers
  });

  const restoreSnapshot = (snap) => {
    if (!snap) return;
    setBannerHeading(snap.heading);
    setBannerHeadingStyle(snap.headingStyle);
    setBannerTitle(snap.title);
    setBannerDescription(snap.description);
    setBannerButtonText(snap.buttonText);
    setBannerBadgeStyle(snap.badgeStyle);
    setBannerLink(snap.link);
    setBannerType(snap.type);
    setBannerProductId(snap.productId);
    setBannerBgType(snap.bgType);
    setBannerBgColor(snap.bgColor);
    setBannerGradientLeft(snap.gradientLeft);
    setBannerGradientRight(snap.gradientRight);
    setBannerGradientAngle(snap.gradientAngle);
    setBannerImage(snap.image);
    setBannerOverlayImageUrl(snap.overlayImageUrl);
    setBannerOverlayFlipX(snap.overlayFlipX);
    setBannerOverlayRotate(snap.overlayRotate);
    setBannerOverlayScale(snap.overlayScale);
    setBannerOverlayBorderRadius(snap.overlayBorderRadius ?? 0);
    setBgFilter(snap.bgFilter);
    setOverlayFilter(snap.overlayFilter);
    if (snap.bgGradientOverlay) {
      setBgGradientOverlayEnabled(snap.bgGradientOverlay.enabled);
      setBgGradientOverlayColor(snap.bgGradientOverlay.color);
      setBgGradientOverlayOpacityLeft(snap.bgGradientOverlay.opacityLeft);
      setBgGradientOverlayOpacityRight(snap.bgGradientOverlay.opacityRight);
      setBgGradientOverlayAngle(snap.bgGradientOverlay.angle);
    }
    setLayers(snap.layers);
  };

  const pushHistory = (customSnap = null) => {
    const snap = customSnap || getSnapshot();
    setHistory(prev => {
      const nextHistory = prev.slice(0, historyIndex + 1);
      if (nextHistory.length > 0 && JSON.stringify(nextHistory[nextHistory.length - 1]) === JSON.stringify(snap)) {
        return prev;
      }
      const updated = [...nextHistory, snap];
      setHistoryIndex(updated.length - 1);
      return updated;
    });
  };

  const handleUndo = useCallback(() => {
    if (historyIndex > 0) {
      const prevIndex = historyIndex - 1;
      setHistoryIndex(prevIndex);
      restoreSnapshot(history[prevIndex]);
      toast.info('Undo berhasil');
    }
  }, [history, historyIndex]);

  const handleRedo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      const nextIndex = historyIndex + 1;
      setHistoryIndex(nextIndex);
      restoreSnapshot(history[nextIndex]);
      toast.info('Redo berhasil');
    }
  }, [history, historyIndex]);

  const hexToRgb = (hex) => {
    if (!hex) return '0, 0, 0';
    const cleanHex = hex.startsWith('#') ? hex.slice(1) : hex;
    const r = parseInt(cleanHex.slice(0, 2), 16) || 0;
    const g = parseInt(cleanHex.slice(2, 4), 16) || 0;
    const b = parseInt(cleanHex.slice(4, 6), 16) || 0;
    return `${r}, ${g}, ${b}`;
  };

  // --- Product Auto Overlay Binding ---

  const handleProductSelect = useCallback((prodId) => {
    setBannerProductId(prodId);
    if (!prodId) {
      setBannerOverlayImageUrl(null);
      return;
    }
    const prod = products?.find(p => String(p.id) === String(prodId));
    if (prod) {
      if (prod.photo) {
        setBannerOverlayImageUrl(prod.photo);
        toast.success(`Gambar produk "${prod.name}" berhasil dijadikan overlay!`);
      } else {
        toast.warning(`Produk "${prod.name}" tidak memiliki foto.`);
        setBannerOverlayImageUrl(null);
      }
    }
  }, [products]);

  const handleBannerTypeChange = useCallback((type) => {
    setBannerType(type);
    if (type !== 'menu') {
      setBannerOverlayImageUrl(null);
      setBannerProductId('');
    }
  }, []);

  // --- Delta-Based Pointer Down Dragging Handler with Snapping ---
  const onLayerPointerDown = (e, id) => {
    e.stopPropagation();
    const layer = layers.find(l => l.id === id);
    if (!layer) return;

    setSelectedId(id);

    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();

    // Record initial coordinates and positions to calculate delta shift
    dragState.current = { id, startX: e.clientX, startY: e.clientY, origX: layer.x, origY: layer.y };

    const onMove = (me) => {
      if (!dragState.current) return;
      if (me.cancelable) me.preventDefault();

      // Relative delta shifts based on canvas dimension
      const dx = (me.clientX - dragState.current.startX) / rect.width * 100;
      const dy = (me.clientY - dragState.current.startY) / rect.height * 100;
      
      let nx = dragState.current.origX + dx;
      let ny = dragState.current.origY + dy;

      let snappedX = null;
      let snappedY = null;

      // Magnetic Snapping thresholds
      if (snapEnabled) {
        const snapPoints = [8, 50, 92];
        const threshold = 1.6; // tolerant snap offset percentage

        for (const pt of snapPoints) {
          if (Math.abs(nx - pt) < threshold) {
            nx = pt;
            snappedX = pt;
          }
          if (Math.abs(ny - pt) < threshold) {
            ny = pt;
            snappedY = pt;
          }
        }
      }

      // Border constraints
      if (nx < 0) nx = 0; if (nx > 100) nx = 100;
      if (ny < 0) ny = 0; if (ny > 100) ny = 100;

      nx = Math.round(nx * 10) / 10;
      ny = Math.round(ny * 10) / 10;

      setActiveSnapX(snappedX);
      setActiveSnapY(snappedY);

      setLayers(prev => prev.map(l => l.id === id ? { ...l, x: nx, y: ny } : l));
    };

    const onUp = () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      dragState.current = null;
      setActiveSnapX(null);
      setActiveSnapY(null);
    };

    window.addEventListener('pointermove', onMove, { passive: false });
    window.addEventListener('pointerup', onUp);
  };

  // --- Text Box Width Resize Handler ---
  const onResizePointerDown = (e, id) => {
    e.stopPropagation();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const layer = layers.find(l => l.id === id);
    if (!layer) return;
    const startX = e.clientX;
    const startW = layer.w ?? 55;
    const onMove = (me) => {
      if (me.cancelable) me.preventDefault();
      const dx = (me.clientX - startX) / rect.width * 100;
      const nw = Math.round(Math.max(10, Math.min(92, startW + dx)) * 10) / 10;
      setLayers(prev => prev.map(l => l.id === id ? { ...l, w: nw } : l));
    };
    const onUp = () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      pushHistory();
    };
    window.addEventListener('pointermove', onMove, { passive: false });
    window.addEventListener('pointerup', onUp);
  };

  // --- Background/Image Handlers ---
  const handleBgImageSelect = (e: any) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCropBgFile(file);
    setCropBgOpen(true);
    if (bgFileInputRef.current) bgFileInputRef.current.value = '';
  };

  const handleBgCropSuccess = async (croppedDataUrl: string) => {
    setCropBgOpen(false);
    setBannerImage(croppedDataUrl);
    toast.success("Gambar background berhasil ditambahkan!");
    setCropBgFile(null);

    // Background compression & upload
    try {
      const res = await fetch(croppedDataUrl);
      const blob = await res.blob();
      const compressedDataUrl = await compressImage(blob, 0.5);
      const url = await dbUploadFile('banners', `bg_${Date.now()}`, compressedDataUrl);
      if (url) {
        setBannerImage(url); // Swap to Cloudinary URL
      }
    } catch (e) {
      console.error("Background upload error", e);
    }
  };

  const handleAddImageFile = (e: any) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async ev => {
      const dataUrl = ev.target?.result as string;
      setBannerOverlayImageUrl(dataUrl);
      toast.success("Gambar stiker overlay berhasil ditambahkan!");

      // Background compression & upload
      try {
        const res = await fetch(dataUrl);
        const blob = await res.blob();
        const compressedDataUrl = await compressImage(blob, 0.5);
        const url = await dbUploadFile('banners', `overlay_${Date.now()}`, compressedDataUrl);
        if (url) {
          setBannerOverlayImageUrl(url); // Swap to Cloudinary URL
        }
      } catch (err) {
        console.error("Overlay upload error", err);
      }
    };
    reader.readAsDataURL(file);
    if (overlayFileInputRef.current) overlayFileInputRef.current.value = '';
  };

  // --- Editor Open/Close ---
  function openEditor(banner = null) {
    if (banner) {
      setEditBanner(banner);
      setBannerType(banner.type || 'custom');
      setBannerProductId(banner.productId ? String(banner.productId) : '');
      setBannerLink(banner.link || '');
      setBannerIsActive(banner.isActive !== false);
      setBannerBgType(banner.bgType || 'gradient');
      setBannerBgColor(banner.bgColor || '#1E293B');

      let gradientLeftVal = '#0061ff';
      let gradientRightVal = '#60efff';
      let gradientAngleVal = 135;

      if (banner.bgGradient) {
        const match = banner.bgGradient.match(/linear-gradient\((\d+)deg,\s*(.+?),\s*(.+?)\)/);
        if (match) {
          gradientAngleVal = Number(match[1]);
          gradientLeftVal = match[2];
          gradientRightVal = match[3];
        }
      }
      setBannerGradientLeft(gradientLeftVal);
      setBannerGradientRight(gradientRightVal);
      setBannerGradientAngle(gradientAngleVal);

      setBannerImage(banner.imageUrl || null);
      const bgFilterVal = banner.canvasBgFilter || { brightness: 100, contrast: 100, saturate: 100, blur: 0 };
      setBgFilter(bgFilterVal);

      const overlayFilterVal = banner.canvasOverlayFilter || { brightness: 100, contrast: 100, saturate: 100, blur: 0 };
      setOverlayFilter(overlayFilterVal);

      const overlayGradient = banner.bgGradientOverlay || { enabled: false, color: '#000000', opacityLeft: 70, opacityRight: 0, angle: 90 };
      setBgGradientOverlayEnabled(overlayGradient.enabled || false);
      setBgGradientOverlayColor(overlayGradient.color || '#000000');
      setBgGradientOverlayOpacityLeft(overlayGradient.opacityLeft !== undefined ? overlayGradient.opacityLeft : 70);
      setBgGradientOverlayOpacityRight(overlayGradient.opacityRight !== undefined ? overlayGradient.opacityRight : 0);
      setBgGradientOverlayAngle(overlayGradient.angle !== undefined ? overlayGradient.angle : 90);

      // Direct values
      setBannerHeading(banner.heading || '');
      setBannerTitle(banner.title || '');
      setBannerDescription(banner.description || '');
      setBannerButtonText(banner.buttonText || '');
      setBannerBadgeStyle(banner.badgeStyle || 'solid');
      setBannerHeadingStyle(banner.headingStyle || 'glass');

      setBannerOverlayImageUrl(banner.overlayImageUrl || null);
      setBannerOverlayFlipX(banner.overlayFlipX || false);
      setBannerOverlayRotate(banner.overlayRotate || 0);
      setBannerOverlayScale(banner.overlayScale ?? 1);
      setBannerOverlayBorderRadius(banner.overlayBorderRadius ?? 0);

      // Coordinates
      const headingP = banner.headingPos ?? { x: 10, y: 20, w: 40 };
      const titleP = banner.titlePos ?? { x: 10, y: 38, w: 60 };
      const descP = banner.descPos ?? { x: 10, y: 60, w: 60 };
      const buttonP = banner.buttonPos ?? { x: 10, y: 82 };
      const overP = banner.overlayPos ?? { x: 80, y: 50 };

      const loadedLayers = [
        { id: 'heading-box', role: 'heading-box', x: headingP.x, y: headingP.y, w: headingP.w ?? 40, zIndex: 10, visible: true },
        { id: 'title-box', role: 'title-box', x: titleP.x, y: titleP.y, w: titleP.w ?? 60, zIndex: 10, visible: true },
        { id: 'desc-box', role: 'desc-box', x: descP.x, y: descP.y, w: descP.w ?? 60, zIndex: 10, visible: true },
        { id: 'button-box', role: 'button-box', x: buttonP.x, y: buttonP.y, zIndex: 10, visible: true },
        { id: 'overlay-image', role: 'overlay-image', x: overP.x, y: overP.y, zIndex: 5, visible: true }
      ];
      setLayers(loadedLayers);

      // Set initial Undo/Redo state
      const initialSnapshot = {
        heading: banner.heading || '',
        headingStyle: banner.headingStyle || 'glass',
        title: banner.title || '',
        description: banner.description || '',
        buttonText: banner.buttonText || '',
        badgeStyle: banner.badgeStyle || 'solid',
        link: banner.link || '',
        type: banner.type || 'custom',
        productId: banner.productId ? String(banner.productId) : '',
        bgType: banner.bgType || 'gradient',
        bgColor: banner.bgColor || '#1E293B',
        gradientLeft: gradientLeftVal,
        gradientRight: gradientRightVal,
        gradientAngle: gradientAngleVal,
        image: banner.imageUrl || null,
        overlayImageUrl: banner.overlayImageUrl || null,
        overlayFlipX: banner.overlayFlipX || false,
        overlayRotate: banner.overlayRotate || 0,
        overlayScale: banner.overlayScale ?? 1,
        bgFilter: bgFilterVal,
        overlayFilter: overlayFilterVal,
        bgGradientOverlay: overlayGradient,
        layers: loadedLayers
      };
      setHistory([initialSnapshot]);
      setHistoryIndex(0);
    } else {
      setEditBanner(null);
      setBannerType('custom');
      setBannerProductId('');
      setBannerLink('');
      setBannerIsActive(true);
      setBannerBgType('gradient');
      setBannerBgColor('#1E293B');
      setBannerGradientLeft('#0061ff');
      setBannerGradientRight('#60efff');
      setBannerGradientAngle(135);
      setBannerImage(null);
      setBgFilter({ brightness: 100, contrast: 100, saturate: 100, blur: 0 });
      setOverlayFilter({ brightness: 100, contrast: 100, saturate: 100, blur: 0 });
      setBgGradientOverlayEnabled(false);
      setBgGradientOverlayColor('#000000');
      setBgGradientOverlayOpacityLeft(70);
      setBgGradientOverlayOpacityRight(0);
      setBgGradientOverlayAngle(90);

      setBannerHeading('SPESIAL PENAWARAN');
      setBannerTitle('Promo Berkah Idul Adha');
      setBannerDescription('Nikmati Keberkahan Idul Adha Promo Diskon 75% Dengan Kode Voucher BASITH');
      setBannerButtonText('Lihat Detail');
      setBannerBadgeStyle('solid');
      setBannerHeadingStyle('glass');

      setBannerOverlayImageUrl(null);
      setBannerOverlayFlipX(false);
      setBannerOverlayRotate(0);
      setBannerOverlayScale(1);
      setBannerOverlayBorderRadius(0);

      const defaultLayers = [
        { id: 'heading-box', role: 'heading-box', x: 10, y: 20, w: 40, zIndex: 10, visible: true },
        { id: 'title-box', role: 'title-box', x: 10, y: 38, w: 60, zIndex: 10, visible: true },
        { id: 'desc-box', role: 'desc-box', x: 10, y: 60, w: 60, zIndex: 10, visible: true },
        { id: 'button-box', role: 'button-box', x: 10, y: 82, zIndex: 10, visible: true },
        { id: 'overlay-image', role: 'overlay-image', x: 80, y: 50, zIndex: 5, visible: true }
      ];
      setLayers(defaultLayers);

      const initialSnapshot = {
        heading: 'SPESIAL PENAWARAN',
        headingStyle: 'glass',
        title: 'Promo Berkah Idul Adha',
        description: 'Nikmati Keberkahan Idul Adha Promo Diskon 75% Dengan Kode Voucher BASITH',
        buttonText: 'Lihat Detail',
        badgeStyle: 'solid',
        link: '',
        type: 'custom',
        productId: '',
        bgType: 'gradient',
        bgColor: '#1E293B',
        gradientLeft: '#0061ff',
        gradientRight: '#60efff',
        gradientAngle: 135,
        image: null,
        overlayImageUrl: null,
        overlayFlipX: false,
        overlayRotate: 0,
        overlayScale: 1,
        bgFilter: { brightness: 100, contrast: 100, saturate: 100, blur: 0 },
        overlayFilter: { brightness: 100, contrast: 100, saturate: 100, blur: 0 },
        bgGradientOverlay: { enabled: false, color: '#000000', opacityLeft: 70, opacityRight: 0, angle: 90 },
        layers: defaultLayers
      };
      setHistory([initialSnapshot]);
      setHistoryIndex(0);
    }

    setSelectedId(null);
    setZoom(100);
  }

  // ── Initialize from URL params ─────────────────────────────────────────────
  // Placed AFTER function openEditor so hoisting guarantees it's callable here
  useEffect(() => {
    if (hasInitialized.current) return;

    if (id === 'new') {
      hasInitialized.current = true;
      openEditor(null);
      return;
    }

    // useDbQuery returns [] initially while loading from Firestore.
    // Wait until banners has data before trying to find the requested ID.
    if (banners && banners.length > 0) {
      const b = (banners as any[]).find((b: any) => String(b.id) === id);
      if (b) {
        hasInitialized.current = true;
        openEditor(b);
      } else {
        // Banner not found in database, go back
        hasInitialized.current = true;
        navigate('/admin/banner');
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [banners, id]);

  // --- Save / Publisher ---
  const handleSaveBanner = async () => {
    if (!bannerTitle.trim()) { toast.error('Judul Utama (Title) tidak boleh kosong'); return; }

    const loadingToastId = toast.loading('Menyimpan banner...');

    try {
      let finalBannerImage = bannerImage;
      if (bannerImage && bannerImage.startsWith('data:image')) {
        const res = await fetch(bannerImage);
        const blob = await res.blob();
        const compressedDataUrl = await compressImage(blob, 0.5); // max 500kb
        const url = await dbUploadFile('banners', `bg_${Date.now()}`, compressedDataUrl);
        if (url) finalBannerImage = url;
      }

      let finalOverlayImage = bannerOverlayImageUrl;
      if (bannerOverlayImageUrl && bannerOverlayImageUrl.startsWith('data:image')) {
        const res = await fetch(bannerOverlayImageUrl);
        const blob = await res.blob();
        const compressedDataUrl = await compressImage(blob, 0.5);
        const url = await dbUploadFile('banners', `overlay_${Date.now()}`, compressedDataUrl);
        if (url) finalOverlayImage = url;
      }

      const headL = layers.find(l => l.role === 'heading-box') || { x: 10, y: 20 };
      const titleL = layers.find(l => l.role === 'title-box') || { x: 10, y: 38 };
      const descL = layers.find(l => l.role === 'desc-box') || { x: 10, y: 60 };
      const buttonL = layers.find(l => l.role === 'button-box') || { x: 10, y: 82 };
      const overL = layers.find(l => l.role === 'overlay-image') || { x: 80, y: 50 };

      const bannerData = {
        type: bannerType,
        heading: bannerHeading.trim(),
        title: bannerTitle.trim(),
        description: bannerDescription.trim(),
        voucherId: null,
        productId: bannerType === 'menu' ? Number(bannerProductId) : null,
        imageUrl: finalBannerImage,
        buttonText: bannerButtonText.trim(),
        link: bannerLink.trim(),
        isActive: bannerIsActive,
        bgType: bannerBgType,
        bgColor: bannerBgType === 'solid' ? bannerBgColor : null,
        bgGradient: bannerBgType === 'gradient' ? `linear-gradient(${bannerGradientAngle}deg, ${bannerGradientLeft}, ${bannerGradientRight})` : null,
        badgeStyle: bannerBadgeStyle,
        headingStyle: bannerHeadingStyle,

        canvasLayers: [], // Clean up legacy
        canvasBgFilter: bgFilter,
        canvasOverlayFilter: overlayFilter,
        bgGradientOverlay: {
          enabled: bgGradientOverlayEnabled,
          color: bgGradientOverlayColor,
          opacityLeft: bgGradientOverlayOpacityLeft,
          opacityRight: bgGradientOverlayOpacityRight,
          angle: bgGradientOverlayAngle
        },
        createdAt: editBanner ? editBanner.createdAt : new Date().toISOString(),

        // Unified 5 coordinate fields
        headingPos: { x: Math.round(headL.x), y: Math.round(headL.y), w: Math.round(headL.w ?? 40) },
        titlePos: { x: Math.round(titleL.x), y: Math.round(titleL.y), w: Math.round(titleL.w ?? 60) },
        descPos: { x: Math.round(descL.x), y: Math.round(descL.y), w: Math.round(descL.w ?? 60) },
        buttonPos: { x: Math.round(buttonL.x), y: Math.round(buttonL.y) },
        overlayPos: { x: Math.round(overL.x), y: Math.round(overL.y) },

        overlayImageUrl: finalOverlayImage,
        overlayFlipX: bannerOverlayFlipX,
        overlayRotate: bannerOverlayRotate,
        overlayScale: bannerOverlayScale,
        overlayBorderRadius: bannerOverlayBorderRadius
      };

      if (editBanner) {
        await dbUpdate('banners', editBanner.id, bannerData);
        toast.success('Banner berhasil diperbarui!', { id: loadingToastId });
      } else {
        await dbInsert('banners', bannerData);
        toast.success('Banner baru berhasil diterbitkan!', { id: loadingToastId });
      }
      setTimeout(() => navigate('/admin/banner'), 1000);
    } catch (err) {
      console.error(err);
      toast.error('Gagal menyimpan banner', { id: loadingToastId });
    }
  };

  const handleDeleteBanner = async () => {
    if (!deleteBannerId) return;
    try {
      await dbDelete('banners', deleteBannerId);
      toast.success('Banner berhasil dihapus');
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

  // --- Rendering Helpers ---
  const canvasBg = bannerBgType === 'solid' ? bannerBgColor : bannerBgType === 'gradient' ? `linear-gradient(${bannerGradientAngle}deg, ${bannerGradientLeft}, ${bannerGradientRight})` : undefined;
  const bgFilterStyle = `brightness(${bgFilter.brightness}%) contrast(${bgFilter.contrast}%) saturate(${bgFilter.saturate}%) blur(${bgFilter.blur}px)`;

  const renderCanvasLayer = (layer) => {
    if (!layer.visible) return null;
    const isSelected = selectedId === layer.id;
    const baseStyle = {
      position: 'absolute' as any,
      left: `${layer.x}%`,
      top: `${layer.y}%`,
      transform: layer.role === 'overlay-image' ? 'translate(-50%, -50%)' : 'translate(0%, -50%)',
      zIndex: layer.zIndex,
      cursor: 'grab',
      userSelect: 'none' as any,
      touchAction: 'none',
    };

    // Sub-elements rendering definitions
    let elementNode = null;

    if (layer.role === 'heading-box') {
      elementNode = (
        <span 
          style={{
            backgroundColor: 
              bannerHeadingStyle === 'solid-white' ? '#FFFFFF' :
              bannerHeadingStyle === 'solid-dark' ? '#09090b' :
              bannerHeadingStyle === 'outline-white' ? 'transparent' :
              bannerHeadingStyle === 'neon' ? 'rgba(34,211,238,0.15)' :
              bannerHeadingStyle === 'retro' ? '#fbbf24' :
              'rgba(255,255,255,0.2)',
            color: 
              bannerHeadingStyle === 'solid-white' ? '#0f172a' :
              bannerHeadingStyle === 'solid-dark' ? '#ffffff' :
              bannerHeadingStyle === 'outline-white' ? '#ffffff' :
              bannerHeadingStyle === 'neon' ? '#a5f3fc' :
              bannerHeadingStyle === 'retro' ? '#09090b' :
              '#ffffff',
            border: 
              bannerHeadingStyle === 'solid-white' ? 'none' :
              bannerHeadingStyle === 'solid-dark' ? '1px solid #1e293b' :
              bannerHeadingStyle === 'outline-white' ? '0.2cqw solid #ffffff' :
              bannerHeadingStyle === 'neon' ? '0.15cqw solid #22d3ee' :
              bannerHeadingStyle === 'retro' ? '0.2cqw solid #09090b' :
              '0.1cqw solid rgba(255,255,255,0.1)',
            boxShadow: 
              bannerHeadingStyle === 'neon' ? '0 0 12px rgba(34,211,238,0.4)' :
              bannerHeadingStyle === 'retro' ? '0.25cqw 0.25cqw 0px #09090b' : 'none',
            backdropFilter: (bannerHeadingStyle === 'glass' || !bannerHeadingStyle) ? 'blur(8px)' : undefined
          }}
          className="text-[2.2cqw] px-[1.5cqw] py-[0.5cqw] rounded inline-block uppercase tracking-widest select-none"
          dangerouslySetInnerHTML={{ __html: bannerHeading || '<span>Spesial Penawaran</span>' }}
        />
      );
    }

    if (layer.role === 'title-box') {
      elementNode = (
        <h4
          className="font-black text-[4.5cqw] leading-[1.15] line-clamp-2 drop-shadow-sm m-0 select-none text-white text-left"
          dangerouslySetInnerHTML={{ __html: bannerTitle || 'Judul Promo' }}
        />
      );
    }

    if (layer.role === 'desc-box') {
      elementNode = (
        <p
          className="text-[2.8cqw] text-slate-100 line-clamp-3 leading-[1.3] font-medium drop-shadow-sm m-0 select-none text-left"
          dangerouslySetInnerHTML={{ __html: bannerDescription || 'Deskripsi singkat...' }}
        />
      );
    }

    if (layer.role === 'button-box') {
      elementNode = (
        <span
          style={{
            backgroundColor: 
              bannerBadgeStyle === 'solid' ? '#FFFFFF' :
              bannerBadgeStyle === 'outline' ? 'transparent' :
              bannerBadgeStyle === 'glass' ? 'rgba(255,255,255,0.2)' :
              bannerBadgeStyle === 'soft-dark' ? 'rgba(0,0,0,0.4)' :
              bannerBadgeStyle === 'neon' ? '#06b6d4' :
              bannerBadgeStyle === 'retro' ? '#eab308' :
              '#FFFFFF',

            color: 
              bannerBadgeStyle === 'solid' ? '#0F172A' :
              bannerBadgeStyle === 'outline' ? '#FFFFFF' :
              bannerBadgeStyle === 'glass' ? '#FFFFFF' :
              bannerBadgeStyle === 'soft-dark' ? '#FFFFFF' :
              bannerBadgeStyle === 'neon' ? '#ffffff' :
              bannerBadgeStyle === 'retro' ? '#09090b' :
              '#0F172A',

            border: 
              bannerBadgeStyle === 'solid' ? 'none' :
              bannerBadgeStyle === 'outline' ? '0.2cqw solid #FFFFFF' :
              bannerBadgeStyle === 'glass' ? '0.15cqw solid rgba(255,255,255,0.2)' :
              bannerBadgeStyle === 'soft-dark' ? '0.15cqw solid rgba(255,255,255,0.2)' :
              bannerBadgeStyle === 'neon' ? 'none' :
              bannerBadgeStyle === 'retro' ? '0.25cqw solid #09090b' :
              'none',

            boxShadow: 
              bannerBadgeStyle === 'neon' ? '0 0 15px rgba(6,182,212,0.6)' :
              bannerBadgeStyle === 'retro' ? '0.3cqw 0.3cqw 0px #09090b' :
              'none',

            backdropFilter: 
              (bannerBadgeStyle === 'glass' || bannerBadgeStyle === 'soft-dark') ? 'blur(8px)' : undefined
          }}
          className="text-[2.4cqw] font-extrabold px-[2.5cqw] py-[0.8cqw] rounded-md shadow-sm select-none inline-block"
        >
          {bannerButtonText || 'Lihat Detail'}
        </span>
      );
    }

    if (layer.role === 'overlay-image') {
      if (!bannerOverlayImageUrl) return null;
      elementNode = (
        <img
          src={bannerOverlayImageUrl}
          draggable={false}
          style={{
            transform: `scaleX(${bannerOverlayFlipX ? -1 : 1}) rotate(${bannerOverlayRotate ?? 0}deg)`,
            width: `calc(${bannerOverlayScale ?? 1} * 20cqw)`,
            height: 'auto',
            borderRadius: `${bannerOverlayBorderRadius ?? 0}%`,
            filter: `brightness(${overlayFilter.brightness}%) contrast(${overlayFilter.contrast}%) saturate(${overlayFilter.saturate ?? 100}%) blur(${overlayFilter.blur}px)`
          }}
          className="object-contain drop-shadow-2xl max-w-none select-none"
          alt="Overlay Banner"
        />
      );
    }

    const isTextLayer = layer.role === 'heading-box' || layer.role === 'title-box' || layer.role === 'desc-box';
    const layerWidth = isTextLayer ? `${layer.w ?? 55}%` : undefined;

    return (
      <div 
        key={layer.id} 
        style={{ ...baseStyle, width: layerWidth }}
        className="relative pointer-events-auto touch-none"
        onPointerDown={e => onLayerPointerDown(e, layer.id)}
      >
        {/* Floating Action Toolbar on Selected Overlay */}
        {isSelected && layer.role === 'overlay-image' && (
          <div 
            className="absolute top-[-54px] left-1/2 -translate-x-1/2 bg-slate-950/85 dark:bg-zinc-900/90 backdrop-blur-md border border-white/10 rounded-xl px-2 py-1 flex items-center gap-1.5 shadow-xl z-50 pointer-events-auto text-white scale-90 sm:scale-100 transition-all origin-bottom select-none animate-in fade-in zoom-in-95 duration-200"
            onPointerDown={e => e.stopPropagation()}
          >
            <button onClick={(ev) => { ev.stopPropagation(); setBannerOverlayScale(s => { const n = Math.max(0.1, s - 0.05); pushHistory({ ...getSnapshot(), overlayScale: n }); return n; }); }}
              className="w-7 h-7 hover:bg-white/10 rounded-lg flex items-center justify-center font-black transition-colors">-</button>
            <span className="text-[10px] font-mono px-1 min-w-[34px] text-center text-zinc-200">{Math.round(bannerOverlayScale * 100)}%</span>
            <button onClick={(ev) => { ev.stopPropagation(); setBannerOverlayScale(s => { const n = Math.min(3, s + 0.05); pushHistory({ ...getSnapshot(), overlayScale: n }); return n; }); }}
              className="w-7 h-7 hover:bg-white/10 rounded-lg flex items-center justify-center font-black transition-colors">+</button>
            <div className="w-[1px] h-4 bg-white/10" />
            <button onClick={(ev) => { ev.stopPropagation(); setBannerOverlayRotate(r => { const n = r - 15; pushHistory({ ...getSnapshot(), overlayRotate: n }); return n; }); }} title="Putar Kiri"
              className="w-7 h-7 hover:bg-white/10 rounded-lg flex items-center justify-center transition-colors"><RotateCcwIcon className="w-3.5 h-3.5" /></button>
            <button onClick={(ev) => { ev.stopPropagation(); setBannerOverlayRotate(r => { const n = r + 15; pushHistory({ ...getSnapshot(), overlayRotate: n }); return n; }); }} title="Putar Kanan"
              className="w-7 h-7 hover:bg-white/10 rounded-lg flex items-center justify-center transition-colors"><RotateCwIcon className="w-3.5 h-3.5" /></button>
            <div className="w-[1px] h-4 bg-white/10" />
            <button onClick={(ev) => { ev.stopPropagation(); const f = !bannerOverlayFlipX; setBannerOverlayFlipX(f); pushHistory({ ...getSnapshot(), overlayFlipX: f }); }}
              className={cn("w-7 h-7 hover:bg-white/10 rounded-lg flex items-center justify-center transition-colors", bannerOverlayFlipX && "text-blue-400 bg-white/5")}>
              <FlipHorizontal className="w-3.5 h-3.5" /></button>
            <div className="w-[1px] h-4 bg-white/10" />
            <button onClick={(ev) => { ev.stopPropagation(); setBannerOverlayImageUrl(null); setSelectedId(null); pushHistory({ ...getSnapshot(), overlayImageUrl: null }); }}
              className="w-7 h-7 text-red-400 hover:bg-red-500/10 rounded-lg flex items-center justify-center transition-colors">
              <Trash className="w-3.5 h-3.5" /></button>
          </div>
        )}

        {/* Bounding Box */}
        {isSelected && (
          <div className="absolute inset-[-6px] border-[1.5px] border-[#2563eb] rounded-md pointer-events-none z-20">
            <div className="absolute -top-[4.5px] -left-[4.5px] w-2.5 h-2.5 bg-white border border-[#2563eb] rounded-full" />
            <div className="absolute -top-[4.5px] -right-[4.5px] w-2.5 h-2.5 bg-white border border-[#2563eb] rounded-full" />
            <div className="absolute -bottom-[4.5px] -left-[4.5px] w-2.5 h-2.5 bg-white border border-[#2563eb] rounded-full" />
            <div className="absolute -bottom-[4.5px] -right-[4.5px] w-2.5 h-2.5 bg-white border border-[#2563eb] rounded-full" />
          </div>
        )}

        {/* Right-edge resize handle for text layers */}
        {isSelected && isTextLayer && (
          <div
            className="absolute right-[-10px] top-1/2 -translate-y-1/2 w-4 h-8 bg-blue-600 rounded-sm cursor-ew-resize z-30 flex items-center justify-center shadow-lg pointer-events-auto"
            onPointerDown={e => { e.stopPropagation(); onResizePointerDown(e, layer.id); }}
            title="Seret untuk ubah lebar"
          >
            <div className="w-0.5 h-4 bg-white/70 rounded-full" />
          </div>
        )}

        {elementNode}
      </div>
    );
  };

  // --- Sidebar Editor Form Contents ---
  const renderFormContent = () => (
    <div className="space-y-6">
      
      {/* 1. KONTEN TEKS & LINK (PAKEM) */}
      <PanelSection title="Konten Teks & Tautan" icon={Type} defaultOpen={true}>
        <div className="space-y-4 pt-1">
          <div>
            <Label>Heading (Label Kotak)</Label>
            <RichTextEditor
              value={bannerHeading}
              onChange={v => setBannerHeading(v)}
              placeholder="Contoh: SPESIAL PENAWARAN"
            />
          </div>

          <div>
            <Label>Gaya Kotak Heading</Label>
            <select value={bannerHeadingStyle} onChange={(e) => setBannerHeadingStyle(e.target.value)} className="w-full h-10 px-3 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-sm outline-none text-zinc-900 dark:text-zinc-100">
              <option value="glass">Glassmorphism</option>
              <option value="solid-white">Solid Putih</option>
              <option value="solid-dark">Solid Gelap</option>
              <option value="outline-white">Garis Tepi Putih</option>
              <option value="neon">Neon Cyan</option>
              <option value="retro">Retro Brutalist</option>
            </select>
          </div>

          <div>
            <Label>Judul Utama</Label>
            <RichTextEditor
              value={bannerTitle}
              onChange={v => setBannerTitle(v)}
              placeholder="Contoh: Promo Berkah Idul Adha"
            />
          </div>

          <div>
            <Label>Deskripsi</Label>
            <RichTextEditor
              value={bannerDescription}
              onChange={v => setBannerDescription(v)}
              placeholder="Contoh: Nikmati diskon spesial..."
              minHeight="72px"
            />
          </div>

          <div>
            <Label>Teks Tombol (Badge)</Label>
            <Input
              value={bannerButtonText}
              onChange={e => setBannerButtonText(e.target.value)}
              placeholder="Contoh: Lihat Detail"
            />
          </div>

          <div>
            <Label>Gaya Tombol</Label>
            <select value={bannerBadgeStyle} onChange={(e) => setBannerBadgeStyle(e.target.value)} className="w-full h-10 px-3 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-sm outline-none text-zinc-900 dark:text-zinc-100">
              <option value="solid">Solid Putih</option>
              <option value="outline">Outline Putih</option>
              <option value="glass">Glassmorphism</option>
              <option value="soft-dark">Soft Dark</option>
              <option value="neon">Neon Cyan</option>
              <option value="retro">Retro Brutalist</option>
            </select>
          </div>

          <div>
            <Label>Link Tujuan Tombol</Label>
            <Input
              value={bannerLink}
              onChange={e => setBannerLink(e.target.value)}
              placeholder="https://... atau tautan tujuan"
            />
          </div>
        </div>
      </PanelSection>

      {/* 2. DESAIN & GAYA LATAR BELAKANG */}
      <PanelSection title="Desain & Gaya Latar Belakang" icon={Layout} defaultOpen={false}>
        <div className="space-y-5 pt-1">
          {/* Background Settings */}
          <div>
            <p className="text-[10px] font-black uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-3">Tipe Background</p>
            <div className="flex bg-zinc-100 dark:bg-zinc-900 p-1 rounded-xl">
              {['solid', 'gradient', 'image'].map(t => (
                <button key={t} onClick={() => {
                  setBannerBgType(t);
                  pushHistory({ ...getSnapshot(), bgType: t });
                }}
                  className={cn('flex-1 h-9 rounded-lg text-xs font-bold capitalize transition-all', bannerBgType === t ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300')}>
                  {t}
                </button>
              ))}
            </div>
          </div>

          {bannerBgType === 'solid' && (
            <div>
              <p className="text-[10px] font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-3">Warna Solid</p>
              <ColorPicker value={bannerBgColor} onChange={c => {
                setBannerBgColor(c);
                pushHistory({ ...getSnapshot(), bgColor: c });
              }} />
            </div>
          )}

          {bannerBgType === 'gradient' && (
            <div className="space-y-4">
              <p className="text-[10px] font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">Pengaturan Gradasi</p>
              <div className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 space-y-4 bg-white dark:bg-zinc-900/30">
                <div>
                  <Label>Warna Kiri</Label>
                  <ColorPicker value={bannerGradientLeft} onChange={c => {
                    setBannerGradientLeft(c);
                    pushHistory({ ...getSnapshot(), gradientLeft: c });
                  }} />
                </div>
                <div className="pt-4 border-t border-zinc-200 dark:border-zinc-800">
                  <Label>Warna Kanan</Label>
                  <ColorPicker value={bannerGradientRight} onChange={c => {
                    setBannerGradientRight(c);
                    pushHistory({ ...getSnapshot(), gradientRight: c });
                  }} />
                </div>
                <div className="pt-4 border-t border-zinc-200 dark:border-zinc-800">
                  <SliderRow label="Sudut Kemiringan" value={bannerGradientAngle} min={0} max={360} defaultValue={135} onChange={setBannerGradientAngle} onPointerUp={() => pushHistory()} unit="°" />
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
                <Button variant="danger" className="w-full" onClick={() => {
                  setBannerImage(null);
                  pushHistory({ ...getSnapshot(), image: null });
                }}>Hapus Gambar</Button>
              )}

              <div className="pt-4 border-t border-zinc-200 dark:border-zinc-800 space-y-4">
                <p className="text-[10px] font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">Filter Latar Belakang</p>
                <SliderRow label="Kecerahan" value={bgFilter.brightness} min={0} max={200} defaultValue={100} onChange={v => setBgFilter(f => ({ ...f, brightness: v }))} onPointerUp={() => pushHistory()} unit="%" />
                <SliderRow label="Kontras" value={bgFilter.contrast} min={0} max={200} defaultValue={100} onChange={v => setBgFilter(f => ({ ...f, contrast: v }))} onPointerUp={() => pushHistory()} unit="%" />
                <SliderRow label="Saturasi" value={bgFilter.saturate ?? 100} min={0} max={200} defaultValue={100} onChange={v => setBgFilter(f => ({ ...f, saturate: v }))} onPointerUp={() => pushHistory()} unit="%" />
                <SliderRow label="Blur" value={bgFilter.blur} min={0} max={20} defaultValue={0} onChange={v => setBgFilter(f => ({ ...f, blur: v }))} onPointerUp={() => pushHistory()} unit="px" />
              </div>

              {/* Adjustable Darkness Gradient Overlay Section */}
              {bannerImage && (
                <div className="pt-4 border-t border-zinc-200 dark:border-zinc-800 space-y-4">
                  <div className="flex items-center justify-between">
                    <p className="text-[10px] font-black uppercase tracking-wider text-zinc-800 dark:text-zinc-200">Overlay Gradasi Gelap (Legibilitas)</p>
                    <Switch checked={bgGradientOverlayEnabled} onCheckedChange={checked => {
                      setBgGradientOverlayEnabled(checked);
                      pushHistory({
                        ...getSnapshot(),
                        bgGradientOverlay: {
                          enabled: checked,
                          color: bgGradientOverlayColor,
                          opacityLeft: bgGradientOverlayOpacityLeft,
                          opacityRight: bgGradientOverlayOpacityRight,
                          angle: bgGradientOverlayAngle
                        }
                      });
                    }} />
                  </div>
                  {bgGradientOverlayEnabled && (
                    <div className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 space-y-4 bg-white dark:bg-zinc-900/30">
                      <div>
                        <Label>Warna Overlay</Label>
                        <ColorPicker value={bgGradientOverlayColor} onChange={color => {
                          setBgGradientOverlayColor(color);
                          pushHistory({
                            ...getSnapshot(),
                            bgGradientOverlay: {
                              enabled: bgGradientOverlayEnabled,
                              color: color,
                              opacityLeft: bgGradientOverlayOpacityLeft,
                              opacityRight: bgGradientOverlayOpacityRight,
                              angle: bgGradientOverlayAngle
                            }
                          });
                        }} />
                      </div>
                      <div className="pt-2">
                        <SliderRow label="Transparansi Kiri (Mulai)" value={bgGradientOverlayOpacityLeft} min={0} max={100} defaultValue={70} onChange={setBgGradientOverlayOpacityLeft} onPointerUp={() => pushHistory()} unit="%" />
                      </div>
                      <div className="pt-2">
                        <SliderRow label="Transparansi Kanan (Akhir)" value={bgGradientOverlayOpacityRight} min={0} max={100} defaultValue={0} onChange={setBgGradientOverlayOpacityRight} onPointerUp={() => pushHistory()} unit="%" />
                      </div>
                      <div className="pt-2">
                        <SliderRow label="Sudut Arah Gradasi" value={bgGradientOverlayAngle} min={0} max={360} defaultValue={90} onChange={setBgGradientOverlayAngle} onPointerUp={() => pushHistory()} unit="°" />
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </PanelSection>

      {/* 3. GAMBAR & STIKER TAMBAHAN */}
      <PanelSection title="Gambar & Stiker Tambahan" icon={Palette} defaultOpen={false}>
        <div className="space-y-5 pt-1">
          {/* Tipe Banner (custom vs menu) */}
          <div>
            <Label>Tipe Banner</Label>
            <select value={bannerType} onChange={(e) => {
              const val = e.target.value;
              handleBannerTypeChange(val);
              pushHistory({ ...getSnapshot(), type: val, productId: '', overlayImageUrl: null });
            }} className="w-full h-10 px-3 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-sm outline-none text-zinc-900 dark:text-zinc-100">
              <option value="custom">Kustom Bebas</option>
              <option value="menu">Menu / Produk</option>
            </select>
          </div>

          {/* Conditional Controls based on Tipe Banner */}
          {bannerType === 'menu' ? (
            <div>
              <Label>Produk Terkait</Label>
              <select value={bannerProductId} onChange={(e) => {
                const prodId = e.target.value;
                handleProductSelect(prodId);
                const prod = products?.find(p => String(p.id) === String(prodId));
                const photo = prod?.photo || null;
                pushHistory({
                  ...getSnapshot(),
                  productId: prodId,
                  overlayImageUrl: photo
                });
              }} className="w-full h-10 px-3 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-sm outline-none text-zinc-900 dark:text-zinc-100">
                <option value="">-- Pilih Produk --</option>
                {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
          ) : (
            <div>
              <Label>Pilih Gambar Overlay (PNG / JPG)</Label>
              <input ref={overlayFileInputRef} type="file" accept="image/*" className="hidden" onChange={handleAddImageFile} />
              <button onClick={() => overlayFileInputRef.current?.click()}
                className="w-full h-14 rounded-2xl bg-blue-50 dark:bg-blue-900/10 hover:bg-blue-100 dark:hover:bg-blue-900/20 border-2 border-dashed border-blue-200 dark:border-blue-800/30 hover:border-blue-400 transition-all flex items-center justify-center gap-2 text-sm font-bold text-blue-600 dark:text-blue-400">
                <ImageIcon className="w-5 h-5" /> Cari Gambar Overlay
              </button>
            </div>
          )}

          {bannerOverlayImageUrl && (
            <div className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 space-y-4 bg-white dark:bg-zinc-900/30">
              <p className="text-[10px] font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">Transformasi Stiker</p>
              
              <SliderRow label="Skala (Lebar)" value={Math.round(bannerOverlayScale * 100)} min={10} max={300} defaultValue={100} onChange={v => setBannerOverlayScale(v / 100)} onPointerUp={() => pushHistory()} unit="%" />
              <SliderRow label="Rotasi" value={bannerOverlayRotate} min={-180} max={180} defaultValue={0} onChange={setBannerOverlayRotate} onPointerUp={() => pushHistory()} unit="°" />
              
              <div className="flex gap-2">
                <button onClick={() => {
                  const flip = !bannerOverlayFlipX;
                  setBannerOverlayFlipX(flip);
                  pushHistory({ ...getSnapshot(), overlayFlipX: flip });
                }}
                  className={cn('flex-1 h-10 rounded-xl border font-bold transition-all flex items-center justify-center gap-2 text-xs', bannerOverlayFlipX ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400' : 'border-zinc-200 dark:border-zinc-700')}>
                  <FlipHorizontal className="w-4 h-4" /> Balik Horisontal
                </button>
              </div>

              {/* Slider Filters for Overlay Image */}
              <div className="pt-4 border-t border-zinc-200 dark:border-zinc-800 space-y-4">
                <p className="text-[10px] font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">Filter Stiker Overlay</p>
                <SliderRow label="Kecerahan" value={overlayFilter.brightness} min={0} max={200} defaultValue={100} onChange={v => setOverlayFilter(f => ({ ...f, brightness: v }))} onPointerUp={() => pushHistory()} unit="%" />
                <SliderRow label="Kontras" value={overlayFilter.contrast} min={0} max={200} defaultValue={100} onChange={v => setOverlayFilter(f => ({ ...f, contrast: v }))} onPointerUp={() => pushHistory()} unit="%" />
                <SliderRow label="Saturasi" value={overlayFilter.saturate ?? 100} min={0} max={200} defaultValue={100} onChange={v => setOverlayFilter(f => ({ ...f, saturate: v }))} onPointerUp={() => pushHistory()} unit="%" />
                <SliderRow label="Blur" value={overlayFilter.blur} min={0} max={20} defaultValue={0} onChange={v => setOverlayFilter(f => ({ ...f, blur: v }))} onPointerUp={() => pushHistory()} unit="px" />
              </div>

              <div className="pt-4 border-t border-zinc-200 dark:border-zinc-800">
                <SliderRow label="Sudut Bulat" value={bannerOverlayBorderRadius} min={0} max={50} step={1} defaultValue={0} onChange={v => setBannerOverlayBorderRadius(v)} onPointerUp={() => pushHistory()} unit="%" />
              </div>

              <Button variant="danger" className="w-full h-9 rounded-xl text-xs" onClick={() => {
                setBannerOverlayImageUrl(null);
                setBannerProductId('');
                setSelectedId(null);
                pushHistory({ ...getSnapshot(), overlayImageUrl: null, productId: '' });
              }}>
                <Trash className="w-4 h-4 mr-2" /> Hapus Stiker Overlay
              </Button>
            </div>
          )}
        </div>
      </PanelSection>
      
    </div>
  );

  // ============================================================================
  // RENDER EDITOR VIEW
  // ============================================================================

    return (
      <div className="fixed inset-0 z-50 bg-white dark:bg-[#09090b] text-zinc-900 dark:text-zinc-100 flex flex-col overflow-hidden transition-colors duration-300">
        
        {/* --- Topbar: 3-column grid, no absolute positioning --- */}
        <div className="h-14 sm:h-16 grid grid-cols-[auto_1fr_auto] items-center px-2 sm:px-4 gap-2 border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 shrink-0 z-40">

          {/* LEFT: back + undo/redo/snap */}
          <div className="flex items-center gap-1.5 min-w-0">
            <Button variant="ghost" size="icon" onClick={() => navigate('/admin/banner')} className="rounded-full shrink-0 w-9 h-9">
              <ChevronLeft className="w-5 h-5" />
            </Button>

            {/* Undo / Redo / Snap — hidden on xs, shown on sm+ */}
            <div className="hidden sm:flex items-center gap-1 bg-zinc-100 dark:bg-zinc-900 rounded-full p-1 shrink-0">
              <button onClick={handleUndo} disabled={historyIndex <= 0} title="Undo"
                className={cn("w-8 h-8 rounded-full flex items-center justify-center transition-all",
                  historyIndex <= 0 ? "opacity-30 cursor-not-allowed text-zinc-400" : "text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-800")}>
                <Undo2 className="w-4 h-4" />
              </button>
              <button onClick={handleRedo} disabled={historyIndex >= history.length - 1} title="Redo"
                className={cn("w-8 h-8 rounded-full flex items-center justify-center transition-all",
                  historyIndex >= history.length - 1 ? "opacity-30 cursor-not-allowed text-zinc-400" : "text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-800")}>
                <Redo2 className="w-4 h-4" />
              </button>
              <div className="w-px h-4 bg-zinc-200 dark:bg-zinc-700 mx-0.5" />
              <button
                onClick={() => { const s = !snapEnabled; setSnapEnabled(s); pushHistory({ ...getSnapshot(), snapEnabled: s }); }}
                title="Magnet Snap"
                className={cn("w-8 h-8 rounded-full flex items-center justify-center transition-all",
                  snapEnabled ? "bg-blue-600 text-white shadow-sm" : "text-zinc-500 hover:bg-zinc-200 dark:hover:bg-zinc-800")}>
                <Sparkles className="w-4 h-4" />
              </button>
            </div>

            {/* Mobile-only: compact undo/redo/snap row (xs only) */}
            <div className="flex sm:hidden items-center gap-0.5 bg-zinc-100 dark:bg-zinc-900 rounded-full p-0.5 shrink-0">
              <button onClick={handleUndo} disabled={historyIndex <= 0}
                className={cn("w-7 h-7 rounded-full flex items-center justify-center transition-all",
                  historyIndex <= 0 ? "opacity-30 cursor-not-allowed text-zinc-400" : "text-zinc-600 dark:text-zinc-300 active:bg-zinc-200 dark:active:bg-zinc-800")}>
                <Undo2 className="w-3.5 h-3.5" />
              </button>
              <button onClick={handleRedo} disabled={historyIndex >= history.length - 1}
                className={cn("w-7 h-7 rounded-full flex items-center justify-center transition-all",
                  historyIndex >= history.length - 1 ? "opacity-30 cursor-not-allowed text-zinc-400" : "text-zinc-600 dark:text-zinc-300 active:bg-zinc-200 dark:active:bg-zinc-800")}>
                <Redo2 className="w-3.5 h-3.5" />
              </button>
              <div className="w-px h-3.5 bg-zinc-300 dark:bg-zinc-700 mx-0.5" />
              <button
                onClick={() => { const s = !snapEnabled; setSnapEnabled(s); pushHistory({ ...getSnapshot(), snapEnabled: s }); }}
                className={cn("w-7 h-7 rounded-full flex items-center justify-center transition-all",
                  snapEnabled ? "bg-blue-600 text-white" : "text-zinc-500 active:bg-zinc-200 dark:active:bg-zinc-700")}>
                <Sparkles className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* CENTER: title — always truncated, never overlaps */}
          <div className="flex items-center justify-center gap-1.5 min-w-0 overflow-hidden">
            <Sparkles className="w-3.5 h-3.5 text-blue-500 shrink-0 hidden sm:block" />
            <span className="text-xs sm:text-sm font-black tracking-tight truncate text-zinc-800 dark:text-zinc-100">
              {/* Desktop: store name banner; Mobile: banner title */}
              <span className="hidden sm:inline">
                {storeSettings?.storeName ? `${storeSettings.storeName} Banner` : 'Banner Studio'}
              </span>
              <span className="sm:hidden">{bannerTitle || 'Banner Baru'}</span>
            </span>
          </div>

          {/* RIGHT: zoom + save (desktop only — save on mobile is in bottom sheet) */}
          <div className="flex items-center gap-1.5 shrink-0">
            <div className="hidden sm:flex items-center gap-1.5 bg-zinc-100 dark:bg-zinc-900 rounded-full px-2.5 h-9">
              <button onClick={() => setZoom(z => Math.max(30, z - 10))} className="p-1 hover:text-blue-500 transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="8" y1="11" x2="14" y2="11"/></svg>
              </button>
              <span className="text-xs font-mono font-bold w-10 text-center">{zoom}%</span>
              <button onClick={() => setZoom(z => Math.min(200, z + 10))} className="p-1 hover:text-blue-500 transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="11" y1="8" x2="11" y2="14"/><line x1="8" y1="11" x2="14" y2="11"/></svg>
              </button>
            </div>
            <Button variant="primary" size="sm" onClick={handleSaveBanner}
              className="hidden sm:flex rounded-full px-4 h-9 text-sm font-bold shadow-blue-500/20 shrink-0">
              <Check className="w-4 h-4 mr-1.5" />{editBanner ? 'Simpan' : 'Terbitkan'}
            </Button>
          </div>
        </div>


        {/* --- Main Workspace --- */}
        <div className="flex-1 flex overflow-hidden relative bg-zinc-50 dark:bg-[#09090b]">

          {/* Desktop Left Sidebar (Unified Edit Panel) */}
          <div className="hidden md:flex w-[360px] shrink-0 bg-white dark:bg-zinc-950 border-r border-zinc-200 dark:border-zinc-800 flex-col overflow-hidden z-20">
            <div className="px-5 py-4 border-b border-zinc-200 dark:border-zinc-800 shrink-0">
              <span className="text-sm font-black uppercase tracking-wider text-zinc-800 dark:text-zinc-200 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-blue-500" /> Editor Banner
              </span>
            </div>
            
            <div className="flex-1 overflow-y-auto custom-scrollbar p-5">
              {renderFormContent()}
            </div>
          </div>

          {/* Canvas Area — mobile: full width; desktop: zoom-controlled width */}
          <div
            className="flex-1 relative overflow-auto flex items-start md:items-center justify-center p-3 pt-4 md:p-10 bg-zinc-100 dark:bg-zinc-900 md:bg-zinc-50 md:dark:bg-[#09090b]"
            style={{ paddingBottom: '72px' }}
            onPointerDown={() => setSelectedId(null)}
          >
            {/* Canvas Container */}
            <div
              ref={canvasRef}
              className="relative shadow-xl overflow-hidden w-full md:w-auto"
              style={{
                width: typeof window !== 'undefined' && window.innerWidth >= 768 ? `${zoom}%` : undefined,
                minWidth: typeof window !== 'undefined' && window.innerWidth >= 768 ? '300px' : undefined,
                maxWidth: typeof window !== 'undefined' && window.innerWidth >= 768 ? '1200px' : '100%',
                aspectRatio: '21/9',
                background: canvasBg || '#ffffff',
                borderRadius: '12px',
                containerType: 'inline-size',
                outline: '1px solid rgba(150,150,150,0.15)',
              }}
            >
              {/* Canvas Background Image */}
              {bannerImage && (
                <div className="absolute inset-0 z-0 pointer-events-none">
                  <img src={bannerImage} alt="bg" className="w-full h-full object-cover" style={{ filter: bgFilterStyle }} />
                  {bgGradientOverlayEnabled ? (
                    <div className="absolute inset-0 z-10" style={{ background: `linear-gradient(${bgGradientOverlayAngle}deg, rgba(${hexToRgb(bgGradientOverlayColor)}, ${bgGradientOverlayOpacityLeft / 100}), rgba(${hexToRgb(bgGradientOverlayColor)}, ${bgGradientOverlayOpacityRight / 100}))` }} />
                  ) : (
                    <div className="absolute inset-0 bg-gradient-to-r from-black/85 via-black/40 to-transparent z-10" />
                  )}
                </div>
              )}

              {/* Background gradient tanpa gambar: tampilkan gradien overlay jika ada */}
              {!bannerImage && bgGradientOverlayEnabled && (
                <div className="absolute inset-0 z-10 pointer-events-none" style={{
                  background: `linear-gradient(${bgGradientOverlayAngle}deg, rgba(${hexToRgb(bgGradientOverlayColor)}, ${bgGradientOverlayOpacityLeft / 100}), rgba(${hexToRgb(bgGradientOverlayColor)}, ${bgGradientOverlayOpacityRight / 100}))`
                }} />
              )}
              {bannerBgType === 'image' && !bannerImage && (
                <div className="absolute inset-0 bg-zinc-200 dark:bg-zinc-800 pointer-events-none flex flex-col items-center justify-center text-zinc-400">
                  <ImageIcon className="w-12 h-12 mb-2 opacity-20" />
                  <span className="text-sm font-bold opacity-50">Latar Belakang Kosong</span>
                </div>
              )}

              {/* Snap guides */}
              {activeSnapX !== null && (
                <div className="absolute top-0 bottom-0 w-[1.5px] pointer-events-none z-30 shadow-[0_0_8px_currentColor]" style={{ left: `${activeSnapX}%`, color: activeSnapX === 50 ? '#22d3ee' : '#f43f5e', backgroundColor: 'currentColor' }} />
              )}
              {activeSnapY !== null && (
                <div className="absolute left-0 right-0 h-[1.5px] pointer-events-none z-30 shadow-[0_0_8px_currentColor]" style={{ top: `${activeSnapY}%`, color: activeSnapY === 50 ? '#22d3ee' : '#f43f5e', backgroundColor: 'currentColor' }} />
              )}

              {/* Canvas layers */}
              {layers.map(renderCanvasLayer)}
            </div>
          </div>

          {/* ============================================================
              MOBILE BOTTOM SHEET — always anchored, slides up from bottom
          ============================================================ */}
          <div className="md:hidden">
            {/* Backdrop */}
            {isMobilePanelOpen && (
              <div
                className="fixed inset-0 z-[58] bg-black/50 backdrop-blur-sm"
                onClick={() => setIsMobilePanelOpen(false)}
              />
            )}

            {/* Sheet */}
            <div
              className="fixed bottom-0 left-0 right-0 z-[59] flex flex-col bg-white dark:bg-zinc-950 rounded-t-2xl border-t border-zinc-200 dark:border-zinc-800 shadow-[0_-8px_32px_rgba(0,0,0,0.18)] transition-transform duration-300 ease-out will-change-transform"
              style={{
                maxHeight: '80vh',
                transform: isMobilePanelOpen ? 'translateY(0)' : 'translateY(calc(100% - 60px))',
              }}
            >
              {/* Handle bar — always visible */}
              <button
                className="flex flex-col items-center gap-1 w-full pt-2.5 pb-2.5 px-4 shrink-0 touch-manipulation select-none"
                onClick={() => setIsMobilePanelOpen(v => !v)}
              >
                {/* Drag pill */}
                <div className="w-9 h-1 rounded-full bg-zinc-300 dark:bg-zinc-600 mb-1" />
                {/* Row: label + save */}
                <div className="flex items-center justify-between w-full">
                  <div className="flex items-center gap-2 text-zinc-800 dark:text-zinc-100">
                    <SlidersHorizontal className="w-4 h-4 text-blue-500 shrink-0" />
                    <span className="text-sm font-bold">
                      {isMobilePanelOpen ? 'Tutup Editor' : 'Edit Banner'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={e => { e.stopPropagation(); handleSaveBanner(); }}
                      className="flex items-center gap-1.5 bg-blue-600 active:bg-blue-700 text-white text-xs font-bold px-3.5 h-7 rounded-full shadow-md"
                    >
                      <Check className="w-3.5 h-3.5" />
                      {editBanner ? 'Simpan' : 'Terbitkan'}
                    </button>
                    <svg
                      xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24"
                      fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                      className={cn('text-zinc-400 transition-transform duration-300', isMobilePanelOpen ? 'rotate-180' : '')}
                    >
                      <polyline points="18 15 12 9 6 15" />
                    </svg>
                  </div>
                </div>
              </button>

              {/* Scrollable form — hidden when sheet is collapsed */}
              {isMobilePanelOpen && (
                <div
                  className="flex-1 overflow-y-auto overscroll-contain pb-8"
                  style={{ WebkitOverflowScrolling: 'touch' }}
                >
                  <div className="p-4 space-y-1">
                    {renderFormContent()}
                  </div>
                </div>
              )}
            </div>
          </div>

          <PhotoCropModal
            open={cropBgOpen}
            onOpenChange={setCropBgOpen}
            file={cropBgFile}
            onCropped={handleBgCropSuccess}
            disableCompression={true}
            aspectRatio={21/9}
          />

        </div>
      </div>
    );
}

const RotateCcwIcon = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={props.className}><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>
);
const RotateCwIcon = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={props.className}><path d="M21 12a9 9 0 1 1-9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/></svg>
);
const Wand2Icon = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={props.className}><path d="m21.64 3.64-1.28-1.28a1.21 1.21 0 0 0-1.72 0L2.36 18.64a1.21 1.21 0 0 0 0 1.72l1.28 1.28a1.2 1.2 0 0 0 1.72 0L21.64 5.36a1.2 1.2 0 0 0 0-1.72Z"/><path d="m14 7 3 3"/><path d="M5 6v4"/><path d="M19 14v4"/><path d="M10 2v2"/><path d="M7 8H3"/><path d="M21 16h-4"/><path d="M11 3H9"/></svg>
);
