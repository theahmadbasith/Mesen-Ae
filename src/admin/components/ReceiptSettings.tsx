import { useState, useEffect, useRef } from 'react';
import { 
  Camera, Save, Loader2, CheckCircle2, Printer, ImageIcon, Sparkles, 
  Sliders, Type, AlignCenter, Layout, Trash2, CheckSquare, Square
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Card } from '@/components/ui/card';
import { toast } from 'sonner';
import { dbUploadFile, dbDeleteFile, dbUpdate, type StoreSettings } from '@/hooks/db-hooks';
import { compressImage } from '@/lib/image-utils';
import { cn } from '@/lib/utils';
import PhotoCropModal from '@/admin/components/PhotoCropModal';

export interface ReceiptTypography {
  fontFamily: 'monospace' | 'sans-serif' | 'courier' | 'receipt-font';
  fontSize: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  lineHeight: 'tight' | 'normal' | 'relaxed';
  alignment: 'left' | 'center' | 'right';
  compactMode: boolean;
  paperWidth: '58mm' | '80mm';
}

interface ReceiptSettingsProps {
  storeSettings: StoreSettings | undefined;
  hasEditAccess: boolean;
}

export default function ReceiptSettings({ storeSettings, hasEditAccess }: ReceiptSettingsProps) {
  const [hasInitialized, setHasInitialized] = useState(false);
  
  // Paper Width
  const [paperWidth, setPaperWidth] = useState<'58mm' | '80mm'>('58mm');
  
  // Global Typography Settings
  const [fontFamily, setFontFamily] = useState<'monospace' | 'sans-serif' | 'courier' | 'receipt-font'>('courier');
  const [fontSize, setFontSize] = useState<'xs' | 'sm' | 'md' | 'lg' | 'xl'>('sm');
  const [lineHeight, setLineHeight] = useState<'tight' | 'normal' | 'relaxed'>('normal');
  const [alignment, setAlignment] = useState<'left' | 'center' | 'right'>('center');
  const [compactMode, setCompactMode] = useState(false);
  
  // Custom Receipt Header Title
  const [receiptHeaderTitle, setReceiptHeaderTitle] = useState('Struk Pembelian');
  
  // Visibility Checklist Toggles
  const [receiptShowLogo, setReceiptShowLogo] = useState(true);
  const [receiptShowCashier, setReceiptShowCashier] = useState(true);
  const [receiptShowCustomer, setReceiptShowCustomer] = useState(true);
  const [receiptShowTable, setReceiptShowTable] = useState(true);
  
  // 2 multiline footer lines and 1 image uploader
  const [footerLine1, setFooterLine1] = useState('');
  const [footerLine2, setFooterLine2] = useState('');
  const [footerImg, setFooterImg] = useState<string | undefined>();
  
  // Crop states
  const [cropOpen, setCropOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  // Storage & Loading states
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Initialize and migrate settings
  useEffect(() => {
    if (storeSettings && !hasInitialized) {
      const settings = storeSettings as any;
      setReceiptShowLogo(settings.receiptShowLogo ?? true);
      setReceiptShowCashier(settings.receiptShowCashier ?? true);
      setReceiptShowCustomer(settings.receiptShowCustomer ?? true);
      setReceiptShowTable(settings.receiptShowTable ?? true);
      setReceiptHeaderTitle(settings.receiptHeaderTitle ?? 'Struk Pembelian');
      
      const typo = settings.receiptTypography || {};
      setFontFamily(typo.fontFamily ?? 'courier');
      setFontSize(typo.fontSize ?? 'sm');
      setLineHeight(typo.lineHeight ?? 'normal');
      setAlignment(typo.alignment ?? 'center');
      setCompactMode(typo.compactMode ?? false);
      setPaperWidth(typo.paperWidth ?? '58mm');
      
      // Load footer image uploader
      const oldImg = settings.receiptFooterImg || '';
      setFooterImg(oldImg);
      
      // Load or migrate footer lines (max 2 textarea rows)
      const oldLines = settings.receiptFooterLines || [];
      const oldText = settings.receiptFooter || '';
      
      if (oldLines.length > 0) {
        setFooterLine1(oldLines[0] || '');
        setFooterLine2(oldLines[1] || '');
      } else {
        setFooterLine1(oldText || 'Terima kasih atas kunjungan Anda!');
        setFooterLine2('');
      }
      
      setHasInitialized(true);
    }
  }, [storeSettings, hasInitialized]);

  // Clean up auto-save timeouts
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    };
  }, []);

  // Trigger debounced save
  const triggerAutoSave = (
    img = footerImg,
    line1 = footerLine1,
    line2 = footerLine2,
    logo = receiptShowLogo,
    cashier = receiptShowCashier,
    customer = receiptShowCustomer,
    table = receiptShowTable,
    title = receiptHeaderTitle,
    font = fontFamily,
    size = fontSize,
    lh = lineHeight,
    align = alignment,
    compact = compactMode,
    width = paperWidth
  ) => {
    if (!hasEditAccess) return;
    setSaveStatus('saving');
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    
    saveTimeoutRef.current = setTimeout(async () => {
      try {
        await executeSave(
          img, line1, line2, logo, cashier, customer, table, title,
          font, size, lh, align, compact, width
        );
        setSaveStatus('saved');
      } catch (err: any) {
        setSaveStatus('error');
        toast.error('Gagal menyimpan otomatis: ' + err.message);
      }
    }, 1500);
  };

  // Perform Firestore save operations
  const executeSave = async (
    img = footerImg,
    line1 = footerLine1,
    line2 = footerLine2,
    logo = receiptShowLogo,
    cashier = receiptShowCashier,
    customer = receiptShowCustomer,
    table = receiptShowTable,
    title = receiptHeaderTitle,
    font = fontFamily,
    size = fontSize,
    lh = lineHeight,
    align = alignment,
    compact = compactMode,
    width = paperWidth
  ) => {
    if (!storeSettings?.id) return;
    
    let finalImgUrl = img;
    // Upload crop data to Cloudinary if it's base64
    if (img && img.startsWith('data:image')) {
      const res = await fetch(img);
      const blob = await res.blob();
      const compressedDataUrl = await compressImage(blob, 0.2); // high compression target (200KB)
      
      const folderPath = `stores/${storeSettings.id}/receipt`;
      const fileName = `footer-image.webp`;
      
      const uploadedUrl = await dbUploadFile(folderPath, fileName, compressedDataUrl);
      if (uploadedUrl) {
        const oldUrl = (storeSettings as any).receiptFooterImg;
        if (oldUrl && oldUrl !== uploadedUrl) {
          await dbDeleteFile(oldUrl);
        }
        finalImgUrl = uploadedUrl;
      }
    } else if (!img) {
      // User deleted footer image
      const oldUrl = (storeSettings as any).receiptFooterImg;
      if (oldUrl) {
        await dbDeleteFile(oldUrl);
      }
    }

    const updates = {
      receiptShowLogo: logo,
      receiptShowCashier: cashier,
      receiptShowCustomer: customer,
      receiptShowTable: table,
      receiptHeaderTitle: title.trim(),
      receiptTypography: {
        fontFamily: font,
        fontSize: size,
        lineHeight: lh,
        alignment: align,
        compactMode: compact,
        paperWidth: width
      },
      receiptFooterImg: finalImgUrl || null,
      receiptFooterLines: [line1.trim(), line2.trim()],
      receiptFooter: line1.trim() || 'Terima kasih atas kunjungan Anda!'
    };

    await dbUpdate('storeSettings', storeSettings.id, updates);
  };

  const handleManualSave = async () => {
    if (!hasEditAccess) {
      toast.error('Akses ditolak.');
      return;
    }
    setIsSaving(true);
    setSaveStatus('saving');
    try {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
      await executeSave();
      setSaveStatus('saved');
      toast.success('Semua konfigurasi struk berhasil disimpan');
    } catch (err: any) {
      setSaveStatus('error');
      toast.error('Gagal menyimpan konfigurasi: ' + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleImageFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    // Mime type validation
    if (!file.type.startsWith('image/')) {
      toast.error('Format berkas tidak valid. Harap pilih gambar.');
      return;
    }
    
    // File size validation (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Ukuran gambar melebihi batas maksimal 5MB.');
      return;
    }
    
    setSelectedFile(file);
    setCropOpen(true);
    e.target.value = ''; // Reset file input
  };

  const deleteFooterImage = () => {
    setFooterImg(undefined);
    triggerAutoSave(undefined);
    toast.success('Logo penutup struk dihapus');
  };

  if (!storeSettings) {
    return (
      <div className="flex flex-col items-center justify-center p-12 space-y-4">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground font-medium animate-pulse">Memuat Pengaturan Struk...</p>
      </div>
    );
  }

  // Pre-calculated typography styles
  const previewFontClass = cn({
    'font-mono tracking-tighter': fontFamily === 'receipt-font',
    'font-mono': fontFamily === 'monospace',
    'font-sans': fontFamily === 'sans-serif',
    'font-serif': fontFamily === 'courier'
  });

  const previewAlignClass = cn({
    'text-left': alignment === 'left',
    'text-center': alignment === 'center',
    'text-right': alignment === 'right'
  });

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start animate-in fade-in duration-200">
      {/* LEFT COLUMN: Controls Dashboard */}
      <div className="lg:col-span-7 space-y-6">
        <Card className="rounded-2xl p-6 border border-border shadow-sm space-y-6 bg-card relative overflow-hidden">
          
          {/* Dashboard Header & Status bar */}
          <div className="flex items-center justify-between pb-4 border-b border-border/80">
            <div className="flex items-center gap-2">
              <Sliders className="w-5 h-5 text-primary" />
              <div>
                <h3 className="text-sm font-semibold text-foreground">Receipt Builder Premium</h3>
                <p className="text-[10px] text-muted-foreground mt-0.5">Tata letak & konfigurasi struk pembelian</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-[10px] font-medium transition-all duration-300">
                {saveStatus === 'saving' && <span className="text-amber-500 flex items-center gap-1"><Loader2 className="w-3 h-3 animate-spin" /> Menyimpan...</span>}
                {saveStatus === 'saved' && <span className="text-emerald-500 flex items-center gap-1"><CheckCircle2 className="w-3 h-3 text-emerald-500" /> Disimpan otomatis</span>}
                {saveStatus === 'error' && <span className="text-destructive">⚠️ Gagal menyimpan otomatis</span>}
              </span>
              <Button 
                onClick={handleManualSave} 
                disabled={isSaving} 
                size="sm" 
                className="h-8 rounded-xl px-3 text-[11px] font-bold gap-1.5 shadow-sm"
              >
                {isSaving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
                Simpan Struk
              </Button>
            </div>
          </div>

          {/* SECTION 1: Paper Width (POS Premium Setup) */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground uppercase tracking-wider">
              <Layout className="w-3.5 h-3.5" /> Ukuran Kertas Thermal
            </div>
            <div className="flex border border-border rounded-xl p-1 bg-muted/40 h-11 max-w-[260px]">
              <button 
                type="button"
                onClick={() => {
                  setPaperWidth('58mm');
                  triggerAutoSave(footerImg, footerLine1, footerLine2, receiptShowLogo, receiptShowCashier, receiptShowCustomer, receiptShowTable, receiptHeaderTitle, fontFamily, fontSize, lineHeight, alignment, compactMode, '58mm');
                }}
                className={cn(
                  "flex-1 text-[11px] font-bold rounded-lg transition-all h-full flex items-center justify-center gap-1.5",
                  paperWidth === '58mm' ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                )}
              >
                58mm (Mobile POS)
              </button>
              <button 
                type="button"
                onClick={() => {
                  setPaperWidth('80mm');
                  triggerAutoSave(footerImg, footerLine1, footerLine2, receiptShowLogo, receiptShowCashier, receiptShowCustomer, receiptShowTable, receiptHeaderTitle, fontFamily, fontSize, lineHeight, alignment, compactMode, '80mm');
                }}
                className={cn(
                  "flex-1 text-[11px] font-bold rounded-lg transition-all h-full flex items-center justify-center gap-1.5",
                  paperWidth === '80mm' ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                )}
              >
                80mm (Desktop POS)
              </button>
            </div>
          </div>

          {/* SECTION 2: Global Typography Settings */}
          <div className="space-y-4 pt-3 border-t border-border/50">
            <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground uppercase tracking-wider">
              <Type className="w-3.5 h-3.5" /> Tipografi Global Struk
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Font Family */}
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Jenis Font</Label>
                <select 
                  value={fontFamily}
                  onChange={e => {
                    const v = e.target.value as any;
                    setFontFamily(v);
                    triggerAutoSave(footerImg, footerLine1, footerLine2, receiptShowLogo, receiptShowCashier, receiptShowCustomer, receiptShowTable, receiptHeaderTitle, v);
                  }}
                  className="w-full text-xs h-9 px-2.5 rounded-xl border border-border bg-background focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="courier">Courier New (Classic Restaurant)</option>
                  <option value="monospace">Standard Monospace</option>
                  <option value="sans-serif">Modern Sans-Serif</option>
                  <option value="receipt-font">Premium Thermal Compact</option>
                </select>
              </div>

              {/* Font Size */}
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Ukuran Font</Label>
                <select 
                  value={fontSize}
                  onChange={e => {
                    const v = e.target.value as any;
                    setFontSize(v);
                    triggerAutoSave(footerImg, footerLine1, footerLine2, receiptShowLogo, receiptShowCashier, receiptShowCustomer, receiptShowTable, receiptHeaderTitle, fontFamily, v);
                  }}
                  className="w-full text-xs h-9 px-2.5 rounded-xl border border-border bg-background focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="xs">Ekstra Kecil (XS)</option>
                  <option value="sm">Kecil (SM)</option>
                  <option value="md">Sedang (MD)</option>
                  <option value="lg">Besar (LG)</option>
                  <option value="xl">Ekstra Besar (XL)</option>
                </select>
              </div>

              {/* Line Height */}
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Spasi Gunting (Line Height)</Label>
                <select 
                  value={lineHeight}
                  onChange={e => {
                    const v = e.target.value as any;
                    setLineHeight(v);
                    triggerAutoSave(footerImg, footerLine1, footerLine2, receiptShowLogo, receiptShowCashier, receiptShowCustomer, receiptShowTable, receiptHeaderTitle, fontFamily, fontSize, v);
                  }}
                  className="w-full text-xs h-9 px-2.5 rounded-xl border border-border bg-background focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="tight">Rapat (Tight)</option>
                  <option value="normal">Normal</option>
                  <option value="relaxed">Renggang (Relaxed)</option>
                </select>
              </div>

              {/* Alignment */}
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Perataan Teks</Label>
                <select 
                  value={alignment}
                  onChange={e => {
                    const v = e.target.value as any;
                    setAlignment(v);
                    triggerAutoSave(footerImg, footerLine1, footerLine2, receiptShowLogo, receiptShowCashier, receiptShowCustomer, receiptShowTable, receiptHeaderTitle, fontFamily, fontSize, lineHeight, v);
                  }}
                  className="w-full text-xs h-9 px-2.5 rounded-xl border border-border bg-background focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="left">Rata Kiri</option>
                  <option value="center">Rata Tengah</option>
                  <option value="right">Rata Kanan</option>
                </select>
              </div>

              {/* Header Title */}
              <div className="space-y-1.5 sm:col-span-2">
                <Label className="text-xs font-medium">Judul Kertas Struk</Label>
                <Input 
                  value={receiptHeaderTitle}
                  onChange={e => {
                    setReceiptHeaderTitle(e.target.value);
                    triggerAutoSave(footerImg, footerLine1, footerLine2, receiptShowLogo, receiptShowCashier, receiptShowCustomer, receiptShowTable, e.target.value);
                  }}
                  placeholder="Struk Pembelian"
                  className="h-9 text-xs rounded-xl"
                  maxLength={30}
                />
              </div>
            </div>
          </div>

          {/* SECTION 3: Checklist Visibility Toggles */}
          <div className="space-y-4 pt-3 border-t border-border/50">
            <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5" /> Visibilitas Metadata Struk
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              {/* Show Logo */}
              <button 
                type="button" 
                onClick={() => {
                  const v = !receiptShowLogo;
                  setReceiptShowLogo(v);
                  triggerAutoSave(footerImg, footerLine1, footerLine2, v);
                }}
                className={cn(
                  "flex items-center gap-3 p-3.5 rounded-xl border transition-all text-left",
                  receiptShowLogo ? "bg-primary/5 border-primary/20 text-foreground" : "bg-card border-border hover:bg-muted/40 text-muted-foreground"
                )}
              >
                {receiptShowLogo ? <CheckSquare className="w-4 h-4 text-primary shrink-0" /> : <Square className="w-4 h-4 text-muted-foreground/60 shrink-0" />}
                <div className="space-y-0.5 min-w-0">
                  <span className="text-xs font-bold block leading-none">Logo Toko</span>
                  <span className="text-[10px] text-muted-foreground/80 block truncate">Tampilkan logo di atas struk</span>
                </div>
              </button>

              {/* Show Cashier */}
              <button 
                type="button" 
                onClick={() => {
                  const v = !receiptShowCashier;
                  setReceiptShowCashier(v);
                  triggerAutoSave(footerImg, footerLine1, footerLine2, receiptShowLogo, v);
                }}
                className={cn(
                  "flex items-center gap-3 p-3.5 rounded-xl border transition-all text-left",
                  receiptShowCashier ? "bg-primary/5 border-primary/20 text-foreground" : "bg-card border-border hover:bg-muted/40 text-muted-foreground"
                )}
              >
                {receiptShowCashier ? <CheckSquare className="w-4 h-4 text-primary shrink-0" /> : <Square className="w-4 h-4 text-muted-foreground/60 shrink-0" />}
                <div className="space-y-0.5 min-w-0">
                  <span className="text-xs font-bold block leading-none">Nama Kasir</span>
                  <span className="text-[10px] text-muted-foreground/80 block truncate">Diambil otomatis dari akun aktif</span>
                </div>
              </button>

              {/* Show Customer */}
              <button 
                type="button" 
                onClick={() => {
                  const v = !receiptShowCustomer;
                  setReceiptShowCustomer(v);
                  triggerAutoSave(footerImg, footerLine1, footerLine2, receiptShowLogo, receiptShowCashier, v);
                }}
                className={cn(
                  "flex items-center gap-3 p-3.5 rounded-xl border transition-all text-left",
                  receiptShowCustomer ? "bg-primary/5 border-primary/20 text-foreground" : "bg-card border-border hover:bg-muted/40 text-muted-foreground"
                )}
              >
                {receiptShowCustomer ? <CheckSquare className="w-4 h-4 text-primary shrink-0" /> : <Square className="w-4 h-4 text-muted-foreground/60 shrink-0" />}
                <div className="space-y-0.5 min-w-0">
                  <span className="text-xs font-bold block leading-none">Nama Pembeli</span>
                  <span className="text-[10px] text-muted-foreground/80 block truncate">Diambil otomatis dari transaksi</span>
                </div>
              </button>

              {/* Show Table */}
              <button 
                type="button" 
                onClick={() => {
                  const v = !receiptShowTable;
                  setReceiptShowTable(v);
                  triggerAutoSave(footerImg, footerLine1, footerLine2, receiptShowLogo, receiptShowCashier, receiptShowCustomer, v);
                }}
                className={cn(
                  "flex items-center gap-3 p-3.5 rounded-xl border transition-all text-left",
                  receiptShowTable ? "bg-primary/5 border-primary/20 text-foreground" : "bg-card border-border hover:bg-muted/40 text-muted-foreground"
                )}
              >
                {receiptShowTable ? <CheckSquare className="w-4 h-4 text-primary shrink-0" /> : <Square className="w-4 h-4 text-muted-foreground/60 shrink-0" />}
                <div className="space-y-0.5 min-w-0">
                  <span className="text-xs font-bold block leading-none">Meja / Tipe Order</span>
                  <span className="text-[10px] text-muted-foreground/80 block truncate">Diambil otomatis dari order aktif</span>
                </div>
              </button>
            </div>
          </div>

          {/* SECTION 4: Elegant Simplified Footer Editor (2 Textarea rows + 1 Image) */}
          <div className="space-y-4 pt-3 border-t border-border/50">
            <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground uppercase tracking-wider">
              <AlignCenter className="w-3.5 h-3.5" /> Penutup Struk (Footer)
            </div>

            <div className="space-y-3.5">
              {/* Footer line 1 textarea */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Teks Penutup Baris 1</Label>
                <textarea 
                  value={footerLine1}
                  onChange={e => {
                    setFooterLine1(e.target.value);
                    triggerAutoSave(footerImg, e.target.value);
                  }}
                  placeholder="Terima kasih atas kunjungan Anda!"
                  className="w-full text-xs p-3 rounded-xl border border-border bg-background focus:outline-none focus:ring-1 focus:ring-primary min-h-[50px] resize-none h-14"
                  maxLength={120}
                />
              </div>

              {/* Footer line 2 textarea */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Teks Penutup Baris 2 (Opsional)</Label>
                <textarea 
                  value={footerLine2}
                  onChange={e => {
                    setFooterLine2(e.target.value);
                    triggerAutoSave(footerImg, footerLine1, e.target.value);
                  }}
                  placeholder="Barang yang sudah dibeli tidak dapat ditukar atau dikembalikan."
                  className="w-full text-xs p-3 rounded-xl border border-border bg-background focus:outline-none focus:ring-1 focus:ring-primary min-h-[50px] resize-none h-14"
                  maxLength={120}
                />
              </div>

              {/* Footer Image Uploader (Crop Square enabled) */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Gambar / QR Pembayaran Penutup</Label>
                <div className="flex items-center gap-4">
                  <div className="h-16 w-16 rounded-2xl border border-border bg-muted flex items-center justify-center overflow-hidden shrink-0 grayscale select-none relative bg-neutral-50 shadow-inner">
                    {footerImg ? (
                      <img src={footerImg} alt="Cropped Footer Image" className="w-full h-full object-contain" />
                    ) : (
                      <ImageIcon className="w-5 h-5 text-muted-foreground/45" />
                    )}
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <div className="flex items-center gap-2">
                      <Button 
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => fileInputRef.current?.click()}
                        className="h-8 text-xs font-bold rounded-xl gap-1.5 border border-border hover:bg-muted"
                      >
                        <Camera className="w-3.5 h-3.5" /> {footerImg ? 'Ganti Foto' : 'Unggah Foto'}
                      </Button>
                      {footerImg && (
                        <Button 
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={deleteFooterImage}
                          className="h-8 text-xs font-bold text-destructive hover:text-destructive hover:bg-destructive/5 rounded-xl gap-1.5"
                        >
                          <Trash2 className="w-3.5 h-3.5" /> Hapus
                        </Button>
                      )}
                    </div>
                    <span className="text-[10px] text-muted-foreground">Maksimal 5MB, format JPEG/PNG/WebP. Gambar wajib di-crop persegi.</span>
                  </div>
                </div>
              </div>
            </div>
            
            <input 
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleImageFileSelect}
            />
          </div>
        </Card>
      </div>

      {/* RIGHT COLUMN: Thermal Paper Live Preview */}
      <div className="lg:col-span-5 flex justify-center sticky top-20">
        <div className="flex flex-col items-center w-full">
          <div className="text-center mb-3">
            <h4 className="text-xs font-bold text-muted-foreground flex items-center justify-center gap-1.5 uppercase tracking-wide">
              <Printer className="w-3.5 h-3.5 text-primary" /> POS Receipt Mockup
            </h4>
            <p className="text-[10px] text-muted-foreground">Preview realtime format struk restoran premium</p>
          </div>

          {/* Simulated thermal slip paper */}
          <div 
            className={cn(
              "bg-white text-black p-6 shadow-xl border border-gray-200 transition-all duration-300 relative select-none",
              paperWidth === '58mm' ? "w-[280px]" : "w-[360px]"
            )}
            style={{ 
              fontFamily: fontFamily === 'monospace' ? 'monospace' : fontFamily === 'sans-serif' ? 'sans-serif' : "'Courier New', Courier, monospace",
              fontSize: fontSize === 'xs' ? '10px' : fontSize === 'sm' ? '12px' : fontSize === 'md' ? '14px' : fontSize === 'lg' ? '16px' : '18px',
              lineHeight: lineHeight === 'tight' ? '1.15' : lineHeight === 'relaxed' ? '1.5' : '1.3',
              clipPath: 'polygon(0 0, 100% 0, 100% calc(100% - 6px), 98% 100%, 96% calc(100% - 6px), 94% 100%, 92% calc(100% - 6px), 90% 100%, 88% calc(100% - 6px), 86% 100%, 84% calc(100% - 6px), 82% 100%, 80% calc(100% - 6px), 78% 100%, 76% calc(100% - 6px), 74% 100%, 72% calc(100% - 6px), 70% 100%, 68% calc(100% - 6px), 66% 100%, 64% calc(100% - 6px), 62% 100%, 60% calc(100% - 6px), 58% 100%, 56% calc(100% - 6px), 54% 100%, 52% calc(100% - 6px), 50% 100%, 48% calc(100% - 6px), 46% 100%, 44% calc(100% - 6px), 42% 100%, 40% calc(100% - 6px), 38% 100%, 36% calc(100% - 6px), 34% 100%, 32% calc(100% - 6px), 30% 100%, 28% calc(100% - 6px), 26% 100%, 24% calc(100% - 6px), 22% 100%, 20% calc(100% - 6px), 18% 100%, 16% calc(100% - 6px), 14% 100%, 12% calc(100% - 6px), 10% 100%, 8% calc(100% - 6px), 6% 100%, 4% calc(100% - 6px), 2% 100%, 0 calc(100% - 6px))'
            }}
          >
            {/* Header Content */}
            <div className={cn("text-center space-y-1.5", compactMode ? "mb-2" : "mb-4")}>
              {receiptShowLogo && (
                <div className="w-14 h-14 rounded-2xl border border-gray-300/60 bg-gray-50 flex items-center justify-center overflow-hidden mx-auto mb-2 grayscale opacity-75 shadow-inner">
                  {storeSettings.logo ? (
                    <img src={storeSettings.logo} alt="Logo" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-[9px] font-bold text-gray-400">Logo</span>
                  )}
                </div>
              )}
              
              <h2 className="font-extrabold text-sm tracking-wide truncate max-w-full">
                {storeSettings.storeName || 'Kopi & Resto Senang'}
              </h2>
              <p className="text-[9px] leading-tight opacity-75">{storeSettings.address || 'Jl. Raya Diponegoro No. 12, Surabaya'}</p>
              <p className="text-[9px] opacity-75">{storeSettings.phone || '0812-3456-7890'}</p>
              
              <div className="border-t border-dashed border-gray-400 my-2" />
              
              <h3 className="font-bold text-[10px] tracking-widest">{receiptHeaderTitle || 'Struk Pembelian'}</h3>
            </div>

            {/* Metadata Rows */}
            <div className={cn("space-y-0.5 py-1.5 border-y border-dashed border-gray-400 mb-3 text-[9px]")}>
              <div className="flex justify-between">
                <span>No. Struk:</span>
                <span className="font-bold">#20260529-0012</span>
              </div>
              <div className="flex justify-between">
                <span>Tanggal:</span>
                <span>29 Mei 2026 22:30</span>
              </div>
              <div className="flex justify-between">
                <span>Pembayaran:</span>
                <span className="font-bold">Transfer QRIS</span>
              </div>
              
              {(receiptShowCashier || receiptShowCustomer || receiptShowTable) && (
                <div className="border-t border-dashed border-gray-300 my-1.5" />
              )}
              
              {receiptShowCashier && (
                <div className="flex justify-between">
                  <span className="opacity-75">Kasir:</span>
                  <span className="font-medium">Basith (Admin Utama)</span>
                </div>
              )}
              {receiptShowCustomer && (
                <div className="flex justify-between">
                  <span className="opacity-75">Pembeli:</span>
                  <span className="font-medium">Ahmad Basith</span>
                </div>
              )}
              {receiptShowTable && (
                <div className="flex justify-between">
                  <span className="opacity-75">Meja / Tipe:</span>
                  <span className="font-bold">Meja 04</span>
                </div>
              )}
            </div>

            {/* Simulated Products List (Normal Case elegance) */}
            <div className={cn("space-y-2 border-b border-dashed border-gray-400 mb-3 pb-3.5")}>
              <div className="text-[10px]">
                <div className="flex justify-between font-semibold">
                  <span>Kopi Susu Aren Premium</span>
                  <span>Rp 36.000</span>
                </div>
                <div className="flex justify-between text-[9px] opacity-75">
                  <span>  2 x Rp 18.000</span>
                </div>
              </div>
              <div className="text-[10px]">
                <div className="flex justify-between font-semibold">
                  <span>Roti Bakar Keju Cokelat</span>
                  <span>Rp 15.000</span>
                </div>
                <div className="flex justify-between text-[9px] opacity-75">
                  <span>  1 x Rp 15.000</span>
                </div>
              </div>
            </div>

            {/* Calculations block */}
            <div className="space-y-1 text-[9px] mb-3 border-b border-dashed border-gray-400 pb-2">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span>Rp 51.000</span>
              </div>
              <div className="flex justify-between text-[11px] font-extrabold border-t border-gray-300 pt-1 mt-1">
                <span>Total Tagihan</span>
                <span>Rp 51.000</span>
              </div>
              <div className="flex justify-between mt-1">
                <span>Bayar</span>
                <span>Rp 51.000</span>
              </div>
              <div className="flex justify-between font-bold text-gray-700">
                <span>Kembali</span>
                <span>Rp 0</span>
              </div>
            </div>

            {/* Dynamic Textarea/Cropped Image Footer rendering */}
            <div className={cn("pt-2 pb-6 space-y-2.5", previewFontClass, previewAlignClass, "text-gray-500 text-[10px]")}>
              {footerLine1 && (
                <p className="font-medium whitespace-pre-wrap leading-relaxed">{footerLine1}</p>
              )}
              {footerLine2 && (
                <p className="font-medium whitespace-pre-wrap leading-relaxed">{footerLine2}</p>
              )}
              {footerImg && (
                <div className="my-2.5 text-center">
                  <img 
                    src={footerImg} 
                    alt="Footer preview" 
                    className="h-16 w-auto object-contain mx-auto rounded-2xl grayscale opacity-75 shadow-sm bg-neutral-50/50 border border-neutral-200/40" 
                    style={{ filter: 'grayscale(1) contrast(1.2)' }}
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      
      {/* Square Crop Modal */}
      <PhotoCropModal
        open={cropOpen}
        onOpenChange={setCropOpen}
        file={selectedFile}
        aspectRatio={1} // Square Crop aspect ratio = 1
        onCropped={(croppedUrl) => {
          setFooterImg(croppedUrl);
          setCropOpen(false);
          setSelectedFile(null);
          triggerAutoSave(croppedUrl);
          toast.success('Logo penutup berhasil dipotong');
        }}
      />
    </div>
  );
}
