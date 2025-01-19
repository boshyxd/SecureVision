export interface SearchFilters {
  ports?: number[];
  excludeNonRoutable?: boolean;
  application?: string[];
  urlPaths?: string[];
  domain?: string;
  ip_address?: string;
  port?: number;
  pattern_type?: string;
  risk_score_min?: number;
  risk_score_max?: number;
  tags?: string[];
  has_captcha?: boolean;
  has_mfa?: boolean;
  is_secure?: boolean;
}

export interface BreachEntryMetadata {
  ip_address?: string;
  port?: number;
  domain?: string;
  page_title?: string;
  status?: number;
  tags?: string[];
  hasCaptcha?: boolean;
  hasMfa?: boolean;
  isSecure?: boolean;
  extra?: Record<string, any>;
}

export interface BreachEntry {
  id: string;
  url: string;
  username: string;
  password: string;
  risk_score: number;
  pattern_type: string;
  last_analyzed: string;
  metadata: BreachEntryMetadata;
  enrichment_status?: 'pending' | 'processing' | 'completed';
  current_enrichment_step?: string | null;
  timestamp?: string;
  domain?: string;
  [key: string]: any; // Allow string indexing for dynamic fields
} 