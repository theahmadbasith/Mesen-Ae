import React, { useState } from 'react';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import ActiveOrders from './ActiveOrders';
import Kitchen from './Kitchen';
import { ChefHat, ClipboardList } from 'lucide-react';

export default function OrdersManager() {
  const [activeTab, setActiveTab] = useState<'pesanan' | 'dapur'>('pesanan');
  
  return (
    <div className="mx-auto w-full">
      {/* Master Tabs Navbar */}
      <div className="sticky top-0 z-30 bg-background/80 backdrop-blur-xl border-b border-border/40 px-4 py-3 mb-2">
        <Tabs value={activeTab} onValueChange={v => setActiveTab(v as 'pesanan' | 'dapur')}>
          <TabsList className="grid grid-cols-2 w-full max-w-md mx-auto h-12 p-1.5 rounded-xl bg-muted shadow-sm">
            <TabsTrigger value="pesanan" className="rounded-lg font-bold text-sm h-full gap-2 transition-all data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm">
              <ClipboardList className="w-4 h-4" /> Pesanan Aktif
            </TabsTrigger>
            <TabsTrigger value="dapur" className="rounded-lg font-bold text-sm h-full gap-2 transition-all data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm">
              <ChefHat className="w-4 h-4" /> Dapur (Kitchen)
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>
      
      {/* Render Content */}
      <div className="animate-in fade-in duration-300">
        {activeTab === 'pesanan' ? <ActiveOrders onSwitchToKitchen={() => setActiveTab('dapur')} /> : <Kitchen />}
      </div>
    </div>
  );
}
