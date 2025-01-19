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
  include_tags?: string[];
  exclude_tags?: string[];
  has_captcha?: boolean;
  has_mfa?: boolean;
  is_secure?: boolean;
  status?: 'unreachable' | 'active';
}

export interface BreachEntryMetadata {
  ip_address?: string;
  port?: number;
  domain?: string;
  path?: string;
  page_title?: string;
  status?: number;
  tags?: string[];
  hasCaptcha?: boolean;
  hasMfa?: boolean;
  isSecure?: boolean;
  service_type?: string;
  breach_info?: {
    is_breached: boolean;
    total_breaches?: number;
    total_pwned?: number;
    latest_breach?: string;
    data_classes?: string[];
    breaches?: Array<{
      name: string;
      title: string;
      breach_date: string;
      pwn_count: number;
      data_classes: string[];
      is_verified: boolean;
      is_sensitive: boolean;
    }>;
  };
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
  isAssessing?: boolean;
  risk_assessment?: {
    risk_level: 'low' | 'medium' | 'high';
    risk_score: number;
    analysis: string;
    recommendations?: string[];
    factors?: Array<{
      name: string;
      impact: 'positive' | 'negative';
      weight: number;
      description: string;
    }>;
  };
  [key: string]: any; // Allow string indexing for dynamic fields
} 