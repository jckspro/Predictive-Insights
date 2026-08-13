import React, { useEffect, useRef, useState } from 'react';
import { RotateCcw, CalendarClock, MapPin, Server, ShieldAlert, ChevronRight, ChevronDown, Check, X, Filter } from 'lucide-react';
import { useFilter } from '../../context/FilterContext';
import { Severity, TimeRangePreset } from '../../types';
import { EMPTY_LOCATION, locationLabel } from '../../lib/locations';
import { crossFilterLabel } from '../../lib/crossFilter';

const PANEL =
  'absolute top-full left-0 mt-1.5 z-50 min-w-[240px] bg-[#151821] border border-white/10 rounded-md shadow-xl shadow-black/50 p-2';
const CHIP =
  'flex items-center gap-1.5 bg-[#151821] border border-white/10 rounded-md px-2.5 py-1 cursor-pointer hover:border-white/25 transition-colors';

const TIME_PRESETS: { value: TimeRangePreset; label: string }[] = [
  { value: '7d', label: 'Last 7 Days' },
  { value: '30d', label: 'Last 30 Days' },
  { value: '90d', label: 'Last 90 Days' },
  { value: 'all', label: 'All Time' },
];

// datetime-local inputs work in local time; the store keeps ISO/UTC.
const toInputValue = (iso: string) => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

function useDismissOnOutside(onDismiss: () => void) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onDismiss();
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onDismiss]);
  return ref;
}

