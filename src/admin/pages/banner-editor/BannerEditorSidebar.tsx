import React from 'react';
import { Image as ImageIcon, Sparkles, FlipHorizontal, Type, Palette, Layout, SlidersHorizontal, Check, Trash } from 'lucide-react';
import {
  useBannerEditor, cn, Button, Input, Label, Switch, PanelSection,
  ColorPicker, SliderRow, RichTextEditor, Wand2Icon
} from './BannerEditorContext';

// ============================================================================
// SIDEBAR FORM CONTENT (shared between desktop sidebar and mobile bottom sheet)
// ============================================================================

const SidebarFormContent = React.memo(function SidebarFormContent() {
  const ctx = useBannerEditor();

  return (
    <div className="space-y-6">
      
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
          <div>
            <Label>Tipe Banner</Label>
            <select value={ctx.bannerType} onChange={(e) => {
              const val = e.target.value;
              ctx.handleBannerTypeChange(val);
              ctx.pushHistory({ ...ctx.getSnapshot(), type: val, productId: '', overlayImageUrl: null });
            }} className="w-full h-10 px-3 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-sm outline-none text-zinc-900 dark:text-zinc-100">
              <option value="custom">Kustom Bebas</option>
              <option value="menu">Menu / Produk</option>
            </select>
          </div>

          {ctx.bannerType === 'menu' ? (
            <div>
              <Label>Produk Terkait</Label>
              <select value={ctx.bannerProductId} onChange={(e) => {
                const prodId = e.target.value;
                ctx.handleProductSelect(prodId);
                const prod = ctx.products?.find((p: any) => String(p.id) === String(prodId));
                const photo = prod?.photo || null;
                ctx.pushHistory({ ...ctx.getSnapshot(), productId: prodId, overlayImageUrl: photo });
              }} className="w-full h-10 px-3 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-sm outline-none text-zinc-900 dark:text-zinc-100">
                <option value="">-- Pilih Produk --</option>
                {ctx.products.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
          ) : (
            <div>
              <Label>Pilih Gambar Overlay (PNG / JPG)</Label>
              <input ref={ctx.overlayFileInputRef} type="file" accept="image/*" className="hidden" onChange={ctx.handleAddImageFile} />
              <button onClick={() => ctx.overlayFileInputRef.current?.click()}
                className="w-full h-14 rounded-2xl bg-blue-50 dark:bg-blue-900/10 hover:bg-blue-100 dark:hover:bg-blue-900/20 border-2 border-dashed border-blue-200 dark:border-blue-800/30 hover:border-blue-400 transition-all flex items-center justify-center gap-2 text-sm font-bold text-blue-600 dark:text-blue-400">
                <ImageIcon className="w-5 h-5" /> Cari Gambar Overlay
              </button>
            </div>
          )}

          {ctx.bannerOverlayImageUrl && (
            <div className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 space-y-4 bg-white dark:bg-zinc-900/30">
              <div className="flex items-center justify-between mb-2">
                <p className="text-[10px] font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">Transformasi Stiker</p>
                <button onClick={() => ctx.setIsMagicWandActive((v: boolean) => !v)}
                  className={cn("flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-colors border",
                    ctx.isMagicWandActive ? "bg-blue-600 border-blue-600 text-white shadow-md shadow-blue-500/20" : "bg-white dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-300 hover:border-blue-400"
                  )}>
                  <Wand2Icon className="w-3.5 h-3.5" />
                  Hapus Latar
                </button>
              </div>

              {ctx.isMagicWandActive && (
                <div className="p-3 bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-800/40 rounded-xl space-y-3 mb-4 animate-in fade-in slide-in-from-top-2">
                  <p className="text-xs text-blue-800 dark:text-blue-300 font-medium">Klik pada area warna di gambar stiker (kanvas preview) untuk menghapusnya.</p>
                  <SliderRow label="Toleransi Kesamaan Warna" value={ctx.magicWandTolerance} min={1} max={100} defaultValue={32} onChange={ctx.setMagicWandTolerance} />
                </div>
              )}
              
              <SliderRow label="Skala (Lebar)" value={Math.round(ctx.bannerOverlayScale * 100)} min={10} max={300} defaultValue={100} onChange={(v: number) => ctx.setBannerOverlayScale(v / 100)} onPointerUp={() => ctx.pushHistory()} unit="%" />
              <SliderRow label="Rotasi" value={ctx.bannerOverlayRotate} min={-180} max={180} defaultValue={0} onChange={ctx.setBannerOverlayRotate} onPointerUp={() => ctx.pushHistory()} unit="°" />
              
              <div className="flex gap-2">
                <button onClick={() => {
                  const flip = !ctx.bannerOverlayFlipX;
                  ctx.setBannerOverlayFlipX(flip);
                  ctx.pushHistory({ ...ctx.getSnapshot(), overlayFlipX: flip });
                }}
                  className={cn('flex-1 h-10 rounded-xl border font-bold transition-all flex items-center justify-center gap-2 text-xs', ctx.bannerOverlayFlipX ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400' : 'border-zinc-200 dark:border-zinc-700')}>
                  <FlipHorizontal className="w-4 h-4" /> Balik Horisontal
                </button>
              </div>

              <div className="pt-4 border-t border-zinc-200 dark:border-zinc-800 space-y-4">
                <p className="text-[10px] font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">Filter Stiker Overlay</p>
                <SliderRow label="Kecerahan" value={ctx.overlayFilter.brightness} min={0} max={200} defaultValue={100} onChange={(v: number) => ctx.setOverlayFilter((f: any) => ({ ...f, brightness: v }))} onPointerUp={() => ctx.pushHistory()} unit="%" />
                <SliderRow label="Kontras" value={ctx.overlayFilter.contrast} min={0} max={200} defaultValue={100} onChange={(v: number) => ctx.setOverlayFilter((f: any) => ({ ...f, contrast: v }))} onPointerUp={() => ctx.pushHistory()} unit="%" />
                <SliderRow label="Saturasi" value={ctx.overlayFilter.saturate ?? 100} min={0} max={200} defaultValue={100} onChange={(v: number) => ctx.setOverlayFilter((f: any) => ({ ...f, saturate: v }))} onPointerUp={() => ctx.pushHistory()} unit="%" />
                <SliderRow label="Blur" value={ctx.overlayFilter.blur} min={0} max={20} defaultValue={0} onChange={(v: number) => ctx.setOverlayFilter((f: any) => ({ ...f, blur: v }))} onPointerUp={() => ctx.pushHistory()} unit="px" />
              </div>

              <div className="pt-4 border-t border-zinc-200 dark:border-zinc-800">
                <SliderRow label="Sudut Bulat" value={ctx.bannerOverlayBorderRadius} min={0} max={50} step={1} defaultValue={0} onChange={(v: number) => ctx.setBannerOverlayBorderRadius(v)} onPointerUp={() => ctx.pushHistory()} unit="%" />
              </div>

              <Button variant="danger" className="w-full h-9 rounded-xl text-xs" onClick={() => {
                ctx.setBannerOverlayImageUrl(null);
                ctx.setBannerProductId('');
                ctx.setSelectedId(null);
                ctx.pushHistory({ ...ctx.getSnapshot(), overlayImageUrl: null, productId: '' });
              }}>
                <Trash className="w-4 h-4 mr-2" /> Hapus Stiker Overlay
              </Button>
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
