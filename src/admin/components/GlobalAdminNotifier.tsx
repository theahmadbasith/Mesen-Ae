import React, { useEffect, useRef } from 'react';
import { useDbQuery, Transaction } from '@/hooks/db-hooks';

export default function GlobalAdminNotifier() {
  const allBills = useDbQuery<Transaction>('transactions') || [];
  
  // Filter yang sama persis dengan ActiveOrders untuk menangkap semua pesanan yang butuh perhatian admin/dapur
  const openBills = allBills.filter((t) => {
    const isUnpaid = t.status === 'belum lunas';
    const isPaidButCooking = t.status === 'lunas' && t.kitchenStatus && !['diantarkan', 'selesai'].includes(t.kitchenStatus);
    const isPaidRetailWeb = t.status === 'lunas' && t.remarks === 'Pesanan dari Web' && (!t.kitchenStatus || t.kitchenStatus === 'pending');
    return isUnpaid || isPaidButCooking || isPaidRetailWeb;
  });

  const prevBillsCountRef = useRef(openBills.length);

  useEffect(() => {
    if (openBills.length > prevBillsCountRef.current) {
      if (Notification.permission === 'granted') {
        const title = 'Pesanan Baru Masuk! 🔔';
        const options = {
          body: 'Ada pesanan pelanggan baru yang harus segera disiapkan.',
          icon: '/logo.png',
          vibrate: [500, 110, 500, 110, 450, 110, 200, 110, 170, 40, 450, 110, 200, 110, 170, 40, 500],
          requireInteraction: true,
          silent: false,
          data: { url: '/admin/orders' } // URL untuk diarahkan ketika notifikasi diklik
        };
        
        if ('serviceWorker' in navigator) {
          navigator.serviceWorker.ready.then(registration => {
            registration.showNotification(title, options);
          }).catch(() => {
            try { new Notification(title, options); } catch(e) {}
          });
        } else {
          try { new Notification(title, options); } catch(e) {}
        }
      }
    }
    prevBillsCountRef.current = openBills.length;
  }, [openBills.length]);

  return null;
}
