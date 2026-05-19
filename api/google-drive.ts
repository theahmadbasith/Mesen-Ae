import type { NextApiRequest, NextApiResponse } from 'next';

// --- INTERFACES ---
interface UploadPayload {
  folderId: string;
  folderName: string;
  fileData: {
    name: string;
    mimeType: string;
    content: string;
  };
}

interface AppsScriptResponse {
  status: string;
  id?: string;
  error?: string;
}

interface UploadRequestBody {
  fileName?: string;
  dataUrl?: string;
}

export async function uploadFileToDrive(base64DataUrl: string, fileName: string): Promise<string> {
  const folderId = process.env.FOLDER_UTAMA_ID;
  if (!folderId) {
    throw new Error('FOLDER_UTAMA_ID belum dikonfigurasi di environment variables.');
  }

  const appsScriptUrl = process.env.APPS_SCRIPT_URL || process.env.VITE_APPS_SCRIPT_URL;
  if (!appsScriptUrl) {
    throw new Error('APPS_SCRIPT_URL atau VITE_APPS_SCRIPT_URL belum dikonfigurasi di environment variables.');
  }

  const matches = base64DataUrl.match(/^data:([A-Za-z-+/]+);base64,(.+)$/);
  if (!matches || matches.length !== 3) {
    throw new Error('Format base64 image tidak valid.');
  }

  const mimeType = matches[1];
  const content = matches[2]; // base64 content tanpa prefix

  const payload: UploadPayload = {
    folderId: folderId,
    folderName: 'MesenAe_Products', // Nama subfolder di dalam folder utama
    fileData: {
      name: fileName,
      mimeType: mimeType,
      content: content
    }
  };

  const response = await fetch(appsScriptUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    // Menggunakan AbortSignal untuk timeout (Membutuhkan Node 18+)
    signal: AbortSignal.timeout(30000) 
  });

  if (!response.ok) {
    throw new Error(`Apps Script error: HTTP ${response.status}`);
  }

  // Type assertion ke interface yang sudah ditentukan
  const result = (await response.json()) as AppsScriptResponse;

  if (result.status !== 'success' || !result.id) {
    throw new Error(`Apps Script upload failed: ${result.error || 'Unknown error'}`);
  }

  // Mengembalikan URL thumbnail khusus Drive
  return `https://drive.google.com/thumbnail?id=${result.id}&sz=w400`;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // --- CORS Headers ---
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  // Pre-flight check untuk CORS
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Tolak selain POST
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    // Type casting untuk body request
    const body = req.body as UploadRequestBody;
    const { fileName, dataUrl } = body || {};

    if (!fileName || !dataUrl) {
      return res.status(400).json({ message: 'Missing fileName or dataUrl' });
    }

    const publicUrl = await uploadFileToDrive(dataUrl, fileName);
    
    return res.status(200).json({ url: publicUrl, publicUrl: publicUrl });
  } catch (error: unknown) {
    console.error('[Google Drive Dispatcher] Upload error:', error);
    
    // Penanganan error TypeScript-safe (karena 'error' bertipe unknown)
    let errorMessage = 'An unexpected error occurred.';
    if (error instanceof Error) {
      errorMessage = error.message;
    }

    return res.status(500).json({
      status: 'error',
      message: errorMessage
    });
  }
}
