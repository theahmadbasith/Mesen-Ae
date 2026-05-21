import React from 'react';
import { cn } from '@/lib/utils';
import { type Banner } from '@/hooks/db-hooks';
import { Gift, ArrowRight } from 'lucide-react';

interface PromoBannerProps {
  banner: Banner;
  className?: string;
  onAction?: () => void;
}

export default function PromoBanner({ banner, className, onAction }: PromoBannerProps) {
  return (
    <div className={cn("rounded-[1.5rem] p-6 text-white relative overflow-hidden flex flex-col justify-between shadow-md", className)}>
      {banner.imageUrl && !banner.imageUrl.startsWith('preset:') ? (
        <div className="absolute inset-0 z-0">
          <img src={banner.imageUrl} alt={banner.title} className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-r from-slate-950/95 via-slate-900/80 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/60 to-transparent" />
        </div>
      ) : (
        <div className={cn("absolute inset-0 z-0 bg-gradient-to-br", 
          banner.imageUrl === 'preset:green' ? 'from-emerald-600 via-teal-600 to-cyan-600' :
          banner.imageUrl === 'preset:red' ? 'from-rose-600 via-red-600 to-orange-600' :
          banner.imageUrl === 'preset:purple' ? 'from-fuchsia-600 via-purple-600 to-violet-600' :
          banner.imageUrl === 'preset:orange' ? 'from-orange-500 via-amber-500 to-yellow-500' :
          'from-blue-600 via-indigo-600 to-purple-600' // default blue
        )}>
          <Gift size={160} strokeWidth={1} className="absolute -right-4 -bottom-8 text-white/10 rotate-[-15deg] z-0" />
        </div>
      )}

      <div className="relative z-10 w-[70%] mt-auto flex flex-col items-start text-left">
        <span className={cn(
          "text-[10px] px-2.5 py-1 rounded-md backdrop-blur-md font-bold mb-3 inline-block uppercase tracking-wider border shadow-sm",
          banner.imageUrl ? "bg-white/10 border-white/20 text-white" : "bg-white/20 border-white/10"
        )}>
          Penawaran Spesial
        </span>
        <h4 className="font-extrabold text-2xl mb-1.5 leading-tight line-clamp-1 drop-shadow-md">
          {banner.title}
        </h4>
        {banner.description && (
          <p className="text-xs text-slate-200 mb-5 font-medium line-clamp-2 leading-relaxed drop-shadow-sm">
            {banner.description}
          </p>
        )}
        {(onAction || banner.link) && (
          <button 
            onClick={() => {
              if (banner.link) {
                if (banner.link.startsWith('http')) {
                  window.open(banner.link, '_blank');
                } else {
                  window.location.href = banner.link;
                }
              } else if (onAction) {
                onAction();
              }
            }}
            className="bg-white text-slate-900 text-sm font-bold px-6 py-2.5 rounded-xl shadow-lg hover:bg-slate-100 active:scale-95 transition-all flex items-center gap-2 mt-auto"
          >
            Lihat Sekarang <ArrowRight size={16} />
          </button>
        )}
      </div>
    </div>
  );
}
