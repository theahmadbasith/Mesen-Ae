import type { NextApiRequest, NextApiResponse } from 'next';
import bcrypt from 'bcryptjs';
import { getAccessToken } from './google-auth.js';

// ─── IN-MEMORY SIGNAL CACHE ─────────────
const MAX_SIGNALS = 100;
let __signals: any[] = [];
if (typeof global !== 'undefined') {
  if (!(global as any).__signals) {
    (global as any).__signals = [];
  }
  __signals = (global as any).__signals;
}
// ─── INTERFACES & TYPES ─────────────

interface GoogleSheetProperties {
  sheetId: number;
  title: string;
}

interface GoogleSheet {
  properties: GoogleSheetProperties;
}

interface GoogleSpreadsheet {
  sheets?: GoogleSheet[];
}

interface BatchUpdateReply {
  addSheet?: {
    properties?: GoogleSheetProperties;
  };
}

interface BatchUpdateResponse {
  replies?: BatchUpdateReply[];
}

interface AppsScriptResponse {
  status: string;
  values?: string[][];
}

interface ApiRequestBody {
  action?: string;
  type?: string;
  table?: string;
  data?: Record<string, unknown> | Record<string, unknown>[];
  id?: number;
  filters?: Record<string, unknown>;
  username?: string;
  password?: string;
}

export interface ColumnMetadata {
  key: string;
  title: string;
}

export interface SheetMetadata {
  name: string;
  columns: ColumnMetadata[];
}

type SheetDataRow = Record<string, unknown>;

// ─── UTILS ─────────────

async function wait(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function fetchWithRetry(url: string, options: RequestInit, maxRetries = 3, baseDelay = 500): Promise<Response> {
  let attempt = 0;

  while (true) {
    try {
      const response = await fetch(url, options);
      if (response.status !== 429 || attempt >= maxRetries) {
        return response;
      }

      const retryAfterHeader = response.headers.get('Retry-After');
      let delay = baseDelay * Math.pow(2, attempt);

      if (retryAfterHeader) {
        const retryAfterSeconds = Number(retryAfterHeader);
        if (!Number.isNaN(retryAfterSeconds)) {
          delay = Math.max(delay, retryAfterSeconds * 1000);
        } else {
          const retryAfterDate = Date.parse(retryAfterHeader);
          if (!Number.isNaN(retryAfterDate)) {
            delay = Math.max(delay, retryAfterDate - Date.now());
          }
        }
      }

      console.warn(`[fetchWithRetry] 429 received, retrying in ${delay}ms (attempt ${attempt + 1}/${maxRetries})`);
      await wait(delay + Math.random() * 200);
      attempt += 1;
    } catch (error: unknown) {
      if (attempt >= maxRetries) {
        throw error;
      }

      const delay = baseDelay * Math.pow(2, attempt);
      console.warn(`[fetchWithRetry] network error, retrying in ${delay}ms (attempt ${attempt + 1}/${maxRetries}):`, error);
      await wait(delay + Math.random() * 200);
      attempt += 1;
    }
  }
}

async function readSheetViaAppsScript(sheetName: string): Promise<string[][]> {
  const appsScriptUrl = process.env.APPS_SCRIPT_URL_READ || process.env.APPS_SCRIPT_URL || process.env.VITE_APPS_SCRIPT_URL;
  if (!appsScriptUrl) {
    throw new Error('APPS_SCRIPT_URL atau VITE_APPS_SCRIPT_URL belum dikonfigurasi untuk Apps Script fallback.');
  }

  const spreadsheetId = process.env.SPREADSHEET_ID;
  if (!spreadsheetId) throw new Error('SPREADSHEET_ID tidak ditemukan di environment variables.');

  const sheetTitle = getSheetTitle(sheetName);
  const response = await fetchWithRetry(appsScriptUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'readSheet', spreadsheetId, sheetTitle, range: 'A:Z' })
  }, 3, 600);

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Apps Script readSheet failed: ${response.status} - ${errorText}`);
  }

  const result = (await response.json()) as AppsScriptResponse;
  if (result.status !== 'success' || !Array.isArray(result.values)) {
    throw new Error(`Apps Script readSheet returned invalid response: ${JSON.stringify(result)}`);
  }

  return result.values;
}

async function tryReadSheetAppsScriptFallback(sheetName: string, reason: string): Promise<string[][]> {
  const appsScriptUrl = process.env.APPS_SCRIPT_URL_READ || process.env.APPS_SCRIPT_URL || process.env.VITE_APPS_SCRIPT_URL;
  if (!appsScriptUrl) {
    console.error(`[readSheet] ${reason}. No Apps Script fallback configured.`);
    return [];
  }

  try {
    return await readSheetViaAppsScript(sheetName);
  } catch (fallbackError: unknown) {
    console.error(`[readSheet] Apps Script fallback failed for ${sheetName}:`, fallbackError);
    return [];
  }
}

// ─── CONFIGURATION ─────────────

export const SHEETS: Record<string, SheetMetadata> = {
  categories: {
    name: 'Kategori',
    columns: [
      { key: 'id', title: 'ID' },
      { key: 'name', title: 'Nama Kategori' },
      { key: 'color', title: 'Warna' },
      { key: 'icon', title: 'Ikon' },
      { key: 'created_at', title: 'Dibuat Pada' }
    ]
  },
  products: {
    name: 'Produk',
    columns: [
      { key: 'id', title: 'ID' },
      { key: 'name', title: 'Nama Produk' },
      { key: 'sku', title: 'SKU' },
      { key: 'category_id', title: 'ID Kategori' },
      { key: 'price', title: 'Harga Jual' },
      { key: 'hpp', title: 'HPP' },
      { key: 'stock', title: 'Stok' },
      { key: 'unit', title: 'Satuan' },
      { key: 'variants', title: 'Varian' },
      { key: 'photo', title: 'Foto' },
      { key: 'barcode', title: 'Barcode' },
      { key: 'created_at', title: 'Dibuat Pada' },
      { key: 'updated_at', title: 'Diperbarui Pada' }
    ]
  },
  suppliers: {
    name: 'Pemasok',
    columns: [
      { key: 'id', title: 'ID' },
      { key: 'name', title: 'Nama Pemasok' },
      { key: 'phone', title: 'No. HP' },
      { key: 'address', title: 'Alamat' },
      { key: 'notes', title: 'Catatan' },
      { key: 'created_at', title: 'Dibuat Pada' }
    ]
  },
  stock_ins: {
    name: 'Stok Masuk',
    columns: [
      { key: 'id', title: 'ID' },
      { key: 'product_id', title: 'ID Produk' },
      { key: 'supplier_id', title: 'ID Pemasok' },
      { key: 'quantity', title: 'Jumlah' },
      { key: 'buy_price', title: 'Harga Beli' },
      { key: 'total_price', title: 'Total Harga' },
      { key: 'date', title: 'Tanggal' },
      { key: 'notes', title: 'Catatan' }
    ]
  },
  stock_outs: {
    name: 'Stok Keluar',
    columns: [
      { key: 'id', title: 'ID' },
      { key: 'product_id', title: 'ID Produk' },
      { key: 'quantity', title: 'Jumlah' },
      { key: 'reason', title: 'Alasan' },
      { key: 'date', title: 'Tanggal' },
      { key: 'notes', title: 'Catatan' }
    ]
  },
  hpp_history: {
    name: 'Riwayat HPP',
    columns: [
      { key: 'id', title: 'ID' },
      { key: 'product_id', title: 'ID Produk' },
      { key: 'old_hpp', title: 'HPP Lama' },
      { key: 'new_hpp', title: 'HPP Baru' },
      { key: 'source', title: 'Sumber' },
      { key: 'date', title: 'Tanggal' }
    ]
  },
  payment_methods: {
    name: 'Metode Pembayaran',
    columns: [
      { key: 'id', title: 'ID' },
      { key: 'name', title: 'Nama Metode' },
      { key: 'category', title: 'Kategori' },
      { key: 'is_default', title: 'Default' },
      { key: 'created_at', title: 'Dibuat Pada' }
    ]
  },
  transactions: {
    name: 'Transaksi',
    columns: [
      { key: 'id', title: 'ID' },
      { key: 'subtotal', title: 'Subtotal' },
      { key: 'discount_type', title: 'Tipe Diskon' },
      { key: 'discount_value', title: 'Nilai Diskon' },
      { key: 'discount_amount', title: 'Jumlah Diskon' },
      { key: 'total', title: 'Total Pembayaran' },
      { key: 'payment_method_id', title: 'ID Metode Pembayaran' },
      { key: 'payment_amount', title: 'Jumlah Bayar' },
      { key: 'payments', title: 'Detail Pembayaran' },
      { key: 'change', title: 'Kembalian' },
      { key: 'profit', title: 'Keuntungan' },
      { key: 'date', title: 'Tanggal' },
      { key: 'receipt_number', title: 'No. Struk' },
      { key: 'status', title: 'Status Transaksi' },
      { key: 'kitchen_status', title: 'Status Dapur' },
      { key: 'order_number', title: 'No. Pesanan' },
      { key: 'customer_name', title: 'Nama Pelanggan' },
      { key: 'table_number', title: 'No. Meja' },
      { key: 'remarks', title: 'Keterangan' },
      { key: 'opened_at', title: 'Waktu Buka' },
      { key: 'closed_at', title: 'Waktu Tutup' }
    ]
  },
  transaction_items: {
    name: 'Item Transaksi',
    columns: [
      { key: 'id', title: 'ID' },
      { key: 'transaction_id', title: 'ID Transaksi' },
      { key: 'product_id', title: 'ID Produk' },
      { key: 'product_name', title: 'Nama Produk' },
      { key: 'quantity', title: 'Jumlah' },
      { key: 'price', title: 'Harga Jual' },
      { key: 'hpp', title: 'HPP' },
      { key: 'discount_type', title: 'Tipe Diskon' },
      { key: 'discount_value', title: 'Nilai Diskon' },
      { key: 'discount_amount', title: 'Jumlah Diskon' },
      { key: 'subtotal', title: 'Subtotal' },
      { key: 'selected_variants', title: 'Varian Terpilih' },
      { key: 'notes', title: 'Catatan' }
    ]
  },
  store_settings: {
    name: 'Pengaturan Toko',
    columns: [
      { key: 'id', title: 'ID' },
      { key: 'store_name', title: 'Nama Toko' },
      { key: 'address', title: 'Alamat' },
      { key: 'phone', title: 'No. HP' },
      { key: 'receipt_footer', title: 'Footer Struk' },
      { key: 'onboarding_done', title: 'Onboarding Selesai' },
      { key: 'theme_color', title: 'Warna Tema' },
      { key: 'logo', title: 'Logo' },
      { key: 'tables', title: 'Daftar Meja' }
    ]
  },
  users: {
    name: 'Pengguna',
    columns: [
      { key: 'id', title: 'ID' },
      { key: 'username', title: 'Username' },
      { key: 'password_hash', title: 'Password Hash' },
      { key: 'role', title: 'Role' },
      { key: 'name', title: 'Nama' },
      { key: 'whatsapp', title: 'No. WA' },
      { key: 'created_at', title: 'Dibuat Pada' }
    ]
  },
  vouchers: {
    name: 'Voucher',
    columns: [
      { key: 'id', title: 'ID' },
      { key: 'code', title: 'Kode Voucher' },
      { key: 'type', title: 'Tipe' },
      { key: 'value', title: 'Nilai' },
      { key: 'is_active', title: 'Aktif' },
      { key: 'applicable_product_ids', title: 'Berlaku Untuk Produk' },
      { key: 'valid_until', title: 'Berlaku Hingga' },
      { key: 'created_at', title: 'Dibuat Pada' }
    ]
  },
  banners: {
    name: 'Banners',
    columns: [
      { key: 'id', title: 'ID' },
      { key: 'title', title: 'Judul' },
      { key: 'description', title: 'Deskripsi' },
      { key: 'image_url', title: 'URL Gambar' },
      { key: 'link', title: 'Link (Tautan)' },
      { key: 'is_active', title: 'Aktif' }
    ]
  }
};

function getSheetMeta(sheetName: string): SheetMetadata | undefined {
  return SHEETS[sheetName];
}

function getSheetTitle(sheetName: string): string {
  return getSheetMeta(sheetName)?.name || sheetName;
}

// ─── GOOGLE SHEETS API CORE ─────────────

export async function readSheet(sheetName: string, createIfMissing = false): Promise<string[][]> {
  const spreadsheetId = process.env.SPREADSHEET_ID;
  if (!spreadsheetId) throw new Error('SPREADSHEET_ID tidak ditemukan di environment variables.');
  const token = await getAccessToken();
  const sheetTitle = getSheetTitle(sheetName);
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(sheetTitle)}!A:Z`;

  let response: Response;
  try {
    response = await fetchWithRetry(url, {
      headers: { Authorization: `Bearer ${token}` }
    }, 5);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    return await tryReadSheetAppsScriptFallback(sheetName, `Direct Sheets API request failed: ${message}`);
  }

  if (!response.ok) {
    if (response.status === 429) {
      console.error(`[readSheet] Quota exceeded while reading ${sheetName}: ${response.status} - Too many requests`);
      return await tryReadSheetAppsScriptFallback(sheetName, 'Direct Sheets API quota exceeded');
    }

    if (response.status === 400 || response.status === 404) {
      console.warn(`[readSheet] Sheet not found: ${sheetName}. Returning empty result.`);
      return [];
    }

    const errorText = await response.text();
    console.error(`[readSheet] Error: ${response.status} - ${errorText}`);
    return [];
  }

  const data = await response.json() as { values?: string[][] };
  return data.values || [];
}

