import { useDbQuery, dbInsert, dbUpdate, dbDelete, dbUploadFile, dbDeleteFile } from '@/hooks/db-hooks';
import { type PaymentMethod, type Category, type User, type StoreSettings, type Banner } from '@/hooks/db-hooks';
import { useState, useEffect, useRef } from 'react';
import {
  Settings, Store, CreditCard, Tag, Plus, Trash2, Edit2,
  Truck, ArrowDownToLine, ArrowUpFromLine, Receipt,
  HardDrive, Package, Camera, X, Moon, Sun, Code2,
  FileSpreadsheet, FileDown, FileUp, Users, Shield, UserCog,
  Key, Eye, EyeOff, Table2, BadgeCheck, AlertTriangle,
  Loader2, Database, RefreshCw, CheckCircle2, Palette,
  ChevronRight, Image as ImageIcon, UploadCloud
} from 'lucide-react';
import ThemeColorPicker from '@/admin/components/ThemeColorPicker';
import BannerSettingsTab from '@/admin/components/BannerSettingsTab';
import PromoBanner from '@/components/PromoBanner';
import { setThemeColor } from '@/hooks/use-theme-color';
import { Card } from '@/components/ui/card';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import PhotoCropModal from '@/admin/components/PhotoCropModal';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { compressImage } from '@/lib/image-utils';
import {
  downloadProductTemplate, importProductsFromExcel,
  exportAllDataToExcel, importAllDataFromExcel,
} from '@/lib/excel-utils';
import { isDbConfigured } from '@/lib/db';
import { hashPassword } from '@/lib/password';
import { cn } from '@/lib/utils';

/* ─────────────────────────────────────────────────────────────────────────────
   TAB CONFIG
───────────────────────────────────────────────────────────────────────────── */
type Tab = 'toko' | 'pembayaran' | 'kategori' | 'pengguna' | 'banner' | 'tampilan' | 'data' | 'tentang';

interface TabItem { id: Tab; label: string; icon: React.ReactNode }

const TABS: TabItem[] = [
  { id: 'toko',       label: 'Info Toko',    icon: <Store className="w-4 h-4" /> },
  { id: 'pembayaran', label: 'Pembayaran',   icon: <CreditCard className="w-4 h-4" /> },
  { id: 'kategori',  label: 'Kategori',     icon: <Tag className="w-4 h-4" /> },
  { id: 'pengguna',  label: 'Pengguna',     icon: <Users className="w-4 h-4" /> },
  { id: 'banner',    label: 'Banner',       icon: <ImageIcon className="w-4 h-4" /> },
  { id: 'tampilan',  label: 'Tampilan',     icon: <Palette className="w-4 h-4" /> },
  { id: 'data',      label: 'Data & Backup', icon: <Database className="w-4 h-4" /> },
  { id: 'tentang',   label: 'Tentang',      icon: <Settings className="w-4 h-4" /> },
];

/* ─────────────────────────────────────────────────────────────────────────────
   EMOJI OPTIONS
───────────────────────────────────────────────────────────────────────────── */
const EMOJI_OPTIONS = [
  '📦','🍕','🥤','🍜','🧃','🎽','💊','🧹','📱','🛒','🎁','✂️',
  '🚬','🍺','🍷','🧴','🧼','🪥','🍞','🥩','🐟','🥦','🍎','🍌',
  '☕','🧋','🍦','🍰','🎂','🍫','🍬','🍭','🥐','🍳','🍗','🥚',
  '🧀','🥛','🫙','🧂','🛍️','👟','👗','🧢','💍','⌚','🎮','🖥️',
  '🔧','🔑','🪣','🧺','🪴','🕯️','🔋','💡','🧯','🪑','🛏️','🚿',
  '🏥','💉','🩺','🩹','🧪','🔬','📚','✏️','📎','🖊️','📐','🗂️',
];

/* ─────────────────────────────────────────────────────────────────────────────
   SMALL REUSABLE COMPONENTS
───────────────────────────────────────────────────────────────────────────── */

/** Section wrapper with consistent header */
function Section({ title, description, action, children }: {
  title: string; description?: string;
  action?: React.ReactNode; children: React.ReactNode;
}) {
  return (
    <div className="space-y-5 animate-in fade-in slide-in-from-bottom-2 duration-200">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-base font-semibold text-foreground">{title}</h2>
          {description && (
            <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
          )}
        </div>
        {action}
      </div>
      {children}
    </div>
  );
}

/** Clean card wrapper */
function SettingCard({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn(
      'bg-card border border-border/60 rounded-xl overflow-hidden',
      className
    )}>
      {children}
    </div>
  );
}

/** Card section row with label + right slot */
function SettingRow({ label, description, children, last }: {
  label: string; description?: string;
  children?: React.ReactNode; last?: boolean;
}) {
  return (
    <div className={cn(
      'flex items-center justify-between gap-4 px-4 py-3',
      !last && 'border-b border-border/50'
    )}>
      <div className="min-w-0">
        <p className="text-sm font-medium text-foreground">{label}</p>
        {description && <p className="text-xs text-muted-foreground mt-0.5">{description}</p>}
      </div>
      {children && <div className="flex-shrink-0">{children}</div>}
    </div>
  );
}

/** Inline badge */
function RoleBadge({ role }: { role: string }) {
  if (role === 'admin') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400 border border-amber-200 dark:border-amber-800">
        <BadgeCheck className="w-2.5 h-2.5" /> Admin
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400 border border-blue-200 dark:border-blue-800">
      <Shield className="w-2.5 h-2.5" /> Staf
    </span>
  );
}

