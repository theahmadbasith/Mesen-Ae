/**
 * fcm.ts — Firebase Cloud Messaging (FCM) Integration
 *
 * Alur:
 *   1. requestForToken()  → Daftarkan device ke Firebase, simpan FCM token ke Firestore
 *   2. sendPushToRole()   → Ambil semua token untuk role tertentu, kirim via /api/fcm-send
 *   3. /api/fcm-send      → Firebase Admin SDK kirim ke Google FCM → OS Android/iOS
 */

import { getToken } from "firebase/messaging";
import { getMessagingInstance } from "./firebase";
import { dbUpsert, dbSelect } from "@/lib/db";

const VAPID_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY as string;

// ─── REQUEST & REGISTER FCM TOKEN ────────────────────────────────────────────
export const requestForToken = async (
  role: "admin" | "customer",
  name: string
): Promise<string | null> => {
  try {
    // 1. Cek dukungan browser
    const messaging = await getMessagingInstance();
    if (!messaging) {
      console.warn("[FCM] Firebase Messaging tidak didukung di browser ini.");
      return null;
    }

    // 2. Minta izin notifikasi dari pengguna
    const permission = await Notification.requestPermission();
    if (permission !== "granted") {
      console.warn("[FCM] Izin notifikasi ditolak.");
      return null;
    }

    // 3. Daftarkan Service Worker resmi Firebase
    const registration = await navigator.serviceWorker.register(
      "/firebase-messaging-sw.js",
      { scope: "/" }
    );
    await navigator.serviceWorker.ready;

    // 4. Dapatkan FCM Device Token dari Google
    const token = await getToken(messaging, {
      vapidKey: VAPID_KEY,
      serviceWorkerRegistration: registration,
    });

    if (!token) {
      console.warn("[FCM] Gagal mendapatkan FCM token.");
      return null;
    }

    // 5. Simpan token ke Firestore (upsert berdasarkan token)
    await dbUpsert("fcmTokens", {
      token,
      role,
      name,
      updatedAt: new Date().toISOString(),
    }, "token");

    console.info(`[FCM] Token berhasil didaftarkan untuk role=${role}`);
    return token;
  } catch (err) {
    console.error("[FCM] Error saat mendaftar token:", err);
    return null;
  }
};

// ─── SEND PUSH NOTIFICATION TO ALL DEVICES OF A ROLE ─────────────────────────
export const sendPushToRole = async (
  role: string,
  payload: { title: string; body: string; url?: string }
): Promise<void> => {
  try {
    // Ambil semua FCM token untuk role tersebut dari Firestore
    const allTokens = await dbSelect("fcmTokens");
    const tokens: string[] = allTokens
      .filter((t: any) => t.role === role && t.token)
      .map((t: any) => t.token as string);

    if (tokens.length === 0) {
      console.info(`[FCM] Tidak ada token untuk role=${role}, skip.`);
      return;
    }

    // Kirim ke backend Vercel yang meneruskan ke Firebase Admin SDK
    const res = await fetch("/api/fcm-send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tokens, payload }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      console.error("[FCM] Gagal mengirim push:", err);
    }
  } catch (err) {
    console.error("[FCM] Error sendPushToRole:", err);
  }
};
