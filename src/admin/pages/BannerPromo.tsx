import { useDbQuery, dbUpdate, dbUploadFile, dbDeleteFile, dbInsert, dbDelete } from '@/hooks/db-hooks';
import { type Voucher, type Product } from '@/hooks/db-hooks';
import { useState, useRef, useEffect } from 'react';
import { 
  Plus, Edit2, Trash2, Image as ImageIcon, Sparkles, Gift, Clock, Move, 
  Minus, RotateCcw, RotateCw, FlipHorizontal, ArrowRight, ExternalLink, Scaling, Maximize, MousePointer2
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
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

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

function DraggableItem({ pos, isDragging, isSelected, onPointerDown, children, type }: any) {
  const transform = type === 'overlay' ? 'translate(-50%, -50%)' : 'translate(0%, -50%)';
  
  return (
    <div 
      style={{ 
        position: 'absolute', 
        left: `${pos.x}%`, 
        top: `${pos.y}%`, 
        transform, 
        zIndex: isDragging ? 50 : isSelected ? 45 : 40
      }}
      onPointerDown={onPointerDown}
      className={cn(
        "select-none touch-none absolute transition-none cursor-grab active:cursor-grabbing",
        "group"
      )}
    >
      {/* Bounding Box Indicator - Canva Style */}
      <div className={cn(
        "absolute inset-[-8px] rounded-lg border-2 pointer-events-none transition-colors duration-200",
        isSelected || isDragging ? "border-cyan-400 bg-cyan-400/10" : "border-transparent group-hover:border-white/40 group-hover:bg-white/5"
      )}>
        {(isSelected || isDragging) && (
          <>
            <div className="absolute -top-1.5 -left-1.5 w-3 h-3 bg-white border-2 border-cyan-400 rounded-full" />
            <div className="absolute -top-1.5 -right-1.5 w-3 h-3 bg-white border-2 border-cyan-400 rounded-full" />
            <div className="absolute -bottom-1.5 -left-1.5 w-3 h-3 bg-white border-2 border-cyan-400 rounded-full" />
            <div className="absolute -bottom-1.5 -right-1.5 w-3 h-3 bg-white border-2 border-cyan-400 rounded-full" />
          </>
        )}
      </div>
      
      {/* Content */}
      <div className="relative z-10 w-max pointer-events-none">
        {children}
      </div>
    </div>
  )
}

export default function BannerPromo() {
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
  
  // Transform states for overlay
  const [overlayScale, setOverlayScale] = useState<number>(1);
  const [overlayRotate, setOverlayRotate] = useState<number>(0);
  const [overlayFlipX, setOverlayFlipX] = useState<boolean>(false);
  
  // Custom interactive editing
  const [isEditingLayout, setIsEditingLayout] = useState(false);
  const [selectedTarget, setSelectedTarget] = useState<'title' | 'desc' | 'overlay' | 'button' | null>(null);
  const [activeGuidelines, setActiveGuidelines] = useState({
    xCenter: false, yCenter: false, xLeft: false, xRight: false, yTop: false, yBottom: false
  });
  
  const [isMobilePortrait, setIsMobilePortrait] = useState(false);

  useEffect(() => {
    const checkOrientation = () => {
      setIsMobilePortrait(window.innerWidth <= 768 && window.innerHeight > window.innerWidth);
    };
    checkOrientation();
    window.addEventListener('resize', checkOrientation);
    return () => window.removeEventListener('resize', checkOrientation);
  }, []);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const overlayInputRef = useRef<HTMLInputElement>(null);
  const previewRef = useRef<HTMLDivElement>(null);

  const bannerList = useDbQuery<PromoBanner>('banners');

  if (bannerList === undefined) {
    return (
      <div className="flex items-center justify-center p-12">
        <Clock className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  // Delta-based Drag Engine (No Jumping)
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
    
    // Store initial mouse positions and element positions
    const startMouseX = e.clientX;
    const startMouseY = e.clientY;
    
    const initialPos = target === 'title' ? titlePos : target === 'desc' ? descPos : target === 'overlay' ? overlayPos : buttonPos;
    const startX = initialPos.x;
    const startY = initialPos.y;

    const handlePointerMove = (moveEvent: PointerEvent) => {
      // Calculate delta movement in pixels
      const dx = moveEvent.clientX - startMouseX;
      const dy = moveEvent.clientY - startMouseY;

      // Convert delta to percentages relative to canvas size
      // Handle mobile landscape rotation trick if active
      const canvasW = isMobilePortrait ? rect.height : rect.width;
      const canvasH = isMobilePortrait ? rect.width : rect.height;
      
      const deltaXPct = isMobilePortrait ? (dy / canvasW) * 100 : (dx / canvasW) * 100;
      const deltaYPct = isMobilePortrait ? (-dx / canvasH) * 100 : (dy / canvasH) * 100;

      let newX = startX + deltaXPct;
      let newY = startY + deltaYPct;

      // Magnetic Snapping Engine
      const snapThreshold = 2.5; 
      let guides = { xCenter: false, yCenter: false, xLeft: false, xRight: false, yTop: false, yBottom: false };

      if (Math.abs(newX - 50) <= snapThreshold) { newX = 50; guides.xCenter = true; }
      else if (Math.abs(newX - 8) <= snapThreshold) { newX = 8; guides.xLeft = true; }
      else if (Math.abs(newX - 92) <= snapThreshold) { newX = 92; guides.xRight = true; }

      if (Math.abs(newY - 50) <= snapThreshold) { newY = 50; guides.yCenter = true; }
      else if (Math.abs(newY - 10) <= snapThreshold) { newY = 10; guides.yTop = true; }
      else if (Math.abs(newY - 90) <= snapThreshold) { newY = 90; guides.yBottom = true; }

      // Constrain inside bounds [0, 100]
      newX = Math.round(Math.max(0, Math.min(100, newX)) * 10) / 10;
      newY = Math.round(Math.max(0, Math.min(100, newY)) * 10) / 10;

      // Zero-latency DOM update
      el.style.left = `${newX}%`;
      el.style.top = `${newY}%`;

      setActiveGuidelines(guides);
    };

    const handlePointerUp = (upEvent: PointerEvent) => {
      el.releasePointerCapture(upEvent.pointerId);
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
      setDragTarget(null);
      
      setActiveGuidelines({ xCenter: false, yCenter: false, xLeft: false, xRight: false, yTop: false, yBottom: false });

      // Commit state
      const finalX = parseFloat(el.style.left) || initialPos.x;
      const finalY = parseFloat(el.style.top) || initialPos.y;

      if (target === 'title') setTitlePos({ x: finalX, y: finalY });
      else if (target === 'desc') setDescPos({ x: finalX, y: finalY });
      else if (target === 'overlay') setOverlayPos({ x: finalX, y: finalY });
      else if (target === 'button') setButtonPos({ x: finalX, y: finalY });
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
    setDescPos({ x: 8, y: 65 });
    setOverlayPos({ x: 80, y: 50 });
    setBannerBgType('image');
    setBannerBgColor('#1E293B');
    setBannerBgGradient('linear-gradient(to bottom right, #3b82f6, #9333ea)');
    setIsEditingLayout(false);
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
    setDescPos(b.descPos || { x: 8, y: 65 });
    setOverlayPos(b.overlayPos || { x: 80, y: 50 });
    setBannerIsActive(b.isActive);
    setBannerBgType(b.bgType || 'image');
    setBannerBgColor(b.bgColor || '#1E293B');
    setBannerBgGradient(b.bgGradient || 'linear-gradient(to bottom right, #3b82f6, #9333ea)');
    setIsEditingLayout(false);
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
    
    const bannerData = {
      type: bannerType,
      title: bannerTitle.trim(),
      description: bannerDesc.trim(),
      voucherId: bannerType === 'voucher' ? Number(bannerVoucherId) || bannerVoucherId : null,
      productId: bannerType === 'menu' ? Number(bannerProductId) || bannerProductId : null,
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
      bgColor: bannerBgType === 'solid' ? bannerBgColor : null,
      bgGradient: bannerBgType === 'gradient' ? bannerBgGradient : null,
      overlayScale,
      overlayRotate,
      overlayFlipX
    };

    try {
      if (editBanner) {
        if (editBanner.imageUrl && finalImageUrl && editBanner.imageUrl !== finalImageUrl) {
          if (editBanner.imageUrl.includes('banners')) await dbDeleteFile(editBanner.imageUrl);
        }
        if (editBanner.overlayImageUrl && finalOverlayUrl && editBanner.overlayImageUrl !== finalOverlayUrl) {
          if (editBanner.overlayImageUrl.includes('banners')) await dbDeleteFile(editBanner.overlayImageUrl);
        }
        await dbUpdate('banners', editBanner.id, bannerData);
        toast.success('Banner penawaran diperbarui');
      } else {
        await dbInsert('banners', { ...bannerData, createdAt: new Date().toISOString() });
        toast.success('Banner penawaran baru ditambahkan');
      }
      setBannerDialogOpen(false);
    } catch (err) {
      toast.error('Gagal menyimpan banner penawaran');
    }
  };

  const handleDeleteBanner = async () => {
    if (deleteBannerId) {
      const bannerToDelete = currentBanners.find(b => b.id === deleteBannerId);
      try {
        if (bannerToDelete?.imageUrl && bannerToDelete.imageUrl.includes('banners')) {
          await dbDeleteFile(bannerToDelete.imageUrl);
        }
        if (bannerToDelete?.overlayImageUrl && bannerToDelete.overlayImageUrl.includes('banners')) {
          await dbDeleteFile(bannerToDelete.overlayImageUrl);
        }
        await dbDelete('banners', deleteBannerId);
        toast.success('Banner penawaran berhasil dihapus');
      } catch (err) {
        toast.error('Gagal menghapus banner penawaran');
      } finally {
        setDeleteBannerId(null);
      }
    }
  };

  const handleToggleBannerActive = async (bId: string | number, currentActive: boolean) => {
    const banner = currentBanners.find(b => b.id === bId);
    if (!banner) return;
    try {
      await dbUpdate('banners', bId, { ...banner, isActive: !currentActive });
      toast.success(!currentActive ? 'Banner penawaran diaktifkan' : 'Banner penawaran dinonaktifkan');
    } catch (err) {
      toast.error('Gagal mengubah status banner');
    }
  };

  const currentBanners = bannerList || [];

  return (
    <div className="pt-8 pb-24 space-y-6 w-full mx-auto animate-in fade-in duration-300">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h3 className="text-2xl font-black text-foreground tracking-tight">Pengaturan Banner Penawaran</h3>
          <p className="text-sm text-muted-foreground mt-1">Atur banner promo, produk unggulan, atau pengumuman khusus di Beranda Pelanggan.</p>
        </div>
        <Button onClick={openAddBanner} className="h-11 px-5 rounded-xl font-bold bg-primary hover:bg-primary/90 text-white shadow-md shadow-primary/20 active:scale-[0.98] transition-all shrink-0">
          <Plus className="w-5 h-5 mr-2" strokeWidth={3} /> Tambah Banner
        </Button>
      </div>

      {bannerList.length === 0 ? (
        <div className="bg-card border border-dashed border-border/60 rounded-[2rem] p-12 flex flex-col items-center justify-center text-center mt-6">
          <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mb-4">
            <Sparkles className="w-10 h-10 text-primary/50" strokeWidth={1.5} />
          </div>
          <h3 className="text-lg font-bold text-foreground mb-1">Belum Ada Banner Kustom</h3>
          <p className="text-sm text-muted-foreground max-w-sm">Tambahkan banner untuk menarik perhatian pelanggan dengan penawaran terbaik Anda.</p>
          <Button variant="outline" className="mt-6 rounded-xl border-primary/20 text-primary hover:bg-primary/10 font-bold" onClick={openAddBanner}>
            <Plus className="w-4 h-4 mr-2" /> Buat Banner Pertama
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 mt-6">
          {bannerList.map(b => (
            <Card key={b.id} className="border border-border/60 rounded-[2rem] overflow-hidden flex flex-col bg-card hover:shadow-xl transition-all duration-300">
              <div className="p-6 flex flex-col lg:flex-row gap-6 items-center">
                
                {/* Visual Preview Card (Dashboard List) */}
                <div 
                  className="w-full lg:w-[420px] aspect-[21/9] rounded-2xl text-white relative overflow-hidden shadow-md shrink-0 select-none bg-slate-900 border border-border/50"
                  style={{ 
                    background: b.bgType === 'solid' ? b.bgColor : b.bgType === 'gradient' ? b.bgGradient : undefined,
                    containerType: 'inline-size'
                  }}
                >
                  {b.imageUrl ? (
                    <div className="absolute inset-0 z-0">
                      <img src={b.imageUrl} alt="Banner" className="w-full h-full object-cover opacity-60 mix-blend-overlay" />
                      <div className="absolute inset-0 bg-gradient-to-r from-slate-900/90 via-slate-900/40 to-transparent" />
                    </div>
                  ) : (
                    <div className="absolute inset-0 bg-slate-900/20" />
                  )}
                  
                  {b.overlayImageUrl && (
                    <div 
                      style={{ 
                        position: 'absolute', 
                        left: `${b.overlayPos?.x ?? 80}%`, top: `${b.overlayPos?.y ?? 50}%`, 
                        transform: 'translate(-50%, -50%)', zIndex: 5 
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
                     <span className="bg-white/10 text-[2.2cqw] px-[1.5cqw] py-[0.5cqw] rounded backdrop-blur-md font-bold inline-block uppercase tracking-widest border border-white/20 mb-[1.5cqw]">
                        {b.type === 'voucher' ? 'Promo Voucher' : b.type === 'menu' ? 'Menu Rekomendasi' : 'Spesial Penawaran'}
                     </span>
                     <h4 className="font-black text-[4.5cqw] leading-[1.15] line-clamp-2 drop-shadow-lg">{b.title}</h4>
                  </div>
                  
                  <div style={{ position: 'absolute', left: `${b.descPos?.x ?? 8}%`, top: `${b.descPos?.y ?? 65}%`, transform: 'translate(0%, -50%)', zIndex: 10 }} className="w-[70cqw] max-w-[75cqw] pointer-events-none">
                     <p className="text-[2.8cqw] text-slate-200 line-clamp-3 leading-[1.3] font-medium drop-shadow-md m-0">{b.description}</p>
                     <div className="mt-[2cqw] text-[2.4cqw] bg-white text-slate-900 font-extrabold px-[3cqw] py-[1cqw] rounded-lg shadow-xl pointer-events-auto inline-block">
                        {b.buttonText || 'Lihat Detail'}
                     </div>
                  </div>
                </div>

                {/* Meta Info & Controls */}
                <div className="flex-1 w-full flex flex-col justify-between py-2">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className={cn(
                        "text-[10px] font-black uppercase px-2.5 py-0.5 rounded-md border-none tracking-widest",
                        b.isActive ? "bg-green-500/10 text-green-600 dark:bg-green-500/20" : "bg-muted text-muted-foreground"
                      )}>
                        {b.isActive ? 'Aktif di Beranda' : 'Nonaktif'}
                      </Badge>
                      <Badge variant="secondary" className="text-[10px] font-bold px-2 py-0.5 rounded-md">
                        {b.type === 'voucher' ? 'Voucher' : b.type === 'menu' ? 'Produk Baru' : 'Kustom Bebas'}
                      </Badge>
                    </div>
                    <h4 className="font-extrabold text-xl text-foreground leading-snug">{b.title}</h4>
                    <p className="text-sm text-muted-foreground leading-relaxed line-clamp-2">{b.description}</p>
                  </div>

                  <div className="flex items-center justify-between mt-6 pt-4 border-t border-border/50 w-full">
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Status Tampil</span>
                      <Switch 
                        checked={b.isActive} 
                        onCheckedChange={() => handleToggleBannerActive(b.id, b.isActive)} 
                        className="data-[state=checked]:bg-green-500 scale-90"
                      />
                    </div>

                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" className="h-9 px-4 rounded-xl bg-background hover:bg-cyan-500/10 hover:border-cyan-500/30 hover:text-cyan-600 font-bold text-xs flex items-center gap-1.5 transition-all" onClick={() => openEditBanner(b)}>
                        <Edit2 className="w-3.5 h-3.5" /> Edit Desain
                      </Button>
                      <Button variant="outline" size="icon" className="h-9 w-9 rounded-xl bg-background hover:bg-destructive/10 hover:border-destructive/30 hover:text-destructive text-muted-foreground transition-all" onClick={() => setDeleteBannerId(b.id)}>
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

      {/* Modal Add/Edit Form */}
      <Dialog open={bannerDialogOpen} onOpenChange={(open) => { if (!isEditingLayout) setBannerDialogOpen(open); }}>
        <DialogContent className="max-w-[1200px] w-[96vw] max-h-[90vh] overflow-y-auto rounded-[2rem] p-0 border-border/60 shadow-2xl bg-background custom-scrollbar">
          <DialogHeader className="px-6 py-5 border-b border-border/50 bg-muted/10">
            <DialogTitle className="text-xl font-extrabold flex items-center gap-2">
              <div className="p-1.5 bg-primary/10 rounded-lg text-primary">
                {editBanner ? <Edit2 className="w-5 h-5" /> : <Sparkles className="w-5 h-5" strokeWidth={2.5} />}
              </div>
              {editBanner ? 'Workspace Desain Banner' : 'Workspace Tambah Banner'}
            </DialogTitle>
          </DialogHeader>

          <div className="p-6">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              {/* Left Column: Form Fields */}
              <div className="lg:col-span-6 space-y-5">
                <div className="space-y-4">
                  <Label className="text-xs font-black text-foreground uppercase tracking-wider">Tipe Penawaran <span className="text-destructive">*</span></Label>
                  <Select value={bannerType} onValueChange={(val: 'voucher' | 'menu' | 'custom') => {
                    setBannerType(val);
                    if (val === 'custom') { setBannerVoucherId(''); setBannerProductId(''); }
                  }}>
                    <SelectTrigger className="h-12 bg-background rounded-xl font-bold shadow-sm border-border/60">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl">
                      <SelectItem value="voucher" className="font-semibold">Kode Promo / Voucher</SelectItem>
                      <SelectItem value="menu" className="font-semibold">Menu Baru / Rekomendasi</SelectItem>
                      <SelectItem value="custom" className="font-semibold">Kustom Bebas (Manual)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {bannerType === 'voucher' && (
                  <div className="space-y-2 animate-in slide-in-from-top-2 duration-200">
                    <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Pilih Voucher</Label>
                    <Select value={bannerVoucherId} onValueChange={handleBannerVoucherChange}>
                      <SelectTrigger className="h-12 bg-background rounded-xl font-semibold shadow-sm border-border/60"><SelectValue placeholder="Pilih voucher..." /></SelectTrigger>
                      <SelectContent className="rounded-xl">
                        {vouchers.map(v => (
                          <SelectItem key={v.id} value={v.id!.toString()} className="font-semibold">{v.code} (Diskon {v.type === 'percentage' ? `${v.value}%` : FORMAT_IDR(v.value)})</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {bannerType === 'menu' && (
                  <div className="space-y-2 animate-in slide-in-from-top-2 duration-200">
                    <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Pilih Produk</Label>
                    <Select value={bannerProductId} onValueChange={handleBannerProductChange}>
                      <SelectTrigger className="h-12 bg-background rounded-xl font-semibold shadow-sm border-border/60"><SelectValue placeholder="Pilih produk..." /></SelectTrigger>
                      <SelectContent className="rounded-xl">
                        {products.map(p => (
                          <SelectItem key={p.id} value={p.id!.toString()} className="font-semibold">{p.name} ({FORMAT_IDR(p.price)})</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <div className="space-y-2">
                  <Label className="text-xs font-black text-foreground uppercase tracking-wider">Judul Banner <span className="text-destructive">*</span></Label>
                  <Input value={bannerTitle} onChange={e => setBannerTitle(e.target.value)} maxLength={45} placeholder="Contoh: Promo Spesial Weekend!" className="h-12 bg-background rounded-xl font-semibold shadow-sm border-border/60" />
                </div>
                
                <div className="space-y-2">
                  <Label className="text-xs font-black text-foreground uppercase tracking-wider">Deskripsi Singkat <span className="text-destructive">*</span></Label>
                  <textarea value={bannerDesc} onChange={e => setBannerDesc(e.target.value)} rows={3} maxLength={120} placeholder="Ketik keterangan promo di sini..." className="w-full p-4 bg-background rounded-xl border border-border/60 focus:outline-none focus:ring-2 focus:ring-primary/50 font-semibold resize-none shadow-sm" />
                </div>

                <div className="p-5 bg-muted/30 border border-border/40 rounded-2xl space-y-4">
                  <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Background Canvas</Label>
                  <Select value={bannerBgType} onValueChange={(val: any) => setBannerBgType(val)}>
                    <SelectTrigger className="h-11 bg-background rounded-lg font-bold text-xs border-border/60 shadow-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl">
                      <SelectItem value="image" className="font-semibold text-xs">Gambar Latar (Upload)</SelectItem>
                      <SelectItem value="solid" className="font-semibold text-xs">Warna Solid</SelectItem>
                      <SelectItem value="gradient" className="font-semibold text-xs">Warna Gradasi Modern</SelectItem>
                    </SelectContent>
                  </Select>

                  {bannerBgType === 'image' && (
                    <div className="flex gap-4 items-center animate-in fade-in duration-200 pt-2">
                      <div className="w-20 h-14 rounded-lg border border-border/60 bg-background flex items-center justify-center overflow-hidden shrink-0 shadow-sm">
                        {bannerImage && !bannerImage.startsWith('preset:') ? <img src={bannerImage} alt="Preview" className="w-full h-full object-cover" /> : <ImageIcon className="w-6 h-6 text-muted-foreground/40" />}
                      </div>
                      <div className="flex-1">
                        <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={e => handleImageSelect(e, false)} />
                        <Button type="button" variant="outline" className="rounded-lg text-xs font-bold h-9 border-border/60 hover:bg-muted" onClick={() => fileInputRef.current?.click()}>Pilih File Gambar Latar</Button>
                        <p className="text-[10px] text-muted-foreground mt-1.5">Rasio optimal 21:9. Format JPG/PNG.</p>
                      </div>
                    </div>
                  )}

                  {bannerBgType === 'solid' && (
                    <div className="space-y-3 animate-in fade-in duration-200 pt-2">
                      <div className="flex flex-wrap gap-2.5">
                        {['#0F172A', '#1E293B', '#3B82F6', '#EF4444', '#EAB308', '#10B981', '#8B5CF6', '#F97316'].map(color => (
                          <button
                            key={color} type="button" onClick={() => setBannerBgColor(color)}
                            className={cn("w-8 h-8 rounded-full border-2 transition-transform hover:scale-110", bannerBgColor.toUpperCase() === color ? 'border-primary shadow-md scale-110' : 'border-transparent')}
                            style={{ backgroundColor: color }} title={color}
                          />
                        ))}
                      </div>
                      <div className="flex gap-3 items-center">
                        <Input type="color" value={bannerBgColor} onChange={e => setBannerBgColor(e.target.value)} className="w-12 h-10 p-1 cursor-pointer rounded-lg border-border/60 shrink-0" />
                        <Input value={bannerBgColor} onChange={e => setBannerBgColor(e.target.value)} className="h-10 bg-background rounded-lg text-xs font-bold uppercase font-mono shadow-sm" />
                      </div>
                    </div>
                  )}

                  {bannerBgType === 'gradient' && (
                    <div className="space-y-3 animate-in fade-in duration-200 pt-2">
                      <div className="flex flex-wrap gap-2.5">
                        {[
                          'linear-gradient(to bottom right, #3b82f6, #9333ea)',
                          'linear-gradient(to bottom right, #ef4444, #f97316)',
                          'linear-gradient(to bottom right, #0f2027, #2c5364)',
                          'linear-gradient(to right, #11998e, #38ef7d)',
                          'linear-gradient(to right, #8e2de2, #4a00e0)'
                        ].map(grad => (
                          <button
                            key={grad} type="button" onClick={() => setBannerBgGradient(grad)}
                            className={cn("w-14 h-8 rounded-md border-2 transition-transform hover:scale-105", bannerBgGradient === grad ? 'border-primary shadow-md scale-105' : 'border-transparent')}
                            style={{ background: grad }} title={grad}
                          />
                        ))}
                      </div>
                      <Input value={bannerBgGradient} onChange={e => setBannerBgGradient(e.target.value)} placeholder="linear-gradient(...)" className="h-10 bg-background rounded-lg text-xs font-bold font-mono shadow-sm" />
                    </div>
                  )}
                </div>
              </div>

              {/* Right Column: Static Preview & Layout Trigger */}
              <div className="lg:col-span-6 flex flex-col justify-between space-y-6">
                <div className="p-6 bg-muted/10 border border-border/40 rounded-[2rem] space-y-5">
                  <h4 className="font-extrabold text-sm text-foreground flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-cyan-500 animate-pulse" /> Live Preview
                  </h4>
                  
                  {/* Static Visual Preview Container */}
                  <div 
                    className="w-full aspect-[21/9] rounded-2xl text-white relative overflow-hidden shadow-lg select-none border border-border/50 bg-slate-900 ring-4 ring-slate-900/5 dark:ring-white/5"
                    style={{ 
                      background: bannerBgType === 'solid' ? bannerBgColor : bannerBgType === 'gradient' ? bannerBgGradient : undefined,
                      containerType: 'inline-size'
                    }}
                  >
                    {bannerBgType === 'image' && bannerImage ? (
                      <div className="absolute inset-0 z-0">
                        <img src={bannerImage} alt="Preview Background" className="w-full h-full object-cover opacity-60 mix-blend-overlay" />
                        <div className="absolute inset-0 bg-gradient-to-r from-slate-900/90 via-slate-900/40 to-transparent" />
                      </div>
                    ) : (
                      <div className="absolute inset-0 bg-slate-900/20" />
                    )}
                    
                    {overlayImage && (
                      <div style={{ position: 'absolute', left: `${overlayPos.x}%`, top: `${overlayPos.y}%`, transform: 'translate(-50%, -50%)', zIndex: 5 }}>
                         <img 
                           src={overlayImage} 
                           style={{
                             transform: `scaleX(${overlayFlipX ? -1 : 1}) rotate(${overlayRotate}deg)`,
                             width: `calc(${overlayScale} * 20cqw)`, height: 'auto',
                           }}
                           className="object-contain drop-shadow-2xl max-w-none" alt="Overlay"
                         />
                      </div>
                    )}

                    <div style={{ position: 'absolute', left: `${titlePos.x}%`, top: `${titlePos.y}%`, transform: 'translate(0%, -50%)', zIndex: 10 }} className="w-[70cqw] max-w-[75cqw]">
                       <span className="bg-white/10 text-[2.2cqw] px-[1.5cqw] py-[0.5cqw] rounded backdrop-blur-md font-bold inline-block uppercase tracking-widest border border-white/20 mb-[1.5cqw]">
                          {bannerType === 'voucher' ? 'Promo Voucher' : bannerType === 'menu' ? 'Menu Rekomendasi' : 'Spesial Penawaran'}
                       </span>
                       <h4 className="font-black text-[4.5cqw] leading-[1.15] line-clamp-2 drop-shadow-lg">{bannerTitle || 'Judul Banner'}</h4>
                    </div>
                    
                    <div style={{ position: 'absolute', left: `${descPos.x}%`, top: `${descPos.y}%`, transform: 'translate(0%, -50%)', zIndex: 10 }} className="w-[70cqw] max-w-[75cqw] pointer-events-none">
                       <p className="text-[2.8cqw] text-slate-200 line-clamp-3 leading-[1.3] font-medium drop-shadow-md m-0">{bannerDesc || 'Tulis deskripsi promo di sini...'}</p>
                       <div className="mt-[2cqw] text-[2.4cqw] bg-white text-slate-900 font-extrabold px-[3cqw] py-[1cqw] rounded-lg shadow-xl inline-block">
                          {bannerButtonText || 'Lihat Detail'}
                       </div>
                    </div>
                  </div>

                  {/* Settings for Overlay & Buttons */}
                  <div className="space-y-4 pt-4">
                    <div className="p-4 bg-background border border-border/60 rounded-2xl shadow-sm space-y-3">
                      <Label className="text-xs font-bold text-foreground uppercase tracking-wider">Foto Produk Overlay (Transparan PNG)</Label>
                      <div className="flex gap-4 items-center">
                        <div className="w-16 h-16 rounded-xl border-2 border-dashed border-border bg-muted/20 flex items-center justify-center overflow-hidden shrink-0 group hover:border-primary/50 transition-colors cursor-pointer" onClick={() => overlayInputRef.current?.click()}>
                          {overlayImage ? <img src={overlayImage} alt="Overlay" className="w-full h-full object-contain p-1" /> : <ImageIcon className="w-6 h-6 text-muted-foreground/40 group-hover:text-primary/50" />}
                        </div>
                        <div className="flex-1">
                          <input ref={overlayInputRef} type="file" accept="image/png,image/webp" className="hidden" onChange={e => handleImageSelect(e, true)} />
                          <Button type="button" variant="outline" className="rounded-xl text-xs font-bold h-10 border-primary/20 text-primary hover:bg-primary/10 shadow-sm w-full sm:w-auto" onClick={() => overlayInputRef.current?.click()}>
                            Pilih Foto Produk PNG
                          </Button>
                        </div>
                      </div>
                    </div>

                    <div className={cn("grid gap-4", bannerType === 'custom' ? "grid-cols-2" : "grid-cols-1")}>
                      <div className="space-y-2">
                        <Label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Teks Tombol</Label>
                        <Input value={bannerButtonText} onChange={e => setBannerButtonText(e.target.value)} placeholder="Beli Sekarang" className="h-11 bg-background rounded-xl font-semibold text-sm shadow-sm" />
                      </div>
                      {bannerType === 'custom' && (
                        <div className="space-y-2 animate-in fade-in duration-200">
                          <Label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">URL Tujuan (Link)</Label>
                          <Input value={bannerLink} onChange={e => setBannerLink(e.target.value)} placeholder="https://..." className="h-11 bg-background rounded-xl font-semibold text-sm shadow-sm" />
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <Button 
                  type="button" 
                  onClick={() => setIsEditingLayout(true)}
                  className="w-full bg-slate-900 hover:bg-slate-800 dark:bg-cyan-600 dark:hover:bg-cyan-500 text-white font-black h-14 rounded-[1.25rem] shadow-xl flex items-center justify-center gap-2 active:scale-[0.98] transition-all border border-slate-700 dark:border-transparent group"
                >
                  <Scaling className="w-5 h-5 group-hover:rotate-12 transition-transform" /> Buka Editor Interaktif (Geser & Putar)
                </Button>
              </div>
            </div>
          </div>

          <DialogFooter className="px-6 py-5 border-t border-border/50 bg-muted/10 gap-3 sm:gap-0">
            <Button variant="outline" className="h-12 rounded-xl font-bold border-border/60 hover:bg-muted px-6" onClick={() => setBannerDialogOpen(false)}>Batal</Button>
            <Button 
              className="h-12 rounded-xl font-bold bg-primary hover:bg-primary/90 text-white shadow-lg shadow-primary/20 active:scale-[0.98] transition-all px-8" 
              onClick={handleSaveBanner} 
              disabled={!bannerTitle.trim() || !bannerDesc.trim()}
            >
              {editBanner ? 'Simpan Perubahan Desain' : 'Terbitkan Banner'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* IMMERSIVE LAYOUT CANVAS EDITOR OVERLAY (Full screen) */}
      {isEditingLayout && (
        <div className={cn(
          "fixed inset-0 z-[100] bg-slate-950 flex flex-col justify-between overflow-hidden animate-in fade-in duration-200",
          "w-screen h-screen"
        )}>
          {/* Editor Top Bar */}
          <div className="w-full flex items-center justify-between px-6 py-4 border-b border-white/10 bg-slate-900/80 backdrop-blur-xl text-white select-none shrink-0 z-50">
            <div className="flex items-center gap-4">
              <Button 
                variant="ghost" 
                className="text-white hover:bg-white/10 rounded-xl h-10 px-4 font-bold border border-white/10 transition-colors"
                onClick={() => setIsEditingLayout(false)}
              >
                Tutup Editor
              </Button>
              <div className="h-5 w-[1px] bg-white/20 hidden sm:block" />
              <div className="hidden sm:flex items-center gap-2 text-cyan-400">
                <Sparkles className="w-4 h-4" />
                <h4 className="font-black text-sm tracking-widest uppercase">Canva-Mode Editor</h4>
              </div>
            </div>
            
            <div className="hidden md:flex items-center gap-2.5 text-xs text-slate-300 bg-black/30 px-4 py-2 rounded-full border border-white/5">
              <MousePointer2 className="w-4 h-4 text-cyan-400" />
              <span>Drag elemen untuk memindahkan. Gunakan toolbar untuk memutar/mengubah ukuran gambar.</span>
            </div>

            <Button 
              variant="outline" size="sm"
              className="text-xs font-bold rounded-lg border-white/20 text-white hover:bg-white/10 bg-transparent h-9 px-4"
              onClick={() => {
                setTitlePos({ x: 8, y: 30 }); setDescPos({ x: 8, y: 65 }); setOverlayPos({ x: 80, y: 50 }); setButtonPos({ x: 8, y: 80 });
                setOverlayScale(1); setOverlayRotate(0); setOverlayFlipX(false); setSelectedTarget(null);
                toast.success('Posisi kanvas direset ke default');
              }}
            >
              <RotateCcw className="w-3.5 h-3.5 mr-1.5" /> Reset Posisi
            </Button>
          </div>

          {/* Workspace Area with interactive Canvas */}
          <div 
            className="flex-1 w-full flex items-center justify-center p-4 sm:p-8 bg-slate-950 overflow-hidden relative"
            style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.05) 1px, transparent 0)', backgroundSize: '24px 24px' }}
            onPointerDown={() => setSelectedTarget(null)}
          >
            <div 
              ref={previewRef}
              className={cn(
                "w-full aspect-[21/9] rounded-2xl text-white relative shadow-[0_0_80px_rgba(0,0,0,0.8)] border border-white/15 select-none bg-slate-900 touch-none ring-1 ring-white/5",
                isMobilePortrait ? "w-[95vw] mt-auto mb-auto" : "w-[92vw] max-w-[1250px]"
              )}
              style={{ 
                background: bannerBgType === 'solid' ? bannerBgColor : bannerBgType === 'gradient' ? bannerBgGradient : undefined,
                containerType: 'inline-size',
                ...(isMobilePortrait ? { transform: 'rotate(90deg)', transformOrigin: 'center' } : {})
              }}
            >
              {bannerBgType === 'image' && bannerImage ? (
                <div className="absolute inset-0 z-0 select-none pointer-events-none rounded-2xl overflow-hidden">
                  <img src={bannerImage} alt="Bg" className="w-full h-full object-cover opacity-70 mix-blend-overlay" />
                  <div className="absolute inset-0 bg-gradient-to-r from-slate-950/90 via-slate-900/40 to-transparent" />
                </div>
              ) : bannerBgType === 'image' ? (
                <div className="absolute inset-0 bg-slate-900 flex items-center justify-center opacity-30 select-none pointer-events-none rounded-2xl">
                  <ImageIcon size={48} />
                </div>
              ) : null}

              {/* Magnetic Guides Lines */}
              {activeGuidelines.xCenter && <div className="absolute top-0 bottom-0 left-1/2 w-[1.5px] bg-[#22d3ee] shadow-[0_0_8px_#22d3ee] z-30 pointer-events-none" />}
              {activeGuidelines.xLeft && <div className="absolute top-0 bottom-0 left-[8%] w-[1.5px] bg-[#22d3ee] shadow-[0_0_8px_#22d3ee] z-30 pointer-events-none" />}
              {activeGuidelines.xRight && <div className="absolute top-0 bottom-0 left-[92%] w-[1.5px] bg-[#22d3ee] shadow-[0_0_8px_#22d3ee] z-30 pointer-events-none" />}
              {activeGuidelines.yCenter && <div className="absolute left-0 right-0 top-1/2 h-[1.5px] bg-[#22d3ee] shadow-[0_0_8px_#22d3ee] z-30 pointer-events-none" />}
              {activeGuidelines.yTop && <div className="absolute left-0 right-0 top-[10%] h-[1.5px] bg-[#22d3ee] shadow-[0_0_8px_#22d3ee] z-30 pointer-events-none" />}
              {activeGuidelines.yBottom && <div className="absolute left-0 right-0 top-[90%] h-[1.5px] bg-[#22d3ee] shadow-[0_0_8px_#22d3ee] z-30 pointer-events-none" />}

              {/* OVERLAY IMAGE (Draggable) */}
              {overlayImage && (
                <DraggableItem 
                  pos={overlayPos} 
                  isDragging={dragTarget === 'overlay'} 
                  isSelected={selectedTarget === 'overlay'}
                  onPointerDown={(e: any) => { 
                    if (e.target.closest('.floating-toolbar')) return;
                    handleDragStart(e, 'overlay'); 
                  }}
                  type="overlay"
                >
                  <div className="relative flex shrink-0 p-0">
                    <img 
                      src={overlayImage} 
                      style={{
                        transform: `scaleX(${overlayFlipX ? -1 : 1}) rotate(${overlayRotate}deg)`,
                        width: `calc(${overlayScale} * 20cqw)`, height: 'auto',
                      }}
                      className="object-contain drop-shadow-2xl max-w-none animate-in zoom-in duration-300 pointer-events-none" 
                      alt="Overlay" 
                    />
                    
                    {/* Sleek Floating Actions Toolbar */}
                    {(selectedTarget === 'overlay' || dragTarget === 'overlay') && (
                      <div 
                        style={overlayPos.y < 25 ? { bottom: '-60px', top: 'auto' } : { top: '-60px', bottom: 'auto' }}
                        className="floating-toolbar absolute left-1/2 -translate-x-1/2 bg-slate-950/90 text-white border border-white/20 rounded-xl shadow-[0_8px_30px_rgba(0,0,0,0.5)] flex items-center gap-1 p-1.5 z-50 backdrop-blur-xl pointer-events-auto"
                        onPointerDown={(e) => e.stopPropagation()}
                      >
                        <Button variant="ghost" size="icon" className="w-8 h-8 hover:bg-white/10 rounded-lg text-white p-0 transition-colors" onClick={(e) => { e.stopPropagation(); setOverlayScale(prev => Math.max(0.2, Math.round((prev - 0.1) * 10) / 10)); }} title="Kecilkan">
                          <Minus className="w-4 h-4" />
                        </Button>
                        <span className="text-[11px] font-mono font-black px-2 select-none text-cyan-300 min-w-[3ch] text-center">{Math.round(overlayScale * 100)}%</span>
                        <Button variant="ghost" size="icon" className="w-8 h-8 hover:bg-white/10 rounded-lg text-white p-0 transition-colors" onClick={(e) => { e.stopPropagation(); setOverlayScale(prev => Math.min(3.5, Math.round((prev + 0.1) * 10) / 10)); }} title="Besarkan">
                          <Plus className="w-4 h-4" />
                        </Button>
                        <div className="w-[1px] h-5 bg-white/20 mx-1" />
                        <Button variant="ghost" size="icon" className="w-8 h-8 hover:bg-white/10 rounded-lg text-white p-0 transition-colors" onClick={(e) => { e.stopPropagation(); setOverlayRotate(prev => (prev - 15) % 360); }} title="Putar Kiri">
                          <RotateCcw className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="w-8 h-8 hover:bg-white/10 rounded-lg text-white p-0 transition-colors" onClick={(e) => { e.stopPropagation(); setOverlayRotate(prev => (prev + 15) % 360); }} title="Putar Kanan">
                          <RotateCw className="w-4 h-4" />
                        </Button>
                        <div className="w-[1px] h-5 bg-white/20 mx-1" />
                        <Button variant="ghost" size="icon" className={cn("w-8 h-8 rounded-lg p-0 transition-colors", overlayFlipX ? "bg-cyan-500/20 text-cyan-400 hover:bg-cyan-500/30" : "text-white hover:bg-white/10")} onClick={(e) => { e.stopPropagation(); setOverlayFlipX(prev => !prev); }} title="Balik Horisontal">
                          <FlipHorizontal className="w-4 h-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                </DraggableItem>
              )}

              {/* TITLE DRAG */}
              <DraggableItem 
                pos={titlePos} isDragging={dragTarget === 'title'} isSelected={selectedTarget === 'title'}
                onPointerDown={(e: any) => handleDragStart(e, 'title')} type="title"
              >
                <div className="w-[70cqw] max-w-[75cqw]">
                  <span className="text-[2.2cqw] px-[1.5cqw] py-[0.5cqw] rounded bg-white/10 backdrop-blur-md font-bold mb-[1.5cqw] inline-block uppercase tracking-widest border border-white/20 shadow-sm">
                    {bannerType === 'voucher' ? 'Promo Voucher' : bannerType === 'menu' ? 'Menu Rekomendasi' : 'Spesial Penawaran'}
                  </span>
                  <h4 className="font-black text-[4.5cqw] leading-[1.15] line-clamp-2 drop-shadow-xl text-white">
                    {bannerTitle || 'Judul Penawaran'}
                  </h4>
                </div>
              </DraggableItem>

              {/* DESC DRAG */}
              <DraggableItem 
                pos={descPos} isDragging={dragTarget === 'desc'} isSelected={selectedTarget === 'desc'}
                onPointerDown={(e: any) => handleDragStart(e, 'desc')} type="desc"
              >
                <div className="w-[70cqw] max-w-[75cqw]">
                  <p className="text-[2.8cqw] text-slate-200 font-medium line-clamp-3 leading-[1.3] drop-shadow-md m-0">
                    {bannerDesc || 'Tulis deskripsi promo produk Anda di sini...'}
                  </p>
                  <div className="mt-[2cqw]">
                    <div className="text-[2.4cqw] bg-white text-slate-950 font-extrabold px-[3cqw] py-[1cqw] rounded-lg shadow-xl inline-block transition-transform">
                      {bannerButtonText || 'Lihat Detail'}
                    </div>
                  </div>
                </div>
              </DraggableItem>
            </div>
          </div>

          {/* Editor Bottom Bar */}
          <div className="w-full bg-slate-900/80 backdrop-blur-xl border-t border-white/10 px-6 py-4 flex flex-col sm:flex-row items-center justify-between text-white select-none shrink-0 z-50 gap-4">
            <div className="flex items-center gap-2.5 text-xs text-slate-300">
              <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
              <span>Sistem akan mengingat posisi elemen secara otomatis.</span>
            </div>
            <Button 
              className="w-full sm:w-auto bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black px-8 rounded-xl h-12 shadow-[0_0_20px_rgba(6,182,212,0.3)] hover:shadow-[0_0_25px_rgba(6,182,212,0.5)] transition-all"
              onClick={() => setIsEditingLayout(false)}
            >
              Simpan Tata Letak
            </Button>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <AlertDialog open={!!deleteBannerId} onOpenChange={() => setDeleteBannerId(null)}>
        <AlertDialogContent className="max-w-[400px] rounded-3xl p-6 border-border/50 shadow-2xl">
          <AlertDialogHeader>
            <div className="w-14 h-14 rounded-full bg-destructive/10 flex items-center justify-center mb-3 mx-auto">
              <Trash2 className="w-7 h-7 text-destructive" />
            </div>
            <AlertDialogTitle className="text-center text-xl font-extrabold tracking-tight">Hapus Banner?</AlertDialogTitle>
            <AlertDialogDescription className="text-center text-muted-foreground mt-2">
              Banner penawaran ini akan dihapus secara permanen dari beranda. Tindakan ini tidak dapat dibatalkan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-8 sm:justify-center flex-row gap-3">
            <AlertDialogCancel className="flex-1 mt-0 rounded-xl h-12 font-bold border-border/60 hover:bg-muted">Batal</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteBanner} className="flex-1 rounded-xl h-12 font-bold bg-destructive hover:bg-destructive/90 text-white shadow-lg shadow-destructive/20">
              Ya, Hapus
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
