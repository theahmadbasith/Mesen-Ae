import { useQuery } from '@tanstack/react-query';
import { useEffect } from 'react';
import { queryClient } from '@/lib/query-client';
import { collection, doc, getDocs, setDoc, updateDoc, deleteDoc, onSnapshot } from 'firebase/firestore';
import { ref, uploadString, getDownloadURL } from 'firebase/storage';
import { db as firestoreDb, storage } from '@/lib/firebase';

// ══════════════════════════════════════════════════════════
//  Types
// ══════════════════════════════════════════════════════════
export interface ProductVariantOption { name: string; price: number; }
export interface ProductVariantGroup { name: string; type: 'single' | 'multiple'; required: boolean; options: ProductVariantOption[]; }
export interface Category { id?: string | number; name: string; color: string; icon: string; }
export interface Product { id?: string | number; name: string; sku: string; categoryId: string | number; price: number; hpp: number; stock: number; unit: string; variants?: ProductVariantGroup[]; photo?: string; barcode?: string; }
export interface Supplier { id?: string | number; name: string; phone: string; address: string; notes: string; }
export interface StockIn { id?: string | number; productId: string | number; supplierId: string | number; quantity: number; buyPrice: number; totalPrice: number; date: Date | string; notes: string; }
export interface StockOut { id?: string | number; productId: string | number; quantity: number; reason: string; date: Date | string; notes: string; }
export interface HppHistory { id?: string | number; productId: string | number; oldHpp: number; newHpp: number; source: string; date: Date | string; }
export interface PaymentMethod { id?: string | number; name: string; category: string; isDefault: boolean; }
export interface Transaction { id?: string | number; subtotal: number; discountType: string | null; discountValue: number; discountAmount: number; total: number; paymentMethodId: string | number; paymentAmount: number; payments?: any[]; change: number; profit: number; date: Date | string; receiptNumber: string; status: string; kitchenStatus?: string; orderNumber?: string; customerName?: string; tableNumber?: string; remarks?: string; }
export interface TransactionItemRecord { id?: string | number; transactionId: string | number; productId: string | number; productName: string; quantity: number; price: number; hpp: number; discountType: string | null; discountValue: number; discountAmount: number; subtotal: number; selectedVariants?: any[]; notes?: string; }
export interface StoreSettings { id?: string | number; storeName: string; address: string; phone: string; receiptFooter: string; onboardingDone: boolean; themeColor?: string; logo?: string; tables?: string[]; promoBanners?: any[]; }
export interface User { id?: string | number; username: string; password_hash: string; role: string; name?: string; whatsapp?: string; }
export interface Voucher { id?: string | number; code: string; type: string; value: number; isActive: boolean; applicableProductIds?: (string | number)[]; validUntil: Date | string | null; }
export interface Banner { id?: string | number; title: string; description?: string; imageUrl: string; isActive: boolean; link?: string; }

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
  banners: 'banners',
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

// ══════════════════════════════════════════════════════════
//  useDbQuery — React Query with Firestore Real-time support
// ══════════════════════════════════════════════════════════
export function useDbQuery<T = any>(tableCamelCase: string): T[] {
  const tableName = TABLE_MAP[tableCamelCase] || tableCamelCase;
  const queryKey = [tableName];

  useEffect(() => {
    // Firestore real-time snapshot subscription (No offline caching)
    const colRef = collection(firestoreDb, tableName);
    const unsubscribe = onSnapshot(colRef, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      const camelData = mapSnakeToCamel(data) as T[];
      
      queryClient.setQueryData(queryKey, camelData);
    }, (error) => {
      console.warn(`[useDbQuery] Snapshot error for ${tableName}:`, error);
    });

    return () => unsubscribe();
  }, [tableName]);

  const { data } = useQuery<T[]>({
    queryKey,
    queryFn: async () => {
      // Fetch initial data directly from Firestore without any caching fallback
      try {
        const colRef = collection(firestoreDb, tableName);
        const snapshot = await getDocs(colRef);
        const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        return mapSnakeToCamel(data) as T[];
      } catch (error) {
        console.warn(`[useDbQuery] Fetch fail for ${tableName}.`);
        return [] as T[];
      }
    },
    staleTime: Infinity, // Rely on real-time snapshot instead of polling
    gcTime: 1000 * 60,
    initialData: undefined,
    refetchOnWindowFocus: false,
  });

  return Array.isArray(data) ? (data as T[]) : ([] as T[]);
}

// ══════════════════════════════════════════════════════════
//  CRUD helpers — Firestore Implementation
// ══════════════════════════════════════════════════════════

/** Insert satu record, kembalikan ID record baru */
export async function dbInsert(tableCamelCase: string, data: any): Promise<string> {
  const tableName = TABLE_MAP[tableCamelCase] || tableCamelCase;
  const snakeData = mapCamelToSnake(data);
  const docId = data?.id ? String(data.id) : String(Date.now() + Math.floor(Math.random() * 1000));

  try {
    const docRef = doc(firestoreDb, tableName, docId);
    await setDoc(docRef, { ...snakeData, id: docId });
    return docId;
  } catch (error: any) {
    throw new Error(`[dbInsert] Failed to insert into ${tableName}: ${error.message}`);
  }
}

/** Update record berdasarkan ID */
export async function dbUpdate(tableCamelCase: string, id: number | string, data: any): Promise<void> {
  const tableName = TABLE_MAP[tableCamelCase] || tableCamelCase;
  const snakeData = mapCamelToSnake(data);

  try {
    const docRef = doc(firestoreDb, tableName, String(id));
    await updateDoc(docRef, snakeData);
  } catch (error: any) {
    throw new Error(`[dbUpdate] Failed to update ${tableName}#${id}: ${error.message}`);
  }
}

/** Hard delete record berdasarkan ID */
export async function dbDelete(tableCamelCase: string, id: number | string): Promise<void> {
  const tableName = TABLE_MAP[tableCamelCase] || tableCamelCase;

  try {
    const docRef = doc(firestoreDb, tableName, String(id));
    await deleteDoc(docRef);
  } catch (error: any) {
    throw new Error(`[dbDelete] Failed to delete from ${tableName}#${id}: ${error.message}`);
  }
}

/** Upload file ke Firebase Storage, kembalikan URL public */
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

    const storageRef = ref(storage, `${bucket}/${Date.now()}_${fileName}`);
    // uploadString assumes data_url format
    await uploadString(storageRef, dataUrl, 'data_url');
    
    const downloadUrl = await getDownloadURL(storageRef);
    return downloadUrl;
  } catch (err) {
    console.error('[dbUploadFile] Exception during Firebase Storage upload:', err);
    return null;
  }
}
