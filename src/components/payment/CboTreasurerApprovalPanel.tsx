import { useCallback, useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import {
  approvePaymentDecision,
  CboExpenditure,
  CboPayment,
  CboRefundRequest,
  FinanceEntityType,
  fetchAwaitingApprovalPayments,
  fetchFinanceApprovalStats,
  fetchPendingExpenditures,
  fetchPendingRefundRequests,
  formatCurrency,
  FinanceApprovalStats,
} from '@/lib/mpesaContributionsApi';
import { usePaginationState, type UsePaginationStateReturn } from '@/hooks/usePaginationState';
import { CheckCircle2, ChevronLeft, ChevronRight, CreditCard, Loader2, ReceiptText, RefreshCw, ShieldX, Undo2 } from 'lucide-react';

type FinanceDecision = 'approved' | 'rejected';

const CboTreasurerApprovalPanel = () => {
  const { hasRole } = useAuth();
  const { toast } = useToast();

  const [awaitingPayments, setAwaitingPayments] = useState<CboPayment[]>([]);
  const [pendingExpenditures, setPendingExpenditures] = useState<CboExpenditure[]>([]);
  const [pendingRefunds, setPendingRefunds] = useState<CboRefundRequest[]>([]);
  const [financeStats, setFinanceStats] = useState<FinanceApprovalStats>({
    completedAmount: 0,
    failedCount: 0,
    awaitingAmount: 0,
    awaitingCount: 0,
    expenditureAmount: 0,
    expenditureCount: 0,
    refundAmount: 0,
    refundCount: 0,
    totalQueueAmount: 0,
    totalQueueCount: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [actingItemKey, setActingItemKey] = useState<string | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const paymentPagination = usePaginationState(25);
  const expenditurePagination = usePaginationState(25);
  const refundPagination = usePaginationState(25);
  const {
    page: paymentPage,
    pageSize: paymentPageSize,
    updateTotal: updatePaymentTotal,
  } = paymentPagination;
  const {
    page: expenditurePage,
    pageSize: expenditurePageSize,
    updateTotal: updateExpenditureTotal,
  } = expenditurePagination;
  const {
    page: refundPage,
    pageSize: refundPageSize,
    updateTotal: updateRefundTotal,
  } = refundPagination;

  const canApprove = hasRole('chairperson') || hasRole('admin') || hasRole('secretary') || hasRole('patron');

  const loadData = useCallback(async () => {
    if (!canApprove) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const [awaiting, summary, expenditures, refunds] = await Promise.all([
        fetchAwaitingApprovalPayments(
          paymentPageSize,
          (paymentPage - 1) * paymentPageSize,
        ),
        fetchFinanceApprovalStats(),
        fetchPendingExpenditures(
          expenditurePageSize,
          (expenditurePage - 1) * expenditurePageSize,
        ),
        fetchPendingRefundRequests(
          refundPageSize,
          (refundPage - 1) * refundPageSize,
        ),
      ]);
      setAwaitingPayments(awaiting);
      setFinanceStats(summary);
      setPendingExpenditures(expenditures);
      setPendingRefunds(refunds);
      updatePaymentTotal(summary.awaitingCount);
      updateExpenditureTotal(summary.expenditureCount);
      updateRefundTotal(summary.refundCount);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to load approval queue';
      toast({
        title: 'Approval queue error',
        description: message,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }, [
    canApprove,
    expenditurePage,
    expenditurePageSize,
    paymentPage,
    paymentPageSize,
    refundPage,
    refundPageSize,
    toast,
    updateExpenditureTotal,
    updatePaymentTotal,
    updateRefundTotal,
  ]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const stats = useMemo(() => {
    const expenditureAmount = pendingExpenditures.reduce((sum, item) => sum + item.amount, 0);
    const refundAmount = pendingRefunds.reduce((sum, item) => sum + item.payout_amount, 0);
    const awaitingAmount = awaitingPayments.reduce((sum, payment) => sum + payment.amount, 0);

    return {
      completedAmount: financeStats.completedAmount,
      failedCount: financeStats.failedCount,
      awaitingAmount: financeStats.awaitingAmount || awaitingAmount,
      awaitingCount: financeStats.awaitingCount || awaitingPayments.length,
      expenditureAmount: financeStats.expenditureAmount || expenditureAmount,
      expenditureCount: financeStats.expenditureCount || pendingExpenditures.length,
      refundAmount: financeStats.refundAmount || refundAmount,
      refundCount: financeStats.refundCount || pendingRefunds.length,
      totalQueueCount:
        financeStats.totalQueueCount || awaitingPayments.length + pendingExpenditures.length + pendingRefunds.length,
      totalQueueAmount:
        financeStats.totalQueueAmount || awaitingAmount + expenditureAmount + refundAmount,
    };
  }, [awaitingPayments, financeStats, pendingExpenditures, pendingRefunds]);

  const handleDecision = async (
    entityType: FinanceEntityType,
    entityId: string,
    label: string,
    decision: FinanceDecision,
  ) => {
    const itemKey = `${entityType}:${entityId}`;
    setActingItemKey(itemKey);
    try {
      const decisionLabel = decision === 'approved' ? 'approved' : 'rejected';
      await approvePaymentDecision({
        entityType,
        entityId,
        decision,
        notes: notes[itemKey] || undefined,
      });

      toast({
        title: `${label} ${decisionLabel}`,
        description: `${entityId.slice(0, 8)} has been ${decisionLabel}.`,
      });

      setNotes((previous) => ({ ...previous, [itemKey]: '' }));
      await loadData();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to submit approval decision';
      toast({
        title: 'Decision failed',
        description: message,
        variant: 'destructive',
      });
    } finally {
      setActingItemKey(null);
    }
  };

  const updateNotes = (itemKey: string, value: string) => {
    setNotes((previous) => ({
      ...previous,
      [itemKey]: value,
    }));
  };

  const renderPagination = (pagination: UsePaginationStateReturn, label: string) => {
    if (pagination.totalItems <= pagination.pageSize) return null;

    return (
      <div className="mt-4 flex flex-col gap-3 border-t pt-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted-foreground">
          Showing {(pagination.page - 1) * pagination.pageSize + 1}
          -{Math.min(pagination.page * pagination.pageSize, pagination.totalItems)}
          {' '}of {pagination.totalItems} {label}
        </p>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => pagination.goToPage(pagination.page - 1)}
            disabled={pagination.page === 1}
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <span className="text-sm">
            Page {pagination.page} of {Math.max(1, pagination.totalPages)}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => pagination.goToPage(pagination.page + 1)}
            disabled={pagination.page === pagination.totalPages}
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>
    );
  };

  const renderDecisionButtons = (entityType: FinanceEntityType, entityId: string, label: string) => {
    const itemKey = `${entityType}:${entityId}`;
    const isActing = actingItemKey === itemKey;

    return (
      <div className="flex justify-end gap-2">
        <Button
          size="sm"
          variant="outline"
          disabled={isActing}
          onClick={() => void handleDecision(entityType, entityId, label, 'rejected')}
        >
          {isActing ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldX className="w-4 h-4" />}
          <span className="ml-1">Reject</span>
        </Button>
        <Button
          size="sm"
          disabled={isActing}
          onClick={() => void handleDecision(entityType, entityId, label, 'approved')}
        >
          {isActing ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
          <span className="ml-1">Approve</span>
        </Button>
      </div>
    );
  };

  if (!canApprove) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <ShieldX className="w-5 h-5 mt-0.5 text-muted-foreground" />
            <div>
              <h3 className="font-medium">Finance Approval Access Required</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Only chairperson, admin, secretary, and patron roles can approve or reject finance items.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Total Queue</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{stats.totalQueueCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Queue Amount</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{formatCurrency(stats.totalQueueAmount)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Expenditures</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{stats.expenditureCount}</p>
            <p className="text-xs text-muted-foreground">{formatCurrency(stats.expenditureAmount)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Refunds</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{stats.refundCount}</p>
            <p className="text-xs text-muted-foreground">{formatCurrency(stats.refundAmount)}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle className="text-lg">Awaiting Finance Approval</CardTitle>
            <CardDescription>Approve or reject Pay with M-Pesa transactions, recorded expenditures, and refund requests.</CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={() => void loadData()}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="py-8 flex justify-center">
              <Loader2 className="w-6 h-6 animate-spin" />
            </div>
          ) : (
            <Tabs defaultValue="payments" className="space-y-4">
              <TabsList className="flex h-auto flex-wrap justify-start">
                <TabsTrigger value="payments">
                  <CreditCard className="w-4 h-4 mr-2" />
                  Payments ({stats.awaitingCount})
                </TabsTrigger>
                <TabsTrigger value="expenditures">
                  <ReceiptText className="w-4 h-4 mr-2" />
                  Expenditures ({stats.expenditureCount})
                </TabsTrigger>
                <TabsTrigger value="refunds">
                  <Undo2 className="w-4 h-4 mr-2" />
                  Refunds ({stats.refundCount})
                </TabsTrigger>
              </TabsList>

              <TabsContent value="payments">
                {awaitingPayments.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-6">No payments are waiting for approval.</p>
                ) : (
                  <>
                    <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Phone</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Receipt</TableHead>
                        <TableHead>Notes</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {awaitingPayments.map((payment) => {
                        const itemKey = `payment:${payment.id}`;
                        return (
                          <TableRow key={payment.id}>
                            <TableCell>{new Date(payment.created_at).toLocaleString()}</TableCell>
                            <TableCell className="font-mono">{payment.phone}</TableCell>
                            <TableCell>{formatCurrency(payment.amount)}</TableCell>
                            <TableCell>
                              <Badge variant="outline" className="font-mono">
                                {payment.mpesa_receipt || '-'}
                              </Badge>
                            </TableCell>
                            <TableCell className="min-w-[220px]">
                              <Textarea
                                value={notes[itemKey] || ''}
                                onChange={(event) => updateNotes(itemKey, event.target.value)}
                                placeholder="Reason for decision (optional)"
                                rows={2}
                              />
                            </TableCell>
                            <TableCell>{renderDecisionButtons('payment', payment.id, 'Payment')}</TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                    </Table>
                    {renderPagination(paymentPagination, 'payments')}
                  </>
                )}
              </TabsContent>

              <TabsContent value="expenditures">
                {pendingExpenditures.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-6">No expenditures are waiting for approval.</p>
                ) : (
                  <>
                    <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Payee / Category</TableHead>
                        <TableHead>Fund</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Reference</TableHead>
                        <TableHead>Notes</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {pendingExpenditures.map((expenditure) => {
                        const itemKey = `expenditure:${expenditure.id}`;
                        return (
                          <TableRow key={expenditure.id}>
                            <TableCell>{new Date(expenditure.expense_date || expenditure.created_at).toLocaleDateString()}</TableCell>
                            <TableCell>
                              <div>
                                <p className="font-medium">{expenditure.payee || 'No payee recorded'}</p>
                                <p className="text-xs text-muted-foreground">{expenditure.category}</p>
                              </div>
                            </TableCell>
                            <TableCell className="capitalize">{expenditure.fund || 'general'}</TableCell>
                            <TableCell>{formatCurrency(expenditure.amount)}</TableCell>
                            <TableCell>
                              <Badge variant="outline" className="font-mono">
                                {expenditure.reference_number || '-'}
                              </Badge>
                            </TableCell>
                            <TableCell className="min-w-[220px]">
                              <Textarea
                                value={notes[itemKey] || ''}
                                onChange={(event) => updateNotes(itemKey, event.target.value)}
                                placeholder="Reason for decision (optional)"
                                rows={2}
                              />
                            </TableCell>
                            <TableCell>{renderDecisionButtons('expenditure', expenditure.id, 'Expenditure')}</TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                    </Table>
                    {renderPagination(expenditurePagination, 'expenditures')}
                  </>
                )}
              </TabsContent>

              <TabsContent value="refunds">
                {pendingRefunds.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-6">No refund requests are waiting for approval.</p>
                ) : (
                  <>
                    <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Contribution Type</TableHead>
                        <TableHead>Requested</TableHead>
                        <TableHead>Payout</TableHead>
                        <TableHead>Reason</TableHead>
                        <TableHead>Notes</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {pendingRefunds.map((refund) => {
                        const itemKey = `refund:${refund.id}`;
                        return (
                          <TableRow key={refund.id}>
                            <TableCell>{new Date(refund.created_at).toLocaleDateString()}</TableCell>
                            <TableCell className="capitalize">{refund.contribution_type.replace(/_/g, ' ')}</TableCell>
                            <TableCell>{formatCurrency(refund.requested_amount)}</TableCell>
                            <TableCell>{formatCurrency(refund.payout_amount)}</TableCell>
                            <TableCell className="max-w-[220px] truncate">{refund.reason || '-'}</TableCell>
                            <TableCell className="min-w-[220px]">
                              <Textarea
                                value={notes[itemKey] || ''}
                                onChange={(event) => updateNotes(itemKey, event.target.value)}
                                placeholder="Reason for decision (optional)"
                                rows={2}
                              />
                            </TableCell>
                            <TableCell>{renderDecisionButtons('refund', refund.id, 'Refund')}</TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                    </Table>
                    {renderPagination(refundPagination, 'refund requests')}
                  </>
                )}
              </TabsContent>
            </Tabs>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default CboTreasurerApprovalPanel;
