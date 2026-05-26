import React, { useState, useRef, useMemo } from 'react';
import { Printer, Settings, Tag, Package, Search, Plus } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { useDbQuery, type Product } from '@/hooks/db-hooks';
import { useReactToPrint } from 'react-to-print';
import Barcode from 'react-barcode';
import { cn, FORMAT_IDR } from '@/lib/utils';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

type PaperSize = 'a4' | 'thermal';

interface PrintItem {
  id: string;
  name: string;
  sku: string;
  price: number;
  quantity: number;
}

export default function BarcodePrint() {
  const products = useDbQuery<Product>('products') || [];
  
  // States
  const [printMode, setPrintMode] = useState<'barcode' | 'label'>('barcode');
  const [paperSize, setPaperSize] = useState<PaperSize>('a4');
  
  const [selectedItems, setSelectedItems] = useState<PrintItem[]>([]);
  
  // Custom Input State
  const [customName, setCustomName] = useState('');
  const [customSku, setCustomSku] = useState('');
  const [customPrice, setCustomPrice] = useState('');
  const [customQuantity, setCustomQuantity] = useState('1');

  // Search DB State
  const [searchQuery, setSearchQuery] = useState('');

  // Print Ref
  const printRef = useRef<HTMLDivElement>(null);
  const handlePrint = useReactToPrint({
    content: () => printRef.current,
    documentTitle: `Cetak_${printMode === 'barcode' ? 'Barcode' : 'Label'}`
  });

  // Calculate items to render
  const renderItems = useMemo(() => {
    const items: PrintItem[] = [];
    selectedItems.forEach(item => {
      for (let i = 0; i < item.quantity; i++) {
        items.push(item);
      }
    });
    return items;
  }, [selectedItems]);

  const addCustomItem = () => {
    if (!customName || (!customSku && printMode === 'barcode')) return;
    
    setSelectedItems(prev => [...prev, {
      id: Date.now().toString(),
      name: customName,
      sku: customSku || `SKU-${Math.floor(Math.random() * 10000)}`,
      price: Number(customPrice) || 0,
      quantity: Number(customQuantity) || 1
    }]);

    setCustomName('');
    setCustomSku('');
    setCustomPrice('');
    setCustomQuantity('1');
  };

  const addProductToPrint = (product: Product) => {
    const existing = selectedItems.find(i => i.id === product.id);
    if (existing) {
      setSelectedItems(prev => prev.map(i => i.id === product.id ? { ...i, quantity: i.quantity + 1 } : i));
    } else {
      setSelectedItems(prev => [...prev, {
        id: product.id!,
        name: product.name,
        sku: product.sku || product.id!.slice(0, 8),
        price: product.price,
        quantity: 1
      }]);
    }
  };

  const updateQuantity = (id: string, qty: number) => {
    if (qty <= 0) {
      setSelectedItems(prev => prev.filter(i => i.id !== id));
    } else {
      setSelectedItems(prev => prev.map(i => i.id === id ? { ...i, quantity: qty } : i));
    }
  };

  return (
    <div className="w-full min-h-[calc(100vh-4rem)] pt-2 pb-24 flex flex-col xl:flex-row gap-6 animate-in fade-in duration-500">
      
      {/* Kolom Kiri: Pengaturan & Input */}
      <div className="w-full xl:w-[450px] flex flex-col gap-6 shrink-0">

        <Tabs value={printMode} onValueChange={(v) => setPrintMode(v as any)} className="w-full">
          <TabsList className="grid grid-cols-2 w-full mb-6">
            <TabsTrigger value="barcode" className="font-bold flex gap-2"><Package className="w-4 h-4"/> Barcode</TabsTrigger>
            <TabsTrigger value="label" className="font-bold flex gap-2"><Tag className="w-4 h-4"/> Label Harga</TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Pengaturan Kertas */}
        <Card className="p-4 bg-card/60 backdrop-blur border-border/50">
          <h3 className="text-sm font-bold flex items-center gap-2 mb-4 text-foreground">
            <Settings className="w-4 h-4" /> Pengaturan Cetak
          </h3>
          <div className="flex gap-4">
            <label className="flex items-center gap-2 cursor-pointer p-3 rounded-lg border border-border/50 hover:bg-accent/40 flex-1">
              <input 
                type="radio" 
                name="paper" 
                checked={paperSize === 'a4'} 
                onChange={() => setPaperSize('a4')} 
                className="accent-primary"
              />
              <span className="text-sm font-bold">Kertas A4 Grid</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer p-3 rounded-lg border border-border/50 hover:bg-accent/40 flex-1">
              <input 
                type="radio" 
                name="paper" 
                checked={paperSize === 'thermal'} 
                onChange={() => setPaperSize('thermal')} 
                className="accent-primary"
              />
              <span className="text-sm font-bold">Thermal 50mm</span>
            </label>
          </div>
        </Card>

        {/* Input Kustom */}
        <Card className="p-4 bg-card/60 backdrop-blur border-border/50">
          <h3 className="text-sm font-bold flex items-center gap-2 mb-4 text-foreground">
            <Plus className="w-4 h-4" /> Tambah Manual
          </h3>
          <div className="space-y-3">
            <div>
              <Label className="text-xs">Nama Produk</Label>
              <Input 
                value={customName} 
                onChange={(e) => setCustomName(e.target.value)} 
                placeholder="Contoh: Kopi Susu" 
                className="h-9 mt-1"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Kode / SKU</Label>
                <Input 
                  value={customSku} 
                  onChange={(e) => setCustomSku(e.target.value)} 
                  placeholder="KOP-001" 
                  className="h-9 mt-1"
                />
              </div>
              {printMode === 'label' && (
                <div>
                  <Label className="text-xs">Harga</Label>
                  <Input 
                    type="number" 
                    value={customPrice} 
                    onChange={(e) => setCustomPrice(e.target.value)} 
                    placeholder="25000" 
                    className="h-9 mt-1"
                  />
                </div>
              )}
            </div>
            <div className="flex gap-3">
              <div className="flex-1">
                <Label className="text-xs">Jumlah Cetak</Label>
                <Input 
                  type="number" 
                  min="1" 
                  value={customQuantity} 
                  onChange={(e) => setCustomQuantity(e.target.value)} 
                  className="h-9 mt-1"
                />
              </div>
              <Button onClick={addCustomItem} className="self-end h-9 font-bold">
                Tambah
              </Button>
            </div>
          </div>
        </Card>

        {/* Pilih dari Database */}
        <Card className="p-4 bg-card/60 backdrop-blur border-border/50 flex-1 flex flex-col min-h-[300px]">
          <h3 className="text-sm font-bold flex items-center gap-2 mb-4 text-foreground">
            <Search className="w-4 h-4" /> Pilih dari Database
          </h3>
          <Input 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari nama produk..." 
            className="h-9 mb-3"
          />
          <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 space-y-2">
            {products
              .filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase()))
              .slice(0, 5)
              .map(p => (
              <div key={p.id} className="flex items-center justify-between p-2.5 rounded-lg border border-border/50 bg-background/50 hover:bg-accent/30 transition-colors">
                <div className="min-w-0 flex-1 mr-3">
                  <p className="text-sm font-bold truncate">{p.name}</p>
                  <p className="text-xs text-muted-foreground truncate font-mono">{p.sku || '-'}</p>
                </div>
                <Button variant="outline" size="sm" className="shrink-0 h-7 text-xs font-bold" onClick={() => addProductToPrint(p)}>
                  + Pilih
                </Button>
              </div>
            ))}
          </div>
        </Card>

      </div>

      {/* Kolom Kanan: Pratinjau & Action */}
      <div className="flex-1 flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-black">Pratinjau Kertas</h2>
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => setSelectedItems([])} className="font-bold" disabled={selectedItems.length === 0}>
              Kosongkan
            </Button>
            <Button onClick={handlePrint} className="font-bold shadow-lg" disabled={renderItems.length === 0}>
              <Printer className="w-4 h-4 mr-2" /> Cetak Sekarang
            </Button>
          </div>
        </div>
        
        {/* Daftar yang Dipilih (List) */}
        {selectedItems.length > 0 && (
          <div className="flex gap-2 overflow-x-auto pb-2 custom-scrollbar">
            {selectedItems.map(item => (
              <div key={item.id} className="flex items-center bg-accent/40 border border-border/50 rounded-lg px-3 py-1.5 shrink-0 gap-3">
                <div className="min-w-0 max-w-[120px]">
                  <p className="text-xs font-bold truncate">{item.name}</p>
                </div>
                <div className="flex items-center gap-1.5 border-l border-border/50 pl-3">
                  <button onClick={() => updateQuantity(item.id, item.quantity - 1)} className="w-5 h-5 flex items-center justify-center bg-background rounded text-xs font-bold hover:bg-destructive hover:text-white">-</button>
                  <span className="text-xs font-bold w-6 text-center">{item.quantity}</span>
                  <button onClick={() => updateQuantity(item.id, item.quantity + 1)} className="w-5 h-5 flex items-center justify-center bg-background rounded text-xs font-bold hover:bg-primary hover:text-primary-foreground">+</button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Kertas Print Area */}
        <div className="flex-1 bg-slate-200 dark:bg-slate-800 rounded-2xl overflow-hidden border border-border/50 flex items-start justify-center p-8 overflow-y-auto relative">
          {renderItems.length === 0 ? (
            <div className="m-auto text-center opacity-40">
              <Printer className="w-16 h-16 mx-auto mb-4" />
              <p className="text-lg font-bold">Belum ada item yang dipilih</p>
            </div>
          ) : (
            <div 
              ref={printRef}
              className={cn(
                "bg-white shadow-xl flex",
                paperSize === 'a4' ? "w-[210mm] min-h-[297mm] p-6 flex-wrap content-start gap-4" : "w-[50mm] flex-col gap-2 p-2"
              )}
            >
              {renderItems.map((item, i) => (
                <div 
                  key={i} 
                  className={cn(
                    "flex flex-col items-center justify-center bg-white text-black overflow-hidden border border-dashed border-gray-300",
                    paperSize === 'a4' 
                      ? "w-[48mm] h-[25mm] p-1" // Layout A4 (grid)
                      : "w-full h-[30mm] p-1 shrink-0" // Layout Thermal (single column)
                  )}
                >
                  <p className="text-[9px] font-bold text-center leading-tight truncate w-full px-1">{item.name}</p>
                  
                  {printMode === 'barcode' ? (
                    <div className="mt-0.5 scale-[0.7] transform origin-top">
                      <Barcode 
                        value={item.sku} 
                        width={1.5} 
                        height={30} 
                        fontSize={12} 
                        margin={0} 
                        background="transparent" 
                        lineColor="#000000"
                        displayValue={true}
                      />
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center flex-1 w-full">
                      <p className="text-[14px] font-black tracking-tight">{FORMAT_IDR(item.price)}</p>
                      <p className="text-[7px] text-gray-500 font-mono mt-0.5">{item.sku}</p>
                    </div>
                  )}
                </div>
              ))}
              
              <style type="text/css" media="print">
                {`
                  @page { size: ${paperSize === 'a4' ? 'A4' : '50mm 30mm'}; margin: 0; }
                  body { -webkit-print-color-adjust: exact; background: white; }
                `}
              </style>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
