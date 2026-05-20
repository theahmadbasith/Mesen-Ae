import React, { useState, useEffect, useRef, JSX } from 'react';
import { X, User, Hash, ArrowRight, UtensilsCrossed } from 'lucide-react';

// ==========================================
// Tipe Data & Interfaces (TypeScript)
// ==========================================

export interface CustomerInfoModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (customerName: string, tableNumber: string) => void;
  initialCustomerName?: string;
  initialTableNumber?: string;
}

export default function CustomerInfoModal({
  isOpen,
  onClose,
  onSubmit,
  initialCustomerName = '',
  initialTableNumber = '',
}: CustomerInfoModalProps): JSX.Element | null {
  
  const [customerName, setCustomerName] = useState<string>(initialCustomerName);
  const [tableNumber, setTableNumber] = useState<string>(initialTableNumber);
  const [isVisible, setIsVisible] = useState<boolean>(false);
  
  const nameInputRef = useRef<HTMLInputElement>(null);

  // Handle animasi dan auto-focus
  useEffect(() => {
    if (isOpen) {
      // Set state customer dari initial saat modal dibuka
      setCustomerName(initialCustomerName);
      setTableNumber(initialTableNumber);
      
      setIsVisible(true);
      document.body.style.overflow = 'hidden';
      
      // Auto-focus ke input nama setelah animasi selesai
      const timer = setTimeout(() => {
        nameInputRef.current?.focus();
      }, 300);

      return () => clearTimeout(timer);
    } else {
      setIsVisible(false);
      document.body.style.overflow = 'unset';
    }
    
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, initialCustomerName, initialTableNumber]);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>): void => {
    e.preventDefault();
    if (customerName.trim()) {
      onSubmit(customerName.trim(), tableNumber.trim());
      onClose();
    }
  };

  if (!isOpen && !isVisible) return null;

  return (
    <div 
      className={`fixed inset-0 z-[100] flex items-center justify-center p-4 transition-all duration-300 ${
        isVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'
      }`}
    >
      {/* Backdrop with strong blur */}
      <div
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-md transition-opacity"
        onClick={onClose}
      />

      {/* Modal Content - Animated from bottom/center */}
      <div
        className={`relative w-full max-w-sm bg-white rounded-[2rem] shadow-2xl overflow-hidden transform transition-all duration-300 ease-out ${
          isVisible ? 'translate-y-0 scale-100' : 'translate-y-8 scale-95'
        }`}
      >
        {/* Close Button overlay */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 p-2 text-slate-400 hover:text-slate-600 bg-slate-50 hover:bg-slate-100 rounded-full transition-colors"
          aria-label="Tutup modal"
        >
          <X size={20} />
        </button>

        {/* Header Icon & Text */}
        <div className="pt-8 px-6 pb-2 text-center">
          <div className="mx-auto inline-flex h-16 w-16 items-center justify-center rounded-full bg-blue-50 text-blue-600 mb-4 shadow-inner">
            <UtensilsCrossed size={28} strokeWidth={1.5} />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Data Pesanan</h2>
          <p className="text-sm text-slate-500 mt-2">
            Silakan isi nama Anda untuk memesan. Nomor meja telah disesuaikan otomatis oleh sistem.
          </p>
        </div>

        {/* Form Section */}
        <form onSubmit={handleSubmit} className="p-6 pt-4 space-y-4">
          
          {/* Input Nama */}
          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-slate-700 ml-1">
              Nama Pemesan
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
                <User size={18} />
              </div>
              <input
                ref={nameInputRef}
                type="text"
                value={customerName}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCustomerName(e.target.value)}
                placeholder="Cth: Budi..."
                className="w-full pl-11 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                required
              />
            </div>
          </div>

          {/* Input Nomor Meja */}
          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-slate-700 ml-1">
              Nomor Meja
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
                <Hash size={18} />
              </div>
              <input
                type="text"
                value={tableNumber}
                disabled={true}
                placeholder="Otomatis oleh sistem"
                className="w-full pl-11 pr-4 py-3.5 border rounded-2xl text-slate-500 bg-slate-100 border-slate-200 font-semibold focus:outline-none transition-all cursor-not-allowed select-none"
              />
            </div>
            {initialTableNumber === 'Bawa Pulang' ? (
              <p className="text-[11px] text-orange-600 dark:text-orange-400 ml-1 font-bold">
                *Pesanan Anda akan dicatat sebagai Take Away (Bawa Pulang).
              </p>
            ) : initialTableNumber ? (
              <p className="text-[11px] text-emerald-600 dark:text-emerald-500 ml-1 font-semibold">
                *Nomor meja terisi otomatis dari sistem.
              </p>
            ) : null}
          </div>

          {/* Submit Button */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={!customerName.trim()}
              className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white font-semibold py-4 rounded-2xl shadow-lg shadow-blue-600/20 hover:bg-blue-700 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100"
            >
              Lanjut ke Menu
              <ArrowRight size={18} />
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}
