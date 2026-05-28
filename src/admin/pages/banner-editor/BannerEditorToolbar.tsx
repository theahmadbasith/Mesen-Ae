import React from 'react';
import { Sparkles, ChevronLeft, Undo2, Redo2, Check } from 'lucide-react';
import { useBannerEditor, cn, Button } from './BannerEditorContext';

export default React.memo(function BannerEditorToolbar() {
  const {
    navigate, editBanner, storeSettings, bannerTitle,
    historyIndex, history, handleUndo, handleRedo,
    snapEnabled, setSnapEnabled, pushHistory, getSnapshot,
    zoom, setZoom, handleSaveBanner,
  } = useBannerEditor();

  return (
    <div className="h-14 sm:h-16 grid grid-cols-[auto_1fr_auto] items-center px-2 sm:px-4 gap-2 border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 shrink-0 z-40">

      {/* LEFT: back + undo/redo/snap */}
      <div className="flex items-center gap-1.5 min-w-0">
        <Button variant="ghost" size="icon" onClick={() => navigate('/admin/banner')} className="rounded-full shrink-0 w-9 h-9">
          <ChevronLeft className="w-5 h-5" />
        </Button>

        {/* Desktop undo/redo/snap */}
        <div className="hidden sm:flex items-center gap-1 bg-zinc-100 dark:bg-zinc-900 rounded-full p-1 shrink-0">
          <button onClick={handleUndo} disabled={historyIndex <= 0} title="Undo"
            className={cn("w-8 h-8 rounded-full flex items-center justify-center transition-all",
              historyIndex <= 0 ? "opacity-30 cursor-not-allowed text-zinc-400" : "text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-800")}>
            <Undo2 className="w-4 h-4" />
          </button>
          <button onClick={handleRedo} disabled={historyIndex >= history.length - 1} title="Redo"
            className={cn("w-8 h-8 rounded-full flex items-center justify-center transition-all",
              historyIndex >= history.length - 1 ? "opacity-30 cursor-not-allowed text-zinc-400" : "text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-800")}>
            <Redo2 className="w-4 h-4" />
          </button>
          <div className="w-px h-4 bg-zinc-200 dark:bg-zinc-700 mx-0.5" />
          <button
            onClick={() => { const s = !snapEnabled; setSnapEnabled(s); pushHistory({ ...getSnapshot(), snapEnabled: s }); }}
            title="Magnet Snap"
            className={cn("w-8 h-8 rounded-full flex items-center justify-center transition-all",
              snapEnabled ? "bg-blue-600 text-white shadow-sm" : "text-zinc-500 hover:bg-zinc-200 dark:hover:bg-zinc-800")}>
            <Sparkles className="w-4 h-4" />
          </button>
        </div>

        {/* Mobile compact undo/redo/snap */}
        <div className="flex sm:hidden items-center gap-0.5 bg-zinc-100 dark:bg-zinc-900 rounded-full p-0.5 shrink-0">
          <button onClick={handleUndo} disabled={historyIndex <= 0}
            className={cn("w-7 h-7 rounded-full flex items-center justify-center transition-all",
              historyIndex <= 0 ? "opacity-30 cursor-not-allowed text-zinc-400" : "text-zinc-600 dark:text-zinc-300 active:bg-zinc-200 dark:active:bg-zinc-800")}>
            <Undo2 className="w-3.5 h-3.5" />
          </button>
          <button onClick={handleRedo} disabled={historyIndex >= history.length - 1}
            className={cn("w-7 h-7 rounded-full flex items-center justify-center transition-all",
              historyIndex >= history.length - 1 ? "opacity-30 cursor-not-allowed text-zinc-400" : "text-zinc-600 dark:text-zinc-300 active:bg-zinc-200 dark:active:bg-zinc-800")}>
            <Redo2 className="w-3.5 h-3.5" />
          </button>
          <div className="w-px h-3.5 bg-zinc-300 dark:bg-zinc-700 mx-0.5" />
          <button
            onClick={() => { const s = !snapEnabled; setSnapEnabled(s); pushHistory({ ...getSnapshot(), snapEnabled: s }); }}
            className={cn("w-7 h-7 rounded-full flex items-center justify-center transition-all",
              snapEnabled ? "bg-blue-600 text-white" : "text-zinc-500 active:bg-zinc-200 dark:active:bg-zinc-700")}>
            <Sparkles className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* CENTER: title */}
      <div className="flex items-center justify-center gap-1.5 min-w-0 overflow-hidden">
        <Sparkles className="w-3.5 h-3.5 text-blue-500 shrink-0 hidden sm:block" />
        <span className="text-xs sm:text-sm font-black tracking-tight truncate text-zinc-800 dark:text-zinc-100">
          <span className="hidden sm:inline">
            {storeSettings?.storeName ? `${storeSettings.storeName} Banner` : 'Banner Studio'}
          </span>
          <span className="sm:hidden">{bannerTitle || 'Banner Baru'}</span>
        </span>
      </div>

      {/* RIGHT: zoom + save */}
      <div className="flex items-center gap-1.5 shrink-0">
        <div className="hidden sm:flex items-center gap-1.5 bg-zinc-100 dark:bg-zinc-900 rounded-full px-2.5 h-9">
          <button onClick={() => setZoom((z: number) => Math.max(30, z - 10))} className="p-1 hover:text-blue-500 transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="8" y1="11" x2="14" y2="11"/></svg>
          </button>
          <span className="text-xs font-mono font-bold w-10 text-center">{zoom}%</span>
          <button onClick={() => setZoom((z: number) => Math.min(200, z + 10))} className="p-1 hover:text-blue-500 transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="11" y1="8" x2="11" y2="14"/><line x1="8" y1="11" x2="14" y2="11"/></svg>
          </button>
        </div>
        <Button variant="primary" size="sm" onClick={handleSaveBanner}
          className="hidden sm:flex rounded-full px-4 h-9 text-sm font-bold shadow-blue-500/20 shrink-0">
          <Check className="w-4 h-4 mr-1.5" />{editBanner ? 'Simpan' : 'Terbitkan'}
        </Button>
      </div>
    </div>
  );
});
