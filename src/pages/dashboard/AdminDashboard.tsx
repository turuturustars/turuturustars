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
  Bell,
  CalendarDays,
  CheckCircle2,
  DollarSign,
  FileStack,
  Gavel,
  Handshake,
  MessageSquare,
  Settings,
  Shield,
  ShieldCheck,
  UserCog,
  Users,
} from 'lucide-react';

const AdminDashboard = () => {
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
        title="Admin Control Center"
        subtitle="Unified command dashboard for all roles. Monitor governance, finance, communication, and member operations from one place."
        icon={Shield}
        badgeLabel="Administrator"
        gradientClassName="bg-gradient-to-br from-slate-900 via-sky-800 to-cyan-700"
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <OfficialMetricCard
          title="Total Members"
          value={stats.totalMembers}
          caption={`${stats.activeMembers} active records`}
          icon={Users}
          tone="blue"
          isLoading={isLoading}
        />
        <OfficialMetricCard
          title="Pending Approvals"
          value={stats.pendingApprovals}
          caption="Membership and governance items"
          icon={CheckCircle2}
          tone="violet"
          isLoading={isLoading}
        />
        <OfficialMetricCard
          title="Upcoming Meetings"
          value={stats.upcomingMeetings}
          caption="Scheduled committee sessions"
          icon={CalendarDays}
          tone="amber"
          isLoading={isLoading}
        />
        <OfficialMetricCard
          title="Published Notices"
          value={stats.publishedAnnouncements}
          caption="Active announcements"
          icon={Bell}
          tone="rose"
          isLoading={isLoading}
        />
        <OfficialMetricCard
          title="M-Pesa Settled"
          value={stats.mpesaCompletedCount}
          caption={`${stats.mpesaThisMonthCount} transactions this month`}
          icon={DollarSign}
          tone="emerald"
          isLoading={isLoading}
        />
        <OfficialMetricCard
          title="Unread Messages"
          value={stats.unreadPrivateMessages}
          caption="Communication follow-up queue"
          icon={MessageSquare}
          tone="slate"
          isLoading={isLoading}
        />
      </div>

      <div>
        <h2 className="mb-4 text-xl font-semibold">All-Role Operations</h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          <OfficialQuickActionCard
            title="Member Registry"
            description="Manage all member profiles and statuses."
            icon={Users}
            tone="blue"
            badge={`${stats.totalMembers} members`}
            onClick={() => navigate('/dashboard/members')}
          />
          <OfficialQuickActionCard
            title="Approvals"
            description="Handle pending approvals across workflows."
            icon={UserCog}
            tone="violet"
            badge={`${stats.pendingApprovals} pending`}
            onClick={() => navigate('/dashboard/admin-panel/approvals')}
          />
          <OfficialQuickActionCard
            title="Meetings"
            description="Control governance calendar and proceedings."
            icon={CalendarDays}
            tone="amber"
            badge={`${stats.upcomingMeetings} upcoming`}
            onClick={() => navigate('/dashboard/governance/meetings')}
          />
          <OfficialQuickActionCard
            title="Role Handover"
            description="Administer role transitions and continuity."
            icon={Shield}
            tone="slate"
            onClick={() => navigate('/dashboard/governance/handover')}
          />
          <OfficialQuickActionCard
            title="Announcements"
            description="Publish and review association notices."
            icon={Bell}
            tone="rose"
            badge={`${stats.publishedAnnouncements} live`}
            onClick={() => navigate('/dashboard/communication/announcements')}
          />
          <OfficialQuickActionCard
            title="Private Messages"
            description="Monitor direct communication channels."
            icon={MessageSquare}
            tone="emerald"
            badge={`${stats.unreadPrivateMessages} unread`}
            onClick={() => navigate('/dashboard/communication/messages')}
          />
          <OfficialQuickActionCard
            title="M-Pesa Management"
            description="Track payment processing and reconciliation."
            icon={DollarSign}
            tone="emerald"
            badge={formatKES(stats.collectedThisMonthAmount)}
            onClick={() => navigate('/dashboard/finance/mpesa')}
          />
          <OfficialQuickActionCard
            title="Contribution Ledger"
            description="Audit paid, pending, and missed contributions."
            icon={FileStack}
            tone="blue"
            badge={`${stats.pendingContributionsCount} pending`}
            onClick={() => navigate('/dashboard/finance/all-contributions')}
          />
          <OfficialQuickActionCard
            title="Discipline Cases"
            description="Supervise compliance and disciplinary actions."
            icon={Gavel}
            tone="amber"
            badge={`${stats.disciplineOpenCases} open`}
            onClick={() => navigate('/dashboard/members/discipline')}
          />
          <OfficialQuickActionCard
            title="Welfare Management"
            description="Follow active welfare cases and support workflows."
            icon={Handshake}
            tone="violet"
            badge={`${stats.welfareActiveCases} active`}
            onClick={() => navigate('/dashboard/members/welfare-management')}
          />
          <OfficialQuickActionCard
            title="Reports"
            description="Review finance, operations, and member insights."
            icon={FileStack}
            tone="rose"
            onClick={() => navigate('/dashboard/finance/reports')}
          />
          <OfficialQuickActionCard
            title="System Operations"
            description="Access admin tools and operational controls."
            icon={Settings}
            tone="slate"
            onClick={() => navigate('/dashboard/admin-panel/operations')}
          />
        </div>
      </div>

      <OfficialResponsibilityCard
        title="Administrator Scope"
        description="Full-role access with accountability and governance enforcement."
      >
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {[
            'Access and execute operations for all official roles from one dashboard.',
            'Maintain governance integrity, approvals, and role continuity.',
            'Oversee M-Pesa, contributions, and treasury reconciliation outcomes.',
            'Monitor communication channels, documents, and audit readiness.',
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

export default AdminDashboard;
