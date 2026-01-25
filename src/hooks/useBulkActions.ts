/**
 * Hook for managing bulk selection and actions
 */

import { useState, useCallback } from 'react';

export interface BulkActionItem {
  id: string;
  [key: string]: any;
}

export function useBulkActions<T extends BulkActionItem>() {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const toggleSelection = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  }, []);

  const selectAll = useCallback((items: T[]) => {
    setSelectedIds(new Set(items.map((item) => item.id)));
  }, []);

  const deselectAll = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  const isSelected = useCallback((id: string) => {
    return selectedIds.has(id);
  }, [selectedIds]);

  const toggleSelectAll = useCallback(
    (items: T[], isCurrentlyAllSelected: boolean) => {
      if (isCurrentlyAllSelected) {
        deselectAll();
      } else {
        selectAll(items);
      }
    },
    [selectAll, deselectAll]
  );

  const getSelectedCount = useCallback(() => {
    return selectedIds.size;
  }, [selectedIds]);

  const getSelectedItems = useCallback((items: T[]) => {
    return items.filter((item) => selectedIds.has(item.id));
  }, [selectedIds]);

  const clearSelection = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  return {
    selectedIds,
    toggleSelection,
    selectAll,
    deselectAll,
    isSelected,
    toggleSelectAll,
    getSelectedCount,
    getSelectedItems,
    clearSelection,
  };
}
