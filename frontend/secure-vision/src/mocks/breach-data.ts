import { BreachEntry, SearchFilters } from "@/types";

const patterns = ["keyboard_walk", "date_based", "common_word", "repeated_chars"];
const domains = ["example.com", "test.org", "demo.net"];
const tags = ["resolved", "local-ip", "parked", "active", "login-form", "captcha", "mfa"];

export const generateMockEntry = (): BreachEntry => {
  return {
    id: Math.random().toString(36).substring(7),
    url: `https://${domains[Math.floor(Math.random() * domains.length)]}/login`,
    username: `user${Math.floor(Math.random() * 1000)}@domain.com`,
    password: "password123",
    risk_score: Math.random(),
    pattern_type: patterns[Math.floor(Math.random() * patterns.length)],
    last_analyzed: new Date().toISOString(),
    metadata: {
      ip_address: "192.168.1.1",
      port: 443,
      domain: domains[Math.floor(Math.random() * domains.length)],
      page_title: "Login Page",
      status: 200,
      tags: Array.from({ length: Math.floor(Math.random() * 3) + 1 }, () => 
        tags[Math.floor(Math.random() * tags.length)]
      )
    }
  };
};

export const mockSearch = async (
  query: string, 
  filters: SearchFilters, 
  page: number = 1, 
  pageSize: number = 20
): Promise<{ entries: BreachEntry[]; total: number }> => {
  await new Promise(resolve => setTimeout(resolve, 500));
  const entries = Array.from({ length: pageSize }, generateMockEntry);
  const total = 1000; // Mock total count
  return { entries, total };
}; 