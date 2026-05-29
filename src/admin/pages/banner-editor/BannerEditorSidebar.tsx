import React from 'react';
import { Image as ImageIcon, Sparkles, FlipHorizontal, Type, Palette, Layout, SlidersHorizontal, Check, Trash } from 'lucide-react';
import {
  useBannerEditor, cn, Button, Input, Label, Switch, PanelSection,
  ColorPicker, SliderRow, RichTextEditor, Wand2Icon, OverlayData
} from './BannerEditorContext';
import EraserBackgroundModal from './EraserBackgroundModal';

// ============================================================================
// SIDEBAR FORM CONTENT (shared between desktop sidebar and mobile bottom sheet)
// ============================================================================

const SidebarFormContent = React.memo(function SidebarFormContent() {
  const ctx = useBannerEditor();
  const [magicWandId, setMagicWandId] = React.useState<string | null>(null);

  const handleSaveMagicWand = (newBase64: string) => {
    ctx.setOverlays((prev: OverlayData[]) => prev.map(o => o.id === magicWandId ? { ...o, imageUrl: newBase64 } : o));
    setTimeout(() => ctx.pushHistory(), 50);
  };

  const magicWandUrl = ctx.overlays.find((o: OverlayData) => o.id === magicWandId)?.imageUrl || null;

  return (
    <div className="space-y-6">
      <EraserBackgroundModal 
        open={!!magicWandId} 
        onOpenChange={(open) => { if (!open) setMagicWandId(null); }}
        imageUrl={magicWandUrl}
        onSave={handleSaveMagicWand}
      />
      
      {/* 1. KONTEN TEKS & LINK */}
      <PanelSection title="Konten Teks & Tautan" icon={Type} defaultOpen={true}>
        <div className="space-y-4 pt-1">
          <div>
            <Label>Heading (Label Kotak)</Label>
            <RichTextEditor value={ctx.bannerHeading} onChange={(v: string) => ctx.setBannerHeading(v)} placeholder="Contoh: SPESIAL PENAWARAN" />
          </div>
          <div>
            <Label>Gaya Kotak Heading</Label>
            <select value={ctx.bannerHeadingStyle} onChange={(e) => ctx.setBannerHeadingStyle(e.target.value)} className="w-full h-10 px-3 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-sm outline-none text-zinc-900 dark:text-zinc-100">
              <option value="glass">Glassmorphism</option>
              <option value="solid-white">Solid Putih</option>
              <option value="solid-dark">Solid Gelap</option>
              <option value="outline-white">Garis Tepi Putih</option>
              <option value="neon">Neon Cyan</option>
              <option value="retro">Retro Brutalist</option>
            </select>
          </div>
          <div>
            <Label>Judul Utama</Label>
            <RichTextEditor value={ctx.bannerTitle} onChange={(v: string) => ctx.setBannerTitle(v)} placeholder="Contoh: Promo Berkah Idul Adha" />
          </div>
          <div>
            <Label>Deskripsi</Label>
            <RichTextEditor value={ctx.bannerDescription} onChange={(v: string) => ctx.setBannerDescription(v)} placeholder="Contoh: Nikmati diskon spesial..." minHeight="72px" />
          </div>
          <div>
            <Label>Teks Tombol (Badge)</Label>
            <Input value={ctx.bannerButtonText} onChange={(e: any) => ctx.setBannerButtonText(e.target.value)} placeholder="Contoh: Lihat Detail" />
          </div>
          <div>
            <Label>Gaya Tombol</Label>
            <select value={ctx.bannerBadgeStyle} onChange={(e) => ctx.setBannerBadgeStyle(e.target.value)} className="w-full h-10 px-3 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-sm outline-none text-zinc-900 dark:text-zinc-100">
              <option value="solid">Solid Putih</option>
              <option value="outline">Outline Putih</option>
              <option value="glass">Glassmorphism</option>
              <option value="soft-dark">Soft Dark</option>
              <option value="neon">Neon Cyan</option>
              <option value="retro">Retro Brutalist</option>
            </select>
          </div>
          <div>
            <Label>Link Tujuan Tombol</Label>
            <Input value={ctx.bannerLink} onChange={(e: any) => ctx.setBannerLink(e.target.value)} placeholder="https://... atau tautan tujuan" />
          </div>
        </div>
      </PanelSection>

      {/* 2. DESAIN & GAYA LATAR BELAKANG */}
      <PanelSection title="Desain & Gaya Latar Belakang" icon={Layout} defaultOpen={false}>
        <div className="space-y-5 pt-1">
          <div>
            <p className="text-[10px] font-black uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-3">Tipe Background</p>
            <div className="flex bg-zinc-100 dark:bg-zinc-900 p-1 rounded-xl">
              {['solid', 'gradient', 'image'].map(t => (
                <button key={t} onClick={() => { ctx.setBannerBgType(t); ctx.pushHistory({ ...ctx.getSnapshot(), bgType: t }); }}
                  className={cn('flex-1 h-9 rounded-lg text-xs font-bold capitalize transition-all', ctx.bannerBgType === t ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300')}>
                  {t}
                </button>
              ))}
            </div>
          </div>

          {ctx.bannerBgType === 'solid' && (
            <div>
              <p className="text-[10px] font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-3">Warna Solid</p>
              <ColorPicker value={ctx.bannerBgColor} onChange={(c: string) => { ctx.setBannerBgColor(c); ctx.pushHistory({ ...ctx.getSnapshot(), bgColor: c }); }} />
            </div>
          )}

          {ctx.bannerBgType === 'gradient' && (
            <div className="space-y-4">
              <p className="text-[10px] font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">Pengaturan Gradasi</p>
              <div className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 space-y-4 bg-white dark:bg-zinc-900/30">
                <div>
                  <Label>Warna Kiri</Label>
                  <ColorPicker value={ctx.bannerGradientLeft} onChange={(c: string) => { ctx.setBannerGradientLeft(c); ctx.pushHistory({ ...ctx.getSnapshot(), gradientLeft: c }); }} />
                </div>
                <div className="pt-4 border-t border-zinc-200 dark:border-zinc-800">
                  <Label>Warna Kanan</Label>
                  <ColorPicker value={ctx.bannerGradientRight} onChange={(c: string) => { ctx.setBannerGradientRight(c); ctx.pushHistory({ ...ctx.getSnapshot(), gradientRight: c }); }} />
                </div>
                <div className="pt-4 border-t border-zinc-200 dark:border-zinc-800">
                  <SliderRow label="Sudut Kemiringan" value={ctx.bannerGradientAngle} min={0} max={360} defaultValue={135} onChange={ctx.setBannerGradientAngle} onPointerUp={() => ctx.pushHistory()} unit="°" />
                </div>
              </div>
            </div>
          )}

          {ctx.bannerBgType === 'image' && (
            <div className="space-y-4">
              <input ref={ctx.bgFileInputRef} type="file" accept="image/*" className="hidden" onChange={ctx.handleBgImageSelect} />
              <div className="w-full aspect-video rounded-2xl border-2 border-dashed border-zinc-300 dark:border-zinc-700 overflow-hidden bg-zinc-100 dark:bg-zinc-900 flex items-center justify-center cursor-pointer group hover:border-blue-400 transition-all relative" onClick={() => ctx.bgFileInputRef.current?.click()}>
                {ctx.bannerImage ? (
                  <img src={ctx.bannerImage} alt="BG" className="w-full h-full object-cover group-hover:opacity-80 transition-opacity" style={{ filter: ctx.bgFilterStyle }} />
                ) : (
                  <div className="flex flex-col items-center gap-2 text-zinc-400 group-hover:text-blue-500">
                    <ImageIcon className="w-8 h-8" />
                    <span className="text-xs font-bold">Upload Gambar Latar</span>
                  </div>
                )}
                {ctx.bannerImage && (
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white font-bold text-sm">Ganti Gambar</div>
                )}
              </div>
              {ctx.bannerImage && (
                <Button variant="danger" className="w-full" onClick={() => { ctx.setBannerImage(null); ctx.pushHistory({ ...ctx.getSnapshot(), image: null }); }}>Hapus Gambar</Button>
              )}
              <div className="pt-4 border-t border-zinc-200 dark:border-zinc-800 space-y-4">
                <p className="text-[10px] font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">Filter Latar Belakang</p>
                <SliderRow label="Kecerahan" value={ctx.bgFilter.brightness} min={0} max={200} defaultValue={100} onChange={(v: number) => ctx.setBgFilter((f: any) => ({ ...f, brightness: v }))} onPointerUp={() => ctx.pushHistory()} unit="%" />
                <SliderRow label="Kontras" value={ctx.bgFilter.contrast} min={0} max={200} defaultValue={100} onChange={(v: number) => ctx.setBgFilter((f: any) => ({ ...f, contrast: v }))} onPointerUp={() => ctx.pushHistory()} unit="%" />
                <SliderRow label="Saturasi" value={ctx.bgFilter.saturate ?? 100} min={0} max={200} defaultValue={100} onChange={(v: number) => ctx.setBgFilter((f: any) => ({ ...f, saturate: v }))} onPointerUp={() => ctx.pushHistory()} unit="%" />
                <SliderRow label="Blur" value={ctx.bgFilter.blur} min={0} max={20} defaultValue={0} onChange={(v: number) => ctx.setBgFilter((f: any) => ({ ...f, blur: v }))} onPointerUp={() => ctx.pushHistory()} unit="px" />
              </div>

              {ctx.bannerImage && (
                <div className="pt-4 border-t border-zinc-200 dark:border-zinc-800 space-y-4">
                  <div className="flex items-center justify-between">
                    <p className="text-[10px] font-black uppercase tracking-wider text-zinc-800 dark:text-zinc-200">Overlay Gradasi Gelap (Legibilitas)</p>
                    <Switch checked={ctx.bgGradientOverlayEnabled} onCheckedChange={(checked: boolean) => {
                      ctx.setBgGradientOverlayEnabled(checked);
                      ctx.pushHistory({ ...ctx.getSnapshot(), bgGradientOverlay: { enabled: checked, color: ctx.bgGradientOverlayColor, opacityLeft: ctx.bgGradientOverlayOpacityLeft, opacityRight: ctx.bgGradientOverlayOpacityRight, angle: ctx.bgGradientOverlayAngle } });
                    }} />
                  </div>
                  {ctx.bgGradientOverlayEnabled && (
                    <div className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 space-y-4 bg-white dark:bg-zinc-900/30">
                      <div>
                        <Label>Warna Overlay</Label>
                        <ColorPicker value={ctx.bgGradientOverlayColor} onChange={(color: string) => {
                          ctx.setBgGradientOverlayColor(color);
                          ctx.pushHistory({ ...ctx.getSnapshot(), bgGradientOverlay: { enabled: ctx.bgGradientOverlayEnabled, color, opacityLeft: ctx.bgGradientOverlayOpacityLeft, opacityRight: ctx.bgGradientOverlayOpacityRight, angle: ctx.bgGradientOverlayAngle } });
                        }} />
                      </div>
                      <div className="pt-2"><SliderRow label="Transparansi Kiri (Mulai)" value={ctx.bgGradientOverlayOpacityLeft} min={0} max={100} defaultValue={70} onChange={ctx.setBgGradientOverlayOpacityLeft} onPointerUp={() => ctx.pushHistory()} unit="%" /></div>
                      <div className="pt-2"><SliderRow label="Transparansi Kanan (Akhir)" value={ctx.bgGradientOverlayOpacityRight} min={0} max={100} defaultValue={0} onChange={ctx.setBgGradientOverlayOpacityRight} onPointerUp={() => ctx.pushHistory()} unit="%" /></div>
                      <div className="pt-2"><SliderRow label="Sudut Arah Gradasi" value={ctx.bgGradientOverlayAngle} min={0} max={360} defaultValue={90} onChange={ctx.setBgGradientOverlayAngle} onPointerUp={() => ctx.pushHistory()} unit="°" /></div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </PanelSection>

      {/* 3. GAMBAR & STIKER TAMBAHAN */}
      <PanelSection title="Gambar & Stiker Tambahan" icon={Palette} defaultOpen={false}>
        <div className="space-y-5 pt-1">
          {ctx.overlays.length < 2 && (
            <div className="space-y-4 bg-zinc-50 dark:bg-zinc-900/50 p-4 rounded-xl border border-zinc-200 dark:border-zinc-800">
              <div>
                <Label>Pilih Produk Menu</Label>
                <select value={ctx.bannerProductId} onChange={(e) => {
                  const prodId = e.target.value;
                  ctx.handleProductSelect(prodId);
                }} className="w-full h-10 px-3 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-sm outline-none text-zinc-900 dark:text-zinc-100">
                  <option value="">-- Tambah Produk --</option>
                  {ctx.products.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-px bg-zinc-200 dark:bg-zinc-700 flex-1"></div>
                <span className="text-[10px] text-zinc-400 font-medium uppercase tracking-wider">ATAU</span>
                <div className="h-px bg-zinc-200 dark:bg-zinc-700 flex-1"></div>
              </div>
              <div>
                <input ref={ctx.overlayFileInputRef} type="file" accept="image/*" className="hidden" onChange={ctx.handleAddImageFile} />
                <button onClick={() => ctx.overlayFileInputRef.current?.click()}
                  className="w-full h-10 rounded-xl bg-blue-50 dark:bg-blue-900/10 hover:bg-blue-100 dark:hover:bg-blue-900/20 border border-dashed border-blue-300 dark:border-blue-800/50 hover:border-blue-400 transition-all flex items-center justify-center gap-2 text-xs font-bold text-blue-600 dark:text-blue-400">
                  <ImageIcon className="w-4 h-4" /> Pilih dari Galeri
                </button>
              </div>
            </div>
          )}

          {ctx.overlays.length > 0 && (
            <div className="space-y-3">
              {ctx.overlays.map((overlay: OverlayData, idx: number) => {
                const isExpanded = ctx.activeOverlayId === overlay.id;
                return (
                  <div key={overlay.id} className={cn("rounded-xl border transition-all bg-white dark:bg-zinc-900/30 overflow-hidden", isExpanded ? "border-blue-400 dark:border-blue-500/50 shadow-md ring-2 ring-blue-500/20" : "border-zinc-200 dark:border-zinc-800")}>
                    {/* Header: Click to toggle expand */}
                    <div 
                      className="flex items-center justify-between p-3 cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
                      onClick={() => ctx.setActiveOverlayId(isExpanded ? null : overlay.id)}
                    >
                      <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-700 dark:text-zinc-300">Overlay {idx + 1}</p>
                      <div className="flex items-center gap-1.5" onClick={e => e.stopPropagation()}>
                        <button onClick={() => setMagicWandId(overlay.id)}
                          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-colors border bg-white dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-300 hover:border-blue-400"
                          title="Hapus Latar dengan Magic Wand">
                          <Wand2Icon className="w-3.5 h-3.5" />
                          Hapus Latar
                        </button>
                        <button onClick={() => {
                          if (idx > 0) {
                            const newArr = [...ctx.overlays];
                            [newArr[idx-1], newArr[idx]] = [newArr[idx], newArr[idx-1]];
                            ctx.setOverlays(newArr);
                            setTimeout(() => ctx.pushHistory(), 50);
                          }
                        }} className="w-7 h-7 bg-zinc-100 dark:bg-zinc-800 rounded-md flex items-center justify-center hover:bg-zinc-200" disabled={idx === 0} title="Maju (Bring Forward)">
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="18 15 12 9 6 15"/></svg>
                        </button>
                        <button onClick={() => {
                          if (idx < ctx.overlays.length - 1) {
                            const newArr = [...ctx.overlays];
                            [newArr[idx], newArr[idx+1]] = [newArr[idx+1], newArr[idx]];
                            ctx.setOverlays(newArr);
                            setTimeout(() => ctx.pushHistory(), 50);
                          }
                        }} className="w-7 h-7 bg-zinc-100 dark:bg-zinc-800 rounded-md flex items-center justify-center hover:bg-zinc-200" disabled={idx === ctx.overlays.length - 1} title="Mundur (Send Backward)">
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
                        </button>
                      </div>
                    </div>
                    
                    {/* Collapsible Content */}
                    {isExpanded && (
                      <div className="p-4 pt-0 space-y-4 border-t border-zinc-100 dark:border-zinc-800 mt-2">
                        <SliderRow label="Skala (Lebar)" value={Math.round(overlay.scale * 100)} min={10} max={500} defaultValue={100} onChange={(v: number) => ctx.setOverlays((prev: any) => prev.map((o: any) => o.id === overlay.id ? { ...o, scale: v / 100 } : o))} onPointerUp={() => ctx.pushHistory()} unit="%" />
                        <SliderRow label="Rotasi" value={overlay.rotate} min={-180} max={180} defaultValue={0} onChange={(v: number) => ctx.setOverlays((prev: any) => prev.map((o: any) => o.id === overlay.id ? { ...o, rotate: v } : o))} onPointerUp={() => ctx.pushHistory()} unit="°" />
                        
                        <div className="flex gap-2">
                          <button onClick={() => {
                            ctx.setOverlays((prev: any) => prev.map((o: any) => o.id === overlay.id ? { ...o, flipX: !o.flipX } : o));
                            ctx.pushHistory();
                          }}
                            className={cn('flex-1 h-10 rounded-xl border font-bold transition-all flex items-center justify-center gap-2 text-xs', overlay.flipX ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400' : 'border-zinc-200 dark:border-zinc-700')}>
                            <FlipHorizontal className="w-4 h-4" /> Balik Horisontal
                          </button>
                        </div>

                        <div className="pt-4 border-t border-zinc-200 dark:border-zinc-800 space-y-4">
                          <p className="text-[10px] font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">Filter Stiker Overlay</p>
                          <SliderRow label="Kecerahan" value={overlay.filter.brightness} min={0} max={200} defaultValue={100} onChange={(v: number) => ctx.setOverlays((prev: any) => prev.map((o: any) => o.id === overlay.id ? { ...o, filter: { ...o.filter, brightness: v } } : o))} onPointerUp={() => ctx.pushHistory()} unit="%" />
                          <SliderRow label="Kontras" value={overlay.filter.contrast} min={0} max={200} defaultValue={100} onChange={(v: number) => ctx.setOverlays((prev: any) => prev.map((o: any) => o.id === overlay.id ? { ...o, filter: { ...o.filter, contrast: v } } : o))} onPointerUp={() => ctx.pushHistory()} unit="%" />
                          <SliderRow label="Saturasi" value={overlay.filter.saturate ?? 100} min={0} max={200} defaultValue={100} onChange={(v: number) => ctx.setOverlays((prev: any) => prev.map((o: any) => o.id === overlay.id ? { ...o, filter: { ...o.filter, saturate: v } } : o))} onPointerUp={() => ctx.pushHistory()} unit="%" />
                          <SliderRow label="Blur" value={overlay.filter.blur} min={0} max={20} defaultValue={0} onChange={(v: number) => ctx.setOverlays((prev: any) => prev.map((o: any) => o.id === overlay.id ? { ...o, filter: { ...o.filter, blur: v } } : o))} onPointerUp={() => ctx.pushHistory()} unit="px" />
                        </div>

                        <div className="pt-4 border-t border-zinc-200 dark:border-zinc-800">
                          <SliderRow label="Sudut Bulat" value={overlay.borderRadius} min={0} max={50} step={1} defaultValue={0} onChange={(v: number) => ctx.setOverlays((prev: any) => prev.map((o: any) => o.id === overlay.id ? { ...o, borderRadius: v } : o))} onPointerUp={() => ctx.pushHistory()} unit="%" />
                        </div>

                        <Button variant="danger" className="w-full h-9 rounded-xl text-xs" onClick={() => {
                          ctx.setOverlays((prev: any) => prev.filter((o: any) => o.id !== overlay.id));
                          if (ctx.activeOverlayId === overlay.id) ctx.setActiveOverlayId(null);
                          setTimeout(() => ctx.pushHistory(), 50);
                        }}>
                          <Trash className="w-4 h-4 mr-2" /> Hapus Stiker Ini
                        </Button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </PanelSection>
      
    </div>
  );
});

// ============================================================================
// DESKTOP SIDEBAR
// ============================================================================

export const DesktopSidebar = React.memo(function DesktopSidebar() {
  return (
    <div className="hidden md:flex w-[360px] shrink-0 bg-card border-r border-border flex-col overflow-hidden z-20">
      <div className="px-5 py-4 border-b border-border shrink-0">
        <span className="text-sm font-black uppercase tracking-wider text-foreground flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-primary" /> Editor Banner
        </span>
      </div>
      <div className="flex-1 overflow-y-auto custom-scrollbar p-5">
        <SidebarFormContent />
      </div>
    </div>
  );
});

// ============================================================================
// MOBILE BOTTOM SHEET
// ============================================================================

export const MobileBottomSheet = React.memo(function MobileBottomSheet() {
  const { isMobilePanelOpen, setIsMobilePanelOpen, editBanner, handleSaveBanner } = useBannerEditor();

  return (
    <div className="md:hidden">
      {isMobilePanelOpen && (
        <div className="fixed inset-0 z-[58] bg-black/50 backdrop-blur-sm" onClick={() => setIsMobilePanelOpen(false)} />
      )}
      <div
        className="fixed bottom-0 left-0 right-0 z-[59] flex flex-col bg-card rounded-t-2xl border-t border-border shadow-[0_-8px_32px_rgba(0,0,0,0.18)] transition-transform duration-300 ease-out will-change-transform"
        style={{ maxHeight: '80vh', transform: isMobilePanelOpen ? 'translateY(0)' : 'translateY(calc(100% - 60px))' }}
      >
        <button
          className="flex flex-col items-center gap-1 w-full pt-2.5 pb-2.5 px-4 shrink-0 touch-manipulation select-none"
          onClick={() => setIsMobilePanelOpen((v: boolean) => !v)}
        >
          <div className="w-9 h-1 rounded-full bg-muted-foreground/30 mb-1" />
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-2 text-foreground">
              <SlidersHorizontal className="w-4 h-4 text-primary shrink-0" />
              <span className="text-sm font-bold">{isMobilePanelOpen ? 'Tutup Editor' : 'Edit Banner'}</span>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={e => { e.stopPropagation(); handleSaveBanner(); }}
                className="flex items-center gap-1.5 bg-primary active:brightness-90 text-primary-foreground text-xs font-bold px-3.5 h-7 rounded-full shadow-md">
                <Check className="w-3.5 h-3.5" />{editBanner ? 'Simpan' : 'Terbitkan'}
              </button>
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24"
                fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                className={cn('text-muted-foreground transition-transform duration-300', isMobilePanelOpen ? 'rotate-180' : '')}>
                <polyline points="18 15 12 9 6 15" />
              </svg>
            </div>
          </div>
        </button>
        {isMobilePanelOpen && (
          <div className="flex-1 overflow-y-auto overscroll-contain pb-8" style={{ WebkitOverflowScrolling: 'touch' }}>
            <div className="p-4 space-y-1">
              <SidebarFormContent />
            </div>
          </div>
        )}
      </div>
    </div>
  );
});
