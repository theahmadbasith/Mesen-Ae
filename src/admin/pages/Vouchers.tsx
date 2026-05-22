import { useDbQuery, dbInsert, dbUpdate, dbDelete } from '@/hooks/db-hooks';
import { type Voucher, type Product } from '@/hooks/db-hooks';
import { useState } from 'react';
import { Plus, Ticket, Edit2, Trash2, Tag, Percent, Banknote, ListFilter, Sparkles } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { FORMAT_IDR } from '@/lib/utils';
import { Switch } from '@/components/ui/switch';
import { VouchersSkeleton } from '@/admin/components/SkeletonLoaders';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
export default function Vouchers() {

  // --- Voucher States ---
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [editVoucher, setEditVoucher] = useState<Voucher | null>(null);

  const [code, setCode] = useState('');
  const [type, setType] = useState<'percentage' | 'nominal'>('percentage');
  const [value, setValue] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [applicableProductIds, setApplicableProductIds] = useState<number[]>([]);

  // Queries
  const vouchers = useDbQuery<Voucher>('vouchers');
  const products = useDbQuery<Product>('products');

  // Loading state
  if (vouchers === undefined || products === undefined) {
    return <VouchersSkeleton />;
  }

  // --- Voucher Handlers ---
  const openAdd = () => {
    setEditVoucher(null);
    setCode('');
    setType('percentage');
    setValue('');
    setIsActive(true);
    setApplicableProductIds([]);
    setDialogOpen(true);
  };

  const openEdit = (v: Voucher) => {
    setEditVoucher(v);
    setCode(v.code);
    setType(v.type as 'percentage' | 'nominal');
    setValue(v.value.toString());
    setIsActive(v.isActive);
    setApplicableProductIds(v.applicableProductIds || []);
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!code.trim() || !value) return;

    const data = {
      code: code.trim().toUpperCase(),
      type,
      value: Number(value) || 0,
      isActive,
      applicableProductIds,
      validUntil: null,
      updatedAt: new Date().toISOString(),
    };

    try {
      if (editVoucher?.id) {
        await dbUpdate('vouchers', editVoucher.id, data);
        toast.success('Voucher berhasil diperbarui');
      } else {
        await dbInsert('vouchers', { ...data, createdAt: new Date().toISOString() } as Voucher);
        toast.success('Voucher baru berhasil dibuat');
      }
      setDialogOpen(false);
    } catch (err: any) {
      toast.error('Gagal menyimpan voucher: ' + (err.message || err));
    }
  };

  const handleDelete = async () => {
    if (deleteId) {
      try {
        await dbDelete('vouchers', deleteId);
        toast.success('Voucher berhasil dihapus');
      } catch (err: any) {
        toast.error('Gagal menghapus voucher: ' + (err.message || err));
      } finally {
        setDeleteId(null);
      }
    }
  };

  return (
    <div className="px-4 pt-6 pb-24 space-y-6 w-full mx-auto animate-in fade-in duration-300">
      {/* Action Header */}
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold tracking-tight text-foreground">Kelola Voucher</h2>
        <Button onClick={openAdd} className="h-11 px-5 rounded-xl font-bold bg-primary hover:bg-primary/90 text-white shadow-md shadow-primary/20 active:scale-[0.98] transition-all shrink-0">
          <Plus className="w-5 h-5 mr-2" strokeWidth={3} />
          Buat Voucher
        </Button>
      </div>

          {vouchers.length === 0 ? (
            <div className="bg-card border border-dashed border-border/60 rounded-[2rem] p-12 flex flex-col items-center justify-center text-center opacity-80 mt-6">
              <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mb-4">
                <Ticket className="w-10 h-10 text-primary/50" strokeWidth={1.5} />
              </div>
              <h3 className="text-lg font-bold text-foreground mb-1">Belum Ada Voucher</h3>
              <p className="text-sm text-muted-foreground max-w-sm">Anda belum membuat kode promo apapun. Mulai buat sekarang untuk memberi kejutan ke pelanggan.</p>
              <Button variant="outline" className="mt-6 rounded-xl border-primary/20 text-primary hover:bg-primary/10 font-bold" onClick={openAdd}>
                <Plus className="w-4 h-4 mr-2" /> Buat Voucher Pertama
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-6">
              {vouchers.map(v => (
                <Card key={v.id} className={cn(
                  "group relative overflow-hidden border-2 shadow-sm hover:shadow-md transition-all duration-300 rounded-2xl flex flex-col bg-card",
                  v.isActive ? "border-primary/20 hover:border-primary/40" : "border-border/50 opacity-70 grayscale-[0.2]"
                )}>
                  
                  {/* Efek Garis Putus-putus Khas Tiket */}
                  <div className="absolute left-[30%] sm:left-[25%] top-0 bottom-0 border-l-2 border-dashed border-border/60 z-10" />
                  <div className="absolute left-[30%] sm:left-[25%] top-[-10px] w-5 h-5 bg-background rounded-full border-b-2 border-border/60 z-10 -translate-x-1/2" />
                  <div className="absolute left-[30%] sm:left-[25%] bottom-[-10px] w-5 h-5 bg-background rounded-full border-t-2 border-border/60 z-10 -translate-x-1/2" />

                  <div className="flex h-full">
                    
                    <div className={cn(
                      "w-[30%] sm:w-[25%] flex flex-col items-center justify-center p-4 relative overflow-hidden",
                      v.isActive ? "bg-gradient-to-br from-primary via-primary/90 to-primary/80 text-primary-foreground shadow-inner" : "bg-muted text-muted-foreground"
                    )}>
                      {v.isActive && (
                        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10 mix-blend-overlay"></div>
                      )}
                      {v.type === 'percentage' ? (
                        <Percent className="w-8 h-8 mb-1 opacity-50" strokeWidth={2} />
                      ) : (
                        <Banknote className="w-8 h-8 mb-1 opacity-50" strokeWidth={2} />
                      )}
                      <h4 className="text-2xl font-black tracking-tighter text-center leading-none">
                        {v.type === 'percentage' ? `${v.value}%` : FORMAT_IDR(v.value).replace('Rp', '')}
                      </h4>
                      <span className="text-[10px] font-bold uppercase tracking-widest mt-1 opacity-70">Diskon</span>
                    </div>

                    {/* Bagian Kanan Tiket (Detail & Aksi) */}
                    <div className="flex-1 p-5 pl-8 flex flex-col relative z-20">
                      <div className="flex justify-between items-start gap-4">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 mb-1.5">
                            <Badge variant="outline" className={cn(
                              "text-[9px] uppercase tracking-widest font-black px-1.5 py-0 border-none shadow-none",
                              v.isActive ? "bg-green-500/10 text-green-600" : "bg-muted text-muted-foreground"
                            )}>
                              {v.isActive ? 'Aktif' : 'Nonaktif'}
                            </Badge>
                          </div>
                          <h3 className="font-extrabold text-2xl font-mono tracking-widest text-foreground truncate">{v.code}</h3>
                          
                          {v.applicableProductIds && v.applicableProductIds.length > 0 ? (
                            <p className="text-[11px] font-medium text-muted-foreground mt-2 flex items-center gap-1.5">
                              <ListFilter className="w-3.5 h-3.5" /> Berlaku untuk {v.applicableProductIds.length} produk pilihan
                            </p>
                          ) : (
                            <p className="text-[11px] font-medium text-muted-foreground mt-2 flex items-center gap-1.5">
                              <Tag className="w-3.5 h-3.5" /> Berlaku untuk semua produk
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="mt-auto pt-4 flex gap-2 justify-end opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button variant="outline" size="icon" className="h-8 w-8 rounded-lg bg-background hover:bg-primary/10 hover:text-primary border-border/60" onClick={() => openEdit(v)}>
                          <Edit2 className="w-3.5 h-3.5" />
                        </Button>
                        <Button variant="outline" size="icon" className="h-8 w-8 rounded-lg bg-background hover:bg-destructive/10 hover:text-destructive border-border/60" onClick={() => setDeleteId(v.id!)}>
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}

      {/* ==========================================
          MODALS & DIALOGS
          ========================================== */}

      {/* Modal Add/Edit Voucher */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-[480px] rounded-[2rem] p-0 overflow-hidden border-border/60 shadow-2xl">
          <DialogHeader className="px-6 py-5 border-b border-border/50 bg-muted/10">
            <DialogTitle className="text-xl font-extrabold flex items-center gap-2">
              <div className="p-1.5 bg-primary/10 rounded-lg text-primary">
                {editVoucher ? <Edit2 className="w-5 h-5" /> : <Ticket className="w-5 h-5" strokeWidth={2.5} />}
              </div>
              {editVoucher ? 'Edit Voucher' : 'Buat Voucher Baru'}
            </DialogTitle>
          </DialogHeader>
          
          <div className="px-6 py-5 space-y-5">
            <div className="space-y-2 group">
              <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Kode Promo <span className="text-destructive">*</span></Label>
              <div className="relative">
                <Tag className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                <Input 
                  value={code} 
                  onChange={e => setCode(e.target.value.toUpperCase().replace(/\s/g, ''))} 
                  placeholder="Contoh: MERDEKA50" 
                  className="h-12 pl-10 uppercase font-mono font-bold tracking-widest bg-background rounded-xl focus-visible:ring-1 focus-visible:ring-primary" 
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Tipe Diskon <span className="text-destructive">*</span></Label>
                <Select value={type} onValueChange={(val: 'percentage' | 'nominal') => setType(val)}>
                  <SelectTrigger className="h-12 bg-background rounded-xl font-semibold focus:ring-1 focus:ring-primary">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    <SelectItem value="percentage" className="font-medium">Persentase (%)</SelectItem>
                    <SelectItem value="nominal" className="font-medium">Nominal (Rp)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2 group">
                <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Nilai Diskon <span className="text-destructive">*</span></Label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-bold text-muted-foreground group-focus-within:text-primary transition-colors">
                    {type === 'nominal' ? 'Rp' : '%'}
                  </span>
                  <Input 
                    type="number" 
                    value={value} 
                    onChange={e => setValue(e.target.value)} 
                    placeholder={type === 'percentage' ? "10" : "10000"} 
                    className="h-12 pl-9 bg-background rounded-xl font-mono text-base focus-visible:ring-1 focus-visible:ring-primary" 
                  />
                </div>
              </div>
            </div>
            
            <div className="space-y-2">
              <div className="flex justify-between items-end mb-1">
                <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Produk Spesifik</Label>
                <span className="text-[10px] font-medium bg-muted px-2 py-0.5 rounded text-muted-foreground">Opsional</span>
              </div>
              <div className="border border-border/60 rounded-xl p-2 max-h-[160px] overflow-y-auto bg-background/50 space-y-1 custom-scrollbar">
                {products.length === 0 ? (
                  <p className="text-xs text-muted-foreground p-3 text-center">Belum ada produk di database.</p>
                ) : (
                  products.map((p) => {
                    const isChecked = applicableProductIds.includes(p.id!);
                    return (
                      <label 
                        key={p.id} 
                        className={cn(
                          "flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer transition-colors border border-transparent",
                          isChecked ? "bg-primary/5 border-primary/20" : "hover:bg-muted"
                        )}
                      >
                        <input 
                          type="checkbox" 
                          checked={isChecked}
                          onChange={(e) => {
                            if (e.target.checked) setApplicableProductIds([...applicableProductIds, p.id!]);
                            else setApplicableProductIds(applicableProductIds.filter(id => id !== p.id));
                          }}
                          className="w-4 h-4 rounded-md border-muted-foreground/50 text-primary focus:ring-primary"
                        />
                        <span className={cn("text-sm flex-1 truncate select-none", isChecked ? "font-bold text-primary" : "font-medium text-foreground")}>
                          {p.name}
                        </span>
                      </label>
                    );
                  })
                )}
              </div>
              <p className="text-[10px] text-muted-foreground font-medium">Jika tidak ada yang dipilih, voucher berlaku untuk total tagihan seluruh produk.</p>
            </div>

            <div className="flex items-center justify-between p-4 bg-muted/30 border border-border/50 rounded-xl">
              <div>
                <Label htmlFor="active-toggle" className="text-sm font-bold cursor-pointer">Status Aktif</Label>
                <p className="text-[10px] text-muted-foreground font-medium mt-0.5">Voucher dapat digunakan oleh pelanggan saat ini.</p>
              </div>
              <Switch id="active-toggle" checked={isActive} onCheckedChange={setIsActive} className="data-[state=checked]:bg-green-500" />
            </div>
          </div>
          
          <DialogFooter className="px-6 py-4 border-t border-border/50 bg-muted/10 gap-2 sm:gap-0">
            <Button variant="outline" className="h-11 rounded-xl font-bold border-border/60 hover:bg-muted" onClick={() => setDialogOpen(false)}>
              Batal
            </Button>
            <Button className="h-11 rounded-xl font-bold bg-primary hover:bg-primary/90 text-white shadow-md active:scale-[0.98] transition-all px-8" onClick={handleSave} disabled={!code.trim() || !value}>
              {editVoucher ? 'Simpan Perubahan' : 'Terbitkan Voucher'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Voucher Modal */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent className="max-w-[400px] rounded-2xl p-6">
          <AlertDialogHeader>
            <div className="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center mb-2 mx-auto">
              <Trash2 className="w-6 h-6 text-destructive" />
            </div>
            <AlertDialogTitle className="text-center text-xl font-extrabold">Hapus Voucher?</AlertDialogTitle>
            <AlertDialogDescription className="text-center">
              Voucher promo ini akan dihapus secara permanen dan tidak dapat digunakan lagi oleh pelanggan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-6 sm:justify-center flex-row gap-3">
            <AlertDialogCancel className="flex-1 mt-0 rounded-xl h-11 font-bold">Batal</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="flex-1 rounded-xl h-11 font-bold bg-destructive hover:bg-destructive/90 text-white shadow-md shadow-destructive/20">
              Ya, Hapus
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <style dangerouslySetInnerHTML={{__html: `
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background-color: rgba(156, 163, 175, 0.3); border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background-color: rgba(156, 163, 175, 0.5); }
      `}} />
    </div>
  );
}
