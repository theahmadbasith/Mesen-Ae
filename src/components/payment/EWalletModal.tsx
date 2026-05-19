import { useState, useCallback, useEffect, useRef, JSX } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Loader2, CheckCircle2, XCircle, RefreshCw, ChevronLeft } from 'lucide-react';
import { MidtransService } from '@/services/midtransService';

// ==========================================
// Tipe Data & Interfaces (TypeScript)
// ==========================================

interface EWalletModalProps {
  isOpen: boolean;
  amount: number;
  customerName?: string;
  orderId?: string;
  onSuccess: () => void;
  onClose: () => void;
}

interface WalletOption {
  id: string;
  name: string;
  snapKey: string;
  bg: string;
  borderColor: string;
  svg: React.ReactNode;
  desc: string;
  tag?: string;
}

type Step = 'select' | 'loading' | 'success' | 'error';

// Memperluas interface Window secara lokal untuk mendukung Midtrans Snap
declare global {
  interface Window {
    snap?: {
      pay: (token: string, options: any) => void;
    };
  }
}

// ==========================================
// Konfigurasi E-Wallet dengan Logo Resmi (SVG)
// ==========================================

const WALLETS: WalletOption[] = [
  {
    id: 'gopay',
    name: 'GoPay',
    snapKey: 'gopay',
    bg: 'bg-[#00AED6]/10 dark:bg-[#00AED6]/20',
    borderColor: 'hover:border-[#00AED6] focus:ring-[#00AED6]/20',
    svg: (
      <svg viewBox="0 0 140 35" className="h-5 w-auto">
        <g fill="#00AED6">
          <circle cx="15.5" cy="17.5" r="12.5" />
          <circle cx="15.5" cy="17.5" r="5.5" fill="#fff" />
        </g>
        <text x="36" y="25" fontFamily="'Inter', 'Segoe UI', sans-serif" fontWeight="800" fontSize="24" fill="currentColor" className="text-slate-900 dark:text-white tracking-tight">go<tspan fill="#00AED6">pay</tspan></text>
      </svg>
    ),
    desc: 'Bayar instan via aplikasi Gojek atau GoPay',
    tag: 'Populer',
  },
  {
    id: 'shopeepay',
    name: 'ShopeePay',
    snapKey: 'shopeepay',
    bg: 'bg-[#EE4D2D]/10 dark:bg-[#EE4D2D]/20',
    borderColor: 'hover:border-[#EE4D2D] focus:ring-[#EE4D2D]/20',
    svg: (
      <svg viewBox="0 0 120 28" className="h-5 w-auto">
        <path d="M14.5 2C7.6 2 2 7.6 2 14.5S7.6 27 14.5 27s12.5-5.6 12.5-12.5S21.4 2 14.5 2zm5.2 14.3c0 3.2-2.8 4.2-5.2 4.2-2.5 0-5.1-.9-5.1-3.2 0-2.1 2.2-2.7 4.2-3 2.1-.3 2.6-.7 2.6-1.3 0-.8-1-1.2-2-1.2-1.8 0-2.8.9-2.8 2.3H3.6c0-3.1 2.4-4.6 5.6-4.6 3.1 0 5.2 1.4 5.2 3.8 0 2-1.8 2.6-3.8 2.9-2.2.3-2.6.7-2.6 1.3 0 .8 1.1 1.2 2.2 1.2 1.7 0 2.9-.8 2.9-2.4h2.6z" fill="#EE4D2D"/>
        <text x="34" y="21" fontFamily="'Inter', 'Segoe UI', sans-serif" fontWeight="800" fontSize="19" fill="currentColor" className="text-slate-900 dark:text-white tracking-tight">Shopee<tspan fill="#EE4D2D">Pay</tspan></text>
      </svg>
    ),
    desc: 'Buka aplikasi Shopee untuk konfirmasi PIN',
  },
  {
    id: 'ovo',
    name: 'OVO',
    snapKey: 'ovo',
    bg: 'bg-[#4C3493]/10 dark:bg-[#4C3493]/20',
    borderColor: 'hover:border-[#4C3493] focus:ring-[#4C3493]/20',
    svg: (
      <svg viewBox="0 0 100 30" className="h-5 w-auto">
        <text x="5" y="23" fontFamily="'Inter', 'Segoe UI', sans-serif" fontWeight="900" fontSize="24" fontStyle="italic" fill="#4C3493" className="dark:fill-[#7C64C3] tracking-wider">OVO</text>
        <circle cx="85" cy="15" r="8" fill="none" stroke="#4C3493" strokeWidth="3" className="dark:stroke-[#7C64C3]" />
        <circle cx="85" cy="15" r="3" fill="#4C3493" className="dark:fill-[#7C64C3]" />
      </svg>
    ),
    desc: 'Masukkan nomor HP yang terdaftar di OVO',
  },
  {
    id: 'dana',
    name: 'DANA',
    snapKey: 'dana', // Dilempar ke QRIS otomatis oleh kode handler di bawah
    bg: 'bg-[#118EEA]/10 dark:bg-[#118EEA]/20',
    borderColor: 'hover:border-[#118EEA] focus:ring-[#118EEA]/20',
    svg: (
      <svg viewBox="0 0 100 26" className="h-5 w-auto">
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm3.65 13.78c-.44.72-1.17 1.12-2.07 1.12H8.38c-.28 0-.5-.22-.5-.5V9.6c0-.28.22-.5.5-.5h5.05c.88 0 1.58.38 2.01 1.07.38.61.47 1.39.26 2.19-.21.78-.66 1.41-1.4 1.72v.06c.64.25 1.05.8 1.2 1.48.16.73.02 1.51-.2 2.16z" fill="#118EEA"/>
        <text x="28" y="21" fontFamily="'Inter', 'Segoe UI', sans-serif" fontWeight="900" fontSize="23" fill="#118EEA" className="tracking-tight">DANA</text>
      </svg>
    ),
    desc: 'Scan barcode via QRIS menggunakan aplikasi DANA',
    tag: 'QRIS',
  },
];

