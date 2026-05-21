import React, { useState } from 'react';
import { ChevronLeft, Users, List, Calculator } from 'lucide-react';
import { FORMAT_IDR } from '@/lib/utils';
import { CartItem } from './CartView';

interface SplitViewProps {
  setView: (view: string) => void;
  cart: CartItem[];
  totals: { total: number };
}

export default function SplitView({ setView, cart, totals }: SplitViewProps) {
  const [mode, setMode] = useState<'evenly' | 'items'>('evenly');
  const [peopleCount, setPeopleCount] = useState<number>(2);

  // Untuk split per item
  const [assignments, setAssignments] = useState<Record<string, string>>({}); // cartId -> personName
  const [newPerson, setNewPerson] = useState('');
  const [people, setPeople] = useState<string[]>(['Teman 1', 'Teman 2']);

  const addPerson = () => {
    if (newPerson.trim() && !people.includes(newPerson.trim())) {
      setPeople([...people, newPerson.trim()]);
      setNewPerson('');
    }
  };

  const assignItem = (cartId: string | number, person: string) => {
    setAssignments(prev => ({ ...prev, [cartId]: person }));
  };

  const getPersonTotal = (person: string) => {
    let sum = 0;
    cart.forEach(item => {
      if (assignments[item.cartId] === person) {
        const variantTotal = item.selectedVariants?.reduce((s, a) => s + a.price, 0) || 0;
        sum += (item.price + variantTotal) * item.qty;
      }
    });
    // Tambahkan proporsi pajak/layanan secara kasar
    if (totals.total > 0) {
      const sub = cart.reduce((acc, curr) => {
        const v = curr.selectedVariants?.reduce((s, a) => s + a.price, 0) || 0;
        return acc + (curr.price + v) * curr.qty;
      }, 0);
      if (sub > 0) {
        const ratio = totals.total / sub;
        sum = sum * ratio;
      }
    }
    return sum;
  };

  return (
    <div className="flex-1 flex flex-col bg-slate-50 dark:bg-slate-950 min-h-screen">
      <div className="sticky top-0 z-20 bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl px-4 pt-6 pb-4 border-b border-slate-200/60 dark:border-slate-800/60 flex items-center shadow-[0_4px_20px_rgba(0,0,0,0.02)]">
        <button 
          onClick={() => setView('cart')} 
          className="w-11 h-11 flex items-center justify-center bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-full active:scale-95 transition-all shrink-0"
        >
          <ChevronLeft size={22} className="text-slate-700 dark:text-slate-300" />
        </button>
        <h1 className="flex-1 text-center font-bold text-lg text-slate-900 dark:text-white pr-11">
          Kalkulator Split Bill
        </h1>
      </div>

      <div className="flex-1 p-5 space-y-6 overflow-y-auto pb-[100px]">
        {/* Mode Selector */}
        <div className="flex bg-slate-200/50 dark:bg-slate-800/50 rounded-xl p-1">
          <button 
            onClick={() => setMode('evenly')}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-bold transition-all ${mode === 'evenly' ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'}`}
          >
            <Users size={16} /> Bagi Rata
          </button>
          <button 
            onClick={() => setMode('items')}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-bold transition-all ${mode === 'items' ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'}`}
          >
            <List size={16} /> Per Menu
          </button>
        </div>

        <div className="bg-gradient-to-br from-indigo-600 to-purple-700 rounded-[1.5rem] p-6 text-white text-center shadow-lg">
          <p className="text-indigo-100 text-sm mb-1">Total Tagihan Saat Ini</p>
          <h2 className="text-4xl font-black tracking-tight">{FORMAT_IDR(totals.total)}</h2>
        </div>

        {mode === 'evenly' ? (
          <div className="bg-white dark:bg-slate-900 rounded-[1.5rem] p-5 border border-slate-100 dark:border-slate-800 shadow-sm space-y-5">
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 block">Dibagi Berapa Orang?</label>
              <div className="flex items-center gap-4">
                <button 
                  onClick={() => setPeopleCount(Math.max(2, peopleCount - 1))}
                  className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-xl font-bold text-slate-700 dark:text-slate-300"
                >-</button>
                <div className="flex-1 text-center text-3xl font-black text-slate-900 dark:text-white">{peopleCount}</div>
                <button 
                  onClick={() => setPeopleCount(peopleCount + 1)}
                  className="w-12 h-12 rounded-xl bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center text-xl font-bold text-blue-600 dark:text-blue-400"
                >+</button>
              </div>
            </div>
            
            <div className="h-[1px] bg-slate-100 dark:bg-slate-800" />
            
            <div className="text-center bg-blue-50 dark:bg-blue-900/20 rounded-xl p-4">
              <p className="text-sm font-bold text-slate-600 dark:text-slate-400 mb-1">Masing-masing membayar:</p>
              <p className="text-2xl font-black text-blue-600 dark:text-blue-400">{FORMAT_IDR(totals.total / peopleCount)}</p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="bg-white dark:bg-slate-900 rounded-[1.5rem] p-5 border border-slate-100 dark:border-slate-800 shadow-sm">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 block">Tambah Anggota Patungan</p>
              <div className="flex gap-2">
                <input 
                  type="text" 
                  value={newPerson}
                  onChange={e => setNewPerson(e.target.value)}
                  placeholder="Nama Teman" 
                  className="flex-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2 text-sm outline-none focus:border-blue-500"
                />
                <button onClick={addPerson} className="bg-blue-600 text-white px-4 rounded-xl font-bold text-sm">Tambah</button>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-[1.5rem] p-5 border border-slate-100 dark:border-slate-800 shadow-sm space-y-4">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Pilih Siapa Bayar Apa</p>
              {cart.map(item => (
                <div key={item.cartId} className="flex flex-col gap-2 border-b border-slate-100 dark:border-slate-800 pb-3 last:border-0 last:pb-0">
                  <div className="flex justify-between">
                    <p className="font-bold text-sm text-slate-900 dark:text-white">{item.name} x{item.qty}</p>
                    <p className="font-bold text-sm text-blue-600 dark:text-blue-400">
                      {FORMAT_IDR((item.price + (item.selectedVariants?.reduce((s,a) => s+a.price, 0) || 0)) * item.qty)}
                    </p>
                  </div>
                  <div className="flex gap-2 overflow-x-auto custom-scrollbar-hide pb-1">
                    {people.map(p => (
                      <button 
                        key={p} 
                        onClick={() => assignItem(item.cartId, p)}
                        className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors ${assignments[item.cartId] === p ? 'bg-blue-600 border-blue-600 text-white' : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'}`}
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-[1.5rem] p-5 border border-slate-100 dark:border-slate-800 shadow-sm space-y-3">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Ringkasan Patungan</p>
              {people.map(p => {
                const amount = getPersonTotal(p);
                if (amount === 0) return null;
                return (
                  <div key={p} className="flex justify-between items-center bg-slate-50 dark:bg-slate-800 p-3 rounded-xl">
                    <span className="font-bold text-slate-700 dark:text-slate-300 text-sm">{p}</span>
                    <span className="font-black text-blue-600 dark:text-blue-400">{FORMAT_IDR(amount)}</span>
                  </div>
                );
              })}
              <p className="text-[10px] text-slate-400 text-center mt-2 italic">*Total termasuk proporsi pajak dan layanan (jika ada)</p>
            </div>
          </div>
        )}
      </div>
      
      <style dangerouslySetInnerHTML={{__html: `
        .custom-scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
      `}} />
    </div>
  );
}
