import { useQuery } from '@tanstack/react-query';
import { useEffect } from 'react';
import { getCacheData, setCacheData } from '../lib/db';
import { queryClient } from '@/lib/query-client';

// ══════════════════════════════════════════════════════════
//  Types
// ══════════════════════════════════════════════════════════
export interface ProductVariantOption { name: string; price: number; }
export interface ProductVariantGroup { name: string; type: 'single' | 'multiple'; required: boolean; options: ProductVariantOption[]; }
export interface Category { id?: number; name: string; color: string; icon: string; }
export interface Product { id?: number; name: string; sku: string; categoryId: number; price: number; hpp: number; stock: number; unit: string; variants?: ProductVariantGroup[]; photo?: string; barcode?: string; }
export interface Supplier { id?: number; name: string; phone: string; address: string; notes: string; }
export interface StockIn { id?: number; productId: number; supplierId: number; quantity: number; buyPrice: number; totalPrice: number; date: Date; notes: string; }
export interface StockOut { id?: number; productId: number; quantity: number; reason: string; date: Date; notes: string; }
export interface HppHistory { id?: number; productId: number; oldHpp: number; newHpp: number; source: string; date: Date; }
export interface PaymentMethod { id?: number; name: string; category: string; isDefault: boolean; }
export interface Transaction { id?: number; subtotal: number; discountType: string | null; discountValue: number; discountAmount: number; total: number; paymentMethodId: number; paymentAmount: number; payments?: any[]; change: number; profit: number; date: Date; receiptNumber: string; status: string; kitchenStatus?: string; orderNumber?: string; customerName?: string; tableNumber?: string; remarks?: string; }
export interface TransactionItemRecord { id?: number; transactionId: number; productId: number; productName: string; quantity: number; price: number; hpp: number; discountType: string | null; discountValue: number; discountAmount: number; subtotal: number; selectedVariants?: any[]; notes?: string; }
export interface StoreSettings { id?: number; storeName: string; address: string; phone: string; receiptFooter: string; onboardingDone: boolean; themeColor?: string; logo?: string; tables?: string[]; promoBanners?: any[]; }
export interface User { id?: number; username: string; password_hash: string; role: string; }
export interface Voucher { id?: number; code: string; type: string; value: number; isActive: boolean; applicableProductIds?: number[]; validUntil: Date | null; }

// ── Table name mapping (camelCase → snake_case) ──────────────
const TABLE_MAP: Record<string, string> = {
  categories: 'categories',
  products: 'products',
  suppliers: 'suppliers',
  stockIns: 'stock_ins',
  stockOuts: 'stock_outs',
  hppHistory: 'hpp_history',
  paymentMethods: 'payment_methods',
  transactions: 'transactions',
  transactionItems: 'transaction_items',
  storeSettings: 'store_settings',
  users: 'users',
  vouchers: 'vouchers',
};

// ── Converters ────────────────────────────────────────────────
const mapSnakeToCamel = (obj: any): any => {
  if (!obj || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(mapSnakeToCamel);
  const out: any = {};
  for (const [key, value] of Object.entries(obj)) {
    const camelKey = key.replace(/_([a-z])/g, (_, l) => l.toUpperCase());
    out[camelKey] = value;
  }
  return out;
};

const mapCamelToSnake = (obj: any): any => {
  if (!obj || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(mapCamelToSnake);
  const out: any = {};
  for (const [key, value] of Object.entries(obj)) {
    const snakeKey = key.replace(/[A-Z]/g, l => `_${l.toLowerCase()}`);
    out[snakeKey] = value;
  }
  return out;
};

const getQueryCacheKey = (tableName: string) => `useDbQuery_${tableName}`;

function hydrateQueryFromCache<T>(tableName: string) {
  const queryKey = [tableName];
  const currentData = queryClient.getQueryData<T[]>(queryKey);
  if (currentData && currentData.length > 0) return;
  getCacheData(getQueryCacheKey(tableName)).then((cachedData) => {
    if (cachedData) {
      queryClient.setQueryData(queryKey, cachedData as T[]);
    }
  }).catch(() => {});
}

function updateLocalQueryCache<T>(tableName: string, updater: (current: T[]) => T[]) {
  const queryKey = [tableName];
  const currentData = queryClient.getQueryData<T[]>(queryKey) ?? [];
  const nextData = updater(currentData);
  queryClient.setQueryData(queryKey, nextData);
  setCacheData(getQueryCacheKey(tableName), nextData).catch(() => {});
}

// ══════════════════════════════════════════════════════════
//  useDbQuery — React Query + Periodic Polling (5s)
// ══════════════════════════════════════════════════════════
export function useDbQuery<T = any>(tableCamelCase: string): T[] {
  const tableName = TABLE_MAP[tableCamelCase] || tableCamelCase;
  const queryKey = [tableName];

  useEffect(() => {
    hydrateQueryFromCache<T>(tableName);
  }, [tableName]);

  const { data } = useQuery<T[]>({
    queryKey,
    queryFn: async () => {
      const adminKey = import.meta.env.VITE_ADMIN_API_KEY || 'mesenae-admin-secret-key-2026';
      const cacheKey = getQueryCacheKey(tableName);
      
      try {
        const response = await fetch('/api/google-sheet?action=crud', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-admin-key': adminKey
          },
          body: JSON.stringify({
            action: 'select',
            table: tableName
          })
        });

        if (!response.ok) {
          throw new Error(`Error fetching ${tableName}: ${response.statusText}`);
        }

        const resData = await response.json();
        const data = mapSnakeToCamel(resData.data || []) as T[];
        
        // Simpan data terbaru ke IndexedDB Cache
        setCacheData(cacheKey, data).catch(() => {});
        
        return data;
      } catch (error) {
        console.warn(`[useDbQuery] Network fail for ${tableName}, fallback to IndexedDB cache.`);
        const cachedData = await getCacheData(cacheKey);
        if (cachedData) {
          return cachedData as T[];
        }
        return [] as T[];
      }
    },
    staleTime: 0,
    gcTime: 1000 * 60,
    initialData: undefined,
    refetchOnWindowFocus: false,
    refetchInterval: 1000 * 10,
    refetchIntervalInBackground: true,
  });

  // Tambahkan polling local untuk waiter calls (agar OthersView kasir tahu jika ada panggilan meja baru)
  return Array.isArray(data) ? (data as T[]) : ([] as T[]);
}

