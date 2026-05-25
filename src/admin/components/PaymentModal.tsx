import React, { useState, useMemo, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Banknote, Building2, Wallet, QrCode, LayoutGrid, CreditCard, User, Hash, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

export interface PaymentMethod {
  id: number;
  name: string;
  category: string;
}

export interface PaymentRecord {
  methodId: number;
  methodName: string;
  amount: number;
  date: Date;
}

export interface PaymentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  baseTotal: number; 
  initialCustomerName?: string;
  initialTableNumber?: string;
  initialRemarks?: string;
  initialPayments?: PaymentRecord[];
  paymentMethods: PaymentMethod[];
  isCheckingOut?: boolean;
  onCheckout: (data: {
    finalPayments: PaymentRecord[];
    primaryMethodId: number;
    customerName: string;
    tableNumber: string;
    remarks: string;
    taxAndService: number;
    total: number;
    change: number;
    paymentMethodCategory?: string;
  }) => void;
}

const rp = (num: number) => 'Rp ' + num.toLocaleString('id-ID');

export default function PaymentModal({
  open,
  onOpenChange,
  baseTotal,
  initialCustomerName = '',
  initialTableNumber = '',
  initialRemarks = '',
  initialPayments = [],
  paymentMethods,
  isCheckingOut = false,
  onCheckout
}: PaymentModalProps) {
  const [paymentMethodId, setPaymentMethodId] = useState<string>('');
  const [paymentAmount, setPaymentAmount] = useState<string>('0');
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [isQuickAdding, setIsQuickAdding] = useState(false);
  const [customerName, setCustomerName] = useState('');
  const [tableNumber, setTableNumber] = useState('');
  const [remarks, setRemarks] = useState('');

  // Reset state when modal opens
  useEffect(() => {
    if (open) {
      setCustomerName(initialCustomerName);
      setTableNumber(initialTableNumber);
      setRemarks(initialRemarks);
      setPayments(initialPayments);
      setPaymentMethodId(paymentMethods?.[0]?.id?.toString() || '');
      setPaymentAmount('0'); // Set default to 0, let the effect below update it to total if needed.
      setIsQuickAdding(false);
    }
  }, [open, initialCustomerName, initialTableNumber, initialRemarks, initialPayments, paymentMethods]);

  const taxAndService = useMemo(() => {
    const currentMethod = paymentMethods?.find(m => m.id!.toString() === paymentMethodId);
    if (!currentMethod) return 0;
    
    if (currentMethod.category === 'qris') return Math.round(baseTotal * 0.007);
    if (currentMethod.category === 'e-wallet') return Math.round(baseTotal * 0.02);
    if (currentMethod.category === 'transfer') return 4000;
    if (currentMethod.category === 'lainnya') return Math.round(baseTotal * 0.03);
    
    return 0;
  }, [paymentMethodId, paymentMethods, baseTotal]);

  const total = useMemo(() => Math.max(0, baseTotal) + taxAndService, [baseTotal, taxAndService]);
  
  const totalPaidSoFar = useMemo(() => payments.reduce((sum, p) => sum + p.amount, 0), [payments]);
  const currentPaidAmount = Number(paymentAmount.replace(/\D/g, '')) || 0;
  const remainingToPay = Math.max(0, total - totalPaidSoFar);
  const change = Math.max(0, totalPaidSoFar + currentPaidAmount - total);

  // Auto-fill amount to total if empty and no partial payments
  useEffect(() => {
    if (open && total > 0 && payments.length === 0 && paymentAmount === '0' && !isQuickAdding) {
      setPaymentAmount(total.toString());
      setIsQuickAdding(true); // Prevent continuous reset
    }
  }, [open, total, payments.length, paymentAmount, isQuickAdding]);

  const handleCheckoutClick = () => {
    if (totalPaidSoFar + currentPaidAmount < total) {
      toast.error('Jumlah pembayaran kurang dari total');
      return;
    }

    const currentMethod = paymentMethods?.find(m => m.id!.toString() === paymentMethodId);
    if (!currentMethod && currentPaidAmount > 0) {
      toast.error('Pilih metode pembayaran');
      return;
    }

    const finalPayments = [...payments];
    if (currentPaidAmount > 0 && currentMethod) {
      finalPayments.push({
        methodId: currentMethod.id,
        methodName: currentMethod.name,
        amount: currentPaidAmount,
        date: new Date()
      });
    }

    const primaryMethodId = finalPayments.length > 0 ? finalPayments[finalPayments.length - 1].methodId : 0;
    const finalPaymentAmount = finalPayments.reduce((sum, p) => sum + p.amount, 0);
    const finalChange = Math.max(0, finalPaymentAmount - total);

    onCheckout({
      finalPayments,
      primaryMethodId,
      customerName: customerName.trim(),
      tableNumber: tableNumber.trim(),
      remarks: remarks.trim(),
      taxAndService,
      total,
      change: finalChange,
      paymentMethodCategory: currentMethod?.category
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[500px] w-[95vw] max-h-[90vh] rounded-xl flex flex-col p-0 overflow-hidden border border-border/60 shadow-2xl">
        <DialogHeader className="px-6 py-5 border-b border-border/50 bg-muted/10 shrink-0">
          <DialogTitle>Pembayaran</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 px-6 py-5 overflow-y-auto flex-1 custom-scrollbar">
          <div className="text-center py-3 bg-primary/5 rounded-xl">
            <p className="text-sm text-muted-foreground">Total Bayar</p>
            <p className="text-3xl font-bold text-primary">{rp(total)}</p>
          </div>

          <div className="space-y-1.5">
            <p className="text-sm font-medium">Metode Pembayaran</p>
            <div className="grid grid-cols-2 gap-2">
              {paymentMethods?.map(pm => {
                const isSelected = paymentMethodId === pm.id!.toString();
                const icons: Record<string, React.ReactNode> = {
                  tunai: <Banknote className="w-5 h-5" />,
                  transfer: <Building2 className="w-5 h-5" />,
                  'e-wallet': <Wallet className="w-5 h-5" />,
                  qris: <QrCode className="w-5 h-5" />,
                  lainnya: <LayoutGrid className="w-5 h-5" />,
                };
                const colors: Record<string, string> = {
                  tunai: 'text-green-600 bg-green-50 dark:bg-green-950/30',
                  transfer: 'text-blue-600 bg-blue-50 dark:bg-blue-950/30',
                  'e-wallet': 'text-violet-600 bg-violet-50 dark:bg-violet-950/30',
                  qris: 'text-primary bg-primary/5',
                  lainnya: 'text-slate-600 bg-slate-100 dark:bg-slate-800',
                };
                return (
                  <button
                    key={pm.id}
                    onClick={() => setPaymentMethodId(pm.id!.toString())}
                    className={cn(
                      'flex items-center gap-2.5 p-3 rounded-xl border-2 transition-all active:scale-95',
                      isSelected
                        ? 'border-primary bg-primary/5'
                        : 'border-muted bg-muted/30 hover:border-primary/40'
                    )}
                  >
                    <span className={cn('p-1.5 rounded-lg', isSelected ? colors[pm.category] || 'text-primary bg-primary/10' : 'text-muted-foreground bg-muted')}>
                      {icons[pm.category] ?? <CreditCard className="w-5 h-5" />}
                    </span>
                    <span className={cn('text-xs font-bold', isSelected ? 'text-primary' : 'text-foreground')}>
                      {pm.name}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="flex justify-between items-end">
              <p className="text-sm font-medium">Jumlah Bayar</p>
              {payments.length > 0 && (
                <p className="text-xs font-bold text-destructive">
                  Sisa: Rp {remainingToPay.toLocaleString('id-ID')}
                </p>
              )}
            </div>
            {taxAndService > 0 && (
              <div className="flex justify-between items-center text-xs text-blue-600 bg-blue-50 dark:bg-blue-900/20 px-2 py-1 rounded-md">
                <span>Biaya Layanan Midtrans:</span>
                <span className="font-bold">+Rp {taxAndService.toLocaleString('id-ID')}</span>
              </div>
            )}
            <div className="h-14 flex items-center justify-between rounded-xl border-2 border-primary/20 bg-background text-lg font-bold px-3 shadow-sm focus-within:border-primary focus-within:ring-4 focus-within:ring-primary/10 transition-all">
              <span className="text-sm font-normal text-muted-foreground shrink-0 mr-2">Bayar: Rp</span>
              <input
                type="text"
                inputMode="numeric"
                value={paymentAmount === '0' ? '' : Number(paymentAmount.replace(/\\D/g, '')).toLocaleString('id-ID')}
                onChange={e => {
                  const val = e.target.value.replace(/\\D/g, '');
                  setPaymentAmount(val || '0');
                  setIsQuickAdding(true);
                }}
                className="w-full h-full bg-transparent border-none outline-none text-right font-black text-xl text-primary placeholder:text-muted-foreground/30"
                placeholder={total.toLocaleString('id-ID')}
              />
            </div>
            <div className="flex flex-wrap gap-1.5">
              {[1000, 2000, 5000, 10000, 20000, 50000, 100000].map(nom => (
                <button
                  key={nom}
                  onClick={() => {
                    if (!isQuickAdding) {
                      setPaymentAmount(String(nom));
                      setIsQuickAdding(true);
                    } else {
                      setPaymentAmount(prev => String((Number(prev) || 0) + nom));
                    }
                  }}
                  className="flex-1 min-w-[calc(25%-6px)] h-9 rounded-lg border border-border bg-muted/50 text-xs font-semibold text-foreground hover:bg-primary/10 hover:border-primary hover:text-primary active:scale-95 transition-all"
                >
                  {nom >= 1000 ? `${(nom / 1000)}K` : nom}
                </button>
              ))}
              <button
                onClick={() => { setPaymentAmount(remainingToPay.toString()); setIsQuickAdding(false); }}
                className="flex-1 min-w-[calc(25%-6px)] h-9 rounded-lg border border-primary/30 bg-primary/5 text-xs font-semibold text-primary hover:bg-primary/10 active:scale-95 transition-all"
              >
                Uang Pas
              </button>
            </div>

            <div className="mt-3 space-y-1.5 border-t border-border pt-3">
              <p className="text-xs font-semibold text-muted-foreground mb-1">Opsi Bagi Tagihan (Split Bill)</p>
              <div className="flex gap-2">
                {[2, 3, 4, 5].map(split => (
                  <button
                    key={`split-${split}`}
                    onClick={() => { setPaymentAmount(Math.ceil(remainingToPay / split).toString()); setIsQuickAdding(false); }}
                    className="flex-1 h-9 rounded-lg border border-amber-500/30 bg-amber-500/5 text-xs font-semibold text-amber-700 hover:bg-amber-500/10 active:scale-95 transition-all"
                  >
                    Bagi {split}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex gap-2 mt-3 pt-3 border-t border-border">
              <button
                onClick={() => { setPaymentAmount('0'); setIsQuickAdding(false); }}
                className="flex-1 text-xs text-muted-foreground hover:text-destructive border border-border rounded-lg py-2 transition-colors"
              >
                Reset Amount
              </button>
              <button
                onClick={() => {
                  const method = paymentMethods?.find(m => m.id!.toString() === paymentMethodId);
                  if (!method) { toast.error('Pilih metode pembayaran'); return; }
                  if (currentPaidAmount <= 0) { toast.error('Masukkan jumlah'); return; }
                  if (currentPaidAmount > remainingToPay) { toast.error('Jumlah lebih dari sisa tagihan'); return; }
                  setPayments(prev => [...prev, { methodId: method.id, methodName: method.name, amount: currentPaidAmount, date: new Date() }]);
                  setPaymentAmount('0');
                  setIsQuickAdding(false);
                  setPaymentMethodId('');
                }}
                disabled={!paymentMethodId || currentPaidAmount <= 0}
                className="flex-1 text-xs text-blue-600 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg py-2 font-semibold transition-colors disabled:opacity-50"
              >
                Tambah Cicilan
              </button>
            </div>
          </div>

          {payments.length > 0 && (
            <div className="space-y-2 pt-2 border-t border-border">
              <p className="text-sm font-semibold">Riwayat Pembayaran (Split Bill)</p>
              {payments.map((p, idx) => (
                <div key={idx} className="flex justify-between items-center text-sm p-2 bg-muted/30 rounded-lg border border-border">
                  <div>
                    <p className="font-medium">{p.methodName}</p>
                    <p className="text-[10px] text-muted-foreground">{p.date.toLocaleTimeString()}</p>
                  </div>
                  <p className="font-bold">Rp {p.amount.toLocaleString('id-ID')}</p>
                </div>
              ))}
            </div>
          )}

          <div className="space-y-3 pt-2">
            <div className="flex bg-muted/50 p-1 rounded-xl">
              <button 
                className={cn("flex-1 text-xs py-2 rounded-lg font-bold transition-all", tableNumber === 'Bawa Pulang' ? "bg-background shadow-sm text-primary" : "text-muted-foreground hover:text-foreground")}
                onClick={() => setTableNumber('Bawa Pulang')}
              >
                Bawa Pulang (Take Away)
              </button>
              <button 
                className={cn("flex-1 text-xs py-2 rounded-lg font-bold transition-all", tableNumber !== 'Bawa Pulang' ? "bg-background shadow-sm text-primary" : "text-muted-foreground hover:text-foreground")}
                onClick={() => setTableNumber(tableNumber === 'Bawa Pulang' ? '' : tableNumber)}
              >
                Makan di Tempat
              </button>
            </div>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <User className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                <Input
                  placeholder="Nama pelanggan"
                  value={customerName}
                  onChange={e => setCustomerName(e.target.value)}
                  className="pl-8 h-10 text-sm"
                />
              </div>
              {tableNumber !== 'Bawa Pulang' && (
                <div className="relative flex-[0.7]">
                  <Hash className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                  <Input
                    placeholder="Nomor Meja"
                    value={tableNumber}
                    onChange={e => setTableNumber(e.target.value)}
                    className="pl-8 h-10 text-sm"
                  />
                </div>
              )}
            </div>
            <Input
              placeholder="Catatan tambahan (opsional)"
              value={remarks}
              onChange={e => setRemarks(e.target.value)}
              className="h-10"
            />
          </div>

          {totalPaidSoFar + currentPaidAmount >= total && (
            <div className="flex justify-between items-center bg-success/10 p-3 rounded-xl">
              <span className="text-sm font-medium">Kembalian</span>
              <span className="text-lg font-bold text-success">Rp {change.toLocaleString('id-ID')}</span>
            </div>
          )}

          <Button className="w-full h-12 text-base font-semibold" onClick={handleCheckoutClick} disabled={(!paymentMethodId && payments.length === 0) || totalPaidSoFar + currentPaidAmount < total || isCheckingOut}>
            {isCheckingOut ? <span className="animate-spin mr-2 border-2 border-current border-t-transparent rounded-full w-5 h-5" /> : <Check className="w-5 h-5 mr-2" />}
            {isCheckingOut ? 'Memproses...' : 'Selesaikan Transaksi'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
