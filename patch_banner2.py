import re

with open('src/admin/pages/BannerPromo.tsx', 'r') as f:
    content = f.read()

# 1. Remove state vars
content = re.sub(r"  const \[bannerTitle, setBannerTitle\] = useState\(''\);\n", "", content)
content = re.sub(r"  const \[bannerDesc, setBannerDesc\] = useState\(''\);\n", "", content)
content = re.sub(r"  const \[bannerButtonText, setBannerButtonText\] = useState\(''\);\n", "", content)
content = re.sub(r"  const \[bannerHeading, setBannerHeading\] = useState\(''\);\n", "", content)

# 2. Remove openEditor setters
content = re.sub(r"      setBannerHeading\(banner\.heading \|\| ''\);\n", "", content)
content = re.sub(r"      setBannerTitle\(banner\.title \|\| ''\);\n", "", content)
content = re.sub(r"      setBannerDesc\(banner\.description \|\| ''\);\n", "", content)
content = re.sub(r"      setBannerButtonText\(banner\.buttonText \|\| ''\);\n", "", content)
content = re.sub(r"      setBannerHeading\(''\); setBannerTitle\(''\); setBannerDesc\(''\); ", "", content)

# 3. Update seedLayers to left aligned
seed_search = """      const seedLayers = [
        defaultTextLayer({ role: 'heading', content: 'PROMO TERBATAS', x: 50, y: 35, fontSize: 24, fontWeight: '900', color: '#FFFFFF', textAlign: 'center', shadow: true, width: 80, borderWidth: 2, borderColor: '#FFFFFF', padding: 8, bgOpacity: 0 }),
        defaultTextLayer({ role: 'subheading', content: 'Judul Promo', x: 50, y: 55, fontSize: 48, fontWeight: '900', color: '#FFFFFF', textAlign: 'center', shadow: true, width: 90, lineHeight: 1.15 }),
        defaultTextLayer({ role: 'body', content: 'Deskripsi singkat...', x: 50, y: 72, fontSize: 18, fontWeight: 'normal', color: '#E2E8F0', textAlign: 'center', shadow: false, width: 80, lineHeight: 1.5 }),
        defaultTextLayer({ role: 'button', content: 'LIHAT DETAIL', x: 50, y: 88, fontSize: 16, fontWeight: 'bold', color: '#0F172A', bgColor: '#FFFFFF', bgOpacity: 100, textAlign: 'center', shadow: true, width: 30, padding: 12, borderRadius: 12 }),
      ];"""

seed_replace = """      const seedLayers = [
        defaultTextLayer({ role: 'heading', content: 'SPESIAL PENAWARAN', x: 25, y: 25, fontSize: 14, fontWeight: '900', color: '#FFFFFF', textAlign: 'left', shadow: false, width: 35, borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)', padding: 8, borderRadius: 4, bgOpacity: 20, backdropBlur: true, letterSpacing: 3 }),
        defaultTextLayer({ role: 'subheading', content: 'Promo Berkah Idul Adha', x: 30, y: 45, fontSize: 56, fontWeight: '900', color: '#FFFFFF', textAlign: 'left', shadow: true, width: 45, lineHeight: 1.1 }),
        defaultTextLayer({ role: 'body', content: 'Nikmati Keberkahan Idul Adha Promo Diskon 75% Dengan Kode Voucher BASITH', x: 30, y: 65, fontSize: 18, fontWeight: 'normal', color: '#E2E8F0', textAlign: 'left', shadow: true, width: 45, lineHeight: 1.4 }),
        defaultTextLayer({ role: 'button', content: 'Lihat Detail', x: 17, y: 82, fontSize: 16, fontWeight: '900', color: '#0F172A', bgColor: '#FFFFFF', bgOpacity: 100, textAlign: 'center', shadow: true, width: 18, padding: 12, borderRadius: 8 }),
      ];"""

content = content.replace(seed_search, seed_replace)

# 4. Update handleSaveBanner
save_search_old = """  const handleSaveBanner = async () => {
    if (!bannerTitle.trim()) { toast.error('Judul banner wajib diisi'); return; }

    const loadingToastId = toast.loading('Menyimpan banner...');"""
    
save_replace_new = """  const handleSaveBanner = async () => {
    const titleLayer = layers.find(l => l.role === 'subheading');
    const derivedTitle = titleLayer ? titleLayer.content : 'Banner Baru';

    if (!derivedTitle.trim()) { toast.error('Judul (layer Subheading) tidak boleh kosong'); return; }

    const loadingToastId = toast.loading('Menyimpan banner...');"""
