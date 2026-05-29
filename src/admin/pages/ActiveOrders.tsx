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
import { usePermissions } from '@/hooks/use-permissions';

import { useDbQuery, dbDelete, dbUpdate, Transaction } from '@/hooks/db-hooks';
import { sendPushToRole } from '@/lib/fcm';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

import PrintActionModal from '@/components/PrintActionModal';
import PaymentSuccessModal from '@/components/PaymentSuccessModal';
import { FORMAT_IDR } from '@/lib/utils';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import PaymentModal from '@/admin/components/PaymentModal';
import { MidtransPaymentModal } from '@/components/MidtransPaymentModal';

export default function ActiveOrders({ onSwitchToKitchen }: { onSwitchToKitchen?: () => void } = {}) {
  const navigate = useNavigate();
  const [printActionTx, setPrintActionTx] = useState<Transaction | null>(null);
  const [cancelConfirmOpen, setCancelConfirmOpen] = useState(false);
  const [billToCancel, setBillToCancel] = useState<Transaction | null>(null);

  // Payment states
  const [payingBill, setPayingBill] = useState<Transaction | null>(null);
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [midtransPaymentType, setMidtransPaymentType] = useState<'qris' | 'transfer' | 'e-wallet' | 'lainnya' | null>(null);
  const [checkoutDataCache, setCheckoutDataCache] = useState<{ bill: Transaction; data: any } | null>(null);

  // Confirm manual web order payment
  const [confirmManualOpen, setConfirmManualOpen] = useState(false);
  const [billToConfirmManual, setBillToConfirmManual] = useState<Transaction | null>(null);

  // Success modal setelah bayar
  const [successTx, setSuccessTx] = useState<Transaction | null>(null);
  const [successPayMethodName, setSuccessPayMethodName] = useState('Tunai');

  const { canEdit } = usePermissions();
  const hasEditAccess = canEdit('activeOrders');

  // Queries
  const storeSettings = useDbQuery<any>('storeSettings')?.[0];
  const allTxItems = useDbQuery<any>('transactionItems') || [];
  const paymentMethods = useDbQuery<any>('paymentMethods') || [];
  const categories = useDbQuery<any>('categories') || [];
  const products = useDbQuery<any>('products') || [];

  const getBillNeedsKitchen = (bill: Transaction) => {
    if (bill.needsKitchen !== undefined && bill.needsKitchen !== null) {
      return bill.needsKitchen;
    }
    const items = allTxItems.filter((i: any) => i.transactionId === bill.id);
    if (items.length === 0) return true;
    return items.some((item: any) => {
      const prod = products.find((p: any) => String(p.id) === String(item.productId));
      if (!prod) return true;
      const cat = categories.find((c: any) => String(c.id) === String(prod.categoryId));
      return !cat || cat.needsKitchen !== false;
    });
  };

  const openBills = (useDbQuery<Transaction>('transactions') || []).filter(
    (t) => {
      const isUnpaid = t.status === 'belum lunas';
      // Pesanan dapur yang lunas tapi belum selesai diantar
      const isPaidButCooking = t.status === 'lunas' && t.kitchenStatus && !['diantarkan', 'selesai'].includes(t.kitchenStatus);

      return isUnpaid || isPaidButCooking;
    }
  ).sort((a, b) => new Date(a.date || a.created_at || 0).getTime() - new Date(b.date || b.created_at || 0).getTime());

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

  const handleUpdateRetailStatus = async (bill: Transaction, nextStatus: string) => {
    try {
      await dbUpdate('transactions', bill.id!, { kitchenStatus: nextStatus });
      
      if (nextStatus === 'siap' || nextStatus === 'diantarkan') {
        sendPushToRole('customer', {
          title: nextStatus === 'siap' ? 'Pesanan Siap! 🍽️' : 'Pesanan Selesai! ✅',
          body: nextStatus === 'siap' ? `Pesanan Anda (${bill.receiptNumber}) sudah siap diambil/diantar.` : `Pesanan Anda (${bill.receiptNumber}) telah diselesaikan.`,
          url: '/?view=tracking',
        }).catch(console.error);
      }
      toast.success(`Status pesanan diperbarui`);
    } catch (e) {
      toast.error('Gagal memperbarui status pesanan');
    }
  };

  // Check if order is manual non-cash web order awaiting confirmation
  const isManualWebOrder = (bill: Transaction) => {
    return (
      bill.status === 'belum lunas' &&
      bill.remarks &&
      bill.remarks.includes('Manual') &&
      bill.remarks.includes('Web')
    );
  };

  const handleConfirmManualOrder = async () => {
    if (!billToConfirmManual) return;
    try {
      const pm = paymentMethods.find((m: any) => m.id === billToConfirmManual.paymentMethodId);
      const txPayload = {
        status: 'lunas',
        payment_amount: billToConfirmManual.total,
        payments: [{
          method_id: billToConfirmManual.paymentMethodId || 0,
          method_name: pm?.name || 'Manual',
          amount: billToConfirmManual.total || 0,
          date: new Date().toISOString()
        }],
        kitchen_status: getBillNeedsKitchen(billToConfirmManual) ? 'diproses' : (billToConfirmManual.remarks?.includes('Web') ? 'diproses' : null),
        closed_at: new Date().toISOString(),
      };
      await dbUpdate('transactions', billToConfirmManual.id!, txPayload);
      
      sendPushToRole('customer', {
        title: 'Pembayaran Dikonfirmasi! ✅',
        body: `Pembayaran Anda (${billToConfirmManual.receiptNumber}) telah dikonfirmasi oleh admin.`,
        url: '/?view=tracking',
      }).catch(console.error);

      toast.success('Pembayaran berhasil dikonfirmasi!');
    } catch (e: any) {
      toast.error('Gagal mengkonfirmasi pembayaran: ' + e.message);
    } finally {
      setConfirmManualOpen(false);
      setBillToConfirmManual(null);
    }
  };

  const processCheckoutToDb = async (bill: Transaction, data: any) => {
    setIsCheckingOut(true);
    try {
      const finalTax = data.taxAndService;
      const finalTotal = data.total;
      const finalChange = data.change;
      const finalPayments = data.finalPayments;
      const primaryMethodId = data.primaryMethodId;
      const finalPaymentAmount = finalPayments.reduce((sum: number, p: any) => sum + p.amount, 0);

      const txPayload = {
        tax_and_service: finalTax,
        total: finalTotal,
        payment_method_id: primaryMethodId,
        payment_amount: finalPaymentAmount,
        payments: finalPayments,
        change: finalChange,
        customer_name: data.customerName || null,
        table_number: data.tableNumber || null,
        remarks: data.remarks || null,
        status: 'lunas',
        // Ritel dari web (termasuk split bill): set 'diproses' agar tampil di ActiveOrders dan bisa di-manage
        // Pesanan kasir dengan needsKitchen=false (kitchenStatus=null): null (tidak perlu tracking)
        kitchen_status: getBillNeedsKitchen(bill)
          ? 'diproses'
          : (bill.kitchenStatus ? 'diproses' : null),
        closed_at: new Date().toISOString(),
      };

      await dbUpdate('transactions', bill.id!, txPayload);

      // Send push notification if it goes to kitchen
      if (getBillNeedsKitchen(bill)) {
        sendPushToRole('admin', {
          title: 'Pesanan Lunas! 🚀',
          body: `Pesanan (${bill.receiptNumber}) dari Kasir untuk ${data.tableNumber ? 'Meja ' + data.tableNumber : 'Bawa Pulang'} sudah dibayar dan siap diproses.`,
          url: '/admin/kitchen',
        }).catch(console.error);
      }

      toast.success('Pembayaran berhasil disimpan!');
      setPayingBill(null);

      // Buka modal sukses dengan data transaksi yang sudah diupdate
      const updatedBill: Transaction = {
        ...bill,
        ...txPayload,
        paymentMethodId: primaryMethodId,
        paymentAmount: finalPaymentAmount,
        payments: finalPayments,
        change: finalChange,
        total: finalTotal,
        taxAndService: finalTax,
        status: 'lunas',
        kitchenStatus: getBillNeedsKitchen(bill)
          ? 'diproses'
          : (bill.kitchenStatus ? 'diproses' : null),
        customerName: data.customerName || bill.customerName || null,
        tableNumber: data.tableNumber || bill.tableNumber || null,
      };
      setSuccessTx(updatedBill);
      setSuccessPayMethodName(data.paymentMethodName || 'Tunai');
    } catch (e: any) {
      toast.error('Gagal menyimpan pembayaran: ' + e.message);
    } finally {
      setIsCheckingOut(false);
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
              className="flex flex-col border-border/60 shadow-sm hover:shadow-md hover:border-primary/40 transition-all duration-300 ease-out overflow-hidden group"
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
                    onClick={() => setPrintActionTx(bill)}
                    title="Pilihan Cetak"
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

                  {/* ── Item List Ringkas ── */}
                  {(() => {
                    const items = allTxItems.filter((i: any) => String(i.transactionId) === String(bill.id));
                    if (items.length === 0) return null;
                    return (
                      <div className="mt-2 bg-muted/40 border border-border/40 rounded-lg px-3 py-2.5 space-y-1">
                        {items.map((item: any, idx: number) => (
                          <div key={idx} className="flex items-baseline justify-between gap-2">
                            <span className="text-xs text-foreground font-medium truncate flex-1">{item.productName || item.product_name || '—'}</span>
                            <span className="text-[11px] font-bold text-primary shrink-0">×{item.quantity}</span>
                          </div>
                        ))}
                      </div>
                    );
                  })()}

                  {bill.remarks && (
                    <div className="mt-3 text-xs text-muted-foreground bg-muted/50 p-3 rounded-lg border border-border/50 italic relative">
                      <span className="absolute -top-2 left-3 bg-card px-1 text-[10px] uppercase font-bold text-muted-foreground/70">Catatan</span>
                      {bill.remarks}
                    </div>
                  )}
                </div>
              </CardContent>

              {/* Card Bottom / Footer */}
              <CardFooter className="px-5 pb-5 pt-0 mt-auto shrink-0 z-20 relative">
                {hasEditAccess && (
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
                      !getBillNeedsKitchen(bill) ? (
                        bill.kitchenStatus ? (
                          <div className="flex gap-2 w-full">
                            {(!bill.kitchenStatus || bill.kitchenStatus === 'pending' || bill.kitchenStatus === 'diproses') ? (
                              <Button 
                                className="flex-1 bg-amber-500 hover:bg-amber-600 shadow-md shadow-amber-500/20 transition-all text-white"
                                onClick={() => handleUpdateRetailStatus(bill, 'disiapkan')}
                              >
                                Mulai Siapkan
                              </Button>
                            ) : bill.kitchenStatus === 'disiapkan' ? (
                              <Button 
                                className="flex-1 bg-blue-500 hover:bg-blue-600 shadow-md shadow-blue-500/20 transition-all text-white"
                                onClick={() => handleUpdateRetailStatus(bill, 'siap')}
                              >
                                Pesanan Siap
                              </Button>
                            ) : (
                              <Button 
                                className="flex-1 gap-2 bg-emerald-600 hover:bg-emerald-700 shadow-md shadow-emerald-600/20 transition-all text-white"
                                onClick={() => handleUpdateRetailStatus(bill, 'diantarkan')}
                              >
                                Tandai Selesai
                                <CheckCircle2 className="w-4 h-4" />
                              </Button>
                            )}
                          </div>
                        ) : (
                          <Button 
                            className="flex-1 gap-2 bg-emerald-600 hover:bg-emerald-700 shadow-md shadow-emerald-600/20 transition-all text-white"
                            onClick={() => handleMarkDone(bill)}
                          >
                            Tandai Selesai
                            <CheckCircle2 className="w-4 h-4" />
                          </Button>
                        )
                      ) : (
                          <Button 
                            className="flex-1 gap-2 bg-emerald-600 hover:bg-emerald-700 shadow-md shadow-emerald-600/20 transition-all group-hover:shadow-emerald-600/30 text-white"
                            onClick={() => navigate('/admin/kitchen')}
                          >
                            Buka Dapur
                            <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                          </Button>
                      )
                    ) : (
                      // Bill belum lunas
                      isManualWebOrder(bill) ? (
                        <Button 
                          className="flex-1 gap-2 bg-amber-500 hover:bg-amber-600 shadow-md shadow-amber-500/20 transition-all text-white"
                          onClick={() => { setBillToConfirmManual(bill); setConfirmManualOpen(true); }}
                        >
                          Konfirmasi
                          <CheckCircle2 className="w-4 h-4" />
                        </Button>
                      ) : (
                        <Button 
                          className="flex-1 gap-2 bg-primary hover:bg-primary/90 shadow-md shadow-primary/20 transition-all group-hover:shadow-primary/30"
                          onClick={() => setPayingBill(bill)}
                        >
                          Bayar
                          <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                        </Button>
                      )
                    )}
                  </div>
                )}
              </CardFooter>
            </Card>
          ))}
        </div>
      )}

      {/* Modal Pilihan Cetak (tombol printer di card) */}
      {printActionTx && (() => {
        const txItems = allTxItems.filter((i: any) => i.transactionId === printActionTx.id);
        const needsKitchen = getBillNeedsKitchen(printActionTx);
        const payMethodName = paymentMethods.find((pm: any) => pm.id === printActionTx.paymentMethodId)?.name || 'Tunai';
        return (
          <PrintActionModal
            open={!!printActionTx}
            onClose={() => setPrintActionTx(null)}
            transaction={printActionTx}
            items={txItems}
            storeSettings={storeSettings}
            paymentMethodName={payMethodName}
            showCustomerReceipt={printActionTx.status === 'lunas'}
            showKitchenReceipt={needsKitchen}
          />
        );
      })()}

      {/* Modal Sukses Pembayaran */}
      {successTx && (() => {
        const txItems = allTxItems.filter((i: any) => i.transactionId === successTx.id);
        const needsKitchen = getBillNeedsKitchen(successTx);
        return (
          <PaymentSuccessModal
            open={!!successTx}
            onClose={() => setSuccessTx(null)}
            transaction={successTx}
            items={txItems}
            storeSettings={storeSettings}
            paymentMethodName={successPayMethodName}
            needsKitchen={needsKitchen}
          />
        );
      })()}

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

      {/* Confirm Manual Web Order Payment */}
      <AlertDialog open={confirmManualOpen} onOpenChange={setConfirmManualOpen}>
        <AlertDialogContent className="max-w-[400px] w-[95vw] rounded-2xl p-6">
          <AlertDialogHeader>
            <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center mb-2 mx-auto">
              <CheckCircle2 className="w-6 h-6 text-amber-600" />
            </div>
            <AlertDialogTitle className="text-center text-xl font-extrabold">Konfirmasi Pembayaran?</AlertDialogTitle>
            <AlertDialogDescription className="text-center">
              Apakah Anda yakin sudah menerima bukti pembayaran dari pelanggan untuk pesanan <strong>{billToConfirmManual?.receiptNumber}</strong>?
              Tindakan ini akan menandai pesanan sebagai <strong>Lunas</strong>.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-6 sm:justify-center flex-row gap-3">
            <AlertDialogCancel className="flex-1 mt-0 rounded-xl h-11 font-bold">Belum</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleConfirmManualOrder} 
              className="flex-1 rounded-xl h-11 font-bold bg-amber-500 hover:bg-amber-600 text-white shadow-md shadow-amber-500/20"
            >
              Ya, Konfirmasi
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {payingBill && (
        <PaymentModal
          open={!!payingBill}
          onOpenChange={(open) => !open && setPayingBill(null)}
          baseTotal={payingBill.total}
          initialCustomerName={payingBill.customerName || ''}
          initialTableNumber={payingBill.tableNumber || ''}
          initialRemarks={payingBill.remarks || ''}
          initialPayments={payingBill.payments || []}
          paymentMethods={paymentMethods}
          isCheckingOut={isCheckingOut}
          onCheckout={(data) => {
            if (data.paymentMethodCategory && ['qris', 'transfer', 'e-wallet', 'lainnya'].includes(data.paymentMethodCategory)) {
              // Simpan bill + data ke cache, tutup PaymentModal, buka Midtrans
              const billSnapshot = payingBill;
              setCheckoutDataCache({ bill: billSnapshot, data });
              setPayingBill(null); // Tutup PaymentModal agar tidak blokir Snap
              setMidtransPaymentType(data.paymentMethodCategory as any);
            } else {
              processCheckoutToDb(payingBill, data);
            }
          }}
        />
      )}

      {midtransPaymentType && checkoutDataCache && (
        <MidtransPaymentModal
          isOpen={!!midtransPaymentType}
          paymentType={midtransPaymentType}
          amount={checkoutDataCache.data.amountToPay}
          customerName={checkoutDataCache.data.customerName}
          orderId={`TX-${checkoutDataCache.bill?.id ?? Date.now()}-${Date.now()}`}
          paymentMethod={paymentMethods?.find((m: any) => m.id === checkoutDataCache.data.primaryMethodId)}
          onSuccess={() => {
            const { bill, data } = checkoutDataCache;
            setMidtransPaymentType(null);
            setCheckoutDataCache(null);
            processCheckoutToDb(bill, data);
          }}
          onPending={() => {
            setMidtransPaymentType(null);
            setCheckoutDataCache(null);
            toast.warning('Pembayaran pending, silakan selesaikan via Midtrans.');
          }}
          onError={() => {
            setMidtransPaymentType(null);
            toast.error('Pembayaran Midtrans gagal');
          }}
          onClose={() => setMidtransPaymentType(null)}
        />
      )}
    </div>
  );
}
