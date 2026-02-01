/**
 * Pagination component and hooks
 */

import { useState, useMemo, useCallback } from 'react';

export interface PaginationConfig {
  currentPage: number;
  pageSize: number;
  totalItems: number;
}

export interface UsePaginationReturn<T> {
  items: T[];
  currentPage: number;
  pageSize: number;
  totalPages: number;
  totalItems: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  goToPage: (page: number) => void;
  nextPage: () => void;
  previousPage: () => void;
  setPageSize: (size: number) => void;
}

/**
 * Hook for pagination logic
 */
export function usePagination<T>(
  items: T[],
  initialPageSize: number = 10
): UsePaginationReturn<T> {
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(initialPageSize);

  const { paginatedItems, totalPages } = useMemo(() => {
    const total = Math.ceil(items.length / pageSize);
    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    const paginated = items.slice(startIndex, endIndex);

    return {
      paginatedItems: paginated,
      totalPages: total,
    };
  }, [items, currentPage, pageSize]);

  const goToPage = useCallback((page: number) => {
    const validPage = Math.max(1, Math.min(page, totalPages));
    setCurrentPage(validPage);
  }, [totalPages]);

  const nextPage = useCallback(() => {
    goToPage(currentPage + 1);
  }, [currentPage, goToPage]);

  const previousPage = useCallback(() => {
    goToPage(currentPage - 1);
  }, [currentPage, goToPage]);

  const updatePageSize = useCallback((newSize: number) => {
    setPageSize(newSize);
    setCurrentPage(1); // Reset to first page
  }, []);

  return {
    items: paginatedItems,
    currentPage,
    pageSize,
    totalPages,
    totalItems: items.length,
    hasNextPage: currentPage < totalPages,
    hasPreviousPage: currentPage > 1,
    goToPage,
    nextPage,
    previousPage,
    setPageSize: updatePageSize,
  };
}

/**
 * Pagination component props
 */
export interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (size: number) => void;
  pageSize?: number;
  pageSizeOptions?: number[];
  showSizeSelector?: boolean;
}

/**
 * Calculate pagination range
 */
export function getPaginationRange(
  currentPage: number,
  totalPages: number,
  siblingCount: number = 1
): (number | 'ellipsis')[] {
  const range: (number | 'ellipsis')[] = [];
  
  const leftSiblingIndex = Math.max(currentPage - siblingCount, 1);
  const rightSiblingIndex = Math.min(currentPage + siblingCount, totalPages);

  const shouldShowLeftDots = leftSiblingIndex > 2;
  const shouldShowRightDots = rightSiblingIndex < totalPages - 1;

  if (!shouldShowLeftDots && shouldShowRightDots) {
    const leftItemCount = 3 + 2 * siblingCount;
    for (let i = 1; i <= Math.min(leftItemCount, totalPages); i++) {
      range.push(i);
    }
    range.push('ellipsis');
    range.push(totalPages);
  } else if (shouldShowLeftDots && !shouldShowRightDots) {
    range.push(1);
    range.push('ellipsis');
    const rightItemCount = 3 + 2 * siblingCount;
    for (let i = Math.max(totalPages - rightItemCount + 1, 1); i <= totalPages; i++) {
      range.push(i);
    }
  } else if (shouldShowLeftDots && shouldShowRightDots) {
    range.push(1);
    range.push('ellipsis');
    for (let i = leftSiblingIndex; i <= rightSiblingIndex; i++) {
      range.push(i);
    }
    range.push('ellipsis');
    range.push(totalPages);
  } else {
    for (let i = 1; i <= totalPages; i++) {
      range.push(i);
    }
  }

  return range;
}
