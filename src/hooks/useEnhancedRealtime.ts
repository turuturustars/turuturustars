/**
 * Phase 6: Enhanced Real-time Hooks
 * Hooks combining incremental updates, offline sync, and cross-tab communication
 * 
 * File: src/hooks/useEnhancedRealtime.ts
 */

import { useEffect, useRef, useCallback, useState } from 'react';
import { supabase } from '@/integrations/supabase';
import {
  useCrossTabSync,
  useOfflineQueue,
  useBatchUpdates,
  useConnectionMetrics,
  useSubscriptionHealth,
  type IncrementalUpdate,
} from '@/lib/realtimeEnhancements';
import type { RealtimeChannel } from '@supabase/supabase-js';

// ============================================================================
// Enhanced Real-time Hook with All Features
// ============================================================================

type FilterOperator = 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'ilike' | 'like';
type RealtimeEvent = 'INSERT' | 'UPDATE' | 'DELETE';

export interface UseEnhancedRealtimeOptions<T> {
  table: string;
  filter?: { column: string; operator: FilterOperator; value: unknown };
  events?: RealtimeEvent[];
  enableOfflineSync?: boolean;
  enableCrossTabSync?: boolean;
  enableOptimisticUpdates?: boolean;
  enableBatchUpdates?: boolean;
  debounceMs?: number;
  onInsert?: (item: T) => void;
  onUpdate?: (change: IncrementalUpdate<T>) => void;
  onDelete?: (id: string) => void;
  onError?: (error: Error) => void;
  enabled?: boolean;
}

/**
 * Comprehensive real-time hook with incremental updates, offline support,
 * cross-tab sync, and optimistic updates
 */
