/**
 * Hook for tracking and displaying member activity history
 * Note: This hook requires a member_activities table that may not exist yet.
 * Until that table is created, this provides stub functionality.
 */

import { useState, useEffect } from 'react';
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
  metadata?: Record<string, unknown>;
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
      // The member_activities table doesn't exist yet
      // This is a stub that provides empty data
      setActivities([]);
      setStats({
        lastLogin: null,
        lastContribution: null,
        lastWelfareRequest: null,
        lastProfileUpdate: null,
        totalActivities: 0,
        activitiesByType: {},
      });
      setIsLoading(false);
    } else {
      setIsLoading(false);
    }
  }, [memberId]);

  const recordActivity = async (
    _id: string,
    _activityType: MemberActivity['activity_type'],
    _description: string,
    _metadata?: Record<string, unknown>
  ) => {
    // Stub: member_activities table doesn't exist yet
    console.debug('recordActivity called but member_activities table does not exist');
  };

  return {
    activities,
    stats,
    isLoading,
    recordActivity,
    refreshHistory: () => {
      // No-op until table exists
    },
  };
}

/**
 * Hook to record login activity
 */
export function useRecordLogin(_memberId?: string) {
  const recordLogin = async (_id: string) => {
    // Stub: member_activities table doesn't exist yet
    console.debug('recordLogin called but member_activities table does not exist');
  };

  return { recordLogin };
}

/**
 * Hook to record contribution activity
 */
export function useRecordContribution(_memberId?: string) {
  const recordContribution = async (
    _id: string,
    _amount: number,
    _type: string,
    _reference?: string
  ) => {
    // Stub: member_activities table doesn't exist yet
    console.debug('recordContribution called but member_activities table does not exist');
  };

  return { recordContribution };
}

/**
 * Hook to record welfare request
 */
export function useRecordWelfareRequest(_memberId?: string) {
  const recordWelfareRequest = async (
    _id: string,
    _caseType: string,
    _amount?: number
  ) => {
    // Stub: member_activities table doesn't exist yet
    console.debug('recordWelfareRequest called but member_activities table does not exist');
  };

  return { recordWelfareRequest };
}
