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
import { Loader2, CheckCircle2, XCircle, RefreshCw, QrCode } from 'lucide-react';
import { MidtransService } from '@/services/midtransService';
import { PaymentMethod, useDbQuery } from '@/hooks/db-hooks';
import { QRCodeSVG } from 'qrcode.react';
import { QrisCard } from '@/components/payment/QrisCard';
import { convertQRIS } from '@/lib/qris-dinamis';

interface QrisPaymentModalProps {
  isOpen: boolean;
  amount: number;
  customerName?: string;
  orderId?: string;
  paymentMethod?: PaymentMethod | null;
  onSuccess: () => void;
  onClose: () => void;
}

type Status = 'loading' | 'snap_open' | 'success' | 'error';

export function QrisPaymentModal({
  isOpen,
  amount,
  customerName,
  orderId,
  paymentMethod,
  onSuccess,
  onClose,
}: QrisPaymentModalProps) {
  const [status, setStatus] = useState<Status>('loading');
  const storeSettingsList = useDbQuery<any>('storeSettings') || [];
  const storeSettings = storeSettingsList[0];
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  // snapActive: saat true, Dialog kita ditutup agar tidak memblokir Snap
  const [snapActive, setSnapActive] = useState(false);
  // Refs untuk callbacks agar tidak stale saat dipakai Snap
  const onSuccessRef = useRef(onSuccess);
  const onCloseRef = useRef(onClose);
  useEffect(() => { onSuccessRef.current = onSuccess; }, [onSuccess]);
  useEffect(() => { onCloseRef.current = onClose; }, [onClose]);

  const handleConfirmWA = () => {
    let rawPhone = storeSettings?.phone || '';
    rawPhone = rawPhone.replace(/[^0-9]/g, '');
    if (rawPhone.startsWith('0')) {
      rawPhone = '62' + rawPhone.substring(1);
    }
    const text = encodeURIComponent(
      `Halo, saya ingin melakukan konfirmasi pembayaran QRIS Manual:\n\n` +
      `*Detail Pemesan:*\n` +
      `- Nama: ${customerName || 'Pelanggan'}\n` +
      `- No. Struk: ${orderId || '-'}\n` +
      `- Nominal: Rp ${amount.toLocaleString('id-ID')}\n\n` +
      `Mohon diproses. Terima kasih.`
    );
    window.open(`https://wa.me/${rawPhone}?text=${text}`, '_blank');
    onSuccessRef.current();
  };

  const [qrisData, setQrisData] = useState<string | null>(null);

  const openSnap = useCallback(async () => {
    setStatus('loading');
    setErrorMsg(null);
    setSnapActive(false);

    const isManual = paymentMethod?.provider === 'manual' && paymentMethod?.qrisString;
    if (isManual) {
      try {
        const dynamicQRIS = convertQRIS(paymentMethod.qrisString!, { amount });
        setQrisData(dynamicQRIS);
        setStatus('success'); // Show manual QR code
      } catch (err: any) {
        setStatus('error');
        setErrorMsg('Gagal membuat QRIS dinamis: ' + err.message);
      }
      return;
    }

    // Midtrans: Proteksi double tap / double snap di mobile
    if ((window as any).midtransSnapActive) {
      console.warn('Midtrans Snap is already active. Ignoring request.');
      onCloseRef.current();
      return;
    }
    (window as any).midtransSnapActive = true;

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

      // @ts-expect-error - window.snap injected globally
      window.snap.pay(token, {
        onSuccess: () => {
          setSnapActive(false);
          (window as any).midtransSnapActive = false;
          setStatus('success');
          setTimeout(() => onSuccessRef.current(), 1200);
        },
        onPending: () => {
          setSnapActive(false);
          (window as any).midtransSnapActive = false;
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
          (window as any).midtransSnapActive = false;
          // User menutup Snap popup → kembali ke status awal
          onCloseRef.current();
        },
      });
    } catch (err: any) {
      console.error('[QRIS] Error:', err);
      setSnapActive(false);
      (window as any).midtransSnapActive = false;
      setStatus('error');
      setErrorMsg(err.message || 'Gagal memproses pembayaran. Coba lagi.');
    }
  }, [amount, customerName, orderId, paymentMethod]);

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

  const isManual = paymentMethod?.provider === 'manual' && paymentMethod?.qrisString;

  // Saat Snap aktif: Dialog kita DITUTUP agar tidak memblokir Snap
  // Saat status lain: Dialog kita tampil normal
  const dialogOpen = isOpen && !snapActive;

  return (
    <Dialog open={dialogOpen} onOpenChange={(open) => !open && handleClose()}>
      {isManual ? (
        <DialogContent className="max-w-[92vw] sm:max-w-[400px] rounded-[2rem] p-0 overflow-hidden z-[100] border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-950 shadow-2xl">
          {/* Header dengan Gradasi Halus */}
          <div className="bg-gradient-to-br from-indigo-600 via-violet-700 to-purple-800 p-6 text-white relative overflow-hidden text-left">
            <div className="absolute -right-10 -top-10 w-32 h-32 bg-white/10 rounded-full blur-2xl pointer-events-none" />
            <div className="absolute -left-10 -bottom-10 w-32 h-32 bg-purple-500/20 rounded-full blur-xl pointer-events-none" />
            
            <DialogHeader className="relative z-10">
              <DialogTitle className="text-white text-lg font-bold flex items-center gap-2 tracking-tight">
                <img src="/ico/qris.png" alt="QRIS" className="w-auto h-5 object-contain rounded bg-white px-1" />
                QRIS Manual
              </DialogTitle>
              <DialogDescription className="text-white/80 text-xs mt-0.5">
                Scan menggunakan E-Wallet & Mobile Banking apa pun
              </DialogDescription>
            </DialogHeader>

            {/* Card Info Tagihan */}
            <div className="mt-4 bg-white/10 backdrop-blur-md rounded-2xl p-4 text-center border border-white/10 shadow-inner">
              <p className="text-[11px] text-indigo-200 font-semibold uppercase tracking-wider">Total Tagihan</p>
              <p className="text-3xl font-black text-white mt-0.5 tracking-tight">
                Rp {amount.toLocaleString('id-ID')}
              </p>
              <div className="h-[1px] bg-white/10 my-2" />
              <p className="text-xs text-indigo-100/80 font-medium truncate">
                Atas Nama: <span className="text-white font-bold">{customerName || 'Pelanggan'}</span>
              </p>
            </div>
          </div>

          {/* Konten Utama */}
          <div className="p-6 overflow-y-auto max-h-[60vh] custom-scrollbar-hide flex flex-col items-center gap-4">
            <p className="text-sm text-slate-500 font-medium text-center">Silakan scan kode QRIS di bawah ini:</p>
            
            <div className="w-full flex justify-center">
              {qrisData && (
                <QrisCard 
                  qrisString={qrisData} 
                  className="w-[240px] h-[348px] rounded-[20px] shadow-sm pointer-events-none" 
                />
              )}
            </div>

            <div className="flex gap-2 w-full mt-2">
              <Button variant="outline" className="flex-1 rounded-xl h-11 text-xs" onClick={handleClose}>
                Batalkan
              </Button>
              <Button 
                className="flex-1 font-bold rounded-xl h-11 text-xs bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white"
                onClick={() => {
                  const isConfirmed = window.confirm(
                    `Konfirmasi Pembayaran?\n\n` +
                    `Apakah Anda yakin sudah menerima bukti pembayaran dari pelanggan untuk pesanan ${orderId || '-'}?\n\n` +
                    `Tindakan ini akan menandai pesanan sebagai Lunas.`
                  );
                  if (isConfirmed) {
                    onSuccessRef.current();
                  }
                }}
              >
                Konfirmasi Pembayaran
              </Button>
            </div>
          </div>
        </DialogContent>
      ) : (
        <DialogContent className="max-w-[95vw] sm:max-w-sm rounded-2xl p-0 overflow-hidden bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
          {/* ── Header (Midtrans) ── */}
          <div className="bg-gradient-to-br from-primary to-primary/80 p-5 text-white">
            <DialogHeader>
              <DialogTitle className="text-white text-lg font-bold flex items-center gap-2">
                <img src="/ico/qris.png" alt="QRIS" className="w-auto h-5 object-contain rounded bg-white px-1" />
                Pembayaran QRIS
              </DialogTitle>
              <DialogDescription className="text-white/80 text-sm mt-1">
                Scan dengan e-wallet dan mobile banking apapun
              </DialogDescription>
            </DialogHeader>
            <div className="mt-3 bg-white/20 rounded-xl p-3 text-center">
              <p className="text-xs text-white/70 font-medium">Total Tagihan</p>
              <p className="text-3xl font-black text-white">Rp {amount.toLocaleString('id-ID')}</p>
              <p className="text-xs text-white/70 mt-1">{customerName || 'Pelanggan MesenAe'}</p>
            </div>
          </div>

          {/* ── Body (Midtrans) ── */}
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
              <div className="flex flex-col items-center py-2 gap-3">
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
      )}
    </Dialog>
  );
}
