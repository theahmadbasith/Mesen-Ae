import React, { useCallback } from 'react';
import { Image as ImageIcon, FlipHorizontal, Trash } from 'lucide-react';
import { toast } from 'sonner';
import {
  useBannerEditor, cn, floodFillRemoveBackground, RotateCcwIcon, RotateCwIcon
} from './BannerEditorContext';

// ============================================================================
// CANVAS PREVIEW — renders the banner preview + layer interactions
// ============================================================================

export default React.memo(function BannerEditorCanvas() {
  const ctx = useBannerEditor();

  const renderCanvasLayer = useCallback((layer: any) => {
    if (!layer.visible) return null;
    const isSelected = ctx.selectedId === layer.id;
    const baseStyle: any = {
      position: 'absolute',
      left: `${layer.x}%`,
      top: `${layer.y}%`,
      transform: layer.role === 'overlay-image' ? 'translate(-50%, -50%)' : 'translate(0%, -50%)',
      zIndex: layer.zIndex,
      cursor: 'grab',
      userSelect: 'none',
      touchAction: 'none',
    };

    let elementNode: any = null;

    if (layer.role === 'heading-box') {
      elementNode = (
        <span 
          style={{
            backgroundColor: 
              ctx.bannerHeadingStyle === 'solid-white' ? '#FFFFFF' :
              ctx.bannerHeadingStyle === 'solid-dark' ? '#09090b' :
              ctx.bannerHeadingStyle === 'outline-white' ? 'transparent' :
              ctx.bannerHeadingStyle === 'neon' ? 'rgba(34,211,238,0.15)' :
              ctx.bannerHeadingStyle === 'retro' ? '#fbbf24' : 'rgba(255,255,255,0.2)',
            color: 
              ctx.bannerHeadingStyle === 'solid-white' ? '#0f172a' :
              ctx.bannerHeadingStyle === 'solid-dark' ? '#ffffff' :
              ctx.bannerHeadingStyle === 'outline-white' ? '#ffffff' :
              ctx.bannerHeadingStyle === 'neon' ? '#a5f3fc' :
              ctx.bannerHeadingStyle === 'retro' ? '#09090b' : '#ffffff',
            border: 
              ctx.bannerHeadingStyle === 'solid-white' ? 'none' :
              ctx.bannerHeadingStyle === 'solid-dark' ? '1px solid #1e293b' :
              ctx.bannerHeadingStyle === 'outline-white' ? '0.2cqw solid #ffffff' :
              ctx.bannerHeadingStyle === 'neon' ? '0.15cqw solid #22d3ee' :
              ctx.bannerHeadingStyle === 'retro' ? '0.2cqw solid #09090b' : '0.1cqw solid rgba(255,255,255,0.1)',
            boxShadow: 
              ctx.bannerHeadingStyle === 'neon' ? '0 0 12px rgba(34,211,238,0.4)' :
              ctx.bannerHeadingStyle === 'retro' ? '0.25cqw 0.25cqw 0px #09090b' : 'none',
            backdropFilter: (ctx.bannerHeadingStyle === 'glass' || !ctx.bannerHeadingStyle) ? 'blur(8px)' : undefined
          }}
          className="text-[2.2cqw] px-[1.5cqw] py-[0.5cqw] rounded inline-block uppercase tracking-widest select-none"
          dangerouslySetInnerHTML={{ __html: ctx.bannerHeading || '<span>Spesial Penawaran</span>' }}
        />
      );
    }

    if (layer.role === 'title-box') {
      elementNode = (
        <h4 className="font-black text-[4.5cqw] leading-[1.15] line-clamp-2 drop-shadow-sm m-0 select-none text-white text-left"
          dangerouslySetInnerHTML={{ __html: ctx.bannerTitle || 'Judul Promo' }} />
      );
    }

    if (layer.role === 'desc-box') {
      elementNode = (
        <p className="text-[2.8cqw] text-slate-100 line-clamp-3 leading-[1.3] font-medium drop-shadow-sm m-0 select-none text-left"
          dangerouslySetInnerHTML={{ __html: ctx.bannerDescription || 'Deskripsi singkat...' }} />
      );
    }

    if (layer.role === 'button-box') {
      elementNode = (
        <span
          style={{
            backgroundColor: 
              ctx.bannerBadgeStyle === 'solid' ? '#FFFFFF' :
              ctx.bannerBadgeStyle === 'outline' ? 'transparent' :
              ctx.bannerBadgeStyle === 'glass' ? 'rgba(255,255,255,0.2)' :
              ctx.bannerBadgeStyle === 'soft-dark' ? 'rgba(0,0,0,0.4)' :
              ctx.bannerBadgeStyle === 'neon' ? '#06b6d4' :
              ctx.bannerBadgeStyle === 'retro' ? '#eab308' : '#FFFFFF',
            color: 
              ctx.bannerBadgeStyle === 'solid' ? '#0F172A' :
              ctx.bannerBadgeStyle === 'outline' ? '#FFFFFF' :
              ctx.bannerBadgeStyle === 'glass' ? '#FFFFFF' :
              ctx.bannerBadgeStyle === 'soft-dark' ? '#FFFFFF' :
              ctx.bannerBadgeStyle === 'neon' ? '#ffffff' :
              ctx.bannerBadgeStyle === 'retro' ? '#09090b' : '#0F172A',
            border: 
              ctx.bannerBadgeStyle === 'solid' ? 'none' :
              ctx.bannerBadgeStyle === 'outline' ? '0.2cqw solid #FFFFFF' :
              ctx.bannerBadgeStyle === 'glass' ? '0.15cqw solid rgba(255,255,255,0.2)' :
              ctx.bannerBadgeStyle === 'soft-dark' ? '0.15cqw solid rgba(255,255,255,0.2)' :
              ctx.bannerBadgeStyle === 'neon' ? 'none' :
              ctx.bannerBadgeStyle === 'retro' ? '0.25cqw solid #09090b' : 'none',
            boxShadow: 
              ctx.bannerBadgeStyle === 'neon' ? '0 0 15px rgba(6,182,212,0.6)' :
              ctx.bannerBadgeStyle === 'retro' ? '0.3cqw 0.3cqw 0px #09090b' : 'none',
            backdropFilter: 
              (ctx.bannerBadgeStyle === 'glass' || ctx.bannerBadgeStyle === 'soft-dark') ? 'blur(8px)' : undefined
          }}
          className="text-[2.4cqw] font-extrabold px-[2.5cqw] py-[0.8cqw] rounded-md shadow-sm select-none inline-block"
        >
          {ctx.bannerButtonText || 'Lihat Detail'}
        </span>
      );
    }

    if (layer.role === 'overlay-image') {
      if (!ctx.bannerOverlayImageUrl) return null;
      elementNode = (
        <img
          src={ctx.bannerOverlayImageUrl}
          draggable={false}
          style={{
            transform: `scaleX(${ctx.bannerOverlayFlipX ? -1 : 1}) rotate(${ctx.bannerOverlayRotate ?? 0}deg)`,
            width: `calc(${ctx.bannerOverlayScale ?? 1} * 20cqw)`,
            height: 'auto',
            borderRadius: `${ctx.bannerOverlayBorderRadius ?? 0}%`,
            filter: `brightness(${ctx.overlayFilter.brightness}%) contrast(${ctx.overlayFilter.contrast}%) saturate(${ctx.overlayFilter.saturate ?? 100}%) blur(${ctx.overlayFilter.blur}px)`
          }}
          className={cn("object-contain drop-shadow-2xl max-w-none select-none pointer-events-auto", ctx.isMagicWandActive ? 'cursor-crosshair' : '')}
          alt="Overlay Banner"
          onPointerDown={async (e) => {
            if (!ctx.isMagicWandActive || !ctx.bannerOverlayImageUrl) return;
            e.stopPropagation();
            e.preventDefault();
            const imgEl = e.currentTarget;
            const nativeEvent = e.nativeEvent;
            const x = nativeEvent.offsetX;
            const y = nativeEvent.offsetY;
            const startX = Math.round((x / imgEl.offsetWidth) * imgEl.naturalWidth);
            const startY = Math.round((y / imgEl.offsetHeight) * imgEl.naturalHeight);
            toast.loading('Menghapus area...', { id: 'magicWand' });
            try {
              const newImg = await floodFillRemoveBackground(ctx.bannerOverlayImageUrl, startX, startY, ctx.magicWandTolerance);
              ctx.setBannerOverlayImageUrl(newImg);
              ctx.pushHistory({ ...ctx.getSnapshot(), overlayImageUrl: newImg });
              toast.success('Latar berhasil dihapus!', { id: 'magicWand' });
            } catch (err) {
              console.error(err);
              toast.error('Gagal menghapus latar belakang', { id: 'magicWand' });
            }
          }}
        />
      );
    }

    const isTextLayer = layer.role === 'heading-box' || layer.role === 'title-box' || layer.role === 'desc-box';
    const layerWidth = isTextLayer ? `${layer.w ?? 55}%` : undefined;

    return (
      <div 
        key={layer.id} 
        style={{ ...baseStyle, width: layerWidth }}
        className="relative pointer-events-auto touch-none"
        onPointerDown={e => ctx.onLayerPointerDown(e, layer.id)}
      >
        {/* Floating Action Toolbar on Selected Overlay */}
        {isSelected && layer.role === 'overlay-image' && (
          <div 
            className="absolute top-[-54px] left-1/2 -translate-x-1/2 bg-slate-950/85 dark:bg-zinc-900/90 backdrop-blur-md border border-white/10 rounded-xl px-2 py-1 flex items-center gap-1.5 shadow-xl z-50 pointer-events-auto text-white scale-90 sm:scale-100 transition-all origin-bottom select-none animate-in fade-in zoom-in-95 duration-200"
            onPointerDown={e => e.stopPropagation()}
          >
            <button onClick={(ev) => { ev.stopPropagation(); ctx.setBannerOverlayScale((s: number) => { const n = Math.max(0.1, s - 0.05); ctx.pushHistory({ ...ctx.getSnapshot(), overlayScale: n }); return n; }); }}
              className="w-7 h-7 hover:bg-white/10 rounded-lg flex items-center justify-center font-black transition-colors">-</button>
            <span className="text-[10px] font-mono px-1 min-w-[34px] text-center text-zinc-200">{Math.round(ctx.bannerOverlayScale * 100)}%</span>
            <button onClick={(ev) => { ev.stopPropagation(); ctx.setBannerOverlayScale((s: number) => { const n = Math.min(3, s + 0.05); ctx.pushHistory({ ...ctx.getSnapshot(), overlayScale: n }); return n; }); }}
              className="w-7 h-7 hover:bg-white/10 rounded-lg flex items-center justify-center font-black transition-colors">+</button>
            <div className="w-[1px] h-4 bg-white/10" />
            <button onClick={(ev) => { ev.stopPropagation(); ctx.setBannerOverlayRotate((r: number) => { const n = r - 15; ctx.pushHistory({ ...ctx.getSnapshot(), overlayRotate: n }); return n; }); }} title="Putar Kiri"
              className="w-7 h-7 hover:bg-white/10 rounded-lg flex items-center justify-center transition-colors"><RotateCcwIcon className="w-3.5 h-3.5" /></button>
            <button onClick={(ev) => { ev.stopPropagation(); ctx.setBannerOverlayRotate((r: number) => { const n = r + 15; ctx.pushHistory({ ...ctx.getSnapshot(), overlayRotate: n }); return n; }); }} title="Putar Kanan"
              className="w-7 h-7 hover:bg-white/10 rounded-lg flex items-center justify-center transition-colors"><RotateCwIcon className="w-3.5 h-3.5" /></button>
            <div className="w-[1px] h-4 bg-white/10" />
            <button onClick={(ev) => { ev.stopPropagation(); const f = !ctx.bannerOverlayFlipX; ctx.setBannerOverlayFlipX(f); ctx.pushHistory({ ...ctx.getSnapshot(), overlayFlipX: f }); }}
              className={cn("w-7 h-7 hover:bg-white/10 rounded-lg flex items-center justify-center transition-colors", ctx.bannerOverlayFlipX && "text-blue-400 bg-white/5")}>
              <FlipHorizontal className="w-3.5 h-3.5" /></button>
            <div className="w-[1px] h-4 bg-white/10" />
            <button onClick={(ev) => { ev.stopPropagation(); ctx.setBannerOverlayImageUrl(null); ctx.setSelectedId(null); ctx.pushHistory({ ...ctx.getSnapshot(), overlayImageUrl: null }); }}
              className="w-7 h-7 text-red-400 hover:bg-red-500/10 rounded-lg flex items-center justify-center transition-colors">
              <Trash className="w-3.5 h-3.5" /></button>
          </div>
        )}

        {/* Bounding Box & Drag Resize Handles */}
        {isSelected && (
          <div className="absolute inset-[-6px] border-[1.5px] border-[#2563eb] rounded-md pointer-events-none z-20">
            {(['nw', 'ne', 'sw', 'se'] as const).map((corner) => {
              const posClasses: Record<string, string> = {
                nw: '-top-[4.5px] -left-[4.5px] cursor-nwse-resize',
                ne: '-top-[4.5px] -right-[4.5px] cursor-nesw-resize',
                sw: '-bottom-[4.5px] -left-[4.5px] cursor-nesw-resize',
                se: '-bottom-[4.5px] -right-[4.5px] cursor-nwse-resize'
              };
              return (
                <div 
                  key={corner}
                  className={cn("absolute w-2.5 h-2.5 bg-white border border-[#2563eb] rounded-full pointer-events-auto", posClasses[corner])}
                  onPointerDown={e => {
                    e.currentTarget.setPointerCapture(e.pointerId);
                    e.stopPropagation();
                    const startClientX = e.clientX;
                    const initialScale = layer.role === 'overlay-image' ? ctx.bannerOverlayScale : 1;
                    const onMove = (moveEvent: any) => {
                      const deltaX = moveEvent.clientX - startClientX;
                      let delta = 0;
                      if (corner === 'se' || corner === 'ne') delta = deltaX;
                      if (corner === 'sw' || corner === 'nw') delta = -deltaX;
                      const containerWidth = ctx.canvasRef.current?.offsetWidth || 800;
                      const scaleDelta = (delta / containerWidth) * 5;
                      const newScale = Math.max(0.1, Math.min(3, initialScale + scaleDelta));
                      if (layer.role === 'overlay-image') ctx.setBannerOverlayScale(newScale);
                    };
                    const onUp = (upEvent: any) => {
                      upEvent.currentTarget.releasePointerCapture(upEvent.pointerId);
                      upEvent.currentTarget.removeEventListener('pointermove', onMove);
                      upEvent.currentTarget.removeEventListener('pointerup', onUp);
                      setTimeout(() => ctx.pushHistory(), 50);
                    };
                    e.currentTarget.addEventListener('pointermove', onMove);
                    e.currentTarget.addEventListener('pointerup', onUp);
                  }}
                />
              );
            })}
          </div>
        )}

        {/* Right-edge resize handle for text layers */}
        {isSelected && isTextLayer && (
          <div
            className="absolute right-[-10px] top-1/2 -translate-y-1/2 w-4 h-8 bg-blue-600 rounded-sm cursor-ew-resize z-30 flex items-center justify-center shadow-lg pointer-events-auto"
            onPointerDown={e => { e.stopPropagation(); ctx.onResizePointerDown(e, layer.id); }}
            title="Seret untuk ubah lebar"
          >
            <div className="w-0.5 h-4 bg-white/70 rounded-full" />
          </div>
        )}

        {elementNode}
      </div>
    );
  }, [ctx]);

  return (
    <div
      className="flex-1 relative overflow-auto flex items-start md:items-center justify-center p-3 pt-4 md:p-10 bg-muted md:bg-secondary"
      style={{ paddingBottom: '72px' }}
      onPointerDown={() => ctx.setSelectedId(null)}
    >
      {/* Canvas Container */}
      <div
        ref={ctx.canvasRef}
        className="relative shadow-xl overflow-hidden w-full md:w-auto"
        style={{
          width: typeof window !== 'undefined' && window.innerWidth >= 768 ? `${ctx.zoom}%` : undefined,
          minWidth: typeof window !== 'undefined' && window.innerWidth >= 768 ? '300px' : undefined,
          maxWidth: typeof window !== 'undefined' && window.innerWidth >= 768 ? '1200px' : '100%',
          aspectRatio: '21/9',
          background: ctx.canvasBg || '#ffffff',
          borderRadius: '12px',
          containerType: 'inline-size',
          outline: '1px solid rgba(150,150,150,0.15)',
        }}
      >
        {/* Canvas Background Image */}
        {ctx.bannerImage && (
          <div className="absolute inset-0 z-0 pointer-events-none">
            <img src={ctx.bannerImage} alt="bg" className="w-full h-full object-cover" style={{ filter: ctx.bgFilterStyle }} />
            {ctx.bgGradientOverlayEnabled ? (
              <div className="absolute inset-0 z-10" style={{ background: `linear-gradient(${ctx.bgGradientOverlayAngle}deg, rgba(${ctx.hexToRgb(ctx.bgGradientOverlayColor)}, ${ctx.bgGradientOverlayOpacityLeft / 100}), rgba(${ctx.hexToRgb(ctx.bgGradientOverlayColor)}, ${ctx.bgGradientOverlayOpacityRight / 100}))` }} />
            ) : (
              <div className="absolute inset-0 bg-gradient-to-r from-black/85 via-black/40 to-transparent z-10" />
            )}
          </div>
        )}

        {!ctx.bannerImage && ctx.bgGradientOverlayEnabled && (
          <div className="absolute inset-0 z-10 pointer-events-none" style={{
            background: `linear-gradient(${ctx.bgGradientOverlayAngle}deg, rgba(${ctx.hexToRgb(ctx.bgGradientOverlayColor)}, ${ctx.bgGradientOverlayOpacityLeft / 100}), rgba(${ctx.hexToRgb(ctx.bgGradientOverlayColor)}, ${ctx.bgGradientOverlayOpacityRight / 100}))`
          }} />
        )}
        {ctx.bannerBgType === 'image' && !ctx.bannerImage && (
          <div className="absolute inset-0 bg-muted pointer-events-none flex flex-col items-center justify-center text-muted-foreground">
            <ImageIcon className="w-12 h-12 mb-2 opacity-20" />
            <span className="text-sm font-bold opacity-50">Latar Belakang Kosong</span>
          </div>
        )}

        {/* Snap guides */}
        {ctx.activeSnapX !== null && (
          <div className="absolute top-0 bottom-0 w-[1.5px] pointer-events-none z-30 shadow-[0_0_8px_currentColor]" style={{ left: `${ctx.activeSnapX}%`, color: ctx.activeSnapX === 50 ? '#22d3ee' : '#f43f5e', backgroundColor: 'currentColor' }} />
        )}
        {ctx.activeSnapY !== null && (
          <div className="absolute left-0 right-0 h-[1.5px] pointer-events-none z-30 shadow-[0_0_8px_currentColor]" style={{ top: `${ctx.activeSnapY}%`, color: ctx.activeSnapY === 50 ? '#22d3ee' : '#f43f5e', backgroundColor: 'currentColor' }} />
        )}

        {/* Canvas layers */}
        {ctx.layers.map(renderCanvasLayer)}
      </div>
    </div>
  );
});
