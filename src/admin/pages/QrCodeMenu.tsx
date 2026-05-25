import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { QrCode, Download, Printer, Copy, Plus, Trash2, LayoutGrid, Store, CheckCircle2, Link as LinkIcon, Save } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { toast } from 'sonner';
import { useDbQuery, dbInsert, dbUpdate } from '@/hooks/db-hooks';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';

export default function QrCodeMenu() {
  const storeSettings = useDbQuery<any>('storeSettings')?.[0];
  const [tables, setTables] = useState<string[]>([]);
  const [newTable, setNewTable] = useState('');
  const [activeTable, setActiveTable] = useState<string>('');
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [tableToDelete, setTableToDelete] = useState<string | null>(null);
  const [customerUrl, setCustomerUrl] = useState('');
  const qrRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!storeSettings) {
      setTables([]);
      return;
    }
    const existingTables = Array.isArray(storeSettings.tables) ? storeSettings.tables : [];
    setTables(existingTables);
    if (!activeTable) {
      if (existingTables.length > 0) setActiveTable(existingTables[0]);
      else setActiveTable('1'); // Default fallback
    }
    
    // Set customer URL
    if (storeSettings.customerUrl) {
      setCustomerUrl(storeSettings.customerUrl);
    } else if (!customerUrl) {
      setCustomerUrl(window.location.origin);
    }
  }, [storeSettings, activeTable]);

  const handleSaveCustomerUrl = async () => {
    let url = customerUrl.trim();
    if (!url) {
      toast.error('URL Customer tidak boleh kosong');
      return;
    }
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = 'https://' + url;
      setCustomerUrl(url);
    }
    
    try {
      if (storeSettings?.id) {
        await dbUpdate('storeSettings', storeSettings.id, { customerUrl: url });
        toast.success('URL Customer berhasil disimpan');
      } else {
        toast.error('Pengaturan toko belum diinisialisasi');
      }
    } catch (e: any) {
      toast.error('Gagal menyimpan URL Customer');
    }
  };

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
    
    // Case-insensitive duplicate check
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

  // Optimasi URL generation dengan useMemo
  const generatedUrl = useMemo(() => {
    let base = storeSettings?.customerUrl || customerUrl || window.location.origin;
    if (base.endsWith('/')) base = base.slice(0, -1);
    if (!base.startsWith('http')) base = 'https://' + base;
    return `${base}/?table=${encodeURIComponent(activeTable || '1')}`;
  }, [activeTable, customerUrl, storeSettings?.customerUrl]);

  const copyToClipboard = () => {
    navigator.clipboard.writeText(generatedUrl);
    toast.success('Tautan berhasil disalin ke clipboard');
  };

  const downloadQrCode = () => {
    if (!qrRef.current) return;
    const svg = qrRef.current.querySelector('svg');
    if (!svg) return;
    
    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    const img = new Image();
    
    img.onload = () => {
      canvas.width = img.width + 64; 
      canvas.height = img.height + 64;
      if (ctx) {
        // Background putih
        ctx.fillStyle = "white";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        // Gambar QR
        ctx.drawImage(img, 32, 32);
        
        const pngFile = canvas.toDataURL("image/png");
        const downloadLink = document.createElement("a");
        downloadLink.download = `QR_Meja_${activeTable || '1'}.png`;
        downloadLink.href = pngFile;
        downloadLink.click();
        toast.success('QR Code berhasil diunduh');
      }
    };
    
    img.src = "data:image/svg+xml;base64," + btoa(unescape(encodeURIComponent(svgData)));
  };

  const printQrCode = () => {
    if (!qrRef.current) return;
    const svg = qrRef.current.querySelector('svg');
    if (!svg) return;

    const storeName = storeSettings?.storeName || 'MesenAe Resto';
    const printWindow = window.open('', '', 'width=800,height=900');
    
    if (printWindow) {
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Cetak QR Code - Meja ${activeTable}</title>
            <style>
              @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;800&display=swap');
              
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
                border: 2px solid #e2e8f0;
                border-radius: 24px;
                padding: 40px;
                text-align: center;
                max-width: 400px;
                box-shadow: 0 10px 25px rgba(0,0,0,0.05);
              }
              .store-name {
                font-size: 24px;
                font-weight: 800;
                color: #0f172a;
                margin-bottom: 8px;
                text-transform: uppercase;
                letter-spacing: 1px;
              }
              .instruction {
                font-size: 15px;
                color: #64748b;
                margin-bottom: 32px;
              }
              .qr-wrapper {
                background: #ffffff;
                padding: 20px;
                border-radius: 16px;
                border: 2px dashed #cbd5e1;
                display: inline-block;
                margin-bottom: 24px;
              }
              .table-badge {
                background: #0f172a;
                color: white;
                font-size: 32px;
                font-weight: 800;
                padding: 12px 40px;
                border-radius: 100px;
                display: inline-block;
                margin-bottom: 20px;
              }
              .footer-text {
                font-size: 12px;
                color: #94a3b8;
                margin-top: 24px;
                border-top: 1px solid #f1f5f9;
                padding-top: 16px;
              }
              @media print {
                body { background-color: white; }
                .print-container { border: 1px solid #000; box-shadow: none; }
                .table-badge { background: #000; color: #fff; }
              }
            </style>
          </head>
          <body>
            <div class="print-container">
              <div class="store-name">${storeName}</div>
              <div class="instruction">Scan QR Code ini untuk melihat menu dan memesan langsung dari HP Anda.</div>
              
              <div class="qr-wrapper">
                ${svg.outerHTML}
              </div>
              
              ${activeTable ? `<div class="table-badge">MEJA ${activeTable}</div>` : ''}
              
              <div class="footer-text">Powered by MesenAe Self-Order System</div>
            </div>
          </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.focus();
      
      // Delay untuk memastikan SVG ter-render sempurna sebelum print dialog muncul
      setTimeout(() => {
        printWindow.print();
        printWindow.close();
      }, 500);
    }
  };

  const formatTableLabel = (t: string | number) => {
    const s = String(t).trim();
    if (s.toLowerCase() === 'bawa pulang') return 'Bawa Pulang';
    return /^meja\s+/i.test(s) ? s : `Meja ${s}`;
  };

  return (
    <div className="px-4 pt-6 pb-24 space-y-6 w-full mx-auto animate-in fade-in duration-300">
      {/* Page Content Grid */}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Kolom Kiri: Manajemen Meja */}
        <div className="lg:col-span-5 space-y-6">
          <Card className="shadow-sm border-border/50">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Store className="w-5 h-5 text-muted-foreground" />
                Daftar Meja Anda
              </CardTitle>
              <CardDescription>Tambahkan nomor atau nama meja baru</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col gap-4 mb-6">
                <div className="flex gap-3 items-end">
                  <div className="space-y-2 flex-1">
                    <label className="text-xs font-semibold text-muted-foreground uppercase flex items-center gap-1.5">
                      <LinkIcon className="w-3.5 h-3.5" /> URL Aplikasi Customer
                    </label>
                    <Input 
                      type="text"
                      placeholder="https://mesenae-customer.vercel.app" 
                      value={customerUrl}
                      onChange={e => setCustomerUrl(e.target.value)}
                      className="bg-muted/50 focus-visible:bg-background"
                    />
                  </div>
                  <Button onClick={handleSaveCustomerUrl} variant="outline" className="shrink-0 gap-2 font-medium border-primary/20 hover:bg-primary/5 text-primary">
                    <Save className="w-4 h-4" />
                    Simpan
                  </Button>
                </div>
                
                <div className="w-full h-[1px] bg-border/50 my-1" />
                
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
          <Card className="shadow-sm border-border/50 h-full flex flex-col overflow-hidden">
            <div className="bg-muted/30 px-6 py-4 border-b border-border/50">
              <CardTitle className="text-lg flex items-center gap-2">
                <QrCode className="w-5 h-5 text-muted-foreground" />
                Live Preview QR Code
              </CardTitle>
            </div>
            
            <CardContent className="p-8 flex-1 flex flex-col items-center justify-center relative">
              {!activeTable ? (
                <div className="text-center space-y-3 opacity-50">
                  <LayoutGrid className="w-16 h-16 mx-auto text-muted-foreground" />
                  <p className="text-sm font-medium">Pilih atau tambah meja terlebih dahulu</p>
                </div>
              ) : (
                <>
                  {/* Visualisasi Standee/Print Preview */}
                  <div className="bg-white p-8 rounded-3xl shadow-xl shadow-primary/5 mb-8 relative border border-border/50 transform transition-all hover:border-primary/40 hover:shadow-2xl hover:shadow-primary/10">
                    <div className="text-center mb-6">
                      <h4 className="font-bold text-gray-900 uppercase tracking-widest text-sm mb-1">
                        {storeSettings?.storeName || 'Toko Kami'}
                      </h4>
                      <p className="text-xs text-gray-500">Scan untuk memesan</p>
                    </div>

                    <div 
                      ref={qrRef} 
                      className="bg-white p-4 rounded-2xl border-2 border-dashed border-gray-200"
                    >
                      <QRCodeSVG 
                        value={generatedUrl} 
                        size={240} 
                        level={"H"}
                        includeMargin={false}
                        className="w-full h-full"
                        imageSettings={{
                          src: "/icon-192.png",
                          height: 56,
                          width: 56,
                          excavate: true,
                        }}
                      />
                    </div>
                    
                    <div className="mt-6 text-center">
                      <div className="inline-block bg-gray-900 text-white font-bold px-6 py-2 rounded-full text-lg">
                        {formatTableLabel(activeTable)}
                      </div>
                    </div>
                  </div>

                  {/* Actions Area */}
                  <div className="w-full max-w-md space-y-4">
                    <div className="flex gap-2 p-1 bg-muted/50 rounded-lg border border-border/50">
                      <Input 
                        readOnly 
                        value={generatedUrl} 
                        className="font-mono text-xs border-0 bg-transparent focus-visible:ring-0 truncate" 
                      />
                      <Button variant="secondary" size="sm" onClick={copyToClipboard} className="shrink-0 gap-2">
                        <Copy className="w-4 h-4" />
                        Salin
                      </Button>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <Button onClick={downloadQrCode} className="w-full gap-2 font-medium" size="lg">
                        <Download className="w-4 h-4" />
                        Simpan PNG
                      </Button>
                      <Button onClick={printQrCode} variant="outline" className="w-full gap-2 font-medium border-primary/20 hover:bg-primary/5" size="lg">
                        <Printer className="w-4 h-4" />
                        Cetak Standee
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
        <AlertDialogContent className="max-w-[400px] w-[95vw] rounded-2xl p-6">
          <AlertDialogHeader>
            <div className="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center mb-2 mx-auto">
              <Trash2 className="w-6 h-6 text-destructive" />
            </div>
            <AlertDialogTitle className="text-center text-xl font-extrabold">Hapus Meja?</AlertDialogTitle>
            <AlertDialogDescription className="text-center">
              Apakah Anda yakin ingin menghapus meja <strong>{tableToDelete}</strong> secara permanen?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-6 sm:justify-center flex-row gap-3">
            <AlertDialogCancel className="flex-1 mt-0 rounded-xl h-11 font-bold">Batal</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleRemoveTable} 
              className="flex-1 rounded-xl h-11 font-bold bg-destructive hover:bg-destructive/90 text-white shadow-md shadow-destructive/20"
            >
              Ya, Hapus
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
