import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import { toast } from 'sonner';
import { usePermissions } from '@/hooks/use-permissions';
import { 
  ArrowDownToLine, 
  Plus, 
  ChevronLeft, 
  Layers, 
  Calendar, 
  User, 
  FileText 
} from 'lucide-react';

import { useDbQuery, dbInsert, dbUpdate } from '@/hooks/db-hooks';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';

export default function StockInPage() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const { canEdit } = usePermissions();
  const hasEditAccess = canEdit('stockIn');

  // Form States
  const [productId, setProductId] = useState('');
  const [supplierId, setSupplierId] = useState('');
  const [quantity, setQuantity] = useState('');
  const [buyPrice, setBuyPrice] = useState('');
  const [notes, setNotes] = useState('');
  
  // Filter State
  const [filterSupplier, setFilterSupplier] = useState('all');

  // Database Hooks
  const stockIns = useDbQuery<any>('stockIns') || [];
  const products = useDbQuery<any>('products') || [];
  const suppliers = useDbQuery<any>('suppliers') || [];

  // Filter Data
  const filteredStockIns = stockIns.filter((si: any) =>
    filterSupplier === 'all' || si.supplierId === Number(filterSupplier)
  ).sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const getProductName = (pid: number | string) => products.find((p: any) => p.id === pid)?.name ?? 'Produk Tidak Diketahui';
  const getSupplierName = (sid: number | string) => suppliers.find((s: any) => s.id === sid)?.name ?? 'Supplier Tidak Diketahui';

  const openAdd = () => {
    setProductId('');
    setSupplierId('');
    setQuantity('');
    setBuyPrice('');
    setNotes('');
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!hasEditAccess) {
      toast.error('Akses ditolak. Anda tidak memiliki izin untuk mengelola stok.');
      return;
    }
    const qty = Number(quantity);
    const price = Number(buyPrice);

    if (!productId || !supplierId || qty <= 0 || price <= 0) {
      toast.error('Mohon lengkapi semua field dengan benar');
      return;
    }

    const selectedProduct = Number(productId);
    const selectedSupplier = Number(supplierId);
    const product = products.find((p: any) => p.id === selectedProduct);
    
    if (!product) {
      toast.error('Produk tidak ditemukan');
      return;
    }

    try {
      setIsSubmitting(true);
      const total = qty * price;

      // 1. Catat ke tabel stockIns
      await dbInsert('stockIns', {
        productId: selectedProduct,
        supplierId: selectedSupplier || 0,
        quantity: qty,
        buyPrice: price,
        totalPrice: total,
        date: new Date().toISOString(),
        notes: notes.trim(),
      });

      // 2. Hitung HPP Baru menggunakan Average Cost (Weighted Average)
      const oldStock = product.stock || 0;
      const oldHpp = product.hpp || 0;
      const newStock = oldStock + qty;
      const newHpp = ((oldStock * oldHpp) + total) / newStock;

      // 3. Catat riwayat perubahan HPP
      await dbInsert('hppHistory', {
        productId: selectedProduct,
        oldHpp,
        newHpp,
        source: 'stock_in',
        date: new Date().toISOString(),
      });

      // 4. Perbarui data stok dan nilai HPP pada tabel produk
      await dbUpdate('products', selectedProduct, {
        stock: newStock,
        hpp: Math.round(newHpp),
        updatedAt: new Date().toISOString(),
      });

      toast.success(`Stok ${product.name} bertambah ${qty}. HPP diperbarui menjadi Rp ${Math.round(newHpp).toLocaleString('id-ID')}`);
      setDialogOpen(false);
    } catch (error: any) {
      console.error(error);
      toast.error('Gagal menyimpan data stock in: ' + (error.message || error));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="px-4 pt-3 pb-24 space-y-6 w-full mx-auto animate-in fade-in duration-300">
      {/* Action Header */}
      {hasEditAccess && (
      <div className="flex justify-end items-center gap-4">
        <Button size="sm" onClick={openAdd} className="h-10 rounded-xl gap-2 px-4 shadow-sm font-medium">
          <Plus className="w-4 h-4" /> Tambah Stok
        </Button>
      </div>
      )}

      {/* Kontrol & Filter */}
      <div className="flex flex-col gap-2.5">
        <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Filter Berdasarkan Supplier</Label>
        <Select value={filterSupplier} onValueChange={setFilterSupplier}>
          <SelectTrigger className="h-11 rounded-xl bg-card border-border/60 shadow-sm">
            <SelectValue placeholder="Pilih Supplier" />
          </SelectTrigger>
          <SelectContent className="rounded-xl">
            <SelectItem value="all">Semua Supplier</SelectItem>
            {suppliers.map((s: any) => (
              <SelectItem key={s.id} value={s.id.toString()}>{s.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="text-xs text-muted-foreground pl-1">
          Menampilkan <span className="font-semibold text-foreground">{filteredStockIns.length}</span> riwayat catatan
        </div>
      </div>

      {/* Daftar Riwayat Stock In */}
      {filteredStockIns.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center bg-card/40 border border-dashed border-border/60 rounded-2xl">
          <div className="bg-muted p-4 rounded-full mb-3">
            <ArrowDownToLine className="w-8 h-8 text-muted-foreground/40" />
          </div>
          <h3 className="text-sm font-medium text-foreground">Belum ada riwayat</h3>
          <p className="text-xs text-muted-foreground max-w-xs mt-1">Seluruh data pemasukan stok barang dari supplier akan terdaftar di sini.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredStockIns.map((si: any) => (
            <Card key={si.id} className="border border-border/50 shadow-sm hover:shadow-md hover:border-border/80 transition-all duration-200 rounded-xl overflow-hidden bg-card">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1 flex-1 min-w-0">
                    <h3 className="text-sm font-bold text-foreground truncate">{getProductName(si.productId)}</h3>
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <User className="w-3 h-3 flex-shrink-0" />
                      <span className="truncate">Supplier: {getSupplierName(si.supplierId)}</span>
                    </div>
                    
                    <div className="flex items-center gap-2 mt-2 pt-1">
                      <span className="text-[11px] font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 px-2 py-0.5 rounded-md">
                        +{si.quantity} Unit
                      </span>
                      <span className="text-xs text-muted-foreground">
                        @ Rp {si.buyPrice.toLocaleString('id-ID')}
                      </span>
                    </div>

                    {si.notes && (
                      <div className="flex items-start gap-1 mt-2 text-xs text-muted-foreground bg-muted/40 p-2 rounded-lg italic border border-border/30">
                        <FileText className="w-3.5 h-3.5 mt-0.5 text-muted-foreground/60 flex-shrink-0" />
                        <span className="line-clamp-2">"{si.notes}"</span>
                      </div>
                    )}
                  </div>

                  <div className="text-right flex-shrink-0 flex flex-col justify-between h-full min-h-[70px]">
                    <div className="flex items-center justify-end gap-1 text-[11px] text-muted-foreground">
                      <Calendar className="w-3 h-3" />
                      {format(new Date(si.date), 'dd MMM yyyy', { locale: id })}
                    </div>
                    <div className="mt-auto">
                      <p className="text-xs text-muted-foreground font-medium">Total Harga</p>
                      <p className="text-sm font-extrabold text-foreground tracking-tight">
                        Rp {si.totalPrice.toLocaleString('id-ID')}
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Dialog Form Tambah Stok */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-[92vw] sm:max-w-md rounded-2xl p-5 gap-4">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">Tambah Stok Masuk</DialogTitle>
            <DialogDescription className="text-xs">
              Masukkan detail pembelian barang untuk menambah stok gudang dan memperbarui acuan nilai HPP.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 mt-1">
            {/* Pilihan Produk */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-foreground">Pilih Produk <span className="text-destructive">*</span></Label>
              <Select value={productId} onValueChange={setProductId}>
                <SelectTrigger className="h-11 rounded-xl bg-background border-border/70">
                  <SelectValue placeholder="Pilih item barang" />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  {products.map((p: any) => (
                    <SelectItem key={p.id} value={p.id.toString()}>
                      {p.name} <span className="text-xs text-muted-foreground">(Sisa: {p.stock ?? 0})</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Pilihan Supplier */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-foreground">Supplier <span className="text-destructive">*</span></Label>
              <Select value={supplierId} onValueChange={setSupplierId}>
                <SelectTrigger className="h-11 rounded-xl bg-background border-border/70">
                  <SelectValue placeholder="Pilih nama supplier" />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  {suppliers.map((s: any) => (
                    <SelectItem key={s.id} value={s.id.toString()}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Grid Input Kuantitas & Harga */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-foreground">Jumlah Masuk <span className="text-destructive">*</span></Label>
                <Input 
                  type="number" 
                  min="1"
                  value={quantity} 
                  onChange={e => setQuantity(e.target.value)} 
                  placeholder="Contoh: 50" 
                  className="h-11 rounded-xl bg-background border-border/70" 
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-foreground">Harga Beli / Unit <span className="text-destructive">*</span></Label>
                <Input 
                  type="number" 
                  min="0"
                  value={buyPrice} 
                  onChange={e => setBuyPrice(e.target.value)} 
                  placeholder="Rp" 
                  className="h-11 rounded-xl bg-background border-border/70" 
                />
              </div>
            </div>

            {/* Preview Akumulasi Angka Total */}
            {Number(quantity) > 0 && Number(buyPrice) > 0 && (
              <div className="bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/30 p-3 rounded-xl flex items-center justify-between text-xs transition-all duration-200">
                <span className="text-muted-foreground font-medium flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-emerald-500" /> Total Pengeluaran:
                </span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400 text-sm">
                  Rp {(Number(quantity) * Number(buyPrice)).toLocaleString('id-ID')}
                </span>
              </div>
            )}

            {/* Kolom Catatan Opsional */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-foreground">Catatan Tambahan</Label>
              <Input 
                value={notes} 
                onChange={e => setNotes(e.target.value)} 
                placeholder="No. Invoice / Keterangan (Opsional)" 
                className="h-11 rounded-xl bg-background border-border/70" 
              />
            </div>

            {/* Tombol Simpan */}
            <Button 
              className="w-full h-12 text-sm font-semibold rounded-xl shadow-md transition-all mt-2" 
              onClick={handleSave}
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Menyimpan Data...' : 'Konfirmasi & Simpan Stok'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