export async function appendToSheet(sheetName: string, rowOrRows: unknown[] | unknown[][]): Promise<void> {
  const spreadsheetId = process.env.SPREADSHEET_ID;
  if (!spreadsheetId) throw new Error('SPREADSHEET_ID tidak ditemukan.');

  const token = await getAccessToken();
  const sheetTitle = getSheetTitle(sheetName);
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(sheetTitle)}!A:Z:append?valueInputOption=RAW`;

  const isMulti = rowOrRows.length > 0 && Array.isArray(rowOrRows[0]);
  const values = isMulti ? rowOrRows : [rowOrRows];

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ values })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to append to sheet ${sheetName}: ${response.status} - ${errorText}`);
  }
}

let knownExistingSheets: Set<string> | null = null;

export async function ensureSheetExists(sheetName: string): Promise<void> {
  if (knownExistingSheets && knownExistingSheets.has(sheetName)) {
    return;
  }

  const spreadsheetId = process.env.SPREADSHEET_ID;
  if (!spreadsheetId) throw new Error('SPREADSHEET_ID missing.');

  const token = await getAccessToken();
  const sheetTitle = getSheetTitle(sheetName);
  
  const getUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}`;
  const getResponse = await fetch(getUrl, {
    headers: { Authorization: `Bearer ${token}` }
  });

  if (!getResponse.ok) {
    const errorText = await getResponse.text();
    throw new Error(`Failed to fetch spreadsheet info: ${getResponse.status} - ${errorText}`);
  }

  const spreadsheet = (await getResponse.json()) as GoogleSpreadsheet;
  const existingSheets = spreadsheet.sheets?.map((s) => s.properties?.title) || [];
  
  knownExistingSheets = new Set(existingSheets);

  if (!knownExistingSheets.has(sheetTitle)) {
    const createUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`;
    const createResponse = await fetch(createUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        requests: [{ addSheet: { properties: { title: sheetTitle } } }]
      })
    });

    if (!createResponse.ok) {
      const errorText = await createResponse.text();
      throw new Error(`Failed to create sheet ${sheetTitle}: ${createResponse.status} - ${errorText}`);
    }

    const createResult = (await createResponse.json()) as BatchUpdateResponse;
    const newSheetId = createResult.replies?.[0]?.addSheet?.properties?.sheetId ?? 0;

    const metadata = SHEETS[sheetName];
    if (metadata) {
      if (sheetName === 'store_settings') {
        await appendToSheet(sheetName, buildStoreSettingsSideRows());
      } else {
        const expectedHeaders = metadata.columns.map(c => c.title);
        await appendToSheet(sheetName, expectedHeaders);
        await applyHeaderStyling(spreadsheetId, newSheetId, expectedHeaders.length);
      }
    }
    
    knownExistingSheets.add(sheetTitle);
  }
}

