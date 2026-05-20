import React, { ErrorInfo } from 'react';
import { AlertTriangle, Copy, RefreshCcw, Terminal } from 'lucide-react';

type Props = { children: React.ReactNode };
type State = { hasError: boolean; error?: Error; errorInfo?: ErrorInfo };

export default class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Unhandled UI error:', error, info);
    this.setState({ errorInfo: info });
  }

  handleCopyError = () => {
    const { error, errorInfo } = this.state;
    const errorDetails = `
================= CRASH REPORT =================
Message: ${error?.message || 'Unknown error'}

--- Stack Trace ---
${error?.stack || 'No stack trace available'}

--- Component Stack ---
${errorInfo?.componentStack || 'No component stack available'}
================================================
    `.trim();

    navigator.clipboard.writeText(errorDetails).then(() => {
      alert('Teks eror berhasil disalin! Silakan paste (Ctrl+V) ke chat untuk dianalisa.');
    }).catch(() => {
      alert('Gagal menyalin otomatis. Silakan blok dan copy teks secara manual.');
    });
  }

  render() {
    if (this.state.hasError) {
      const { error, errorInfo } = this.state;
      return (
        <div className="min-h-screen w-full bg-slate-950 flex flex-col items-center justify-center p-4 md:p-8 text-slate-200 font-sans">
          <div className="w-full max-w-5xl bg-slate-900 border border-red-900/40 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            
            {/* Header */}
            <div className="bg-red-950/40 border-b border-red-900/40 p-5 md:p-6 flex flex-col md:flex-row md:items-start justify-between gap-4">
              <div className="flex items-start gap-4">
                <div className="p-3 bg-red-500/10 rounded-xl shrink-0 border border-red-500/20 mt-0.5">
                  <AlertTriangle className="w-7 h-7 md:w-8 md:h-8 text-red-500" />
                </div>
                <div className="flex-1">
                  <h1 className="text-lg md:text-xl font-black text-white tracking-tight mb-1">Aplikasi Mengalami Kesalahan Fatal (Crash)</h1>
                  <p className="text-xs md:text-sm text-red-300 font-medium">Jangan panik, sistem menangkap gangguan saat merender antarmuka halaman ini.</p>
                </div>
              </div>
              <button 
                onClick={() => window.location.reload()} 
                className="flex items-center justify-center gap-2 bg-slate-100 hover:bg-white text-slate-900 px-5 py-2.5 rounded-lg font-extrabold text-sm transition-all shadow-sm shrink-0 active:scale-95"
              >
                <RefreshCcw className="w-4 h-4" />
                Muat Ulang Halaman
              </button>
            </div>

            {/* Error Body */}
            <div className="p-5 md:p-6 bg-slate-900 space-y-6 overflow-y-auto flex-1 custom-scrollbar">
              
              {/* Pesan Singkat */}
              <div className="space-y-2">
                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                  <Terminal className="w-3.5 h-3.5" />
                  Ringkasan Eror
                </h3>
                <div className="bg-red-950/20 border-l-4 border-l-red-500 border-y border-r border-y-red-900/30 border-r-red-900/30 rounded-r-lg p-4 font-mono text-sm md:text-base font-bold text-red-400 break-words">
                  {error?.message || 'Unknown Error'}
                </div>
              </div>

              {/* Rincian Teknis */}
              <div className="space-y-3">
                <div className="flex justify-between items-end">
                  <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                    <Terminal className="w-3.5 h-3.5" />
                    Stack Trace & Komponen Induk (Detail Teknis)
                  </h3>
                  <button 
                    onClick={this.handleCopyError}
                    className="flex items-center gap-2 text-xs font-extrabold bg-slate-800 hover:bg-slate-700 text-slate-300 px-4 py-2 rounded-lg border border-slate-600 hover:border-slate-500 transition-colors shadow-sm active:scale-95"
                  >
                    <Copy className="w-4 h-4" />
                    Copy Seluruh Eror
                  </button>
                </div>
                
                <div className="bg-black/80 border border-slate-700 rounded-xl p-5 overflow-x-auto relative">
                  <pre className="text-[11px] leading-relaxed font-mono text-slate-300 whitespace-pre-wrap">
                    <span className="text-orange-400 font-bold block mb-1"># TRACE BROWSER:</span>
                    {error?.stack || 'Browser tidak menyediakan rincian stack trace.'}
                    
                    <span className="text-emerald-400 font-bold block mt-6 mb-1"># LOKASI KOMPONEN REACT:</span>
                    <span className="text-slate-400">
                      {errorInfo?.componentStack || 'Lokasi asal komponen tidak tersedia.'}
                    </span>
                  </pre>
                </div>
              </div>
              
              <div className="text-xs text-slate-500 font-medium bg-slate-800/30 p-3 rounded-lg border border-slate-800">
                💡 <strong className="text-slate-300">Tips Perbaikan:</strong> Klik tombol <strong className="text-slate-300">"Copy Seluruh Eror"</strong>, lalu <i>paste</i> laporannya pada chat untuk membantu saya menemukan kode mana yang menyebabkan masalah ini.
              </div>

            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
