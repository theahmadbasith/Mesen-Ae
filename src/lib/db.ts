import { mapCategory, mapProduct, mapStoreSettings } from './sync';

export const isDbConfigured = true;

// ============================================================
// INDEXEDDB CACHE HELPER
// ============================================================
const DB_NAME = 'MesenAeCache';
const DB_VERSION = 1;

export async function openCacheDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = (e) => {
      const db = (e.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains('sheet_cache')) {
        db.createObjectStore('sheet_cache', { keyPath: 'cacheKey' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function getCacheData(cacheKey: string): Promise<any> {
  try {
    const db = await openCacheDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('sheet_cache', 'readonly');
      const store = tx.objectStore('sheet_cache');
      const req = store.get(cacheKey);
      req.onsuccess = () => resolve(req.result ? req.result.data : null);
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    return null;
  }
}

export async function setCacheData(cacheKey: string, data: any): Promise<void> {
  try {
    const db = await openCacheDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('sheet_cache', 'readwrite');
      const store = tx.objectStore('sheet_cache');
      const req = store.put({ cacheKey, data, timestamp: Date.now() });
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    // ignore
  }
}

// ============================================================
// GOOGLE SHEETS QUERY BUILDER (Client-side → /api/google-sheet)
// ============================================================

class GoogleSheetQueryBuilder {
  private tableName: string;
  private filters: Record<string, any> = {};
  private actionType: 'select' | 'insert' | 'update' | 'delete' = 'select';
  private actionData: any = null;

  constructor(tableName: string) {
    this.tableName = tableName;
  }

  select(columns: string = '*') {
    return this;
  }

  eq(column: string, value: any) {
    const snakeColumn = column.replace(/[A-Z]/g, l => `_${l.toLowerCase()}`);
    this.filters[snakeColumn] = value;
    return this;
  }

  order(column: string, options?: { ascending?: boolean }) {
    return this;
  }

  limit(num: number) {
    return this;
  }

  async single() {
    const res = await this.execute();
    if (res.error) return { data: null, error: res.error };
    return { data: res.data ? res.data[0] || null : null, error: null };
  }

  then(onfulfilled?: (value: any) => any) {
    return this.execute().then(onfulfilled);
  }

  update(values: any) {
    this.actionType = 'update';
    this.actionData = values;
    return this;
  }

  delete() {
    this.actionType = 'delete';
    return this;
  }

  insert(values: any) {
    this.actionType = 'insert';
    this.actionData = values;
    return this;
  }

  async execute() {
    try {
      const adminKey = import.meta.env.VITE_ADMIN_API_KEY || 'mesenae-admin-secret-key-2026';

      const bodyPayload: any = {
        action: this.actionType,
        table: this.tableName
      };

      if (this.actionType === 'select') {
        bodyPayload.filters = this.filters;
      } else if (this.actionType === 'update') {
        bodyPayload.id = this.filters.id;
        bodyPayload.data = this.actionData;
      } else if (this.actionType === 'delete') {
        if (this.filters.id !== undefined) {
          bodyPayload.id = this.filters.id;
        } else {
          bodyPayload.filters = this.filters;
        }
      } else if (this.actionType === 'insert') {
        bodyPayload.data = this.actionData;
      }

      if (this.actionType === 'select') {
        const cacheKey = `${this.tableName}_${JSON.stringify(this.filters)}`;

        try {
          const response = await fetch('/api/google-sheet?action=crud', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-admin-key': adminKey
            },
            body: JSON.stringify(bodyPayload)
          });

          if (!response.ok) {
            throw new Error(`Server error: ${response.statusText}`);
          }

          const resData = await response.json();
          const outputData = Array.isArray(resData.data) ? resData.data : (resData.data ? [resData.data] : []);
          
          // Save to IndexedDB
          setCacheData(cacheKey, outputData);
          return { data: outputData, error: null };
        } catch (err: any) {
          console.warn(`[GoogleSheetDB] Network fetch failed for ${this.tableName}, fallback to cache.`);
          const cachedData = await getCacheData(cacheKey);
          if (cachedData) {
            return { data: cachedData, error: null };
          }
          return { data: null, error: err };
        }
      } else {
        const response = await fetch('/api/google-sheet?action=crud', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-admin-key': adminKey
          },
          body: JSON.stringify(bodyPayload)
        });

        if (!response.ok) {
          const errText = await response.text();
          return { data: null, error: new Error(errText) };
        }

        const resData = await response.json();
        const outputData = Array.isArray(resData.data) ? resData.data : (resData.data ? [resData.data] : []);
        return { data: outputData, error: null };
      }
    } catch (err: any) {
      console.error(`[GoogleSheetDB] Error executing ${this.actionType} on ${this.tableName}:`, err);
      return { data: null, error: err };
    }
  }
}

