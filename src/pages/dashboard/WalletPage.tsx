import { useEffect, useMemo, useRef, useState } from 'react';
import WalletBalanceCard from '@/components/wallet/WalletBalanceCard';
import WalletTopUpDialog from '@/components/wallet/WalletTopUpDialog';
import WalletTransactionList from '@/components/wallet/WalletTransactionList';
import { useWallet } from '@/hooks/useWallet';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertTriangle, ArrowDownLeft, ArrowUpRight, Clock3, Loader2, RefreshCw, Shield } from 'lucide-react';
import { queryTransactionStatus } from '@/lib/mpesa';

const PENDING_TOPUP_STATUSES = new Set(['pending', 'incomplete', 'unknown']);
const TOPUP_SYNC_COOLDOWN_MS = 60_000;

const WalletPage = () => {
  const { wallet, transactions, topUps, loading, refresh } = useWallet();
  const [topUpOpen, setTopUpOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [syncingTopUps, setSyncingTopUps] = useState(false);
  const lastTopUpSyncRef = useRef<Record<string, number>>({});

  const balance = Number(wallet?.balance ?? 0);
  const pendingTopUps = useMemo(
    () => topUps.filter((topUp) => PENDING_TOPUP_STATUSES.has(topUp.status || 'pending')),
    [topUps]
  );
  const failedTopUps = useMemo(
    () => topUps.filter((topUp) => ['failed', 'request_timeout', 'user_cancelled'].includes(topUp.status || '')),
    [topUps]
  );
  const pendingTopUpSyncKey = useMemo(
    () =>
      pendingTopUps
        .map((topUp) => `${topUp.checkout_request_id || topUp.id}:${topUp.status || 'pending'}`)
        .join('|'),
    [pendingTopUps]
  );
  const totals = useMemo(
    () =>
      transactions.reduce(
        (summary, transaction) => {
          if (transaction.direction === 'credit') {
            summary.credit += Number(transaction.amount || 0);
          } else {
            summary.debit += Number(transaction.amount || 0);
          }

          return summary;
        },
        { credit: 0, debit: 0 }
      ),
    [transactions]
  );
  const lastUpdated = wallet?.updated_at
    ? new Date(wallet.updated_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : undefined;

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await refresh();
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    const syncableTopUps = pendingTopUps.filter((topUp) => Boolean(topUp.checkout_request_id)).slice(0, 5);
    if (syncableTopUps.length === 0) return;

    let cancelled = false;
    const runSync = async () => {
      const now = Date.now();
      const dueTopUps = syncableTopUps.filter((topUp) => {
        const key = topUp.checkout_request_id || topUp.id;
        return now - (lastTopUpSyncRef.current[key] || 0) >= TOPUP_SYNC_COOLDOWN_MS;
      });

      if (dueTopUps.length === 0) return;

      setSyncingTopUps(true);
      try {
        for (const topUp of dueTopUps) {
          if (cancelled || !topUp.checkout_request_id) break;
          lastTopUpSyncRef.current[topUp.checkout_request_id] = now;
          try {
            await queryTransactionStatus(topUp.checkout_request_id);
          } catch (error) {
            console.error('Unable to sync M-Pesa wallet top-up status', error);
          }
        }

        if (!cancelled) {
          await refresh();
        }
      } finally {
        if (!cancelled) setSyncingTopUps(false);
      }
    };

    void runSync();

    return () => {
      cancelled = true;
    };
  }, [pendingTopUps, pendingTopUpSyncKey, refresh]);

  if (loading && !wallet) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold sm:text-3xl">My Wallet</h1>
          <p className="text-sm text-muted-foreground">
            Top up, track confirmations, and pay CBO obligations from one balance.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={handleRefresh} disabled={refreshing} className="gap-2">
          <RefreshCw className={refreshing ? 'h-4 w-4 animate-spin' : 'h-4 w-4'} />
          Refresh
        </Button>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <WalletBalanceCard
          balance={balance}
          currency={wallet?.currency || 'KES'}
          status={wallet?.status || 'active'}
          onTopUp={() => setTopUpOpen(true)}
          onRefresh={handleRefresh}
          pendingTopUps={pendingTopUps.length}
          lastUpdated={lastUpdated}
          refreshing={refreshing}
          className="lg:col-span-2"
        />

        <Card>
          <CardContent className="space-y-4 p-5 text-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-primary" />
                <p className="font-semibold">Wallet status</p>
              </div>
              <span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium capitalize text-primary">
                {wallet?.status || 'active'}
              </span>
            </div>

            <div className="grid gap-2">
              <div className="flex items-center justify-between rounded-md border p-3">
                <div className="flex items-center gap-2">
                  {syncingTopUps ? (
                    <Loader2 className="h-4 w-4 animate-spin text-green-600" />
                  ) : (
                    <Clock3 className="h-4 w-4 text-amber-600" />
                  )}
                  <span className="text-muted-foreground">
                    {syncingTopUps ? 'Syncing M-Pesa' : 'Waiting for confirmation'}
                  </span>
                </div>
                <span className="font-semibold tabular-nums">{pendingTopUps.length}</span>
              </div>
              <div className="flex items-center justify-between rounded-md border p-3">
                <div className="flex items-center gap-2">
                  <ArrowDownLeft className="h-4 w-4 text-green-600" />
                  <span className="text-muted-foreground">Money in</span>
                </div>
                <span className="font-semibold tabular-nums">KES {totals.credit.toLocaleString()}</span>
              </div>
              <div className="flex items-center justify-between rounded-md border p-3">
                <div className="flex items-center gap-2">
                  <ArrowUpRight className="h-4 w-4 text-rose-600" />
                  <span className="text-muted-foreground">Money out</span>
                </div>
                <span className="font-semibold tabular-nums">KES {totals.debit.toLocaleString()}</span>
              </div>
            </div>

            {failedTopUps.length > 0 && (
              <div className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 p-3 text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-200">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                <div>
                  <p className="font-medium">Some top-ups need attention</p>
                  <p className="text-xs opacity-80">Check the activity list for failed or timed-out Pay with M-Pesa attempts.</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {pendingTopUps.length > 0 && (
        <div className="flex flex-col gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-100 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-2">
            {syncingTopUps ? (
              <Loader2 className="mt-0.5 h-4 w-4 shrink-0 animate-spin" />
            ) : (
              <Clock3 className="mt-0.5 h-4 w-4 shrink-0" />
            )}
            <div>
              <p className="font-medium">
                {syncingTopUps ? 'Checking M-Pesa confirmation' : 'Waiting for M-Pesa confirmation'}
              </p>
              <p className="text-xs opacity-80">
                If you already entered your PIN successfully, this page will sync the payment and credit your wallet.
              </p>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={handleRefresh} disabled={refreshing} className="gap-2 bg-background/70">
            <RefreshCw className={refreshing ? 'h-4 w-4 animate-spin' : 'h-4 w-4'} />
            Refresh
          </Button>
        </div>
      )}

      <WalletTransactionList transactions={transactions} topUps={topUps} />

      <WalletTopUpDialog open={topUpOpen} onOpenChange={setTopUpOpen} onSuccess={refresh} />
    </div>
  );
};

export default WalletPage;
