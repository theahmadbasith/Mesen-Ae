import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { QrCode, Download, Printer, Copy, Plus, Trash2, LayoutGrid, Store, CheckCircle2 } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { toPng } from 'html-to-image';
import { toast } from 'sonner';
import { useDbQuery, dbInsert, dbUpdate } from '@/hooks/db-hooks';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';

// Transparent pixel untuk "melubangi" ruang di QR Code
const transparentPixel = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=";

export default function QrCodeMenu() {
  const storeSettings = useDbQuery<any>('storeSettings')?.[0];
  const [tables, setTables] = useState<string[]>([]);
  const [newTable, setNewTable] = useState('');
  const [activeTable, setActiveTable] = useState<string>('');
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [tableToDelete, setTableToDelete] = useState<string | null>(null);
  const qrRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!storeSettings) {
      setTables([]);
      return;
    }
    const existingTables = Array.isArray(storeSettings.tables) ? storeSettings.tables : [];
    setTables(existingTables);
    if (!activeTable) {
      if (existingTables.length > 0) setActiveTable(existingTables[0]);
      else setActiveTable('1');
    }
  }, [storeSettings, activeTable]);

  const handleAddTable = async () => {
    if (!newTable.trim()) {
      toast.error('Nomor/Nama meja tidak boleh kosong');
      return;
    }
    
    const newTableName = newTable.trim();
    
    if (newTableName.toLowerCase() === 'bawa pulang') {
      toast.error('Bawa Pulang sudah tersedia secara default');
      return;
    }
    
    const isDuplicate = tables.some(t => t.toLowerCase() === newTableName.toLowerCase());
    
    if (isDuplicate) {
      toast.error(`Meja "${newTableName}" sudah terdaftar`);
      return;
    }

    const updatedTables = [...tables, newTableName];
    
    try {
      if (storeSettings?.id) {
        await dbUpdate('storeSettings', storeSettings.id, { tables: updatedTables });
      } else {
        await dbInsert('storeSettings', {
          storeName: storeSettings?.storeName ?? 'Toko Saya',
          address: storeSettings?.address ?? '',
          phone: storeSettings?.phone ?? '',
          receiptFooter: storeSettings?.receiptFooter ?? 'Terima kasih atas kunjungan Anda!',
          onboardingDone: storeSettings?.onboardingDone ?? false,
          themeColor: storeSettings?.themeColor,
          logo: storeSettings?.logo,
          tables: updatedTables,
        });
      }
      setTables(updatedTables);
      setNewTable('');
      setActiveTable(newTableName);
      toast.success('Meja berhasil ditambahkan');
    } catch (error: any) {
      toast.error('Gagal menyimpan meja ke database: ' + (error.message || error));
    }
  };

  const confirmRemoveTable = (table: string) => {
    setTableToDelete(table);
    setDeleteConfirmOpen(true);
  };

  const handleRemoveTable = async () => {
    if (!tableToDelete) return;
    
    const updatedTables = tables.filter(t => t !== tableToDelete);
    try {
      if (storeSettings?.id) {
        await dbUpdate('storeSettings', storeSettings.id, { tables: updatedTables });
        toast.success(`Meja ${tableToDelete} berhasil dihapus`);
        if (activeTable === tableToDelete) {
          setActiveTable(updatedTables.length > 0 ? updatedTables[0] : '');
        }
      }
    } catch (error: any) {
      toast.error('Gagal menghapus meja: ' + (error.message || error));
    } finally {
      setDeleteConfirmOpen(false);
      setTableToDelete(null);
    }
  };

  const generatedUrl = useMemo(() => {
    let base = storeSettings?.customerUrl || window.location.origin;
    if (base.endsWith('/')) base = base.slice(0, -1);
    if (!base.startsWith('http')) base = 'https://' + base;
    return `${base}/?table=${encodeURIComponent(activeTable || '1')}`;
  }, [activeTable, storeSettings?.customerUrl]);

  const copyToClipboard = () => {
    navigator.clipboard.writeText(generatedUrl);
    toast.success('Tautan berhasil disalin ke clipboard');
  };

  const downloadQrCode = async () => {
    if (!cardRef.current) return;
    try {
      const pngFile = await toPng(cardRef.current, {
        cacheBust: true,
        pixelRatio: 3,
        backgroundColor: '#ffffff'
      });
      
      const downloadLink = document.createElement('a');
      downloadLink.download = `QR_Meja_${activeTable || '1'}.png`;
      downloadLink.href = pngFile;
      downloadLink.click();
      toast.success('QR Code berhasil diunduh');
    } catch {
      toast.error('Gagal mengunduh QR Code');
    }
  };

  const printQrCode = async () => {
    if (!qrRef.current) return;
    try {
      const dataUrl = await toPng(qrRef.current, { cacheBust: true, pixelRatio: 3, backgroundColor: '#ffffff' });

      const storeName = storeSettings?.storeName || 'MesenAe Resto';
      const printWindow = window.open('', '', 'width=800,height=900');
      
      if (printWindow) {
        printWindow.document.write(`
          <!DOCTYPE html>
          <html>
            <head>
              <title>Cetak QR Code - Meja ${activeTable}</title>
              <style>
                @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;700;800&display=swap');
                
                body { 
                  display: flex; 
                  flex-direction: column; 
                  align-items: center; 
                  justify-content: center; 
                  min-height: 100vh; 
                  font-family: 'Inter', sans-serif; 
                  margin: 0;
                  background-color: #f8fafc;
                  -webkit-print-color-adjust: exact;
                  print-color-adjust: exact;
                }
                .print-container {
                  background: white;
                  border: 1px solid #f1f5f9;
                  border-radius: 32px;
                  padding: 48px 40px;
                  text-align: center;
                  max-width: 420px;
                  box-shadow: 0 20px 40px -10px rgba(0,0,0,0.08);
                }
                .store-name {
                  font-size: 26px;
                  font-weight: 800;
                  color: #0f172a;
                  margin-bottom: 6px;
                  text-transform: uppercase;
                  letter-spacing: 1.5px;
                }
                .instruction {
                  font-size: 15px;
                  color: #64748b;
                  margin-bottom: 36px;
                  font-weight: 500;
                }
                .qr-wrapper {
                  margin-bottom: 32px;
                  display: inline-block;
                }
                .table-badge {
                  background: #0f172a;
                  color: white;
                  font-size: 28px;
                  font-weight: 800;
                  padding: 14px 48px;
                  border-radius: 20px;
                  display: inline-block;
                  margin-bottom: 24px;
                  box-shadow: 0 8px 16px -4px rgba(15, 23, 42, 0.2);
                }
                .footer-text {
                  font-size: 13px;
                  font-weight: 500;
                  color: #94a3b8;
                  margin-top: 32px;
                  border-top: 2px dashed #f1f5f9;
                  padding-top: 20px;
                }
                @media print {
                  @page { margin: 0; }
                  body { 
                    background-color: white; 
                    justify-content: center; 
                    height: 100vh;
                    margin: 0;
                    padding: 0;
                    overflow: hidden; 
                  }
                  .print-container { border: none; box-shadow: none; transform: scale(0.95); }
                  .table-badge { background: #000; color: #fff; box-shadow: none; }
                }
              </style>
            </head>
            <body>
              <div class="print-container">
                <div class="store-name">${storeName}</div>
                <div class="instruction">Scan QR Code ini untuk melihat menu dan memesan dari HP Anda</div>
                
                <div class="qr-wrapper">
                  <img src="${dataUrl}" alt="QR Code" style="width:280px;height:auto;" />
                </div>
                
                ${activeTable ? `<div class="table-badge">${formatTableLabel(activeTable).toUpperCase()}</div>` : ''}
                
                <div class="footer-text">Powered by MesenAe Self-Order System</div>
              </div>
            </body>
          </html>
        `);
        printWindow.document.close();
        printWindow.focus();
        
        setTimeout(() => {
          printWindow.print();
          printWindow.close();
        }, 500);
      }
    } catch {
      toast.error('Gagal memproses cetak');
    }
  };

  const formatTableLabel = (t: string | number) => {
    const s = String(t).trim();
    if (s.toLowerCase() === 'bawa pulang') return 'Bawa Pulang';
    return /^meja\s+/i.test(s) ? s : `Meja ${s}`;
  };

  return (
    <div className="pt-4 pb-24 space-y-6 w-full mx-auto animate-in fade-in duration-300">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Kolom Kiri: Manajemen Meja */}
        <div className="lg:col-span-5 space-y-6">
          <Card className="shadow-sm border-border/50 bg-card text-card-foreground">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Store className="w-5 h-5 text-muted-foreground" />
                Daftar Meja Anda
              </CardTitle>
              <CardDescription>Tambahkan nomor atau nama meja baru</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col gap-4 mb-6">
                <div className="flex gap-3">
                  <Input 
                    type="text"
                    placeholder="Contoh: 1, 2, VIP A" 
                    value={newTable}
                    onChange={e => setNewTable(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleAddTable()}
                    className="bg-muted/50 focus-visible:bg-background"
                  />
                  <Button onClick={handleAddTable} className="shrink-0 gap-2 font-medium">
                    <Plus className="w-4 h-4" />
                    Tambah
                  </Button>
                </div>
              </div>

              <div className="space-y-2.5 max-h-[420px] overflow-y-auto pr-2 custom-scrollbar">
                
                {/* Take Away (Bawa Pulang) QR Code - Fixed at top */}
                <div 
                  onClick={() => setActiveTable('Bawa Pulang')}
                  className={`group flex items-center justify-between p-3.5 rounded-xl border transition-all cursor-pointer ${
                    activeTable === 'Bawa Pulang' 
                      ? 'border-primary bg-primary/5 ring-1 ring-primary/20 shadow-sm' 
                      : 'border-border hover:border-primary/30 hover:bg-muted/50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {activeTable === 'Bawa Pulang' ? (
                      <CheckCircle2 className="w-5 h-5 text-primary" />
                    ) : (
                      <div className="w-5 h-5 rounded-full border-2 border-muted-foreground/30 group-hover:border-primary/40 transition-colors" />
                    )}
                    <span className={`font-semibold ${activeTable === 'Bawa Pulang' ? 'text-primary' : 'text-foreground'}`}>
                      Bawa Pulang (Take Away)
                    </span>
                  </div>
                </div>

                {tables.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-10 text-center border-2 border-dashed border-border/60 rounded-xl bg-muted/20">
                    <QrCode className="w-10 h-10 text-muted-foreground/40 mb-3" />
                    <p className="text-sm font-medium text-foreground">Belum ada meja</p>
                    <p className="text-xs text-muted-foreground mt-1 max-w-[200px]">
                      Tambahkan meja pertama Anda untuk mulai membuat QR Code.
                    </p>
                  </div>
                ) : (
                  tables.map(table => (
                    <div 
                      key={table}
                      onClick={() => setActiveTable(table)}
                      className={`group flex items-center justify-between p-3.5 rounded-xl border transition-all cursor-pointer ${
                        activeTable === table 
                          ? 'border-primary bg-primary/5 ring-1 ring-primary/20 shadow-sm' 
                          : 'border-border hover:border-primary/30 hover:bg-muted/50'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        {activeTable === table ? (
                          <CheckCircle2 className="w-5 h-5 text-primary" />
                        ) : (
                          <div className="w-5 h-5 rounded-full border-2 border-muted-foreground/30 group-hover:border-primary/40 transition-colors" />
                        )}
                        <span className={`font-semibold ${activeTable === table ? 'text-primary' : 'text-foreground'}`}>
                          {formatTableLabel(table)}
                        </span>
                      </div>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8 text-muted-foreground opacity-0 group-hover:opacity-100 hover:text-destructive hover:bg-destructive/10 transition-all focus:opacity-100"
                        onClick={(e) => { e.stopPropagation(); confirmRemoveTable(table); }}
                        title={`Hapus Meja ${table}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Kolom Kanan: Preview & Actions QR Code */}
        <div className="lg:col-span-7">
          <Card className="shadow-sm border-border/50 h-full flex flex-col overflow-hidden bg-card text-card-foreground">
            <div className="bg-muted/30 px-6 py-4 border-b border-border/50">
              <CardTitle className="text-lg flex items-center gap-2">
                <QrCode className="w-5 h-5 text-muted-foreground" />
                Preview QR Code
              </CardTitle>
            </div>
            
            <CardContent className="p-8 flex-1 flex flex-col items-center justify-center relative bg-muted/10">
              {!activeTable ? (
                <div className="text-center space-y-3 opacity-50">
                  <LayoutGrid className="w-16 h-16 mx-auto text-muted-foreground" />
                  <p className="text-sm font-medium">Pilih atau tambah meja terlebih dahulu</p>
                </div>
              ) : (
                <>
                  {/* Wrapper animasi efek hover */}
                  <div className="mx-auto mb-10 transform transition-all hover:scale-[1.02] hover:shadow-2xl rounded-[32px]">
                    
                    {/* CARD REF - Selalu dipaksa terang (Light Mode) agar hasil export PNG valid & bisa di-scan */}
                    <div 
                      ref={cardRef}
                      className="bg-white p-10 rounded-[32px] shadow-xl shadow-black/5 relative flex flex-col items-center text-center"
                      style={{ 
                        width: '380px', 
                        boxSizing: 'border-box',
                        border: '1px solid #f1f5f9'
                      }}
                    >
                      {/* Header Card */}
                      <div className="w-full mb-8">
                        <h4 className="font-extrabold text-slate-900 uppercase tracking-[0.15em] text-lg mb-1.5">
                          {storeSettings?.storeName || 'Toko Kami'}
                        </h4>
                        <p className="text-sm text-slate-500 font-medium">Scan QR Code untuk memesan</p>
                      </div>

                      {/* Area QR Code + Logo */}
                      <div 
                        ref={qrRef} 
                        className="bg-white p-5 rounded-[28px] border border-slate-100 shadow-sm inline-flex relative justify-center items-center"
                      >
                        <QRCodeSVG 
                          value={generatedUrl} 
                          size={240} 
                          level={"H"} 
                          includeMargin={false}
                          imageSettings={storeSettings?.logo ? {
                            src: transparentPixel,
                            height: 52, // Area yg di-excavate dari QR code (akan berbentuk kotak bersiku)
                            width: 52,
                            excavate: true,
                          } : undefined}
                        />
                        
                        {/* Overlay Logo menutupi potongan kasar modul QR */}
                        {storeSettings?.logo && (
                          <div 
                            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white flex items-center justify-center shadow-sm"
                            style={{
                              width: '76px', // Dibuat lebih besar dari area excavate (52px) agar menutupi siku kasarnya
                              height: '76px',
                              borderRadius: '24px', // Membuat tepi lapisan putih melengkung rapi (rounded)
                            }}
                          >
                            <img 
                              src={storeSettings.logo} 
                              alt="Logo" 
                              style={{
                                width: '60px', 
                                height: '60px',
                                borderRadius: '16px', // Membuat ikon gambar di dalamnya juga ikut melengkung
                                objectFit: 'cover'
                              }}
                              crossOrigin="anonymous" 
                            />
                          </div>
                        )}
                      </div>
                      
                      {/* Footer Badge Meja */}
                      <div className="mt-8 w-full flex flex-col items-center">
                        <div className="inline-block bg-slate-900 text-white font-bold px-8 py-3 rounded-2xl text-xl tracking-wide shadow-md shadow-slate-900/20">
                          {formatTableLabel(activeTable)}
                        </div>
                        <p className="text-[11px] text-slate-400 mt-5 font-semibold tracking-wider">POWERED BY MESENAE</p>
                      </div>
                    </div>
                  </div>

                  {/* Actions Area - Beradaptasi dengan Dark/Light Mode */}
                  <div className="w-full max-w-md space-y-4">
                    <div className="flex gap-2 p-1.5 bg-background rounded-xl border border-input shadow-sm">
                      <Input 
                        readOnly 
                        value={generatedUrl} 
                        className="font-mono text-xs border-0 bg-transparent focus-visible:ring-0 truncate text-foreground" 
                      />
                      <Button variant="secondary" size="sm" onClick={copyToClipboard} className="shrink-0 gap-2 h-9 rounded-lg">
                        <Copy className="w-4 h-4" />
                        Salin
                      </Button>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <Button onClick={downloadQrCode} className="w-full gap-2 font-medium h-11 rounded-xl" size="lg">
                        <Download className="w-4 h-4" />
                        Simpan PNG
                      </Button>
                      <Button onClick={printQrCode} variant="outline" className="w-full gap-2 font-medium border-primary/20 hover:bg-primary/5 h-11 rounded-xl" size="lg">
                        <Printer className="w-4 h-4" />
                        Cetak QR Meja
                      </Button>
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>

      </div>

      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent className="max-w-[400px] w-[95vw] rounded-3xl p-6">
          <AlertDialogHeader>
            <div className="w-14 h-14 rounded-full bg-destructive/10 flex items-center justify-center mb-3 mx-auto">
              <Trash2 className="w-7 h-7 text-destructive" />
            </div>
            <AlertDialogTitle className="text-center text-xl font-extrabold">Hapus Meja?</AlertDialogTitle>
            <AlertDialogDescription className="text-center text-base">
              Apakah Anda yakin ingin menghapus <strong>{tableToDelete}</strong> secara permanen?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-6 sm:justify-center flex-row gap-3">
            <AlertDialogCancel className="flex-1 mt-0 rounded-xl h-12 font-bold text-foreground border-border hover:bg-muted">Batal</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleRemoveTable} 
              className="flex-1 rounded-xl h-12 font-bold bg-destructive hover:bg-destructive/90 text-destructive-foreground shadow-lg shadow-destructive/20"
            >
              Ya, Hapus
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
