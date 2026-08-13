import React from 'react';
import { CardWrapper } from '../components/common/CardWrapper';
import { DataTable } from '../components/common/DataTable';
import { useCypher } from '../hooks/useCypher';
import { useFilter } from '../context/FilterContext';
import {
  SeverityTrendPoint,
  InterfaceFlapItem,
  RoutingAdjacencyItem,
  TopologyLinkItem,
  VpnTunnelFailureItem,
  ApDisconnectItem,
  AnomalyHotspotItem,
  NoisiestDeviceItem,
  SilentDeviceItem,
  FailedCommProtocolItem,
} from '../types';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';
import { CustomTooltip } from '../components/charts/CustomTooltip';
import { AnomalyHeatmap } from '../components/charts/AnomalyHeatmap';
import { ScrollingBarChart, SortToggle, useBarSort } from '../components/charts/ScrollingBarChart';
import { RoutingTopologyGraph } from '../components/topology/RoutingTopologyGraph';
import { ColumnDef } from '@tanstack/react-table';

const SEVERITY_COLORS = {
  INFO: '#c5a059',
  MINOR: '#d4b574',
  MAJOR: '#f59e0b',
  CRITICAL: '#ef4444',
};

const PROTOCOL_COLORS = ['#c5a059', '#d4b574', '#10b981', '#f59e0b', '#3b82f6', '#ef4444'];

// 1.5, 1.7 and 1.9 sit in different rows, so they only line up if pinned to one height.
const PANEL_HEIGHT = 'h-[377px]';
const PANEL_TABLE_HEIGHT = 'h-[200px]';

