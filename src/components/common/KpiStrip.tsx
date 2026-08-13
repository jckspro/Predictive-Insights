import React, { useEffect, useRef, useState } from 'react';
import { Activity, ShieldAlert, ShieldX, AlertTriangle, X } from 'lucide-react';
import { useCypher, useCypherSingle } from '../../hooks/useCypher';
import { useFilter } from '../../context/FilterContext';
import { useDeviceDrawer } from '../../context/DeviceDrawerContext';

interface KpiCounts1To3 {
  totalEvents: number;
  criticalEvents: number;
  deniedEvents: number;
}

interface KpiDevicesAtRisk {
  devicesAtRisk: number;
}

interface DrillColumn {
  key: string;
  label: string;
  mono?: boolean;
  numeric?: boolean;
  severity?: boolean;
  device?: boolean;
}

interface DrillConfig {
  heading: string;
  query: string;
  columns: DrillColumn[];
}

const SEVERITY_TONE: Record<string, string> = {
  CRITICAL: 'bg-red-500/10 border-red-500/40 text-red-400',
  MAJOR: 'bg-[#f59e0b]/10 border-[#f59e0b]/40 text-[#f59e0b]',
  MINOR: 'bg-yellow-500/10 border-yellow-500/40 text-yellow-300',
  INFO: 'bg-emerald-500/10 border-emerald-500/40 text-emerald-400',
};

// Count-up helper component for smooth numeric transition
const CountUp: React.FC<{ value: number; format?: boolean }> = ({ value, format = true }) => {
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    let start = display;
    const target = value || 0;
    if (start === target) return;

    const steps = 20;
    const increment = (target - start) / steps;
    let step = 0;

    const timer = setInterval(() => {
      step++;
      start += increment;
      if (step >= steps) {
        setDisplay(target);
        clearInterval(timer);
      } else {
        setDisplay(Math.round(start));
      }
    }, 20);

    return () => clearInterval(timer);
  }, [value]);

  return <>{format ? display.toLocaleString() : display}</>;
};

