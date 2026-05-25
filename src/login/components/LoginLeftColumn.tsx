import React from 'react';
import { useDbQuery } from '@/hooks/db-hooks';

export default function LoginLeftColumn() {
  const storeSettingsList = useDbQuery<any>('storeSettings') ?? [];
  const storeSettings = storeSettingsList[0] || null;

  return (
    <div className="hidden lg:flex lg:w-1/2 xl:w-[55%] relative items-center justify-center overflow-hidden border-r border-zinc-800 bg-[#0a0705]">
      
      {/* Latar Belakang Gradien Halus & Glow */}
      <div className="absolute inset-0 bg-gradient-to-br from-zinc-950 via-zinc-900 to-zinc-950" />
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-primary/10 blur-[120px] mix-blend-screen" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-orange-600/5 blur-[120px] mix-blend-screen" />
      
      {/* Konten Brand */}
      <div className="relative z-10 text-center text-white px-12 select-none max-w-lg">
        {/* Logo */}
        <div className="w-24 h-24 mx-auto mb-10 bg-white/5 backdrop-blur-md rounded-3xl flex items-center justify-center shadow-2xl border border-white/10 relative group p-2 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-tr from-primary/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-3xl" />
          <img
            src={storeSettings?.logo || "/icon-192.png"}
            alt={storeSettings?.storeName || "MesenAe"}
            className="w-full h-full object-contain drop-shadow-2xl transition-transform duration-500 group-hover:scale-110"
            onError={(e) => {
              const target = e.currentTarget;
              target.style.display = 'none';
              const parent = target.parentElement;
              if (parent) {
                const icon = document.createElement('div');
                icon.className = 'flex items-center justify-center w-full h-full text-white font-bold text-2xl';
                icon.innerHTML = (storeSettings?.storeName || 'MesenAe').charAt(0).toUpperCase();
                parent.appendChild(icon);
              }
            }}
          />
        </div>

        <h1 className="text-4xl font-black tracking-tight mb-4 text-transparent bg-clip-text bg-gradient-to-r from-white via-slate-100 to-orange-400">
          {storeSettings?.storeName ? `${storeSettings.storeName} Workspace` : "MesenAe Workspace"}
        </h1>
        <p className="text-base text-zinc-400 mb-10 font-medium">
          Sistem terpadu pengelola transaksi penjualan kasir (POS) dan pemantau pesanan dapur (KDS) real-time.
        </p>

        {/* Daftar Fitur / Value Proposition */}
        <div className="space-y-4 text-left">
          {[
            { icon: '💼', title: 'Admin & Kasir POS', desc: 'Kelola laporan penjualan, stok, supplier, dan kasir penjualan' },
            { icon: '🍳', title: 'Layar Dapur (KDS)', desc: 'Monitor antrean pesanan masakan real-time untuk koki' },
            { icon: '☁️', title: 'Firebase Firestore', desc: 'Integrasi cloud database aman, real-time tersinkron, dan tangguh' },
          ].map((item, idx) => (
            <div key={idx} className="flex items-start gap-4 bg-white/[0.02] hover:bg-white/[0.04] transition-colors rounded-xl p-4 border border-zinc-800/60">
              <div className="w-10 h-10 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center text-lg shrink-0">
                {item.icon}
              </div>
              <div>
                <h3 className="text-sm font-bold text-white mb-0.5">{item.title}</h3>
                <p className="text-xs text-zinc-400">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
