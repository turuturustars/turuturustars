import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface OfficialDashboardStats {
  totalMembers: number;
  activeMembers: number;
  pendingApprovals: number;
  upcomingMeetings: number;
  publishedAnnouncements: number;
  totalCollectedAmount: number;
  collectedThisMonthAmount: number;
  pendingContributionsCount: number;
  pendingContributionsAmount: number;
  missedContributionsCount: number;
  mpesaCompletedCount: number;
  mpesaThisMonthCount: number;
  documentsCount: number;
  meetingMinutesDraftCount: number;
  meetingMinutesApprovedCount: number;
  disciplineOpenCases: number;
  disciplineResolvedThisMonth: number;
  finesOutstandingAmount: number;
  welfareActiveCases: number;
  unreadPrivateMessages: number;
}

const defaultStats: OfficialDashboardStats = {
  totalMembers: 0,
  activeMembers: 0,
  pendingApprovals: 0,
  upcomingMeetings: 0,
  publishedAnnouncements: 0,
  totalCollectedAmount: 0,
  collectedThisMonthAmount: 0,
  pendingContributionsCount: 0,
  pendingContributionsAmount: 0,
  missedContributionsCount: 0,
  mpesaCompletedCount: 0,
  mpesaThisMonthCount: 0,
  documentsCount: 0,
  meetingMinutesDraftCount: 0,
  meetingMinutesApprovedCount: 0,
  disciplineOpenCases: 0,
  disciplineResolvedThisMonth: 0,
  finesOutstandingAmount: 0,
  welfareActiveCases: 0,
  unreadPrivateMessages: 0,
};

type OfficialDashboardStatsRpcRow = {
  total_members?: number | string | null;
  active_members?: number | string | null;
  pending_approvals?: number | string | null;
  upcoming_meetings?: number | string | null;
  published_announcements?: number | string | null;
  total_collected_amount?: number | string | null;
  collected_this_month_amount?: number | string | null;
  pending_contributions_count?: number | string | null;
  pending_contributions_amount?: number | string | null;
  missed_contributions_count?: number | string | null;
  mpesa_completed_count?: number | string | null;
  mpesa_this_month_count?: number | string | null;
  documents_count?: number | string | null;
  meeting_minutes_draft_count?: number | string | null;
  meeting_minutes_approved_count?: number | string | null;
  discipline_open_cases?: number | string | null;
  discipline_resolved_this_month?: number | string | null;
  fines_outstanding_amount?: number | string | null;
  welfare_active_cases?: number | string | null;
  unread_private_messages?: number | string | null;
};

const toNumber = (value: unknown) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const toCount = (value: unknown) => Math.trunc(toNumber(value));

const mapStatsRow = (row: OfficialDashboardStatsRpcRow | null | undefined): OfficialDashboardStats => ({
  totalMembers: toCount(row?.total_members),
  activeMembers: toCount(row?.active_members),
  pendingApprovals: toCount(row?.pending_approvals),
  upcomingMeetings: toCount(row?.upcoming_meetings),
  publishedAnnouncements: toCount(row?.published_announcements),
  totalCollectedAmount: toNumber(row?.total_collected_amount),
  collectedThisMonthAmount: toNumber(row?.collected_this_month_amount),
  pendingContributionsCount: toCount(row?.pending_contributions_count),
  pendingContributionsAmount: toNumber(row?.pending_contributions_amount),
  missedContributionsCount: toCount(row?.missed_contributions_count),
  mpesaCompletedCount: toCount(row?.mpesa_completed_count),
  mpesaThisMonthCount: toCount(row?.mpesa_this_month_count),
  documentsCount: toCount(row?.documents_count),
  meetingMinutesDraftCount: toCount(row?.meeting_minutes_draft_count),
  meetingMinutesApprovedCount: toCount(row?.meeting_minutes_approved_count),
  disciplineOpenCases: toCount(row?.discipline_open_cases),
  disciplineResolvedThisMonth: toCount(row?.discipline_resolved_this_month),
  finesOutstandingAmount: toNumber(row?.fines_outstanding_amount),
  welfareActiveCases: toCount(row?.welfare_active_cases),
  unreadPrivateMessages: toCount(row?.unread_private_messages),
});

export const formatKES = (amount: number) =>
  new Intl.NumberFormat('en-KE', {
    style: 'currency',
    currency: 'KES',
    maximumFractionDigits: 0,
  }).format(amount);

export const useOfficialDashboardStats = () => {
  const [stats, setStats] = useState<OfficialDashboardStats>(defaultStats);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const { data, error: rpcError } = await supabase
        .rpc('get_official_dashboard_stats' as never)
        .maybeSingle();

      if (rpcError) throw rpcError;

      setStats(mapStatsRow(data as OfficialDashboardStatsRpcRow | null));
    } catch (caughtError) {
      console.error('Failed to refresh official dashboard stats', caughtError);
      setError('Unable to load fresh dashboard metrics');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return {
    stats,
    isLoading,
    error,
    refresh,
  };
};