/** Stock navigation link row */
function StockLink({ to, icon, label, description }: {
  to: string; icon: React.ReactNode; label: string; description: string;
}) {
  return (
    <Link to={to} className="flex items-center gap-3 px-4 py-3 hover:bg-muted/50 transition-colors border-b border-border/50 last:border-b-0">
      <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center text-muted-foreground">
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium">{label}</p>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      <ChevronRight className="w-4 h-4 text-muted-foreground/50" />
    </Link>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   MAIN COMPONENT
───────────────────────────────────────────────────────────────────────────── */
export default function Pengaturan() {
  const storeSettings   = useDbQuery<StoreSettings>('storeSettings')?.[0];
  const paymentMethods  = useDbQuery<PaymentMethod>('paymentMethods');
  const categories      = useDbQuery<Category>('categories');
  const users           = useDbQuery<User>('users');
  const banners         = useDbQuery<Banner>('banners');

  /* ── Active Tab ── */
  const [activeTab, setActiveTab] = useState<Tab>('toko');

  /* ── Theme ── */
  const [themeHue, setThemeHue] = useState(storeSettings?.themeColor ?? '25');

  useEffect(() => { setThemeHue(storeSettings?.themeColor ?? '25'); }, [storeSettings?.themeColor]);

  /* ── Excel States & Refs ── */
  const [isExporting, setIsExporting] = useState(false);
  const [isImportingAll, setIsImportingAll] = useState(false);
  const [isImportingProd, setIsImportingProd] = useState(false);
  const allDataInputRef = useRef<HTMLInputElement>(null);
  const prodInputRef = useRef<HTMLInputElement>(null);

  /* ── Store ── */
  const [storeDialog, setStoreDialog]   = useState(false);
  const [storeName,   setStoreName]     = useState('');
  const [storeAddr,   setStoreAddr]     = useState('');
  const [storePhone,  setStorePhone]    = useState('');
  const [storeLogo,   setStoreLogo]     = useState<string | undefined>();
  const [receiptFooter, setReceiptFooter] = useState('');
  const [isSavingStore, setIsSavingStore] = useState(false);
  const [cropFile, setCropFile] = useState<File | null>(null);

  const logoInputRef = useRef<HTMLInputElement>(null);

  const openStoreEdit = () => {
    setStoreName(storeSettings?.storeName ?? '');
    setStoreAddr(storeSettings?.address ?? '');
    setStorePhone(storeSettings?.phone ?? '');
    setStoreLogo(storeSettings?.logo);
    setReceiptFooter(storeSettings?.receiptFooter ?? 'Terima kasih atas kunjungan Anda!');
    setStoreDialog(true);
  };

  const saveStore = async () => {
    setIsSavingStore(true);
    try {
      let finalLogoUrl = storeLogo;
      if (storeLogo && storeLogo.startsWith('data:image')) {
        const url = await dbUploadFile('storeSettings', `logo-${Date.now()}.jpg`, storeLogo);
        if (url) finalLogoUrl = url;
      }

      if (storeSettings?.id) {
        if (storeSettings.logo && finalLogoUrl && storeSettings.logo !== finalLogoUrl) {
          await dbDeleteFile(storeSettings.logo);
        } else if (storeSettings.logo && !finalLogoUrl) {
          await dbDeleteFile(storeSettings.logo);
        }
      }

      const updates = {
        storeName: storeName.trim(), address: storeAddr.trim(),
        phone: storePhone.trim(), logo: finalLogoUrl || undefined,
        receiptFooter: receiptFooter.trim(), tables: storeSettings?.tables ?? [],
      };
      
      if (storeSettings?.id) {
        await dbUpdate('storeSettings', storeSettings.id, updates);
      } else {
        await dbInsert('storeSettings', { ...updates, onboardingDone: false, themeColor: storeSettings?.themeColor });
      }
      toast.success('Info toko disimpan');
      setStoreDialog(false);
    } catch (error: any) {
      toast.error('Gagal menyimpan info toko: ' + (error.message || error));
    } finally { setIsSavingStore(false); }
  };

  const handleLogoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { toast.error('File harus berupa gambar'); return; }
    toast.loading('Mengompres logo...', { id: 'compress-logo' });
    try { 
      const compressed = await compressImage(file);
      setCropFile(new File([compressed], file.name, { type: file.type }));
      toast.dismiss('compress-logo');
    }
    catch { 
      toast.dismiss('compress-logo');
      toast.error('Gagal memproses gambar'); 
    }
    if (logoInputRef.current) logoInputRef.current.value = '';
  };

  /* ── Payment Method ── */
  const [pmDialog,   setPmDialog]   = useState(false);
  const [pmName,     setPmName]     = useState('');
  const [pmCategory, setPmCategory] = useState('tunai');
  const [pmEditId,   setPmEditId]   = useState<number | null>(null);
  const [isSavingPm, setIsSavingPm] = useState(false);

  const openPmAdd  = () => { setPmEditId(null); setPmName(''); setPmCategory('tunai'); setPmDialog(true); };
  const openPmEdit = (pm: PaymentMethod) => { setPmEditId(pm.id!); setPmName(pm.name); setPmCategory(pm.category); setPmDialog(true); };
  const savePm = async () => {
    if (!pmName.trim()) return;
    setIsSavingPm(true);
    try {
      if (pmEditId) await dbUpdate('paymentMethods', pmEditId, { name: pmName.trim(), category: pmCategory });
      else await dbInsert('paymentMethods', { name: pmName.trim(), category: pmCategory, isDefault: false, createdAt: new Date().toISOString() });
      setPmDialog(false); toast.success('Metode pembayaran disimpan');
    } catch (error: any) {
      toast.error('Gagal menyimpan metode pembayaran: ' + (error.message || error));
    } finally { setIsSavingPm(false); }
  };
  const deletePm = async (id: string | number) => { await dbDelete('paymentMethods', id); toast.success('Dihapus'); };

  /* ── Category ── */
  const [catDialog,   setCatDialog]   = useState(false);
  const [catName,     setCatName]     = useState('');
  const [catIcon,     setCatIcon]     = useState('📦');
  const [catColor,    setCatColor]    = useState('#FF6B35');
  const [catEditId,   setCatEditId]   = useState<number | null>(null);
  const [isSavingCat, setIsSavingCat] = useState(false);

  const openCatAdd  = () => { setCatEditId(null); setCatName(''); setCatIcon('📦'); setCatColor('#FF6B35'); setCatDialog(true); };
  const openCatEdit = (c: Category) => { setCatEditId(c.id!); setCatName(c.name); setCatIcon(c.icon); setCatColor(c.color); setCatDialog(true); };
  const saveCat = async () => {
    if (!catName.trim()) return;
    setIsSavingCat(true);
    try {
      if (catEditId) await dbUpdate('categories', catEditId, { name: catName.trim(), icon: catIcon, color: catColor });
      else await dbInsert('categories', { name: catName.trim(), icon: catIcon, color: catColor, createdAt: new Date().toISOString() });
      setCatDialog(false); toast.success('Kategori disimpan');
    } catch (error: any) {
      toast.error('Gagal menyimpan kategori: ' + (error.message || error));
    } finally { setIsSavingCat(false); }
  };
  const deleteCat = async (id: string | number) => { await dbDelete('categories', id); toast.success('Dihapus'); };

  /* ── Users ── */
  const [userDialog,    setUserDialog]    = useState(false);
  const [userUsername,  setUserUsername]  = useState('');
  const [userName,      setUserName]      = useState('');
  const [userWhatsapp,  setUserWhatsapp]  = useState('');
  const [userPassword,  setUserPassword]  = useState('');
  const [userRole,      setUserRole]      = useState<'admin' | 'user'>('user');
  const [userEditId,    setUserEditId]    = useState<number | null>(null);
  const [showPassword,  setShowPassword]  = useState(false);
  const [isSavingUser,  setIsSavingUser]  = useState(false);

  const openUserAdd  = () => { setUserEditId(null); setUserUsername(''); setUserName(''); setUserWhatsapp(''); setUserPassword(''); setUserRole('user'); setShowPassword(false); setUserDialog(true); };
  const openUserEdit = (u: User) => { setUserEditId(u.id!); setUserUsername(u.username); setUserName(u.name ?? ''); setUserWhatsapp(u.whatsapp ?? ''); setUserPassword(''); setUserRole(u.role as 'admin' | 'user'); setShowPassword(false); setUserDialog(true); };
  const saveUser = async () => {
    if (!userUsername.trim()) return;
    if (!userEditId && !userPassword) { toast.error('Password wajib diisi untuk pengguna baru'); return; }
    setIsSavingUser(true);
    try {
      let password_hash = '';
      if (userPassword) password_hash = await hashPassword(userPassword);
      if (userEditId) {
        const updates: Record<string, unknown> = { username: userUsername.trim(), role: userRole, name: userName.trim(), whatsapp: userWhatsapp.trim() };
        if (password_hash) updates.password_hash = password_hash;
        await dbUpdate('users', userEditId, updates);
      } else {
        await dbInsert('users', { username: userUsername.trim(), password_hash, role: userRole, name: userName.trim(), whatsapp: userWhatsapp.trim(), createdAt: new Date().toISOString() });
      }
      setUserDialog(false); toast.success('Pengguna disimpan');
    } catch (error: any) {
      toast.error('Gagal menyimpan pengguna: ' + (error.message || error));
    } finally { setIsSavingUser(false); }
  };
  const deleteUser = async (id: string | number) => { await dbDelete('users', id); toast.success('Pengguna dihapus'); };

  const [bannerDialog,    setBannerDialog]    = useState(false);
  const [bannerEditId,    setBannerEditId]    = useState<number | null>(null);
  const [bannerTitle,     setBannerTitle]     = useState('');
  const [bannerDesc,      setBannerDesc]      = useState('');
  const [bannerLink,      setBannerLink]      = useState('');
  const [bannerImage,     setBannerImage]     = useState<File | string | null>(null);
  const [bannerIsActive,  setBannerIsActive]  = useState(true);
  const [isSavingBanner,  setIsSavingBanner]  = useState(false);
  const bannerInputRef = useRef<HTMLInputElement>(null);

  const PRESET_BANNERS = [
    { id: 'preset:blue', class: 'from-blue-600 via-indigo-600 to-purple-600' },
    { id: 'preset:green', class: 'from-emerald-600 via-teal-600 to-cyan-600' },
    { id: 'preset:red', class: 'from-rose-600 via-red-600 to-orange-600' },
    { id: 'preset:purple', class: 'from-fuchsia-600 via-purple-600 to-violet-600' },
    { id: 'preset:orange', class: 'from-orange-500 via-amber-500 to-yellow-500' }
  ];

  const openBannerAdd  = () => { setBannerEditId(null); setBannerTitle(''); setBannerDesc(''); setBannerLink(''); setBannerImage(null); setBannerIsActive(true); setBannerDialog(true); };
  const openBannerEdit = (b: Banner) => { setBannerEditId(b.id!); setBannerTitle(b.title); setBannerDesc(b.description || ''); setBannerLink(b.link || ''); setBannerImage(b.imageUrl); setBannerIsActive(b.isActive); setBannerDialog(true); };
  const saveBanner = async () => {
    if (!bannerTitle.trim() || !bannerImage) { toast.error('Judul dan gambar wajib diisi'); return; }
    setIsSavingBanner(true);
    try {
      let imageUrl = typeof bannerImage === 'string' ? bannerImage : '';
      if (bannerImage instanceof File) {
        const uploaded = await dbUploadFile('mesenae', `banner-${Date.now()}`, bannerImage);
        if (uploaded) imageUrl = uploaded;
        else throw new Error('Upload gambar gagal');
      }
      const payload = { title: bannerTitle.trim(), description: bannerDesc.trim(), imageUrl, link: bannerLink.trim(), isActive: bannerIsActive };
      if (bannerEditId) await dbUpdate('banners', bannerEditId, payload);
      else await dbInsert('banners', payload);
      setBannerDialog(false); toast.success('Banner disimpan');
    } catch (err: any) { toast.error('Gagal menyimpan banner: ' + (err.message || err)); }
    finally { setIsSavingBanner(false); }
  };
  const deleteBanner = async (id: string | number) => { await dbDelete('banners', id); toast.success('Banner dihapus'); };

  /* ── Storage ── */
  const [storageUsage, setStorageUsage] = useState<{ usage: number; quota: number } | null>(null);
  useEffect(() => {
    navigator.storage?.estimate().then(est =>
      setStorageUsage({ usage: est.usage ?? 0, quota: est.quota ?? 0 })
    );
  }, []);
  const formatBytes = (b: number) => b < 1024 ? `${b} B` : b < 1048576 ? `${(b/1024).toFixed(1)} KB` : b < 1073741824 ? `${(b/1048576).toFixed(1)} MB` : `${(b/1073741824).toFixed(1)} GB`;





  /* ── PM category display map ── */
  const PM_CAT_ICONS: Record<string, string> = {
    tunai: '💵', transfer: '🏦', 'e-wallet': '📱', qris: '📲', lainnya: '•',
  };

  /* ═══════════════════════════════════════════════════════════════════════════
     RENDER
  ═══════════════════════════════════════════════════════════════════════════ */
  return (
    <div className="flex flex-col h-full min-h-0">

      {/* ── Tab bar ── */}
      <div className="px-6 pt-6 pb-0 shrink-0">
        <div className="flex gap-0.5 overflow-x-auto no-scrollbar border-b border-border pb-px">
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-t whitespace-nowrap transition-colors border-b-2 -mb-px',
                activeTab === tab.id
                  ? 'text-primary border-primary bg-primary/5'
                  : 'text-muted-foreground border-transparent hover:text-foreground hover:bg-muted/60'
              )}
            >
              <span className="opacity-70">{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Tab content ── */}
      <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">

        {/* ══════════════ INFO TOKO ══════════════ */}
        {activeTab === 'toko' && (
          <Section
            title="Info Toko"
            description="Identitas, kontak, dan konfigurasi struk."
            action={
              <Button size="sm" variant="outline" className="gap-1.5 h-8 text-xs" onClick={openStoreEdit}>
                <Edit2 className="w-3.5 h-3.5" /> Edit
              </Button>
            }
          >
            {/* Store hero card */}
            <SettingCard>
              <div className="flex items-center gap-4 p-4 bg-gradient-to-r from-primary/6 via-primary/3 to-transparent">
                <div className="w-14 h-14 rounded-xl bg-background border border-border shadow-sm flex items-center justify-center overflow-hidden shrink-0">
                  {storeSettings?.logo
                    ? <img src={storeSettings.logo} alt="Logo" className="w-full h-full object-cover" />
                    : <Store className="w-6 h-6 text-muted-foreground" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm truncate">{storeSettings?.storeName || 'Toko Saya'}</p>
                  <p className="text-xs text-muted-foreground truncate mt-0.5">{storeSettings?.address || 'Alamat belum diatur'}</p>
                  <p className="text-xs text-muted-foreground">{storeSettings?.phone || 'Telepon belum diatur'}</p>
                </div>
              </div>
              <SettingRow last label="Footer Struk" description={storeSettings?.receiptFooter || '–'} />
            </SettingCard>


          </Section>
        )}

        {/* ══════════════ PEMBAYARAN ══════════════ */}
        {activeTab === 'pembayaran' && (
          <Section
            title="Metode Pembayaran"
            description={`${paymentMethods?.length ?? 0} metode terdaftar.`}
            action={
              <Button size="sm" className="gap-1.5 h-8 text-xs" onClick={openPmAdd}>
                <Plus className="w-3.5 h-3.5" /> Tambah
              </Button>
            }
          >
            {!paymentMethods?.length ? (
              <SettingCard>
                <div className="flex flex-col items-center py-10 text-center text-muted-foreground gap-2">
                  <CreditCard className="w-8 h-8 opacity-25" />
                  <p className="text-sm">Belum ada metode pembayaran</p>
                  <Button size="sm" variant="outline" className="mt-1 gap-1.5 text-xs h-8" onClick={openPmAdd}>
                    <Plus className="w-3.5 h-3.5" /> Tambah Sekarang
                  </Button>
                </div>
              </SettingCard>
            ) : (
              <SettingCard>
                {paymentMethods.map((pm, i) => (
                  <div
                    key={pm.id}
                    className={cn('flex items-center gap-3 px-4 py-3 hover:bg-muted/40 transition-colors', i < paymentMethods.length - 1 && 'border-b border-border/50')}
                  >
                    <span className="text-base w-6 text-center">{PM_CAT_ICONS[pm.category] ?? '•'}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{pm.name}</p>
                      <p className="text-xs text-muted-foreground capitalize">{pm.category}</p>
                    </div>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground" onClick={() => openPmEdit(pm)}>
                        <Edit2 className="w-3.5 h-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive/70 hover:text-destructive" onClick={() => deletePm(pm.id!)}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}
              </SettingCard>
            )}
          </Section>
        )}

        {/* ══════════════ KATEGORI ══════════════ */}
        {activeTab === 'kategori' && (
          <Section
            title="Kategori Produk"
            description={`${categories?.length ?? 0} kategori terdaftar.`}
            action={
              <Button size="sm" className="gap-1.5 h-8 text-xs" onClick={openCatAdd}>
                <Plus className="w-3.5 h-3.5" /> Tambah
              </Button>
            }
          >
            {!categories?.length ? (
              <SettingCard>
                <div className="flex flex-col items-center py-10 text-center text-muted-foreground gap-2">
                  <Tag className="w-8 h-8 opacity-25" />
                  <p className="text-sm">Belum ada kategori produk</p>
                  <Button size="sm" variant="outline" className="mt-1 gap-1.5 text-xs h-8" onClick={openCatAdd}>
                    <Plus className="w-3.5 h-3.5" /> Tambah Sekarang
                  </Button>
                </div>
              </SettingCard>
            ) : (
              <SettingCard>
                {categories.map((c, i) => (
                  <div
                    key={c.id}
                    className={cn('flex items-center gap-3 px-4 py-3 hover:bg-muted/40 transition-colors', i < categories.length - 1 && 'border-b border-border/50')}
                  >
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center text-base shrink-0"
                      style={{ backgroundColor: c.color + '20' }}
                    >
                      {c.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{c.name}</p>
                      <p className="text-xs text-muted-foreground">Kategori produk</p>
                    </div>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground" onClick={() => openCatEdit(c)}>
                        <Edit2 className="w-3.5 h-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive/70 hover:text-destructive" onClick={() => deleteCat(c.id!)}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}
              </SettingCard>
            )}
          </Section>
        )}

        {/* ══════════════ PENGGUNA ══════════════ */}
        {activeTab === 'pengguna' && (
          <Section
            title="Manajemen Pengguna"
            description="Kontrol akses berbasis peran (Admin / Staf)."
            action={
              <Button size="sm" className="gap-1.5 h-8 text-xs" onClick={openUserAdd}>
                <Plus className="w-3.5 h-3.5" /> Tambah
              </Button>
            }
          >
            {/* Auth info banner */}
            <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-primary/5 border border-primary/15 text-xs text-primary">
              <Shield className="w-4 h-4 shrink-0" />
              <span>Password dienkripsi kuat menggunakan Bcrypt-TS. Akses dikontrol per peran.</span>
            </div>

            {!users?.length ? (
              <SettingCard>
                <div className="flex flex-col items-center py-10 text-center text-muted-foreground gap-2">
                  <Users className="w-8 h-8 opacity-25" />
                  <p className="text-sm">Belum ada pengguna terdaftar</p>
                  <Button size="sm" variant="outline" className="mt-1 gap-1.5 text-xs h-8" onClick={openUserAdd}>
                    <Plus className="w-3.5 h-3.5" /> Tambah Pengguna Pertama
                  </Button>
                </div>
              </SettingCard>
            ) : (
              <SettingCard>
                {users.map((u, i) => (
                  <div
                    key={u.id}
                    className={cn('flex items-center gap-3 px-4 py-3 hover:bg-muted/40 transition-colors', i < users.length - 1 && 'border-b border-border/50')}
                  >
                    {/* Avatar */}
                    <div className={cn(
                      'w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold text-white shrink-0',
                      u.role === 'admin'
                        ? 'bg-gradient-to-br from-amber-400 to-orange-500'
                        : 'bg-gradient-to-br from-blue-400 to-indigo-500'
                    )}>
                      {u.username.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-medium truncate">{u.name || u.username}</span>
                        <RoleBadge role={u.role} />
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {u.whatsapp ? `WA: ${u.whatsapp}` : (u.role === 'admin' ? 'Akses penuh ke semua fitur' : 'Akses terbatas: dapur & pesanan')}
                      </p>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground" onClick={() => openUserEdit(u)}>
                        <Edit2 className="w-3.5 h-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive/70 hover:text-destructive" onClick={() => deleteUser(u.id!)}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}
              </SettingCard>
            )}
          </Section>
        )}

        {activeTab === 'banner' && (
          <BannerSettingsTab />
        )}

        {/* ══════════════ TAMPILAN ══════════════ */}
        {activeTab === 'tampilan' && (
          <Section title="Tampilan & Tema" description="Mode warna utama dan preferensi visual.">

            <div>
              <p className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wide">Warna Tema</p>
              <SettingCard>
                <div className="p-4">
                  <ThemeColorPicker
                    value={themeHue}
                    onChange={hue => { setThemeHue(hue); setThemeColor(hue); }}
                  />
                </div>
              </SettingCard>
            </div>
          </Section>
        )}

        {/* ══════════════ DATA & BACKUP ══════════════ */}
        {activeTab === 'data' && (
          <Section title="Data & Backup" description="Ekspor atau impor data toko dari dan ke format Excel.">
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wide">Backup Total Database</p>
              <SettingCard>
                <SettingRow label="Export Semua Data" description="Unduh file Excel berisi seluruh data toko (Produk, Transaksi, dll)">
                  <Button variant="outline" size="sm" onClick={async () => {
                    try {
                      setIsExporting(true);
                      await exportAllDataToExcel();
                    } finally { setIsExporting(false); }
                  }} disabled={isExporting}>
                    {isExporting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <FileDown className="w-4 h-4 mr-2 text-blue-500" />}
                    Export Data
                  </Button>
                </SettingRow>
                <SettingRow label="Import & Restore Data" description="Pulihkan seluruh data toko dari file Excel (Hati-hati, data lama bisa tertimpa)." last>
                  <Button variant="outline" size="sm" onClick={() => allDataInputRef.current?.click()} disabled={isImportingAll}>
                    {isImportingAll ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <FileUp className="w-4 h-4 mr-2 text-rose-500" />}
                    Import Data
                  </Button>
                  <input type="file" ref={allDataInputRef} className="hidden" accept=".xlsx,.xls" onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    setIsImportingAll(true);
                    try {
                      const res = await importAllDataFromExcel(file);
                      if (res.errors.length) toast.error(`Berhasil dengan beberapa error: ${res.errors[0]}`);
                      else toast.success(`Berhasil restore ${res.successCount} dokumen`);
                    } catch (err: any) { toast.error('Gagal restore data: ' + err.message); }
                    finally { setIsImportingAll(false); if (allDataInputRef.current) allDataInputRef.current.value = ''; }
                  }} />
                </SettingRow>
              </SettingCard>
            </div>

            <div className="mt-6">
              <p className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wide">Produk Khusus</p>
              <SettingCard>
                <SettingRow label="Download Template Produk" description="Format Excel kosong untuk mengisi data produk baru secara massal.">
                  <Button variant="outline" size="sm" onClick={downloadProductTemplate}>
                    <FileSpreadsheet className="w-4 h-4 mr-2 text-emerald-500" />
                    Template Excel
                  </Button>
                </SettingRow>
                <SettingRow label="Import Produk Masal" description="Upload produk baru dari template Excel yang telah diisi." last>
                  <Button variant="outline" size="sm" onClick={() => prodInputRef.current?.click()} disabled={isImportingProd}>
                    {isImportingProd ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <UploadCloud className="w-4 h-4 mr-2 text-primary" />}
                    Upload Produk
                  </Button>
                  <input type="file" ref={prodInputRef} className="hidden" accept=".xlsx,.xls" onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    setIsImportingProd(true);
                    try {
                      const res = await importProductsFromExcel(file);
                      if (res.errors.length) toast.error(`Selesai dengan error: ${res.errors[0]}`);
                      else toast.success(`Berhasil import ${res.successCount} produk`);
                    } catch (err: any) { toast.error('Gagal import produk: ' + err.message); }
                    finally { setIsImportingProd(false); if (prodInputRef.current) prodInputRef.current.value = ''; }
                  }} />
                </SettingRow>
              </SettingCard>
            </div>

            <div className="mt-6">
              <p className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wide">Database Firebase</p>
              <SettingCard>
                <div className="p-4 space-y-3">
                  <p className="text-xs text-muted-foreground">
                    Semua data toko disimpan terpusat di Google Firebase (Firestore & Storage). Sinkronisasi berjalan secara real-time dan koleksi akan terbuat secara otomatis.
                  </p>
                  <div className="p-3 rounded-lg text-xs space-y-1.5 bg-emerald-50 border border-emerald-200 dark:bg-emerald-900/20 dark:border-emerald-800">
                    <div className="flex items-center gap-1.5 font-semibold">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Firebase Terhubung & Aktif
                    </div>
                  </div>
                </div>
              </SettingCard>
            </div>
          </Section>
        )}

        {/* ══════════════ TENTANG ══════════════ */}
        {activeTab === 'tentang' && (
          <Section title="Tentang Aplikasi">
            <SettingCard>
              <div className="flex items-center gap-4 p-5 border-b border-border/50">
                <div className="w-14 h-14 rounded-2xl overflow-hidden bg-primary/10 flex items-center justify-center shrink-0">
                  <img src="/icon-192.png" alt="MesenAe" className="w-full h-full object-contain p-2" onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }} />
                </div>
                <div>
                  <p className="font-semibold text-sm">MesenAe</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Aplikasi POS dan Self Order untuk Indonesia 🇮🇩</p>
                  <div className="flex items-center gap-2 mt-1.5">
                    <span className="text-[10px] font-medium bg-muted px-2 py-0.5 rounded-full">v1.0</span>
                    <span className={cn(
                      'text-[10px] font-medium px-2 py-0.5 rounded-full',
                      isDbConfigured
                        ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400'
                        : 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400'
                    )}>
                      {isDbConfigured ? '☁️ Terhubung' : '⚠️ DB belum dikonfigurasi'}
                    </span>
                  </div>
                </div>
              </div>
              <SettingRow label="Dikembangkan oleh">
                <span className="text-sm font-medium flex items-center gap-1.5">
                  <Code2 className="w-3.5 h-3.5 text-muted-foreground" /> Ahmad Basith
                </span>
              </SettingRow>
              <SettingRow last label="Penyimpanan">
                {storageUsage ? (
                  <div className="text-right">
                    <p className="text-xs font-medium">
                      {formatBytes(storageUsage.usage)}
                      {storageUsage.quota > 0 && (
                        <span className="text-muted-foreground font-normal"> / {formatBytes(storageUsage.quota)}</span>
                      )}
                    </p>
                    <div className="w-24 h-1 bg-muted rounded-full mt-1 overflow-hidden">
                      <div
                        className="h-full bg-primary rounded-full"
                        style={{ width: `${Math.min(100, storageUsage.quota > 0 ? (storageUsage.usage / storageUsage.quota) * 100 : 0)}%` }}
                      />
                    </div>
                  </div>
                ) : (
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <HardDrive className="w-3.5 h-3.5" /> Memuat…
                  </span>
                )}
              </SettingRow>
            </SettingCard>
          </Section>
        )}

      </div>

      {/* ═══════════════════════════════════════════════════════════════════════
          DIALOGS
      ═══════════════════════════════════════════════════════════════════════ */}

      {/* ── Store Dialog ── */}
      <Dialog open={storeDialog} onOpenChange={setStoreDialog}>
        <DialogContent className="max-w-lg rounded-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Store className="w-4 h-4" /> Info Toko
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            {/* Logo */}
            <div className="space-y-2">
              <Label className="text-xs font-medium">Logo Toko</Label>
              <div className="flex items-center gap-3">
                <div
                  className="w-16 h-16 rounded-xl bg-muted border-2 border-dashed border-border flex items-center justify-center overflow-hidden cursor-pointer hover:border-primary/50 transition-colors"
                  onClick={() => logoInputRef.current?.click()}
                >
                  {storeLogo
                    ? <img src={storeLogo} alt="Logo" className="w-full h-full object-cover" />
                    : <Camera className="w-5 h-5 text-muted-foreground/50" />}
                </div>
                <div className="flex flex-col gap-1.5">
                  <Button type="button" variant="outline" size="sm" className="h-8 text-xs gap-1.5" onClick={() => logoInputRef.current?.click()}>
                    <Camera className="w-3.5 h-3.5" /> {storeLogo ? 'Ganti Logo' : 'Pilih Logo'}
                  </Button>
                  {storeLogo && (
                    <Button type="button" variant="ghost" size="sm" className="h-8 text-xs gap-1.5 text-destructive hover:text-destructive" onClick={() => setStoreLogo(undefined)}>
                      <X className="w-3.5 h-3.5" /> Hapus Logo
                    </Button>
                  )}
                </div>
                <input ref={logoInputRef} type="file" accept="image/*" className="hidden" onChange={handleLogoSelect} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Nama Toko</Label>
                <Input value={storeName} onChange={e => setStoreName(e.target.value)} placeholder="Warung Makan Barokah" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Telepon</Label>
                <Input value={storePhone} onChange={e => setStorePhone(e.target.value)} type="tel" placeholder="08xxxxxxxxxx" />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Alamat</Label>
              <Input value={storeAddr} onChange={e => setStoreAddr(e.target.value)} placeholder="Jl. Diponegoro No. 1" />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs flex items-center gap-1.5"><Receipt className="w-3.5 h-3.5" />Footer Struk</Label>
              <Input value={receiptFooter} onChange={e => setReceiptFooter(e.target.value)} placeholder="Terima kasih atas kunjungan Anda!" />
              <p className="text-[10px] text-muted-foreground">Teks di bagian bawah struk belanja.</p>
            </div>


            <Button className="w-full" onClick={saveStore} disabled={isSavingStore}>
              {isSavingStore ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Menyimpan...</> : 'Simpan Info Toko'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Payment Method Dialog ── */}
      <Dialog open={pmDialog} onOpenChange={setPmDialog}>
        <DialogContent className="max-w-sm rounded-2xl">
          <DialogHeader>
            <DialogTitle>{pmEditId ? 'Edit' : 'Tambah'} Metode Pembayaran</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label className="text-xs">Nama Metode</Label>
              <Input value={pmName} onChange={e => setPmName(e.target.value)} placeholder="Contoh: Transfer BCA" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Kategori</Label>
              <div className="grid grid-cols-3 gap-2">
                {(['tunai', 'transfer', 'e-wallet', 'qris', 'lainnya'] as const).map(c => (
                  <button
                    key={c}
                    onClick={() => setPmCategory(c)}
                    className={cn(
                      'py-2 px-1 rounded-lg text-xs font-medium border transition-colors capitalize',
                      pmCategory === c
                        ? 'border-primary bg-primary/5 text-primary'
                        : 'border-border text-muted-foreground hover:border-border/80'
                    )}
                  >
                    {PM_CAT_ICONS[c]} {c}
                  </button>
                ))}
              </div>
            </div>
            <Button className="w-full" onClick={savePm} disabled={!pmName.trim() || isSavingPm}>
              {isSavingPm ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Menyimpan...</> : 'Simpan'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Category Dialog ── */}
      <Dialog open={catDialog} onOpenChange={setCatDialog}>
        <DialogContent className="max-w-sm rounded-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{catEditId ? 'Edit' : 'Tambah'} Kategori</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label className="text-xs">Nama Kategori</Label>
              <Input value={catName} onChange={e => setCatName(e.target.value)} placeholder="Contoh: Snack, Minuman" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Ikon</Label>
              <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto pr-1">
                {EMOJI_OPTIONS.map(e => (
                  <button
                    key={e}
                    onClick={() => setCatIcon(e)}
                    className={cn(
                      'w-9 h-9 rounded-lg text-base flex items-center justify-center border transition-colors',
                      catIcon === e ? 'border-primary bg-primary/5' : 'border-border hover:border-border/80'
                    )}
                  >
                    {e}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Warna Label</Label>
              <div className="flex items-center gap-3">
                <Input type="color" value={catColor} onChange={e => setCatColor(e.target.value)} className="h-10 w-16 p-1 cursor-pointer" />
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium" style={{ backgroundColor: catColor + '20', color: catColor }}>
                  {catIcon} {catName || 'Preview'}
                </div>
              </div>
            </div>
            <Button className="w-full" onClick={saveCat} disabled={!catName.trim() || isSavingCat}>
              {isSavingCat ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Menyimpan...</> : 'Simpan Kategori'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── User Dialog ── */}
      <Dialog open={userDialog} onOpenChange={v => { setUserDialog(v); if (!v) setShowPassword(false); }}>
        <DialogContent className="max-w-sm rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserCog className="w-4 h-4" /> {userEditId ? 'Edit' : 'Tambah'} Pengguna
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label className="text-xs flex items-center gap-1.5"><Users className="w-3.5 h-3.5" />Username Login</Label>
              <Input value={userUsername} onChange={e => setUserUsername(e.target.value)} placeholder="contoh: kasir1" />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Nama Lengkap</Label>
              <Input value={userName} onChange={e => setUserName(e.target.value)} placeholder="contoh: Budi Santoso" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">No WhatsApp</Label>
              <Input value={userWhatsapp} onChange={e => setUserWhatsapp(e.target.value)} placeholder="085..." />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs flex items-center gap-1.5">
                <Key className="w-3.5 h-3.5" /> Password
                {userEditId && <span className="font-normal text-muted-foreground">(kosongkan jika tidak diubah)</span>}
              </Label>
              <div className="relative">
                <Input
                  type={showPassword ? 'text' : 'password'}
                  value={userPassword}
                  onChange={e => setUserPassword(e.target.value)}
                  placeholder="••••••••"
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs flex items-center gap-1.5"><Shield className="w-3.5 h-3.5" />Hak Akses</Label>
              <div className="grid grid-cols-2 gap-2">
                {(['admin', 'user'] as const).map(role => (
                  <button
                    key={role}
                    onClick={() => setUserRole(role)}
                    className={cn(
                      'p-3 rounded-xl border-2 text-left transition-all',
                      userRole === role
                        ? role === 'admin'
                          ? 'border-amber-400 bg-amber-50 dark:bg-amber-900/20'
                          : 'border-primary bg-primary/5'
                        : 'border-border hover:border-border/80'
                    )}
                  >
                    <div className="flex items-center gap-1.5 mb-1">
                      {role === 'admin'
                        ? <BadgeCheck className={cn('w-4 h-4', userRole === 'admin' ? 'text-amber-600' : 'text-muted-foreground')} />
                        : <Shield className={cn('w-4 h-4', userRole === 'user' ? 'text-primary' : 'text-muted-foreground')} />}
                      <span className={cn(
                        'text-xs font-semibold',
                        userRole === role
                          ? role === 'admin' ? 'text-amber-700 dark:text-amber-400' : 'text-primary'
                          : 'text-muted-foreground'
                      )}>
                        {role === 'admin' ? 'Admin' : 'Staf'}
                      </span>
                    </div>
                    <p className="text-[10px] text-muted-foreground">
                      {role === 'admin' ? 'Akses penuh ke semua fitur' : 'Akses terbatas: dapur & pesanan'}
                    </p>
                  </button>
                ))}
              </div>
            </div>

            {!userEditId && !userPassword && (
              <div className="flex items-center gap-2 p-2.5 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                <p className="text-[11px] text-amber-700 dark:text-amber-400">Password wajib diisi untuk pengguna baru.</p>
              </div>
            )}

            <Button className="w-full" onClick={saveUser} disabled={!userUsername.trim() || isSavingUser}>
              {isSavingUser ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Menyimpan...</> : 'Simpan Pengguna'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Banner Dialog ── */}
      <Dialog open={bannerDialog} onOpenChange={setBannerDialog}>
        <DialogContent className="max-w-sm rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ImageIcon className="w-4 h-4" /> {bannerEditId ? 'Edit' : 'Tambah'} Banner
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label className="text-xs">Gambar Banner</Label>
              <div
                onClick={() => bannerInputRef.current?.click()}
                className={cn(
                  "relative w-full aspect-[21/9] rounded-xl border-2 border-dashed flex flex-col items-center justify-center cursor-pointer transition-colors overflow-hidden group",
                  bannerImage ? "border-primary bg-primary/5" : "border-border hover:border-primary hover:bg-primary/5"
                )}
              >
                {bannerImage ? (
                  <>
                    {typeof bannerImage === 'string' && bannerImage.startsWith('preset:') ? (
                      <div className={cn("w-full h-full bg-gradient-to-br", PRESET_BANNERS.find(p => p.id === bannerImage)?.class || 'from-blue-600 to-purple-600')} />
                    ) : (
                      <img src={typeof bannerImage === 'string' ? bannerImage : URL.createObjectURL(bannerImage)} alt="Preview" className="w-full h-full object-cover" />
                    )}
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                      <Camera className="w-6 h-6" />
                    </div>
                  </>
                ) : (
                  <div className="flex flex-col items-center gap-2 text-muted-foreground">
                    <UploadCloud className="w-6 h-6" />
                    <span className="text-xs font-medium">Klik untuk upload (21:9)</span>
                  </div>
                )}
                <input ref={bannerInputRef} type="file" accept="image/*" className="hidden" onChange={async e => {
                  const file = e.target.files?.[0];
                  if (file) setBannerImage(await compressImage(file));
                }} />
              </div>
              <div className="flex items-center justify-between gap-2 mt-2">
                {PRESET_BANNERS.map((preset, i) => (
                  <button 
                    key={preset.id}
                    onClick={() => setBannerImage(preset.id)}
                    className={cn(
                      "flex-1 aspect-[21/9] rounded-lg overflow-hidden border-2 transition-all bg-gradient-to-br",
                      preset.class,
                      bannerImage === preset.id ? "border-foreground shadow-md scale-105" : "border-transparent opacity-70 hover:opacity-100"
                    )}
                    title={`Preset ${i+1}`}
                  />
                ))}
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Judul Banner</Label>
              <Input value={bannerTitle} onChange={e => setBannerTitle(e.target.value)} placeholder="Contoh: Promo Lebaran" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Deskripsi (Opsional)</Label>
              <Input value={bannerDesc} onChange={e => setBannerDesc(e.target.value)} placeholder="Contoh: Diskon 50% untuk minuman" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Link (Opsional)</Label>
              <Input value={bannerLink} onChange={e => setBannerLink(e.target.value)} placeholder="Contoh: https://wa.me/... atau /produk" />
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg border border-border/50 bg-muted/20">
              <div>
                <p className="text-xs font-semibold">Aktifkan Banner</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">Banner akan ditampilkan di halaman depan</p>
              </div>
              <Switch checked={bannerIsActive} onCheckedChange={setBannerIsActive} />
            </div>
            <Button className="w-full" onClick={saveBanner} disabled={!bannerTitle.trim() || !bannerImage || isSavingBanner}>
              {isSavingBanner ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Menyimpan...</> : 'Simpan Banner'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <PhotoCropModal
        open={!!cropFile}
        onOpenChange={(open) => { if (!open) setCropFile(null); }}
        file={cropFile}
        onCrop={(dataUrl) => {
          setStoreLogo(dataUrl);
          setCropFile(null);
        }}
      />
    </div>
  );
}
