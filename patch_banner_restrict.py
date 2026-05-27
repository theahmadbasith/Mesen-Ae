import re

with open('src/admin/pages/BannerPromo.tsx', 'r') as f:
    content = f.read()

# 1. Remove Preset Teks from renderElementsPanel
elements_search = """      <div>
        <p className="text-[10px] font-black uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-3">Preset Teks</p>
        <div className="grid grid-cols-1 gap-2">
          {[
            { label: 'Heading', fontSize: 56, fontWeight: '900', content: 'HEADING UTAMA', width: 80 },
            { label: 'Subheading', fontSize: 28, fontWeight: 'bold', content: 'Subheading Keren', width: 60 },
            { label: 'Body Text', fontSize: 18, fontWeight: 'normal', content: 'Teks deskripsi promo ada di sini...', width: 50 },
            { label: 'Badge', fontSize: 14, fontWeight: 'bold', content: 'PROMO BARU', uppercase: true, bgOpacity: 100, bgColor: '#EF4444', borderRadius: 20, padding: 10, width: 25, textAlign: 'center' },
          ].map(preset => (
            <button key={preset.label} onClick={() => addLayer(defaultTextLayer(preset))}
              className="w-full px-4 py-3 rounded-2xl bg-zinc-100 dark:bg-zinc-800/50 hover:bg-zinc-200 dark:hover:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-left transition-all group flex items-center justify-between">
              <span className="text-sm font-bold text-zinc-800 dark:text-zinc-200 group-hover:text-blue-600 dark:group-hover:text-blue-400">{preset.label}</span>
              <Plus className="w-4 h-4 text-zinc-400 group-hover:text-blue-600 dark:group-hover:text-blue-400" />
            </button>
          ))}
        </div>
      </div>

      <div>
        <p className="text-[10px] font-black uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-3">Upload Gambar</p>"""

elements_replace = """      <div>
        <p className="text-[10px] font-black uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-3">Upload Gambar</p>"""
content = content.replace(elements_search, elements_replace)

# 2. Restrict removeLayer
remove_search = """  const removeLayer = useCallback((id) => {
    setLayers(prev => {
      const next = prev.filter(l => l.id !== id);
      pushHistory(next);
      return next;
    });
    if (selectedId === id) setSelectedId(null);
  }, [selectedId, pushHistory]);"""
  
remove_replace = """  const removeLayer = useCallback((id) => {
    setLayers(prev => {
      const layer = prev.find(l => l.id === id);
      if (layer && layer.type === 'text') {
        toast.error("Elemen teks utama tidak boleh dihapus. Anda dapat menyembunyikannya (ikon mata).");
        return prev;
      }
      const next = prev.filter(l => l.id !== id);
      pushHistory(next);
      return next;
    });
    if (selectedId === id) setSelectedId(null);
  }, [selectedId, pushHistory]);"""
content = content.replace(remove_search, remove_replace)

# 3. Restrict duplicateLayer
duplicate_search = """  const duplicateLayer = useCallback((id) => {
    const layer = layers.find(l => l.id === id);
    if (!layer) return;
    const newId = generateId();
    const newLayer = { ...layer, id: newId, x: layer.x + 2, y: layer.y + 2, zIndex: layers.length + 10 };
    setLayers(prev => {
      const next = [...prev, newLayer];
      pushHistory(next);
      return next;
    });
    setSelectedId(newId);
  }, [layers, pushHistory]);"""

duplicate_replace = """  const duplicateLayer = useCallback((id) => {
    const layer = layers.find(l => l.id === id);
    if (!layer) return;
    if (layer.type === 'text') {
      toast.error("Elemen teks tidak dapat diduplikat agar tata letak tetap sinkron.");
      return;
    }
    const newId = generateId();
    const newLayer = { ...layer, id: newId, x: layer.x + 2, y: layer.y + 2, zIndex: layers.length + 10 };
    setLayers(prev => {
      const next = [...prev, newLayer];
      pushHistory(next);
      return next;
    });
    setSelectedId(newId);
  }, [layers, pushHistory]);"""
content = content.replace(duplicate_search, duplicate_replace)

with open('src/admin/pages/BannerPromo.tsx', 'w') as f:
    f.write(content)
print("Patch restrictions applied")
