import { BreachEntry, SearchFilters } from '@/types';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

interface SearchResponse {
  entries: BreachEntry[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export async function searchBreachData(
  query: string,
  filters: SearchFilters,
  page: number = 1,
  pageSize: number = 20
): Promise<SearchResponse> {
  const searchParams = new URLSearchParams({
    query: query || '',
    page: page.toString(),
    page_size: pageSize.toString(),
  });

  // Add filters to query params
  if (filters.ports?.length) {
    filters.ports.forEach(port => searchParams.append('ports', port.toString()));
  }
  if (filters.excludeNonRoutable) {
    searchParams.append('exclude_local_ips', 'true');
  }
  if (filters.application?.length) {
    filters.application.forEach(app => searchParams.append('service_types', app));
  }
  if (filters.urlPaths?.length) {
    filters.urlPaths.forEach(path => searchParams.append('url_paths', path));
  }

  console.log('Fetching from:', `${API_BASE_URL}/search?${searchParams.toString()}`);

  const response = await fetch(`${API_BASE_URL}/search?${searchParams.toString()}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`Search failed: ${response.statusText}`);
  }

  const data = await response.json();
  console.log('Search response:', data);

  return {
    entries: data.entries.map((entry: any) => ({
      id: entry.id.toString(),
      url: entry.url,
      username: entry.username,
      password: entry.password,
      risk_score: 0.5, // TODO: Implement risk scoring
      pattern_type: 'unknown', // TODO: Implement pattern detection
      last_analyzed: entry.last_analyzed,
      metadata: {
        ip_address: entry.metadata.ip_address,
        port: entry.metadata.port,
        domain: entry.metadata.domain,
        page_title: entry.metadata.page_title,
        status: entry.metadata.status,
        tags: entry.tags || [],
        hasCaptcha: entry.metadata.hasCaptcha,
        hasMfa: entry.metadata.hasMfa,
        isSecure: entry.metadata.isSecure
      }
    })),
    total: data.total,
    page: data.page,
    page_size: data.page_size,
    total_pages: data.total_pages
  };
}

export async function getBreachStats(): Promise<{
  criticalEndpoints: number;
  activeServices: number;
  exposedAdminPaths: number;
  vulnerableServices: number;
  unprotectedEndpoints: number;
  unreachableServices: number;
}> {
  const response = await fetch(`${API_BASE_URL}/search/stats`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch stats: ${response.statusText}`);
  }

  const data = await response.json();
  
  // Transform snake_case to camelCase
  return {
    criticalEndpoints: data.critical_endpoints,
    activeServices: data.active_services,
    exposedAdminPaths: data.exposed_admin,
    vulnerableServices: data.vulnerable_services,
    unprotectedEndpoints: data.unprotected_endpoints,
    unreachableServices: data.unreachable_services
  };
} 