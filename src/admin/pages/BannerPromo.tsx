import { useDbQuery, dbUpdate, dbUploadFile, dbDeleteFile, dbInsert, dbDelete } from '@/hooks/db-hooks';
import { type Voucher, type Product } from '@/hooks/db-hooks';
import { useState, useRef, useEffect } from 'react';
import { 
  Plus, Edit2, Trash2, Image as ImageIcon, Sparkles, Gift, Clock, Move, 
  Minus, RotateCcw, RotateCw, FlipHorizontal, ArrowRight, ExternalLink
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

function getCanvasPct(clientX: number, clientY: number, rect: DOMRect, isMobilePortrait: boolean) {
  if (isMobilePortrait) {
    // Rotated 90deg CW
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const screenDx = clientX - cx;
    const screenDy = clientY - cy;
    
    // Canvas local dimensions when rotated:
    // Screen height corresponds to local width W
    // Screen width corresponds to local height H
    const canvasW = rect.height;
    const canvasH = rect.width;
    
    const localX = screenDy;
    const localY = -screenDx;
    
    const pctX = (localX / canvasW) * 100 + 50;
    const pctY = (localY / canvasH) * 100 + 50;
    return { x: pctX, y: pctY };
  } else {
    const pctX = ((clientX - rect.left) / rect.width) * 100;
    const pctY = ((clientY - rect.top) / rect.height) * 100;
    return { x: pctX, y: pctY };
  }
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
        cursor: isDragging ? 'grabbing' : 'grab', 
        width: 'max-content',
        minWidth: 'max-content',
        maxWidth: 'none',
        right: 'auto'
      }}
      onPointerDown={onPointerDown}
      className={cn(
        "select-none z-40 touch-none whitespace-nowrap flex shrink-0 transition-all duration-150 rounded-lg p-1",
        isDragging && "z-50 scale-[1.01] pointer-events-none",
        isSelected && (type === 'overlay'
          ? "ring-2 ring-cyan-400 ring-offset-2 ring-offset-slate-950 shadow-[0_0_15px_rgba(34,211,238,0.5)] border border-cyan-400/50"
          : "border border-dashed border-cyan-400 bg-cyan-400/5 shadow-[0_0_10px_rgba(34,211,238,0.2)]")
      )}
    >
      {children}
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
  
  // Custom interactive editing & snapping guidelines states
  const [isEditingLayout, setIsEditingLayout] = useState(false);
  const [selectedTarget, setSelectedTarget] = useState<'title' | 'desc' | 'overlay' | 'button' | null>(null);
  const [activeGuidelines, setActiveGuidelines] = useState<{
    xCenter: boolean;
    yCenter: boolean;
    xLeft: boolean;
    xRight: boolean;
    yTop: boolean;
    yBottom: boolean;
  }>({
    xCenter: false,
    yCenter: false,
    xLeft: false,
    xRight: false,
    yTop: false,
    yBottom: false
  });
  
  const [isMobilePortrait, setIsMobilePortrait] = useState(false);

  useEffect(() => {
    const checkOrientation = () => {
      setIsMobilePortrait(
        window.innerWidth <= 768 && window.innerHeight > window.innerWidth
      );
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

  // Smooth Direct DOM drag handler with starting click offset and auto-snap tracking
  const handleDragStart = (e: React.PointerEvent<HTMLDivElement>, target: 'title' | 'desc' | 'overlay' | 'button') => {
    e.preventDefault();
    const el = e.currentTarget;
    el.setPointerCapture(e.pointerId);
    setDragTarget(target);
    setSelectedTarget(target);

    const canvas = previewRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();

    // Mouse coordinates in percentage of the canvas
    const startPct = getCanvasPct(e.clientX, e.clientY, rect, isMobilePortrait);

    // Component's initial positions
    const initialPos = target === 'title' ? titlePos : target === 'desc' ? descPos : target === 'overlay' ? overlayPos : buttonPos;
    const startX = initialPos.x;
    const startY = initialPos.y;

    const handlePointerMove = (moveEvent: PointerEvent) => {
      const currentRect = canvas.getBoundingClientRect();
      const currentPct = getCanvasPct(moveEvent.clientX, moveEvent.clientY, currentRect, isMobilePortrait);

      const deltaX = currentPct.x - startPct.x;
      const deltaY = currentPct.y - startPct.y;

      let newX = startX + deltaX;
      let newY = startY + deltaY;

      // Auto-Snap Alignment (Magnet)
      const snapThreshold = 3.0; // 3%
      let snapX = false;
      let snapLeft = false;
      let snapRight = false;
      let snapY = false;
      let snapTop = false;
      let snapBottom = false;

      // X alignment (horizontal centering & margins)
      if (Math.abs(newX - 50) <= snapThreshold) {
        newX = 50;
        snapX = true;
      } else if (Math.abs(newX - 10) <= snapThreshold) {
        newX = 10;
        snapLeft = true;
      } else if (Math.abs(newX - 90) <= snapThreshold) {
        newX = 90;
        snapRight = true;
      }

      // Y alignment (vertical centering & margins)
      if (Math.abs(newY - 50) <= snapThreshold) {
        newY = 50;
        snapY = true;
      } else if (Math.abs(newY - 10) <= snapThreshold) {
        newY = 10;
        snapTop = true;
      } else if (Math.abs(newY - 90) <= snapThreshold) {
        newY = 90;
        snapBottom = true;
      }

      // Constrain inside bounds [0, 100]
      newX = Math.round(Math.max(0, Math.min(100, newX)));
      newY = Math.round(Math.max(0, Math.min(100, newY)));

      // Set styles directly on the DOM for zero latency
      el.style.left = `${newX}%`;
      el.style.top = `${newY}%`;

      // Update guideline triggers
      setActiveGuidelines({
        xCenter: snapX,
        yCenter: snapY,
        xLeft: snapLeft,
        xRight: snapRight,
        yTop: snapTop,
        yBottom: snapBottom
      });

      if (target === 'overlay') {
        const toolbar = el.querySelector('.floating-toolbar') as HTMLDivElement | null;
        if (toolbar) {
          if (newY < 25) {
            toolbar.style.bottom = '-52px';
            toolbar.style.top = 'auto';
          } else {
            toolbar.style.top = '-52px';
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
      
      // Clear guidelines
      setActiveGuidelines({
        xCenter: false,
        yCenter: false,
        xLeft: false,
        xRight: false,
        yTop: false,
        yBottom: false
      });

      // Commit final coordinates to state
      const finalX = parseFloat(el.style.left) || 0;
      const finalY = parseFloat(el.style.top) || 0;

      if (target === 'title') {
        setTitlePos({ x: finalX, y: finalY });
      } else if (target === 'desc') {
        setDescPos({ x: finalX, y: finalY });
      } else if (target === 'overlay') {
        setOverlayPos({ x: finalX, y: finalY });
      } else if (target === 'button') {
        setButtonPos({ x: finalX, y: finalY });
      }
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
    setDescPos(b.descPos || { x: 8, y: 60 });
    setOverlayPos(b.overlayPos || { x: 85, y: 50 });
    setButtonPos(b.buttonPos || { x: 8, y: 80 });
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
        await dbInsert('banners', {
          ...bannerData,
          createdAt: new Date().toISOString()
        });
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
  const bannerListCopy = bannerList || [];

  return (
    <div className="pt- pb-24 space-y-6 w-full mx-auto animate-in fade-in duration-300">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h3 className="text-xl font-black text-foreground">Pengaturan Banner Penawaran</h3>
          <p className="text-sm text-muted-foreground">Atur banner promo, produk unggulan, atau pengumuman khusus yang tampil di bagian teratas Beranda Pelanggan.</p>
        </div>
        <Button onClick={openAddBanner} className="h-11 px-5 rounded-xl font-bold bg-primary hover:bg-primary/90 text-white shadow-md shadow-primary/20 active:scale-[0.98] transition-all shrink-0">
          <Plus className="w-5 h-5 mr-2" strokeWidth={3} />
          Tambah Banner
        </Button>
      </div>

      {bannerList.length === 0 ? (
        <div className="bg-card border border-dashed border-border/60 rounded-[2rem] p-12 flex flex-col items-center justify-center text-center opacity-80 mt-6">
          <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mb-4">
            <Sparkles className="w-10 h-10 text-primary/50" strokeWidth={1.5} />
          </div>
          <h3 className="text-lg font-bold text-foreground mb-1">Belum Ada Banner Kustom</h3>
          <p className="text-sm text-muted-foreground max-w-sm">Anda belum menambahkan penawaran kustom. Sistem saat ini menampilkan voucher aktif sebagai banner fallback di beranda customer.</p>
          <Button variant="outline" className="mt-6 rounded-xl border-primary/20 text-primary hover:bg-primary/10 font-bold" onClick={openAddBanner}>
            <Plus className="w-4 h-4 mr-2" /> Tambah Banner Pertama
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 mt-6">
          {bannerList.map(b => (
            <Card key={b.id} className="border border-border/60 rounded-[2rem] overflow-hidden flex flex-col bg-card hover:shadow-xl transition-all duration-300">
              <div className="p-6 flex flex-col lg:flex-row gap-6 items-center">
                
                {/* Visual Preview Card - 1 Kolom besar */}
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
                        b.isActive ? "bg-green-500/10 text-green-600 dark:bg-green-500/20" : "bg-muted text-muted-foreground"
                      )}>
                        {b.isActive ? 'Aktif di Beranda' : 'Nonaktif / Arsip'}
                      </Badge>
                      <Badge variant="secondary" className="text-[9px] font-bold px-2 py-0.5 rounded-md">
                        Tipe: {b.type === 'voucher' ? 'Voucher' : b.type === 'menu' ? 'Produk Baru' : 'Kustom Bebas'}
                      </Badge>
                    </div>
                    <h4 className="font-extrabold text-lg sm:text-xl text-foreground leading-snug">{b.title}</h4>
                    <p className="text-sm text-muted-foreground leading-relaxed">{b.description}</p>
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
                      <Button variant="outline" size="sm" className="h-9 px-4 rounded-xl bg-background hover:bg-primary/10 hover:text-primary border-border/60 font-bold text-xs flex items-center gap-1.5" onClick={() => openEditBanner(b)}>
                        <Edit2 className="w-3.5 h-3.5" /> Edit Desain
                      </Button>
                      <Button variant="outline" size="icon" className="h-9 w-9 rounded-xl bg-background hover:bg-destructive/10 hover:text-destructive border-border/60 text-muted-foreground" onClick={() => setDeleteBannerId(b.id)}>
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

      {/* Modal Add/Edit Banner Penawaran - WORKSPACE DIALOG LEBIH BESAR */}
      <Dialog open={bannerDialogOpen} onOpenChange={(open) => { if (!isEditingLayout) setBannerDialogOpen(open); }}>
        <DialogContent className="max-w-[1200px] w-[96vw] rounded-[2rem] p-0 overflow-hidden border-border/60 shadow-2xl bg-background">
          <DialogHeader className="px-6 py-5 border-b border-border/50 bg-muted/10">
            <DialogTitle className="text-xl font-extrabold flex items-center gap-2">
              <div className="p-1.5 bg-primary/10 rounded-lg text-primary">
                {editBanner ? <Edit2 className="w-5 h-5" /> : <Sparkles className="w-5 h-5" strokeWidth={2.5} />}
              </div>
              {editBanner ? 'Workspace Desain Banner' : 'Workspace Tambah Banner'}
            </DialogTitle>
          </DialogHeader>

          <div className="overflow-y-auto p-6 custom-scrollbar" style={{ maxHeight: 'calc(85vh - 130px)' }}>
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Left Column: Form Fields (Inputs) */}
              <div className="lg:col-span-6 space-y-4 pr-1">
                <h4 className="font-extrabold text-sm text-foreground mb-3 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary" /> Detail & Latar Belakang Banner
                </h4>
                
                {/* Tipe Penawaran */}
                <div className="space-y-2">
                  <Label className="text-xs font-black text-foreground uppercase tracking-wider">Tipe Konten Penawaran <span className="text-destructive">*</span></Label>
                  <Select value={bannerType} onValueChange={(val: 'voucher' | 'menu' | 'custom') => {
                    setBannerType(val);
                    if (val === 'custom') { setBannerVoucherId(''); setBannerProductId(''); }
                  }}>
                    <SelectTrigger className="h-11 bg-background rounded-xl font-bold">
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
                      <SelectTrigger className="h-11 bg-background rounded-xl font-semibold"><SelectValue placeholder="Pilih voucher..." /></SelectTrigger>
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
                      <SelectTrigger className="h-11 bg-background rounded-xl font-semibold"><SelectValue placeholder="Pilih produk..." /></SelectTrigger>
                      <SelectContent className="rounded-xl">
                        {products.map(p => (
                          <SelectItem key={p.id} value={p.id!.toString()} className="font-semibold">{p.name} ({FORMAT_IDR(p.price)})</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {/* Title & Desc */}
                <div className="space-y-2">
                  <Label className="text-xs font-black text-foreground uppercase tracking-wider">Judul Banner <span className="text-destructive">*</span></Label>
                  <Input value={bannerTitle} onChange={e => setBannerTitle(e.target.value)} maxLength={45} placeholder="Contoh: Promo Spesial Weekend!" className="h-11 bg-background rounded-xl font-semibold text-sm" />
                </div>
                
                <div className="space-y-2">
                  <Label className="text-xs font-black text-foreground uppercase tracking-wider">Deskripsi Singkat <span className="text-destructive">*</span></Label>
                  <textarea value={bannerDesc} onChange={e => setBannerDesc(e.target.value)} rows={3} maxLength={120} placeholder="Ketik keterangan promo di sini..." className="w-full p-3 bg-background rounded-xl border border-input focus:outline-none focus:ring-1 focus:ring-primary text-sm font-semibold resize-none" />
                </div>

                {/* Background Selector */}
                <div className="p-4 bg-muted/30 border border-border/40 rounded-xl space-y-4">
                  <div className="space-y-2">
                    <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Tipe Latar Belakang Canvas</Label>
                    <Select value={bannerBgType} onValueChange={(val: any) => setBannerBgType(val)}>
                      <SelectTrigger className="h-10 bg-background rounded-lg font-bold text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl">
                        <SelectItem value="image" className="font-semibold text-xs">Gambar Latar Kustom (Upload)</SelectItem>
                        <SelectItem value="solid" className="font-semibold text-xs">Warna Solid Tunggal</SelectItem>
                        <SelectItem value="gradient" className="font-semibold text-xs">Warna Gradasi Modern</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {bannerBgType === 'image' && (
                    <div className="flex gap-3 items-center animate-in fade-in duration-200">
                      <div className="w-16 h-12 rounded-lg border border-border/60 bg-muted/20 flex items-center justify-center overflow-hidden shrink-0">
                        {bannerImage && !bannerImage.startsWith('preset:') ? <img src={bannerImage} alt="Preview" className="w-full h-full object-cover" /> : <ImageIcon className="w-5 h-5 text-muted-foreground/40" />}
                      </div>
                      <div className="flex-1">
                        <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={e => handleImageSelect(e, false)} />
                        <Button type="button" variant="outline" className="rounded-lg text-xs font-bold h-8 border-border/60" onClick={() => fileInputRef.current?.click()}>Pilih File Latar</Button>
                        <p className="text-[9px] text-muted-foreground mt-1">Rasio optimal 21:9.</p>
                      </div>
                    </div>
                  )}

                  {bannerBgType === 'solid' && (
                    <div className="space-y-3 animate-in fade-in duration-200">
                      <div className="flex flex-wrap gap-2">
                        {['#0F172A', '#3B82F6', '#EF4444', '#EAB308', '#10B981', '#8B5CF6', '#F97316', '#64748B'].map(color => (
                          <button
                            key={color}
                            type="button"
                            onClick={() => setBannerBgColor(color)}
                            className={cn("w-8 h-8 rounded-full border-2 transition-transform hover:scale-110", bannerBgColor.toUpperCase() === color ? 'border-primary shadow-md scale-110' : 'border-transparent')}
                            style={{ backgroundColor: color }}
                            title={color}
                          />
                        ))}
                      </div>
                      <div className="flex gap-3 items-center">
                        <Input type="color" value={bannerBgColor} onChange={e => setBannerBgColor(e.target.value)} className="w-14 h-11 p-1 cursor-pointer rounded-lg border-border/60 shrink-0" />
                        <div className="flex-1">
                          <Input value={bannerBgColor} onChange={e => setBannerBgColor(e.target.value)} className="h-10 bg-background rounded-lg text-xs font-bold uppercase font-mono" />
                        </div>
                      </div>
                    </div>
                  )}

                  {bannerBgType === 'gradient' && (
                    <div className="space-y-3 animate-in fade-in duration-200">
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
                            className={cn("w-12 h-8 rounded-md border-2 transition-transform hover:scale-105", bannerBgGradient === grad ? 'border-primary shadow-md scale-105' : 'border-transparent')}
                            style={{ background: grad }}
                            title={grad}
                          />
                        ))}
                      </div>
                      <div className="space-y-2">
                        <Input value={bannerBgGradient} onChange={e => setBannerBgGradient(e.target.value)} placeholder="linear-gradient(...)" className="h-10 bg-background rounded-lg text-xs font-bold font-mono" />
                        <div className="w-full h-8 rounded-lg border border-border/60" style={{ background: bannerBgGradient }} />
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Right Column: Static Preview & Layout Trigger */}
              <div className="lg:col-span-6 flex flex-col justify-between space-y-6 bg-muted/10 border border-border/40 p-6 rounded-2xl">
                <div className="space-y-4">
                  <h4 className="font-extrabold text-sm text-foreground flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-cyan-500" /> Preview Hasil Banner
                  </h4>
                  
                  {/* Visual Preview Card (Static) */}
                  <div 
                    className="w-full aspect-[21/9] rounded-2xl text-white relative overflow-hidden shadow-md select-none border border-border bg-slate-955"
                    style={{ 
                      background: bannerBgType === 'solid' ? bannerBgColor : bannerBgType === 'gradient' ? bannerBgGradient : undefined,
                      containerType: 'inline-size'
                    }}
                  >
                    {bannerBgType === 'image' && bannerImage ? (
                      <div className="absolute inset-0 z-0">
                        <img src={bannerImage} alt="Banner Preview" className="w-full h-full object-cover opacity-55" />
                        <div className="absolute inset-0 bg-gradient-to-r from-black/85 via-black/40 to-transparent" />
                      </div>
                    ) : (
                      <Gift size={90} className="absolute -right-3 -bottom-3 text-white/10 rotate-[-15deg] z-0 pointer-events-none" />
                    )}
                    
                    {overlayImage && (
                      <div 
                        style={{ 
                          position: 'absolute', 
                          left: `${overlayPos.x}%`, 
                          top: `${overlayPos.y}%`, 
                          transform: 'translate(-50%, -50%)', 
                          zIndex: 5 
                        }}
                      >
                         <img 
                           src={overlayImage} 
                           style={{
                             transform: `scaleX(${overlayFlipX ? -1 : 1}) rotate(${overlayRotate}deg)`,
                             width: `calc(${overlayScale} * 20cqw)`,
                             height: 'auto',
                           }}
                           className="object-contain drop-shadow-2xl max-w-none" 
                           alt="Overlay"
                         />
                      </div>
                    )}

                    <div style={{ position: 'absolute', left: `${titlePos.x}%`, top: `${titlePos.y}%`, transform: 'translate(0%, -50%)', zIndex: 10 }} className="w-[70cqw] max-w-[75cqw]">
                       <span className="bg-white/20 text-[2.2cqw] px-[1.5cqw] py-[0.5cqw] rounded backdrop-blur-md font-bold inline-block uppercase tracking-widest border border-white/10 mb-[1.5cqw]">
                          {bannerType === 'voucher' ? 'Promo Voucher' : bannerType === 'menu' ? 'Menu Rekomendasi' : 'Spesial Penawaran'}
                       </span>
                       <h4 className="font-black text-[4.5cqw] leading-[1.15] line-clamp-2 drop-shadow-sm">{bannerTitle || 'Judul Banner'}</h4>
                    </div>
                    
                    <div style={{ position: 'absolute', left: `${descPos.x}%`, top: `${descPos.y}%`, transform: 'translate(0%, -50%)', zIndex: 10 }} className="w-[70cqw] max-w-[75cqw] pointer-events-none">
                       <p className="text-[2.8cqw] text-slate-100 line-clamp-3 leading-[1.3] font-medium drop-shadow-sm m-0">{bannerDesc || 'Tulis deskripsi promo di sini...'}</p>
                       <div className="mt-[1.5cqw] text-[2.4cqw] bg-white text-slate-900 font-extrabold px-[2.5cqw] py-[0.8cqw] rounded-md shadow-sm pointer-events-auto inline-block">
                          {bannerButtonText || 'Lihat Detail'}
                       </div>
                    </div>
                  </div>

                  {/* Settings & Overlay Image Upload */}
                  <div className="space-y-4 pt-2">
                    <div className="p-4 bg-background border border-border/60 rounded-xl space-y-3">
                      <Label className="text-xs font-bold text-foreground uppercase tracking-wider">Foto Produk PNG Transparan Overlay</Label>
                      <div className="flex gap-4 items-center">
                        <div className="w-14 h-14 rounded-xl border border-dashed border-border/60 bg-muted/10 flex items-center justify-center overflow-hidden shrink-0">
                          {overlayImage ? <img src={overlayImage} alt="Overlay" className="w-full h-full object-contain" /> : <ImageIcon className="w-5 h-5 text-muted-foreground/40" />}
                        </div>
                        <div className="flex-1">
                          <input ref={overlayInputRef} type="file" accept="image/png,image/webp" className="hidden" onChange={e => handleImageSelect(e, true)} />
                          <Button type="button" variant="outline" className="rounded-lg text-xs font-bold h-9 border-primary/30 text-primary hover:bg-primary/10" onClick={() => overlayInputRef.current?.click()}>Pilih PNG Produk</Button>
                        </div>
                      </div>
                    </div>

                    <div className={cn("grid gap-4", bannerType === 'custom' ? "grid-cols-2" : "grid-cols-1")}>
                      <div className="space-y-1">
                        <Label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Teks Tombol Aksi</Label>
                        <Input value={bannerButtonText} onChange={e => setBannerButtonText(e.target.value)} placeholder="Beli Sekarang" className="h-10 bg-background rounded-xl font-semibold text-xs" />
                      </div>
                      {bannerType === 'custom' && (
                        <div className="space-y-1 animate-in fade-in duration-200">
                          <Label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Tautan Web (Link URL)</Label>
                          <Input value={bannerLink} onChange={e => setBannerLink(e.target.value)} placeholder="https://instagram.com/..." className="h-10 bg-background rounded-xl font-semibold text-xs" />
                        </div>
                      )}
                    </div>

                    <div className="flex items-center justify-between p-3 bg-background border border-border/50 rounded-xl">
                      <div className="flex flex-col">
                        <Label htmlFor="banner-active" className="text-xs font-bold cursor-pointer">Terbitkan Banner</Label>
                        <span className="text-[9px] text-muted-foreground">Tampilkan banner ini di beranda customer.</span>
                      </div>
                      <Switch id="banner-active" checked={bannerIsActive} onCheckedChange={setBannerIsActive} className="data-[state=checked]:bg-green-500 scale-90" />
                    </div>
                  </div>
                </div>

                {/* Layout Customizer Trigger Button */}
                <Button 
                  type="button" 
                  onClick={() => setIsEditingLayout(true)}
                  className="w-full bg-cyan-600 hover:bg-cyan-500 text-white font-extrabold h-12 rounded-xl shadow-md flex items-center justify-center gap-2 active:scale-[0.98] transition-all"
                >
                  <Move className="w-5 h-5" /> Kustomisasi Tata Letak & Posisi (Edit Layout)
                </Button>
              </div>
            </div>
          </div>

          <DialogFooter className="px-6 py-4 border-t border-border/50 bg-muted/10 gap-2 sm:gap-0">
            <Button variant="outline" className="h-11 rounded-xl font-bold border-border/60 hover:bg-muted" onClick={() => setBannerDialogOpen(false)}>Batal</Button>
            <Button 
              className="h-11 rounded-xl font-bold bg-primary hover:bg-primary/90 text-white shadow-md active:scale-[0.98] transition-all px-8" 
              onClick={handleSaveBanner} 
              disabled={!bannerTitle.trim() || !bannerDesc.trim()}
            >
              {editBanner ? 'Simpan Perubahan' : 'Terbitkan Banner'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* IMMERSIVE LAYOUT CANVAS EDITOR OVERLAY (Full screen & rotated on mobile portrait) */}
      {isEditingLayout && (
        <div className={cn(
          "fixed inset-0 z-[100] bg-slate-950 flex flex-col justify-between overflow-hidden",
          isMobilePortrait ? "landscape-editor-workspace" : "w-screen h-screen"
        )}>
          {/* Custom style tags to rotate orientation on mobile */}
          <style>{`
            @media (max-width: 768px) and (orientation: portrait) {
              .landscape-editor-workspace {
                position: fixed !important;
                top: 50% !important;
                left: 50% !important;
                width: 100vh !important;
                height: 100vw !important;
                transform: translate(-50%, -50%) rotate(90deg) !important;
                transform-origin: center !important;
                z-index: 9999 !important;
                background-color: #020617 !important;
                display: flex !important;
                flex-direction: column !important;
                justify-content: space-between !important;
                padding: 1rem !important;
              }
              .rotated-canvas-container {
                width: 80% !important;
                max-width: 90vh !important;
                aspect-ratio: 21/9 !important;
                margin: auto !important;
              }
            }
          `}</style>

          {/* Top Bar */}
          <div className="w-full flex items-center justify-between px-6 py-4 border-b border-white/10 bg-slate-900/90 backdrop-blur-md text-white select-none shrink-0 z-50">
            <div className="flex items-center gap-3">
              <Button 
                variant="ghost" 
                className="text-white hover:bg-white/10 rounded-xl h-10 px-4 font-bold border border-white/10"
                onClick={() => setIsEditingLayout(false)}
              >
                Kembali ke Form
              </Button>
              <span className="h-4 w-[1px] bg-white/20" />
              <h4 className="font-extrabold text-sm tracking-wide uppercase text-cyan-400">Editor Tata Letak Banner</h4>
            </div>
            
            <div className="hidden md:flex items-center gap-2 text-xs text-slate-300">
              <Move className="w-3.5 h-3.5 animate-pulse text-cyan-400" />
              <span>Geser judul/deskripsi/overlay untuk atur posisi. Magnet Snap akan otomatis aktif di margin & tengah.</span>
            </div>

            <Button 
              variant="outline" 
              size="sm"
              className="text-xs font-bold rounded-lg border-white/20 text-white hover:bg-white/10"
              onClick={() => {
                setTitlePos({ x: 8, y: 30 });
                setDescPos({ x: 8, y: 70 });
                setOverlayPos({ x: 85, y: 50 });
                setButtonPos({ x: 8, y: 80 });
                setOverlayScale(1);
                setOverlayRotate(0);
                setOverlayFlipX(false);
                setSelectedTarget(null);
                toast.success('Posisi direset ke default');
              }}
            >
              <RotateCcw className="w-3 h-3 mr-1" /> Reset Posisi
            </Button>
          </div>

          {/* Workspace Area with interactive Canvas */}
          <div className="flex-1 w-full flex items-center justify-center p-4 bg-slate-950 overflow-hidden relative">
            <div 
              ref={previewRef}
              onPointerDown={() => setSelectedTarget(null)}
              className={cn(
                "w-full aspect-[21/9] rounded-2xl text-white relative overflow-hidden shadow-[0_0_50px_rgba(0,0,0,0.8)] border border-white/10 select-none bg-slate-900 touch-none",
                isMobilePortrait ? "rotated-canvas-container" : "w-[92vw] max-w-[1250px]"
              )}
              style={{ 
                background: bannerBgType === 'solid' ? bannerBgColor : bannerBgType === 'gradient' ? bannerBgGradient : undefined,
                containerType: 'inline-size'
              }}
            >
              {bannerBgType === 'image' && bannerImage ? (
                <div className="absolute inset-0 z-0 select-none pointer-events-none">
                  <img src={bannerImage} alt="Bg" className="w-full h-full object-cover opacity-60" />
                  <div className="absolute inset-0 bg-gradient-to-r from-black/85 via-black/40 to-transparent" />
                </div>
              ) : bannerBgType === 'image' ? (
                <div className="absolute inset-0 bg-slate-900 flex items-center justify-center opacity-30 select-none pointer-events-none">
                  <ImageIcon size={48} />
                </div>
              ) : null}

              {/* Smart Visual Guides (Garis Bantu Cyan) */}
              {activeGuidelines.xCenter && <div className="absolute top-0 bottom-0 left-1/2 w-[1.5px] bg-[#22d3ee] shadow-[0_0_8px_#22d3ee] z-30 pointer-events-none" />}
              {activeGuidelines.xLeft && <div className="absolute top-0 bottom-0 left-[10%] w-[1.5px] bg-[#22d3ee] shadow-[0_0_8px_#22d3ee] z-30 pointer-events-none" />}
              {activeGuidelines.xRight && <div className="absolute top-0 bottom-0 left-[90%] w-[1.5px] bg-[#22d3ee] shadow-[0_0_8px_#22d3ee] z-30 pointer-events-none" />}
              {activeGuidelines.yCenter && <div className="absolute left-0 right-0 top-1/2 h-[1.5px] bg-[#22d3ee] shadow-[0_0_8px_#22d3ee] z-30 pointer-events-none" />}
              {activeGuidelines.yTop && <div className="absolute left-0 right-0 top-[10%] h-[1.5px] bg-[#22d3ee] shadow-[0_0_8px_#22d3ee] z-30 pointer-events-none" />}
              {activeGuidelines.yBottom && <div className="absolute left-0 right-0 top-[90%] h-[1.5px] bg-[#22d3ee] shadow-[0_0_8px_#22d3ee] z-30 pointer-events-none" />}

              {/* OVERLAY IMAGE (Draggable & Transformable) */}
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
                  <div className="relative select-none pointer-events-none flex shrink-0 p-1">
                    <img 
                      src={overlayImage} 
                      style={{
                        transform: `scaleX(${overlayFlipX ? -1 : 1}) rotate(${overlayRotate}deg)`,
                        width: `calc(${overlayScale} * 20cqw)`,
                        height: 'auto',
                      }}
                      className="object-contain drop-shadow-2xl max-w-none animate-in zoom-in duration-200" 
                      alt="Overlay" 
                    />
                    
                    {/* Floating actions toolbar */}
                    {selectedTarget === 'overlay' && (
                      <div 
                        style={overlayPos.y < 25 ? { bottom: '-55px', top: 'auto' } : { top: '-55px', bottom: 'auto' }}
                        className="floating-toolbar no-drag absolute left-1/2 -translate-x-1/2 bg-slate-900/95 text-white border border-cyan-500/30 rounded-xl shadow-[0_0_15px_rgba(34,211,238,0.2)] flex items-center gap-1.5 p-1.5 z-50 backdrop-blur-md pointer-events-auto"
                        onPointerDown={(e) => e.stopPropagation()}
                      >
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="w-7 h-7 hover:bg-white/10 rounded-lg text-white p-0" 
                          onClick={(e) => { e.stopPropagation(); setOverlayScale(prev => Math.max(0.2, Math.round((prev - 0.1) * 10) / 10)); }} 
                          title="Kecilkan"
                        >
                          <Minus className="w-4 h-4" />
                        </Button>
                        <span className="text-[10px] font-mono font-black px-1.5 select-none">{Math.round(overlayScale * 100)}%</span>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="w-7 h-7 hover:bg-white/10 rounded-lg text-white p-0" 
                          onClick={(e) => { e.stopPropagation(); setOverlayScale(prev => Math.min(3.0, Math.round((prev + 0.1) * 10) / 10)); }} 
                          title="Besarkan"
                        >
                          <Plus className="w-4 h-4" />
                        </Button>
                        <div className="w-[1px] h-4 bg-white/20 mx-1" />
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="w-7 h-7 hover:bg-white/10 rounded-lg text-white p-0" 
                          onClick={(e) => { e.stopPropagation(); setOverlayRotate(prev => (prev - 15) % 360); }} 
                          title="Putar Kiri"
                        >
                          <RotateCcw className="w-4 h-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="w-7 h-7 hover:bg-white/10 rounded-lg text-white p-0" 
                          onClick={(e) => { e.stopPropagation(); setOverlayRotate(prev => (prev + 15) % 360); }} 
                          title="Putar Kanan"
                        >
                          <RotateCw className="w-4 h-4" />
                        </Button>
                        <div className="w-[1px] h-4 bg-white/20 mx-1" />
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className={cn("w-7 h-7 hover:bg-white/10 rounded-lg text-white p-0", overlayFlipX && "bg-cyan-500/20 text-cyan-400")} 
                          onClick={(e) => { e.stopPropagation(); setOverlayFlipX(prev => !prev); }} 
                          title="Balik Horisontal"
                        >
                          <FlipHorizontal className="w-4 h-4" />
                        </Button>
                        <div className="w-[1px] h-4 bg-white/20 mx-1" />
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="w-7 h-7 text-red-400 hover:bg-red-500/20 rounded-lg p-0" 
                          onClick={(e) => { e.stopPropagation(); setOverlayImage(null); }} 
                          title="Hapus Overlay"
                        >
                          <Trash2 className="w-4 h-4" />
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
                <div className="w-[70cqw] max-w-[75cqw] cursor-grab active:cursor-grabbing">
                  <span className="text-[2.2cqw] px-[1.5cqw] py-[0.5cqw] rounded bg-white/20 backdrop-blur-md font-bold mb-[1.5cqw] inline-block uppercase tracking-wider border border-white/10 shadow-sm pointer-events-none">
                    Promo Spesial
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
                <div className="w-[70cqw] max-w-[75cqw] cursor-grab active:cursor-grabbing">
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

          {/* Bottom Bar */}
          <div className="w-full bg-slate-900/90 border-t border-white/10 px-6 py-4 flex items-center justify-between text-white select-none shrink-0 z-50">
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <Sparkles className="w-4 h-4 text-cyan-400" />
              <span>Tata letak kanvas akan disimpan secara otomatis saat Anda menutup editor.</span>
            </div>
            <Button 
              className="bg-cyan-500 hover:bg-cyan-600 text-slate-950 font-black px-6 rounded-xl h-11 shadow-lg shadow-cyan-500/20"
              onClick={() => setIsEditingLayout(false)}
            >
              Selesai & Simpan Posisi
            </Button>
          </div>
        </div>
      )}

      {/* Delete Confirmation Banner Modal */}
      <AlertDialog open={!!deleteBannerId} onOpenChange={() => setDeleteBannerId(null)}>
        <AlertDialogContent className="max-w-[400px] rounded-2xl p-6">
          <AlertDialogHeader>
            <div className="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center mb-2 mx-auto">
              <Trash2 className="w-6 h-6 text-destructive" />
            </div>
            <AlertDialogTitle className="text-center text-xl font-extrabold">Hapus Banner Penawaran?</AlertDialogTitle>
            <AlertDialogDescription className="text-center">
              Banner penawaran menarik ini akan dihapus secara permanen dari beranda pelanggan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-6 sm:justify-center flex-row gap-3">
            <AlertDialogCancel className="flex-1 mt-0 rounded-xl h-11 font-bold">Batal</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteBanner} className="flex-1 rounded-xl h-11 font-bold bg-destructive hover:bg-destructive/90 text-white shadow-md shadow-destructive/20">
              Ya, Hapus
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
