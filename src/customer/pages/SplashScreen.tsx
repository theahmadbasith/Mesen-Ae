import React from 'react';
import { ShoppingBag } from 'lucide-react';

export default function SplashScreen(): React.JSX.Element {
  return (
    <div className="flex-1 flex flex-col items-center justify-center bg-gradient-to-br from-blue-600 via-indigo-700 to-blue-900 text-white relative overflow-hidden min-h-screen">
      
      {/* Efek Cahaya / Glow di Latar Belakang */}
      <div 
        className="absolute w-[30rem] h-[30rem] bg-white/10 rounded-full blur-[80px] -top-32 -left-20 animate-pulse" 
        style={{ animationDuration: '4s' }}
      />
      <div className="absolute w-[20rem] h-[20rem] bg-indigo-400/20 rounded-full blur-[60px] bottom-10 right-10" />
      
      {/* Konten Utama */}
      <div className="relative z-10 flex flex-col items-center">
        
        {/* Logo Container dengan Animasi Scale-In */}
        <div className="logo-container bg-white p-7 rounded-[2rem] shadow-2xl shadow-blue-900/50 mb-6 relative">
          <div 
            className="absolute inset-0 bg-blue-100 rounded-[2rem] scale-110 animate-ping opacity-20" 
            style={{ animationDuration: '3s' }}
          />
          <ShoppingBag size={64} strokeWidth={2} className="text-blue-600 relative z-10" />
        </div>
        
        {/* Nama Brand dengan Animasi Fade-In-Up */}
        <h1 className="title-text text-4xl font-black tracking-tight mb-2 drop-shadow-md">
          MesenAe
        </h1>
        
        {/* Slogan dengan Animasi Fade-In-Up (Delay) */}
        <p className="subtitle-text text-blue-100/90 font-medium tracking-wide text-sm drop-shadow-sm">
          Pesan Mudah, Cepat, dan Praktis.
        </p>
      </div>
      
      {/* Loading Indicator Modern */}
      <div className="absolute bottom-16 z-10 flex flex-col items-center gap-6">
        <div className="flex space-x-2.5">
          <div className="loading-dot w-2.5 h-2.5 bg-white rounded-full shadow-sm" />
          <div className="loading-dot w-2.5 h-2.5 bg-white rounded-full shadow-sm" />
          <div className="loading-dot w-2.5 h-2.5 bg-white rounded-full shadow-sm" />
        </div>
      </div>

      {/* Versi Aplikasi */}
      <div className="absolute bottom-6 z-10">
        <p className="text-[10px] font-semibold tracking-widest text-white/40 uppercase">
          Version 1.0.0
        </p>
      </div>

      {/* CSS Animasi Kustom yang Disematkan */}
      <style dangerouslySetInnerHTML={{__html: `
        /* Animasi Muncul Logo */
        .logo-container {
          animation: scale-in 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards;
          opacity: 0;
          transform: scale(0.8);
        }
        
        /* Animasi Muncul Teks (Staggered) */
        .title-text {
          animation: fade-in-up 0.8s cubic-bezier(0.16, 1, 0.3, 1) 0.2s forwards;
          opacity: 0;
          transform: translateY(15px);
        }
        
        .subtitle-text {
          animation: fade-in-up 0.8s cubic-bezier(0.16, 1, 0.3, 1) 0.3s forwards;
          opacity: 0;
          transform: translateY(15px);
        }

        /* Animasi Loading Dots */
        .loading-dot {
          animation: dot-pulse 1s infinite linear alternate;
        }
        .loading-dot:nth-child(2) {
          animation-delay: 0.2s;
        }
        .loading-dot:nth-child(3) {
          animation-delay: 0.4s;
        }

        /* Keyframes */
        @keyframes scale-in {
          0% { opacity: 0; transform: scale(0.8); }
          100% { opacity: 1; transform: scale(1); }
        }

        @keyframes fade-in-up {
          0% { opacity: 0; transform: translateY(15px); }
          100% { opacity: 1; transform: translateY(0); }
        }

        @keyframes dot-pulse {
          0% { opacity: 0.3; transform: scale(0.8); }
          100% { opacity: 1; transform: scale(1.2); }
        }
      `}} />
    </div>
  );
}
