import { cn } from '@/lib/utils';

interface SkeletonProps {
  className?: string;
}

/** 
 * Komponen Skeleton Dasar 
 * Dimodernisasi dengan warna yang lebih menyatu dengan tema (light/dark)
 */
export function Skeleton({ className }: SkeletonProps) {
  return (
    <div
      className={cn(
        'animate-pulse rounded-md bg-muted-foreground/10',
        className
      )}
    />
  );
}

/** Dashboard Skeleton */
export function DashboardSkeleton() {
  return (
    <div className="px-4 pt-6 pb-24 space-y-6 w-full mx-auto animate-in fade-in duration-300">
      {/* Date Badge */}
      <div className="flex justify-end">
        <Skeleton className="h-7 w-48 rounded-xl" />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[1, 2].map(i => (
          <div key={i} className="rounded-2xl border-0 shadow-sm bg-card p-4 space-y-2">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-3 w-20" />
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <div>
        <Skeleton className="h-4 w-24 mb-3" />
        <div className="grid grid-cols-3 gap-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="rounded-2xl border-0 shadow-sm bg-card p-4 flex flex-col items-center gap-2">
              <Skeleton className="w-11 h-11 rounded-xl" />
              <Skeleton className="h-3 w-12" />
            </div>
          ))}
        </div>
      </div>

      {/* Recent Transactions */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-6 w-20 rounded-md" />
        </div>
        <div className="space-y-2">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="rounded-2xl border-0 shadow-sm bg-card p-3 flex items-center gap-3">
              <Skeleton className="w-9 h-9 rounded-lg shrink-0" />
              <div className="flex-1 min-w-0 space-y-1.5">
                <div className="flex items-center justify-between">
                  <Skeleton className="h-3 w-32" />
                  <Skeleton className="h-3 w-10" />
                </div>
                <div className="flex items-center justify-between">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-2.5 w-12" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/** Product List Skeleton */
export function ProductsSkeleton() {
  return (
    <div className="px-4 pt-6 pb-24 space-y-6 w-full mx-auto animate-in fade-in duration-300">
      {/* Action Header */}
      <div className="flex justify-end">
        <Skeleton className="h-11 w-40 rounded-xl" />
      </div>

      {/* Search & Filter Bar */}
      <div className="bg-card border border-border/50 p-3 rounded-2xl shadow-sm flex flex-col sm:flex-row gap-3">
        <Skeleton className="h-11 flex-1 rounded-xl" />
        <Skeleton className="h-11 w-full sm:w-[180px] rounded-xl" />
      </div>

      {/* Stats Counter */}
      <div className="flex items-center gap-2">
        <Skeleton className="h-6 w-32 rounded-full" />
      </div>

      {/* Product Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {[1, 2, 3, 4, 5, 6].map(i => (
          <div key={i} className="rounded-2xl border border-border/50 bg-card p-3 sm:p-4 flex items-center gap-4 shadow-sm">
            <Skeleton className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl shrink-0" />
            <div className="flex-1 min-w-0 space-y-2">
              <Skeleton className="h-5 sm:h-6 w-3/4 max-w-[200px]" />
              <div className="flex items-center gap-2">
                <Skeleton className="h-5 w-16 rounded-md" />
                <Skeleton className="h-5 w-20 rounded-md" />
              </div>
            </div>
            <div className="flex flex-col items-end gap-1.5 shrink-0 ml-auto">
              <div className="text-right space-y-1">
                <Skeleton className="h-3 w-16 hidden sm:block ml-auto" />
                <Skeleton className="h-5 sm:h-6 w-24" />
              </div>
              <Skeleton className="h-5 w-20 rounded-lg mt-1" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/** Reports Skeleton */
export function ReportsSkeleton() {
  return (
    <div className="px-5 pt-8 pb-20 space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Skeleton className="h-7 w-32 rounded-lg" />
        <Skeleton className="h-10 w-28 rounded-xl" />
      </div>

      {/* Range Picker */}
      <Skeleton className="h-12 w-full max-w-sm rounded-xl" />

      {/* Summary Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="rounded-2xl border border-border/50 bg-card p-4 flex flex-col items-center justify-center text-center space-y-3 shadow-sm">
            <Skeleton className="w-8 h-8 rounded-full" />
            <Skeleton className="h-6 w-20" />
            <Skeleton className="h-3 w-16" />
          </div>
        ))}
      </div>

      {/* Main Chart Area */}
      <div className="rounded-2xl border border-border/50 bg-card p-6 shadow-sm space-y-5">
        <div className="flex items-center justify-between">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-4 w-20" />
        </div>
        <Skeleton className="h-[280px] w-full rounded-xl" />
      </div>
    </div>
  );
}

/** Transaction History Skeleton */
export function TransactionHistorySkeleton() {
  return (
    <div className="px-4 pt-3 pb-24 space-y-6 w-full mx-auto animate-in fade-in duration-300">
      {/* Control Panel */}
      <div className="bg-card border border-border/50 p-4 sm:p-5 rounded-[2rem] shadow-sm mb-6 space-y-4">
        <div className="flex flex-col md:flex-row gap-4 justify-between">
          <Skeleton className="h-11 flex-1 max-w-md rounded-xl" />
          <Skeleton className="h-11 w-full md:w-[280px] rounded-xl shrink-0" />
        </div>
        <div className="h-px bg-border/50 w-full" />
        <div className="flex flex-wrap items-center gap-2.5">
          <Skeleton className="h-5 w-20" />
          <Skeleton className="h-10 w-32 rounded-xl" />
          <Skeleton className="h-5 w-4" />
          <Skeleton className="h-10 w-32 rounded-xl" />
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 gap-4 mb-8">
        {[1, 2].map(i => (
          <div key={i} className="border border-border/50 shadow-sm bg-card rounded-[1.5rem] p-5 flex items-center justify-between">
            <div className="space-y-2">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-6 w-24" />
            </div>
            <Skeleton className="w-12 h-12 rounded-full shrink-0" />
          </div>
        ))}
      </div>

      {/* Transaction List */}
      <div className="space-y-8">
        {[1, 2].map(group => (
          <div key={group} className="space-y-3">
            <div className="flex items-center gap-3 px-1">
              <Skeleton className="w-4 h-4 rounded-sm" />
              <Skeleton className="h-4 w-40 rounded-md" />
              <Skeleton className="h-4 w-12 rounded-md" />
            </div>
            
            <div className="grid gap-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="border border-border/60 shadow-sm bg-card rounded-2xl p-4 flex items-center gap-4">
                  <Skeleton className="w-12 h-12 rounded-xl shrink-0" />
                  <div className="flex-1 min-w-0 flex flex-col justify-center space-y-2">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <Skeleton className="h-4 w-28" />
                        <Skeleton className="h-4 w-12 rounded-md" />
                      </div>
                      <Skeleton className="h-4 w-10 rounded-md shrink-0" />
                    </div>
                    <div className="flex items-center justify-between">
                      <Skeleton className="h-3 w-40" />
                      <Skeleton className="h-5 w-24" />
                    </div>
                    <div className="flex items-center gap-2 pt-1">
                      <Skeleton className="h-5 w-20 rounded-md" />
                      <Skeleton className="h-5 w-20 rounded-md" />
                    </div>
                  </div>
                  <Skeleton className="w-5 h-5 rounded-md shrink-0" />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/** Vouchers Skeleton */
export function VouchersSkeleton() {
  return (
    <div className="px-4 pt-6 pb-24 space-y-6 w-full mx-auto animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <Skeleton className="h-7 w-40" />
        <Skeleton className="h-11 w-36 rounded-xl" />
      </div>

      {/* Vouchers Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-6">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="rounded-[1.5rem] border-0 bg-card shadow-md flex h-[160px] overflow-hidden relative">
            {/* Dashed line effect */}
            <div className="absolute left-[30%] sm:left-[25%] top-0 bottom-0 border-l-2 border-dashed border-border/50 z-10" />
            
            {/* Left part */}
            <div className="w-[30%] sm:w-[25%] bg-muted/20 flex flex-col items-center justify-center p-4">
              <Skeleton className="w-8 h-8 rounded-full mb-2" />
              <Skeleton className="h-6 w-16" />
              <Skeleton className="h-3 w-10 mt-1" />
            </div>

            {/* Right part */}
            <div className="flex-1 p-5 pl-8 flex flex-col justify-between relative z-20">
              <div className="space-y-2.5">
                <Skeleton className="h-4 w-12 rounded-full" />
                <Skeleton className="h-7 w-32" />
                <Skeleton className="h-3 w-40" />
              </div>
              <div className="flex justify-end gap-2">
                <Skeleton className="h-8 w-8 rounded-lg" />
                <Skeleton className="h-8 w-8 rounded-lg" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/** Settings Skeleton */
export function SettingsSkeleton() {
  return (
    <div className="flex flex-col h-full min-h-0 animate-in fade-in duration-300">
      {/* Tab bar */}
      <div className="px-6 pt-6 pb-0 shrink-0">
        <div className="flex gap-4 border-b border-border pb-px overflow-x-hidden">
          {[1, 2, 3, 4, 5].map(i => (
            <Skeleton key={i} className="h-8 w-24 rounded-t-lg shrink-0" />
          ))}
        </div>
      </div>

      {/* Tab content */}
      <div className="flex-1 px-6 py-5 space-y-6">
        {/* Section Header */}
        <div className="flex justify-between items-start">
          <div className="space-y-2">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-4 w-64" />
          </div>
          <Skeleton className="h-8 w-20 rounded-md" />
        </div>

        {/* Content Card */}
        <div className="bg-card border border-border/60 rounded-xl overflow-hidden">
          <div className="p-4 flex items-center gap-4 bg-muted/10">
            <Skeleton className="w-14 h-14 rounded-xl shrink-0" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-5 w-40" />
              <Skeleton className="h-3 w-full max-w-[200px]" />
              <Skeleton className="h-3 w-32" />
            </div>
          </div>
          {[1, 2].map(i => (
            <div key={i} className="p-4 border-t border-border/50 flex justify-between items-center">
              <div className="space-y-1.5">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-48" />
              </div>
              <Skeleton className="h-4 w-20" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/** Generic Page Loading Skeleton */
export function PageSkeleton() {
  return (
    <div className="px-5 pt-8 pb-6 space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <Skeleton className="h-8 w-48 rounded-lg" />
        <Skeleton className="h-10 w-32 rounded-xl" />
      </div>
      
      <Skeleton className="h-14 w-full rounded-xl" />
      
      <div className="space-y-4">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="rounded-2xl border border-border/50 bg-card p-5 space-y-3 shadow-sm">
            <Skeleton className="h-5 w-1/3" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
          </div>
        ))}
      </div>
    </div>
  );
}
