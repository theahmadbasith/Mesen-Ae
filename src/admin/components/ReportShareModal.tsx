import { useState } from 'react';
import { createPortal } from 'react-dom';
import { X, FileText, MessageCircle, RotateCcw, Loader2, Share2, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import ReportWhatsAppModal from './ReportWhatsAppModal';
import ReportPrint from './ReportPrint';
import type { MesenAeReportData } from './ReportPrint';

interface ReportShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Callback to generate report data for a given date range */
  onGenerate: (startDate: string, endDate: string) => Promise<MesenAeReportData>;
  storeName: string;
}

type RangeType = '7' | '30' | 'custom';

export default function ReportShareModal({ isOpen, onClose, onGenerate, storeName }: ReportShareModalProps) {
  const [rangeType, setRangeType] = useState<RangeType>('30');
  const [startDate, setStartDate] = useState(() => {
    const d = new Date(); d.setDate(d.getDate() - 30);
    return d.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState<MesenAeReportData | null>(null);

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

  const buildWaMessage = (data: MesenAeReportData): string => {
    const rp = (n: number) => `Rp ${n.toLocaleString('id-ID')}`;
    const fmtDate = (s: string) => new Date(s).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
    const nb = '\u00A0'; // non-breaking space for alignment
    const pad = (text: string, len = 18) => text + nb.repeat(Math.max(0, len - text.length));

    const topSection = data.topProducts.length === 0
      ? 'Belum ada data penjualan.'
      : data.topProducts.map((p, i) =>
          `${i + 1}. *${p.name}*\n   Terjual: ${p.qty} unit | Pendapatan: ${rp(p.revenue)}\n   Laba: *${rp(p.profit)}*`
        ).join('\n\n');

    return `*LAPORAN ${data.storeName.toUpperCase()}*
Periode: ${fmtDate(data.startDate)} s/d ${fmtDate(data.endDate)}

━━━━━━━━━━━━━━━━━━━━━━━━
*RINGKASAN KEUANGAN*
━━━━━━━━━━━━━━━━━━━━━━━━
• ${pad('Jumlah Transaksi')} : ${data.txCount} transaksi
• ${pad('Pendapatan Kotor')} : ${rp(data.totalRevenue)}
• ${pad('Total Diskon')} : ${rp(data.totalDiscount)}
• ${pad('Penjualan Bersih')} : ${rp(data.netSales)}
• ${pad('HPP / Modal')} : ${rp(data.totalHpp)}
• ${pad('*Laba Kotor*', 18)} : *${rp(data.grossProfit)}*
• ${pad('Margin')} : ${data.marginPercent.toFixed(1)}%

━━━━━━━━━━━━━━━━━━━━━━━━
*PRODUK TERLARIS*
━━━━━━━━━━━━━━━━━━━━━━━━
${topSection}

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
          <div className="flex items-center justify-between px-5 py-4 border-b shrink-0 bg-primary">
            <div className="flex items-center gap-2.5">
              <Share2 className="w-5 h-5 text-white" />
              <h3 className="font-bold text-base text-white">Bagikan Laporan</h3>
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
                            ? 'border-primary bg-primary/5 text-primary'
                            : 'border-border text-muted-foreground hover:border-primary/40'
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
                  className="w-full h-12 text-base font-semibold gap-2"
                  onClick={handleGenerate}
                  disabled={loading || !startDate || !endDate}
                >
                  {loading ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> Memproses...</>
                  ) : (
                    <><FileText className="w-4 h-4" /> Buat Laporan</>
                  )}
                </Button>
              </div>
            ) : (
              /* ── STEP 2: Hasil & Aksi ── */
              <div className="space-y-3">
                {/* Period info + reset */}
                <div className="flex items-center justify-between bg-muted/50 rounded-xl px-3 py-2.5">
                  <div>
                    <p className="text-xs text-muted-foreground">Periode</p>
                    <p className="text-sm font-semibold">{fmtDate(startDate)} — {fmtDate(endDate)}</p>
                  </div>
                  <Button variant="ghost" size="sm" className="h-8 gap-1.5 text-xs" onClick={() => setReportData(null)}>
                    <RotateCcw className="w-3.5 h-3.5" /> Atur Ulang
                  </Button>
                </div>

                {/* Summary cards */}
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { label: 'Transaksi', value: `${reportData.txCount}`, accent: 'bg-primary' },
                    { label: 'Penjualan Bersih', value: `Rp ${reportData.netSales >= 1_000_000 ? (reportData.netSales / 1_000_000).toFixed(1) + 'Jt' : reportData.netSales.toLocaleString('id-ID')}`, accent: 'bg-emerald-500' },
                    { label: 'HPP / Modal', value: `Rp ${reportData.totalHpp >= 1_000_000 ? (reportData.totalHpp / 1_000_000).toFixed(1) + 'Jt' : reportData.totalHpp.toLocaleString('id-ID')}`, accent: 'bg-amber-500' },
                    { label: 'Margin', value: `${reportData.marginPercent.toFixed(1)}%`, accent: 'bg-indigo-500' },
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

                {/* Laba Kotor highlight */}
                <div className={`rounded-xl p-4 flex items-center justify-between ${
                  reportData.grossProfit >= 0
                    ? 'bg-gradient-to-r from-emerald-500 to-green-600'
                    : 'bg-gradient-to-r from-red-500 to-rose-600'
                } text-white`}>
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wide text-white/80">Laba Kotor</p>
                    <p className="text-[10px] text-white/60 mt-0.5">Penjualan Bersih − HPP</p>
                  </div>
                  <p className="text-xl font-extrabold">
                    {reportData.grossProfit >= 0 ? '+' : '−'}Rp {Math.abs(reportData.grossProfit).toLocaleString('id-ID')}
                  </p>
                </div>

                {/* Top products mini list */}
                {reportData.topProducts.length > 0 && (
                  <div className="bg-card border rounded-xl p-3 shadow-sm space-y-2">
                    <p className="text-xs font-bold text-muted-foreground uppercase">Produk Terlaris</p>
                    {reportData.topProducts.slice(0, 3).map((p, i) => (
                      <div key={p.name} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="w-5 h-5 rounded-full bg-primary/10 text-primary text-[10px] font-bold flex items-center justify-center shrink-0">{i + 1}</span>
                          <span className="text-sm truncate max-w-[140px]">{p.name}</span>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-xs font-bold">Rp {p.revenue.toLocaleString('id-ID')}</p>
                          <p className="text-[10px] text-muted-foreground">{p.qty} terjual</p>
                        </div>
                      </div>
                    ))}
                    {reportData.topProducts.length > 3 && (
                      <p className="text-[10px] text-muted-foreground text-center">+{reportData.topProducts.length - 3} produk lainnya di PDF</p>
                    )}
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
                      <p className="text-[11px] text-red-500/80">Buka dialog cetak browser</p>
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
                      <p className="text-[11px] text-emerald-500/80">Preview & edit pesan sebelum kirim</p>
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
      {reportData && <ReportPrint data={reportData} />}
    </>
  );

  return createPortal(modalContent, document.body);
}
