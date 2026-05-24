import webpush from 'web-push';

// Mengambil keys dari environment variables (disediakan oleh Vercel) atau fallback
const PUBLIC_KEY = process.env.VITE_VAPID_PUBLIC_KEY || 'BOS-76i4DY8yREaNKWdh3xkqKkPTVLibbvSroA2rAkOxJlfY7HhF2YDzuIryY4D_5Ky-nQhehNBLBcL7IBt-TNQ';
const PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || '743BVfirD_aJaZnuoSIjEqdVj-XCKIvqstIg7hD4tis';

webpush.setVapidDetails(
  'mailto:admin@mesen.ae',
  PUBLIC_KEY,
  PRIVATE_KEY
);

export default async function handler(req: any, res: any) {
  // Aktifkan CORS untuk berjaga-jaga
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { subscription, payload } = req.body;
    await webpush.sendNotification(subscription, JSON.stringify(payload));
    res.status(200).json({ success: true });
  } catch (error) {
    console.error('Error sending push notification:', error);
    res.status(500).json({ error: 'Failed to send notification' });
  }
}
