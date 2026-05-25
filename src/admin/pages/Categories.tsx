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

export default function Categories() {
  const categories = useDbQuery<Category>('categories');

  /* ── Kategori State ── */
  const [catDialog, setCatDialog] = useState(false);
  const [catEditId, setCatEditId] = useState<string | null>(null);
  const [catName, setCatName] = useState('');
  const [catIcon, setCatIcon] = useState('📦');
  const [catColor, setCatColor] = useState('#3b82f6');
  const [catNeedsKitchen, setCatNeedsKitchen] = useState(true);
  const [isSavingCat, setIsSavingCat] = useState(false);

  const openCatAdd = () => {
    setCatEditId(null);
    setCatName('');
    setCatIcon('📦');
    setCatColor('#3b82f6');
    setCatNeedsKitchen(true);
    setCatDialog(true);
  };

  const openCatEdit = (c: Category) => {
    setCatEditId(c.id!);
    setCatName(c.name);
    setCatIcon(c.icon);
    setCatColor(c.color);
    setCatNeedsKitchen(c.needsKitchen ?? true);
    setCatDialog(true);
  };

  const deleteCat = async (id: string) => {
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
    if (!catName.trim()) return;
    setIsSavingCat(true);
    try {
      if (catEditId) {
        await dbUpdate('categories', catEditId, { name: catName, icon: catIcon, color: catColor, needsKitchen: catNeedsKitchen });
      } else {
        await dbInsert('categories', { name: catName, icon: catIcon, color: catColor, needsKitchen: catNeedsKitchen, createdAt: new Date().toISOString() });
      }
      setCatDialog(false);
      toast.success('Kategori berhasil disimpan');
    } catch (error: any) {
      toast.error('Gagal menyimpan kategori: ' + (error.message || error));
    } finally {
      setIsSavingCat(false);
    }
  };

  return (
    <div className="px-4 pt-6 pb-24 space-y-6 w-full mx-auto animate-in fade-in duration-300">
      
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-muted-foreground">
          {categories?.length ?? 0} kategori terdaftar.
        </p>
        <Button onClick={openCatAdd} className="h-11 px-5 rounded-xl font-bold shadow-md hover:shadow-lg transition-all active:scale-[0.98] shrink-0">
          <Plus className="w-5 h-5 mr-2" strokeWidth={3} />
          Tambah Kategori
        </Button>
      </div>

      {!categories?.length ? (
        <Card className="border border-border/50 shadow-sm bg-card">
          <div className="flex flex-col items-center py-12 text-center text-muted-foreground gap-3">
            <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
              <Tag className="w-6 h-6 opacity-40" />
            </div>
            <p className="text-sm font-medium text-foreground">Belum ada kategori produk</p>
            <p className="text-xs max-w-[200px] mb-2">Buat kategori pertama Anda untuk mengelompokkan produk jualan.</p>
            <Button size="sm" variant="outline" className="gap-1.5 h-8 text-xs font-semibold" onClick={openCatAdd}>
              <Plus className="w-3.5 h-3.5" /> Tambah Sekarang
            </Button>
          </div>
        </Card>
      ) : (
        <Card className="border border-border/50 shadow-sm bg-card overflow-hidden">
          {categories.map((c, i) => (
            <div
              key={c.id}
              className={cn(
                'flex items-center gap-4 px-5 py-4 hover:bg-muted/30 transition-colors',
                i < categories.length - 1 && 'border-b border-border/40'
              )}
            >
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center text-xl shrink-0 shadow-sm border border-black/5 dark:border-white/5"
                style={{ backgroundColor: c.color + '20', color: c.color }}
              >
                {c.icon}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-bold text-foreground">{c.name}</p>
                  {c.needsKitchen !== false ? (
                    <span className="bg-amber-500/10 text-amber-600 dark:text-amber-400 px-2 py-0.5 rounded-full text-[9px] font-bold border border-amber-500/20 uppercase tracking-wider">
                      Dapur
                    </span>
                  ) : (
                    <span className="bg-slate-500/10 text-slate-600 dark:text-slate-400 px-2 py-0.5 rounded-full text-[9px] font-bold border border-slate-500/20 uppercase tracking-wider">
                      Ritel
                    </span>
                  )}
                </div>
              </div>
              <div className="flex gap-2 shrink-0">
                <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-lg" onClick={() => openCatEdit(c)}>
                  <Edit2 className="w-4 h-4" />
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-rose-500/70 hover:text-rose-500 hover:bg-rose-500/10 rounded-lg" onClick={() => deleteCat(c.id!)}>
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ))}
        </Card>
      )}

      {/* Dialog Kategori */}
      <Dialog open={catDialog} onOpenChange={setCatDialog}>
        <DialogContent className="max-w-[360px] rounded-2xl p-0 overflow-hidden bg-background border-border shadow-xl">
          <div className="bg-primary/5 p-5 border-b border-border/40">
            <DialogHeader>
              <DialogTitle className="text-base font-bold">{catEditId ? 'Edit' : 'Tambah'} Kategori</DialogTitle>
              <DialogDescription className="text-[11px] mt-1">
                {catEditId ? 'Ubah rincian kategori yang sudah ada.' : 'Buat kategori baru untuk produk Anda.'}
              </DialogDescription>
            </DialogHeader>
          </div>
          <form onSubmit={saveCat} className="p-5 space-y-4">
            <div className="space-y-3.5">
              <div className="space-y-1.5">
                <Label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Nama Kategori</Label>
                <Input
                  value={catName}
                  onChange={(e) => setCatName(e.target.value)}
                  placeholder="Cth: Makanan Berat"
                  className="h-10 text-sm rounded-xl"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Emoji / Ikon</Label>
                  <div className="flex flex-col gap-2">
                    <Input
                      value={catIcon}
                      onChange={(e) => setCatIcon(e.target.value)}
                      placeholder="📦"
                      className="h-10 text-center text-lg rounded-xl font-bold"
                      maxLength={2}
                    />
                    <div className="flex flex-wrap gap-1 max-h-[70px] overflow-y-auto no-scrollbar border border-border/50 p-1.5 rounded-lg bg-muted/20">
                      {['📦', '🍔', '🍕', '🍜', '🥤', '☕', '🧁', '🍦', '🏷️', '🚬', '🧼', '🧹', '📱', '🛒', '🛍️', '🍺'].map(emoji => (
                        <button
                          type="button"
                          key={emoji}
                          onClick={() => setCatIcon(emoji)}
                          className={cn(
                            "w-6 h-6 flex items-center justify-center text-xs rounded-md transition-all hover:bg-muted active:scale-90",
                            catIcon === emoji ? "bg-primary/20 border border-primary/45 font-bold" : "bg-muted/40 border border-transparent"
                          )}
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Warna Tema</Label>
                  <div className="flex flex-col gap-2">
                    <Input
                      type="color"
                      value={catColor}
                      onChange={(e) => setCatColor(e.target.value)}
                      className="h-10 w-full p-1 cursor-pointer rounded-xl border-border/50"
                    />
                    <p className="text-[10px] text-muted-foreground leading-normal mt-0.5">Warna ini digunakan untuk latar belakang ikon.</p>
                  </div>
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
    </div>
  );
}
