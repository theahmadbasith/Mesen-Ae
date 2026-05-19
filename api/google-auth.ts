import crypto from 'crypto';

// --- INTERFACES ---
interface GoogleServiceAccount {
  client_email: string;
  private_key: string;
  private_key_id?: string;
  [key: string]: unknown; // Mengizinkan properti lain jika ada
}

interface GoogleTokenResponse {
  access_token: string;
  expires_in: number;
  token_type: string;
}

// --- STATE MANAGEMENT ---
let _cachedToken: string | null = null;
let _tokenExpiry: number = 0; // Epoch ms

// KUNCI SUPERPOWER: Mencegah Race Condition
let _fetchPromise: Promise<string> | null = null; 

export async function getAccessToken(): Promise<string> {
  const now = Date.now();
  
  // 1. Return cached token jika masih valid (buffer 1 menit / 60000ms)
  if (_cachedToken && now < _tokenExpiry - 60000) {
    return _cachedToken;
  }

  // 2. Jika sedang ada proses fetch ke Google yang berjalan, tunggu proses tersebut.
  // Ini mencegah 10 request bersamaan memicu 10 fetch ke Google API.
  if (_fetchPromise) {
    return _fetchPromise;
  }

  // 3. Mulai proses fetch dan simpan Promisenya ke dalam _fetchPromise
  _fetchPromise = (async (): Promise<string> => {
    try {
      const serviceAccountJson = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
      if (!serviceAccountJson) {
        throw new Error('GOOGLE_SERVICE_ACCOUNT_JSON environment variable tidak ditemukan.');
      }

      let credentials: GoogleServiceAccount;
      try {
        credentials = JSON.parse(serviceAccountJson) as GoogleServiceAccount;
      } catch {
        throw new Error('Gagal mem-parsing GOOGLE_SERVICE_ACCOUNT_JSON. Pastikan format JSON valid.');
      }

      if (!credentials.private_key || !credentials.client_email) {
        throw new Error('JSON kredensial tidak memiliki "private_key" atau "client_email".');
      }

      // Pastikan newline diformat dengan benar (penting untuk .env)
      const privateKey = credentials.private_key.replace(/\\n/g, '\n');
      const clientEmail = credentials.client_email;
      const privateKeyId = credentials.private_key_id || '';

      const header = {
        alg: 'RS256',
        typ: 'JWT',
        kid: privateKeyId
      };

      const nowSeconds = Math.floor(Date.now() / 1000);
      const payload = {
        iss: clientEmail,
        // Sesuaikan scope dengan kebutuhan Anda
        scope: 'https://www.googleapis.com/auth/spreadsheets https://www.googleapis.com/auth/drive',
        aud: 'https://oauth2.googleapis.com/token',
        exp: nowSeconds + 3600,
        iat: nowSeconds
      };

      const base64UrlEncode = (str: string) => {
        return Buffer.from(str)
          .toString('base64')
          .replace(/=/g, '')
          .replace(/\+/g, '-')
          .replace(/\//g, '_');
      };

      const encodedHeader = base64UrlEncode(JSON.stringify(header));
      const encodedPayload = base64UrlEncode(JSON.stringify(payload));
      const signingInput = `${encodedHeader}.${encodedPayload}`;

      // Tanda tangani JWT dengan RSA-SHA256
      const signer = crypto.createSign('RSA-SHA256');
      signer.update(signingInput);
      const signature = signer.sign(privateKey, 'base64')
        .replace(/=/g, '')
        .replace(/\+/g, '-')
        .replace(/\//g, '_');

      const jwt = `${signingInput}.${signature}`;

      // Lakukan request ke Google OAuth2 API
      const response = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: new URLSearchParams({
          grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
          assertion: jwt
        }).toString() // Tambahkan .toString() untuk kompatibilitas fetch API yang ketat
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Google OAuth failed (${response.status}): ${errorText}`);
      }

      const tokenData = (await response.json()) as GoogleTokenResponse;
      
      // Update state cache
      _cachedToken = tokenData.access_token;
      // Gunakan waktu saat ini + expires_in (biasanya 3600 detik)
      _tokenExpiry = Date.now() + (tokenData.expires_in * 1000);

      return _cachedToken;
    } finally {
      // 4. Setelah selesai (berhasil atau gagal), bersihkan promise agar request 
      // berikutnya di masa depan bisa memicu fetch ulang jika token kedaluwarsa.
      _fetchPromise = null;
    }
  })();

  return _fetchPromise;
}