async function applyHeaderStyling(spreadsheetId: string, sheetId: number, colCount: number): Promise<void> {
  const token = await getAccessToken();
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`;

  await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      requests: [
        {
          repeatCell: {
            range: {
              sheetId,
              startRowIndex: 0,
              endRowIndex: 1,
              startColumnIndex: 0,
              endColumnIndex: colCount
            },
            cell: {
              userEnteredFormat: {
                backgroundColor: { red: 0.2, green: 0.39, blue: 0.78 },
                textFormat: {
                  bold: true,
                  foregroundColor: { red: 1, green: 1, blue: 1 },
                  fontSize: 11
                },
                horizontalAlignment: 'CENTER',
                verticalAlignment: 'MIDDLE',
                wrapStrategy: 'CLIP'
              }
            },
            fields: 'userEnteredFormat(backgroundColor,textFormat,horizontalAlignment,verticalAlignment,wrapStrategy)'
          }
        },
        {
          updateSheetProperties: {
            properties: {
              sheetId,
              gridProperties: { frozenRowCount: 1 }
            },
            fields: 'gridProperties.frozenRowCount'
          }
        },
        {
          autoResizeDimensions: {
            dimensions: {
              sheetId,
              dimension: 'COLUMNS',
              startIndex: 0,
              endIndex: colCount
            }
          }
        }
      ]
    })
  });
}

let allSheetsInitialized = false;
let initPromise: Promise<void> | null = null;

export async function applyBatchHeaderStyling(spreadsheetId: string, stylings: { sheetId: number, colCount: number }[]): Promise<void> {
  const token = await getAccessToken();
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`;

  const requests: Record<string, unknown>[] = [];
  for (const { sheetId, colCount } of stylings) {
    requests.push(
      {
        repeatCell: {
          range: {
            sheetId,
            startRowIndex: 0,
            endRowIndex: 1,
            startColumnIndex: 0,
            endColumnIndex: colCount
          },
          cell: {
            userEnteredFormat: {
              backgroundColor: { red: 0.2, green: 0.39, blue: 0.78 },
              textFormat: {
                bold: true,
                foregroundColor: { red: 1, green: 1, blue: 1 },
                fontSize: 11
              },
              horizontalAlignment: 'CENTER',
              verticalAlignment: 'MIDDLE',
              wrapStrategy: 'CLIP'
            }
          },
          fields: 'userEnteredFormat(backgroundColor,textFormat,horizontalAlignment,verticalAlignment,wrapStrategy)'
        }
      },
      {
        updateSheetProperties: {
          properties: {
            sheetId,
            gridProperties: { frozenRowCount: 1 }
          },
          fields: 'gridProperties.frozenRowCount'
        }
      },
      {
        autoResizeDimensions: {
          dimensions: {
            sheetId,
            dimension: 'COLUMNS',
            startIndex: 0,
            endIndex: colCount
          }
        }
      }
    );
  }

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ requests })
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`[applyBatchHeaderStyling] Error: ${response.status} - ${errorText}`);
  }
}

// ─── SETUP & MAINTENANCE ─────────────

export async function ensureAllSheetsExist(): Promise<void> {
  const spreadsheetId = process.env.SPREADSHEET_ID;
  if (!spreadsheetId) throw new Error('SPREADSHEET_ID tidak ditemukan di environment variables.');

  const token = await getAccessToken();
  
  const getUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}`;
  const getResponse = await fetch(getUrl, {
    headers: { Authorization: `Bearer ${token}` }
  });

  if (!getResponse.ok) {
    const errorText = await getResponse.text();
    throw new Error(`Failed to fetch spreadsheet info: ${getResponse.status} - ${errorText}`);
  }

  const spreadsheet = (await getResponse.json()) as GoogleSpreadsheet;
  const existingSheets = spreadsheet.sheets?.map(s => s.properties?.title) || [];

  const missingSheets = Object.keys(SHEETS).filter(name => !existingSheets.includes(getSheetTitle(name)));

  if (missingSheets.length > 0) {
    console.log(`[ensureAllSheetsExist] Menemukan ${missingSheets.length} sheet yang belum dibuat:`, missingSheets);
    
    const createUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`;
    const requests = missingSheets.map(name => ({
      addSheet: { properties: { title: getSheetTitle(name) } }
    }));

    const createResponse = await fetch(createUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ requests })
    });

    if (!createResponse.ok) {
      const errorText = await createResponse.text();
      throw new Error(`Failed to batch create sheets: ${createResponse.status} - ${errorText}`);
    }

    const createResult = (await createResponse.json()) as BatchUpdateResponse;
    
    const valueUpdateData: Record<string, unknown>[] = [];
    const stylingData: { sheetId: number, colCount: number }[] = [];

    for (let i = 0; i < missingSheets.length; i++) {
      const sheetName = missingSheets[i];
      const newSheetId = createResult.replies?.[i]?.addSheet?.properties?.sheetId ?? 0;
      
      const metadata = SHEETS[sheetName];
      if (metadata) {
        const sheetTitle = getSheetTitle(sheetName);
        if (sheetName === 'store_settings') {
          const rows = buildStoreSettingsSideRows();
          valueUpdateData.push({
            range: `${encodeURIComponent(sheetTitle)}!A1`,
            values: rows
          });
        } else {
          const headers = metadata.columns.map(c => c.title);
          valueUpdateData.push({
            range: `${encodeURIComponent(sheetTitle)}!A1`,
            values: [headers]
          });
          stylingData.push({
            sheetId: newSheetId,
            colCount: headers.length
          });
        }
      }
    }

    if (valueUpdateData.length > 0) {
      const valueUpdateUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchUpdate`;
      const valueUpdateResponse = await fetch(valueUpdateUrl, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          valueInputOption: 'RAW',
          data: valueUpdateData
        })
      });

      if (!valueUpdateResponse.ok) {
        const errorText = await valueUpdateResponse.text();
        console.error(`[ensureAllSheetsExist] Gagal menulis header secara batch: ${valueUpdateResponse.status} - ${errorText}`);
      }
    }

    if (stylingData.length > 0) {
      await applyBatchHeaderStyling(spreadsheetId, stylingData);
    }
    
    console.log(`[ensureAllSheetsExist] Berhasil inisialisasi ${missingSheets.length} sheet baru!`);
  } else {
    console.log(`[ensureAllSheetsExist] Semua ${Object.keys(SHEETS).length} sheet sudah ada.`);
  }
}

export async function setupSheet(sheetName: string): Promise<{ action: string; detail: string }> {
  const spreadsheetId = process.env.SPREADSHEET_ID;
  if (!spreadsheetId) throw new Error('SPREADSHEET_ID missing.');

  const metadata = SHEETS[sheetName];
  if (!metadata) {
    return { action: 'skip', detail: `Sheet "${sheetName}" tidak dikenal, dilewati.` };
  }

  const expectedHeaders = metadata.columns.map(c => c.title);
  const token = await getAccessToken();
  const sheetTitle = getSheetTitle(sheetName);

  const getUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}`;
  const getResponse = await fetch(getUrl, {
    headers: { Authorization: `Bearer ${token}` }
  });

  if (!getResponse.ok) {
    const errorText = await getResponse.text();
    throw new Error(`Failed to fetch spreadsheet info: ${getResponse.status} - ${errorText}`);
  }

  const spreadsheet = (await getResponse.json()) as GoogleSpreadsheet;
  const sheetMeta = spreadsheet.sheets?.find(s => s.properties?.title === sheetTitle);

  if (!sheetMeta) {
    const createUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`;
    const createResponse = await fetch(createUrl, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ requests: [{ addSheet: { properties: { title: sheetTitle } } }] })
    });

    if (!createResponse.ok) {
      const errorText = await createResponse.text();
      throw new Error(`Failed to create sheet ${sheetTitle}: ${createResponse.status} - ${errorText}`);
    }

    const createResult = (await createResponse.json()) as BatchUpdateResponse;
    const newSheetId = createResult.replies?.[0]?.addSheet?.properties?.sheetId ?? 0;

    if (sheetName === 'store_settings') {
      await appendToSheet(sheetName, buildStoreSettingsSideRows());
    } else {
      await appendToSheet(sheetName, expectedHeaders);
      await applyHeaderStyling(spreadsheetId, newSheetId, expectedHeaders.length);
    }

    return { action: 'created', detail: `Sheet "${sheetTitle}" dibuat baru dengan header.` };
  }

  const sheetId = sheetMeta.properties?.sheetId ?? 0;
  const rows = await readSheet(sheetName);

  if (sheetName === 'store_settings') {
    return await ensureStoreSettingsVerticalLayout(sheetName, spreadsheetId, sheetId, sheetTitle, metadata, rows);
  }

  const currentHeader = rows[0] ?? [];

  const headersMatch = expectedHeaders.every(
    (h: string, i: number) => (currentHeader[i] ?? '').trim().toLowerCase() === h.toLowerCase()
  );

  if (headersMatch) {
    await applyHeaderStyling(spreadsheetId, sheetId, expectedHeaders.length);
    return { action: 'ok', detail: `Sheet "${sheetTitle}" sudah benar, styling diperbarui.` };
  }

  const firstRowIsData = currentHeader.length > 0 && !looksLikeHeader(currentHeader);

  if (firstRowIsData) {
    await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        requests: [{
          insertDimension: {
            range: { sheetId, dimension: 'ROWS', startIndex: 0, endIndex: 1 },
            inheritFromBefore: false
          }
        }]
      })
    });
  }

  const headerRange = `${encodeURIComponent(sheetTitle)}!A1:${columnLetter(expectedHeaders.length)}1`;
  await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${headerRange}?valueInputOption=RAW`,
    {
      method: 'PUT',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ values: [expectedHeaders] })
    }
  );

  await applyHeaderStyling(spreadsheetId, sheetId, expectedHeaders.length);

  return {
    action: 'fixed',
    detail: `Header sheet "${sheetName}" diperbaiki. Data lama ${firstRowIsData ? 'digeser ke bawah' : 'tidak berubah'}.`
  };
}

