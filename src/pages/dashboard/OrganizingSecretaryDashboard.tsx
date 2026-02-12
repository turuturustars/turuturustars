import { useNavigate } from 'react-router-dom';
import { AccessibleStatus, useStatus } from '@/components/accessible';
import {
  OfficialDashboardHero,
  OfficialMetricCard,
  OfficialQuickActionCard,
  OfficialResponsibilityCard,
} from '@/components/dashboard/officials/OfficialDashboardPrimitives';
import { formatKES, useOfficialDashboardStats } from '@/hooks/useOfficialDashboardStats';
import {
  CalendarDays,
  ClipboardList,
  Gavel,
  HandCoins,
  ListChecks,
  ShieldAlert,
  ShieldCheck,
  Users,
} from 'lucide-react';

const OrganizingSecretaryDashboard = () => {
  const navigate = useNavigate();
  const { status: statusMessage } = useStatus();
  const { stats, isLoading } = useOfficialDashboardStats();

  return (
    <div className="space-y-6 pb-8">
      <AccessibleStatus
        message={statusMessage.message}
        type={statusMessage.type}
        isVisible={statusMessage.isVisible}
      />

      <OfficialDashboardHero
        title="Organizing Secretary Dashboard"
        subtitle="Coordinate meetings, manage discipline records, and track penalties with live operational insights."
        icon={ShieldAlert}
        badgeLabel="Organizing Secretary"
        gradientClassName="bg-gradient-to-br from-orange-700 via-amber-600 to-yellow-500"
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <OfficialMetricCard
          title="Scheduled Meetings"
          value={stats.upcomingMeetings}
          caption="Upcoming sessions to organize"
          icon={CalendarDays}
          tone="blue"
          isLoading={isLoading}
        />
        <OfficialMetricCard
          title="Open Discipline Cases"
          value={stats.disciplineOpenCases}
          caption="Cases pending resolution"
          icon={Gavel}
          tone="rose"
          isLoading={isLoading}
        />
        <OfficialMetricCard
          title="Outstanding Fines"
          value={formatKES(stats.finesOutstandingAmount)}
          caption="Uncleared penalties on record"
          icon={HandCoins}
          tone="amber"
          isLoading={isLoading}
        />
        <OfficialMetricCard
          title="Resolved This Month"
          value={stats.disciplineResolvedThisMonth}
          caption="Cases closed in current month"
          icon={ListChecks}
          tone="emerald"
          isLoading={isLoading}
        />
      </div>

      <div>
        <h2 className="mb-4 text-xl font-semibold">Operational Controls</h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          <OfficialQuickActionCard
            title="Meeting Logistics"
            description="Coordinate venue, agenda support, and attendance readiness."
            icon={CalendarDays}
            tone="blue"
            badge={`${stats.upcomingMeetings} scheduled`}
            onClick={() => navigate('/dashboard/governance/meetings')}
          />
          <OfficialQuickActionCard
            title="Discipline Register"
            description="Record incidents and monitor case progression."
            icon={ClipboardList}
            tone="rose"
            badge={`${stats.disciplineOpenCases} open`}
            onClick={() => navigate('/dashboard/members/discipline')}
          />
          <OfficialQuickActionCard
            title="Fine Collection"
            description="Track fines issued and outstanding penalties."
            icon={HandCoins}
            tone="amber"
            badge={formatKES(stats.finesOutstandingAmount)}
            onClick={() => navigate('/dashboard/members/discipline')}
          />
          <OfficialQuickActionCard
            title="Member Directory"
            description="Reference member records for compliance follow-up."
            icon={Users}
            tone="slate"
            badge={`${stats.totalMembers} members`}
            onClick={() => navigate('/dashboard/members')}
          />
          <OfficialQuickActionCard
            title="Welfare Escalations"
            description="Review active welfare issues linked to discipline matters."
            icon={ShieldAlert}
            tone="violet"
            badge={`${stats.welfareActiveCases} active`}
            onClick={() => navigate('/dashboard/members/welfare-management')}
          />
          <OfficialQuickActionCard
            title="Discipline Reports"
            description="Generate oversight reports for executive review."
            icon={ListChecks}
            tone="emerald"
            onClick={() => navigate('/dashboard/finance/reports')}
          />
        </div>
      </div>

      <OfficialResponsibilityCard
        title="Constitutional Duties"
        description="Organizing secretary and discipline master responsibilities."
      >
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {[
            'Organize and prepare venues and materials for meetings.',
            'Maintain disciplinary incident records accurately.',
            'Track authorized fines and penalties through closure.',
            'Support the chairperson with assigned compliance duties.',
          ].map((item) => (
            <div key={item} className="flex items-start gap-2 rounded-lg border bg-background p-3 text-sm">
              <ShieldCheck className="mt-0.5 h-4 w-4 text-primary" />
              <span>{item}</span>
            </div>
          ))}
        </div>
      </OfficialResponsibilityCard>
    </div>
  );
};

export default OrganizingSecretaryDashboard;
