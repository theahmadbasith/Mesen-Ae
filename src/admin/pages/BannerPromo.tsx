import React, { useState } from 'react';
import { Plus, Edit2, Trash2, LayoutGrid, Image as ImageIcon } from 'lucide-react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

import { useDbQuery, dbUpdate, dbDelete } from '@/hooks/db-hooks';

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
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-card p-6 rounded-2xl border border-border shadow-sm">
        <div>
          <h2 className="text-2xl font-black tracking-tight flex items-center gap-2 text-foreground">
            <LayoutGrid className="w-7 h-7 text-primary" />
            Banner &amp; Promo
          </h2>
          <p className="text-muted-foreground mt-1 text-sm">Kelola tampilan banner yang muncul di halaman pelanggan.</p>
        </div>
        <Button onClick={() => navigate('/admin/banner/edit/new')} className="w-full sm:w-auto rounded-xl h-11 px-6 gap-2">
          <Plus className="w-5 h-5" />
          Tambah Banner
        </Button>
      </div>

      {/* List / Empty State */}
      {(!banners || banners.length === 0) ? (
        <div className="text-center py-20 bg-card rounded-2xl border border-dashed border-border">
          <div className="w-20 h-20 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
            <ImageIcon className="w-10 h-10 text-muted-foreground" />
          </div>
          <h3 className="text-xl font-bold mb-2 text-foreground">Belum ada banner</h3>
          <p className="text-muted-foreground mb-6 text-sm">Buat banner pertamamu untuk menarik perhatian pelanggan.</p>
          <Button onClick={() => navigate('/admin/banner/edit/new')} className="rounded-xl gap-2">
            <Plus className="w-4 h-4" />
            Buat Banner Sekarang
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {banners.map((b: any) => {
            const canvasBg = b.bgType === 'solid'
              ? b.bgColor
              : b.bgType === 'gradient'
              ? b.bgGradient
              : undefined;

            return (
              <Card key={b.id} className="overflow-hidden flex flex-col hover:shadow-lg transition-all border border-border">
                {/* Preview Mini */}
                <div
                  className="aspect-[2/1] relative overflow-hidden bg-muted shrink-0"
                  style={{
                    background: canvasBg,
                    backgroundImage: b.imageUrl ? `url(${b.imageUrl})` : canvasBg,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                  }}
                >
                  {b.canvasBgFilter && (
                    <div className="absolute inset-0" style={{
                      filter: `brightness(${b.canvasBgFilter.brightness}%) contrast(${b.canvasBgFilter.contrast}%) saturate(${b.canvasBgFilter.saturate}%) blur(${b.canvasBgFilter.blur}px)`
                    }} />
                  )}

                  {b.bgGradientOverlay?.enabled && (
                    <div className="absolute inset-0" style={{
                      background: `linear-gradient(${b.bgGradientOverlay.angle}deg, ${b.bgGradientOverlay.color}${Math.round(b.bgGradientOverlay.opacityLeft * 2.55).toString(16).padStart(2, '0')}, ${b.bgGradientOverlay.color}${Math.round(b.bgGradientOverlay.opacityRight * 2.55).toString(16).padStart(2, '0')})`
                    }} />
                  )}

                  {/* Banner label preview */}
                  <div className="absolute inset-0 pointer-events-none">
                    <div className="absolute inset-4 border border-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm bg-black/10">
                      <span className="text-white font-bold tracking-widest text-sm shadow-sm">
                        {b.heading || b.title || 'BANNER'}
                      </span>
                    </div>
                  </div>

                  {/* Status Badge */}
                  <div className="absolute top-3 right-3">
                    <Badge
                      variant={b.isActive ? 'default' : 'secondary'}
                      className={
                        b.isActive
                          ? 'bg-emerald-500/90 text-white border-0 backdrop-blur-sm shadow-sm'
                          : 'bg-background/80 text-muted-foreground backdrop-blur-sm shadow-sm'
                      }
                    >
                      {b.isActive ? 'Ditampilkan' : 'Disembunyikan'}
                    </Badge>
                  </div>
                </div>

                {/* Info */}
                <CardContent className="p-5 flex flex-col flex-1">
                  <h4 className="text-base font-black mb-1 line-clamp-1 text-foreground">
                    {b.title || '(Tanpa Judul)'}
                  </h4>
                  <p className="text-xs text-muted-foreground line-clamp-2 flex-1">
                    {b.description ? b.description.replace(/<[^>]*>/g, '') : 'Tidak ada deskripsi'}
                  </p>
                </CardContent>

                {/* Actions */}
                <CardFooter className="px-5 pb-5 pt-0 flex items-center justify-between border-t border-border pt-4">
                  <div className="flex items-center gap-2.5">
                    <Switch
                      checked={!!b.isActive}
                      onCheckedChange={() => handleToggleActive(b.id, b.isActive)}
                    />
                    <span className="text-xs font-semibold text-muted-foreground">Tampil</span>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-9 px-3 rounded-lg gap-1.5 text-xs font-semibold"
                      onClick={() => navigate('/admin/banner/edit/' + b.id)}
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                      Edit
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      className="h-9 px-3 rounded-lg gap-1.5 text-xs font-semibold bg-destructive/10 text-destructive hover:bg-destructive hover:text-destructive-foreground border border-destructive/20"
                      onClick={() => setDeleteBannerId(b.id)}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Hapus
                    </Button>
                  </div>
                </CardFooter>
              </Card>
            );
          })}
        </div>
      )}

      {/* Delete Dialog */}
      <AlertDialog open={!!deleteBannerId} onOpenChange={(open) => !open && setDeleteBannerId(null)}>
        <AlertDialogContent className="max-w-[400px] w-[95vw] rounded-2xl p-6">
          <AlertDialogHeader>
            <div className="w-14 h-14 bg-destructive/10 text-destructive rounded-2xl flex items-center justify-center mb-4 mx-auto">
              <Trash2 className="w-7 h-7" />
            </div>
            <AlertDialogTitle className="text-center text-xl font-black">Hapus Banner?</AlertDialogTitle>
            <AlertDialogDescription className="text-center text-sm">
              Aksi ini tidak dapat dibatalkan. Semua desain banner Anda akan terhapus secara permanen.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex gap-3 mt-2">
            <AlertDialogCancel className="flex-1 rounded-xl h-11">Batal</AlertDialogCancel>
            <AlertDialogAction
              className="flex-1 rounded-xl h-11 bg-destructive hover:bg-destructive/90 text-destructive-foreground"
              onClick={handleDeleteBanner}
            >
              Ya, Hapus
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
