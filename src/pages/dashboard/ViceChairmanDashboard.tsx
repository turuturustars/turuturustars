import { useNavigate } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { AccessibleStatus, useStatus } from '@/components/accessible';
import {
  OfficialDashboardHero,
  OfficialMetricCard,
  OfficialQuickActionCard,
  OfficialResponsibilityCard,
} from '@/components/dashboard/officials/OfficialDashboardPrimitives';
import { useOfficialDashboardStats } from '@/hooks/useOfficialDashboardStats';
import {
  Award,
  Bell,
  Calendar,
  CheckCircle,
  ClipboardCheck,
  FileText,
  Gavel,
  ShieldCheck,
  Users,
} from 'lucide-react';

const ViceChairmanDashboard = () => {
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
        title="Vice Chair Dashboard"
        subtitle="Lead meetings, coordinate approvals, and step in with full executive authority whenever the chairperson is unavailable."
        icon={Award}
        badgeLabel="Vice Chairperson"
        gradientClassName="bg-gradient-to-br from-indigo-700 via-blue-700 to-cyan-600"
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <OfficialMetricCard
          title="Total Members"
          value={stats.totalMembers}
          caption="Registered member base"
          icon={Users}
          tone="blue"
          isLoading={isLoading}
        />
        <OfficialMetricCard
          title="Upcoming Meetings"
          value={stats.upcomingMeetings}
          caption="Meetings waiting to be chaired"
          icon={Calendar}
          tone="amber"
          isLoading={isLoading}
        />
        <OfficialMetricCard
          title="Pending Approvals"
          value={stats.pendingApprovals}
          caption="Member and workflow approvals"
          icon={CheckCircle}
          tone="violet"
          isLoading={isLoading}
        />
        <OfficialMetricCard
          title="Published Notices"
          value={stats.publishedAnnouncements}
          caption="Live public announcements"
          icon={Bell}
          tone="rose"
          isLoading={isLoading}
        />
      </div>

      <div>
        <h2 className="mb-4 text-xl font-semibold">Executive Actions</h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          <OfficialQuickActionCard
            title="Chair Meetings"
            description="Convene and preside over meetings or AGM sessions."
            icon={Calendar}
            tone="blue"
            onClick={() => navigate('/dashboard/governance/meetings')}
          />
          <OfficialQuickActionCard
            title="Approval Queue"
            description="Review pending requests and constitutional actions."
            icon={ClipboardCheck}
            tone="violet"
            badge={`${stats.pendingApprovals} pending`}
            onClick={() => navigate('/dashboard/admin-panel/approvals')}
          />
          <OfficialQuickActionCard
            title="Send Updates"
            description="Broadcast executive communication to all members."
            icon={Bell}
            tone="emerald"
            onClick={() => navigate('/dashboard/communication/announcements')}
          />
          <OfficialQuickActionCard
            title="Discipline Oversight"
            description="Monitor open cases and governance concerns."
            icon={Gavel}
            tone="amber"
            badge={`${stats.disciplineOpenCases} open`}
            onClick={() => navigate('/dashboard/members/discipline')}
          />
          <OfficialQuickActionCard
            title="Member Directory"
            description="Access and manage official member records."
            icon={Users}
            tone="slate"
            onClick={() => navigate('/dashboard/members')}
          />
          <OfficialQuickActionCard
            title="Governance Reports"
            description="Track leadership and organizational health."
            icon={FileText}
            tone="rose"
            onClick={() => navigate('/dashboard/finance/reports')}
          />
        </div>
      </div>

      <OfficialResponsibilityCard
        title="Constitutional Mandate"
        description="Vice chair authority activated in the chairperson's absence."
      >
        <div className="space-y-3">
          <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
            <p className="text-sm text-blue-900">
              You assume full chairperson authority when delegated or when the chairperson is absent.
            </p>
          </div>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {[
              'Convene and preside over association and committee meetings.',
              'Guide decisions, votes, and conflict resolution proceedings.',
              'Supervise member approvals and leadership follow-through.',
              'Ensure constitutional procedures remain enforced.',
            ].map((item) => (
              <div key={item} className="flex items-start gap-2 rounded-lg border bg-background p-3 text-sm">
                <ShieldCheck className="mt-0.5 h-4 w-4 text-primary" />
                <span>{item}</span>
              </div>
            ))}
          </div>
          <Badge variant="secondary" className="w-fit">
            Acting Chair Mode: Enabled by role mandate
          </Badge>
        </div>
      </OfficialResponsibilityCard>
    </div>
  );
};

export default ViceChairmanDashboard;

