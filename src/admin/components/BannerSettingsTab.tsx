import { useDbQuery, dbUpdate, dbUploadFile, dbDeleteFile } from '@/hooks/db-hooks';
import { type Voucher, type Product, type StoreSettings } from '@/hooks/db-hooks';
import { useState, useRef } from 'react';
import { 
  Plus, Edit2, Trash2, Image as ImageIcon, Sparkles, Gift, Clock, Move
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
import { compressImage } from '@/lib/image-utils';

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
}


function DraggableItem({ pos, isDragging, onPointerDown, children, type }: any) {
  const transform = type === 'overlay' ? 'translate(-50%, -50%)' : 'translate(0%, -50%)';
  return (
    <div 
      style={{ position: 'absolute', left: `${pos.x}%`, top: `${pos.y}%`, transform, cursor: isDragging ? 'grabbing' : 'grab' }}
      onPointerDown={onPointerDown}
      className={cn("select-none z-40 touch-none", isDragging && "ring-2 ring-primary ring-offset-2 ring-offset-blue-900/50 z-50 rounded-lg scale-105 transition-transform duration-75")}
    >
      {children}
    </div>
  )
}

export default function BannerSettingsTab() {
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

  // Drag and drop states
  const [overlayImage, setOverlayImage] = useState<string | null>(null);
  const [titlePos, setTitlePos] = useState({ x: 8, y: 30 });
  const [descPos, setDescPos] = useState({ x: 8, y: 70 });
  const [overlayPos, setOverlayPos] = useState({ x: 85, y: 50 });
  const [buttonPos, setButtonPos] = useState({ x: 8, y: 80 });
  const [dragTarget, setDragTarget] = useState<'title' | 'desc' | 'overlay' | 'button' | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const overlayInputRef = useRef<HTMLInputElement>(null);
  const previewRef = useRef<HTMLDivElement>(null);

  const storeSettingsList = useDbQuery<StoreSettings>('storeSettings');
  const storeSettings = storeSettingsList?.[0] || null;

  if (storeSettingsList === undefined) {
    return (
      <div className="flex items-center justify-center p-12">
        <Clock className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  // Handle Drag & Drop
  const handlePointerMove = (e: React.PointerEvent) => {
    if (!dragTarget || !previewRef.current) return;
    const rect = previewRef.current.getBoundingClientRect();
    let x = ((e.clientX - rect.left) / rect.width) * 100;
    let y = ((e.clientY - rect.top) / rect.height) * 100;
    x = Math.max(0, Math.min(100, x));
    y = Math.max(0, Math.min(100, y));

    if (dragTarget === 'title') setTitlePos({ x, y });
    else if (dragTarget === 'desc') setDescPos({ x, y });
    else if (dragTarget === 'overlay') setOverlayPos({ x, y });
    else if (dragTarget === 'button') setButtonPos({ x, y });
  };

  const handlePointerUp = () => setDragTarget(null);

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
    setTitlePos({ x: 8, y: 30 });
    setDescPos({ x: 8, y: 60 });
    setOverlayPos({ x: 85, y: 50 });
    setButtonPos({ x: 8, y: 80 });
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
    setTitlePos(b.titlePos || { x: 8, y: 30 });
    setDescPos(b.descPos || { x: 8, y: 60 });
    setOverlayPos(b.overlayPos || { x: 85, y: 50 });
    setButtonPos(b.buttonPos || { x: 8, y: 80 });
    setBannerIsActive(b.isActive);
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
    
    toast.loading('Mengompres gambar...', { id: 'compress-img' });
    try {
      const compressed = await compressImage(file);
      if (isOverlay) {
        setOverlayImage(compressed);
      } else {
        setBannerImage(compressed);
      }
      toast.dismiss('compress-img');
      toast.success('Gambar berhasil dikompres');
    } catch {
      toast.dismiss('compress-img');
      toast.error('Gagal memproses gambar');
    }
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
      isActive: bannerIsActive
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
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h3 className="text-lg font-bold text-foreground">Pengaturan Banner Penawaran</h3>
          <p className="text-sm text-muted-foreground">Atur card promo, produk unggulan, atau pengumuman khusus yang tampil di bagian teratas Beranda Pelanggan.</p>
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
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
          {bannerList.map(b => (
            <Card key={b.id} className="border border-border/60 rounded-[1.5rem] overflow-hidden flex flex-col bg-card hover:shadow-md transition-shadow">
              <div className="p-5 flex-1 flex flex-col md:flex-row gap-5">
                
                {/* Visual Preview Card */}
                <div className="w-full md:w-[220px] aspect-[2/1] rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white p-4 relative overflow-hidden shadow-sm shrink-0">
                  {b.imageUrl ? (
                    <div className="absolute inset-0 z-0">
                      <img src={b.imageUrl} alt="Banner" className="w-full h-full object-cover opacity-50" />
                      <div className="absolute inset-0 bg-gradient-to-r from-blue-900/95 to-indigo-900/40" />
                    </div>
                  ) : (
                    <Gift size={80} className="absolute -right-3 -bottom-3 text-white/15 rotate-[-15deg] z-0" />
                  )}
                  
                  {b.overlayImageUrl && (
                    <div style={{ position: 'absolute', left: `${b.overlayPos?.x ?? 85}%`, top: `${b.overlayPos?.y ?? 50}%`, transform: 'translate(-50%, -50%)', zIndex: 5 }}>
                       <img src={b.overlayImageUrl} className="w-16 h-auto object-contain drop-shadow-lg" />
                    </div>
                  )}

                  <div style={{ position: 'absolute', left: `${b.titlePos?.x ?? 8}%`, top: `${b.titlePos?.y ?? 30}%`, transform: 'translate(0%, -50%)', zIndex: 10 }} className="w-[80%] max-w-[200px]">
                     <span className="bg-white/20 text-[8px] px-2 py-0.5 rounded backdrop-blur-md font-bold inline-block uppercase tracking-wider border border-white/10 mb-1">
                        {b.type === 'voucher' ? 'Promo' : b.type === 'menu' ? 'Menu Baru' : 'Spesial'}
                     </span>
                     <h4 className="font-extrabold text-sm line-clamp-1 leading-tight">{b.title}</h4>
                  </div>
                  
                  <div style={{ position: 'absolute', left: `${b.descPos?.x ?? 8}%`, top: `${b.descPos?.y ?? 70}%`, transform: 'translate(0%, -50%)', zIndex: 10 }} className="w-[80%] max-w-[200px]">
                     <p className="text-[10px] text-blue-50/90 line-clamp-2 leading-relaxed font-medium">{b.description}</p>
                     <div className="mt-1 text-[9px] bg-white text-blue-600 font-bold px-2 py-0.5 rounded self-start inline-block">
                        {b.buttonText || 'Lihat'}
                     </div>
                  </div>
                </div>

                {/* Meta Info & Controls */}
                <div className="flex-1 flex flex-col justify-between py-1">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant="outline" className={cn(
                        "text-[9px] font-black uppercase px-2 py-0.5 rounded-md border-none tracking-widest",
                        b.isActive ? "bg-green-500/10 text-green-600" : "bg-muted text-muted-foreground"
                      )}>
                        {b.isActive ? 'Tampil' : 'Arsip'}
                      </Badge>
                      <Badge variant="secondary" className="text-[9px] font-bold px-2 py-0.5 rounded-md">
                        {b.type === 'voucher' ? 'Voucher' : b.type === 'menu' ? 'Produk' : 'Custom'}
                      </Badge>
                    </div>
                    <h4 className="font-bold text-base text-foreground leading-snug">{b.title}</h4>
                    <p className="text-xs text-muted-foreground line-clamp-2 mt-1 leading-relaxed">{b.description}</p>
                  </div>

                  <div className="flex items-center justify-between mt-4 pt-3 border-t border-border/50">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Aktif</span>
                      <Switch 
                        checked={b.isActive} 
                        onCheckedChange={() => handleToggleBannerActive(b.id, b.isActive)} 
                        className="data-[state=checked]:bg-green-500 scale-75"
                      />
                    </div>

                    <div className="flex gap-2">
                      <Button variant="outline" size="icon" className="h-8 w-8 rounded-lg bg-background hover:bg-primary/10 hover:text-primary border-border/60" onClick={() => openEditBanner(b)}>
                        <Edit2 className="w-3.5 h-3.5" />
                      </Button>
                      <Button variant="outline" size="icon" className="h-8 w-8 rounded-lg bg-background hover:bg-destructive/10 hover:text-destructive border-border/60" onClick={() => setDeleteBannerId(b.id)}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                </div>

              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Modal Add/Edit Banner Penawaran */}
      <Dialog open={bannerDialogOpen} onOpenChange={setBannerDialogOpen}>
        <DialogContent className="max-w-[700px] w-[95vw] rounded-[2rem] p-0 overflow-hidden border-border/60 shadow-2xl">
          <DialogHeader className="px-6 py-5 border-b border-border/50 bg-muted/10">
            <DialogTitle className="text-xl font-extrabold flex items-center gap-2">
              <div className="p-1.5 bg-primary/10 rounded-lg text-primary">
                {editBanner ? <Edit2 className="w-5 h-5" /> : <Sparkles className="w-5 h-5" strokeWidth={2.5} />}
              </div>
              {editBanner ? 'Edit Banner Penawaran' : 'Tambah Banner Penawaran'}
            </DialogTitle>
          </DialogHeader>

          <div 
            className="px-6 py-5 overflow-y-auto custom-scrollbar" 
            style={{ maxHeight: 'calc(100vh - 180px)' }}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerLeave={handlePointerUp}
          >
            
            {/* INTERACTIVE PREVIEW */}
            <div className="mb-8">
              <div className="flex items-center justify-between mb-2">
                 <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Live Preview & Editor</Label>
                 <span className="text-[10px] text-primary bg-primary/10 px-2 py-0.5 rounded font-bold flex items-center gap-1">
                   <Move className="w-3 h-3" /> Sentuh & Geser Elemen
                 </span>
              </div>
              <div 
                ref={previewRef}
                className="w-full aspect-[2/1] sm:aspect-[21/9] rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white relative overflow-hidden shadow-inner border border-border/50"
              >
                {bannerImage && !bannerImage.startsWith('preset:') ? (
                  <div className="absolute inset-0 z-0 select-none pointer-events-none">
                    <img src={bannerImage} alt="Bg" className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/40" />
                  </div>
                ) : (
                  <Gift size={120} className="absolute -right-2 -bottom-2 text-white/10 rotate-[-15deg] z-0 select-none pointer-events-none" />
                )}

                {/* OVERLAY DRAG */}
                {overlayImage && (
                  <DraggableItem 
                    pos={overlayPos} 
                    isDragging={dragTarget === 'overlay'} 
                    onPointerDown={(e: any) => { e.currentTarget.setPointerCapture(e.pointerId); setDragTarget('overlay'); }}
                    type="overlay"
                  >
                     <img src={overlayImage} className="w-24 sm:w-32 h-auto object-contain drop-shadow-2xl pointer-events-none" alt="Overlay" />
                  </DraggableItem>
                )}

                {/* TITLE DRAG */}
                <DraggableItem 
                  pos={titlePos} 
                  isDragging={dragTarget === 'title'} 
                  onPointerDown={(e: any) => { e.currentTarget.setPointerCapture(e.pointerId); setDragTarget('title'); }}
                  type="title"
                >
                  <div className="w-[180px] sm:w-[280px]">
                    <span className="text-[8px] sm:text-[10px] px-2 py-0.5 rounded-md backdrop-blur-md font-bold mb-1.5 inline-block uppercase tracking-wider bg-white/20 border border-white/10 shadow-sm pointer-events-none">
                      Penawaran Spesial
                    </span>
                    <h4 className="font-extrabold text-base sm:text-2xl leading-tight line-clamp-2 drop-shadow-md pointer-events-none">
                      {bannerTitle || 'Judul Penawaran'}
                    </h4>
                  </div>
                </DraggableItem>

                {/* DESC DRAG */}
                <DraggableItem 
                  pos={descPos} 
                  isDragging={dragTarget === 'desc'} 
                  onPointerDown={(e: any) => { e.currentTarget.setPointerCapture(e.pointerId); setDragTarget('desc'); }}
                  type="desc"
                >
                  <div className="w-[180px] sm:w-[280px]">
                    <p className="text-[10px] sm:text-xs text-slate-100 font-medium line-clamp-3 leading-relaxed drop-shadow-sm mb-2 pointer-events-none">
                      {bannerDesc || 'Ketik deskripsi menarik untuk mengundang pelanggan...'}
                    </p>
                    <button className="bg-white text-slate-900 text-[9px] sm:text-[11px] font-bold px-3 py-1.5 sm:py-2 rounded-lg shadow-lg pointer-events-none">
                      Lihat Sekarang
                    </button>
                  </div>
                </DraggableItem>

              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
               <div className="space-y-4">
                  {/* Tipe Penawaran */}
                  <div className="space-y-2">
                    <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Tipe Konten <span className="text-destructive">*</span></Label>
                    <Select value={bannerType} onValueChange={(val: 'voucher' | 'menu' | 'custom') => {
                      setBannerType(val);
                      if (val === 'custom') { setBannerVoucherId(''); setBannerProductId(''); }
                    }}>
                      <SelectTrigger className="h-11 bg-background rounded-xl font-semibold">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl">
                        <SelectItem value="voucher" className="font-medium">Link Kode Promo</SelectItem>
                        <SelectItem value="menu" className="font-medium">Link Menu Baru</SelectItem>
                        <SelectItem value="custom" className="font-medium">Kustom Bebas</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {bannerType === 'voucher' && (
                    <div className="space-y-2">
                      <Select value={bannerVoucherId} onValueChange={handleBannerVoucherChange}>
                        <SelectTrigger className="h-11 bg-background rounded-xl font-semibold"><SelectValue placeholder="Pilih voucher..." /></SelectTrigger>
                        <SelectContent className="rounded-xl">
                          {vouchers.map(v => (
                            <SelectItem key={v.id} value={v.id!.toString()} className="font-medium">{v.code}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  {bannerType === 'menu' && (
                    <div className="space-y-2">
                      <Select value={bannerProductId} onValueChange={handleBannerProductChange}>
                        <SelectTrigger className="h-11 bg-background rounded-xl font-semibold"><SelectValue placeholder="Pilih produk..." /></SelectTrigger>
                        <SelectContent className="rounded-xl">
                          {products.map(p => (
                            <SelectItem key={p.id} value={p.id!.toString()} className="font-medium">{p.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  {/* Title & Desc */}
                  <div className="space-y-2">
                    <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Judul Penawaran <span className="text-destructive">*</span></Label>
                    <Input value={bannerTitle} onChange={e => setBannerTitle(e.target.value)} maxLength={45} className="h-11 bg-background rounded-xl font-semibold" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Deskripsi <span className="text-destructive">*</span></Label>
                    <textarea value={bannerDesc} onChange={e => setBannerDesc(e.target.value)} rows={2} maxLength={120} className="w-full p-3 bg-background rounded-xl border border-input focus:outline-none focus:ring-1 focus:ring-primary text-sm font-medium resize-none" />
                  </div>

                  <div className="space-y-2 pt-2 border-t border-border/50">
                    <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Teks Tombol (Opsional)</Label>
                    <Input value={bannerButtonText} onChange={e => setBannerButtonText(e.target.value)} placeholder="Contoh: Pesan Sekarang, Buka IG" className="h-10 bg-background rounded-xl font-semibold text-sm" />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Link Tujuan (Opsional)</Label>
                    <Input value={bannerLink} onChange={e => setBannerLink(e.target.value)} placeholder="Contoh: https://instagram.com/..." className="h-10 bg-background rounded-xl font-semibold text-sm" />
                    <p className="text-[10px] text-muted-foreground leading-tight mt-1">Jika dikosongkan, tombol akan mengarahkan pelanggan ke Menu.</p>
                  </div>
               </div>

               <div className="space-y-4">
                  {/* Background Upload */}
                  <div className="space-y-2">
                    <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Latar Belakang Banner</Label>
                    <div className="flex gap-3 items-center">
                      <div className="w-16 h-12 rounded-lg border border-border/60 bg-muted/20 flex items-center justify-center overflow-hidden shrink-0">
                        {bannerImage ? <img src={bannerImage} alt="Preview" className="w-full h-full object-cover" /> : <ImageIcon className="w-5 h-5 text-muted-foreground/40" />}
                      </div>
                      <div className="flex-1">
                        <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={e => handleImageSelect(e, false)} />
                        <Button type="button" variant="outline" className="rounded-lg text-xs font-bold h-8 border-border/60" onClick={() => fileInputRef.current?.click()}>Ubah Latar</Button>
                        <p className="text-[9px] text-muted-foreground mt-1">Rasio disarankan 2:1 (Opsional).</p>
                      </div>
                    </div>
                  </div>

                  {/* Overlay Upload */}
                  <div className="space-y-2 pt-2 border-t border-border/50">
                    <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Foto Produk (PNG Transparan)</Label>
                    <div className="flex gap-3 items-center">
                      <div className="w-16 h-16 rounded-lg border border-dashed border-border/60 bg-muted/10 flex items-center justify-center overflow-hidden shrink-0">
                        {overlayImage ? <img src={overlayImage} alt="Overlay" className="w-full h-full object-contain" /> : <Gift className="w-5 h-5 text-muted-foreground/40" />}
                      </div>
                      <div className="flex-1">
                        <input ref={overlayInputRef} type="file" accept="image/png,image/webp" className="hidden" onChange={e => handleImageSelect(e, true)} />
                        <Button type="button" variant="outline" className="rounded-lg text-xs font-bold h-8 border-primary/30 text-primary hover:bg-primary/10" onClick={() => overlayInputRef.current?.click()}>Upload Overlay PNG</Button>
                        <p className="text-[9px] text-muted-foreground mt-1">Akan ditindihkan di atas latar banner.</p>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-3 bg-muted/30 border border-border/50 rounded-xl mt-4">
                    <Label htmlFor="banner-active" className="text-sm font-bold cursor-pointer">Tampilkan Banner</Label>
                    <Switch id="banner-active" checked={bannerIsActive} onCheckedChange={setBannerIsActive} className="data-[state=checked]:bg-green-500 scale-90" />
                  </div>
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
