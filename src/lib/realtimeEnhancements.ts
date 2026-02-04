/**
 * Phase 6: Real-time Subscriptions Enhancement
 * Advanced real-time patterns with incremental updates, offline handling, and cross-tab sync
 * 
 * File: src/lib/realtimeEnhancements.ts
 * Purpose: Enhance Supabase real-time with incremental updates, change tracking, and sync
 */

import { useEffect, useRef, useCallback, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { RealtimeChannel } from '@supabase/supabase-js';

// ============================================================================
// Types for Real-time Enhancements
// ============================================================================

export type ChangeType = 'INSERT' | 'UPDATE' | 'DELETE';

export interface RealtimeChange<T = Record<string, unknown>> {
  type: ChangeType;
  old: T | null;
  new: T | null;
  timestamp: number;
  id?: string;
}

export interface IncrementalUpdate<T = Record<string, unknown>> {
  id: string;
  changes: Partial<T>;
  timestamp: number;
  type: ChangeType;
  new?: T | null;
  old?: T | null;
}

export interface SyncState {
  isSyncing: boolean;
  lastSyncTime: number | null;
  pendingChanges: IncrementalUpdate[];
  conflictResolution: 'remote-wins' | 'local-wins' | 'merge';
}

export interface OfflineQueueItem {
  id: string;
  table: string;
  operation: ChangeType;
  data: Record<string, unknown>;
  timestamp: number;
  retryCount: number;
}

// Valid table names from the database schema
type ValidTableName = 'profiles' | 'contributions' | 'announcements' | 'notifications' | 
  'meetings' | 'welfare_cases' | 'messages' | 'audit_logs' | 'discipline_records' | 
  'mpesa_transactions' | 'votes' | 'voting_motions' | 'user_roles' | 'members';

// ============================================================================
// Change Detection and Diff Utility
// ============================================================================

/**
 * Calculate diff between old and new objects
 * Returns only changed fields for efficient transmission
 */
export function calculateDiff<T extends Record<string, unknown>>(
  old: T | null,
  new_: T | null
): Partial<T> {
  if (!old) return (new_ || {}) as Partial<T>;
  if (!new_) return {};

  const diff: Partial<T> = {};
  
  for (const key in new_) {
    if (JSON.stringify(old[key]) !== JSON.stringify(new_[key])) {
      diff[key] = new_[key];
    }
  }

  return diff;
}

/**
 * Deep merge objects (for conflict resolution)
 */
export function deepMerge<T extends Record<string, unknown>>(
  base: T,
  update: Partial<T>,
  remoteUpdate: Partial<T>,
  strategy: 'remote-wins' | 'local-wins' | 'merge' = 'merge'
): T {
  const result = { ...base };

  if (strategy === 'remote-wins') {
    return { ...result, ...remoteUpdate } as T;
  }

  if (strategy === 'local-wins') {
    return { ...result, ...update } as T;
  }

  // merge strategy: combine changes, with remote taking precedence for conflicting fields
  return {
    ...result,
    ...update,
    ...remoteUpdate,
  } as T;
}

/**
 * Track changes between renders
 */
export function useChangeTracking<T extends Record<string, unknown>>(data: T | null) {
  const previousDataRef = useRef<T | null>(null);
  const [changes, setChanges] = useState<Partial<T>>({});

  useEffect(() => {
    if (previousDataRef.current && data) {
      const diff = calculateDiff(previousDataRef.current, data);
      setChanges(diff);
    }
    previousDataRef.current = data;
  }, [data]);

  return changes;
}

// ============================================================================
// Incremental Update Stream
// ============================================================================

/**
 * Process incremental updates instead of full row updates
 * Converts postgres_changes into optimized update events
 */
export function useIncrementalUpdates(
  table: string,
  onUpdate?: (change: IncrementalUpdate<Record<string, unknown>>) => void
) {
  const subscriptionRef = useRef<RealtimeChannel | null>(null);
  const lastStateRef = useRef<Record<string, Record<string, unknown>>>({});

  useEffect(() => {
    const channel = supabase.channel(`incremental-${table}`);

    channel.on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table,
      },
      (payload: { eventType: string; old: Record<string, unknown> | null; new: Record<string, unknown> | null }) => {
        const change: IncrementalUpdate<Record<string, unknown>> = {
          id: (payload.new?.id || payload.old?.id || String(Date.now())) as string,
          type: payload.eventType as ChangeType,
          timestamp: Date.now(),
          changes: calculateDiff(
            payload.old || {},
            payload.new || {}
          ),
        };

        // Update local cache
        if (payload.eventType === 'DELETE') {
          delete lastStateRef.current[change.id];
        } else if (payload.new) {
          lastStateRef.current[change.id] = payload.new;
        }

        if (onUpdate) {
          onUpdate(change);
        }
      }
    );

    channel.subscribe();
    subscriptionRef.current = channel;

    return () => {
      if (subscriptionRef.current) {
        supabase.removeChannel(subscriptionRef.current);
      }
    };
  }, [table, onUpdate]);

  return lastStateRef.current;
}

