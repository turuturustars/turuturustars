import { type LucideIcon, ChevronRight } from 'lucide-react';
import { type ReactNode } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

const toneStyles = {
  blue: {
    icon: 'text-blue-700',
    iconBg: 'bg-blue-100',
    accent: 'border-blue-200 hover:border-blue-400',
  },
  emerald: {
    icon: 'text-emerald-700',
    iconBg: 'bg-emerald-100',
    accent: 'border-emerald-200 hover:border-emerald-400',
  },
  amber: {
    icon: 'text-amber-700',
    iconBg: 'bg-amber-100',
    accent: 'border-amber-200 hover:border-amber-400',
  },
  violet: {
    icon: 'text-violet-700',
    iconBg: 'bg-violet-100',
    accent: 'border-violet-200 hover:border-violet-400',
  },
  rose: {
    icon: 'text-rose-700',
    iconBg: 'bg-rose-100',
    accent: 'border-rose-200 hover:border-rose-400',
  },
  slate: {
    icon: 'text-slate-700',
    iconBg: 'bg-slate-100',
    accent: 'border-slate-200 hover:border-slate-400',
  },
} as const;

type Tone = keyof typeof toneStyles;

interface HeroProps {
  title: string;
  subtitle: string;
  icon: LucideIcon;
  badgeLabel: string;
  gradientClassName: string;
}

export const OfficialDashboardHero = ({
  title,
  subtitle,
  icon: Icon,
  badgeLabel,
  gradientClassName,
}: HeroProps) => (
  <div className={cn('relative overflow-hidden rounded-2xl p-7 text-white shadow-xl', gradientClassName)}>
    <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.2),transparent_45%)]" />
    <div className="absolute -right-14 -top-14 h-48 w-48 rounded-full bg-white/10 blur-2xl" />
    <div className="relative">
      <Badge className="mb-3 bg-white/20 text-white hover:bg-white/20">{badgeLabel}</Badge>
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold leading-tight sm:text-4xl">{title}</h1>
          <p className="mt-2 max-w-2xl text-sm text-white/90 sm:text-base">{subtitle}</p>
        </div>
        <div className="rounded-xl border border-white/30 bg-white/20 p-3 backdrop-blur">
          <Icon className="h-7 w-7" />
        </div>
      </div>
    </div>
  </div>
);

interface MetricCardProps {
  title: string;
  value: string | number;
  caption: string;
  icon: LucideIcon;
  tone?: Tone;
  isLoading?: boolean;
}

export const OfficialMetricCard = ({
  title,
  value,
  caption,
  icon: Icon,
  tone = 'slate',
  isLoading,
}: MetricCardProps) => {
  const toneStyle = toneStyles[tone];

  return (
    <Card className={cn('border-2 transition-all duration-200', toneStyle.accent)}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between gap-3">
          <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
          <div className={cn('rounded-lg p-2', toneStyle.iconBg)}>
            <Icon className={cn('h-4 w-4', toneStyle.icon)} />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="h-8 w-20 animate-pulse rounded bg-muted" />
        ) : (
          <p className="text-3xl font-bold tracking-tight">{value}</p>
        )}
        <p className="mt-2 text-xs text-muted-foreground">{caption}</p>
      </CardContent>
    </Card>
  );
};

interface QuickActionCardProps {
  title: string;
  description: string;
  icon: LucideIcon;
  badge?: string;
  tone?: Tone;
  onClick: () => void;
}

export const OfficialQuickActionCard = ({
  title,
  description,
  icon: Icon,
  badge,
  tone = 'slate',
  onClick,
}: QuickActionCardProps) => {
  const toneStyle = toneStyles[tone];

  return (
    <button onClick={onClick} className="group text-left" type="button">
      <Card className={cn('h-full border-2 transition-all duration-200 hover:-translate-y-1 hover:shadow-lg', toneStyle.accent)}>
        <CardHeader>
          <div className="mb-2 flex items-center justify-between gap-2">
            <div className={cn('rounded-lg p-2.5', toneStyle.iconBg)}>
              <Icon className={cn('h-4 w-4', toneStyle.icon)} />
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-1" />
          </div>
          <CardTitle className="text-base">{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
          {badge ? <Badge variant="secondary" className="mt-2 w-fit">{badge}</Badge> : null}
        </CardHeader>
      </Card>
    </button>
  );
};

interface ResponsibilityCardProps {
  title: string;
  description?: string;
  children: ReactNode;
}

export const OfficialResponsibilityCard = ({
  title,
  description,
  children,
}: ResponsibilityCardProps) => (
  <Card className="border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-background">
    <CardHeader>
      <CardTitle>{title}</CardTitle>
      {description ? <CardDescription>{description}</CardDescription> : null}
    </CardHeader>
    <CardContent>{children}</CardContent>
  </Card>
);

