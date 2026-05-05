import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, Calendar, Smartphone, Wallet as WalletIcon, ArrowDownToLine, RotateCw } from 'lucide-react';
import { useKittyDetail } from '@/hooks/useKitties';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import KittyContributeDialog from '@/components/kitty/KittyContributeDialog';
import KittyDisburseDialog from '@/components/kitty/KittyDisburseDialog';
import KittyBeneficiariesTab from '@/components/kitty/KittyBeneficiariesTab';
import KittyTopContributors from '@/components/kitty/KittyTopContributors';

const KittyDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, hasRole } = useAuth();
  const { kitty, contributions, disbursements, loading, contributeFromWallet, recordDisbursement } =
    useKittyDetail(id);

  const [memberNames, setMemberNames] = useState<Record<string, string>>({});
  const [startingRound, setStartingRound] = useState(false);

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
  const canManage = hasRole('admin') || hasRole('treasurer') || hasRole('chairperson');

  const startNewRound = async () => {
    if (!kitty || !user?.id) return;
    if (!confirm(`Start Round ${kitty.round_number + 1} for "${kitty.title}"? This creates a fresh kitty linked to this one.`)) return;
    setStartingRound(true);
    const { data, error } = await supabase
      .from('kitties' as never)
      .insert({
        title: kitty.title,
        description: kitty.description,
        category: kitty.category,
        target_amount: kitty.target_amount,
        created_by: user.id,
        round_number: kitty.round_number + 1,
        parent_kitty_id: kitty.parent_kitty_id || kitty.id,
      } as never)
      .select('id')
      .single();
    setStartingRound(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(`Round ${kitty.round_number + 1} started`);
    const newId = (data as unknown as { id: string })?.id;
    if (newId) navigate(`/dashboard/finance/kitties/${newId}`);
  };

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
            <h1 className="text-2xl font-bold tracking-tight">
              {kitty.title}
              {kitty.round_number > 1 && (
                <span className="ml-2 text-base font-normal text-muted-foreground">
                  Round {kitty.round_number}
                </span>
              )}
            </h1>
            <div className="flex items-center gap-2 pt-1 flex-wrap">
              <Badge variant="secondary" className="capitalize">{kitty.category}</Badge>
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
          <div className="flex gap-2 flex-wrap">
            <KittyContributeDialog
              kitty={kitty}
              onContribute={async (amount, notes) => {
                const r = await contributeFromWallet(amount, notes);
                return { new_balance: r.new_balance, reference: r.reference };
              }}
            />
            {canDisburse && <KittyDisburseDialog kitty={kitty} onDisburse={recordDisbursement} />}
            {canManage && (
              <Button variant="outline" size="sm" className="gap-1" onClick={startNewRound} disabled={startingRound}>
                <RotateCw className="w-4 h-4" /> Start Round {kitty.round_number + 1}
              </Button>
            )}
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

      <Tabs defaultValue="activity" className="w-full">
        <TabsList className="grid grid-cols-3 w-full max-w-md">
          <TabsTrigger value="activity">Activity</TabsTrigger>
          <TabsTrigger value="beneficiaries">Beneficiaries</TabsTrigger>
          <TabsTrigger value="top">Top Givers</TabsTrigger>
        </TabsList>

        <TabsContent value="activity" className="space-y-4">
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
        </TabsContent>

        <TabsContent value="beneficiaries">
          {id && <KittyBeneficiariesTab kittyId={id} />}
        </TabsContent>

        <TabsContent value="top">
          {id && <KittyTopContributors kittyId={id} limit={20} />}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default KittyDetailPage;
