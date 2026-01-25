/**
 * Hook for tracking and displaying member activity history
 */

import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface MemberActivity {
  id: string;
  member_id: string;
  activity_type:
    | 'login'
    | 'contribution'
    | 'welfare_request'
    | 'profile_update'
    | 'role_change'
    | 'payment';
  description: string;
  created_at: string;
  metadata?: Record<string, any>;
}

export interface MemberActivityStats {
  lastLogin: string | null;
  lastContribution: string | null;
  lastWelfareRequest: string | null;
  lastProfileUpdate: string | null;
  totalActivities: number;
  activitiesByType: Record<string, number>;
}

export function useMemberActivityHistory(memberId?: string) {
  const [activities, setActivities] = useState<MemberActivity[]>([]);
  const [stats, setStats] = useState<MemberActivityStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    if (memberId) {
      fetchActivityHistory(memberId);
    }
  }, [memberId]);

  const fetchActivityHistory = async (id: string) => {
    try {
      const { data, error } = await supabase
        .from('member_activities')
        .select('*')
        .eq('member_id', id)
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;

      if (data) {
        setActivities(data as MemberActivity[]);
        calculateStats(data as MemberActivity[]);
      }
    } catch (error) {
      console.error('Error fetching activity history:', error);
      toast({
        title: 'Error',
        description: 'Failed to load activity history',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const calculateStats = (activities: MemberActivity[]) => {
    const activityTypes: Record<string, number> = {};

    activities.forEach((activity) => {
      activityTypes[activity.activity_type] = (activityTypes[activity.activity_type] || 0) + 1;
    });

    const stats: MemberActivityStats = {
      lastLogin:
        activities.find((a) => a.activity_type === 'login')?.created_at || null,
      lastContribution:
        activities.find((a) => a.activity_type === 'contribution')?.created_at || null,
      lastWelfareRequest:
        activities.find((a) => a.activity_type === 'welfare_request')?.created_at || null,
      lastProfileUpdate:
        activities.find((a) => a.activity_type === 'profile_update')?.created_at ||
        null,
      totalActivities: activities.length,
      activitiesByType: activityTypes,
    };

    setStats(stats);
  };

  const recordActivity = async (
    id: string,
    activityType: MemberActivity['activity_type'],
    description: string,
    metadata?: Record<string, any>
  ) => {
    try {
      const { error } = await supabase.from('member_activities').insert({
        member_id: id,
        activity_type: activityType,
        description,
        metadata,
        created_at: new Date().toISOString(),
      });

      if (error) throw error;

      // Refresh activity history
      if (memberId === id) {
        await fetchActivityHistory(id);
      }
    } catch (error) {
      console.error('Error recording activity:', error);
    }
  };

  return {
    activities,
    stats,
    isLoading,
    recordActivity,
    refreshHistory: () => memberId && fetchActivityHistory(memberId),
  };
}

/**
 * Hook to record login activity
 */
export function useRecordLogin(memberId?: string) {
  const { recordActivity } = useMemberActivityHistory(memberId);

  const recordLogin = async (id: string) => {
    await recordActivity(id, 'login', 'User logged in', {
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
    });
  };

  return { recordLogin };
}

/**
 * Hook to record contribution activity
 */
export function useRecordContribution(memberId?: string) {
  const { recordActivity } = useMemberActivityHistory(memberId);

  const recordContribution = async (
    id: string,
    amount: number,
    type: string,
    reference?: string
  ) => {
    await recordActivity(id, 'contribution', `Contributed ${type}`, {
      amount,
      type,
      reference,
      timestamp: new Date().toISOString(),
    });
  };

  return { recordContribution };
}

/**
 * Hook to record welfare request
 */
export function useRecordWelfareRequest(memberId?: string) {
  const { recordActivity } = useMemberActivityHistory(memberId);

  const recordWelfareRequest = async (
    id: string,
    caseType: string,
    amount?: number
  ) => {
    await recordActivity(id, 'welfare_request', `Created welfare request: ${caseType}`, {
      caseType,
      amount,
      timestamp: new Date().toISOString(),
    });
  };

  return { recordWelfareRequest };
}
