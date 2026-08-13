import React from 'react';
import { CardWrapper } from '../components/common/CardWrapper';
import { DataTable } from '../components/common/DataTable';
import { useCypher } from '../hooks/useCypher';
import { useFilter } from '../context/FilterContext';
import {
  AuthOutcomePoint,
  RiskyUserItem,
  DenialReasonItem,
  AttackerIpItem,
  BlockedPortItem,
  CountryAttackItem,
  PolicyDenialItem,
  PrivEscItem,
  AnomalySignatureItem,
  PortViolationItem,
  DnsSinkholeItem,
  ConfigAuditItem,
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
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Legend,
} from 'recharts';
import { CustomTooltip } from '../components/charts/CustomTooltip';
import {
  ScrollingBarChart,
  ScrollingColumnChart,
  SortToggle,
  useBarSort,
} from '../components/charts/ScrollingBarChart';
import { ColumnDef } from '@tanstack/react-table';

const WELL_KNOWN_PORTS: Record<string, string> = {
  '22': 'SSH',
  '3389': 'RDP',
  '445': 'SMB',
  '80': 'HTTP',
  '443': 'HTTPS',
  '1433': 'MSSQL',
  '23': 'TELNET',
  '53': 'DNS',
};

export const SecurityEventsTab: React.FC = () => {
  const { queryParams, toggleCrossFilter } = useFilter();

  // 2.1 Auth Outcome Trend
  const q2_1 = `
    MATCH (e:Event {event_type:'AUTH_ATTEMPT'})
    WHERE datetime(e.timestamp) >= datetime($from) AND datetime(e.timestamp) <= datetime($to)
    WITH toString(date(datetime(e.timestamp))) AS day, e.result AS result, count(*) AS attempts
    RETURN day, result, attempts ORDER BY day
  `;
  const { data: raw2_1, loading: l2_1, error: e2_1, refetch: r2_1 } = useCypher<{ day: string; result: string; attempts: number }>(q2_1, queryParams);

  const pivot2_1 = React.useMemo(() => {
    const map = new Map<string, any>();
    raw2_1.forEach((row) => {
      if (!map.has(row.day)) {
        map.set(row.day, { day: row.day, success: 0, failed: 0, denied: 0 });
      }
      const entry = map.get(row.day)!;
      if (row.result in entry) {
        entry[row.result] = row.attempts;
      }
    });
    return Array.from(map.values()).sort((a, b) => a.day.localeCompare(b.day));
  }, [raw2_1]);

  // 2.2 Top Risky Users
  const q2_2 = `
    MATCH (u:User)-[:PERFORMED]->(e:Event)<-[:SOURCE_OF]-(d:Device)
    WHERE e.result IN ['denied','failed']
      AND e.event_type IN ['AUTH_ATTEMPT','RESOURCE_ACCESS_ATTEMPT','POLICY_DENIAL','PRIVILEGE_ESCALATION','VPN_SESSION']
      AND datetime(e.timestamp) >= datetime($from) AND datetime(e.timestamp) <= datetime($to)
    RETURN u.name AS user,
           count(*) AS totalFailures,
           count(CASE WHEN e.event_type = 'PRIVILEGE_ESCALATION' THEN 1 END) AS privEscAttempts,
           count(DISTINCT d.ip) AS distinctSourceIps,
           count(DISTINCT e.country) AS distinctCountries
    ORDER BY totalFailures DESC LIMIT 15
  `;
  const { data: data2_2, loading: l2_2, error: e2_2, refetch: r2_2 } = useCypher<RiskyUserItem>(q2_2, queryParams);

  const cols2_2: ColumnDef<RiskyUserItem>[] = [
    {
      accessorKey: 'user',
      header: 'User',
      cell: (info) => (
        <span className="font-mono text-[#c5a059] font-medium">{String(info.getValue() || '')}</span>
      ),
    },
    {
      accessorKey: 'totalFailures',
      header: 'Failures',
      cell: (info) => {
        const val = Number(info.getValue() || 0);
        return <span className="font-semibold text-red-400">{val.toLocaleString()}</span>;
      },
    },
    {
      accessorKey: 'privEscAttempts',
      header: 'Priv Esc',
      cell: (info) => {
        const count = Number(info.getValue() || 0);
        return count > 0 ? (
          <span className="px-1.5 py-0.5 rounded bg-red-500/15 text-red-400 border border-red-500/30 font-semibold">
            {count}
          </span>
        ) : (
          <span className="text-white/30">0</span>
        );
      },
    },
    {
      accessorKey: 'distinctSourceIps',
      header: 'Source IPs',
      cell: (info) => <span className="text-white/80">{String(info.getValue() || 0)}</span>,
    },
    {
      accessorKey: 'distinctCountries',
      header: 'Countries',
      cell: (info) => {
        const count = Number(info.getValue() || 0);
        return count > 3 ? (
          <span className="px-1.5 py-0.5 rounded bg-[#f59e0b]/10 text-[#f59e0b] border border-[#f59e0b]/30 font-medium whitespace-nowrap">
            {count} ✈ Impossible Travel
          </span>
        ) : (
          <span className="text-white/80">{count}</span>
        );
      },
    },
  ];

  // 2.3 Denial Reason Breakdown
  const q2_3 = `
    MATCH (e:Event)
    WHERE e.result IN ['denied','failed','blocked'] AND e.reason <> ''
      AND datetime(e.timestamp) >= datetime($from) AND datetime(e.timestamp) <= datetime($to)
    RETURN e.reason AS reason, count(*) AS occurrences ORDER BY occurrences DESC
  `;
  const { data: data2_3, loading: l2_3, error: e2_3, refetch: r2_3 } = useCypher<DenialReasonItem>(q2_3, queryParams);

  // 2.4 Top External Attacker IPs
  // The IP lives on the originating Device, not on the Event.
  const q2_4 = `
    MATCH (d:Device)-[:SOURCE_OF]->(e:Event {event_type:'FIREWALL_BLOCK'})
    WHERE datetime(e.timestamp) >= datetime($from) AND datetime(e.timestamp) <= datetime($to)
    RETURN d.ip AS sourceIp, head(collect(DISTINCT e.country)) AS country,
           count(*) AS blocks,
           count(DISTINCT e.port) AS portsProbed,
           collect(DISTINCT e.reason)[0..2] AS topReasons
    ORDER BY blocks DESC LIMIT 20
  `;
  const { data: data2_4, loading: l2_4, error: e2_4, refetch: r2_4 } = useCypher<AttackerIpItem>(q2_4, queryParams);

  const cols2_4: ColumnDef<AttackerIpItem>[] = [
    { accessorKey: 'sourceIp', header: 'Attacker IP' },
    { accessorKey: 'country', header: 'Country' },
    { accessorKey: 'blocks', header: 'Blocks' },
    {
      accessorKey: 'portsProbed',
      header: 'Probed Ports',
      cell: (info) => {
        const probed = Number(info.getValue() || 0);
        return probed >= 5 ? (
          <span className="px-1.5 py-0.5 bg-red-500/10 border border-red-500/30 text-red-400 font-medium rounded">
            {probed} (SCAN)
          </span>
        ) : (
          probed
        );
      },
    },
  ];

  // 2.5 Blocked Traffic by Target Port
  const q2_5 = `
    MATCH (e:Event {event_type:'FIREWALL_BLOCK'})
    WHERE datetime(e.timestamp) >= datetime($from) AND datetime(e.timestamp) <= datetime($to)
    RETURN toString(e.port) AS port, e.protocol AS protocol, count(*) AS blocks
    ORDER BY blocks DESC
  `;
  const { data: data2_5, loading: l2_5, error: e2_5, refetch: r2_5 } = useCypher<BlockedPortItem>(q2_5, queryParams);

  const formatted2_5 = React.useMemo(() => {
    return data2_5.map((item) => ({
      ...item,
      label: `${item.port} (${WELL_KNOWN_PORTS[item.port] || item.protocol})`,
    }));
  }, [data2_5]);

  // 2.6 Attack Origin by Country
  const q2_6 = `
    MATCH (e:Event)
    WHERE e.event_type IN ['FIREWALL_BLOCK','VPN_SESSION'] AND e.result IN ['blocked','denied','failed']
      AND datetime(e.timestamp) >= datetime($from) AND datetime(e.timestamp) <= datetime($to)
    RETURN e.country AS country, count(*) AS events ORDER BY events DESC
  `;
  const { data: data2_6, loading: l2_6, error: e2_6, refetch: r2_6 } = useCypher<CountryAttackItem>(q2_6, queryParams);

  // 2.7 Most-Triggered Policies
  const q2_7 = `
    MATCH (e:Event)-[:GOVERNED_BY]->(p:Policy)
    WHERE e.result = 'denied'
      AND datetime(e.timestamp) >= datetime($from) AND datetime(e.timestamp) <= datetime($to)
    RETURN p.name AS policy, count(*) AS denials ORDER BY denials DESC
  `;
  const { data: data2_7, loading: l2_7, error: e2_7, refetch: r2_7 } = useCypher<PolicyDenialItem>(q2_7, queryParams);

  // 2.8 Privilege Escalation Attempts
  const q2_8 = `
    MATCH (e:Event {event_type:'PRIVILEGE_ESCALATION'})
    WHERE datetime(e.timestamp) >= datetime($from) AND datetime(e.timestamp) <= datetime($to)
    OPTIONAL MATCH (u:User)-[:PERFORMED]->(e)
    OPTIONAL MATCH (src:Device)-[:SOURCE_OF]->(e)
    OPTIONAL MATCH (e)-[:TARGETED]->(t:Device)
    RETURN toString(datetime(e.timestamp)) AS ts, u.name AS user, src.ip AS sourceIp,
           t.name AS target, e.result AS result, e.reason AS reason, e.severity AS severity
    ORDER BY CASE e.result WHEN 'succeeded' THEN 0 ELSE 1 END, ts DESC LIMIT 50
  `;
  const { data: data2_8, loading: l2_8, error: e2_8, refetch: r2_8 } = useCypher<PrivEscItem>(q2_8, queryParams);

  const cols2_8: ColumnDef<PrivEscItem>[] = [
    { accessorKey: 'ts', header: 'Timestamp' },
    { accessorKey: 'user', header: 'Actor' },
    { accessorKey: 'sourceIp', header: 'Source IP' },
    { accessorKey: 'target', header: 'Target' },
    {
      accessorKey: 'result',
      header: 'Result',
      cell: (info) => {
        const val = String(info.getValue() || '');
        if (val === 'succeeded') {
          return (
            <span className="px-2 py-0.5 bg-emerald-500/10 border border-emerald-500/40 text-emerald-400 font-medium rounded shadow-[0_0_10px_rgba(16,185,129,0.2)]">
              SUCCEEDED
            </span>
          );
        }
        if (val === 'failed' || val === 'denied' || val === 'blocked') {
          return (
            <span className="px-2 py-0.5 bg-red-500/10 border border-red-500/40 text-red-400 font-medium rounded shadow-[0_0_10px_rgba(239,68,68,0.2)]">
              {val.toUpperCase()}
            </span>
          );
        }
        return <span className="text-[#c5a059]">{val}</span>;
      },
    },
    { accessorKey: 'reason', header: 'Reason / Evidence' },
  ];

  // 2.9 SIEM Anomaly Signatures
  const q2_9 = `
    MATCH (e:Event {event_type:'ANOMALY_DETECTED'})
    WHERE datetime(e.timestamp) >= datetime($from) AND datetime(e.timestamp) <= datetime($to)
    RETURN e.reason AS signature, count(*) AS detections,
           round(avg(e.confidence), 2) AS avgConfidence
    ORDER BY detections DESC
  `;
  const { data: data2_9, loading: l2_9, error: e2_9, refetch: r2_9 } = useCypher<AnomalySignatureItem>(q2_9, queryParams);

  // 2.10 Port Security Violations
  const q2_10 = `
    MATCH (sw:Device)-[:SOURCE_OF]->(e:Event {event_type:'SECURITY_VIOLATION'})
    WHERE datetime(e.timestamp) >= datetime($from) AND datetime(e.timestamp) <= datetime($to)
    RETURN sw.name AS switchName, e.interface AS port, e.reason AS violation,
           e.mac_address AS offendingMac, e.result AS state, count(*) AS occurrences
    ORDER BY occurrences DESC LIMIT 25
  `;
  const { data: data2_10, loading: l2_10, error: e2_10, refetch: r2_10 } = useCypher<PortViolationItem>(q2_10, queryParams);

  const cols2_10: ColumnDef<PortViolationItem>[] = [
    { accessorKey: 'switchName', header: 'Switch' },
    { accessorKey: 'port', header: 'Port' },
    { accessorKey: 'violation', header: 'Violation' },
    { accessorKey: 'offendingMac', header: 'MAC Address' },
    {
      accessorKey: 'state',
      header: 'State',
      cell: (info) => {
        const st = String(info.getValue() || '');
        // Port-security action severity: shutdown/err-disable > restrict > protect
        const tone =
          st === 'err-disabled' || st === 'shutdown'
            ? 'bg-red-500/10 border-red-500/40 text-red-400 shadow-[0_0_10px_rgba(239,68,68,0.2)]'
            : st === 'restrict'
            ? 'bg-[#f59e0b]/10 border-[#f59e0b]/40 text-[#f59e0b]'
            : st === 'protect'
            ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-400'
            : 'bg-white/5 border-white/15 text-white/50';
        return (
          <span className={`px-1.5 py-0.5 border font-medium rounded uppercase tracking-wider ${tone}`}>
            {st || 'unknown'}
          </span>
        );
      },
    },
    { accessorKey: 'occurrences', header: 'Occurrences' },
  ];

  // 2.11 DNS Sinkhole Hits
  const q2_11 = `
    MATCH (d:Device)-[:SOURCE_OF]->(e:Event {event_type:'DNS_QUERY', result:'blocked'})-[:ACCESSED]->(r:Resource)
    WHERE datetime(e.timestamp) >= datetime($from) AND datetime(e.timestamp) <= datetime($to)
    RETURN r.name AS domain, count(*) AS hits,
           count(DISTINCT d.ip) AS distinctClients
    ORDER BY hits DESC LIMIT 15
  `;
  const { data: data2_11, loading: l2_11, error: e2_11, refetch: r2_11 } = useCypher<DnsSinkholeItem>(q2_11, queryParams);

  const cols2_11: ColumnDef<DnsSinkholeItem>[] = [
    { accessorKey: 'domain', header: 'Blocked Domain' },
    { accessorKey: 'hits', header: 'Hits' },
    { accessorKey: 'distinctClients', header: 'Clients' },
  ];

  // 2.12 Configuration Audit
  const q2_12 = `
    MATCH (e:Event {event_type:'CONFIG_CHANGE'})
    WHERE datetime(e.timestamp) >= datetime($from) AND datetime(e.timestamp) <= datetime($to)
    OPTIONAL MATCH (u:User)-[:PERFORMED]->(e)
    OPTIONAL MATCH (e)-[:TARGETED]->(d:Device)
    RETURN toString(datetime(e.timestamp)) AS ts, u.name AS admin, d.name AS targetDevice,
           d.type AS deviceType, e.result AS result
    ORDER BY ts DESC LIMIT 50
  `;
  const { data: data2_12, loading: l2_12, error: e2_12, refetch: r2_12 } = useCypher<ConfigAuditItem>(q2_12, queryParams);

  const cols2_12: ColumnDef<ConfigAuditItem>[] = [
    { accessorKey: 'ts', header: 'Timestamp' },
    { accessorKey: 'admin', header: 'Admin' },
    { accessorKey: 'targetDevice', header: 'Target' },
    { accessorKey: 'deviceType', header: 'Type' },
    {
      accessorKey: 'result',
      header: 'Result',
      cell: (info) => {
        const val = String(info.getValue() || '');
        const tone =
          ['applied', 'succeeded', 'success', 'committed'].includes(val)
            ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-400'
            : ['failed_rollback', 'failed', 'rolled_back', 'denied', 'error'].includes(val)
            ? 'bg-red-500/10 border-red-500/40 text-red-400 shadow-[0_0_10px_rgba(239,68,68,0.2)]'
            : ['pending', 'partial', 'queued'].includes(val)
            ? 'bg-[#f59e0b]/10 border-[#f59e0b]/40 text-[#f59e0b]'
            : 'bg-white/5 border-white/15 text-white/50';
        return (
          <span className={`px-1.5 py-0.5 border font-medium rounded uppercase tracking-wider ${tone}`}>
            {val.replace(/_/g, ' ') || 'unknown'}
          </span>
        );
      },
    },
  ];

  const sort2_3 = useBarSort(data2_3, 'occurrences');
  const sort2_5 = useBarSort(formatted2_5, 'blocks');
  const sort2_6 = useBarSort(data2_6, 'events');
  const sort2_7 = useBarSort(data2_7, 'denials');

  return (
    <div className="grid grid-cols-12 gap-4 p-4 font-sans">
      {/* Row 1 — 2.1 (8) + 2.9 (4) */}
      <CardWrapper
        title="2.1 Authentication Outcome Trend"
        subtitle="Auth logins, failures, and policy denials"
        colSpan="col-span-12 lg:col-span-8"
        loading={l2_1}
        error={e2_1}
        isEmpty={pivot2_1.length === 0}
        onRetry={r2_1}
      >
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={pivot2_1}>
              <XAxis dataKey="day" stroke="rgba(255,255,255,0.4)" tick={{ fontSize: 10 }} />
              <YAxis stroke="rgba(255,255,255,0.4)" tick={{ fontSize: 10 }} />
              <Tooltip content={<CustomTooltip />} />
              <Legend
                wrapperStyle={{ fontSize: 11, color: '#e5e5e5', cursor: 'pointer' }}
                onClick={(entry: any) => toggleCrossFilter({ dim: 'result', value: String(entry.dataKey) })}
              />
              <Area type="monotone" dataKey="success" stroke="#10b981" fill="#10b981" fillOpacity={0.25} />
              <Area type="monotone" dataKey="failed" stroke="#f59e0b" fill="#f59e0b" fillOpacity={0.25} />
              <Area type="monotone" dataKey="denied" stroke="#ef4444" fill="#ef4444" fillOpacity={0.25} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardWrapper>

      <CardWrapper
        title="2.9 SIEM Anomaly Signatures"
        subtitle="Behavioral detection signatures"
        colSpan="col-span-12 lg:col-span-4"
        loading={l2_9}
        error={e2_9}
        isEmpty={data2_9.length === 0}
        onRetry={r2_9}
      >
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart data={data2_9}>
              <PolarGrid stroke="rgba(255,255,255,0.1)" />
              <PolarAngleAxis dataKey="signature" stroke="rgba(255,255,255,0.4)" tick={{ fontSize: 8 }} />
              <PolarRadiusAxis stroke="rgba(255,255,255,0.1)" />
              <Radar
                name="Detections"
                dataKey="detections"
                stroke="#c5a059"
                fill="#c5a059"
                fillOpacity={0.4}
                className="cursor-pointer"
                onClick={(entry: any) => entry?.signature && toggleCrossFilter({ dim: 'reason', value: entry.signature })}
              />
              <Tooltip content={<CustomTooltip />} />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      </CardWrapper>

      {/* Row 2 — 2.3 + 2.5 + 2.6 (4/4/4) */}
      <CardWrapper
        title="2.3 Denial Reason Breakdown"
        subtitle="Primary security rejection triggers"
        colSpan="col-span-12 md:col-span-6 lg:col-span-4"
        loading={l2_3}
        error={e2_3}
        isEmpty={data2_3.length === 0}
        onRetry={r2_3}
        actions={<SortToggle dir={sort2_3.dir} onChange={sort2_3.setDir} />}
      >
        <ScrollingBarChart rows={data2_3.length}>
          <BarChart layout="vertical" data={sort2_3.sorted} margin={{ left: 0, top: 5, bottom: 5, right: 8 }}>
            <XAxis type="number" orientation="top" stroke="rgba(255,255,255,0.4)" tick={{ fontSize: 10 }} />
            <YAxis dataKey="reason" type="category" stroke="rgba(255,255,255,0.4)" tick={{ fontSize: 9 }} width={130} interval={0} />
            <Tooltip content={<CustomTooltip />} />
            <Bar
              dataKey="occurrences"
              fill="#f59e0b"
              radius={[0, 4, 4, 0]}
              className="cursor-pointer"
              onClick={(entry: any) => entry && toggleCrossFilter({ dim: 'reason', value: entry.reason })}
            />
          </BarChart>
        </ScrollingBarChart>
      </CardWrapper>

      <CardWrapper
        title="2.5 Blocked Traffic by Target Port"
        subtitle="Most probed service ports"
        colSpan="col-span-12 md:col-span-6 lg:col-span-4"
        loading={l2_5}
        error={e2_5}
        isEmpty={formatted2_5.length === 0}
        onRetry={r2_5}
        actions={<SortToggle dir={sort2_5.dir} onChange={sort2_5.setDir} />}
      >
        <ScrollingColumnChart columns={formatted2_5.length}>
          <BarChart data={sort2_5.sorted} margin={{ bottom: 25, left: 10, right: 10 }}>
            <XAxis dataKey="label" stroke="rgba(255,255,255,0.4)" tick={{ fontSize: 9 }} interval={0} angle={-20} textAnchor="end" height={45} dy={5} />
            <YAxis stroke="rgba(255,255,255,0.4)" tick={{ fontSize: 10 }} width={38} />
            <Tooltip content={<CustomTooltip />} />
            <Bar
              dataKey="blocks"
              fill="#ef4444"
              radius={[4, 4, 0, 0]}
              className="cursor-pointer"
              onClick={(entry: any) => entry && toggleCrossFilter({ dim: 'port', value: String(entry.port) })}
            />
          </BarChart>
        </ScrollingColumnChart>
      </CardWrapper>

      <CardWrapper
        title="2.6 Attack Origin by Country"
        subtitle="Geo-IP security blocks"
        colSpan="col-span-12 md:col-span-6 lg:col-span-4"
        loading={l2_6}
        error={e2_6}
        isEmpty={data2_6.length === 0}
        onRetry={r2_6}
        actions={<SortToggle dir={sort2_6.dir} onChange={sort2_6.setDir} />}
      >
        <ScrollingBarChart rows={data2_6.length}>
          <BarChart layout="vertical" data={sort2_6.sorted} margin={{ left: 0, top: 5, bottom: 5, right: 8 }}>
            <XAxis type="number" orientation="top" stroke="rgba(255,255,255,0.4)" tick={{ fontSize: 10 }} />
            <YAxis dataKey="country" type="category" stroke="rgba(255,255,255,0.4)" tick={{ fontSize: 10 }} width={50} interval={0} />
            <Tooltip content={<CustomTooltip />} />
            <Bar
              dataKey="events"
              fill="#c5a059"
              radius={[0, 4, 4, 0]}
              className="cursor-pointer"
              onClick={(entry: any) => entry && toggleCrossFilter({ dim: 'country', value: entry.country })}
            />
          </BarChart>
        </ScrollingBarChart>
      </CardWrapper>

      {/* Row 3 — 2.7 + 2.4 + 2.11 (4/4/4); the two tables are the narrowest, so they fit a third-width slot. */}
      <CardWrapper
        title="2.7 Most-Triggered Policies"
        subtitle="Firewall & ACL denial rules"
        colSpan="col-span-12 md:col-span-6 lg:col-span-4"
        loading={l2_7}
        error={e2_7}
        isEmpty={data2_7.length === 0}
        onRetry={r2_7}
        actions={<SortToggle dir={sort2_7.dir} onChange={sort2_7.setDir} />}
      >
        <ScrollingBarChart rows={data2_7.length}>
          <BarChart layout="vertical" data={sort2_7.sorted} margin={{ left: 0, top: 5, bottom: 5, right: 8 }}>
            <XAxis type="number" orientation="top" stroke="rgba(255,255,255,0.4)" tick={{ fontSize: 10 }} />
            <YAxis dataKey="policy" type="category" stroke="rgba(255,255,255,0.4)" tick={{ fontSize: 8 }} width={110} interval={0} />
            <Tooltip content={<CustomTooltip />} />
            <Bar
              dataKey="denials"
              fill="#d4b574"
              radius={[0, 4, 4, 0]}
              className="cursor-pointer"
              onClick={(entry: any) => entry && toggleCrossFilter({ dim: 'policy', value: entry.policy })}
            />
          </BarChart>
        </ScrollingBarChart>
      </CardWrapper>

      <CardWrapper
        title="2.4 Top External Attacker IPs"
        subtitle="Firewall block targets and port scanners"
        colSpan="col-span-12 md:col-span-6 lg:col-span-4"
        loading={l2_4}
        error={e2_4}
        isEmpty={data2_4.length === 0}
        onRetry={r2_4}
      >
        <DataTable data={data2_4} columns={cols2_4} exportFileName="attacker-ips" bodyHeightClass="h-[200px]" />
      </CardWrapper>

      <CardWrapper
        title="2.11 DNS Sinkhole Hits"
        subtitle="Malicious C2 domain requests"
        colSpan="col-span-12 md:col-span-6 lg:col-span-4"
        loading={l2_11}
        error={e2_11}
        isEmpty={data2_11.length === 0}
        onRetry={r2_11}
      >
        <DataTable data={data2_11} columns={cols2_11} exportFileName="dns-sinkhole" bodyHeightClass="h-[200px]" />
      </CardWrapper>

      {/* Row 4 — 2.2 + 2.12 (6/6) */}
      <CardWrapper
        title="2.2 Top Risky Users"
        subtitle="Highest authentication & privilege escalation failures"
        colSpan="col-span-12 lg:col-span-6"
        loading={l2_2}
        error={e2_2}
        isEmpty={data2_2.length === 0}
        onRetry={r2_2}
      >
        <DataTable data={data2_2} columns={cols2_2} exportFileName="risky-users" />
      </CardWrapper>

      <CardWrapper
        title="2.12 Configuration Change Audit"
        subtitle="Device administrative edits and rollbacks"
        colSpan="col-span-12 lg:col-span-6"
        loading={l2_12}
        error={e2_12}
        isEmpty={data2_12.length === 0}
        onRetry={r2_12}
      >
        <DataTable data={data2_12} columns={cols2_12} exportFileName="config-audit" />
      </CardWrapper>

      {/* Row 5 — 2.8 + 2.10 (6/6) */}
      <CardWrapper
        title="2.8 Privilege Escalation Attempts"
        subtitle="Interactive audit log of sudo/root escalation attempts"
        colSpan="col-span-12 lg:col-span-6"
        loading={l2_8}
        error={e2_8}
        isEmpty={data2_8.length === 0}
        onRetry={r2_8}
      >
        <DataTable data={data2_8} columns={cols2_8} exportFileName="priv-escalations" />
      </CardWrapper>

      <CardWrapper
        title="2.10 Port-Security Violations by Switch"
        subtitle="Sticky MAC and err-disabled port tripwires"
        colSpan="col-span-12 lg:col-span-6"
        loading={l2_10}
        error={e2_10}
        isEmpty={data2_10.length === 0}
        onRetry={r2_10}
      >
        <DataTable data={data2_10} columns={cols2_10} exportFileName="port-violations" />
      </CardWrapper>
    </div>
  );
};
