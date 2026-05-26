import { useDbQuery, dbUpdate } from '@/hooks/db-hooks';
import React, { useState, useEffect } from 'react';
import { Transaction, TransactionItemRecord, StoreSettings } from '@/hooks/db-hooks';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { UtensilsCrossed, User, Clock, Printer, ChefHat, Timer, CheckCircle2, Flame, ArrowRight, History } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useThemeColor } from '@/hooks/use-theme-color';
import KitchenReceiptModal from '../components/KitchenReceiptModal';
import PrintActionModal from '@/components/PrintActionModal';

// ── KOMPONEN ITEM PESANAN ──
function KitchenItemsList({ transactionId, compact = false }: { transactionId: number, compact?: boolean }) {
  const allItems = (useDbQuery<TransactionItemRecord>('transactionItems') || []);
  const items = allItems.filter((i) => i.transactionId === transactionId);
  
  return (
    <div className={cn("mt-2", compact ? "space-y-1.5" : "space-y-0")}>
      {items.map((item, index) => (
        <div key={item.id} className={cn(
          "flex items-start gap-3",
          !compact && "py-3",
          (!compact && index !== items.length - 1) && "border-b border-dashed border-border"
        )}>
          {/* Quantity Badge */}
          <div className={cn(
            "flex items-center justify-center shrink-0 font-black rounded-lg text-primary border border-primary/30",
            compact ? "bg-primary/10 text-sm min-w-7 h-7 px-1.5 shadow-sm" : "bg-primary/20 text-lg min-w-9 h-9 px-2 shadow-sm mt-0.5"
          )}>
            {item.quantity}x
          </div>
          
          {/* Item Details */}
          <div className="flex flex-col flex-1 min-w-0">
            <span className={cn("font-extrabold text-foreground leading-snug", compact ? "text-sm" : "text-base")}>{item.productName}</span>
            
            {item.selectedVariants && item.selectedVariants.length > 0 && (
              <span className={cn("font-semibold text-muted-foreground", compact ? "text-xs" : "text-xs mt-0.5")}>
                {item.selectedVariants.map((v: any) => v.optionName).join(', ')}
              </span>
            )}
            
            {item.notes && (
              <div className={cn("inline-flex", compact ? "mt-0.5" : "mt-1.5")}>
                <span className={cn(
                  "font-bold text-amber-600 dark:text-amber-500 bg-amber-500/10 rounded border border-amber-500/20 leading-tight",
                  compact ? "text-xs px-1.5 py-0.5" : "text-xs px-2 py-1"
                )}>
                  📝 {item.notes}
                </span>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

function KitchenItemSummary({ transactionId, isExpanded }: { transactionId: number, isExpanded: boolean }) {
  const allItems = (useDbQuery<TransactionItemRecord>('transactionItems') || []);
  const items = allItems.filter((i) => i.transactionId === transactionId);
  
  const summary = items.map(i => `${i.quantity}x ${i.productName}`).join(', ');
  
  return (
    <div className="flex items-center justify-between gap-3 min-w-[250px]">
      <div className="max-w-[180px] lg:max-w-[350px] truncate text-xs font-bold text-foreground" title={summary}>
        {summary || 'Memuat pesanan...'}
      </div>
      <span className="shrink-0 inline-flex items-center gap-1 text-[10px] font-bold text-muted-foreground group-hover:text-primary transition-colors border border-border px-2 py-1 rounded bg-background shadow-sm">
        {isExpanded ? 'Tutup ▴' : 'Detail ▾'}
      </span>
    </div>
  );
}

const KITCHEN_STEPS = ['diproses', 'dimasak', 'disiapkan', 'siap', 'diantarkan'] as const;

export default function KitchenDisplay() {
  useThemeColor();
  const [activeTab, setActiveTab] = useState<'aktif' | 'riwayat'>('aktif');
  const [receiptTx, setReceiptTx] = useState<Transaction | null>(null);
  const [printActionTx, setPrintActionTx] = useState<Transaction | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [expandedRows, setExpandedRows] = useState<Record<number, boolean>>({});

  const toggleRow = (id: number) => {
    setExpandedRows(prev => ({ ...prev, [id]: !prev[id] }));
  };
  
  const storeSettings = useDbQuery<StoreSettings>('storeSettings')?.[0];
  const allBills = useDbQuery<Transaction>('transactions') || [];
  const allTxItems = useDbQuery<TransactionItemRecord>('transactionItems') || [];
  const receiptItems = (allTxItems).filter((i) => receiptTx && i.transactionId === receiptTx.id);
  
  const activeBills = allBills.filter(t => t.kitchenStatus && t.kitchenStatus !== 'diantarkan' && t.kitchenStatus !== 'pending');

  // Pisahkan berdasarkan status untuk layout Kanban Board
  const billsDiproses = activeBills.filter(t => t.kitchenStatus === 'diproses').sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  const billsDimasak = activeBills.filter(t => t.kitchenStatus === 'dimasak').sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  const billsDisiapkan = activeBills.filter(t => t.kitchenStatus === 'disiapkan').sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  const billsSiap = activeBills.filter(t => t.kitchenStatus === 'siap').sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  const billsRiwayat = allBills.filter(t => t.kitchenStatus === 'diantarkan' || t.status === 'batal').sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  // Live clock
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const handleNextStep = async (bill: Transaction) => {
    try {
      const currentIndex = KITCHEN_STEPS.indexOf(bill.kitchenStatus as any);
      if (currentIndex < KITCHEN_STEPS.length - 1) {
        const nextStatus = KITCHEN_STEPS[currentIndex + 1];
        const updates: Partial<Transaction> = { kitchenStatus: nextStatus };
        await dbUpdate('transactions', bill.id!, updates);
        toast.success(`Pesanan ${bill.receiptNumber} maju ke: ${nextStatus.toUpperCase()}`);
      }
    } catch (err) {
      toast.error('Gagal memperbarui status pesanan');
    }
  };

  // Komponen Kartu Tiket Dapur
  const KanbanTicket = ({ bill, colorConfig }: { bill: Transaction, colorConfig: any }) => {
    const orderDate = new Date(bill.date);
    const diffMins = Math.floor((currentTime.getTime() - orderDate.getTime()) / 60000);
    const isLate = diffMins > 20;

    return (
      <Card className="border-border shadow-lg flex flex-col bg-card/90 backdrop-blur-md rounded-2xl overflow-hidden group shrink-0 hover:shadow-2xl transition-all duration-300">
        
        {/* Header Tiket */}
        <div className={cn("px-4 py-3 flex flex-col gap-2 relative border-b border-border/50", colorConfig.headerBg)}>
          <div className="flex justify-between items-start">
            <Badge variant="outline" className="bg-background/80 backdrop-blur text-foreground font-mono text-xs font-bold border-border/50 px-2 py-1">
              {bill.receiptNumber}
            </Badge>
            <Button variant="ghost" size="icon" className="h-7 w-7 hover:bg-background/50 rounded-md text-muted-foreground hover:text-foreground shadow-sm bg-background/20 backdrop-blur" onClick={() => setPrintActionTx(bill)} title="Pilihan Cetak">
              <Printer className="w-4 h-4" />
            </Button>
          </div>

          <div className="flex justify-between items-end">
            <div>
              {bill.tableNumber ? (
                <div className="flex flex-col leading-none">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">Nomor Meja</span>
                  <span className="text-2xl font-black text-foreground">Meja {bill.tableNumber}</span>
                </div>
              ) : (
                <div className="flex flex-col leading-none">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">Tipe Pesanan</span>
                  <span className="text-lg font-black text-foreground">Bawa Pulang</span>
                </div>
              )}
            </div>
            
            <div className={cn(
              "flex items-center gap-1.5 text-xs font-bold px-2 py-1 rounded-md border shadow-sm",
              isLate ? "bg-destructive/20 text-destructive border-destructive/30 animate-pulse" : "bg-background/80 border-border text-foreground"
            )}>
              <Clock className="w-3.5 h-3.5" />
              {diffMins} mnt
            </div>
          </div>
        </div>

        {/* Isi Tiket */}
        <CardContent className="p-4 flex-1 flex flex-col bg-card">
          {bill.customerName && (
            <div className="flex items-center gap-2 mb-3 bg-muted/50 px-3 py-2 rounded-lg border border-border/60">
              <User className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-bold text-foreground truncate">{bill.customerName}</span>
            </div>
          )}
          <div className="flex-1">
            <KitchenItemsList transactionId={bill.id!} />
          </div>
        </CardContent>

        {/* Tombol Aksi */}
        <div className="p-3 pt-0 bg-card">
          <Button 
            className={cn("w-full h-11 text-sm font-extrabold tracking-wide rounded-xl shadow-md border-none active:scale-95 transition-all", colorConfig.btnClass)}
            onClick={() => handleNextStep(bill)}
          >
            {colorConfig.icon}
            <span className="ml-2">{colorConfig.actionText}</span>
          </Button>
        </div>
      </Card>
    );
  };

  // Komponen Kolom Kanban
  const KanbanColumn = ({ title, icon, count, bills, colorConfig }: any) => (
    <div className="flex flex-col bg-muted/30 rounded-3xl border border-border/50 overflow-hidden h-full shadow-sm">
      {/* Header Kolom */}
      <div className="p-4 border-b border-border/50 flex justify-between items-center bg-card/80 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <div className={cn("p-2 rounded-xl border shadow-sm", colorConfig.iconBg)}>
            {icon}
          </div>
          <h2 className="text-base font-black text-foreground uppercase tracking-tight">{title}</h2>
        </div>
        <div className="bg-background border border-border shadow-sm text-foreground text-sm font-black px-2.5 py-1 rounded-lg">
          {count}
        </div>
      </div>
      
      {/* Scrollable Container untuk Tiket */}
      <div className="p-3 flex-1 overflow-y-auto space-y-4 custom-scrollbar">
        {bills.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-4 opacity-40">
            <div className="w-16 h-16 border-2 border-dashed border-muted-foreground/30 rounded-full flex items-center justify-center mb-3">
              <UtensilsCrossed className="w-8 h-8 text-muted-foreground" />
            </div>
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Kosong</p>
          </div>
        ) : (
          bills.map((bill: any) => (
            <KanbanTicket key={bill.id} bill={bill} colorConfig={colorConfig} />
          ))
        )}
      </div>
    </div>
  );

  // Group riwayat berdasarkan tanggal
  const dateFormatter = new Intl.DateTimeFormat('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  const timeFormatter = new Intl.DateTimeFormat('id-ID', { hour: '2-digit', minute: '2-digit' });

  const groupedHistory = billsRiwayat.reduce((groups: Record<string, Transaction[]>, bill) => {
    const dateStr = dateFormatter.format(new Date(bill.date));
    if (!groups[dateStr]) {
      groups[dateStr] = [];
    }
    groups[dateStr].push(bill);
    return groups;
  }, {});

  return (
    <div className="flex-1 h-full flex flex-col gap-4">
      {/* KITCHEN TABS */}
      <div className="sticky top-0 z-20 bg-background/95 backdrop-blur-md -mx-6 -mt-6 px-6 pt-6 pb-3 border-b border-border/20 mb-4">
        <div className="flex bg-muted/60 p-1 rounded-full w-full shadow-inner border border-border/30">
          <button 
            onClick={() => setActiveTab('aktif')}
            className={cn("flex-1 py-1.5 text-xs sm:text-sm font-bold rounded-full transition-all flex items-center justify-center gap-2", activeTab === 'aktif' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground hover:bg-muted/30')}
          >
            <Flame className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Pesanan Aktif</span>
            <span className="sm:hidden">Aktif</span>
          </button>
          <button 
            onClick={() => setActiveTab('riwayat')}
            className={cn("flex-1 py-1.5 text-xs sm:text-sm font-bold rounded-full transition-all flex items-center justify-center gap-2", activeTab === 'riwayat' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground hover:bg-muted/30')}
          >
            <History className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Riwayat Dapur</span>
            <span className="sm:hidden">Riwayat</span>
          </button>
        </div>
      </div>

      {activeTab === 'aktif' ? (
        /* KANBAN BOARD GRID */
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5 flex-1 overflow-hidden pb-2">
        
        {/* Kolom 1: Baru Masuk */}
        <KanbanColumn 
          title="Pesanan Masuk" 
          count={billsDiproses.length} 
          bills={billsDiproses}
          icon={<ChefHat className="w-5 h-5" />}
          colorConfig={{
            iconBg: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
            headerBg: "bg-blue-500/5 dark:bg-blue-950/20",
            btnClass: "bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-500 text-white shadow-blue-500/20",
            actionText: "Mulai Masak",
            icon: <Flame className="w-4 h-4" />
          }}
        />

        {/* Kolom 2: Sedang Dimasak */}
        <KanbanColumn 
          title="Sedang Dimasak" 
          count={billsDimasak.length} 
          bills={billsDimasak}
          icon={<Flame className="w-5 h-5 animate-pulse" />}
          colorConfig={{
            iconBg: "bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20",
            headerBg: "bg-orange-500/5 dark:bg-orange-950/20",
            btnClass: "bg-orange-600 hover:bg-orange-700 dark:bg-orange-600 dark:hover:bg-orange-500 text-white shadow-orange-500/20",
            actionText: "Selesai Dimasak",
            icon: <Timer className="w-4 h-4" />
          }}
        />

        {/* Kolom 3: Tahap Penyajian */}
        <KanbanColumn 
          title="Tahap Penyajian" 
          count={billsDisiapkan.length} 
          bills={billsDisiapkan}
          icon={<UtensilsCrossed className="w-5 h-5" />}
          colorConfig={{
            iconBg: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20",
            headerBg: "bg-purple-500/5 dark:bg-purple-950/20",
            btnClass: "bg-purple-600 hover:bg-purple-700 dark:bg-purple-600 dark:hover:bg-purple-500 text-white shadow-purple-500/20",
            actionText: "Siap Diantar",
            icon: <CheckCircle2 className="w-4 h-4" />
          }}
        />

        {/* Kolom 4: Siap Diantar */}
        <KanbanColumn 
          title="Menunggu Waiter" 
          count={billsSiap.length} 
          bills={billsSiap}
          icon={<CheckCircle2 className="w-5 h-5" />}
          colorConfig={{
            iconBg: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
            headerBg: "bg-emerald-500/5 dark:bg-emerald-950/20",
            btnClass: "bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-600 dark:hover:bg-emerald-500 text-white shadow-emerald-500/20",
            actionText: "Tandai Diantarkan",
            icon: <ArrowRight className="w-4 h-4" />
          }}
        />
        
      </div>
      ) : (
        /* RIWAYAT LIST GROUPED BY DATE */
        <div className="flex-1 overflow-y-auto bg-card rounded-3xl border border-border shadow-sm p-4 sm:p-6 custom-scrollbar">
          {billsRiwayat.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-4 opacity-50">
              <div className="w-20 h-20 bg-muted rounded-full flex items-center justify-center mb-4 border border-border">
                <History className="w-10 h-10 text-muted-foreground" />
              </div>
              <p className="text-sm font-bold text-muted-foreground uppercase tracking-widest">Belum ada riwayat pesanan</p>
            </div>
          ) : (
            <div className="space-y-8 pb-4">
              {Object.entries(groupedHistory).map(([dateLabel, bills]) => (
                <div key={dateLabel} className="space-y-4">
                  {/* Date Header */}
                  <div className="flex items-center gap-3 border-b border-border pb-2">
                    <h3 className="text-sm font-black text-foreground uppercase tracking-wider">{dateLabel}</h3>
                    <Badge variant="secondary" className="text-[10px] font-bold">
                      {bills.length} Pesanan
                    </Badge>
                  </div>
                  
                  {/* Table View */}
                  <div className="rounded-xl border border-border overflow-x-auto bg-card/50 shadow-sm">
                    <table className="w-full text-left min-w-[700px]">
                      <thead className="bg-muted/50 text-xs uppercase text-muted-foreground font-extrabold border-b border-border">
                        <tr>
                          <th className="px-5 py-3.5 w-32 whitespace-nowrap">Waktu / Struk</th>
                          <th className="px-5 py-3.5 w-32 whitespace-nowrap">Nomor Meja</th>
                          <th className="px-5 py-3.5 whitespace-nowrap">Detail Pesanan</th>
                          <th className="px-5 py-3.5 w-32 text-center whitespace-nowrap">Status</th>
                          <th className="px-5 py-3.5 w-16 text-center whitespace-nowrap">Aksi</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/50 text-sm">
                        {bills.map(bill => {
                          const isCancelled = bill.status === 'batal';
                          const timeStr = timeFormatter.format(new Date(bill.date)).replace('.', ':');
                          const isExpanded = !!expandedRows[bill.id!];
                          
                          return (
                            <React.Fragment key={bill.id}>
                              <tr 
                                onClick={() => toggleRow(bill.id!)}
                                className="hover:bg-muted/30 transition-colors cursor-pointer group"
                              >
                                <td className="px-5 py-4 align-middle whitespace-nowrap">
                                  <div className="text-sm font-bold text-foreground mb-1 flex items-center gap-1.5">
                                    <Clock className="w-3.5 h-3.5 text-muted-foreground" /> {timeStr}
                                  </div>
                                  <div className="font-mono text-[11px] font-semibold text-muted-foreground">{bill.receiptNumber}</div>
                                </td>
                                <td className="px-5 py-4 align-middle whitespace-nowrap">
                                  {bill.tableNumber ? (
                                    <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20 text-sm py-1 font-bold">Meja {bill.tableNumber}</Badge>
                                  ) : (
                                    <Badge variant="outline" className="bg-muted text-muted-foreground text-xs py-1">Bawa Pulang</Badge>
                                  )}
                                </td>
                                <td className="px-5 py-4 align-middle whitespace-nowrap">
                                  <KitchenItemSummary transactionId={bill.id!} isExpanded={isExpanded} />
                                </td>
                                <td className="px-5 py-4 align-middle text-center whitespace-nowrap">
                                  <Badge className={cn(
                                    "font-bold text-[10px] uppercase tracking-wider",
                                    isCancelled 
                                      ? "bg-red-500/10 text-red-600 hover:bg-red-500/20 border-red-500/20" 
                                      : "bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 border-emerald-500/20"
                                  )} variant="outline">
                                    {isCancelled ? 'Dibatalkan' : 'Selesai'}
                                  </Badge>
                                </td>
                                <td className="px-5 py-4 align-middle text-center whitespace-nowrap">
                                  <Button 
                                    variant="ghost" 
                                    size="icon" 
                                    className="h-9 w-9 hover:bg-primary/10 hover:text-primary rounded-xl text-muted-foreground border border-transparent hover:border-primary/20 shadow-sm" 
                                    onClick={(e) => { e.stopPropagation(); setReceiptTx(bill); }} 
                                    title="Print Tiket"
                                  >
                                    <Printer className="w-4 h-4" />
                                  </Button>
                                </td>
                              </tr>
                              {/* Expanded Dropdown Content */}
                              {isExpanded && (
                                <tr className="bg-muted/10">
                                  <td colSpan={5} className="px-5 py-4 border-t-0 border-b border-border">
                                    <div className="bg-card rounded-2xl p-5 border border-border shadow-inner ml-2 mr-2">
                                      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-3 flex items-center gap-2">
                                        <UtensilsCrossed className="w-3.5 h-3.5" />
                                        Rincian Pesanan
                                      </p>
                                      <KitchenItemsList transactionId={bill.id!} compact={false} />
                                    </div>
                                  </td>
                                </tr>
                              )}
                            </React.Fragment>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Pilihan Cetak dari tombol printer di Kanban Card */}
      {printActionTx && (() => {
        const txItems = allTxItems.filter((i) => i.transactionId === printActionTx.id);
        return (
          <PrintActionModal
            open={!!printActionTx}
            onClose={() => setPrintActionTx(null)}
            transaction={printActionTx}
            items={txItems}
            storeSettings={storeSettings}
            showCustomerReceipt={false}
            showKitchenReceipt={true}
          />
        );
      })()}

      {/* Printer / Receipt Modal Khusus Dapur (dari riwayat) */}
      {receiptTx && (
        <KitchenReceiptModal
          open={!!receiptTx}
          onClose={() => setReceiptTx(null)}
          transaction={receiptTx}
          items={receiptItems || []}
          storeSettings={storeSettings}
        />
      )}
    </div>
  );
}
