import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, Calendar, Smartphone, Wallet as WalletIcon, ArrowDownToLine, HeartHandshake, Phone, Users } from 'lucide-react';
import { useKittyDetail } from '@/hooks/useKitties';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import KittyContributeDialog from '@/components/kitty/KittyContributeDialog';
import KittyDisburseDialog from '@/components/kitty/KittyDisburseDialog';

const KittyDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const { hasRole } = useAuth();
  const { kitty, contributions, disbursements, loading, contributeFromWallet, recordDisbursement } =
    useKittyDetail(id);

  const [memberNames, setMemberNames] = useState<Record<string, string>>({});

  useEffect(() => {
    const ids = Array.from(new Set(contributions.map((c) => c.member_id))).filter(
      (mid) => mid && !memberNames[mid]
    );
    if (ids.length === 0) return;
    (async () => {
      const { data } = await supabase
        .from('profiles')
        .select('id, full_name, membership_number')
        .in('id', ids);
      if (data) {
        setMemberNames((prev) => {
          const next = { ...prev };
          for (const p of data as Array<{ id: string; full_name: string | null; membership_number: string | null }>) {
            next[p.id] = p.full_name || p.membership_number || 'Member';
          }
          return next;
        });
      }
    })();
  }, [contributions, memberNames]);

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

      {kitty.beneficiary_name && (
        <Card className="border-primary/30 bg-primary/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <HeartHandshake className="w-5 h-5 text-primary" />
              Beneficiary
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div>
              <p className="text-lg font-semibold">{kitty.beneficiary_name}</p>
              {kitty.beneficiary_relationship && (
                <p className="text-sm text-muted-foreground inline-flex items-center gap-1">
                  <Users className="w-3.5 h-3.5" /> {kitty.beneficiary_relationship}
                </p>
              )}
            </div>
            {kitty.beneficiary_phone && (
              <p className="text-sm inline-flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-muted-foreground" />
                <a href={`tel:${kitty.beneficiary_phone}`} className="text-primary hover:underline">
                  {kitty.beneficiary_phone}
                </a>
              </p>
            )}
            {kitty.beneficiary_details && (
              <p className="text-sm whitespace-pre-line pt-1 border-t">{kitty.beneficiary_details}</p>
            )}
          </CardContent>
        </Card>
      )}

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
                        {memberNames[c.member_id] || 'Loading…'} • KES {Number(c.amount).toLocaleString()}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        Ref: {c.reference || '—'} • {new Date(c.created_at).toLocaleString()}
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
