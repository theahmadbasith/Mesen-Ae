import { useState } from 'react';
import { createPortal } from 'react-dom';
import { X, FileText, MessageCircle, RotateCcw, Loader2, Share2, ChevronRight, Package, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import ReportWhatsAppModal from './ReportWhatsAppModal';
import StockReportPrint, { StockReportData } from './StockReportPrint';

interface StockReportShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  onGenerate: (startDate: string, endDate: string) => Promise<StockReportData>;
  storeName: string;
}

type RangeType = '7' | '30' | 'custom';

export default function StockReportShareModal({ isOpen, onClose, onGenerate, storeName }: StockReportShareModalProps) {
  const [rangeType, setRangeType] = useState<RangeType>('30');
  const [startDate, setStartDate] = useState(() => {
    const d = new Date(); d.setDate(d.getDate() - 30);
    return d.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState<StockReportData | null>(null);

  // WA modal
  const [waOpen, setWaOpen] = useState(false);
  const [waMessage, setWaMessage] = useState('');

  if (!isOpen) return null;

  const applyPreset = (type: RangeType) => {
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    if (type === '7') {
      const d = new Date(today); d.setDate(d.getDate() - 7);
      setStartDate(d.toISOString().split('T')[0]);
    } else if (type === '30') {
      const d = new Date(today); d.setDate(d.getDate() - 30);
      setStartDate(d.toISOString().split('T')[0]);
    }
    setEndDate(todayStr);
    setRangeType(type);
  };

  const handleGenerate = async () => {
    if (!startDate || !endDate) return;
    setLoading(true);
    try {
      const data = await onGenerate(startDate, endDate);
      setReportData(data);
    } catch {
      // error handled by parent
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const buildWaMessage = (data: StockReportData): string => {
    const rp = (n: number) => `Rp ${n.toLocaleString('id-ID')}`;
    const fmtDate = (s: string) => new Date(s).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
    const nb = '\u00A0';
    const pad = (text: string, len = 18) => text + nb.repeat(Math.max(0, len - text.length));

    const outOfStockText = data.outOfStockProducts.length === 0
      ? 'Aman, tidak ada.'
      : data.outOfStockProducts.slice(0, 5).map((p, i) => `${i + 1}. ${p.name}`).join('\n') + (data.outOfStockProducts.length > 5 ? `\n...dan ${data.outOfStockProducts.length - 5} lainnya` : '');

    const lowStockText = data.lowStockProducts.length === 0
      ? 'Aman, tidak ada.'
      : data.lowStockProducts.slice(0, 5).map((p, i) => `${i + 1}. ${p.name} (Sisa ${p.stock})`).join('\n') + (data.lowStockProducts.length > 5 ? `\n...dan ${data.lowStockProducts.length - 5} lainnya` : '');

    return `*LAPORAN STOK ${data.storeName.toUpperCase()}*
Periode: ${fmtDate(data.startDate)} s/d ${fmtDate(data.endDate)}

━━━━━━━━━━━━━━━━━━━━━━━━
*RINGKASAN LOGISTIK*
━━━━━━━━━━━━━━━━━━━━━━━━
• ${pad('Barang Masuk')} : ${data.totalStockIn} unit
• ${pad('Barang Keluar')} : ${data.totalStockOut} unit
• ${pad('Total Tersedia')} : ${data.currentStock} unit
• ${pad('Nilai Belanja')} : ${rp(data.totalStockInValue)}

━━━━━━━━━━━━━━━━━━━━━━━━
🚨 *BARANG HABIS KOSONG:*
${outOfStockText}

⚠️ *STOK MENIPIS (≤5):*
${lowStockText}

━━━━━━━━━━━━━━━━━━━━━━━━
_Dibuat: ${new Date().toLocaleString('id-ID')}_
_MesenAe — Aplikasi Kasir UMKM_`.trim();
  };

  const handleOpenWa = () => {
    if (!reportData) return;
    setWaMessage(buildWaMessage(reportData));
    setWaOpen(true);
  };

  const handleSendWa = () => {
    const url = `https://wa.me/?text=${encodeURIComponent(waMessage)}`;
    window.open(url, '_blank');
    setWaOpen(false);
  };

  const fmtDate = (s: string) => new Date(s).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });

  const modalContent = (
    <>
      <div className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
        {/* Backdrop */}
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

        {/* Modal */}
        <div className="relative w-full sm:max-w-[500px] max-h-[92dvh] bg-background rounded-t-3xl sm:rounded-2xl shadow-2xl flex flex-col overflow-hidden">

          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b shrink-0 bg-indigo-600">
            <div className="flex items-center gap-2.5">
              <Share2 className="w-5 h-5 text-white" />
              <h3 className="font-bold text-base text-white">Bagikan Laporan Stok</h3>
            </div>
            <button onClick={onClose} className="p-1.5 bg-white/10 hover:bg-white/20 rounded-full transition-colors">
              <X className="w-5 h-5 text-white" />
            </button>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">

            {!reportData ? (
              /* ── STEP 1: Pilih Periode ── */
              <div className="space-y-4">
                <div>
                  <Label className="text-xs font-semibold text-muted-foreground mb-2 block">Periode Waktu</Label>
                  <div className="grid grid-cols-3 gap-2">
                    {(['7', '30', 'custom'] as RangeType[]).map(type => (
                      <button
                        key={type}
                        onClick={() => type !== 'custom' ? applyPreset(type) : setRangeType('custom')}
                        className={`py-2.5 rounded-xl font-semibold text-sm transition-all border-2 ${
                          rangeType === type
                            ? 'border-indigo-600 bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400'
                            : 'border-border text-muted-foreground hover:border-indigo-600/40'
                        }`}
                      >
                        {type === '7' ? '7 Hari' : type === '30' ? '30 Hari' : 'Custom'}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Dari Tanggal</Label>
                    <Input
                      type="date"
                      value={startDate}
                      onChange={e => { setStartDate(e.target.value); setRangeType('custom'); }}
                      className="h-11 text-sm"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Sampai Tanggal</Label>
                    <Input
                      type="date"
                      value={endDate}
                      onChange={e => { setEndDate(e.target.value); setRangeType('custom'); }}
                      className="h-11 text-sm"
                    />
                  </div>
                </div>

                <Button
                  className="w-full h-12 text-base font-semibold gap-2 bg-indigo-600 hover:bg-indigo-700"
                  onClick={handleGenerate}
                  disabled={loading || !startDate || !endDate}
                >
                  {loading ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> Memproses...</>
                  ) : (
                    <><FileText className="w-4 h-4" /> Buat Laporan Stok</>
                  )}
                </Button>
              </div>
            ) : (
              /* ── STEP 2: Hasil & Aksi ── */
              <div className="space-y-3">
                {/* Period info + reset */}
                <div className="flex items-center justify-between bg-muted/50 rounded-xl px-3 py-2.5">
                  <div>
                    <p className="text-xs text-muted-foreground">Periode Logistik</p>
                    <p className="text-sm font-semibold">{fmtDate(startDate)} — {fmtDate(endDate)}</p>
                  </div>
                  <Button variant="ghost" size="sm" className="h-8 gap-1.5 text-xs text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 dark:hover:bg-indigo-900/30" onClick={() => setReportData(null)}>
                    <RotateCcw className="w-3.5 h-3.5" /> Atur Ulang
                  </Button>
                </div>

                {/* Summary cards */}
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { label: 'Barang Masuk', value: `${reportData.totalStockIn} unit`, accent: 'bg-emerald-500' },
                    { label: 'Barang Keluar', value: `${reportData.totalStockOut} unit`, accent: 'bg-rose-500' },
                  ].map(item => (
                    <div key={item.label} className="bg-card border rounded-xl p-3 flex items-center gap-2.5 shadow-sm">
                      <div className={`w-1.5 h-10 rounded-full shrink-0 ${item.accent}`} />
                      <div>
                        <p className="text-[10px] text-muted-foreground font-semibold uppercase">{item.label}</p>
                        <p className="text-sm font-bold">{item.value}</p>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Sisa Stok highlight */}
                <div className="rounded-xl p-4 flex items-center justify-between bg-gradient-to-r from-indigo-500 to-blue-600 text-white">
                  <div className="flex items-center gap-3">
                    <Package className="w-8 h-8 opacity-80" />
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wide text-white/80">Sisa Stok Total</p>
                      <p className="text-[10px] text-white/60 mt-0.5">Keseluruhan Barang di Gudang</p>
                    </div>
                  </div>
                  <p className="text-xl font-extrabold">{reportData.currentStock} unit</p>
                </div>
                
                {/* Out of Stock Peringatan */}
                {reportData.outOfStockProducts.length > 0 && (
                  <div className="bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/40 rounded-xl p-3 flex items-start gap-2">
                     <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                     <div>
                       <p className="text-xs font-bold text-rose-700 dark:text-rose-400">🚨 {reportData.outOfStockProducts.length} Produk Habis!</p>
                       <p className="text-[10px] text-rose-600/80 mt-0.5">Cetak PDF untuk melihat rincian produk yang perlu di-restock segera.</p>
                     </div>
                  </div>
                )}

                {/* Action buttons */}
                <div className="space-y-2 pt-1">
                  <p className="text-xs font-semibold text-muted-foreground uppercase">Bagikan Laporan</p>

                  {/* PDF */}
                  <button
                    onClick={handlePrint}
                    className="w-full flex items-center gap-3 p-3.5 rounded-xl border-2 border-red-200 bg-red-50 dark:bg-red-950/20 dark:border-red-900/40 hover:bg-red-100 dark:hover:bg-red-950/40 transition-colors"
                  >
                    <div className="w-10 h-10 rounded-xl bg-red-500 flex items-center justify-center shrink-0">
                      <FileText className="w-5 h-5 text-white" />
                    </div>
                    <div className="flex-1 text-left">
                      <p className="text-sm font-bold text-red-700 dark:text-red-400">Cetak / Simpan PDF</p>
                      <p className="text-[11px] text-red-500/80">Termasuk rincian barang keluar & masuk</p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-red-400" />
                  </button>

                  {/* WhatsApp */}
                  <button
                    onClick={handleOpenWa}
                    className="w-full flex items-center gap-3 p-3.5 rounded-xl border-2 border-emerald-200 bg-emerald-50 dark:bg-emerald-950/20 dark:border-emerald-900/40 hover:bg-emerald-100 dark:hover:bg-emerald-950/40 transition-colors"
                  >
                    <div className="w-10 h-10 rounded-xl bg-[#25d366] flex items-center justify-center shrink-0">
                      <MessageCircle className="w-5 h-5 text-white" />
                    </div>
                    <div className="flex-1 text-left">
                      <p className="text-sm font-bold text-emerald-700 dark:text-emerald-400">Kirim via WhatsApp</p>
                      <p className="text-[11px] text-emerald-500/80">Ringkasan stok dan peringatan barang habis</p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-emerald-400" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* WA Preview Modal */}
      <ReportWhatsAppModal
        isOpen={waOpen}
        message={waMessage}
        onClose={() => setWaOpen(false)}
        onSend={handleSendWa}
        onEdit={setWaMessage}
      />

      {/* Print Layout (hidden on screen, visible on print) */}
      {reportData && <StockReportPrint data={reportData} />}
    </>
  );

  return createPortal(modalContent, document.body);
}
