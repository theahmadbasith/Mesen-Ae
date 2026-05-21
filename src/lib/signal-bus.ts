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
  private pollInterval: any = null;
  private lastPollTime: number = Date.now() - 10000; // start looking back 10s

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

    // Start network polling for cross-device signaling
    this.startPolling();
  }

  private startPolling() {
    if (this.pollInterval) return;
    this.pollInterval = setInterval(async () => {
      try {
        const res = await fetch(`/api/google-sheet?action=signal_poll&since=${this.lastPollTime}`);
        if (res.ok) {
          const { signals, timestamp } = await res.json();
          if (timestamp) this.lastPollTime = timestamp;
          if (signals && signals.length > 0) {
            signals.forEach((sig: any) => this.notifyListeners(sig));
          }
        }
      } catch (err) {
        // ignore network errors in polling
      }
    }, 2000); // Check every 2 seconds
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

    // 4. Send to server for cross-device sync
    try {
      const adminKey = import.meta.env.VITE_ADMIN_API_KEY || 'mesenae-admin-secret-key-2026';
      fetch('/api/google-sheet?action=signal_send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-key': adminKey },
        body: JSON.stringify({ signal })
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
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }
    this.listeners.clear();
  }
}

// Singleton instance
export const signalBus = new SignalBus();
