import { useMemo, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { Wallet, HandCoins, Target } from 'lucide-react';
import { useKitties } from '@/hooks/useKitties';
import { useAuth } from '@/hooks/useAuth';
import KittyCard from '@/components/kitty/KittyCard';
import KittyCreateDialog from '@/components/kitty/KittyCreateDialog';

const FILTERS = [
  { value: 'all', label: 'All' },
  { value: 'emergency', label: '🚨 Emergency' },
  { value: 'education', label: '🎓 Education' },
  { value: 'welfare', label: '🤝 Welfare' },
  { value: 'project', label: '🏗️ Project' },
  { value: 'other', label: '📦 Other' },
];

const KittiesPage = () => {
  const { kitties, loading, refresh } = useKitties();
  const { hasRole } = useAuth();
  const [filter, setFilter] = useState<string>('all');

  const canManage = hasRole('admin') || hasRole('treasurer') || hasRole('chairperson');

  const filtered = useMemo(
    () => (filter === 'all' ? kitties : kitties.filter((k) => k.category === filter)),
    [kitties, filter]
  );

  const totals = useMemo(() => {
    const balance = kitties.reduce((s, k) => s + Number(k.balance || 0), 0);
    const target = kitties.reduce((s, k) => s + Number(k.target_amount || 0), 0);
    const active = kitties.filter((k) => k.status === 'active').length;
    return { balance, target, active };
  }, [kitties]);

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Community Kitties</h1>
          <p className="text-sm text-muted-foreground">
            Goal-based funds for emergencies, education, projects and welfare. Contribute via M-Pesa or your wallet.
          </p>
        </div>
        {canManage && <KittyCreateDialog onCreated={refresh} />}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <Wallet className="w-8 h-8 text-primary" />
            <div>
              <p className="text-xs text-muted-foreground">Total balance</p>
              <p className="text-lg font-bold">KES {totals.balance.toLocaleString()}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <Target className="w-8 h-8 text-primary" />
            <div>
              <p className="text-xs text-muted-foreground">Combined target</p>
              <p className="text-lg font-bold">KES {totals.target.toLocaleString()}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <HandCoins className="w-8 h-8 text-primary" />
            <div>
              <p className="text-xs text-muted-foreground">Active kitties</p>
              <p className="text-lg font-bold">{totals.active}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs value={filter} onValueChange={setFilter}>
        <TabsList className="flex flex-wrap h-auto">
          {FILTERS.map((f) => (
            <TabsTrigger key={f.value} value={f.value}>
              {f.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-56 rounded-lg" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center text-muted-foreground">
            <HandCoins className="w-12 h-12 mx-auto mb-3 opacity-40" />
            <p>No kitties yet in this category.</p>
            {canManage && <p className="text-sm mt-1">Click "New Kitty" to start one.</p>}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((k) => (
            <KittyCard key={k.id} kitty={k} />
          ))}
        </div>
      )}
    </div>
  );
};

export default KittiesPage;