// Popover listing the contributors behind a KPI. Mounted only while open so the query is lazy.
const KpiDrilldown: React.FC<{ drill: DrillConfig; accent: string; onClose: () => void }> = ({
  drill,
  accent,
  onClose,
}) => {
  const { queryParams } = useFilter();
  const { openDeviceDrawer } = useDeviceDrawer();
  const { data, loading, error } = useCypher<Record<string, string | number>>(drill.query, queryParams);

  return (
    <div
      role="dialog"
      aria-label={drill.heading}
      className="absolute left-0 right-0 top-full mt-2 z-50 min-w-[320px] bg-[#151821] border border-[#c5a059]/40 rounded-xl shadow-[0_12px_40px_rgba(0,0,0,0.7)] overflow-hidden"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="flex items-center justify-between px-3 py-2 bg-[#0E1017] border-b border-white/10">
        <span className="uppercase tracking-[0.2em] text-[10px] font-medium" style={{ color: accent }}>
          {drill.heading}
        </span>
        <button
          onClick={onClose}
          aria-label="Close details"
          className="p-0.5 text-white/40 hover:text-[#c5a059] rounded transition-colors"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="max-h-72 overflow-y-auto">
        {loading ? (
          <div className="p-3 space-y-1.5">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-5 bg-white/5 rounded animate-pulse" />
            ))}
          </div>
        ) : error ? (
          <div className="p-4 text-[11px] text-red-400">{error}</div>
        ) : data.length === 0 ? (
          <div className="p-4 text-[11px] text-white/40 uppercase tracking-[0.2em] text-center">No Signal</div>
        ) : (
          <table className="w-full text-left text-[11px] border-collapse">
            <thead className="sticky top-0 bg-[#1E222D]">
              <tr>
                <th className="p-2 w-6 text-[9px] uppercase tracking-wider text-white/40 font-medium">#</th>
                {drill.columns.map((c) => (
                  <th
                    key={c.key}
                    className={`p-2 text-[9px] uppercase tracking-wider text-white/40 font-medium whitespace-nowrap ${
                      c.numeric ? 'text-right' : ''
                    }`}
                  >
                    {c.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {data.map((row, idx) => (
                <tr key={idx} className={idx % 2 === 0 ? 'bg-[#151821]' : 'bg-[#11141B]'}>
                  <td className="p-2 text-white/30 tabular-nums">{idx + 1}</td>
                  {drill.columns.map((c) => {
                    const raw = row[c.key];
                    if (c.severity) {
                      const sev = String(raw || '');
                      return (
                        <td key={c.key} className="p-2 whitespace-nowrap">
                          <span
                            className={`px-1.5 py-0.5 border rounded text-[9px] font-medium tracking-wider ${
                              SEVERITY_TONE[sev] || 'bg-white/5 border-white/15 text-white/50'
                            }`}
                          >
                            {sev}
                          </span>
                        </td>
                      );
                    }
                    if (c.device) {
                      const name = String(raw ?? '');
                      const clickable = name && name !== 'unknown' && name !== 'n/a';
                      return (
                        <td key={c.key} className="p-2 whitespace-nowrap">
                          {clickable ? (
                            <button
                              onClick={() => {
                                openDeviceDrawer(name);
                                onClose();
                              }}
                              className="text-[#c5a059] underline underline-offset-2 hover:text-[#d4b574] font-medium transition-colors"
                            >
                              {name}
                            </button>
                          ) : (
                            <span className="text-white/40">{name || '—'}</span>
                          )}
                        </td>
                      );
                    }
                    return (
                      <td
                        key={c.key}
                        className={`p-2 text-[#e5e5e5] ${c.mono ? 'font-mono text-[10px]' : ''} ${
                          c.numeric ? 'text-right tabular-nums font-medium' : ''
                        }`}
                        style={c.numeric ? { color: accent } : undefined}
                      >
                        {c.numeric ? Number(raw || 0).toLocaleString() : String(raw ?? '—')}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export const KpiStrip: React.FC = () => {
  const { queryParams } = useFilter();

  // Listen to custom global refresh event
  const [refreshKey, setRefreshKey] = useState(0);
  useEffect(() => {
    const handler = () => setRefreshKey((prev) => prev + 1);
    window.addEventListener('netops-refresh-all', handler);
    return () => window.removeEventListener('netops-refresh-all', handler);
  }, []);

  // Query 1..3
  const q1 = `
    MATCH (e:Event)
    WHERE datetime(e.timestamp) >= datetime($from) AND datetime(e.timestamp) <= datetime($to)
    RETURN count(e) AS totalEvents,
           count(CASE WHEN e.severity = 'CRITICAL' THEN 1 END) AS criticalEvents,
           count(CASE WHEN e.result IN ['denied','blocked','failed'] THEN 1 END) AS deniedEvents
  `;
  const { data: data1, loading: l1 } = useCypherSingle<KpiCounts1To3>(q1, queryParams, [queryParams, refreshKey]);

  // Query 4
  const q4 = `
    MATCH (d:Device)-[:SOURCE_OF]->(e:Event)
    WHERE (e.event_type IN ['HARDWARE_FAULT','DEVICE_REBOOT']
           OR (e.event_type = 'DEVICE_HEALTH' AND e.result = 'threshold_exceeded'))
      AND datetime(e.timestamp) >= datetime($from) AND datetime(e.timestamp) <= datetime($to)
    RETURN count(DISTINCT d) AS devicesAtRisk
  `;
  const { data: data4, loading: l4 } = useCypherSingle<KpiDevicesAtRisk>(q4, queryParams, [queryParams, refreshKey]);

  const [openCard, setOpenCard] = useState<string | null>(null);
  const stripRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!openCard) return;
    const onPointerDown = (e: MouseEvent) => {
      if (stripRef.current && !stripRef.current.contains(e.target as Node)) setOpenCard(null);
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpenCard(null);
    };
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [openCard]);

  const drillCritical: DrillConfig = {
    heading: 'Critical Events',
    query: `
      // kpi-drill:critical
      MATCH (e:Event)
      WHERE e.severity = 'CRITICAL'
        AND datetime(e.timestamp) >= datetime($from) AND datetime(e.timestamp) <= datetime($to)
      OPTIONAL MATCH (d:Device)-[:SOURCE_OF]->(e)
      RETURN toString(datetime(e.timestamp)) AS ts, e.event_type AS eventType,
             coalesce(d.name, 'unknown') AS device, e.reason AS reason
      ORDER BY ts DESC
    `,
    columns: [
      { key: 'ts', label: 'Timestamp', mono: true },
      { key: 'device', label: 'Device', device: true },
      { key: 'eventType', label: 'Event Type' },
      { key: 'reason', label: 'Reason' },
    ],
  };

  const drillDenied: DrillConfig = {
    heading: 'Denial / Block Reasons',
    query: `
      // kpi-drill:denied
      MATCH (e:Event)
      WHERE e.result IN ['denied','blocked','failed']
        AND datetime(e.timestamp) >= datetime($from) AND datetime(e.timestamp) <= datetime($to)
      OPTIONAL MATCH (d:Device)-[:SOURCE_OF]->(e)
      RETURN coalesce(d.name, 'unknown') AS device, e.reason AS reason, e.result AS result, count(*) AS occurrences
      ORDER BY occurrences DESC
    `,
    columns: [
      { key: 'device', label: 'Device', device: true },
      { key: 'reason', label: 'Reason' },
      { key: 'result', label: 'Result' },
      { key: 'occurrences', label: 'Count', numeric: true },
    ],
  };

  const drillDevices: DrillConfig = {
    heading: 'Devices At Risk',
    query: `
      // kpi-drill:devices
      MATCH (d:Device)-[:SOURCE_OF]->(e:Event)
      WHERE (e.event_type IN ['HARDWARE_FAULT','DEVICE_REBOOT']
             OR (e.event_type = 'DEVICE_HEALTH' AND e.result = 'threshold_exceeded'))
        AND datetime(e.timestamp) >= datetime($from) AND datetime(e.timestamp) <= datetime($to)
      RETURN d.name AS device, d.type AS deviceType, count(e) AS faultEvents
      ORDER BY faultEvents DESC LIMIT 10
    `,
    columns: [
      { key: 'device', label: 'Device', device: true },
      { key: 'deviceType', label: 'Type' },
      { key: 'faultEvents', label: 'Faults', numeric: true },
    ],
  };

  const cards = [
    {
      title: 'Total Events',
      value: data1?.totalEvents ?? 0,
      loading: l1,
      icon: Activity,
      color: '#60a5fa',
      badge: 'LOG STREAM',
      sparkline: [40, 55, 60, 48, 70, 85, 90],
      drill: undefined as DrillConfig | undefined,
    },
    {
      title: 'Critical Events',
      value: data1?.criticalEvents ?? 0,
      loading: l1,
      icon: ShieldAlert,
      color: '#ef4444',
      badge: 'P1 CRITICAL',
      sparkline: [5, 12, 8, 20, 15, 30, 25],
      drill: drillCritical,
    },
    {
      title: 'Denied / Blocked',
      value: data1?.deniedEvents ?? 0,
      loading: l1,
      icon: ShieldX,
      color: '#a78bfa',
      badge: 'SECURITY BLOCK',
      sparkline: [80, 70, 95, 110, 85, 120, 140],
      drill: drillDenied,
    },
    {
      title: 'Devices At Risk',
      value: data4?.devicesAtRisk ?? 0,
      loading: l4,
      icon: AlertTriangle,
      color: '#f59e0b',
      badge: 'HW / REBOOT FAULT',
      sparkline: [2, 4, 3, 7, 5, 8, 14],
      drill: drillDevices,
    },
  ];

  return (
    <div
      ref={stripRef}
      className="relative z-20 grid grid-cols-4 gap-3 p-4 bg-[#0E1017] font-sans border-b border-white/10"
    >
      {cards.map((card, idx) => {
        const Icon = card.icon;
        const isOpen = openCard === card.title;
        const clickable = Boolean(card.drill);
        return (
          <div key={idx} className="relative min-w-0">
            <div
              role={clickable ? 'button' : undefined}
              tabIndex={clickable ? 0 : undefined}
              aria-expanded={clickable ? isOpen : undefined}
              aria-label={clickable ? `${card.title}, show details` : undefined}
              onClick={clickable ? () => setOpenCard(isOpen ? null : card.title) : undefined}
              onKeyDown={
                clickable
                  ? (e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        setOpenCard(isOpen ? null : card.title);
                      }
                    }
                  : undefined
              }
              className={`bg-[#151821] bg-gradient-to-b from-white/[0.035] to-transparent border rounded-xl p-3.5 pt-4 flex flex-col justify-between relative overflow-hidden group transition-all duration-300 ${
                clickable ? 'cursor-pointer' : ''
              } ${
                isOpen
                  ? 'border-[#c5a059]/60 shadow-[0_0_16px_rgba(197,160,89,0.2)]'
                  : 'border-white/10 hover:border-[#c5a059]/40 hover:shadow-[0_0_16px_rgba(197,160,89,0.12)]'
              }`}
            >
              {/* Top accent strip */}
              <div
                className="absolute top-0 left-0 right-0 h-1"
                style={{
                  backgroundColor: card.color,
                  boxShadow: `0 0 12px ${card.color}80`,
                }}
              />

              {/* Top row: title & icon */}
              <div className="flex items-center justify-between gap-1.5 mb-2">
                <span className="uppercase tracking-[0.15em] text-[10px] text-white/50 font-medium truncate">
                  {card.title}
                </span>
                <Icon className="w-4 h-4 shrink-0" style={{ color: card.color }} />
              </div>

              {/* Middle row: Big KPI Number */}
              <div className="my-1">
                {card.loading ? (
                  <div className="h-8 w-24 bg-white/10 animate-pulse rounded" />
                ) : (
                  <div
                    className="text-2xl font-semibold font-sans tracking-tight"
                    style={{
                      color: card.color,
                    }}
                  >
                    <CountUp value={card.value} />
                  </div>
                )}
              </div>

              {/* Bottom row: Badge */}
              <div className="flex items-center justify-between gap-1.5 pt-1 border-t border-white/10 text-[9px] text-white/40">
                <span
                  className="px-1.5 py-0.5 rounded-sm border uppercase tracking-wider truncate"
                  style={{
                    backgroundColor: `${card.color}1A`,
                    borderColor: `${card.color}59`,
                    color: card.color,
                  }}
                >
                  {card.badge}
                </span>
                {clickable && (
                  <span className="uppercase tracking-wider text-[#c5a059]/70 group-hover:text-[#c5a059] shrink-0">
                    {isOpen ? 'Hide' : 'Details'}
                  </span>
                )}
              </div>
            </div>

            {isOpen && card.drill && (
              <KpiDrilldown drill={card.drill} accent={card.color} onClose={() => setOpenCard(null)} />
            )}
          </div>
        );
      })}
    </div>
  );
};

