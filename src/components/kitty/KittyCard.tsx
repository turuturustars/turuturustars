import { Link } from 'react-router-dom';
import { ArrowRight, Calendar, Target, Wallet } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import type { KittyRow } from '@/hooks/useKitties';
import { cn } from '@/lib/utils';
import {
  formatDeadline,
  formatKes,
  getDaysUntil,
  getKittyProgress,
  getKittyRemaining,
  KITTY_CATEGORY_META,
  KITTY_STATUS_LABELS,
} from '@/lib/kittyUtils';

const STATUS_VARIANT: Record<string, 'default' | 'secondary' | 'outline' | 'destructive'> = {
  active: 'default',
  paused: 'secondary',
  completed: 'outline',
  closed: 'destructive',
};

interface Props {
  kitty: KittyRow;
}

function getDeadlineTone(deadline: string | null) {
  const days = getDaysUntil(deadline);
  if (days === null) return 'text-muted-foreground';
  if (days < 0) return 'text-destructive';
  if (days <= 7) return 'text-amber-600';
  return 'text-muted-foreground';
}

const KittyCard = ({ kitty }: Props) => {
  const meta = KITTY_CATEGORY_META[kitty.category] || KITTY_CATEGORY_META.other;
  const CategoryIcon = meta.Icon;
  const progress = getKittyProgress(kitty.balance, kitty.target_amount);
  const remaining = getKittyRemaining(kitty.balance, kitty.target_amount);
  const deadlineTone = getDeadlineTone(kitty.deadline);
  const targetReached = remaining <= 0 && Number(kitty.target_amount || 0) > 0;

  return (
    <Card className="flex h-full flex-col overflow-hidden transition-shadow hover:shadow-md">
      <CardHeader className="space-y-3 pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-start gap-3">
            <span className={cn('rounded-md border p-2', meta.accentClassName)}>
              <CategoryIcon className="h-4 w-4" />
            </span>
            <div className="min-w-0">
              <CardTitle className="line-clamp-2 text-base leading-snug">{kitty.title}</CardTitle>
              {kitty.round_number > 1 && (
                <p className="mt-1 text-xs font-medium text-muted-foreground">Round {kitty.round_number}</p>
              )}
            </div>
          </div>
          <Badge variant={STATUS_VARIANT[kitty.status]} className="shrink-0 capitalize">
            {KITTY_STATUS_LABELS[kitty.status] || kitty.status}
          </Badge>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className={cn('inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs', meta.className)}>
            {meta.label}
          </span>
          <span className={cn('inline-flex items-center gap-1 text-xs', deadlineTone)}>
            <Calendar className="h-3 w-3" />
            {formatDeadline(kitty.deadline)}
          </span>
        </div>
      </CardHeader>

      <CardContent className="flex flex-1 flex-col gap-4">
        {kitty.description && (
          <p className="line-clamp-2 text-sm text-muted-foreground">{kitty.description}</p>
        )}

        <div className="mt-auto space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-md border bg-muted/30 p-3">
              <p className="flex items-center gap-1 text-xs text-muted-foreground">
                <Wallet className="h-3 w-3" />
                Balance
              </p>
              <p className="mt-1 truncate text-sm font-bold text-primary">{formatKes(kitty.balance)}</p>
            </div>
            <div className="rounded-md border bg-muted/30 p-3">
              <p className="flex items-center gap-1 text-xs text-muted-foreground">
                <Target className="h-3 w-3" />
                Target
              </p>
              <p className="mt-1 truncate text-sm font-bold">{formatKes(kitty.target_amount)}</p>
            </div>
          </div>

          <div>
            <div className="mb-1.5 flex justify-between gap-3 text-sm">
              <span className="font-medium">{progress.toFixed(0)}% funded</span>
              <span className="truncate text-muted-foreground">
                {targetReached ? 'Target reached' : `${formatKes(remaining)} left`}
              </span>
            </div>
            <Progress value={progress} className="h-2.5" />
          </div>

          <Button asChild size="sm" variant="outline" className="w-full gap-2">
            <Link to={`/dashboard/finance/kitties/${kitty.id}`}>
              Open kitty
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default KittyCard;
