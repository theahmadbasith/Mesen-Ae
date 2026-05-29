import React from 'react';
import { CashierProvider, useCashier } from './cashier/CashierContext';
import CashierCatalog from './cashier/CashierCatalog';
import CashierCart from './cashier/CashierCart';
import CashierModals from './cashier/CashierModals';

function CashierContent() {
  const { loading } = useCashier();

  // early return loading skeletons (exactly matching original design)
  if (loading) {
    return (
      <div className="pt-2 pb-24 w-full">
        <div className="flex flex-col md:flex-row gap-0 md:gap-4">
          <div className="flex-1 flex flex-col space-y-3">
            <div className="flex items-center justify-between">
              <div className="h-6 w-20 bg-muted animate-pulse rounded" />
              <div className="flex gap-2">
                <div className="h-9 w-28 bg-muted animate-pulse rounded-lg" />
                <div className="h-9 w-28 bg-muted animate-pulse rounded-lg" />
              </div>
            </div>
            <div className="flex gap-2">
              <div className="flex-1 h-10 bg-muted animate-pulse rounded-lg" />
              <div className="w-10 h-10 bg-muted animate-pulse rounded-lg" />
            </div>
            <div className="h-10 bg-muted animate-pulse rounded-lg" />
            <div className="flex gap-2">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="h-7 w-16 bg-muted animate-pulse rounded-full" />
              ))}
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
              {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
                <div key={i} className="rounded-xl border overflow-hidden">
                  <div className="aspect-square bg-muted animate-pulse" />
                  <div className="p-2.5 space-y-1.5">
                    <div className="h-3 bg-muted animate-pulse rounded w-3/4" />
                    <div className="h-4 bg-muted animate-pulse rounded w-1/2" />
                    <div className="h-2.5 bg-muted animate-pulse rounded w-1/3" />
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="hidden md:flex md:w-80 lg:w-96 flex-col bg-card rounded-xl border border-border shrink-0 p-4 space-y-3">
            <div className="h-5 w-32 bg-muted animate-pulse rounded" />
            <div className="flex-1 space-y-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-20 bg-muted animate-pulse rounded-xl" />
              ))}
            </div>
            <div className="h-14 bg-muted animate-pulse rounded-xl" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="pt-2 pb-24 w-full flex flex-col">
      <div className="flex flex-col md:flex-row gap-0 md:gap-4">
        <CashierCatalog />
        <CashierCart />
      </div>
      <CashierModals />
    </div>
  );
}

export default function Kasir() {
  return (
    <CashierProvider>
      <CashierContent />
    </CashierProvider>
  );
}
