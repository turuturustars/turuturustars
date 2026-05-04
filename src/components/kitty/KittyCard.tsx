import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Calendar, Target, ArrowRight, HeartHandshake } from 'lucide-react';
import type { KittyRow } from '@/hooks/useKitties';
import { Button } from '@/components/ui/button';

const CATEGORY_META: Record<string, { label: string; emoji: string; color: string }> = {
  emergency: { label: 'Emergency', emoji: '🚨', color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300' },
  education: { label: 'Education', emoji: '🎓', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' },
  welfare: { label: 'Welfare', emoji: '🤝', color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' },
  project: { label: 'Project', emoji: '🏗️', color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300' },
  other: { label: 'Other', emoji: '📦', color: 'bg-muted text-muted-foreground' },
};

const STATUS_VARIANT: Record<string, 'default' | 'secondary' | 'outline' | 'destructive'> = {
  active: 'default',
  paused: 'secondary',
  completed: 'outline',
  closed: 'destructive',
};

interface Props {
  kitty: KittyRow;
}

const KittyCard = ({ kitty }: Props) => {
  const meta = CATEGORY_META[kitty.category] || CATEGORY_META.other;
  const target = Number(kitty.target_amount);
  const balance = Number(kitty.balance);
  const pct = target > 0 ? Math.min(100, (balance / target) * 100) : 0;

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-base leading-snug line-clamp-2">{kitty.title}</CardTitle>
          <Badge variant={STATUS_VARIANT[kitty.status]} className="capitalize shrink-0">
            {kitty.status}
          </Badge>
        </div>
        <div className="flex items-center gap-2 pt-1">
          <span className={`text-xs px-2 py-0.5 rounded-full ${meta.color}`}>
            {meta.emoji} {meta.label}
          </span>
          {kitty.deadline && (
            <span className="text-xs text-muted-foreground inline-flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              {new Date(kitty.deadline).toLocaleDateString()}
            </span>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {kitty.beneficiary_name && (
          <div className="rounded-md border border-primary/20 bg-primary/5 p-2.5">
            <div className="flex items-center gap-1.5 text-xs font-medium text-primary">
              <HeartHandshake className="w-3.5 h-3.5" /> Beneficiary
            </div>
            <p className="text-sm font-semibold leading-tight mt-0.5">{kitty.beneficiary_name}</p>
            {kitty.beneficiary_relationship && (
              <p className="text-xs text-muted-foreground">{kitty.beneficiary_relationship}</p>
            )}
          </div>
        )}
        {kitty.description && (
          <p className="text-sm text-muted-foreground line-clamp-2">{kitty.description}</p>
        )}
        <div>
          <div className="flex justify-between text-sm mb-1.5">
            <span className="font-semibold text-primary">KES {balance.toLocaleString()}</span>
            <span className="text-muted-foreground inline-flex items-center gap-1">
              <Target className="w-3 h-3" /> KES {target.toLocaleString()}
            </span>
          </div>
          <Progress value={pct} className="h-2" />
          <div className="flex justify-between text-xs text-muted-foreground pt-1">
            <span>{pct.toFixed(1)}% funded</span>
            <span>
              {balance >= target
                ? '🎉 Target reached'
                : `KES ${Math.max(0, target - balance).toLocaleString()} remaining`}
            </span>
          </div>
        </div>
        <Button asChild size="sm" variant="outline" className="w-full gap-2">
          <Link to={`/dashboard/finance/kitties/${kitty.id}`}>
            View & Contribute <ArrowRight className="w-3 h-3" />
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
};

export default KittyCard;
