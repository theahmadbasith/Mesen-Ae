import React, { useState } from 'react';
import { Plus, Edit2, Trash2, LayoutGrid, Image as ImageIcon } from 'lucide-react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

import { useDbQuery, dbUpdate, dbDelete } from '@/hooks/db-hooks';

const cn = (...classes: any[]) => classes.filter(Boolean).join(' ');

const Button = ({ children, className, variant = 'primary', size = 'md', ...props }: any) => {
  const base = "inline-flex items-center justify-center rounded-xl font-bold transition-all focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed";
  const variants: any = {
    primary: "bg-blue-600 hover:bg-blue-700 text-white shadow-md",
    secondary: "bg-zinc-200 dark:bg-zinc-800 hover:bg-zinc-300 dark:hover:bg-zinc-700 text-zinc-900 dark:text-zinc-100",
    outline: "border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-900 bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 shadow-sm",
    ghost: "hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100",
    danger: "bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 shadow-sm",
  };
  const sizes: any = {
    sm: "h-8 px-3 text-xs",
    md: "h-10 px-4 text-sm",
    lg: "h-12 px-6 text-base",
    icon: "h-10 w-10 p-0",
  };
  return <button className={cn(base, variants[variant], sizes[size], className)} {...props}>{children}</button>;
};

const Switch = ({ checked, onCheckedChange }: any) => (
  <button type="button" role="switch" aria-checked={checked} onClick={() => onCheckedChange(!checked)}
    className={cn("relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2", checked ? "bg-blue-600" : "bg-zinc-300 dark:bg-zinc-700")}>
    <span className={cn("pointer-events-none block h-5 w-5 rounded-full bg-white shadow-lg ring-0 transition-transform", checked ? "translate-x-5" : "translate-x-0")} />
  </button>
);

const Badge = ({ children, variant = 'default', className }: any) => {
  const variants: any = {
    default: "bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100",
    primary: "bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300",
    success: "bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300",
  };
  return <span className={cn("inline-flex items-center rounded-md px-2 py-1 text-xs font-normal ring-1 ring-inset ring-zinc-500/20", variants[variant], className)}>{children}</span>;
}

const Card = ({ children, className }: any) => (
  <div className={cn("rounded-3xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-zinc-950 dark:text-zinc-50 shadow-sm", className)}>{children}</div>
);

