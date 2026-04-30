import { useParams, Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, Calendar, Smartphone, Wallet as WalletIcon, ArrowDownToLine } from 'lucide-react';
import { useKittyDetail } from '@/hooks/useKitties';
import { useAuth } from '@/hooks/useAuth';
import KittyContributeDialog from '@/components/kitty/KittyContributeDialog';
import KittyDisburseDialog from '@/components/kitty/KittyDisburseDialog';

const KittyDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const { hasRole } = useAuth();
  const { kitty, contributions, disbursements, loading, contributeFromWallet, recordDisbursement } =
    useKittyDetail(id);

  const canDisburse = hasRole('admin') || hasRole('treasurer');

  if (loading || !kitty) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-60 w-full" />
      </div>
    );
  }

  const target = Number(kitty.target_amount);
  const balance = Number(kitty.balance);
  const pct = target > 0 ? Math.min(100, (balance / target) * 100) : 0;

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <div>
        <Button asChild variant="ghost" size="sm" className="gap-1 mb-2">
          <Link to="/dashboard/finance/kitties">
            <ArrowLeft className="w-4 h-4" /> Back to Kitties
          </Link>
        </Button>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{kitty.title}</h1>
            <div className="flex items-center gap-2 pt-1">
              <Badge variant="secondary" className="capitalize">
                {kitty.category}
              </Badge>
              <Badge variant={kitty.status === 'active' ? 'default' : 'outline'} className="capitalize">
                {kitty.status}
              </Badge>
              {kitty.deadline && (
                <span className="text-sm text-muted-foreground inline-flex items-center gap-1">
                  <Calendar className="w-3 h-3" /> Deadline {new Date(kitty.deadline).toLocaleDateString()}
                </span>
              )}
            </div>
          </div>
          <div className="flex gap-2">
            <KittyContributeDialog
              kitty={kitty}
              onContribute={async (amount, notes) => {
                const r = await contributeFromWallet(amount, notes);
                return { new_balance: r.new_balance, reference: r.reference };
              }}
            />
            {canDisburse && <KittyDisburseDialog kitty={kitty} onDisburse={recordDisbursement} />}
          </div>
        </div>
      </div>

      {kitty.description && (
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground whitespace-pre-line">{kitty.description}</p>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Funding Progress</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="rounded-lg border p-3">
              <p className="text-xs text-muted-foreground">Balance</p>
              <p className="text-lg font-bold text-primary">KES {balance.toLocaleString()}</p>
            </div>
            <div className="rounded-lg border p-3">
              <p className="text-xs text-muted-foreground">Contributed</p>
              <p className="text-lg font-bold">KES {Number(kitty.total_contributed).toLocaleString()}</p>
            </div>
            <div className="rounded-lg border p-3">
              <p className="text-xs text-muted-foreground">Disbursed</p>
              <p className="text-lg font-bold">KES {Number(kitty.total_disbursed).toLocaleString()}</p>
            </div>
          </div>
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span>Target</span>
              <span className="font-semibold">KES {target.toLocaleString()}</span>
            </div>
            <Progress value={pct} className="h-3" />
            <p className="text-xs text-muted-foreground pt-1">{pct.toFixed(1)}% funded</p>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Recent Contributions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 max-h-[420px] overflow-y-auto">
            {contributions.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">No contributions yet.</p>
            ) : (
              contributions.map((c) => (
                <div key={c.id} className="flex items-center justify-between gap-2 py-2 border-b last:border-0">
                  <div className="flex items-center gap-2 min-w-0">
                    {c.source === 'mpesa' ? (
                      <Smartphone className="w-4 h-4 text-green-600 shrink-0" />
                    ) : (
                      <WalletIcon className="w-4 h-4 text-primary shrink-0" />
                    )}
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">
                        KES {Number(c.amount).toLocaleString()}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {c.reference || c.source} • {new Date(c.created_at).toLocaleString()}
                      </p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Disbursements</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 max-h-[420px] overflow-y-auto">
            {disbursements.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">No disbursements yet.</p>
            ) : (
              disbursements.map((d) => (
                <div key={d.id} className="flex items-start justify-between gap-2 py-2 border-b last:border-0">
                  <div className="flex items-start gap-2 min-w-0">
                    <ArrowDownToLine className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
                    <div className="min-w-0">
                      <p className="text-sm font-medium">KES {Number(d.amount).toLocaleString()}</p>
                      <p className="text-xs text-muted-foreground line-clamp-2">{d.purpose}</p>
                      <p className="text-xs text-muted-foreground">
                        {d.recipient ? `→ ${d.recipient} • ` : ''}
                        {new Date(d.created_at).toLocaleString()}
                      </p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default KittyDetailPage;
