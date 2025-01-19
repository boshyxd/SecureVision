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
      // Handle ping messages
      if (event.data === "ping") {
        if (wsRef.current?.readyState === WebSocket.OPEN) {
          wsRef.current.send("pong");
        }
        return;
      }

      const message = JSON.parse(event.data);
      console.log('Processed WebSocket message:', message);
      
      if (message.type === 'enrichment_update') {
        const { entry_id, status, current_step, data } = message;
        console.log('Processing enrichment update for entry:', entry_id, status, current_step);
        
        setEntries(prevEntries => {
          // Find if entry exists in current entries
          const entryIndex = prevEntries.findIndex(e => e.id === entry_id);
          
          if (entryIndex === -1) {
            // If entry doesn't exist in current view, just update the map
            const existingEntry = entriesMapRef.current.get(entry_id);
            if (existingEntry) {
              const updatedEntry = {
                ...existingEntry,
                ...data,
                metadata: {
                  ...existingEntry.metadata,
                  ...data,
                  tags: data?.tags ? 
                    Array.from(new Set([
                      ...(data.tags || []),
                      ...(existingEntry.metadata?.tags || [])
                    ])) : 
                    existingEntry.metadata?.tags
                },
                enrichment_status: status || 'processing',
                current_enrichment_step: current_step,
                timestamp: data.timestamp || new Date().toISOString()
              };
              entriesMapRef.current.set(entry_id, updatedEntry);
            }
            return prevEntries;
          }

          // Update the entry in the current view
          const existingEntry = prevEntries[entryIndex];
          const updatedEntry = {
            ...existingEntry,
            ...data,
            metadata: {
              ...existingEntry.metadata,
              ...data,
              tags: data?.tags ? 
                Array.from(new Set([
                  ...(data.tags || []),
                  ...(existingEntry.metadata?.tags || [])
                ])) : 
                existingEntry.metadata?.tags
            },
            enrichment_status: status || 'processing',
            current_enrichment_step: current_step,
            timestamp: data.timestamp || new Date().toISOString()
          };
          
          // Update the map
          entriesMapRef.current.set(entry_id, updatedEntry);
          
          // Create new array with updated entry
          const newEntries = [...prevEntries];
          newEntries[entryIndex] = updatedEntry;
          
          // Sort entries if needed
          return newEntries.sort((a, b) => {
            // Sort by timestamp (newest first)
            const aTime = a.timestamp ? new Date(a.timestamp).getTime() : 0;
            const bTime = b.timestamp ? new Date(b.timestamp).getTime() : 0;
            if (aTime !== bTime) return bTime - aTime;
            
            // Then by enrichment status
            const statusPriority = {
              'processing': 0,
              'pending': 1,
              'completed': 2
            };
            const aStatus = statusPriority[a.enrichment_status || 'completed'] || 3;
            const bStatus = statusPriority[b.enrichment_status || 'completed'] || 3;
            return aStatus - bStatus;
          });
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
              tags: entry.metadata?.tags || []
            }
          };
          
          entriesMapRef.current.set(entry.id, newEntry);
          
          setEntries(prevEntries => {
            // Only add to current view if it matches current search/filter criteria
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
        // Sort by timestamp (newest first) and then by enrichment status
        const aTime = a.timestamp ? new Date(a.timestamp).getTime() : 0;
        const bTime = b.timestamp ? new Date(b.timestamp).getTime() : 0;
        if (aTime !== bTime) return bTime - aTime;
        
        // Prioritize entries being processed
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
        };

        ws.onmessage = (event) => {
          console.log('WebSocket message received:', event.data);
          if (event.data === 'ping') {
            ws.send('pong');
            return;
          }
          try {
            const message = JSON.parse(event.data);
            console.log('Parsed WebSocket message:', message);
            
            if (message.type === 'enrichment_update') {
              const { entry_id, status, current_step, data } = message;
              console.log('Enrichment update:', { entry_id, status, current_step, data });
              
              // Update the entry in the map
              const existingEntry = entriesMapRef.current.get(entry_id);
              if (existingEntry) {
                const updatedEntry = {
                  ...existingEntry,
                  ...data,
                  metadata: {
                    ...existingEntry.metadata,
                    ...data,
                    tags: data?.tags ? 
                      Array.from(new Set([
                        ...(data.tags || []),
                        ...(existingEntry.metadata?.tags || [])
                      ])) : 
                      existingEntry.metadata?.tags
                  },
                  enrichment_status: status || 'processing',
                  current_enrichment_step: current_step,
                  timestamp: data.timestamp || new Date().toISOString()
                };
                
                entriesMapRef.current.set(entry_id, updatedEntry);
                console.log('Updated entry in map:', updatedEntry);
                
                // Force a re-render with the updated entry
                setEntries(prevEntries => {
                  const entryIndex = prevEntries.findIndex(e => e.id === entry_id);
                  if (entryIndex === -1) return prevEntries;
                  
                  const newEntries = [...prevEntries];
                  newEntries[entryIndex] = updatedEntry;
                  console.log('Updating entries state with:', newEntries);
                  return newEntries;
                });
              }
            } else if (message.type === 'new_entry') {
              const entry = message.data;
              console.log('New entry received:', entry);
              
              if (!entriesMapRef.current.has(entry.id)) {
                const newEntry = {
                  ...entry,
                  enrichment_status: 'pending',
                  current_enrichment_step: null,
                  timestamp: new Date().toISOString(),
                  metadata: {
                    ...entry.metadata,
                    tags: entry.metadata?.tags || []
                  }
                };
                
                entriesMapRef.current.set(entry.id, newEntry);
                console.log('Added new entry to map:', newEntry);
                
                // Add to current view if no search is active
                if (searchResultsRef.current.size === 0) {
                  setEntries(prevEntries => {
                    const newEntries = [newEntry, ...prevEntries];
                    console.log('Adding new entry to view:', newEntries);
                    return newEntries;
                  });
                  setTotalEntries(prev => prev + 1);
                }
              }
            }
          } catch (error) {
            console.error('Error processing WebSocket message:', error);
          }
        };

        ws.onerror = (error) => {
          if (!mountedRef.current) return;
          console.error('WebSocket error:', error);
          setIsConnected(false);
        };

        ws.onclose = (event) => {
          if (!mountedRef.current) return;
          console.log('WebSocket closed:', event.code, event.reason);
          setIsConnected(false);
          wsRef.current = null;
          
          if (mountedRef.current && event.code !== 1000 && reconnectAttemptsRef.current < MAX_RECONNECT_ATTEMPTS) {
            const backoffTime = getBackoffTime(reconnectAttemptsRef.current);
            reconnectTimeoutRef.current = setTimeout(() => {
              if (mountedRef.current) {
                reconnectAttemptsRef.current += 1;
                connectWebSocket();
              }
            }, backoffTime);
          }
        };
      } catch (error) {
        console.error('WebSocket connection error:', error);
        setIsConnected(false);
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
    
    // Skip if the same search is already in progress
    const searchKey = JSON.stringify({ query, filters, page });
    if (searchKey === lastSearchRef.current) {
      return;
    }
    lastSearchRef.current = searchKey;
    
    abortControllerRef.current = new AbortController();
    setIsLoading(true);

    try {
      const { entries: newEntries, total } = await searchBreachData(query, filters, page, pageSize);
      
      // Skip update if search parameters changed during request
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

  // Add lastSearchRef to track the most recent search
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

  const search = useCallback((query: string, filters: SearchFilters) => {
    debouncedSearch(query, filters);
  }, [debouncedSearch]);

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