/**
 * Pagination component and hooks
 */

import { useState, useMemo, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';

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
 * Pagination component
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

export function Pagination({
  currentPage,
  totalPages,
  onPageChange,
  onPageSizeChange,
  pageSize = 10,
  pageSizeOptions = [5, 10, 25, 50, 100],
  showSizeSelector = true,
}: PaginationProps) {
  const canGoPrevious = currentPage > 1;
  const canGoNext = currentPage < totalPages;

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 py-4">
      {/* Page size selector */}
      {showSizeSelector && onPageSizeChange && (
        <div className="flex items-center gap-2">
          <label htmlFor="page-size" className="text-sm text-muted-foreground">
            Items per page:
          </label>
          <select
            id="page-size"
            value={pageSize}
            onChange={(e) => onPageSizeChange(parseInt(e.target.value))}
            className="px-2 py-1 border border-input rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary text-sm"
          >
            {pageSizeOptions.map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Pagination controls */}
      <div className="flex items-center gap-1 sm:gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(1)}
          disabled={!canGoPrevious}
          title="First page"
          className="hidden sm:flex"
        >
          <ChevronsLeft className="w-4 h-4" />
        </Button>

        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={!canGoPrevious}
          title="Previous page"
          className="gap-2"
        >
          <ChevronLeft className="w-4 h-4" />
          <span className="hidden sm:inline">Previous</span>
        </Button>

        <div className="flex items-center gap-2 px-2 sm:px-4">
          <span className="text-sm font-medium">
            Page {currentPage} of {totalPages}
          </span>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={!canGoNext}
          title="Next page"
          className="gap-2"
        >
          <span className="hidden sm:inline">Next</span>
          <ChevronRight className="w-4 h-4" />
        </Button>

        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(totalPages)}
          disabled={!canGoNext}
          title="Last page"
          className="hidden sm:flex"
        >
          <ChevronsRight className="w-4 h-4" />
        </Button>
      </div>

      {/* Page info */}
      <div className="text-xs sm:text-sm text-muted-foreground text-center sm:text-right">
        Showing page {currentPage} of {totalPages}
      </div>
    </div>
  );
}
