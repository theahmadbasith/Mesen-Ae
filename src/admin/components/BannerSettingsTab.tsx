import { useDbQuery, dbUpdate, dbUploadFile, dbDeleteFile } from '@/hooks/db-hooks';
import { type Voucher, type Product, type StoreSettings } from '@/hooks/db-hooks';
import { useState, useRef } from 'react';
import { 
  Plus, Edit2, Trash2, Image as ImageIcon, Sparkles, Gift, Clock
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
  isActive: boolean;
}

interface BannerSettingsTabProps {
  vouchers: Voucher[];
  products: Product[];
}

export default function BannerSettingsTab({ vouchers, products }: BannerSettingsTabProps) {
  const [bannerDialogOpen, setBannerDialogOpen] = useState(false);
  const [deleteBannerId, setDeleteBannerId] = useState<string | number | null>(null);
  const [editBanner, setEditBanner] = useState<PromoBanner | null>(null);

  const [bannerType, setBannerType] = useState<'voucher' | 'menu' | 'custom'>('custom');
  const [bannerTitle, setBannerTitle] = useState('');
  const [bannerDesc, setBannerDesc] = useState('');
  const [bannerVoucherId, setBannerVoucherId] = useState<string>('');
  const [bannerProductId, setBannerProductId] = useState<string>('');
  const [bannerImage, setBannerImage] = useState<string | null>(null);
  const [bannerIsActive, setBannerIsActive] = useState(true);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const storeSettingsList = useDbQuery<StoreSettings>('storeSettings');
  const storeSettings = storeSettingsList?.[0] || null;

  if (storeSettingsList === undefined) {
    return (
      <div className="flex items-center justify-center p-12">
        <Clock className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  const openAddBanner = () => {
    setEditBanner(null);
    setBannerType('custom');
    setBannerTitle('');
    setBannerDesc('');
    setBannerVoucherId('');
    setBannerProductId('');
    setBannerImage(null);
    setBannerIsActive(true);
    setBannerDialogOpen(true);
  };

  const openEditBanner = (b: PromoBanner) => {
    setEditBanner(b);
    setBannerType(b.type);
    setBannerTitle(b.title);
    setBannerDesc(b.description);
    setBannerVoucherId(b.voucherId?.toString() || '');
    setBannerProductId(b.productId?.toString() || '');
    setBannerImage(b.imageUrl || null);
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
    }
  };

  const handleBannerProductChange = (pId: string) => {
    setBannerProductId(pId);
    const p = products.find(x => x.id?.toString() === pId);
    if (p) {
      setBannerTitle(`Coba Menu Baru: ${p.name}!`);
      setBannerDesc(`Nikmati sensasi kelezatan menu rekomendasi ${p.name} hari ini, hanya seharga ${FORMAT_IDR(p.price)}!`);
      setBannerImage(p.photo || null);
    }
  };

  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error('File harus berupa gambar');
      return;
    }
    try {
      const compressed = await compressImage(file);
      setBannerImage(compressed);
    } catch {
      toast.error('Gagal memproses gambar');
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
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
      toast.loading('Mengunggah gambar banner...', { id: 'upload-banner' });
      try {
        const url = await dbUploadFile('banners', `banner-${Date.now()}.jpg`, bannerImage);
        if (url) finalImageUrl = url;
        toast.dismiss('upload-banner');
      } catch (e) {
        toast.dismiss('upload-banner');
        toast.error('Gagal mengunggah gambar');
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
      isActive: bannerIsActive
    };

    let updatedBanners: PromoBanner[];
    if (editBanner) {
      if (editBanner.imageUrl && finalImageUrl && editBanner.imageUrl !== finalImageUrl) {
        // Only delete the old banner image if it's NOT a product photo reused by reference.
        // Product photos have a different structure, but if it was uniquely uploaded as a banner:
        if (editBanner.imageUrl.includes('banners')) {
          await dbDeleteFile(editBanner.imageUrl);
        }
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
      await dbUpdate('storeSettings', storeSettings.id, {
        ...storeSettings,
        promoBanners: updatedBanners
      });
      toast.success(!currentActive ? 'Banner penawaran diaktifkan' : 'Banner penawaran dinonaktifkan');
    } catch (err) {
      toast.error('Gagal mengubah status banner');
    }
  };

  const bannerList: PromoBanner[] = storeSettings?.promoBanners || [];

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
                
                {/* Visual Preview Card (Exactly matching Customer Mobile Banner Style) */}
                <div className="w-full md:w-[220px] aspect-[2/1] rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white p-4 relative overflow-hidden flex flex-col justify-between shadow-sm shrink-0">
                  {b.imageUrl ? (
                    <div className="absolute inset-0 z-0">
                      <img src={b.imageUrl} alt="Banner" className="w-full h-full object-cover opacity-35" />
                      <div className="absolute inset-0 bg-gradient-to-r from-blue-900/95 to-indigo-900/40" />
                    </div>
                  ) : (
                    <Gift size={80} className="absolute -right-3 -bottom-3 text-white/15 rotate-[-15deg] z-0" />
                  )}
                  
                  <div className="relative z-10 flex flex-col justify-between h-full">
                    <div>
                      <span className="bg-white/20 text-[8px] px-2 py-0.5 rounded backdrop-blur-md font-bold inline-block uppercase tracking-wider border border-white/10 mb-1">
                        {b.type === 'voucher' ? 'Promo' : b.type === 'menu' ? 'Menu Baru' : 'Spesial'}
                      </span>
                      <h4 className="font-extrabold text-sm line-clamp-1 leading-tight">{b.title}</h4>
                    </div>
                    <p className="text-[10px] text-blue-50/90 line-clamp-2 leading-relaxed mt-1 font-medium">{b.description}</p>
                    <div className="mt-2 text-[9px] bg-white text-blue-600 font-bold px-3 py-1 rounded-md self-start">
                      Cek Katalog
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
                        {b.type === 'voucher' ? 'Voucher Link' : b.type === 'menu' ? 'Produk Link' : 'Custom'}
                      </Badge>
                    </div>
                    <h4 className="font-bold text-base text-foreground leading-snug">{b.title}</h4>
                    <p className="text-xs text-muted-foreground line-clamp-2 mt-1 leading-relaxed">{b.description}</p>
                  </div>

                  {/* Controls Footer */}
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
        <DialogContent className="max-w-[500px] rounded-[2rem] p-0 overflow-hidden border-border/60 shadow-2xl">
          <DialogHeader className="px-6 py-5 border-b border-border/50 bg-muted/10">
            <DialogTitle className="text-xl font-extrabold flex items-center gap-2">
              <div className="p-1.5 bg-primary/10 rounded-lg text-primary">
                {editBanner ? <Edit2 className="w-5 h-5" /> : <Sparkles className="w-5 h-5" strokeWidth={2.5} />}
              </div>
              {editBanner ? 'Edit Banner Penawaran' : 'Tambah Banner Penawaran'}
            </DialogTitle>
          </DialogHeader>

          <div className="px-6 py-5 space-y-4 max-h-[60vh] overflow-y-auto custom-scrollbar">
            {/* Tipe Penawaran Selection */}
            <div className="space-y-2">
              <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Tipe Konten Banner <span className="text-destructive">*</span></Label>
              <Select value={bannerType} onValueChange={(val: 'voucher' | 'menu' | 'custom') => {
                setBannerType(val);
                if (val === 'custom') {
                  setBannerVoucherId('');
                  setBannerProductId('');
                }
              }}>
                <SelectTrigger className="h-12 bg-background rounded-xl font-semibold focus:ring-1 focus:ring-primary">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  <SelectItem value="voucher" className="font-medium">Link Kode Promo / Voucher</SelectItem>
                  <SelectItem value="menu" className="font-medium">Link Menu Baru / Unggulan</SelectItem>
                  <SelectItem value="custom" className="font-medium">Kustom Bebas (Tulisan & Gambar)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Voucher Dropdown (If Voucher Link selected) */}
            {bannerType === 'voucher' && (
              <div className="space-y-2">
                <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Pilih Voucher Promo <span className="text-destructive">*</span></Label>
                <Select value={bannerVoucherId} onValueChange={handleBannerVoucherChange}>
                  <SelectTrigger className="h-12 bg-background rounded-xl font-semibold focus:ring-1 focus:ring-primary">
                    <SelectValue placeholder="Pilih voucher..." />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    {vouchers.map(v => (
                      <SelectItem key={v.id} value={v.id!.toString()} className="font-medium">
                        {v.code} - ({v.type === 'percentage' ? `${v.value}%` : FORMAT_IDR(v.value)})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Product Dropdown (If Product Link selected) */}
            {bannerType === 'menu' && (
              <div className="space-y-2">
                <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Pilih Menu Unggulan <span className="text-destructive">*</span></Label>
                <Select value={bannerProductId} onValueChange={handleBannerProductChange}>
                  <SelectTrigger className="h-12 bg-background rounded-xl font-semibold focus:ring-1 focus:ring-primary">
                    <SelectValue placeholder="Pilih produk..." />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    {products.map(p => (
                      <SelectItem key={p.id} value={p.id!.toString()} className="font-medium">
                        {p.name} - ({FORMAT_IDR(p.price)})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Title Input */}
            <div className="space-y-2 group">
              <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Judul Penawaran <span className="text-destructive">*</span></Label>
              <Input 
                value={bannerTitle} 
                onChange={e => setBannerTitle(e.target.value)} 
                placeholder="Contoh: Diskon Kopi Aren 20%" 
                maxLength={45}
                className="h-12 bg-background rounded-xl font-semibold focus-visible:ring-1 focus-visible:ring-primary" 
              />
            </div>

            {/* Description Textarea */}
            <div className="space-y-2 group">
              <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Deskripsi Penawaran <span className="text-destructive">*</span></Label>
              <textarea 
                value={bannerDesc} 
                onChange={e => setBannerDesc(e.target.value)} 
                placeholder="Tuliskan copywriting penawaran menarik di sini..." 
                rows={3}
                maxLength={120}
                className="w-full p-3.5 bg-background rounded-xl border border-input focus:outline-none focus:ring-1 focus:ring-primary text-sm font-medium resize-none shadow-sm"
              />
            </div>

            {/* Custom Image Upload */}
            <div className="space-y-2">
              <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                {bannerType === 'custom' ? 'Unggah Gambar Latar (Kustom)' : 'Gambar Banner (Otomatis/Kustom)'}
              </Label>
              
              <div className="flex gap-4 items-center">
                {/* Thumbnail Preview */}
                <div className="w-24 h-16 rounded-lg border border-border/60 bg-muted/20 flex items-center justify-center overflow-hidden shrink-0 relative">
                  {bannerImage ? (
                    <img src={bannerImage} alt="Preview" className="w-full h-full object-cover" />
                  ) : (
                    <ImageIcon className="w-6 h-6 text-muted-foreground/40" />
                  )}
                </div>

                <div className="flex-1 space-y-1.5">
                  <input 
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleImageSelect}
                  />
                  <Button 
                    type="button" 
                    variant="outline" 
                    className="rounded-xl text-xs font-bold h-9 border-border/60 hover:bg-muted"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    Pilih File Gambar
                  </Button>
                  <p className="text-[10px] text-muted-foreground">Rasio disarankan 2:1. Maksimal 1MB. Format PNG, JPG, WebP.</p>
                </div>
              </div>
            </div>

            {/* Banner Active Switch */}
            <div className="flex items-center justify-between p-4 bg-muted/30 border border-border/50 rounded-xl">
              <div>
                <Label htmlFor="banner-active" className="text-sm font-bold cursor-pointer">Status Tampilkan</Label>
                <p className="text-[10px] text-muted-foreground font-medium mt-0.5">Tampilkan banner penawaran ini di beranda customer.</p>
              </div>
              <Switch id="banner-active" checked={bannerIsActive} onCheckedChange={setBannerIsActive} className="data-[state=checked]:bg-green-500" />
            </div>

          </div>

          <DialogFooter className="px-6 py-4 border-t border-border/50 bg-muted/10 gap-2 sm:gap-0">
            <Button variant="outline" className="h-11 rounded-xl font-bold border-border/60 hover:bg-muted" onClick={() => setBannerDialogOpen(false)}>
              Batal
            </Button>
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
