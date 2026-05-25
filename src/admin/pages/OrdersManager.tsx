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
      <div className="sticky top-0 z-30 bg-background/95 backdrop-blur-md border-b border-border/40 px-3 py-2 -mx-4 md:-mx-6 lg:-mx-8 -mt-4 md:-mt-6 lg:-mt-8 mb-4">
        <div className="flex bg-muted/60 p-1 rounded-full w-full mx-auto shadow-inner">
          <button 
            onClick={() => setActiveTab('pesanan')}
            className={cn("flex-1 py-2 text-sm font-bold rounded-full transition-all flex items-center justify-center gap-2", activeTab === 'pesanan' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground hover:bg-muted/50')}
          >
            <ClipboardList className="w-4 h-4" />
            <span className="hidden sm:inline">Pesanan Aktif</span>
            <span className="sm:hidden">Pesanan</span>
          </button>
          <button 
            onClick={() => setActiveTab('dapur')}
            className={cn("flex-1 py-2 text-sm font-bold rounded-full transition-all flex items-center justify-center gap-2", activeTab === 'dapur' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground hover:bg-muted/50')}
          >
            <ChefHat className="w-4 h-4" />
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