function looksLikeHeader(row: string[]): boolean {
  if (!row || row.length === 0) return false;
  const first = (row[0] ?? '').trim().toLowerCase();
  if (/^\d+$/.test(first)) return false; 
  return ['id', 'key', 'no', 'name', 'code'].includes(first) || first.length < 20;
}

function buildStoreSettingsSideRows(values: Record<string, unknown> = {}): string[][] {
  const metadata = SHEETS['store_settings'];
  if (!metadata) return [];
  return metadata.columns.map(col => {
    const label = col.title;
    let val = values[col.key];
    if (col.key === 'id') {
      val = values.id ?? 1;
    }
    if (val === undefined || val === null) {
      val = '';
    }
    if (typeof val === 'boolean') {
      val = val ? 'true' : 'false';
    } else if (typeof val === 'object' && !Array.isArray(val)) {
      val = JSON.stringify(val);
    } else if (Array.isArray(val)) {
      val = JSON.stringify(val);
    }
    return [label, String(val)];
  });
}

function isStoreSettingsVerticalLayout(rows: string[][]): boolean {
  if (!rows || rows.length === 0) return false;
  const metadata = SHEETS['store_settings'];
  if (!metadata) return false;
  const knownTitles = new Set(metadata.columns.map(c => c.title.toLowerCase().trim()));
  const rowsWithLabels = rows.filter(row => row.length > 0 && knownTitles.has(String(row[0] ?? '').trim().toLowerCase()));
  return rowsWithLabels.length >= Math.min(2, rows.length) && rows.every(row => row.length <= 2);
}

async function writeStoreSettingsSideRows(sheetName: string, record: Record<string, unknown>): Promise<void> {
  const spreadsheetId = process.env.SPREADSHEET_ID;
  if (!spreadsheetId) throw new Error('SPREADSHEET_ID missing.');

  await ensureSheetExists(sheetName);
  const sheetTitle = getSheetTitle(sheetName);
  const token = await getAccessToken();
  const rows = buildStoreSettingsSideRows(record);
  const range = `${encodeURIComponent(sheetTitle)}!A1:B${rows.length}`;

  const response = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}?valueInputOption=RAW`,
    {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ values: rows })
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to write store_settings sheet: ${response.status} - ${errorText}`);
  }

  const existingRows = await readSheet(sheetName);
  const existingRowCount = existingRows.length;
  const maxRowCount = Math.max(existingRowCount, rows.length);
  const clearPromises: Promise<void>[] = [];

  if (existingRowCount > rows.length) {
    const clearRange = `${encodeURIComponent(sheetTitle)}!A${rows.length + 1}:B${existingRowCount}`;
    clearPromises.push(
      fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${clearRange}:clear`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }).then(async res => {
        if (!res.ok) {
          const errorText = await res.text();
          throw new Error(`Failed to clear extra store_settings rows: ${res.status} - ${errorText}`);
        }
      })
    );
  }

  if (maxRowCount > 0) {
    const clearRange = `${encodeURIComponent(sheetTitle)}!C1:Z${maxRowCount}`;
    clearPromises.push(
      fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${clearRange}:clear`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }).then(async res => {
        if (!res.ok) {
          const errorText = await res.text();
          throw new Error(`Failed to clear extra store_settings columns: ${res.status} - ${errorText}`);
        }
      })
    );
  }

  if (clearPromises.length > 0) {
    await Promise.all(clearPromises);
  }
}

