/**
 * Enhanced Real-time Hooks - Simplified version
 */

import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

type ValidTable = 'profiles' | 'contributions' | 'announcements' | 'notifications' | 'meetings' | 'welfare_cases' | 'messages';

export interface IncrementalUpdate<T> {
  id: string;
  type: 'INSERT' | 'UPDATE' | 'DELETE';
  timestamp: number;
  changes: Partial<T>;
  new?: T | null;
  old?: T | null;
}

export interface UseEnhancedRealtimeOptions<T> {
  table: ValidTable;
  onInsert?: (item: T) => void;
  onUpdate?: (change: IncrementalUpdate<T>) => void;
  onDelete?: (id: string) => void;
  onError?: (error: Error) => void;
  enabled?: boolean;
}

export function useEnhancedRealtime<T extends { id: string }>(
  options: UseEnhancedRealtimeOptions<T>
) {
  const { table, onInsert, onUpdate, onDelete, onError, enabled = true } = options;

  const [items, setItems] = useState<T[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!enabled) return;

    const fetchData = async () => {
      try {
        setIsLoading(true);
        const { data, error: fetchError } = await supabase.from(table).select('*');
        if (fetchError) throw fetchError;
        // Cast through unknown to handle type mismatch
        setItems((data || []) as unknown as T[]);
      } catch (err) {
        const e = err instanceof Error ? err : new Error(String(err));
        setError(e);
        onError?.(e);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [table, enabled, onError]);

  const update = useCallback(
    async (id: string, updates: Partial<T>) => {
      try {
        const { error } = await (supabase.from(table) as any).update(updates as any).eq('id', id);
        if (error) throw error;
      } catch (err) {
        console.error('Update error:', err);
        throw err;
      }
    },
    [table]
  );

  const insert = useCallback(
    async (data: Omit<T, 'id'>) => {
      try {
        const { error } = await (supabase.from(table) as any).insert([data as any]);
        if (error) throw error;
      } catch (err) {
        console.error('Insert error:', err);
        throw err;
      }
    },
    [table]
  );

  const remove = useCallback(
    async (id: string) => {
      const { error } = await supabase.from(table).delete().eq('id', id);
      if (error) throw error;
    },
    [table]
  );

  return { items, isLoading, error, update, insert, remove, isOnline: true, queueSize: 0 };
}

export interface DashboardStatsEnhanced {
  totalContributions: number;
  totalAnnouncements: number;
  activeNotifications: number;
  upcomingMeetings: number;
  pendingVotes: number;
  lastUpdated: number;
}

export function useDashboardStatsEnhanced() {
  const contributions = useEnhancedRealtime<{ id: string }>({ table: 'contributions' });
  const notifications = useEnhancedRealtime<{ id: string }>({ table: 'notifications' });

  const stats: DashboardStatsEnhanced = {
    totalContributions: contributions.items.length,
    totalAnnouncements: 0,
    activeNotifications: notifications.items.length,
    upcomingMeetings: 0,
    pendingVotes: 0,
    lastUpdated: Date.now(),
  };

  return {
    stats,
    isLoading: contributions.isLoading || notifications.isLoading,
    error: contributions.error || notifications.error,
    updateContribution: contributions.update,
    deleteContribution: contributions.remove,
  };
}
