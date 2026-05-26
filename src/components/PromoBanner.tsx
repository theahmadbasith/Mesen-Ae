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
    <div 
      className={cn("w-full aspect-[21/9] rounded-2xl text-white relative overflow-hidden shadow-md select-none bg-slate-900", className)}
      style={{ 
        background: banner.bgType === 'solid' ? banner.bgColor : banner.bgType === 'gradient' ? banner.bgGradient : undefined,
        containerType: 'inline-size'
      }}
    >
      {/* LAYER 1: BACKGROUND */}
      {(!banner.bgType || banner.bgType === 'image') && banner.imageUrl && !banner.imageUrl.startsWith('preset:') ? (
        <div className="absolute inset-0 z-0">
          <img src={banner.imageUrl} alt={banner.title} className="w-full h-full object-cover opacity-55" />
          <div className="absolute inset-0 bg-gradient-to-r from-black/85 via-black/40 to-transparent" />
        </div>
      ) : banner.bgType === 'solid' ? (
        <div className="absolute inset-0 z-0" style={{ backgroundColor: banner.bgColor || '#1E293B' }}>
          {!banner.overlayImageUrl && (
            <Gift size={90} className="absolute -right-3 -bottom-3 text-white/10 rotate-[-15deg] z-0" />
          )}
        </div>
      ) : banner.bgType === 'gradient' && banner.bgGradient ? (
        <div className="absolute inset-0 z-0" style={{ background: banner.bgGradient }}>
          {!banner.overlayImageUrl && (
            <Gift size={90} className="absolute -right-3 -bottom-3 text-white/10 rotate-[-15deg] z-0" />
          )}
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
            <Gift size={90} className="absolute -right-3 -bottom-3 text-white/10 rotate-[-15deg] z-0" />
          )}
        </div>
      )}

      {/* LAYER 2: OVERLAY IMAGE (FOTO PNG DEPAN) */}
      {banner.overlayImageUrl && (
        <div 
          style={{ 
            position: 'absolute', 
            left: `${overP.x}%`, 
            top: `${overP.y}%`, 
            transform: 'translate(-50%, -50%)', 
            zIndex: 5 
          }}
        >
           <img 
             src={banner.overlayImageUrl} 
             style={{
               transform: `scaleX(${banner.overlayFlipX ? -1 : 1}) rotate(${banner.overlayRotate ?? 0}deg)`,
               width: `calc(${banner.overlayScale ?? 1} * 20cqw)`,
               height: 'auto',
             }}
             className="object-contain drop-shadow-2xl max-w-none" 
             alt="Overlay Banner"
           />
        </div>
      )}

      {/* LAYER 3: TITLE BOX */}
      <div style={{ position: 'absolute', left: `${titleP.x}%`, top: `${titleP.y}%`, transform: 'translate(0%, -50%)', zIndex: 10 }} className="w-[70cqw] max-w-[75cqw]">
        <span className="bg-white/20 text-[2.2cqw] px-[1.5cqw] py-[0.5cqw] rounded backdrop-blur-md font-bold inline-block uppercase tracking-widest border border-white/10 mb-[1.5cqw]">
          {banner.type === 'voucher' ? 'Promo Voucher' : banner.type === 'menu' ? 'Menu Rekomendasi' : 'Spesial Penawaran'}
        </span>
        <h4 className="font-black text-[4.5cqw] leading-[1.15] line-clamp-2 drop-shadow-sm">
          {banner.title}
        </h4>
      </div>

      {/* LAYER 4: DESCRIPTION & BUTTON BOX */}
      {(banner.description || onAction || banner.link || banner.buttonText) && (
        <div style={{ position: 'absolute', left: `${descP.x}%`, top: `${descP.y}%`, transform: 'translate(0%, -50%)', zIndex: 10 }} className="w-[70cqw] max-w-[75cqw] pointer-events-none">
          {banner.description && (
            <p className="text-[2.8cqw] text-slate-100 line-clamp-3 leading-[1.3] font-medium drop-shadow-sm m-0">
              {banner.description}
            </p>
          )}
          {(onAction || banner.link || banner.buttonText) && (
            <div className="mt-[1.5cqw]">
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  if (banner.link) {
                    if (banner.link.startsWith('http')) window.open(banner.link, '_blank');
                    else window.location.href = banner.link;
                  } else if (onAction) onAction();
                }}
                className="text-[2.4cqw] bg-white text-slate-900 font-extrabold px-[2.5cqw] py-[0.8cqw] rounded-md shadow-sm pointer-events-auto hover:bg-slate-100 active:scale-95 transition-all inline-block"
              >
                {banner.buttonText || 'Lihat Detail'}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