async function ensureStoreSettingsVerticalLayout(sheetName: string, spreadsheetId: string, sheetId: number, sheetTitle: string, metadata: SheetMetadata, rows: string[][]): Promise<{ action: string; detail: string }> {
  const titleToKey: Record<string, string> = {};
  metadata.columns.forEach(c => {
    titleToKey[c.title.toLowerCase().trim()] = c.key;
  });

  const parsed: Record<string, unknown> = {};
  const isVertical = isStoreSettingsVerticalLayout(rows);
  
  if (isVertical) {
    rows.forEach(row => {
      if (!row || row.length === 0) return;
      const label = String(row[0] ?? '').trim().toLowerCase();
      if (!label) return;
      const key = titleToKey[label] || label;
      let val: unknown = row[1] ?? '';
      if (val === undefined) val = '';
      if (val === 'true') val = true;
      if (val === 'false') val = false;
      if (val !== '' && (String(val).startsWith('[') || String(val).startsWith('{'))) {
        try { val = JSON.parse(String(val)); } catch { /* ignore */ }
      }
      if (key === 'id') {
        parsed[key] = Number(val) || 1;
      } else {
        parsed[key] = val;
      }
    });
  } else if (rows.length > 1) {
    const headers = rows[0];
    const dataRow = rows[1];
    headers.forEach((header: string, index: number) => {
      const key = titleToKey[header.toLowerCase().trim()] || header.toLowerCase().trim();
      let val: unknown = dataRow[index] ?? '';
      if (val === undefined) val = '';
      if (val === 'true') val = true;
      if (val === 'false') val = false;
      if (val !== '' && (String(val).startsWith('[') || String(val).startsWith('{'))) {
        try { val = JSON.parse(String(val)); } catch { /* ignore */ }
      }
      if (key === 'id') {
        parsed[key] = Number(val) || 1;
      } else {
        parsed[key] = val;
      }
    });
  }

  const desiredRows = buildStoreSettingsSideRows(parsed);
  await writeStoreSettingsSideRows(sheetName, parsed);

  if (isVertical && rows.length === desiredRows.length) {
    return { action: 'ok', detail: `Sheet "${sheetTitle}" sudah berformat side-row.` };
  }

  return { action: 'fixed', detail: `Sheet "${sheetTitle}" disesuaikan ke layout side-row.` };
}

async function ensureAdminUserExists(): Promise<void> {
  const users = await selectRows('users');
  const hasAdmin = users.some((u) => u.username === 'admin');
  if (!hasAdmin) {
    const passwordHash = bcrypt.hashSync('admin123', 10);
    await insertRow('users', {
      username: 'admin',
      password_hash: passwordHash,
      role: 'admin'
    });
    console.log('[ensureAdminUserExists] Admin user berhasil dibuat (admin/admin123)');
  }
}

export async function ensureAllSheetsInitialized(): Promise<void> {
  if (allSheetsInitialized) return;
  if (initPromise) return initPromise;

  initPromise = (async () => {
    try {
      console.log('[ensureAllSheetsInitialized] Memulai setup database Google Sheets...');

      const sheetNames = Object.keys(SHEETS);
      for (const sheetName of sheetNames) {
        try {
          const result = await setupSheet(sheetName);
          console.log(`[Setup] ${sheetName}: ${result.detail}`);
        } catch (err: unknown) {
          console.error(`[Setup] Gagal setup sheet ${sheetName}:`, err);
        }
      }

      try {
        const categories = await selectRows('categories');
        if (categories.length === 0) {
          await insertRow('categories', { name: 'Makanan', color: '#FF6B35', icon: '🍕' });
          await insertRow('categories', { name: 'Minuman', color: '#4ECDC4', icon: '🥤' });
          await insertRow('categories', { name: 'Lainnya', color: '#95A5A6', icon: '📦' });
        }
      } catch (e: unknown) { console.error('[Seed] Gagal seed categories:', e); }

      try {
        const paymentMethods = await selectRows('payment_methods');
        if (paymentMethods.length === 0) {
          await insertRow('payment_methods', { name: 'Tunai', category: 'tunai', is_default: true });
          await insertRow('payment_methods', { name: 'Transfer Bank', category: 'transfer', is_default: false });
          await insertRow('payment_methods', { name: 'E-Wallet', category: 'e-wallet', is_default: false });
          await insertRow('payment_methods', { name: 'QRIS', category: 'qris', is_default: false });
          await insertRow('payment_methods', { name: 'Lainnya', category: 'lainnya', is_default: false });
        }
      } catch (e: unknown) { console.error('[Seed] Gagal seed payment_methods:', e); }

      try {
        const storeSettings = await selectRows('store_settings');
        if (storeSettings.length === 0) {
          await insertRow('store_settings', {
            store_name: 'Toko Saya',
            address: '',
            phone: '',
            receipt_footer: 'Terima kasih atas kunjungan Anda!',
            onboarding_done: false,
            theme_color: '#4F46E5',
            logo: '',
            tables: ['Meja 1', 'Meja 2', 'Meja 3', 'Meja 4', 'Meja 5']
          });
        }
      } catch (e: unknown) { console.error('[Seed] Gagal seed store_settings:', e); }

      try {
        await ensureAdminUserExists();
      } catch (e: unknown) { console.error('[Seed] Gagal seed admin user:', e); }

      allSheetsInitialized = true;
      console.log('[ensureAllSheetsInitialized] Database Google Sheets sukses disetup!');
    } catch (err: unknown) {
      console.error('[ensureAllSheetsInitialized] Gagal melakukan inisialisasi sheet:', err);
      initPromise = null;
      throw err;
    }
  })();

  return initPromise;
}

// ─── DATE PARSERS ─────────────

export function formatDateForSheet(isoString: unknown): string {
  if (!isoString) return '';
  try {
    const date = new Date(String(isoString));
    if (isNaN(date.getTime())) return String(isoString);
    return date.toLocaleString("id-ID", {
      timeZone: "Asia/Jakarta",
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      timeZoneName: "short",
    });
  } catch {
    return String(isoString);
  }
}

export function parseDateFromSheet(raw: unknown): string {
  if (!raw || String(raw).trim() === "") return "";

  const s = String(raw).trim();

  if (/^\d{4}-\d{2}-\d{2}/.test(s)) {
    const d = new Date(s);
    return isNaN(d.getTime()) ? "" : d.toISOString();
  }

  const BULAN: Record<string, number> = {
    jan: 0, feb: 1, mar: 2, apr: 3, mei: 4, jun: 5,
    jul: 6, agu: 7, sep: 8, okt: 9, nov: 10, des: 11,
    januari: 0, februari: 1, maret: 2, april: 3, juni: 5,
    juli: 6, agustus: 7, september: 8, oktober: 9, november: 10, desember: 11,
    january: 0, march: 2, may: 4, june: 5, july: 6,
    august: 7, october: 9, december: 11,
  };

  const m = s.match(/(\d{1,2})\s+([A-Za-z]{3,})\s+(\d{4})(?:[,\s]+(?:pukul\s+)?(\d{1,2})[.:h](\d{2}))?/i);
  if (m) {
    const day = parseInt(m[1]);
    const monKey = m[2].toLowerCase();
    const mon = BULAN[monKey] ?? BULAN[monKey.slice(0, 3)];
    const year = parseInt(m[3]);
    const hour = m[4] ? parseInt(m[4]) : 0;
    const min = m[5] ? parseInt(m[5]) : 0;

    if (mon !== undefined && !isNaN(day) && !isNaN(year) && day >= 1 && day <= 31) {
      const hh = String(hour).padStart(2, "0");
      const mm = String(min).padStart(2, "0");
      const dd = String(day).padStart(2, "0");
      const mo = String(mon + 1).padStart(2, "0");
      const wibStr = `${year}-${mo}-${dd}T${hh}:${mm}:00+07:00`;
      const d = new Date(wibStr);
      return isNaN(d.getTime()) ? "" : d.toISOString();
    }
  }

  const dmyMatch = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
  if (dmyMatch) {
    const day = parseInt(dmyMatch[1]);
    const mon = parseInt(dmyMatch[2]) - 1;
    const year = parseInt(dmyMatch[3]);
    if (day >= 1 && day <= 31 && mon >= 0 && mon <= 11) {
      const d = new Date(Date.UTC(year, mon, day, 0, 0, 0));
      return isNaN(d.getTime()) ? "" : d.toISOString();
    }
  }

  const fallback = new Date(s);
  return isNaN(fallback.getTime()) ? "" : fallback.toISOString();
}

// ─── CRUD LOGIC ─────────────

