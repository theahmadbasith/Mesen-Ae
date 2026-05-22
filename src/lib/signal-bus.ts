import { collection, addDoc, onSnapshot, query, where, orderBy, serverTimestamp, limit } from 'firebase/firestore';
import { db as firestoreDb } from './firebase';

// ============================================================
// REAL-TIME SIGNAL BUS — Cross-tab & Cross-device sync via Firestore
// ============================================================

export interface TransactionSignal {
  type: 'TRANSACTION_STATUS_UPDATE';
  transactionId: number | string;
  kitchenStatus?: string;
  status?: string;
  receiptNumber?: string;
  timestamp: number;
}

type SignalListener = (signal: TransactionSignal) => void;

class SignalBus {
  private channel: BroadcastChannel | null = null;
  private listeners: Map<string, Set<SignalListener>> = new Map();
  private unsubscribeFirestore: (() => void) | null = null;
  private instanceId: string = Math.random().toString(36).substring(2, 9); // Prevent self-echo loops

  constructor() {
    try {
      this.channel = new BroadcastChannel('mesenae_realtime');
      this.channel.onmessage = (event) => {
        const signal = event.data as TransactionSignal;
        if (signal?.type === 'TRANSACTION_STATUS_UPDATE') {
          this.notifyListeners(signal);
        }
      };
    } catch (_) {
      console.warn('[SignalBus] BroadcastChannel not available');
    }

    this.startFirestoreListener();
  }

  private startFirestoreListener() {
    try {
      const signalsRef = collection(firestoreDb, '_signals');
      // Listen to new signals created after the app started
      const startTime = Date.now();
      const q = query(signalsRef, where('timestamp', '>=', startTime), orderBy('timestamp', 'asc'));

      this.unsubscribeFirestore = onSnapshot(q, (snapshot) => {
        snapshot.docChanges().forEach(change => {
          if (change.type === 'added') {
            const data = change.doc.data();
            // Ignore signals sent by this very instance
            if (data.senderId !== this.instanceId) {
              this.notifyListeners(data.signal as TransactionSignal);
            }
          }
        });
      }, (error) => {
        console.warn('[SignalBus] Firestore listener error:', error);
      });
    } catch (e) {
      console.warn('[SignalBus] Error starting Firestore listener:', e);
    }
  }

  /** Called by admin/kitchen when they update a transaction */
  broadcast(signal: TransactionSignal) {
    // 1. Notify local listeners (same tab)
    this.notifyListeners(signal);

    // 2. Broadcast to other tabs via BroadcastChannel
    try {
      this.channel?.postMessage(signal);
    } catch (_) {}

    // 3. Store in sessionStorage for cross-tab fallback
    try {
      localStorage.setItem('mesenae_last_signal', JSON.stringify(signal));
    } catch (_) {}

    // 4. Send to Firestore for cross-device sync
    try {
      const signalsRef = collection(firestoreDb, '_signals');
      addDoc(signalsRef, {
        signal,
        senderId: this.instanceId,
        timestamp: Date.now(),
        createdAt: serverTimestamp()
      }).catch(() => {});
    } catch (_) {}
  }

  /** Subscribe to updates for a specific transaction */
  subscribe(transactionId: string | number, listener: SignalListener): () => void {
    const key = String(transactionId);
    if (!this.listeners.has(key)) {
      this.listeners.set(key, new Set());
    }
    this.listeners.get(key)!.add(listener);

    // Also listen for localStorage changes (cross-tab fallback)
    const storageHandler = (e: StorageEvent) => {
      if (e.key === 'mesenae_last_signal' && e.newValue) {
        try {
          const signal = JSON.parse(e.newValue) as TransactionSignal;
          if (signal.type === 'TRANSACTION_STATUS_UPDATE' && String(signal.transactionId) === key) {
            listener(signal);
          }
        } catch (_) {}
      }
    };
    window.addEventListener('storage', storageHandler);

    return () => {
      this.listeners.get(key)?.delete(listener);
      window.removeEventListener('storage', storageHandler);
    };
  }

  private notifyListeners(signal: TransactionSignal) {
    const key = String(signal.transactionId);
    const listeners = this.listeners.get(key);
    if (listeners) {
      listeners.forEach(fn => {
        try { fn(signal); } catch (_) {}
      });
    }
    // Also notify wildcard listeners (listening to all transactions)
    const wildcardListeners = this.listeners.get('*');
    if (wildcardListeners) {
      wildcardListeners.forEach(fn => {
        try { fn(signal); } catch (_) {}
      });
    }
  }

  destroy() {
    try {
      this.channel?.close();
    } catch (_) {}
    if (this.unsubscribeFirestore) {
      this.unsubscribeFirestore();
      this.unsubscribeFirestore = null;
    }
    this.listeners.clear();
  }
}

// Singleton instance
export const signalBus = new SignalBus();
