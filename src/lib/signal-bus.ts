// ============================================================
// REAL-TIME SIGNAL BUS — Cross-tab & Cross-device sync
// ============================================================
// Uses BroadcastChannel for same-browser instant sync,
// plus a lightweight polling mechanism as fallback for cross-device.

export interface TransactionSignal {
  type: 'TRANSACTION_STATUS_UPDATE';
  transactionId: number;
  kitchenStatus?: string;
  status?: string;
  receiptNumber?: string;
  timestamp: number;
}

type SignalListener = (signal: TransactionSignal) => void;

class SignalBus {
  private channel: BroadcastChannel | null = null;
  private listeners: Map<string, Set<SignalListener>> = new Map();

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
      // BroadcastChannel not supported — fallback to polling only
      console.warn('[SignalBus] BroadcastChannel not available');
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

    // 3. Also store in sessionStorage for cross-tab fallback
    try {
      localStorage.setItem('mesenae_last_signal', JSON.stringify(signal));
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
    this.listeners.clear();
  }
}

// Singleton instance
export const signalBus = new SignalBus();