export async function selectRows(sheetName: string, filters?: Record<string, unknown>, createIfMissing = false): Promise<SheetDataRow[]> {
  const rawRows = await readSheet(sheetName, createIfMissing);
  if (rawRows.length === 0) return [];

  const sheetConfig = SHEETS[sheetName];
  const titleToKey: Record<string, string> = {};
  if (sheetConfig) {
    sheetConfig.columns.forEach(c => {
      titleToKey[c.title.toLowerCase().trim()] = c.key;
    });
  }

  if (sheetName === 'store_settings') {
    const item: SheetDataRow = {};
    const horizontalHeader = rawRows[0];
    const isHorizontal = horizontalHeader.length > 2 && rawRows.length > 1;

    if (isHorizontal) {
      const dataRow = rawRows[1];
      horizontalHeader.forEach((header: string, index: number) => {
        const key = titleToKey[header.toLowerCase().trim()] || header.toLowerCase().trim();
        let val: unknown = dataRow[index] ?? '';
        if (val === undefined) val = '';
        if (key === 'created_at' || key === 'updated_at' || key === 'date' || key === 'opened_at' || key === 'closed_at' || key === 'valid_until') {
          if (val) val = parseDateFromSheet(val);
        } else if (val === 'true') {
          val = true;
        } else if (val === 'false') {
          val = false;
        } else if (val !== '' && !isNaN(Number(val)) && (key === 'id' || key.endsWith('_id'))) {
          val = Number(val);
        } else if (val !== '' && (String(val).startsWith('[') || String(val).startsWith('{'))) {
          try { val = JSON.parse(String(val)); } catch { /* ignore */ }
        }
        item[key] = val;
      });
    } else {
      for (const row of rawRows) {
        if (!row || row.length === 0) continue;
        const label = String(row[0] ?? '').trim().toLowerCase();
        if (!label) continue;
        const key = titleToKey[label] || label;
        let val: unknown = row[1] ?? '';
        if (val === undefined) val = '';
        if (key === 'created_at' || key === 'updated_at' || key === 'date' || key === 'opened_at' || key === 'closed_at' || key === 'valid_until') {
          if (val) val = parseDateFromSheet(val);
        } else if (val === 'true') {
          val = true;
        } else if (val === 'false') {
          val = false;
        } else if (val !== '' && !isNaN(Number(val)) && (key === 'id' || key.endsWith('_id'))) {
          val = Number(val);
        } else if (val !== '' && (String(val).startsWith('[') || String(val).startsWith('{'))) {
          try { val = JSON.parse(String(val)); } catch { /* ignore */ }
        }
        item[key] = val;
      }
    }

    if (Object.keys(item).length === 0) return [];
    return [item];
  }

  const headers = rawRows[0];
  const items: SheetDataRow[] = [];

  for (let i = 1; i < rawRows.length; i++) {
    const row = rawRows[i];
    if (row.length === 0 || !row[0]) continue;

    const obj: SheetDataRow = {};
    headers.forEach((header, index) => {
      let val: unknown = row[index];
      if (val === undefined) val = '';
      
      const key = titleToKey[header.toLowerCase().trim()] || header.toLowerCase().trim();
      
      if (key === 'created_at' || key === 'updated_at' || key === 'date' || key === 'opened_at' || key === 'closed_at' || key === 'valid_until') {
        if (val) {
          val = parseDateFromSheet(val);
        }
      } else if (val === 'true') {
        val = true;
      } else if (val === 'false') {
        val = false;
      } else if (val !== '' && !isNaN(Number(val)) && (key === 'id' || key.endsWith('_id') || key === 'price' || key === 'hpp' || key === 'stock' || key === 'quantity' || key === 'buy_price' || key === 'total_price' || key === 'value' || key === 'discount_value' || key === 'discount_amount' || key === 'subtotal' || key === 'total' || key === 'payment_amount' || key === 'change' || key === 'profit')) {
        val = Number(val);
      } else if (val !== '' && (String(val).startsWith('[') || String(val).startsWith('{'))) {
        try { val = JSON.parse(String(val)); } catch { /* ignore */ }
      }
      obj[key] = val;
    });

    let matches = true;
    if (filters) {
      for (const [filterKey, filterVal] of Object.entries(filters)) {
        if (String(obj[filterKey]) !== String(filterVal)) {
          matches = false;
          break;
        }
      }
    }

    if (matches) {
      items.push(obj);
    }
  }

  return items;
}

function getSkuPrefixFromName(name: string): string {
  const words = String(name).trim().split(/\s+/).filter(Boolean);
  let prefix = '';

  if (words.length >= 2) {
    prefix = words.slice(0, 2).map(w => w[0]).join('');
  } else if (words.length === 1) {
    prefix = words[0].slice(0, 2);
  }

  prefix = prefix.toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (prefix.length === 1) prefix = `${prefix}X`;
  if (prefix.length === 0) prefix = 'PR';
  return prefix;
}

function getNextSku(prefix: string, existingSkus: Set<string>): string {
  const base = prefix.toUpperCase();
  let maxNumber = 0;

  for (const sku of existingSkus) {
    const match = sku.match(new RegExp(`^${base}(\\d+)$`, 'i'));
    if (match) {
      const num = Number(match[1]);
      if (!isNaN(num) && num > maxNumber) {
        maxNumber = num;
      }
    }
  }

  const nextNumber = maxNumber + 1;
  return `${base}${String(nextNumber).padStart(4, '0')}`;
}

export async function insertRow(sheetName: string, data: Record<string, unknown> | Record<string, unknown>[]): Promise<SheetDataRow | SheetDataRow[]> {
  await ensureSheetExists(sheetName);
  const rawRows = await readSheet(sheetName);
  const metadata = SHEETS[sheetName];
  const columns = metadata ? metadata.columns : [];
  const expectedKeys = columns.map(c => c.key);
  const headers = rawRows.length > 0 ? rawRows[0] : columns.map(c => c.title);

  const titleToKey: Record<string, string> = {};
  columns.forEach(c => titleToKey[c.title.toLowerCase().trim()] = c.key);

  const dataArray = Array.isArray(data) ? data : [data];

  if (sheetName === 'products') {
    const skuColumnIndex = headers.findIndex(header => (titleToKey[header.toLowerCase().trim()] || header.toLowerCase().trim()) === 'sku');
    const existingSkus = new Set<string>();
    if (skuColumnIndex !== -1 && rawRows.length > 1) {
      for (let i = 1; i < rawRows.length; i++) {
        const skuValue = String(rawRows[i][skuColumnIndex] ?? '').trim();
        if (skuValue) existingSkus.add(skuValue.toUpperCase());
      }
    }

    for (const item of dataArray) {
      if (!item.sku || !String(item.sku).trim()) {
        const prefix = getSkuPrefixFromName(String(item.name || ''));
        item.sku = getNextSku(prefix, existingSkus);
        existingSkus.add(String(item.sku).toUpperCase());
      }
    }
  }

  if (sheetName === 'store_settings') {
    const existingRows = await selectRows('store_settings');
    const existingSettings = existingRows[0] || { id: 1 };
    const record = { ...existingSettings, ...dataArray[0], id: existingSettings.id ?? 1 };
    await writeStoreSettingsSideRows(sheetName, record);
    return Array.isArray(data) ? [record] : record;
  }

function generateUniqueId(sheetName: string): string {
  const prefixMap: Record<string, string> = {
    products: 'PRD',
    categories: 'CAT',
    transactions: 'TRX',
    transaction_items: 'ITM',
    users: 'USR',
    banners: 'BNR',
    vouchers: 'VCH',
    payment_methods: 'PAY',
    stock_ins: 'STI',
    stock_outs: 'STO',
    hpp_history: 'HPP',
    suppliers: 'SUP',
  };
  
  let prefix = prefixMap[sheetName] || sheetName.substring(0, 3).toUpperCase();
  if (prefix.length < 3) prefix = (prefix + 'XXX').substring(0, 3);

  const nums = '0123456789';
  let numStr = '';
  for (let i = 0; i < 7; i++) {
    numStr += nums.charAt(Math.floor(Math.random() * nums.length));
  }
  return prefix + numStr;
}

  const rowsToAppend: string[][] = [];
  const recordsInserted: SheetDataRow[] = [];

  for (const item of dataArray) {
    const shouldGenerateId = !item.id || (typeof item.id === 'number' && item.id < 0);
    const finalId = shouldGenerateId ? generateUniqueId(sheetName) : item.id;
    const record: SheetDataRow = { ...item, id: finalId };
    if (!record.created_at && expectedKeys.includes('created_at')) {
      record.created_at = new Date().toISOString();
    }
    if (!record.updated_at && expectedKeys.includes('updated_at')) {
      record.updated_at = new Date().toISOString();
    }

    const rowValues = headers.map(header => {
      const key = titleToKey[header.toLowerCase().trim()] || header.toLowerCase().trim();
      const val = record[key];
      if (val === undefined || val === null) return '';
      if (key === 'created_at' || key === 'updated_at' || key === 'date' || key === 'opened_at' || key === 'closed_at' || key === 'valid_until') {
        return formatDateForSheet(val);
      }
      if (typeof val === 'object') return JSON.stringify(val);
      return String(val);
    });

    rowsToAppend.push(rowValues);
    recordsInserted.push(record);
  }

  if (rowsToAppend.length > 0) {
    await appendToSheet(sheetName, rowsToAppend);
  }

  return Array.isArray(data) ? recordsInserted : recordsInserted[0];
}

