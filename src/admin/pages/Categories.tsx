import React, { useState } from 'react';
import { useDbQuery, dbInsert, dbUpdate, dbDelete } from '@/hooks/db-hooks';
import { Category } from '@/types';
import { Tag, Plus, Edit2, Trash2, Loader2, ArrowLeft } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { Link } from 'react-router-dom';
import { usePermissions } from '@/hooks/use-permissions';

export default function Categories() {
  const categories = useDbQuery<Category>('categories');

  /* ── Kategori State ── */
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editCategory, setEditCategory] = useState<Category | null>(null);

  const { canEdit } = usePermissions();
  const hasEditAccess = canEdit('categories');

  const [name, setName] = useState('');
  const [catIcon, setCatIcon] = useState('📦');
  const [catColor, setCatColor] = useState('#3b82f6');
  const [catNeedsKitchen, setCatNeedsKitchen] = useState(true);
  const [isSavingCat, setIsSavingCat] = useState(false);

  const openAdd = () => {
    setEditCategory(null);
    setName('');
    setCatIcon('📦');
    setCatColor('#3b82f6');
    setCatNeedsKitchen(true);
    setDialogOpen(true);
  };

  const openEdit = (c: Category) => {
    setEditCategory(c);
    setName(c.name);
    setCatIcon(c.icon);
    setCatColor(c.color);
    setCatNeedsKitchen(c.needsKitchen ?? true);
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!hasEditAccess) {
      toast.error('Akses ditolak. Anda tidak memiliki izin untuk mengelola kategori.');
      return;
    }
    if (!confirm('Hapus kategori ini secara permanen?')) return;
    try {
      await dbDelete('categories', id);
      toast.success('Kategori dihapus');
    } catch (error: any) {
      toast.error('Gagal menghapus kategori: ' + (error.message || error));
    }
  };

  const saveCat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hasEditAccess) {
      toast.error('Akses ditolak. Anda tidak memiliki izin untuk mengelola kategori.');
      return;
    }
    if (!name.trim()) return;
    setIsSavingCat(true);
    try {
      if (editCategory) {
        await dbUpdate('categories', editCategory.id!, { name: name, icon: catIcon, color: catColor, needsKitchen: catNeedsKitchen });
      } else {
        await dbInsert('categories', { name: name, icon: catIcon, color: catColor, needsKitchen: catNeedsKitchen, createdAt: new Date().toISOString() });
      }
      setDialogOpen(false);
      toast.success('Kategori berhasil disimpan');
    } catch (error: any) {
      toast.error('Gagal menyimpan kategori: ' + (error.message || error));
    } finally {
      setIsSavingCat(false);
    }
  };

  return (
    <div className="pt- pb-24 space-y-6 w-full mx-auto animate-in fade-in duration-300">
      
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-muted-foreground">
          {categories?.length ?? 0} kategori terdaftar.
        </p>
        {hasEditAccess && (
        <div className="flex justify-end">
          <Button onClick={openAdd} className="h-11 px-5 rounded-xl font-bold shadow-md hover:shadow-lg transition-all active:scale-[0.98] shrink-0">
            <Plus className="w-5 h-5 mr-2" strokeWidth={3} />
            Tambah Kategori
          </Button>
        </div>
        )}
      </div>

      {!categories?.length ? (
        <Card className="border border-border/50 shadow-sm bg-card">
          <div className="flex flex-col items-center py-12 text-center text-muted-foreground gap-3">
            <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
              <Tag className="w-6 h-6 opacity-40" />
            </div>
            <h3 className="text-lg font-bold text-foreground mb-1">Kategori Kosong</h3>
            <p className="text-sm text-muted-foreground max-w-sm">Belum ada kategori yang ditambahkan. Silahkan tambah kategori pertama Anda.</p>
            {hasEditAccess && (
            <Button variant="outline" className="mt-6 rounded-xl border-primary/20 text-primary hover:bg-primary/5 font-bold" onClick={openAdd}>
              <Plus className="w-4 h-4 mr-2" /> Tambah Kategori
            </Button>
            )}
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {categories.map((c) => (
            <Card
              key={c.id}
              className="group border border-border/50 shadow-sm hover:shadow-md hover:border-primary/40 transition-all duration-300 bg-card overflow-hidden"
            >
              <div className="p-5 flex items-start gap-4">
                <div
                  className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl shrink-0 shadow-inner border border-black/5 dark:border-white/5 transition-transform group-hover:scale-110 duration-300"
                  style={{ backgroundColor: c.color + '15', color: c.color }}
                >
                  {c.icon}
                </div>
                <div className="flex-1 min-w-0 pt-1">
                  <p className="text-base font-bold text-foreground truncate">{c.name}</p>
                  <div className="mt-2">
                    {c.needsKitchen !== false ? (
                      <span className="inline-flex items-center gap-1 bg-amber-500/10 text-amber-600 dark:text-amber-400 px-2.5 py-1 rounded-md text-[10px] font-bold border border-amber-500/20 uppercase tracking-wider">
                        Dapur
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 bg-slate-500/10 text-slate-600 dark:text-slate-400 px-2.5 py-1 rounded-md text-[10px] font-bold border border-slate-500/20 uppercase tracking-wider">
                        Ritel
                      </span>
                    )}
                  </div>
                </div>
                {hasEditAccess && (
                <div className="flex gap-1.5 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button variant="secondary" size="icon" className="h-8 w-8 rounded-lg hover:bg-primary hover:text-white" onClick={() => openEdit(c)}>
                    <Edit2 className="w-3.5 h-3.5" />
                  </Button>
                  <Button variant="destructive" size="icon" className="h-8 w-8 rounded-lg" onClick={() => handleDelete(c.id!)}>
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Dialog Kategori */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-[420px] sm:max-w-[500px] rounded-2xl p-0 overflow-hidden bg-background border-border shadow-xl">
          <div className="bg-primary/5 p-5 border-b border-border/40">
            <DialogHeader>
              <DialogTitle className="text-base font-bold">{editCategory ? 'Edit' : 'Tambah'} Kategori</DialogTitle>
              <DialogDescription className="text-[11px] mt-1">
                {editCategory ? 'Ubah rincian kategori yang sudah ada.' : 'Buat kategori baru untuk produk Anda.'}
              </DialogDescription>
            </DialogHeader>
          </div>
          <form onSubmit={saveCat} className="p-5 space-y-4">
            <div className="space-y-3.5">
              <div className="space-y-1.5">
                <Label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Nama Kategori</Label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Cth: Makanan Berat"
                  className="h-10 text-sm rounded-xl"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Ketik Ikon (Emoji)</Label>
                  <Input
                    value={catIcon}
                    onChange={(e) => setCatIcon(e.target.value)}
                    placeholder="📦"
                    className="h-10 text-center text-lg rounded-xl font-bold"
                    maxLength={2}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Warna Tema Kategori</Label>
                  <Input
                    type="color"
                    value={catColor}
                    onChange={(e) => setCatColor(e.target.value)}
                    className="h-10 w-full p-1 cursor-pointer rounded-xl border-border/50"
                  />
                </div>
              </div>

              {/* Emoji Picker Full Width */}
              <div className="space-y-2">
                <Label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Atau Pilih dari Saran</Label>
                <div className="flex flex-wrap gap-1.5 max-h-[160px] overflow-y-auto custom-scrollbar border border-border/50 p-2.5 rounded-xl bg-muted/10 shadow-inner">
                  {['📦', '🍔', '🍕', '🍜', '🥤', '☕', '🧁', '🍦', '🏷️', '🚬', '🧼', '🧹', '📱', '🛒', '🛍️', '🍺', '🍚', '🍗', '🥐', '🍞', '🍟', '🥩', '🥘', '🍲', '🍣', '🍱', '🍧', '🍰', '🍹', '🍵', '🍶', '🍎', '🍓', '🥑', '🌶️', '🥩', '🥓', '🍳', '🥞', '🥗', '🍿', '🍘', '🍙', '🍛', '🦞', '🦐', '🦑', '🍢', '🍡', '🍭', '🍬', '🍫', '🍩', '🍪', '🌰', '🥜', '🧋', '🧉', '🍾', '🍷', '🥂', '🍻', '🥃', '🧊', '🥄', '🍴', '🍽️', '🥣', '🥡', '🥢', '🧂'].map(emoji => (
                    <button
                      type="button"
                      key={emoji}
                      onClick={() => setCatIcon(emoji)}
                      className={cn(
                        "w-9 h-9 flex items-center justify-center text-xl rounded-lg transition-all hover:bg-muted active:scale-95",
                        catIcon === emoji ? "bg-primary/20 border-2 border-primary shadow-sm" : "bg-card border border-border/50 hover:border-primary/40 shadow-sm"
                      )}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex items-center justify-between p-3 border border-border/50 bg-muted/20 rounded-xl mt-2">
                <div className="space-y-0.5 pr-4">
                  <Label className="text-xs font-bold text-foreground">Disiapkan di Dapur</Label>
                  <p className="text-[10px] text-muted-foreground leading-normal">
                    Bila aktif, pesanan produk ini akan muncul di layar Dapur Koki.
                  </p>
                </div>
                <div className="shrink-0 flex items-center">
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input 
                      type="checkbox" 
                      className="sr-only peer" 
                      checked={catNeedsKitchen}
                      onChange={(e) => setCatNeedsKitchen(e.target.checked)}
                    />
                    <div className="w-11 h-6 bg-muted peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary shadow-inner"></div>
                  </label>
                </div>
              </div>
            </div>
            <div className="pt-2">
              <Button type="submit" className="w-full h-11 font-bold text-sm rounded-xl" disabled={isSavingCat}>
                {isSavingCat ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Menyimpan...</> : 'Simpan Kategori'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
      <style dangerouslySetInnerHTML={{__html: `
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background-color: rgba(156, 163, 175, 0.3); border-radius: 20px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background-color: rgba(156, 163, 175, 0.5); }
      `}} />
    </div>
  );
}
