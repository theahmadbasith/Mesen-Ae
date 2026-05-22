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
  // Koordinat Default Jika Belum Di-set
  const titleP = banner.titlePos ?? { x: 8, y: 30 };
  const descP = banner.descPos ?? { x: 8, y: 70 };
  const overP = banner.overlayPos ?? { x: 85, y: 50 };

  return (
    <div className={cn("rounded-[1.5rem] text-white relative overflow-hidden shadow-md", className)}>
      {/* LAYER 1: BACKGROUND */}
      {banner.imageUrl && !banner.imageUrl.startsWith('preset:') ? (
        <div className="absolute inset-0 z-0">
          <img src={banner.imageUrl} alt={banner.title} className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-black/40" />
        </div>
      ) : (
        <div className={cn("absolute inset-0 z-0 bg-gradient-to-br", 
          banner.imageUrl === 'preset:green' ? 'from-emerald-600 via-teal-600 to-cyan-600' :
          banner.imageUrl === 'preset:red' ? 'from-rose-600 via-red-600 to-orange-600' :
          banner.imageUrl === 'preset:purple' ? 'from-fuchsia-600 via-purple-600 to-violet-600' :
          banner.imageUrl === 'preset:orange' ? 'from-orange-500 via-amber-500 to-yellow-500' :
          'from-blue-600 via-indigo-600 to-purple-600'
        )}>
          {!banner.overlayImageUrl && (
            <Gift size={160} strokeWidth={1} className="absolute -right-4 -bottom-8 text-white/10 rotate-[-15deg] z-0" />
          )}
        </div>
      )}

      {/* LAYER 2: OVERLAY IMAGE (FOTO PNG DEPAN) */}
      {banner.overlayImageUrl && (
        <div style={{ position: 'absolute', left: `${overP.x}%`, top: `${overP.y}%`, transform: 'translate(-50%, -50%)', zIndex: 5 }}>
           <img src={banner.overlayImageUrl} className="w-32 md:w-40 h-auto object-contain drop-shadow-2xl" alt="Overlay Banner" />
        </div>
      )}

      {/* LAYER 3: TITLE BOX */}
      <div style={{ position: 'absolute', left: `${titleP.x}%`, top: `${titleP.y}%`, transform: 'translate(0%, -50%)', zIndex: 10 }} className="w-[75%] max-w-[280px]">
        <span className={cn(
          "text-[9px] sm:text-[10px] px-2.5 py-1 rounded-md backdrop-blur-md font-bold mb-2 inline-block uppercase tracking-wider border shadow-sm",
          banner.imageUrl ? "bg-white/10 border-white/20 text-white" : "bg-white/20 border-white/10"
        )}>
          Penawaran Spesial
        </span>
        <h4 className="font-extrabold text-xl sm:text-2xl leading-tight line-clamp-2 drop-shadow-md">
          {banner.title}
        </h4>
      </div>

      {/* LAYER 4: DESCRIPTION BOX */}
      {banner.description && (
        <div style={{ position: 'absolute', left: `${descP.x}%`, top: `${descP.y}%`, transform: 'translate(0%, -50%)', zIndex: 10 }} className="w-[75%] max-w-[280px] pointer-events-none">
          <p className="text-[11px] sm:text-xs text-slate-100 font-medium line-clamp-3 leading-relaxed drop-shadow-sm m-0">
            {banner.description}
          </p>
        </div>
      )}

      {/* LAYER 5: BUTTON BOX */}
      {(onAction || banner.link) && (
        <div style={{ position: 'absolute', left: `${banner.buttonPos?.x ?? 8}%`, top: `${banner.buttonPos?.y ?? 80}%`, transform: 'translate(0%, -50%)', zIndex: 11 }} className="w-auto">
          <button 
            onClick={(e) => {
              e.stopPropagation();
              if (banner.link) {
                if (banner.link.startsWith('http')) window.open(banner.link, '_blank');
                else window.location.href = banner.link;
              } else if (onAction) onAction();
            }}
            className="bg-white text-slate-900 text-[10px] sm:text-xs font-bold px-4 py-2 sm:py-2.5 rounded-xl shadow-lg hover:bg-slate-100 active:scale-95 transition-all inline-flex items-center gap-1.5 whitespace-nowrap pointer-events-auto"
          >
            {banner.buttonText || 'Lihat Sekarang'} <ArrowRight size={14} />
          </button>
        </div>
      )}
    </div>
  );
}