export async function updateRow(sheetName: string, id: number | string, data: Record<string, unknown>): Promise<SheetDataRow> {
  const spreadsheetId = process.env.SPREADSHEET_ID;
  if (!spreadsheetId) throw new Error('SPREADSHEET_ID missing.');

  const sheetTitle = getSheetTitle(sheetName);
  const rawRows = await readSheet(sheetName);
  
  if (sheetName === 'store_settings') {
    const existingRows = await selectRows('store_settings');
    const existingSettings = existingRows[0] || { id: 1 };
    const record = { ...existingSettings, ...data, id: existingSettings.id ?? id ?? 1 };
    await writeStoreSettingsSideRows(sheetName, record);
    return record;
  }

  if (rawRows.length <= 1) throw new Error(`Sheet ${sheetName} is empty or has no header.`);

  const headers = rawRows[0];
  let rowIndex = -1;

  for (let i = 1; i < rawRows.length; i++) {
    if (String(rawRows[i][0]) === String(id)) {
      rowIndex = i + 1;
      break;
    }
  }

  if (rowIndex === -1) throw new Error(`Row with id ${id} not found in sheet ${sheetName}.`);

  const existingRow = rawRows[rowIndex - 1];
  const updatedRecord: SheetDataRow = { ...data, id };
  
  const metadata = SHEETS[sheetName];
  const columns = metadata ? metadata.columns : [];
  const expectedKeys = columns.map(c => c.key);
  const titleToKey: Record<string, string> = {};
  columns.forEach(c => titleToKey[c.title.toLowerCase().trim()] = c.key);

  if (expectedKeys.includes('updated_at')) {
    updatedRecord.updated_at = new Date().toISOString();
  }

  const newRowValues = headers.map((header, index) => {
    const key = titleToKey[header.toLowerCase().trim()] || header.toLowerCase().trim();
    if (updatedRecord[key] !== undefined) {
      const val = updatedRecord[key];
      if (val === null) return '';
      if (key === 'created_at' || key === 'updated_at' || key === 'date' || key === 'opened_at' || key === 'closed_at' || key === 'valid_until') {
        return formatDateForSheet(val);
      }
      if (typeof val === 'object') return JSON.stringify(val);
      return String(val);
    }
    return existingRow[index] !== undefined ? existingRow[index] : '';
  });

  const token = await getAccessToken();
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(sheetTitle)}!A${rowIndex}:${columnLetter(headers.length)}${rowIndex}?valueInputOption=RAW`;

  const response = await fetch(url, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ values: [newRowValues] })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to update row: ${response.status} - ${errorText}`);
  }

  return updatedRecord;
}

export async function deleteRow(sheetName: string, id?: number | string, filters?: Record<string, unknown>): Promise<void> {
  const spreadsheetId = process.env.SPREADSHEET_ID;
  if (!spreadsheetId) throw new Error('SPREADSHEET_ID missing.');

  const rawRows = await readSheet(sheetName);
  if (rawRows.length <= 1) return;

  const headers = rawRows[0];
  const rowIndicesToDelete: number[] = [];

  for (let i = 1; i < rawRows.length; i++) {
    const row = rawRows[i];
    if (id !== undefined && String(row[0]) === String(id)) {
      rowIndicesToDelete.push(i);
    } else if (filters && Object.keys(filters).length > 0) {
      let matches = true;
      for (const [key, val] of Object.entries(filters)) {
        const colIdx = headers.indexOf(key);
        if (colIdx === -1 || String(row[colIdx]) !== String(val)) {
          matches = false;
          break;
        }
      }
      if (matches) {
        rowIndicesToDelete.push(i);
      }
    }
  }

  if (rowIndicesToDelete.length === 0) return;

  const token = await getAccessToken();
  const getUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}`;
  const getResponse = await fetch(getUrl, {
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!getResponse.ok) throw new Error('Failed to get sheet meta for deletion.');
  
  const spreadsheet = (await getResponse.json()) as GoogleSpreadsheet;
  const sheetTitle = getSheetTitle(sheetName);
  const sheetMeta = spreadsheet.sheets?.find(s => s.properties?.title === sheetTitle);
  if (!sheetMeta) return;
  const sheetId = sheetMeta.properties.sheetId;

  rowIndicesToDelete.sort((a, b) => b - a);

  const deleteUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`;
  const requests = rowIndicesToDelete.map(rowIndex => ({
    deleteDimension: {
      range: {
        sheetId,
        dimension: 'ROWS',
        startIndex: rowIndex,
        endIndex: rowIndex + 1
      }
    }
  }));

  const deleteResponse = await fetch(deleteUrl, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ requests })
  });

  if (!deleteResponse.ok) {
    const errorText = await deleteResponse.text();
    throw new Error(`Failed to delete row: ${deleteResponse.status} - ${errorText}`);
  }
}

function columnLetter(n: number): string {
  let result = '';
  while (n > 0) {
    const rem = (n - 1) % 26;
    result = String.fromCharCode(65 + rem) + result;
    n = Math.floor((n - 1) / 26);
  }
  return result;
}

