import React from 'react';
import { ResponsiveContainer } from 'recharts';
import { ArrowDownWideNarrow, ArrowUpNarrowWide } from 'lucide-react';

const BAR_PITCH = 26;
const COLUMN_PITCH = 58;
const CHART_VIEWPORT = 256;

// Gives each bar a fixed pixel pitch and scrolls, so charts can show every row instead of a capped top-N.
export const ScrollingBarChart: React.FC<{ rows: number; children: React.ReactElement }> = ({
  rows,
  children,
}) => (
  <div className="h-64 w-full overflow-y-auto pr-1">
    <div style={{ height: Math.max(CHART_VIEWPORT, rows * BAR_PITCH) }}>
      <ResponsiveContainer width="100%" height="100%">
        {children}
      </ResponsiveContainer>
    </div>
  </div>
);

// Same idea rotated: vertical-bar charts keep a fixed column pitch and scroll sideways.
export const ScrollingColumnChart: React.FC<{ columns: number; children: React.ReactElement }> = ({
  columns,
  children,
}) => (
  <div className="h-64 w-full overflow-x-auto pb-1">
    <div className="h-full" style={{ width: Math.max(CHART_VIEWPORT, columns * COLUMN_PITCH) }}>
      <ResponsiveContainer width="100%" height="100%">
        {children}
      </ResponsiveContainer>
    </div>
  </div>
);

export type SortDir = 'desc' | 'asc';

export function useBarSort<T>(rows: T[], key: keyof T) {
  const [dir, setDir] = React.useState<SortDir>('desc');
  const sorted = React.useMemo(
    () =>
      [...rows].sort((a, b) =>
        dir === 'desc' ? Number(b[key]) - Number(a[key]) : Number(a[key]) - Number(b[key])
      ),
    [rows, key, dir]
  );
  return { sorted, dir, setDir };
}

export const SortToggle: React.FC<{ dir: SortDir; onChange: (dir: SortDir) => void }> = ({
  dir,
  onChange,
}) => (
  <button
    type="button"
    onClick={() => onChange(dir === 'desc' ? 'asc' : 'desc')}
    title={
      dir === 'desc'
        ? 'Sorted highest first — click for lowest first'
        : 'Sorted lowest first — click for highest first'
    }
    className="flex items-center gap-1 rounded border border-white/10 px-1.5 py-0.5 text-[9px] uppercase tracking-wider text-white/40 transition-colors hover:border-[#c5a059]/40 hover:text-[#c5a059]"
  >
    {dir === 'desc' ? <ArrowDownWideNarrow className="h-3 w-3" /> : <ArrowUpNarrowWide className="h-3 w-3" />}
    {dir === 'desc' ? 'Desc' : 'Asc'}
  </button>
);
