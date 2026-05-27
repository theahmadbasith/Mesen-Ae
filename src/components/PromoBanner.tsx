import React from 'react';
import { cn } from '@/lib/utils';
import { type Banner } from '@/hooks/db-hooks';
import { Gift } from 'lucide-react';

interface PromoBannerProps {
  banner: Banner;
  className?: string;
  onAction?: () => void;
}

export default function PromoBanner({ banner, className, onAction }: PromoBannerProps) {
  // Koordinat Default Jika Belum Di-set
  const headingP = banner.headingPos ?? { x: 10, y: 20 };
  const titleP = banner.titlePos ?? { x: 10, y: 38 };
  const descP = banner.descPos ?? { x: 10, y: 60 };
  const buttonP = banner.buttonPos ?? { x: 10, y: 82 };
  const overP = banner.overlayPos ?? { x: 80, y: 50 };

  const bgFilter = banner.canvasBgFilter || { brightness: 100, contrast: 100, saturate: 100, blur: 0 };
  const bgFilterStyle = `brightness(${bgFilter.brightness}%) contrast(${bgFilter.contrast}%) saturate(${bgFilter.saturate}%) blur(${bgFilter.blur}px)`;

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
          <img src={banner.imageUrl} alt={banner.title} className="w-full h-full object-cover opacity-55" style={{ filter: bgFilterStyle }} />
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

      {/* LAYER 3: HEADING BOX */}
      {(banner.heading || banner.type) && (
        <div 
          style={{ 
            position: 'absolute', 
            left: `${headingP.x}%`, 
            top: `${headingP.y}%`, 
            transform: 'translate(0%, -50%)', 
            zIndex: 10 
          }} 
          className="w-[70cqw] max-w-[75cqw]"
        >
          <span 
            style={{
              backgroundColor: 
                banner.headingStyle === 'solid-white' ? '#FFFFFF' :
                banner.headingStyle === 'solid-dark' ? '#09090b' :
                banner.headingStyle === 'outline-white' ? 'transparent' :
                banner.headingStyle === 'neon' ? 'rgba(34,211,238,0.15)' :
                banner.headingStyle === 'retro' ? '#fbbf24' :
                'rgba(255,255,255,0.2)', // default glass

              color: 
                banner.headingStyle === 'solid-white' ? '#0f172a' :
                banner.headingStyle === 'solid-dark' ? '#ffffff' :
                banner.headingStyle === 'outline-white' ? '#ffffff' :
                banner.headingStyle === 'neon' ? '#a5f3fc' :
                banner.headingStyle === 'retro' ? '#09090b' :
                '#ffffff',

              border: 
                banner.headingStyle === 'solid-white' ? 'none' :
                banner.headingStyle === 'solid-dark' ? '1px solid #1e293b' :
                banner.headingStyle === 'outline-white' ? '0.2cqw solid #ffffff' :
                banner.headingStyle === 'neon' ? '0.15cqw solid #22d3ee' :
                banner.headingStyle === 'retro' ? '0.2cqw solid #09090b' :
                '0.1cqw solid rgba(255,255,255,0.1)',

              boxShadow: 
                banner.headingStyle === 'neon' ? '0 0 12px rgba(34,211,238,0.4)' :
                banner.headingStyle === 'retro' ? '0.25cqw 0.25cqw 0px #09090b' :
                'none',

              backdropFilter: 
                (banner.headingStyle === 'glass' || !banner.headingStyle) ? 'blur(8px)' : undefined
            }}
            className="text-[2.2cqw] px-[1.5cqw] py-[0.5cqw] rounded font-bold inline-block uppercase tracking-widest"
          >
            {banner.heading || (banner.type === 'voucher' ? 'Promo Voucher' : banner.type === 'menu' ? 'Menu Rekomendasi' : 'Spesial Penawaran')}
          </span>
        </div>
      )}

      {/* LAYER 4: TITLE BOX */}
      {banner.title && (
        <div 
          style={{ 
            position: 'absolute', 
            left: `${titleP.x}%`, 
            top: `${titleP.y}%`, 
            transform: 'translate(0%, -50%)', 
            zIndex: 10 
          }} 
          className="w-[70cqw] max-w-[75cqw]"
        >
          <h4 className="font-black text-[4.5cqw] leading-[1.15] line-clamp-2 drop-shadow-sm m-0 text-left">
            {banner.title}
          </h4>
        </div>
      )}

      {/* LAYER 5: DESCRIPTION BOX */}
      {banner.description && (
        <div 
          style={{ 
            position: 'absolute', 
            left: `${descP.x}%`, 
            top: `${descP.y}%`, 
            transform: 'translate(0%, -50%)', 
            zIndex: 10 
          }} 
          className="w-[70cqw] max-w-[75cqw]"
        >
          <p className="text-[2.8cqw] text-slate-100 line-clamp-3 leading-[1.3] font-medium drop-shadow-sm m-0 text-left">
            {banner.description}
          </p>
        </div>
      )}

      {/* LAYER 6: BUTTON BOX */}
      {(onAction || banner.link || banner.buttonText) && (
        <div 
          style={{ 
            position: 'absolute', 
            left: `${buttonP.x}%`, 
            top: `${buttonP.y}%`, 
            transform: 'translate(0%, -50%)', 
            zIndex: 10 
          }} 
          className="w-[70cqw] max-w-[75cqw]"
        >
          <button 
            onClick={(e) => {
              e.stopPropagation();
              if (banner.link) {
                if (banner.link.startsWith('http')) window.open(banner.link, '_blank');
                else window.location.href = banner.link;
              } else if (onAction) onAction();
            }}
            style={{
              backgroundColor: 
                banner.badgeStyle === 'solid' ? '#FFFFFF' :
                banner.badgeStyle === 'outline' ? 'transparent' :
                banner.badgeStyle === 'glass' ? 'rgba(255,255,255,0.2)' :
                banner.badgeStyle === 'soft-dark' ? 'rgba(0,0,0,0.4)' :
                banner.badgeStyle === 'neon' ? '#06b6d4' :
                banner.badgeStyle === 'retro' ? '#eab308' :
                '#FFFFFF', // default solid

              color: 
                banner.badgeStyle === 'solid' ? '#0F172A' :
                banner.badgeStyle === 'outline' ? '#FFFFFF' :
                banner.badgeStyle === 'glass' ? '#FFFFFF' :
                banner.badgeStyle === 'soft-dark' ? '#FFFFFF' :
                banner.badgeStyle === 'neon' ? '#ffffff' :
                banner.badgeStyle === 'retro' ? '#09090b' :
                '#0F172A',

              border: 
                banner.badgeStyle === 'solid' ? 'none' :
                banner.badgeStyle === 'outline' ? '0.2cqw solid #FFFFFF' :
                banner.badgeStyle === 'glass' ? '0.15cqw solid rgba(255,255,255,0.2)' :
                banner.badgeStyle === 'soft-dark' ? '0.15cqw solid rgba(255,255,255,0.2)' :
                banner.badgeStyle === 'neon' ? 'none' :
                banner.badgeStyle === 'retro' ? '0.25cqw solid #09090b' :
                'none',

              boxShadow: 
                banner.badgeStyle === 'neon' ? '0 0 15px rgba(6,182,212,0.6)' :
                banner.badgeStyle === 'retro' ? '0.3cqw 0.3cqw 0px #09090b' :
                'none',

              backdropFilter: 
                (banner.badgeStyle === 'glass' || banner.badgeStyle === 'soft-dark') ? 'blur(8px)' : undefined
            }}
            className="text-[2.4cqw] font-extrabold px-[2.5cqw] py-[0.8cqw] rounded-md shadow-sm hover:opacity-90 active:scale-95 transition-all inline-block pointer-events-auto"
          >
            {banner.buttonText || 'Lihat Detail'}
          </button>
        </div>
      )}
    </div>
  );
}