// ============================================================================
// Cross-Tab Synchronization
// ============================================================================

/**
 * Sync data across browser tabs using BroadcastChannel API
 */
export function useCrossTabSync<T extends Record<string, unknown> = Record<string, unknown>>(
  key: string,
  initialValue: T
) {
  const [value, setValue] = useState<T>(initialValue);
  const broadcastChannelRef = useRef<BroadcastChannel | null>(null);

  useEffect(() => {
    // Create broadcast channel for cross-tab communication
    if (typeof globalThis !== 'undefined' && 'BroadcastChannel' in globalThis) {
      try {
        const channel = new BroadcastChannel(`sync-${key}`);
        broadcastChannelRef.current = channel;

        // Listen for messages from other tabs
        channel.onmessage = (event) => {
          if (event.data.type === 'UPDATE') {
            setValue(event.data.value);
          }
        };

        return () => {
          channel.close();
        };
      } catch {
        // BroadcastChannel not supported, skip cross-tab sync
      }
    }
  }, [key]);

  // Broadcast updates to other tabs
  const updateValue = useCallback((newValue: T) => {
    setValue(newValue);
    if (broadcastChannelRef.current) {
      broadcastChannelRef.current.postMessage({
        type: 'UPDATE',
        value: newValue,
      });
    }
  }, []);

  return [value, updateValue] as const;
}

// ============================================================================
// Offline Queue Management
// ============================================================================

/**
 * Queue operations when offline, sync when back online
 */
export function useOfflineQueue() {
  const queueRef = useRef<OfflineQueueItem[]>([]);
  const [isOnline, setIsOnline] = useState(
    typeof globalThis !== 'undefined' && 'navigator' in globalThis
      ? globalThis.navigator.onLine
      : true
  );
  const [queueSize, setQueueSize] = useState(0);

  const syncQueue = useCallback(async () => {
    const queue = queueRef.current;
    
    for (let i = queue.length - 1; i >= 0; i--) {
      const item = queue[i];
      
      try {
        // Type-safe table access
        const tableName = item.table as ValidTableName;
        const data = item.data as Record<string, unknown>;
        
        // Execute operation with type assertion to bypass strict typing
        const tableRef = supabase.from(tableName as 'profiles') as any;
        
        if (item.operation === 'INSERT') {
          await tableRef.insert([data]);
        } else if (item.operation === 'UPDATE') {
          await tableRef.update(data).eq('id', data.id as string);
        } else if (item.operation === 'DELETE') {
          await tableRef.delete().eq('id', data.id as string);
        }

        // Remove from queue on success
        queue.splice(i, 1);
      } catch (error) {
        // Retry with exponential backoff
        item.retryCount++;
        const maxRetries = 3;
        
        if (item.retryCount >= maxRetries) {
          console.error(`Failed to sync item after ${maxRetries} retries:`, item);
          queue.splice(i, 1);
        }
      }
    }

    setQueueSize(queue.length);
  }, []);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      // Trigger sync
      void syncQueue();
    };

    const handleOffline = () => {
      setIsOnline(false);
    };

    if (typeof globalThis !== 'undefined' && 'addEventListener' in globalThis) {
      globalThis.addEventListener('online', handleOnline);
      globalThis.addEventListener('offline', handleOffline);

      return () => {
        globalThis.removeEventListener('online', handleOnline);
        globalThis.removeEventListener('offline', handleOffline);
      };
    }
  }, [syncQueue]);

  const addToQueue = useCallback(
    (item: Omit<OfflineQueueItem, 'retryCount'>) => {
      const queueItem: OfflineQueueItem = {
        ...item,
        retryCount: 0,
      };
      
      queueRef.current.push(queueItem);
      setQueueSize(queueRef.current.length);

      // Auto-sync if online
      if (isOnline) {
        void syncQueue();
      }
    },
    [isOnline, syncQueue]
  );

  return {
    isOnline,
    queueSize,
    addToQueue,
    syncQueue,
  };
}

// ============================================================================
// Optimistic Updates with Rollback
// ============================================================================

/**
 * Apply local updates immediately, rollback on failure
 */
