import React, { useState, useRef, useEffect, createContext, useContext } from 'react';
import { 
  Plus, Edit2, Trash2, Image as ImageIcon, Sparkles, Gift, Clock, Move, 
  Minus, RotateCcw, RotateCw, FlipHorizontal, ArrowRight, ExternalLink,
  AlignHorizontalDistributeCenter, AlignVerticalDistributeCenter
} from 'lucide-react';

// ==========================================
// MOCK DEPENDENCIES & UTILS (MENGGANTIKAN @/...)
// ==========================================

const cn = (...classes: (string | boolean | undefined | null)[]) => classes.filter(Boolean).join(' ');
const FORMAT_IDR = (val: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(val);

const toast = { 
  success: (msg: string) => alert(`✅ Sukses: ${msg}`), 
  error: (msg: string) => alert(`❌ Error: ${msg}`),
  loading: (msg: string, opts?: any) => console.log(`Memuat: ${msg}`),
  dismiss: (id?: string) => console.log('Selesai memuat')
};

// Global State Mock agar perubahan database terasa real-time tanpa backend asli
let globalStoreSettings = [{ id: 1, promoBanners: [] as PromoBanner[] }];
let listeners: (() => void)[] = [];
const subscribe = (fn: () => void) => listeners.push(fn);
const trigger = () => listeners.forEach(fn => fn());

const useDbQuery = <T,>(table: string) => {
  const [data, setData] = useState<any[]>(() => {
    if (table === 'vouchers') return [{ id: 1, code: 'HEMAT50', type: 'percentage', value: 50 }, { id: 2, code: 'POTONGAN20', type: 'fixed', value: 20000 }];
    if (table === 'products') return [{ id: 1, name: 'Burger Spesial', price: 45000, photo: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=500&q=80' }];
    if (table === 'storeSettings') return globalStoreSettings;
    return [];
  });

  useEffect(() => {
    if (table === 'storeSettings') {
      const cb = () => setData([...globalStoreSettings]);
      subscribe(cb);
      return () => { listeners = listeners.filter(fn => fn !== cb); }
    }
  }, [table]);
  
  return data as T[];
};

const dbUpdate = async (table: string, id: any, newData: any) => {
  if (table === 'storeSettings') {
    globalStoreSettings[0] = newData;
    trigger();
  }
};
const dbUploadFile = async (folder: string, filename: string, dataUrl: string) => dataUrl; // Mock upload
const dbDeleteFile = async (url: string) => {}; // Mock delete

export interface Voucher { id?: number, code: string, type: string, value: number }
export interface Product { id?: number, name: string, price: number, photo?: string }
export interface StoreSettings { id: number, promoBanners?: PromoBanner[] }

// ==========================================
// MOCK SHADCN UI COMPONENTS
// ==========================================

const Button = ({ className, variant = 'default', size = 'default', ...props }: any) => {
  const variants: any = {
    default: 'bg-blue-600 text-white hover:bg-blue-700',
    outline: 'border border-slate-300 bg-transparent hover:bg-slate-100 text-slate-900',
    ghost: 'bg-transparent hover:bg-slate-100 text-slate-900',
  };
  return <button className={cn("inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors disabled:opacity-50 px-4 py-2", variants[variant], className)} {...props} />;
};

const Input = ({ className, ...props }: any) => (
  <input className={cn("flex h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500", className)} {...props} />
);

const Label = ({ className, ...props }: any) => <label className={cn("text-sm font-medium leading-none", className)} {...props} />;
const Card = ({ className, children }: any) => <div className={cn("rounded-xl border border-slate-200 bg-white text-slate-950 shadow-sm", className)}>{children}</div>;
const Badge = ({ className, ...props }: any) => <div className={cn("inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold", className)} {...props} />;
const Switch = ({ checked, onCheckedChange, className, id }: any) => (
  <button id={id} type="button" role="switch" aria-checked={checked} onClick={() => onCheckedChange(!checked)} className={cn("relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500", checked ? "bg-blue-600" : "bg-slate-200", className)}>
    <span className={cn("pointer-events-none block h-5 w-5 rounded-full bg-white shadow-lg ring-0 transition-transform", checked ? "translate-x-5" : "translate-x-0")} />
  </button>
);

// Simplified Dialog Context
const DialogContext = createContext<{ onOpenChange: (o: boolean) => void }>({ onOpenChange: () => {} });
const Dialog = ({ open, onOpenChange, children }: any) => {
  if (!open) return null;
  return (
    <DialogContext.Provider value={{ onOpenChange }}>
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={() => onOpenChange(false)}>
        {children}
      </div>
    </DialogContext.Provider>
  );
};
const DialogContent = ({ children, className }: any) => <div className={cn("bg-white shadow-2xl relative flex flex-col", className)} onClick={e => e.stopPropagation()}>{children}</div>;
const DialogHeader = ({ children, className }: any) => <div className={cn("px-6 py-5 border-b border-slate-100", className)}>{children}</div>;
const DialogTitle = ({ children, className }: any) => <h2 className={cn("text-xl font-bold", className)}>{children}</h2>;
const DialogFooter = ({ children, className }: any) => <div className={cn("px-6 py-4 border-t border-slate-100 flex justify-end gap-2", className)}>{children}</div>;

const AlertDialog = Dialog;
const AlertDialogContent = DialogContent;
const AlertDialogHeader = DialogHeader;
const AlertDialogTitle = DialogTitle;
const AlertDialogDescription = ({ children, className }: any) => <p className={cn("text-sm text-slate-500 mt-2", className)}>{children}</p>;
const AlertDialogFooter = DialogFooter;
const AlertDialogCancel = ({ children, className }: any) => {
  const { onOpenChange } = useContext(DialogContext);
  return <Button variant="outline" className={className} onClick={() => onOpenChange(false)}>{children}</Button>;
};
const AlertDialogAction = ({ children, className, onClick }: any) => <Button className={className} onClick={onClick}>{children}</Button>;

// Hacky HTML Select mapper to match the original Select syntax without needing heavy state
const extractOptions = (children: any): { value: string, label: string }[] => {
  let opts: any[] = [];
  React.Children.forEach(children, child => {
      if (!child) return;
      if (child.type === SelectItem) opts.push({ value: child.props.value, label: child.props.children });
      else if (child.props && child.props.children) opts = opts.concat(extractOptions(child.props.children));
  });
  return opts;
};
const Select = ({ value, onValueChange, children }: any) => {
  const options = extractOptions(children);
  return (
    <select className="flex h-11 w-full items-center justify-between rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-bold focus:ring-2 focus:ring-blue-500 focus:outline-none" value={value} onChange={e => onValueChange(e.target.value)}>
      <option value="" disabled hidden>Pilih...</option>
      {options.map((o, i) => <option key={i} value={o.value}>{o.label}</option>)}
    </select>
  );
};
const SelectTrigger = () => null;
const SelectContent = () => null;
const SelectItem = (props: any) => null;
const SelectValue = () => null;


// ==========================================
// ORIGINAL COMPONENT CODE
// ==========================================

export interface PromoBanner {
  id: number | string;
  type: 'voucher' | 'menu' | 'custom';
  title: string;
  description: string;
  voucherId?: string | number;
  productId?: string | number;
  imageUrl?: string | null;
  overlayImageUrl?: string | null;
  titlePos?: { x: number, y: number };
  descPos?: { x: number, y: number };
  overlayPos?: { x: number, y: number };
  buttonPos?: { x: number, y: number };
  buttonText?: string;
  link?: string;
  isActive: boolean;
  bgType?: 'image' | 'solid' | 'gradient';
  bgColor?: string;
  bgGradient?: string;
  overlayScale?: number;
  overlayRotate?: number;
  overlayFlipX?: boolean;
}

function DraggableItem({ pos, isDragging, onPointerDown, children, type, isSelected }: any) {
  const transform = type === 'overlay' ? 'translate(-50%, -50%)' : 'translate(0%, -50%)';
  
  return (
    <div 
      style={{ 
        position: 'absolute', 
        left: `${pos.x}%`, 
        top: `${pos.y}%`, 
        transform, 
        width: 'max-content',
        minWidth: 'max-content',
        maxWidth: 'none',
        right: 'auto',
      }}
      onPointerDown={onPointerDown}
      className={cn(
        "select-none z-40 touch-none whitespace-nowrap flex shrink-0 cursor-grab active:cursor-grabbing group transition-[box-shadow,transform] duration-75",
        (isDragging || isSelected) && "z-50",
        type === 'overlay' && (isDragging || isSelected) && "ring-2 ring-cyan-400 ring-offset-2 ring-offset-slate-900/50 rounded-lg",
        type !== 'overlay' && (isDragging || isSelected) && "after:absolute after:-inset-2 after:border-2 after:border-cyan-400/80 after:border-dashed after:rounded-md",
        isDragging && "scale-[1.02]"
      )}
    >
      {children}
    </div>
  )
}

export default function App() {
  const vouchers = (useDbQuery<Voucher>('vouchers') as Voucher[]) ?? [];
  const products = (useDbQuery<Product>('products') as Product[]) ?? [];
  const [bannerDialogOpen, setBannerDialogOpen] = useState(false);
  const [deleteBannerId, setDeleteBannerId] = useState<string | number | null>(null);
  const [editBanner, setEditBanner] = useState<PromoBanner | null>(null);

  const [bannerType, setBannerType] = useState<'voucher' | 'menu' | 'custom'>('custom');
  const [bannerTitle, setBannerTitle] = useState('');
  const [bannerDesc, setBannerDesc] = useState('');
  const [bannerVoucherId, setBannerVoucherId] = useState<string>('');
  const [bannerProductId, setBannerProductId] = useState<string>('');
  const [bannerImage, setBannerImage] = useState<string | null>(null);
  const [bannerLink, setBannerLink] = useState('');
  const [bannerButtonText, setBannerButtonText] = useState('');
  const [bannerIsActive, setBannerIsActive] = useState(true);
  const [bannerBgType, setBannerBgType] = useState<'image' | 'solid' | 'gradient'>('image');
  const [bannerBgColor, setBannerBgColor] = useState('#1E293B');
  const [bannerBgGradient, setBannerBgGradient] = useState('linear-gradient(to bottom right, #3b82f6, #9333ea)');

  // Drag and drop states
  const [overlayImage, setOverlayImage] = useState<string | null>(null);
  const [titlePos, setTitlePos] = useState({ x: 8, y: 30 });
  const [descPos, setDescPos] = useState({ x: 8, y: 70 });
  const [overlayPos, setOverlayPos] = useState({ x: 85, y: 50 });
  const [buttonPos, setButtonPos] = useState({ x: 8, y: 80 });
  
  const [dragTarget, setDragTarget] = useState<'title' | 'desc' | 'overlay' | 'button' | null>(null);
  const [selectedTarget, setSelectedTarget] = useState<'title' | 'desc' | 'overlay' | 'button' | null>(null);
  
  // Transform states for overlay
  const [overlayScale, setOverlayScale] = useState<number>(1);
  const [overlayRotate, setOverlayRotate] = useState<number>(0);
  const [overlayFlipX, setOverlayFlipX] = useState<boolean>(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const overlayInputRef = useRef<HTMLInputElement>(null);
  const previewRef = useRef<HTMLDivElement>(null);

  const storeSettingsList = useDbQuery<StoreSettings>('storeSettings');
  const storeSettings = storeSettingsList?.[0] || null;

  if (storeSettingsList === undefined) {
    return (
      <div className="flex items-center justify-center p-12 w-full min-h-screen bg-slate-50">
        <Clock className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  // --- CANVA-STYLE DRAG & DROP ENGINE ---
  const handleDragStart = (e: React.PointerEvent<HTMLDivElement>, target: 'title' | 'desc' | 'overlay' | 'button') => {
    e.preventDefault();
    e.stopPropagation();
    
    const el = e.currentTarget;
    el.setPointerCapture(e.pointerId);
    setDragTarget(target);
    setSelectedTarget(target);

    const canvas = previewRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();

    const startMouseX = e.clientX;
    const startMouseY = e.clientY;

    let initialX = target === 'title' ? titlePos.x : target === 'desc' ? descPos.x : target === 'overlay' ? overlayPos.x : buttonPos.x;
    let initialY = target === 'title' ? titlePos.y : target === 'desc' ? descPos.y : target === 'overlay' ? overlayPos.y : buttonPos.y;

    let currentX = initialX;
    let currentY = initialY;

    const guideV = document.getElementById('guide-v');
    const guideH = document.getElementById('guide-h');

    const handlePointerMove = (moveEvent: PointerEvent) => {
      const deltaXPercent = ((moveEvent.clientX - startMouseX) / rect.width) * 100;
      const deltaYPercent = ((moveEvent.clientY - startMouseY) / rect.height) * 100;

      let rawX = initialX + deltaXPercent;
      let rawY = initialY + deltaYPercent;

      let snappedX = false;
      let snappedY = false;
      const snapThresholdX = 2; 
      const snapThresholdY = 4; 

      const snapPointsX = target === 'overlay' ? [10, 25, 50, 75, 90] : [8, 25, 50, 90]; 
      const snapPointsY = [15, 25, 50, 75, 85];

      for (const snap of snapPointsX) {
        if (Math.abs(rawX - snap) < snapThresholdX) {
          rawX = snap;
          snappedX = true;
          break;
        }
      }

      for (const snap of snapPointsY) {
        if (Math.abs(rawY - snap) < snapThresholdY) {
          rawY = snap;
          snappedY = true;
          break;
        }
      }

      rawX = Math.max(0, Math.min(100, rawX));
      rawY = Math.max(0, Math.min(100, rawY));

      currentX = rawX;
      currentY = rawY;

      el.style.left = `${rawX}%`;
      el.style.top = `${rawY}%`;

      if (guideV) {
        guideV.style.opacity = snappedX ? '1' : '0';
        guideV.style.left = `${rawX}%`;
      }
      if (guideH) {
        guideH.style.opacity = snappedY ? '1' : '0';
        guideH.style.top = `${rawY}%`;
      }

      if (target === 'overlay') {
        const toolbar = el.querySelector('.floating-toolbar') as HTMLDivElement | null;
        if (toolbar) {
          if (rawY < 25) {
            toolbar.style.bottom = '-60px';
            toolbar.style.top = 'auto';
          } else {
            toolbar.style.top = '-60px';
            toolbar.style.bottom = 'auto';
          }
        }
      }
    };

    const handlePointerUp = (upEvent: PointerEvent) => {
      el.releasePointerCapture(upEvent.pointerId);
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
      
      setDragTarget(null);
      
      if (guideV) guideV.style.opacity = '0';
      if (guideH) guideH.style.opacity = '0';

      if (target === 'title') setTitlePos({ x: currentX, y: currentY });
      else if (target === 'desc') setDescPos({ x: currentX, y: currentY });
      else if (target === 'overlay') setOverlayPos({ x: currentX, y: currentY });
      else if (target === 'button') setButtonPos({ x: currentX, y: currentY });
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
  };


  const openAddBanner = () => {
    setEditBanner(null);
    setBannerType('custom');
    setBannerTitle('');
    setBannerDesc('');
    setBannerVoucherId('');
    setBannerProductId('');
    setBannerLink('');
    setBannerButtonText('');
    setBannerIsActive(true);
    setBannerImage(null);
    setOverlayImage(null);
    setOverlayScale(1);
    setOverlayRotate(0);
    setOverlayFlipX(false);
    setTitlePos({ x: 8, y: 30 });
    setDescPos({ x: 8, y: 60 });
    setOverlayPos({ x: 85, y: 50 });
    setButtonPos({ x: 8, y: 80 });
    setBannerBgType('image');
    setBannerBgColor('#1E293B');
    setBannerBgGradient('linear-gradient(to bottom right, #3b82f6, #9333ea)');
    setSelectedTarget(null);
    setBannerDialogOpen(true);
  };

  const openEditBanner = (b: PromoBanner) => {
    setEditBanner(b);
    setBannerType(b.type);
    setBannerTitle(b.title);
    setBannerDesc(b.description);
    setBannerVoucherId(String(b.voucherId || ''));
    setBannerProductId(String(b.productId || ''));
    setBannerLink(b.link || '');
    setBannerButtonText(b.buttonText || '');
    setBannerImage(b.imageUrl || null);
    setOverlayImage(b.overlayImageUrl || null);
    setOverlayScale(b.overlayScale ?? 1);
    setOverlayRotate(b.overlayRotate ?? 0);
    setOverlayFlipX(b.overlayFlipX ?? false);
    setTitlePos(b.titlePos || { x: 8, y: 30 });
    setDescPos(b.descPos || { x: 8, y: 60 });
    setOverlayPos(b.overlayPos || { x: 85, y: 50 });
    setButtonPos(b.buttonPos || { x: 8, y: 80 });
    setBannerIsActive(b.isActive);
    setBannerBgType(b.bgType || 'image');
    setBannerBgColor(b.bgColor || '#1E293B');
    setBannerBgGradient(b.bgGradient || 'linear-gradient(to bottom right, #3b82f6, #9333ea)');
    setSelectedTarget(null);
    setBannerDialogOpen(true);
  };

  const handleBannerVoucherChange = (vId: string) => {
    setBannerVoucherId(vId);
    const v = vouchers.find(x => x.id?.toString() === vId);
    if (v) {
      setBannerTitle(`Promo Spesial ${v.code}`);
      setBannerDesc(`Dapatkan diskon ${v.type === 'percentage' ? `${v.value}%` : FORMAT_IDR(v.value)} untuk pesanan Anda menggunakan kode promo ini!`);
      setBannerImage(null);
      setOverlayImage(null);
    }
  };

  const handleBannerProductChange = (pId: string) => {
    setBannerProductId(pId);
    const p = products.find(x => x.id?.toString() === pId);
    if (p) {
      setBannerTitle(`Coba Menu Baru: ${p.name}!`);
      setBannerDesc(`Nikmati sensasi kelezatan menu rekomendasi ${p.name} hari ini, hanya seharga ${FORMAT_IDR(p.price)}!`);
      setBannerImage(p.photo || null);
      setOverlayImage(null);
    }
  };

  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>, isOverlay: boolean = false) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error('File harus berupa gambar');
      return;
    }
    
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      if (isOverlay) {
        setOverlayImage(dataUrl);
        setOverlayScale(1);
        setOverlayRotate(0);
        setOverlayFlipX(false);
        setSelectedTarget('overlay');
      } else {
        setBannerImage(dataUrl);
      }
    };
    reader.readAsDataURL(file);
    if (isOverlay && overlayInputRef.current) overlayInputRef.current.value = '';
    if (!isOverlay && fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSaveBanner = async () => {
    if (!bannerTitle.trim() || !bannerDesc.trim()) {
      toast.error('Harap isi judul dan deskripsi penawaran');
      return;
    }
    if (!storeSettings?.id) {
      toast.error('Pengaturan toko utama belum diatur. Harap isi data di menu Pengaturan terlebih dahulu.');
      return;
    }

    const currentBanners: PromoBanner[] = storeSettings.promoBanners || [];
    
    let finalImageUrl = bannerImage;
    if (bannerImage && bannerImage.startsWith('data:image')) {
      toast.loading('Mengunggah gambar latar...', { id: 'upload-bg' });
      try {
        const url = await dbUploadFile('banners', `banner-bg-${Date.now()}.jpg`, bannerImage);
        if (url) finalImageUrl = url;
        toast.dismiss('upload-bg');
      } catch (e) {
        toast.dismiss('upload-bg');
        toast.error('Gagal mengunggah gambar latar');
        return;
      }
    }

    let finalOverlayUrl = overlayImage;
    if (overlayImage && overlayImage.startsWith('data:image')) {
      toast.loading('Mengunggah foto overlay...', { id: 'upload-overlay' });
      try {
        const url = await dbUploadFile('banners', `banner-overlay-${Date.now()}.png`, overlayImage);
        if (url) finalOverlayUrl = url;
        toast.dismiss('upload-overlay');
      } catch (e) {
        toast.dismiss('upload-overlay');
        toast.error('Gagal mengunggah foto overlay');
        return;
      }
    }
    
    const bannerData: PromoBanner = {
      id: editBanner ? editBanner.id : Date.now().toString(),
      type: bannerType,
      title: bannerTitle.trim(),
      description: bannerDesc.trim(),
      voucherId: bannerType === 'voucher' ? Number(bannerVoucherId) || bannerVoucherId : undefined,
      productId: bannerType === 'menu' ? Number(bannerProductId) || bannerProductId : undefined,
      imageUrl: finalImageUrl,
      overlayImageUrl: finalOverlayUrl,
      titlePos,
      descPos,
      overlayPos,
      buttonPos,
      buttonText: bannerButtonText.trim(),
      link: bannerLink.trim(),
      isActive: bannerIsActive,
      bgType: bannerBgType,
      bgColor: bannerBgType === 'solid' ? bannerBgColor : undefined,
      bgGradient: bannerBgType === 'gradient' ? bannerBgGradient : undefined,
      overlayScale,
      overlayRotate,
      overlayFlipX
    };

    let updatedBanners: PromoBanner[];
    if (editBanner) {
      if (editBanner.imageUrl && finalImageUrl && editBanner.imageUrl !== finalImageUrl) {
        if (editBanner.imageUrl.includes('banners')) await dbDeleteFile(editBanner.imageUrl);
      }
      if (editBanner.overlayImageUrl && finalOverlayUrl && editBanner.overlayImageUrl !== finalOverlayUrl) {
        if (editBanner.overlayImageUrl.includes('banners')) await dbDeleteFile(editBanner.overlayImageUrl);
      }
      updatedBanners = currentBanners.map(b => b.id === editBanner.id ? bannerData : b);
    } else {
      updatedBanners = [...currentBanners, bannerData];
    }

    try {
      await dbUpdate('storeSettings', storeSettings.id, {
        ...storeSettings,
        promoBanners: updatedBanners
      });
      toast.success(editBanner ? 'Banner penawaran diperbarui' : 'Banner penawaran baru ditambahkan');
      setBannerDialogOpen(false);
    } catch (err) {
      toast.error('Gagal menyimpan banner penawaran');
    }
  };

  const handleDeleteBanner = async () => {
    if (deleteBannerId && storeSettings?.id) {
      const bannerToDelete = currentBanners.find(b => b.id === deleteBannerId);
      const updatedBanners = currentBanners.filter(b => b.id !== deleteBannerId);
      
      try {
        if (bannerToDelete?.imageUrl && bannerToDelete.imageUrl.includes('banners')) {
          await dbDeleteFile(bannerToDelete.imageUrl);
        }
        if (bannerToDelete?.overlayImageUrl && bannerToDelete.overlayImageUrl.includes('banners')) {
          await dbDeleteFile(bannerToDelete.overlayImageUrl);
        }
        await dbUpdate('storeSettings', storeSettings.id, {
          ...storeSettings,
          promoBanners: updatedBanners
        });
        toast.success('Banner penawaran berhasil dihapus');
      } catch (err) {
        toast.error('Gagal menghapus banner penawaran');
      } finally {
        setDeleteBannerId(null);
      }
    }
  };

  const handleToggleBannerActive = async (bId: string | number, currentActive: boolean) => {
    if (!storeSettings?.id) return;
    const currentBanners: PromoBanner[] = storeSettings.promoBanners || [];
    const updatedBanners = currentBanners.map(b => b.id === bId ? { ...b, isActive: !currentActive } : b);
    
    try {
      await dbUpdate('storeSettings', storeSettings.id, { ...storeSettings, promoBanners: updatedBanners });
      toast.success(!currentActive ? 'Banner penawaran diaktifkan' : 'Banner penawaran dinonaktifkan');
    } catch (err) {
      toast.error('Gagal mengubah status banner');
    }
  };

  const bannerList: PromoBanner[] = storeSettings?.promoBanners || [];
  const currentBanners: PromoBanner[] = storeSettings?.promoBanners || [];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 px-4 pt-6 pb-24 w-full mx-auto animate-in fade-in duration-300 font-sans">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h3 className="text-2xl font-black">Pengaturan Banner Penawaran</h3>
            <p className="text-sm text-slate-500 mt-1">Atur banner promo, produk unggulan, atau pengumuman khusus yang tampil di bagian teratas Beranda Pelanggan.</p>
          </div>
          <Button onClick={openAddBanner} className="h-11 px-5 rounded-xl font-bold shadow-md active:scale-[0.98] transition-all shrink-0">
            <Plus className="w-5 h-5 mr-2" strokeWidth={3} />
            Tambah Banner
          </Button>
        </div>

        {bannerList.length === 0 ? (
          <div className="bg-white border border-dashed border-slate-300 rounded-[2rem] p-12 flex flex-col items-center justify-center text-center opacity-80 mt-6 shadow-sm">
            <div className="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center mb-4">
              <Sparkles className="w-10 h-10 text-blue-400" strokeWidth={1.5} />
            </div>
            <h3 className="text-lg font-bold mb-1">Belum Ada Banner Kustom</h3>
            <p className="text-sm text-slate-500 max-w-sm">Anda belum menambahkan penawaran kustom. Sistem saat ini menampilkan voucher aktif sebagai banner fallback di beranda customer.</p>
            <Button variant="outline" className="mt-6 rounded-xl border-blue-200 text-blue-600 hover:bg-blue-50 font-bold" onClick={openAddBanner}>
              <Plus className="w-4 h-4 mr-2" /> Tambah Banner Pertama
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 mt-6">
            {bannerList.map(b => (
              <Card key={b.id} className="border border-slate-200 rounded-[2rem] overflow-hidden flex flex-col hover:shadow-xl transition-all duration-300">
                <div className="p-6 flex flex-col lg:flex-row gap-6 items-center">
                  
                  {/* Visual Preview Card */}
                  <div 
                    className="w-full lg:w-[420px] aspect-[21/9] rounded-2xl text-white relative overflow-hidden shadow-md shrink-0 select-none bg-slate-900"
                    style={{ 
                      background: b.bgType === 'solid' ? b.bgColor : b.bgType === 'gradient' ? b.bgGradient : undefined,
                      containerType: 'inline-size'
                    }}
                  >
                    {b.imageUrl ? (
                      <div className="absolute inset-0 z-0">
                        <img src={b.imageUrl} alt="Banner" className="w-full h-full object-cover opacity-55" />
                        <div className="absolute inset-0 bg-gradient-to-r from-black/85 via-black/40 to-transparent" />
                      </div>
                    ) : (
                      <Gift size={90} className="absolute -right-3 -bottom-3 text-white/10 rotate-[-15deg] z-0" />
                    )}
                    
                    {b.overlayImageUrl && (
                      <div 
                        style={{ 
                          position: 'absolute', 
                          left: `${b.overlayPos?.x ?? 85}%`, 
                          top: `${b.overlayPos?.y ?? 50}%`, 
                          transform: 'translate(-50%, -50%)', 
                          zIndex: 5 
                        }}
                      >
                         <img 
                           src={b.overlayImageUrl} 
                           style={{
                             transform: `scaleX(${b.overlayFlipX ? -1 : 1}) rotate(${b.overlayRotate ?? 0}deg)`,
                             width: `calc(${b.overlayScale ?? 1} * 20cqw)`,
                             height: 'auto',
                           }}
                           className="object-contain drop-shadow-2xl max-w-none" 
                           alt="Overlay"
                         />
                      </div>
                    )}

                    <div style={{ position: 'absolute', left: `${b.titlePos?.x ?? 8}%`, top: `${b.titlePos?.y ?? 30}%`, transform: 'translate(0%, -50%)', zIndex: 10 }} className="w-[70cqw] max-w-[75cqw]">
                       <span className="bg-white/20 text-[2.2cqw] px-[1.5cqw] py-[0.5cqw] rounded backdrop-blur-md font-bold inline-block uppercase tracking-widest border border-white/10 mb-[1.5cqw]">
                          {b.type === 'voucher' ? 'Promo Voucher' : b.type === 'menu' ? 'Menu Rekomendasi' : 'Spesial Penawaran'}
                       </span>
                       <h4 className="font-black text-[4.5cqw] leading-[1.15] line-clamp-2 drop-shadow-sm">{b.title}</h4>
                    </div>
                    
                    <div style={{ position: 'absolute', left: `${b.descPos?.x ?? 8}%`, top: `${b.descPos?.y ?? 70}%`, transform: 'translate(0%, -50%)', zIndex: 10 }} className="w-[70cqw] max-w-[75cqw] pointer-events-none">
                       <p className="text-[2.8cqw] text-slate-100 line-clamp-3 leading-[1.3] font-medium drop-shadow-sm m-0">{b.description}</p>
                       <div className="mt-[1.5cqw] text-[2.4cqw] bg-white text-slate-900 font-extrabold px-[2.5cqw] py-[0.8cqw] rounded-md shadow-sm pointer-events-auto inline-block">
                          {b.buttonText || 'Lihat Detail'}
                       </div>
                    </div>
                  </div>

                  {/* Meta Info & Controls */}
                  <div className="flex-1 w-full flex flex-col justify-between py-2">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className={cn(
                          "text-[9px] font-black uppercase px-2.5 py-0.5 rounded-md border-none tracking-widest",
                          b.isActive ? "bg-green-50 text-green-700" : "bg-slate-100 text-slate-500"
                        )}>
                          {b.isActive ? 'Aktif di Beranda' : 'Nonaktif / Arsip'}
                        </Badge>
                        <Badge className="bg-slate-100 text-slate-700 hover:bg-slate-200 text-[9px] font-bold px-2 py-0.5 rounded-md border-transparent">
                          Tipe: {b.type === 'voucher' ? 'Voucher' : b.type === 'menu' ? 'Produk Baru' : 'Kustom Bebas'}
                        </Badge>
                      </div>
                      <h4 className="font-extrabold text-lg sm:text-xl text-slate-900 leading-snug">{b.title}</h4>
                      <p className="text-sm text-slate-500 leading-relaxed">{b.description}</p>
                    </div>

                    <div className="flex items-center justify-between mt-6 pt-4 border-t border-slate-100 w-full">
                      <div className="flex items-center gap-3">
                        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Status Tampil</span>
                        <Switch 
                          id={`switch-${b.id}`}
                          checked={b.isActive} 
                          onCheckedChange={() => handleToggleBannerActive(b.id, b.isActive)} 
                        />
                      </div>

                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" className="h-9 px-4 rounded-xl font-bold text-xs flex items-center gap-1.5" onClick={() => openEditBanner(b)}>
                          <Edit2 className="w-3.5 h-3.5" /> Edit Desain
                        </Button>
                        <Button variant="outline" className="h-9 w-9 p-0 rounded-xl hover:bg-red-50 hover:text-red-600 hover:border-red-200 text-slate-400" onClick={() => setDeleteBannerId(b.id)}>
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
      </div>

      {/* Modal Add/Edit Banner Penawaran - WORKSPACE DIALOG */}
      <Dialog open={bannerDialogOpen} onOpenChange={setBannerDialogOpen}>
        <DialogContent className="max-w-[1200px] w-[96vw] rounded-[2rem] p-0 overflow-hidden border-slate-200 flex flex-col">
          <DialogHeader className="px-6 py-5 border-b border-slate-100 bg-slate-50/50 shrink-0">
            <DialogTitle className="text-xl font-extrabold flex items-center gap-2">
              <div className="p-1.5 bg-blue-100 rounded-lg text-blue-600">
                {editBanner ? <Edit2 className="w-5 h-5" /> : <Sparkles className="w-5 h-5" strokeWidth={2.5} />}
              </div>
              {editBanner ? 'Workspace Desain Banner' : 'Workspace Tambah Banner'}
            </DialogTitle>
          </DialogHeader>

          <div 
            className="p-6 space-y-6 overflow-y-auto" 
            style={{ maxHeight: 'calc(100vh - 180px)' }}
            onClick={() => setSelectedTarget(null)} 
          >
            
            {/* AREA 1: KANVAS DESAIN VISUAL */}
            <div className="space-y-3 w-full max-w-[1100px] mx-auto">
              <div className="flex items-center justify-between">
                 <Label className="text-xs font-black text-slate-500 uppercase tracking-wider">Canvas Desain Interaktif</Label>
                 <span className="text-[10px] text-cyan-700 bg-cyan-50 px-2.5 py-1 rounded-md font-bold flex items-center gap-1.5 border border-cyan-200">
                   <Move className="w-3.5 h-3.5" /> Sentuh & Geser Komponen (Auto-Snap)
                 </span>
              </div>

              {/* LIVE CANVAS PREVIEW */}
              <div 
                ref={previewRef}
                className="w-full aspect-[21/9] rounded-2xl text-white relative overflow-hidden shadow-inner border border-slate-200 select-none bg-slate-900 touch-none"
                style={{ 
                  background: bannerBgType === 'solid' ? bannerBgColor : bannerBgType === 'gradient' ? bannerBgGradient : undefined,
                  containerType: 'inline-size'
                }}
              >
                {/* --- SMART GUIDES (CANVA STYLE) --- */}
                <div id="guide-v" className="absolute top-0 bottom-0 w-[1px] bg-cyan-400 z-30 pointer-events-none opacity-0 transition-opacity duration-150 shadow-[0_0_4px_rgba(34,211,238,0.8)]" style={{ left: '50%' }} />
                <div id="guide-h" className="absolute left-0 right-0 h-[1px] bg-cyan-400 z-30 pointer-events-none opacity-0 transition-opacity duration-150 shadow-[0_0_4px_rgba(34,211,238,0.8)]" style={{ top: '50%' }} />

                {bannerBgType === 'image' && bannerImage ? (
                  <div className="absolute inset-0 z-0 select-none pointer-events-none">
                    <img src={bannerImage} alt="Bg" className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/45" />
                  </div>
                ) : bannerBgType === 'image' ? (
                  <div className="absolute inset-0 bg-slate-900 flex items-center justify-center opacity-30 select-none pointer-events-none">
                    <ImageIcon size={48} />
                  </div>
                ) : null}

                {/* OVERLAY IMAGE WITH BOUNDING BOX & FLOATING TOOLBAR */}
                {overlayImage && (
                  <DraggableItem 
                    pos={overlayPos} 
                    isDragging={dragTarget === 'overlay'} 
                    isSelected={selectedTarget === 'overlay'}
                    onPointerDown={(e: any) => { 
                      if (e.target.closest('.no-drag')) return;
                      handleDragStart(e, 'overlay'); 
                    }}
                    type="overlay"
                  >
                    <div className="relative p-1 md:p-2 bg-transparent select-none whitespace-nowrap flex shrink-0">
                      <img 
                        src={overlayImage} 
                        style={{
                          transform: `scaleX(${overlayFlipX ? -1 : 1}) rotate(${overlayRotate}deg)`,
                          width: `calc(${overlayScale} * 20cqw)`,
                          height: 'auto',
                        }}
                        className="object-contain drop-shadow-2xl pointer-events-none select-none max-w-none" 
                        alt="Overlay" 
                      />
                      
                      {/* Floating actions toolbar (Visible when active) */}
                      {(dragTarget === 'overlay' || selectedTarget === 'overlay') && (
                        <div 
                          style={overlayPos.y < 25 ? { bottom: '-60px', top: 'auto' } : { top: '-60px', bottom: 'auto' }}
                          className="floating-toolbar no-drag absolute left-1/2 -translate-x-1/2 bg-slate-900 text-white border border-slate-700 rounded-lg shadow-xl flex items-center gap-1 p-1.5 z-50 backdrop-blur-sm transition-all duration-200"
                        >
                          <Button 
                            variant="ghost" 
                            className="w-7 h-7 hover:bg-white/10 rounded-md text-white p-0 shrink-0 border-none" 
                            onPointerDown={(e: any) => e.stopPropagation()}
                            onClick={(e: any) => { e.stopPropagation(); setOverlayScale(prev => Math.max(0.2, Math.round((prev - 0.1) * 10) / 10)); }} 
                            title="Kecilkan"
                          >
                            <Minus className="w-3.5 h-3.5" />
                          </Button>
                          <span className="text-[10px] font-mono font-black px-1.5 select-none shrink-0">{Math.round(overlayScale * 100)}%</span>
                          <Button 
                            variant="ghost" 
                            className="w-7 h-7 hover:bg-white/10 rounded-md text-white p-0 shrink-0 border-none" 
                            onPointerDown={(e: any) => e.stopPropagation()}
                            onClick={(e: any) => { e.stopPropagation(); setOverlayScale(prev => Math.min(3.0, Math.round((prev + 0.1) * 10) / 10)); }} 
                            title="Besarkan"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </Button>
                          <div className="w-[1px] h-4 bg-white/20 mx-1" />
                          <Button 
                            variant="ghost" 
                            className="w-7 h-7 hover:bg-white/10 rounded-md text-white p-0 shrink-0 border-none" 
                            onPointerDown={(e: any) => e.stopPropagation()}
                            onClick={(e: any) => { e.stopPropagation(); setOverlayRotate(prev => (prev - 15) % 360); }} 
                            title="Putar Kiri"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            className="w-7 h-7 hover:bg-white/10 rounded-md text-white p-0 shrink-0 border-none" 
                            onPointerDown={(e: any) => e.stopPropagation()}
                            onClick={(e: any) => { e.stopPropagation(); setOverlayRotate(prev => (prev + 15) % 360); }} 
                            title="Putar Kanan"
                          >
                            <RotateCw className="w-3.5 h-3.5" />
                          </Button>
                          <div className="w-[1px] h-4 bg-white/20 mx-1" />
                          <Button 
                            variant="ghost" 
                            className={cn("w-7 h-7 hover:bg-white/10 rounded-md text-white p-0 shrink-0 border-none", overlayFlipX && "bg-cyan-500/30 text-cyan-300")} 
                            onPointerDown={(e: any) => e.stopPropagation()}
                            onClick={(e: any) => { e.stopPropagation(); setOverlayFlipX(prev => !prev); }} 
                            title="Balik Horisontal"
                          >
                            <FlipHorizontal className="w-3.5 h-3.5" />
                          </Button>
                          <div className="w-[1px] h-4 bg-white/20 mx-1" />
                          <Button 
                            variant="ghost" 
                            className="w-7 h-7 text-red-400 hover:bg-red-500/20 rounded-md p-0 shrink-0 border-none" 
                            onPointerDown={(e: any) => e.stopPropagation()}
                            onClick={(e: any) => { e.stopPropagation(); setOverlayImage(null); setSelectedTarget(null); }} 
                            title="Hapus Overlay"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      )}
                    </div>
                  </DraggableItem>
                )}

                {/* TITLE DRAG */}
                <DraggableItem 
                  pos={titlePos} 
                  isDragging={dragTarget === 'title'} 
                  isSelected={selectedTarget === 'title'}
                  onPointerDown={(e: any) => handleDragStart(e, 'title')}
                  type="title"
                >
                  <div className="w-[70cqw] max-w-[75cqw]">
                    <span className="text-[2.2cqw] px-[1.5cqw] py-[0.5cqw] rounded bg-white/20 backdrop-blur-md font-bold mb-[1.5cqw] inline-block uppercase tracking-wider border border-white/10 shadow-sm pointer-events-none">
                      {bannerType === 'voucher' ? 'Promo Voucher' : bannerType === 'menu' ? 'Menu Rekomendasi' : 'Spesial Penawaran'}
                    </span>
                    <h4 className="font-black text-[4.5cqw] leading-[1.15] line-clamp-2 drop-shadow-md pointer-events-none">
                      {bannerTitle || 'Judul Penawaran'}
                    </h4>
                  </div>
                </DraggableItem>

                {/* DESC DRAG */}
                <DraggableItem 
                  pos={descPos} 
                  isDragging={dragTarget === 'desc'} 
                  isSelected={selectedTarget === 'desc'}
                  onPointerDown={(e: any) => handleDragStart(e, 'desc')}
                  type="desc"
                >
                  <div className="w-[70cqw] max-w-[75cqw]">
                    <p className="text-[2.8cqw] text-slate-100 font-semibold line-clamp-3 leading-[1.3] drop-shadow-sm mb-[1.5cqw] pointer-events-none m-0">
                      {bannerDesc || 'Tulis deskripsi promo produk Anda di sini...'}
                    </p>
                    <button className="bg-white text-slate-900 text-[2.4cqw] font-extrabold px-[2.5cqw] py-[0.8cqw] rounded-md shadow-md pointer-events-none mt-[1.5cqw]">
                      {bannerButtonText || 'Lihat Detail'}
                    </button>
                  </div>
                </DraggableItem>
              </div>
            </div>

            {/* AREA 2: PARAMETER EDITING KONTEN & LATAR */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6 border-t border-slate-200 w-full max-w-[1100px] mx-auto">
               
               {/* Parameter Data & Teks */}
               <div className="space-y-4">
                  {/* Tipe Penawaran */}
                  <div className="space-y-2">
                    <Label className="text-xs font-black uppercase tracking-wider">Tipe Konten Penawaran <span className="text-red-500">*</span></Label>
                    <Select value={bannerType} onValueChange={(val: 'voucher' | 'menu' | 'custom') => {
                      setBannerType(val);
                      if (val === 'custom') { setBannerVoucherId(''); setBannerProductId(''); }
                    }}>
                      <SelectItem value="voucher">Kode Promo / Voucher</SelectItem>
                      <SelectItem value="menu">Menu Baru / Rekomendasi</SelectItem>
                      <SelectItem value="custom">Kustom Bebas (Manual)</SelectItem>
                    </Select>
                  </div>

                  {bannerType === 'voucher' && (
                    <div className="space-y-2">
                      <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Pilih Voucher</Label>
                      <Select value={bannerVoucherId} onValueChange={handleBannerVoucherChange}>
                        {vouchers.map(v => (
                          <SelectItem key={v.id} value={v.id!.toString()}>{v.code} (Diskon {v.type === 'percentage' ? `${v.value}%` : FORMAT_IDR(v.value)})</SelectItem>
                        ))}
                      </Select>
                    </div>
                  )}

                  {bannerType === 'menu' && (
                    <div className="space-y-2">
                      <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Pilih Produk</Label>
                      <Select value={bannerProductId} onValueChange={handleBannerProductChange}>
                        {products.map(p => (
                          <SelectItem key={p.id} value={p.id!.toString()}>{p.name} ({FORMAT_IDR(p.price)})</SelectItem>
                        ))}
                      </Select>
                    </div>
                  )}

                  {/* Title & Desc */}
                  <div className="space-y-2">
                    <Label className="text-xs font-black uppercase tracking-wider">Judul Banner <span className="text-red-500">*</span></Label>
                    <Input 
                      value={bannerTitle} 
                      onChange={(e: any) => { setBannerTitle(e.target.value); setSelectedTarget('title'); }} 
                      maxLength={45} 
                      placeholder="Contoh: Promo Spesial Weekend!" 
                      className={cn("h-11 rounded-xl font-semibold text-sm focus:border-cyan-500", selectedTarget === 'title' && "ring-2 ring-cyan-500/50")} 
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label className="text-xs font-black uppercase tracking-wider">Deskripsi Singkat <span className="text-red-500">*</span></Label>
                    <textarea 
                      value={bannerDesc} 
                      onChange={(e: any) => { setBannerDesc(e.target.value); setSelectedTarget('desc'); }} 
                      rows={3} 
                      maxLength={120} 
                      placeholder="Ketik keterangan promo di sini..." 
                      className={cn("w-full p-3 bg-white rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-cyan-500 text-sm font-semibold resize-none", selectedTarget === 'desc' && "ring-2 ring-cyan-500/50 border-cyan-500")} 
                    />
                  </div>
               </div>

               {/* Parameter Desain & Upload */}
               <div className="space-y-4">
                  {/* Background Selector */}
                  <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-4">
                    <div className="space-y-2">
                      <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Tipe Latar Belakang Canvas</Label>
                      <Select value={bannerBgType} onValueChange={(val: any) => setBannerBgType(val)}>
                        <SelectItem value="image">Gambar Latar Kustom (Upload)</SelectItem>
                        <SelectItem value="solid">Warna Solid Tunggal</SelectItem>
                        <SelectItem value="gradient">Warna Gradasi Modern</SelectItem>
                      </Select>
                    </div>

                    {bannerBgType === 'image' && (
                      <div className="flex gap-3 items-center">
                        <div className="w-16 h-12 rounded-lg border border-slate-300 bg-slate-200 flex items-center justify-center overflow-hidden shrink-0">
                          {bannerImage && !bannerImage.startsWith('preset:') ? <img src={bannerImage} alt="Preview" className="w-full h-full object-cover" /> : <ImageIcon className="w-5 h-5 text-slate-400" />}
                        </div>
                        <div className="flex-1">
                          <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={e => handleImageSelect(e, false)} />
                          <Button type="button" variant="outline" className="rounded-lg text-xs font-bold h-8 border-slate-300" onClick={() => fileInputRef.current?.click()}>Pilih File Latar</Button>
                          <p className="text-[9px] text-slate-400 mt-1">Rasio optimal 21:9.</p>
                        </div>
                      </div>
                    )}

                    {bannerBgType === 'solid' && (
                      <div className="space-y-3">
                        <div className="flex flex-wrap gap-2">
                          {['#0F172A', '#3B82F6', '#EF4444', '#EAB308', '#10B981', '#8B5CF6', '#F97316', '#64748B'].map(color => (
                            <button
                              key={color}
                              type="button"
                              onClick={() => setBannerBgColor(color)}
                              className={cn("w-8 h-8 rounded-full border-2 transition-transform hover:scale-110", bannerBgColor.toUpperCase() === color ? 'border-blue-500 shadow-md scale-110' : 'border-transparent')}
                              style={{ backgroundColor: color }}
                              title={color}
                            />
                          ))}
                        </div>
                        <div className="flex gap-3 items-center">
                          <Input type="color" value={bannerBgColor} onChange={(e: any) => setBannerBgColor(e.target.value)} className="w-14 h-11 p-1 cursor-pointer rounded-lg border-slate-300 shrink-0" />
                          <div className="flex-1">
                            <Input value={bannerBgColor} onChange={(e: any) => setBannerBgColor(e.target.value)} className="h-11 bg-white rounded-lg text-xs font-bold uppercase font-mono" />
                          </div>
                        </div>
                      </div>
                    )}

                    {bannerBgType === 'gradient' && (
                      <div className="space-y-3">
                        <div className="flex flex-wrap gap-2">
                          {[
                            'linear-gradient(to bottom right, #3b82f6, #9333ea)',
                            'linear-gradient(to bottom right, #ef4444, #f97316)',
                            'linear-gradient(to bottom right, #0f2027, #2c5364)',
                            'linear-gradient(to right, #11998e, #38ef7d)',
                            'linear-gradient(to right, #ff9966, #ff5e62)',
                            'linear-gradient(to right, #8e2de2, #4a00e0)'
                          ].map(grad => (
                            <button
                              key={grad}
                              type="button"
                              onClick={() => setBannerBgGradient(grad)}
                              className={cn("w-12 h-8 rounded-md border-2 transition-transform hover:scale-105", bannerBgGradient === grad ? 'border-blue-500 shadow-md scale-105' : 'border-transparent')}
                              style={{ background: grad }}
                              title={grad}
                            />
                          ))}
                        </div>
                        <div className="space-y-2">
                          <Input value={bannerBgGradient} onChange={(e: any) => setBannerBgGradient(e.target.value)} placeholder="linear-gradient(...)" className="h-11 bg-white rounded-lg text-xs font-bold font-mono" />
                          <div className="w-full h-8 rounded-lg border border-slate-300" style={{ background: bannerBgGradient }} />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Overlay Upload */}
                  <div className={cn("p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3 transition-colors", selectedTarget === 'overlay' && "border-cyan-500/50 bg-cyan-50")}>
                    <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Unggah Foto Produk PNG Transparan</Label>
                    <div className="flex gap-4 items-center">
                      <div className="w-16 h-16 rounded-xl border border-dashed border-slate-300 bg-white flex items-center justify-center overflow-hidden shrink-0">
                        {overlayImage ? <img src={overlayImage} alt="Overlay" className="w-full h-full object-contain" /> : <Gift className="w-5 h-5 text-slate-300" />}
                      </div>
                      <div className="flex-1">
                        <input ref={overlayInputRef} type="file" accept="image/png,image/webp" className="hidden" onChange={e => handleImageSelect(e, true)} />
                        <Button type="button" variant="outline" className="rounded-lg text-xs font-bold h-8 border-blue-200 text-blue-600 hover:bg-blue-50" onClick={() => overlayInputRef.current?.click()}>Pilih PNG Produk</Button>
                      </div>
                    </div>
                  </div>

                  <div className={cn("grid gap-4", bannerType === 'custom' ? "grid-cols-2" : "grid-cols-1")}>
                    <div className="space-y-1">
                      <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Teks Tombol Aksi</Label>
                      <Input value={bannerButtonText} onChange={(e: any) => setBannerButtonText(e.target.value)} placeholder="Beli Sekarang" className="h-10 bg-white rounded-xl font-semibold text-xs" />
                    </div>
                    {bannerType === 'custom' && (
                      <div className="space-y-1">
                        <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Tautan Web (Link URL)</Label>
                        <Input value={bannerLink} onChange={(e: any) => setBannerLink(e.target.value)} placeholder="https://instagram.com/..." className="h-10 bg-white rounded-xl font-semibold text-xs" />
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between p-3 bg-slate-100 border border-slate-200 rounded-xl mt-4">
                    <div className="flex flex-col">
                      <Label htmlFor="banner-active" className="text-xs font-bold cursor-pointer">Terbitkan Banner</Label>
                      <span className="text-[9px] text-slate-500">Aktifkan untuk menampilkan ke beranda customer.</span>
                    </div>
                    <Switch id="banner-active" checked={bannerIsActive} onCheckedChange={setBannerIsActive} />
                  </div>
               </div>
            </div>

          </div>

          <DialogFooter className="shrink-0 bg-slate-50/50">
            <Button variant="outline" className="h-11 rounded-xl font-bold border-slate-300 hover:bg-slate-100" onClick={() => setBannerDialogOpen(false)}>Batal</Button>
            <Button 
              className="h-11 rounded-xl font-bold text-white shadow-md active:scale-[0.98] transition-all px-8 bg-blue-600 hover:bg-blue-700" 
              onClick={handleSaveBanner} 
              disabled={!bannerTitle.trim() || !bannerDesc.trim()}
            >
              {editBanner ? 'Simpan Perubahan' : 'Terbitkan Banner'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Banner Modal */}
      <AlertDialog open={!!deleteBannerId} onOpenChange={() => setDeleteBannerId(null)}>
        <AlertDialogContent className="max-w-[400px] rounded-2xl p-6 text-center">
          <AlertDialogHeader>
            <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mb-2 mx-auto">
              <Trash2 className="w-6 h-6 text-red-600" />
            </div>
            <AlertDialogTitle className="text-center text-xl font-extrabold">Hapus Banner Penawaran?</AlertDialogTitle>
            <AlertDialogDescription className="text-center mx-auto">
              Banner penawaran menarik ini akan dihapus secara permanen dari beranda pelanggan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-6 sm:justify-center flex-row gap-3">
            <AlertDialogCancel className="flex-1 mt-0 rounded-xl h-11 font-bold bg-white text-slate-700">Batal</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteBanner} className="flex-1 rounded-xl h-11 font-bold bg-red-600 hover:bg-red-700 text-white shadow-md">
              Ya, Hapus
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