const DateTimeFilter: React.FC = () => {
  const { filterState, setTimeRange, setCustomRange } = useFilter();
  const [open, setOpen] = useState(false);
  const ref = useDismissOnOutside(() => setOpen(false));

  const [from, setFrom] = useState(toInputValue(filterState.fromIso));
  const [to, setTo] = useState(toInputValue(filterState.toIso));

  useEffect(() => {
    setFrom(toInputValue(filterState.fromIso));
    setTo(toInputValue(filterState.toIso));
  }, [filterState.fromIso, filterState.toIso]);

  const label =
    filterState.timeRange === 'custom'
      ? `${new Date(filterState.fromIso).toLocaleString()} → ${new Date(filterState.toIso).toLocaleString()}`
      : TIME_PRESETS.find((p) => p.value === filterState.timeRange)?.label || 'Date & Time';

  const applyCustom = () => {
    if (!from || !to) return;
    const fromDate = new Date(from);
    const toDate = new Date(to);
    if (Number.isNaN(fromDate.getTime()) || Number.isNaN(toDate.getTime()) || fromDate > toDate) return;
    setCustomRange(fromDate.toISOString(), toDate.toISOString());
    setOpen(false);
  };

  return (
    <div className="relative" ref={ref}>
      <button className={CHIP} onClick={() => setOpen((o) => !o)}>
        <CalendarClock className="w-3.5 h-3.5 text-[#c5a059]" />
        <span className="text-[#e5e5e5] text-xs">{label}</span>
      </button>

      {open && (
        <div className={PANEL} style={{ minWidth: 300 }}>
          <div className="text-[10px] uppercase tracking-wider text-white/40 px-1 pb-1">Presets</div>
          {TIME_PRESETS.map((p) => (
            <button
              key={p.value}
              onClick={() => {
                setTimeRange(p.value);
                setOpen(false);
              }}
              className="w-full flex items-center justify-between px-2 py-1.5 rounded text-xs text-[#e5e5e5] hover:bg-white/5"
            >
              {p.label}
              {filterState.timeRange === p.value && <Check className="w-3 h-3 text-[#c5a059]" />}
            </button>
          ))}

          <div className="border-t border-white/10 mt-2 pt-2">
            <div className="text-[10px] uppercase tracking-wider text-white/40 px-1 pb-1.5">Custom Range</div>
            <label className="block px-1 pb-1.5">
              <span className="text-[10px] text-white/40">From</span>
              <input
                type="datetime-local"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
                className="w-full bg-[#0B0D12] border border-white/10 rounded px-2 py-1 text-xs text-[#e5e5e5] focus:outline-none focus:border-[#c5a059]"
              />
            </label>
            <label className="block px-1 pb-2">
              <span className="text-[10px] text-white/40">To</span>
              <input
                type="datetime-local"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                className="w-full bg-[#0B0D12] border border-white/10 rounded px-2 py-1 text-xs text-[#e5e5e5] focus:outline-none focus:border-[#c5a059]"
              />
            </label>
            <button
              onClick={applyCustom}
              className="w-full px-2 py-1.5 bg-[#c5a059] text-[#0B0D12] rounded text-xs font-medium hover:bg-[#d4b574] transition-colors"
            >
              Apply Range
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

const LocationColumn: React.FC<{
  title: string;
  options: string[];
  selected: string | null;
  hasChildren: boolean;
  onPick: (value: string) => void;
}> = ({ title, options, selected, hasChildren, onPick }) => (
  <div className="w-44 max-h-64 overflow-y-auto border-l border-white/10 first:border-l-0 px-1">
    <div className="text-[10px] uppercase tracking-wider text-white/40 px-2 py-1 sticky top-0 bg-[#151821]">
      {title}
    </div>
    {options.length === 0 && <div className="px-2 py-1.5 text-xs text-white/30">None</div>}
    {options.map((o) => (
      <button
        key={o}
        onClick={() => onPick(o)}
        className={`w-full flex items-center justify-between gap-2 px-2 py-1.5 rounded text-xs text-left hover:bg-white/5 ${
          selected === o ? 'text-[#c5a059] bg-white/5' : 'text-[#e5e5e5]'
        }`}
      >
        <span className="truncate">{o}</span>
        {hasChildren ? (
          <ChevronRight className="w-3 h-3 shrink-0 text-white/30" />
        ) : (
          selected === o && <Check className="w-3 h-3 shrink-0 text-[#c5a059]" />
        )}
      </button>
    ))}
  </div>
);

const LocationFilter: React.FC = () => {
  const { filterState, setLocation, locationTree } = useFilter();
  const [open, setOpen] = useState(false);
  const ref = useDismissOnOutside(() => setOpen(false));

  const sel = filterState.location;
  const region = locationTree.find((r) => r.name === sel.region);
  const country = region?.countries.find((c) => c.name === sel.country);
  const city = country?.cities.find((c) => c.name === sel.city);

  return (
    <div className="relative" ref={ref}>
      <button className={CHIP} onClick={() => setOpen((o) => !o)}>
        <MapPin className="w-3.5 h-3.5 text-emerald-400" />
        <span className="text-[#e5e5e5] text-xs">{locationLabel(sel)}</span>
        <ChevronDown className="w-3 h-3 text-white/40" />
      </button>

      {open && (
        <div className={`${PANEL} flex items-stretch p-1`}>
          <div className="flex flex-col">
            <button
              onClick={() => setLocation(EMPTY_LOCATION)}
              className="mx-1 mb-1 px-2 py-1.5 rounded text-xs text-left text-white/50 hover:bg-white/5"
            >
              All Locations
            </button>
            <LocationColumn
              title="Region"
              options={locationTree.map((r) => r.name)}
              selected={sel.region}
              hasChildren
              onPick={(value) => setLocation({ ...EMPTY_LOCATION, region: value })}
            />
          </div>

          {region && (
            <LocationColumn
              title="Country"
              options={region.countries.map((c) => c.name)}
              selected={sel.country}
              hasChildren
              onPick={(value) => setLocation({ ...sel, country: value, city: null, store: null })}
            />
          )}

          {country && (
            <LocationColumn
              title="City"
              options={country.cities.map((c) => c.name)}
              selected={sel.city}
              hasChildren
              onPick={(value) => setLocation({ ...sel, city: value, store: null })}
            />
          )}

          {city && (
            <LocationColumn
              title="Store"
              options={city.stores}
              selected={sel.store}
              hasChildren={false}
              onPick={(value) => {
                setLocation({ ...sel, store: value });
                setOpen(false);
              }}
            />
          )}
        </div>
      )}
    </div>
  );
};

export const CrossFilterChips: React.FC = () => {
  const { crossFilters, removeCrossFilter, clearCrossFilters } = useFilter();
  if (crossFilters.length === 0) return null;

  return (
    <div className="bg-[#0E1017] border-b border-white/10 px-6 py-2 flex flex-wrap items-center gap-2 font-sans text-xs">
      <span className="flex items-center gap-1.5 text-white/40 uppercase tracking-wider text-[10px]">
        <Filter className="w-3 h-3 text-[#c5a059]" /> Drill-down
      </span>
      {crossFilters.map((f) => (
        <button
          key={`${f.dim}:${f.value}`}
          onClick={() => removeCrossFilter(f)}
          title="Remove this selection"
          className="flex items-center gap-1.5 bg-[#c5a059]/10 border border-[#c5a059]/40 rounded-md px-2.5 py-1 text-[#d4b574] hover:bg-[#c5a059]/20 transition-colors"
        >
          <span className="text-white/40">{crossFilterLabel(f.dim)}:</span>
          <span className="font-medium">{f.value}</span>
          <X className="w-3 h-3" />
        </button>
      ))}
      {crossFilters.length > 1 && (
        <button
          onClick={clearCrossFilters}
          className="text-white/40 hover:text-[#c5a059] transition-colors uppercase tracking-wider text-[10px] px-1"
        >
          Clear all
        </button>
      )}
    </div>
  );
};

export const FilterBar: React.FC = () => {
  const { filterState, setDeviceType, setSeverity, resetFilters, deviceTypesList, crossFilters } = useFilter();

  const isFiltered =
    filterState.timeRange !== 'all' ||
    filterState.location.region !== null ||
    filterState.deviceType !== null ||
    filterState.severity !== null ||
    crossFilters.length > 0;

  return (
    <div className="bg-[#0B0D12] border-b border-white/10 px-6 py-3.5 flex flex-wrap items-center justify-between gap-3 font-sans text-xs">
      {/* Filters group */}
      <div className="flex flex-wrap items-center gap-2.5">
        <DateTimeFilter />
        <LocationFilter />

        {/* Device Type Filter */}
        <div className="flex items-center gap-1.5 bg-[#151821] border border-white/10 rounded-md px-2.5 py-1">
          <Server className="w-3.5 h-3.5 text-[#c5a059]" />
          <select
            value={filterState.deviceType || ''}
            onChange={(e) => setDeviceType(e.target.value || null)}
            className="bg-transparent text-[#e5e5e5] focus:outline-none text-xs cursor-pointer"
          >
            <option value="" className="bg-[#151821] text-white/40">
              All Device Types
            </option>
            {deviceTypesList.map((dt) => (
              <option key={dt} value={dt} className="bg-[#151821] text-[#e5e5e5]">
                {dt}
              </option>
            ))}
          </select>
        </div>

        {/* Severity Filter */}
        <div className="flex items-center gap-1.5 bg-[#151821] border border-white/10 rounded-md px-2.5 py-1">
          <ShieldAlert className="w-3.5 h-3.5 text-red-400" />
          <select
            value={filterState.severity || ''}
            onChange={(e) => setSeverity((e.target.value as Severity) || null)}
            className="bg-transparent text-[#e5e5e5] focus:outline-none text-xs cursor-pointer"
          >
            <option value="" className="bg-[#151821] text-white/40">
              All Severities
            </option>
            <option value="CRITICAL" className="bg-[#151821] text-red-400">
              CRITICAL
            </option>
            <option value="MAJOR" className="bg-[#151821] text-[#f59e0b]">
              MAJOR
            </option>
            <option value="MINOR" className="bg-[#151821] text-yellow-300">
              MINOR
            </option>
            <option value="INFO" className="bg-[#151821] text-[#c5a059]">
              INFO
            </option>
          </select>
        </div>

        {/* Reset Button */}
        {isFiltered && (
          <button
            onClick={resetFilters}
            className="flex items-center gap-1.5 px-3 py-1 bg-[#1E222D] border border-white/10 text-[#c5a059] hover:bg-white/5 rounded-md transition-colors text-xs tracking-wider uppercase"
          >
            <RotateCcw className="w-3 h-3" /> Reset
          </button>
        )}
      </div>
    </div>
  );
};