// ==========================================
// Komponen Utama
// ==========================================

export function EWalletModal({
  isOpen,
  amount,
  customerName,
  onSuccess,
  onClose,
}: EWalletModalProps): JSX.Element {
  const [step, setStep] = useState<Step>('select');
  const [selectedWallet, setSelectedWallet] = useState<WalletOption | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [snapActive, setSnapActive] = useState<boolean>(false);
  
  const onSuccessRef = useRef(onSuccess);
  const onCloseRef = useRef(onClose);

  useEffect(() => { onSuccessRef.current = onSuccess; }, [onSuccess]);
  useEffect(() => { onCloseRef.current = onClose; }, [onClose]);

  useEffect(() => {
    if (isOpen) {
      setStep('select');
      setSelectedWallet(null);
      setErrorMsg(null);
      MidtransService.loadSnapScript().catch((e) =>
        console.warn('Snap script load error:', e)
      );
    }
  }, [isOpen]);

  const handleWalletSelect = useCallback(
    async (wallet: WalletOption) => {
      setSelectedWallet(wallet);
      setStep('loading');
      setErrorMsg(null);

      const orderId = `MA-EW-${wallet.id.toUpperCase()}-${Date.now()}`;

      try {
        const token = await MidtransService.createTransactionToken({
          transaction_details: {
            order_id: orderId,
            gross_amount: Math.round(amount),
          },
          item_details: [
            {
              name: 'Total Belanja MesenAe',
              price: Math.round(amount),
              quantity: 1,
            },
          ],
          customer_details: {
            first_name: customerName || 'Pelanggan MesenAe',
          },
          // Route DANA via QRIS otomatis
          enabled_payments: wallet.id === 'dana' ? ['qris'] : [wallet.snapKey],
        });

        if (!window.snap) throw new Error('Sistem pembayaran Midtrans belum siap.');

        setSnapActive(true);
        setStep('select'); // Kembalikan UI state dasar di latar belakang

        window.snap.pay(token, {
          onSuccess: () => {
            setSnapActive(false);
            setStep('success');
            setTimeout(() => onSuccessRef.current(), 1200);
          },
          onPending: () => {
            setSnapActive(false);
            setStep('select');
          },
          onError: (result: any) => {
            console.error(`Snap ${wallet.name} Error:`, result);
            setSnapActive(false);
            setStep('error');
            setErrorMsg(`Pembayaran via ${wallet.name} gagal ditolak sistem. Silakan coba lagi.`);
          },
          onClose: () => {
            setSnapActive(false);
            setStep('select');
          },
        });
      } catch (err: any) {
        console.error('E-Wallet Error:', err);
        setStep('error');
        setErrorMsg(err.message || `Gagal memproses transaksi menggunakan ${wallet.name}`);
      }
    },
    [amount, customerName]
  );

  const handleClose = (): void => {
    if (step === 'loading' || snapActive) return;
    setSnapActive(false);
    onClose();
  };

  const dialogOpen = isOpen && !snapActive;

  return (
    <Dialog open={dialogOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="max-w-[92vw] sm:max-w-[400px] rounded-[2rem] p-0 overflow-hidden z-[100] border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-950 shadow-2xl">
        
        {/* Header dengan Gradasi Halus */}
        <div className="bg-gradient-to-br from-indigo-600 via-violet-700 to-purple-800 p-6 text-white relative overflow-hidden">
          <div className="absolute -right-10 -top-10 w-32 h-32 bg-white/10 rounded-full blur-2xl pointer-events-none" />
          <div className="absolute -left-10 -bottom-10 w-32 h-32 bg-purple-500/20 rounded-full blur-xl pointer-events-none" />
          
          <DialogHeader className="relative z-10">
            <DialogTitle className="text-white text-lg font-bold flex items-center gap-2 tracking-tight">
              {step === 'error' && (
                <button
                  onClick={() => setStep('select')}
                  className="mr-1 p-1 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
                  aria-label="Kembali"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
              )}
              ⚡ Pembayaran Digital
            </DialogTitle>
            <DialogDescription className="text-white/80 text-xs mt-0.5">
              Konfirmasi nominal tagihan & pilih metode dompet digital
            </DialogDescription>
          </DialogHeader>

          {/* Card Info Tagihan */}
          <div className="mt-4 bg-white/10 backdrop-blur-md rounded-2xl p-4 text-center border border-white/10 shadow-inner">
            <p className="text-[11px] text-indigo-200 font-semibold uppercase tracking-wider">Total Tagihan Anda</p>
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
        <div className="p-6">
          
          {/* STEP 1: PILIH WALLET */}
          {step === 'select' && (
            <>
              <p className="text-[11px] text-slate-400 dark:text-slate-500 font-bold mb-3 uppercase tracking-wider">
                Metode Tersedia
              </p>
              <div className="flex flex-col gap-3">
                {WALLETS.map((wallet) => (
                  <button
                    key={wallet.id}
                    onClick={() => handleWalletSelect(wallet)}
                    className={`group flex items-center gap-4 p-3.5 rounded-2xl border-2 border-slate-100 dark:border-slate-900 bg-slate-50/50 dark:bg-slate-900/30 hover:bg-white dark:hover:bg-slate-900/80 transition-all duration-200 outline-none focus:ring-4 text-left shadow-sm hover:shadow-md ${wallet.borderColor}`}
                  >
                    {/* Wadah Logo */}
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 shadow-inner p-1 ${wallet.bg}`}>
                      {wallet.svg}
                    </div>

                    {/* Deskripsi & Teks */}
                    <div className="flex-1 min-w-0 pr-2">
                      <div className="flex items-center gap-2">
                        <p className="font-bold text-sm text-slate-800 dark:text-slate-200 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                          {wallet.name}
                        </p>
                        {wallet.tag && (
                          <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded-md bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-400 border border-amber-200/50 dark:border-amber-900/50">
                            {wallet.tag}
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5 leading-snug line-clamp-2">
                        {wallet.desc}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
              
              <Button
                variant="ghost"
                className="w-full text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300 text-xs font-semibold mt-4 rounded-xl"
                onClick={handleClose}
              >
                Batalkan Transaksi
              </Button>
            </>
          )}

          {/* STEP 2: LOADING GATEWAY */}
          {step === 'loading' && (
            <div className="flex flex-col items-center py-10 gap-4">
              <div className="relative flex items-center justify-center">
                <div className="w-16 h-16 rounded-full border-4 border-slate-100 dark:border-slate-900 animate-pulse absolute" />
                <Loader2 className="w-10 h-10 text-violet-600 dark:text-violet-400 animate-spin relative z-10" />
              </div>
              <div className="text-center">
                <p className="text-sm font-bold text-slate-800 dark:text-slate-200">
                  Menghubungkan ke {selectedWallet?.name}
                </p>
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-1 max-w-[240px]">
                  Mohon tunggu sebentar, sistem sedang mengamankan token transaksi Anda...
                </p>
              </div>
            </div>
          )}

          {/* STEP 3: SUKSES */}
          {step === 'success' && (
            <div className="flex flex-col items-center py-8 gap-4 text-center">
              <div className="w-20 h-20 rounded-full bg-emerald-50 dark:bg-emerald-950/30 flex items-center justify-center shadow-md animate-bounce">
                <CheckCircle2 className="w-12 h-12 text-emerald-500" />
              </div>
              <div>
                <p className="text-lg font-extrabold text-emerald-600 dark:text-emerald-400">
                  Pembayaran Sukses!
                </p>
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-1 max-w-[220px]">
                  Sistem berhasil memverifikasi mutasi dana. Halaman akan segera dialihkan.
                </p>
              </div>
            </div>
          )}

          {/* STEP 4: ERROR */}
          {step === 'error' && (
            <div className="flex flex-col items-center py-6 gap-4 text-center">
              <div className="w-16 h-16 rounded-full bg-rose-50 dark:bg-rose-950/30 flex items-center justify-center shadow-sm">
                <XCircle className="w-10 h-10 text-rose-500" />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-bold text-rose-600 dark:text-rose-400">Gagal Memproses Pembayaran</p>
                <p className="text-xs text-slate-400 dark:text-slate-500 max-w-[260px] leading-relaxed">
                  {errorMsg}
                </p>
              </div>
              <div className="flex gap-2.5 w-full mt-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setStep('select')}
                  className="flex-1 gap-1.5 rounded-xl text-xs font-bold py-5 border-slate-200 text-slate-700 dark:border-slate-800 dark:text-slate-300"
                >
                  <ChevronLeft className="w-3.5 h-3.5" /> Ganti Metode
                </Button>
                {selectedWallet && (
                  <Button
                    size="sm"
                    onClick={() => handleWalletSelect(selectedWallet)}
                    className="flex-1 gap-1.5 rounded-xl text-xs font-bold py-5 bg-gradient-to-r from-violet-600 to-indigo-600 text-white hover:from-violet-700 hover:to-indigo-700"
                  >
                    <RefreshCw className="w-3.5 h-3.5" /> Coba Lagi
                  </Button>
                )}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
