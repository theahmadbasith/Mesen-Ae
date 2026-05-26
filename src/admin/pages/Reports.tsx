import { useDbQuery } from '@/hooks/db-hooks';
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

export default function Laporan() {
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
    return allTransactions.filter(t => t.status === 'lunas' && new Date(t.date) >= since);
  }, [allTransactions, days]);

  const allItems = useMemo(() => {
    if (!transactions || transactions.length === 0) return [];
    const txIds = new Set(transactions.map(t => t.id));
    return allTxItems.filter((i: any) => txIds.has(i.transactionId));
  }, [transactions, allTxItems]);

  const txCount = transactions.length;

  const totalSales = useMemo(() => transactions.reduce((sum, t) => sum + (t.total || 0), 0), [transactions]);
  const totalProfit = useMemo(() => transactions.reduce((sum, t) => sum + (t.profit || 0), 0), [transactions]);
  const totalRevenue = useMemo(() => transactions.reduce((sum, t) => sum + (t.subtotal || 0), 0), [transactions]);
  const totalDiscount = useMemo(() => transactions.reduce((sum, t) => sum + (t.discountAmount || 0), 0), [transactions]);
  const netSales = totalSales;
  const totalHpp = totalSales - totalProfit;
  const grossProfit = totalProfit;
  const marginPercent = useMemo(() => {
    if (totalSales === 0) return 0;
    return (totalProfit / totalSales) * 100;
  }, [totalProfit, totalSales]);

  const chartData = useMemo(() => {
    const data: Record<string, number> = {};
    for (let i = days - 1; i >= 0; i--) {
      const dateStr = format(subDays(new Date(), i), 'dd MMM');
      data[dateStr] = 0;
    }

    for (const t of transactions) {
      const dateStr = format(new Date(t.date), 'dd MMM');
      if (dateStr in data) {
        data[dateStr] += (t.total || 0);
      }
    }

    return Object.entries(data).map(([date, sales]) => ({ date, sales }));
  }, [transactions, days]);

  const topProducts = useMemo(() => {
    const map: Record<string, { name: string, qty: number, revenue: number, profit: number }> = {};
    for (const i of allItems) {
      if (!map[i.productName]) {
        map[i.productName] = { name: i.productName, qty: 0, revenue: 0, profit: 0 };
      }
      map[i.productName].qty += (i.quantity || 0);
      map[i.productName].revenue += (i.subtotal || 0);
      map[i.productName].profit += ((i.price - i.hpp) * i.quantity) || 0;
    }

    return Object.values(map)
      .sort((a, b) => b.qty - a.qty)
      .slice(0, 5);
  }, [allItems]);

  const rp = (v: number) => `Rp ${(Number(v) || 0).toLocaleString('id-ID')}`;

  const handleGenerateReport = async (startDateStr: string, endDateStr: string): Promise<MesenAeReportData> => {
    try {
      const start = startOfDay(new Date(startDateStr));
      const end = new Date(endDateStr);
      end.setHours(23, 59, 59, 999);

      const filteredTx = allTransactions.filter(t => {
        if (t.status !== 'lunas') return false;
        const d = new Date(t.date);
        return d >= start && d <= end;
      });

      const txIds = new Set(filteredTx.map(t => t.id));
      const filteredItems = allTxItems.filter((i: any) => txIds.has(i.transactionId));

      const txCount = filteredTx.length;
      const totalRevenue = filteredTx.reduce((sum, t) => sum + (t.subtotal || 0), 0);
      const totalDiscount = filteredTx.reduce((sum, t) => sum + (t.discountAmount || 0), 0);
      const netSales = filteredTx.reduce((sum, t) => sum + (t.total || 0), 0);
      const grossProfit = filteredTx.reduce((sum, t) => sum + (t.profit || 0), 0);
      const totalHpp = netSales - grossProfit;
      const marginPercent = netSales > 0 ? (grossProfit / netSales) * 100 : 0;

      const productMap: Record<string, { qty: number, revenue: number, profit: number }> = {};
      for (const item of filteredItems) {
        if (!productMap[item.productName]) {
          productMap[item.productName] = { qty: 0, revenue: 0, profit: 0 };
        }
        productMap[item.productName].qty += item.quantity || 0;
        productMap[item.productName].revenue += item.subtotal || 0;
        productMap[item.productName].profit += ((item.price - item.hpp) * item.quantity) || 0;
      }

      const topProducts = Object.entries(productMap)
        .map(([name, d]) => ({ name, qty: d.qty, revenue: d.revenue, profit: d.profit }))
        .sort((a, b) => b.qty - a.qty)
        .slice(0, 15);

      const chart: Record<string, number> = {};
      const diffDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
      
      for (let i = 0; i <= diffDays; i++) {
        const d = new Date(start);
        d.setDate(d.getDate() + i);
        chart[format(d, 'dd/MM')] = 0;
      }
      for (const t of filteredTx) {
        const key = format(new Date(t.date), 'dd/MM');
        if (key in chart) {
          chart[key] += (t.total || 0);
        }
      }

      return {
        storeName: storeSettings?.storeName ?? 'Toko Saya',
        startDate: start.toISOString(),
        endDate: end.toISOString(),
        txCount,
        totalRevenue,
        totalDiscount,
        netSales,
        totalHpp,
        grossProfit,
        marginPercent,
        topProducts,
        chartData: Object.entries(chart).map(([date, sales]) => ({ date, sales })),
        themeHue: storeSettings?.themeColor ?? '217',
      };
    } catch (err) {
      toast.error('Gagal membuat laporan');
      throw err;
    }
  };

  return (
    <div className="mx-auto w-full">
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
                <Tooltip formatter={(v: number) => [`Rp ${(Number(v) || 0).toLocaleString('id-ID')}`, 'Penjualan']} contentStyle={{ fontSize: 12, borderRadius: 8 }} />
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
    </div>
  );
}
