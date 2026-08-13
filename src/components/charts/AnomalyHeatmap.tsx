import React from 'react';
import { X, Filter } from 'lucide-react';
import { AnomalyHotspotItem } from '../../types';
import { useDeviceDrawer } from '../../context/DeviceDrawerContext';
import { useFilter } from '../../context/FilterContext';

interface Band {
  max: number;
  label: string;
  rgb: string;
}

const BANDS: Band[] = [
  { max: 5, label: '0–5 Normal', rgb: '16, 185, 129' },
  { max: 15, label: '6–15 Watch', rgb: '234, 179, 8' },
  { max: 30, label: '16–30 High Risk', rgb: '249, 115, 22' },
  { max: Infinity, label: '31+ Critical', rgb: '239, 68, 68' },
];

const bandFor = (count: number): Band => BANDS.find((b) => count <= b.max) as Band;

interface CellStats {
  count: number;
  devices: Record<string, number>;
  types: Record<string, number>;
}

const emptyCell = (): CellStats => ({ count: 0, devices: {}, types: {} });

const topOf = (bucket: Record<string, number>): string => {
  const entries = Object.entries(bucket).sort((a, b) => b[1] - a[1]);
  return entries.length ? entries[0][0] : '—';
};

const zoneLabel = (zone: string) => zone.replace(/-ZONE$/i, '');

interface HoverState {
  site: string;
  zone: string;
  cell: CellStats;
  x: number;
  y: number;
}