// ============================================================
// DATABASE CLIENT — Semua operasi lewat Google Sheets API
// ============================================================

export const db = {
  from: (tableName: string) => {
    return new GoogleSheetQueryBuilder(tableName);
  },
  // Channel stubs — realtime diganti polling di masing-masing komponen
  channel: (name: string) => ({
    on: (...args: any[]) => ({ subscribe: (cb?: Function) => { if (cb) setTimeout(() => cb('SUBSCRIBED'), 100); return { on: (...a: any[]) => ({ subscribe: (c?: Function) => { if (c) setTimeout(() => c('SUBSCRIBED'), 100); } }) }; } }),
    subscribe: (cb?: Function) => { if (cb) setTimeout(() => cb('SUBSCRIBED'), 100); },
    send: () => Promise.resolve('ok'),
  }),
  removeChannel: (_channel: any) => { /* no-op */ }
};

export const dbAdmin = db;

// ============================================================
// HELPER METHODS — Direct API calls ke Google Sheets
// ============================================================

export async function dbUpsert(
  table: string,
  data: Record<string, unknown> | Record<string, unknown>[],
  onConflict = 'id'
) {
  try {
    const adminKey = import.meta.env.VITE_ADMIN_API_KEY || 'mesenae-admin-secret-key-2026';
    await fetch('/api/google-sheet?action=crud', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-admin-key': adminKey
      },
      body: JSON.stringify({
        action: 'upsert',
        table,
        data,
        onConflict
      })
    });
  } catch (err) {
    console.error(`[Google Sheets] dbUpsert error in table ${table}:`, err);
  }
}

export async function dbDelete(table: string, id: number | string) {
  try {
    const adminKey = import.meta.env.VITE_ADMIN_API_KEY || 'mesenae-admin-secret-key-2026';
    await fetch('/api/google-sheet?action=crud', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-admin-key': adminKey
      },
      body: JSON.stringify({
        action: 'delete',
        table,
        id
      })
    });
  } catch (err) {
    console.error(`[Google Sheets] dbDelete error in table ${table}#${id}:`, err);
  }
}

export async function dbSelect<T = unknown>(
  table: string,
  filter?: Record<string, unknown>
): Promise<T[]> {
  try {
    const adminKey = import.meta.env.VITE_ADMIN_API_KEY || 'mesenae-admin-secret-key-2026';
    const response = await fetch('/api/google-sheet?action=crud', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-admin-key': adminKey
      },
      body: JSON.stringify({
        action: 'select',
        table,
        filters: filter
      })
    });
    if (!response.ok) return [];
    const resData = await response.json();
    return (resData.data || []) as T[];
  } catch (err) {
    console.error(`[Google Sheets] dbSelect error in table ${table}:`, err);
    return [];
  }
}

export async function testDbConnection(): Promise<{ ok: boolean; error?: string }> {
  try {
    const response = await fetch('/api/google-sheet?action=diagnostics');
    if (!response.ok) return { ok: false, error: `HTTP ${response.status}` };
    const data = await response.json();
    return { ok: data.status === 'healthy', error: data.message };
  } catch (err: any) {
    return { ok: false, error: err.message };
  }
}

// ============================================================
// CUSTOMER & BACKEND API MAPPERS
// ============================================================

export async function fetchCategories(): Promise<any[]> {
  const rows = await dbSelect<any>('categories');
  return rows.map(mapCategory);
}

export async function fetchProducts(): Promise<any[]> {
  const rows = await dbSelect<any>('products');
  return rows.map(mapProduct);
}

export async function fetchStoreSettings(): Promise<any | null> {
  const rows = await dbSelect<any>('store_settings');
  return rows.length > 0 ? mapStoreSettings(rows[0]) : null;
}

export async function createTransaction(transactionData: any): Promise<number | null> {
  try {
    const adminKey = import.meta.env.VITE_ADMIN_API_KEY || 'mesenae-admin-secret-key-2026';
    const response = await fetch('/api/google-sheet?action=crud', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-admin-key': adminKey
      },
      body: JSON.stringify({
        action: 'insert',
        table: 'transactions',
        data: transactionData
      })
    });
    if (!response.ok) return null;
    const resData = await response.json();
    return resData.data?.id || null;
  } catch (err) {
    console.error('[Google Sheets] createTransaction:', err);
    return null;
  }
}

