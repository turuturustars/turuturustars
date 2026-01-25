import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Logger } from '@/utils/errorHandler';
import { dashboardStatsCache, CACHE_KEYS } from '@/lib/queryCache';

export interface DashboardStats {
  totalMembers: number;
  activeMembers: number;
  pendingApprovals: number;
  announcements: number;
  upcomingMeetings?: number;
}

export function useDashboardStats() {
  const [stats, setStats] = useState<DashboardStats>({
    totalMembers: 0,
    activeMembers: 0,
    pendingApprovals: 0,
    announcements: 0,
    upcomingMeetings: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      setError(null);
      
      // Check cache first
      const cached = dashboardStatsCache.get<DashboardStats>(CACHE_KEYS.DASHBOARD_STATS);
      if (cached) {
        setStats(cached);
        setIsLoading(false);
        return;
      }
      
      const [
        { count: totalCount },
        { count: activeCount },
        { count: approvalsCount },
        { count: announcementsCount },
        { data: upcomingData },
      ] = await Promise.all([
        supabase
          .from('profiles')
          .select('id', { count: 'exact', head: true }),
        supabase
          .from('profiles')
          .select('id', { count: 'exact', head: true })
          .eq('status', 'active'),
        supabase
          .from('profiles')
          .select('id', { count: 'exact', head: true })
          .eq('status', 'pending'),
        supabase
          .from('announcements')
          .select('id', { count: 'exact', head: true })
          .eq('published', true),
        supabase
          .from('meetings')
          .select('id')
          .eq('status', 'scheduled')
          .gt('scheduled_date', new Date().toISOString()),
      ]);

      const newStats = {
        totalMembers: totalCount || 0,
        activeMembers: activeCount || 0,
        pendingApprovals: approvalsCount || 0,
        announcements: announcementsCount || 0,
        upcomingMeetings: upcomingData?.length || 0,
      };

      // Cache the results (10 minute TTL)
      dashboardStatsCache.set(CACHE_KEYS.DASHBOARD_STATS, newStats, 10 * 60 * 1000);
      setStats(newStats);
    } catch (err) {
      Logger.error('Failed to fetch dashboard stats', err);
      setError(err instanceof Error ? err : new Error('Failed to fetch stats'));
    } finally {
      setIsLoading(false);
    }
  };

  return { stats, isLoading, error, refetch: fetchStats };
}
