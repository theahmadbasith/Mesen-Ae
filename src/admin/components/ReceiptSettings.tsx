import { useState, useEffect, useRef } from 'react';
import { 
  Camera, Save, Loader2, CheckCircle2, Printer, ImageIcon,
  Sliders, Type, AlignCenter, Trash2, GripVertical, Store, Utensils, Coffee, Zap
} from 'lucide-react';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
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
  fontSize: number;
  lineHeight: 'tight' | 'normal' | 'relaxed';
  alignment: 'left' | 'center' | 'right';
  compactMode: boolean;
  paperWidth: '58mm' | '80mm';
}

interface ReceiptSettingsProps {
  storeSettings: StoreSettings | undefined;
  hasEditAccess: boolean;
}

type TemplateType = 'minimarket' | 'fnb' | 'classic' | 'minimalis';
type FooterBlock = 'line1' | 'line2' | 'image';

// ─── Sortable Footer Item ────────────────────────────────────────────
function SortableFooterItem({ id, children }: { id: string; children: React.ReactNode }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : 1,
    position: 'relative' as const,
  };
  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'flex items-center gap-3 bg-background rounded-xl border transition-all',
        isDragging ? 'shadow-lg border-primary/30 opacity-90' : 'border-border/80 hover:border-primary/20'
      )}
    >
      <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground px-3 py-4 touch-none">
        <GripVertical className="w-4 h-4" />
      </div>
      <div className="flex-1 py-3 pr-3">{children}</div>
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────────────
export default function ReceiptSettings({ storeSettings, hasEditAccess }: ReceiptSettingsProps) {
  const [hasInitialized, setHasInitialized] = useState(false);

  // Template
  const [template, setTemplate] = useState<TemplateType>('fnb');

  // Paper Width
  const [paperWidth, setPaperWidth] = useState<'58mm' | '80mm'>('58mm');

  // Typography
  const [fontFamily, setFontFamily] = useState<'monospace' | 'sans-serif' | 'courier' | 'receipt-font'>('receipt-font');
  const [fontSize, setFontSize] = useState<number>(11);
  const [lineHeight, setLineHeight] = useState<'tight' | 'normal' | 'relaxed'>('tight');
  const [compactMode] = useState(true);

  // Footer
  const [footerLine1, setFooterLine1] = useState('');
  const [footerLine2, setFooterLine2] = useState('');
  const [footerImg, setFooterImg] = useState<string | undefined>();
  const [footerOrder, setFooterOrder] = useState<FooterBlock[]>(['line1', 'line2', 'image']);

  // Crop
  const [cropOpen, setCropOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  // Save
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  // ─── Initialize ────────────────────────────────────────────────────
  useEffect(() => {
    if (storeSettings && !hasInitialized) {
      const s = storeSettings as any;
      // Template - migrate finedining to classic
      const tmpl = s.receiptTemplate ?? 'fnb';
      setTemplate(tmpl === 'finedining' ? 'classic' : tmpl);

      // Typography
      const typo = s.receiptTypography || {};
      setFontFamily(typo.fontFamily ?? 'receipt-font');

      // Migrate string fontSize to number
      const storedSize = typo.fontSize;
      if (typeof storedSize === 'number') {
        setFontSize(storedSize);
      } else if (typeof storedSize === 'string') {
        const sizeMap: Record<string, number> = { xs: 9, sm: 11, md: 13, lg: 15, xl: 17 };
        setFontSize(sizeMap[storedSize] ?? 11);
      }

      setLineHeight(typo.lineHeight ?? 'tight');
      setPaperWidth(typo.paperWidth ?? '58mm');

      // Footer
      setFooterImg(s.receiptFooterImg || '');
      setFooterOrder(s.receiptFooterOrder ?? ['line1', 'line2', 'image']);

      const oldLines = s.receiptFooterLines || [];
      const oldText = s.receiptFooter || '';
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
    return () => { if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current); };
  }, []);

  // ─── Auto-Save ─────────────────────────────────────────────────────
  const triggerAutoSave = (
    tmpl = template, img = footerImg, l1 = footerLine1, l2 = footerLine2,
    order = footerOrder, font = fontFamily, size = fontSize,
    lh = lineHeight, width = paperWidth
  ) => {
    if (!hasEditAccess) return;
    setSaveStatus('saving');
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);

    saveTimeoutRef.current = setTimeout(async () => {
      try {
        await executeSave(tmpl, img, l1, l2, order, font, size, lh, width);
        setSaveStatus('saved');
      } catch (err: any) {
        setSaveStatus('error');
        toast.error('Gagal menyimpan: ' + err.message);
      }
    }, 1500);
  };

  const executeSave = async (
    tmpl = template, img = footerImg, l1 = footerLine1, l2 = footerLine2,
    order = footerOrder, font = fontFamily, size = fontSize,
    lh = lineHeight, width = paperWidth
  ) => {
    if (!storeSettings?.id) return;

    let finalImgUrl = img;
    if (img && img.startsWith('data:image')) {
      const res = await fetch(img);
      const blob = await res.blob();
      const compressedDataUrl = await compressImage(blob, 0.2);
      const folderPath = `stores/${storeSettings.id}/receipt`;
      const uploadedUrl = await dbUploadFile(folderPath, 'footer-image.webp', compressedDataUrl);
      if (uploadedUrl) {
        const oldUrl = (storeSettings as any).receiptFooterImg;
        if (oldUrl && oldUrl !== uploadedUrl) await dbDeleteFile(oldUrl);
        finalImgUrl = uploadedUrl;
      }
    } else if (!img) {
      const oldUrl = (storeSettings as any).receiptFooterImg;
      if (oldUrl) await dbDeleteFile(oldUrl);
    }

    await dbUpdate('storeSettings', storeSettings.id, {
      receiptTemplate: tmpl,
      receiptShowLogo: true,
      receiptShowCashier: true,
      receiptShowCustomer: true,
      receiptShowTable: true,
      receiptHeaderTitle: '',
      receiptTypography: {
        fontFamily: font,
        fontSize: size,
        lineHeight: lh,
        alignment: 'center',
        compactMode: true,
        paperWidth: width
      },
      receiptFooterImg: finalImgUrl || null,
      receiptFooterLines: [l1.trim(), l2.trim()],
      receiptFooterOrder: order,
    });
  };

  const handleManualSave = async () => {
    if (!hasEditAccess) { toast.error('Akses ditolak.'); return; }
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

  // DnD handler
  const handleFooterDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = footerOrder.indexOf(active.id as FooterBlock);
      const newIndex = footerOrder.indexOf(over.id as FooterBlock);
      const newOrder = arrayMove(footerOrder, oldIndex, newIndex);
      setFooterOrder(newOrder);
      triggerAutoSave(template, footerImg, footerLine1, footerLine2, newOrder);
    }
  };

  // ─── Loading ───────────────────────────────────────────────────────
  if (!storeSettings) {
    return (
      <div className="flex flex-col items-center justify-center p-12 space-y-4">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground font-medium animate-pulse">Memuat Pengaturan Struk...</p>
      </div>
    );
  }

  // ─── Font class mapper ─────────────────────────────────────────────
  const previewFontClass = cn({
    'font-mono tracking-tighter': fontFamily === 'receipt-font',
    'font-mono': fontFamily === 'monospace',
    'font-sans tracking-tight': fontFamily === 'sans-serif',
    'font-serif': fontFamily === 'courier'
  });

  // ─── Mock Data ─────────────────────────────────────────────────────
  const mockItems = {
    minimarket: [
      { name: 'KOPIKO 78C 240ML', qty: 2, price: 5500, total: 11000 },
      { name: 'I/F BISC WNDRLND 300', qty: 1, price: 20900, total: 20900 },
      { name: 'ABC ORANGE 525ML', qty: 1, price: 13500, total: 13500 },
    ],
    fnb: [
      { name: 'Bakmie Ayam', notes: 'Pedas', qty: 1, price: 24000, total: 24000 },
      { name: 'Es Teh Manis', notes: 'Gula Sedikit', qty: 2, price: 5000, total: 10000 },
    ],
    classic: [
      { name: 'Nasi Goreng Spesial', qty: 1, price: 28000, total: 28000 },
      { name: 'Jus Alpukat', qty: 1, price: 15000, total: 15000 },
    ],
    minimalis: [
      { name: 'Americano', qty: 2, price: 22000, total: 44000 },
      { name: 'Croissant', qty: 1, price: 18000, total: 18000 },
    ],
  };

  const rp = (n: number) => n.toLocaleString('id-ID');

  // ─── Template configs ──────────────────────────────────────────────
  const templates: { key: TemplateType; label: string; icon: React.ReactNode }[] = [
    { key: 'minimarket', label: 'Minimarket', icon: <Store className="w-5 h-5" /> },
    { key: 'fnb', label: 'Kafe / Resto', icon: <Utensils className="w-5 h-5" /> },
    { key: 'classic', label: 'Klasik', icon: <Coffee className="w-5 h-5" /> },
    { key: 'minimalis', label: 'Minimalis', icon: <Zap className="w-5 h-5" /> },
  ];

  // ─── Render ────────────────────────────────────────────────────────
  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start animate-in fade-in duration-200">
      {/* ═══ LEFT: Controls ═══ */}
      <div className="lg:col-span-7 space-y-6">
        <Card className="rounded-2xl p-6 border border-border shadow-sm space-y-6 bg-card">
          {/* Header */}
          <div className="flex items-center justify-between pb-4 border-b border-border/80">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Sliders className="w-5 h-5 text-primary" />
              </div>
              <h3 className="text-sm font-semibold text-foreground">Pengaturan Struk</h3>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-[10px] font-medium hidden sm:block">
                {saveStatus === 'saving' && <span className="text-amber-500 flex items-center gap-1"><Loader2 className="w-3 h-3 animate-spin" /> Menyimpan...</span>}
                {saveStatus === 'saved' && <span className="text-emerald-500 flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Tersimpan</span>}
                {saveStatus === 'error' && <span className="text-destructive">⚠️ Gagal</span>}
              </span>
              <Button onClick={handleManualSave} disabled={isSaving} size="sm" className="h-8 rounded-xl px-3 text-[11px] font-bold gap-1.5 shadow-sm">
                {isSaving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />} Simpan
              </Button>
            </div>
          </div>

          {/* §1 — Template Selection */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground uppercase tracking-wider">
              <Sliders className="w-3.5 h-3.5 text-primary/70" /> Tema Struk
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {templates.map(t => (
                <button
                  key={t.key}
                  onClick={() => { setTemplate(t.key); triggerAutoSave(t.key); }}
                  className={cn(
                    "flex flex-col items-center justify-center p-3 rounded-xl border-2 transition-all gap-1.5 relative overflow-hidden",
                    template === t.key
                      ? "bg-primary/5 border-primary text-primary shadow-sm"
                      : "bg-card border-border hover:border-primary/40 hover:bg-muted/50 text-muted-foreground"
                  )}
                >
                  {template === t.key && (
                    <div className="absolute top-0 right-0 w-6 h-6 bg-primary rounded-bl-xl flex items-center justify-center">
                      <CheckCircle2 className="w-3 h-3 text-white" />
                    </div>
                  )}
                  {t.icon}
                  <span className="text-[11px] font-bold">{t.label}</span>
                </button>
              ))}
            </div>

            {/* Paper Width */}
            <div className="flex items-center gap-3 mt-2">
              <Label className="text-xs font-semibold text-muted-foreground whitespace-nowrap">Lebar Kertas</Label>
              <div className="flex border border-border rounded-xl p-1 bg-muted/40 h-9 w-[160px]">
                {(['58mm', '80mm'] as const).map(w => (
                  <button
                    key={w}
                    type="button"
                    onClick={() => { setPaperWidth(w); triggerAutoSave(template, footerImg, footerLine1, footerLine2, footerOrder, fontFamily, fontSize, lineHeight, w); }}
                    className={cn("flex-1 text-[11px] font-bold rounded-lg transition-all h-full", paperWidth === w ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}
                  >{w}</button>
                ))}
              </div>
            </div>
          </div>

          {/* §2 — Typography */}
          <div className="space-y-3 pt-5 border-t border-border/50">
            <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground uppercase tracking-wider">
              <Type className="w-3.5 h-3.5 text-primary/70" /> Tipografi
            </div>
            <div className="grid grid-cols-3 gap-3 bg-muted/20 p-3 rounded-xl border border-border/50">
              <div className="space-y-1.5">
                <Label className="text-[11px] font-bold">Jenis Font</Label>
                <select
                  value={fontFamily}
                  onChange={e => { setFontFamily(e.target.value as any); triggerAutoSave(template, footerImg, footerLine1, footerLine2, footerOrder, e.target.value as any); }}
                  className="w-full text-xs h-9 px-2 rounded-lg border border-border bg-background focus:ring-2 focus:ring-primary/20 outline-none"
                >
                  <option value="receipt-font">Thermal</option>
                  <option value="monospace">Monospace</option>
                  <option value="sans-serif">Sans-Serif</option>
                  <option value="courier">Courier</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-[11px] font-bold">Ukuran Font</Label>
                <Input
                  type="number"
                  min={8}
                  max={16}
                  step={1}
                  value={fontSize}
                  onChange={e => { const v = Number(e.target.value); setFontSize(v); triggerAutoSave(template, footerImg, footerLine1, footerLine2, footerOrder, fontFamily, v); }}
                  className="h-9 text-xs rounded-lg"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[11px] font-bold">Spasi Baris</Label>
                <select
                  value={lineHeight}
                  onChange={e => { setLineHeight(e.target.value as any); triggerAutoSave(template, footerImg, footerLine1, footerLine2, footerOrder, fontFamily, fontSize, e.target.value as any); }}
                  className="w-full text-xs h-9 px-2 rounded-lg border border-border bg-background focus:ring-2 focus:ring-primary/20 outline-none"
                >
                  <option value="tight">Rapat</option>
                  <option value="normal">Normal</option>
                  <option value="relaxed">Renggang</option>
                </select>
              </div>
            </div>
          </div>

          {/* §3 — Footer Editor (DnD) */}
          <div className="space-y-3 pt-5 border-t border-border/50">
            <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground uppercase tracking-wider">
              <AlignCenter className="w-3.5 h-3.5 text-primary/70" /> Penutup Struk
            </div>
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleFooterDragEnd}>
              <SortableContext items={footerOrder} strategy={verticalListSortingStrategy}>
                <div className="space-y-2">
                  {footerOrder.map(block => (
                    <SortableFooterItem key={block} id={block}>
                      {block === 'line1' && (
                        <div className="space-y-1.5">
                          <Label className="text-[10px] font-bold uppercase text-primary/80">Teks Utama</Label>
                          <textarea
                            value={footerLine1}
                            onChange={e => { setFooterLine1(e.target.value); triggerAutoSave(template, footerImg, e.target.value); }}
                            className="w-full text-xs p-2.5 rounded-lg border border-border bg-muted/30 focus:bg-background focus:ring-1 focus:ring-primary h-12 resize-none transition-all placeholder:text-muted-foreground/40"
                            placeholder="Terima Kasih Atas Kunjungan Anda"
                          />
                        </div>
                      )}
                      {block === 'line2' && (
                        <div className="space-y-1.5">
                          <Label className="text-[10px] font-bold uppercase text-primary/80">Info Tambahan</Label>
                          <textarea
                            value={footerLine2}
                            onChange={e => { setFooterLine2(e.target.value); triggerAutoSave(template, footerImg, footerLine1, e.target.value); }}
                            className="w-full text-xs p-2.5 rounded-lg border border-border bg-muted/30 focus:bg-background focus:ring-1 focus:ring-primary h-12 resize-none transition-all placeholder:text-muted-foreground/40"
                            placeholder="Kritik & Saran: 0812-xxxx-xxxx"
                          />
                        </div>
                      )}
                      {block === 'image' && (
                        <div className="space-y-1.5">
                          <Label className="text-[10px] font-bold uppercase text-primary/80">Gambar Footer</Label>
                          <div className="flex gap-3 items-center">
                            <div className="h-12 w-12 rounded-xl border border-border bg-background flex items-center justify-center overflow-hidden grayscale shadow-inner shrink-0">
                              {footerImg ? <img src={footerImg} className="w-full h-full object-contain p-0.5" /> : <ImageIcon className="w-4 h-4 text-muted-foreground/30" />}
                            </div>
                            <div className="flex flex-col gap-1.5">
                              <Button type="button" variant={footerImg ? "outline" : "default"} size="sm" onClick={() => fileInputRef.current?.click()} className={cn("h-7 text-[10px] px-3 rounded-lg", !footerImg && "bg-primary text-primary-foreground hover:bg-primary/90")}>
                                <Camera className="w-3 h-3 mr-1.5" /> {footerImg ? 'Ganti' : 'Unggah'}
                              </Button>
                              {footerImg && (
                                <Button type="button" variant="ghost" size="sm" onClick={() => { setFooterImg(undefined); triggerAutoSave(template, undefined); }} className="h-6 text-[10px] px-2 text-destructive hover:bg-destructive/10 rounded-lg justify-start">
                                  <Trash2 className="w-3 h-3 mr-1" /> Hapus
                                </Button>
                              )}
                            </div>
                          </div>
                        </div>
                      )}
                    </SortableFooterItem>
                  ))}
                </div>
              </SortableContext>
            </DndContext>
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageFileSelect} />
          </div>
        </Card>
      </div>

      {/* ═══ RIGHT: Live Preview ═══ */}
      <div className="lg:col-span-5 flex justify-center sticky top-20">
        <div className="flex flex-col items-center w-full">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Printer className="w-4 h-4 text-primary" />
            <h4 className="text-xs font-bold text-foreground uppercase tracking-widest">Preview Struk</h4>
          </div>

          <div
            className={cn(
              "bg-white text-black p-5 sm:p-6 shadow-2xl border border-gray-200 transition-all duration-500 select-none",
              paperWidth === '58mm' ? "w-[280px]" : "w-[360px]",
              previewFontClass
            )}
            style={{
              fontSize: `${fontSize}px`,
              lineHeight: lineHeight === 'tight' ? '1.15' : lineHeight === 'relaxed' ? '1.5' : '1.3',
              clipPath: 'polygon(0 0, 100% 0, 100% calc(100% - 6px), 98% 100%, 96% calc(100% - 6px), 94% 100%, 92% calc(100% - 6px), 90% 100%, 88% calc(100% - 6px), 86% 100%, 84% calc(100% - 6px), 82% 100%, 80% calc(100% - 6px), 78% 100%, 76% calc(100% - 6px), 74% 100%, 72% calc(100% - 6px), 70% 100%, 68% calc(100% - 6px), 66% 100%, 64% calc(100% - 6px), 62% 100%, 60% calc(100% - 6px), 58% 100%, 56% calc(100% - 6px), 54% 100%, 52% calc(100% - 6px), 50% 100%, 48% calc(100% - 6px), 46% 100%, 44% calc(100% - 6px), 42% 100%, 40% calc(100% - 6px), 38% 100%, 36% calc(100% - 6px), 34% 100%, 32% calc(100% - 6px), 30% 100%, 28% calc(100% - 6px), 26% 100%, 24% calc(100% - 6px), 22% 100%, 20% calc(100% - 6px), 18% 100%, 16% calc(100% - 6px), 14% 100%, 12% calc(100% - 6px), 10% 100%, 8% calc(100% - 6px), 6% 100%, 4% calc(100% - 6px), 2% 100%, 0 calc(100% - 6px))'
            }}
          >
            {/* ── MINIMARKET ── */}
            {template === 'minimarket' && (
              <div className="w-full text-left">
                <div className="mb-3">
                  <div className="w-28 h-8 mb-2 grayscale">
                    <img src={storeSettings.logo || '/placeholder.png'} className="w-full h-full object-contain object-left" />
                  </div>
                  <h2 className="font-extrabold">{storeSettings.storeName?.toUpperCase() || 'TOKO SUMBER BERKAH'}</h2>
                  <p>{storeSettings.address?.toUpperCase() || 'JL. KEBANGSAAN NO. 12'}</p>
                </div>
                <div className="mb-2 uppercase">
                  <div className="flex gap-2 flex-wrap">
                    <span>29.05.26-17:08</span>
                    <span>K:BASITH</span>
                    <span>Meja:01</span>
                  </div>
                  <span>Pelanggan: Ahmad</span>
                </div>
                <div className="border-t border-dashed border-black my-2" />
                <div className="space-y-0 uppercase">
                  {mockItems.minimarket.map((item, i) => (
                    <div key={i} className="flex justify-between leading-tight">
                      <span className="flex-1 pr-1">{item.name}</span>
                      <span className="w-4 text-center">{item.qty}</span>
                      <span className="w-14 text-right">{rp(item.price)}</span>
                      <span className="w-14 text-right">{rp(item.total)}</span>
                    </div>
                  ))}
                </div>
                <div className="border-t border-dashed border-black my-2" />
                <div className="space-y-0.5 uppercase">
                  <div className="flex justify-end gap-4">
                    <span>HARGA JUAL :</span><span className="w-16 text-right">{rp(45400)}</span>
                  </div>
                  <div className="border-t border-dashed border-black my-1" />
                  <div className="flex justify-end gap-4 font-extrabold text-[1.1em]">
                    <span>TOTAL :</span><span className="w-16 text-right">{rp(45400)}</span>
                  </div>
                  <div className="flex justify-end gap-4">
                    <span>TUNAI :</span><span className="w-16 text-right">{rp(50000)}</span>
                  </div>
                  <div className="flex justify-end gap-4">
                    <span>KEMBALI :</span><span className="w-16 text-right">{rp(4600)}</span>
                  </div>
                </div>
              </div>
            )}

            {/* ── FNB (Kafe/Resto) ── */}
            {template === 'fnb' && (
              <div className="w-full text-left">
                <div className="text-center mb-4">
                  <div className="w-14 h-14 mx-auto mb-2 grayscale">
                    <img src={storeSettings.logo || '/placeholder.png'} className="w-full h-full object-contain" />
                  </div>
                  <h2 className="font-bold text-[1.2em]">{storeSettings.storeName?.toUpperCase() || 'KOPI NUSANTARA'}</h2>
                  <p className="opacity-90">{storeSettings.address || 'Jl. Dr Soetomo No. 93'}</p>
                </div>
                <div className="mb-2">
                  <div className="grid grid-cols-[55px_auto] gap-x-1">
                    <span>No</span><span>: SI-MN4KU-106</span>
                    <span>Tanggal</span><span>: 29 Mei 2026, 19.14</span>
                    <span>Kasir</span><span>: Crew</span>
                    <span>Nama</span><span>: Ahmad</span>
                    <span>Jenis</span><span>: Dine In (Meja 04)</span>
                  </div>
                </div>
                <div className="border-t border-dashed border-black my-2" />
                <div className="space-y-2">
                  {mockItems.fnb.map((item: any, i) => (
                    <div key={i} className="leading-tight">
                      <div className="font-bold">{item.name}</div>
                      <div className="flex justify-between text-[0.9em]">
                        <span>{item.qty} x {rp(item.price)} = {rp(item.total)}</span>
                      </div>
                      {item.notes && <div className="opacity-80">Catatan: {item.notes}</div>}
                    </div>
                  ))}
                </div>
                <div className="border-t border-dashed border-black my-2" />
                <div className="grid grid-cols-[75px_auto] gap-x-1 ml-auto max-w-[200px]">
                  <span>Subtotal</span><span>: {rp(34000)}</span>
                  <span className="font-extrabold text-[1.1em]">Total</span><span className="font-extrabold text-[1.1em]">: {rp(34000)}</span>
                  <span>Bayar</span><span>: QRIS</span>
                </div>
              </div>
            )}

            {/* ── CLASSIC ── */}
            {template === 'classic' && (
              <div className="w-full">
                <div className="text-center mb-3">
                  <div className="w-16 h-16 mx-auto mb-2 grayscale">
                    <img src={storeSettings.logo || '/placeholder.png'} className="w-full h-full object-contain" />
                  </div>
                  <h2 className="font-extrabold text-[1.25em] tracking-wide">{storeSettings.storeName || 'Toko Saya'}</h2>
                  {storeSettings.address && <p className="text-[0.85em] mt-1 leading-tight">{storeSettings.address}</p>}
                  {storeSettings.phone && <p className="text-[0.85em] leading-tight">{storeSettings.phone}</p>}
                </div>
                <div className="border-t border-dashed border-black/60 my-2" />
                <div className="text-[0.9em] space-y-0.5">
                  <div className="flex justify-between"><span>No. Struk: SI-CL-042</span><span>Tunai</span></div>
                  <div className="flex justify-between"><span>29/05/2026</span><span>19:30</span></div>
                </div>
                <div className="border-t border-dashed border-black/40 my-2" />
                <div className="space-y-0.5 text-[0.85em] text-left">
                  <div className="flex justify-between"><span className="text-gray-500">Kasir:</span><span className="font-semibold">Basith</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">Pelanggan:</span><span className="font-semibold">Ahmad</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">Meja / Tipe:</span><span className="font-bold">Meja 03</span></div>
                </div>
                <div className="border-t border-dashed border-black/60 my-2" />
                <div className="space-y-1.5">
                  {mockItems.classic.map((item, i) => (
                    <div key={i} className="text-[0.95em]">
                      <div className="flex justify-between font-semibold"><span>{item.name}</span><span>{rp(item.total)}</span></div>
                      <div className="text-[0.85em] text-gray-500 pl-2">{item.qty} x {rp(item.price)}</div>
                    </div>
                  ))}
                </div>
                <div className="border-t border-dashed border-black/60 my-2" />
                <div className="space-y-1 text-[0.9em]">
                  <div className="flex justify-between"><span className="text-gray-600">Subtotal</span><span>{rp(43000)}</span></div>
                  <div className="flex justify-between font-black text-[1.15em] border-t border-gray-300 pt-1.5 mt-1.5"><span>Total</span><span>{rp(43000)}</span></div>
                  <div className="flex justify-between mt-1"><span className="text-gray-600">Bayar</span><span>{rp(50000)}</span></div>
                  <div className="flex justify-between"><span className="text-gray-600">Kembali</span><span>{rp(7000)}</span></div>
                </div>
              </div>
            )}

            {/* ── MINIMALIS ── */}
            {template === 'minimalis' && (
              <div className="w-full text-center">
                <div className="mb-4">
                  <div className="w-10 h-10 mx-auto mb-2 grayscale">
                    <img src={storeSettings.logo || '/placeholder.png'} className="w-full h-full object-contain" />
                  </div>
                  <h2 className="font-bold text-[1.1em]">{storeSettings.storeName || 'Toko'}</h2>
                </div>
                <div className="border-t border-solid border-black/20 my-3" />
                <div className="text-[0.85em] opacity-80 flex justify-between">
                  <span>29/05/2026</span><span>SI-MN-099</span>
                </div>
                <div className="text-[0.8em] text-left space-y-0.5 mt-1 mb-2">
                  <div className="flex justify-between"><span className="opacity-60">Kasir</span><span>Basith</span></div>
                  <div className="flex justify-between"><span className="opacity-60">Pelanggan</span><span>Ahmad</span></div>
                  <div className="flex justify-between"><span className="opacity-60">Meja</span><span>05</span></div>
                </div>
                <div className="border-t border-solid border-black/20 my-3" />
                <div className="space-y-1 text-left">
                  {mockItems.minimalis.map((item, i) => (
                    <div key={i} className="flex justify-between">
                      <span>{item.qty}x {item.name}</span>
                      <span>{rp(item.total)}</span>
                    </div>
                  ))}
                </div>
                <div className="border-t border-solid border-black/20 my-3" />
                <div className="flex justify-between font-bold text-[1.15em]">
                  <span>Total</span><span>{rp(62000)}</span>
                </div>
                <div className="flex justify-between text-[0.85em] opacity-80 mt-1">
                  <span>Pembayaran</span><span>QRIS</span>
                </div>
              </div>
            )}

            {/* ── Dynamic Footer ── */}
            <div className="border-t border-black mt-4 mb-3 opacity-40" />
            <div className="text-center space-y-2 pb-8">
              {footerOrder.map((block, idx) => {
                if (block === 'line1' && footerLine1) {
                  return <p key={idx} className="whitespace-pre-wrap leading-relaxed font-semibold">{footerLine1}</p>;
                }
                if (block === 'line2' && footerLine2) {
                  return <p key={idx} className="whitespace-pre-wrap opacity-75 leading-snug">{footerLine2}</p>;
                }
                if (block === 'image' && footerImg) {
                  return (
                    <div key={idx} className="my-2">
                      <img
                        src={footerImg}
                        className="max-w-20 h-auto mx-auto object-contain grayscale rounded-xl mix-blend-multiply"
                        style={{ filter: 'grayscale(1) contrast(1.2) brightness(0.9)' }}
                        alt="Footer"
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

      {/* Crop Modal */}
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
