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

const resolvedDisciplineStatuses = new Set(['resolved', 'closed', 'completed', 'dismissed']);
const inactiveWelfareStatuses = new Set(['resolved', 'closed', 'completed', 'inactive']);

const toNumber = (value: unknown) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const isWithinThisMonth = (isoDate: string | null, monthStart: Date) => {
  if (!isoDate) return false;
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) return false;
  return date >= monthStart;
};

const lower = (value: unknown) => String(value ?? '').trim().toLowerCase();

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

  const safeCount = async (
    label: string,
    runner: () => Promise<{ count: number | null; error: unknown }>
  ) => {
    try {
      const { count, error: queryError } = await runner();
      if (queryError) {
        console.warn(`[dashboard-stats] ${label} count failed`, queryError);
        return 0;
      }
      return count ?? 0;
    } catch (caughtError) {
      console.warn(`[dashboard-stats] ${label} count threw`, caughtError);
      return 0;
    }
  };

  const safeRows = async <TRow extends Record<string, unknown>>(
    label: string,
    runner: () => Promise<{ data: TRow[] | null; error: unknown }>
  ) => {
    try {
      const { data, error: queryError } = await runner();
      if (queryError) {
        console.warn(`[dashboard-stats] ${label} rows failed`, queryError);
        return [] as TRow[];
      }
      return (data ?? []) as TRow[];
    } catch (caughtError) {
      console.warn(`[dashboard-stats] ${label} rows threw`, caughtError);
      return [] as TRow[];
    }
  };

  const refresh = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);

    try {
      const [
        totalMembers,
        activeMembers,
        pendingApprovals,
        upcomingMeetings,
        publishedAnnouncements,
        documentsCount,
        unreadPrivateMessages,
        contributionRows,
        mpesaRows,
        meetingMinutesRows,
        disciplineRows,
        welfareRows,
      ] = await Promise.all([
        safeCount('profiles.total', () =>
          supabase.from('profiles').select('id', { count: 'exact', head: true })
        ),
        safeCount('profiles.active', () =>
          supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('status', 'active')
        ),
        safeCount('profiles.pending', () =>
          supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('status', 'pending')
        ),
        safeCount('meetings.upcoming', () =>
          supabase
            .from('meetings')
            .select('id', { count: 'exact', head: true })
            .eq('status', 'scheduled')
            .gte('scheduled_date', new Date().toISOString())
        ),
        safeCount('announcements.published', () =>
          supabase
            .from('announcements')
            .select('id', { count: 'exact', head: true })
            .eq('published', true)
        ),
        safeCount('documents.total', () =>
          supabase.from('documents').select('id', { count: 'exact', head: true })
        ),
        safeCount('private_messages.unread', () =>
          supabase.from('private_messages').select('id', { count: 'exact', head: true }).is('read_at', null)
        ),
        safeRows<{ amount: number; status: string | null; created_at: string | null }>('contributions.summary', () =>
          supabase.from('contributions').select('amount, status, created_at')
        ),
        safeRows<{ status: string | null; created_at: string }>('mpesa.summary', () =>
          supabase.from('mpesa_transactions').select('status, created_at')
        ),
        safeRows<{ status: string | null }>('meeting_minutes.summary', () =>
          supabase.from('meeting_minutes').select('status')
        ),
        safeRows<{ status: string | null; fine_amount: number | null; fine_paid: boolean | null; updated_at: string | null }>(
          'discipline.summary',
          () => supabase.from('discipline_records').select('status, fine_amount, fine_paid, updated_at')
        ),
        safeRows<{ status: string | null }>('welfare.summary', () =>
          supabase.from('welfare_cases').select('status')
        ),
      ]);

      const paidContributions = contributionRows.filter((row) => lower(row.status) === 'paid');
      const pendingContributions = contributionRows.filter((row) => lower(row.status) === 'pending');
      const missedContributionsCount = contributionRows.filter((row) => lower(row.status) === 'missed').length;

      const totalCollectedAmount = paidContributions.reduce((sum, row) => sum + toNumber(row.amount), 0);
      const collectedThisMonthAmount = paidContributions
        .filter((row) => isWithinThisMonth(row.created_at, monthStart))
        .reduce((sum, row) => sum + toNumber(row.amount), 0);
      const pendingContributionsAmount = pendingContributions.reduce(
        (sum, row) => sum + toNumber(row.amount),
        0
      );

      const mpesaCompletedCount = mpesaRows.filter((row) => {
        const status = lower(row.status);
        return status === 'completed' || status === 'success';
      }).length;
      const mpesaThisMonthCount = mpesaRows.filter((row) => isWithinThisMonth(row.created_at, monthStart)).length;

      const meetingMinutesDraftCount = meetingMinutesRows.filter((row) => lower(row.status) === 'draft').length;
      const meetingMinutesApprovedCount = meetingMinutesRows.filter((row) => lower(row.status) === 'approved').length;

      const disciplineOpenCases = disciplineRows.filter(
        (row) => !resolvedDisciplineStatuses.has(lower(row.status))
      ).length;
      const disciplineResolvedThisMonth = disciplineRows.filter(
        (row) => resolvedDisciplineStatuses.has(lower(row.status)) && isWithinThisMonth(row.updated_at, monthStart)
      ).length;
      const finesOutstandingAmount = disciplineRows.reduce((sum, row) => {
        if (row.fine_paid) return sum;
        return sum + toNumber(row.fine_amount);
      }, 0);

      const welfareActiveCases = welfareRows.filter(
        (row) => !inactiveWelfareStatuses.has(lower(row.status))
      ).length;

      setStats({
        totalMembers,
        activeMembers,
        pendingApprovals,
        upcomingMeetings,
        publishedAnnouncements,
        totalCollectedAmount,
        collectedThisMonthAmount,
        pendingContributionsCount: pendingContributions.length,
        pendingContributionsAmount,
        missedContributionsCount,
        mpesaCompletedCount,
        mpesaThisMonthCount,
        documentsCount,
        meetingMinutesDraftCount,
        meetingMinutesApprovedCount,
        disciplineOpenCases,
        disciplineResolvedThisMonth,
        finesOutstandingAmount,
        welfareActiveCases,
        unreadPrivateMessages,
      });
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

