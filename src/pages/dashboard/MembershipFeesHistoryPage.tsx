import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CreditCard, CheckCircle, Clock, AlertCircle, Search, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import { useAuth } from '@/hooks/useAuth';

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
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const isOfficial = useMemo(
    () =>
      roles?.some((r) =>
        ['admin', 'treasurer', 'chairperson', 'secretary'].includes(r as string)
      ) ?? false,
    [roles]
  );

  useEffect(() => {
    if (!isOfficial) {
      setLoading(false);
      return;
    }
    const fetchAll = async () => {
      setLoading(true);
      try {
        // Single joined query via PostgREST embedding (FK: contributions.member_id -> profiles.id)
        const { data, error } = await supabase
          .from('contributions')
          .select(`
            id,
            member_id,
            amount,
            status,
            reference_number,
            due_date,
            paid_at,
            created_at,
            notes,
            member:profiles!contributions_member_id_fkey (
              full_name,
              membership_number,
              phone
            )
          `)
          .eq('contribution_type', 'membership_fee')
          .order('created_at', { ascending: false })
          .limit(1000);
        if (error) throw error;

        const merged: FeeRow[] = (data ?? []).map((c: any) => ({
          id: c.id,
          member_id: c.member_id,
          amount: Number(c.amount),
          status: c.status ?? 'pending',
          reference_number: c.reference_number,
          due_date: c.due_date,
          paid_at: c.paid_at,
          created_at: c.created_at,
          notes: c.notes,
          member_name: c.member?.full_name ?? 'Unknown member',
          membership_number: c.member?.membership_number ?? null,
          member_phone: c.member?.phone ?? null,
        }));
        setRows(merged);
      } catch (err) {
        console.error('Failed to load membership fee history', err);
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, [isOfficial]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (statusFilter !== 'all' && r.status !== statusFilter) return false;
      if (!q) return true;
      return (
        r.member_name.toLowerCase().includes(q) ||
        (r.membership_number ?? '').toLowerCase().includes(q) ||
        (r.member_phone ?? '').toLowerCase().includes(q) ||
        (r.reference_number ?? '').toLowerCase().includes(q)
      );
    });
  }, [rows, search, statusFilter]);

  const totals = useMemo(() => {
    const paid = filtered.filter((r) => r.status === 'paid');
    return {
      count: filtered.length,
      paidCount: paid.length,
      paidAmount: paid.reduce((s, r) => s + r.amount, 0),
      pendingAmount: filtered
        .filter((r) => r.status !== 'paid')
        .reduce((s, r) => s + r.amount, 0),
    };
  }, [filtered]);

  const exportCsv = () => {
    const header = ['Member', 'Membership #', 'Phone', 'Amount (KES)', 'Status', 'Due Date', 'Paid At', 'Reference', 'Recorded'];
    const lines = filtered.map((r) => [
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
          <Button variant="outline" onClick={exportCsv} disabled={filtered.length === 0}>
            <Download className="h-4 w-4 mr-2" /> Export CSV
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card><CardHeader className="pb-3"><CardTitle className="text-sm">Records</CardTitle></CardHeader>
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
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle>All Payments</CardTitle>
              <CardDescription>Search by member, membership number, phone or reference</CardDescription>
            </div>
            <div className="flex gap-2 flex-col sm:flex-row">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  className="pl-8 w-full sm:w-64"
                  placeholder="Search…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-40"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  <SelectItem value="paid">Paid</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="missed">Missed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center p-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground">No payment records found.</div>
          ) : (
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
                  {filtered.map((r) => (
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
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default MembershipFeesHistoryPage;
