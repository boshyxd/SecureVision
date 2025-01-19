import { useState, useCallback, useRef, useEffect } from 'react';
import { BreachEntry, SearchFilters } from '@/types';
import { searchBreachData } from '@/services/api';
import { debounce } from 'lodash';

interface UseBreachSearchProps {
  pageSize?: number;
  debounceMs?: number;
}

interface UseBreachSearchReturn {
  entries: BreachEntry[];
  isLoading: boolean;
  totalEntries: number;
  currentPage: number;
  hasMore: boolean;
  search: (query: string, filters: SearchFilters) => void;
  loadMore: () => void;
}

export function useBreachSearch({
  pageSize = 20,
  debounceMs = 300
}: UseBreachSearchProps = {}): UseBreachSearchReturn {
  const [entries, setEntries] = useState<BreachEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [totalEntries, setTotalEntries] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [currentQuery, setCurrentQuery] = useState('');
  const [currentFilters, setCurrentFilters] = useState<SearchFilters>({});
  const [isConnected, setIsConnected] = useState(false);
  
  const entriesMapRef = useRef<Map<string, BreachEntry>>(new Map());
  const abortControllerRef = useRef<AbortController | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>();
  const mountedRef = useRef(false);
  const reconnectAttemptsRef = useRef(0);
  const searchResultsRef = useRef<Set<string>>(new Set());
  const MAX_RECONNECT_ATTEMPTS = 5;
  const getBackoffTime = (attempt: number) => Math.min(1000 * Math.pow(2, attempt), 30000);

  const handleWebSocketMessage = useCallback((event: MessageEvent) => {
    try {
      if (event.data === "ping") {
        if (wsRef.current?.readyState === WebSocket.OPEN) {
          wsRef.current.send("pong");
        }
        return;
      }

      const message = JSON.parse(event.data);
      console.log('Processed WebSocket message:', message);
      
      if (message.type === 'enrichment_update' || !message.type) {
        const entry_id = message.type === 'enrichment_update' ? message.entry_id : message.id;
        const status = message.type === 'enrichment_update' ? message.status : 'processing';
        const current_step = message.type === 'enrichment_update' ? message.current_step : null;
        const data = message.type === 'enrichment_update' ? message.data : message;
        
        console.log('Processing entry update:', { entry_id, status, current_step });
        
        setEntries(prevEntries => {
          const entryIndex = prevEntries.findIndex(e => e.id === entry_id);
          let updatedEntry;
          
          if (entryIndex === -1) {
            updatedEntry = {
              ...data,
              id: entry_id,
              enrichment_status: status || 'processing',
              current_enrichment_step: current_step,
              timestamp: new Date().toISOString(),
              metadata: {
                ...(data.metadata || {}),
                service_type: data.metadata?.service_type || 'Unknown',
                breach_info: {
                  is_breached: data.metadata?.breach_info?.is_breached || false,
                  total_breaches: data.metadata?.breach_info?.total_breaches || 0,
                  total_pwned: data.metadata?.breach_info?.total_pwned || 0,
                  latest_breach: data.metadata?.breach_info?.latest_breach || null,
                  data_classes: data.metadata?.breach_info?.data_classes || [],
                  breaches: data.metadata?.breach_info?.breaches || []
                },
                tags: data.metadata?.tags || []
              }
            };
            
            entriesMapRef.current.set(entry_id, updatedEntry);
            
            if (searchResultsRef.current.size === 0 || searchResultsRef.current.has(entry_id)) {
              return [updatedEntry, ...prevEntries];
            }
            return prevEntries;
          } else {
            const existingEntry = prevEntries[entryIndex];
            updatedEntry = {
              ...existingEntry,
              ...data,
              metadata: {
                ...existingEntry.metadata,
                ...(data.metadata || {}),
                service_type: data.metadata?.service_type || existingEntry.metadata?.service_type || 'Unknown',
                breach_info: {
                  is_breached: data.metadata?.breach_info?.is_breached ?? existingEntry.metadata?.breach_info?.is_breached ?? false,
                  total_breaches: data.metadata?.breach_info?.total_breaches ?? existingEntry.metadata?.breach_info?.total_breaches ?? 0,
                  total_pwned: data.metadata?.breach_info?.total_pwned ?? existingEntry.metadata?.breach_info?.total_pwned ?? 0,
                  latest_breach: data.metadata?.breach_info?.latest_breach ?? existingEntry.metadata?.breach_info?.latest_breach ?? null,
                  data_classes: data.metadata?.breach_info?.data_classes ?? existingEntry.metadata?.breach_info?.data_classes ?? [],
                  breaches: data.metadata?.breach_info?.breaches ?? existingEntry.metadata?.breach_info?.breaches ?? []
                },
                tags: Array.from(new Set([
                  ...(data.metadata?.tags || []),
                  ...(existingEntry.metadata?.tags || [])
                ]))
              },
              enrichment_status: status || existingEntry.enrichment_status || 'processing',
              current_enrichment_step: current_step,
              timestamp: data.timestamp || existingEntry.timestamp || new Date().toISOString()
            };
            
            entriesMapRef.current.set(entry_id, updatedEntry);
            
            const newEntries = [...prevEntries];
            newEntries[entryIndex] = updatedEntry;
            return newEntries;
          }
        });
      } else if (message.type === 'new_entry') {
        const entry = message.data;
        console.log('Processing new entry:', entry);
        
        if (!entriesMapRef.current.has(entry.id)) {
          const newEntry = {
            ...entry,
            enrichment_status: 'pending',
            current_enrichment_step: null,
            timestamp: new Date().toISOString(),
            metadata: {
              ...entry.metadata,
              breach_info: entry.metadata?.breach_info || {
                is_breached: false,
                total_breaches: 0,
                total_pwned: 0,
                latest_breach: null,
                data_classes: [],
                breaches: []
              },
              tags: entry.metadata?.tags || []
            }
          };
          
          entriesMapRef.current.set(entry.id, newEntry);
          
          setEntries(prevEntries => {
            if (searchResultsRef.current.size > 0 && !searchResultsRef.current.has(entry.id)) {
              return prevEntries;
            }
            
            const newEntries = [newEntry, ...prevEntries];
            setTotalEntries(prev => prev + 1);
            return newEntries;
          });
        }
      }
    } catch (error) {
      console.error('Error processing WebSocket message:', error);
    }
  }, []);

  const updateEntriesFromMap = useCallback(() => {
    console.log('Updating entries from map, current size:', entriesMapRef.current.size);
    const entriesList = Array.from(entriesMapRef.current.values())
      .filter(entry => searchResultsRef.current.size === 0 || searchResultsRef.current.has(entry.id))
      .filter(entry => {
        if (!currentQuery) return true;
        return entry.url?.toLowerCase().includes(currentQuery.toLowerCase()) ||
               entry.username?.toLowerCase().includes(currentQuery.toLowerCase()) ||
               entry.domain?.toLowerCase().includes(currentQuery.toLowerCase());
      })
      .filter(entry => {
        for (const [key, value] of Object.entries(currentFilters)) {
          if (value === undefined) continue;
          if (Array.isArray(value)) {
            if (value.length > 0 && !value.includes(entry[key])) return false;
          } else if (entry[key] !== value) return false;
        }
        return true;
      })
      .sort((a, b) => {
        const aTime = a.timestamp ? new Date(a.timestamp).getTime() : 0;
        const bTime = b.timestamp ? new Date(b.timestamp).getTime() : 0;
        if (aTime !== bTime) return bTime - aTime;
        
        const statusPriority = {
          'processing': 0,
          'pending': 1,
          'completed': 2
        };
        const aStatus = statusPriority[a.enrichment_status || 'completed'] || 3;
        const bStatus = statusPriority[b.enrichment_status || 'completed'] || 3;
        return aStatus - bStatus;
      });

    console.log('Filtered and sorted entries:', entriesList.length);
    setEntries(entriesList);
    setTotalEntries(entriesList.length);
  }, [currentQuery, currentFilters]);

  useEffect(() => {
    mountedRef.current = true;
    if (typeof window === 'undefined') return;

    const connectWebSocket = () => {
      if (wsRef.current?.readyState === WebSocket.OPEN || !mountedRef.current) return;
      
      if (wsRef.current) {
        wsRef.current.close(1000);
        wsRef.current = null;
      }
      
      try {
        console.log('Connecting to WebSocket...');
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const ws = new WebSocket(`${protocol}//localhost:8000/api/v1/breach-data/ws`);
        wsRef.current = ws;

        ws.onopen = () => {
          if (!mountedRef.current) {
            ws.close(1000);
            return;
          }
          console.log('WebSocket connected');
          setIsConnected(true);
          reconnectAttemptsRef.current = 0;
          
          // Clear any existing reconnect timeout
          if (reconnectTimeoutRef.current) {
            clearTimeout(reconnectTimeoutRef.current);
            reconnectTimeoutRef.current = undefined;
          }
        };

        ws.onclose = (event) => {
          console.log('WebSocket closed:', event);
          setIsConnected(false);
          
          if (mountedRef.current && reconnectAttemptsRef.current < MAX_RECONNECT_ATTEMPTS) {
            const backoffTime = getBackoffTime(reconnectAttemptsRef.current);
            console.log(`Reconnecting in ${backoffTime}ms (attempt ${reconnectAttemptsRef.current + 1}/${MAX_RECONNECT_ATTEMPTS})`);
            
            reconnectTimeoutRef.current = setTimeout(() => {
              reconnectAttemptsRef.current++;
              connectWebSocket();
            }, backoffTime);
          }
        };

        ws.onerror = (error) => {
          console.error('WebSocket error:', error);
          if (ws.readyState === WebSocket.OPEN) {
            ws.close(1000);
          }
        };

        ws.onmessage = handleWebSocketMessage;
        
      } catch (error) {
        console.error('Error establishing WebSocket connection:', error);
        if (mountedRef.current && reconnectAttemptsRef.current < MAX_RECONNECT_ATTEMPTS) {
          const backoffTime = getBackoffTime(reconnectAttemptsRef.current);
          reconnectTimeoutRef.current = setTimeout(() => {
            reconnectAttemptsRef.current++;
            connectWebSocket();
          }, backoffTime);
        }
      }
    };

    connectWebSocket();

    return () => {
      mountedRef.current = false;
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close(1000);
        wsRef.current = null;
      }
    };
  }, []);

  const performSearch = useCallback(async (
    query: string,
    filters: SearchFilters,
    page: number,
    append: boolean = false
  ) => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    
    const searchKey = JSON.stringify({ query, filters, page });
    if (searchKey === lastSearchRef.current) {
      return;
    }
    lastSearchRef.current = searchKey;
    
    abortControllerRef.current = new AbortController();
    setIsLoading(true);

    try {
      const { entries: newEntries, total } = await searchBreachData(query, filters, page, pageSize);
      
      if (searchKey !== lastSearchRef.current) {
        return;
      }
      
      if (!append) {
        searchResultsRef.current.clear();
      }

      newEntries.forEach(entry => {
        searchResultsRef.current.add(entry.id);
        const existingEntry = entriesMapRef.current.get(entry.id);
        if (existingEntry) {
          entriesMapRef.current.set(entry.id, {
            ...entry,
            metadata: {
              ...entry.metadata,
              ...existingEntry.metadata,
              tags: Array.from(new Set([
                ...(existingEntry.metadata.tags || []),
                ...(entry.metadata.tags || [])
              ]))
            },
            enrichment_status: existingEntry.enrichment_status,
            current_enrichment_step: existingEntry.current_enrichment_step
          });
        } else {
          entriesMapRef.current.set(entry.id, {
            ...entry,
            enrichment_status: 'pending',
            current_enrichment_step: null
          });
        }
      });

      updateEntriesFromMap();
      setHasMore(page * pageSize < total);
    } catch (error: any) {
      if (error?.name !== 'AbortError') {
        console.error('Search failed:', error);
        if (page === 1) {
          searchResultsRef.current.clear();
          updateEntriesFromMap();
          setHasMore(false);
        }
      }
    } finally {
      if (searchKey === lastSearchRef.current) {
        setIsLoading(false);
      }
    }
  }, [pageSize, updateEntriesFromMap]);

  const lastSearchRef = useRef<string | null>(null);

  const debouncedSearch = useCallback(
    debounce((query: string, filters: SearchFilters) => {
      setCurrentQuery(query);
      setCurrentFilters(filters);
      setCurrentPage(1);
      performSearch(query, filters, 1, false);
    }, debounceMs, { leading: false, trailing: true }),
    [performSearch, debounceMs]
  );

  const search = useCallback(async (query: string, filters: SearchFilters) => {
    setIsLoading(true);
    setCurrentQuery(query);
    setCurrentFilters(filters);
    setCurrentPage(1);
    
    try {
      const response = await searchBreachData(query, filters);
      const entries = response.entries || [];
      
      searchResultsRef.current = new Set(entries.map(entry => entry.id));
      
      entries.forEach(entry => {
        entriesMapRef.current.set(entry.id, entry);
      });
      
      setEntries(entries);
      setTotalEntries(response.total || entries.length);
      setHasMore(response.has_more || false);
    } catch (error) {
      console.error('Search failed:', error);
      setEntries([]);
      setTotalEntries(0);
      setHasMore(false);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const loadMore = useCallback(() => {
    if (!isLoading && hasMore) {
      const nextPage = currentPage + 1;
      setCurrentPage(nextPage);
      performSearch(currentQuery, currentFilters, nextPage, true);
    }
  }, [currentPage, currentQuery, currentFilters, hasMore, isLoading, performSearch]);

  return {
    entries,
    isLoading,
    totalEntries,
    currentPage,
    hasMore,
    search,
    loadMore
  };
}

const matchesFilters = (entry: BreachEntry, filters: SearchFilters): boolean => {
  for (const [key, value] of Object.entries(filters)) {
    if (value === undefined) continue;
    
    if (key === 'domain' && value && entry.metadata?.domain) {
      if (!entry.metadata.domain.toLowerCase().includes(value.toLowerCase())) return false;
    } else if (key === 'port' && value !== undefined) {
      if (entry.metadata?.port !== value) return false;
    } else if (key === 'has_captcha' && value !== undefined) {
      if (Boolean(entry.metadata?.hasCaptcha) !== value) return false;
    } else if (key === 'has_mfa' && value !== undefined) {
      if (Boolean(entry.metadata?.hasMfa) !== value) return false;
    } else if (key === 'is_secure' && value !== undefined) {
      if (Boolean(entry.metadata?.isSecure) !== value) return false;
    } else if (key === 'risk_score_min' && value !== undefined) {
      if ((entry.risk_score || 0) < value) return false;
    } else if (key === 'risk_score_max' && value !== undefined) {
      if ((entry.risk_score || 0) > value) return false;
    } else if (key === 'application' && Array.isArray(value) && value.length > 0) {
      const serviceType = entry.metadata?.service_type?.toLowerCase();
      if (!serviceType || !value.some(app => serviceType.includes(app.toLowerCase()))) return false;
    }
  }
  return true;
}; 