// Click-to-filter: selecting a value on any card narrows every other card on the dashboard.
// Each dimension maps to a fixed Cypher predicate; values only ever travel as bound parameters,
// so a clicked label can never alter the shape of a query.

export interface CrossFilter {
  dim: CrossFilterDim;
  value: string;
}

const DIMS = {
  site: { label: 'Site', predicate: (p: string) => `e.site = $${p}` },
  zone: { label: 'Zone', predicate: (p: string) => `e.zone = $${p}` },
  eventType: { label: 'Event Type', predicate: (p: string) => `e.event_type = $${p}` },
  severity: { label: 'Severity', predicate: (p: string) => `e.severity = $${p}` },
  metricName: { label: 'Metric', predicate: (p: string) => `e.metric_name = $${p}` },
  reason: { label: 'Reason', predicate: (p: string) => `e.reason = $${p}` },
  action: { label: 'Action', predicate: (p: string) => `e.action = $${p}` },
  result: { label: 'Result', predicate: (p: string) => `e.result = $${p}` },
  protocol: { label: 'Protocol', predicate: (p: string) => `e.protocol = $${p}` },
  port: { label: 'Port', predicate: (p: string) => `toString(e.port) = $${p}` },
  country: { label: 'Country', predicate: (p: string) => `e.country = $${p}` },
  interfaceName: { label: 'Interface', predicate: (p: string) => `e.interface = $${p}` },
  sourceSystem: { label: 'Source', predicate: (p: string) => `e.source_system = $${p}` },
  deviceType: {
    label: 'Device Type',
    predicate: (p: string) => `EXISTS { MATCH (:Device {type: $${p}})-[:SOURCE_OF]->(e) }`,
  },
  device: {
    label: 'Device',
    predicate: (p: string) => `EXISTS { MATCH (:Device {name: $${p}})-[:SOURCE_OF]->(e) }`,
  },
  policy: {
    label: 'Policy',
    predicate: (p: string) => `EXISTS { MATCH (e)-[:GOVERNED_BY]->(:Policy {name: $${p}}) }`,
  },
} as const;

export type CrossFilterDim = keyof typeof DIMS;

export const crossFilterLabel = (dim: CrossFilterDim) => DIMS[dim].label;

export const sameCrossFilter = (a: CrossFilter, b: CrossFilter) => a.dim === b.dim && a.value === b.value;

/** Turns the active selections into a Cypher fragment plus the parameters it binds. */
export function buildCrossFilterClause(filters: CrossFilter[] | undefined) {
  const params: Record<string, string> = {};
  if (!filters?.length) return { clause: '', params };

  const clause = filters
    .filter((f) => DIMS[f.dim] !== undefined && f.value !== null && f.value !== undefined)
    .map((f, i) => {
      const paramName = `xf${i}`;
      params[paramName] = String(f.value);
      return ` AND ${DIMS[f.dim].predicate(paramName)}`;
    })
    .join('');

  return { clause, params };
}
