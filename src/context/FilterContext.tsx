import React, { createContext, useContext, useState, useMemo, useCallback } from 'react';
import { FilterState, Severity, TimeRangePreset } from '../types';
import { useCypher, useDataAnchor } from '../hooks/useCypher';
import {
  LocationSelection,
  RegionNode,
  EMPTY_LOCATION,
  buildLocationTree,
  resolveStores,
} from '../lib/locations';
import { CrossFilter, sameCrossFilter } from '../lib/crossFilter';

interface FilterContextType {
  filterState: FilterState;
  setTimeRange: (range: TimeRangePreset) => void;
  setCustomRange: (fromIso: string, toIso: string) => void;
  setLocation: (selection: LocationSelection) => void;
  setDeviceType: (dt: string | null) => void;
  setSeverity: (sev: Severity | null) => void;
  resetFilters: () => void;
  crossFilters: CrossFilter[];
  toggleCrossFilter: (filter: CrossFilter) => void;
  removeCrossFilter: (filter: CrossFilter) => void;
  clearCrossFilters: () => void;
  isCrossFilterActive: (filter: CrossFilter) => boolean;
  queryParams: Record<string, any>;
  dataAnchor: string;
  minDataTs: string;
  locationTree: RegionNode[];
  deviceTypesList: string[];
}

const FilterContext = createContext<FilterContextType | undefined>(undefined);

export const FilterProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { minTs, maxTs } = useDataAnchor();

  const [timeRange, setTimeRangeState] = useState<TimeRangePreset>('all');
  const [customRange, setCustomRangeState] = useState<{ from: string; to: string } | null>(null);
  const [location, setLocation] = useState<LocationSelection>(EMPTY_LOCATION);
  const [deviceType, setDeviceType] = useState<string | null>(null);
  const [severity, setSeverity] = useState<Severity | null>(null);
  const [crossFilters, setCrossFilters] = useState<CrossFilter[]>([]);

  const { fromIso, toIso } = useMemo(() => {
    if (timeRange === 'custom' && customRange) {
      return { fromIso: customRange.from, toIso: customRange.to };
    }

    const anchorDate = new Date(maxTs || '2026-04-01T23:59:59Z');
    let fromDate: Date;

    if (timeRange === '7d') {
      fromDate = new Date(anchorDate.getTime() - 7 * 86400000);
    } else if (timeRange === '30d') {
      fromDate = new Date(anchorDate.getTime() - 30 * 86400000);
    } else if (timeRange === '90d') {
      fromDate = new Date(anchorDate.getTime() - 90 * 86400000);
    } else {
      fromDate = new Date(minTs || '2026-01-01T00:00:00Z');
    }

    return {
      fromIso: fromDate.toISOString(),
      toIso: anchorDate.toISOString(),
    };
  }, [timeRange, customRange, maxTs, minTs]);

  const setTimeRange = (range: TimeRangePreset) => {
    setTimeRangeState(range);
    if (range !== 'custom') setCustomRangeState(null);
  };

  const setCustomRange = (from: string, to: string) => {
    setCustomRangeState({ from, to });
    setTimeRangeState('custom');
  };

  const filterState: FilterState = useMemo(
    () => ({
      timeRange,
      fromIso,
      toIso,
      location,
      deviceType,
      severity,
    }),
    [timeRange, fromIso, toIso, location, deviceType, severity]
  );

  // Facet lookups carry no time window, so withFilterScope leaves them unfiltered.
  const { data: siteRows } = useCypher<{ value: string }>(
    'MATCH (e:Event) WHERE e.site IS NOT NULL RETURN DISTINCT e.site AS value ORDER BY value'
  );
  const { data: deviceTypeRows } = useCypher<{ value: string }>(
    'MATCH (d:Device) WHERE d.type IS NOT NULL RETURN DISTINCT d.type AS value ORDER BY value'
  );

  const locationTree = useMemo(() => buildLocationTree(siteRows.map((r) => r.value)), [siteRows]);
  const deviceTypesList = useMemo(() => deviceTypeRows.map((r) => r.value), [deviceTypeRows]);

  const siteScope = useMemo(() => resolveStores(locationTree, location), [locationTree, location]);

  // One value per dimension: clicking a second site replaces the first rather than
  // ANDing two sites together, which would always return nothing.
  const toggleCrossFilter = useCallback((filter: CrossFilter) => {
    setCrossFilters((prev) => {
      if (prev.some((f) => sameCrossFilter(f, filter))) {
        return prev.filter((f) => !sameCrossFilter(f, filter));
      }
      return [...prev.filter((f) => f.dim !== filter.dim), filter];
    });
  }, []);

  const removeCrossFilter = useCallback((filter: CrossFilter) => {
    setCrossFilters((prev) => prev.filter((f) => !sameCrossFilter(f, filter)));
  }, []);

  const clearCrossFilters = useCallback(() => setCrossFilters([]), []);

  const isCrossFilterActive = useCallback(
    (filter: CrossFilter) => crossFilters.some((f) => sameCrossFilter(f, filter)),
    [crossFilters]
  );

  const queryParams = useMemo(
    () => ({
      from: fromIso,
      to: toIso,
      dataAnchor: maxTs,
      siteScope,
      deviceType: deviceType || null,
      severity: severity || null,
      crossFilters,
    }),
    [fromIso, toIso, maxTs, siteScope, deviceType, severity, crossFilters]
  );

  const resetFilters = () => {
    setTimeRangeState('all');
    setCustomRangeState(null);
    setLocation(EMPTY_LOCATION);
    setDeviceType(null);
    setSeverity(null);
    setCrossFilters([]);
  };

  const value = {
    filterState,
    setTimeRange,
    setCustomRange,
    setLocation,
    setDeviceType,
    setSeverity,
    resetFilters,
    crossFilters,
    toggleCrossFilter,
    removeCrossFilter,
    clearCrossFilters,
    isCrossFilterActive,
    queryParams,
    dataAnchor: maxTs,
    minDataTs: minTs,
    locationTree,
    deviceTypesList,
  };

  return <FilterContext.Provider value={value}>{children}</FilterContext.Provider>;
};

export const useFilter = () => {
  const ctx = useContext(FilterContext);
  if (!ctx) {
    throw new Error('useFilter must be used within FilterProvider');
  }
  return ctx;
};
