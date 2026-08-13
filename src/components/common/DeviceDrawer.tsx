import React from 'react';
import { X, Server, ShieldAlert, Activity, Cpu, Clock, Terminal } from 'lucide-react';
import { useDeviceDrawer } from '../../context/DeviceDrawerContext';
import { useCypherSingle, useCypher } from '../../hooks/useCypher';
import {
  DeviceProfile,
  DeviceEventTypeMix,
  DeviceActivityTimeline,
  RawEventItem,
} from '../../types';
import { ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area, XAxis, YAxis, Tooltip } from 'recharts';
import { CustomTooltip } from '../charts/CustomTooltip';

const COLORS = ['#c5a059', '#d4b574', '#10b981', '#f59e0b', '#ef4444', '#3b82f6'];

export const DeviceDrawer: React.FC = () => {
  const { selectedDevice, closeDeviceDrawer } = useDeviceDrawer();

  const deviceName = selectedDevice || '';
  const params = { deviceName };

  // Profile
  const qProfile = `
    MATCH (d:Device {name: $deviceName})
    OPTIONAL MATCH (d)-[:SOURCE_OF]->(e:Event)
    RETURN d.name AS name, d.type AS type, d.ip AS ip,
           count(e) AS totalEvents,
           count(CASE WHEN e.severity = 'CRITICAL' THEN 1 END) AS criticalEvents,
           toString(min(datetime(e.timestamp))) AS firstSeen,
           toString(max(datetime(e.timestamp))) AS lastSeen
  `;
  const { data: profile, loading: lProfile } = useCypherSingle<DeviceProfile>(
    qProfile,
    params,
    [deviceName]
  );

  // Event Mix
  const qMix = `
    MATCH (d:Device {name: $deviceName})-[:SOURCE_OF]->(e:Event)
    RETURN e.event_type AS eventType, count(*) AS events ORDER BY events DESC
  `;
  const { data: mixData, loading: lMix } = useCypher<DeviceEventTypeMix>(qMix, params, [deviceName]);

  // Timeline
  const qTimeline = `
    MATCH (d:Device {name: $deviceName})-[:SOURCE_OF]->(e:Event)
    RETURN toString(date(datetime(e.timestamp))) AS day, count(*) AS events ORDER BY day
  `;
  const { data: timelineData, loading: lTimeline } = useCypher<DeviceActivityTimeline>(
    qTimeline,
    params,
    [deviceName]
  );

  // Raw Events
  const qEvents = `
    MATCH (d:Device {name: $deviceName})-[:SOURCE_OF]->(e:Event)
    RETURN toString(datetime(e.timestamp)) AS ts, e.event_type AS eventType,
           e.severity AS severity, e.result AS result, e.reason AS reason,
           e.raw_evidence AS evidence
    ORDER BY ts DESC LIMIT 40
  `;
  const { data: rawEvents, loading: lEvents } = useCypher<RawEventItem>(qEvents, params, [deviceName]);

  if (!selectedDevice) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex justify-end font-sans">
      <div className="w-full max-w-2xl bg-[#151821] border-l border-white/10 h-full flex flex-col shadow-[-10px_0_30px_rgba(197,160,89,0.15)] animate-in slide-in-from-right duration-300">
        {/* Drawer Header */}
        <div className="flex items-center justify-between p-4 bg-[#0E1017] border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-md bg-[#1E222D] border border-[#c5a059]/40 flex items-center justify-center">
              <Server className="w-4 h-4 text-[#c5a059]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-medium text-[#e5e5e5]">{selectedDevice}</h2>
                <span className="px-1.5 py-0.5 text-[9px] bg-[#c5a059]/10 border border-[#c5a059]/30 text-[#c5a059] rounded-sm uppercase tracking-wider">
                  {profile?.type || 'Device'}
                </span>
              </div>
              <p className="text-[11px] text-white/40">{profile?.ip || 'IP Unassigned'}</p>
            </div>
          </div>

          <button
            onClick={closeDeviceDrawer}
            className="p-1 hover:bg-white/10 text-white/40 hover:text-[#c5a059] rounded transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Drawer Content Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-5">
          {/* Quick Metrics & Mini Section Badges */}
          <div className="grid grid-cols-4 gap-2 text-center text-xs">
            <div className="bg-[#0E1017] border border-white/10 p-2.5 rounded-lg">
              <div className="text-[10px] text-white/40 uppercase tracking-wider">Total Events</div>
              <div className="text-base font-light text-[#c5a059] mt-0.5">
                {lProfile ? '...' : (profile?.totalEvents || 0).toLocaleString()}
              </div>
            </div>
            <div className="bg-[#0E1017] border border-white/10 p-2.5 rounded-lg">
              <div className="text-[10px] text-white/40 uppercase tracking-wider">Critical P1</div>
              <div className="text-base font-light text-red-400 mt-0.5">
                {lProfile ? '...' : (profile?.criticalEvents || 0).toLocaleString()}
              </div>
            </div>
            <div className="bg-[#0E1017] border border-white/10 p-2.5 rounded-lg col-span-2">
              <div className="text-[10px] text-white/40 uppercase tracking-wider">Telemetry Span</div>
              <div className="text-[11px] text-[#e5e5e5] mt-1 truncate">
                {profile?.firstSeen ? `${profile.firstSeen.split('T')[0]} → ${profile.lastSeen.split('T')[0]}` : 'N/A'}
              </div>
            </div>
          </div>

          {/* Three Mini-Lens Sections (Anomaly / Security / Health) */}
          <div className="grid grid-cols-3 gap-2">
            <div className="p-2 bg-[#1E222D] border border-white/10 rounded-lg text-center">
              <div className="flex items-center justify-center gap-1 text-[10px] text-[#c5a059] font-medium tracking-wider">
                <Activity className="w-3 h-3" /> ANOMALY
              </div>
              <div className="text-[11px] text-[#e5e5e5] mt-1">
                {mixData.some((m) => m.eventType.includes('INTERFACE') || m.eventType.includes('ROUTING'))
                  ? 'Active Flaps Detected'
                  : 'Normal Links'}
              </div>
            </div>

            <div className="p-2 bg-[#1E222D] border border-white/10 rounded-lg text-center">
              <div className="flex items-center justify-center gap-1 text-[10px] text-[#f59e0b] font-medium tracking-wider">
                <ShieldAlert className="w-3 h-3" /> SECURITY
              </div>
              <div className="text-[11px] text-[#e5e5e5] mt-1">
                {mixData.some((m) => m.eventType.includes('AUTH') || m.eventType.includes('FIREWALL'))
                  ? 'Audit Logs Active'
                  : 'Zero Violations'}
              </div>
            </div>

            <div className="p-2 bg-[#1E222D] border border-white/10 rounded-lg text-center">
              <div className="flex items-center justify-center gap-1 text-[10px] text-emerald-400 font-medium tracking-wider">
                <Cpu className="w-3 h-3" /> HEALTH
              </div>
              <div className="text-[11px] text-[#e5e5e5] mt-1">
                {mixData.some((m) => m.eventType.includes('HEALTH') || m.eventType.includes('FAULT'))
                  ? 'Health Metrics Monitored'
                  : 'Optimal Operations'}
              </div>
            </div>
          </div>

          {/* Charts Row: Mix Donut + Timeline Area */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {/* Event Mix Donut */}
            <div className="bg-[#0E1017] border border-white/10 p-3 rounded-lg flex flex-col items-center">
              <div className="text-[10px] text-white/40 uppercase tracking-[0.2em] mb-2 self-start font-medium">
                Event-Type Breakdown
              </div>
              <div className="w-full h-44">
                {lMix ? (
                  <div className="w-full h-full bg-white/5 animate-pulse rounded" />
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={mixData}
                        dataKey="events"
                        nameKey="eventType"
                        cx="50%"
                        cy="50%"
                        innerRadius={30}
                        outerRadius={55}
                        paddingAngle={3}
                      >
                        {mixData.map((_, idx) => (
                          <Cell key={`cell-${idx}`} fill={COLORS[idx % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip content={<CustomTooltip />} />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            {/* Timeline Area */}
            <div className="bg-[#0E1017] border border-white/10 p-3 rounded-lg flex flex-col">
              <div className="text-[10px] text-white/40 uppercase tracking-[0.2em] mb-2 font-medium">
                Telemetry Trend
              </div>
              <div className="w-full h-44">
                {lTimeline ? (
                  <div className="w-full h-full bg-white/5 animate-pulse rounded" />
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={timelineData}>
                      <defs>
                        <linearGradient id="devGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#c5a059" stopOpacity={0.4} />
                          <stop offset="95%" stopColor="#c5a059" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <XAxis dataKey="day" hide />
                      <YAxis hide />
                      <Tooltip content={<CustomTooltip />} />
                      <Area type="monotone" dataKey="events" stroke="#c5a059" fill="url(#devGradient)" />
                    </AreaChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>
          </div>

          {/* Raw Telemetry Logs */}
          <div className="bg-[#0E1017] border border-white/10 p-3 rounded-lg space-y-2">
            <div className="flex items-center justify-between border-b border-white/10 pb-2">
              <span className="text-[10px] text-white/40 uppercase tracking-[0.2em] font-medium flex items-center gap-1.5">
                <Terminal className="w-3.5 h-3.5 text-[#c5a059]" /> Recent Raw Telemetry Evidences
              </span>
              <span className="text-[10px] text-white/30">Top 40 records</span>
            </div>

            <div className="max-h-60 overflow-y-auto space-y-2 pr-1">
              {lEvents ? (
                <div className="p-4 text-center text-white/30">Loading raw events...</div>
              ) : rawEvents.length === 0 ? (
                <div className="p-4 text-center text-white/30">No telemetry logs recorded</div>
              ) : (
                rawEvents.map((ev, i) => (
                  <div
                    key={i}
                    className="p-2 bg-[#151821] border border-white/10 rounded text-[11px] font-mono space-y-1 hover:border-[#c5a059]/40 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span
                          className={`px-1.5 py-0.2 rounded text-[9px] font-medium ${
                            ev.severity === 'CRITICAL'
                              ? 'bg-red-500/10 text-red-400 border border-red-500/30'
                              : ev.severity === 'MAJOR'
                              ? 'bg-[#f59e0b]/10 text-[#f59e0b] border border-[#f59e0b]/30'
                              : 'bg-[#c5a059]/10 text-[#c5a059] border border-[#c5a059]/30'
                          }`}
                        >
                          {ev.severity}
                        </span>
                        <span className="text-[#c5a059] font-medium">{ev.eventType}</span>
                      </div>
                      <span className="text-white/40 text-[10px] flex items-center gap-1">
                        <Clock className="w-3 h-3" /> {ev.ts}
                      </span>
                    </div>

                    <div className="text-[#e5e5e5]">
                      <span className="text-white/40">Reason/Result: </span>
                      {ev.reason || ev.result || 'Executed'}
                    </div>

                    {ev.evidence && (
                      <div className="p-1.5 bg-[#0E1017] rounded border border-white/10 text-white/40 text-[10px] break-all leading-tight">
                        {ev.evidence}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
