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
  BarChart3,
  Bell,
  Handshake,
  Landmark,
  MessageSquare,
  ShieldCheck,
  TrendingUp,
  Users,
} from 'lucide-react';

const PatronDashboard = () => {
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
        title="Patron Dashboard"
        subtitle="Monitor association health, funding momentum, and governance progress with live board-level metrics."
        icon={Landmark}
        badgeLabel="Patron"
        gradientClassName="bg-gradient-to-br from-teal-700 via-cyan-700 to-blue-700"
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <OfficialMetricCard
          title="Total Members"
          value={stats.totalMembers}
          caption={`${stats.activeMembers} members currently active`}
          icon={Users}
          tone="blue"
          isLoading={isLoading}
        />
        <OfficialMetricCard
          title="This Month Collections"
          value={formatKES(stats.collectedThisMonthAmount)}
          caption="Paid contributions in current month"
          icon={TrendingUp}
          tone="emerald"
          isLoading={isLoading}
        />
        <OfficialMetricCard
          title="Published Notices"
          value={stats.publishedAnnouncements}
          caption="Active announcements to members"
          icon={Bell}
          tone="amber"
          isLoading={isLoading}
        />
        <OfficialMetricCard
          title="Active Welfare Cases"
          value={stats.welfareActiveCases}
          caption="Member welfare matters under review"
          icon={Handshake}
          tone="violet"
          isLoading={isLoading}
        />
      </div>

      <div>
        <h2 className="mb-4 text-xl font-semibold">Strategic Oversight</h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          <OfficialQuickActionCard
            title="Executive Reports"
            description="Review financial and governance performance reports."
            icon={BarChart3}
            tone="blue"
            onClick={() => navigate('/dashboard/finance/reports')}
          />
          <OfficialQuickActionCard
            title="Member Overview"
            description="Inspect membership distribution and status trends."
            icon={Users}
            tone="emerald"
            badge={`${stats.totalMembers} members`}
            onClick={() => navigate('/dashboard/members')}
          />
          <OfficialQuickActionCard
            title="Contribution Trends"
            description="Track paid, pending, and missed contribution flows."
            icon={TrendingUp}
            tone="amber"
            badge={`${stats.missedContributionsCount} missed`}
            onClick={() => navigate('/dashboard/finance/all-contributions')}
          />
          <OfficialQuickActionCard
            title="Governance Calendar"
            description="Follow upcoming meetings and key agenda periods."
            icon={Landmark}
            tone="slate"
            badge={`${stats.upcomingMeetings} upcoming`}
            onClick={() => navigate('/dashboard/governance/meetings')}
          />
          <OfficialQuickActionCard
            title="Announcements"
            description="View published communication to all members."
            icon={Bell}
            tone="violet"
            badge={`${stats.publishedAnnouncements} live`}
            onClick={() => navigate('/dashboard/communication/announcements')}
          />
          <OfficialQuickActionCard
            title="Direct Committee Chat"
            description="Share guidance with management committee quickly."
            icon={MessageSquare}
            tone="rose"
            badge={`${stats.unreadPrivateMessages} unread`}
            onClick={() => navigate('/dashboard/communication/messages')}
          />
        </div>
      </div>

      <OfficialResponsibilityCard
        title="Patron Responsibilities"
        description="Strategic guidance and institutional continuity duties."
      >
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {[
            'Provide strategic guidance to leadership and committees.',
            'Promote partnerships and external support for the association.',
            'Monitor overall welfare and performance of membership programs.',
            'Maintain direct advisory communication with management committee.',
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

export default PatronDashboard;
