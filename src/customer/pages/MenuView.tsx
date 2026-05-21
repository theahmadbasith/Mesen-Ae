import React, { ChangeEvent, JSX } from 'react';
import { Search, ChevronLeft, Plus, PackageOpen, Image as ImageIcon } from 'lucide-react';
import { toast } from 'sonner';

import { FORMAT_IDR } from '@/lib/utils';
import { useDbQuery } from '@/hooks/db-hooks';

// ==========================================
// Tipe Data & Interfaces (TypeScript)
// ==========================================

export interface CategoryItem {
  id: number | string;
  name: string;
  icon?: string;
  [key: string]: any;
}

export interface ProductItem {
  id: number | string;
  categoryId: number;
  name: string;
  stock: number;
  price: number;
  photo?: string;
  [key: string]: any;
}

export interface MenuViewProps {
  setView: (view: string) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  selectedCategory: string;
  setSelectedCategory: (category: string) => void;
  setSelectedItem: (item: ProductItem) => void;
  addToCart?: (item: any, qty: number, notes: string, variants: any[]) => void;
  cartLength?: number;
}

export default function MenuView({
  setView,
  searchQuery,
  setSearchQuery,
  selectedCategory,
  setSelectedCategory,
  setSelectedItem,
  addToCart,
  cartLength = 0,
}: MenuViewProps): JSX.Element {
  
  // Mengambil data dengan menyematkan asersi tipe (Type Assertion) yang tepat
  const categories = (useDbQuery('categories') as CategoryItem[]) ?? [];
  const products = (useDbQuery('products') as ProductItem[]) ?? [];
  const loading = categories.length === 0 && products.length === 0;

  const filteredMenu = products.filter((item) => {
    const matchCat = selectedCategory === 'all' || item.categoryId === Number(selectedCategory);
    const matchSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchCat && matchSearch;
  });

  // Render Skeleton saat Loading
  if (loading) {
    return (
      <div className="flex-1 flex flex-col bg-slate-50 dark:bg-slate-950">
        {/* Header Skeleton */}
        <div className="sticky top-0 z-20 bg-white dark:bg-slate-900 shadow-sm px-4 pt-6 pb-4 space-y-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-slate-200 dark:bg-slate-800 animate-pulse shrink-0" />
            <div className="flex-1 h-12 rounded-2xl bg-slate-200 dark:bg-slate-800 animate-pulse" />
          </div>
          <div className="flex gap-3 overflow-hidden">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-9 w-24 rounded-full bg-slate-200 dark:bg-slate-800 animate-pulse shrink-0" />
            ))}
          </div>
        </div>
        
        {/* Product List Skeleton */}
        <div className="flex-1 overflow-y-auto p-4 pb-32 space-y-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="bg-white dark:bg-slate-900 rounded-[1.5rem] p-3 flex gap-4 border border-slate-100 dark:border-slate-800">
              <div className="w-28 h-28 rounded-xl bg-slate-200 dark:bg-slate-800 animate-pulse shrink-0" />
              <div className="flex-1 flex flex-col py-1 justify-between">
                <div className="space-y-2">
                  <div className="h-5 bg-slate-200 dark:bg-slate-800 animate-pulse rounded w-full" />
                  <div className="h-4 bg-slate-200 dark:bg-slate-800 animate-pulse rounded w-2/3" />
                </div>
                <div className="flex justify-between items-end">
                  <div className="h-6 bg-slate-200 dark:bg-slate-800 animate-pulse rounded w-24" />
                  <div className="w-9 h-9 rounded-full bg-slate-200 dark:bg-slate-800 animate-pulse" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-slate-50 dark:bg-slate-950">
      
      {/* Header Sticky Container */}
      <div className="sticky top-0 z-20 bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl px-4 pt-6 pb-3 border-b border-slate-200/60 dark:border-slate-800/60 shadow-[0_4px_20px_rgba(0,0,0,0.02)]">
        
        {/* Nav & Search Bar */}
        <div className="flex items-center gap-3 mb-4">
          <button 
            onClick={() => setView('landing')} 
            className="w-11 h-11 flex items-center justify-center bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-full active:scale-95 transition-all shrink-0"
            aria-label="Kembali"
          >
            <ChevronLeft size={22} className="text-slate-700 dark:text-slate-300" />
          </button>
          
          <div className="flex-1 relative group">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={18} />
            <input 
              type="text" 
              placeholder="Cari produk atau layanan..." 
              value={searchQuery}
              onChange={(e: ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-100 hover:bg-slate-200/50 dark:bg-slate-800/80 dark:text-white pl-11 pr-4 py-3 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 border border-transparent focus:border-blue-500/30 transition-all placeholder-slate-400 font-medium"
            />
          </div>
        </div>

        {/* Categories Horizontal Scroll */}
        <div className="flex gap-2.5 overflow-x-auto pb-1 custom-scrollbar-hide" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
          <button 
            onClick={() => setSelectedCategory('all')}
            className={`px-5 py-2 rounded-full text-sm font-semibold whitespace-nowrap transition-all flex-shrink-0 ${
              selectedCategory === 'all' 
                ? 'bg-slate-900 dark:bg-blue-600 text-white shadow-md' 
                : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-50'
            }`}
          >
            Semua
          </button>
          {categories.map((cat) => (
            <button 
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id.toString())}
              className={`px-5 py-2 rounded-full text-sm font-semibold whitespace-nowrap transition-all flex items-center gap-2 flex-shrink-0 ${
                selectedCategory === cat.id.toString() 
                  ? 'bg-slate-900 dark:bg-blue-600 text-white shadow-md' 
                  : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-50'
              }`}
            >
              {cat.icon && <span>{cat.icon}</span>}
              <span>{cat.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Product List */}
      <div className="flex-1 overflow-y-auto p-4 pb-[120px]">
        
        {/* Results Counter */}
        <div className="mb-4 flex items-center justify-between text-sm text-slate-500 dark:text-slate-400 px-1">
          <span className="font-medium">{filteredMenu.length} Produk ditemukan</span>
        </div>
        
        {/* Grid/List Container */}
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3.5 mt-2">
          {filteredMenu.map((item) => {
            const isOutOfStock = item.stock <= 0;
            
            return (
              <div 
                key={item.id} 
                onClick={() => {
                  if (isOutOfStock) return;
                  if (cartLength === 0) {
                    setSelectedItem(item);
                  } else if (item.variants && item.variants.length > 0) {
                    setSelectedItem(item);
                  } else {
                    if (addToCart) {
                      addToCart(item, 1, '', []);
                      toast.success(`${item.name} ditambahkan ke keranjang`);
                    } else {
                      setSelectedItem(item);
                    }
                  }
                }}
                className={`bg-white dark:bg-slate-900 rounded-[1.5rem] p-3 border transition-all flex flex-col ${
                  isOutOfStock 
                    ? 'border-slate-100 dark:border-slate-800 opacity-60 grayscale' 
                    : 'border-slate-100 dark:border-slate-800 shadow-sm hover:shadow-md hover:border-blue-200 dark:hover:border-blue-900 cursor-pointer active:scale-[0.98]'
                }`}
              >
                {/* Product Image */}
                <div className="h-32 w-full rounded-xl overflow-hidden relative flex-shrink-0 bg-slate-100 dark:bg-slate-800 flex items-center justify-center border border-slate-50 dark:border-slate-800/50 mb-3">
                  {item.photo ? (
                    <img src={item.photo} alt={item.name} loading="lazy" className="w-full h-full object-cover" />
                  ) : (
                    <ImageIcon size={32} strokeWidth={1.5} className="text-slate-300 dark:text-slate-600" />
                  )}
                  {isOutOfStock && (
                    <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-[2px] flex items-center justify-center">
                      <span className="text-white text-[10px] font-bold bg-slate-800 px-2.5 py-1 rounded-md uppercase tracking-wider shadow-sm">
                        Habis
                      </span>
                    </div>
                  )}
                </div>
                
                {/* Product Info */}
                <div className="flex-1 flex flex-col justify-between px-1">
                  <div>
                    <h4 className="font-bold text-sm leading-snug text-slate-900 dark:text-white line-clamp-2 mb-1.5">
                      {item.name}
                    </h4>
                    {/* Show stock quantity if low */}
                    {!isOutOfStock && item.stock < 10 && (
                      <span className="text-[10px] font-semibold text-rose-600 bg-rose-50 dark:bg-rose-500/10 px-2 py-0.5 rounded-md inline-block">
                        Sisa {item.stock}
                      </span>
                    )}
                  </div>
                  
                  <div className="flex justify-between items-center mt-2 gap-2">
                    <p className="font-extrabold text-blue-600 dark:text-blue-400 text-[13px] sm:text-[14px]">
                      {FORMAT_IDR(item.price)}
                    </p>
                    <button 
                      type="button"
                      onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
                        e.stopPropagation();
                        if (isOutOfStock) return;
                        if (cartLength === 0) {
                          setSelectedItem(item);
                        } else if (item.variants && item.variants.length > 0) {
                          setSelectedItem(item);
                        } else {
                          if (addToCart) {
                            addToCart(item, 1, '', []);
                            toast.success(`${item.name} ditambahkan ke keranjang`);
                          } else {
                            setSelectedItem(item);
                          }
                        }
                      }}
                      disabled={isOutOfStock}
                      className={`w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center active:scale-90 transition-transform flex-shrink-0 ${
                        isOutOfStock 
                          ? 'bg-slate-100 dark:bg-slate-800 text-slate-400' 
                          : 'bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 hover:bg-blue-600 hover:text-white dark:hover:bg-blue-500'
                      }`}
                      aria-label={`Tambah ${item.name}`}
                    >
                      <Plus size={18} strokeWidth={2.5} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Empty State */}
        {filteredMenu.length === 0 && (
          <div className="flex flex-col items-center justify-center py-24 text-center px-4">
            <div className="w-20 h-20 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mb-4">
              <PackageOpen size={36} strokeWidth={1.5} className="text-slate-400" />
            </div>
            <h3 className="font-bold text-slate-900 dark:text-white text-lg mb-1">
              Produk Tidak Ditemukan
            </h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 max-w-[250px]">
              Coba gunakan kata kunci pencarian lain atau pilih kategori Semua.
            </p>
            <button
              onClick={() => {
                setSearchQuery('');
                setSelectedCategory('all');
              }}
              className="mt-6 px-6 py-2.5 bg-slate-900 dark:bg-blue-600 text-white text-sm font-semibold rounded-full hover:bg-slate-800 active:scale-95 transition-all"
            >
              Reset Filter
            </button>
          </div>
        )}
      </div>

      {/* Internal style inline untuk menyembunyikan scrollbar di webkit */}
      <style dangerouslySetInnerHTML={{__html: `
        .custom-scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
      `}} />
    </div>
  );
}