export function useOptimisticUpdate<T extends { id: string }>(
  table: ValidTableName,
  onError?: (error: Error) => void
) {
  const [data, setData] = useState<T[]>([]);
  const pendingUpdatesRef = useRef<Map<string, T>>(new Map());

  const updateOptimistically = useCallback(
    async (id: string, updates: Partial<T>) => {
      // Find current item
      const currentItem = data.find(item => item.id === id);
      if (!currentItem) return;

      // Store for rollback
      pendingUpdatesRef.current.set(id, currentItem);

      // Apply optimistically
      const updatedItem = { ...currentItem, ...updates } as T;
      setData(prev =>
        prev.map(item => (item.id === id ? updatedItem : item))
      );

      // Try to persist
      try {
        await supabase
          .from(table)
          .update(updates as Record<string, unknown>)
          .eq('id', id);

        // Success, clear pending
        pendingUpdatesRef.current.delete(id);
      } catch (error) {
        // Rollback
        const original = pendingUpdatesRef.current.get(id);
        if (original) {
          setData(prev =>
            prev.map(item => (item.id === id ? original : item))
          );
          pendingUpdatesRef.current.delete(id);
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
    isPending: (id: string) => pendingUpdatesRef.current.has(id),
  };
}

// ============================================================================
// Batch Updates with Debouncing
// ============================================================================

/**
 * Batch multiple updates together for efficiency
 */
export function useBatchUpdates(
  table: ValidTableName,
  debounceMs: number = 1000
) {
  const batchRef = useRef<Map<string, Record<string, unknown>>>(new Map());
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);

  const addToBatch = useCallback(
    (id: string, updates: Record<string, unknown>) => {
      // Merge with existing updates for this id
      const existing = batchRef.current.get(id) || {};
      batchRef.current.set(id, { ...existing, ...updates });

      // Debounce the sync
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      timeoutRef.current = setTimeout(async () => {
        setIsSyncing(true);

        try {
          // Send all batched updates
          for (const [itemId, itemUpdates] of batchRef.current.entries()) {
            await supabase
              .from(table)
              .update(itemUpdates)
              .eq('id', itemId);
          }

          // Clear batch on success
          batchRef.current.clear();
        } catch (error) {
          console.error('Batch update failed:', error);
        } finally {
          setIsSyncing(false);
        }
      }, debounceMs);
    },
    [table, debounceMs]
  );

  const flush = useCallback(async () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    setIsSyncing(true);

    try {
      for (const [id, updates] of batchRef.current.entries()) {
        await supabase
          .from(table)
          .update(updates)
          .eq('id', id);
      }

      batchRef.current.clear();
    } finally {
      setIsSyncing(false);
    }
  }, [table]);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return {
    addToBatch,
    flush,
    isSyncing,
    batchSize: batchRef.current.size,
  };
}

// ============================================================================
// Connection State and Latency Detection
// ============================================================================

/**
 * Detect connection quality and latency
 */
export function useConnectionMetrics() {
  const [latency, setLatency] = useState(0);
  const [isHighLatency, setIsHighLatency] = useState(false);

  useEffect(() => {
    const measureLatency = async () => {
      const start = performance.now();

      try {
        // Simple health check query
        await supabase.from('profiles').select('id', { count: 'exact', head: true });
        const duration = performance.now() - start;
        
        setLatency(Math.round(duration));
        setIsHighLatency(duration > 500); // 500ms threshold
      } catch {
        setIsHighLatency(true);
      }
    };

    // Measure on mount
    void measureLatency();

    // Measure every 30 seconds
    const interval = setInterval(() => {
      void measureLatency();
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  return {
    latency,
    isHighLatency,
  };
}

// ============================================================================
// Subscription Health Monitoring
// ============================================================================

export interface SubscriptionHealth {
  isConnected: boolean;
  messageCount: number;
  errorCount: number;
  lastMessageTime: number | null;
  averageLatency: number;
  recordMessage?: () => void;
  recordError?: () => void;
}

/**
 * Monitor subscription health and performance
 */
export function useSubscriptionHealth(channelName: string) {
  const [health, setHealth] = useState<Omit<SubscriptionHealth, 'recordMessage' | 'recordError'>>({
    isConnected: true,
    messageCount: 0,
    errorCount: 0,
    lastMessageTime: null,
    averageLatency: 0,
  });

  const latenciesRef = useRef<number[]>([]);
  const lastTimestampRef = useRef<number>(0);

  const recordMessage = useCallback(() => {
    const now = Date.now();
    
    if (lastTimestampRef.current > 0) {
      const latency = now - lastTimestampRef.current;
      latenciesRef.current.push(latency);
      
      // Keep only last 100 measurements
      if (latenciesRef.current.length > 100) {
        latenciesRef.current.shift();
      }
    }

    lastTimestampRef.current = now;

    setHealth(prev => ({
      ...prev,
      messageCount: prev.messageCount + 1,
      lastMessageTime: now,
      averageLatency: latenciesRef.current.length > 0
        ? Math.round(
            latenciesRef.current.reduce((a, b) => a + b, 0) / latenciesRef.current.length
          )
        : 0,
    }));
  }, []);

  const recordError = useCallback(() => {
    setHealth(prev => ({
      ...prev,
      errorCount: prev.errorCount + 1,
      isConnected: false,
    }));
  }, []);

  return {
    ...health,
    recordMessage,
    recordError,
  } as SubscriptionHealth;
}
