import { Card, CardContent } from '@/components/ui/card';
import { Wallet as WalletIcon, TrendingUp, ArrowDownToLine, Clock3, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface Props {
  balance: number;
  currency?: string;
  status?: string;
  onTopUp?: () => void;
  onRefresh?: () => void;
  pendingTopUps?: number;
  lastUpdated?: string;
  refreshing?: boolean;
  className?: string;
}

const formatKES = (n: number) =>
  new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES', maximumFractionDigits: 2 }).format(n);

const WalletBalanceCard = ({
  balance,
  currency = 'KES',
  status = 'active',
  onTopUp,
  onRefresh,
  pendingTopUps = 0,
  lastUpdated,
  refreshing = false,
  className,
}: Props) => {
  return (
    <Card
      className={cn(
        'overflow-hidden border-0 bg-gradient-to-br from-primary via-primary/90 to-primary/70 text-primary-foreground shadow-xl',
        className
      )}
    >
      <CardContent className="p-6 sm:p-8">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-white/15 p-3 backdrop-blur-sm">
              <WalletIcon className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm text-primary-foreground/80">My Wallet</p>
              <p className="text-xs text-primary-foreground/60 uppercase tracking-wider">
                {status === 'active' ? 'Active' : status}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {pendingTopUps > 0 && (
              <div className="flex items-center gap-1 rounded-full bg-white/15 px-3 py-1 text-xs font-medium backdrop-blur-sm">
                <Clock3 className="h-3.5 w-3.5" />
                {pendingTopUps} pending
              </div>
            )}
            <div className="rounded-full bg-white/15 px-3 py-1 text-xs font-medium backdrop-blur-sm">
              {currency}
            </div>
          </div>
        </div>

        <div className="mt-6">
          <p className="text-xs uppercase tracking-wider text-primary-foreground/70">Available balance</p>
          <p className="mt-1 text-3xl sm:text-4xl font-bold tabular-nums">{formatKES(balance)}</p>
          {lastUpdated && (
            <p className="mt-1 text-xs text-primary-foreground/65">Updated {lastUpdated}</p>
          )}
        </div>

        <div className="mt-6 flex flex-wrap gap-2">
          <Button
            onClick={onTopUp}
            variant="secondary"
            size="sm"
            className="bg-white text-primary hover:bg-white/90"
          >
            <ArrowDownToLine className="mr-2 h-4 w-4" />
            Pay with M-Pesa
          </Button>
          {onRefresh && (
            <Button
              onClick={onRefresh}
              variant="secondary"
              size="sm"
              className="bg-white/15 text-primary-foreground hover:bg-white/25"
            >
              <RefreshCw className={cn('mr-2 h-4 w-4', refreshing && 'animate-spin')} />
              Refresh
            </Button>
          )}
          <div className="flex items-center gap-1 rounded-md bg-white/10 px-3 py-1.5 text-xs">
            <TrendingUp className="h-3.5 w-3.5" />
            <span>Spend on dues, welfare & fines</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default WalletBalanceCard;