export const NetworkAnomaliesTab: React.FC = () => {
  const { queryParams, toggleCrossFilter } = useFilter();

  // 1.1 Volume by Severity
  const q1_1 = `
    MATCH (e:Event)
    WHERE e.event_type IN ['COMMUNICATION','INTERFACE_STATE_CHANGE','ROUTING_NEIGHBOR_CHANGE','AP_ASSOCIATION_CHANGE','VPN_TUNNEL']
      AND datetime(e.timestamp) >= datetime($from) AND datetime(e.timestamp) <= datetime($to)
    WITH toString(date(datetime(e.timestamp))) AS day, e.severity AS severity, count(*) AS events
    RETURN day, severity, events ORDER BY day
  `;
  const { data: raw1_1, loading: l1_1, error: e1_1, refetch: r1_1 } = useCypher<{ day: string; severity: string; events: number }>(q1_1, queryParams);

  // Pivot client side
  const pivot1_1 = React.useMemo(() => {
    if (!raw1_1 || raw1_1.length === 0) return [];

    // Check if raw1_1 is already pivoted
    const first = raw1_1[0] as any;
    if (first && (first.INFO !== undefined || first.CRITICAL !== undefined || first.MAJOR !== undefined || first.MINOR !== undefined)) {
      return raw1_1 as unknown as SeverityTrendPoint[];
    }

    const map = new Map<string, SeverityTrendPoint>();
    raw1_1.forEach((row: any) => {
      const dayStr = row.day || (row.timestamp ? String(row.timestamp).split('T')[0] : null);
      if (!dayStr) return;
      if (!map.has(dayStr)) {
        map.set(dayStr, { day: dayStr, INFO: 0, MINOR: 0, MAJOR: 0, CRITICAL: 0 });
      }
      const entry = map.get(dayStr)!;
      const sev = row.severity ? String(row.severity).toUpperCase() : null;
      if (sev && sev in entry) {
        (entry as any)[sev] = Number(row.events) || 0;
      }
    });
    return Array.from(map.values()).sort((a, b) => a.day.localeCompare(b.day));
  }, [raw1_1]);

  // 1.2 Interface Flap Leaderboard
  const q1_2 = `
    MATCH (d:Device)-[:SOURCE_OF]->(e:Event {event_type:'INTERFACE_STATE_CHANGE'})
    WHERE e.result IN ['down','flapping']
      AND datetime(e.timestamp) >= datetime($from) AND datetime(e.timestamp) <= datetime($to)
    RETURN d.name + ' :: ' + e.interface AS label, d.type AS deviceType, count(*) AS flaps
    ORDER BY flaps DESC
  `;
  const { data: data1_2, loading: l1_2, error: e1_2, refetch: r1_2 } = useCypher<InterfaceFlapItem>(q1_2, queryParams);
  const sort1_2 = useBarSort(data1_2, 'flaps');

  // 1.3 Routing Adjacency Failures
  const q1_3 = `
    MATCH (e:Event {event_type:'ROUTING_NEIGHBOR_CHANGE'})
    WHERE datetime(e.timestamp) >= datetime($from) AND datetime(e.timestamp) <= datetime($to)
    RETURN e.protocol AS protocol, e.reason AS eventName, count(*) AS occurrences
    ORDER BY occurrences DESC
  `;
  const { data: data1_3, loading: l1_3, error: e1_3, refetch: r1_3 } = useCypher<RoutingAdjacencyItem>(q1_3, queryParams);

  // Query returns one row per protocol/reason pair; the donut needs one slice per protocol.
  const donut1_3 = React.useMemo(() => {
    const totals = new Map<string, number>();
    data1_3.forEach((row) => {
      const key = row.protocol || 'UNKNOWN';
      totals.set(key, (totals.get(key) || 0) + row.occurrences);
    });
    return Array.from(totals, ([protocol, occurrences]) => ({ protocol, occurrences })).sort(
      (a, b) => b.occurrences - a.occurrences
    );
  }, [data1_3]);

  // 1.4 Topology Peer Failures
  const q1_4 = `
    MATCH (d:Device)-[:SOURCE_OF]->(e:Event {event_type:'ROUTING_NEIGHBOR_CHANGE'})-[:TARGETED]->(n:Device)
    WHERE e.result = 'down'
      AND datetime(e.timestamp) >= datetime($from) AND datetime(e.timestamp) <= datetime($to)
    RETURN d.name AS source, d.type AS sourceType,
           n.name AS target, n.type AS targetType,
           count(*) AS weight
    ORDER BY weight DESC LIMIT 120
  `;
  const { data: data1_4, loading: l1_4, error: e1_4, refetch: r1_4 } = useCypher<TopologyLinkItem>(q1_4, queryParams);

  // 1.5 VPN Tunnel Failures Table
  const q1_5 = `
    MATCH (g:Device)-[:SOURCE_OF]->(e:Event {event_type:'VPN_TUNNEL'})-[:TARGETED]->(p:Device)
    WHERE e.result IN ['down','failed']
      AND datetime(e.timestamp) >= datetime($from) AND datetime(e.timestamp) <= datetime($to)
    RETURN g.name AS gateway, p.name AS peer, e.reason AS failureMode,
           e.protocol AS protocol, count(*) AS failures
    ORDER BY failures DESC LIMIT 20
  `;
  const { data: data1_5, loading: l1_5, error: e1_5, refetch: r1_5 } = useCypher<VpnTunnelFailureItem>(q1_5, queryParams);

  const cols1_5: ColumnDef<VpnTunnelFailureItem>[] = [
    { accessorKey: 'gateway', header: 'Gateway' },
    { accessorKey: 'peer', header: 'Peer' },
    { accessorKey: 'failureMode', header: 'Failure Mode' },
    { accessorKey: 'protocol', header: 'Protocol' },
    { accessorKey: 'failures', header: 'Failures' },
  ];

  // 1.6 Wireless AP Disconnects
  const q1_6 = `
    MATCH (ap:Device)-[:SOURCE_OF]->(e:Event {event_type:'AP_ASSOCIATION_CHANGE'})-[:TARGETED]->(wlc:Device)
    WHERE e.result = 'down'
      AND datetime(e.timestamp) >= datetime($from) AND datetime(e.timestamp) <= datetime($to)
    RETURN wlc.name AS controller, e.reason AS cause, count(*) AS disconnects
    ORDER BY disconnects DESC
  `;
  const { data: data1_6, loading: l1_6, error: e1_6, refetch: r1_6 } = useCypher<ApDisconnectItem>(q1_6, queryParams);

  // Query returns one row per controller/cause pair; the axis needs one category per controller.
  const bars1_6 = React.useMemo(() => {
    const totals = new Map<string, number>();
    data1_6.forEach((row) => {
      const key = row.controller || 'UNKNOWN';
      totals.set(key, (totals.get(key) || 0) + row.disconnects);
    });
    return Array.from(totals, ([controller, disconnects]) => ({ controller, disconnects })).sort(
      (a, b) => b.disconnects - a.disconnects
    );
  }, [data1_6]);
  const sort1_6 = useBarSort(bars1_6, 'disconnects');

  // 1.7 Anomaly Hotspot Heatmap
  const q1_7 = `
    MATCH (e:Event)
    WHERE e.severity IN ['MAJOR','CRITICAL']
      AND datetime(e.timestamp) >= datetime($from) AND datetime(e.timestamp) <= datetime($to)
    OPTIONAL MATCH (d:Device)-[:SOURCE_OF]->(e)
    RETURN e.site AS site, e.zone AS zone, d.name AS device, e.event_type AS eventType, count(*) AS intensity
    ORDER BY intensity DESC
  `;
  const { data: data1_7, loading: l1_7, error: e1_7, refetch: r1_7 } = useCypher<AnomalyHotspotItem>(q1_7, queryParams);

  // 1.8 Noisiest Devices
  const q1_8 = `
    MATCH (d:Device)-[:SOURCE_OF]->(e:Event)
    WHERE datetime(e.timestamp) >= datetime($from) AND datetime(e.timestamp) <= datetime($to)
    RETURN d.name AS device, d.type AS deviceType, count(e) AS events
    ORDER BY events DESC
  `;
  const { data: data1_8, loading: l1_8, error: e1_8, refetch: r1_8 } = useCypher<NoisiestDeviceItem>(q1_8, queryParams);
  const sort1_8 = useBarSort(data1_8, 'events');

  // 1.9 Silent Devices
  const q1_9 = `
    MATCH (d:Device)
    OPTIONAL MATCH (d)-[:SOURCE_OF]->(e:Event)
    WITH d, max(datetime(e.timestamp)) AS lastSeen, count(e) AS totalEvents
    WHERE lastSeen IS NULL
       OR duration.inDays(lastSeen, datetime($dataAnchor)).days >= 14
    RETURN d.name AS device, d.type AS deviceType, totalEvents,
           coalesce(toString(lastSeen), 'NEVER') AS lastSeen
    ORDER BY totalEvents ASC LIMIT 25
  `;
  const { data: data1_9, loading: l1_9, error: e1_9, refetch: r1_9 } = useCypher<SilentDeviceItem>(q1_9, queryParams);

  const cols1_9: ColumnDef<SilentDeviceItem>[] = [
    { accessorKey: 'device', header: 'Silent Device' },
    { accessorKey: 'deviceType', header: 'Type' },
    { accessorKey: 'totalEvents', header: 'Total Events' },
    { accessorKey: 'lastSeen', header: 'Last Telemetry' },
  ];

  // 1.10 Failed Communications Protocol
  const q1_10 = `
    MATCH (e:Event {event_type:'COMMUNICATION', result:'failed'})
    WHERE datetime(e.timestamp) >= datetime($from) AND datetime(e.timestamp) <= datetime($to)
    RETURN e.protocol AS protocol, count(*) AS failures ORDER BY failures DESC
  `;
  const { data: data1_10, loading: l1_10, error: e1_10, refetch: r1_10 } = useCypher<FailedCommProtocolItem>(q1_10, queryParams);

  return (
    <div className="grid grid-cols-12 gap-4 p-4 font-sans">
      {/* 1.1 Network Event Volume by Severity (Stacked Area Chart, 8 cols) */}
      <CardWrapper
        title="1.1 Network Event Volume by Severity"
        subtitle="Telemetry event distribution over time"
        colSpan="col-span-12 lg:col-span-8"
        loading={l1_1}
        error={e1_1}
        isEmpty={pivot1_1.length === 0}
        onRetry={r1_1}
      >
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={pivot1_1}>
              <defs>
                <linearGradient id="gradInfo" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={SEVERITY_COLORS.INFO} stopOpacity={0.5} />
                  <stop offset="95%" stopColor={SEVERITY_COLORS.INFO} stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gradCrit" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={SEVERITY_COLORS.CRITICAL} stopOpacity={0.7} />
                  <stop offset="95%" stopColor={SEVERITY_COLORS.CRITICAL} stopOpacity={0.1} />
                </linearGradient>
              </defs>
              <XAxis dataKey="day" stroke="rgba(255,255,255,0.4)" tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.4)' }} />
              <YAxis stroke="rgba(255,255,255,0.4)" tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.4)' }} />
              <Tooltip content={<CustomTooltip />} />
              <Legend
                wrapperStyle={{ fontSize: 11, color: '#e5e5e5', cursor: 'pointer' }}
                onClick={(entry: any) => toggleCrossFilter({ dim: 'severity', value: String(entry.dataKey) })}
              />
              <Area type="monotone" dataKey="INFO" stackId="1" stroke={SEVERITY_COLORS.INFO} fill="url(#gradInfo)" />
              <Area type="monotone" dataKey="MINOR" stackId="1" stroke={SEVERITY_COLORS.MINOR} fill={SEVERITY_COLORS.MINOR} />
              <Area type="monotone" dataKey="MAJOR" stackId="1" stroke={SEVERITY_COLORS.MAJOR} fill={SEVERITY_COLORS.MAJOR} />
              <Area type="monotone" dataKey="CRITICAL" stackId="1" stroke={SEVERITY_COLORS.CRITICAL} fill="url(#gradCrit)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardWrapper>

      {/* 1.10 Failed Communications by Protocol (Donut Chart, 4 cols) */}
      <CardWrapper
        title="1.10 Failed Communications by Protocol"
        subtitle="Failed socket attempts grouped by protocol"
        colSpan="col-span-12 lg:col-span-4"
        loading={l1_10}
        error={e1_10}
        isEmpty={data1_10.length === 0}
        onRetry={r1_10}
      >
        <div className="h-64 w-full px-6">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data1_10}
                dataKey="failures"
                nameKey="protocol"
                cx="50%"
                cy="45%"
                innerRadius="52%"
                outerRadius="80%"
                paddingAngle={4}
                className="cursor-pointer"
                onClick={(entry: any) => toggleCrossFilter({ dim: 'protocol', value: entry.protocol })}
              >
                {data1_10.map((_, idx) => (
                  <Cell key={`cell-${idx}`} fill={PROTOCOL_COLORS[idx % PROTOCOL_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ fontSize: 10, color: '#e5e5e5' }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </CardWrapper>

      {/* 1.3 Routing Adjacency Failures (Donut Chart, 4 cols) */}
      <CardWrapper
        title="1.3 Routing Adjacency Failures"
        subtitle="Neighbor state changes grouped by protocol"
        colSpan="col-span-12 md:col-span-6 lg:col-span-4"
        loading={l1_3}
        error={e1_3}
        isEmpty={donut1_3.length === 0}
        onRetry={r1_3}
      >
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={donut1_3}
                dataKey="occurrences"
                nameKey="protocol"
                cx="50%"
                cy="45%"
                innerRadius="52%"
                outerRadius="80%"
                paddingAngle={4}
                className="cursor-pointer"
                onClick={(entry: any) => toggleCrossFilter({ dim: 'protocol', value: entry.protocol })}
              >
                {donut1_3.map((_, idx) => (
                  <Cell key={`adj-${idx}`} fill={PROTOCOL_COLORS[idx % PROTOCOL_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ fontSize: 10, color: '#e5e5e5' }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </CardWrapper>

      {/* 1.8 Top Telemetry Producers (Horizontal Bar Chart, 4 cols) */}
      <CardWrapper
        title="1.8 Top Telemetry Producers"
        subtitle="Devices generating the most events across all event types"
        colSpan="col-span-12 md:col-span-6 lg:col-span-4"
        loading={l1_8}
        error={e1_8}
        isEmpty={data1_8.length === 0}
        onRetry={r1_8}
        actions={<SortToggle dir={sort1_8.dir} onChange={sort1_8.setDir} />}
      >
        <ScrollingBarChart rows={data1_8.length}>
          <BarChart data={sort1_8.sorted} layout="vertical" margin={{ top: 5, bottom: 5, left: 0, right: 8 }}>
            <XAxis type="number" orientation="top" stroke="rgba(255,255,255,0.4)" tick={{ fontSize: 10 }} />
            <YAxis
              type="category"
              dataKey="device"
              stroke="rgba(255,255,255,0.4)"
              tick={{ fontSize: 9 }}
              width={82}
              interval={0}
            />
            <Tooltip content={<CustomTooltip />} />
            <Bar
              dataKey="events"
              fill="#c5a059"
              radius={[0, 4, 4, 0]}
              onClick={(entry: any) => entry && toggleCrossFilter({ dim: 'device', value: entry.device })}
              className="cursor-pointer"
            />
          </BarChart>
        </ScrollingBarChart>
      </CardWrapper>

      {/* 1.2 Interface Flap Leaderboard (Horizontal Bar Chart, 4 cols) */}
      <CardWrapper
        title="1.2 Interface Flap Leaderboard"
        subtitle="Top interface status down/flapping events"
        colSpan="col-span-12 md:col-span-6 lg:col-span-4"
        loading={l1_2}
        error={e1_2}
        isEmpty={data1_2.length === 0}
        onRetry={r1_2}
        actions={<SortToggle dir={sort1_2.dir} onChange={sort1_2.setDir} />}
      >
        <ScrollingBarChart rows={data1_2.length}>
          <BarChart layout="vertical" data={sort1_2.sorted} margin={{ left: 0, top: 5, bottom: 5, right: 8 }}>
            <XAxis type="number" orientation="top" stroke="rgba(255,255,255,0.4)" tick={{ fontSize: 10 }} />
            <YAxis dataKey="label" type="category" stroke="rgba(255,255,255,0.4)" tick={{ fontSize: 9 }} width={110} interval={0} />
            <Tooltip content={<CustomTooltip />} />
            <Bar
              dataKey="flaps"
              fill="#c5a059"
              radius={[0, 4, 4, 0]}
              className="cursor-pointer"
              onClick={(entry: any) =>
                entry && toggleCrossFilter({ dim: 'device', value: String(entry.label).split(' :: ')[0] })
              }
            />
          </BarChart>
        </ScrollingBarChart>
      </CardWrapper>

      {/* 1.7 + 1.6 share a row split 6:4, which the 12-column parent cannot express. */}
      <div className="col-span-12 grid grid-cols-1 lg:grid-cols-10 gap-4">
        {/* 1.7 Anomaly Hotspot (Site x Zone Heatmap Matrix, 6/10) */}
        <CardWrapper
          title="1.7 Anomaly Hotspot — Site x Zone Heatmap"
          subtitle="Critical/Major anomaly density by site and zone"
          colSpan="lg:col-span-6"
          className={PANEL_HEIGHT}
          loading={l1_7}
          error={e1_7}
          isEmpty={data1_7.length === 0}
          onRetry={r1_7}
        >
          <AnomalyHeatmap data={data1_7} />
        </CardWrapper>

        {/* 1.6 Wireless AP Disconnects (Horizontal Bar Chart, 4/10) */}
        <CardWrapper
          title="1.6 Wireless AP Disconnects by Controller"
          subtitle="Access point dissociation triggers"
          colSpan="lg:col-span-4"
          loading={l1_6}
          error={e1_6}
          isEmpty={bars1_6.length === 0}
          onRetry={r1_6}
          actions={<SortToggle dir={sort1_6.dir} onChange={sort1_6.setDir} />}
        >
          <ScrollingBarChart rows={bars1_6.length}>
            <BarChart data={sort1_6.sorted} layout="vertical" margin={{ top: 5, bottom: 5, left: 0, right: 8 }}>
              <XAxis type="number" orientation="top" stroke="rgba(255,255,255,0.4)" tick={{ fontSize: 10 }} />
              <YAxis
                type="category"
                dataKey="controller"
                stroke="rgba(255,255,255,0.4)"
                tick={{ fontSize: 9 }}
                width={88}
                interval={0}
              />
              <Tooltip content={<CustomTooltip />} />
              <Bar
                dataKey="disconnects"
                fill="#d4b574"
                radius={[0, 4, 4, 0]}
                className="cursor-pointer"
                onClick={(entry: any) => entry && toggleCrossFilter({ dim: 'device', value: entry.controller })}
              />
            </BarChart>
          </ScrollingBarChart>
        </CardWrapper>
      </div>

      {/* 1.5 Site-to-Site VPN Tunnel Failures (Data Table, 6 cols) */}
      <CardWrapper
        title="1.5 Site-to-Site VPN Tunnel Failures"
        subtitle="IPsec & IKE tunnel outages"
        colSpan="col-span-12 lg:col-span-6"
        className={PANEL_HEIGHT}
        loading={l1_5}
        error={e1_5}
        isEmpty={data1_5.length === 0}
        onRetry={r1_5}
      >
        <DataTable data={data1_5} columns={cols1_5} exportFileName="vpn-failures" bodyHeightClass={PANEL_TABLE_HEIGHT} />
      </CardWrapper>

      {/* 1.9 Silent Devices (Data Table, 6 cols) */}
      <CardWrapper
        title="1.9 Silent Devices (No Telemetry)"
        subtitle="Devices missing logs for >= 14 days"
        colSpan="col-span-12 lg:col-span-6"
        className={PANEL_HEIGHT}
        loading={l1_9}
        error={e1_9}
        isEmpty={data1_9.length === 0}
        onRetry={r1_9}
      >
        <DataTable data={data1_9} columns={cols1_9} exportFileName="silent-devices" bodyHeightClass={PANEL_TABLE_HEIGHT} />
      </CardWrapper>
    </div>
  );
};
