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
      <div className="sticky top-0 z-30 bg-background/80 backdrop-blur-xl border-b border-border/40 px-4 py-3 mb-2">
        <div className="flex bg-muted/40 p-1.5 rounded-2xl w-full border border-border/60 shadow-sm shrink-0">
          <button 
            onClick={() => setActiveTab('pesanan')}
            className={cn("flex-1 py-3 text-sm font-bold rounded-xl transition-all flex items-center justify-center gap-2", activeTab === 'pesanan' ? 'bg-background text-foreground shadow-sm border border-border/40' : 'text-muted-foreground hover:text-foreground hover:bg-muted')}
          >
            <ClipboardList className="w-4 h-4" />
            <span className="hidden sm:inline">Pesanan Aktif</span>
            <span className="sm:hidden">Pesanan</span>
          </button>
          <button 
            onClick={() => setActiveTab('dapur')}
            className={cn("flex-1 py-3 text-sm font-bold rounded-xl transition-all flex items-center justify-center gap-2", activeTab === 'dapur' ? 'bg-background text-foreground shadow-sm border border-border/40' : 'text-muted-foreground hover:text-foreground hover:bg-muted')}
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
