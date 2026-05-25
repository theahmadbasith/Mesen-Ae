import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { id as localeId } from 'date-fns/locale';
import { toast } from 'sonner';
import {
  ClipboardList,
  ArrowRight,
  User,
  Hash,
  Printer,
  Trash2,
  Clock,
  CheckCircle2,
} from 'lucide-react';

import { useDbQuery, dbDelete, dbUpdate, Transaction } from '@/hooks/db-hooks';
import { sendPushToRole } from '@/lib/fcm';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import Receipt from '@/components/Receipt';
import { FORMAT_IDR } from '@/lib/utils';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';

export default function ActiveOrders({ onSwitchToKitchen }: { onSwitchToKitchen?: () => void } = {}) {
  const navigate = useNavigate();
  const [receiptTx, setReceiptTx] = useState<Transaction | null>(null);
  const [cancelConfirmOpen, setCancelConfirmOpen] = useState(false);
  const [billToCancel, setBillToCancel] = useState<Transaction | null>(null);

  // Queries
  const storeSettings = useDbQuery<any>('storeSettings')?.[0];
  const allTxItems = useDbQuery<any>('transactionItems') || [];
  const openBills = (useDbQuery<Transaction>('transactions') || []).filter(
    (t) => {
      const isUnpaid = t.status === 'belum lunas' || t.status === 'open';
      const isPaidButCooking = t.status === 'lunas' && t.kitchenStatus && !['diantarkan', 'batal'].includes(t.kitchenStatus);
      return isUnpaid || isPaidButCooking;
    }
  ).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  const receiptItems = allTxItems.filter(
    (i: any) => receiptTx && i.transactionId === receiptTx.id
  );

  // Smart Trigger: Bunyikan notifikasi native saat ada pesanan baru
  const prevBillsCountRef = React.useRef(openBills.length);
  React.useEffect(() => {
    if (openBills.length > prevBillsCountRef.current) {
      if (Notification.permission === 'granted') {
        const title = 'Pesanan Baru Masuk! 🔔';
        const options = {
          body: 'Ada pesanan pelanggan baru yang harus segera disiapkan di dapur.',
          icon: '/icon-192.png',
          vibrate: [200, 100, 200, 100, 400],
        };
        
        if ('serviceWorker' in navigator) {
          navigator.serviceWorker.ready.then(registration => {
            registration.showNotification(title, options);
          }).catch(() => {
            try { new Notification(title, options); } catch(e) { console.error(e); }
          });
        } else {
          try { new Notification(title, options); } catch(e) { console.error(e); }
        }
      }
    }
    prevBillsCountRef.current = openBills.length;
  }, [openBills.length]);

  // Handlers
  const confirmCancel = (bill: Transaction) => {
    setBillToCancel(bill);
    setCancelConfirmOpen(true);
  };

  const handleMarkDone = async (bill: Transaction) => {
    try {
      await dbUpdate('transactions', bill.id!, { kitchenStatus: 'diantarkan' });
      
      // Notifikasi ke customer bahwa pesanan ritel sudah siap/selesai
      sendPushToRole('customer', {
        title: 'Pesanan Siap! 🍽️',
        body:  `Pesanan Anda (${bill.receiptNumber}) sudah selesai dan bisa diambil/diantar.`,
        url:   '/?view=tracking',
      }).catch(console.error);

      toast.success('Pesanan ritel diselesaikan!');
    } catch (e) {
      toast.error('Gagal menyelesaikan pesanan');
    }
  };

  const handleCancel = async () => {
    if (!billToCancel) return;
    try {
      const billItems = allTxItems.filter((i: any) => i.transactionId === billToCancel.id);
      
      // Hapus semua item transaksi yang terkait terlebih dahulu
      for (const item of billItems) {
        if (item.id) await dbDelete('transactionItems', item.id);
      }
      
      // Hapus transaksi utama
      if (billToCancel.id) await dbDelete('transactions', billToCancel.id);
      
      toast.success(`Pesanan ${billToCancel.receiptNumber} berhasil dibatalkan`);
    } catch (error) {
      toast.error('Gagal membatalkan pesanan');
      console.error('Error deleting bill:', error);
    } finally {
      setCancelConfirmOpen(false);
      setBillToCancel(null);
    }
  };

  return (
    <div className="space-y-8 pb-24 animate-in fade-in duration-500">

      {/* Content Section */}
      {!openBills || openBills.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center bg-card/50 backdrop-blur-sm rounded-3xl border-2 border-dashed border-border/60">
          <div className="bg-muted p-6 rounded-full mb-4">
            <ClipboardList className="w-12 h-12 text-muted-foreground/50" />
          </div>
          <h2 className="text-2xl font-bold mb-2 tracking-tight">Tidak ada pesanan aktif</h2>
          <p className="text-muted-foreground max-w-md">
            Semua pelanggan telah melunasi tagihan mereka, atau belum ada pesanan baru yang masuk ke dapur.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {openBills.map((bill) => (
            <Card 
              key={bill.id} 
              className="flex flex-col border-border/60 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-300 ease-out overflow-hidden group"
            >
              {/* Card Top / Header */}
              <CardHeader className="p-5 pb-0">
                <div className="flex items-start justify-between">
                  <div className="space-y-1.5 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant="default" className="font-mono text-xs px-2.5 py-0.5 bg-primary/10 text-primary hover:bg-primary/20 border-primary/20">
                        {bill.receiptNumber}
                      </Badge>
                      {bill.status === 'lunas' ? (
                        <Badge variant="outline" className="text-[10px] bg-green-50 text-green-700 border-green-200">Lunas (Dapur)</Badge>
                      ) : (
                        <Badge variant="outline" className="text-[10px] bg-amber-50 text-amber-700 border-amber-200">Belum Lunas</Badge>
                      )}
                    </div>
                    {bill.date && (
                      <div className="flex items-center text-xs font-medium text-muted-foreground">
                        <Clock className="w-3.5 h-3.5 mr-1.5" />
                        {format(new Date(bill.date), 'HH:mm', { locale: localeId })}
                      </div>
                    )}
                  </div>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-8 w-8 text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors" 
                    onClick={() => setReceiptTx(bill)}
                    title="Cetak Tiket Dapur"
                  >
                    <Printer className="w-4 h-4" />
                  </Button>
                </div>
              </CardHeader>

              {/* Card Body / Detail Pesanan */}
              <CardContent className="p-5 flex-1 flex flex-col gap-3">
                <div className="space-y-2.5 flex-1">
                  {bill.customerName && (
                    <div className="flex items-center text-sm text-muted-foreground">
                      <div className="bg-muted p-1.5 rounded-md mr-2.5 text-foreground/70">
                        <User className="w-4 h-4" />
                      </div>
                      <span className="font-medium text-foreground truncate">{bill.customerName}</span>
                    </div>
                  )}
                  
                  {bill.tableNumber && (
                    <div className="flex items-center text-sm text-muted-foreground">
                      <div className="bg-muted p-1.5 rounded-md mr-2.5 text-foreground/70">
                        <Hash className="w-4 h-4" />
                      </div>
                      <span>{String(bill.tableNumber) === 'Bawa Pulang' ? 'Take Away' : <>Meja <span className="font-semibold text-foreground">{bill.tableNumber}</span></>}</span>
                    </div>
                  )}

                  {bill.remarks && (
                    <div className="mt-3 text-xs text-muted-foreground bg-muted/50 p-3 rounded-lg border border-border/50 italic relative">
                      <span className="absolute -top-2 left-3 bg-card px-1 text-[10px] uppercase font-bold text-muted-foreground/70">Catatan</span>
                      {bill.remarks}
                    </div>
                  )}
                </div>
              </CardContent>

              {/* Card Bottom / Footer */}
              <CardFooter className="p-5 pt-0 flex flex-col gap-4 border-t border-border/40 mt-auto bg-muted/20">
                <div className="flex justify-between items-end w-full pt-4">
                  <span className="text-sm font-medium text-muted-foreground">Total:</span>
                  <span className="text-xl font-bold tracking-tight text-foreground">
                    {FORMAT_IDR(bill.total)}
                  </span>
                </div>
                
                <div className="flex gap-2.5 w-full">
                  {bill.status !== 'lunas' && (
                    <Button 
                      variant="outline" 
                      className="flex-none px-3 text-destructive border-destructive/20 hover:bg-destructive hover:text-destructive-foreground transition-colors"
                      onClick={() => confirmCancel(bill)}
                      title="Batalkan Pesanan"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                  {bill.status === 'lunas' ? (
                    bill.needsKitchen === false ? (
                      <Button 
                        className="flex-1 gap-2 bg-emerald-600 hover:bg-emerald-700 shadow-md shadow-emerald-600/20 transition-all text-white"
                        onClick={() => handleMarkDone(bill)}
                      >
                        Tandai Selesai
                        <CheckCircle2 className="w-4 h-4" />
                      </Button>
                    ) : (
                        <Button 
                          className="flex-1 gap-2 bg-emerald-600 hover:bg-emerald-700 shadow-md shadow-emerald-600/20 transition-all group-hover:shadow-emerald-600/30 text-white"
                          onClick={onSwitchToKitchen ? onSwitchToKitchen : () => navigate('/kitchen')}
                        >
                          Buka Dapur
                          <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                        </Button>
                    )
                  ) : (
                    <Button 
                      className="flex-1 gap-2 bg-primary hover:bg-primary/90 shadow-md shadow-primary/20 transition-all group-hover:shadow-primary/30"
                      onClick={() => navigate('/admin/cashier', { state: { loadBillId: bill.id } })}
                    >
                      Buka Kasir
                      <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                    </Button>
                  )}
                </div>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}

      {/* Modal / Dialog Struk Pembayaran */}
      {receiptTx && (
        <Receipt
          open={!!receiptTx}
          onClose={() => setReceiptTx(null)}
          transaction={receiptTx}
          items={receiptItems || []}
          storeSettings={storeSettings}
        />
      )}

      <AlertDialog open={cancelConfirmOpen} onOpenChange={setCancelConfirmOpen}>
        <AlertDialogContent className="max-w-[400px] w-[95vw] rounded-2xl p-6">
          <AlertDialogHeader>
            <div className="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center mb-2 mx-auto">
              <Trash2 className="w-6 h-6 text-destructive" />
            </div>
            <AlertDialogTitle className="text-center text-xl font-extrabold">Batalkan Pesanan?</AlertDialogTitle>
            <AlertDialogDescription className="text-center">
              Apakah Anda yakin ingin membatalkan pesanan dengan nomor struk <strong>{billToCancel?.receiptNumber}</strong>? Tindakan ini akan menghapus pesanan secara permanen.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-6 sm:justify-center flex-row gap-3">
            <AlertDialogCancel className="flex-1 mt-0 rounded-xl h-11 font-bold">Batal</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleCancel} 
              className="flex-1 rounded-xl h-11 font-bold bg-destructive hover:bg-destructive/90 text-white shadow-md shadow-destructive/20"
            >
              Ya, Batalkan
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
