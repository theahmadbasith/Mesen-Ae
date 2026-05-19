import React, { useState } from 'react';
import { 
  Package, 
  ArrowDownToLine, 
  ArrowUpFromLine, 
  TrendingUp, 
  AlertTriangle, 
  Warehouse, 
  BarChart3,
  Layers,
  Activity
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid } from 'recharts';
import { format, subDays, startOfDay } from 'date-fns';
import { id } from 'date-fns/locale';

import { useDbQuery } from '@/hooks/db-hooks';

const REASON_LABELS: Record<string, string> = {
  rusak: 'Rusak',
  hilang: 'Hilang',
  retur: 'Retur ke Supplier',
  kadaluarsa: 'Kadaluarsa',
  expired: 'Kadaluarsa',
  'pemakaian sendiri': 'Pemakaian Sendiri',
  lainnya: 'Lainnya',
};

export default function StockReport() {
  const [period, setPeriod] = useState<'7' | '30'>('7');
  const days = Number(period);
  const since = startOfDay(subDays(new Date(), days));

  // Database Hooks
  const products = useDbQuery<any>('products') || [];
  const stockIns = (useDbQuery<any>('stockIns') || []).filter(si => new Date(si.date) >= since);
  const stockOuts = (useDbQuery<any>('stockOuts') || []).filter(so => new Date(so.date) >= since);

  // Perhitungan Ringkasan (Summary)
  const totalStockIn = stockIns.reduce((sum, si) => sum + si.quantity, 0);
  const totalStockInValue = stockIns.reduce((sum, si) => sum + (si.totalPrice || 0), 0);
  const totalStockOut = stockOuts.reduce((sum, so) => sum + so.quantity, 0);
  const currentStock = products.reduce((sum, p) => sum + (p.stock || 0), 0);

  // Kategorisasi Kondisi Stok Produk
  const lowStockProducts = products.filter(p => p.stock > 0 && p.stock <= 5);
  const outOfStockProducts = products.filter(p => p.stock === 0);

  // Pengelompokan Stok Keluar Berdasarkan Alasan
  const stockOutByReason = stockOuts.reduce((acc, so) => {
    const reasonKey = so.reason ? so.reason.trim() : 'Lainnya';
    acc[reasonKey] = (acc[reasonKey] || 0) + so.quantity;
    return acc;
  }, {} as Record<string, number>);

  // Formatter Fungsi Label Alasan Dinamis
  const formatReasonLabel = (rawReason: string) => {
    const normalized = rawReason.toLowerCase();
    return REASON_LABELS[normalized] || rawReason;
  };

  // Penyusunan Data Grafik Bar (Aktivitas Harian)
  const chartData = (() => {
    const map: Record<string, { stockIn: number; stockOut: number }> = {};
    
    // Inisialisasi runtunan tanggal mundur
    for (let i = days - 1; i >= 0; i--) {
      const dateStr = format(subDays(new Date(), i), 'dd/MM');
      map[dateStr] = { stockIn: 0, stockOut: 0 };
    }

    stockIns.forEach(si => {
      const dateStr = format(new Date(si.date), 'dd/MM');
      if (map[dateStr]) map[dateStr].stockIn += si.quantity;
    });

    stockOuts.forEach(so => {
      const dateStr = format(new Date(so.date), 'dd/MM');
      if (map[dateStr]) map[dateStr].stockOut += so.quantity;
    });

    return Object.entries(map).map(([date, data]) => ({ date, ...data }));
  })();

  const formatRupiah = (value: number) => `Rp ${value.toLocaleString('id-ID')}`;

  return (
    <div className="px-4 pt-6 pb-24 space-y-6 w-full mx-auto animate-in fade-in duration-300">
      {/* Action Header */}
      <div className="flex justify-end">
        {/* Pengatur Periode Waktu */}
        <Tabs value={period} onValueChange={v => setPeriod(v as '7' | '30')} className="w-full sm:w-auto">
          <TabsList className="grid grid-cols-2 w-full sm:w-[200px] rounded-xl bg-muted p-1">
            <TabsTrigger value="7" className="rounded-lg text-xs font-medium py-1.5">7 Hari</TabsTrigger>
            <TabsTrigger value="30" className="rounded-lg text-xs font-medium py-1.5">30 Hari</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Grid Widget Ringkasan Utama */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="border border-border/50 shadow-sm bg-card hover:bg-card/70 transition-colors rounded-xl">
          <CardContent className="p-3.5 text-center flex flex-col items-center justify-center">
            <div className="p-1.5 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-lg mb-1.5">
              <ArrowDownToLine className="w-4 h-4" />
            </div>
            <p className="text-xl font-bold tracking-tight text-foreground">{totalStockIn}</p>
            <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Stok Masuk</p>
          </CardContent>
        </Card>

        <Card className="border border-border/50 shadow-sm bg-card hover:bg-card/70 transition-colors rounded-xl">
          <CardContent className="p-3.5 text-center flex flex-col items-center justify-center">
            <div className="p-1.5 bg-rose-500/10 text-rose-600 dark:text-rose-400 rounded-lg mb-1.5">
              <ArrowUpFromLine className="w-4 h-4" />
            </div>
            <p className="text-xl font-bold tracking-tight text-foreground">{totalStockOut}</p>
            <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Stok Keluar</p>
          </CardContent>
        </Card>

        <Card className="border border-border/50 shadow-sm bg-card hover:bg-card/70 transition-colors rounded-xl">
          <CardContent className="p-3.5 text-center flex flex-col items-center justify-center">
            <div className="p-1.5 bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-lg mb-1.5">
              <Package className="w-4 h-4" />
            </div>
            <p className="text-xl font-bold tracking-tight text-foreground">{currentStock}</p>
            <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Tersedia</p>
          </CardContent>
        </Card>
      </div>

      {/* Valuasi Nilai Finansial Stok */}
      <Card className="border border-border/50 shadow-sm rounded-xl overflow-hidden bg-card">
        <CardHeader className="pb-3 bg-muted/30">
          <CardTitle className="text-sm font-bold flex items-center gap-2 text-foreground">
            <TrendingUp className="w-4 h-4 text-emerald-500" />
            Nilai Belanja Stok Masuk
          </CardTitle>
          <CardDescription className="text-xs text-muted-foreground">Akumulasi pengeluaran modal pembelian persediaan barang.</CardDescription>
        </CardHeader>
        <CardContent className="pt-4 space-y-3">
          <div className="flex justify-between items-baseline">
            <span className="text-sm text-muted-foreground">Total Nilai Pembelian</span>
            <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400 tracking-tight">{formatRupiah(totalStockInValue)}</span>
          </div>
          <div className="border-t border-border/40 pt-2.5 flex justify-between text-xs text-muted-foreground">
            <span>Estimasi biaya per unit barang</span>
            <span className="font-semibold text-foreground">
              {totalStockIn > 0 ? formatRupiah(Math.round(totalStockInValue / totalStockIn)) : formatRupiah(0)} / unit
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Grafik Batang Pergerakan Logistik */}
      <Card className="border border-border/50 shadow-sm rounded-xl bg-card">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-bold flex items-center gap-2 text-foreground">
            <BarChart3 className="w-4 h-4 text-primary" />
            Tren Grafik Alur Distribusi
          </CardTitle>
          <CardDescription className="text-xs text-muted-foreground">Perbandingan komparatif volume aktivitas barang harian.</CardDescription>
        </CardHeader>
        <CardContent className="pt-2 pb-4">
          <div className="w-full h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 5, left: -25, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(var(--border), 0.1)" />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#888888' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: '#888888' }} axisLine={false} tickLine={false} width={35} />
                <Tooltip 
                  formatter={(value: number, name: string) => [value, name === 'stockIn' ? 'Barang Masuk' : 'Barang Keluar']} 
                  contentStyle={{ fontSize: 12, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.95)', border: '1px solid #e2e8f0' }}
                  labelStyle={{ fontSize: 11, fontWeight: 'bold', marginBottom: 4 }}
                />
                <Bar dataKey="stockIn" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={24} name="stockIn" />
                <Bar dataKey="stockOut" fill="#f43f5e" radius={[4, 4, 0, 0]} maxBarSize={24} name="stockOut" />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="flex justify-center items-center gap-4 text-[11px] mt-2 font-medium text-muted-foreground">
            <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-emerald-500" /> Barang Masuk</div>
            <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-rose-500" /> Barang Keluar</div>
          </div>
        </CardContent>
      </Card>

      {/* Komposisi Kasus Kerusakan/Kehilangan */}
      {Object.keys(stockOutByReason).length > 0 && (
        <Card className="border border-border/50 shadow-sm rounded-xl bg-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-bold flex items-center gap-2 text-foreground">
              <Activity className="w-4 h-4 text-rose-500" />
              Klasifikasi Penyebab Stok Keluar
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-2 divide-y divide-border/40">
            {Object.entries(stockOutByReason).map(([reason, qty]) => (
              <div key={reason} className="flex items-center justify-between py-2.5 first:pt-0 last:pb-0">
                <span className="text-sm font-medium text-muted-foreground">{formatReasonLabel(reason)}</span>
                <span className="text-sm font-bold text-rose-600 dark:text-rose-400 bg-rose-500/10 px-2.5 py-0.5 rounded-md">
                  {qty} Unit
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Bagian Peringatan: Stok Menipis */}
      {lowStockProducts.length > 0 && (
        <Card className="border border-amber-200 dark:border-amber-900/30 shadow-sm rounded-xl bg-amber-50/40 dark:bg-amber-950/10">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-bold flex items-center gap-2 text-amber-600 dark:text-amber-400">
              <AlertTriangle className="w-4 h-4" />
              Stok Menipis ({lowStockProducts.length} SKU)
            </CardTitle>
            <CardDescription className="text-xs text-amber-700/70 dark:text-amber-400/60">
              Daftar barang dengan sisa persediaan di bawah atau sama dengan 5 unit.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-2 divide-y divide-amber-200/40 dark:divide-amber-900/20">
            {lowStockProducts.slice(0, 5).map(p => (
              <div key={p.id} className="flex items-center justify-between py-2.5 first:pt-0 last:pb-0">
                <span className="text-sm font-medium text-foreground truncate max-w-[200px] sm:max-w-xs">{p.name}</span>
                <span className="text-xs font-bold text-amber-700 dark:text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-md">
                  Sisa: {p.stock} {p.unit || 'Unit'}
                </span>
              </div>
            ))}
            {lowStockProducts.length > 5 && (
              <p className="text-[11px] text-amber-600/80 text-center pt-2 font-medium">
                +{lowStockProducts.length - 5} produk menipis lainnya tidak ditampilkan
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Bagian Krisis: Stok Kosong */}
      {outOfStockProducts.length > 0 && (
        <Card className="border border-rose-200 dark:border-rose-900/30 shadow-sm rounded-xl bg-rose-50/40 dark:bg-rose-950/10">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-bold flex items-center gap-2 text-rose-600 dark:text-rose-400">
              <Layers className="w-4 h-4" />
              Stok Habis / Kosong ({outOfStockProducts.length} SKU)
            </CardTitle>
            <CardDescription className="text-xs text-rose-700/70 dark:text-rose-400/60">
              Segera hubungi supplier, item di bawah ini tidak dapat ditransaksikan.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-2 divide-y divide-rose-200/40 dark:divide-rose-900/20">
            {outOfStockProducts.slice(0, 5).map(p => (
              <div key={p.id} className="flex items-center justify-between py-2.5 first:pt-0 last:pb-0">
                <span className="text-sm font-medium text-foreground truncate max-w-[200px] sm:max-w-xs">{p.name}</span>
                <span className="text-xs font-bold text-rose-600 dark:text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded-md">
                  Kosong
                </span>
              </div>
            ))}
            {outOfStockProducts.length > 5 && (
              <p className="text-[11px] text-rose-600/80 text-center pt-2 font-medium">
                +{outOfStockProducts.length - 5} produk kosong lainnya tidak ditampilkan
              </p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
