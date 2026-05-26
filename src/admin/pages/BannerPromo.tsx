import { useDbQuery, dbUpdate, dbUploadFile, dbDeleteFile, dbInsert, dbDelete } from '@/hooks/db-hooks';
import { type Voucher, type Product } from '@/hooks/db-hooks';
import { useState, useRef } from 'react';
import { 
  Plus, Edit2, Trash2, Image as ImageIcon, Sparkles, Gift, Clock, Move, 
  Minus, RotateCcw, RotateCw, FlipHorizontal, Scaling, MousePointer2, X
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

export default function BannerPromo() {
  const vouchers = (useDbQuery<Voucher>('vouchers') as Voucher[]) ?? [];
  const products = (useDbQuery<Product>('products') as Product[]) ?? [];
  const bannerList = useDbQuery<PromoBanner>('banners');

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

  const [overlayImage, setOverlayImage] = useState<string | null>(null);
  const [titlePos, setTitlePos] = useState({ x: 8, y: 30 });
  const [descPos, setDescPos] = useState({ x: 8, y: 70 });
  const [overlayPos, setOverlayPos] = useState({ x: 80, y: 50 });
  
  const [overlayScale, setOverlayScale] = useState<number>(1);
  const [overlayRotate, setOverlayRotate] = useState<number>(0);
  const [overlayFlipX, setOverlayFlipX] = useState<boolean>(false);
  
  const [isEditingLayout, setIsEditingLayout] = useState(false);
  const [dragTarget, setDragTarget] = useState<'title' | 'desc' | 'overlay' | null>(null);
  const [selectedTarget, setSelectedTarget] = useState<'title' | 'desc' | 'overlay' | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const overlayInputRef = useRef<HTMLInputElement>(null);
  const previewRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLDivElement>(null);
  const descRef = useRef<HTMLDivElement>(null);

  if (bannerList === undefined) {
    return (
      <div className="flex items-center justify-center p-12">
        <Clock className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  const startDrag = (e: React.PointerEvent, target: 'title' | 'desc' | 'overlay', ref: React.RefObject<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();

    setDragTarget(target);
    setSelectedTarget(target);

    const el = ref.current;
    const canvas = previewRef.current;
    if (!el || !canvas) return;

    const rect = canvas.getBoundingClientRect();
    const startMouseX = e.clientX;
    const startMouseY = e.clientY;

    const initialPos = target === 'title' ? titlePos : target === 'desc' ? descPos : overlayPos;
    const startX = initialPos.x;
    const startY = initialPos.y;

    const onMove = (moveEvent: PointerEvent) => {
      const dx = moveEvent.clientX - startMouseX;
      const dy = moveEvent.clientY - startMouseY;

      let newX = startX + (dx / rect.width) * 100;
      let newY = startY + (dy / rect.height) * 100;

      if (Math.abs(newX - 50) < 2) newX = 50;
      if (Math.abs(newY - 50) < 2) newY = 50;

      newX = Math.round(Math.max(0, Math.min(100, newX)) * 10) / 10;
      newY = Math.round(Math.max(0, Math.min(100, newY)) * 10) / 10;

      el.style.left = `${newX}%`;
      el.style.top = `${newY}%`;
    };

    const onUp = () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      setDragTarget(null);

      const finalX = parseFloat(el.style.left) || startX;
      const finalY = parseFloat(el.style.top) || startY;

      if (target === 'title') setTitlePos({ x: finalX, y: finalY });
      else if (target === 'desc') setDescPos({ x: finalX, y: finalY });
      else if (target === 'overlay') setOverlayPos({ x: finalX, y: finalY });
    };

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  };

  const resetPositions = () => {
    setTitlePos({ x: 8, y: 30 });
    setDescPos({ x: 8, y: 70 });
    setOverlayPos({ x: 80, y: 50 });
    setOverlayScale(1);
    setOverlayRotate(0);
    setOverlayFlipX(false);
    setSelectedTarget(null);
    toast.success('Posisi kanvas direset ke default');
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
    resetPositions();
    setBannerBgType('image');
    setBannerBgColor('#1E293B');
    setBannerBgGradient('linear-gradient(to bottom right, #3b82f6, #9333ea)');
    setIsEditingLayout(false);
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
    setDescPos(b.descPos || { x: 8, y: 70 });
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
      setBannerDesc(`Dapatkan diskon ${v.type === 'percentage' ? `${v.value}%` : FORMAT_IDR(v.value)} menggunakan kode promo ini!`);
      setBannerImage(null); setOverlayImage(null);
    }
  };

  const handleBannerProductChange = (pId: string) => {
    setBannerProductId(pId);
    const p = products.find(x => x.id?.toString() === pId);
    if (p) {
      setBannerTitle(`Coba Menu Baru: ${p.name}!`);
      setBannerDesc(`Nikmati sensasi kelezatan ${p.name} hari ini, hanya seharga ${FORMAT_IDR(p.price)}!`);
      setBannerImage(p.photo || null); setOverlayImage(null);
    }
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>, isOverlay: boolean = false) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { toast.error('File harus berupa gambar'); return; }
    
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      if (isOverlay) {
        setOverlayImage(dataUrl); setOverlayScale(1); setOverlayRotate(0); setOverlayFlipX(false);
      } else {
        setBannerImage(dataUrl);
      }
    };
    reader.readAsDataURL(file);
    if (isOverlay && overlayInputRef.current) overlayInputRef.current.value = '';
    if (!isOverlay && fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSaveBanner = async () => {
    if (!bannerTitle.trim() || !bannerDesc.trim()) { toast.error('Harap isi judul dan deskripsi penawaran'); return; }
    
    let finalImageUrl = bannerImage;
    if (bannerImage && bannerImage.startsWith('data:image')) {
      toast.loading('Mengunggah gambar latar...', { id: 'upload-bg' });
      try {
        const url = await dbUploadFile('banners', `banner-bg-${Date.now()}.jpg`, bannerImage);
        if (url) finalImageUrl = url;
        toast.dismiss('upload-bg');
      } catch (e) { toast.dismiss('upload-bg'); toast.error('Gagal mengunggah gambar latar'); return; }
    }

    let finalOverlayUrl = overlayImage;
    if (overlayImage && overlayImage.startsWith('data:image')) {
      toast.loading('Mengunggah foto overlay...', { id: 'upload-overlay' });
      try {
        const url = await dbUploadFile('banners', `banner-overlay-${Date.now()}.png`, overlayImage);
        if (url) finalOverlayUrl = url;
        toast.dismiss('upload-overlay');
      } catch (e) { toast.dismiss('upload-overlay'); toast.error('Gagal mengunggah foto overlay'); return; }
    }
    
    const bannerData = {
      type: bannerType, title: bannerTitle.trim(), description: bannerDesc.trim(),
      voucherId: bannerType === 'voucher' ? Number(bannerVoucherId) || bannerVoucherId : null,
      productId: bannerType === 'menu' ? Number(bannerProductId) || bannerProductId : null,
      imageUrl: finalImageUrl, overlayImageUrl: finalOverlayUrl,
      titlePos, descPos, overlayPos, buttonText: bannerButtonText.trim(), link: bannerLink.trim(),
      isActive: bannerIsActive, bgType: bannerBgType,
      bgColor: bannerBgType === 'solid' ? bannerBgColor : null,
      bgGradient: bannerBgType === 'gradient' ? bannerBgGradient : null,
      overlayScale, overlayRotate, overlayFlipX
    };

    try {
      if (editBanner) {
        if (editBanner.imageUrl && finalImageUrl && editBanner.imageUrl !== finalImageUrl && editBanner.imageUrl.includes('banners')) await dbDeleteFile(editBanner.imageUrl);
        if (editBanner.overlayImageUrl && finalOverlayUrl && editBanner.overlayImageUrl !== finalOverlayUrl && editBanner.overlayImageUrl.includes('banners')) await dbDeleteFile(editBanner.overlayImageUrl);
        await dbUpdate('banners', editBanner.id, bannerData);
        toast.success('Banner penawaran diperbarui');
      } else {
        await dbInsert('banners', { ...bannerData, createdAt: new Date().toISOString() });
        toast.success('Banner penawaran baru ditambahkan');
      }
      setBannerDialogOpen(false);
    } catch (err) { toast.error('Gagal menyimpan banner penawaran'); }
  };

  const handleDeleteBanner = async () => {
    if (!deleteBannerId) return;
    const bannerToDelete = bannerList.find(b => b.id === deleteBannerId);
    try {
      if (bannerToDelete?.imageUrl && bannerToDelete.imageUrl.includes('banners')) await dbDeleteFile(bannerToDelete.imageUrl);
      if (bannerToDelete?.overlayImageUrl && bannerToDelete.overlayImageUrl.includes('banners')) await dbDeleteFile(bannerToDelete.overlayImageUrl);
      await dbDelete('banners', deleteBannerId);
      toast.success('Banner berhasil dihapus');
    } catch (err) { toast.error('Gagal menghapus banner'); } finally { setDeleteBannerId(null); }
  };

  const handleToggleBannerActive = async (bId: string | number, currentActive: boolean) => {
    const banner = bannerList.find(b => b.id === bId);
    if (!banner) return;
    try {
      await dbUpdate('banners', bId, { ...banner, isActive: !currentActive });
      toast.success(!currentActive ? 'Banner diaktifkan' : 'Banner dinonaktifkan');
    } catch (err) { toast.error('Gagal mengubah status banner'); }
  };

  return (
    <div className="pt-8 pb-24 space-y-6 w-full mx-auto animate-in fade-in duration-300">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h3 className="text-2xl font-black text-foreground tracking-tight">Pengaturan Banner</h3>
          <p className="text-sm text-muted-foreground mt-1">Atur banner promo dan produk di Beranda Pelanggan.</p>
        </div>
        <Button onClick={openAddBanner} className="h-11 px-5 rounded-xl font-bold bg-primary hover:bg-primary/90 text-primary-foreground shadow-md transition-all shrink-0">
          <Plus className="w-5 h-5 mr-2" strokeWidth={3} /> Tambah Banner
        </Button>
      </div>

      {bannerList.length === 0 ? (
        <div className="bg-card border border-dashed border-border rounded-[2rem] p-12 flex flex-col items-center justify-center text-center mt-6">
          <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mb-4">
            <Sparkles className="w-10 h-10 text-primary/50" strokeWidth={1.5} />
          </div>
          <h3 className="text-lg font-bold text-foreground mb-1">Belum Ada Banner</h3>
          <p className="text-sm text-muted-foreground max-w-sm">Tambahkan banner untuk menarik perhatian pelanggan.</p>
          <Button variant="outline" className="mt-6 rounded-xl font-bold" onClick={openAddBanner}>
            Buat Banner Pertama
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 mt-6">
          {bannerList.map(b => (
            <Card key={b.id} className="border border-border/60 rounded-[2rem] overflow-hidden flex flex-col bg-card hover:shadow-xl transition-all duration-300">
              <div className="p-6 flex flex-col lg:flex-row gap-6 items-center">
                <div 
                  className="w-full lg:w-[420px] aspect-[21/9] rounded-2xl relative overflow-hidden shadow-md shrink-0 select-none bg-black border border-border/50 text-white"
                  style={{ background: b.bgType === 'solid' ? b.bgColor : b.bgType === 'gradient' ? b.bgGradient : undefined, containerType: 'inline-size' }}
                >
                  {b.imageUrl ? (
                    <div className="absolute inset-0 z-0">
                      <img src={b.imageUrl} alt="Banner" className="w-full h-full object-cover opacity-60 mix-blend-overlay" />
                      <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/40 to-transparent" />
                    </div>
                  ) : <div className="absolute inset-0 bg-black/20" />}
                  
                  {b.overlayImageUrl && (
                    <div style={{ position: 'absolute', left: `${b.overlayPos?.x ?? 80}%`, top: `${b.overlayPos?.y ?? 50}%`, transform: 'translate(-50%, -50%)', zIndex: 5 }}>
                       <img src={b.overlayImageUrl} style={{ transform: `scaleX(${b.overlayFlipX ? -1 : 1}) rotate(${b.overlayRotate ?? 0}deg)`, width: `calc(${b.overlayScale ?? 1} * 20cqw)`, height: 'auto' }} className="object-contain drop-shadow-2xl max-w-none" alt="Overlay" />
                    </div>
                  )}

                  <div style={{ position: 'absolute', left: `${b.titlePos?.x ?? 8}%`, top: `${b.titlePos?.y ?? 30}%`, transform: 'translate(0%, -50%)', zIndex: 10 }} className="w-[70cqw] max-w-[75cqw]">
                     <span className="bg-white/10 text-[2.2cqw] px-[1.5cqw] py-[0.5cqw] rounded backdrop-blur-md font-bold inline-block uppercase tracking-widest border border-white/20 mb-[1.5cqw]">
                        {b.type === 'voucher' ? 'Promo Voucher' : b.type === 'menu' ? 'Menu Rekomendasi' : 'Spesial Penawaran'}
                     </span>
                     <h4 className="font-black text-[4.5cqw] leading-[1.15] line-clamp-2 drop-shadow-lg text-white">{b.title}</h4>
                  </div>
                  
                  <div style={{ position: 'absolute', left: `${b.descPos?.x ?? 8}%`, top: `${b.descPos?.y ?? 65}%`, transform: 'translate(0%, -50%)', zIndex: 10 }} className="w-[70cqw] max-w-[75cqw] pointer-events-none">
                     <p className="text-[2.8cqw] text-slate-200 line-clamp-3 leading-[1.3] font-medium drop-shadow-md m-0">{b.description}</p>
                     <div className="mt-[2cqw] text-[2.4cqw] bg-white text-black font-extrabold px-[3cqw] py-[1cqw] rounded-lg shadow-xl inline-block">
                        {b.buttonText || 'Lihat Detail'}
                     </div>
                  </div>
                </div>

                <div className="flex-1 w-full flex flex-col justify-between py-2">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className={cn("text-[10px] font-black uppercase px-2.5 py-0.5 rounded-md border-none tracking-widest", b.isActive ? "bg-green-500/10 text-green-600" : "bg-muted text-muted-foreground")}>
                        {b.isActive ? 'Aktif' : 'Nonaktif'}
                      </Badge>
                      <Badge variant="secondary" className="text-[10px] font-bold px-2 py-0.5 rounded-md">
                        {b.type === 'voucher' ? 'Voucher' : b.type === 'menu' ? 'Produk Baru' : 'Kustom'}
                      </Badge>
                    </div>
                    <h4 className="font-extrabold text-xl text-foreground leading-snug">{b.title}</h4>
                    <p className="text-sm text-muted-foreground leading-relaxed line-clamp-2">{b.description}</p>
                  </div>

                  <div className="flex items-center justify-between mt-6 pt-4 border-t border-border w-full">
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Status Tampil</span>
                      <Switch checked={b.isActive} onCheckedChange={() => handleToggleBannerActive(b.id, b.isActive)} className="data-[state=checked]:bg-green-500 scale-90" />
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" className="h-9 px-4 rounded-xl font-bold text-xs flex items-center gap-1.5" onClick={() => openEditBanner(b)}>
                        <Edit2 className="w-3.5 h-3.5" /> Edit Desain
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

      {/* Modal Add/Edit Form */}
      <Dialog open={bannerDialogOpen} onOpenChange={(open) => { if (!isEditingLayout) setBannerDialogOpen(open); }}>
        <DialogContent className="max-w-[1200px] w-[96vw] max-h-[90vh] overflow-y-auto rounded-[2rem] p-0 border-border shadow-2xl bg-background custom-scrollbar">
          <DialogHeader className="px-6 py-5 border-b border-border bg-muted/30">
            <DialogTitle className="text-xl font-extrabold flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary" /> {editBanner ? 'Workspace Desain Banner' : 'Workspace Tambah Banner'}
            </DialogTitle>
          </DialogHeader>

          <div className="p-6">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              <div className="lg:col-span-6 space-y-5">
                <div className="space-y-4">
                  <Label className="text-xs font-black uppercase tracking-wider">Tipe Penawaran</Label>
                  <Select value={bannerType} onValueChange={(val: any) => { setBannerType(val); if (val === 'custom') { setBannerVoucherId(''); setBannerProductId(''); }}}>
                    <SelectTrigger className="h-12 bg-background rounded-xl font-bold shadow-sm border-border"><SelectValue /></SelectTrigger>
                    <SelectContent className="rounded-xl">
                      <SelectItem value="voucher" className="font-semibold">Kode Promo / Voucher</SelectItem>
                      <SelectItem value="menu" className="font-semibold">Menu Baru / Rekomendasi</SelectItem>
                      <SelectItem value="custom" className="font-semibold">Kustom Bebas</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {bannerType === 'voucher' && (
                  <div className="space-y-2">
                    <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Pilih Voucher</Label>
                    <Select value={bannerVoucherId} onValueChange={handleBannerVoucherChange}>
                      <SelectTrigger className="h-12 bg-background rounded-xl font-semibold shadow-sm border-border"><SelectValue placeholder="Pilih voucher..." /></SelectTrigger>
                      <SelectContent className="rounded-xl">
                        {vouchers.map(v => <SelectItem key={v.id} value={v.id!.toString()} className="font-semibold">{v.code}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {bannerType === 'menu' && (
                  <div className="space-y-2">
                    <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Pilih Produk</Label>
                    <Select value={bannerProductId} onValueChange={handleBannerProductChange}>
                      <SelectTrigger className="h-12 bg-background rounded-xl font-semibold shadow-sm border-border"><SelectValue placeholder="Pilih produk..." /></SelectTrigger>
                      <SelectContent className="rounded-xl">
                        {products.map(p => <SelectItem key={p.id} value={p.id!.toString()} className="font-semibold">{p.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <div className="space-y-2">
                  <Label className="text-xs font-black uppercase tracking-wider">Judul Banner</Label>
                  <Input value={bannerTitle} onChange={e => setBannerTitle(e.target.value)} maxLength={45} className="h-12 bg-background rounded-xl font-semibold shadow-sm border-border" />
                </div>
                
                <div className="space-y-2">
                  <Label className="text-xs font-black uppercase tracking-wider">Deskripsi Singkat</Label>
                  <textarea value={bannerDesc} onChange={e => setBannerDesc(e.target.value)} rows={3} maxLength={120} className="w-full p-4 bg-background rounded-xl border border-border focus:outline-none focus:ring-2 focus:ring-primary/50 font-semibold resize-none shadow-sm" />
                </div>

                <div className="p-5 bg-card border border-border rounded-2xl space-y-4">
                  <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Background Canvas</Label>
                  <Select value={bannerBgType} onValueChange={(val: any) => setBannerBgType(val)}>
                    <SelectTrigger className="h-11 bg-background rounded-lg font-bold text-xs border-border shadow-sm"><SelectValue /></SelectTrigger>
                    <SelectContent className="rounded-xl">
                      <SelectItem value="image" className="font-semibold text-xs">Gambar Latar</SelectItem>
                      <SelectItem value="solid" className="font-semibold text-xs">Warna Solid</SelectItem>
                      <SelectItem value="gradient" className="font-semibold text-xs">Warna Gradasi</SelectItem>
                    </SelectContent>
                  </Select>

                  {bannerBgType === 'image' && (
                    <div className="flex gap-4 items-center pt-2">
                      <div className="w-20 h-14 rounded-lg border border-border bg-background flex items-center justify-center overflow-hidden shrink-0 shadow-sm">
                        {bannerImage ? <img src={bannerImage} alt="Preview" className="w-full h-full object-cover" /> : <ImageIcon className="w-6 h-6 text-muted-foreground/40" />}
                      </div>
                      <div className="flex-1">
                        <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={e => handleImageSelect(e, false)} />
                        <Button type="button" variant="outline" className="rounded-lg text-xs font-bold h-9 border-border" onClick={() => fileInputRef.current?.click()}>Pilih File Gambar Latar</Button>
                      </div>
                    </div>
                  )}

                  {bannerBgType === 'solid' && (
                    <div className="space-y-3 pt-2">
                      <div className="flex flex-wrap gap-2.5">
                        {['#0F172A', '#1E293B', '#3B82F6', '#EF4444', '#EAB308', '#10B981', '#8B5CF6', '#F97316'].map(color => (
                          <button key={color} type="button" onClick={() => setBannerBgColor(color)} className={cn("w-8 h-8 rounded-full border-2", bannerBgColor.toUpperCase() === color ? 'border-primary scale-110' : 'border-transparent')} style={{ backgroundColor: color }} />
                        ))}
                      </div>
                      <div className="flex gap-3 items-center">
                        <Input type="color" value={bannerBgColor} onChange={e => setBannerBgColor(e.target.value)} className="w-12 h-10 p-1 cursor-pointer rounded-lg border-border shrink-0" />
                        <Input value={bannerBgColor} onChange={e => setBannerBgColor(e.target.value)} className="h-10 bg-background rounded-lg text-xs font-bold uppercase font-mono shadow-sm" />
                      </div>
                    </div>
                  )}

                  {bannerBgType === 'gradient' && (
                    <div className="space-y-3 pt-2">
                      <Input value={bannerBgGradient} onChange={e => setBannerBgGradient(e.target.value)} className="h-10 bg-background rounded-lg text-xs font-bold font-mono shadow-sm" />
                    </div>
                  )}
                </div>
              </div>

              <div className="lg:col-span-6 flex flex-col justify-between space-y-6">
                <div className="p-6 bg-card border border-border rounded-[2rem] space-y-5 shadow-sm">
                  <h4 className="font-extrabold text-sm flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-primary animate-pulse" /> Live Preview</h4>
                  
                  <div className="w-full aspect-[21/9] rounded-2xl relative overflow-hidden shadow-lg select-none border border-border/50 text-white bg-black ring-1 ring-white/10" style={{ background: bannerBgType === 'solid' ? bannerBgColor : bannerBgType === 'gradient' ? bannerBgGradient : undefined, containerType: 'inline-size' }}>
                    {bannerBgType === 'image' && bannerImage ? (
                      <div className="absolute inset-0 z-0">
                        <img src={bannerImage} alt="Preview Background" className="w-full h-full object-cover opacity-60 mix-blend-overlay" />
                        <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/40 to-transparent" />
                      </div>
                    ) : <div className="absolute inset-0 bg-black/20" />}
                    
                    {overlayImage && (
                      <div style={{ position: 'absolute', left: `${overlayPos.x}%`, top: `${overlayPos.y}%`, transform: 'translate(-50%, -50%)', zIndex: 5 }}>
                         <img src={overlayImage} style={{ transform: `scaleX(${overlayFlipX ? -1 : 1}) rotate(${overlayRotate}deg)`, width: `calc(${overlayScale} * 20cqw)`, height: 'auto' }} className="object-contain drop-shadow-2xl max-w-none" alt="Overlay" />
                      </div>
                    )}

                    <div style={{ position: 'absolute', left: `${titlePos.x}%`, top: `${titlePos.y}%`, transform: 'translate(0%, -50%)', zIndex: 10 }} className="w-[70cqw] max-w-[75cqw]">
                       <span className="bg-white/10 text-[2.2cqw] px-[1.5cqw] py-[0.5cqw] rounded backdrop-blur-md font-bold inline-block uppercase tracking-widest border border-white/20 mb-[1.5cqw]">
                          {bannerType === 'voucher' ? 'Promo Voucher' : bannerType === 'menu' ? 'Menu Rekomendasi' : 'Spesial Penawaran'}
                       </span>
                       <h4 className="font-black text-[4.5cqw] leading-[1.15] line-clamp-2 drop-shadow-lg text-white">{bannerTitle || 'Judul Banner'}</h4>
                    </div>
                    
                    <div style={{ position: 'absolute', left: `${descPos.x}%`, top: `${descPos.y}%`, transform: 'translate(0%, -50%)', zIndex: 10 }} className="w-[70cqw] max-w-[75cqw] pointer-events-none">
                       <p className="text-[2.8cqw] text-slate-200 line-clamp-3 leading-[1.3] font-medium drop-shadow-md m-0">{bannerDesc || 'Tulis deskripsi promo...'}</p>
                       <div className="mt-[2cqw] text-[2.4cqw] bg-white text-black font-extrabold px-[3cqw] py-[1cqw] rounded-lg shadow-xl inline-block">{bannerButtonText || 'Lihat Detail'}</div>
                    </div>
                  </div>

                  <div className="space-y-4 pt-4">
                    <div className="p-4 bg-background border border-border rounded-2xl shadow-sm space-y-3">
                      <Label className="text-xs font-bold uppercase tracking-wider">Foto Overlay (PNG Transparan)</Label>
                      <div className="flex gap-4 items-center">
                        <div className="w-16 h-16 rounded-xl border-2 border-dashed border-border bg-muted flex items-center justify-center overflow-hidden shrink-0 cursor-pointer" onClick={() => overlayInputRef.current?.click()}>
                          {overlayImage ? <img src={overlayImage} alt="Overlay" className="w-full h-full object-contain p-1" /> : <ImageIcon className="w-6 h-6 text-muted-foreground/40" />}
                        </div>
                        <div className="flex-1">
                          <input ref={overlayInputRef} type="file" accept="image/png,image/webp" className="hidden" onChange={e => handleImageSelect(e, true)} />
                          <Button type="button" variant="outline" className="rounded-xl text-xs font-bold h-10 border-border shadow-sm w-full sm:w-auto" onClick={() => overlayInputRef.current?.click()}>Pilih PNG</Button>
                        </div>
                      </div>
                    </div>

                    <div className={cn("grid gap-4", bannerType === 'custom' ? "grid-cols-2" : "grid-cols-1")}>
                      <div className="space-y-2">
                        <Label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Teks Tombol</Label>
                        <Input value={bannerButtonText} onChange={e => setBannerButtonText(e.target.value)} placeholder="Beli Sekarang" className="h-11 bg-background rounded-xl font-semibold text-sm shadow-sm" />
                      </div>
                      {bannerType === 'custom' && (
                        <div className="space-y-2">
                          <Label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">URL Tujuan</Label>
                          <Input value={bannerLink} onChange={e => setBannerLink(e.target.value)} placeholder="https://..." className="h-11 bg-background rounded-xl font-semibold text-sm shadow-sm" />
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <Button type="button" onClick={() => setIsEditingLayout(true)} className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-black h-14 rounded-[1.25rem] shadow-xl flex items-center justify-center gap-2 transition-all">
                  <Scaling className="w-5 h-5" /> Editor Interaktif (Geser & Putar)
                </Button>
              </div>
            </div>
          </div>

          <DialogFooter className="px-6 py-5 border-t border-border bg-muted/30 gap-3 sm:gap-0">
            <Button variant="outline" className="h-12 rounded-xl font-bold border-border hover:bg-muted px-6" onClick={() => setBannerDialogOpen(false)}>Batal</Button>
            <Button className="h-12 rounded-xl font-bold bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg px-8" onClick={handleSaveBanner} disabled={!bannerTitle.trim() || !bannerDesc.trim()}>
              {editBanner ? 'Simpan Perubahan' : 'Terbitkan Banner'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* IMMERSIVE CANVAS EDITOR OVERLAY - Full Dark/Light Mode Support */}
      {isEditingLayout && (
        <div className="fixed inset-0 z-[100] bg-background flex flex-col justify-between overflow-hidden animate-in fade-in duration-200">
          <div className="w-full flex items-center justify-between px-6 py-4 border-b border-border bg-card shadow-sm z-50">
            <div className="flex items-center gap-4">
              <Button variant="ghost" className="rounded-xl h-10 px-4 font-bold border border-border" onClick={() => setIsEditingLayout(false)}><X className="w-4 h-4 mr-2" /> Tutup</Button>
              <div className="hidden sm:flex items-center gap-2 text-primary font-black text-sm uppercase tracking-widest"><Sparkles className="w-4 h-4" /> Workspace Editor</div>
            </div>
            
            <div className="hidden md:flex items-center gap-2.5 text-xs text-muted-foreground bg-muted px-4 py-2 rounded-full">
              <MousePointer2 className="w-4 h-4 text-primary" /> Drag elemen untuk memindahkan posisinya secara bebas.
            </div>

            <Button variant="outline" size="sm" className="text-xs font-bold rounded-lg border-border bg-background h-9 px-4" onClick={resetPositions}>
              <RotateCcw className="w-3.5 h-3.5 mr-1.5" /> Reset Posisi
            </Button>
          </div>

          <div 
            className="flex-1 w-full flex items-center justify-center p-4 sm:p-8 bg-muted/30 overflow-hidden relative"
            style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, var(--border) 1px, transparent 0)', backgroundSize: '24px 24px' }}
            onPointerDown={() => setSelectedTarget(null)}
          >
            <div 
              ref={previewRef}
              className="w-full max-w-[1250px] aspect-[21/9] rounded-2xl relative shadow-2xl border border-border/50 select-none touch-none text-white overflow-hidden bg-black"
              style={{ background: bannerBgType === 'solid' ? bannerBgColor : bannerBgType === 'gradient' ? bannerBgGradient : undefined, containerType: 'inline-size' }}
            >
              {bannerBgType === 'image' && bannerImage ? (
                <div className="absolute inset-0 z-0 select-none pointer-events-none rounded-2xl overflow-hidden">
                  <img src={bannerImage} alt="Bg" className="w-full h-full object-cover opacity-60 mix-blend-overlay" />
                  <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/40 to-transparent" />
                </div>
              ) : bannerBgType === 'image' ? (
                <div className="absolute inset-0 bg-black/20 flex items-center justify-center pointer-events-none"><ImageIcon size={48} /></div>
              ) : null}

              {/* OVERLAY IMAGE (Draggable) */}
              {overlayImage && (
                <div
                  ref={overlayRef}
                  className={cn("absolute -translate-x-1/2 -translate-y-1/2 cursor-grab active:cursor-grabbing", (selectedTarget === 'overlay' || dragTarget === 'overlay') && "ring-2 ring-primary ring-offset-2 ring-offset-black/50 rounded-lg")}
                  style={{ left: `${overlayPos.x}%`, top: `${overlayPos.y}%`, zIndex: dragTarget === 'overlay' ? 50 : 40 }}
                  onPointerDown={(e) => { if ((e.target as HTMLElement).closest('.no-drag')) return; startDrag(e, 'overlay', overlayRef); }}
                >
                  <img src={overlayImage} style={{ transform: `scaleX(${overlayFlipX ? -1 : 1}) rotate(${overlayRotate}deg)`, width: `calc(${overlayScale} * 20cqw)`, height: 'auto' }} className="object-contain drop-shadow-2xl pointer-events-none" alt="Overlay" />
                  
                  {(selectedTarget === 'overlay' || dragTarget === 'overlay') && (
                    <div className="no-drag absolute -bottom-16 left-1/2 -translate-x-1/2 bg-popover text-popover-foreground border border-border rounded-xl shadow-xl flex items-center gap-1 p-1.5 z-50 pointer-events-auto">
                      <Button variant="ghost" size="icon" className="w-8 h-8 rounded-lg p-0" onClick={() => setOverlayScale(prev => Math.max(0.2, Math.round((prev - 0.1) * 10) / 10))}><Minus className="w-4 h-4" /></Button>
                      <span className="text-[11px] font-mono font-black px-2 select-none text-primary min-w-[3ch] text-center">{Math.round(overlayScale * 100)}%</span>
                      <Button variant="ghost" size="icon" className="w-8 h-8 rounded-lg p-0" onClick={() => setOverlayScale(prev => Math.min(3.5, Math.round((prev + 0.1) * 10) / 10))}><Plus className="w-4 h-4" /></Button>
                      <div className="w-[1px] h-5 bg-border mx-1" />
                      <Button variant="ghost" size="icon" className="w-8 h-8 rounded-lg p-0" onClick={() => setOverlayRotate(prev => (prev - 15) % 360)}><RotateCcw className="w-4 h-4" /></Button>
                      <Button variant="ghost" size="icon" className="w-8 h-8 rounded-lg p-0" onClick={() => setOverlayRotate(prev => (prev + 15) % 360)}><RotateCw className="w-4 h-4" /></Button>
                      <div className="w-[1px] h-5 bg-border mx-1" />
                      <Button variant="ghost" size="icon" className={cn("w-8 h-8 rounded-lg p-0", overlayFlipX && "bg-primary/20 text-primary")} onClick={() => setOverlayFlipX(prev => !prev)}><FlipHorizontal className="w-4 h-4" /></Button>
                    </div>
                  )}
                </div>
              )}

              {/* TITLE DRAG */}
              <div
                ref={titleRef}
                className={cn("absolute -translate-y-1/2 w-[70cqw] max-w-[75cqw] cursor-grab active:cursor-grabbing", (selectedTarget === 'title' || dragTarget === 'title') && "ring-2 ring-primary ring-offset-2 ring-offset-black/50 rounded-lg p-1 -m-1")}
                style={{ left: `${titlePos.x}%`, top: `${titlePos.y}%`, zIndex: dragTarget === 'title' ? 50 : 40 }}
                onPointerDown={(e) => startDrag(e, 'title', titleRef)}
              >
                <span className="text-[2.2cqw] px-[1.5cqw] py-[0.5cqw] rounded bg-white/10 backdrop-blur-md font-bold mb-[1.5cqw] inline-block uppercase tracking-widest border border-white/20 shadow-sm pointer-events-none">
                  {bannerType === 'voucher' ? 'Promo Voucher' : bannerType === 'menu' ? 'Menu Rekomendasi' : 'Spesial Penawaran'}
                </span>
                <h4 className="font-black text-[4.5cqw] leading-[1.15] line-clamp-2 drop-shadow-xl text-white pointer-events-none">{bannerTitle || 'Judul Penawaran'}</h4>
              </div>

              {/* DESC DRAG */}
              <div
                ref={descRef}
                className={cn("absolute -translate-y-1/2 w-[70cqw] max-w-[75cqw] cursor-grab active:cursor-grabbing", (selectedTarget === 'desc' || dragTarget === 'desc') && "ring-2 ring-primary ring-offset-2 ring-offset-black/50 rounded-lg p-1 -m-1")}
                style={{ left: `${descPos.x}%`, top: `${descPos.y}%`, zIndex: dragTarget === 'desc' ? 50 : 40 }}
                onPointerDown={(e) => startDrag(e, 'desc', descRef)}
              >
                <p className="text-[2.8cqw] text-slate-200 font-medium line-clamp-3 leading-[1.3] drop-shadow-md m-0 pointer-events-none">{bannerDesc || 'Tulis deskripsi promo...'}</p>
                <div className="mt-[2cqw] pointer-events-none">
                  <div className="text-[2.4cqw] bg-white text-black font-extrabold px-[3cqw] py-[1cqw] rounded-lg shadow-xl inline-block">{bannerButtonText || 'Lihat Detail'}</div>
                </div>
              </div>
            </div>
          </div>

          <div className="w-full bg-card border-t border-border px-6 py-4 flex flex-col sm:flex-row items-center justify-between z-50 gap-4 shadow-[0_-4px_20px_rgba(0,0,0,0.05)]">
            <div className="flex items-center gap-2.5 text-xs text-muted-foreground">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" /> Posisi otomatis tersimpan
            </div>
            <Button className="w-full sm:w-auto bg-primary hover:bg-primary/90 text-primary-foreground font-black px-8 rounded-xl h-12 shadow-md transition-all" onClick={() => setIsEditingLayout(false)}>
              Selesai & Terapkan Tata Letak
            </Button>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <AlertDialog open={!!deleteBannerId} onOpenChange={() => setDeleteBannerId(null)}>
        <AlertDialogContent className="max-w-[400px] rounded-3xl p-6">
          <AlertDialogHeader>
            <div className="w-14 h-14 rounded-full bg-destructive/10 flex items-center justify-center mb-3 mx-auto"><Trash2 className="w-7 h-7 text-destructive" /></div>
            <AlertDialogTitle className="text-center text-xl font-extrabold tracking-tight">Hapus Banner?</AlertDialogTitle>
            <AlertDialogDescription className="text-center text-muted-foreground mt-2">Banner penawaran ini akan dihapus permanen. Tindakan tidak dapat dibatalkan.</AlertDialogDescription>
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
