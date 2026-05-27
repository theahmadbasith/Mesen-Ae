import re

with open('src/admin/pages/BannerPromo.tsx', 'r') as f:
    content = f.read()

# 1. Update defaultTextLayer
content = content.replace(
    "backdropBlur: false, ...extra",
    "backdropBlur: false, role: 'none', borderWidth: 0, borderColor: '#FFFFFF', borderStyle: 'solid', ...extra"
)

# 2. Add state
state_search = "const [bannerImage, setBannerImage] = useState(null);"
state_replace = """const [bannerImage, setBannerImage] = useState(null);
  const [bannerHeading, setBannerHeading] = useState('');
  const [bannerBadgeStyle, setBannerBadgeStyle] = useState('solid');"""
content = content.replace(state_search, state_replace)

# 3. Add syncLayerByRole
history_search = """  const pushHistory = useCallback((newLayers) => {
    setHistory(prev => {
      const trimmed = prev.slice(0, historyIndex + 1);
      return [...trimmed, newLayers].slice(-30);
    });
    setHistoryIndex(i => Math.min(i + 1, 29));
  }, [historyIndex]);"""
sync_func = """
  const syncLayerByRole = useCallback((role, patch) => {
    setLayers(prev => {
      let changed = false;
      const next = prev.map(l => {
        if (l.role === role) {
          changed = true;
          return { ...l, ...patch };
        }
        return l;
      });
      if (changed) pushHistory(next);
      return next;
    });
  }, [pushHistory]);
"""
content = content.replace(history_search, history_search + sync_func)

# 4. openEditor banner == true
banner_open_search = """      setBannerType(banner.type || 'custom');
      setBannerTitle(banner.title || '');"""
banner_open_replace = """      setBannerType(banner.type || 'custom');
      setBannerHeading(banner.heading || '');
      setBannerBadgeStyle('solid');
      setBannerTitle(banner.title || '');"""
content = content.replace(banner_open_search, banner_open_replace)

# 4b. openEditor banner == false
banner_new_search = """      setBannerType('custom'); setBannerTitle(''); setBannerDesc('');"""
banner_new_replace = """      setBannerType('custom'); setBannerHeading(''); setBannerTitle(''); setBannerDesc(''); setBannerBadgeStyle('solid');"""
content = content.replace(banner_new_search, banner_new_replace)

seed_search = """      const seedLayers = [
        defaultTextLayer({ content: 'PROMO SPESIAL', x: 50, y: 35, fontSize: 48, fontWeight: '900', color: '#FFFFFF', textAlign: 'center', shadow: true, width: 80 }),
        defaultTextLayer({ content: 'Diskon hingga 50% untuk semua produk pilihan!', x: 50, y: 55, fontSize: 18, fontWeight: 'normal', color: '#E2E8F0', textAlign: 'center', shadow: false, width: 70, lineHeight: 1.5 }),
        defaultTextLayer({ content: 'BELI SEKARANG', x: 50, y: 75, fontSize: 14, fontWeight: 'bold', color: '#0F172A', bgColor: '#FFFFFF', bgOpacity: 100, textAlign: 'center', shadow: true, width: 25, padding: 12, borderRadius: 12 }),
      ];"""
seed_replace = """      const seedLayers = [
        defaultTextLayer({ role: 'heading', content: 'PROMO TERBATAS', x: 50, y: 35, fontSize: 24, fontWeight: '900', color: '#FFFFFF', textAlign: 'center', shadow: true, width: 80, borderWidth: 2, borderColor: '#FFFFFF', padding: 8, bgOpacity: 0 }),
        defaultTextLayer({ role: 'subheading', content: 'Judul Promo', x: 50, y: 55, fontSize: 48, fontWeight: '900', color: '#FFFFFF', textAlign: 'center', shadow: true, width: 90, lineHeight: 1.15 }),
        defaultTextLayer({ role: 'body', content: 'Deskripsi singkat...', x: 50, y: 72, fontSize: 18, fontWeight: 'normal', color: '#E2E8F0', textAlign: 'center', shadow: false, width: 80, lineHeight: 1.5 }),
        defaultTextLayer({ role: 'button', content: 'LIHAT DETAIL', x: 50, y: 88, fontSize: 16, fontWeight: 'bold', color: '#0F172A', bgColor: '#FFFFFF', bgOpacity: 100, textAlign: 'center', shadow: true, width: 30, padding: 12, borderRadius: 12 }),
      ];"""
content = content.replace(seed_search, seed_replace)

# 5. handleSaveBanner payload
save_search = """      const bannerData = {
        type: bannerType, 
        title: bannerTitle.trim(),"""
save_replace = """      const bannerData = {
        type: bannerType, 
        heading: bannerHeading.trim(),
        title: bannerTitle.trim(),"""
content = content.replace(save_search, save_replace)

# 6. renderCanvasLayer border
render_layer_search = """backgroundColor: layer.bgOpacity > 0 ? `${layer.bgColor}${Math.round(layer.bgOpacity * 2.55).toString(16).padStart(2, '0')}` : 'transparent',"""
render_layer_replace = render_layer_search + "\n            border: (layer.borderWidth && layer.borderWidth > 0) ? `${layer.borderWidth}px ${layer.borderStyle} ${layer.borderColor}` : undefined,"
content = content.replace(render_layer_search, render_layer_replace)

# 7. renderInfoPanel modifications
info_panel_search = """      <div>
        <Label>Judul Internal (Admin)</Label>
        <Input value={bannerTitle} onChange={e => setBannerTitle(e.target.value)} placeholder="Promo Kemerdekaan..." />
      </div>

      <div>
        <Label>Deskripsi Internal</Label>
        <textarea value={bannerDesc} onChange={e => setBannerDesc(e.target.value)} rows={3} placeholder="Catatan internal..."
          className="w-full p-3 border border-zinc-300 dark:border-zinc-700 rounded-xl bg-white dark:bg-zinc-900 text-sm outline-none resize-none focus:ring-2 focus:ring-blue-500" />
      </div>"""
      
info_panel_replace = """      <div>
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
      </div>

      <div>
        <Label>Gaya Tombol (Badge)</Label>
        <select value={bannerBadgeStyle} onChange={(e) => {
          const style = e.target.value;
          setBannerBadgeStyle(style);
          if (style === 'solid') {
             syncLayerByRole('button', { bgColor: '#FFFFFF', color: '#0F172A', bgOpacity: 100, borderWidth: 0 });
          } else if (style === 'outline') {
             syncLayerByRole('button', { bgColor: '#000000', color: '#FFFFFF', bgOpacity: 0, borderWidth: 2, borderColor: '#FFFFFF' });
          } else if (style === 'glass') {
             syncLayerByRole('button', { bgColor: '#FFFFFF', color: '#FFFFFF', bgOpacity: 20, borderWidth: 1, borderColor: '#FFFFFF', backdropBlur: true });
          }
        }} className="w-full h-10 px-3 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-sm outline-none">
          <option value="solid">Solid (Warna Penuh)</option>
          <option value="outline">Outline (Garis Tepi)</option>
          <option value="glass">Glassmorphism (Kaca)</option>
        </select>
      </div>"""
content = content.replace(info_panel_search, info_panel_replace)

with open('src/admin/pages/BannerPromo.tsx', 'w') as f:
    f.write(content)

print("Patch applied to BannerPromo.tsx successfully.")
