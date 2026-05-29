import { useState, useEffect, useRef } from 'react';
import { 
  Camera, Save, Loader2, CheckCircle2, Printer, ImageIcon, Sparkles, 
  Sliders, Type, AlignCenter, Layout, Trash2, CheckSquare, Square,
  GripVertical, Store, Utensils, AlignLeft, ArrowUp, ArrowDown
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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

type TemplateType = 'retail' | 'fnb' | 'classic';
type FooterBlock = 'line1' | 'line2' | 'image';

export default function ReceiptSettings({ storeSettings, hasEditAccess }: ReceiptSettingsProps) {
  const [hasInitialized, setHasInitialized] = useState(false);
  
  // Template Mode (Retail/Indomaret, F&B/KFC, Classic)
  const [template, setTemplate] = useState<TemplateType>('fnb');

  // Paper Width
  const [paperWidth, setPaperWidth] = useState<'58mm' | '80mm'>('58mm');
  
  // Global Typography Settings
  const [fontFamily, setFontFamily] = useState<'monospace' | 'sans-serif' | 'courier' | 'receipt-font'>('receipt-font');
  const [fontSize, setFontSize] = useState<'xs' | 'sm' | 'md' | 'lg' | 'xl'>('sm');
  const [lineHeight, setLineHeight] = useState<'tight' | 'normal' | 'relaxed'>('tight');
  const [alignment, setAlignment] = useState<'left' | 'center' | 'right'>('center');
  const [compactMode, setCompactMode] = useState(true);
  
  // Custom Receipt Header Title
  const [receiptHeaderTitle, setReceiptHeaderTitle] = useState('Struk Pembelian');
  
  // Visibility Checklist Toggles
  const [receiptShowLogo, setReceiptShowLogo] = useState(true);
  const [receiptShowCashier, setReceiptShowCashier] = useState(true);
  const [receiptShowCustomer, setReceiptShowCustomer] = useState(true);
  const [receiptShowTable, setReceiptShowTable] = useState(true);
  
  // Footer Data
  const [footerLine1, setFooterLine1] = useState('');
  const [footerLine2, setFooterLine2] = useState('');
  const [footerImg, setFooterImg] = useState<string | undefined>();
  const [footerOrder, setFooterOrder] = useState<FooterBlock[]>(['line1', 'line2', 'image']);
  
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
      setTemplate(settings.receiptTemplate ?? 'fnb');
      setReceiptShowLogo(settings.receiptShowLogo ?? true);
      setReceiptShowCashier(settings.receiptShowCashier ?? true);
      setReceiptShowCustomer(settings.receiptShowCustomer ?? true);
      setReceiptShowTable(settings.receiptShowTable ?? true);
      setReceiptHeaderTitle(settings.receiptHeaderTitle ?? 'Struk Pembelian');
      
      const typo = settings.receiptTypography || {};
      setFontFamily(typo.fontFamily ?? 'receipt-font');
      setFontSize(typo.fontSize ?? 'sm');
      setLineHeight(typo.lineHeight ?? 'tight');
      setAlignment(typo.alignment ?? 'center');
      setCompactMode(typo.compactMode ?? true);
      setPaperWidth(typo.paperWidth ?? '58mm');
      
      setFooterImg(settings.receiptFooterImg || '');
      setFooterOrder(settings.receiptFooterOrder ?? ['line1', 'line2', 'image']);
      
      const oldLines = settings.receiptFooterLines || [];
      const oldText = settings.receiptFooter || '';
      if (oldLines.length > 0) {
        setFooterLine1(oldLines[0] || '');
        setFooterLine2(oldLines[1] || '');
      } else {
        setFooterLine1(oldText || 'Terima kasih atas kunjungan Anda!');
        setFooterLine2('Layanan Konsumen: 0812-xxxx-xxxx');
      }
      
      setHasInitialized(true);
    }
  }, [storeSettings, hasInitialized]);

  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    };
  }, []);

  const triggerAutoSave = (
    currentTemplate = template,
    img = footerImg,
    line1 = footerLine1,
    line2 = footerLine2,
    order = footerOrder,
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
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    
    saveTimeoutRef.current = setTimeout(async () => {
      try {
        await executeSave(
          currentTemplate, img, line1, line2, order, logo, cashier, customer, table, title,
          font, size, lh, align, compact, width
        );
        setSaveStatus('saved');
      } catch (err: any) {
        setSaveStatus('error');
        toast.error('Gagal menyimpan otomatis: ' + err.message);
      }
    }, 1500);
  };

  const executeSave = async (
    currentTemplate = template,
    img = footerImg,
    line1 = footerLine1,
    line2 = footerLine2,
    order = footerOrder,
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
    if (img && img.startsWith('data:image')) {
      const res = await fetch(img);
      const blob = await res.blob();
      const compressedDataUrl = await compressImage(blob, 0.2);
      
      const folderPath = `stores/${storeSettings.id}/receipt`;
      const fileName = `footer-image.webp`;
      
      const uploadedUrl = await dbUploadFile(folderPath, fileName, compressedDataUrl);
      if (uploadedUrl) {
        const oldUrl = (storeSettings as any).receiptFooterImg;
        if (oldUrl && oldUrl !== uploadedUrl) await dbDeleteFile(oldUrl);
        finalImgUrl = uploadedUrl;
      }
    } else if (!img) {
      const oldUrl = (storeSettings as any).receiptFooterImg;
      if (oldUrl) await dbDeleteFile(oldUrl);
    }

    const updates = {
      receiptTemplate: currentTemplate,
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
      receiptFooterOrder: order,
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
      toast.success('Konfigurasi struk berhasil disimpan');
    } catch (err: any) {
      setSaveStatus('error');
      toast.error('Gagal menyimpan: ' + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleImageFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) return toast.error('Format berkas tidak valid.');
    if (file.size > 5 * 1024 * 1024) return toast.error('Maksimal 5MB.');
    
    setSelectedFile(file);
    setCropOpen(true);
    e.target.value = '';
  };

  const moveFooterBlock = (index: number, direction: 'up' | 'down') => {
    const newOrder = [...footerOrder];
    if (direction === 'up' && index > 0) {
      [newOrder[index - 1], newOrder[index]] = [newOrder[index], newOrder[index - 1]];
    } else if (direction === 'down' && index < newOrder.length - 1) {
      [newOrder[index + 1], newOrder[index]] = [newOrder[index], newOrder[index + 1]];
    }
    setFooterOrder(newOrder);
    triggerAutoSave(template, footerImg, footerLine1, footerLine2, newOrder);
  };

  if (!storeSettings) {
    return (
      <div className="flex flex-col items-center justify-center p-12 space-y-4">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground font-medium animate-pulse">Memuat Pengaturan...</p>
      </div>
    );
  }

  // Typography Mappers
  const previewFontClass = cn({
    'font-mono tracking-tighter': fontFamily === 'receipt-font',
    'font-mono': fontFamily === 'monospace',
    'font-sans tracking-tight': fontFamily === 'sans-serif',
    'font-serif': fontFamily === 'courier'
  });

  const getFontSizeClass = (baseSize: string, modifier: number = 0) => {
    const sizes = { xs: 8, sm: 10, md: 12, lg: 14, xl: 16 };
    const val = (sizes[baseSize as keyof typeof sizes] || 10) + modifier;
    return `${val}px`;
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start animate-in fade-in duration-200">
      {/* LEFT COLUMN: Controls Dashboard */}
      <div className="lg:col-span-7 space-y-6">
        <Card className="rounded-2xl p-6 border border-border shadow-sm space-y-6 bg-card relative overflow-hidden">
          
          <div className="flex items-center justify-between pb-4 border-b border-border/80">
            <div className="flex items-center gap-2">
              <Sliders className="w-5 h-5 text-primary" />
              <div>
                <h3 className="text-sm font-semibold text-foreground">Receipt Builder Premium</h3>
                <p className="text-[10px] text-muted-foreground mt-0.5">Tata letak & konfigurasi struk pembelian</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-[10px] font-medium">
                {saveStatus === 'saving' && <span className="text-amber-500 flex items-center gap-1"><Loader2 className="w-3 h-3 animate-spin" /> Menyimpan...</span>}
                {saveStatus === 'saved' && <span className="text-emerald-500 flex items-center gap-1"><CheckCircle2 className="w-3 h-3 text-emerald-500" /> Tersimpan</span>}
                {saveStatus === 'error' && <span className="text-destructive">⚠️ Gagal</span>}
              </span>
              <Button onClick={handleManualSave} disabled={isSaving} size="sm" className="h-8 rounded-xl px-3 text-[11px] font-bold gap-1.5 shadow-sm">
                {isSaving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />} Simpan
              </Button>
            </div>
          </div>

          {/* SECTION 1: Template Selection */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground uppercase tracking-wider">
              <Layout className="w-3.5 h-3.5" /> Tema & Ukuran Kertas
            </div>
            
            <div className="grid grid-cols-3 gap-3">
              <button
                onClick={() => { setTemplate('retail'); triggerAutoSave('retail'); }}
                className={cn("flex flex-col items-center justify-center p-3 rounded-xl border transition-all gap-2", template === 'retail' ? "bg-primary/5 border-primary text-primary" : "bg-card border-border hover:bg-muted/50 text-muted-foreground")}
              >
                <Store className="w-5 h-5" />
                <div className="text-center">
                  <span className="block text-[11px] font-bold">Ritel Mode</span>
                  <span className="block text-[9px] opacity-70">Standar Supermarket</span>
                </div>
              </button>
              <button
                onClick={() => { setTemplate('fnb'); triggerAutoSave('fnb'); }}
                className={cn("flex flex-col items-center justify-center p-3 rounded-xl border transition-all gap-2", template === 'fnb' ? "bg-primary/5 border-primary text-primary" : "bg-card border-border hover:bg-muted/50 text-muted-foreground")}
              >
                <Utensils className="w-5 h-5" />
                <div className="text-center">
                  <span className="block text-[11px] font-bold">F&B Mode</span>
                  <span className="block text-[9px] opacity-70">Ala Resto Cepat Saji</span>
                </div>
              </button>
              <button
                onClick={() => { setTemplate('classic'); triggerAutoSave('classic'); }}
                className={cn("flex flex-col items-center justify-center p-3 rounded-xl border transition-all gap-2", template === 'classic' ? "bg-primary/5 border-primary text-primary" : "bg-card border-border hover:bg-muted/50 text-muted-foreground")}
              >
                <AlignLeft className="w-5 h-5" />
                <div className="text-center">
                  <span className="block text-[11px] font-bold">Klasik Mode</span>
                  <span className="block text-[9px] opacity-70">Sederhana & Rapi</span>
                </div>
              </button>
            </div>

            <div className="flex border border-border rounded-xl p-1 bg-muted/40 h-10 w-full sm:w-[260px] mt-2">
              <button type="button" onClick={() => { setPaperWidth('58mm'); triggerAutoSave(template, footerImg, footerLine1, footerLine2, footerOrder, receiptShowLogo, receiptShowCashier, receiptShowCustomer, receiptShowTable, receiptHeaderTitle, fontFamily, fontSize, lineHeight, alignment, compactMode, '58mm'); }} className={cn("flex-1 text-[11px] font-bold rounded-lg transition-all h-full", paperWidth === '58mm' ? "bg-background text-foreground shadow-sm" : "text-muted-foreground")}>58mm</button>
              <button type="button" onClick={() => { setPaperWidth('80mm'); triggerAutoSave(template, footerImg, footerLine1, footerLine2, footerOrder, receiptShowLogo, receiptShowCashier, receiptShowCustomer, receiptShowTable, receiptHeaderTitle, fontFamily, fontSize, lineHeight, alignment, compactMode, '80mm'); }} className={cn("flex-1 text-[11px] font-bold rounded-lg transition-all h-full", paperWidth === '80mm' ? "bg-background text-foreground shadow-sm" : "text-muted-foreground")}>80mm</button>
            </div>
          </div>

          {/* SECTION 2: Typography */}
          <div className="space-y-4 pt-3 border-t border-border/50">
            <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground uppercase tracking-wider">
              <Type className="w-3.5 h-3.5" /> Tipografi Struk
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="space-y-1.5 sm:col-span-2">
                <Label className="text-xs font-medium">Jenis Font</Label>
                <select value={fontFamily} onChange={e => { setFontFamily(e.target.value as any); triggerAutoSave(template, footerImg, footerLine1, footerLine2, footerOrder, receiptShowLogo, receiptShowCashier, receiptShowCustomer, receiptShowTable, receiptHeaderTitle, e.target.value as any); }} className="w-full text-xs h-9 px-2.5 rounded-xl border border-border bg-background">
                  <option value="receipt-font">Thermal Compact (Rekomendasi)</option>
                  <option value="monospace">Standard Monospace</option>
                  <option value="sans-serif">Modern Sans-Serif</option>
                  <option value="courier">Courier New</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Ukuran</Label>
                <select value={fontSize} onChange={e => { setFontSize(e.target.value as any); triggerAutoSave(template, footerImg, footerLine1, footerLine2, footerOrder, receiptShowLogo, receiptShowCashier, receiptShowCustomer, receiptShowTable, receiptHeaderTitle, fontFamily, e.target.value as any); }} className="w-full text-xs h-9 px-2.5 rounded-xl border border-border bg-background">
                  <option value="xs">Extra Kecil</option>
                  <option value="sm">Kecil</option>
                  <option value="md">Sedang</option>
                  <option value="lg">Besar</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Spasi</Label>
                <select value={lineHeight} onChange={e => { setLineHeight(e.target.value as any); triggerAutoSave(template, footerImg, footerLine1, footerLine2, footerOrder, receiptShowLogo, receiptShowCashier, receiptShowCustomer, receiptShowTable, receiptHeaderTitle, fontFamily, fontSize, e.target.value as any); }} className="w-full text-xs h-9 px-2.5 rounded-xl border border-border bg-background">
                  <option value="tight">Rapat</option>
                  <option value="normal">Normal</option>
                  <option value="relaxed">Renggang</option>
                </select>
              </div>
            </div>
          </div>

          {/* SECTION 3: Metadata Visibility */}
          <div className="space-y-4 pt-3 border-t border-border/50">
            <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5" /> Elemen Struk
            </div>
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: 'Logo Toko', state: receiptShowLogo, setter: setReceiptShowLogo },
                { label: 'Nama Kasir', state: receiptShowCashier, setter: setReceiptShowCashier },
                { label: 'Nama Pembeli', state: receiptShowCustomer, setter: setReceiptShowCustomer },
                { label: 'Info Meja / Order', state: receiptShowTable, setter: setReceiptShowTable },
              ].map((item, idx) => (
                <button
                  key={idx} type="button"
                  onClick={() => {
                    item.setter(!item.state);
                    triggerAutoSave(template, footerImg, footerLine1, footerLine2, footerOrder, 
                      idx === 0 ? !item.state : receiptShowLogo,
                      idx === 1 ? !item.state : receiptShowCashier,
                      idx === 2 ? !item.state : receiptShowCustomer,
                      idx === 3 ? !item.state : receiptShowTable
                    );
                  }}
                  className={cn("flex items-center gap-3 p-3 rounded-xl border transition-all text-left", item.state ? "bg-primary/5 border-primary/20 text-foreground" : "bg-card border-border hover:bg-muted/40 text-muted-foreground")}
                >
                  {item.state ? <CheckSquare className="w-4 h-4 text-primary shrink-0" /> : <Square className="w-4 h-4 text-muted-foreground/60 shrink-0" />}
                  <span className="text-xs font-bold">{item.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* SECTION 4: Draggable Footer Editor */}
          <div className="space-y-4 pt-3 border-t border-border/50">
            <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground uppercase tracking-wider">
              <AlignCenter className="w-3.5 h-3.5" /> Susunan Footer
            </div>
            
            <div className="space-y-3 bg-muted/20 p-3 rounded-xl border border-border/50">
              {footerOrder.map((block, index) => (
                <div key={block} className="flex gap-3 items-start bg-background p-3 rounded-lg border border-border shadow-sm group">
                  <div className="flex flex-col gap-1 mt-1">
                    <button type="button" onClick={() => moveFooterBlock(index, 'up')} disabled={index === 0} className="text-muted-foreground hover:text-primary disabled:opacity-30 disabled:hover:text-muted-foreground"><ArrowUp className="w-3.5 h-3.5" /></button>
                    <button type="button" onClick={() => moveFooterBlock(index, 'down')} disabled={index === footerOrder.length - 1} className="text-muted-foreground hover:text-primary disabled:opacity-30 disabled:hover:text-muted-foreground"><ArrowDown className="w-3.5 h-3.5" /></button>
                  </div>
                  
                  <div className="flex-1 w-full">
                    {block === 'line1' && (
                      <div className="space-y-1.5">
                        <Label className="text-[10px] font-bold uppercase text-muted-foreground">Teks Baris 1</Label>
                        <textarea value={footerLine1} onChange={e => { setFooterLine1(e.target.value); triggerAutoSave(template, footerImg, e.target.value); }} className="w-full text-xs p-2 rounded-md border border-border bg-muted/30 focus:bg-background h-12 resize-none" placeholder="Terima kasih atas kunjungan Anda!" />
                      </div>
                    )}
                    {block === 'line2' && (
                      <div className="space-y-1.5">
                        <Label className="text-[10px] font-bold uppercase text-muted-foreground">Teks Baris 2</Label>
                        <textarea value={footerLine2} onChange={e => { setFooterLine2(e.target.value); triggerAutoSave(template, footerImg, footerLine1, e.target.value); }} className="w-full text-xs p-2 rounded-md border border-border bg-muted/30 focus:bg-background h-12 resize-none" placeholder="Barang yang dibeli tidak dapat ditukar." />
                      </div>
                    )}
                    {block === 'image' && (
                      <div className="space-y-1.5">
                        <Label className="text-[10px] font-bold uppercase text-muted-foreground">QR / Logo Penutup</Label>
                        <div className="flex gap-3">
                          <div className="h-12 w-12 rounded-md border border-border bg-muted flex items-center justify-center overflow-hidden grayscale relative shadow-inner">
                            {footerImg ? <img src={footerImg} className="w-full h-full object-contain" /> : <ImageIcon className="w-4 h-4 text-muted-foreground/45" />}
                          </div>
                          <div className="flex items-center gap-2">
                            <Button type="button" variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} className="h-7 text-[10px] px-2 rounded-md"><Camera className="w-3 h-3 mr-1" /> {footerImg ? 'Ganti' : 'Unggah'}</Button>
                            {footerImg && <Button type="button" variant="ghost" size="sm" onClick={() => { setFooterImg(undefined); triggerAutoSave(template, undefined); }} className="h-7 text-[10px] px-2 text-destructive hover:bg-destructive/10 rounded-md"><Trash2 className="w-3 h-3 mr-1" /> Hapus</Button>}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                  <GripVertical className="w-4 h-4 text-muted-foreground/30 mt-4 cursor-grab" />
                </div>
              ))}
            </div>
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageFileSelect} />
          </div>
        </Card>
      </div>

      {/* RIGHT COLUMN: Live Preview */}
      <div className="lg:col-span-5 flex justify-center sticky top-20">
        <div className="flex flex-col items-center w-full">
          <div className="text-center mb-3">
            <h4 className="text-xs font-bold text-muted-foreground flex items-center justify-center gap-1.5 uppercase tracking-wide">
              <Printer className="w-3.5 h-3.5 text-primary" /> Live POS Preview
            </h4>
          </div>

          <div 
            className={cn(
              "bg-white text-black p-5 shadow-xl border border-gray-200 transition-all duration-300 relative select-none uppercase",
              paperWidth === '58mm' ? "w-[280px]" : "w-[360px]",
              previewFontClass
            )}
            style={{ 
              fontSize: getFontSizeClass(fontSize),
              lineHeight: lineHeight === 'tight' ? '1.1' : lineHeight === 'relaxed' ? '1.5' : '1.3',
              clipPath: 'polygon(0 0, 100% 0, 100% calc(100% - 6px), 98% 100%, 96% calc(100% - 6px), 94% 100%, 92% calc(100% - 6px), 90% 100%, 88% calc(100% - 6px), 86% 100%, 84% calc(100% - 6px), 82% 100%, 80% calc(100% - 6px), 78% 100%, 76% calc(100% - 6px), 74% 100%, 72% calc(100% - 6px), 70% 100%, 68% calc(100% - 6px), 66% 100%, 64% calc(100% - 6px), 62% 100%, 60% calc(100% - 6px), 58% 100%, 56% calc(100% - 6px), 54% 100%, 52% calc(100% - 6px), 50% 100%, 48% calc(100% - 6px), 46% 100%, 44% calc(100% - 6px), 42% 100%, 40% calc(100% - 6px), 38% 100%, 36% calc(100% - 6px), 34% 100%, 32% calc(100% - 6px), 30% 100%, 28% calc(100% - 6px), 26% 100%, 24% calc(100% - 6px), 22% 100%, 20% calc(100% - 6px), 18% 100%, 16% calc(100% - 6px), 14% 100%, 12% calc(100% - 6px), 10% 100%, 8% calc(100% - 6px), 6% 100%, 4% calc(100% - 6px), 2% 100%, 0 calc(100% - 6px))'
            }}
          >
            {/* Template Rendering Logic */}
            
            {/* F&B Mode (e.g. KFC - Centered, Big Order Number) */}
            {template === 'fnb' && (
              <>
                <div className="text-center mb-3">
                  {receiptShowLogo && (
                    <div className="w-12 h-12 mx-auto mb-2 grayscale">
                      <img src={storeSettings.logo || '/placeholder.png'} className="w-full h-full object-contain" />
                    </div>
                  )}
                  <h2 className="font-extrabold" style={{ fontSize: getFontSizeClass(fontSize, 4) }}>{storeSettings.storeName || 'RESTORAN KITA'}</h2>
                  <p>{storeSettings.address || 'Jl. Raya Merdeka 1'}</p>
                  <p>{storeSettings.phone || '0812-3456-7890'}</p>
                  <div className="border-t-2 border-black my-2" />
                  
                  {receiptShowTable && (
                    <div className="my-3">
                      <span className="block font-bold">ANTRIAN / MEJA</span>
                      <span className="block font-extrabold" style={{ fontSize: getFontSizeClass(fontSize, 12) }}>04</span>
                    </div>
                  )}
                </div>
              </>
            )}

            {/* Retail Mode (e.g. Indomaret - Left Aligned, Clean) */}
            {template === 'retail' && (
              <div className="mb-2">
                {receiptShowLogo && (
                  <div className="w-24 h-8 mb-2 grayscale">
                    <img src={storeSettings.logo || '/placeholder.png'} className="w-full h-full object-contain object-left" />
                  </div>
                )}
                <h2 className="font-extrabold">{storeSettings.storeName || 'RETAIL KITA'}</h2>
                <p>{storeSettings.address}</p>
                <p>NPWP: 01.234.567.8-901.000</p>
                <div className="border-t border-dashed border-black my-2" />
              </div>
            )}

            {/* Classic Mode (Centered Simple) */}
            {template === 'classic' && (
              <div className="text-center mb-3">
                <h2 className="font-bold" style={{ fontSize: getFontSizeClass(fontSize, 2) }}>{storeSettings.storeName}</h2>
                <p>{storeSettings.address}</p>
                <div className="border-t border-black my-2" />
              </div>
            )}

            {/* Metadata (Date, Cashier, Receipt No) */}
            <div className="mb-2">
              <div className="flex justify-between"><span className="opacity-80">29.05.26-22:30</span><span className="opacity-80">#123456</span></div>
              {(receiptShowCashier || receiptShowCustomer) && (
                <div className="flex justify-between">
                  {receiptShowCashier && <span>KASIR: BASITH</span>}
                  {receiptShowCustomer && <span>CUST: AHMAD</span>}
                </div>
              )}
            </div>
            
            <div className={cn("border-b border-black mb-2", template === 'retail' ? 'border-dashed' : 'border-solid')} />

            {/* Products */}
            <div className="space-y-1.5 mb-2">
              <div>
                <div className="flex justify-between font-bold"><span>KOPI SUSU AREN</span><span>36.000</span></div>
                <div className="flex justify-between opacity-80"><span>2 X 18.000</span></div>
              </div>
              <div>
                <div className="flex justify-between font-bold"><span>ROTI BAKAR</span><span>15.000</span></div>
                <div className="flex justify-between opacity-80"><span>1 X 15.000</span></div>
              </div>
            </div>

            <div className={cn("border-t mb-2", template === 'retail' ? 'border-dashed border-black' : 'border-black')} />

            {/* Totals */}
            <div className="space-y-0.5">
              <div className="flex justify-between"><span>TOTAL ITEM</span><span>3</span></div>
              <div className="flex justify-between font-extrabold" style={{ fontSize: getFontSizeClass(fontSize, 2) }}><span>TOTAL BELANJA</span><span>51.000</span></div>
              <div className="flex justify-between"><span>TUNAI / QRIS</span><span>51.000</span></div>
              <div className="flex justify-between font-bold"><span>KEMBALIAN</span><span>0</span></div>
            </div>

            <div className="border-t border-black mt-2 mb-3" />

            {/* Dynamic Footer with Sortable Blocks */}
            <div className="text-center space-y-2 pb-6">
              {footerOrder.map((block, idx) => {
                if (block === 'line1' && footerLine1) return <p key={idx} className="font-bold whitespace-pre-wrap">{footerLine1}</p>;
                if (block === 'line2' && footerLine2) return <p key={idx} className="whitespace-pre-wrap">{footerLine2}</p>;
                if (block === 'image' && footerImg) return (
                  <img key={idx} src={footerImg} className="w-20 mx-auto object-contain grayscale" style={{ filter: 'grayscale(1) contrast(1.2)' }} />
                );
                return null;
              })}
            </div>
          </div>
        </div>
      </div>
      
      <PhotoCropModal open={cropOpen} onOpenChange={setCropOpen} file={selectedFile} aspectRatio={1} onCropped={(url) => { setFooterImg(url); setCropOpen(false); triggerAutoSave(template, url); }} />
    </div>
  );
}