content = content.replace(save_search_old, save_replace_new)

payload_search = """      const bannerData = {
        type: bannerType, 
        heading: bannerHeading.trim(),
        title: bannerTitle.trim(), 
        description: bannerDesc.trim(),"""
        
payload_replace = """      const bannerData = {
        type: bannerType, 
        heading: '',
        title: derivedTitle.trim(), 
        description: '',"""
content = content.replace(payload_search, payload_replace)

# 5. renderInfoPanel removing text inputs
info_search = """      <div>
        <Label>Heading Banner</Label>
        <Input value={bannerHeading} onChange={e => {
          setBannerHeading(e.target.value);
          syncLayerByRole('heading', { content: e.target.value || 'PROMO TERBATAS' });
        }} placeholder="Misal: Promo Terbatas" />
      </div>

      <div>
        <Label>Judul (Subheading)</Label>
        <Input value={bannerTitle} onChange={e => {
          setBannerTitle(e.target.value);
          syncLayerByRole('subheading', { content: e.target.value || 'Judul Promo' });
        }} placeholder="Promo Kemerdekaan..." />
      </div>

      <div>
        <Label>Deskripsi (Body Text)</Label>
        <textarea value={bannerDesc} onChange={e => {
          setBannerDesc(e.target.value);
          syncLayerByRole('body', { content: e.target.value || 'Deskripsi singkat...' });
        }} rows={3} placeholder="Penjelasan promo..."
          className="w-full p-3 border border-zinc-300 dark:border-zinc-700 rounded-xl bg-white dark:bg-zinc-900 text-sm outline-none resize-none focus:ring-2 focus:ring-blue-500" />
      </div>

      <div>
        <Label>Teks Tombol (Badge)</Label>
        <Input value={bannerButtonText} onChange={e => {
          setBannerButtonText(e.target.value);
          syncLayerByRole('button', { content: e.target.value || 'LIHAT DETAIL' });
        }} placeholder="Misal: Beli Sekarang" />
      </div>"""

content = content.replace(info_search, "")

# Replace the onChange for badge style to use updateLayer directly instead of syncLayerByRole (which we might delete)
badge_search = """        <select value={bannerBadgeStyle} onChange={(e) => {
          const style = e.target.value;
          setBannerBadgeStyle(style);
          if (style === 'solid') {
             syncLayerByRole('button', { bgColor: '#FFFFFF', color: '#0F172A', bgOpacity: 100, borderWidth: 0 });
          } else if (style === 'outline') {
             syncLayerByRole('button', { bgColor: '#000000', color: '#FFFFFF', bgOpacity: 0, borderWidth: 2, borderColor: '#FFFFFF' });
          } else if (style === 'glass') {
             syncLayerByRole('button', { bgColor: '#FFFFFF', color: '#FFFFFF', bgOpacity: 20, borderWidth: 1, borderColor: '#FFFFFF', backdropBlur: true });
          }
        }}"""

badge_replace = """        <select value={bannerBadgeStyle} onChange={(e) => {
          const style = e.target.value;
          setBannerBadgeStyle(style);
          const btn = layers.find(l => l.role === 'button');
          if (btn) {
              if (style === 'solid') {
                 updateLayer(btn.id, { bgColor: '#FFFFFF', color: '#0F172A', bgOpacity: 100, borderWidth: 0 });
              } else if (style === 'outline') {
                 updateLayer(btn.id, { bgColor: '#000000', color: '#FFFFFF', bgOpacity: 0, borderWidth: 2, borderColor: '#FFFFFF' });
              } else if (style === 'glass') {
                 updateLayer(btn.id, { bgColor: '#FFFFFF', color: '#FFFFFF', bgOpacity: 20, borderWidth: 1, borderColor: '#FFFFFF', backdropBlur: true });
              }
          }
        }}"""
content = content.replace(badge_search, badge_replace)

# 6. Replace bannerTitle || 'Banner Baru' header
content = content.replace("{bannerTitle || 'Banner Baru'}", "{layers.find(l => l.role === 'subheading')?.content || 'Banner Baru'}")

with open('src/admin/pages/BannerPromo.tsx', 'w') as f:
    f.write(content)

print("Second patch applied.")
