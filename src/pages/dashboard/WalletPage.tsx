import { useState } from 'react';
import WalletBalanceCard from '@/components/wallet/WalletBalanceCard';
import WalletTopUpDialog from '@/components/wallet/WalletTopUpDialog';
import WalletTransactionList from '@/components/wallet/WalletTransactionList';
import { useWallet } from '@/hooks/useWallet';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2, Shield, Smartphone, HandHeart, AlertTriangle } from 'lucide-react';

const WalletPage = () => {
  const { wallet, transactions, loading } = useWallet();
  const [topUpOpen, setTopUpOpen] = useState(false);

  if (loading && !wallet) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  const balance = Number(wallet?.balance ?? 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold sm:text-3xl">My Wallet</h1>
        <p className="text-sm text-muted-foreground">
          Save money for dues, welfare contributions, and fines. Top up via M-Pesa anytime.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <WalletBalanceCard
          balance={balance}
          currency={wallet?.currency || 'KES'}
          status={wallet?.status || 'active'}
          onTopUp={() => setTopUpOpen(true)}
          className="lg:col-span-2"
        />

        <Card>
          <CardContent className="space-y-3 p-5 text-sm">
            <div className="flex items-start gap-2">
              <Shield className="mt-0.5 h-4 w-4 text-primary shrink-0" />
              <div>
                <p className="font-semibold">Safe & Audited</p>
                <p className="text-xs text-muted-foreground">
                  Every credit and debit is recorded on a tamper-proof ledger visible to the Treasurer.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <Smartphone className="mt-0.5 h-4 w-4 text-primary shrink-0" />
              <div>
                <p className="font-semibold">Instant top-up</p>
                <p className="text-xs text-muted-foreground">
                  Funds appear automatically once your M-Pesa payment is confirmed.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <HandHeart className="mt-0.5 h-4 w-4 text-primary shrink-0" />
              <div>
                <p className="font-semibold">Spend inside the CBO</p>
                <p className="text-xs text-muted-foreground">
                  Pay monthly dues, donate to welfare cases, or settle fines — all from one balance.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <AlertTriangle className="mt-0.5 h-4 w-4 text-amber-500 shrink-0" />
              <div>
                <p className="font-semibold">No external withdrawals</p>
                <p className="text-xs text-muted-foreground">
                  Wallet funds stay inside the CBO. Contact the Treasurer for refunds.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <WalletTransactionList transactions={transactions} />

      <WalletTopUpDialog open={topUpOpen} onOpenChange={setTopUpOpen} />
    </div>
  );
};

export default WalletPage;