export function useEnhancedRealtime<T extends { id: string }>(
  options: UseEnhancedRealtimeOptions<T>
) {
  const {
    table,
    filter,
    events = ['INSERT', 'UPDATE', 'DELETE'],
    enableOfflineSync = true,
    enableCrossTabSync = true,
    enableOptimisticUpdates = true,
    enableBatchUpdates = false,
    debounceMs = 1000,
    onInsert,
    onUpdate,
    onDelete,
    onError,
    enabled = true,
  } = options;

  // Core state
  const subscriptionRef = useRef<RealtimeChannel | null>(null);
  const [items, setItems] = useState<T[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Feature integrations
  const offlineQueue = useOfflineQueue();
  const [syncedItems, setSyncedItems] = useCrossTabSync(`realtime-${table}`, items);
  const optimistic = useEnhancedOptimisticUpdate<T>(
    table,
    useCallback((err) => {
      setError(err);
      if (onError) onError(err);
    }, [onError])
  );
  const batch = useBatchUpdates(table, debounceMs);
  const connectionMetrics = useConnectionMetrics();
  const health = useSubscriptionHealth(table);

  // Handle incremental updates
  const handleIncrementalUpdate = useCallback(
    (change: IncrementalUpdate<T>) => {
      if (change.type === 'INSERT' && onInsert && change.new) {
        onInsert(change.new);
      }
      if (change.type === 'UPDATE' && onUpdate) {
        onUpdate(change);
      }
      if (change.type === 'DELETE' && onDelete) {
        onDelete(change.id);
      }

      // Update local state
      setItems(prev => {
        if (change.type === 'INSERT' && change.new) {
          return [...prev, change.new];
        } else if (change.type === 'UPDATE') {
          return prev.map(item =>
            item.id === change.id
              ? { ...item, ...change.changes }
              : item
          );
        } else if (change.type === 'DELETE') {
          return prev.filter(item => item.id !== change.id);
        }
        return prev;
      });

      // Sync to other tabs
      if (enableCrossTabSync) {
        setSyncedItems((prev: T[]) => {
          if (change.type === 'INSERT' && change.new) {
            return [...prev, change.new as T];
          } else if (change.type === 'UPDATE') {
            return prev.map(item =>
              item.id === change.id
                ? { ...item, ...change.changes }
                : item
            );
          } else if (change.type === 'DELETE') {
            return prev.filter(item => item.id !== change.id);
          }
          return prev;
        });
      }

      health.recordMessage?.();
    },
    [onInsert, onUpdate, onDelete, enableCrossTabSync, setSyncedItems, health]
  );

  // Use cross-tab synced items
  useEffect(() => {
    if (enableCrossTabSync && syncedItems.length > 0) {
      setItems(syncedItems);
    }
  }, [syncedItems, enableCrossTabSync]);

  // Initial data fetch and subscription setup
  useEffect(() => {
    if (!enabled) return;

    const setup = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Fetch initial data
        let query = supabase.from(table).select('*');
        
        if (filter) {
          const filterFunc = query[filter.operator];
          if (filterFunc) {
            query = filterFunc(filter.column, filter.value);
          }
        }

        const { data, error: fetchError } = await query;

        if (fetchError) throw fetchError;

        setItems(data || []);
        optimistic.setData(data || []);

        // Set up subscription
        const channel = supabase
          .channel(`enhanced-realtime-${table}-${Date.now()}`)
          .on(
            'postgres_changes',
            {
              event: events.length === 3 ? '*' : events[0],
              schema: 'public',
              table,
            },
            (payload: { eventType: string; new: T | null; old: T | null }) => {
              const change: IncrementalUpdate<T> = {
                id: (payload.new?.id || payload.old?.id || ''),
                type: payload.eventType as RealtimeEvent,
                timestamp: Date.now(),
                changes: payload.new ? (payload.new) : {},
                new: payload.new,
                old: payload.old,
              };

              handleIncrementalUpdate(change);
            }
          )
          .subscribe(status => {
            if (status === 'SUBSCRIBED') {
              health.recordMessage?.();
            } else if (status === 'CLOSED') {
              health.recordError?.();
            }
          });

        subscriptionRef.current = channel;
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        setError(error);
        health.recordError?.();
        if (onError) onError(error);
      } finally {
        setIsLoading(false);
      }
    };

    void setup();

    return () => {
      if (subscriptionRef.current) {
        supabase.removeChannel(subscriptionRef.current);
      }
    };
  }, [table, filter, events, enabled, handleIncrementalUpdate, onError, health, optimistic]);

  // Method to update with offline queue or optimistic updates
  const update = useCallback(
    async (id: string, updates: Partial<T>) => {
      if (!offlineQueue.isOnline && enableOfflineSync) {
        // Queue for later
        offlineQueue.addToQueue({
          id,
          table,
          operation: 'UPDATE',
          data: { id, ...updates },
          timestamp: Date.now(),
        });
        
        // Apply optimistically
        if (enableOptimisticUpdates) {
          optimistic.updateOptimistically(id, updates);
        }
      } else if (enableBatchUpdates) {
        // Batch the update
        batch.addToBatch(id, updates);
        
        // Apply optimistically
        if (enableOptimisticUpdates) {
          optimistic.updateOptimistically(id, updates);
        }
      } else if (enableOptimisticUpdates) {
        // Direct optimistic update
        await optimistic.updateOptimistically(id, updates);
      } else {
        // Direct update
        const { error } = await supabase
          .from(table)
          .update(updates)
          .eq('id', id);
        
        if (error) throw error;
      }
    },
    [table, offlineQueue, enableOfflineSync, enableOptimisticUpdates, enableBatchUpdates, batch, optimistic]
  );

  const insert = useCallback(
    async (data: T) => {
      if (!offlineQueue.isOnline && enableOfflineSync) {
        offlineQueue.addToQueue({
          id: data.id,
          table,
          operation: 'INSERT',
          data,
          timestamp: Date.now(),
        });
      } else {
        const { error } = await supabase.from(table).insert([data]);
        if (error) throw error;
      }
    },
    [table, offlineQueue, enableOfflineSync]
  );

  const remove = useCallback(
    async (id: string) => {
      if (!offlineQueue.isOnline && enableOfflineSync) {
        offlineQueue.addToQueue({
          id,
          table,
          operation: 'DELETE',
          data: { id },
          timestamp: Date.now(),
        });
      } else {
        const { error } = await supabase.from(table).delete().eq('id', id);
        if (error) throw error;
      }
    },
    [table, offlineQueue, enableOfflineSync]
  );

  return {
    // Data and state
    items: enableCrossTabSync ? syncedItems : items,
    isLoading,
    error,

    // Operations
    update,
    insert,
    remove,
    flush: enableBatchUpdates ? batch.flush : undefined,

    // Offline and sync status
    isOnline: offlineQueue.isOnline,
    queueSize: offlineQueue.queueSize,
    syncQueue: offlineQueue.syncQueue,

    // Performance metrics
    connectionMetrics,
    health,
    isSyncing: enableBatchUpdates ? batch.isSyncing : false,
  };
}

