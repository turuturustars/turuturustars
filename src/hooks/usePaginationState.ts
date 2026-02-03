/**
 * Simple state-based pagination hook
 * Tracks pagination state separately from data
 */

import { useState, useCallback } from 'react';

export interface UsePaginationStateReturn {
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
  goToPage: (page: number) => void;
  nextPage: () => void;
  previousPage: () => void;
  prevPage: () => void; // Alias for previousPage
  setPageSize: (size: number) => void;
  updateTotal: (total: number) => void;
  getOffset: () => number;
}

/**
 * Hook for managing pagination state
 * Unlike usePagination, this doesn't slice data automatically
 * You manually pass data and handle slicing yourself
 */
export function usePaginationState(
  initialPageSize: number = 10
): UsePaginationStateReturn {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSizeState] = useState(initialPageSize);
  const [totalItems, setTotalItems] = useState(0);

  const totalPages = Math.ceil(totalItems / pageSize) || 1;

  const goToPage = useCallback(
    (newPage: number) => {
      const validPage = Math.max(1, Math.min(newPage, totalPages));
      setPage(validPage);
    },
    [totalPages]
  );

  const nextPage = useCallback(() => {
    goToPage(page + 1);
  }, [page, goToPage]);

  const previousPage = useCallback(() => {
    goToPage(page - 1);
  }, [page, goToPage]);

  // Alias for previousPage
  const prevPage = previousPage;

  const updatePageSize = useCallback((newSize: number) => {
    setPageSizeState(newSize);
    setPage(1); // Reset to first page
  }, []);

  const updateTotal = useCallback((total: number) => {
    setTotalItems(total);
  }, []);

  const getOffset = useCallback(() => {
    return (page - 1) * pageSize;
  }, [page, pageSize]);

  return {
    page,
    pageSize,
    totalItems,
    totalPages,
    goToPage,
    nextPage,
    previousPage,
    prevPage,
    setPageSize: updatePageSize,
    updateTotal,
    getOffset,
  };
}
