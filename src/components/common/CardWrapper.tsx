import React from 'react';
import { WifiOff, AlertTriangle, RefreshCw } from 'lucide-react';

interface CardWrapperProps {
  title: string;
  subtitle?: string;
  colSpan?: string; // e.g., 'col-span-12', 'col-span-12 lg:col-span-6', etc.
  loading?: boolean;
  error?: string | null;
  isEmpty?: boolean;
  onRetry?: () => void;
  actions?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

export const CardWrapper: React.FC<CardWrapperProps> = ({
  title,
  subtitle,
  colSpan = 'col-span-12 lg:col-span-6',
  loading = false,
  error = null,
  isEmpty = false,
  onRetry,
  actions,
  children,
  className = '',
}) => {
  return (
    <div
      className={`bg-[#151821] bg-gradient-to-b from-white/[0.035] to-transparent border border-white/10 rounded-xl p-4 flex flex-col justify-between transition-all duration-300 hover:border-[#c5a059]/40 hover:shadow-[0_0_20px_rgba(197,160,89,0.1)] ${colSpan} ${className}`}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3 border-b border-white/10 pb-2.5">
        <div className="flex items-center gap-2">
          {/* Gold left-accent bar */}
          <div className="w-1 h-4 bg-[#c5a059] rounded-full shadow-[0_0_8px_#c5a059]" />
          <div>
            <h3 className="uppercase tracking-[0.2em] text-xs font-medium text-[#e5e5e5]">
              {title}
            </h3>
            {subtitle && <p className="text-[11px] text-white/40 mt-0.5">{subtitle}</p>}
          </div>
        </div>
        {actions && <div className="flex items-center gap-1.5">{actions}</div>}
      </div>

      {/* Content Area */}
      <div className="flex-1 min-h-[200px] flex flex-col justify-center">
        {loading ? (
          <div className="w-full h-full min-h-[180px] flex flex-col items-center justify-center space-y-3">
            <div className="w-full h-12 bg-white/5 rounded-md animate-pulse" />
            <div className="w-full h-12 bg-white/5 rounded-md animate-pulse delay-75" />
            <div className="w-full h-12 bg-white/5 rounded-md animate-pulse delay-150" />
          </div>
        ) : error ? (
          <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/30 text-center flex flex-col items-center justify-center space-y-2">
            <AlertTriangle className="w-6 h-6 text-red-400" />
            <p className="text-xs text-[#e5e5e5]">{error}</p>
            {onRetry && (
              <button
                onClick={onRetry}
                className="mt-2 inline-flex items-center gap-1.5 px-3 py-1 bg-[#1E222D] hover:bg-white/10 border border-white/10 text-[#c5a059] text-xs rounded transition-colors"
              >
                <RefreshCw className="w-3 h-3" /> Retry Query
              </button>
            )}
          </div>
        ) : isEmpty ? (
          <div className="h-full min-h-[180px] flex flex-col items-center justify-center text-white/40 space-y-2">
            <WifiOff className="w-8 h-8 text-[#c5a059]/60" />
            <span className="text-xs tracking-[0.2em] uppercase text-white/40">
              NO SIGNAL — NO DATA MATCHED
            </span>
          </div>
        ) : (
          children
        )}
      </div>
    </div>
  );
};
