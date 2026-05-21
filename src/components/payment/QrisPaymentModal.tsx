/**
 * QrisPaymentModal — Buka Snap Midtrans dengan fokus QRIS
 *
 * Solusi untuk "no payment channel":
 *   - Buka Snap FULL (tanpa enabled_payments filter)
 *   - Ketika Snap terbuka, tutup Dialog kita agar tidak memblokir klik ke Snap
 *   - Snap menampilkan semua metode termasuk QRIS yang sudah terbukti aktif
 *
 * Cara kerja anti-blokir:
 *   - Saat snapActive=true, Dialog kita ditutup (open={false})
 *   - Snap popup bebas muncul dan bisa diklik oleh user
 *   - Setelah Snap selesai, baru kita tampilkan hasil sukses/error
 */
import { useEffect, useState, useCallback, useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Loader2, CheckCircle2, XCircle, RefreshCw } from 'lucide-react';
import { MidtransService } from '@/services/midtransService';

interface QrisPaymentModalProps {
  isOpen: boolean;
  amount: number;
  customerName?: string;
  orderId?: string;
  onSuccess: () => void;
  onClose: () => void;
}

type Status = 'loading' | 'snap_open' | 'success' | 'error';

export function QrisPaymentModal({
  isOpen,
  amount,
  customerName,
  orderId,
  onSuccess,
  onClose,
}: QrisPaymentModalProps) {
  const [status, setStatus] = useState<Status>('loading');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  // snapActive: saat true, Dialog kita ditutup agar tidak memblokir Snap
  const [snapActive, setSnapActive] = useState(false);
  // Refs untuk callbacks agar tidak stale saat dipakai Snap
  const onSuccessRef = useRef(onSuccess);
  const onCloseRef = useRef(onClose);
  useEffect(() => { onSuccessRef.current = onSuccess; }, [onSuccess]);
  useEffect(() => { onCloseRef.current = onClose; }, [onClose]);

  const openSnap = useCallback(async () => {
    setStatus('loading');
    setErrorMsg(null);
    setSnapActive(false);

    try {
      await MidtransService.loadSnapScript();

      const token = await MidtransService.createTransactionToken({
        transaction_details: {
          order_id: orderId || `MA-QRIS-${Date.now()}`,
          gross_amount: Math.round(amount),
        },
        item_details: [
          { name: 'Total Belanja MesenAe', price: Math.round(amount), quantity: 1 },
        ],
        customer_details: {
          first_name: customerName || 'Pelanggan MesenAe',
        },
        enabled_payments: ['other_qris'],
      });

      // Tutup Dialog kita terlebih dahulu agar tidak memblokir klik ke Snap
      setSnapActive(true);
      setStatus('snap_open');

      // @ts-ignore
      window.snap.pay(token, {
        onSuccess: () => {
          setSnapActive(false);
          setStatus('success');
          setTimeout(() => onSuccessRef.current(), 1200);
        },
        onPending: () => {
          setSnapActive(false);
          // Pending = mungkin sudah bayar tapi belum konfirmasi, tutup saja
          onCloseRef.current();
        },
        onError: (result: any) => {
          console.error('[QRIS Snap Error]', result);
          setSnapActive(false);
          setStatus('error');
          setErrorMsg('Pembayaran gagal. Silakan coba lagi.');
        },
        onClose: () => {
          setSnapActive(false);
          // User menutup Snap popup → kembali ke status awal
          onCloseRef.current();
        },
      });
    } catch (err: any) {
      console.error('[QRIS] Error:', err);
      setSnapActive(false);
      setStatus('error');
      setErrorMsg(err.message || 'Gagal memproses pembayaran. Coba lagi.');
    }
  }, [amount, customerName]);

  useEffect(() => {
    if (isOpen) {
      openSnap();
    }
  }, [isOpen]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleClose = () => {
    if (status === 'loading' || snapActive) return;
    setStatus('loading');
    onClose();
  };

  // Saat Snap aktif: Dialog kita DITUTUP agar tidak memblokir Snap
  // Saat status lain: Dialog kita tampil normal
  const dialogOpen = isOpen && !snapActive;

  return (
    <Dialog open={dialogOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="max-w-[95vw] sm:max-w-sm rounded-2xl p-0 overflow-hidden">
        {/* ── Header ── */}
        <div className="bg-gradient-to-br from-primary to-primary/80 p-5 text-white">
          <DialogHeader>
            <DialogTitle className="text-white text-lg font-bold flex items-center gap-2">
              <img src="/ico/qris.png" alt="QRIS" className="w-auto h-5 object-contain rounded bg-white px-1" />
              Pembayaran QRIS
            </DialogTitle>
            <DialogDescription className="text-white/80 text-sm mt-1">
              Scan dengan GoPay · OVO · DANA · ShopeePay · m-Banking apapun
            </DialogDescription>
          </DialogHeader>
          <div className="mt-3 bg-white/20 rounded-xl p-3 text-center">
            <p className="text-xs text-white/70 font-medium">Total Tagihan</p>
            <p className="text-3xl font-black text-white">Rp {amount.toLocaleString('id-ID')}</p>
            <p className="text-xs text-white/70 mt-1">{customerName || 'Pelanggan MesenAe'}</p>
          </div>
        </div>

        {/* ── Body ── */}
        <div className="p-5 flex flex-col items-center gap-4">
          {/* Loading: membuat token */}
          {status === 'loading' && (
            <div className="flex flex-col items-center py-8 gap-3">
              <Loader2 className="w-10 h-10 text-primary animate-spin" />
              <p className="text-sm text-muted-foreground font-medium">Membuka halaman QRIS…</p>
            </div>
          )}

          {/* Sukses */}
          {status === 'success' && (
            <div className="flex flex-col items-center py-6 gap-3">
              <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                <CheckCircle2 className="w-10 h-10 text-green-500" />
              </div>
              <p className="text-base font-bold text-green-600 dark:text-green-400">Pembayaran Berhasil!</p>
              <p className="text-xs text-muted-foreground">Transaksi sedang disimpan…</p>
            </div>
          )}

          {/* Error */}
          {status === 'error' && (
            <div className="flex flex-col items-center py-4 gap-3 w-full">
              <div className="w-14 h-14 rounded-full bg-destructive/10 flex items-center justify-center">
                <XCircle className="w-9 h-9 text-destructive" />
              </div>
              <p className="text-sm text-destructive font-medium text-center leading-relaxed">{errorMsg}</p>
              <div className="flex gap-2 w-full">
                <Button size="sm" variant="outline" onClick={openSnap} className="flex-1 gap-1">
                  <RefreshCw className="w-4 h-4" /> Coba Lagi
                </Button>
                <Button size="sm" variant="ghost" onClick={handleClose} className="flex-1">
                  Tutup
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
