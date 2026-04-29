import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowDownLeft, ArrowUpRight, Receipt } from 'lucide-react';
import type { WalletTxn } from '@/hooks/useWallet';
import { cn } from '@/lib/utils';

interface Props {
  transactions: WalletTxn[];
}

const formatKES = (n: number) =>
  new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES', maximumFractionDigits: 2 }).format(n);

const TYPE_LABEL: Record<string, string> = {
  topup: 'Top-up',
  dues: 'Monthly dues',
  welfare: 'Welfare contribution',
  fine: 'Fine payment',
  adjustment: 'Adjustment',
  refund: 'Refund',
  reversal: 'Reversal',
};

const WalletTransactionList = ({ transactions }: Props) => {
  if (!transactions.length) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground">
          <Receipt className="mx-auto mb-3 h-10 w-10 opacity-40" />
          <p className="text-sm">No wallet activity yet. Top up to get started.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Recent Transactions</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <ul className="divide-y divide-border">
          {transactions.map((t) => {
            const isCredit = t.direction === 'credit';
            return (
              <li key={t.id} className="flex items-center gap-3 px-4 py-3 sm:px-6">
                <div
                  className={cn(
                    'flex h-10 w-10 shrink-0 items-center justify-center rounded-full',
                    isCredit ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' : 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300'
                  )}
                >
                  {isCredit ? <ArrowDownLeft className="h-5 w-5" /> : <ArrowUpRight className="h-5 w-5" />}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate text-sm font-medium">
                      {TYPE_LABEL[t.type] || t.type}
                    </p>
                    {t.status !== 'completed' && (
                      <Badge variant="secondary" className="text-[10px]">
                        {t.status}
                      </Badge>
                    )}
                  </div>
                  <p className="truncate text-xs text-muted-foreground">
                    {t.description || t.reference || new Date(t.created_at).toLocaleString()}
                  </p>
                </div>
                <div className="text-right">
                  <p
                    className={cn(
                      'text-sm font-semibold tabular-nums',
                      isCredit ? 'text-green-600 dark:text-green-400' : 'text-foreground'
                    )}
                  >
                    {isCredit ? '+' : '−'} {formatKES(Number(t.amount))}
                  </p>
                  <p className="text-[10px] text-muted-foreground tabular-nums">
                    Bal: {formatKES(Number(t.balance_after))}
                  </p>
                </div>
              </li>
            );
          })}
        </ul>
      </CardContent>
    </Card>
  );
};

export default WalletTransactionList;
