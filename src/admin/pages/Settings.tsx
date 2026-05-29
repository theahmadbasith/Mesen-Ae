import { useDbQuery, dbInsert, dbUpdate, dbDelete, dbUploadFile, dbDeleteFile } from '@/hooks/db-hooks';
import { type PaymentMethod, type Category, type User, type StoreSettings } from '@/hooks/db-hooks';
import { usePermissions, type UserPermissions, DEFAULT_USER_PERMISSIONS, type ModulePermission } from '@/hooks/use-permissions';
import { useState, useEffect, useRef } from 'react';
import {
  Settings, Store, CreditCard, Tag, Plus, Trash2, Edit2,
  Truck, ArrowDownToLine, ArrowUpFromLine, Receipt,
  HardDrive, Package, Camera, X, Moon, Sun, Code2,
  FileSpreadsheet, FileDown, FileUp, Users, Shield, UserCog,
  Key, Eye, EyeOff, Table2, BadgeCheck, AlertTriangle,
  Loader2, Database, RefreshCw, CheckCircle2, Palette,
  ChevronRight, Paintbrush, UploadCloud, UtensilsCrossed, ChefHat, Link as LinkIcon, Save, ZoomIn, GripVertical, Copy
} from 'lucide-react';
import ThemeColorPicker from '@/admin/components/ThemeColorPicker';
import ReceiptSettings from '@/admin/components/ReceiptSettings';

import { setThemeColor } from '@/hooks/use-theme-color';
import { Card } from '@/components/ui/card';
import { Link, useSearchParams } from 'react-router-dom';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { createPortal } from 'react-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import PhotoCropModal from '@/admin/components/PhotoCropModal';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { compressImage } from '@/lib/image-utils';
import {
  downloadProductTemplate, importProductsFromExcel
} from '@/lib/excel-utils';
import { exportAllDataToJSON, importAllDataFromJSON } from '@/lib/backup-utils';
import { isDbConfigured } from '@/lib/db';
import { hashPassword } from '@/lib/password';
import { cn } from '@/lib/utils';

/* ─────────────────────────────────────────────────────────────────────────────
   TAB CONFIG
───────────────────────────────────────────────────────────────────────────── */
type Tab = 'toko' | 'struk' | 'pembayaran' | 'pengguna' | 'tampilan' | 'data' | 'tentang';

interface TabItem { id: Tab; label: string; icon: React.ReactNode }

const PM_CAT_ICONS: Record<string, React.ReactNode> = {
  tunai: <img src="/ico/tunai.png" alt="tunai" className="w-5 h-5 object-contain inline-block" />, 
  transfer: <img src="/ico/transfer.png" alt="transfer" className="w-5 h-5 object-contain inline-block" />, 
  'e-wallet': <img src="/ico/ewallet.png" alt="e-wallet" className="w-5 h-5 object-contain inline-block" />, 
  qris: <img src="/ico/qris.png" alt="qris" className="w-5 h-5 object-contain inline-block" />, 
  lainnya: <img src="/ico/lainnya.png" alt="lainnya" className="w-5 h-5 object-contain inline-block" />,
};

