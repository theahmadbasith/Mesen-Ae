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
    <div className="px-5 pt-8 pb-6 space-y-8 animate-in fade-in duration-500">
      {/* Header / Greeting */}
      <div className="space-y-2.5">
        <Skeleton className="h-4 w-48 rounded-full" />
        <Skeleton className="h-8 w-64 rounded-lg" />
      </div>

      {/* Stats Cards Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="rounded-2xl border border-border/50 bg-card p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-8 w-8 rounded-lg" />
            </div>
            <div className="space-y-1.5">
              <Skeleton className="h-7 w-28" />
              <Skeleton className="h-2.5 w-16" />
            </div>
          </div>
        ))}
      </div>

      {/* Quick Actions & Chart Area */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 rounded-2xl border border-border/50 bg-card p-6 shadow-sm space-y-6">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-[200px] w-full rounded-xl" />
        </div>
        
        <div className="rounded-2xl border border-border/50 bg-card p-6 shadow-sm space-y-5">
          <Skeleton className="h-5 w-32" />
          <div className="grid grid-cols-2 gap-4">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="flex flex-col items-center gap-3 p-3 rounded-xl border border-border/40">
                <Skeleton className="w-12 h-12 rounded-full" />
                <Skeleton className="h-3 w-16" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/** Product List Skeleton */
export function ProductsSkeleton() {
  return (
    <div className="px-5 pt-8 pb-6 space-y-6 animate-in fade-in duration-500">
      {/* Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-2">
          <Skeleton className="h-7 w-32 rounded-lg" />
          <Skeleton className="h-3 w-48" />
        </div>
        <Skeleton className="h-10 w-32 rounded-xl" />
      </div>

      {/* Search & Filter */}
      <div className="flex gap-3">
        <Skeleton className="h-11 flex-1 rounded-xl" />
        <Skeleton className="h-11 w-11 rounded-xl shrink-0" />
        <Skeleton className="h-11 w-[120px] rounded-xl hidden sm:block" />
      </div>

      {/* Product List */}
      <div className="space-y-3">
        {[1, 2, 3, 4, 5].map(i => (
          <div key={i} className="rounded-2xl border border-border/50 bg-card p-4 flex items-center gap-4 shadow-sm">
            <Skeleton className="w-16 h-16 rounded-xl shrink-0" />
            <div className="flex-1 space-y-2.5">
              <Skeleton className="h-5 w-3/4 max-w-[200px]" />
              <Skeleton className="h-3 w-1/3 max-w-[100px]" />
              <div className="flex items-center gap-2 pt-1">
                <Skeleton className="h-5 w-16 rounded-full" />
                <Skeleton className="h-5 w-16 rounded-full" />
              </div>
            </div>
            <div className="flex flex-col gap-2 shrink-0">
              <Skeleton className="w-8 h-8 rounded-lg" />
              <Skeleton className="w-8 h-8 rounded-lg" />
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
    <div className="px-5 pt-8 pb-6 space-y-5 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex items-center gap-4 border-b border-border/50 pb-4">
        <Skeleton className="h-10 w-10 rounded-xl" />
        <Skeleton className="h-7 w-56 rounded-lg" />
      </div>

      {/* Search & Tabs */}
      <Skeleton className="h-11 w-full rounded-xl" />
      <div className="flex gap-2 overflow-x-hidden">
        <Skeleton className="h-9 w-24 rounded-full" />
        <Skeleton className="h-9 w-20 rounded-full" />
        <Skeleton className="h-9 w-32 rounded-full" />
      </div>

      {/* History List */}
      <div className="space-y-6 pt-2">
        {[1, 2].map(group => (
          <div key={group} className="space-y-3">
            <Skeleton className="h-4 w-32 ml-1" />
            <div className="space-y-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="rounded-2xl border border-border/50 bg-card p-4 flex items-center gap-4 shadow-sm hover:bg-muted/10 transition-colors">
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 bg-muted/20">
                    <Skeleton className="w-6 h-6 rounded-md" />
                  </div>
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center justify-between">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-4 w-20" />
                    </div>
                    <div className="flex items-center justify-between">
                      <Skeleton className="h-3 w-40" />
                      <Skeleton className="h-5 w-16 rounded-full" />
                    </div>
                  </div>
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
    <div className="px-5 pt-8 pb-6 space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Skeleton className="h-7 w-40 rounded-lg" />
        <Skeleton className="h-10 w-32 rounded-xl" />
      </div>

      {/* Vouchers Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="relative rounded-2xl border border-border/50 bg-card p-5 pl-8 shadow-sm flex flex-col justify-between h-[140px] overflow-hidden">
            {/* Ticket Dashed Line Simulation */}
            <div className="absolute left-0 top-0 bottom-0 w-3 border-r-2 border-dashed border-border/50 bg-muted/20" />
            <div className="absolute -left-3 top-1/2 -translate-y-1/2 w-6 h-6 bg-background rounded-full border border-border/50" />
            
            <div className="space-y-2">
              <Skeleton className="h-6 w-3/4 max-w-[180px]" />
              <Skeleton className="h-3 w-1/2 max-w-[120px]" />
            </div>
            
            <div className="flex items-center justify-between mt-4">
              <Skeleton className="h-6 w-24 rounded-md" />
              <Skeleton className="h-8 w-8 rounded-lg" />
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
    <div className="px-5 pt-8 pb-24 space-y-6 animate-in fade-in duration-500 max-w-3xl mx-auto">
      <Skeleton className="h-8 w-40 rounded-lg mb-2" />
      
      {[1, 2, 3].map(section => (
        <div key={section} className="rounded-2xl border border-border/50 bg-card shadow-sm overflow-hidden">
          {/* Card Header */}
          <div className="p-5 border-b border-border/50 bg-muted/20">
            <Skeleton className="h-5 w-48 mb-2" />
            <Skeleton className="h-3 w-3/4 max-w-[300px]" />
          </div>
          
          {/* Form Inputs */}
          <div className="p-5 space-y-5 bg-card">
            {[1, 2].map(i => (
              <div key={i} className="space-y-2">
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-11 w-full rounded-xl" />
              </div>
            ))}
          </div>
        </div>
      ))}
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
