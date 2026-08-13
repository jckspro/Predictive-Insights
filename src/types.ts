export type Severity = 'INFO' | 'MINOR' | 'MAJOR' | 'CRITICAL';

export type { LocationSelection } from './lib/locations';
import type { LocationSelection } from './lib/locations';

export type EventType =
  | 'AUTH_ATTEMPT'
  | 'RESOURCE_ACCESS_ATTEMPT'
  | 'POLICY_DENIAL'
  | 'COMMUNICATION'
  | 'FIREWALL_BLOCK'
  | 'VPN_SESSION'
  | 'DNS_QUERY'
  | 'CONFIG_CHANGE'
  | 'ANOMALY_DETECTED'
  | 'PRIVILEGE_ESCALATION'
  | 'ALERT_RAISED'
  | 'INCIDENT_OPENED'
  | 'SECURITY_VIOLATION'
  | 'VPN_TUNNEL'
  | 'INTERFACE_STATE_CHANGE'
  | 'DEVICE_HEALTH'
  | 'HARDWARE_FAULT'
  | 'ROUTING_NEIGHBOR_CHANGE'
  | 'DEVICE_REBOOT'
  | 'AP_ASSOCIATION_CHANGE';

export type DeviceType =
  | 'Router'
  | 'Switch'
  | 'Firewall'
  | 'Controller'
  | 'AccessPoint'
  | 'AuthenticationServer'
  | 'Server'
  | 'Client';

export interface Neo4jConfig {
  uri: string;
  user: string;
  password: string;
  database: string;
  useDemoFallback: boolean;
}

export type ConnectionState = 'DISCONNECTED' | 'CONNECTING' | 'CONNECTED' | 'ERROR';

export type TimeRangePreset = '7d' | '30d' | '90d' | 'all' | 'custom';

export interface FilterState {
  timeRange: TimeRangePreset;
  fromIso: string;
  toIso: string;
  location: LocationSelection;
  deviceType: string | null;
  severity: Severity | null;
}

// Data shapes for cards
export interface KpiData {
  totalEvents: number;
  criticalEvents: number;
  deniedEvents: number;
  devicesAtRisk: number;
  activeAlerts: number;
  openIncidents: number;
}

// Tab 1 Data Types
export interface SeverityTrendPoint {
  day: string;
  INFO: number;
  MINOR: number;
  MAJOR: number;
  CRITICAL: number;
}

export interface InterfaceFlapItem {
  label: string;
  deviceType: string;
  flaps: number;
}

export interface RoutingAdjacencyItem {
  protocol: string;
  eventName: string;
  occurrences: number;
}

export interface TopologyLinkItem {
  source: string;
  sourceType: string;
  target: string;
  targetType: string;
  weight: number;
}

export interface VpnTunnelFailureItem {
  gateway: string;
  peer: string;
  failureMode: string;
  protocol: string;
  failures: number;
}

export interface ApDisconnectItem {
  controller: string;
  cause: string;
  disconnects: number;
}

export interface AnomalyHotspotItem {
  site: string;
  zone: string;
  intensity: number;
  device?: string;
  eventType?: string;
}

export interface NoisiestDeviceItem {
  device: string;
  deviceType: string;
  events: number;
}

export interface SilentDeviceItem {
  device: string;
  deviceType: string;
  totalEvents: number;
  lastSeen: string;
}

export interface FailedCommProtocolItem {
  protocol: string;
  failures: number;
}

// Tab 2 Data Types
export interface AuthOutcomePoint {
  day: string;
  result: string;
  attempts: number;
}

export interface RiskyUserItem {
  user: string;
  totalFailures: number;
  privEscAttempts: number;
  distinctSourceIps: number;
  distinctCountries: number;
}

export interface DenialReasonItem {
  reason: string;
  occurrences: number;
}

export interface AttackerIpItem {
  sourceIp: string;
  country: string;
  blocks: number;
  portsProbed: number;
  topReasons: string[];
}

export interface BlockedPortItem {
  port: string;
  protocol: string;
  blocks: number;
}

export interface CountryAttackItem {
  country: string;
  events: number;
}

export interface PolicyDenialItem {
  policy: string;
  denials: number;
}

export interface PrivEscItem {
  ts: string;
  user: string;
  sourceIp: string;
  target: string;
  result: string;
  reason: string;
  severity: Severity;
}

export interface AnomalySignatureItem {
  signature: string;
  detections: number;
  avgConfidence: number;
}

export interface PortViolationItem {
  switchName: string;
  port: string;
  violation: string;
  offendingMac: string;
  state: string;
  occurrences: number;
}

export interface DnsSinkholeItem {
  domain: string;
  hits: number;
  distinctClients: number;
}

export interface ConfigAuditItem {
  ts: string;
  admin: string;
  targetDevice: string;
  deviceType: string;
  result: string;
}

export interface FunnelData {
  severeEvents: number;
  alerts: number;
  incidents: number;
}

// Tab 3 Data Types
export interface DeviceRiskScoreItem {
  device: string;
  deviceType: string;
  hwFaults: number;
  unplannedReboots: number;
  criticalHealth: number;
  degradedHealth: number;
  interfaceErrors: number;
  riskScore: number;
}

export interface HealthThresholdItem {
  metric: string;
  status: string;
  readings: number;
}

export interface MetricGaugeItem {
  metric: string;
  unit: string;
  avgValue: number;
  peakValue: number;
  threshold: number;
}

export interface ErrorDegradationPoint {
  device: string;
  day: string;
  errors: number;
}

export interface HardwareFaultItem {
  component: string;
  status: string;
  faults: number;
}

export interface FaultRateByTypeItem {
  deviceType: string;
  deviceCount: number;
  totalFaults: number;
  faultsPerDevice: number;
}

export interface UnexpectedRebootItem {
  device: string;
  deviceType: string;
  reboots: number;
  causes: string[];
  avgUptimeMinutes: number;
}

export interface RebootCauseItem {
  cause: string;
  reboots: number;
}

export interface ThermalOutlierItem {
  device: string;
  deviceType: string;
  metric: string;
  peakValue: number;
  lowValue: number;
  samples: number;
}

export interface OpticsDegradationItem {
  device: string;
  deviceType: string;
  interfaceName: string;
  symptom: string;
  occurrences: number;
}

export interface MaintenanceBacklogItem {
  site: string;
  eventType: string;
  items: number;
}

// Device Drawer Profile
export interface DeviceProfile {
  name: string;
  type: string;
  ip: string;
  totalEvents: number;
  criticalEvents: number;
  firstSeen: string;
  lastSeen: string;
}

export interface DeviceEventTypeMix {
  eventType: string;
  events: number;
}

export interface DeviceActivityTimeline {
  day: string;
  events: number;
}

export interface RawEventItem {
  ts: string;
  eventType: EventType;
  severity: Severity;
  result: string;
  reason: string;
  evidence: string;
}