const TABS: TabItem[] = [
  { id: 'toko',       label: 'Info Toko',    icon: <Store className="w-4 h-4" /> },
  { id: 'struk',      label: 'Struk Pembelian', icon: <Receipt className="w-4 h-4" /> },
  { id: 'pembayaran', label: 'Pembayaran',   icon: <CreditCard className="w-4 h-4" /> },
  { id: 'pengguna',  label: 'Akses Pengguna',   icon: <Users className="w-4 h-4" /> },
  { id: 'tampilan',  label: 'Tampilan',     icon: <Paintbrush className="w-4 h-4" /> },
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
  if (role === 'dapur') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-400 border border-rose-200 dark:border-rose-800">
        <ChefHat className="w-2.5 h-2.5" /> Dapur
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
  const users           = useDbQuery<User>('users');

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const sortedPaymentMethods = [...(paymentMethods || [])].sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = sortedPaymentMethods.findIndex(item => item.id!.toString() === active.id);
      const newIndex = sortedPaymentMethods.findIndex(item => item.id!.toString() === over.id);
      
      const newOrder = arrayMove(sortedPaymentMethods, oldIndex, newIndex);
      
      // Update sortOrder for all items in parallel
      const updates = newOrder.map((pm, index) => {
        return dbUpdate('paymentMethods', pm.id!, { sortOrder: index });
      });
      
      try {
        await Promise.all(updates);
      } catch (err: any) {
        toast.error('Gagal menyimpan urutan: ' + err.message);
      }
    }
  };

  const { canEdit } = usePermissions();
  const hasEditAccess = canEdit('settings');

  const [searchParams, setSearchParams] = useSearchParams();
  const initialTab = (searchParams.get('tab') as Tab) || 'toko';
  const [activeTab, setActiveTab] = useState<Tab>(initialTab);
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);

  // Sync tab with URL
  useEffect(() => {
    if (activeTab !== 'toko') {
      setSearchParams({ tab: activeTab }, { replace: true });
    } else {
      setSearchParams({}, { replace: true });
    }
  }, [activeTab, setSearchParams]);

  // Listen to URL changes from Sidebar
  useEffect(() => {
    const tabFromUrl = searchParams.get('tab') as Tab;
    if (tabFromUrl && tabFromUrl !== activeTab) {
      setActiveTab(tabFromUrl);
    }
  }, [searchParams]);

  /* ── Theme ── */
  const [themeHue, setThemeHue] = useState(storeSettings?.themeColor ?? '217');

  useEffect(() => { setThemeHue(storeSettings?.themeColor ?? '217'); }, [storeSettings?.themeColor]);

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
  const [deliveryMode, setDeliveryMode] = useState<'ambil' | 'diantar'>('diantar');
  const [isSavingStore, setIsSavingStore] = useState(false);
  const [cropFile, setCropFile] = useState<File | null>(null);

  const [customerUrl, setCustomerUrl] = useState('');
  const [isSavingCustomerUrl, setIsSavingCustomerUrl] = useState(false);

  /* -- Receipt Settings & Sistem Penjualan Direct Settings -- */
  useEffect(() => {
    if (storeSettings) {
      setCustomerUrl(storeSettings.customerUrl || '');
      setDeliveryMode(storeSettings.deliveryMode || 'diantar');
    }
  }, [storeSettings]);

  const saveDeliveryModeDirect = async (mode: 'ambil' | 'diantar') => {
    if (!hasEditAccess) {
      toast.error('Akses ditolak.');
      return;
    }
    try {
      if (storeSettings?.id) {
        await dbUpdate('storeSettings', storeSettings.id, { deliveryMode: mode });
        toast.success('Sistem penjualan berhasil diperbarui');
      }
    } catch (e: any) {
      toast.error('Gagal memperbarui sistem penjualan: ' + e.message);
    }
  };

  const saveCustomerUrl = async () => {
    if (!hasEditAccess) {
      toast.error('Akses ditolak.');
      return;
    }
    let url = customerUrl.trim();
    if (!url) { toast.error('URL tidak boleh kosong'); return; }
    if (!url.startsWith('http://') && !url.startsWith('https://')) url = 'https://' + url;
    
    setIsSavingCustomerUrl(true);
    try {
      if (storeSettings?.id) {
        await dbUpdate('storeSettings', storeSettings.id, { customerUrl: url });
        toast.success('URL Aplikasi Customer berhasil disimpan');
      } else {
        toast.error('Pengaturan toko belum diinisialisasi');
      }
    } catch (error: any) {
      toast.error('Gagal menyimpan URL: ' + (error.message || error));
    } finally { setIsSavingCustomerUrl(false); }
  };

  const logoInputRef = useRef<HTMLInputElement>(null);

  const openStoreEdit = () => {
    setStoreName(storeSettings?.storeName ?? '');
    setStoreAddr(storeSettings?.address ?? '');
    setStorePhone(storeSettings?.phone ?? '');
    setStoreLogo(storeSettings?.logo);
    setReceiptFooter(storeSettings?.receiptFooter ?? 'Terima kasih atas kunjungan Anda!');
    setDeliveryMode(storeSettings?.deliveryMode ?? 'diantar');
    setStoreDialog(true);
  };

  const saveStore = async () => {
    if (!hasEditAccess) {
      toast.error('Akses ditolak. Anda tidak memiliki izin untuk mengedit pengaturan.');
      return;
    }
    setIsSavingStore(true);
    try {
      let finalLogoUrl = storeLogo;
      if (storeLogo && storeLogo.startsWith('data:image')) {
        const res = await fetch(storeLogo);
        const blob = await res.blob();
        const compressedDataUrl = await compressImage(blob, 0.5);
        const url = await dbUploadFile('storeSettings', `logo-${Date.now()}.jpg`, compressedDataUrl);
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
        deliveryMode
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
    // Langsung arahkan ke alat Crop dalam ukuran dan resolusi aslinya
    setCropFile(file);
    if (logoInputRef.current) logoInputRef.current.value = '';
  };

  /* ── Payment Method ── */
  const [pmDialog,   setPmDialog]   = useState(false);
  const [pmName,     setPmName]     = useState('');
  const [pmCategory, setPmCategory] = useState('tunai');
  const [pmEditId,   setPmEditId]   = useState<number | null>(null);
  const [isSavingPm, setIsSavingPm] = useState(false);
  const [pmProvider, setPmProvider] = useState<'midtrans' | 'manual'>('manual');
  const [pmQrisString, setPmQrisString] = useState('');
  const [pmBankName, setPmBankName] = useState('');
  const [pmAccountNumber, setPmAccountNumber] = useState('');
  const [pmAccountName, setPmAccountName] = useState('');
  const [pmIconName, setPmIconName] = useState('');

  const openPmAdd  = () => { setPmEditId(null); setPmName(''); setPmCategory('tunai'); setPmProvider('manual'); setPmQrisString(''); setPmBankName(''); setPmAccountNumber(''); setPmAccountName(''); setPmIconName(''); setPmDialog(true); };
  const openPmEdit = (pm: PaymentMethod) => { setPmEditId(pm.id!); setPmName(pm.name); setPmCategory(pm.category); setPmProvider((pm.provider as 'midtrans' | 'manual') || 'midtrans'); setPmQrisString(pm.qrisString || ''); setPmBankName(pm.bankName || ''); setPmAccountNumber(pm.accountNumber || ''); setPmAccountName(pm.accountName || ''); setPmIconName(pm.iconName || ''); setPmDialog(true); };
  const savePm = async () => {
    if (!hasEditAccess) {
      toast.error('Akses ditolak. Anda tidak memiliki izin untuk mengedit pengaturan.');
      return;
    }
    if (!pmName.trim()) return;
    setIsSavingPm(true);
    try {
      const isManualTransferOrEwallet = (pmCategory === 'transfer' || pmCategory === 'e-wallet') && pmProvider === 'manual';
      const updates = { 
        name: pmName.trim(), 
        category: pmCategory,
        provider: pmCategory === 'qris' || pmCategory === 'transfer' || pmCategory === 'e-wallet' ? pmProvider : undefined,
        qrisString: pmCategory === 'qris' && pmProvider === 'manual' ? pmQrisString : undefined,
        bankName: isManualTransferOrEwallet ? pmBankName : undefined,
        accountNumber: isManualTransferOrEwallet ? pmAccountNumber : undefined,
        accountName: isManualTransferOrEwallet ? pmAccountName : undefined,
        iconName: isManualTransferOrEwallet ? pmIconName : undefined,
      };
      if (pmEditId) await dbUpdate('paymentMethods', pmEditId, updates);
      else await dbInsert('paymentMethods', { ...updates, isDefault: false, createdAt: new Date().toISOString() });
      setPmDialog(false); toast.success('Metode pembayaran disimpan');
    } catch (error: any) {
      toast.error('Gagal menyimpan metode pembayaran: ' + (error.message || error));
    } finally { setIsSavingPm(false); }
  };
  const deletePm = async (id: string | number) => {
    if (!hasEditAccess) {
      toast.error('Akses ditolak. Anda tidak memiliki izin untuk mengedit pengaturan.');
      return;
    }
    await dbDelete('paymentMethods', id);
    toast.success('Dihapus');
  };

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
  const [userRole,      setUserRole]      = useState<'admin' | 'user' | 'dapur'>('user');
  const [userPermissions, setUserPermissions] = useState<UserPermissions>(DEFAULT_USER_PERMISSIONS);
  const [userEditId,    setUserEditId]    = useState<number | null>(null);
  const [showPassword,  setShowPassword]  = useState(false);
  const [isSavingUser,  setIsSavingUser]  = useState(false);

  const openUserAdd  = () => { setUserEditId(null); setUserUsername(''); setUserName(''); setUserWhatsapp(''); setUserPassword(''); setUserRole('user'); setUserPermissions(DEFAULT_USER_PERMISSIONS); setShowPassword(false); setUserDialog(true); };
  const openUserEdit = (u: User) => { setUserEditId(u.id!); setUserUsername(u.username); setUserName(u.name ?? ''); setUserWhatsapp(u.whatsapp ?? ''); setUserPassword(''); setUserRole(u.role as 'admin' | 'user' | 'dapur'); setUserPermissions(u.permissions || DEFAULT_USER_PERMISSIONS); setShowPassword(false); setUserDialog(true); };
  const saveUser = async () => {
    if (!hasEditAccess) {
      toast.error('Akses ditolak. Anda tidak memiliki izin untuk mengedit pengaturan.');
      return;
    }
    if (!userUsername.trim()) return;
    if (!userEditId && !userPassword) { toast.error('Password wajib diisi untuk pengguna baru'); return; }
    setIsSavingUser(true);
    try {
      let password_hash = '';
      if (userPassword) password_hash = await hashPassword(userPassword);
      if (userEditId) {
        const updates: Record<string, unknown> = { username: userUsername.trim(), role: userRole, name: userName.trim(), whatsapp: userWhatsapp.trim() };
        if (password_hash) updates.password_hash = password_hash;
        if (userRole === 'user') updates.permissions = userPermissions;
        await dbUpdate('users', userEditId, updates);
      } else {
        const newUserData: Record<string, unknown> = { username: userUsername.trim(), password_hash, role: userRole, name: userName.trim(), whatsapp: userWhatsapp.trim(), createdAt: new Date().toISOString() };
        if (userRole === 'user') newUserData.permissions = userPermissions;
        await dbInsert('users', newUserData as User);
      }
      setUserDialog(false); toast.success('Pengguna disimpan');
    } catch (error: any) {
      toast.error('Gagal menyimpan pengguna: ' + (error.message || error));
    } finally { setIsSavingUser(false); }
  };
  const deleteUser = async (id: string | number) => {
    if (!hasEditAccess) {
      toast.error('Akses ditolak. Anda tidak memiliki izin untuk mengedit pengaturan.');
      return;
    }
    await dbDelete('users', id);
    toast.success('Pengguna dihapus');
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
            action={hasEditAccess ? (
              <Button size="sm" variant="outline" className="gap-1.5 h-8 text-xs" onClick={openStoreEdit}>
                <Edit2 className="w-3.5 h-3.5" /> Edit
              </Button>
            ) : undefined}
          >
            {/* Store hero card */}
            <SettingCard>
              <div className="flex items-center gap-4 p-4 bg-gradient-to-r from-primary/6 via-primary/3 to-transparent">
                <div 
                  className={cn(
                    "w-14 h-14 rounded-xl bg-background border border-border shadow-sm flex items-center justify-center overflow-hidden shrink-0 relative",
                    storeSettings?.logo && "cursor-pointer group hover:border-primary/50 transition-colors"
                  )}
                  onClick={() => storeSettings?.logo && setLightboxSrc(storeSettings.logo)}
                >
                  {storeSettings?.logo
                    ? (
                      <>
                        <img src={storeSettings.logo} alt="Logo" className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                          <ZoomIn className="w-5 h-5 text-white" />
                        </div>
                      </>
                    )
                    : <Store className="w-6 h-6 text-muted-foreground" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-sm truncate">{storeSettings?.storeName || 'Toko Saya'}</p>
                    <Badge variant={storeSettings?.deliveryMode === 'ambil' ? 'secondary' : 'default'} className="text-[10px] h-5 px-1.5 font-bold">
                      {storeSettings?.deliveryMode === 'ambil' ? 'Ambil Sendiri' : 'Pesan Antar'}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground truncate mt-0.5">{storeSettings?.address || 'Alamat belum diatur'}</p>
                  <p className="text-xs text-muted-foreground">{storeSettings?.phone || 'Telepon belum diatur'}</p>
                </div>
              </div>
            </SettingCard>

            <div className="mt-6">
              <p className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wide flex items-center gap-1.5"><LinkIcon className="w-3.5 h-3.5" /> URL Aplikasi Customer</p>
              <SettingCard>
                <div className="p-4 space-y-3">
                  <p className="text-xs text-muted-foreground leading-snug">URL domain (hosting) tempat aplikasi pembeli diakses. URL ini akan menjadi dasar pembuatan QR Code pemesanan di meja.</p>
                  <div className="flex gap-2">
                    <Input 
                      value={customerUrl}
                      onChange={e => setCustomerUrl(e.target.value)}
                      placeholder="https://mesenae-customer.vercel.app"
                      className="bg-muted/50 h-9"
                    />
                    {hasEditAccess && (
                      <Button onClick={saveCustomerUrl} disabled={isSavingCustomerUrl} className="h-9 px-4 shrink-0 shadow-sm gap-2 font-semibold">
                        {isSavingCustomerUrl ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                        Simpan
                      </Button>
                    )}
                  </div>
                </div>
              </SettingCard>
            </div>

            <div className="mt-6">
              <p className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wide flex items-center gap-1.5"><Package className="w-3.5 h-3.5" /> Sistem Penjualan (Pesanan di Tempat)</p>
              <SettingCard>
                <div className="p-4 space-y-3">
                  <p className="text-xs text-muted-foreground leading-snug">Pilih apakah pelanggan harus mengambil pesanan sendiri saat siap (Ambil Sendiri), atau pelayan mengantarkannya ke meja (Diantar ke Meja).</p>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      disabled={!hasEditAccess}
                      onClick={() => {
                        setDeliveryMode('diantar');
                        saveDeliveryModeDirect('diantar');
                      }}
                      className={cn(
                        "flex flex-col items-center justify-center p-3 rounded-lg border-2 transition-all",
                        deliveryMode === 'diantar' ? "border-primary bg-primary/10 text-primary shadow-sm" : "border-transparent bg-muted/50 text-muted-foreground hover:bg-muted"
                      )}
                    >
                      <UtensilsCrossed className="w-5 h-5 mb-1.5" />
                      <span className="text-xs font-semibold">Diantar ke Meja</span>
                    </button>
                    <button
                      type="button"
                      disabled={!hasEditAccess}
                      onClick={() => {
                        setDeliveryMode('ambil');
                        saveDeliveryModeDirect('ambil');
                      }}
                      className={cn(
                        "flex flex-col items-center justify-center p-3 rounded-lg border-2 transition-all",
                        deliveryMode === 'ambil' ? "border-primary bg-primary/10 text-primary shadow-sm" : "border-transparent bg-muted/50 text-muted-foreground hover:bg-muted"
                      )}
                    >
                      <Package className="w-5 h-5 mb-1.5" />
                      <span className="text-xs font-semibold">Ambil Sendiri</span>
                    </button>
                  </div>
                </div>
              </SettingCard>
            </div>

          </Section>
        )}

        {/* ══════════════ STRUK PEMBELIAN ══════════════ */}
        {activeTab === 'struk' && (
          <ReceiptSettings 
            storeSettings={storeSettings} 
            hasEditAccess={hasEditAccess} 
          />
        )}

        {/* ══════════════ PEMBAYARAN ══════════════ */}
        {activeTab === 'pembayaran' && (
          <Section
            title="Metode Pembayaran"
            description={`${paymentMethods?.length ?? 0} metode terdaftar.`}
            action={hasEditAccess ? (
              <Button size="sm" className="gap-1.5 h-8 text-xs" onClick={openPmAdd}>
                <Plus className="w-3.5 h-3.5" /> Tambah
              </Button>
            ) : undefined}
          >
            {!paymentMethods?.length ? (
              <SettingCard>
                <div className="flex flex-col items-center py-10 text-center text-muted-foreground gap-2">
                  <CreditCard className="w-8 h-8 opacity-25" />
                  <p className="text-sm">Belum ada metode pembayaran</p>
                  {hasEditAccess && (
                  <Button size="sm" variant="outline" className="mt-1 gap-1.5 text-xs h-8" onClick={openPmAdd}>
                    <Plus className="w-3.5 h-3.5" /> Tambah Sekarang
                  </Button>
                  )}
                </div>
              </SettingCard>
            ) : (
              <SettingCard>
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={handleDragEnd}
                >
                  <SortableContext
                    items={sortedPaymentMethods.map(pm => pm.id!.toString())}
                    strategy={verticalListSortingStrategy}
                  >
                    {sortedPaymentMethods.map((pm, i) => (
                      <SortablePaymentMethodItem
                        key={pm.id}
                        id={pm.id!.toString()}
                        pm={pm}
                        isLast={i === sortedPaymentMethods.length - 1}
                        hasEditAccess={hasEditAccess}
                        onEdit={() => openPmEdit(pm)}
                        onDelete={() => deletePm(pm.id!)}
                      />
                    ))}
                  </SortableContext>
                </DndContext>
              </SettingCard>
            )}
          </Section>
        )}

        {/* ══════════════ PENGGUNA ══════════════ */}
        {activeTab === 'pengguna' && (
          <Section
            title="Manajemen Pengguna"
            description="Kontrol akses berbasis peran (Admin / Staf)."
            action={hasEditAccess ? (
              <Button size="sm" className="gap-1.5 h-8 text-xs" onClick={openUserAdd}>
                <Plus className="w-3.5 h-3.5" /> Tambah
              </Button>
            ) : undefined}
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
                  {hasEditAccess && (
                  <Button size="sm" variant="outline" className="mt-1 gap-1.5 text-xs h-8" onClick={openUserAdd}>
                    <Plus className="w-3.5 h-3.5" /> Tambah Pengguna Pertama
                  </Button>
                  )}
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
                        : u.role === 'dapur'
                        ? 'bg-gradient-to-br from-rose-400 to-red-500'
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
                        {u.whatsapp ? `WA: ${u.whatsapp}` : (u.role === 'admin' ? 'Akses penuh ke semua fitur' : u.role === 'dapur' ? 'Akses khusus dapur' : 'Hak akses kustom')}
                      </p>
                    </div>
                    {hasEditAccess && (
                    <div className="flex gap-1 shrink-0">
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground" onClick={() => openUserEdit(u)}>
                        <Edit2 className="w-3.5 h-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive/70 hover:text-destructive" onClick={() => deleteUser(u.id!)}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                    )}
                  </div>
                ))}
              </SettingCard>
            )}
          </Section>
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
          <Section title="Data & Backup" description="Ekspor atau impor seluruh data toko menggunakan format JSON.">
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wide">Backup Total Database</p>
              <SettingCard>
                <SettingRow label="Export Semua Data (JSON)" description="Unduh file JSON berisi seluruh struktur database toko (13 Tabel) untuk backup penuh.">
                  <Button variant="outline" size="sm" onClick={async () => {
                    try {
                      setIsExporting(true);
                      const blob = await exportAllDataToJSON();
                      if (blob) {
                        const url = window.URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = `mesenae-backup-${new Date().toISOString().split('T')[0]}.json`;
                        a.click();
                        toast.success('Backup JSON berhasil diunduh');
                      } else {
                        toast.error('Gagal membuat backup');
                      }
                    } finally { setIsExporting(false); }
                  }} disabled={isExporting}>
                    {isExporting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <FileDown className="w-4 h-4 mr-2 text-blue-500" />}
                    Export JSON
                  </Button>
                </SettingRow>
                <SettingRow label="Restore Database (JSON)" description="Pulihkan seluruh data dari file JSON. Awas: ini akan menimpa data yang ada secara parsial/total!" last>
                  <Button variant="outline" size="sm" onClick={() => allDataInputRef.current?.click()} disabled={isImportingAll || !hasEditAccess}>
                    {isImportingAll ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <FileUp className="w-4 h-4 mr-2 text-rose-500" />}
                    Restore JSON
                  </Button>
                  <input type="file" ref={allDataInputRef} className="hidden" accept=".json" onChange={async (e) => {
                    if (!hasEditAccess) {
                      toast.error('Akses ditolak. Anda tidak memiliki izin untuk mengedit pengaturan.');
                      return;
                    }
                    const file = e.target.files?.[0];
                    if (!file) return;
                    setIsImportingAll(true);
                    try {
                      const res = await importAllDataFromJSON(file);
                      if (res.success) toast.success(`Berhasil memulihkan ${res.imported} dokumen`);
                      else toast.error('Format backup tidak valid atau gagal');
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
                  <Button variant="outline" size="sm" onClick={() => prodInputRef.current?.click()} disabled={isImportingProd || !hasEditAccess}>
                    {isImportingProd ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <UploadCloud className="w-4 h-4 mr-2 text-primary" />}
                    Upload Produk
                  </Button>
                  <input type="file" ref={prodInputRef} className="hidden" accept=".xlsx,.xls" onChange={async (e) => {
                    if (!hasEditAccess) {
                      toast.error('Akses ditolak. Anda tidak memiliki izin untuk mengedit pengaturan.');
                      return;
                    }
                    const file = e.target.files?.[0];
                    if (!file) return;
                    setIsImportingProd(true);
                    try {
                      const res = await importProductsFromExcel(file);
                      if (res.errors.length) toast.error(`Selesai dengan error: ${res.errors[0]}`);
                      else toast.success(`Berhasil import ${res.imported} produk`);
                    } catch (err: any) { toast.error('Gagal import produk: ' + err.message); }
                    finally { setIsImportingProd(false); if (prodInputRef.current) prodInputRef.current.value = ''; }
                  }} />
                </SettingRow>
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
              <SettingRow last label="Dikembangkan oleh">
                <span className="text-sm font-medium flex items-center gap-1.5">
                  <Code2 className="w-3.5 h-3.5 text-muted-foreground" /> Ahmad Basith
                </span>
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
                  className={cn(
                    "w-16 h-16 rounded-xl bg-muted border-2 border-dashed border-border flex items-center justify-center overflow-hidden shrink-0 relative",
                    storeLogo ? "cursor-pointer group hover:border-primary/50 transition-colors" : "cursor-pointer hover:border-primary/50 transition-colors"
                  )}
                  onClick={() => storeLogo ? setLightboxSrc(storeLogo) : logoInputRef.current?.click()}
                >
                  {storeLogo
                    ? (
                      <>
                        <img src={storeLogo} alt="Logo" className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                          <ZoomIn className="w-5 h-5 text-white" />
                        </div>
                      </>
                    )
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

            <Button className="w-full mt-4" onClick={saveStore} disabled={isSavingStore}>
              {isSavingStore ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Menyimpan...</> : 'Simpan Info Toko'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Payment Method Dialog ── */}
      <Dialog open={pmDialog} onOpenChange={setPmDialog}>
        <DialogContent className="max-w-lg rounded-2xl max-h-[90vh] overflow-y-auto">
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
                    <span className="flex items-center justify-center gap-1.5">
                      {PM_CAT_ICONS[c]} {c}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {(pmCategory === 'qris' || pmCategory === 'transfer' || pmCategory === 'e-wallet') && (
              <div className="space-y-1.5 pt-2 border-t border-border/50">
                <Label className="text-xs">Sistem Pemrosesan</Label>
                <div className="flex gap-2">
                  <button
                    onClick={() => setPmProvider('midtrans')}
                    className={cn(
                      'flex-1 py-1.5 rounded-lg text-xs font-medium border transition-colors',
                      pmProvider === 'midtrans' ? 'border-primary bg-primary/5 text-primary' : 'border-border text-muted-foreground hover:border-border/80'
                    )}
                  >
                    Midtrans (Online)
                  </button>
                  <button
                    onClick={() => setPmProvider('manual')}
                    className={cn(
                      'flex-1 py-1.5 rounded-lg text-xs font-medium border transition-colors',
                      pmProvider === 'manual' ? 'border-primary bg-primary/5 text-primary' : 'border-border text-muted-foreground hover:border-border/80'
                    )}
                  >
                    Manual (Bebas Biaya)
                  </button>
                </div>
              </div>
            )}
            
            {pmCategory === 'qris' && pmProvider === 'manual' && (
              <div className="space-y-1.5">
                <Label className="text-xs">QRIS String Statis Dasar</Label>
                <div className="flex gap-2">
                  <Input 
                    value={pmQrisString} 
                    onChange={e => setPmQrisString(e.target.value)} 
                    placeholder="000201010211..." 
                    className="font-mono text-[10px] flex-1" 
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-9 w-9 p-0 shrink-0 rounded-lg hover:border-primary/50 hover:bg-primary/5 transition-all active:scale-95 animate-in fade-in"
                    onClick={() => {
                      if (!pmQrisString) {
                        toast.error('Kolom string kosong.');
                        return;
                      }
                      navigator.clipboard.writeText(pmQrisString);
                      toast.success('String QRIS berhasil disalin.');
                    }}
                    title="Salin String QRIS"
                  >
                    <Copy className="w-3.5 h-3.5 text-foreground" />
                  </Button>
                </div>
                <p className="text-[10px] text-muted-foreground leading-snug">Sistem akan otomatis mengubah string statis ini menjadi QRIS dinamis di kasir berdasarkan nominal transaksi.</p>
              </div>
            )}

            {(pmCategory === 'transfer' || pmCategory === 'e-wallet') && pmProvider === 'manual' && (
              <div className="space-y-4 pt-2 animate-in fade-in slide-in-from-top-2 duration-200">
                <div className="space-y-2">
                  <Label className="text-xs">{pmCategory === 'transfer' ? 'Pilih Bank' : 'Pilih E-Wallet'}</Label>
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                    {(pmCategory === 'transfer' 
                      ? ['bri', 'bca', 'bni', 'mandiri', 'seabank'] 
                      : ['dana', 'gopay', 'ovo', 'shopeepay', 'linkaja']).map(ico => (
                      <button
                        key={ico}
                        onClick={() => {
                          setPmIconName(ico);
                          setPmBankName(ico.toUpperCase());
                        }}
                        className={cn(
                          'p-3 rounded-xl border-2 flex items-center justify-center transition-all bg-background',
                          pmIconName === ico 
                            ? 'border-primary bg-primary/5 shadow-md scale-[1.02]' 
                            : 'border-border/60 hover:border-border hover:bg-muted/50'
                        )}
                        title={ico.toUpperCase()}
                      >
                        <img 
                          src={`/ico/${ico}.png`} 
                          alt={ico} 
                          className="w-12 h-12 object-contain" 
                          onError={(e) => e.currentTarget.style.display = 'none'} 
                        />
                      </button>
                    ))}
                  </div>
                </div>
                
                <div className="space-y-1.5">
                  <Label className="text-xs">{pmCategory === 'transfer' ? 'No. Rekening' : 'No. HP (E-Wallet)'}</Label>
                  <Input value={pmAccountNumber} onChange={e => setPmAccountNumber(e.target.value)} placeholder={pmCategory === 'transfer' ? "Contoh: 1234567890" : "Contoh: 081234567890"} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Nama Pemilik {pmCategory === 'transfer' ? 'Rekening' : 'Akun'}</Label>
                  <Input value={pmAccountName} onChange={e => setPmAccountName(e.target.value)} placeholder="Contoh: Budi Santoso" />
                </div>
              </div>
            )}
            <Button className="w-full" onClick={savePm} disabled={!pmName.trim() || isSavingPm}>
              {isSavingPm ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Menyimpan...</> : 'Simpan'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── User Dialog ── */}
      <Dialog open={userDialog} onOpenChange={v => { setUserDialog(v); if (!v) setShowPassword(false); }}>
        <DialogContent className="max-w-sm rounded-2xl max-h-[90vh] overflow-y-auto">
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
              <div className="grid grid-cols-3 gap-2">
                {(['admin', 'user', 'dapur'] as const).map(role => (
                  <button
                    key={role}
                    onClick={() => setUserRole(role)}
                    className={cn(
                      'p-3 rounded-xl border-2 text-left transition-all',
                      userRole === role
                        ? role === 'admin'
                          ? 'border-amber-400 bg-amber-50 dark:bg-amber-900/20'
                          : role === 'user' ? 'border-primary bg-primary/5' : 'border-rose-400 bg-rose-50 dark:bg-rose-900/20'
                        : 'border-border hover:border-border/80'
                    )}
                  >
                    <div className="flex items-center gap-1.5 mb-1">
                      {role === 'admin' && <BadgeCheck className={cn('w-4 h-4', userRole === 'admin' ? 'text-amber-600' : 'text-muted-foreground')} />}
                      {role === 'user' && <Shield className={cn('w-4 h-4', userRole === 'user' ? 'text-primary' : 'text-muted-foreground')} />}
                      {role === 'dapur' && <ChefHat className={cn('w-4 h-4', userRole === 'dapur' ? 'text-rose-600' : 'text-muted-foreground')} />}
                      <span className={cn(
                        'text-xs font-semibold',
                        userRole === role
                          ? role === 'admin' ? 'text-amber-700 dark:text-amber-400' : role === 'user' ? 'text-primary' : 'text-rose-700 dark:text-rose-400'
                          : 'text-muted-foreground'
                      )}>
                        {role === 'admin' ? 'Admin' : role === 'user' ? 'Staf' : 'Dapur'}
                      </span>
                    </div>
                    <p className="text-[10px] text-muted-foreground leading-tight mt-1">
                      {role === 'admin' ? 'Akses penuh' : role === 'user' ? 'Akses kustom' : 'Akses dapur'}
                    </p>
                  </button>
                ))}
              </div>
            </div>

            {userRole === 'user' && (
              <div className="space-y-3 mt-4 border-t border-border pt-4">
                <Label className="text-xs font-semibold flex items-center gap-1.5">
                  <Shield className="w-3.5 h-3.5" /> Konfigurasi Akses Modul
                </Label>
                <div className="space-y-2">
                  {(Object.entries({
                    dashboard: 'Dashboard', cashier: 'Kasir (POS)', activeOrders: 'Pesanan Aktif', kitchen: 'Dapur',
                    history: 'Riwayat Transaksi', products: 'Daftar Produk', categories: 'Kategori', suppliers: 'Supplier',
                    stockIn: 'Stok Masuk', stockOut: 'Stok Keluar', marketing: 'Marketing (QR, Banner, dll)',
                    tools: 'Alat Lainnya (QRIS Dinamis, Cetak Barcode)',
                    reports: 'Laporan', settings: 'Pengaturan Sistem'
                  }) as [keyof UserPermissions, string][]).map(([key, label]) => (
                    <div key={key} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 rounded-xl border border-border bg-muted/20">
                      <span className="text-xs font-medium">{label}</span>
                      <div className="flex items-center gap-4">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <span className="text-[10px] font-medium text-muted-foreground">Lihat</span>
                          <Switch 
                            checked={userPermissions[key]?.view || false}
                            onCheckedChange={(v) => {
                              setUserPermissions(prev => ({
                                ...prev,
                                [key]: { 
                                  view: v, 
                                  edit: v ? (prev[key]?.edit || false) : false 
                                }
                              }));
                            }}
                            className="scale-75 origin-right"
                          />
                        </label>
                        <label className={cn("flex items-center gap-2", !(userPermissions[key]?.view) ? "opacity-50 pointer-events-none" : "cursor-pointer")}>
                          <span className="text-[10px] font-medium text-muted-foreground">Kelola</span>
                          <Switch 
                            checked={userPermissions[key]?.edit || false}
                            onCheckedChange={(v) => {
                              setUserPermissions(prev => ({
                                ...prev,
                                [key]: { 
                                  view: prev[key]?.view || false, 
                                  edit: v 
                                }
                              }));
                            }}
                            className="scale-75 origin-right"
                            disabled={!(userPermissions[key]?.view)}
                          />
                        </label>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

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

      <PhotoCropModal
        open={!!cropFile}
        onOpenChange={(v) => { if (!v) setCropFile(null); }}
        file={cropFile}
        onCropped={async (dataUrl) => {
          setStoreLogo(dataUrl);
          setCropFile(null);

          try {
            const res = await fetch(dataUrl);
            const blob = await res.blob();
            const compressedDataUrl = await compressImage(blob, 0.5);
            const url = await dbUploadFile('storeSettings', `logo-${Date.now()}.jpg`, compressedDataUrl);
            if (url) {
              setStoreLogo(url);
            }
          } catch (e) {
            console.error("Store logo upload error", e);
          }
        }}
        disableCompression={true}
      />
      {/* Photo Lightbox */}
      {lightboxSrc && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-zinc-950/90 backdrop-blur-md p-4 animate-in fade-in duration-200" onClick={() => setLightboxSrc(null)}>
          <button className="absolute top-6 right-6 w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors backdrop-blur-md border border-white/10" onClick={() => setLightboxSrc(null)}>
            <X className="w-5 h-5 text-white" />
          </button>
          <img src={lightboxSrc} alt="Preview" className="max-w-full max-h-[85dvh] rounded-2xl object-contain shadow-2xl animate-in zoom-in-95 duration-300" onClick={e => e.stopPropagation()} />
        </div>,
        document.body
      )}
    </div>
  );
}

function SortablePaymentMethodItem({ id, pm, isLast, hasEditAccess, onEdit, onDelete }: { id: string, pm: PaymentMethod, isLast: boolean, hasEditAccess: boolean, onEdit: () => void, onDelete: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : 1,
    position: 'relative' as any,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn('flex items-center gap-3 px-4 py-3 hover:bg-muted/40 transition-colors bg-card', !isLast && 'border-b border-border/50', isDragging && 'shadow-lg border border-primary/20 opacity-90 rounded-lg')}
    >
      {hasEditAccess && (
        <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground mr-1 touch-none">
          <GripVertical className="w-4 h-4" />
        </div>
      )}
      <span className="text-base w-6 flex items-center justify-center">
        {pm.provider === 'manual' && pm.iconName ? (
          <img src={`/ico/${pm.iconName}.png`} alt={pm.iconName} className="w-5 h-5 object-contain inline-block" />
        ) : (
          PM_CAT_ICONS[pm.category] ?? '•'
        )}
      </span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium">{pm.name}</p>
        <p className="text-xs text-muted-foreground capitalize">{pm.category}</p>
      </div>
      {hasEditAccess && (
      <div className="flex gap-1">
        <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground" onClick={onEdit}>
          <Edit2 className="w-3.5 h-3.5" />
        </Button>
        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive/70 hover:text-destructive" onClick={onDelete}>
          <Trash2 className="w-3.5 h-3.5" />
        </Button>
      </div>
      )}
    </div>
  );
}
