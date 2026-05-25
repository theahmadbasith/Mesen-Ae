import React, { useState } from 'react';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import ActiveOrders from './ActiveOrders';
import Kitchen from './Kitchen';
import { ChefHat, ClipboardList } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function OrdersManager() {
  const [activeTab, setActiveTab] = useState<'pesanan' | 'dapur'>('pesanan');
  
  return (
    <div className="mx-auto w-full">
      {/* Master Tabs Navbar */}
      <div className="sticky top-0 z-30 bg-slate-50/95 dark:bg-slate-950/95 backdrop-blur-md -mx-4 md:-mx-6 lg:-mx-8 -mt-2 md:-mt-3 px-4 md:px-6 lg:px-8 pt-2 md:pt-3 pb-3 border-b border-border/20 mb-4">
        <div className="flex bg-muted/60 p-1 rounded-full w-full mx-auto shadow-inner border border-border/30">
          <button 
            onClick={() => setActiveTab('pesanan')}
            className={cn("flex-1 py-1.5 text-xs sm:text-sm font-bold rounded-full transition-all flex items-center justify-center gap-2", activeTab === 'pesanan' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground hover:bg-muted/30')}
          >
            <ClipboardList className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Pesanan Aktif</span>
            <span className="sm:hidden">Pesanan</span>
          </button>
          <button 
            onClick={() => setActiveTab('dapur')}
            className={cn("flex-1 py-1.5 text-xs sm:text-sm font-bold rounded-full transition-all flex items-center justify-center gap-2", activeTab === 'dapur' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground hover:bg-muted/30')}
          >
            <ChefHat className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Dapur (Kitchen)</span>
            <span className="sm:hidden">Dapur</span>
          </button>
        </div>
      </div>
      
      {/* Render Content */}
      <div className="animate-in fade-in duration-300">
        {activeTab === 'pesanan' ? <ActiveOrders onSwitchToKitchen={() => setActiveTab('dapur')} /> : <Kitchen />}
      </div>
    </div>
  );
}
