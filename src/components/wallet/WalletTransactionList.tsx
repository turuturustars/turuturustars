import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ArrowDownLeft, ArrowUpRight, Clock3, Receipt, XCircle } from 'lucide-react';
import type { WalletTopUp, WalletTxn } from '@/hooks/useWallet';
import { cn } from '@/lib/utils';

interface Props {
  transactions: WalletTxn[];
  topUps?: WalletTopUp[];
}

type ActivityFilter = 'all' | 'credit' | 'debit' | 'pending';

const formatKES = (n: number) =>
  new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES', maximumFractionDigits: 2 }).format(n);

const formatDate = (value: string) =>
  new Date(value).toLocaleString([], {
    dateStyle: 'medium',
    timeStyle: 'short',
  });

const TYPE_LABEL: Record<string, string> = {
  topup: 'Wallet top-up',
  dues: 'Monthly dues',
  welfare: 'Welfare contribution',
  fine: 'Fine payment',
  kitty_contribution: 'Kitty contribution',
  adjustment: 'Adjustment',
  refund: 'Refund',
  reversal: 'Reversal',
};

const STATUS_LABEL: Record<string, string> = {
  pending: 'Pending',
  incomplete: 'Incomplete',
  request_timeout: 'Timed out',
  user_cancelled: 'Cancelled',
  failed: 'Failed',
  unknown: 'Checking',
};

const failedStatuses = new Set(['failed', 'user_cancelled', 'request_timeout']);

const WalletTransactionList = ({ transactions, topUps = [] }: Props) => {
  const [filter, setFilter] = useState<ActivityFilter>('all');

  const ledgerMpesaIds = useMemo(
    () => new Set(transactions.map((transaction) => transaction.mpesa_transaction_id).filter(Boolean)),
    [transactions]
  );

  const visibleTopUps = useMemo(
    () =>
      topUps.filter((topUp) => {
        const status = topUp.status || 'pending';
        return status !== 'completed' || !ledgerMpesaIds.has(topUp.id);
      }),
    [ledgerMpesaIds, topUps]
  );

  const filteredTransactions = useMemo(() => {
    if (filter === 'credit') {
      return transactions.filter((transaction) => transaction.direction === 'credit');
    }

    if (filter === 'debit') {
      return transactions.filter((transaction) => transaction.direction === 'debit');
    }

    if (filter === 'pending') {
      return transactions.filter((transaction) => transaction.status !== 'completed');
    }

    return transactions;
  }, [filter, transactions]);

  const filteredTopUps = filter === 'all' || filter === 'credit' || filter === 'pending' ? visibleTopUps : [];
  const hasActivity = filteredTopUps.length > 0 || filteredTransactions.length > 0;

  if (!transactions.length && !visibleTopUps.length) {
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
      <CardHeader className="gap-3 space-y-0 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <CardTitle className="text-base">Wallet Activity</CardTitle>
          <p className="text-xs text-muted-foreground">
            Credits, debits, and M-Pesa confirmations in one ledger.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {(['all', 'credit', 'debit', 'pending'] as ActivityFilter[]).map((item) => (
            <Button
              key={item}
              type="button"
              size="sm"
              variant={filter === item ? 'default' : 'outline'}
              onClick={() => setFilter(item)}
              className="h-8 capitalize"
            >
              {item}
            </Button>
          ))}
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {!hasActivity ? (
          <div className="py-10 text-center text-sm text-muted-foreground">
            No matching wallet activity.
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {filteredTopUps.map((topUp) => {
              const status = topUp.status || 'pending';
              const failed = failedStatuses.has(status);

              return (
                <li key={topUp.id} className="flex items-center gap-3 px-4 py-3 sm:px-6">
                  <div
                    className={cn(
                      'flex h-10 w-10 shrink-0 items-center justify-center rounded-full',
                      failed
                        ? 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300'
                        : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300'
                    )}
                  >
                    {failed ? <XCircle className="h-5 w-5" /> : <Clock3 className="h-5 w-5" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-sm font-medium">M-Pesa wallet top-up</p>
                      <Badge variant={failed ? 'destructive' : 'secondary'} className="text-[10px]">
                        {STATUS_LABEL[status] || status}
                      </Badge>
                    </div>
                    <p className="truncate text-xs text-muted-foreground">
                      {topUp.result_desc || `Sent to ${topUp.phone_number} on ${formatDate(topUp.created_at)}`}
                    </p>
                    {topUp.checkout_request_id && (
                      <p className="truncate text-[10px] font-mono text-muted-foreground/80">
                        Checkout: {topUp.checkout_request_id}
                      </p>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold tabular-nums text-amber-700 dark:text-amber-300">
                      + {formatKES(Number(topUp.amount))}
                    </p>
                    <p className="text-[10px] text-muted-foreground tabular-nums">
                      {failed ? 'Not credited' : 'Awaiting credit'}
                    </p>
                  </div>
                </li>
              );
            })}

            {filteredTransactions.map((transaction) => {
              const isCredit = transaction.direction === 'credit';
              return (
                <li key={transaction.id} className="flex items-center gap-3 px-4 py-3 sm:px-6">
                  <div
                    className={cn(
                      'flex h-10 w-10 shrink-0 items-center justify-center rounded-full',
                      isCredit
                        ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
                        : 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300'
                    )}
                  >
                    {isCredit ? <ArrowDownLeft className="h-5 w-5" /> : <ArrowUpRight className="h-5 w-5" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-sm font-medium">
                        {TYPE_LABEL[transaction.type] || transaction.type}
                      </p>
                      {transaction.status !== 'completed' && (
                        <Badge variant="secondary" className="text-[10px]">
                          {transaction.status}
                        </Badge>
                      )}
                    </div>
                    <p className="truncate text-xs text-muted-foreground">
                      {transaction.description || formatDate(transaction.created_at)}
                    </p>
                    {transaction.reference && (
                      <p className="truncate text-[10px] font-mono text-muted-foreground/80">
                        Ref: {transaction.reference}
                      </p>
                    )}
                  </div>
                  <div className="text-right">
                    <p
                      className={cn(
                        'text-sm font-semibold tabular-nums',
                        isCredit ? 'text-green-600 dark:text-green-400' : 'text-foreground'
                      )}
                    >
                      {isCredit ? '+' : '-'} {formatKES(Number(transaction.amount))}
                    </p>
                    <p className="text-[10px] text-muted-foreground tabular-nums">
                      Bal: {formatKES(Number(transaction.balance_after))}
                    </p>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
};

export default WalletTransactionList;
