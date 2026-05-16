import { useMemo, useState } from 'react';
import { AlertCircle, HandCoins, RefreshCw, Search, Target, TrendingUp, Wallet } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { EmptyState } from '@/components/ui/empty-state';
import { useKitties } from '@/hooks/useKitties';
import { useAuth } from '@/hooks/useAuth';
import KittyCard from '@/components/kitty/KittyCard';
import KittyCreateDialog from '@/components/kitty/KittyCreateDialog';
import KittyTopContributors from '@/components/kitty/KittyTopContributors';
import { cn } from '@/lib/utils';
import {
  formatKes,
  getKittyProgress,
  KITTY_CATEGORY_META,
  KITTY_STATUS_LABELS,
  type KittyCategoryKey,
  type KittyStatusKey,
} from '@/lib/kittyUtils';

const CATEGORY_FILTERS: Array<{ value: 'all' | KittyCategoryKey; label: string }> = [
  { value: 'all', label: 'All categories' },
  { value: 'emergency', label: KITTY_CATEGORY_META.emergency.label },
  { value: 'education', label: KITTY_CATEGORY_META.education.label },
  { value: 'welfare', label: KITTY_CATEGORY_META.welfare.label },
  { value: 'project', label: KITTY_CATEGORY_META.project.label },
  { value: 'other', label: KITTY_CATEGORY_META.other.label },
];

const STATUS_FILTERS: Array<{ value: 'all' | KittyStatusKey; label: string }> = [
  { value: 'all', label: 'Any status' },
  { value: 'active', label: KITTY_STATUS_LABELS.active },
  { value: 'paused', label: KITTY_STATUS_LABELS.paused },
  { value: 'completed', label: KITTY_STATUS_LABELS.completed },
  { value: 'closed', label: KITTY_STATUS_LABELS.closed },
];

const SORT_OPTIONS = [
  { value: 'newest', label: 'Newest' },
  { value: 'target', label: 'Highest target' },
  { value: 'balance', label: 'Highest balance' },
  { value: 'progress', label: 'Most funded' },
];

const KittiesPage = () => {
  const { kitties, loading, error, refresh } = useKitties();
  const { hasRole } = useAuth();
  const [categoryFilter, setCategoryFilter] = useState<'all' | KittyCategoryKey>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | KittyStatusKey>('active');
  const [sort, setSort] = useState('newest');
  const [query, setQuery] = useState('');

  const canManage = hasRole('admin') || hasRole('treasurer') || hasRole('chairperson');

  const filtered = useMemo(() => {
    const search = query.trim().toLowerCase();

    return kitties
      .filter((kitty) => {
        if (categoryFilter !== 'all' && kitty.category !== categoryFilter) return false;
        if (statusFilter !== 'all' && kitty.status !== statusFilter) return false;
        if (!search) return true;

        return [kitty.title, kitty.description, kitty.beneficiary_name, kitty.beneficiary_details]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(search));
      })
      .sort((a, b) => {
        if (sort === 'target') return Number(b.target_amount || 0) - Number(a.target_amount || 0);
        if (sort === 'balance') return Number(b.balance || 0) - Number(a.balance || 0);
        if (sort === 'progress') {
          return getKittyProgress(b.balance, b.target_amount) - getKittyProgress(a.balance, a.target_amount);
        }
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });
  }, [categoryFilter, kitties, query, sort, statusFilter]);

  const totals = useMemo(() => {
    const balance = kitties.reduce((sum, kitty) => sum + Number(kitty.balance || 0), 0);
    const target = kitties.reduce((sum, kitty) => sum + Number(kitty.target_amount || 0), 0);
    const contributed = kitties.reduce((sum, kitty) => sum + Number(kitty.total_contributed || 0), 0);
    const active = kitties.filter((kitty) => kitty.status === 'active').length;
    const progress = target > 0 ? Math.min(100, (balance / target) * 100) : 0;

    return { balance, target, contributed, active, progress };
  }, [kitties]);

  return (
    <div className="space-y-5 p-4 sm:p-6">
      <section className="rounded-lg border bg-card p-4 shadow-sm sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="max-w-2xl">
            <p className="text-xs font-semibold uppercase tracking-wide text-primary">Finance</p>
            <h1 className="text-2xl font-bold tracking-tight">Community Kitties</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Shared goal funds for emergencies, education, welfare support and community projects.
            </p>
          </div>
          {canManage && <KittyCreateDialog onCreated={refresh} />}
        </div>

        <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <Card>
            <CardContent className="flex items-center gap-3 p-4">
              <span className="rounded-md border bg-primary/10 p-2 text-primary">
                <Wallet className="h-5 w-5" />
              </span>
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground">Available balance</p>
                <p className="truncate text-lg font-bold">{formatKes(totals.balance)}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-3 p-4">
              <span className="rounded-md border bg-emerald-50 p-2 text-emerald-600 dark:bg-emerald-950/30">
                <TrendingUp className="h-5 w-5" />
              </span>
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground">Total raised</p>
                <p className="truncate text-lg font-bold">{formatKes(totals.contributed)}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-3 p-4">
              <span className="rounded-md border bg-sky-50 p-2 text-sky-600 dark:bg-sky-950/30">
                <Target className="h-5 w-5" />
              </span>
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground">Combined target</p>
                <p className="truncate text-lg font-bold">{formatKes(totals.target)}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-3 p-4">
              <span className="rounded-md border bg-amber-50 p-2 text-amber-600 dark:bg-amber-950/30">
                <HandCoins className="h-5 w-5" />
              </span>
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground">Active kitties</p>
                <p className="truncate text-lg font-bold">
                  {totals.active}
                  <span className="ml-2 text-sm font-medium text-muted-foreground">
                    {totals.progress.toFixed(0)}% funded
                  </span>
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_170px_170px_160px_auto]">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search kitties"
            className="pl-9"
          />
        </div>
        <Select value={categoryFilter} onValueChange={(value) => setCategoryFilter(value as 'all' | KittyCategoryKey)}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {CATEGORY_FILTERS.map((filter) => (
              <SelectItem key={filter.value} value={filter.value}>
                {filter.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as 'all' | KittyStatusKey)}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {STATUS_FILTERS.map((filter) => (
              <SelectItem key={filter.value} value={filter.value}>
                {filter.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={sort} onValueChange={setSort}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {SORT_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button variant="outline" onClick={refresh} disabled={loading} className="gap-2">
          <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} />
          Refresh
        </Button>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Could not load kitties</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {loading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Skeleton key={i} className="h-64 rounded-lg" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent>
            <EmptyState
              icon={<HandCoins className="h-12 w-12 text-muted-foreground/50" />}
              title="No matching kitties"
              description="Try another category, status, or search term."
              action={canManage ? <KittyCreateDialog onCreated={refresh} /> : undefined}
            />
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_22rem]">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 2xl:grid-cols-3">
            {filtered.map((kitty) => (
              <KittyCard key={kitty.id} kitty={kitty} />
            ))}
          </div>
          <aside className="h-fit xl:sticky xl:top-4">
            <KittyTopContributors limit={10} />
          </aside>
        </div>
      )}
    </div>
  );
};

export default KittiesPage;
