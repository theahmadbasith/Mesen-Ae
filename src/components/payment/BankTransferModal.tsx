/**
 * BankTransferModal
 * Pilih bank → Snap membuka halaman VA bank tersebut secara langsung
 * via enabled_payments — tidak melalui halaman pilihan Snap.
 */
import { useState, useCallback, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Loader2, CheckCircle2, XCircle, RefreshCw, ChevronLeft } from 'lucide-react';
import { MidtransService } from '@/services/midtransService';

interface BankTransferModalProps {
  isOpen: boolean;
  amount: number;
  customerName?: string;
  orderId?: string;
  onSuccess: () => void;
  onClose: () => void;
}

interface BankOption {
  id: string;
  name: string;
  snapKey: string; // nilai untuk enabled_payments
  color: string;
  abbr: string;
}

const BANKS: BankOption[] = [
  { id: 'bca', name: 'BCA', snapKey: 'bca_va', color: '#005CA9', abbr: 'BCA' },
  { id: 'bni', name: 'BNI', snapKey: 'bni_va', color: '#F68F1E', abbr: 'BNI' },
  { id: 'bri', name: 'BRI', snapKey: 'bri_va', color: '#004B87', abbr: 'BRI' },
  { id: 'mandiri', name: 'Mandiri', snapKey: 'mandiri_bill', color: '#003087', abbr: 'MND' },
  { id: 'seabank', name: 'SeaBank', snapKey: 'other_va', color: '#FF5722', abbr: 'SEA' },
  { id: 'permata', name: 'Permata', snapKey: 'permata_va', color: '#E30613', abbr: 'PRM' },
  { id: 'cimb', name: 'CIMB', snapKey: 'cimb_va', color: '#c0392b', abbr: 'CIMB' },
  { id: 'other', name: 'Bank Lain', snapKey: 'other_va', color: '#64748b', abbr: 'ATM' },
];

type Step = 'select' | 'loading' | 'success' | 'error';

