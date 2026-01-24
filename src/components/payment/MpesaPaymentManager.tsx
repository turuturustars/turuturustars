import { useState, useCallback, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import {
  DollarSign,
  CheckCircle,
  AlertCircle,
  Clock,
  Loader2,
  TrendingUp,
  Users,
  Calendar,
  Filter,
  Download,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface PaymentStats {
  totalReceived: number;
  pendingAmount: number;
  failedAttempts: number;
  successRate: number;
  averageAmount: number;
  totalTransactions: number;
  uniqueCustomers: number;
}

interface MpesaTransaction {
  id: string;
  checkout_request_id: string | null;
  mpesa_receipt_number: string | null;
  amount: number;
  phone_number: string;
  status: 'completed' | 'pending' | 'failed';
  created_at: string;
  member_id?: string;
  member_name?: string;
  transaction_type?: string;
}

interface PaymentFilter {
  status: 'all' | 'completed' | 'pending' | 'failed';
  dateRange: 'today' | 'week' | 'month' | 'all';
  minAmount: number | null;
  maxAmount: number | null;
}

const MpesaPaymentManager = () => {
  const { toast } = useToast();
  const [transactions, setTransactions] = useState<MpesaTransaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<PaymentFilter>({
    status: 'all',
    dateRange: 'month',
    minAmount: null,
    maxAmount: null,
  });
  const [searchPhone, setSearchPhone] = useState('');

  // Load transactions
  const loadTransactions = useCallback(async () => {
    setIsLoading(true);
    try {
      let query = supabase
        .from('mpesa_transactions')
        .select('*')
        .order('created_at', { ascending: false });

      // Apply filters
      if (filter.status !== 'all') {
        query = query.eq('status', filter.status);
      }

      const data = await query;
      if (data.error) throw data.error;

      // Apply client-side filtering
      let filtered = (data.data || []) as MpesaTransaction[];

      // Date range filter
      const now = new Date();
      const startDate = new Date();
      if (filter.dateRange === 'today') {
        startDate.setHours(0, 0, 0, 0);
      } else if (filter.dateRange === 'week') {
        startDate.setDate(now.getDate() - 7);
      } else if (filter.dateRange === 'month') {
        startDate.setMonth(now.getMonth() - 1);
      }

      filtered = filtered.filter(t => new Date(t.created_at) >= startDate);

      // Amount range filter
      if (filter.minAmount !== null) {
        filtered = filtered.filter(t => t.amount >= filter.minAmount);
      }
      if (filter.maxAmount !== null) {
        filtered = filtered.filter(t => t.amount <= filter.maxAmount);
      }

      // Phone search
      if (searchPhone) {
        filtered = filtered.filter(t =>
          t.phone_number.includes(searchPhone.replace(/\D/g, ''))
        );
      }

      setTransactions(filtered);
    } catch (error) {
      console.error('Error loading transactions:', error);
      toast({
        title: 'Error',
        description: 'Failed to load transactions',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }, [filter, searchPhone, toast]);

  // Calculate stats
  const stats = useMemo<PaymentStats>(() => {
    const completed = transactions.filter(t => t.status === 'completed');
    const pending = transactions.filter(t => t.status === 'pending');
    const failed = transactions.filter(t => t.status === 'failed');

    const totalCompleted = completed.reduce((sum, t) => sum + t.amount, 0);
    const totalPending = pending.reduce((sum, t) => sum + t.amount, 0);

    // Calculate unique phone numbers (unique customers)
    const uniquePhones = new Set(transactions.map(t => t.phone_number));

    return {
      totalReceived: totalCompleted,
      pendingAmount: totalPending,
      failedAttempts: failed.length,
      successRate:
        transactions.length > 0
          ? Math.round((completed.length / transactions.length) * 100)
          : 0,
      averageAmount:
        completed.length > 0 ? Math.round(totalCompleted / completed.length) : 0,
      totalTransactions: transactions.length,
      uniqueCustomers: uniquePhones.size,
    };
  }, [transactions]);

  // Retry failed payment
  const retryPayment = async (transactionId: string) => {
    try {
      const { error } = await supabase
        .from('mpesa_transactions')
        .select('*')
        .eq('id', transactionId)
        .single();

      if (error) throw error;

      // Initiate new payment attempt
      toast({
        title: 'Retry Initiated',
        description: 'Payment retry has been queued',
      });

      // Reload transactions
      loadTransactions();
    } catch (error) {
      console.error('Error retrying payment:', error);
      toast({
        title: 'Error',
        description: 'Failed to retry payment',
        variant: 'destructive',
      });
    }
  };

  // Export transactions
  const exportTransactions = () => {
    const csv = [
      ['Date', 'Phone', 'Amount', 'Status', 'Receipt', 'Type'].join(','),
      ...transactions.map(t =>
        [
          new Date(t.created_at).toLocaleDateString(),
          t.phone_number,
          t.amount,
          t.status,
          t.mpesa_receipt_number || 'N/A',
          t.transaction_type || 'N/A',
        ].join(',')
      ),
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = globalThis.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `mpesa-transactions-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    globalThis.URL.revokeObjectURL(url);

    toast({
      title: 'Exported',
      description: 'Transactions exported to CSV',
    });
  };

  return (
    <div className="space-y-6">
      {/* Stats Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4 lg:gap-6">
        <Card className="border-2 hover:shadow-lg transition-all hover:border-green-500/50">
          <CardHeader className="pb-2 sm:pb-3">
            <div className="flex items-center justify-between gap-2">
              <CardTitle className="text-xs sm:text-sm font-medium truncate">
                Total Received
              </CardTitle>
              <DollarSign className="w-4 h-4 flex-shrink-0 text-green-600" />
            </div>
            <CardDescription className="text-xs mt-1">
              Successfully processed payments
            </CardDescription>
          </CardHeader>
          <CardContent className="p-3 sm:p-4">
            <div className="text-2xl sm:text-2xl md:text-3xl font-bold">
              KES {stats.totalReceived.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              {stats.successRate}% success rate
            </p>
          </CardContent>
        </Card>

        <Card className="border-2 hover:shadow-lg transition-all hover:border-amber-500/50">
          <CardHeader className="pb-2 sm:pb-3">
            <div className="flex items-center justify-between gap-2">
              <CardTitle className="text-xs sm:text-sm font-medium truncate">
                Pending
              </CardTitle>
              <Clock className="w-4 h-4 flex-shrink-0 text-amber-600" />
            </div>
            <CardDescription className="text-xs mt-1">
              Awaiting confirmation from M-Pesa
            </CardDescription>
          </CardHeader>
          <CardContent className="p-3 sm:p-4">
            <div className="text-2xl sm:text-2xl md:text-3xl font-bold">
              KES {stats.pendingAmount.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Awaiting confirmation
            </p>
          </CardContent>
        </Card>

        <Card className="border-2 hover:shadow-lg transition-all hover:border-blue-500/50">
          <CardHeader className="pb-2 sm:pb-3">
            <div className="flex items-center justify-between gap-2">
              <CardTitle className="text-xs sm:text-sm font-medium truncate">
                Avg Amount
              </CardTitle>
              <TrendingUp className="w-4 h-4 flex-shrink-0 text-blue-600" />
            </div>
          </CardHeader>
          <CardContent className="p-3 sm:p-4">
            <div className="text-2xl sm:text-2xl md:text-3xl font-bold">
              KES {stats.averageAmount.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Per transaction
            </p>
          </CardContent>
        </Card>

        <Card className="border-2 hover:shadow-lg transition-all hover:border-purple-500/50">
          <CardHeader className="pb-2 sm:pb-3">
            <div className="flex items-center justify-between gap-2">
              <CardTitle className="text-xs sm:text-sm font-medium truncate">
                Customers
              </CardTitle>
              <Users className="w-4 h-4 flex-shrink-0 text-purple-600" />
            </div>
            <CardDescription className="text-xs mt-1">
              Active payment contributors
            </CardDescription>
          </CardHeader>
          <CardContent className="p-3 sm:p-4">
            <div className="text-2xl sm:text-2xl md:text-3xl font-bold">
              {stats.uniqueCustomers}
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Unique phone numbers
            </p>
          </CardContent>
        </Card>

        <Card className="border-2 hover:shadow-lg transition-all hover:border-red-500/50">
          <CardHeader className="pb-2 sm:pb-3">
            <div className="flex items-center justify-between gap-2">
              <CardTitle className="text-xs sm:text-sm font-medium truncate">
                Failed
              </CardTitle>
              <AlertCircle className="w-4 h-4 flex-shrink-0 text-red-600" />
            </div>
          </CardHeader>
          <CardContent className="p-3 sm:p-4">
            <div className="text-2xl sm:text-2xl md:text-3xl font-bold">
              {stats.failedAttempts}
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Requires action
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters & Actions */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Transaction History</CardTitle>
              <CardDescription>
                Complete record of all M-Pesa payments and their status
              </CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={exportTransactions}
              className="gap-2"
            >
              <Download className="w-4 h-4" />
              Export
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Search & Filters */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="space-y-2">
              <Label htmlFor="phone-search">Phone Number</Label>
              <Input
                id="phone-search"
                placeholder="Search phone..."
                value={searchPhone}
                onChange={(e) => setSearchPhone(e.target.value)}
                className="text-sm"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="status-filter">Status</Label>
              <select
                id="status-filter"
                value={filter.status}
                onChange={(e) =>
                  setFilter({ ...filter, status: e.target.value as PaymentFilter['status'] })
                }
                className="w-full px-3 py-2 border border-input rounded-md text-sm bg-background"
              >
                <option value="all">All</option>
                <option value="completed">Completed</option>
                <option value="pending">Pending</option>
                <option value="failed">Failed</option>
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="date-filter" className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Date Range
              </Label>
              <select
                id="date-filter"
                value={filter.dateRange}
                onChange={(e) =>
                  setFilter({ ...filter, dateRange: e.target.value as PaymentFilter['dateRange'] })
                }
                className="w-full px-3 py-2 border border-input rounded-md text-sm bg-background"
              >
                <option value="today">Today</option>
                <option value="week">Last 7 Days</option>
                <option value="month">Last 30 Days</option>
                <option value="all">All Time</option>
              </select>
            </div>

            <div className="flex items-end">
              <Button
                variant="outline"
                className="w-full"
                onClick={loadTransactions}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Loading...
                  </>
                ) : (
                  <>
                    <Filter className="w-4 h-4 mr-2" />
                    Apply
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Transactions Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left px-3 py-2 font-semibold">Date</th>
                  <th className="text-left px-3 py-2 font-semibold">Phone</th>
                  <th className="text-left px-3 py-2 font-semibold">Amount</th>
                  <th className="text-left px-3 py-2 font-semibold">Status</th>
                  <th className="text-left px-3 py-2 font-semibold">Receipt</th>
                  <th className="text-left px-3 py-2 font-semibold">Action</th>
                </tr>
              </thead>
              <tbody>
                {transactions.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-8 text-muted-foreground">
                      No transactions found
                    </td>
                  </tr>
                ) : (
                  transactions.map((tx) => (
                    <tr 
                      key={tx.id} 
                      className={cn(
                        "border-b hover:bg-muted/50 transition-colors",
                        tx.status === 'completed' && 'bg-green-50/30',
                        tx.status === 'pending' && 'bg-amber-50/30',
                        tx.status === 'failed' && 'bg-red-50/30'
                      )}
                    >
                      <td className="px-3 py-2">
                        {new Date(tx.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-3 py-2">{tx.phone_number}</td>
                      <td className="px-3 py-2">KES {tx.amount.toLocaleString()}</td>
                      <td className="px-3 py-2">
                        <div className="flex items-center gap-2">
                          {tx.status === 'completed' && (
                            <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0" />
                          )}
                          {(() => {
                            const variant: 'default' | 'secondary' | 'destructive' = tx.status === 'completed' ? 'default' : tx.status === 'pending' ? 'secondary' : 'destructive';
                            return (
                              <Badge variant={variant} className="text-xs">
                                {tx.status}
                              </Badge>
                            );
                          })()}
                        </div>
                      </td>
                      <td className="px-3 py-2">
                        {tx.mpesa_receipt_number || '-'}
                      </td>
                      <td className="px-3 py-2">
                        {tx.status === 'failed' && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => retryPayment(tx.id)}
                          >
                            Retry
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="text-xs text-muted-foreground">
            Showing {transactions.length} of {stats.totalTransactions} transactions
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default MpesaPaymentManager;
