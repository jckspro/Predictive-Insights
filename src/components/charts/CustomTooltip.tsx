import React from 'react';

export const CustomTooltip: React.FC<any> = ({ active, payload, label }) => {
  if (!active || !payload || !payload.length) return null;

  return (
    <div className="bg-[#0B0D12]/95 border border-[#c5a059]/40 p-3 rounded-lg shadow-[0_0_20px_rgba(197,160,89,0.2)] font-sans text-xs z-50">
      {label && <div className="text-[#c5a059] font-medium border-b border-white/10 pb-1 mb-1.5">{label}</div>}
      <div className="space-y-1">
        {payload.map((entry: any, index: number) => (
          <div key={`item-${index}`} className="flex items-center justify-between gap-4">
            <span className="flex items-center gap-1.5 text-[#e5e5e5]">
              <span
                className="w-2 h-2 rounded-full inline-block"
                style={{ backgroundColor: entry.color || entry.fill || '#c5a059' }}
              />
              {entry.name || entry.dataKey}:
            </span>
            <span className="font-medium text-[#c5a059]">
              {typeof entry.value === 'number' ? entry.value.toLocaleString() : entry.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};
