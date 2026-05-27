import React, { useState } from 'react';
import { Plus, Edit2, Trash2, Layout } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useDbQuery, dbUpdate, dbDelete } from '@/hooks/db-hooks';

// ── inline helpers ──────────────────────────────────────────────────────────
const cn = (...classes: any[]) => classes.filter(Boolean).join(' ');

const Button = ({ children, className, variant = 'primary', size = 'md', ...props }: any) => {
  const base = "inline-flex items-center justify-center rounded-xl font-bold transition-all focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed";
  const variants: any = {
    primary:   "bg-blue-600 hover:bg-blue-700 text-white shadow-md",
    secondary: "bg-zinc-200 dark:bg-zinc-800 hover:bg-zinc-300 dark:hover:bg-zinc-700 text-zinc-900 dark:text-zinc-100",
    outline:   "border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-900 bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 shadow-sm",
    ghost:     "hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100",
    danger:    "bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 shadow-sm",
  };
  const sizes: any = { sm: "h-8 px-3 text-xs", md: "h-10 px-4 text-sm", lg: "h-12 px-6 text-base", icon: "h-10 w-10 p-0" };
  return <button className={cn(base, variants[variant], sizes[size], className)} {...props}>{children}</button>;
};

const Switch = ({ checked, onCheckedChange }: any) => (
  <button type="button" role="switch" aria-checked={checked} onClick={() => onCheckedChange(!checked)}
    className={cn("relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors focus:outline-none", checked ? "bg-blue-600" : "bg-zinc-300 dark:bg-zinc-700")}>
    <span className={cn("pointer-events-none block h-5 w-5 rounded-full bg-white shadow-lg ring-0 transition-transform", checked ? "translate-x-5" : "translate-x-0")} />
  </button>
);

const Badge = ({ children, variant = 'default', className }: any) => {
  const variants: any = {
    default: "bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100",
    success: "bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300",
  };
  return <span className={cn("inline-flex items-center rounded-md px-2 py-1 text-xs font-semibold ring-1 ring-inset ring-zinc-500/20", variants[variant], className)}>{children}</span>;
};

const Card = ({ children, className }: any) => (
  <div className={cn("rounded-3xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-zinc-950 dark:text-zinc-50 shadow-sm", className)}>{children}</div>
);

// ── helpers ─────────────────────────────────────────────────────────────────
function hexToRgb(hex: string) {
  if (!hex) return '0, 0, 0';
  const c = hex.startsWith('#') ? hex.slice(1) : hex;
  return `${parseInt(c.slice(0,2),16)||0}, ${parseInt(c.slice(2,4),16)||0}, ${parseInt(c.slice(4,6),16)||0}`;
}

