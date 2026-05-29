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
      <DialogContent className="max-w-[95vw] sm:max-w-sm rounded-2xl p-0 overflow-hidden">
        {/* ── Header ── */}
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

        {/* ── Body ── */}
        <div className="p-5 flex flex-col items-center gap-4">
          {/* Loading: membuat token */}
          {status === 'loading' && (
            <div className="flex flex-col items-center py-8 gap-3">
              <Loader2 className="w-10 h-10 text-primary animate-spin" />
              <p className="text-sm text-muted-foreground font-medium">Membuka halaman QRIS…</p>
            </div>
          )}

          {/* Sukses (Midtrans atau Manual) */}
          {status === 'success' && (
            <div className="flex flex-col items-center py-4 gap-3 w-full">
              {isManual && qrisData ? (
                <div className="flex flex-col items-center gap-4 w-full animate-in fade-in zoom-in duration-300">
                  <div className="w-full flex justify-center mt-1">
                    <QrisCard qrisString={qrisData} className="w-[240px] h-[348px] rounded-[20px] shadow-sm pointer-events-none" />
                  </div>
                  <p className="text-xs text-slate-500 text-center px-4 leading-relaxed">
                    Minta pelanggan scan QRIS ini dan pastikan nominal tagihan sesuai.
                  </p>
                  <div className="flex flex-col gap-2 w-full mt-2">
                    <div className="flex gap-2 w-full">
                      <Button variant="outline" className="flex-1 rounded-xl h-11 text-xs" onClick={handleClose}>
                        Batalkan
                      </Button>
                      <Button className="flex-1 font-bold rounded-xl h-11 text-xs bg-emerald-600 hover:bg-emerald-700 text-white flex items-center justify-center gap-1.5" onClick={handleConfirmWA}>
                        <svg className="w-4 h-4 fill-current shrink-0" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                          <path d="M12.012 2c-5.506 0-9.989 4.478-9.99 9.984a9.96 9.96 0 0 0 1.335 4.963L2 22l5.233-1.371a9.96 9.96 0 0 0 4.779 1.21h.005c5.505 0 9.989-4.478 9.99-9.984.001-2.67-1.037-5.18-2.92-7.062a9.923 9.923 0 0 0-7.075-2.923v.012zm5.719 14.158c-.313.882-1.572 1.623-2.155 1.706-.52.073-1.205.132-3.486-.816-2.915-1.212-4.792-4.18-4.937-4.375-.145-.195-1.182-1.576-1.182-3.003 0-1.427.747-2.128 1.012-2.408.265-.28.58-.35.772-.35.192 0 .385.002.553.01.176.009.414-.067.65.503.242.585.83 2.02.902 2.169.073.149.121.321.024.514-.097.194-.145.313-.29.479-.145.166-.303.372-.433.498-.145.14-.297.293-.127.585.17.292.756 1.246 1.626 2.021.87.775 1.602 1.016 1.83 1.127.228.11.362.093.497-.062.135-.156.578-.673.733-.902.156-.23.313-.193.53-.11.216.082 1.372.648 1.613.768.24.12.4.179.46.28.06.1.06.58-.253 1.462z"/>
                        </svg>
                        <span>Konfirmasi WA</span>
                      </Button>
                    </div>
                    <Button className="w-full font-bold h-11 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white text-xs" onClick={() => onSuccessRef.current()}>
                      Konfirmasi Pembayaran
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center py-2 gap-3">
                  <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                    <CheckCircle2 className="w-10 h-10 text-green-500" />
                  </div>
                  <p className="text-base font-bold text-green-600 dark:text-green-400">Pembayaran Berhasil!</p>
                  <p className="text-xs text-muted-foreground">Transaksi sedang disimpan…</p>
                </div>
              )}
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