// ============================================================================
// Optimized Optimistic Update Hook
// ============================================================================

function useEnhancedOptimisticUpdate<T extends { id: string }>(
  table: string,
  onError?: (error: Error) => void
) {
  const [data, setData] = useState<T[]>([]);
  const pendingRef = useRef<Map<string, { original: T; timeout: NodeJS.Timeout }>>(new Map());

  const updateOptimistically = useCallback(
    async (id: string, updates: Partial<T>) => {
      const original = data.find(item => item.id === id);
      if (!original) return;

      // Clear previous timeout for this item
      if (pendingRef.current.has(id)) {
        clearTimeout(pendingRef.current.get(id)?.timeout);
      }

      // Apply optimistically
      const updated = { ...original, ...updates } as T;
      setData(prev =>
        prev.map(item => (item.id === id ? updated : item))
      );

      // Set rollback timeout (30 seconds)
      const timeout = setTimeout(() => {
        pendingRef.current.delete(id);
      }, 30000);

      pendingRef.current.set(id, { original, timeout });

      try {
        await supabase
          .from(table)
          .update(updates)
          .eq('id', id);

        // Success, clear pending
        if (pendingRef.current.has(id)) {
          clearTimeout(pendingRef.current.get(id)?.timeout);
          pendingRef.current.delete(id);
        }
      } catch (error) {
        // Rollback
        const item = pendingRef.current.get(id);
        if (item) {
          setData(prev =>
            prev.map(i => (i.id === id ? item.original : i))
          );
          clearTimeout(item.timeout);
          pendingRef.current.delete(id);
        }

        if (onError && error instanceof Error) {
          onError(error);
        }
      }
    },
    [data, table, onError]
  );

  return {
    data,
    setData,
    updateOptimistically,
    isPending: (id: string) => pendingRef.current.has(id),
  };
}

// ============================================================================
// Dashboard Stats with Enhanced Real-time
// ============================================================================

export interface DashboardStatsEnhanced {
  totalContributions: number;
  totalAnnouncements: number;
  activeNotifications: number;
  upcomingMeetings: number;
  pendingVotes: number;
  lastUpdated: number;
}

/**
 * Enhanced dashboard stats with real-time incremental updates
 */
export function useDashboardStatsEnhanced() {
  const [stats, setStats] = useState<DashboardStatsEnhanced>({
    totalContributions: 0,
    totalAnnouncements: 0,
    activeNotifications: 0,
    upcomingMeetings: 0,
    pendingVotes: 0,
    lastUpdated: Date.now(),
  });

  // Use incremental updates for contributions
  const contributions = useEnhancedRealtime({
    table: 'contributions',
    enableOfflineSync: true,
    enableCrossTabSync: true,
    onUpdate: (change) => {
      setStats(prev => ({
        ...prev,
        lastUpdated: Date.now(),
      }));
    },
  });

  // Use incremental updates for notifications
  const notifications = useEnhancedRealtime({
    table: 'notifications',
    filter: { column: 'read', operator: 'eq', value: 'false' },
    enableOfflineSync: true,
    enableCrossTabSync: true,
  });

  // Update stats when data changes
  useEffect(() => {
    setStats(prev => ({
      ...prev,
      totalContributions: contributions.items.length,
      activeNotifications: notifications.items.length,
      lastUpdated: Date.now(),
    }));
  }, [contributions.items, notifications.items]);

  return {
    stats,
    isLoading: contributions.isLoading || notifications.isLoading,
    error: contributions.error || notifications.error,
    updateContribution: contributions.update,
    deleteContribution: contributions.remove,
  };
}
