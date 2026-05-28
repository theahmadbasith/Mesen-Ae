import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Banknote, Building2, Wallet, QrCode, LayoutGrid, CreditCard, User, Hash, Check, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

export interface PaymentMethod {
  id: number;
  name: string;
  category: string;
  provider?: string;
  sortOrder?: number;
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

const MIDTRANS_CATEGORIES = ['qris', 'transfer', 'e-wallet', 'lainnya'];

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
  const [paymentAmount, setPaymentAmount] = useState<number>(0);
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [customerName, setCustomerName] = useState('');
  const [tableNumber, setTableNumber] = useState('');
  const [remarks, setRemarks] = useState('');

  // ── Computed values ──────────────────────────────────────────
  const currentMethod = useMemo(
    () => paymentMethods?.find(m => m.id!.toString() === paymentMethodId),
    [paymentMethods, paymentMethodId]
  );

  const isNonCash = useMemo(
    () => !!(currentMethod && MIDTRANS_CATEGORIES.includes(currentMethod.category) && currentMethod.provider !== 'manual'),
    [currentMethod]
  );

  const taxAndService = useMemo(() => {
    if (!currentMethod || currentMethod.provider === 'manual') return 0;
    if (currentMethod.category === 'qris')     return Math.round(baseTotal * 0.007);
    if (currentMethod.category === 'e-wallet') return Math.round(baseTotal * 0.02);
    if (currentMethod.category === 'transfer') return 4000;
    if (currentMethod.category === 'lainnya')  return Math.round(baseTotal * 0.03);
    return 0;
  }, [currentMethod, baseTotal]);

  const total = useMemo(() => Math.max(0, baseTotal) + taxAndService, [baseTotal, taxAndService]);
  const totalPaidSoFar = useMemo(() => payments.reduce((s, p) => s + p.amount, 0), [payments]);
  const remainingToPay = Math.max(0, total - totalPaidSoFar);
  const change = Math.max(0, totalPaidSoFar + paymentAmount - total);
  const canCheckout = isNonCash
    ? !!paymentMethodId  // Non-cash: cukup pilih metode saja
    : (!!paymentMethodId || payments.length > 0) && (totalPaidSoFar + paymentAmount >= total); // Tunai: harus cukup

