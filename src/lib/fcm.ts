import { getMessaging, getToken, onMessage } from "firebase/messaging";
import { app, db } from "./firebase";
import { collection, doc, setDoc } from "firebase/firestore";

const DEFAULT_VAPID = "BOS-76i4DY8yREaNKWdh3xkqKkPTVLibbvSroA2rAkOxJlfY7HhF2YDzuIryY4D_5Ky-nQhehNBLBcL7IBt-TNQ";

export const requestForToken = async (role: 'admin' | 'customer', identifier?: string): Promise<string | null> => {
  try {
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      const messaging = getMessaging(app);
      const currentToken = await getToken(messaging, { 
        vapidKey: import.meta.env.VITE_VAPID_PUBLIC_KEY || DEFAULT_VAPID
      });
      if (currentToken) {
        await saveTokenToFirestore(currentToken, role, identifier);
        return currentToken;
      } else {
        console.log('No registration token available. Request permission to generate one.');
        return null;
      }
    } else {
      console.log('Notification permission denied.');
      return null;
    }
  } catch (err) {
    console.error('An error occurred while retrieving token. ', err);
    return null;
  }
};

const saveTokenToFirestore = async (token: string, role: string, identifier?: string) => {
  try {
    const docRef = doc(db, 'fcm_tokens', token);
    await setDoc(docRef, {
      token,
      role,
      identifier: identifier || 'anonymous',
      updatedAt: new Date().toISOString()
    }, { merge: true });
  } catch (err) {
    console.error('Failed to save FCM token to Firestore:', err);
  }
};

export const onMessageListener = () =>
  new Promise((resolve) => {
    try {
        const messaging = getMessaging(app);
        onMessage(messaging, (payload) => {
        resolve(payload);
        });
    } catch (err) {
        console.error('Messaging not supported or not initialized', err);
    }
  });

export const showBrowserNotification = (title: string, body: string) => {
  if (!("Notification" in window)) return;
  
  if (Notification.permission === "granted") {
    new Notification(title, {
      body,
      icon: "/icon-192.png",
      badge: "/icon-192.png",
    });
  }
};
