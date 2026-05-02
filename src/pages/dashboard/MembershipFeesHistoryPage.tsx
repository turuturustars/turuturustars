import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CreditCard, CheckCircle, Clock, AlertCircle, Search, Download, RefreshCw, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import { useAuth } from '@/hooks/useAuth';
import { useDebounce } from '@/hooks/useDebounce';

interface FeeRow {
  id: string;
  member_id: string;
  amount: number;
  status: string;
  reference_number: string | null;
  due_date: string | null;
  paid_at: string | null;
  created_at: string | null;
  notes: string | null;
  member_name: string;
  membership_number: string | null;
  member_phone: string | null;
}

const PAGE_SIZE = 50;

const statusBadge = (status: string) => {
  const cls =
    status === 'paid'
      ? 'bg-green-100 text-green-800 border-green-200'
      : status === 'missed'
      ? 'bg-red-100 text-red-800 border-red-200'
      : 'bg-yellow-100 text-yellow-800 border-yellow-200';
  const Icon = status === 'paid' ? CheckCircle : status === 'missed' ? AlertCircle : Clock;
  return (
    <Badge variant="outline" className={cls}>
      <Icon className="h-3 w-3 mr-1" />
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </Badge>
  );
};

const MembershipFeesHistoryPage = () => {
  const { roles } = useAuth();
  const [rows, setRows] = useState<FeeRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [fromDate, setFromDate] = useState<string>('');
  const [toDate, setToDate] = useState<string>('');
  const debouncedSearch = useDebounce(search, 350);

  const isOfficial = useMemo(
    () =>
      roles?.some((r) =>
        ['admin', 'treasurer', 'chairperson', 'secretary'].includes(r as string)
      ) ?? false,
    [roles]
  );

  // Track last cursor in a ref for pagination
  const cursorRef = useRef<{ created_at: string | null; id: string | null }>({ created_at: null, id: null });
  const reqIdRef = useRef(0);

  const fetchPage = useCallback(
    async ({ reset }: { reset: boolean }) => {
      if (!isOfficial) {
        setLoading(false);
        return;
      }

      const myReq = ++reqIdRef.current;
      if (reset) {
        setLoading(true);
        setError(null);
        cursorRef.current = { created_at: null, id: null };
      } else {
        setLoadingMore(true);
      }

      try {
        const { data, error } = await supabase.rpc('get_membership_fee_history', {
          _search: debouncedSearch.trim() || null,
          _status: statusFilter === 'all' ? null : statusFilter,
          _from_date: fromDate ? new Date(fromDate).toISOString() : null,
          _to_date: toDate ? new Date(`${toDate}T23:59:59.999Z`).toISOString() : null,
          _cursor_created_at: reset ? null : cursorRef.current.created_at,
          _cursor_id: reset ? null : cursorRef.current.id,
          _limit: PAGE_SIZE,
        } as never);

        if (myReq !== reqIdRef.current) return; // stale
        if (error) throw error;

        const page: FeeRow[] = ((data as unknown as FeeRow[]) ?? []).map((c) => ({
          ...c,
          amount: Number(c.amount),
          status: c.status ?? 'pending',
          member_name: c.member_name ?? 'Unknown member',
        }));

        setHasMore(page.length === PAGE_SIZE);
        if (page.length > 0) {
          const last = page[page.length - 1];
          cursorRef.current = { created_at: last.created_at, id: last.id };
        }
        setRows((prev) => (reset ? page : [...prev, ...page]));
      } catch (err) {
        if (myReq !== reqIdRef.current) return;
        const msg = err instanceof Error ? err.message : 'Failed to load membership fee history';
        console.error('Membership fee history load error:', err);
        setError(msg);
        if (reset) setRows([]);
      } finally {
        if (myReq === reqIdRef.current) {
          setLoading(false);
          setLoadingMore(false);
        }
      }
    },
    [isOfficial, debouncedSearch, statusFilter, fromDate, toDate]
  );

  // Reload whenever filters change
  useEffect(() => {
    fetchPage({ reset: true });
  }, [fetchPage]);

  const totals = useMemo(() => {
    const paid = rows.filter((r) => r.status === 'paid');
    return {
      count: rows.length,
      paidCount: paid.length,
      paidAmount: paid.reduce((s, r) => s + r.amount, 0),
      pendingAmount: rows
        .filter((r) => r.status !== 'paid')
        .reduce((s, r) => s + r.amount, 0),
    };
  }, [rows]);

  const exportCsv = () => {
    const header = ['Member', 'Membership #', 'Phone', 'Amount (KES)', 'Status', 'Due Date', 'Paid At', 'Reference', 'Recorded'];
    const lines = rows.map((r) => [
      r.member_name,
      r.membership_number ?? '',
      r.member_phone ?? '',
      r.amount,
      r.status,
      r.due_date ?? '',
      r.paid_at ?? '',
      r.reference_number ?? '',
      r.created_at ?? '',
    ].map((v) => `"${String(v).replace(/"/g, '""')}"`).join(','));
    const csv = [header.join(','), ...lines].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `membership-fees-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const resetFilters = () => {
    setSearch('');
    setStatusFilter('all');
    setFromDate('');
    setToDate('');
  };

  if (!isOfficial) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Access denied</CardTitle>
          <CardDescription>This page is restricted to officials.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="relative overflow-hidden rounded-2xl border-2 border-primary/10 bg-gradient-to-br from-primary/5 via-purple-50/40 to-transparent p-6 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-primary/10 border border-primary/20">
              <CreditCard className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Membership Fee Payment History</h1>
              <p className="text-sm text-muted-foreground">
                Amounts, statuses and timestamps for every member
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => fetchPage({ reset: true })} disabled={loading}>
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} /> Refresh
            </Button>
            <Button variant="outline" onClick={exportCsv} disabled={rows.length === 0}>
              <Download className="h-4 w-4 mr-2" /> Export CSV
            </Button>
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card><CardHeader className="pb-3"><CardTitle className="text-sm">Records loaded</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold">{totals.count}</div></CardContent></Card>
        <Card><CardHeader className="pb-3"><CardTitle className="text-sm">Paid</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold">{totals.paidCount}</div></CardContent></Card>
        <Card><CardHeader className="pb-3"><CardTitle className="text-sm">Total Collected</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold">KES {totals.paidAmount.toLocaleString()}</div></CardContent></Card>
        <Card><CardHeader className="pb-3"><CardTitle className="text-sm">Outstanding</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold">KES {totals.pendingAmount.toLocaleString()}</div></CardContent></Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle>All Payments</CardTitle>
                <CardDescription>Filter by member, phone, reference, status or date range</CardDescription>
              </div>
              <Button variant="ghost" size="sm" onClick={resetFilters}>Clear filters</Button>
            </div>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  className="pl-8"
                  placeholder="Member, phone, reference…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  <SelectItem value="paid">Paid</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="missed">Missed</SelectItem>
                </SelectContent>
              </Select>
              <Input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                aria-label="From date"
              />
              <Input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                aria-label="To date"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12 gap-3">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Loading payment history…</p>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-12 gap-3 text-center">
              <AlertCircle className="h-8 w-8 text-destructive" />
              <div>
                <p className="font-medium">Couldn't load payments</p>
                <p className="text-sm text-muted-foreground max-w-md">{error}</p>
              </div>
              <Button onClick={() => fetchPage({ reset: true })}>
                <RefreshCw className="h-4 w-4 mr-2" /> Try again
              </Button>
            </div>
          ) : rows.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 gap-3 text-center">
              <CreditCard className="h-8 w-8 text-muted-foreground" />
              <div>
                <p className="font-medium">No payment records found</p>
                <p className="text-sm text-muted-foreground">
                  Try adjusting your filters or clearing them to see all records.
                </p>
              </div>
              <Button variant="outline" onClick={resetFilters}>Clear filters</Button>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[820px] text-sm">
                  <thead>
                    <tr className="border-b text-left">
                      <th className="py-2 px-2 font-semibold">Member</th>
                      <th className="py-2 px-2 font-semibold">Amount</th>
                      <th className="py-2 px-2 font-semibold">Status</th>
                      <th className="py-2 px-2 font-semibold">Due</th>
                      <th className="py-2 px-2 font-semibold">Paid At</th>
                      <th className="py-2 px-2 font-semibold">Reference</th>
                      <th className="py-2 px-2 font-semibold">Recorded</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r) => (
                      <tr key={r.id} className="border-b hover:bg-muted/40">
                        <td className="py-3 px-2">
                          <div className="font-medium">{r.member_name}</div>
                          <div className="text-xs text-muted-foreground">
                            {r.membership_number ?? '—'}{r.member_phone ? ` · ${r.member_phone}` : ''}
                          </div>
                        </td>
                        <td className="py-3 px-2 font-semibold">KES {r.amount.toLocaleString()}</td>
                        <td className="py-3 px-2">{statusBadge(r.status)}</td>
                        <td className="py-3 px-2">{r.due_date ? format(new Date(r.due_date), 'dd MMM yyyy') : '—'}</td>
                        <td className="py-3 px-2">{r.paid_at ? format(new Date(r.paid_at), 'dd MMM yyyy HH:mm') : '—'}</td>
                        <td className="py-3 px-2 text-xs">{r.reference_number ?? '—'}</td>
                        <td className="py-3 px-2 text-xs text-muted-foreground">
                          {r.created_at ? format(new Date(r.created_at), 'dd MMM yyyy') : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex items-center justify-center pt-4">
                {hasMore ? (
                  <Button
                    variant="outline"
                    onClick={() => fetchPage({ reset: false })}
                    disabled={loadingMore}
                  >
                    {loadingMore ? (
                      <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Loading…</>
                    ) : (
                      <>Load more</>
                    )}
                  </Button>
                ) : (
                  <p className="text-xs text-muted-foreground">No more records.</p>
                )}
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default MembershipFeesHistoryPage;
