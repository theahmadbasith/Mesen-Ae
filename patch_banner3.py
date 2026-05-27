import re

with open('src/admin/pages/BannerPromo.tsx', 'r') as f:
    content = f.read()

# 1. Clean up residual setters in the else block
residual_search = """      setEditBanner(null);
      setBannerType('custom'); setBannerHeading(''); setBannerTitle(''); setBannerDesc(''); setBannerBadgeStyle('solid');
      setBannerVoucherId(''); setBannerProductId(''); setBannerLink('');
      setBannerButtonText(''); setBannerIsActive(true);"""
      
residual_replace = """      setEditBanner(null);
      setBannerType('custom'); setBannerBadgeStyle('solid');
      setBannerVoucherId(''); setBannerProductId(''); setBannerLink('');
      setBannerIsActive(true);"""
content = content.replace(residual_search, residual_replace)

# 2. Fix the initialLayers logic to auto-migrate old banners
migration_search = """      const initialLayers = banner.canvasLayers || [];
      setLayers(initialLayers);
      setHistory([initialLayers]);
      setHistoryIndex(0);
      setBgFilter(banner.canvasBgFilter || { brightness: 100, contrast: 100, saturate: 100, blur: 0 });"""
      
migration_replace = """      let initialLayers = banner.canvasLayers || [];
      if (initialLayers.length === 0) {
        // Auto-migrate old banners to canvas layers
        initialLayers = [
          defaultTextLayer({ role: 'heading', content: banner.heading || 'SPESIAL PENAWARAN', x: 24, y: 25, fontSize: 18, fontWeight: '900', color: '#FFFFFF', textAlign: 'left', shadow: false, width: 32, borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)', padding: 10, borderRadius: 6, bgOpacity: 20, backdropBlur: true, letterSpacing: 4 }),
          defaultTextLayer({ role: 'subheading', content: banner.title || 'Judul Promo', x: 43, y: 45, fontSize: 40, fontWeight: '900', color: '#FFFFFF', textAlign: 'left', shadow: true, width: 70, lineHeight: 1.1 }),
          defaultTextLayer({ role: 'body', content: banner.description || 'Deskripsi singkat...', x: 43, y: 65, fontSize: 24, fontWeight: 'normal', color: '#E2E8F0', textAlign: 'left', shadow: true, width: 70, lineHeight: 1.3 }),
          defaultTextLayer({ role: 'button', content: banner.buttonText || 'Lihat Detail', x: 19, y: 85, fontSize: 20, fontWeight: '900', color: '#0F172A', bgColor: '#FFFFFF', bgOpacity: 100, textAlign: 'center', shadow: true, width: 22, padding: 12, borderRadius: 8 }),
        ];
        if (banner.overlayImageUrl) {
          initialLayers.push(defaultImageLayer(banner.overlayImageUrl, { x: 80, y: 50, width: 35 }));
        }
      }

      setLayers(initialLayers);
      setHistory([initialLayers]);
      setHistoryIndex(0);
      setBgFilter(banner.canvasBgFilter || { brightness: 100, contrast: 100, saturate: 100, blur: 0 });"""
content = content.replace(migration_search, migration_replace)

# 3. Fix the default seedLayers (it should be exactly the same as migration)
seed_search = """      const seedLayers = [
        defaultTextLayer({ role: 'heading', content: 'SPESIAL PENAWARAN', x: 25, y: 25, fontSize: 14, fontWeight: '900', color: '#FFFFFF', textAlign: 'left', shadow: false, width: 35, borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)', padding: 8, borderRadius: 4, bgOpacity: 20, backdropBlur: true, letterSpacing: 3 }),
        defaultTextLayer({ role: 'subheading', content: 'Promo Berkah Idul Adha', x: 30, y: 45, fontSize: 56, fontWeight: '900', color: '#FFFFFF', textAlign: 'left', shadow: true, width: 45, lineHeight: 1.1 }),
        defaultTextLayer({ role: 'body', content: 'Nikmati Keberkahan Idul Adha Promo Diskon 75% Dengan Kode Voucher BASITH', x: 30, y: 65, fontSize: 18, fontWeight: 'normal', color: '#E2E8F0', textAlign: 'left', shadow: true, width: 45, lineHeight: 1.4 }),
        defaultTextLayer({ role: 'button', content: 'Lihat Detail', x: 17, y: 82, fontSize: 16, fontWeight: '900', color: '#0F172A', bgColor: '#FFFFFF', bgOpacity: 100, textAlign: 'center', shadow: true, width: 18, padding: 12, borderRadius: 8 }),
      ];"""

seed_replace = """      const seedLayers = [
        defaultTextLayer({ role: 'heading', content: 'SPESIAL PENAWARAN', x: 24, y: 25, fontSize: 18, fontWeight: '900', color: '#FFFFFF', textAlign: 'left', shadow: false, width: 32, borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)', padding: 10, borderRadius: 6, bgOpacity: 20, backdropBlur: true, letterSpacing: 4 }),
        defaultTextLayer({ role: 'subheading', content: 'Promo Berkah Idul Adha', x: 43, y: 45, fontSize: 40, fontWeight: '900', color: '#FFFFFF', textAlign: 'left', shadow: true, width: 70, lineHeight: 1.1 }),
        defaultTextLayer({ role: 'body', content: 'Nikmati Keberkahan Idul Adha Promo Diskon 75% Dengan Kode Voucher BASITH', x: 43, y: 65, fontSize: 24, fontWeight: 'normal', color: '#E2E8F0', textAlign: 'left', shadow: true, width: 70, lineHeight: 1.3 }),
        defaultTextLayer({ role: 'button', content: 'Lihat Detail', x: 19, y: 85, fontSize: 20, fontWeight: '900', color: '#0F172A', bgColor: '#FFFFFF', bgOpacity: 100, textAlign: 'center', shadow: true, width: 22, padding: 12, borderRadius: 8 }),
      ];"""

content = content.replace(seed_search, seed_replace)

with open('src/admin/pages/BannerPromo.tsx', 'w') as f:
    f.write(content)
print("Patch 3 applied")
