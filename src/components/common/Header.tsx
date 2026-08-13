import React, { useState } from 'react';
import { Cpu, RefreshCw, Settings, Activity } from 'lucide-react';
import { useConnectionStatus } from '../../hooks/useCypher';
import { clearQueryCache } from '../../lib/neo4j';
import { ConnectionModal } from './ConnectionModal';

export const Header: React.FC = () => {
  const { status, config } = useConnectionStatus();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string>(new Date().toLocaleTimeString());
  const [refreshing, setRefreshing] = useState(false);

  const handleGlobalRefresh = () => {
    setRefreshing(true);
    clearQueryCache();
    setTimeout(() => {
      setLastUpdated(new Date().toLocaleTimeString());
      setRefreshing(false);
      window.dispatchEvent(new CustomEvent('netops-refresh-all'));
    }, 400);
  };

  const serverHostname = config.uri.replace('bolt://', '').replace('ws://', '').replace('wss://', '').split(':')[0];

  return (
    <>
      <header className="relative bg-[#0E1017] border-b border-white/10 px-6 py-5 flex flex-wrap items-center justify-between gap-4 font-sans">
        {/* Left: Brand / Title */}
        <div className="flex items-center gap-4">
          <div className="relative w-11 h-11 shrink-0 rounded-xl bg-gradient-to-br from-[#c5a059]/25 to-transparent border border-[#c5a059]/40 flex items-center justify-center shadow-[0_0_22px_rgba(197,160,89,0.25)]">
            <Cpu className="w-5 h-5 text-[#e8c887]" />
            <span className="absolute inset-0 rounded-xl border border-[#c5a059]/20 animate-ping" />
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-[9px] uppercase tracking-[0.42em] text-[#c5a059]/70 font-medium">
              Network Operations Intelligence
            </span>
            <h1 className="text-2xl md:text-[1.9rem] leading-none font-bold tracking-tight bg-gradient-to-r from-[#f7e3ae] via-[#c5a059] to-[#9b7a3c] bg-clip-text text-transparent drop-shadow-[0_2px_14px_rgba(197,160,89,0.35)]">
              Syslog Predictive Insights{' '}
              <span className="font-light tracking-normal">Platform</span>
            </h1>
            <p className="text-[11px] text-white/45 tracking-wide">
              An AI-Driven Approach to Proactive Monitoring
            </p>
          </div>
        </div>

        {/* Right: Connection Pill + Refresh + Settings */}
        <div className="flex items-center gap-3">
          {/* Connection Pill */}
          <button
            onClick={() => setIsModalOpen(true)}
            className={`px-3.5 py-1.5 rounded-full border flex items-center gap-2 transition-all text-xs ${
              status === 'CONNECTED'
                ? 'bg-emerald-500/10 border-emerald-500/30 text-[#e5e5e5] hover:border-emerald-500/60'
                : status === 'CONNECTING'
                ? 'bg-[#f59e0b]/10 border-[#f59e0b]/40 text-[#f59e0b] animate-pulse'
                : 'bg-red-500/10 border-red-500/40 text-red-400'
            }`}
          >
            <span
              className={`w-2 h-2 rounded-full ${
                status === 'CONNECTED'
                  ? 'bg-emerald-500 shadow-[0_0_8px_#10b981]'
                  : status === 'CONNECTING'
                  ? 'bg-[#f59e0b]'
                  : 'bg-red-500'
              }`}
            />
            <span className="font-medium uppercase tracking-[0.15em] text-[10px]">
              {status === 'CONNECTED'
                ? `CONNECTED: ${config.database}@${serverHostname}`
                : status === 'CONNECTING'
                ? 'CONNECTING...'
                : 'CONNECTION ERROR'}
            </span>
          </button>

          {/* Last Updated Indicator */}
          <div className="hidden md:flex items-center gap-1.5 text-[11px] text-white/40">
            <Activity className="w-3.5 h-3.5 text-emerald-400" />
            <span>Updated: {lastUpdated}</span>
          </div>

          {/* Refresh Button */}
          <button
            onClick={handleGlobalRefresh}
            disabled={refreshing}
            className="p-2 bg-[#151821] border border-white/10 hover:border-[#c5a059] text-white/60 hover:text-[#c5a059] rounded-lg transition-colors disabled:opacity-50"
            title="Refresh All Telemetry"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          </button>

          {/* Settings Button */}
          <button
            onClick={() => setIsModalOpen(true)}
            className="p-2 bg-[#151821] border border-white/10 hover:border-[#c5a059] text-white/40 hover:text-[#c5a059] rounded-lg transition-colors"
            title="Database Connection Settings"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Accent rule separating the masthead from the filter bar */}
      <div className="h-px bg-gradient-to-r from-transparent via-[#c5a059]/60 to-transparent" />

      <ConnectionModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </>
  );
};
