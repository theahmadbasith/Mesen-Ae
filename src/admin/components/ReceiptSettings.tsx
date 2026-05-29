import { useState, useEffect, useRef, memo } from 'react';
import { useSensor, useSensors, PointerSensor, DndContext, closestCenter, DragEndEvent } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, arrayMove, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { 
  GripVertical, Eye, EyeOff, Trash2, Camera, Save, Loader2, 
  CheckCircle2, Printer, Image as ImageIcon, Sparkles, Sliders, Type, AlignCenter, Layout
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

export interface ReceiptFooterItem {
  id: string;
  type: 'image' | 'text';
  visible: boolean;
  url?: string;
  text?: string;
  alignment?: 'left' | 'center' | 'right';
}

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
  
  // General Header & Layout Settings
  const [receiptShowLogo, setReceiptShowLogo] = useState(true);
  const [receiptHeaderTitle, setReceiptHeaderTitle] = useState('STRUK PEMBELIAN');
  
  // Metadata Labels Configuration
  const [receiptLabelCashier, setReceiptLabelCashier] = useState('Kasir');
  const [receiptLabelCustomer, setReceiptLabelCustomer] = useState('Pelanggan');
  const [receiptLabelTable, setReceiptLabelTable] = useState('Meja / Tipe');
  
  // Typography & Styling Settings
  const [fontFamily, setFontFamily] = useState<'monospace' | 'sans-serif' | 'courier' | 'receipt-font'>('courier');
  const [fontSize, setFontSize] = useState<'xs' | 'sm' | 'md' | 'lg' | 'xl'>('sm');
  const [lineHeight, setLineHeight] = useState<'tight' | 'normal' | 'relaxed'>('normal');
  const [alignment, setAlignment] = useState<'left' | 'center' | 'right'>('center');
  const [compactMode, setCompactMode] = useState(false);
  const [paperWidth, setPaperWidth] = useState<'58mm' | '80mm'>('58mm');
  
  // Footer Items (1 Image + 4 Text Lines = 5 Items)
  const [footerItems, setFooterItems] = useState<ReceiptFooterItem[]>([]);
  
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
      setReceiptHeaderTitle(settings.receiptHeaderTitle ?? 'STRUK PEMBELIAN');
      setReceiptLabelCashier(settings.receiptLabelCashier ?? 'Kasir');
      setReceiptLabelCustomer(settings.receiptLabelCustomer ?? 'Pelanggan');
      setReceiptLabelTable(settings.receiptLabelTable ?? 'Meja / Tipe');
      
      const typo = settings.receiptTypography || {};
      setFontFamily(typo.fontFamily ?? 'courier');
      setFontSize(typo.fontSize ?? 'sm');
      setLineHeight(typo.lineHeight ?? 'normal');
      setAlignment(typo.alignment ?? 'center');
      setCompactMode(typo.compactMode ?? false);
      setPaperWidth(typo.paperWidth ?? '58mm');
      
      // Load or migrate footer items
      let items = settings.receiptFooterItems || [];
      if (!items || !Array.isArray(items) || items.length === 0) {
        // Migration from legacy fields
        const oldImg = settings.receiptFooterImg || '';
        const oldLines = settings.receiptFooterLines || [];
        const oldText = settings.receiptFooter || '';
        
        items = [
          { id: 'img-1', type: 'image', visible: !!oldImg, url: oldImg },
          { id: 'txt-1', type: 'text', visible: true, text: oldLines[0] || oldText || 'Terima kasih atas kunjungan Anda!', alignment: 'center' },
          { id: 'txt-2', type: 'text', visible: !!oldLines[1], text: oldLines[1] || '', alignment: 'center' },
          { id: 'txt-3', type: 'text', visible: !!oldLines[2], text: oldLines[2] || '', alignment: 'center' },
          { id: 'txt-4', type: 'text', visible: !!oldLines[3], text: oldLines[3] || '', alignment: 'center' },
        ];
      }
      
      // Normalize items array to exactly 1 image and 4 texts
      const normalItems: ReceiptFooterItem[] = [];
      const imageItem = items.find(i => i.type === 'image') || { id: 'img-1', type: 'image', visible: false, url: '' };
      normalItems.push(imageItem);
      
      const textItems = items.filter(i => i.type === 'text');
      for (let idx = 0; idx < 4; idx++) {
        const existing = textItems[idx];
        normalItems.push({
          id: existing?.id || `txt-${idx + 1}`,
          type: 'text',
          visible: existing ? existing.visible : false,
          text: existing ? (existing.text || '') : '',
          alignment: existing ? (existing.alignment || 'center') : 'center'
        });
      }
      
      setFooterItems(normalItems);
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
    updatedItems = footerItems,
    logo = receiptShowLogo,
    title = receiptHeaderTitle,
    cashier = receiptLabelCashier,
    customer = receiptLabelCustomer,
    table = receiptLabelTable,
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
          updatedItems, logo, title, cashier, customer, table,
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
    itemsToSave = footerItems,
    logo = receiptShowLogo,
    title = receiptHeaderTitle,
    cashier = receiptLabelCashier,
    customer = receiptLabelCustomer,
    table = receiptLabelTable,
    font = fontFamily,
    size = fontSize,
    lh = lineHeight,
    align = alignment,
    compact = compactMode,
    width = paperWidth
  ) => {
    if (!storeSettings?.id) return;
    
    let updatedItems = [...itemsToSave];
    const imageIndex = updatedItems.findIndex(i => i.type === 'image');
    
    if (imageIndex !== -1) {
      const imgItem = updatedItems[imageIndex];
      // Upload raw base64 data to Cloudinary
      if (imgItem.url && imgItem.url.startsWith('data:image')) {
        const res = await fetch(imgItem.url);
        const blob = await res.blob();
        const compressedDataUrl = await compressImage(blob, 0.2); // high compression target (200KB)
        
        const folderPath = `stores/${storeSettings.id}/receipt`;
        const fileName = `footer-image.webp`;
        
        const uploadedUrl = await dbUploadFile(folderPath, fileName, compressedDataUrl);
        if (uploadedUrl) {
          // Delete older file
          const oldUrl = (storeSettings as any).receiptFooterImg;
          if (oldUrl && oldUrl !== uploadedUrl) {
            await dbDeleteFile(oldUrl);
          }
          
          updatedItems[imageIndex] = {
            ...imgItem,
            url: uploadedUrl
          };
        }
      } else if (!imgItem.url) {
        // User deleted footer image
        const oldUrl = (storeSettings as any).receiptFooterImg;
        if (oldUrl) {
          await dbDeleteFile(oldUrl);
        }
      }
    }

    const updates = {
      receiptShowLogo: logo,
      receiptHeaderTitle: title.trim(),
      receiptLabelCashier: cashier.trim(),
      receiptLabelCustomer: customer.trim(),
      receiptLabelTable: table.trim(),
      receiptTypography: {
        fontFamily: font,
        fontSize: size,
        lineHeight: lh,
        alignment: align,
        compactMode: compact,
        paperWidth: width
      },
      receiptFooterItems: updatedItems,
      // Backward compatibility syncs
      receiptFooterImg: updatedItems.find(i => i.type === 'image')?.url || null,
      receiptFooterLines: updatedItems.filter(i => i.type === 'text').map(i => i.text || ''),
      receiptFooter: updatedItems.find(i => i.type === 'text' && i.visible && i.text)?.text || ''
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

  // Drag sensors constraint definition
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = footerItems.findIndex(i => i.id === active.id);
      const newIndex = footerItems.findIndex(i => i.id === over.id);
      const newItems = arrayMove(footerItems, oldIndex, newIndex);
      setFooterItems(newItems);
      triggerAutoSave(newItems);
    }
  };

  // Handler for sorting / updating individual items
  const updateFooterItemText = (id: string, text: string) => {
    const updated = footerItems.map(item => item.id === id ? { ...item, text } : item);
    setFooterItems(updated);
    triggerAutoSave(updated);
  };

  const updateFooterItemAlignment = (id: string, alignment: 'left' | 'center' | 'right') => {
    const updated = footerItems.map(item => item.id === id ? { ...item, alignment } : item);
    setFooterItems(updated);
    triggerAutoSave(updated);
  };

  const toggleFooterItemVisibility = (id: string) => {
    const updated = footerItems.map(item => item.id === id ? { ...item, visible: !item.visible } : item);
    setFooterItems(updated);
    triggerAutoSave(updated);
  };

  const handleFooterImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    // Validasi format file
    if (!file.type.startsWith('image/')) {
      toast.error('Format berkas tidak valid. Harap pilih gambar.');
      return;
    }
    
    // Validasi ukuran gambar maksimal 5MB
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Ukuran gambar melebihi batas maksimal 5MB.');
      return;
    }

    try {
      const reader = new FileReader();
      reader.onload = async (event) => {
        const dataUrl = event.target?.result as string;
        
        // Update local state first to feel instantaneous
        const updated = footerItems.map(item => 
          item.type === 'image' ? { ...item, url: dataUrl, visible: true } : item
        );
        setFooterItems(updated);
        triggerAutoSave(updated);
        toast.info('Gambar sedang diproses & di-compress...');
      };
      reader.readAsDataURL(file);
    } catch {
      toast.error('Gagal memuat gambar');
    }
  };

  const deleteFooterImage = () => {
    const updated = footerItems.map(item => 
      item.type === 'image' ? { ...item, url: '', visible: false } : item
    );
    setFooterItems(updated);
    triggerAutoSave(updated);
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

  // Pre-calculated layout attributes for preview styles
  const previewFontClass = cn({
    'font-mono tracking-tighter': fontFamily === 'receipt-font',
    'font-mono': fontFamily === 'monospace',
    'font-sans': fontFamily === 'sans-serif',
    'font-serif': fontFamily === 'courier'
  });

  const previewSizeClass = cn({
    'text-[10px]': fontSize === 'xs',
    'text-[12px]': fontSize === 'sm',
    'text-[14px]': fontSize === 'md',
    'text-[16px]': fontSize === 'lg',
    'text-[18px]': fontSize === 'xl'
  });

  const previewLineClass = cn({
    'leading-tight': lineHeight === 'tight',
    'leading-normal': lineHeight === 'normal',
    'leading-relaxed': lineHeight === 'relaxed'
  });

  const previewAlignClass = cn({
    'text-left': alignment === 'left',
    'text-center': alignment === 'center',
    'text-right': alignment === 'right'
  });

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
      {/* LEFT COLUMN: Controls Dashboard */}
      <div className="lg:col-span-7 space-y-6">
        <Card className="rounded-2xl p-5 border border-border shadow-sm space-y-6 bg-card relative overflow-hidden">
          {/* Subtle auto-save status bar */}
          <div className="flex items-center justify-between pb-3 border-b border-border/80">
            <div className="flex items-center gap-2">
              <Sliders className="w-5 h-5 text-primary" />
              <div>
                <h3 className="text-sm font-semibold text-foreground">Receipt Layout Builder</h3>
                <p className="text-[10px] text-muted-foreground mt-0.5">Konfigurasi struk dinamis dengan auto-save</p>
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

          {/* Section 1: Header Toggles */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground uppercase tracking-wider">
              <Layout className="w-3.5 h-3.5" /> Header Struk
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center justify-between p-3 rounded-xl border border-border bg-muted/30">
                <div className="space-y-0.5">
                  <Label className="text-xs font-semibold">Tampilkan Logo Toko</Label>
                  <p className="text-[10px] text-muted-foreground">Aktifkan logo di bagian atas struk</p>
                </div>
                <Switch 
                  checked={receiptShowLogo} 
                  onCheckedChange={v => {
                    setReceiptShowLogo(v);
                    triggerAutoSave(footerItems, v);
                  }} 
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Judul Struk Pembelian</Label>
                <Input 
                  value={receiptHeaderTitle} 
                  onChange={e => {
                    setReceiptHeaderTitle(e.target.value);
                    triggerAutoSave(footerItems, receiptShowLogo, e.target.value);
                  }}
                  placeholder="STRUK PEMBELIAN" 
                  className="h-9 text-xs rounded-xl"
                  maxLength={30}
                />
              </div>
            </div>
          </div>

          {/* Section 2: Metadata Labels */}
          <div className="space-y-4 pt-2 border-t border-border/50">
            <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5" /> Label Metadata
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Label Kasir</Label>
                <Input 
                  value={receiptLabelCashier} 
                  onChange={e => {
                    setReceiptLabelCashier(e.target.value);
                    triggerAutoSave(footerItems, receiptShowLogo, receiptHeaderTitle, e.target.value);
                  }}
                  className="h-9 text-xs rounded-xl"
                  maxLength={15}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Label Pelanggan</Label>
                <Input 
                  value={receiptLabelCustomer} 
                  onChange={e => {
                    setReceiptLabelCustomer(e.target.value);
                    triggerAutoSave(footerItems, receiptShowLogo, receiptHeaderTitle, receiptLabelCashier, e.target.value);
                  }}
                  className="h-9 text-xs rounded-xl"
                  maxLength={15}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Label Meja / Tipe</Label>
                <Input 
                  value={receiptLabelTable} 
                  onChange={e => {
                    setReceiptLabelTable(e.target.value);
                    triggerAutoSave(footerItems, receiptShowLogo, receiptHeaderTitle, receiptLabelCashier, receiptLabelCustomer, e.target.value);
                  }}
                  className="h-9 text-xs rounded-xl"
                  maxLength={15}
                />
              </div>
            </div>
            <p className="text-[10px] text-muted-foreground leading-relaxed">
              * Admin hanya mengatur label teksnya saja. Pengisian data nama kasir, nama pembeli, dan nomor meja akan otomatis diisi secara dinamis dari sistem transaksi asli.
            </p>
          </div>

          {/* Section 3: Typography & Paper Size */}
          <div className="space-y-4 pt-2 border-t border-border/50">
            <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground uppercase tracking-wider">
              <Type className="w-3.5 h-3.5" /> Tipografi & Kertas
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {/* Paper width simulation */}
              <div className="space-y-1.5 col-span-2 md:col-span-1">
                <Label className="text-xs font-medium">Lebar Kertas</Label>
                <div className="flex border border-border rounded-xl p-0.5 bg-muted/40 h-9">
                  <button 
                    type="button"
                    onClick={() => {
                      setPaperWidth('58mm');
                      triggerAutoSave(footerItems, receiptShowLogo, receiptHeaderTitle, receiptLabelCashier, receiptLabelCustomer, receiptLabelTable, fontFamily, fontSize, lineHeight, alignment, compactMode, '58mm');
                    }}
                    className={cn(
                      "flex-1 text-[10px] font-bold rounded-lg transition-all h-full",
                      paperWidth === '58mm' ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    58mm
                  </button>
                  <button 
                    type="button"
                    onClick={() => {
                      setPaperWidth('80mm');
                      triggerAutoSave(footerItems, receiptShowLogo, receiptHeaderTitle, receiptLabelCashier, receiptLabelCustomer, receiptLabelTable, fontFamily, fontSize, lineHeight, alignment, compactMode, '80mm');
                    }}
                    className={cn(
                      "flex-1 text-[10px] font-bold rounded-lg transition-all h-full",
                      paperWidth === '80mm' ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    80mm
                  </button>
                </div>
              </div>

              {/* Font Family Selection */}
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Jenis Font</Label>
                <select 
                  value={fontFamily}
                  onChange={e => {
                    const v = e.target.value as any;
                    setFontFamily(v);
                    triggerAutoSave(footerItems, receiptShowLogo, receiptHeaderTitle, receiptLabelCashier, receiptLabelCustomer, receiptLabelTable, v);
                  }}
                  className="w-full text-xs h-9 px-2.5 rounded-xl border border-border bg-background focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="courier">Courier New</option>
                  <option value="monospace">Monospace Standard</option>
                  <option value="sans-serif">Sans-Serif</option>
                  <option value="receipt-font">Thermal Compact Mono</option>
                </select>
              </div>

              {/* Font Size Selection */}
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Ukuran Teks</Label>
                <select 
                  value={fontSize}
                  onChange={e => {
                    const v = e.target.value as any;
                    setFontSize(v);
                    triggerAutoSave(footerItems, receiptShowLogo, receiptHeaderTitle, receiptLabelCashier, receiptLabelCustomer, receiptLabelTable, fontFamily, v);
                  }}
                  className="w-full text-xs h-9 px-2.5 rounded-xl border border-border bg-background focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="xs">Sangat Kecil (XS)</option>
                  <option value="sm">Kecil (SM)</option>
                  <option value="md">Sedang (MD)</option>
                  <option value="lg">Besar (LG)</option>
                  <option value="xl">Sangat Besar (XL)</option>
                </select>
              </div>

              {/* Line Height */}
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Line Height</Label>
                <select 
                  value={lineHeight}
                  onChange={e => {
                    const v = e.target.value as any;
                    setLineHeight(v);
                    triggerAutoSave(footerItems, receiptShowLogo, receiptHeaderTitle, receiptLabelCashier, receiptLabelCustomer, receiptLabelTable, fontFamily, fontSize, v);
                  }}
                  className="w-full text-xs h-9 px-2.5 rounded-xl border border-border bg-background focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="tight">Rapat (Tight)</option>
                  <option value="normal">Normal</option>
                  <option value="relaxed">Renggang (Relaxed)</option>
                </select>
              </div>

              {/* Text alignment for content */}
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Perataan Isi</Label>
                <select 
                  value={alignment}
                  onChange={e => {
                    const v = e.target.value as any;
                    setAlignment(v);
                    triggerAutoSave(footerItems, receiptShowLogo, receiptHeaderTitle, receiptLabelCashier, receiptLabelCustomer, receiptLabelTable, fontFamily, fontSize, lineHeight, v);
                  }}
                  className="w-full text-xs h-9 px-2.5 rounded-xl border border-border bg-background focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="left">Rata Kiri</option>
                  <option value="center">Rata Tengah</option>
                  <option value="right">Rata Kanan</option>
                </select>
              </div>

              {/* Compact Mode Switch */}
              <div className="flex items-center justify-between p-2 rounded-xl border border-border bg-muted/10 h-9">
                <Label className="text-[11px] font-semibold">Mode Rapat</Label>
                <Switch 
                  checked={compactMode} 
                  onCheckedChange={v => {
                    setCompactMode(v);
                    triggerAutoSave(footerItems, receiptShowLogo, receiptHeaderTitle, receiptLabelCashier, receiptLabelCustomer, receiptLabelTable, fontFamily, fontSize, lineHeight, alignment, v);
                  }} 
                />
              </div>
            </div>
          </div>

          {/* Section 4: Drag and Drop Sortable Footer Builder */}
          <div className="space-y-4 pt-2 border-t border-border/50">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground uppercase tracking-wider">
                <AlignCenter className="w-3.5 h-3.5" /> Footer Struk Builder (Sortable)
              </div>
              <span className="text-[10px] text-muted-foreground font-medium">Seret baris untuk mengubah urutan</span>
            </div>

            <div className="space-y-3">
              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                <SortableContext items={footerItems.map(i => i.id)} strategy={verticalListSortingStrategy}>
                  {footerItems.map((item) => (
                    <SortableFooterItem 
                      key={item.id}
                      item={item}
                      updateText={updateFooterItemText}
                      updateAlignment={updateFooterItemAlignment}
                      toggleVisibility={toggleFooterItemVisibility}
                      deleteImg={deleteFooterImage}
                      triggerUploadClick={() => fileInputRef.current?.click()}
                    />
                  ))}
                </SortableContext>
              </DndContext>
            </div>
            
            <input 
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFooterImageUpload}
            />
          </div>
        </Card>
      </div>

      {/* RIGHT COLUMN: Thermal Paper Live Preview */}
      <div className="lg:col-span-5 flex justify-center sticky top-20">
        <div className="flex flex-col items-center w-full">
          <div className="text-center mb-3">
            <h4 className="text-xs font-bold text-muted-foreground flex items-center justify-center gap-1.5 uppercase tracking-wide">
              <Printer className="w-3.5 h-3.5 text-primary" /> Live Thermal Printer Preview
            </h4>
            <p className="text-[10px] text-muted-foreground">Preview realtime simulasi thermal paper</p>
          </div>

          {/* Thermal Paper ticket */}
          <div 
            className={cn(
              "bg-white text-black p-5 shadow-xl border border-gray-200/80 transition-all duration-300 relative select-none",
              paperWidth === '58mm' ? "w-[280px]" : "w-[360px]"
            )}
            style={{ 
              fontFamily: "'Courier New', Courier, monospace",
              fontSize: '11px',
              clipPath: 'polygon(0 0, 100% 0, 100% calc(100% - 6px), 98% 100%, 96% calc(100% - 6px), 94% 100%, 92% calc(100% - 6px), 90% 100%, 88% calc(100% - 6px), 86% 100%, 84% calc(100% - 6px), 82% 100%, 80% calc(100% - 6px), 78% 100%, 76% calc(100% - 6px), 74% 100%, 72% calc(100% - 6px), 70% 100%, 68% calc(100% - 6px), 66% 100%, 64% calc(100% - 6px), 62% 100%, 60% calc(100% - 6px), 58% 100%, 56% calc(100% - 6px), 54% 100%, 52% calc(100% - 6px), 50% 100%, 48% calc(100% - 6px), 46% 100%, 44% calc(100% - 6px), 42% 100%, 40% calc(100% - 6px), 38% 100%, 36% calc(100% - 6px), 34% 100%, 32% calc(100% - 6px), 30% 100%, 28% calc(100% - 6px), 26% 100%, 24% calc(100% - 6px), 22% 100%, 20% calc(100% - 6px), 18% 100%, 16% calc(100% - 6px), 14% 100%, 12% calc(100% - 6px), 10% 100%, 8% calc(100% - 6px), 6% 100%, 4% calc(100% - 6px), 2% 100%, 0 calc(100% - 6px))'
            }}
          >
            {/* Header Content */}
            <div className={cn("text-center space-y-1", compactMode ? "mb-1.5" : "mb-3.5")}>
              {receiptShowLogo && (
                <div className="w-12 h-12 rounded-xl border border-gray-300 bg-gray-50 flex items-center justify-center overflow-hidden mx-auto mb-1.5 grayscale opacity-80">
                  {storeSettings.logo ? (
                    <img src={storeSettings.logo} alt="Logo" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-[8px] font-bold text-gray-400">LOGO</span>
                  )}
                </div>
              )}
              
              <h2 className="font-extrabold text-sm uppercase tracking-wide truncate max-w-full">
                {storeSettings.storeName || 'TOKO SAYA'}
              </h2>
              <p className="text-[9px] leading-tight opacity-75">{storeSettings.address || 'Alamat Toko Belum Ditentukan'}</p>
              <p className="text-[9px] opacity-75">{storeSettings.phone || '08xxxxxxxxxx'}</p>
              
              <div className="border-t border-dashed border-gray-400 my-2" />
              
              <h3 className="font-bold text-[10px] tracking-widest">{receiptHeaderTitle || 'STRUK PEMBELIAN'}</h3>
            </div>

            {/* Metadata Rows */}
            <div className={cn("space-y-0.5", compactMode ? "py-1" : "py-1.5", "border-y border-dashed border-gray-400 mb-3 text-[9px]")}>
              <div className="flex justify-between">
                <span>No. Struk:</span>
                <span className="font-bold">#20260529-001</span>
              </div>
              <div className="flex justify-between">
                <span>Tanggal:</span>
                <span>29/05/2026 22:30</span>
              </div>
              <div className="flex justify-between">
                <span>Pembayaran:</span>
                <span className="font-bold">Tunai</span>
              </div>
              
              <div className="border-t border-dashed border-gray-300 my-1.5" />
              
              <div className="flex justify-between">
                <span className="opacity-75">{receiptLabelCashier}:</span>
                <span className="font-bold uppercase">Budi (Kasir Staf)</span>
              </div>
              <div className="flex justify-between">
                <span className="opacity-75">{receiptLabelCustomer}:</span>
                <span className="font-bold uppercase">Ahmad Basith</span>
              </div>
              <div className="flex justify-between">
                <span className="opacity-75">{receiptLabelTable}:</span>
                <span className="font-bold uppercase">Meja 04</span>
              </div>
            </div>

            {/* Simulated Products List */}
            <div className={cn("space-y-2 border-b border-dashed border-gray-400 mb-3", compactMode ? "pb-1.5" : "pb-3.5")}>
              <div className="text-[10px]">
                <div className="flex justify-between font-bold">
                  <span>KOPI SUSU GULA AREN</span>
                  <span>Rp 36.000</span>
                </div>
                <div className="flex justify-between text-[9px] opacity-75">
                  <span>  2 x Rp 18.000</span>
                </div>
              </div>
              <div className="text-[10px]">
                <div className="flex justify-between font-bold">
                  <span>ROTI BAKAR COKELAT</span>
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
              <div className="flex justify-between">
                <span>Diskon Member</span>
                <span>-Rp 5.000</span>
              </div>
              <div className="flex justify-between text-[11px] font-extrabold border-t border-gray-300 pt-1 mt-1">
                <span>TOTAL AKHIR</span>
                <span>Rp 46.000</span>
              </div>
              <div className="flex justify-between mt-1">
                <span>Bayar (Tunai)</span>
                <span>Rp 50.000</span>
              </div>
              <div className="flex justify-between font-bold text-gray-700">
                <span>Kembali</span>
                <span>Rp 4.000</span>
              </div>
            </div>

            {/* Dynamic Interactive Sorted Footer List preview */}
            <div 
              className={cn(
                "pt-2 pb-6 space-y-2", 
                previewFontClass, 
                previewSizeClass, 
                previewLineClass, 
                previewAlignClass
              )}
            >
              {footerItems.map((item) => {
                if (!item.visible) return null;
                
                if (item.type === 'image') {
                  return item.url ? (
                    <div key={item.id} className="my-2.5">
                      <img 
                        src={item.url} 
                        alt="Footer" 
                        className="h-14 w-auto object-contain mx-auto rounded-xl grayscale opacity-80" 
                        style={{ filter: 'grayscale(1) contrast(1.2)' }}
                      />
                    </div>
                  ) : null;
                }
                
                return item.text ? (
                  <p 
                    key={item.id}
                    className={cn(
                      "font-semibold leading-relaxed tracking-wide truncate max-w-full",
                      {
                        'text-left': item.alignment === 'left',
                        'text-center': item.alignment === 'center',
                        'text-right': item.alignment === 'right',
                      }
                    )}
                  >
                    {item.text}
                  </p>
                ) : null;
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Draggable Sortable Item Child Component
// ─────────────────────────────────────────────────────────────────────────────
interface SortableFooterItemProps {
  item: ReceiptFooterItem;
  updateText: (id: string, text: string) => void;
  updateAlignment: (id: string, alignment: 'left' | 'center' | 'right') => void;
  toggleVisibility: (id: string) => void;
  deleteImg: () => void;
  triggerUploadClick: () => void;
}

const SortableFooterItem = memo(function SortableFooterItem({
  item,
  updateText,
  updateAlignment,
  toggleVisibility,
  deleteImg,
  triggerUploadClick
}: SortableFooterItemProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: item.id
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 50 : 'auto',
  };

  return (
    <div 
      ref={setNodeRef}
      style={style}
      className={cn(
        "flex items-center gap-3 p-3.5 rounded-xl border border-border bg-card shadow-sm group hover:border-primary/30 transition-all",
        isDragging && "shadow-lg border-primary/40 bg-accent/40"
      )}
    >
      {/* Grab handle */}
      <button 
        type="button" 
        {...attributes} 
        {...listeners} 
        className="cursor-grab text-muted-foreground/40 hover:text-muted-foreground/80 shrink-0 h-6 w-6 flex items-center justify-center rounded-md hover:bg-muted/40 transition-colors"
      >
        <GripVertical className="w-4 h-4" />
      </button>

      {/* Visiblity Toggle switch */}
      <button
        type="button"
        onClick={() => toggleVisibility(item.id)}
        className={cn(
          "h-6 w-6 flex items-center justify-center rounded-md shrink-0 transition-all border border-border shadow-sm",
          item.visible ? "bg-primary/5 text-primary border-primary/20" : "bg-muted text-muted-foreground/60"
        )}
      >
        {item.visible ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
      </button>

      {/* Content Customizer Blocks */}
      <div className="flex-1 min-w-0">
        {item.type === 'image' ? (
          /* Render image editor block */
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg border border-border bg-muted flex items-center justify-center shrink-0 overflow-hidden relative grayscale select-none">
              {item.url ? (
                <img src={item.url} alt="Footer Preview" className="w-full h-full object-contain" />
              ) : (
                <ImageIcon className="w-4 h-4 text-muted-foreground/50" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-bold text-foreground">Logo / Banner Penutup Struk</p>
              <div className="flex items-center gap-2 mt-1">
                <Button 
                  type="button"
                  variant="outline"
                  size="xs"
                  onClick={triggerUploadClick}
                  className="h-6 text-[9px] font-bold rounded-lg gap-1 border border-border hover:bg-muted"
                >
                  <Camera className="w-2.5 h-2.5" /> {item.url ? 'Ganti' : 'Upload'}
                </Button>
                {item.url && (
                  <Button 
                    type="button"
                    variant="ghost"
                    size="xs"
                    onClick={deleteImg}
                    className="h-6 text-[9px] font-bold text-destructive hover:text-destructive hover:bg-destructive/5 rounded-lg gap-1"
                  >
                    <Trash2 className="w-2.5 h-2.5" /> Hapus
                  </Button>
                )}
              </div>
            </div>
          </div>
        ) : (
          /* Render text editor block */
          <div className="flex items-center gap-2.5">
            <Input 
              value={item.text || ''}
              onChange={e => updateText(item.id, e.target.value)}
              placeholder="Baris Teks Footer (Kosongkan jika tidak dipakai)"
              className="h-8 text-xs flex-1 rounded-lg"
              maxLength={40}
              disabled={!item.visible}
            />
            
            {/* Alignment Selector button row */}
            <div className="flex border border-border rounded-lg p-0.5 bg-muted/40 h-8 shrink-0">
              {(['left', 'center', 'right'] as const).map((align) => (
                <button
                  key={align}
                  type="button"
                  disabled={!item.visible}
                  onClick={() => updateAlignment(item.id, align)}
                  className={cn(
                    "w-6 h-full flex items-center justify-center rounded-md transition-all text-[10px] uppercase font-bold",
                    item.alignment === align && item.visible
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground/60 hover:text-foreground disabled:opacity-50"
                  )}
                >
                  {align === 'left' && 'L'}
                  {align === 'center' && 'C'}
                  {align === 'right' && 'R'}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
});
