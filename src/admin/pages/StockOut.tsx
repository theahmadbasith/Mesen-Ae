import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import { toast } from 'sonner';
import { usePermissions } from '@/hooks/use-permissions';
import { 
  ArrowUpFromLine, 
  Plus, 
  ChevronLeft, 
  AlertTriangle, 
  Calendar, 
  Tag, 
  FileText,
  Boxes
} from 'lucide-react';

import { useDbQuery, dbInsert, dbUpdate } from '@/hooks/db-hooks';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';

const REASONS = ['Rusak', 'Hilang', 'Kadaluarsa', 'Retur ke Supplier', 'Pemakaian Sendiri', 'Lainnya'];

export default function StockOutPage() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const { canEdit } = usePermissions();
  const hasEditAccess = canEdit('stockOut');
  
  // Form States
  const [productId, setProductId] = useState('');
  const [quantity, setQuantity] = useState('');
  const [reason, setReason] = useState('');
  const [notes, setNotes] = useState('');

  // Database Hooks
  const stockOuts = useDbQuery<any>('stockOuts') || [];
  const products = useDbQuery<any>('products') || [];

  // Mengurutkan riwayat dari yang terbaru
  const sortedStockOuts = [...stockOuts].sort(
    (a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  const getProductName = (pid: number | string) => products.find((p: any) => String(p.id) === String(pid))?.name ?? 'Produk Tidak Diketahui';
  const selectedProduct = products.find((p: any) => String(p.id) === String(productId));

  const openAdd = () => {
    setProductId('');
    setQuantity('');
    setReason('');
    setNotes('');
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!hasEditAccess) {
      toast.error('Akses ditolak. Anda tidak memiliki izin untuk mengelola stok.');
      return;
    }
    const qty = Number(quantity);
    
    if (!productId || qty <= 0 || !reason) {
      toast.error('Mohon lengkapi semua field utama');
      return;
    }

    const product = products.find((p: any) => String(p.id) === String(productId));
    if (!product) {
      toast.error('Produk tidak ditemukan');
      return;
    }

    if (qty > product.stock) {
      toast.error(`Jumlah pengeluaran (${qty}) melebihi stok yang tersedia (${product.stock})`);
      return;
    }

    try {
      setIsSubmitting(true);

      // 1. Catat transaksi pengurangan stok
      await dbInsert('stockOuts', {
        productId: productId,
        quantity: qty,
        reason,
        date: new Date().toISOString(),
        notes: notes.trim(),
      });

      // 2. Potong jumlah stok produk utama
      await dbUpdate('products', product.id, {
        stock: product.stock - qty,
        updatedAt: new Date().toISOString(),
      });

      toast.success(`Stok ${product.name} berhasil dikurangi sebanyak ${qty}`);
      setDialogOpen(false);
    } catch (error: any) {
      console.error(error);
      toast.error('Gagal memproses penyesuaian stok: ' + (error.message || error));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="pt- pb-24 space-y-6 w-full mx-auto animate-in fade-in duration-300">
      {/* Action Header */}
      {hasEditAccess && (
        <div className="flex justify-end items-center gap-4">
          <Button size="sm" onClick={openAdd} className="h-10 rounded-xl gap-2 px-4 shadow-sm font-medium bg-destructive hover:bg-destructive/90 text-destructive-foreground">
            <Plus className="w-4 h-4" /> Catat Pengurangan
          </Button>
        </div>
      )}

      <div className="text-xs text-muted-foreground pl-1">
        Total log aktivitas penyesuaian: <span className="font-semibold text-foreground">{sortedStockOuts.length}</span> catatan
      </div>

      {/* Render Daftar Riwayat Catatan */}
      {sortedStockOuts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center bg-card/40 border border-dashed border-border/60 rounded-2xl">
          <div className="bg-muted p-4 rounded-full mb-3">
            <ArrowUpFromLine className="w-8 h-8 text-muted-foreground/40" />
          </div>
          <h3 className="text-sm font-medium text-foreground">Tidak ada riwayat stok keluar</h3>
          <p className="text-xs text-muted-foreground max-w-xs mt-1">Seluruh log pembuangan barang cacat, kadaluarsa, atau barang hilang akan muncul di sini.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {sortedStockOuts.map((so: any) => (
            <Card key={so.id} className="border border-border/50 shadow-sm hover:shadow-md hover:border-border/80 transition-all duration-200 rounded-xl overflow-hidden bg-card">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1 flex-1 min-w-0">
                    <h3 className="text-sm font-bold text-foreground truncate">{getProductName(so.productId)}</h3>
                    
                    <div className="flex items-center gap-2 mt-2">
                      <span className="text-[11px] font-bold bg-destructive/10 text-destructive dark:bg-destructive/95 dark:text-destructive-foreground px-2 py-0.5 rounded-md">
                        -{so.quantity} Unit
                      </span>
                      <span className="text-xs font-medium text-muted-foreground flex items-center gap-1 bg-muted px-2 py-0.5 rounded-md">
                        <Tag className="w-3 h-3" /> {so.reason}
                      </span>
                    </div>

                    {so.notes && (
                      <div className="flex items-start gap-1 mt-2.5 text-xs text-muted-foreground bg-muted/40 p-2 rounded-lg italic border border-border/30">
                        <FileText className="w-3.5 h-3.5 mt-0.5 text-muted-foreground/60 flex-shrink-0" />
                        <span className="line-clamp-2">"{so.notes}"</span>
                      </div>
                    )}
                  </div>

                  <div className="text-right flex-shrink-0 flex flex-col justify-between items-end h-full">
                    <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                      <Calendar className="w-3 h-3" />
                      {format(new Date(so.date), 'dd MMM yyyy', { locale: id })}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Dialog Form Stock Out */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-[92vw] sm:max-w-md max-h-[90vh] rounded-2xl p-0 overflow-hidden flex flex-col border border-border/60 shadow-2xl">
          <DialogHeader className="px-5 pt-5 pb-3 border-b border-border/50 bg-muted/10 shrink-0">
            <DialogTitle className="text-lg font-bold flex items-center gap-1.5">
              <ArrowUpFromLine className="w-5 h-5 text-destructive" /> Catat Stok Keluar
            </DialogTitle>
            <DialogDescription className="text-xs">
              Kurangi kuantitas persediaan barang secara manual disertai dengan alasan operasional yang jelas.
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto custom-scrollbar p-5 space-y-4">
            {/* Input Pemilihan Produk */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-foreground">Pilih Produk <span className="text-destructive">*</span></Label>
              <Select value={productId} onValueChange={setProductId}>
                <SelectTrigger className="h-11 rounded-xl bg-background border-border/70">
                  <SelectValue placeholder="Pilih produk penyesuaian" />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  {products.filter((p: any) => p.stock > 0).map((p: any) => (
                    <SelectItem key={p.id} value={p.id.toString()}>
                      {p.name} <span className="text-xs text-muted-foreground">(Stok: {p.stock})</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Grid Jumlah & Alasan */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-foreground">Jumlah Keluar <span className="text-destructive">*</span></Label>
                <Input 
                  type="number" 
                  min="1"
                  max={selectedProduct?.stock}
                  value={quantity} 
                  onChange={e => setQuantity(e.target.value)} 
                  placeholder="0" 
                  className="h-11 rounded-xl bg-background border-border/70" 
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-foreground">Alasan Pengurangan <span className="text-destructive">*</span></Label>
                <Select value={reason} onValueChange={setReason}>
                  <SelectTrigger className="h-11 rounded-xl bg-background border-border/70">
                    <SelectValue placeholder="Pilih alasan" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    {REASONS.map(r => (
                      <SelectItem key={r} value={r}>{r}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Estimasi Sisa Persediaan */}
            {selectedProduct && quantity && (
              <div className={`p-3 rounded-xl flex items-center justify-between text-xs transition-all border ${
                (selectedProduct.stock - Number(quantity)) <= 0 
                  ? 'bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900/30 text-amber-700 dark:text-amber-400' 
                  : 'bg-muted/60 border-border/40 text-muted-foreground'
              }`}>
                <span className="font-medium flex items-center gap-1.5">
                  {(selectedProduct.stock - Number(quantity)) <= 0 ? (
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                  ) : (
                    <Boxes className="w-3.5 h-3.5 text-foreground/60" />
                  )}
                  Estimasi Sisa Stok:
                </span>
                <span className="font-bold text-foreground text-sm">
                  {selectedProduct.stock - Number(quantity)} {selectedProduct.unit || 'Unit'}
                </span>
              </div>
            )}

            {/* Kolom Keterangan / Notes */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-foreground">Keterangan Tambahan</Label>
              <Input 
                value={notes} 
                onChange={e => setNotes(e.target.value)} 
                placeholder="Lokasi kejadian / nama pemeriksa (Opsional)" 
                className="h-11 rounded-xl bg-background border-border/70" 
              />
            </div>

            {/* Tombol Eksekusi Submit */}
            <Button 
              variant="destructive"
              className="w-full h-12 text-sm font-semibold rounded-xl shadow-md transition-all mt-2" 
              onClick={handleSave}
              disabled={isSubmitting || (selectedProduct && (selectedProduct.stock - Number(quantity) < 0))}
            >
              {isSubmitting ? 'Memproses Data...' : 'Konfirmasi & Kurangi Stok'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
