import {
  KpiData,
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
  FunnelData,
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
  DeviceProfile,
  DeviceEventTypeMix,
  DeviceActivityTimeline,
  RawEventItem,
} from '../types';

export const DATA_ANCHOR = '2026-04-01T23:59:59Z';
export const MIN_DATA_TS = '2026-01-01T00:00:00Z';

// Mock Generator for offline/demo fallback
export function executeMockQuery<T>(query: string, params: Record<string, any> = {}): T[] {
  const normalized = query.toLowerCase();

  // Data Anchor min/max
  if (normalized.includes('min(datetime(e.timestamp))')) {
    return [
      {
        minTs: MIN_DATA_TS,
        maxTs: DATA_ANCHOR,
      },
    ] as unknown as T[];
  }

  // Schema discovery
  if (normalized.includes('db.schema.nodetypeproperties')) {
    return [
      { nodeType: ':Event', propertyName: 'timestamp', propertyTypes: ['String'] },
      { nodeType: ':Device', propertyName: 'name', propertyTypes: ['String'] },
    ] as unknown as T[];
  }

  // KPI drill-downs. Matched on an explicit marker comment so no other guard can intercept them.
  if (normalized.includes('kpi-drill:critical')) {
    return [
      { ts: '2026-03-31T22:14:08Z', eventType: 'HARDWARE_FAULT', device: 'core-rtr-01', reason: 'Power supply B failure' },
      { ts: '2026-03-31T18:02:44Z', eventType: 'ROUTING_NEIGHBOR_CHANGE', device: 'core-rtr-02', reason: 'BGP peer hold timer expired' },
      { ts: '2026-03-31T09:37:12Z', eventType: 'PRIVILEGE_ESCALATION', device: 'auth-srv-01', reason: 'Token impersonation detected' },
      { ts: '2026-03-30T23:51:30Z', eventType: 'DEVICE_HEALTH', device: 'dist-sw-01', reason: 'Inlet temperature above threshold' },
      { ts: '2026-03-30T16:19:55Z', eventType: 'INTERFACE_STATE_CHANGE', device: 'dist-sw-02', reason: 'SFP/transceiver failure' },
      { ts: '2026-03-30T04:44:02Z', eventType: 'DEVICE_REBOOT', device: 'access-sw-12', reason: 'Unexpected watchdog reset' },
      { ts: '2026-03-29T20:08:41Z', eventType: 'SECURITY_VIOLATION', device: 'access-sw-05', reason: 'Sticky MAC count limit exceeded' },
      { ts: '2026-03-29T11:26:17Z', eventType: 'VPN_TUNNEL', device: 'border-fw-01', reason: 'IKE phase-2 negotiation failed' },
      { ts: '2026-03-28T14:22:10Z', eventType: 'ANOMALY_DETECTED', device: 'edge-fw-01', reason: 'Beaconing traffic pattern' },
      { ts: '2026-03-28T02:55:36Z', eventType: 'HARDWARE_FAULT', device: 'db-srv-prod', reason: 'Fan tray 2 stalled' },
    ] as unknown as T[];
  }

  if (normalized.includes('kpi-drill:denied')) {
    return [
      { device: 'border-fw-01', reason: 'ACL implicit deny', result: 'blocked', occurrences: 4820 },
      { device: 'auth-srv-01', reason: 'Invalid credentials', result: 'failed', occurrences: 3915 },
      { device: 'border-fw-02', reason: 'Geo-IP restriction', result: 'blocked', occurrences: 2740 },
      { device: 'auth-srv-01', reason: 'MFA challenge not satisfied', result: 'denied', occurrences: 2188 },
      { device: 'auth-srv-01', reason: 'Account locked out', result: 'denied', occurrences: 1602 },
      { device: 'edge-fw-01', reason: 'Threat intel match', result: 'blocked', occurrences: 1344 },
      { device: 'core-rtr-01', reason: 'Certificate expired', result: 'failed', occurrences: 1105 },
      { device: 'dist-sw-01', reason: 'Role not authorized for resource', result: 'denied', occurrences: 918 },
      { device: 'edge-fw-01', reason: 'Rate limit exceeded', result: 'blocked', occurrences: 736 },
      { device: 'dns-srv-01', reason: 'DNS sinkhole match', result: 'blocked', occurrences: 512 },
    ] as unknown as T[];
  }

  if (normalized.includes('kpi-drill:devices')) {
    return [
      { device: 'core-rtr-01', deviceType: 'Router', faultEvents: 148 },
      { device: 'dist-sw-01', deviceType: 'Switch', faultEvents: 121 },
      { device: 'access-sw-12', deviceType: 'Switch', faultEvents: 106 },
      { device: 'border-fw-01', deviceType: 'Firewall', faultEvents: 94 },
      { device: 'db-srv-prod', deviceType: 'Server', faultEvents: 82 },
      { device: 'wlc-austin-01', deviceType: 'Controller', faultEvents: 71 },
      { device: 'core-rtr-02', deviceType: 'Router', faultEvents: 65 },
      { device: 'access-sw-05', deviceType: 'Switch', faultEvents: 54 },
      { device: 'ap-floor2-14', deviceType: 'AccessPoint', faultEvents: 41 },
      { device: 'auth-srv-01', deviceType: 'AuthenticationServer', faultEvents: 33 },
    ] as unknown as T[];
  }

  if (normalized.includes('kpi-drill:alerts')) {
    return [
      { alert: 'Brute Force Login Burst', severity: 'CRITICAL', occurrences: 312 },
      { alert: 'Routing Adjacency Lost', severity: 'CRITICAL', occurrences: 268 },
      { alert: 'Port Security Shutdown', severity: 'MAJOR', occurrences: 214 },
      { alert: 'Chassis Thermal Warning', severity: 'MAJOR', occurrences: 187 },
      { alert: 'VPN Tunnel Down', severity: 'MAJOR', occurrences: 165 },
      { alert: 'Malware Callback Blocked', severity: 'CRITICAL', occurrences: 142 },
      { alert: 'Interface Error Rate High', severity: 'MINOR', occurrences: 118 },
      { alert: 'Unauthorized Config Change', severity: 'MAJOR', occurrences: 96 },
      { alert: 'AP Mass Disassociation', severity: 'MINOR', occurrences: 74 },
      { alert: 'Certificate Expiring Soon', severity: 'MINOR', occurrences: 51 },
    ] as unknown as T[];
  }

  // KPI 1..3
  if (normalized.includes('totalevents') && normalized.includes('criticalevents')) {
    return [
      {
        totalEvents: 148520,
        criticalEvents: 3412,
        deniedEvents: 18940,
      },
    ] as unknown as T[];
  }

  // KPI 4: devices at risk
  if (normalized.includes('devicesatrisk')) {
    return [
      {
        devicesAtRisk: 14,
      },
    ] as unknown as T[];
  }

  // KPI 5 & 6: alerts & incidents
  if (normalized.includes('activealerts') && normalized.includes('openincidents')) {
    return [
      {
        activeAlerts: 87,
        openIncidents: 12,
      },
    ] as unknown as T[];
  }

  // TAB 1: Network Anomalies
  // 1.1 Volume by Severity
  if (normalized.includes('e.severity as severity, count(*) as events') || normalized.includes('volume by severity')) {
    const rows: { day: string; severity: string; events: number }[] = [];
    const start = new Date('2026-03-01');
    for (let i = 0; i < 31; i++) {
      const current = new Date(start.getTime() + i * 86400000);
      const dayStr = current.toISOString().split('T')[0];
      const baseInfo = 1200 + Math.floor(Math.sin(i) * 300) + (i % 5) * 50;
      const baseMinor = 340 + Math.floor(Math.cos(i) * 80);
      const baseMajor = 110 + (i === 14 ? 220 : 0) + (i === 22 ? 180 : 0);
      const baseCrit = 25 + (i === 14 ? 90 : 0) + (i === 22 ? 65 : 0);

      rows.push({ day: dayStr, severity: 'INFO', events: baseInfo });
      rows.push({ day: dayStr, severity: 'MINOR', events: baseMinor });
      rows.push({ day: dayStr, severity: 'MAJOR', events: baseMajor });
      rows.push({ day: dayStr, severity: 'CRITICAL', events: baseCrit });
    }
    return rows as unknown as T[];
  }

  // 1.2 Interface Flap Leaderboard
  if (normalized.includes('e.interface as label') && normalized.includes('flaps')) {
    const items: InterfaceFlapItem[] = [
      { label: 'core-rtr-01 :: ge-0/0/1', deviceType: 'Router', flaps: 142 },
      { label: 'border-fw-02 :: Eth1/4', deviceType: 'Firewall', flaps: 118 },
      { label: 'dist-sw-08 :: Gi1/0/24', deviceType: 'Switch', flaps: 96 },
      { label: 'core-rtr-02 :: ge-0/0/3', deviceType: 'Router', flaps: 84 },
      { label: 'access-sw-12 :: Ten1/1', deviceType: 'Switch', flaps: 72 },
      { label: 'edge-fw-01 :: Eth1/1', deviceType: 'Firewall', flaps: 65 },
      { label: 'dist-sw-03 :: Gi2/0/12', deviceType: 'Switch', flaps: 58 },
      { label: 'core-rtr-03 :: ge-0/1/0', deviceType: 'Router', flaps: 49 },
      { label: 'access-sw-05 :: Gi1/0/48', deviceType: 'Switch', flaps: 41 },
      { label: 'wlc-austin-01 :: Port1', deviceType: 'Controller', flaps: 33 },
      { label: 'dist-sw-01 :: Ten1/2', deviceType: 'Switch', flaps: 28 },
      { label: 'border-fw-01 :: Eth1/2', deviceType: 'Firewall', flaps: 24 },
    ];
    return items as unknown as T[];
  }

  // 1.3 Routing Adjacency Failures
  if (normalized.includes('e.protocol as protocol, e.reason as eventname')) {
    const items: RoutingAdjacencyItem[] = [
      { protocol: 'BGP', eventName: 'Hold Timer Expired', occurrences: 154 },
      { protocol: 'BGP', eventName: 'Notification Received', occurrences: 98 },
      { protocol: 'OSPF', eventName: 'DeadInterval Expired', occurrences: 132 },
      { protocol: 'OSPF', eventName: 'MTU Mismatch', occurrences: 45 },
      { protocol: 'EIGRP', eventName: 'Hello Retry Limit Exceeded', occurrences: 76 },
      { protocol: 'ISIS', eventName: 'Adjacency State Down', occurrences: 31 },
    ];
    return items as unknown as T[];
  }

  // 1.4 Routing Peer Failure Topology
  if (normalized.includes('sourcetype') && normalized.includes('targettype') && normalized.includes('weight')) {
    const topology: TopologyLinkItem[] = [
      { source: 'core-rtr-01', sourceType: 'Router', target: 'core-rtr-02', targetType: 'Router', weight: 18 },
      { source: 'core-rtr-01', sourceType: 'Router', target: 'border-fw-01', targetType: 'Firewall', weight: 14 },
      { source: 'core-rtr-02', sourceType: 'Router', target: 'border-fw-02', targetType: 'Firewall', weight: 12 },
      { source: 'border-fw-01', sourceType: 'Firewall', target: 'isp-gw-01', targetType: 'Router', weight: 28 },
      { source: 'border-fw-02', sourceType: 'Firewall', target: 'isp-gw-02', targetType: 'Router', weight: 22 },
      { source: 'core-rtr-01', sourceType: 'Router', target: 'dist-sw-01', targetType: 'Switch', weight: 9 },
      { source: 'core-rtr-02', sourceType: 'Router', target: 'dist-sw-02', targetType: 'Switch', weight: 11 },
      { source: 'dist-sw-01', sourceType: 'Switch', target: 'access-sw-01', targetType: 'Switch', weight: 7 },
      { source: 'dist-sw-02', sourceType: 'Switch', target: 'access-sw-02', targetType: 'Switch', weight: 6 },
      { source: 'core-rtr-03', sourceType: 'Router', target: 'core-rtr-01', targetType: 'Router', weight: 15 },
      { source: 'core-rtr-03', sourceType: 'Router', target: 'wan-gw-01', targetType: 'Router', weight: 24 },
      { source: 'wan-gw-01', sourceType: 'Router', target: 'remote-site-fw', targetType: 'Firewall', weight: 19 },
    ];
    return topology as unknown as T[];
  }

  // 1.5 VPN Tunnel Failures
  if (normalized.includes('g.name as gateway, p.name as peer')) {
    const items: VpnTunnelFailureItem[] = [
      { gateway: 'border-fw-01', peer: 'aws-vpn-gw-prod', failureMode: 'IKE Phase 2 Rekey Timeout', protocol: 'IPsec', failures: 87 },
      { gateway: 'border-fw-02', peer: 'azure-vpn-gw-east', failureMode: 'DPD Dead Peer Detected', protocol: 'IPsec', failures: 64 },
      { gateway: 'edge-fw-01', peer: 'branch-office-chicago', failureMode: 'Pre-shared Key Mismatch', protocol: 'IKEv2', failures: 42 },
      { gateway: 'border-fw-01', peer: 'gcp-cloud-router', failureMode: 'BGP Neighbor Down', protocol: 'IPsec', failures: 39 },
      { gateway: 'edge-fw-02', peer: 'branch-office-london', failureMode: 'Proposal Security Unmatched', protocol: 'IPsec', failures: 28 },
      { gateway: 'border-fw-02', peer: 'partner-corp-gw', failureMode: 'NAT Traversal Keepalive Loss', protocol: 'IKEv1', failures: 19 },
    ];
    return items as unknown as T[];
  }

  // 1.6 Wireless AP Disconnects
  if (normalized.includes('wlc.name as controller, e.reason as cause')) {
    const items: ApDisconnectItem[] = [
      { controller: 'wlc-austin-01', cause: 'Heartbeat Timeout', disconnects: 142 },
      { controller: 'wlc-austin-01', cause: 'CAPWAP Tunnel Loss', disconnects: 98 },
      { controller: 'wlc-london-02', cause: 'Heartbeat Timeout', disconnects: 86 },
      { controller: 'wlc-tokyo-01', cause: 'PoE Power Budget Exceeded', disconnects: 62 },
      { controller: 'wlc-austin-02', cause: 'Firmware Image Mismatch', disconnects: 41 },
      { controller: 'wlc-london-02', cause: 'Radio Interference Threshold', disconnects: 35 },
    ];
    return items as unknown as T[];
  }

  // 1.7 Anomaly Hotspot
  if (normalized.includes('as site, e.zone as zone') && normalized.includes('as intensity')) {
    const sites = ['HQ-London', 'DC-Frankfurt', 'Branch-Tokyo', 'Lab-Berlin', 'DR-Amsterdam'];
    const zones = ['DMZ', 'SERVER-ZONE', 'CORP-ZONE', 'MGMT-ZONE', 'GUEST-ZONE'];
    const devices = ['border-fw-01', 'core-rtr-01', 'wlc-tokyo-01', 'dist-sw-04'];
    const types = ['COMMUNICATION', 'INTERFACE_STATE_CHANGE', 'ROUTING_NEIGHBOR_CHANGE', 'VPN_TUNNEL'];
    const items: AnomalyHotspotItem[] = [];

    sites.forEach((site, si) => {
      zones.forEach((zone, zi) => {
        const base = Math.max(0, 40 - si * 7 - zi * 6);
        if (base === 0) return;
        items.push({
          site,
          zone,
          device: devices[(si + zi) % devices.length],
          eventType: types[(si + zi) % types.length],
          intensity: base,
        });
      });
    });

    return items as unknown as T[];
  }

  // 1.8 Noisiest Devices
  if (normalized.includes('d.name as device') && normalized.includes('count(e) as events')) {
    const items: NoisiestDeviceItem[] = [
      { device: 'border-fw-01', deviceType: 'Firewall', events: 24510 },
      { device: 'border-fw-02', deviceType: 'Firewall', events: 21890 },
      { device: 'core-rtr-01', deviceType: 'Router', events: 18420 },
      { device: 'core-rtr-02', deviceType: 'Router', events: 16210 },
      { device: 'auth-srv-01', deviceType: 'AuthenticationServer', events: 12900 },
      { device: 'wlc-austin-01', deviceType: 'Controller', events: 11450 },
      { device: 'dist-sw-01', deviceType: 'Switch', events: 9840 },
      { device: 'dist-sw-02', deviceType: 'Switch', events: 8760 },
      { device: 'dns-srv-01', deviceType: 'Server', events: 7890 },
      { device: 'edge-fw-01', deviceType: 'Firewall', events: 6540 },
      { device: 'access-sw-12', deviceType: 'Switch', events: 5410 },
      { device: 'access-sw-08', deviceType: 'Switch', events: 4920 },
    ];
    return items as unknown as T[];
  }

  // 1.9 Silent Devices
  if (normalized.includes('totalevents') && normalized.includes('lastseen')) {
    const items: SilentDeviceItem[] = [
      { device: 'backup-sw-04', deviceType: 'Switch', totalEvents: 0, lastSeen: 'NEVER' },
      { device: 'old-ap-floor3-99', deviceType: 'AccessPoint', totalEvents: 0, lastSeen: 'NEVER' },
      { device: 'lab-rtr-temp', deviceType: 'Router', totalEvents: 12, lastSeen: '2026-01-14T08:22:00Z' },
      { device: 'dmz-sw-spare', deviceType: 'Switch', totalEvents: 5, lastSeen: '2026-02-01T11:05:12Z' },
      { device: 'auth-srv-standby', deviceType: 'AuthenticationServer', totalEvents: 18, lastSeen: '2026-02-18T14:30:00Z' },
      { device: 'wlc-tokyo-backup', deviceType: 'Controller', totalEvents: 2, lastSeen: '2026-02-22T09:12:44Z' },
    ];
    return items as unknown as T[];
  }

  // 1.10 Failed Communications
  if (normalized.includes('e.event_type = \'communication\'') || normalized.includes('e.protocol as protocol, count(*) as failures')) {
    const items: FailedCommProtocolItem[] = [
      { protocol: 'HTTPS', failures: 4820 },
      { protocol: 'SSH', failures: 3120 },
      { protocol: 'DNS', failures: 2450 },
      { protocol: 'RDP', failures: 1890 },
      { protocol: 'SMB', failures: 1420 },
      { protocol: 'ICMP', failures: 980 },
    ];
    return items as unknown as T[];
  }

  // TAB 2: Security Events
  // 2.1 Auth Outcome Trend
  // Matched on the RETURN clause: 'auth_attempt' alone also appears in 2.2's event_type IN list.
  if (normalized.includes('return day, result, attempts')) {
    const days: AuthOutcomePoint[] = [];
    const start = new Date('2026-03-01');
    const results = ['success', 'failed', 'denied'];
    for (let i = 0; i < 31; i++) {
      const dayStr = new Date(start.getTime() + i * 86400000).toISOString().split('T')[0];
      results.forEach((r) => {
        days.push({
          day: dayStr,
          result: r,
          attempts: r === 'success' ? 2400 + (i % 7) * 120 : r === 'failed' ? 420 + (i === 12 ? 800 : 0) : 180 + (i % 4) * 30,
        });
      });
    }
    return days as unknown as T[];
  }

  // 2.2 Top Risky Users
  if (
    normalized.includes('totalfailures') ||
    normalized.includes('privescattempts') ||
    (normalized.includes('u.name as user') && normalized.includes('failures'))
  ) {
    const items: RiskyUserItem[] = [
      { user: 'j.doe@corp.net', totalFailures: 342, privEscAttempts: 18, distinctSourceIps: 12, distinctCountries: 5 },
      { user: 'a.smith@corp.net', totalFailures: 289, privEscAttempts: 12, distinctSourceIps: 8, distinctCountries: 4 },
      { user: 'm.vance@corp.net', totalFailures: 215, privEscAttempts: 4, distinctSourceIps: 14, distinctCountries: 6 },
      { user: 'sys_admin_svc', totalFailures: 198, privEscAttempts: 22, distinctSourceIps: 3, distinctCountries: 1 },
      { user: 'k.brooks@corp.net', totalFailures: 164, privEscAttempts: 0, distinctSourceIps: 6, distinctCountries: 2 },
      { user: 'r.taylor@corp.net', totalFailures: 142, privEscAttempts: 2, distinctSourceIps: 9, distinctCountries: 5 },
      { user: 'dev_runner_01', totalFailures: 118, privEscAttempts: 8, distinctSourceIps: 2, distinctCountries: 1 },
      { user: 'p.wilson@corp.net', totalFailures: 95, privEscAttempts: 1, distinctSourceIps: 5, distinctCountries: 3 },
      { user: 'c.miller@corp.net', totalFailures: 88, privEscAttempts: 5, distinctSourceIps: 7, distinctCountries: 4 },
      { user: 'db_sync_daemon', totalFailures: 76, privEscAttempts: 14, distinctSourceIps: 1, distinctCountries: 1 },
      { user: 'e.davis@corp.net', totalFailures: 64, privEscAttempts: 0, distinctSourceIps: 4, distinctCountries: 2 },
      { user: 'h.martinez@corp.net', totalFailures: 52, privEscAttempts: 3, distinctSourceIps: 8, distinctCountries: 5 },
      { user: 'b.clark@corp.net', totalFailures: 41, privEscAttempts: 1, distinctSourceIps: 3, distinctCountries: 1 },
      { user: 's.white@corp.net', totalFailures: 38, privEscAttempts: 0, distinctSourceIps: 5, distinctCountries: 2 },
      { user: 'net_monitor_bot', totalFailures: 29, privEscAttempts: 6, distinctSourceIps: 2, distinctCountries: 1 },
    ];
    return items as unknown as T[];
  }

  // 2.3 Denial Reason
  if (normalized.includes('reason, count(*) as occurrences')) {
    const items: DenialReasonItem[] = [
      { reason: 'Invalid User Credentials', occurrences: 4520 },
      { reason: 'MFA Authentication Timeout', occurrences: 3180 },
      { reason: 'IP Reputation Blacklist Block', occurrences: 2890 },
      { reason: 'Geo-IP Policy Violation', occurrences: 2140 },
      { reason: 'Account Locked Out (Threshold)', occurrences: 1820 },
      { reason: 'Unauthorized Protocol Access', occurrences: 1450 },
      { reason: 'TLS Cipher Spec Unsupported', occurrences: 980 },
      { reason: 'Expired Access Token', occurrences: 840 },
    ];
    return items as unknown as T[];
  }

  // 2.4 Top External Attacker IPs
  if (normalized.includes('sourceip') && normalized.includes('portsprobed')) {
    const items: AttackerIpItem[] = [
      { sourceIp: '185.220.101.4', country: 'RU', blocks: 2480, portsProbed: 18, topReasons: ['Syn Flood Scan', 'RDP Brute Force'] },
      { sourceIp: '45.142.214.12', country: 'CN', blocks: 1920, portsProbed: 12, topReasons: ['SSH Dictionary Attack', 'Port Sweep'] },
      { sourceIp: '193.142.146.8', country: 'IR', blocks: 1640, portsProbed: 9, topReasons: ['Exploit Attempt CVE-2024', 'Firewall Block'] },
      { sourceIp: '89.248.165.74', country: 'NL', blocks: 1290, portsProbed: 24, topReasons: ['Masscan Activity', 'SIP Probe'] },
      { sourceIp: '162.142.125.10', country: 'US', blocks: 980, portsProbed: 2, topReasons: ['Web Vulnerability Scanner'] },
      { sourceIp: '103.107.198.15', country: 'VN', blocks: 840, portsProbed: 7, topReasons: ['Telnet Default Passwords'] },
    ];
    return items as unknown as T[];
  }

  // 2.5 Blocked Traffic by Target Port
  if (normalized.includes('e.port as port') || normalized.includes('blocks')) {
    const items: BlockedPortItem[] = [
      { port: '22', protocol: 'TCP', blocks: 8450 },
      { port: '3389', protocol: 'TCP', blocks: 6820 },
      { port: '445', protocol: 'TCP', blocks: 5410 },
      { port: '80', protocol: 'TCP', blocks: 4120 },
      { port: '443', protocol: 'TCP', blocks: 3890 },
      { port: '1433', protocol: 'TCP', blocks: 2980 },
      { port: '23', protocol: 'TCP', blocks: 2450 },
      { port: '53', protocol: 'UDP', blocks: 1920 },
      { port: '161', protocol: 'UDP', blocks: 1240 },
    ];
    return items as unknown as T[];
  }

  // 2.6 Attack Origin by Country
  if (normalized.includes('country') && normalized.includes('events order by events desc')) {
    const items: CountryAttackItem[] = [
      { country: 'RU', events: 14200 },
      { country: 'CN', events: 11800 },
      { country: 'US', events: 8900 },
      { country: 'IR', events: 6400 },
      { country: 'KP', events: 4800 },
      { country: 'NL', events: 3200 },
      { country: 'BR', events: 2100 },
    ];
    return items as unknown as T[];
  }

  // 2.7 Most Triggered Policies
  if (normalized.includes('policy') && normalized.includes('denials')) {
    const items: PolicyDenialItem[] = [
      { policy: 'POL-DEFAULT-DENY-INBOUND', denials: 14850 },
      { policy: 'POL-GEO-RESTRICT-EAST-EUR', denials: 9420 },
      { policy: 'POL-PCI-DMZ-SEGMENTATION', denials: 6810 },
      { policy: 'POL-RESTRICT-ADMIN-SSH', denials: 4920 },
      { policy: 'POL-BLOCK-KNOWN-MALWARE-IPS', denials: 3840 },
      { policy: 'POL-LIMIT-OUTBOUND-DNS', denials: 2150 },
    ];
    return items as unknown as T[];
  }

  // 2.8 Privilege Escalation
  if (normalized.includes('privilege_escalation') || normalized.includes('privesc')) {
    const items: PrivEscItem[] = [
      { ts: '2026-03-28T14:22:10Z', user: 'j.doe@corp.net', sourceIp: '10.12.4.15', target: 'core-rtr-01', result: 'succeeded', reason: 'Sudo su root executed via interactive tty', severity: 'CRITICAL' },
      { ts: '2026-03-26T09:15:44Z', user: 'sys_admin_svc', sourceIp: '10.12.1.8', target: 'auth-srv-01', result: 'succeeded', reason: 'Token Impersonation (SeAssignPrimaryTokenPrivilege)', severity: 'CRITICAL' },
      { ts: '2026-03-24T18:02:11Z', user: 'a.smith@corp.net', sourceIp: '10.14.8.90', target: 'border-fw-01', result: 'failed', reason: 'PAM Authorization Denied for Group NetworkAdmin', severity: 'MAJOR' },
      { ts: '2026-03-21T11:45:30Z', user: 'm.vance@corp.net', sourceIp: '10.14.8.102', target: 'dist-sw-02', result: 'failed', reason: 'AAA Tacacs+ Command Privilege Level Reject', severity: 'MAJOR' },
      { ts: '2026-03-18T16:20:00Z', user: 'dev_runner_01', sourceIp: '10.20.2.11', target: 'db-srv-prod', result: 'failed', reason: 'Setuid Execution Restriction Enforcement', severity: 'MAJOR' },
    ];
    return items as unknown as T[];
  }

  // 2.9 SIEM Anomaly Signatures
  if (normalized.includes('signature') && normalized.includes('avgconfidence')) {
    const items: AnomalySignatureItem[] = [
      { signature: 'Beaconing Activity (Interval 60s)', detections: 245, avgConfidence: 0.92 },
      { signature: 'Lateral Movement (WMI / WinRM)', detections: 182, avgConfidence: 0.88 },
      { signature: 'Impossible Travel Connection', detections: 140, avgConfidence: 0.95 },
      { signature: 'Data Exfiltration Spike (TCP/443)', detections: 96, avgConfidence: 0.84 },
      { signature: 'Kerberoasting Ticket Request', detections: 78, avgConfidence: 0.91 },
      { signature: 'DNS Tunneling / Large Query Size', detections: 62, avgConfidence: 0.89 },
    ];
    return items as unknown as T[];
  }

  // 2.10 Port Violation
  if (normalized.includes('offendingmac') || normalized.includes('security_violation')) {
    const items: PortViolationItem[] = [
      { switchName: 'access-sw-12', port: 'Gi1/0/14', violation: 'Sticky MAC Count Limit Exceeded', offendingMac: '00:1A:2B:3C:4D:5E', state: 'err-disabled', occurrences: 28 },
      { switchName: 'access-sw-05', port: 'Gi1/0/3', violation: 'Unauthorized Unknown Unicast MAC', offendingMac: 'B4:96:91:02:88:12', state: 'err-disabled', occurrences: 19 },
      { switchName: 'dist-sw-08', port: 'Ten1/0/2', violation: '802.1X Re-authentication Failure', offendingMac: '3C:07:54:89:AA:BB', state: 'restrict', occurrences: 14 },
      { switchName: 'access-sw-01', port: 'Gi1/0/22', violation: 'DHCP Snooping Untrusted Binding', offendingMac: '00:50:56:C0:00:08', state: 'protect', occurrences: 11 },
      { switchName: 'access-sw-09', port: 'Gi2/0/8', violation: 'BPDU Guard Violation', offendingMac: 'A4:4E:31:12:34:56', state: 'err-disabled', occurrences: 8 },
    ];
    return items as unknown as T[];
  }

  // 2.11 DNS Sinkhole Hits
  if (normalized.includes('distinctclients') || normalized.includes('dns_query')) {
    const items: DnsSinkholeItem[] = [
      { domain: 'malware-c2-drop.ru', hits: 1420, distinctClients: 18 },
      { domain: 'crypto-miner-pool.xyz', hits: 980, distinctClients: 24 },
      { domain: 'phish-verify-bank.com', hits: 640, distinctClients: 12 },
      { domain: 'data-stealer-api.org', hits: 450, distinctClients: 7 },
      { domain: 'trojan-loader-cdn.net', hits: 280, distinctClients: 5 },
    ];
    return items as unknown as T[];
  }

  // 2.12 Config Audit
  if (normalized.includes('targetdevice') || normalized.includes('config_change')) {
    const items: ConfigAuditItem[] = [
      { ts: '2026-03-29T10:14:02Z', admin: 'admin.root', targetDevice: 'core-rtr-01', deviceType: 'Router', change: 'Modified BGP AS-Path Filter List', result: 'applied' },
      { ts: '2026-03-28T15:40:19Z', admin: 'j.doe@corp.net', targetDevice: 'border-fw-01', deviceType: 'Firewall', change: 'Pushed ACL Rule POL-TEMP-ALLOW', result: 'applied' },
      { ts: '2026-03-27T08:11:50Z', admin: 'a.smith@corp.net', targetDevice: 'wlc-austin-01', deviceType: 'Controller', change: 'Updated WLAN WPA3 Enterprise Certificate', result: 'applied' },
      { ts: '2026-03-25T17:33:00Z', admin: 'm.vance@corp.net', targetDevice: 'dist-sw-01', deviceType: 'Switch', change: 'Spanning-Tree Priority Change', result: 'failed_rollback' },
    ];
    return items as unknown as T[];
  }

  // 2.13 Detection Funnel
  if (normalized.includes('severeevents') && normalized.includes('alerts')) {
    return [
      {
        severeEvents: 3412,
        alerts: 284,
        incidents: 12,
      },
    ] as unknown as T[];
  }

  // TAB 3: Predictive Maintenance
  // 3.1 Device Risk Score
  if (normalized.includes('riskscore') || normalized.includes('unplannedreboots')) {
    const items: DeviceRiskScoreItem[] = [
      { device: 'core-rtr-01', deviceType: 'Router', hwFaults: 8, unplannedReboots: 5, criticalHealth: 14, degradedHealth: 28, interfaceErrors: 142000, riskScore: 92 },
      { device: 'border-fw-02', deviceType: 'Firewall', hwFaults: 6, unplannedReboots: 4, criticalHealth: 11, degradedHealth: 19, interfaceErrors: 98000, riskScore: 78 },
      { device: 'dist-sw-08', deviceType: 'Switch', hwFaults: 5, unplannedReboots: 3, criticalHealth: 8, degradedHealth: 15, interfaceErrors: 112000, riskScore: 68 },
      { device: 'wlc-austin-01', deviceType: 'Controller', hwFaults: 3, unplannedReboots: 4, criticalHealth: 9, degradedHealth: 22, interfaceErrors: 45000, riskScore: 54 },
      { device: 'core-rtr-02', deviceType: 'Router', hwFaults: 2, unplannedReboots: 2, criticalHealth: 6, degradedHealth: 14, interfaceErrors: 64000, riskScore: 44 },
      { device: 'access-sw-12', deviceType: 'Switch', hwFaults: 2, unplannedReboots: 1, criticalHealth: 4, degradedHealth: 10, interfaceErrors: 32000, riskScore: 32 },
      { device: 'edge-fw-01', deviceType: 'Firewall', hwFaults: 1, unplannedReboots: 1, criticalHealth: 2, degradedHealth: 8, interfaceErrors: 18000, riskScore: 24 },
      { device: 'dist-sw-03', deviceType: 'Switch', hwFaults: 0, unplannedReboots: 1, criticalHealth: 1, degradedHealth: 6, interfaceErrors: 12000, riskScore: 16 },
    ];
    return items as unknown as T[];
  }

  // 3.2 Health Threshold Breaches
  if (normalized.includes('metric_name as metric, e.result as status')) {
    const items: HealthThresholdItem[] = [
      { metric: 'cpu_utilization', status: 'normal', readings: 8420 },
      { metric: 'cpu_utilization', status: 'degraded', readings: 890 },
      { metric: 'cpu_utilization', status: 'threshold_exceeded', readings: 210 },
      { metric: 'memory_utilization', status: 'normal', readings: 9120 },
      { metric: 'memory_utilization', status: 'degraded', readings: 640 },
      { metric: 'memory_utilization', status: 'threshold_exceeded', readings: 180 },
      { metric: 'temperature', status: 'normal', readings: 7890 },
      { metric: 'temperature', status: 'degraded', readings: 450 },
      { metric: 'temperature', status: 'threshold_exceeded', readings: 142 },
      { metric: 'fan_speed', status: 'normal', readings: 8100 },
      { metric: 'fan_speed', status: 'degraded', readings: 320 },
      { metric: 'fan_speed', status: 'threshold_exceeded', readings: 95 },
    ];
    return items as unknown as T[];
  }

  // 3.3 Metric Averages
  if (normalized.includes('avgvalue') && normalized.includes('peakvalue')) {
    const items: MetricGaugeItem[] = [
      { metric: 'CPU Utilization', unit: '%', avgValue: 64.2, peakValue: 98.5, threshold: 85.0 },
      { metric: 'Memory Utilization', unit: '%', avgValue: 71.8, peakValue: 94.2, threshold: 88.0 },
      { metric: 'Temperature', unit: '°C', avgValue: 52.4, peakValue: 78.1, threshold: 70.0 },
      { metric: 'Fan Speed', unit: 'RPM', avgValue: 4850, peakValue: 7200, threshold: 6500 },
    ];
    return items as unknown as T[];
  }

  // 3.4 Interface Error Degradation Trend
  if (normalized.includes('e2.timestamp') || normalized.includes('errors order by day')) {
    const devices = ['core-rtr-01', 'border-fw-02', 'dist-sw-08', 'wlc-austin-01'];
    const start = new Date('2026-03-01');
    const items: ErrorDegradationPoint[] = [];
    for (let i = 0; i < 31; i++) {
      const dayStr = new Date(start.getTime() + i * 86400000).toISOString().split('T')[0];
      devices.forEach((dev, idx) => {
        const base = (idx + 1) * 200;
        const trend = Math.pow(i / 10, 2) * (idx + 1) * 150;
        items.push({
          device: dev,
          day: dayStr,
          errors: Math.floor(base + trend + (i % 3) * 50),
        });
      });
    }
    return items as unknown as T[];
  }

  // 3.5 Hardware Faults
  if (normalized.includes('e.reason as component, e.result as status')) {
    const items: HardwareFaultItem[] = [
      { component: 'Power Supply Unit (PSU-2)', status: 'FAILED', faults: 42 },
      { component: 'SFP Optical Module 10G', status: 'DEGRADED', faults: 38 },
      { component: 'Chassis Cooling Fan Tray', status: 'DEGRADED', faults: 29 },
      { component: 'DRAM ECC Single-Bit Error', status: 'WARNING', faults: 24 },
      { component: 'NVRAM Sector Corruption', status: 'CRITICAL', faults: 18 },
      { component: 'Line Card ASIC Thermal Trip', status: 'FAILED', faults: 12 },
    ];
    return items as unknown as T[];
  }

  // 3.6 Fault Rate Normalized
  if (normalized.includes('faultsperdevice')) {
    const items: FaultRateByTypeItem[] = [
      { deviceType: 'Router', deviceCount: 8, totalFaults: 48, faultsPerDevice: 6.0 },
      { deviceType: 'Firewall', deviceCount: 12, totalFaults: 54, faultsPerDevice: 4.5 },
      { deviceType: 'Switch', deviceCount: 32, totalFaults: 96, faultsPerDevice: 3.0 },
      { deviceType: 'Controller', deviceCount: 4, totalFaults: 10, faultsPerDevice: 2.5 },
      { deviceType: 'Server', deviceCount: 18, totalFaults: 22, faultsPerDevice: 1.22 },
      { deviceType: 'AccessPoint', deviceCount: 85, totalFaults: 42, faultsPerDevice: 0.49 },
    ];
    return items as unknown as T[];
  }

  // 3.7 Unexpected Reboot Ranking
  if (normalized.includes('avguptimeminutes')) {
    const items: UnexpectedRebootItem[] = [
      { device: 'border-fw-02', deviceType: 'Firewall', reboots: 8, causes: ['Kernel Panic (Out of Memory)', 'Watchdog Reset'], avgUptimeMinutes: 1420 },
      { device: 'core-rtr-01', deviceType: 'Router', reboots: 6, causes: ['Process Crash (bgpd)', 'Bus Error'], avgUptimeMinutes: 2180 },
      { device: 'dist-sw-08', deviceType: 'Switch', reboots: 5, causes: ['Power Failure Brownout', 'Watchdog Reset'], avgUptimeMinutes: 3400 },
      { device: 'wlc-austin-01', deviceType: 'Controller', reboots: 4, causes: ['Software Fault Exception'], avgUptimeMinutes: 4200 },
    ];
    return items as unknown as T[];
  }

  // 3.8 Reboot Cause Distribution
  if (normalized.includes('e.reason as cause, count(*) as reboots')) {
    const items: RebootCauseItem[] = [
      { cause: 'Watchdog Hardware Reset', reboots: 34 },
      { cause: 'Kernel Panic Exception', reboots: 28 },
      { cause: 'Planned Maintenance Reload', reboots: 22 },
      { cause: 'Power Loss Brownout', reboots: 18 },
      { cause: 'Process Memory Exhaustion', reboots: 12 },
    ];
    return items as unknown as T[];
  }

  // 3.9 Thermal & Fan Outliers
  if (normalized.includes('peakvalue') && normalized.includes('lowvalue')) {
    const items: ThermalOutlierItem[] = [
      { device: 'core-rtr-01', deviceType: 'Router', metric: 'temperature', peakValue: 78.4, lowValue: 42.1, samples: 142 },
      { device: 'border-fw-02', deviceType: 'Firewall', metric: 'temperature', peakValue: 74.2, lowValue: 45.0, samples: 128 },
      { device: 'dist-sw-08', deviceType: 'Switch', metric: 'fan_speed', peakValue: 7200, lowValue: 3100, samples: 98 },
      { device: 'core-rtr-03', deviceType: 'Router', metric: 'temperature', peakValue: 71.0, lowValue: 41.2, samples: 88 },
      { device: 'wlc-austin-01', deviceType: 'Controller', metric: 'fan_speed', peakValue: 6950, lowValue: 3400, samples: 76 },
    ];
    return items as unknown as T[];
  }

  // 3.10 Optics Degradation
  if (normalized.includes('symptom') || normalized.includes('interfacename')) {
    const items: OpticsDegradationItem[] = [
      { device: 'core-rtr-01', deviceType: 'Router', interfaceName: 'ge-0/0/1', symptom: 'SFP Rx Optical Power Low (-22dBm)', occurrences: 38 },
      { device: 'border-fw-02', deviceType: 'Firewall', interfaceName: 'Eth1/4', symptom: 'SFP Signal Loss / Laser Fault', occurrences: 26 },
      { device: 'dist-sw-08', deviceType: 'Switch', interfaceName: 'Ten1/0/24', symptom: 'Transceiver EEPROM Read Error', occurrences: 19 },
      { device: 'core-rtr-02', deviceType: 'Router', interfaceName: 'ge-0/0/3', symptom: 'SFP Tx Power Bias High', occurrences: 14 },
    ];
    return items as unknown as T[];
  }

  // 3.11 Maintenance Backlog
  if (normalized.includes('e.site as site, e.event_type as eventtype')) {
    const items: MaintenanceBacklogItem[] = [
      { site: 'Site-Alpha', eventType: 'HARDWARE_FAULT', items: 34 },
      { site: 'Site-Alpha', eventType: 'DEVICE_REBOOT', items: 22 },
      { site: 'Site-Alpha', eventType: 'DEVICE_HEALTH', items: 48 },
      { site: 'Site-Beta', eventType: 'HARDWARE_FAULT', items: 28 },
      { site: 'Site-Beta', eventType: 'DEVICE_REBOOT', items: 16 },
      { site: 'Site-Beta', eventType: 'DEVICE_HEALTH', items: 32 },
      { site: 'Site-Gamma', eventType: 'HARDWARE_FAULT', items: 19 },
      { site: 'Site-Gamma', eventType: 'DEVICE_REBOOT', items: 12 },
      { site: 'Site-Gamma', eventType: 'DEVICE_HEALTH', items: 24 },
    ];
    return items as unknown as T[];
  }

  // Device Detail Drawer Queries
  if (normalized.includes('firstseen') && normalized.includes('lastseen')) {
    const devName = params.deviceName || 'core-rtr-01';
    return [
      {
        name: devName,
        type: 'Router',
        ip: '10.12.0.1',
        totalEvents: 18420,
        criticalEvents: 342,
        firstSeen: '2026-01-01T00:10:00Z',
        lastSeen: '2026-04-01T23:55:12Z',
      },
    ] as unknown as T[];
  }

  if (normalized.includes('e.event_type as eventtype, count(*) as events order by events desc')) {
    return [
      { eventType: 'INTERFACE_STATE_CHANGE', events: 5420 },
      { eventType: 'COMMUNICATION', events: 4810 },
      { eventType: 'DEVICE_HEALTH', events: 3290 },
      { eventType: 'ROUTING_NEIGHBOR_CHANGE', events: 2140 },
      { eventType: 'HARDWARE_FAULT', events: 820 },
    ] as unknown as T[];
  }

  if (normalized.includes('timeline') || (normalized.includes('tostring(date(datetime(e.timestamp))) as day') && normalized.includes('d.name = $devicename'))) {
    const days: DeviceActivityTimeline[] = [];
    const start = new Date('2026-03-01');
    for (let i = 0; i < 31; i++) {
      days.push({
        day: new Date(start.getTime() + i * 86400000).toISOString().split('T')[0],
        events: 400 + Math.floor(Math.sin(i) * 150) + (i % 4) * 80,
      });
    }
    return days as unknown as T[];
  }

  if (normalized.includes('raw_evidence as evidence')) {
    const devName = params.deviceName || 'core-rtr-01';
    return [
      { ts: '2026-04-01T23:55:12Z', eventType: 'INTERFACE_STATE_CHANGE', severity: 'MAJOR', result: 'flapping', reason: 'Link Carrier Transceiver Error', evidence: `<132>1 2026-04-01T23:55:12Z ${devName} kernel - - [link status down] interface ge-0/0/1 flapping` },
      { ts: '2026-04-01T22:14:00Z', eventType: 'DEVICE_HEALTH', severity: 'CRITICAL', result: 'threshold_exceeded', reason: 'CPU Temperature > 75C', evidence: `<131>1 2026-04-01T22:14:00Z ${devName} healthmon - - cpu_temp=78.4C threshold=70.0C` },
      { ts: '2026-04-01T19:02:45Z', eventType: 'ROUTING_NEIGHBOR_CHANGE', severity: 'CRITICAL', result: 'down', reason: 'BGP Hold Timer Expired', evidence: `<130>1 2026-04-01T19:02:45Z ${devName} bgpd - - neighbor 10.12.0.2 state Changed to Down` },
      { ts: '2026-04-01T15:30:10Z', eventType: 'HARDWARE_FAULT', severity: 'CRITICAL', result: 'FAILED', reason: 'Power Supply Unit 2 Offline', evidence: `<128>1 2026-04-01T15:30:10Z ${devName} chassis - - PSU 2 voltage drops below limits` },
    ] as unknown as T[];
  }

  // Default fallback empty or small array
  return [] as unknown as T[];
}
