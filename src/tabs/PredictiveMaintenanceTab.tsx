import React from 'react';
import { CardWrapper } from '../components/common/CardWrapper';
import { DataTable } from '../components/common/DataTable';
import { useCypher } from '../hooks/useCypher';
import { useFilter } from '../context/FilterContext';
import { useDeviceDrawer } from '../context/DeviceDrawerContext';
import {
  DeviceRiskScoreItem,
  HealthThresholdItem,
  MetricGaugeItem,
  ErrorDegradationPoint,
  HardwareFaultItem,
  FaultRateByTypeItem,
  UnexpectedRebootItem,
  RebootCauseItem,
  ThermalOutlierItem,
  OpticsDegradationItem,
  MaintenanceBacklogItem,
} from '../types';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  ScatterChart,
  Scatter,
  ReferenceLine,
  ComposedChart,
  Legend,
} from 'recharts';
import { CustomTooltip } from '../components/charts/CustomTooltip';
import { ScrollingBarChart, ScrollingColumnChart, SortToggle, useBarSort } from '../components/charts/ScrollingBarChart';
import { ColumnDef } from '@tanstack/react-table';

const DEVICE_LINE_COLORS = ['#c5a059', '#d4b574', '#10b981', '#f59e0b', '#3b82f6', '#ef4444'];

