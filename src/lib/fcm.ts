// FCM dependencies removed as we are using native Web Push API
import { app, db } from "./firebase";
import { collection, doc, setDoc } from "firebase/firestore";
import { dbSelect, dbUpsert } from '@/lib/db';

const DEFAULT_VAPID = "BOS-76i4DY8yREaNKWdh3xkqKkPTVLibbvSroA2rAkOxJlfY7HhF2YDzuIryY4D_5Ky-nQhehNBLBcL7IBt-TNQ";

// Helper alias for dbInsert used in requestForToken
const dbInsert = async (table: string, data: any) => {
  return dbUpsert(table, data, 'token');
};

export const requestForToken = async (role: 'admin' | 'customer', name: string) => {
  try {
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      const registration = await navigator.serviceWorker.ready;
      
      const publicVapidKey = import.meta.env.VITE_VAPID_PUBLIC_KEY || DEFAULT_VAPID;
      
      // Convert VAPID key to Uint8Array
      const urlBase64ToUint8Array = (base64String: string) => {
        const padding = '='.repeat((4 - base64String.length % 4) % 4);
        const base64 = (base64String + padding).replace(/\-/g, '+').replace(/_/g, '/');
        const rawData = window.atob(base64);
        const outputArray = new Uint8Array(rawData.length);
        for (let i = 0; i < rawData.length; ++i) {
          outputArray[i] = rawData.charCodeAt(i);
        }
        return outputArray;
      };

      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicVapidKey)
      });

      const subJSON = JSON.parse(JSON.stringify(subscription));

      // Simpan ke Firestore
      await dbInsert('fcmTokens', {
        token: subJSON.endpoint, // Gunakan endpoint sebagai ID unik
        subscription: subJSON,
        role,
        name,
        updatedAt: new Date().toISOString()
      });

      return subJSON.endpoint;
    }
  } catch (err) {
    console.error('An error occurred while retrieving token. ', err);
  }
  return null;
};

export const sendPushToRole = async (role: string, payload: any) => {
  try {
    const tokens = await dbSelect('fcmTokens');
    const targetTokens = tokens.filter((t: any) => t.role === role);
    
    for (const t of targetTokens) {
      if (t.subscription) {
        await fetch('/api/notify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ subscription: t.subscription, payload })
        }).catch(console.error);
      }
    }
  } catch (err) {
    console.error('Gagal mengirim push ke role', role, err);
  }
};

// Legacy unused listener functions have been cleaned up
