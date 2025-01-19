import { BreachEntry, SearchFilters } from '@/types';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

interface SearchResponse {
  entries: BreachEntry[];
  total: number;
  page: number;
  page_size: number;
  has_more: boolean;
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

  // Add all filter parameters
  if (filters.domain) {
    searchParams.append('domain', filters.domain);
  }
  if (filters.port !== undefined) {
    searchParams.append('port', filters.port.toString());
  }
  if (filters.application?.length) {
    filters.application.forEach(app => searchParams.append('application', app));
  }
  if (filters.has_captcha !== undefined) {
    searchParams.append('has_captcha', filters.has_captcha.toString());
  }
  if (filters.has_mfa !== undefined) {
    searchParams.append('has_mfa', filters.has_mfa.toString());
  }
  if (filters.is_secure !== undefined) {
    searchParams.append('is_secure', filters.is_secure.toString());
  }
  if (filters.excludeNonRoutable !== undefined) {
    searchParams.append('excludeNonRoutable', filters.excludeNonRoutable.toString());
  }
  if (filters.risk_score_min !== undefined) {
    searchParams.append('risk_score_min', filters.risk_score_min.toString());
  }
  if (filters.risk_score_max !== undefined) {
    searchParams.append('risk_score_max', filters.risk_score_max.toString());
  }

  console.log('Fetching with filters:', filters);
  console.log('Search URL:', `${API_BASE_URL}/search?${searchParams.toString()}`);

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
  return data;
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
  
  return {
    criticalEndpoints: data.critical_endpoints,
    activeServices: data.active_services,
    exposedAdminPaths: data.exposed_admin,
    vulnerableServices: data.vulnerable_services,
    unprotectedEndpoints: data.unprotected_endpoints,
    unreachableServices: data.unreachable_services
  };
} 