export const AnomalyHeatmap: React.FC<{ data: AnomalyHotspotItem[] }> = ({ data }) => {
  const { openDeviceDrawer } = useDeviceDrawer();
  const { toggleCrossFilter } = useFilter();
  const [hover, setHover] = React.useState<HoverState | null>(null);
  const [selected, setSelected] = React.useState<{ site: string; zone: string } | null>(null);

  const { sites, zones, matrix, peak } = React.useMemo(() => {
    const cells = new Map<string, CellStats>();
    const siteTotals = new Map<string, number>();
    const zoneTotals = new Map<string, number>();

    data.forEach((row) => {
      const site = row.site || 'Unknown';
      const zone = row.zone || 'Unknown';
      const key = `${site}\u0000${zone}`;
      const cell = cells.get(key) || emptyCell();

      cell.count += row.intensity;
      if (row.device) cell.devices[row.device] = (cell.devices[row.device] || 0) + row.intensity;
      if (row.eventType) cell.types[row.eventType] = (cell.types[row.eventType] || 0) + row.intensity;

      cells.set(key, cell);
      siteTotals.set(site, (siteTotals.get(site) || 0) + row.intensity);
      zoneTotals.set(zone, (zoneTotals.get(zone) || 0) + row.intensity);
    });

    return {
      matrix: cells,
      sites: Array.from(siteTotals.entries())
        .sort((a, b) => b[1] - a[1])
        .map(([site, total]) => ({ site, total })),
      zones: Array.from(zoneTotals.entries())
        .sort((a, b) => b[1] - a[1])
        .map(([zone]) => zone),
      peak: Math.max(1, ...Array.from(cells.values(), (c) => c.count)),
    };
  }, [data]);

  const cellAt = (site: string, zone: string) => matrix.get(`${site}\u0000${zone}`) || emptyCell();

  const selectedCell = selected ? cellAt(selected.site, selected.zone) : null;

  return (
    <div className="relative flex h-full min-h-0 flex-col">
      <div className="min-h-0 flex-1 overflow-auto pr-1">
        <table className="border-separate border-spacing-[3px] text-[11px]">
          <thead>
            <tr>
              <th className="sticky left-0 top-0 z-20 bg-[#151821] px-2 py-1 text-left text-[9px] font-medium uppercase tracking-wider text-white/40">
                Site
              </th>
              {zones.map((zone) => (
                <th
                  key={zone}
                  className="sticky top-0 z-10 bg-[#151821] px-1 py-1 text-[9px] font-medium uppercase tracking-wider text-white/40"
                  title={zone}
                >
                  {zoneLabel(zone)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sites.map(({ site, total }) => (
              <tr key={site}>
                <th className="sticky left-0 z-10 bg-[#151821] px-2 py-1 text-left font-normal text-white/70 whitespace-nowrap">
                  {site}
                  <span className="ml-2 text-[9px] tabular-nums text-white/30">{total}</span>
                </th>
                {zones.map((zone) => {
                  const cell = cellAt(site, zone);
                  const band = bandFor(cell.count);
                  // Hue comes from the threshold band; opacity from density relative to the busiest cell.
                  const density = cell.count / peak;
                  const alpha = cell.count === 0 ? 0.04 : 0.2 + density * 0.65;
                  const isSelected = selected?.site === site && selected?.zone === zone;

                  return (
                    <td key={zone} className="p-0">
                      <button
                        type="button"
                        aria-label={`${site} ${zone}, ${cell.count} events`}
                        onMouseEnter={(e) =>
                          setHover({ site, zone, cell, x: e.clientX, y: e.clientY })
                        }
                        onMouseMove={(e) => setHover((h) => (h ? { ...h, x: e.clientX, y: e.clientY } : h))}
                        onMouseLeave={() => setHover(null)}
                        onClick={() => setSelected(isSelected ? null : { site, zone })}
                        className={`h-9 w-full min-w-[52px] rounded tabular-nums transition-transform hover:scale-[1.06] ${
                          isSelected ? 'ring-2 ring-[#c5a059]' : ''
                        }`}
                        style={{
                          backgroundColor: `rgba(${band.rgb}, ${alpha})`,
                          border: `1px solid rgba(${band.rgb}, ${cell.count === 0 ? 0.12 : 0.55})`,
                          color: cell.count === 0 ? 'rgba(255,255,255,0.25)' : '#ffffff',
                        }}
                      >
                        {cell.count}
                      </button>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-3 border-t border-white/10 pt-2">
        {BANDS.map((band) => (
          <span key={band.label} className="flex items-center gap-1.5 text-[9px] uppercase tracking-wider text-white/40">
            <span
              className="h-2.5 w-2.5 rounded-sm"
              style={{ backgroundColor: `rgba(${band.rgb}, 0.75)`, border: `1px solid rgba(${band.rgb}, 1)` }}
            />
            {band.label}
          </span>
        ))}
      </div>

      {selected && selectedCell && (
        <div className="mt-2 rounded-lg border border-[#c5a059]/30 bg-[#11141B] p-3">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-[10px] uppercase tracking-[0.2em] text-[#c5a059]">
              {selected.site} / {zoneLabel(selected.zone)} — {selectedCell.count} events
            </span>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => {
                  toggleCrossFilter({ dim: 'site', value: selected.site });
                  toggleCrossFilter({ dim: 'zone', value: selected.zone });
                }}
                className="flex items-center gap-1 rounded border border-[#c5a059]/40 px-1.5 py-0.5 text-[9px] uppercase tracking-wider text-[#c5a059] transition-colors hover:bg-[#c5a059]/15"
              >
                <Filter className="h-3 w-3" /> Filter dashboard
              </button>
              <button
                onClick={() => setSelected(null)}
                aria-label="Close drill-down"
                className="rounded p-0.5 text-white/40 transition-colors hover:text-[#c5a059]"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          {selectedCell.count === 0 ? (
            <p className="text-[11px] text-white/40">No critical or major anomalies in this cell.</p>
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <p className="mb-1 text-[9px] uppercase tracking-wider text-white/40">Devices</p>
                <ul className="space-y-1">
                  {Object.entries(selectedCell.devices)
                    .sort((a, b) => Number(b[1]) - Number(a[1]))
                    .slice(0, 6)
                    .map(([device, count]) => (
                      <li key={device} className="flex items-center justify-between gap-2 text-[11px]">
                        <button
                          onClick={() => openDeviceDrawer(device)}
                          className="truncate text-left text-[#c5a059] hover:underline"
                        >
                          {device}
                        </button>
                        <span className="tabular-nums text-white/50">{count}</span>
                      </li>
                    ))}
                </ul>
              </div>
              <div>
                <p className="mb-1 text-[9px] uppercase tracking-wider text-white/40">Event Types</p>
                <ul className="space-y-1">
                  {Object.entries(selectedCell.types)
                    .sort((a, b) => Number(b[1]) - Number(a[1]))
                    .slice(0, 6)
                    .map(([type, count]) => (
                      <li key={type} className="flex items-center justify-between gap-2 text-[11px]">
                        <button
                          onClick={() => toggleCrossFilter({ dim: 'eventType', value: type })}
                          className="truncate text-left text-[#e5e5e5] hover:text-[#c5a059] hover:underline"
                        >
                          {type}
                        </button>
                        <span className="tabular-nums text-white/50">{count}</span>
                      </li>
                    ))}
                </ul>
              </div>
            </div>
          )}
        </div>
      )}

      {hover && (
        <div
          className="pointer-events-none fixed z-50 rounded-md border border-white/15 bg-[#0E1017] px-3 py-2 text-[11px] shadow-xl shadow-black/60"
          style={{ left: hover.x + 14, top: hover.y + 14 }}
        >
          <p className="font-medium text-[#c5a059]">{hover.site}</p>
          <p className="text-white/50">Zone: {hover.zone}</p>
          <p className="text-white/50">
            Events: <span className="tabular-nums text-[#e5e5e5]">{hover.cell.count}</span>
          </p>
          <p className="text-white/50">Top device: {topOf(hover.cell.devices)}</p>
          <p className="text-white/50">Top event type: {topOf(hover.cell.types)}</p>
        </div>
      )}
    </div>
  );
};