export default function BannerPromoList() {
  const banners = useDbQuery('banners');
  const [deleteBannerId, setDeleteBannerId] = useState<string | null>(null);
  const navigate = useNavigate();

  const handleDeleteBanner = async () => {
    if (!deleteBannerId) return;
    try {
      await dbDelete('banners', deleteBannerId);
      toast.success('Banner berhasil dihapus');
      setDeleteBannerId(null);
    } catch (err) {
      toast.error('Gagal menghapus banner');
    }
  };

  const handleToggleActive = async (id: string, cur: boolean) => {
    try {
      await dbUpdate('banners', id, { isActive: !cur });
      toast.success(!cur ? 'Banner ditampilkan' : 'Banner disembunyikan');
    } catch (err) {
      toast.error('Gagal mengubah status');
    }
  };

  return (
    <div className="w-full max-w-6xl mx-auto space-y-6 pb-20">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-zinc-950 p-6 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
        <div>
          <h2 className="text-2xl font-black tracking-tight flex items-center gap-2">
            <LayoutGrid className="w-7 h-7 text-blue-600" />
            Banner & Promo
          </h2>
          <p className="text-zinc-500 dark:text-zinc-400 mt-1">Kelola tampilan banner yang muncul di halaman pelanggan.</p>
        </div>
        <Button onClick={() => navigate('/admin/banner/edit/new')} className="w-full sm:w-auto rounded-2xl h-12 px-6">
          <Plus className="w-5 h-5 mr-2" />
          Tambah Banner
        </Button>
      </div>

      {/* List / Empty State */}
      {(!banners || banners.length === 0) ? (
        <div className="text-center py-20 bg-white dark:bg-zinc-950 rounded-3xl border border-dashed border-zinc-300 dark:border-zinc-800">
          <div className="w-20 h-20 bg-zinc-100 dark:bg-zinc-900 rounded-full flex items-center justify-center mx-auto mb-4">
            <ImageIcon className="w-10 h-10 text-zinc-400" />
          </div>
          <h3 className="text-xl font-bold mb-2">Belum ada banner</h3>
          <p className="text-zinc-500 dark:text-zinc-400 mb-6">Buat banner pertamamu untuk menarik perhatian pelanggan.</p>
          <Button onClick={() => navigate('/admin/banner/edit/new')} className="rounded-2xl">Buat Banner Sekarang</Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {banners.map((b: any) => {
            const canvasBg = b.bgType === 'solid' ? b.bgColor : b.bgType === 'gradient' ? b.bgGradient : undefined;
            return (
              <Card key={b.id} className="overflow-hidden flex flex-col hover:shadow-lg transition-all group border border-zinc-200 dark:border-zinc-800">
                {/* Preview Mini */}
                <div 
                  className="aspect-[2/1] relative overflow-hidden bg-zinc-100 dark:bg-zinc-900 shrink-0"
                  style={{ background: canvasBg, backgroundImage: b.imageUrl ? `url(${b.imageUrl})` : canvasBg, backgroundSize: 'cover', backgroundPosition: 'center' }}
                >
                  <div className="absolute inset-0" style={{ filter: b.canvasBgFilter ? `brightness(${b.canvasBgFilter.brightness}%) contrast(${b.canvasBgFilter.contrast}%) saturate(${b.canvasBgFilter.saturate}%) blur(${b.canvasBgFilter.blur}px)` : 'none' }}></div>
                  
                  {b.bgGradientOverlay?.enabled && (
                    <div className="absolute inset-0" style={{ background: `linear-gradient(${b.bgGradientOverlay.angle}deg, ${b.bgGradientOverlay.color}${Math.round(b.bgGradientOverlay.opacityLeft * 2.55).toString(16).padStart(2,'0')}, ${b.bgGradientOverlay.color}${Math.round(b.bgGradientOverlay.opacityRight * 2.55).toString(16).padStart(2,'0')})` }} />
                  )}

                  {/* Render Elements based on positions */}
                  <div className="absolute inset-0 pointer-events-none">
                    {/* Simplified render just to show it exists */}
                    <div className="absolute inset-4 border border-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm bg-black/10">
                      <span className="text-white font-bold tracking-widest text-sm shadow-sm">{b.heading || b.title || 'BANNER'}</span>
                    </div>
                  </div>

                  {/* Status Overlay */}
                  <div className="absolute top-4 right-4 flex gap-2">
                     <Badge variant={b.isActive ? "success" : "default"} className="shadow-lg backdrop-blur-md bg-white/90 dark:bg-zinc-900/90 text-xs font-medium">
                       {b.isActive ? 'Ditampilkan' : 'Disembunyikan'}
                     </Badge>
                  </div>
                </div>

                {/* Info & Actions */}
                <div className="p-5 flex flex-col flex-1 bg-white dark:bg-zinc-950">
                  <h4 className="text-base font-black mb-1 line-clamp-1 text-zinc-900 dark:text-white">{b.title || '(Tanpa Judul)'}</h4>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 line-clamp-2 mb-5 flex-1">
                    {b.description ? b.description.replace(/<[^>]*>/g, '') : 'Tidak ada deskripsi'}
                  </p>
                  
                  <div className="flex items-center justify-between pt-4 border-t border-zinc-100 dark:border-zinc-800">
                     <div className="flex items-center gap-3">
                        <Switch checked={b.isActive} onCheckedChange={() => handleToggleActive(b.id, b.isActive)} />
                        <span className="text-xs font-bold text-zinc-500">Tampil</span>
                     </div>
                     <div className="flex gap-2">
                       <Button variant="outline" size="sm" className="h-9 px-3 rounded-lg" onClick={() => navigate('/admin/banner/edit/' + b.id)}>
                         <Edit2 className="w-3.5 h-3.5 mr-1.5" /> Edit
                       </Button>
                       <Button variant="danger" size="sm" className="h-9 px-3 rounded-lg" onClick={() => setDeleteBannerId(b.id)}>
                         <Trash2 className="w-3.5 h-3.5 mr-1.5" /> Hapus
                       </Button>
                     </div>
                   </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Delete Dialog */}
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
