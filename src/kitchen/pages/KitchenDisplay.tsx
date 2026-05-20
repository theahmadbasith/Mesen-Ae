import { useDbQuery, dbUpdate } from '@/hooks/db-hooks';
import React, { useState, useEffect } from 'react';
import { Transaction, TransactionItemRecord, StoreSettings } from '@/hooks/db-hooks';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { UtensilsCrossed, User, Clock, Printer, ChefHat, Timer, CheckCircle2, Flame, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useThemeColor } from '@/hooks/use-theme-color';
import KitchenReceiptModal from '../components/KitchenReceiptModal';

// ── KOMPONEN ITEM PESANAN ──
function KitchenItemsList({ transactionId }: { transactionId: number }) {
  const allItems = (useDbQuery<TransactionItemRecord>('transactionItems') || []);
  const items = allItems.filter((i) => i.transactionId === transactionId);
  
  return (
    <div className="space-y-0 mt-2">
      {items.map((item, index) => (
        <div key={item.id} className={cn(
          "flex items-start gap-3 py-2.5",
          index !== items.length - 1 && "border-b border-dashed border-zinc-800/80"
        )}>
          {/* Quantity Badge */}
          <div className="bg-orange-500/20 text-orange-400 border border-orange-500/30 font-black text-sm w-7 h-7 rounded-md flex items-center justify-center shrink-0 shadow-sm mt-0.5">
            {item.quantity}
          </div>
          
          {/* Item Details */}
          <div className="flex flex-col flex-1 min-w-0">
            <span className="font-extrabold text-slate-200 text-sm leading-snug">{item.productName}</span>
            
            {item.selectedVariants && item.selectedVariants.length > 0 && (
              <span className="text-[10px] font-semibold text-zinc-400 mt-0.5">
                + {item.selectedVariants.map((v: any) => v.optionName).join(', ')}
              </span>
            )}
            
            {item.notes && (
              <div className="inline-flex mt-1">
                <span className="text-[10px] font-bold text-amber-500 bg-amber-500/10 px-1.5 py-0.5 rounded leading-tight border border-amber-500/20">
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

const KITCHEN_STEPS = ['diproses', 'dimasak', 'disiapkan', 'siap', 'diantarkan'] as const;

export default function KitchenDisplay() {
  useThemeColor();
  const [receiptTx, setReceiptTx] = useState<Transaction | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  
  const storeSettings = useDbQuery<StoreSettings>('storeSettings')?.[0];
  const allBills = useDbQuery<Transaction>('transactions') || [];
  const receiptItems = (useDbQuery<TransactionItemRecord>('transactionItems') || []).filter((i) => receiptTx && i.transactionId === receiptTx.id);
  
  const activeBills = allBills.filter(t => t.kitchenStatus && t.kitchenStatus !== 'diantarkan' && t.kitchenStatus !== 'pending');

  // Pisahkan berdasarkan status untuk layout Kanban Board
  const billsDiproses = activeBills.filter(t => t.kitchenStatus === 'diproses').sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  const billsDimasak = activeBills.filter(t => t.kitchenStatus === 'dimasak').sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  const billsDisiapkan = activeBills.filter(t => t.kitchenStatus === 'disiapkan').sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  const billsSiap = activeBills.filter(t => t.kitchenStatus === 'siap').sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

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
      <Card className="border-zinc-800 shadow-xl flex flex-col bg-zinc-900/80 backdrop-blur-sm rounded-xl overflow-hidden group shrink-0">
        
        {/* Header Tiket */}
        <div className={cn("px-3 py-2 flex flex-col gap-2 relative border-b border-zinc-800/80", colorConfig.headerBg)}>
          <div className="flex justify-between items-start">
            <Badge variant="outline" className="bg-zinc-950/50 text-slate-300 font-mono text-[10px] font-bold border-zinc-700/50 px-1.5 py-0.5">
              {bill.receiptNumber}
            </Badge>
            <Button variant="ghost" size="icon" className="h-6 w-6 hover:bg-white/10 rounded-md text-slate-400 hover:text-white" onClick={() => setReceiptTx(bill)} title="Print Tiket">
              <Printer className="w-3.5 h-3.5" />
            </Button>
          </div>

          <div className="flex justify-between items-end">
            <div>
              {bill.tableNumber ? (
                <div className="flex flex-col leading-none">
                  <span className="text-[8px] font-bold uppercase tracking-wider text-slate-500 mb-0.5">Nomor Meja</span>
                  <span className="text-xl font-black text-white">Meja {bill.tableNumber}</span>
                </div>
              ) : (
                <div className="flex flex-col leading-none">
                  <span className="text-[8px] font-bold uppercase tracking-wider text-slate-500 mb-0.5">Tipe Pesanan</span>
                  <span className="text-sm font-black text-slate-200">Bawa Pulang</span>
                </div>
              )}
            </div>
            
            <div className={cn(
              "flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.5 rounded border",
              isLate ? "bg-red-500/20 text-red-400 border-red-500/30 animate-pulse" : "bg-zinc-950/50 border-zinc-800 text-slate-400"
            )}>
              <Clock className="w-2.5 h-2.5" />
              {diffMins} mnt
            </div>
          </div>
        </div>

        {/* Isi Tiket */}
        <CardContent className="p-3 flex-1 flex flex-col bg-zinc-900">
          {bill.customerName && (
            <div className="flex items-center gap-1.5 mb-2 bg-zinc-950/50 px-2 py-1.5 rounded border border-zinc-800/60">
              <User className="w-3 h-3 text-slate-500" />
              <span className="text-[10px] font-bold text-slate-300 truncate">{bill.customerName}</span>
            </div>
          )}
          <div className="flex-1">
            <KitchenItemsList transactionId={bill.id!} />
          </div>
        </CardContent>

        {/* Tombol Aksi */}
        <div className="p-2 pt-0 bg-zinc-900">
          <Button 
            className={cn("w-full h-9 text-[11px] font-extrabold tracking-wide rounded-md shadow-lg border-none active:scale-95", colorConfig.btnClass)}
            onClick={() => handleNextStep(bill)}
          >
            {colorConfig.icon}
            <span className="ml-1.5">{colorConfig.actionText}</span>
          </Button>
        </div>
      </Card>
    );
  };

  // Komponen Kolom Kanban
  const KanbanColumn = ({ title, icon, count, bills, colorConfig }: any) => (
    <div className="flex flex-col bg-zinc-950/50 rounded-2xl border border-zinc-800/50 overflow-hidden h-full">
      {/* Header Kolom */}
      <div className="p-3 border-b border-zinc-800 flex justify-between items-center bg-zinc-900/50">
        <div className="flex items-center gap-2">
          <div className={cn("p-1.5 rounded-lg border", colorConfig.iconBg)}>
            {icon}
          </div>
          <h2 className="text-sm font-extrabold text-slate-200 uppercase tracking-tight">{title}</h2>
        </div>
        <div className="bg-zinc-800 text-slate-300 text-xs font-black px-2 py-0.5 rounded-md">
          {count}
        </div>
      </div>
      
      {/* Scrollable Container untuk Tiket */}
      <div className="p-3 flex-1 overflow-y-auto space-y-3 custom-scrollbar">
        {bills.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-4 opacity-40">
            <div className="w-12 h-12 border-2 border-dashed border-zinc-600 rounded-full flex items-center justify-center mb-2">
              <UtensilsCrossed className="w-5 h-5 text-zinc-500" />
            </div>
            <p className="text-[10px] font-semibold text-zinc-400 uppercase tracking-widest">Kosong</p>
          </div>
        ) : (
          bills.map((bill: any) => (
            <KanbanTicket key={bill.id} bill={bill} colorConfig={colorConfig} />
          ))
        )}
      </div>
    </div>
  );

  return (
    <div className="flex-1 h-full flex flex-col gap-4">
      {/* KANBAN BOARD GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 flex-1 overflow-hidden h-full pb-2">
        
        {/* Kolom 1: Baru Masuk */}
        <KanbanColumn 
          title="Pesanan Masuk" 
          count={billsDiproses.length} 
          bills={billsDiproses}
          icon={<ChefHat className="w-4 h-4" />}
          colorConfig={{
            iconBg: "bg-blue-500/10 text-blue-400 border-blue-500/20",
            headerBg: "bg-blue-950/20",
            btnClass: "bg-blue-600 hover:bg-blue-500 text-white shadow-blue-900/50",
            actionText: "Mulai Masak",
            icon: <Flame className="w-3.5 h-3.5" />
          }}
        />

        {/* Kolom 2: Sedang Dimasak */}
        <KanbanColumn 
          title="Sedang Dimasak" 
          count={billsDimasak.length} 
          bills={billsDimasak}
          icon={<Flame className="w-4 h-4 animate-pulse" />}
          colorConfig={{
            iconBg: "bg-orange-500/10 text-orange-400 border-orange-500/20",
            headerBg: "bg-orange-950/20",
            btnClass: "bg-orange-600 hover:bg-orange-500 text-white shadow-orange-900/50",
            actionText: "Selesai Dimasak",
            icon: <Timer className="w-3.5 h-3.5" />
          }}
        />

        {/* Kolom 3: Tahap Penyajian */}
        <KanbanColumn 
          title="Tahap Penyajian" 
          count={billsDisiapkan.length} 
          bills={billsDisiapkan}
          icon={<UtensilsCrossed className="w-4 h-4" />}
          colorConfig={{
            iconBg: "bg-purple-500/10 text-purple-400 border-purple-500/20",
            headerBg: "bg-purple-950/20",
            btnClass: "bg-purple-600 hover:bg-purple-500 text-white shadow-purple-900/50",
            actionText: "Siap Diantar",
            icon: <CheckCircle2 className="w-3.5 h-3.5" />
          }}
        />

        {/* Kolom 4: Siap Diantar */}
        <KanbanColumn 
          title="Menunggu Waiter" 
          count={billsSiap.length} 
          bills={billsSiap}
          icon={<CheckCircle2 className="w-4 h-4" />}
          colorConfig={{
            iconBg: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
            headerBg: "bg-emerald-950/20",
            btnClass: "bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-900/50",
            actionText: "Tandai Diantarkan",
            icon: <ArrowRight className="w-3.5 h-3.5" />
          }}
        />
        
      </div>

      {/* Printer / Receipt Modal Khusus Dapur */}
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
