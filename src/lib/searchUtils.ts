/**
 * Search utilities for filtering and searching across the application
 */

export interface SearchableItem {
  id: string;
  [key: string]: any;
}

/**
 * Perform case-insensitive search across multiple fields
 */
export function searchItems<T extends SearchableItem>(
  items: T[],
  searchTerm: string,
  searchFields: (keyof T)[]
): T[] {
  if (!searchTerm.trim()) return items;

  const lowerSearchTerm = searchTerm.toLowerCase();

  return items.filter((item) =>
    searchFields.some((field) => {
      const value = item[field];
      if (value === null || value === undefined) return false;

      return String(value).toLowerCase().includes(lowerSearchTerm);
    })
  );
}

/**
 * Filter items by status
 */
export function filterByStatus<T extends SearchableItem>(
  items: T[],
  statusField: keyof T,
  status: string | null
): T[] {
  if (!status || status === 'all') return items;
  return items.filter((item) => item[statusField] === status);
}

/**
 * Filter items by date range
 */
export function filterByDateRange<T extends SearchableItem>(
  items: T[],
  dateField: keyof T,
  startDate: Date | null,
  endDate: Date | null
): T[] {
  if (!startDate || !endDate) return items;

  return items.filter((item) => {
    const itemDate = new Date(item[dateField] as string);
    return itemDate >= startDate && itemDate <= endDate;
  });
}

/**
 * Sort items by field
 */
export function sortItems<T extends SearchableItem>(
  items: T[],
  sortField: keyof T,
  sortOrder: 'asc' | 'desc' = 'asc'
): T[] {
  return [...items].sort((a, b) => {
    const aValue = a[sortField];
    const bValue = b[sortField];

    if (aValue === null || aValue === undefined) return 1;
    if (bValue === null || bValue === undefined) return -1;

    if (typeof aValue === 'string') {
      return sortOrder === 'asc'
        ? (aValue as string).localeCompare(bValue as string)
        : (bValue as string).localeCompare(aValue as string);
    }

    if (typeof aValue === 'number') {
      return sortOrder === 'asc'
        ? (aValue as number) - (bValue as number)
        : (bValue as number) - (aValue as number);
    }

    return 0;
  });
}

/**
 * Advanced search with multiple filters
 */
export function advancedSearch<T extends SearchableItem>(
  items: T[],
  filters: {
    searchTerm?: string;
    searchFields?: (keyof T)[];
    status?: string | null;
    statusField?: keyof T;
    dateRange?: {
      startDate: Date | null;
      endDate: Date | null;
      dateField: keyof T;
    };
    sortField?: keyof T;
    sortOrder?: 'asc' | 'desc';
  }
): T[] {
  let results = items;

  // Apply search
  if (filters.searchTerm && filters.searchFields) {
    results = searchItems(results, filters.searchTerm, filters.searchFields);
  }

  // Apply status filter
  if (filters.status && filters.statusField) {
    results = filterByStatus(results, filters.statusField, filters.status);
  }

  // Apply date range filter
  if (filters.dateRange) {
    const { startDate, endDate, dateField } = filters.dateRange;
    results = filterByDateRange(results, dateField, startDate, endDate);
  }

  // Apply sorting
  if (filters.sortField) {
    results = sortItems(results, filters.sortField, filters.sortOrder || 'asc');
  }

  return results;
}

/**
 * Debounce search input
 */
export function debounceSearch(
  callback: (searchTerm: string) => void,
  delay: number = 300
) {
  let timeoutId: NodeJS.Timeout;

  return (searchTerm: string) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => {
      callback(searchTerm);
    }, delay);
  };
}

/**
 * Highlight search term in text
 */
export function highlightSearchTerm(text: string, searchTerm: string): string {
  if (!searchTerm) return text;

  const regex = new RegExp(`(${searchTerm})`, 'gi');
  return text.replace(regex, '<mark>$1</mark>');
}
