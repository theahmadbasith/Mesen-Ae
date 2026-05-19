import { useDbQuery, dbUpdate } from '@/hooks/db-hooks';
import React, { useState, useEffect } from 'react';
import { Transaction, TransactionItemRecord, StoreSettings } from '@/hooks/db-hooks';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { id as localeId } from 'date-fns/locale';
import { UtensilsCrossed, User, Hash, Clock, ArrowRight, Printer, ChefHat, CheckCircle2, Timer } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useThemeColor } from '@/hooks/use-theme-color';

import KitchenReceipt from '@/components/KitchenReceipt';

// Helper component to render items
function KitchenItemsList({ transactionId }: { transactionId: number }) {
  const allItems = (useDbQuery<TransactionItemRecord>('transactionItems') || []);
  const items = allItems.filter((i) => i.transactionId === transactionId);
  
  return (
    <div className="space-y-0 mt-2">
      {items.map((item, index) => (
        <div key={item.id} className={cn(
          "flex items-start gap-3 py-3",
          index !== items.length - 1 && "border-b border-dashed border-border/60"
        )}>
          {/* Quantity Badge */}
          <div className="bg-foreground text-background font-black text-sm w-8 h-8 rounded-lg flex items-center justify-center shrink-0 shadow-sm mt-0.5">
            {item.quantity}
          </div>
          
          {/* Item Details */}
          <div className="flex flex-col flex-1 min-w-0">
            <span className="font-extrabold text-foreground text-base leading-snug">{item.productName}</span>
            
            {item.selectedVariants && item.selectedVariants.length > 0 && (
              <span className="text-xs font-semibold text-muted-foreground mt-1">
                + {item.selectedVariants.map((v: any) => v.optionName).join(', ')}
              </span>
            )}
            
            {item.notes && (
              <div className="inline-flex mt-1.5">
                <span className="text-[11px] font-bold text-amber-700 bg-amber-100 dark:bg-amber-950/50 dark:text-amber-400 px-2 py-1 rounded-md leading-tight border border-amber-200 dark:border-amber-900">
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

export default function Kitchen() {
  useThemeColor();
  const [receiptTx, setReceiptTx] = useState<Transaction | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  
  const storeSettings = useDbQuery<StoreSettings>('storeSettings')?.[0];
  const allBills = useDbQuery<Transaction>('transactions') || [];
  const receiptItems = (useDbQuery<TransactionItemRecord>('transactionItems') || []).filter((i) => receiptTx && i.transactionId === receiptTx.id);
  
  const processingBills = allBills
    .filter(t => t.kitchenStatus && t.kitchenStatus !== 'diantarkan' && t.kitchenStatus !== 'pending')
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  // Live clock for the header
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
        toast.success(`Pesanan ${bill.receiptNumber} lanjut ke tahap: ${nextStatus.toUpperCase()}`);
      }
    } catch (err) {
      toast.error('Gagal memperbarui status pesanan');
    }
  };

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'diproses': 
        return { 
          label: 'Baru Masuk', 
          badge: 'bg-yellow-100 text-yellow-700 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-400 dark:border-yellow-800',
          btn: 'bg-yellow-500 hover:bg-yellow-600 text-white shadow-yellow-500/20',
          action: 'Mulai Masak',
          icon: <ChefHat className="w-4 h-4 mr-2" />
        };
      case 'dimasak': 
        return { 
          label: 'Sedang Dimasak', 
          badge: 'bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-900/30 dark:text-orange-400 dark:border-orange-800 animate-pulse',
          btn: 'bg-orange-500 hover:bg-orange-600 text-white shadow-orange-500/20',
          action: 'Selesai Dimasak',
          icon: <Timer className="w-4 h-4 mr-2" />
        };
      case 'disiapkan': 
        return { 
          label: 'Tahap Penyajian', 
          badge: 'bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-900/30 dark:text-purple-400 dark:border-purple-800',
          btn: 'bg-purple-500 hover:bg-purple-600 text-white shadow-purple-500/20',
          action: 'Pesanan Siap',
          icon: <UtensilsCrossed className="w-4 h-4 mr-2" />
        };
      case 'siap': 
        return { 
          label: 'Siap Diantar', 
          badge: 'bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800',
          btn: 'bg-green-500 hover:bg-green-600 text-white shadow-green-500/20',
          action: 'Tandai Diantar',
          icon: <CheckCircle2 className="w-4 h-4 mr-2" />
        };
      default: 
        return { 
          label: status, 
          badge: 'bg-muted text-muted-foreground',
          btn: 'bg-primary hover:bg-primary/90',
          action: 'Lanjut',
          icon: <ArrowRight className="w-4 h-4 mr-2" />
        };
    }
  };

  return (
    <div className="px-5 pt-8 pb-20 space-y-8 animate-in fade-in duration-500 w-full mx-auto min-h-[calc(100vh-4rem)]">
      
      {/* Action Header */}
      <div className="flex justify-end border-b border-border/50 pb-5">
        {/* Live Clock Indicator */}
        <div className="flex items-center gap-3 bg-card border border-border/60 px-4 py-2 rounded-xl shadow-sm">
          <div className="relative flex items-center justify-center">
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 z-10" />
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 absolute animate-ping opacity-75" />
          </div>
          <span className="text-sm font-bold tracking-widest uppercase text-muted-foreground">Kitchen Online</span>
          <div className="h-4 w-px bg-border mx-1" />
          <span className="font-mono text-base font-black text-foreground">
            {format(currentTime, 'HH:mm:ss')}
          </span>
        </div>
      </div>

      {/* Main Content */}
      {!processingBills || processingBills.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-32 text-center bg-card rounded-[2rem] border border-dashed border-border shadow-sm">
          <div className="w-24 h-24 bg-muted/50 rounded-full flex items-center justify-center mb-6">
            <UtensilsCrossed className="w-12 h-12 text-muted-foreground/40" strokeWidth={1.5} />
          </div>
          <h2 className="text-2xl font-extrabold text-foreground mb-2">Dapur Sedang Kosong</h2>
          <p className="text-muted-foreground text-sm font-medium max-w-sm">
            Semua pesanan telah diselesaikan atau restoran sedang menunggu pelanggan baru.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {processingBills.map(bill => {
            const config = getStatusConfig(bill.kitchenStatus || 'diproses');
            
            // Calculate elapsed time (simple string)
            const orderDate = new Date(bill.date);
            const diffMins = Math.floor((currentTime.getTime() - orderDate.getTime()) / 60000);
            const isLate = diffMins > 20; // Example threshold for visual warning
            
            return (
              <Card key={bill.id} className="border-border/60 shadow-md hover:shadow-xl transition-all duration-300 flex flex-col bg-card rounded-2xl overflow-hidden group">
                
                {/* Ticket Header */}
                <div className="bg-muted/40 px-5 py-4 flex flex-col gap-3 relative">
                  <div className="flex justify-between items-start">
                    <Badge variant="outline" className="bg-background font-mono text-xs font-bold border-border/60 shadow-sm">
                      {bill.receiptNumber}
                    </Badge>
                    <Button variant="ghost" size="icon" className="h-8 w-8 bg-background border border-border/50 hover:bg-muted shadow-sm rounded-lg" onClick={() => setReceiptTx(bill)} title="Print Tiket">
                      <Printer className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                    </Button>
                  </div>

                  <div className="flex justify-between items-end">
                    <div>
                      {bill.tableNumber ? (
                        <div className="flex flex-col leading-none">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">Nomor Meja</span>
                          <span className="text-3xl font-black text-primary">{bill.tableNumber}</span>
                        </div>
                      ) : (
                        <div className="flex flex-col leading-none">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">Pesanan</span>
                          <span className="text-xl font-black text-foreground">Takeaway</span>
                        </div>
                      )}
                    </div>
                    
                    <div className="text-right flex flex-col items-end">
                      <div className={cn(
                        "flex items-center gap-1.5 text-xs font-bold px-2 py-1 rounded-md mb-2 border",
                        isLate ? "bg-red-50 text-red-600 border-red-200 dark:bg-red-950/30" : "bg-background border-border/50 text-muted-foreground"
                      )}>
                        <Clock className="w-3.5 h-3.5" />
                        {diffMins} mnt lalu
                      </div>
                      <Badge className={cn("px-2.5 py-0.5 rounded-md border text-[10px] font-bold uppercase tracking-wider shadow-none", config.badge)}>
                        {config.label}
                      </Badge>
                    </div>
                  </div>
                </div>

                {/* Dashed Line Separator */}
                <div className="relative h-0">
                  <div className="absolute inset-0 border-t-2 border-dashed border-border/60 -mt-[1px]" />
                  <div className="absolute -left-3 -top-3 w-6 h-6 bg-background rounded-full border-r border-border/60" />
                  <div className="absolute -right-3 -top-3 w-6 h-6 bg-background rounded-full border-l border-border/60" />
                </div>
                
                {/* Ticket Body (Items) */}
                <CardContent className="p-5 flex-1 flex flex-col bg-background">
                  {bill.customerName && (
                    <div className="flex items-center gap-2 mb-4 bg-muted/30 px-3 py-2 rounded-lg border border-border/50">
                      <User className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm font-bold truncate">A.N: {bill.customerName}</span>
                    </div>
                  )}

                  <div className="flex-1">
                    <KitchenItemsList transactionId={bill.id!} />
                  </div>
                </CardContent>

                {/* Ticket Footer (Action) */}
                <div className="p-4 pt-0 mt-auto bg-background">
                  <Button 
                    className={cn("w-full h-12 text-sm font-extrabold tracking-wide transition-all shadow-lg active:scale-95", config.btn)}
                    onClick={() => handleNextStep(bill)}
                  >
                    {config.icon}
                    <span>{config.action}</span>
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Receipt Modal */}
      {receiptTx && (
        <KitchenReceipt
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
