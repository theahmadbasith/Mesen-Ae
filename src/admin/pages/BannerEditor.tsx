import React from 'react';
import { BannerEditorProvider, useBannerEditor } from './banner-editor/BannerEditorContext';
import BannerEditorToolbar from './banner-editor/BannerEditorToolbar';
import { DesktopSidebar, MobileBottomSheet } from './banner-editor/BannerEditorSidebar';
import BannerEditorCanvas from './banner-editor/BannerEditorCanvas';
import PhotoCropModal from '@/admin/components/PhotoCropModal';

function BannerEditorContent() {
  const { cropBgOpen, setCropBgOpen, cropBgFile, handleBgCropSuccess } = useBannerEditor();

  return (
    <div className="flex flex-col h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 overflow-hidden font-sans">
      {/* TOP BAR / TOOLBAR */}
      <BannerEditorToolbar />

      {/* WORKSPACE */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* CANVAS PREVIEW AREA */}
        <BannerEditorCanvas />

        {/* SIDEBAR PANEL (DESKTOP) */}
        <DesktopSidebar />

        {/* MOBILE BOTTOM SHEET */}
        <MobileBottomSheet />
      </div>

      <PhotoCropModal
        open={cropBgOpen}
        onOpenChange={setCropBgOpen}
        file={cropBgFile}
        onCropped={handleBgCropSuccess}
        disableCompression={true}
        aspectRatio={21/9}
      />
    </div>
  );
}

export default function BannerEditor() {
  return (
    <BannerEditorProvider>
      <BannerEditorContent />
    </BannerEditorProvider>
  );
}
