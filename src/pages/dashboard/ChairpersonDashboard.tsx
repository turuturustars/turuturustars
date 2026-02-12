import { useNavigate } from 'react-router-dom';
import { AccessibleStatus, useStatus } from '@/components/accessible';
import {
  OfficialDashboardHero,
  OfficialMetricCard,
  OfficialQuickActionCard,
  OfficialResponsibilityCard,
} from '@/components/dashboard/officials/OfficialDashboardPrimitives';
import { useOfficialDashboardStats } from '@/hooks/useOfficialDashboardStats';
import {
  Bell,
  CalendarDays,
  CheckCircle2,
  ClipboardCheck,
  Gavel,
  Send,
  Shield,
  ShieldCheck,
  Users,
} from 'lucide-react';

const ChairpersonDashboard = () => {
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
        title="Chairperson Dashboard"
        subtitle="Steer governance, track executive approvals, and keep the association aligned through real-time operational visibility."
        icon={Shield}
        badgeLabel="Chairperson"
        gradientClassName="bg-gradient-to-br from-sky-700 via-indigo-700 to-violet-700"
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <OfficialMetricCard
          title="Total Members"
          value={stats.totalMembers}
          caption={`${stats.activeMembers} active records`}
          icon={Users}
          tone="blue"
          isLoading={isLoading}
        />
        <OfficialMetricCard
          title="Upcoming Meetings"
          value={stats.upcomingMeetings}
          caption="Scheduled governance sessions"
          icon={CalendarDays}
          tone="amber"
          isLoading={isLoading}
        />
        <OfficialMetricCard
          title="Pending Approvals"
          value={stats.pendingApprovals}
          caption="Requests awaiting executive decision"
          icon={CheckCircle2}
          tone="violet"
          isLoading={isLoading}
        />
        <OfficialMetricCard
          title="Published Notices"
          value={stats.publishedAnnouncements}
          caption="Live member announcements"
          icon={Bell}
          tone="rose"
          isLoading={isLoading}
        />
      </div>

      <div>
        <h2 className="mb-4 text-xl font-semibold">Leadership Actions</h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          <OfficialQuickActionCard
            title="Schedule Meetings"
            description="Create and chair management committee or AGM meetings."
            icon={CalendarDays}
            tone="blue"
            badge={`${stats.upcomingMeetings} upcoming`}
            onClick={() => navigate('/dashboard/governance/meetings')}
          />
          <OfficialQuickActionCard
            title="Approval Queue"
            description="Review role, membership, and governance approvals."
            icon={ClipboardCheck}
            tone="violet"
            badge={`${stats.pendingApprovals} pending`}
            onClick={() => navigate('/dashboard/admin-panel/approvals')}
          />
          <OfficialQuickActionCard
            title="Broadcast Announcement"
            description="Send official notices to all members."
            icon={Send}
            tone="emerald"
            onClick={() => navigate('/dashboard/communication/announcements')}
          />
          <OfficialQuickActionCard
            title="Member Management"
            description="Inspect and manage the full member registry."
            icon={Users}
            tone="slate"
            onClick={() => navigate('/dashboard/members')}
          />
          <OfficialQuickActionCard
            title="Discipline Oversight"
            description="Track active discipline cases and constitutional compliance."
            icon={Gavel}
            tone="amber"
            badge={`${stats.disciplineOpenCases} open`}
            onClick={() => navigate('/dashboard/members/discipline')}
          />
          <OfficialQuickActionCard
            title="Finance & Reports"
            description="Review contribution and treasury performance."
            icon={Shield}
            tone="rose"
            onClick={() => navigate('/dashboard/finance/reports')}
          />
        </div>
      </div>

      <OfficialResponsibilityCard
        title="Chairperson Constitutional Duties"
        description="Executive obligations for governance and organization direction."
      >
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {[
            'Convene and preside over meetings and AGM sessions.',
            'Safeguard constitutional records and executive resolutions.',
            'Direct official communication and leadership decisions.',
            'Ensure compliance with constitution and committee mandates.',
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

export default ChairpersonDashboard;
