import { useState, useCallback } from 'react';

export interface PaginationState {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export function usePagination(initialPageSize: number = 10) {
  const [state, setState] = useState<PaginationState>({
    page: 1,
    pageSize: initialPageSize,
    total: 0,
    totalPages: 0,
  });

  const updateTotal = useCallback((total: number) => {
    const totalPages = Math.ceil(total / state.pageSize);
    setState((prev) => ({
      ...prev,
      total,
      totalPages,
    }));
  }, [state.pageSize]);

  const goToPage = useCallback((page: number) => {
    setState((prev) => ({
      ...prev,
      page: Math.max(1, Math.min(page, prev.totalPages)),
    }));
  }, []);

  const nextPage = useCallback(() => {
    setState((prev) => ({
      ...prev,
      page: Math.min(prev.page + 1, prev.totalPages),
    }));
  }, []);

  const prevPage = useCallback(() => {
    setState((prev) => ({
      ...prev,
      page: Math.max(prev.page - 1, 1),
    }));
  }, []);

  const changePageSize = useCallback((pageSize: number) => {
    const totalPages = Math.ceil(state.total / pageSize);
    setState((prev) => ({
      ...prev,
      pageSize,
      page: 1,
      totalPages,
    }));
  }, [state.total]);

  const getOffset = useCallback(() => {
    return (state.page - 1) * state.pageSize;
  }, [state.page, state.pageSize]);

  return {
    ...state,
    updateTotal,
    goToPage,
    nextPage,
    prevPage,
    changePageSize,
    getOffset,
  };
}
