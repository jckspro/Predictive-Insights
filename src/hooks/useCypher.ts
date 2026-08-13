import { useState, useEffect, useCallback, useRef } from 'react';
import { runCypher, subscribeConnectionStatus, updateNeo4jConfig, testConnection, getActiveConfig } from '../lib/neo4j';
import { ConnectionState, Neo4jConfig } from '../types';
import { DATA_ANCHOR, MIN_DATA_TS } from '../lib/mockEngine';

export function useCypher<T>(
  query: string,
  params: Record<string, any> = {},
  deps: any[] = []
) {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Keep ref of query & stringified params to prevent stale closures or unneeded renders
  const paramsRef = useRef(params);
  paramsRef.current = params;

  // Callers pass a fresh queryParams object each render, so depend on its value, not identity.
  const paramsKey = JSON.stringify(params);

  const fetchData = useCallback(
    async (bypassCache = false) => {
      setLoading(true);
      setError(null);
      try {
        const result = await runCypher<T>(query, paramsRef.current, bypassCache);
        setData(result);
      } catch (err: any) {
        setError(err?.message || 'Query failed');
      } finally {
        setLoading(false);
      }
    },
    [query, paramsKey, ...deps]
  );

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, loading, error, refetch: () => fetchData(true) };
}

export function useCypherSingle<T>(
  query: string,
  params: Record<string, any> = {},
  deps: any[] = []
) {
  const { data, loading, error, refetch } = useCypher<T>(query, params, deps);
  const singleData = data.length > 0 ? data[0] : null;
  return { data: singleData, loading, error, refetch };
}

export function useConnectionStatus() {
  const [status, setStatus] = useState<ConnectionState>('DISCONNECTED');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [config, setConfig] = useState<Neo4jConfig>(getActiveConfig());

  useEffect(() => {
    const unsubscribe = subscribeConnectionStatus((s, err) => {
      setStatus(s);
      setErrorMessage(err || null);
      setConfig(getActiveConfig());
    });
    return unsubscribe;
  }, []);

  const handleUpdateConfig = (newCfg: Partial<Neo4jConfig>) => {
    const result = updateNeo4jConfig(newCfg);
    setConfig(getActiveConfig());
    return result;
  };

  const handleTestConnection = () => {
    return testConnection();
  };

  return {
    status,
    errorMessage,
    config,
    updateConfig: handleUpdateConfig,
    testConnection: handleTestConnection,
  };
}

// Data Coverage Anchor Hook
export function useDataAnchor() {
  const [anchor, setAnchor] = useState<{ minTs: string; maxTs: string; loading: boolean }>({
    minTs: MIN_DATA_TS,
    maxTs: DATA_ANCHOR,
    loading: true,
  });

  useEffect(() => {
    let isMounted = true;
    const query = `
      MATCH (e:Event)
      RETURN toString(min(datetime(e.timestamp))) AS minTs,
             toString(max(datetime(e.timestamp))) AS maxTs
    `;
    runCypher<{ minTs: string; maxTs: string }>(query)
      .then((res) => {
        if (isMounted && res && res.length > 0 && res[0].maxTs) {
          setAnchor({
            minTs: res[0].minTs || MIN_DATA_TS,
            maxTs: res[0].maxTs || DATA_ANCHOR,
            loading: false,
          });
        } else if (isMounted) {
          setAnchor({ minTs: MIN_DATA_TS, maxTs: DATA_ANCHOR, loading: false });
        }
      })
      .catch(() => {
        if (isMounted) {
          setAnchor({ minTs: MIN_DATA_TS, maxTs: DATA_ANCHOR, loading: false });
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  return anchor;
}