// ─── API HANDLER (NEXT.JS) ─────────────

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, x-admin-key, x-admin_key, admin-key'
  );

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const queryAction = Array.isArray(req.query?.action) ? req.query.action[0] : req.query?.action;
  const body = req.body as ApiRequestBody | undefined;
  const action = queryAction || body?.action || '';

  try {
    switch (action) {
      // ───────────── ACTION: CRUD DATABASE ─────────────
      case 'crud': {
        if (req.method !== 'POST') return res.status(405).json({ message: 'Method not allowed' });
        
        const adminKey = process.env.ADMIN_API_KEY || process.env.NEXT_PUBLIC_ADMIN_API_KEY || process.env.VITE_ADMIN_API_KEY || 'mesenae-admin-secret-key-2026';
        const incomingKey = req.headers['x-admin-key'] || req.headers['x-admin_key'] || req.headers['admin-key'];
        
        if (!adminKey || String(incomingKey) !== String(adminKey)) {
          return res.status(401).json({ message: 'Unauthorized: missing or invalid admin key' });
        }

        const { type, action: bodyAction, table, data, id, filters } = body || {};
        if (!table) return res.status(400).json({ message: 'Missing table name' });

        const crudType = type || bodyAction || '';

        if (crudType === 'select') {
          const rows = await selectRows(table, filters);
          return res.status(200).json({ data: rows });
        } else if (crudType === 'insert') {
          if (!data) return res.status(400).json({ message: 'Missing data payload' });
          const inserted = await insertRow(table, data);
          return res.status(200).json({ data: inserted });
        } else if (crudType === 'update') {
          if (!id || !data) return res.status(400).json({ message: 'Missing row id or data for update' });
          const updated = await updateRow(table, id, data as Record<string, unknown>);
          return res.status(200).json({ data: updated });
        } else if (crudType === 'delete') {
          if (!id && (!filters || Object.keys(filters).length === 0)) {
            return res.status(400).json({ message: 'Missing row id or filters for delete' });
          }
          await deleteRow(table, id, filters);
          return res.status(200).json({ message: 'Deleted successfully' });
        } else if (crudType === 'upsert') {
          if (!data) return res.status(400).json({ message: 'Missing data payload' });
          const singleData = Array.isArray(data) ? data[0] : data;
          const recordId = singleData?.id as number | undefined;
          
          if (recordId) {
            try {
              const updated = await updateRow(table, recordId, singleData);
              return res.status(200).json({ data: updated });
            } catch {
              const inserted = await insertRow(table, singleData);
              return res.status(200).json({ data: inserted });
            }
          } else {
            const inserted = await insertRow(table, singleData);
            return res.status(200).json({ data: inserted });
          }
        } else {
          return res.status(400).json({ message: `Unsupported CRUD type: ${crudType}` });
        }
      }

      // ───────────── ACTION: SIGNAL BUS ─────────────
      case 'signal_send': {
        if (req.method !== 'POST') return res.status(405).json({ message: 'Method not allowed' });
        const signal = body?.signal;
        if (!signal) return res.status(400).json({ message: 'Missing signal data' });
        
        __signals.push(signal);
        if (__signals.length > MAX_SIGNALS) {
          __signals.shift();
        }
        return res.status(200).json({ success: true });
      }

      case 'signal_poll': {
        if (req.method !== 'GET') return res.status(405).json({ message: 'Method not allowed' });
        const sinceStr = req.query?.since as string;
        const since = sinceStr ? parseInt(sinceStr, 10) : 0;
        
        const newSignals = __signals.filter((s: any) => s.timestamp > since);
        return res.status(200).json({ signals: newSignals, timestamp: Date.now() });
      }

      // ───────────── ACTION: ADMIN LOGIN ─────────────
      case 'login': {
        if (req.method !== 'POST') return res.status(405).json({ message: 'Method not allowed' });
        const { username, password } = body || {};

        if (!username || !password) {
          return res.status(400).json({ success: false, message: 'Username and password are required.' });
        }

        const users = await selectRows('users', undefined, false);
        const user = users.find((u) => u.username === username);

        if (!user || typeof user.password_hash !== 'string') {
          return res.status(401).json({ success: false, message: 'Username atau password salah.' });
        }

        const match = bcrypt.compareSync(password, user.password_hash);
        if (!match) {
          return res.status(401).json({ success: false, message: 'Username atau password salah.' });
        }

        return res.status(200).json({
          success: true,
          user: {
            id: user.id,
            username: user.username,
            role: user.role,
            name: user.name,
            whatsapp: user.whatsapp
          }
        });
      }

      // ───────────── ACTION: DB INITIALIZER ─────────────
      case 'init': {
        try {
          await ensureAllSheetsInitialized();
        } catch (initErr: unknown) {
          const errMsg = initErr instanceof Error ? initErr.message : String(initErr);
          console.error('[Google Sheet Handler] Gagal melakukan inisialisasi sheet otomatis:', errMsg);
          return res.status(500).json({ status: 'error', message: 'Failed to initialize sheets', details: errMsg });
        }
        return res.status(200).json({
          status: 'success',
          message: 'Google Sheets database successfully initialized!',
          sheets_created: Object.keys(SHEETS)
        });
      }

      // ───────────── ACTION: SETUP SHEET ─────────────
      case 'setup-sheet': {
        try {
          const serviceAccountJson = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
          const spreadsheetId = process.env.SPREADSHEET_ID;
          const folderUtamaId = process.env.FOLDER_UTAMA_ID;

          const missing: string[] = [];
          if (!serviceAccountJson) missing.push('GOOGLE_SERVICE_ACCOUNT_JSON');
          if (!spreadsheetId) missing.push('SPREADSHEET_ID');
          if (!folderUtamaId) missing.push('FOLDER_UTAMA_ID');

          if (missing.length > 0) {
            const msg = `Missing required environment variables: ${missing.join(', ')}`;
            console.error('[setup-sheet] ' + msg);
            return res.status(500).json({ status: 'error', message: msg, diagnostics: { missing } });
          }

          const sheetNames = Object.keys(SHEETS);
          const results: { sheet: string; action: string; detail: string }[] = [];

          for (const sheetName of sheetNames) {
            const result = await setupSheet(sheetName);
            results.push({ sheet: sheetName, ...result });
          }

          await ensureAdminUserExists();

          const summary = results.map(r => `${r.sheet}: ${r.detail}`).join(' | ');

          return res.status(200).json({
            status: 'success',
            message: `Setup selesai. ${summary}`,
            data: results,
            sheets_managed: sheetNames
          });
        } catch (error: unknown) {
          const errMsg = error instanceof Error ? error.message : String(error);
          console.error('[setup-sheet] Error:', errMsg);
          const payload: Record<string, unknown> = { status: 'error', message: errMsg || 'Gagal setup sheet' };
          if (process.env.DEBUG === 'true' && error instanceof Error) payload.stack = error.stack;
          return res.status(500).json(payload);
        }
      }

      // ───────────── ACTION: DIAGNOSTICS ─────────────
      case 'diagnostics': {
        const serviceAccountJson = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
        const spreadsheetId = process.env.SPREADSHEET_ID;
        const folderUtamaId = process.env.FOLDER_UTAMA_ID;

        if (!serviceAccountJson || !spreadsheetId) {
          return res.status(500).json({
            status: 'error',
            message: 'Google credentials or Spreadsheet ID are not fully configured in the environment variables.',
            diagnostics: {
              has_service_account: !!serviceAccountJson,
              has_spreadsheet_id: !!spreadsheetId,
              has_folder_utama_id: !!folderUtamaId
            }
          });
        }

        const tablesToTest = Object.keys(SHEETS);
        const results: Record<string, { status: 'healthy' | 'error'; message: string; count?: number }> = {};
        let overallHealthy = true;

        for (const table of tablesToTest) {
          try {
            const rows = await readSheet(table);
            results[table] = {
              status: 'healthy',
              message: 'Sheet is accessible and responsive.',
              count: rows.length > 0 ? rows.length - 1 : 0
            };
          } catch (err: unknown) {
            overallHealthy = false;
            results[table] = {
              status: 'error',
              message: err instanceof Error ? err.message : String(err)
            };
          }
        }

        return res.status(200).json({
          status: overallHealthy ? 'healthy' : 'degraded',
          timestamp: new Date().toISOString(),
          spreadsheet_id: spreadsheetId,
          overall_health: overallHealthy,
          database_tables: results,
          google_drive_folder_id: folderUtamaId || 'Not configured'
        });
      }

      default:
        return res.status(400).json({ message: `Unknown or unprovided action: ${action}` });
    }
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : String(error);
    console.error(`[Google Sheet Dispatcher] Error executing action ${action}:`, errMsg);
    return res.status(500).json({
      status: 'error',
      message: errMsg || 'An unexpected error occurred.'
    });
  }
}
