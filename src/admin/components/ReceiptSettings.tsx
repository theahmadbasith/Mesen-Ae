import { useState, useEffect, useRef } from 'react';
import { 
  Camera, Save, Loader2, CheckCircle2, Printer, ImageIcon, Sparkles, 
  Sliders, Type, AlignCenter, Layout, Trash2, CheckSquare, Square,
  GripVertical, Store, Utensils, AlignLeft, ArrowUp, ArrowDown, MoveVertical, Wine
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

type TemplateType = 'minimarket' | 'fnb' | 'finedining';
type FooterBlock = 'line1' | 'line2' | 'image';

export default function ReceiptSettings({ storeSettings, hasEditAccess }: ReceiptSettingsProps) {
  const [hasInitialized, setHasInitialized] = useState(false);
  
  // Template Mode 
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
        setFooterLine1(oldText || 'Terima Kasih Atas Kunjungan Anda');
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
        <p className="text-sm text-muted-foreground font-medium animate-pulse">Memuat Pengaturan Struk...</p>
      </div>
    );
  }

  // --- Typography Mappers ---
  const previewFontClass = cn({
    'font-mono tracking-tighter': fontFamily === 'receipt-font',
    'font-mono': fontFamily === 'monospace',
    'font-sans tracking-tight': fontFamily === 'sans-serif',
    'font-serif': fontFamily === 'courier'
  });

  const getFontSizeClass = (baseSize: string, modifier: number = 0) => {
    const sizes = { xs: 9, sm: 11, md: 13, lg: 15, xl: 17 };
    const val = (sizes[baseSize as keyof typeof sizes] || 11) + modifier;
    return `${val}px`;
  };

  // --- Mock Data for Realistic Previews ---
  const mockData = {
    minimarket: {
      items: [
        { name: 'ABC ORANGE 525ML', qty: 1, price: 13500, total: 13500 },
        { name: 'I/F BISC WNDRLND 300', qty: 1, price: 20900, total: 20900 },
        { name: 'KOPIKO 78C 240ML', qty: 2, price: 5500, total: 11000 },
      ],
      vouchers: [
        { name: 'VOUCHER ABC SQUASH', amount: -3600 },
        { name: 'VOUCHER INDOFOOD', amount: -10000 },
      ]
    },
    fnb: {
      items: [
        { name: 'Bakmie Ayam', notes: 'Pedas', qty: 1, price: 24000, total: 24000 },
        { name: 'Es Teh Manis', notes: 'Gula Sedikit', qty: 2, price: 5000, total: 10000 },
      ]
    },
    finedining: {
      items: [
        { name: 'Wagyu A5 Ribeye 300g', qty: 1, price: 1250000, total: 1250000 },
        { name: 'Truffle Mashed Potato', qty: 1, price: 150000, total: 150000 },
        { name: 'Chateau Margaux 2015', qty: 1, price: 4500000, total: 4500000 },
      ]
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start animate-in fade-in duration-200">
      {/* ========================================== */}
      {/* LEFT COLUMN: Controls Dashboard */}
      {/* ========================================== */}
      <div className="lg:col-span-7 space-y-6">
        <Card className="rounded-2xl p-6 border border-border shadow-sm space-y-6 bg-card relative overflow-hidden">
          
          <div className="flex items-center justify-between pb-4 border-b border-border/80">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Sliders className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-foreground">Receipt Builder Pro</h3>
                <p className="text-[10px] text-muted-foreground mt-0.5">Desain struk kasir profesional kelas atas</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-[10px] font-medium hidden sm:block">
                {saveStatus === 'saving' && <span className="text-amber-500 flex items-center gap-1"><Loader2 className="w-3 h-3 animate-spin" /> Menyimpan...</span>}
                {saveStatus === 'saved' && <span className="text-emerald-500 flex items-center gap-1"><CheckCircle2 className="w-3 h-3 text-emerald-500" /> Auto-Saved</span>}
                {saveStatus === 'error' && <span className="text-destructive">⚠️ Gagal</span>}
              </span>
              <Button onClick={handleManualSave} disabled={isSaving} size="sm" className="h-8 rounded-xl px-3 text-[11px] font-bold gap-1.5 shadow-sm">
                {isSaving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />} Simpan
              </Button>
            </div>
          </div>

          {/* SECTION 1: Template Selection */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground uppercase tracking-wider">
              <Layout className="w-4 h-4 text-primary/70" /> Tema & Tata Letak
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <button
                onClick={() => { setTemplate('minimarket'); triggerAutoSave('minimarket'); }}
                className={cn(
                  "flex flex-col items-center justify-center p-4 rounded-xl border-2 transition-all gap-2 relative overflow-hidden", 
                  template === 'minimarket' ? "bg-primary/5 border-primary text-primary shadow-sm" : "bg-card border-border hover:border-primary/40 hover:bg-muted/50 text-muted-foreground"
                )}
              >
                {template === 'minimarket' && <div className="absolute top-0 right-0 w-8 h-8 bg-primary rounded-bl-2xl flex items-center justify-center"><CheckCircle2 className="w-4 h-4 text-white" /></div>}
                <Store className="w-6 h-6" />
                <div className="text-center">
                  <span className="block text-xs font-bold">Ritel / Supermarket</span>
                  <span className="block text-[10px] opacity-70 mt-1 leading-tight">Format rapi ala Minimarket Nasional</span>
                </div>
              </button>
              
              <button
                onClick={() => { setTemplate('fnb'); triggerAutoSave('fnb'); }}
                className={cn(
                  "flex flex-col items-center justify-center p-4 rounded-xl border-2 transition-all gap-2 relative overflow-hidden", 
                  template === 'fnb' ? "bg-primary/5 border-primary text-primary shadow-sm" : "bg-card border-border hover:border-primary/40 hover:bg-muted/50 text-muted-foreground"
                )}
              >
                {template === 'fnb' && <div className="absolute top-0 right-0 w-8 h-8 bg-primary rounded-bl-2xl flex items-center justify-center"><CheckCircle2 className="w-4 h-4 text-white" /></div>}
                <Utensils className="w-6 h-6" />
                <div className="text-center">
                  <span className="block text-xs font-bold">Kafe / Resto</span>
                  <span className="block text-[10px] opacity-70 mt-1 leading-tight">Rapi & Informatif (No. Meja Jelas)</span>
                </div>
              </button>
              
              <button
                onClick={() => { setTemplate('finedining'); triggerAutoSave('finedining'); }}
                className={cn(
                  "flex flex-col items-center justify-center p-4 rounded-xl border-2 transition-all gap-2 relative overflow-hidden", 
                  template === 'finedining' ? "bg-primary/5 border-primary text-primary shadow-sm" : "bg-card border-border hover:border-primary/40 hover:bg-muted/50 text-muted-foreground"
                )}
              >
                {template === 'finedining' && <div className="absolute top-0 right-0 w-8 h-8 bg-primary rounded-bl-2xl flex items-center justify-center"><CheckCircle2 className="w-4 h-4 text-white" /></div>}
                <Wine className="w-6 h-6" />
                <div className="text-center">
                  <span className="block text-xs font-bold">Fine Dining</span>
                  <span className="block text-[10px] opacity-70 mt-1 leading-tight">Elegan, minimalis & Bintang 5</span>
                </div>
              </button>
            </div>

            <div className="flex items-center gap-3 mt-4">
              <Label className="text-xs font-semibold text-muted-foreground whitespace-nowrap">Lebar Kertas Printer:</Label>
              <div className="flex border border-border rounded-xl p-1 bg-muted/40 h-9 w-full sm:w-[240px]">
                <button type="button" onClick={() => { setPaperWidth('58mm'); triggerAutoSave(template, footerImg, footerLine1, footerLine2, footerOrder, receiptShowLogo, receiptShowCashier, receiptShowCustomer, receiptShowTable, receiptHeaderTitle, fontFamily, fontSize, lineHeight, alignment, compactMode, '58mm'); }} className={cn("flex-1 text-[11px] font-bold rounded-lg transition-all h-full", paperWidth === '58mm' ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}>58mm (Kecil)</button>
                <button type="button" onClick={() => { setPaperWidth('80mm'); triggerAutoSave(template, footerImg, footerLine1, footerLine2, footerOrder, receiptShowLogo, receiptShowCashier, receiptShowCustomer, receiptShowTable, receiptHeaderTitle, fontFamily, fontSize, lineHeight, alignment, compactMode, '80mm'); }} className={cn("flex-1 text-[11px] font-bold rounded-lg transition-all h-full", paperWidth === '80mm' ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}>80mm (Lebar)</button>
              </div>
            </div>
          </div>

          {/* SECTION 2: Typography */}
          <div className="space-y-4 pt-5 border-t border-border/50">
            <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground uppercase tracking-wider">
              <Type className="w-4 h-4 text-primary/70" /> Tipografi Struk
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 bg-muted/20 p-4 rounded-xl border border-border/50">
              <div className="space-y-2 sm:col-span-2">
                <Label className="text-[11px] font-bold">Jenis Font</Label>
                <select value={fontFamily} onChange={e => { setFontFamily(e.target.value as any); triggerAutoSave(template, footerImg, footerLine1, footerLine2, footerOrder, receiptShowLogo, receiptShowCashier, receiptShowCustomer, receiptShowTable, receiptHeaderTitle, e.target.value as any); }} className="w-full text-xs h-10 px-3 rounded-lg border border-border bg-background focus:ring-2 focus:ring-primary/20 outline-none transition-all">
                  <option value="receipt-font">Thermal Compact (Rekomendasi)</option>
                  <option value="monospace">Standard Monospace</option>
                  <option value="sans-serif">Modern Sans-Serif</option>
                  <option value="courier">Classic Courier New</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label className="text-[11px] font-bold">Ukuran Base</Label>
                <select value={fontSize} onChange={e => { setFontSize(e.target.value as any); triggerAutoSave(template, footerImg, footerLine1, footerLine2, footerOrder, receiptShowLogo, receiptShowCashier, receiptShowCustomer, receiptShowTable, receiptHeaderTitle, fontFamily, e.target.value as any); }} className="w-full text-xs h-10 px-3 rounded-lg border border-border bg-background focus:ring-2 focus:ring-primary/20 outline-none transition-all">
                  <option value="xs">XS (Sangat Kecil)</option>
                  <option value="sm">SM (Kecil/Standar)</option>
                  <option value="md">MD (Sedang)</option>
                  <option value="lg">LG (Besar)</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label className="text-[11px] font-bold">Spasi Baris</Label>
                <select value={lineHeight} onChange={e => { setLineHeight(e.target.value as any); triggerAutoSave(template, footerImg, footerLine1, footerLine2, footerOrder, receiptShowLogo, receiptShowCashier, receiptShowCustomer, receiptShowTable, receiptHeaderTitle, fontFamily, fontSize, e.target.value as any); }} className="w-full text-xs h-10 px-3 rounded-lg border border-border bg-background focus:ring-2 focus:ring-primary/20 outline-none transition-all">
                  <option value="tight">Rapat (Hemat Kertas)</option>
                  <option value="normal">Normal</option>
                  <option value="relaxed">Renggang (Elegan)</option>
                </select>
              </div>
            </div>
          </div>

          {/* SECTION 3: Metadata Visibility */}
          <div className="space-y-4 pt-5 border-t border-border/50">
            <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground uppercase tracking-wider">
              <Sparkles className="w-4 h-4 text-primary/70" /> Informasi Cetak
            </div>
            
            <div className="space-y-3">
              <div className="space-y-1.5 sm:w-1/2">
                <Label className="text-[11px] font-bold">Judul Kertas Struk (Opsional)</Label>
                <Input 
                  value={receiptHeaderTitle}
                  onChange={e => { setReceiptHeaderTitle(e.target.value); triggerAutoSave(template, footerImg, footerLine1, footerLine2, footerOrder, receiptShowLogo, receiptShowCashier, receiptShowCustomer, receiptShowTable, e.target.value); }}
                  placeholder="Misal: BUKTI PEMBAYARAN"
                  className="h-10 text-xs rounded-lg bg-background"
                  maxLength={30}
                />
              </div>

              <div className="grid grid-cols-2 gap-3 mt-4">
                {[
                  { label: 'Logo Toko', desc: 'Tampilkan logo di header', state: receiptShowLogo, setter: setReceiptShowLogo },
                  { label: 'Nama Kasir', desc: 'Kasir yang melayani', state: receiptShowCashier, setter: setReceiptShowCashier },
                  { label: 'Nama Pembeli', desc: 'Sesuai data order', state: receiptShowCustomer, setter: setReceiptShowCustomer },
                  { label: 'Meja / Tipe Order', desc: 'Dine In / Takeaway', state: receiptShowTable, setter: setReceiptShowTable },
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
                    className={cn(
                      "flex items-start gap-3 p-3.5 rounded-xl border transition-all text-left", 
                      item.state ? "bg-primary/5 border-primary/30 text-foreground" : "bg-card border-border hover:bg-muted/60 text-muted-foreground"
                    )}
                  >
                    <div className={cn("mt-0.5 rounded-md", item.state ? "text-primary" : "text-muted-foreground/50")}>
                      {item.state ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
                    </div>
                    <div className="flex flex-col gap-0.5">
                      <span className="text-xs font-bold leading-none">{item.label}</span>
                      <span className="text-[10px] opacity-70 leading-tight">{item.desc}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* SECTION 4: Draggable Footer Editor (Premium UI) */}
          <div className="space-y-4 pt-5 border-t border-border/50">
            <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground uppercase tracking-wider">
              <AlignCenter className="w-4 h-4 text-primary/70" /> Penutup Struk (Drag & Drop)
            </div>
            
            <div className="space-y-3 bg-muted/10 p-2 sm:p-4 rounded-xl border border-border/50">
              {footerOrder.map((block, index) => (
                <div 
                  key={block} 
                  className="flex gap-2 sm:gap-4 items-stretch bg-background p-3 rounded-xl border border-border/80 shadow-sm group hover:border-primary/30 transition-colors"
                >
                  {/* Left Controls */}
                  <div className="flex flex-col justify-between items-center bg-muted/50 rounded-lg w-8 py-1">
                    <button type="button" onClick={() => moveFooterBlock(index, 'up')} disabled={index === 0} className="p-1 text-muted-foreground hover:text-primary disabled:opacity-20 transition-colors"><ArrowUp className="w-3.5 h-3.5" /></button>
                    <MoveVertical className="w-3 h-3 text-muted-foreground/30" />
                    <button type="button" onClick={() => moveFooterBlock(index, 'down')} disabled={index === footerOrder.length - 1} className="p-1 text-muted-foreground hover:text-primary disabled:opacity-20 transition-colors"><ArrowDown className="w-3.5 h-3.5" /></button>
                  </div>
                  
                  {/* Content Area */}
                  <div className="flex-1 w-full py-1">
                    {block === 'line1' && (
                      <div className="space-y-2">
                        <Label className="text-[10px] font-extrabold uppercase text-primary/80 flex items-center gap-1.5"><Type className="w-3 h-3" /> Teks Utama Footer</Label>
                        <textarea value={footerLine1} onChange={e => { setFooterLine1(e.target.value); triggerAutoSave(template, footerImg, e.target.value); }} className="w-full text-xs p-3 rounded-lg border border-border bg-muted/30 focus:bg-background focus:ring-1 focus:ring-primary h-14 resize-none transition-all placeholder:text-muted-foreground/40" placeholder="Contoh: Terima Kasih Atas Kunjungan Anda" />
                      </div>
                    )}
                    {block === 'line2' && (
                      <div className="space-y-2">
                        <Label className="text-[10px] font-extrabold uppercase text-primary/80 flex items-center gap-1.5"><Type className="w-3 h-3" /> Info Tambahan</Label>
                        <textarea value={footerLine2} onChange={e => { setFooterLine2(e.target.value); triggerAutoSave(template, footerImg, footerLine1, e.target.value); }} className="w-full text-xs p-3 rounded-lg border border-border bg-muted/30 focus:bg-background focus:ring-1 focus:ring-primary h-14 resize-none transition-all placeholder:text-muted-foreground/40" placeholder="Contoh: Kritik & Saran: 0812-xxxx-xxxx" />
                      </div>
                    )}
                    {block === 'image' && (
                      <div className="space-y-2">
                        <Label className="text-[10px] font-extrabold uppercase text-primary/80 flex items-center gap-1.5"><ImageIcon className="w-3 h-3" /> Logo / QR Tambahan</Label>
                        <div className="flex gap-4 items-center bg-muted/20 p-2 rounded-lg border border-border/50">
                          <div className="h-14 w-14 rounded-lg border border-border bg-background flex items-center justify-center overflow-hidden grayscale relative shadow-inner">
                            {footerImg ? <img src={footerImg} className="w-full h-full object-contain p-1" /> : <ImageIcon className="w-5 h-5 text-muted-foreground/30" />}
                          </div>
                          <div className="flex flex-col gap-2">
                            <Button type="button" variant={footerImg ? "outline" : "default"} size="sm" onClick={() => fileInputRef.current?.click()} className={cn("h-7 text-[10px] px-3 rounded-md", !footerImg && "bg-primary text-primary-foreground hover:bg-primary/90")}>
                              <Camera className="w-3 h-3 mr-1.5" /> {footerImg ? 'Ganti Gambar' : 'Unggah Gambar'}
                            </Button>
                            {footerImg && (
                              <Button type="button" variant="ghost" size="sm" onClick={() => { setFooterImg(undefined); triggerAutoSave(template, undefined); }} className="h-6 text-[10px] px-2 text-destructive hover:bg-destructive/10 rounded-md justify-start">
                                <Trash2 className="w-3 h-3 mr-1.5" /> Hapus
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                  
                  {/* Right Drag Handle */}
                  <div className="flex items-center pr-1 cursor-grab opacity-30 group-hover:opacity-100 transition-opacity">
                    <GripVertical className="w-5 h-5 text-muted-foreground" />
                  </div>
                </div>
              ))}
            </div>
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageFileSelect} />
          </div>
        </Card>
      </div>

      {/* ========================================== */}
      {/* RIGHT COLUMN: Live Thermal Paper Preview */}
      {/* ========================================== */}
      <div className="lg:col-span-5 flex justify-center sticky top-20">
        <div className="flex flex-col items-center w-full">
          <div className="text-center mb-4">
            <h4 className="text-xs font-bold text-foreground flex items-center justify-center gap-2 uppercase tracking-widest">
              <Printer className="w-4 h-4 text-primary" /> POS Mockup 
            </h4>
            <p className="text-[10px] text-muted-foreground mt-1">Simulasi hasil cetak thermal</p>
          </div>

          <div 
            className={cn(
              "bg-white text-black p-5 sm:p-6 shadow-2xl border border-gray-200 transition-all duration-500 relative select-none",
              paperWidth === '58mm' ? "w-[280px]" : "w-[360px]",
              previewFontClass
            )}
            style={{ 
              fontSize: getFontSizeClass(fontSize),
              lineHeight: lineHeight === 'tight' ? '1.15' : lineHeight === 'relaxed' ? '1.5' : '1.3',
              // Thermal Paper Zig-Zag cut illusion
              clipPath: 'polygon(0 0, 100% 0, 100% calc(100% - 6px), 98% 100%, 96% calc(100% - 6px), 94% 100%, 92% calc(100% - 6px), 90% 100%, 88% calc(100% - 6px), 86% 100%, 84% calc(100% - 6px), 82% 100%, 80% calc(100% - 6px), 78% 100%, 76% calc(100% - 6px), 74% 100%, 72% calc(100% - 6px), 70% 100%, 68% calc(100% - 6px), 66% 100%, 64% calc(100% - 6px), 62% 100%, 60% calc(100% - 6px), 58% 100%, 56% calc(100% - 6px), 54% 100%, 52% calc(100% - 6px), 50% 100%, 48% calc(100% - 6px), 46% 100%, 44% calc(100% - 6px), 42% 100%, 40% calc(100% - 6px), 38% 100%, 36% calc(100% - 6px), 34% 100%, 32% calc(100% - 6px), 30% 100%, 28% calc(100% - 6px), 26% 100%, 24% calc(100% - 6px), 22% 100%, 20% calc(100% - 6px), 18% 100%, 16% calc(100% - 6px), 14% 100%, 12% calc(100% - 6px), 10% 100%, 8% calc(100% - 6px), 6% 100%, 4% calc(100% - 6px), 2% 100%, 0 calc(100% - 6px))'
            }}
          >
            {/* ========================================================= */}
            {/* TEMPLATE RENDER LOGIC */}
            {/* ========================================================= */}

            {/* 1. MINIMARKET TEMPLATE (Indomaret Style) */}
            {template === 'minimarket' && (
              <div className="w-full text-left">
                {/* Header Minimarket */}
                <div className="mb-3">
                  {receiptShowLogo && (
                    <div className="w-32 h-10 mb-2 grayscale">
                      <img src={storeSettings.logo || '/placeholder.png'} className="w-full h-full object-contain object-left" />
                    </div>
                  )}
                  <h2 className="font-extrabold">{storeSettings.storeName?.toUpperCase() || 'PT SUMBER KITA BERSAMA'}</h2>
                  <p>{storeSettings.address?.toUpperCase() || 'JL. KEBANGSAAN NO. 12, JAKARTA'}</p>
                  <p>NPWP: 01.337.994.6-092.000</p>
                </div>
                
                {/* Metadata Minimarket */}
                <div className="mb-2 uppercase">
                  <div className="flex gap-2">
                    <span>16.06.26-17:08</span>
                    <span>2.1.27</span>
                    {receiptShowCashier && <span>301135/BASITH/01</span>}
                  </div>
                </div>

                <div className="border-t border-dashed border-black my-2" />

                {/* Items List Minimarket */}
                <div className="space-y-0 uppercase">
                  {mockData.minimarket.items.map((item, i) => (
                    <div key={i} className="flex flex-wrap w-full justify-between items-start leading-tight">
                      <span className="w-1/2 break-words pr-1">{item.name}</span>
                      <div className="flex w-1/2 justify-between pl-1">
                        <span className="w-4 text-center">{item.qty}</span>
                        <span className="w-16 text-right">{item.price.toLocaleString('id-ID')}</span>
                        <span className="w-16 text-right">{item.total.toLocaleString('id-ID')}</span>
                      </div>
                    </div>
                  ))}
                  <div className="flex flex-wrap w-full justify-between items-start leading-tight mt-1">
                    <span className="w-1/2 break-words pr-1">SOVIA M/GORENG 2L</span>
                    <div className="flex w-1/2 justify-between pl-1">
                      <span className="w-4 text-center">1</span>
                      <span className="w-16 text-right">35.000</span>
                      <span className="w-16 text-right">35.000</span>
                    </div>
                  </div>
                  <div className="flex justify-end gap-2 pr-1 pt-1 opacity-80 text-[0.95em]">
                    <span>CANCEL : </span>
                    <span>(1)</span>
                    <span>(35.000)</span>
                    <span>(35.000)</span>
                  </div>
                </div>

                <div className="border-t border-dashed border-black my-2" />

                {/* Totals Minimarket */}
                <div className="space-y-0.5 uppercase">
                  <div className="flex justify-end gap-4">
                    <span>HARGA JUAL :</span>
                    <span className="w-20 text-right">45.400</span>
                  </div>
                  {mockData.minimarket.vouchers.map((v, i) => (
                    <div key={i} className="flex justify-between pl-4">
                      <span>{v.name} :</span>
                      <span className="w-20 text-right">({Math.abs(v.amount).toLocaleString('id-ID')})</span>
                    </div>
                  ))}
                  <div className="border-t border-dashed border-black my-1" />
                  <div className="flex justify-end gap-4 font-extrabold text-[1.1em]">
                    <span>TOTAL :</span>
                    <span className="w-20 text-right">31.800</span>
                  </div>
                  <div className="flex justify-end gap-4">
                    <span>TUNAI :</span>
                    <span className="w-20 text-right">50.000</span>
                  </div>
                  <div className="flex justify-end gap-4">
                    <span>KEMBALI :</span>
                    <span className="w-20 text-right">18.200</span>
                  </div>
                </div>
              </div>
            )}

            {/* 2. F&B TEMPLATE (Everlast / KFC Style) */}
            {template === 'fnb' && (
              <div className="w-full text-left">
                {/* Header F&B */}
                <div className="text-center mb-4">
                  {receiptShowLogo && (
                    <div className="w-16 h-16 mx-auto mb-2 grayscale">
                      <img src={storeSettings.logo || '/placeholder.png'} className="w-full h-full object-contain" />
                    </div>
                  )}
                  <h2 className="font-bold text-[1.2em]">{storeSettings.storeName?.toUpperCase() || 'EVERLAST RESTO'}</h2>
                  <p className="opacity-90">{storeSettings.address || 'Jl. Dr Soetomo No. 93, Tulungagung'}</p>
                </div>
                
                {/* Metadata F&B (Neat Colon alignment) */}
                <div className="mb-2">
                  <div className="grid grid-cols-[60px_auto] gap-x-1">
                    <span>No</span><span>: SI-MN4KU-106</span>
                    <span>Tanggal</span><span>: 24 Mar 2026, 19.14</span>
                    {receiptShowCashier && <><span>Kasir</span><span>: Crew</span></>}
                    {receiptShowCustomer && <><span>Nama</span><span>: Ahmad</span></>}
                    {receiptShowTable && <><span>Jenis</span><span>: Dine In (Meja 04)</span></>}
                  </div>
                </div>

                <div className="border-t border-dashed border-black my-2" />

                {/* Items List F&B */}
                <div className="space-y-2">
                  {mockData.fnb.items.map((item, i) => (
                    <div key={i} className="leading-tight">
                      <div className="font-bold">{item.name}</div>
                      <div className="flex justify-between text-[0.9em]">
                        <span>{item.qty} x {item.price.toLocaleString('id-ID')} = {item.total.toLocaleString('id-ID')}</span>
                      </div>
                      <div className="opacity-80">Catatan: {item.notes}</div>
                    </div>
                  ))}
                </div>

                <div className="border-t border-dashed border-black my-2" />

                {/* Totals F&B */}
                <div className="grid grid-cols-[80px_auto] gap-x-1 justify-start ml-auto max-w-[200px]">
                  <span>Subtotal</span><span>: 34.000</span>
                  <span>Pajak 10%</span><span>: 3.400</span>
                  <span>Pembulatan</span><span>: 600</span>
                  <span className="font-extrabold text-[1.1em]">Total</span><span className="font-extrabold text-[1.1em]">: 38.000</span>
                  <span>Pembayaran</span><span>: QRIS</span>
                </div>
              </div>
            )}

            {/* 3. FINE DINING TEMPLATE (Elegant, Minimalist) */}
            {template === 'finedining' && (
              <div className="w-full text-center">
                {/* Header Fine Dining */}
                <div className="mb-6">
                  <h2 className="font-serif font-extrabold text-[1.4em] tracking-widest">{storeSettings.storeName || 'LE BERNARDIN'}</h2>
                  <p className="opacity-70 mt-1">{storeSettings.address || 'Jakarta, Indonesia'}</p>
                </div>
                
                {/* Metadata Fine Dining */}
                <div className="mb-4 opacity-80">
                  <p>Date: May 29, 2026  19:45</p>
                  {receiptShowTable && <p>Table 12</p>}
                  {(receiptShowCashier || receiptShowCustomer) && (
                    <p>
                      {receiptShowCashier && 'Server: Michel'} 
                      {receiptShowCashier && receiptShowCustomer && ' | '}
                      {receiptShowCustomer && 'Guest: Mr. Ahmad'}
                    </p>
                  )}
                </div>

                <div className="border-t border-solid border-black/30 my-4" />

                {/* Items List Fine Dining */}
                <div className="space-y-3">
                  {mockData.finedining.items.map((item, i) => (
                    <div key={i} className="flex justify-between items-start leading-tight">
                      <span className="text-left max-w-[70%]">{item.qty} x {item.name}</span>
                      <span className="text-right">{item.total.toLocaleString('id-ID')}</span>
                    </div>
                  ))}
                </div>

                <div className="border-t border-solid border-black/30 my-4" />

                {/* Totals Fine Dining */}
                <div className="space-y-1">
                  <div className="flex justify-between opacity-80">
                    <span>Subtotal</span><span>5.900.000</span>
                  </div>
                  <div className="flex justify-between opacity-80">
                    <span>Service (10%)</span><span>590.000</span>
                  </div>
                  <div className="flex justify-between opacity-80">
                    <span>Tax (11%)</span><span>713.900</span>
                  </div>
                  <div className="flex justify-between font-serif font-extrabold text-[1.2em] mt-3 pt-3 border-t border-black/30">
                    <span>Total</span><span>7.203.900</span>
                  </div>
                </div>
              </div>
            )}

            {/* ========================================================= */}
            {/* DYNAMIC SORTABLE FOOTER */}
            {/* ========================================================= */}
            
            <div className="border-t border-black mt-4 mb-4 opacity-50" />

            <div className="text-center space-y-3 pb-8">
              {footerOrder.map((block, idx) => {
                if (block === 'line1' && footerLine1) {
                  return (
                    <p key={idx} className={cn(
                      "whitespace-pre-wrap leading-relaxed",
                      template === 'minimarket' ? 'font-bold uppercase' : 'font-semibold'
                    )}>
                      {footerLine1}
                    </p>
                  );
                }
                if (block === 'line2' && footerLine2) {
                  return (
                    <p key={idx} className={cn(
                      "whitespace-pre-wrap opacity-80 leading-snug",
                      template === 'minimarket' && 'uppercase'
                    )}>
                      {footerLine2}
                    </p>
                  );
                }
                if (block === 'image' && footerImg) {
                  return (
                    <div key={idx} className="my-3">
                      <img 
                        src={footerImg} 
                        className="w-24 mx-auto object-contain grayscale mix-blend-multiply" 
                        style={{ filter: 'grayscale(1) contrast(1.2) brightness(0.9)' }} 
                        alt="Receipt Footer"
                      />
                    </div>
                  );
                }
                return null;
              })}
            </div>

          </div>
        </div>
      </div>
      
      {/* Square Crop Modal */}
      <PhotoCropModal 
        open={cropOpen} 
        onOpenChange={setCropOpen} 
        file={selectedFile} 
        aspectRatio={1} 
        onCropped={(url) => { 
          setFooterImg(url); 
          setCropOpen(false); 
          setSelectedFile(null);
          triggerAutoSave(template, url); 
        }} 
      />
    </div>
  );
}
