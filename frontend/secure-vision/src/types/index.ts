export interface SearchFilters {
  ports?: number[];
  excludeNonRoutable?: boolean;
  application?: string[];
  urlPaths?: string[];
}

export interface BreachEntry {
  id: string;
  url: string;
  username: string;
  password: string;
  risk_score: number;
  pattern_type: string;
  last_analyzed: string;
  metadata: {
    ip_address?: string;
    port?: number;
    domain?: string;
    page_title?: string;
    status?: number;
    tags?: string[];
  };
} 