export const PredictiveMaintenanceTab: React.FC = () => {
  const { queryParams, toggleCrossFilter, filterState, setDeviceType } = useFilter();
  const { openDeviceDrawer } = useDeviceDrawer();

  // 3.1 Device Risk Score (Hero Table)
  const q3_1 = `
    MATCH (d:Device)-[:SOURCE_OF]->(e:Event)
    WHERE datetime(e.timestamp) >= datetime($from) AND datetime(e.timestamp) <= datetime($to)
    WITH d,
      count(CASE WHEN e.event_type = 'HARDWARE_FAULT' THEN 1 END) AS hwFaults,
      count(CASE WHEN e.event_type = 'DEVICE_REBOOT'
                  AND e.reason <> 'planned maintenance reload' THEN 1 END) AS unplannedReboots,
      count(CASE WHEN e.event_type = 'DEVICE_HEALTH'
                  AND e.result = 'threshold_exceeded' THEN 1 END) AS criticalHealth,
      count(CASE WHEN e.event_type = 'DEVICE_HEALTH'
                  AND e.result = 'degraded' THEN 1 END) AS degradedHealth,
      sum(CASE WHEN e.event_type = 'INTERFACE_STATE_CHANGE'
               THEN coalesce(e.metric_value, 0) ELSE 0 END) AS interfaceErrors
    WITH d, hwFaults, unplannedReboots, criticalHealth, degradedHealth, interfaceErrors,
         (hwFaults * 10.0 + unplannedReboots * 6.0 + criticalHealth * 4.0
          + degradedHealth * 1.5 + interfaceErrors / 5000.0) AS rawScore
    RETURN d.name AS device, d.type AS deviceType,
           hwFaults, unplannedReboots, criticalHealth, degradedHealth,
           toInteger(interfaceErrors) AS interfaceErrors,
           toInteger(round(rawScore)) AS riskScore
    ORDER BY riskScore DESC LIMIT 25
  `;
  const { data: data3_1, loading: l3_1, error: e3_1, refetch: r3_1 } = useCypher<DeviceRiskScoreItem>(q3_1, queryParams);

  const maxRisk = React.useMemo(() => {
    return Math.max(...data3_1.map((d) => d.riskScore), 100);
  }, [data3_1]);

  const cols3_1: ColumnDef<DeviceRiskScoreItem>[] = [
    {
      accessorKey: 'device',
      header: 'Device',
      cell: (info) => (
        <button
          onClick={() => openDeviceDrawer(String(info.getValue() || ''))}
          className="text-[#c5a059] font-medium hover:underline text-left"
        >
          {String(info.getValue() || '')}
        </button>
      ),
    },
    { accessorKey: 'deviceType', header: 'Type' },
    { accessorKey: 'hwFaults', header: 'HW Faults' },
    { accessorKey: 'unplannedReboots', header: 'Unplanned Reboots' },
    { accessorKey: 'criticalHealth', header: 'Crit Health' },
    { accessorKey: 'degradedHealth', header: 'Degraded' },
    {
      accessorKey: 'riskScore',
      header: 'Risk Score & Tier',
      cell: (info) => {
        const score = Number(info.getValue() || 0);
        const pct = Math.min(100, (score / maxRisk) * 100);
        let tier = 'LOW';
        let color = '#10b981';

        if (score >= 70) {
          tier = 'CRITICAL';
          color = '#ef4444';
        } else if (score >= 40) {
          tier = 'HIGH';
          color = '#f59e0b';
        } else if (score >= 20) {
          tier = 'MEDIUM';
          color = '#d4b574';
        }

        return (
          <div className="flex items-center gap-3 w-48 font-sans">
            <div className="w-24 bg-[#0E1017] h-2 rounded-full border border-white/10 overflow-hidden">
              <div
                className="h-full transition-all duration-500 rounded-full"
                style={{
                  width: `${pct}%`,
                  backgroundColor: color,
                  boxShadow: `0 0 8px ${color}`,
                }}
              />
            </div>
            <span className="font-medium text-xs" style={{ color }}>
              {score} ({tier})
            </span>
          </div>
        );
      },
    },
  ];

  // 3.2 Health Threshold Breaches by Metric
  const q3_2 = `
    MATCH (e:Event {event_type:'DEVICE_HEALTH'})
    WHERE datetime(e.timestamp) >= datetime($from) AND datetime(e.timestamp) <= datetime($to)
    RETURN e.metric_name AS metric, e.result AS status, count(*) AS readings
    ORDER BY metric
  `;
  const { data: raw3_2, loading: l3_2, error: e3_2, refetch: r3_2 } = useCypher<{ metric: string; status: string; readings: number }>(q3_2, queryParams);

  const pivot3_2 = React.useMemo(() => {
    const map = new Map<string, any>();
    raw3_2.forEach((row) => {
      if (!map.has(row.metric)) {
        map.set(row.metric, { metric: row.metric, normal: 0, degraded: 0, threshold_exceeded: 0 });
      }
      const entry = map.get(row.metric)!;
      if (row.status in entry) {
        entry[row.status] = row.readings;
      }
    });
    // `total` is not plotted; it is the sort key for a grouped chart with no single value column.
    return Array.from(map.values()).map((row) => ({
      ...row,
      total: row.normal + row.degraded + row.threshold_exceeded,
    }));
  }, [raw3_2]);

  // 3.3 Metric Averages vs Thresholds
  const q3_3 = `
    MATCH (e:Event {event_type:'DEVICE_HEALTH'})
    WHERE datetime(e.timestamp) >= datetime($from) AND datetime(e.timestamp) <= datetime($to)
    RETURN e.metric_name AS metric, e.metric_unit AS unit,
           round(avg(e.metric_value), 1) AS avgValue,
           round(max(e.metric_value), 1) AS peakValue,
           max(e.threshold) AS threshold
    ORDER BY metric
  `;
  const { data: data3_3, loading: l3_3, error: e3_3, refetch: r3_3 } = useCypher<MetricGaugeItem>(q3_3, queryParams);

  // 3.4 Interface Error Degradation Trend
  const q3_4 = `
    MATCH (d:Device)-[:SOURCE_OF]->(e:Event {event_type:'INTERFACE_STATE_CHANGE'})
    WHERE coalesce(e.metric_value, 0) > 0
      AND datetime(e.timestamp) >= datetime($from) AND datetime(e.timestamp) <= datetime($to)
    WITH d, sum(e.metric_value) AS totalErrors
    ORDER BY totalErrors DESC LIMIT 6
    MATCH (d)-[:SOURCE_OF]->(e2:Event {event_type:'INTERFACE_STATE_CHANGE'})
    WHERE coalesce(e2.metric_value, 0) > 0
      AND datetime(e2.timestamp) >= datetime($from) AND datetime(e2.timestamp) <= datetime($to)
    RETURN d.name AS device,
           toString(date(datetime(e2.timestamp))) AS day,
           sum(e2.metric_value) AS errors
    ORDER BY day
  `;
  const { data: raw3_4, loading: l3_4, error: e3_4, refetch: r3_4 } = useCypher<ErrorDegradationPoint>(q3_4, queryParams);

  const { pivot3_4, deviceList3_4 } = React.useMemo(() => {
    const devices = Array.from(new Set(raw3_4.map((r) => r.device)));
    const map = new Map<string, any>();
    raw3_4.forEach((row) => {
      if (!map.has(row.day)) {
        map.set(row.day, { day: row.day });
      }
      const entry = map.get(row.day)!;
      entry[row.device] = row.errors;
    });
    return {
      pivot3_4: Array.from(map.values()).sort((a, b) => a.day.localeCompare(b.day)),
      deviceList3_4: devices,
    };
  }, [raw3_4]);

  // 3.5 Hardware Faults by Component
  const q3_5 = `
    MATCH (e:Event {event_type:'HARDWARE_FAULT'})
    WHERE datetime(e.timestamp) >= datetime($from) AND datetime(e.timestamp) <= datetime($to)
    WITH e.reason AS component, collect(DISTINCT e.result) AS statuses, count(*) AS faults
    RETURN component, reduce(s = '', x IN statuses | CASE WHEN s = '' THEN x ELSE s + ', ' + x END) AS status, faults
    ORDER BY faults DESC
  `;
  const { data: data3_5, loading: l3_5, error: e3_5, refetch: r3_5 } = useCypher<HardwareFaultItem>(q3_5, queryParams);

  // 3.6 Fault Rate Normalized by Device Type
  const q3_6 = `
    MATCH (d:Device)
    OPTIONAL MATCH (d)-[:SOURCE_OF]->(e:Event {event_type:'HARDWARE_FAULT'})
    WHERE e IS NULL OR (datetime(e.timestamp) >= datetime($from) AND datetime(e.timestamp) <= datetime($to))
    WITH d, count(e) AS faults
    RETURN d.type AS deviceType,
           count(d) AS deviceCount,
           sum(faults) AS totalFaults,
           round(1.0 * sum(faults) / count(d), 2) AS faultsPerDevice
    ORDER BY faultsPerDevice DESC
  `;
  const { data: data3_6, loading: l3_6, error: e3_6, refetch: r3_6 } = useCypher<FaultRateByTypeItem>(q3_6, queryParams);

  // 3.7 Unexpected Reboot Ranking
  const q3_7 = `
    MATCH (d:Device)-[:SOURCE_OF]->(e:Event {event_type:'DEVICE_REBOOT'})
    WHERE e.reason <> 'planned maintenance reload'
      AND datetime(e.timestamp) >= datetime($from) AND datetime(e.timestamp) <= datetime($to)
    RETURN d.name AS device, d.type AS deviceType, count(*) AS reboots,
           collect(DISTINCT e.reason)[0..3] AS causes,
           toInteger(avg(e.metric_value)) AS avgUptimeMinutes
    ORDER BY reboots DESC LIMIT 20
  `;
  const { data: data3_7, loading: l3_7, error: e3_7, refetch: r3_7 } = useCypher<UnexpectedRebootItem>(q3_7, queryParams);

  const cols3_7: ColumnDef<UnexpectedRebootItem>[] = [
    { accessorKey: 'device', header: 'Device' },
    { accessorKey: 'deviceType', header: 'Type' },
    {
      accessorKey: 'reboots',
      header: 'Reboots',
      cell: (info) => {
        const val = Number(info.getValue() || 0);
        return val >= 5 ? (
          <span className="px-1.5 py-0.5 bg-red-500/10 text-red-400 border border-red-500/30 font-medium rounded">
            {val} (Crash Loop)
          </span>
        ) : (
          val
        );
      },
    },
    { accessorKey: 'avgUptimeMinutes', header: 'Avg Uptime (min)' },
  ];

  // 3.8 Reboot Cause Distribution
  const q3_8 = `
    MATCH (e:Event {event_type:'DEVICE_REBOOT'})
    WHERE datetime(e.timestamp) >= datetime($from) AND datetime(e.timestamp) <= datetime($to)
    RETURN e.reason AS cause, count(*) AS reboots ORDER BY reboots DESC
  `;
  const { data: data3_8, loading: l3_8, error: e3_8, refetch: r3_8 } = useCypher<RebootCauseItem>(q3_8, queryParams);

  // 3.9 Thermal & Fan Outliers
  const q3_9 = `
    MATCH (d:Device)-[:SOURCE_OF]->(e:Event {event_type:'DEVICE_HEALTH'})
    WHERE e.metric_name IN ['temperature','fan_speed']
      AND datetime(e.timestamp) >= datetime($from) AND datetime(e.timestamp) <= datetime($to)
    RETURN d.name AS device, d.type AS deviceType, e.metric_name AS metric,
           round(max(e.metric_value), 1) AS peakValue,
           round(min(e.metric_value), 1) AS lowValue,
           count(*) AS samples
    ORDER BY peakValue DESC LIMIT 40
  `;
  const { data: data3_9, loading: l3_9, error: e3_9, refetch: r3_9 } = useCypher<ThermalOutlierItem>(q3_9, queryParams);

  // Temperature (°C) and fan speed (RPM) differ by two orders of magnitude, so each gets its own X scale.
  const temp3_9 = React.useMemo(() => data3_9.filter((d) => d.metric === 'temperature'), [data3_9]);
  const fan3_9 = React.useMemo(() => data3_9.filter((d) => d.metric === 'fan_speed'), [data3_9]);

  // 3.10 Optics / SFP Watchlist
  const q3_10 = `
    MATCH (d:Device)-[:SOURCE_OF]->(e:Event)
    WHERE e.reason IN ['SFP signal degraded','SFP/transceiver failure','SFP Rx Optical Power Low (-22dBm)']
      AND datetime(e.timestamp) >= datetime($from) AND datetime(e.timestamp) <= datetime($to)
    RETURN d.name AS device, d.type AS deviceType,
           coalesce(e.interface, 'n/a') AS interfaceName,
           e.reason AS symptom, count(*) AS occurrences
    ORDER BY occurrences DESC LIMIT 20
  `;
  const { data: data3_10, loading: l3_10, error: e3_10, refetch: r3_10 } = useCypher<OpticsDegradationItem>(q3_10, queryParams);

  const cols3_10: ColumnDef<OpticsDegradationItem>[] = [
    { accessorKey: 'device', header: 'Device' },
    { accessorKey: 'interfaceName', header: 'Interface' },
    { accessorKey: 'symptom', header: 'Degradation Symptom' },
    { accessorKey: 'occurrences', header: 'Occurrences' },
  ];

  // 3.11 Maintenance Backlog by Site
  const q3_11 = `
    MATCH (e:Event)
    WHERE e.event_type IN ['HARDWARE_FAULT','DEVICE_REBOOT','DEVICE_HEALTH']
      AND e.severity IN ['MAJOR','CRITICAL']
      AND datetime(e.timestamp) >= datetime($from) AND datetime(e.timestamp) <= datetime($to)
    RETURN e.site AS site, e.event_type AS eventType, count(*) AS items
    ORDER BY site
  `;
  const { data: raw3_11, loading: l3_11, error: e3_11, refetch: r3_11 } = useCypher<{ site: string; eventType: string; items: number }>(q3_11, queryParams);

  const pivot3_11 = React.useMemo(() => {
    const map = new Map<string, any>();
    raw3_11.forEach((row) => {
      if (!map.has(row.site)) {
        map.set(row.site, { site: row.site, HARDWARE_FAULT: 0, DEVICE_REBOOT: 0, DEVICE_HEALTH: 0 });
      }
      const entry = map.get(row.site)!;
      if (row.eventType in entry) {
        entry[row.eventType] = row.items;
      }
    });
    return Array.from(map.values()).map((row) => ({
      ...row,
      total: row.HARDWARE_FAULT + row.DEVICE_REBOOT + row.DEVICE_HEALTH,
    }));
  }, [raw3_11]);

  const sort3_2 = useBarSort(pivot3_2, 'total');
  const sort3_5 = useBarSort(data3_5, 'faults');
  const sort3_6 = useBarSort(data3_6, 'totalFaults');
  const sort3_11 = useBarSort(pivot3_11, 'total');

  // Grouped and stacked charts repeat the same handler on every series.
  const onPickMetric = (entry: any) => entry && toggleCrossFilter({ dim: 'metricName', value: entry.metric });
  const onPickSite = (entry: any) => entry && toggleCrossFilter({ dim: 'site', value: entry.site });

  return (
    <div className="grid grid-cols-12 gap-4 p-4 font-sans">
      {/* Row 1 — 3.4 (8) + 3.8 (4) */}
      <CardWrapper
        title="3.4 Interface Error Degradation Trend"
        subtitle="Cumulative PHY interface bit error rate slope (Predictive Signal)"
        colSpan="col-span-12 lg:col-span-8"
        loading={l3_4}
        error={e3_4}
        isEmpty={pivot3_4.length === 0}
        onRetry={r3_4}
      >
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={pivot3_4}>
              <XAxis dataKey="day" stroke="rgba(255,255,255,0.4)" tick={{ fontSize: 10 }} />
              <YAxis stroke="rgba(255,255,255,0.4)" tick={{ fontSize: 10 }} />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ fontSize: 10, color: '#e5e5e5' }} />
              {deviceList3_4.map((dev, idx) => (
                <Line
                  key={dev}
                  type="monotone"
                  dataKey={dev}
                  stroke={DEVICE_LINE_COLORS[idx % DEVICE_LINE_COLORS.length]}
                  strokeWidth={2}
                  dot={{ r: 3 }}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardWrapper>

      <CardWrapper
        title="3.8 Reboot Cause Distribution"
        subtitle="Watchdogs, panics, brownouts vs maintenance"
        colSpan="col-span-12 lg:col-span-4"
        loading={l3_8}
        error={e3_8}
        isEmpty={data3_8.length === 0}
        onRetry={r3_8}
      >
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data3_8}
                dataKey="reboots"
                nameKey="cause"
                cx="50%"
                cy="45%"
                innerRadius="52%"
                outerRadius="80%"
                paddingAngle={4}
                className="cursor-pointer"
                onClick={(entry: any) => toggleCrossFilter({ dim: 'reason', value: entry.cause })}
              >
                {data3_8.map((_, idx) => (
                  <Cell key={`cell-${idx}`} fill={DEVICE_LINE_COLORS[idx % DEVICE_LINE_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ fontSize: 9, color: '#e5e5e5' }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </CardWrapper>

      {/* Row 2 — 3.2 + 3.11 + 3.5 (4/4/4) */}
      <CardWrapper
        title="3.2 Health Threshold Breaches by Metric"
        subtitle="Distribution of normal vs degraded vs threshold_exceeded"
        colSpan="col-span-12 md:col-span-6 lg:col-span-4"
        loading={l3_2}
        error={e3_2}
        isEmpty={pivot3_2.length === 0}
        onRetry={r3_2}
        actions={<SortToggle dir={sort3_2.dir} onChange={sort3_2.setDir} />}
      >
        <ScrollingColumnChart columns={pivot3_2.length}>
          <BarChart data={sort3_2.sorted} margin={{ bottom: 20, left: 0, right: 8 }}>
            <XAxis dataKey="metric" stroke="rgba(255,255,255,0.4)" tick={{ fontSize: 9 }} interval={0} angle={-20} textAnchor="end" height={45} dy={5} />
            <YAxis stroke="rgba(255,255,255,0.4)" tick={{ fontSize: 10 }} width={38} />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="normal" fill="#10b981" radius={[4, 4, 0, 0]} className="cursor-pointer" onClick={onPickMetric} />
            <Bar dataKey="degraded" fill="#f59e0b" radius={[4, 4, 0, 0]} className="cursor-pointer" onClick={onPickMetric} />
            <Bar dataKey="threshold_exceeded" fill="#ef4444" radius={[4, 4, 0, 0]} className="cursor-pointer" onClick={onPickMetric} />
          </BarChart>
        </ScrollingColumnChart>
      </CardWrapper>

      <CardWrapper
        title="3.11 Maintenance Backlog by Site"
        subtitle="Major & Critical maintenance tickets grouped by site"
        colSpan="col-span-12 md:col-span-6 lg:col-span-4"
        loading={l3_11}
        error={e3_11}
        isEmpty={pivot3_11.length === 0}
        onRetry={r3_11}
        actions={<SortToggle dir={sort3_11.dir} onChange={sort3_11.setDir} />}
      >
        <ScrollingColumnChart columns={pivot3_11.length}>
          <BarChart data={sort3_11.sorted} margin={{ bottom: 20, left: 0, right: 8 }}>
            <XAxis dataKey="site" stroke="rgba(255,255,255,0.4)" tick={{ fontSize: 9 }} interval={0} angle={-25} textAnchor="end" height={55} dy={5} />
            <YAxis stroke="rgba(255,255,255,0.4)" tick={{ fontSize: 10 }} width={38} />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="HARDWARE_FAULT" stackId="a" fill="#ef4444" className="cursor-pointer" onClick={onPickSite} />
            <Bar dataKey="DEVICE_REBOOT" stackId="a" fill="#f59e0b" className="cursor-pointer" onClick={onPickSite} />
            <Bar dataKey="DEVICE_HEALTH" stackId="a" fill="#c5a059" className="cursor-pointer" onClick={onPickSite} />
          </BarChart>
        </ScrollingColumnChart>
      </CardWrapper>

      <CardWrapper
        title="3.5 Hardware Faults by Component"
        subtitle="PSU, SFP, Fan, DRAM & ASIC hardware failures"
        colSpan="col-span-12 md:col-span-6 lg:col-span-4"
        loading={l3_5}
        error={e3_5}
        isEmpty={data3_5.length === 0}
        onRetry={r3_5}
        actions={<SortToggle dir={sort3_5.dir} onChange={sort3_5.setDir} />}
      >
        <ScrollingBarChart rows={data3_5.length}>
          <BarChart layout="vertical" data={sort3_5.sorted} margin={{ left: 0, top: 5, bottom: 5, right: 8 }}>
            <XAxis type="number" orientation="top" stroke="rgba(255,255,255,0.4)" tick={{ fontSize: 10 }} />
            <YAxis dataKey="component" type="category" interval={0} stroke="rgba(255,255,255,0.4)" tick={{ fontSize: 8 }} width={125} />
            <Tooltip content={<CustomTooltip />} />
            <Bar
              dataKey="faults"
              fill="#ef4444"
              radius={[0, 4, 4, 0]}
              className="cursor-pointer"
              onClick={(entry: any) => entry && toggleCrossFilter({ dim: 'reason', value: entry.component })}
            />
          </BarChart>
        </ScrollingBarChart>
      </CardWrapper>

      {/* Row 3 — 3.3 + 3.6 + 3.9 (4/4/4) */}
      <CardWrapper
        title="3.3 Metric Averages vs Threshold Limits"
        subtitle="Live radial gauges & peak capacity limits"
        colSpan="col-span-12 md:col-span-6 lg:col-span-4"
        loading={l3_3}
        error={e3_3}
        isEmpty={data3_3.length === 0}
        onRetry={r3_3}
      >
        <div className="grid grid-cols-2 auto-rows-min gap-3 h-64 overflow-y-auto pr-1">
          {data3_3.map((m, idx) => {
            const isOver = m.peakValue >= m.threshold;
            const pct = Math.min(100, (m.avgValue / (m.threshold * 1.2)) * 100);

            return (
              <button
                key={idx}
                type="button"
                onClick={() => toggleCrossFilter({ dim: 'metricName', value: m.metric })}
                className="bg-[#0E1017] border border-white/10 p-3 rounded-lg flex flex-col justify-between text-left transition-colors hover:border-[#c5a059]/50"
              >
                <div className="flex justify-between items-center text-[10px]">
                  <span className="text-[#e5e5e5] font-medium uppercase tracking-wider">{m.metric}</span>
                  <span
                    className={`px-1.5 py-0.5 rounded font-medium ${
                      isOver ? 'bg-red-500/10 text-red-400 border border-red-500/30' : 'bg-[#c5a059]/10 text-[#c5a059] border border-[#c5a059]/30'
                    }`}
                  >
                    Limit: {m.threshold}
                    {m.unit}
                  </span>
                </div>

                <div className="my-2">
                  <div className="text-xl font-light text-[#c5a059]">
                    {m.avgValue} <span className="text-xs text-white/40">{m.unit}</span>
                  </div>
                  <div className="text-[10px] text-white/40">Peak: {m.peakValue} {m.unit}</div>
                </div>

                <div className="w-full bg-[#1E222D] h-2 rounded-full overflow-hidden border border-white/10">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${pct}%`,
                      backgroundColor: isOver ? '#ef4444' : '#c5a059',
                    }}
                  />
                </div>
              </button>
            );
          })}
        </div>
      </CardWrapper>

      <CardWrapper
        title="3.6 Fault Rate Normalized by Device Type"
        subtitle="Average hardware faults per installed device count"
        colSpan="col-span-12 md:col-span-6 lg:col-span-4"
        loading={l3_6}
        error={e3_6}
        isEmpty={data3_6.length === 0}
        onRetry={r3_6}
        actions={<SortToggle dir={sort3_6.dir} onChange={sort3_6.setDir} />}
      >
        <ScrollingColumnChart columns={data3_6.length}>
          <ComposedChart data={sort3_6.sorted} margin={{ bottom: 20, left: 0, right: 0 }}>
            <XAxis dataKey="deviceType" stroke="rgba(255,255,255,0.4)" tick={{ fontSize: 9 }} interval={0} angle={-25} textAnchor="end" height={55} dy={5} />
            <YAxis yAxisId="left" stroke="rgba(255,255,255,0.4)" tick={{ fontSize: 10 }} width={34} />
            <YAxis yAxisId="right" orientation="right" stroke="#d4b574" tick={{ fontSize: 10 }} width={34} />
            <Tooltip content={<CustomTooltip />} />
            <Bar
              yAxisId="left"
              dataKey="totalFaults"
              fill="#c5a059"
              radius={[4, 4, 0, 0]}
              className="cursor-pointer"
              onClick={(entry: any) =>
                entry && setDeviceType(filterState.deviceType === entry.deviceType ? null : entry.deviceType)
              }
            />
            <Line yAxisId="right" type="monotone" dataKey="faultsPerDevice" stroke="#d4b574" strokeWidth={2} />
          </ComposedChart>
        </ScrollingColumnChart>
      </CardWrapper>

      <CardWrapper
        title="3.9 Thermal & Fan Outliers"
        subtitle="Peak reading by device type — temperature (°C, bottom axis) and fan speed (RPM, top axis)"
        colSpan="col-span-12 md:col-span-6 lg:col-span-4"
        loading={l3_9}
        error={e3_9}
        isEmpty={data3_9.length === 0}
        onRetry={r3_9}
      >
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <ScatterChart margin={{ top: 22, right: 8, bottom: 28, left: 0 }}>
              <XAxis
                xAxisId="temp"
                type="number"
                dataKey="peakValue"
                name="Peak Temp"
                unit="°C"
                domain={['dataMin - 2', 'dataMax + 2']}
                stroke="#ef4444"
                tick={{ fontSize: 9, fill: '#f87171' }}
                label={{ value: 'Peak Temp (°C)', position: 'bottom', offset: 10, fill: '#f87171', fontSize: 9, fontWeight: 500 }}
              />
              <XAxis
                xAxisId="fan"
                type="number"
                orientation="top"
                dataKey="peakValue"
                name="Peak Fan"
                unit=" RPM"
                domain={['dataMin - 200', 'dataMax + 200']}
                stroke="#60a5fa"
                tick={{ fontSize: 9, fill: '#60a5fa' }}
                label={{ value: 'Peak Fan (RPM)', position: 'top', offset: 8, fill: '#60a5fa', fontSize: 9, fontWeight: 500 }}
              />
              <YAxis
                yAxisId="type"
                type="category"
                dataKey="deviceType"
                name="Device Type"
                allowDuplicatedCategory={false}
                interval={0}
                width={78}
                stroke="rgba(255,255,255,0.4)"
                tick={{ fontSize: 8 }}
              />
              <Tooltip content={<CustomTooltip />} />
              <ReferenceLine xAxisId="temp" yAxisId="type" x={70} stroke="#ef4444" strokeDasharray="3 3" />
              <ReferenceLine xAxisId="fan" yAxisId="type" x={6500} stroke="#60a5fa" strokeDasharray="3 3" />
              <Scatter xAxisId="temp" yAxisId="type" name="Temperature" data={temp3_9} fill="#ef4444" />
              <Scatter xAxisId="fan" yAxisId="type" name="Fan Speed" data={fan3_9} fill="#60a5fa" />
            </ScatterChart>
          </ResponsiveContainer>
        </div>
      </CardWrapper>

      {/* Row 4 — the three tables (4/4/4); they scroll horizontally at this width. */}
      <CardWrapper
        title="3.1 Device Risk Score Matrix"
        subtitle="Weighted composite risk scoring formula: (HW * 10 + Reboot * 6 + HealthCrit * 4 + Degraded * 1.5 + Err/5k)"
        colSpan="col-span-12 md:col-span-6 lg:col-span-4"
        loading={l3_1}
        error={e3_1}
        isEmpty={data3_1.length === 0}
        onRetry={r3_1}
      >
        <DataTable data={data3_1} columns={cols3_1} exportFileName="device-risk-scores" />
      </CardWrapper>

      <CardWrapper
        title="3.7 Unexpected Reboot Ranking"
        subtitle="Crash-looping devices and kernel resets"
        colSpan="col-span-12 md:col-span-6 lg:col-span-4"
        loading={l3_7}
        error={e3_7}
        isEmpty={data3_7.length === 0}
        onRetry={r3_7}
      >
        <DataTable data={data3_7} columns={cols3_7} exportFileName="unexpected-reboots" />
      </CardWrapper>

      <CardWrapper
        title="3.10 Optics / SFP Degradation Watchlist"
        subtitle="Transceiver signal attenuation & laser faults"
        colSpan="col-span-12 md:col-span-6 lg:col-span-4"
        loading={l3_10}
        error={e3_10}
        isEmpty={data3_10.length === 0}
        onRetry={r3_10}
      >
        <DataTable data={data3_10} columns={cols3_10} exportFileName="sfp-degradation" />
      </CardWrapper>
    </div>
  );
};