// ── component ────────────────────────────────────────────────────────────────
export default function BannerPromoList() {
  const banners = (useDbQuery('banners') ?? []) as any[];
  const navigate = useNavigate();
  const [deleteBannerId, setDeleteBannerId] = useState<string | null>(null);

  const handleToggleActive = async (id: string, cur: boolean) => {
    try {
      await dbUpdate('banners', id, { isActive: !cur });
      toast.success(!cur ? 'Banner ditampilkan' : 'Banner disembunyikan');
    } catch { toast.error('Gagal mengubah status'); }
  };

  const handleDeleteBanner = async () => {
    if (!deleteBannerId) return;
    try {
      await dbDelete('banners', deleteBannerId);
      toast.success('Banner berhasil dihapus');
      setDeleteBannerId(null);
    } catch { toast.error('Gagal menghapus banner'); }
  };

  return (
    <div className="pb-24 space-y-6 w-full animate-in fade-in duration-300">

      {/* Header: tombol buat banner */}
      <div className="flex justify-end">
        <Button onClick={() => navigate('/admin/banner/edit/new')} className="h-11 px-5 rounded-xl font-bold shadow-md hover:shadow-lg transition-all active:scale-[0.98] shrink-0">
          <Plus className="w-4 h-4 mr-2" /> Buat Banner Baru
        </Button>
      </div>

      {/* Content */}
      {banners.length === 0 ? (
        <div className="bg-card border-2 border-dashed border-border rounded-3xl p-16 flex flex-col items-center justify-center text-center">
          <div className="w-24 h-24 bg-muted rounded-full flex items-center justify-center mb-6">
            <Layout className="w-12 h-12 text-muted-foreground" strokeWidth={1.5} />
          </div>
          <h3 className="text-2xl font-black mb-2 text-foreground">Kanvas Kosong</h3>
          <p className="text-muted-foreground max-w-sm mb-8">Belum ada banner yang dibuat. Klik tombol di atas untuk memulai mahakarya Anda!</p>
          <Button variant="primary" onClick={() => navigate('/admin/banner/edit/new')} className="rounded-full px-8 shadow-lg">Mulai Desain</Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {banners.map((b: any) => {
            const bgPreview = b.bgType === 'solid' ? b.bgColor : b.bgType === 'gradient' ? b.bgGradient : undefined;
            const previewFilter = `brightness(${b.canvasBgFilter?.brightness || 100}%) contrast(${b.canvasBgFilter?.contrast || 100}%) saturate(${b.canvasBgFilter?.saturate || 100}%) blur(${b.canvasBgFilter?.blur || 0}px)`;
            const headP = b.headingPos ?? { x: 10, y: 20, w: 40 };
            const titleP = b.titlePos ?? { x: 10, y: 38, w: 60 };
            const descP  = b.descPos  ?? { x: 10, y: 60, w: 60 };
            const buttonP = b.buttonPos ?? { x: 10, y: 82 };
            const overP  = b.overlayPos ?? { x: 80, y: 50 };

            return (
              <Card key={b.id} className="overflow-hidden flex flex-col hover:shadow-xl transition-all duration-300 border hover:border-primary/40">

                {/* ── Visual Preview ── */}
                <div
                  className="aspect-[21/9] w-full relative bg-zinc-950 overflow-hidden shrink-0 border-b border-border"
                  style={{ background: bgPreview, containerType: 'inline-size' }}
                >
                  {/* Background image */}
                  {b.imageUrl && (
                    <div className="absolute inset-0 z-0">
                      <img src={b.imageUrl} alt="Banner" className="w-full h-full object-cover" style={{ filter: previewFilter }} />
                      {b.bgGradientOverlay?.enabled ? (
                        <div className="absolute inset-0 z-[1]" style={{
                          background: `linear-gradient(${b.bgGradientOverlay.angle ?? 90}deg, rgba(${hexToRgb(b.bgGradientOverlay.color || '#000000')}, ${(b.bgGradientOverlay.opacityLeft ?? 70) / 100}), rgba(${hexToRgb(b.bgGradientOverlay.color || '#000000')}, ${(b.bgGradientOverlay.opacityRight ?? 0) / 100}))`
                        }} />
                      ) : (
                        <div className="absolute inset-0 bg-gradient-to-r from-black/85 via-black/40 to-transparent z-[1]" />
                      )}
                    </div>
                  )}

                  {/* Background gradient tanpa gambar: tampilkan gradien overlay jika ada */}
                  {!b.imageUrl && b.bgGradientOverlay?.enabled && (
                    <div className="absolute inset-0 z-[1]" style={{
                      background: `linear-gradient(${b.bgGradientOverlay.angle ?? 90}deg, rgba(${hexToRgb(b.bgGradientOverlay.color || '#000000')}, ${(b.bgGradientOverlay.opacityLeft ?? 70) / 100}), rgba(${hexToRgb(b.bgGradientOverlay.color || '#000000')}, ${(b.bgGradientOverlay.opacityRight ?? 0) / 100}))`
                    }} />
                  )}

                  {/* Overlay stiker */}
                  {b.overlayImageUrl && (
                    <div style={{ position: 'absolute', left: `${overP.x}%`, top: `${overP.y}%`, transform: 'translate(-50%, -50%)', zIndex: 5 }}>
                      <img src={b.overlayImageUrl} style={{ transform: `scaleX(${b.overlayFlipX ? -1 : 1}) rotate(${b.overlayRotate ?? 0}deg)`, width: `calc(${b.overlayScale ?? 1} * 20cqw)`, height: 'auto', borderRadius: `${b.overlayBorderRadius ?? 0}%` }} alt="" className="object-contain" />
                    </div>
                  )}

                  {/* Heading */}
                  {b.heading && (
                    <div style={{ position: 'absolute', left: `${headP.x}%`, top: `${headP.y}%`, transform: 'translate(0%, -50%)', zIndex: 10, width: `${headP.w ?? 40}%` }}>
                      <span
                        style={{
                          backgroundColor: b.headingStyle === 'solid-white' ? '#FFFFFF' : b.headingStyle === 'solid-dark' ? '#09090b' : b.headingStyle === 'outline-white' ? 'transparent' : b.headingStyle === 'neon' ? 'rgba(34,211,238,0.15)' : b.headingStyle === 'retro' ? '#fbbf24' : 'rgba(255,255,255,0.2)',
                          color: b.headingStyle === 'solid-white' ? '#0f172a' : b.headingStyle === 'solid-dark' ? '#ffffff' : b.headingStyle === 'neon' ? '#a5f3fc' : b.headingStyle === 'retro' ? '#09090b' : '#ffffff',
                          border: b.headingStyle === 'outline-white' ? '0.2cqw solid #ffffff' : b.headingStyle === 'neon' ? '0.15cqw solid #22d3ee' : b.headingStyle === 'retro' ? '0.2cqw solid #09090b' : '0.1cqw solid rgba(255,255,255,0.1)',
                          boxShadow: b.headingStyle === 'neon' ? '0 0 12px rgba(34,211,238,0.4)' : b.headingStyle === 'retro' ? '0.25cqw 0.25cqw 0px #09090b' : 'none',
                          backdropFilter: (b.headingStyle === 'glass' || !b.headingStyle) ? 'blur(8px)' : undefined,
                        }}
                        className="text-[2.2cqw] px-[1.5cqw] py-[0.5cqw] rounded inline-block uppercase tracking-widest select-none"
                        dangerouslySetInnerHTML={{ __html: b.heading }}
                      />
                    </div>
                  )}

                  {/* Title */}
                  {b.title && (
                    <div style={{ position: 'absolute', left: `${titleP.x}%`, top: `${titleP.y}%`, transform: 'translate(0%, -50%)', zIndex: 10, width: `${titleP.w ?? 60}%` }}>
                      <h4 className="font-black text-[4.5cqw] leading-[1.15] line-clamp-2 text-white m-0 select-none text-left drop-shadow" dangerouslySetInnerHTML={{ __html: b.title }} />
                    </div>
                  )}

                  {/* Description */}
                  {b.description && (
                    <div style={{ position: 'absolute', left: `${descP.x}%`, top: `${descP.y}%`, transform: 'translate(0%, -50%)', zIndex: 10, width: `${descP.w ?? 60}%` }}>
                      <p className="text-[2.8cqw] text-slate-100 line-clamp-2 leading-[1.3] font-medium m-0 select-none text-left drop-shadow" dangerouslySetInnerHTML={{ __html: b.description }} />
                    </div>
                  )}

                  {/* Button */}
                  {(b.link || b.buttonText) && (
                    <div style={{ position: 'absolute', left: `${buttonP.x}%`, top: `${buttonP.y}%`, transform: 'translate(0%, -50%)', zIndex: 10 }}>
                      <span
                        style={{
                          backgroundColor: b.badgeStyle === 'solid' ? '#FFFFFF' : b.badgeStyle === 'outline' ? 'transparent' : b.badgeStyle === 'glass' ? 'rgba(255,255,255,0.2)' : b.badgeStyle === 'soft-dark' ? 'rgba(0,0,0,0.4)' : b.badgeStyle === 'neon' ? '#06b6d4' : b.badgeStyle === 'retro' ? '#eab308' : '#FFFFFF',
                          color: b.badgeStyle === 'solid' ? '#0F172A' : b.badgeStyle === 'outline' ? '#FFFFFF' : b.badgeStyle === 'glass' ? '#FFFFFF' : b.badgeStyle === 'soft-dark' ? '#FFFFFF' : b.badgeStyle === 'neon' ? '#ffffff' : b.badgeStyle === 'retro' ? '#09090b' : '#0F172A',
                          border: b.badgeStyle === 'solid' ? 'none' : b.badgeStyle === 'outline' ? '0.2cqw solid #FFFFFF' : b.badgeStyle === 'glass' ? '0.15cqw solid rgba(255,255,255,0.2)' : b.badgeStyle === 'soft-dark' ? '0.15cqw solid rgba(255,255,255,0.2)' : b.badgeStyle === 'neon' ? 'none' : b.badgeStyle === 'retro' ? '0.25cqw solid #09090b' : 'none',
                          boxShadow: b.badgeStyle === 'neon' ? '0 0 15px rgba(6,182,212,0.6)' : b.badgeStyle === 'retro' ? '0.3cqw 0.3cqw 0px #09090b' : 'none',
                          backdropFilter: (b.badgeStyle === 'glass' || b.badgeStyle === 'soft-dark') ? 'blur(8px)' : undefined,
                        }}
                        className="text-[2.4cqw] font-extrabold px-[2.5cqw] py-[0.8cqw] rounded-md shadow select-none inline-block"
                      >
                        {b.buttonText || 'Lihat Detail'}
                      </span>
                    </div>
                  )}

                  {/* Status badge */}
                  <div className="absolute top-4 right-4 flex gap-2">
                    <Badge variant={b.isActive ? "success" : "default"} className="shadow-lg backdrop-blur-md bg-white/90 dark:bg-zinc-900/90">
                      {b.isActive ? 'Ditampilkan' : 'Disembunyikan'}
                    </Badge>
                  </div>
                </div>

                {/* ── Info & Actions ── */}
                <div className="p-5 flex flex-col flex-1 bg-card">
                  <h4 className="text-base font-black mb-1 line-clamp-1 text-foreground">{b.title || '(Tanpa Judul)'}</h4>
                  <p className="text-xs text-muted-foreground line-clamp-2 mb-4 flex-1">{b.description ? b.description.replace(/<[^>]*>/g, '') : 'Tidak ada deskripsi'}</p>

                  <div className="flex items-center justify-between pt-4 border-t border-border">
                    <div className="flex items-center gap-3">
                      <Switch checked={!!b.isActive} onCheckedChange={() => handleToggleActive(b.id, b.isActive)} />
                      <span className="text-xs font-bold text-muted-foreground">Tampil</span>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" className="h-9 px-3 rounded-lg gap-1.5 text-xs font-semibold border border-border hover:border-primary hover:text-primary"
                        onClick={() => navigate('/admin/banner/edit/' + b.id)}>
                        <Edit2 className="w-3.5 h-3.5" /> Edit
                      </Button>
                      <Button variant="ghost" size="sm" className="h-9 px-3 rounded-lg gap-1.5 text-xs font-semibold text-destructive hover:bg-destructive/10 border border-destructive/20 hover:border-destructive/40"
                        onClick={() => setDeleteBannerId(b.id)}>
                        <Trash2 className="w-3.5 h-3.5" /> Hapus
                      </Button>
                    </div>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Delete dialog */}
      {deleteBannerId && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center px-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-zinc-900 w-full max-w-md rounded-[2rem] p-8 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 text-red-500 rounded-2xl flex items-center justify-center mb-6 mx-auto">
              <Trash2 className="w-8 h-8" />
            </div>
            <h3 className="text-2xl font-black text-center mb-2">Hapus Banner?</h3>
            <p className="text-center text-zinc-500 dark:text-zinc-400 mb-8">
              Aksi ini tidak dapat dibatalkan. Semua desain banner Anda akan terhapus secara permanen dari database.
            </p>
            <div className="flex gap-3">
              <Button variant="secondary" className="flex-1 rounded-2xl h-12" onClick={() => setDeleteBannerId(null)}>Batal</Button>
              <Button variant="danger" className="flex-1 rounded-2xl h-12" onClick={handleDeleteBanner}>Ya, Hapus</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