// ══════════════════════════════════════════════════════════
//  CRUD helpers — langsung memanggil Vercel API
// ══════════════════════════════════════════════════════════

/** Insert satu record, kembalikan ID record baru */
export async function dbInsert(tableCamelCase: string, data: any): Promise<number> {
  const tableName = TABLE_MAP[tableCamelCase] || tableCamelCase;
  const snakeData = mapCamelToSnake(data);
  const adminKey = import.meta.env.VITE_ADMIN_API_KEY || 'mesenae-admin-secret-key-2026';
  const tempId = data?.id ?? Date.now() * -1;

  updateLocalQueryCache<any>(tableName, current => [...current, { ...data, id: tempId }]);

  const response = await fetch('/api/google-sheet?action=crud', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-admin-key': adminKey
    },
    body: JSON.stringify({
      action: 'insert',
      table: tableName,
      data: snakeData
    })
  });

  if (!response.ok) {
    const resText = await response.text();
    throw new Error(`[dbInsert] Failed to insert into ${tableName}: ${resText}`);
  }

  const resData = await response.json();
  const newId = resData.data?.id ?? tempId;
  if (newId !== tempId) {
    updateLocalQueryCache<any>(tableName, current => current.map(item => item.id === tempId ? { ...item, id: newId } : item));
  }

  return newId;
}

/** Update record berdasarkan ID */
export async function dbUpdate(tableCamelCase: string, id: number, data: any): Promise<void> {
  const tableName = TABLE_MAP[tableCamelCase] || tableCamelCase;
  const snakeData = mapCamelToSnake(data);
  const adminKey = import.meta.env.VITE_ADMIN_API_KEY || 'mesenae-admin-secret-key-2026';

  updateLocalQueryCache<any>(tableName, current => current.map(item => item.id === id ? { ...item, ...data } : item));

  const response = await fetch('/api/google-sheet?action=crud', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-admin-key': adminKey
    },
    body: JSON.stringify({
      action: 'update',
      table: tableName,
      id,
      data: snakeData
    })
  });

  if (!response.ok) {
    const resText = await response.text();
    throw new Error(`[dbUpdate] Failed to update ${tableName}#${id}: ${resText}`);
  }
}

/** Hard delete record berdasarkan ID */
export async function dbDelete(tableCamelCase: string, id: number): Promise<void> {
  const tableName = TABLE_MAP[tableCamelCase] || tableCamelCase;
  const adminKey = import.meta.env.VITE_ADMIN_API_KEY || 'mesenae-admin-secret-key-2026';

  updateLocalQueryCache<any>(tableName, current => current.filter(item => item.id !== id));

  const response = await fetch('/api/google-sheet?action=crud', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-admin-key': adminKey
    },
    body: JSON.stringify({
      action: 'delete',
      table: tableName,
      id
    })
  });

  if (!response.ok) {
    const resText = await response.text();
    throw new Error(`[dbDelete] Failed to delete from ${tableName}#${id}: ${resText}`);
  }
}

/** Upload file ke Google Drive, kembalikan URL thumbnail Drive */
export async function dbUploadFile(
  bucket: string,
  fileName: string,
  file: File | Blob | string
): Promise<string | null> {
  try {
    let dataUrl: string;
    if (typeof file === 'string' && file.startsWith('data:')) {
      dataUrl = file;
    } else {
      dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file as Blob);
      });
    }

    const response = await fetch('/api/google-drive', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        fileName,
        dataUrl
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('[dbUploadFile] Upload failed:', errText);
      return null;
    }

    const resData = await response.json();
    return resData.publicUrl || null;
  } catch (err) {
    console.error('[dbUploadFile] Exception during Google Drive upload:', err);
    return null;
  }
}