export function BankTransferModal({
  isOpen,
  amount,
  customerName,
  onSuccess,
  onClose,
}: BankTransferModalProps) {
  const [step, setStep] = useState<Step>('select');
  const [selectedBank, setSelectedBank] = useState<BankOption | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setStep('select');
      setSelectedBank(null);
      setErrorMsg(null);
      MidtransService.loadSnapScript().catch((e) => console.warn('Snap script:', e));
    }
  }, [isOpen]);

  const handleBankSelect = useCallback(async (bank: BankOption) => {
    setSelectedBank(bank);
    setStep('loading');
    setErrorMsg(null);
    const orderId = `MA-VA-${bank.id.toUpperCase()}-${Date.now()}`;

    try {
      const token = await MidtransService.createTransactionToken({
        transaction_details: {
          order_id: orderId,
          gross_amount: Math.round(amount),
        },
        item_details: [
          { name: 'Total Belanja MesenAe', price: Math.round(amount), quantity: 1 },
        ],
        customer_details: { first_name: customerName || 'Pelanggan MesenAe' },
        enabled_payments: [bank.snapKey],
      });

      // @ts-expect-error - window.snap injected globally
      if (!window.snap) throw new Error('Midtrans Snap belum siap.');

      // @ts-expect-error - window.snap injected globally
      window.snap.pay(token, {
        onSuccess: () => {
          setStep('success');
          setTimeout(() => onSuccess(), 1200);
        },
        onPending: () => setStep('select'),
        onError: (result: any) => {
          console.error('Snap Bank Transfer Error:', result);
          setStep('error');
          setErrorMsg('Pembayaran gagal. Silakan pilih bank lain atau coba lagi.');
        },
        onClose: () => setStep('select'),
      });

      // Set kembali ke select agar jika user tutup Snap, bisa pilih lagi
      setStep('select');
    } catch (err: any) {
      console.error('Bank Transfer Error:', err);
      setStep('error');
      setErrorMsg(err.message || `Gagal memulai transfer via ${bank.name}`);
    }
  }, [amount, customerName, onSuccess]);

  const handleClose = () => {
    if (step === 'loading') return;
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="max-w-[95vw] sm:max-w-sm rounded-2xl p-0 overflow-hidden z-[100]">
        {/* Header */}
        <div className="bg-gradient-to-br from-blue-600 to-blue-900 p-5 text-white">
          <DialogHeader>
            <DialogTitle className="text-white text-lg font-bold flex items-center gap-2">
              {step === 'error' && (
                <button onClick={() => setStep('select')} className="mr-1 opacity-70 hover:opacity-100">
                  <ChevronLeft className="w-5 h-5" />
                </button>
              )}
              🏦 Transfer Bank
            </DialogTitle>
            <DialogDescription className="text-white/80 text-sm mt-1">
              Pilih bank dan ikuti instruksi pembayaran
            </DialogDescription>
          </DialogHeader>
          <div className="mt-3 bg-white/20 rounded-xl p-3 text-center">
            <p className="text-xs text-white/70 font-medium">Total Transfer</p>
            <p className="text-3xl font-black text-white">Rp {amount.toLocaleString('id-ID')}</p>
            <p className="text-xs text-white/70 mt-1">{customerName || 'Pelanggan MesenAe'}</p>
          </div>
        </div>

        {/* Body */}
        <div className="p-5 overflow-y-auto max-h-[60vh] custom-scrollbar-hide">
          {step === 'select' && (
            <>
              <p className="text-sm text-muted-foreground mb-3 font-medium">Pilih bank tujuan:</p>
              <div className="grid grid-cols-4 gap-2">
                {BANKS.map((bank) => (
                  <button
                    key={bank.id}
                    onClick={() => handleBankSelect(bank)}
                    className="flex flex-col items-center justify-center p-2 rounded-xl border-2 border-border hover:border-primary hover:bg-primary/5 transition-all active:scale-95 gap-1"
                  >
                    <div
                      className="w-9 h-9 rounded-lg flex items-center justify-center text-[10px] font-black text-white bg-slate-100 overflow-hidden"
                      style={{ backgroundColor: bank.color }}
                    >
                      {['bca', 'bni', 'bri', 'mandiri', 'seabank'].includes(bank.id) ? (
                        <img src={`/ico/${bank.id}.png`} alt={bank.name} className="w-full h-full object-contain p-1 bg-white" />
                      ) : (
                        bank.abbr
                      )}
                    </div>
                    <span className="text-[10px] font-semibold text-foreground leading-tight text-center">
                      {bank.name}
                    </span>
                  </button>
                ))}
              </div>
              <Button variant="ghost" className="w-full text-muted-foreground text-sm mt-4" onClick={handleClose}>
                Batalkan
              </Button>
            </>
          )}

          {step === 'loading' && (
            <div className="flex flex-col items-center py-8 gap-3">
              <Loader2 className="w-10 h-10 text-primary animate-spin" />
              <p className="text-sm text-muted-foreground font-medium">
                Menyiapkan pembayaran via {selectedBank?.name}...
              </p>
            </div>
          )}

          {step === 'success' && (
            <div className="flex flex-col items-center py-6 gap-3">
              <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                <CheckCircle2 className="w-10 h-10 text-green-500" />
              </div>
              <p className="text-base font-bold text-green-600 dark:text-green-400">Transfer Berhasil!</p>
            </div>
          )}

          {step === 'error' && (
            <div className="flex flex-col items-center py-4 gap-3">
              <div className="w-14 h-14 rounded-full bg-destructive/10 flex items-center justify-center">
                <XCircle className="w-9 h-9 text-destructive" />
              </div>
              <p className="text-sm text-destructive font-medium text-center">{errorMsg}</p>
              <div className="flex gap-2 w-full">
                <Button size="sm" variant="outline" onClick={() => setStep('select')} className="flex-1 gap-1">
                  <ChevronLeft className="w-4 h-4" /> Pilih Bank Lain
                </Button>
                {selectedBank && (
                  <Button size="sm" onClick={() => handleBankSelect(selectedBank)} className="flex-1 gap-1">
                    <RefreshCw className="w-4 h-4" /> Coba Lagi
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
