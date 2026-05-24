import { Link } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  ArrowRight,
  Banknote,
  CalendarClock,
  CheckCircle2,
  HandCoins,
  PiggyBank,
  ShieldCheck,
  Sparkles,
  TrendingUp,
} from 'lucide-react';

type FeatureKey = 'loans' | 'savings' | 'investments';

type FeatureContent = {
  title: string;
  shortTitle: string;
  subtitle: string;
  intro: string;
  icon: typeof HandCoins;
  iconClass: string;
  iconBgClass: string;
  route: string;
  plans: Array<{
    title: string;
    description: string;
  }>;
};

const featureContent: Record<FeatureKey, FeatureContent> = {
  loans: {
    title: 'Member Loans',
    shortTitle: 'Loans',
    subtitle: 'Fair loan support for verified Turuturu Stars members.',
    intro:
      'We are preparing a responsible member loan program with clear eligibility, transparent approvals, and repayment terms that protect both members and the organization.',
    icon: HandCoins,
    iconClass: 'text-sky-700 dark:text-sky-300',
    iconBgClass: 'bg-sky-50 dark:bg-sky-950/40',
    route: '/dashboard/finance/loans',
    plans: [
      {
        title: 'Member eligibility',
        description: 'Loan access will be guided by membership status, contribution history, and approved group rules.',
      },
      {
        title: 'Clear approvals',
        description: 'Applications, officer review, and status updates will be handled inside the member portal.',
      },
      {
        title: 'Repayment tracking',
        description: 'Members will be able to see balances, due dates, and repayment progress in one place.',
      },
    ],
  },
  savings: {
    title: 'Member Savings',
    shortTitle: 'Savings',
    subtitle: 'Structured savings tools for members are coming soon.',
    intro:
      'We are working on a savings experience that helps members build balances steadily, track deposits, and participate in organized saving programs.',
    icon: PiggyBank,
    iconClass: 'text-emerald-700 dark:text-emerald-300',
    iconBgClass: 'bg-emerald-50 dark:bg-emerald-950/40',
    route: '/dashboard/finance/savings',
    plans: [
      {
        title: 'Savings balances',
        description: 'Members will be able to monitor personal savings totals and deposit history.',
      },
      {
        title: 'Savings goals',
        description: 'The portal will support simple targets for planned member contributions.',
      },
      {
        title: 'Member statements',
        description: 'Savings activity will be organized for easy review and future reporting.',
      },
    ],
  },
  investments: {
    title: 'Member Investments',
    shortTitle: 'Investments',
    subtitle: 'Community investment opportunities will be introduced soon.',
    intro:
      'We are planning an investment area where approved opportunities, member participation, and performance updates can be shared transparently.',
    icon: TrendingUp,
    iconClass: 'text-violet-700 dark:text-violet-300',
    iconBgClass: 'bg-violet-50 dark:bg-violet-950/40',
    route: '/dashboard/finance/investments',
    plans: [
      {
        title: 'Approved opportunities',
        description: 'Members will see only opportunities that have gone through the organization approval process.',
      },
      {
        title: 'Participation records',
        description: 'Investment contributions and member participation will be tracked clearly.',
      },
      {
        title: 'Progress updates',
        description: 'Officials will be able to share performance notes and key updates with members.',
      },
    ],
  },
};

interface FinancialComingSoonPageProps {
  feature?: FeatureKey;
}

const FinancialComingSoonPage = ({ feature = 'loans' }: FinancialComingSoonPageProps) => {
  const current = featureContent[feature];
  const CurrentIcon = current.icon;
  const otherFeatures = (Object.keys(featureContent) as FeatureKey[]).filter((key) => key !== feature);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <h1 className="flex items-center gap-2 text-2xl font-serif font-bold text-foreground">
            <CurrentIcon className={`h-7 w-7 ${current.iconClass}`} />
            {current.title}
          </h1>
          <p className="text-sm text-muted-foreground sm:text-base">{current.subtitle}</p>
        </div>
        <Badge variant="secondary" className="w-fit gap-1.5 px-3 py-1 text-sm">
          <Sparkles className="h-3.5 w-3.5" />
          Coming Soon
        </Badge>
      </div>

      <section className="rounded-xl border bg-card p-5 shadow-sm sm:p-6">
        <div className="grid gap-6 lg:grid-cols-[1fr_280px] lg:items-center">
          <div className="space-y-4">
            <div className={`flex h-14 w-14 items-center justify-center rounded-xl ${current.iconBgClass}`}>
              <CurrentIcon className={`h-7 w-7 ${current.iconClass}`} />
            </div>
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-primary">In planning</p>
              <h2 className="text-xl font-semibold text-foreground">This feature is being prepared for members</h2>
              <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground">{current.intro}</p>
            </div>
            <div className="flex flex-wrap gap-2 text-xs font-medium">
              <span className="inline-flex items-center gap-1.5 rounded-full border bg-background px-3 py-1.5">
                <ShieldCheck className="h-3.5 w-3.5 text-primary" />
                Member focused
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full border bg-background px-3 py-1.5">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                Officer reviewed
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full border bg-background px-3 py-1.5">
                <CalendarClock className="h-3.5 w-3.5 text-amber-600" />
                Launching soon
              </span>
            </div>
          </div>

          <div className="rounded-lg border bg-muted/30 p-4">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-background">
                <Banknote className="h-5 w-5 text-primary" />
              </div>
              <div className="space-y-1">
                <p className="font-semibold text-foreground">Status</p>
                <p className="text-sm text-muted-foreground">
                  Not open yet. Members will be notified when {current.shortTitle.toLowerCase()} are ready.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="grid gap-4 md:grid-cols-3">
        {current.plans.map((plan) => (
          <Card key={plan.title}>
            <CardContent className="space-y-3 p-5">
              <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${current.iconBgClass}`}>
                <CheckCircle2 className={`h-5 w-5 ${current.iconClass}`} />
              </div>
              <div className="space-y-1">
                <h3 className="font-semibold text-foreground">{plan.title}</h3>
                <p className="text-sm leading-relaxed text-muted-foreground">{plan.description}</p>
              </div>
              <Badge variant="outline" className="text-xs">
                Coming soon
              </Badge>
            </CardContent>
          </Card>
        ))}
      </div>

      <section className="space-y-3">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Other upcoming finance tools</h2>
          <p className="text-sm text-muted-foreground">Loans, savings, and investments will launch as separate member tools.</p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {otherFeatures.map((key) => {
            const item = featureContent[key];
            const ItemIcon = item.icon;
            return (
              <Button key={key} asChild variant="outline" className="h-auto justify-between gap-3 p-4">
                <Link to={item.route}>
                  <span className="flex items-center gap-3 text-left">
                    <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${item.iconBgClass}`}>
                      <ItemIcon className={`h-4 w-4 ${item.iconClass}`} />
                    </span>
                    <span>
                      <span className="block font-semibold">{item.title}</span>
                      <span className="block text-xs text-muted-foreground">Coming soon</span>
                    </span>
                  </span>
                  <ArrowRight className="h-4 w-4 shrink-0" />
                </Link>
              </Button>
            );
          })}
        </div>
      </section>
    </div>
  );
};

export default FinancialComingSoonPage;