  // ── Reset saat modal buka ────────────────────────────────────
  useEffect(() => {
    if (open) {
      const firstMethodId = paymentMethods?.[0]?.id?.toString() || '';
      setPaymentMethodId(firstMethodId);
      setPayments(initialPayments);
      setCustomerName(initialCustomerName);
      setTableNumber(initialTableNumber);
      setRemarks(initialRemarks);
      setPaymentAmount(0); // akan diupdate oleh effect total di bawah
    }
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Auto-sync amount saat total berubah (misal metode ganti → tax berubah) ──
  // Hanya update jika belum ada cicilan dan user belum manual input
  const [userEdited, setUserEdited] = useState(false);
  useEffect(() => {
    if (open) setUserEdited(false);
  }, [open]);

  useEffect(() => {
    if (open && total > 0 && payments.length === 0 && !userEdited) {
      setPaymentAmount(remainingToPay);
    }
  }, [total, open]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Handlers ─────────────────────────────────────────────────
  const handleMethodSelect = useCallback((id: string) => {
    setPaymentMethodId(id);
    // reset user edit flag ketika ganti metode agar amount sync ke total baru
    setUserEdited(false);
  }, []);

  const handleNominalClick = useCallback((nom: number) => {
    setUserEdited(true);
    setPaymentAmount(prev => payments.length === 0 && prev === remainingToPay ? nom : prev + nom);
  }, [payments.length, remainingToPay]);

  const handleUangPas = useCallback(() => {
    setUserEdited(true);
    setPaymentAmount(remainingToPay);
  }, [remainingToPay]);

  const handleSplitBill = useCallback((n: number) => {
    setUserEdited(true);
    setPaymentAmount(Math.ceil(remainingToPay / n));
  }, [remainingToPay]);

  const handleResetAmount = useCallback(() => {
    setUserEdited(false);
    setPaymentAmount(remainingToPay);
  }, [remainingToPay]);

  const handleAddCicilan = useCallback(() => {
    if (!currentMethod) { toast.error('Pilih metode pembayaran'); return; }
    if (paymentAmount <= 0) { toast.error('Masukkan jumlah'); return; }
    if (paymentAmount > remainingToPay) { toast.error('Jumlah melebihi sisa tagihan'); return; }
    if (payments.length >= 3) { toast.error('Maksimal 4 split bill (3 cicilan + 1 pelunasan)'); return; }
    if (paymentAmount > remainingToPay) { toast.error('Jumlah melebihi sisa tagihan'); return; }
    setPayments(prev => [...prev, { methodId: currentMethod.id, methodName: currentMethod.name, amount: paymentAmount, date: new Date() }]);
    setPaymentMethodId('');
    setPaymentAmount(0);
    setUserEdited(false);
  }, [currentMethod, paymentAmount, remainingToPay]);

  const handleRemoveCicilan = useCallback((idx: number) => {
    setPayments(prev => prev.filter((_, i) => i !== idx));
  }, []);

  const handleCheckoutClick = useCallback(() => {
    if (!canCheckout) {
      if (!paymentMethodId && payments.length === 0) {
        toast.error('Pilih metode pembayaran');
      } else {
        toast.error('Jumlah pembayaran kurang dari total');
      }
      return;
    }

    const finalPayments = [...payments];
    // Untuk non-cash: amount = total (Midtrans yang handle pembayaran sebenarnya)
    // Untuk tunai: pakai paymentAmount yang diinput user
    const amountToAdd = isNonCash ? total : paymentAmount;

    if (amountToAdd > 0 && currentMethod) {
      finalPayments.push({
        methodId: currentMethod.id,
        methodName: currentMethod.name,
        amount: amountToAdd,
        date: new Date()
      });
    }

    const primaryMethodId = finalPayments.length > 0 ? finalPayments[finalPayments.length - 1].methodId : 0;
    const totalPaid = finalPayments.reduce((s, p) => s + p.amount, 0);
    const finalChange = isNonCash ? 0 : Math.max(0, totalPaid - total);

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
  }, [canCheckout, paymentMethodId, payments, isNonCash, total, paymentAmount, currentMethod, customerName, tableNumber, remarks, taxAndService, onCheckout]);

  // ── Icons & colors ───────────────────────────────────────────
  const ICONS: Record<string, React.ReactNode> = {
    tunai: <Banknote className="w-5 h-5" />,
    transfer: <Building2 className="w-5 h-5" />,
    'e-wallet': <Wallet className="w-5 h-5" />,
    qris: <QrCode className="w-5 h-5" />,
    lainnya: <LayoutGrid className="w-5 h-5" />,
  };
  const COLORS: Record<string, string> = {
    tunai: 'text-green-600 bg-green-50 dark:bg-green-950/30',
    transfer: 'text-blue-600 bg-blue-50 dark:bg-blue-950/30',
    'e-wallet': 'text-violet-600 bg-violet-50 dark:bg-violet-950/30',
    qris: 'text-primary bg-primary/5',
    lainnya: 'text-slate-600 bg-slate-100 dark:bg-slate-800',
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[500px] md:max-w-[680px] w-[95vw] max-h-[90vh] rounded-xl flex flex-col p-0 overflow-hidden border border-border/60 shadow-2xl">
        <DialogHeader className="px-6 py-4 border-b border-border/50 bg-muted/10 shrink-0">
          <DialogTitle className="text-base font-bold">Pembayaran</DialogTitle>
        </DialogHeader>

        <div className="overflow-y-auto flex-1 custom-scrollbar">
          <div className="space-y-4 px-6 py-5">

            {/* Total */}
            <div className="text-center py-3 bg-primary/5 rounded-xl">
              <p className="text-xs text-muted-foreground mb-0.5">Total Bayar</p>
              <p className="text-3xl font-black text-primary">{rp(total)}</p>
              {taxAndService > 0 && (
                <p className="text-[11px] text-blue-600 mt-1 font-medium">
                  Termasuk biaya layanan Rp {taxAndService.toLocaleString('id-ID')}
                </p>
              )}
            </div>

            {/* Metode Pembayaran */}
            <div className="space-y-2">
              <p className="text-sm font-semibold">Metode Pembayaran</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {[...(paymentMethods || [])].sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0)).map(pm => {
                  const isSelected = paymentMethodId === pm.id!.toString();
                  return (
                    <button
                      key={pm.id}
                      type="button"
                      onClick={() => handleMethodSelect(pm.id!.toString())}
                      className={cn(
                        'flex items-center gap-2.5 p-3 rounded-xl border-2 transition-all active:scale-[0.97] text-left w-full',
                        isSelected
                          ? 'border-primary bg-primary/5 shadow-sm'
                          : 'border-border bg-muted/30 hover:border-primary/40 hover:bg-muted/50'
                      )}
                    >
                      <span className={cn('p-1.5 rounded-lg shrink-0', isSelected ? COLORS[pm.category] || 'text-primary bg-primary/10' : 'text-muted-foreground bg-muted')}>
                        {ICONS[pm.category] ?? <CreditCard className="w-5 h-5" />}
                      </span>
                      <div className="min-w-0">
                        <span className={cn('text-xs font-bold block truncate', isSelected ? 'text-primary' : 'text-foreground')}>
                          {pm.name}
                        </span>
                        {MIDTRANS_CATEGORIES.includes(pm.category) && pm.provider !== 'manual' && (
                          <span className="text-[10px] text-muted-foreground">via Midtrans</span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Info Non-Cash */}
            {isNonCash && (
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-3 flex items-start gap-2.5">
                <span className="text-lg shrink-0">💳</span>
                <div>
                  <p className="text-xs font-bold text-blue-700 dark:text-blue-300">Pembayaran Digital</p>
                  <p className="text-xs text-blue-600 dark:text-blue-400 mt-0.5">
                    Klik <strong>Selesaikan Transaksi</strong> untuk membuka halaman pembayaran {currentMethod?.name}. Total <strong>{rp(total)}</strong> akan diproses via Midtrans.
                  </p>
                </div>
              </div>
            )}

            {/* Jumlah Bayar — hanya tampil untuk tunai */}
            {!isNonCash && (
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <p className="text-sm font-semibold">Jumlah Bayar (Tunai)</p>
                  {payments.length > 0 && (
                    <p className="text-xs font-bold text-destructive">Sisa: {rp(remainingToPay)}</p>
                  )}
                </div>

                {/* Display amount */}
                <div className="h-14 flex items-center justify-between rounded-xl border-2 border-primary/20 bg-background px-4 shadow-sm">
                  <span className="text-sm text-muted-foreground">Bayar</span>
                  <span className="text-2xl font-black text-primary">
                    {paymentAmount > 0 ? rp(paymentAmount) : <span className="text-muted-foreground/40 text-base font-medium">Belum diisi</span>}
                  </span>
                </div>

                {/* Nominal Buttons */}
                <div className="grid grid-cols-4 gap-2">
                  {[1000, 2000, 5000, 10000, 20000, 50000, 100000].map(nom => (
                    <button
                      key={nom}
                      type="button"
                      onClick={() => handleNominalClick(nom)}
                      className="h-10 rounded-lg border border-border bg-muted/50 text-xs font-bold text-foreground hover:bg-primary/10 hover:border-primary hover:text-primary active:scale-95 transition-all"
                    >
                      +{nom >= 1000 ? `${nom / 1000}K` : nom}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={handleUangPas}
                    className="h-10 rounded-lg border-2 border-primary/40 bg-primary/5 text-xs font-bold text-primary hover:bg-primary/10 active:scale-95 transition-all"
                  >
                    Uang Pas
                  </button>
                </div>

                {/* Split Bill */}
                <div className="border-t border-border pt-3">
                  <p className="text-[11px] font-bold text-muted-foreground mb-2 uppercase tracking-wide">Split Bill</p>
                  <div className="grid grid-cols-4 gap-2">
                    {[2, 3, 4].map(n => (
                      <button
                        key={n}
                        type="button"
                        onClick={() => handleSplitBill(n)}
                        className="h-9 rounded-lg border border-amber-400/40 bg-amber-400/5 text-xs font-bold text-amber-700 dark:text-amber-400 hover:bg-amber-400/10 active:scale-95 transition-all"
                      >
                        ÷ {n} orang
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={handleResetAmount}
                      className="h-9 rounded-lg border border-border bg-muted/50 text-xs font-semibold text-muted-foreground hover:text-destructive hover:border-destructive/40 active:scale-95 transition-all"
                    >
                      Reset
                    </button>
                  </div>
                </div>

                {/* Tambah Cicilan */}
                <button
                  type="button"
                  onClick={handleAddCicilan}
                  disabled={!paymentMethodId || paymentAmount <= 0 || paymentAmount > remainingToPay || payments.length >= 3}
                  className="w-full h-9 rounded-lg border border-blue-400/40 bg-blue-50 dark:bg-blue-900/20 text-xs font-bold text-blue-600 hover:bg-blue-100 dark:hover:bg-blue-900/30 disabled:opacity-40 active:scale-95 transition-all"
                >
                  {payments.length >= 3 ? "Maksimal Split Bill Tercapai" : "+ Tambah Cicilan (Split Payment)"}
                </button>
              </div>
            )}

            {/* Daftar Cicilan */}
            {payments.length > 0 && (
              <div className="space-y-2 border-t border-border pt-3">
                <p className="text-xs font-bold text-muted-foreground uppercase">Riwayat Cicilan</p>
                {payments.map((p, idx) => (
                  <div key={idx} className="flex justify-between items-center text-sm px-3 py-2 bg-muted/30 rounded-xl border border-border">
                    <div>
                      <p className="font-semibold text-xs">{p.methodName}</p>
                      <p className="text-[10px] text-muted-foreground">{p.date.toLocaleTimeString()}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <p className="font-bold text-sm">{rp(p.amount)}</p>
                      <button type="button" onClick={() => handleRemoveCicilan(idx)} className="text-muted-foreground hover:text-destructive transition-colors">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
                {!isNonCash && (
                  <div className="flex justify-between text-xs font-bold px-1">
                    <span>Total terbayar:</span>
                    <span className={totalPaidSoFar >= total ? 'text-success' : 'text-destructive'}>{rp(totalPaidSoFar)}</span>
                  </div>
                )}
              </div>
            )}

            {/* Kembalian */}
            {!isNonCash && totalPaidSoFar + paymentAmount >= total && total > 0 && (
              <div className="flex justify-between items-center bg-success/10 border border-success/20 p-3 rounded-xl">
                <span className="text-sm font-semibold">💵 Kembalian</span>
                <span className="text-xl font-black text-success">{rp(change)}</span>
              </div>
            )}

            {/* Info Pelanggan */}
            <div className="space-y-3 border-t border-border pt-4">
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide">Info Pesanan</p>
              <div className="flex bg-muted/50 p-1 rounded-xl">
                <button
                  type="button"
                  className={cn("flex-1 text-xs py-2 rounded-lg font-bold transition-all", tableNumber === 'Bawa Pulang' ? "bg-background shadow-sm text-primary" : "text-muted-foreground hover:text-foreground")}
                  onClick={() => setTableNumber('Bawa Pulang')}
                >
                  🛍️ Bawa Pulang
                </button>
                <button
                  type="button"
                  className={cn("flex-1 text-xs py-2 rounded-lg font-bold transition-all", tableNumber !== 'Bawa Pulang' ? "bg-background shadow-sm text-primary" : "text-muted-foreground hover:text-foreground")}
                  onClick={() => setTableNumber(prev => prev === 'Bawa Pulang' ? '' : prev)}
                >
                  🍽️ Makan di Tempat
                </button>
              </div>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <User className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                  <Input placeholder="Nama pelanggan" value={customerName} onChange={e => setCustomerName(e.target.value)} className="pl-8 h-10 text-sm" />
                </div>
                {tableNumber !== 'Bawa Pulang' && (
                  <div className="relative flex-[0.7]">
                    <Hash className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                    <Input placeholder="No. Meja" value={tableNumber} onChange={e => setTableNumber(e.target.value)} className="pl-8 h-10 text-sm" />
                  </div>
                )}
              </div>
              <Input placeholder="Catatan tambahan (opsional)" value={remarks} onChange={e => setRemarks(e.target.value)} className="h-10 text-sm" />
            </div>

          </div>
        </div>

        {/* Footer Checkout Button */}
        <div className="px-6 py-4 border-t border-border/50 bg-background shrink-0">
          <Button
            className="w-full h-12 text-base font-bold"
            onClick={handleCheckoutClick}
            disabled={!canCheckout || isCheckingOut}
          >
            {isCheckingOut
              ? <><span className="animate-spin mr-2 border-2 border-current border-t-transparent rounded-full w-5 h-5 inline-block" /> Memproses...</>
              : <><Check className="w-5 h-5 mr-2" /> {isNonCash ? `Bayar via ${currentMethod?.name || 'Digital'}` : 'Selesaikan Transaksi'}</>
            }
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
