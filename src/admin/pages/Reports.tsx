import { useDbQuery, dbInsert, dbUpdate, dbDelete } from '@/hooks/db-hooks';
import { useState, useMemo } from 'react';
import { BarChart3, TrendingUp, ShoppingCart, Package, DollarSign, ArrowDown, ArrowUp, Minus, Share2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip } from 'recharts';
import { format, subDays, startOfDay } from 'date-fns';
import { toast } from 'sonner';
import ReportShareModal from '@/admin/components/ReportShareModal';
import type { MesenAeReportData } from '@/admin/components/ReportPrint';
import StockReport from './StockReport';

export default function Laporan() {
  const [activeTab, setActiveTab] = useState<'penjualan' | 'stok'>('penjualan');
  const [period, setPeriod] = useState<'7' | '30'>('7');
  const [shareOpen, setShareOpen] = useState(false);
  const days = Number(period);

  const storeSettings = useDbQuery<any>('storeSettings')?.[0];

  const allTransactionsResult = useDbQuery<any>('transactions');
  const allTxItemsResult = useDbQuery<any>('transactionItems');

  const allTransactions = useMemo(() => allTransactionsResult || [], [allTransactionsResult]);
  const allTxItems = useMemo(() => allTxItemsResult || [], [allTxItemsResult]);

  const transactions = useMemo(() => {
    const since = startOfDay(subDays(new Date(), days));
    return allTransactions.filter(t => new Date(t.date) >= since);
  }, [allTransactions, days]);

  const allItems = useMemo(() => {
    if (!transactions || transactions.length === 0) return [];
    const txIds = transactions.map(t => t.id!).filter(Boolean);
    return allTxItems.filter(i => txIds.includes(i.transactionId));
  }, [transactions, allTxItems]);

  const stats = useMemo(() => {
    const completedTx = transactions?.filter(t => t.status !== 'belum lunas') ?? [];
    const totalSales = completedTx.reduce((s, t) => s + t.total, 0);
    const totalProfit = completedTx.reduce((s, t) => s + t.profit, 0);
    const txCount = completedTx.length;
    const totalRevenue = completedTx.reduce((s, t) => s + t.subtotal, 0);
    const totalDiscount = completedTx.reduce((s, t) => s + t.discountAmount, 0);
    const totalHpp = allItems.reduce((s, item) => s + item.hpp * item.quantity, 0);
    const netSales = totalRevenue - totalDiscount;
    const grossProfit = netSales - totalHpp;
    const marginPercent = netSales > 0 ? (grossProfit / netSales * 100) : 0;
    return { totalSales, totalProfit, txCount, totalRevenue, totalDiscount, totalHpp, netSales, grossProfit, marginPercent };
  }, [transactions, allItems]);

  const { totalSales, totalProfit, txCount, totalRevenue, totalDiscount, totalHpp, netSales, grossProfit, marginPercent } = stats;

  // Chart data
  const chartData = useMemo(() => {
    const map: Record<string, number> = {};
    for (let i = days - 1; i >= 0; i--) {
      const d = format(subDays(new Date(), i), 'dd/MM');
      map[d] = 0;
    }
    transactions?.forEach(t => {
      const d = format(new Date(t.date), 'dd/MM');
      if (map[d] !== undefined) map[d] += t.total;
    });
    return Object.entries(map).map(([date, sales]) => ({ date, sales }));
  }, [transactions, days]);

  // Top products
  const topProducts = useMemo(() => {
    const productSales: Record<string, { name: string; qty: number; revenue: number; profit: number }> = {};
    allItems.forEach(item => {
      if (!productSales[item.productName]) productSales[item.productName] = { name: item.productName, qty: 0, revenue: 0, profit: 0 };
      productSales[item.productName].qty += item.quantity;
      productSales[item.productName].revenue += item.subtotal;
      productSales[item.productName].profit += (item.price - item.hpp) * item.quantity - item.discountAmount;
    });
    return Object.values(productSales).sort((a, b) => b.revenue - a.revenue).slice(0, 5);
  }, [allItems]);

  const rp = (n: number) => `Rp ${n.toLocaleString('id-ID')}`;

  // ── Generate report data for share modal ──────────────────────────────────
  const handleGenerateReport = async (startDate: string, endDate: string): Promise<MesenAeReportData> => {
    try {
      const start = startOfDay(new Date(startDate));
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);

      const txs = allTransactions.filter(t => {
        const d = new Date(t.date);
        return d >= start && d <= end;
      });

      const txIds = txs.map(t => t.id!).filter(Boolean);
      const items = txIds.length > 0
        ? allTxItems.filter(i => txIds.includes(i.transactionId))
        : [];

      const rev = txs.reduce((s, t) => s + t.subtotal, 0);
      const disc = txs.reduce((s, t) => s + t.discountAmount, 0);
      const net = rev - disc;
      const hpp = items.reduce((s, i) => s + i.hpp * i.quantity, 0);
      const gross = net - hpp;
      const margin = net > 0 ? (gross / net * 100) : 0;

      // Build chart data (day by day)
      const dayMap: Record<string, number> = {};
      const cursor = new Date(start);
      while (cursor <= end) {
        dayMap[format(cursor, 'dd/MM')] = 0;
        cursor.setDate(cursor.getDate() + 1);
      }
      txs.forEach(t => {
        const key = format(new Date(t.date), 'dd/MM');
        if (key in dayMap) dayMap[key] += t.total;
      });
      const chart = Object.entries(dayMap).map(([date, sales]) => ({ date, sales }));

      // Top products
      const prodMap: Record<string, { name: string; qty: number; revenue: number; profit: number }> = {};
      items.forEach(item => {
        if (!prodMap[item.productName]) prodMap[item.productName] = { name: item.productName, qty: 0, revenue: 0, profit: 0 };
        prodMap[item.productName].qty += item.quantity;
        prodMap[item.productName].revenue += item.subtotal;
        prodMap[item.productName].profit += (item.price - item.hpp) * item.quantity - item.discountAmount;
      });
      const top = Object.values(prodMap).sort((a, b) => b.revenue - a.revenue).slice(0, 10);

      return {
        storeName: storeSettings?.storeName ?? 'Toko Saya',
        startDate,
        endDate,
        txCount: txs.length,
        totalRevenue: rev,
        totalDiscount: disc,
        netSales: net,
        totalHpp: hpp,
        grossProfit: gross,
        marginPercent: margin,
        topProducts: top,
        chartData: chart,
        themeHue: storeSettings?.themeColor ?? '217',
      };
    } catch (err) {
      toast.error('Gagal membuat laporan');
      throw err;
    }
  };

  return (
    <div className="mx-auto w-full">
      {/* Master Tabs Navbar */}
      <div className="sticky top-0 z-20 bg-slate-50/95 dark:bg-slate-950/95 backdrop-blur-md -mx-4 md:-mx-6 lg:-mx-8 -mt-2 md:-mt-3 px-4 md:px-6 lg:px-8 pt-2 md:pt-3 pb-3 border-b border-border/20 mb-4">
        <div className="flex bg-muted/60 p-1 rounded-full w-full mx-auto shadow-inner border border-border/30">
          <button 
            onClick={() => setActiveTab('penjualan')}
            className={cn("flex-1 py-1.5 text-xs sm:text-sm font-bold rounded-full transition-all flex items-center justify-center gap-2", activeTab === 'penjualan' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground hover:bg-muted/30')}
          >
            Laporan Penjualan
          </button>
          <button 
            onClick={() => setActiveTab('stok')}
            className={cn("flex-1 py-1.5 text-xs sm:text-sm font-bold rounded-full transition-all flex items-center justify-center gap-2", activeTab === 'stok' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground hover:bg-muted/30')}
          >
            Laporan Stok
          </button>
        </div>
      </div>

      {activeTab === 'penjualan' && (
        <div className="px-4 pt-4 pb-24 space-y-6 w-full animate-in fade-in duration-300">
          {/* Action Header */}
          <div className="flex justify-end">
            <Button
              size="sm"
              className="h-9 gap-1.5"
              onClick={() => setShareOpen(true)}
            >
              <Share2 className="w-4 h-4" />
              Invoice Penjualan
            </Button>
          </div>

      <Tabs value={period} onValueChange={v => setPeriod(v as '7' | '30')}>
        <TabsList className="w-full">
          <TabsTrigger value="7" className="flex-1">7 Hari</TabsTrigger>
          <TabsTrigger value="30" className="flex-1">30 Hari</TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-2">
        <Card className="border-0 shadow-sm">
          <CardContent className="p-3 text-center">
            <ShoppingCart className="w-4 h-4 mx-auto text-primary mb-1" />
            <p className="text-lg font-bold">{txCount}</p>
            <p className="text-[10px] text-muted-foreground">Transaksi</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-3 text-center">
            <TrendingUp className="w-4 h-4 mx-auto text-success mb-1" />
            <p className="text-sm font-bold">{rp(totalSales)}</p>
            <p className="text-[10px] text-muted-foreground">Penjualan</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-3 text-center">
            <TrendingUp className="w-4 h-4 mx-auto text-accent mb-1" />
            <p className="text-sm font-bold">{rp(totalProfit)}</p>
            <p className="text-[10px] text-muted-foreground">Profit</p>
          </CardContent>
        </Card>
      </div>

      {/* Profit & Loss */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-1.5">
            <DollarSign className="w-4 h-4" />
            Laba Rugi
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex justify-between items-center text-sm">
            <div className="flex items-center gap-2">
              <ArrowUp className="w-3.5 h-3.5 text-success" />
              <span>Pendapatan Kotor</span>
            </div>
            <span className="font-semibold">{rp(totalRevenue)}</span>
          </div>
          {totalDiscount > 0 && (
            <div className="flex justify-between items-center text-sm text-destructive">
              <div className="flex items-center gap-2">
                <Minus className="w-3.5 h-3.5" />
                <span>Diskon</span>
              </div>
              <span className="font-semibold">-{rp(totalDiscount)}</span>
            </div>
          )}
          <div className="flex justify-between items-center text-sm border-t pt-2">
            <span className="font-medium">Penjualan Bersih</span>
            <span className="font-bold">{rp(netSales)}</span>
          </div>
          <div className="flex justify-between items-center text-sm text-destructive">
            <div className="flex items-center gap-2">
              <ArrowDown className="w-3.5 h-3.5" />
              <span>HPP (Modal)</span>
            </div>
            <span className="font-semibold">-{rp(totalHpp)}</span>
          </div>
          <div className="flex justify-between items-center text-base border-t pt-2">
            <span className="font-bold">Laba Kotor</span>
            <span className={`font-bold ${grossProfit >= 0 ? 'text-success' : 'text-destructive'}`}>
              {rp(grossProfit)}
            </span>
          </div>
          <div className="flex justify-between items-center text-xs text-muted-foreground">
            <span>Margin</span>
            <span className="font-semibold">{marginPercent.toFixed(1)}%</span>
          </div>
        </CardContent>
      </Card>

      {/* Chart */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Tren Penjualan</CardTitle>
        </CardHeader>
        <CardContent className="pb-4">
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={chartData}>
              <XAxis dataKey="date" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis hide />
              <Tooltip formatter={(v: number) => [`Rp ${v.toLocaleString('id-ID')}`, 'Penjualan']} contentStyle={{ fontSize: 12, borderRadius: 8 }} />
              <Bar dataKey="sales" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Top Products */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-1.5">
            <Package className="w-4 h-4" />
            Produk Terlaris
          </CardTitle>
        </CardHeader>
        <CardContent>
          {topProducts.length === 0 ? (
            <p className="text-xs text-muted-foreground py-4 text-center">Belum ada data penjualan</p>
          ) : (
            <div className="space-y-2">
              {topProducts.map((p, i) => (
                <div key={p.name} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-primary/10 text-primary text-[10px] font-bold flex items-center justify-center">{i + 1}</span>
                    <span className="text-sm">{p.name}</span>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-bold">{rp(p.revenue)}</p>
                    <p className="text-[10px] text-muted-foreground">{p.qty} terjual · laba {rp(p.profit)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

        <ReportShareModal
          isOpen={shareOpen}
          onClose={() => setShareOpen(false)}
          onGenerate={handleGenerateReport}
          storeName={storeSettings?.storeName ?? 'Toko Saya'}
        />
        </div>
      )}

      {activeTab === 'stok' && (
        <div className="animate-in fade-in duration-300">
          <StockReport />
        </div>
      )}
    </div>
  );
}
