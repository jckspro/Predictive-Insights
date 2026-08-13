import neo4j, { Driver, Session, Integer, isInt } from 'neo4j-driver';
import { ConnectionState, Neo4jConfig } from '../types';
import { executeMockQuery } from './mockEngine';
import { buildCrossFilterClause } from './crossFilter';

const DEFAULT_CONFIG: Neo4jConfig = {
  uri: import.meta.env.VITE_NEO4J_URI || 'bolt://srv19719:7687',
  user: import.meta.env.VITE_NEO4J_USER || 'neo4j',
  password: import.meta.env.VITE_NEO4J_PASSWORD || 'syslogai',
  database: import.meta.env.VITE_NEO4J_DATABASE || 'synthetic',
  useDemoFallback: false,
};

let activeConfig: Neo4jConfig = { ...DEFAULT_CONFIG };
let driverInstance: Driver | null = null;
let currentStatus: ConnectionState = 'DISCONNECTED';
let lastError: string | null = null;
const statusListeners: Array<(status: ConnectionState, error?: string | null) => void> = [];

// Query Cache & In-Flight Deduplication
const queryCache = new Map<string, { data: any[]; timestamp: number }>();
const inFlightQueries = new Map<string, Promise<any[]>>();
const CACHE_TTL_MS = 15000; // 15 seconds cache

export function getActiveConfig(): Neo4jConfig {
  return { ...activeConfig };
}

export function subscribeConnectionStatus(
  listener: (status: ConnectionState, error?: string | null) => void
): () => void {
  statusListeners.push(listener);
  listener(currentStatus, lastError);
  return () => {
    const idx = statusListeners.indexOf(listener);
    if (idx !== -1) statusListeners.splice(idx, 1);
  };
}

function setConnectionStatus(status: ConnectionState, error?: string | null) {
  currentStatus = status;
  lastError = error || null;
  statusListeners.forEach((l) => l(status, lastError));
}

export function getDriver(): Driver | null {
  if (activeConfig.useDemoFallback) {
    return null;
  }
  if (!driverInstance) {
    try {
      setConnectionStatus('CONNECTING');
      driverInstance = neo4j.driver(
        activeConfig.uri,
        neo4j.auth.basic(activeConfig.user, activeConfig.password),
        {
          disableLosslessIntegers: true,
          connectionTimeout: 8000,
          maxConnectionLifetime: 30000,
        }
      );
    } catch (err: any) {
      console.warn('[Neo4j] Driver initialization failed:', err);
      setConnectionStatus('ERROR', err?.message || 'Failed to initialize Neo4j driver');
    }
  }
  return driverInstance;
}

export async function testConnection(configToTest?: Neo4jConfig): Promise<{ success: boolean; message: string }> {
  const cfg = configToTest || activeConfig;
  if (cfg.useDemoFallback) {
    setConnectionStatus('CONNECTED', 'Using Synthetic Offline Dataset');
    return { success: true, message: 'Connected to Synthetic Offline Engine' };
  }

  let testDriver: Driver | null = null;
  try {
    setConnectionStatus('CONNECTING');
    testDriver = neo4j.driver(cfg.uri, neo4j.auth.basic(cfg.user, cfg.password), {
      disableLosslessIntegers: true,
      connectionTimeout: 5000,
    });
    const session = testDriver.session({ database: cfg.database, defaultAccessMode: neo4j.session.READ });
    try {
      await session.run('RETURN 1 AS test');
      setConnectionStatus('CONNECTED');
      
      // Execute schema discovery on success
      discoverSchema(session);
      
      return { success: true, message: `Connected to Neo4j (${cfg.database} @ ${cfg.uri})` };
    } finally {
      await session.close();
    }
  } catch (err: any) {
    const errorMsg = err?.message || 'Failed to connect to Neo4j instance';
    console.warn('[Neo4j] Connection test failed:', errorMsg);
    setConnectionStatus('ERROR', errorMsg);
    return { success: false, message: errorMsg };
  } finally {
    if (testDriver && testDriver !== driverInstance) {
      await testDriver.close().catch(() => {});
    }
  }
}

async function discoverSchema(session: Session) {
  try {
    const result = await session.run('CALL db.schema.nodeTypeProperties()');
    console.log('[Neo4j Schema Discovery]', result.records.map((r) => r.toObject()));
  } catch (e) {
    console.debug('[Neo4j Schema Discovery Note] Standard property discovery procedure unavailable.');
  }
}

export function updateNeo4jConfig(newConfig: Partial<Neo4jConfig>) {
  activeConfig = { ...activeConfig, ...newConfig };
  queryCache.clear();
  inFlightQueries.clear();

  if (driverInstance) {
    driverInstance.close().catch(() => {});
    driverInstance = null;
  }

  testConnection(activeConfig);
}

