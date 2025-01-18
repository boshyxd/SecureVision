import { useState, useCallback, useRef } from 'react';
import { BreachEntry, SearchFilters } from '@/types';
import { mockSearch } from '@/mocks/breach-data';
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
  
  const abortControllerRef = useRef<AbortController | null>(null);

  const performSearch = useCallback(async (
    query: string,
    filters: SearchFilters,
    page: number,
    append: boolean = false
  ) => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    
    abortControllerRef.current = new AbortController();
    setIsLoading(true);

    try {
      const { entries: newEntries, total } = await mockSearch(
        query,
        filters,
        page,
        pageSize
      );

      setEntries(prev => append ? [...prev, ...newEntries] : newEntries);
      setTotalEntries(total);
      setHasMore(page * pageSize < total);
    } catch (error: unknown) {
      if (error instanceof Error && error.name === 'AbortError') {
        return;
      }
      console.error('Search failed:', error);
    } finally {
      setIsLoading(false);
    }
  }, [pageSize]);

  const debouncedSearch = useCallback(
    debounce((query: string, filters: SearchFilters) => {
      setCurrentQuery(query);
      setCurrentFilters(filters);
      setCurrentPage(1);
      performSearch(query, filters, 1, false);
    }, debounceMs),
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