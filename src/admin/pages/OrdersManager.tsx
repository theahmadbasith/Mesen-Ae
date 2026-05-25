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
      {/* Master Tabs Navbar - Menempel di atas */}
      <div className="flex w-full bg-card border-b border-border -mx-4 md:-mx-6 lg:-mx-8 -mt-4 md:-mt-6 lg:-mt-8 mb-4 md:mb-6 px-4 md:px-6 lg:px-8">
        <div className="flex w-full">
          <button 
            onClick={() => setActiveTab('pesanan')}
            className={cn(
              "flex-1 py-3.5 text-sm font-black uppercase tracking-wider transition-all flex justify-center items-center gap-2 border-b-[3px]", 
              activeTab === 'pesanan' 
                ? 'border-primary text-primary bg-primary/5' 
                : 'border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/50'
            )}
          >
            <ClipboardList className="w-4 h-4" /> 
            <span className="hidden sm:inline">Pesanan Aktif</span>
            <span className="sm:hidden">Pesanan</span>
          </button>
          <button 
            onClick={() => setActiveTab('dapur')}
            className={cn(
              "flex-1 py-3.5 text-sm font-black uppercase tracking-wider transition-all flex justify-center items-center gap-2 border-b-[3px]", 
              activeTab === 'dapur' 
                ? 'border-primary text-primary bg-primary/5' 
                : 'border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/50'
            )}
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