// Helper to convert Neo4j Types (Integer, Date, DateTime, Node, Relationship) to pure JS
export function convertNeo4jValue(val: any): any {
  if (val === null || val === undefined) return val;
  if (typeof val === 'number' || typeof val === 'string' || typeof val === 'boolean') {
    return val;
  }
  if (isInt(val)) {
    return val.toNumber();
  }
  if (val instanceof Integer) {
    return val.toNumber();
  }
  if (typeof val === 'object') {
    // Neo4j Temporal types (Date, Time, DateTime, Duration, etc.)
    if (val.constructor && (val.constructor.name.includes('Date') || val.constructor.name.includes('Time') || val.constructor.name.includes('Duration'))) {
      return val.toString();
    }
    if (typeof val.toString === 'function' && (val.year || val.hour || val.months)) {
      return val.toString();
    }
    // Record or Node/Relationship or plain object
    if (Array.isArray(val)) {
      return val.map(convertNeo4jValue);
    }
    const result: Record<string, any> = {};
    for (const key of Object.keys(val)) {
      result[key] = convertNeo4jValue(val[key]);
    }
    return result;
  }
  return val;
}

// Generate Cache Key
function getCacheKey(query: string, params?: Record<string, any>): string {
  return `${query.trim()}__${JSON.stringify(params || {})}`;
}

export function clearQueryCache() {
  queryCache.clear();
  inFlightQueries.clear();
}

const TIME_WINDOW = 'datetime(e.timestamp) >= datetime($from) AND datetime(e.timestamp) <= datetime($to)';

// Applies the filter bar's location/severity/deviceType selections plus any click-to-filter
// selections to every time-windowed query. Each dropdown predicate is null-tolerant, so an unset
// dropdown is a no-op in Cypher.
// Queries without the canonical time window (schema probes, facet lookups) are left untouched.
function withFilterScope(query: string, params: Record<string, any>) {
  if (!query.includes(TIME_WINDOW)) return { query, params };

  const cross = buildCrossFilterClause(params.crossFilters);

  let scope =
    ' AND ($siteScope IS NULL OR e.site IN $siteScope)' +
    ' AND ($severity IS NULL OR e.severity = $severity)' +
    ' AND ($deviceType IS NULL OR EXISTS { MATCH (:Device {type: $deviceType})-[:SOURCE_OF]->(e) })' +
    cross.clause;

  const { crossFilters, ...rest } = params;

  return {
    query: query.split(TIME_WINDOW).join(TIME_WINDOW + scope),
    params: { siteScope: null, severity: null, deviceType: null, ...rest, ...cross.params },
  };
}

// Run Cypher Query with caching & fallback
export async function runCypher<T>(
  query: string,
  params: Record<string, any> = {},
  bypassCache = false
): Promise<T[]> {
  ({ query, params } = withFilterScope(query, params));
  const cacheKey = getCacheKey(query, params);

  if (!bypassCache) {
    const cached = queryCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
      return cached.data as T[];
    }
  }

  if (inFlightQueries.has(cacheKey)) {
    return (await inFlightQueries.get(cacheKey)!) as T[];
  }

  const queryPromise = (async () => {
    // Check if demo fallback is active
    if (activeConfig.useDemoFallback) {
      const mockResult = executeMockQuery<T>(query, params);
      queryCache.set(cacheKey, { data: mockResult, timestamp: Date.now() });
      return mockResult;
    }

    const driver = getDriver();
    if (!driver) {
      // Fallback if driver unavailable
      const mockResult = executeMockQuery<T>(query, params);
      return mockResult;
    }

    let session: Session | null = null;
    try {
      session = driver.session({
        database: activeConfig.database,
        defaultAccessMode: neo4j.session.READ,
      });

      const result = await session.run(query, params);
      const converted: T[] = result.records.map((record) => {
        const obj: Record<string, any> = {};
        record.keys.forEach((key) => {
          const raw = record.get(key);
          obj[key as string] = convertNeo4jValue(raw);
        });
        return obj as T;
      });

      setConnectionStatus('CONNECTED');
      queryCache.set(cacheKey, { data: converted, timestamp: Date.now() });
      return converted;
    } catch (err: any) {
      console.warn(`[Neo4j Query Failure] Falling back to synthetic engine for query. Error:`, err?.message || err);
      // Auto fallback on query failure (e.g., DNS unresolvable or server down)
      setConnectionStatus('ERROR', err?.message || 'Query execution failed. Using demo data.');
      const mockResult = executeMockQuery<T>(query, params);
      queryCache.set(cacheKey, { data: mockResult, timestamp: Date.now() });
      return mockResult;
    } finally {
      if (session) {
        await session.close().catch(() => {});
      }
    }
  })();

  inFlightQueries.set(cacheKey, queryPromise);

  try {
    const res = await queryPromise;
    return res;
  } finally {
    inFlightQueries.delete(cacheKey);
  }
}

// Initialize on page load
if (typeof window !== 'undefined') {
  testConnection();
  window.addEventListener('beforeunload', () => {
    if (driverInstance) {
      driverInstance.close().catch(() => {});
    }
  });
}