export async function createTransactionItems(items: any[]): Promise<boolean> {
  try {
    const adminKey = import.meta.env.VITE_ADMIN_API_KEY || 'mesenae-admin-secret-key-2026';
    const response = await fetch('/api/google-sheet?action=crud', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-admin-key': adminKey
      },
      body: JSON.stringify({
        action: 'insert',
        table: 'transaction_items',
        data: items
      })
    });
    return response.ok;
  } catch (err) {
    console.error('[Google Sheets] createTransactionItems:', err);
    return false;
  }
}

export async function updateProductStock(productId: number, newStock: number): Promise<boolean> {
  try {
    const adminKey = import.meta.env.VITE_ADMIN_API_KEY || 'mesenae-admin-secret-key-2026';
    const response = await fetch('/api/google-sheet?action=crud', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-admin-key': adminKey
      },
      body: JSON.stringify({
        action: 'update',
        table: 'products',
        id: productId,
        data: { stock: newStock }
      })
    });
    return response.ok;
  } catch (err) {
    console.error('[Google Sheets] updateProductStock:', err);
    return false;
  }
}

export async function fetchTransactionByOrderNumber(orderNumber: string): Promise<any | null> {
  const rows = await dbSelect<any>('transactions', { order_number: orderNumber });
  return rows.length > 0 ? rows[0] : null;
}

export async function fetchTransactionByReceiptNumber(receiptNumber: string): Promise<any | null> {
  const rows = await dbSelect<any>('transactions', { receipt_number: receiptNumber });
  return rows.length > 0 ? rows[0] : null;
}

export async function fetchTransactionsByCustomerName(customerName: string): Promise<any[]> {
  return dbSelect<any>('transactions', { customer_name: customerName });
}

export async function fetchTransactionItems(transactionId: number): Promise<any[]> {
  return dbSelect<any>('transaction_items', { transaction_id: transactionId });
}

export async function appendPaymentToTransactionByReceipt(receiptNumber: string, payment: any): Promise<boolean> {
  try {
    const existing = await fetchTransactionByReceiptNumber(receiptNumber);
    if (!existing) {
      console.warn('[db] appendPayment: transaction not found', receiptNumber);
      return false;
    }

    let payments: any[] = [];
    try { payments = existing.payments ? JSON.parse(String(existing.payments)) : []; } catch (_) { payments = []; }
    payments.push(payment);

    const totalPaid = payments.reduce((s: number, p: any) => s + (Number(p.amount) || 0), 0);
    const totalDue = Number(existing.total) || Number(existing.grand_total) || 0;
    const newStatus = totalPaid >= totalDue ? 'lunas' : (totalPaid > 0 ? 'partial' : existing.status || 'open');

    const adminKey = import.meta.env.VITE_ADMIN_API_KEY || 'mesenae-admin-secret-key-2026';
    const response = await fetch('/api/google-sheet?action=crud', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-admin-key': adminKey
      },
      body: JSON.stringify({
        action: 'update',
        table: 'transactions',
        id: existing.id,
        data: {
          payments: JSON.stringify(payments),
          payment_amount: totalPaid,
          status: newStatus,
          closed_at: newStatus === 'lunas' ? new Date().toISOString() : existing.closed_at || null
        }
      })
    });

    return response.ok;
  } catch (err) {
    console.error('[db] appendPaymentToTransactionByReceipt error', err);
    return false;
  }
}

// ============================================================
// REALTIME POLLING ENGINES
// ============================================================

export function subscribeToTransactionUpdates(
  transactionId: number,
  onUpdate: (transaction: any) => void
): () => void {
  // Poll every 3s for fast status updates (e.g. when admin confirms payment)
  const interval = setInterval(async () => {
    const rows = await dbSelect<any>('transactions', { id: transactionId });
    if (rows && rows.length > 0) {
      onUpdate(rows[0]);
    }
  }, 3000);

  return () => clearInterval(interval);
}

export function subscribeToProductUpdates(onUpdate: (products: any[]) => void): () => void {
  const interval = setInterval(async () => {
    const products = await fetchProducts();
    onUpdate(products);
  }, 5000);

  return () => clearInterval(interval);
}
