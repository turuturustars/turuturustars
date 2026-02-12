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
  CheckCircle2,
  Download,
  DollarSign,
  ShieldCheck,
  TrendingDown,
  TrendingUp,
  Wallet,
} from 'lucide-react';

const TreasurerRole = () => {
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
        title="Treasurer Dashboard"
        subtitle="Track contribution inflows, pending obligations, and M-Pesa performance from one finance workspace."
        icon={DollarSign}
        badgeLabel="Treasury"
        gradientClassName="bg-gradient-to-br from-emerald-700 via-green-700 to-lime-600"
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <OfficialMetricCard
          title="Total Collected"
          value={formatKES(stats.totalCollectedAmount)}
          caption="Paid contributions on record"
          icon={TrendingUp}
          tone="emerald"
          isLoading={isLoading}
        />
        <OfficialMetricCard
          title="This Month"
          value={formatKES(stats.collectedThisMonthAmount)}
          caption="Collections in current month"
          icon={Wallet}
          tone="blue"
          isLoading={isLoading}
        />
        <OfficialMetricCard
          title="Pending Payments"
          value={`${stats.pendingContributionsCount}`}
          caption={`${formatKES(stats.pendingContributionsAmount)} awaiting confirmation`}
          icon={TrendingDown}
          tone="amber"
          isLoading={isLoading}
        />
        <OfficialMetricCard
          title="M-Pesa Settled"
          value={stats.mpesaCompletedCount}
          caption={`${stats.mpesaThisMonthCount} transactions this month`}
          icon={CheckCircle2}
          tone="violet"
          isLoading={isLoading}
        />
      </div>

      <div>
        <h2 className="mb-4 text-xl font-semibold">Financial Controls</h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          <OfficialQuickActionCard
            title="M-Pesa Monitoring"
            description="Review live transaction statuses and reconciliation state."
            icon={DollarSign}
            tone="emerald"
            badge={`${stats.mpesaThisMonthCount} this month`}
            onClick={() => navigate('/dashboard/finance/mpesa')}
          />
          <OfficialQuickActionCard
            title="Contribution Ledger"
            description="Audit every member contribution and missed payment."
            icon={TrendingUp}
            tone="blue"
            badge={`${stats.missedContributionsCount} missed`}
            onClick={() => navigate('/dashboard/finance/all-contributions')}
          />
          <OfficialQuickActionCard
            title="Treasury Reports"
            description="View export-ready reports for committee approvals."
            icon={BarChart3}
            tone="violet"
            onClick={() => navigate('/dashboard/finance/reports')}
          />
          <OfficialQuickActionCard
            title="Export Statements"
            description="Generate downloadable monthly and annual statements."
            icon={Download}
            tone="amber"
            onClick={() => navigate('/dashboard/finance/reports')}
          />
        </div>
      </div>

      <OfficialResponsibilityCard
        title="Treasurer Governance Duties"
        description="Financial custodianship standards for the treasury office."
      >
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {[
            'Receive and disburse funds only through approved processes.',
            'Maintain accurate books of account and payment records.',
            'Monitor pending, paid, and missed contribution obligations.',
            'Prepare transparent finance reports for committee decisions.',
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

export default TreasurerRole;

