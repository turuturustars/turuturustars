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
  Archive,
  Bell,
  CalendarCheck,
  CheckCircle2,
  Clock,
  FileText,
  Mail,
  MessageSquare,
  ShieldCheck,
} from 'lucide-react';

const SecretaryRole = () => {
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
        title="Secretary Dashboard"
        subtitle="Coordinate official correspondence, minutes, and records with live workload visibility."
        icon={Mail}
        badgeLabel="Secretary Office"
        gradientClassName="bg-gradient-to-br from-slate-800 via-cyan-700 to-teal-600"
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <OfficialMetricCard
          title="Draft Minutes"
          value={stats.meetingMinutesDraftCount}
          caption="Minutes waiting for finalization"
          icon={Clock}
          tone="amber"
          isLoading={isLoading}
        />
        <OfficialMetricCard
          title="Approved Minutes"
          value={stats.meetingMinutesApprovedCount}
          caption="Archived approved records"
          icon={CheckCircle2}
          tone="emerald"
          isLoading={isLoading}
        />
        <OfficialMetricCard
          title="Document Archive"
          value={stats.documentsCount}
          caption="Uploaded constitutional documents"
          icon={Archive}
          tone="blue"
          isLoading={isLoading}
        />
        <OfficialMetricCard
          title="Unread Messages"
          value={stats.unreadPrivateMessages}
          caption="Pending communication follow-up"
          icon={MessageSquare}
          tone="violet"
          isLoading={isLoading}
        />
      </div>

      <div>
        <h2 className="mb-4 text-xl font-semibold">Secretary Operations</h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          <OfficialQuickActionCard
            title="Meeting Notices"
            description="Issue notices and invitations for upcoming meetings."
            icon={CalendarCheck}
            tone="blue"
            badge={`${stats.upcomingMeetings} upcoming`}
            onClick={() => navigate('/dashboard/governance/secretary-dashboard')}
          />
          <OfficialQuickActionCard
            title="Record Minutes"
            description="Draft or finalize meeting minutes and action points."
            icon={FileText}
            tone="emerald"
            onClick={() => navigate('/dashboard/governance/secretary-dashboard')}
          />
          <OfficialQuickActionCard
            title="Member Notices"
            description="Publish official updates and internal communication."
            icon={Bell}
            tone="violet"
            badge={`${stats.publishedAnnouncements} live`}
            onClick={() => navigate('/dashboard/communication/announcements')}
          />
          <OfficialQuickActionCard
            title="Correspondence"
            description="Reply and track official member communication."
            icon={MessageSquare}
            tone="rose"
            onClick={() => navigate('/dashboard/communication/messages')}
          />
        </div>
      </div>

      <OfficialResponsibilityCard
        title="Records and Communication Standards"
        description="Secretary responsibilities tied to constitutional compliance."
      >
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {[
            'Issue notices for meetings and key governance updates.',
            'Maintain clear meeting minutes and approved archives.',
            'Track correspondence with members and committee leaders.',
            'Preserve institutional documents for continuity and audits.',
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

export default SecretaryRole;

