// Location hierarchy for the global filter bar.
// The graph only stores a flat `e.site` value (e.g. "HQ-London"), so region/country/city
// are derived from the city token in the site name via the lookup below.

export interface LocationSelection {
  region: string | null;
  country: string | null;
  city: string | null;
  store: string | null;
}

export interface CityNode {
  name: string;
  stores: string[];
}

export interface CountryNode {
  name: string;
  cities: CityNode[];
}

export interface RegionNode {
  name: string;
  countries: CountryNode[];
}

export const EMPTY_LOCATION: LocationSelection = {
  region: null,
  country: null,
  city: null,
  store: null,
};

const CITY_GEO: Record<string, { city: string; country: string; region: string }> = {
  london: { city: 'London', country: 'United Kingdom', region: 'EMEA' },
  paris: { city: 'Paris', country: 'France', region: 'EMEA' },
  berlin: { city: 'Berlin', country: 'Germany', region: 'EMEA' },
  frankfurt: { city: 'Frankfurt', country: 'Germany', region: 'EMEA' },
  amsterdam: { city: 'Amsterdam', country: 'Netherlands', region: 'EMEA' },
  newyork: { city: 'New York', country: 'United States', region: 'AMER' },
  austin: { city: 'Austin', country: 'United States', region: 'AMER' },
  saopaulo: { city: 'Sao Paulo', country: 'Brazil', region: 'LATAM' },
  tokyo: { city: 'Tokyo', country: 'Japan', region: 'APAC' },
  singapore: { city: 'Singapore', country: 'Singapore', region: 'APAC' },
  sydney: { city: 'Sydney', country: 'Australia', region: 'APAC' },
};

function geoForSite(site: string) {
  const token = site.includes('-') ? site.slice(site.indexOf('-') + 1) : site;
  return (
    CITY_GEO[token.toLowerCase().replace(/[^a-z]/g, '')] || {
      city: token,
      country: 'Unmapped',
      region: 'Unmapped',
    }
  );
}

export function buildLocationTree(sites: string[]): RegionNode[] {
  const tree = new Map<string, Map<string, Map<string, Set<string>>>>();

  for (const site of sites) {
    const { region, country, city } = geoForSite(site);
    if (!tree.has(region)) tree.set(region, new Map());
    const countries = tree.get(region)!;
    if (!countries.has(country)) countries.set(country, new Map());
    const cities = countries.get(country)!;
    if (!cities.has(city)) cities.set(city, new Set());
    cities.get(city)!.add(site);
  }

  const sorted = <T>(entries: [string, T][]) => entries.sort(([a], [b]) => a.localeCompare(b));

  return sorted([...tree]).map(([region, countries]) => ({
    name: region,
    countries: sorted([...countries]).map(([country, cities]) => ({
      name: country,
      cities: sorted([...cities]).map(([city, stores]) => ({
        name: city,
        stores: [...stores].sort((a, b) => a.localeCompare(b)),
      })),
    })),
  }));
}

// Returns the site values covered by a selection, or null when nothing is selected (no scoping).
export function resolveStores(tree: RegionNode[], sel: LocationSelection): string[] | null {
  if (sel.store) return [sel.store];
  if (!sel.region) return null;

  const region = tree.find((r) => r.name === sel.region);
  if (!region) return [];

  const countries = sel.country
    ? region.countries.filter((c) => c.name === sel.country)
    : region.countries;
  const cities = countries.flatMap((c) =>
    sel.city ? c.cities.filter((ct) => ct.name === sel.city) : c.cities
  );

  return cities.flatMap((c) => c.stores);
}

export function locationLabel(sel: LocationSelection): string {
  const parts = [sel.region, sel.country, sel.city, sel.store].filter(Boolean);
  return parts.length ? parts.join(' / ') : 'All Locations';
}
