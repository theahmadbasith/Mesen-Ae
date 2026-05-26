import { useDbQuery, dbInsert, dbUpdate, dbDelete } from '@/hooks/db-hooks';
import { type TransactionItemRecord } from '@/hooks/db-hooks';
import { useState } from 'react';
import { ShoppingCart, Package, BarChart3, TrendingUp, AlertTriangle, Receipt, ChevronRight, ClipboardList } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { DashboardSkeleton } from '@/admin/components/SkeletonLoaders';

export default function Dashboard() {

  const storeSettings = useDbQuery<any>('storeSettings')?.[0];

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const allTransactions = useDbQuery<any>('transactions') || [];
  const todayTransactions = allTransactions.filter(t => new Date(t.date) >= today && t.status === 'lunas');
  const openBillsCount = allTransactions.filter(t => t.status === 'belum lunas').length;

  const allProducts = useDbQuery<any>('products') || [];
  const lowStockProducts = allProducts.filter(p => p.stock <= 5);

  const recentTransactions = [...allTransactions].sort((a:any,b:any)=>new Date(b.date).getTime()-new Date(a.date).getTime()).slice(0,5);

  const allTxItems = useDbQuery<any>('transactionItems') || [];
  const recentTxItems = (() => {
    if (!recentTransactions || recentTransactions.length === 0) return {};
    const txIds = recentTransactions.map(t => t.id!).filter(Boolean);
    const items = allTxItems.filter(i => txIds.includes(i.transactionId));
    const map: Record<number, TransactionItemRecord[]> = {};
    for (const item of items) {
      if (!map[item.transactionId]) map[item.transactionId] = [];
      map[item.transactionId].push(item);
    }
    return map;
  })();

  const paymentMethods = useDbQuery('paymentMethods');

  // Show skeleton while loading
  if (storeSettings === undefined) return <DashboardSkeleton />;

  const totalSales = todayTransactions?.reduce((sum, t) => sum + (Number(t.total) || 0), 0) ?? 0;
  const totalProfit = todayTransactions?.reduce((sum, t) => sum + (Number(t.profit) || 0), 0) ?? 0;
  const txCount = todayTransactions?.length ?? 0;



  const quickActions = [
    { to: '/admin/cashier', icon: ShoppingCart, label: 'Kasir', color: 'bg-primary/10 text-primary' },
    { to: '/admin/products', icon: Package, label: 'Produk', color: 'bg-accent/10 text-accent' },
    { to: '/admin/reports', icon: BarChart3, label: 'Laporan', color: 'bg-success/10 text-success' },
  ];

  return (
    <div className="px-4 pt-6 pb-24 space-y-6 w-full mx-auto animate-in fade-in duration-300">
      {/* Date Badge */}
      <div className="flex justify-end">
        <span className="text-[10px] font-bold text-muted-foreground bg-muted/60 border border-border/40 px-3.5 py-1.5 rounded-xl uppercase tracking-wider">
          {format(new Date(), 'EEEE, d MMMM yyyy', { locale: id })}
        </span>
      </div>



      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="border-0 shadow-sm bg-primary text-primary-foreground">
          <CardContent className="p-4">
            <p className="text-xs opacity-80">Penjualan Hari Ini</p>
            <p className="text-xl font-bold mt-1">Rp {totalSales.toLocaleString('id-ID')}</p>
            <p className="text-xs opacity-70 mt-1">{txCount} transaksi</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-1.5 text-success">
              <TrendingUp className="w-4 h-4" />
              <p className="text-xs font-medium">Profit Hari Ini</p>
            </div>
            <p className="text-xl font-bold mt-1">Rp {totalProfit.toLocaleString('id-ID')}</p>
          </CardContent>
        </Card>
      </div>

      {/* Open Bills */}
      {openBillsCount != null && openBillsCount > 0 && (
        <Link to="/admin/cashier">
          <Card className="border-0 shadow-sm bg-warning/10 hover:shadow-md transition-shadow cursor-pointer mt-2">
            <CardContent className="p-4 flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-warning/20 text-warning flex items-center justify-center shrink-0">
                <ClipboardList className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold">Open Bills</p>
                <p className="text-xs text-muted-foreground">{openBillsCount} bill menunggu pembayaran</p>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            </CardContent>
          </Card>
        </Link>
      )}

      {/* Quick Actions */}
      <div>
        <h2 className="text-sm font-semibold text-muted-foreground mb-3">Akses Cepat</h2>
        <div className="grid grid-cols-3 gap-3">
          {quickActions.map(({ to, icon: Icon, label, color }) => (
            <Link key={to} to={to}>
              <Card className="border-0 shadow-sm hover:shadow-md transition-shadow">
                <CardContent className="p-4 flex flex-col items-center gap-2">
                  <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${color}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <span className="text-xs font-semibold">{label}</span>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>

      {/* Recent Transactions */}
      {recentTransactions && recentTransactions.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-muted-foreground flex items-center gap-1.5">
              <Receipt className="w-4 h-4 text-primary" />
              Transaksi Terakhir
            </h2>
            <Link to="/admin/history">
              <Button variant="ghost" size="sm" className="h-7 text-xs gap-1 text-primary">
                Lihat Semua <ChevronRight className="w-3 h-3" />
              </Button>
            </Link>
          </div>
          <div className="space-y-2">
            {recentTransactions.map(tx => (
              <Link key={tx.id ?? tx.receiptNumber} to={`/admin/history?txId=${tx.id ?? tx.receiptNumber}`}>
                <Card className="border-0 shadow-sm hover:shadow-md transition-shadow mb-2">
                  <CardContent className="p-3 flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                      <Receipt className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="text-xs text-muted-foreground truncate">{(recentTxItems?.[tx.id!] ?? []).map(i => i.productName).join(', ')}</p>
                        <p className="text-[10px] text-muted-foreground shrink-0 ml-2">{format(new Date(tx.date), 'HH:mm')}</p>
                      </div>
                      <div className="flex items-center justify-between mt-0.5">
                        <p className="text-sm font-bold text-primary">Rp {tx.total.toLocaleString('id-ID')}</p>
                        <p className="text-[10px] text-muted-foreground">{paymentMethods?.find(pm => pm.id === tx.paymentMethodId)?.name || 'Tunai'}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Low Stock Alert */}
      {lowStockProducts && lowStockProducts.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-muted-foreground mb-3 flex items-center gap-1.5">
            <AlertTriangle className="w-4 h-4 text-warning" />
            Stok Menipis
          </h2>
          <div className="space-y-2">
            {lowStockProducts.slice(0, 5).map(product => (
              <Card key={product.id} className="border-0 shadow-sm">
                <CardContent className="p-3 flex items-center justify-between">
                  <span className="text-sm font-medium">{product.name}</span>
                  <span className="text-xs font-bold text-destructive bg-destructive/10 px-2 py-1 rounded-full">
                    Sisa {product.stock} {product.unit}
                  </span>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
