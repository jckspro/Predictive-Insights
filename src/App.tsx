import React, { useState } from 'react';
import { Header } from './components/common/Header';
import { FilterBar, CrossFilterChips } from './components/common/FilterBar';
import { KpiStrip } from './components/common/KpiStrip';
import { FilterProvider } from './context/FilterContext';
import { DeviceDrawerProvider } from './context/DeviceDrawerContext';
import { DeviceDrawer } from './components/common/DeviceDrawer';
import { NetworkAnomaliesTab } from './tabs/NetworkAnomaliesTab';
import { SecurityEventsTab } from './tabs/SecurityEventsTab';
import { PredictiveMaintenanceTab } from './tabs/PredictiveMaintenanceTab';
import { Activity, ShieldAlert, Cpu } from 'lucide-react';

export function AppContent() {
  const [activeTab, setActiveTab] = useState<'anomalies' | 'security' | 'maintenance'>('anomalies');

  return (
    <div className="min-h-screen bg-[#0B0D12] text-[#e5e5e5] font-sans flex flex-col relative selection:bg-[#c5a059] selection:text-[#0B0D12]">
      {/* Sophisticated Dark Background Texture */}
      <div className="fixed inset-0 pointer-events-none z-0 bg-[radial-gradient(rgba(255,255,255,0.04)_1px,transparent_1px)] [background-size:20px_20px] opacity-40" />

      {/* Persistent Header */}
      <Header />

      {/* Global Filter Bar */}
      <FilterBar />

      {/* Active click-to-filter selections */}
      <CrossFilterChips />

      {/* KPI Strip (6 cards, persistent across all tabs) */}
      <KpiStrip />

      {/* Tab Navigation Bar */}
      <div className="bg-[#0E1017] border-b border-white/10 px-6 pt-2 flex items-stretch gap-2 z-10 sticky top-0">
        <button
          onClick={() => setActiveTab('anomalies')}
          className={`flex-1 flex items-center justify-center gap-2 px-5 py-2.5 rounded-t-lg font-medium text-xs uppercase tracking-[0.2em] transition-all relative ${
            activeTab === 'anomalies'
              ? 'text-[#c5a059] bg-[#151821] border-t-2 border-x border-white/10 border-t-[#c5a059] shadow-[0_-5px_15px_rgba(197,160,89,0.12)]'
              : 'text-white/40 hover:text-[#e5e5e5] hover:bg-white/5'
          }`}
        >
          <Activity className="w-4 h-4 text-[#c5a059]" />
          <span>Network Anomalies</span>
          {activeTab === 'anomalies' && (
            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#c5a059] shadow-[0_0_8px_#c5a059]" />
          )}
        </button>

        <button
          onClick={() => setActiveTab('security')}
          className={`flex-1 flex items-center justify-center gap-2 px-5 py-2.5 rounded-t-lg font-medium text-xs uppercase tracking-[0.2em] transition-all relative ${
            activeTab === 'security'
              ? 'text-[#c5a059] bg-[#151821] border-t-2 border-x border-white/10 border-t-[#c5a059] shadow-[0_-5px_15px_rgba(197,160,89,0.12)]'
              : 'text-white/40 hover:text-[#e5e5e5] hover:bg-white/5'
          }`}
        >
          <ShieldAlert className="w-4 h-4 text-[#f59e0b]" />
          <span>Security Insights</span>
          {activeTab === 'security' && (
            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#c5a059] shadow-[0_0_8px_#c5a059]" />
          )}
        </button>

        <button
          onClick={() => setActiveTab('maintenance')}
          className={`flex-1 flex items-center justify-center gap-2 px-5 py-2.5 rounded-t-lg font-medium text-xs uppercase tracking-[0.2em] transition-all relative ${
            activeTab === 'maintenance'
              ? 'text-[#c5a059] bg-[#151821] border-t-2 border-x border-white/10 border-t-[#c5a059] shadow-[0_-5px_15px_rgba(197,160,89,0.12)]'
              : 'text-white/40 hover:text-[#e5e5e5] hover:bg-white/5'
          }`}
        >
          <Cpu className="w-4 h-4 text-[#10b981]" />
          <span>Hardware Health</span>
          {activeTab === 'maintenance' && (
            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#c5a059] shadow-[0_0_8px_#c5a059]" />
          )}
        </button>
      </div>

      {/* Main Tab Content */}
      <main className="flex-1 z-10">
        {activeTab === 'anomalies' && <NetworkAnomaliesTab />}
        {activeTab === 'security' && <SecurityEventsTab />}
        {activeTab === 'maintenance' && <PredictiveMaintenanceTab />}
      </main>

      {/* Slide-Over Device Drawer */}
      <DeviceDrawer />
    </div>
  );
}

export default function App() {
  return (
    <FilterProvider>
      <DeviceDrawerProvider>
        <AppContent />
      </DeviceDrawerProvider>
    </FilterProvider>
  );
}
