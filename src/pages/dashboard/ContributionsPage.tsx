import { useEffect, useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { StatusBadge } from '@/components/StatusBadge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import {
  AccessibleButton,
  AccessibleFormField,
  useStatus,
  AccessibleStatus,
} from '@/components/accessible';
import PayWithMpesa from '@/components/dashboard/PayWithMpesa';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useInteractionGuard } from '@/hooks/useInteractionGuard';
import { useToast } from '@/hooks/use-toast';
import { usePaginationState } from '@/hooks/usePaginationState';
import { getErrorMessage, logError, retryAsync } from '@/lib/errorHandling';
import { amountSchema } from '@/lib/validation';
import { DollarSign, Plus, TrendingUp, Clock, CheckCircle2, Loader2, X, ChevronLeft, ChevronRight, AlertCircle } from 'lucide-react';

interface Contribution {
  id: string;
  amount: number;
  contribution_type: string;
  status: 'paid' | 'pending' | 'missed';
  due_date: string | null;
  paid_at: string | null;
  reference_number: string | null;
  notes: string | null;
  created_at: string;
  welfare_case_id: string | null;
}

const ContributionsPage = () => {
  const { profile } = useAuth();
  const { canInteract, assertCanInteract, readOnlyMessage } = useInteractionGuard();
  const { toast } = useToast();
  const { status, showSuccess, showError } = useStatus();
  const [contributions, setContributions] = useState<Contribution[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isPendingViewOpen, setIsPendingViewOpen] = useState(false);
  const pagination = usePaginationState(15);
  
  const [newContribution, setNewContribution] = useState({
    amount: '',
    contribution_type: 'welfare',
    reference_number: '',
    notes: '',
  });
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  // Paginate contributions
  const paginatedContributions = useMemo(() => {
    const offset = (pagination.page - 1) * pagination.pageSize;
    return contributions.slice(offset, offset + pagination.pageSize);
  }, [contributions, pagination.page, pagination.pageSize]);

  // Update pagination when contributions change
  useEffect(() => {
    pagination.updateTotal(contributions.length);
  }, [contributions.length, pagination]);

  useEffect(() => {
    if (profile?.id) {
      fetchContributions();

      // Real-time subscription for new contributions
      const channel = supabase
        .channel('contributions_updates')
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'contributions', filter: `member_id=eq.${profile.id}` }, () => {
          fetchContributions();
        })
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'contributions', filter: `member_id=eq.${profile.id}` }, () => {
          fetchContributions();
        })
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [profile?.id]);

  const fetchContributions = async () => {
    setIsLoading(true);
    try {
      setError(null);
      
      await retryAsync(
        async () => {
          const { data, error: fetchError } = await supabase
            .from('contributions')
            .select('id, amount, contribution_type, status, due_date, paid_at, reference_number, notes, created_at, welfare_case_id')
            .eq('member_id', profile?.id)
            .order('created_at', { ascending: false });

          if (fetchError) throw fetchError;
          setContributions(data || []);
          return data;
        },
        {
          maxRetries: 3,
          delayMs: 1000,
          backoffMultiplier: 2,
          onRetry: (attempt) => {
            logError(`Retrying fetch contributions (attempt ${attempt})`, 'ContributionsPage', 'warn');
          },
        }
      );
    } catch (error) {
      const errorMsg = getErrorMessage(error);
      logError(error, 'ContributionsPage.fetchContributions');
      setError(errorMsg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assertCanInteract('record contributions')) return;
    
    // Reset errors
    setError(null);
    setFieldErrors({});

    // Validate required fields
    const errors: Record<string, string> = {};
    if (!newContribution.amount) {
      errors.amount = 'Amount is required';
    } else {
      try {
        amountSchema.parse(newContribution.amount);
      } catch (err: any) {
        errors.amount = err.errors[0]?.message || 'Invalid amount';
      }
    }

    if (!newContribution.reference_number.trim()) {
      errors.reference_number = 'Reference number is required';
    } else if (newContribution.reference_number.trim().length < 3) {
      errors.reference_number = 'Reference number must be at least 3 characters';
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      setError('Please fix the errors below');
      return;
    }

    if (!profile?.id) {
      setError('User profile not found');
      return;
    }

    setIsSubmitting(true);

    try {
      await retryAsync(
        async () => {
          const { error: insertError } = await supabase.from('contributions').insert({
            member_id: profile.id,
            amount: Number.parseFloat(newContribution.amount),
            contribution_type: newContribution.contribution_type,
            reference_number: newContribution.reference_number || null,
            notes: newContribution.notes || null,
            status: 'pending',
          });

          if (insertError) throw insertError;
          return true;
        },
        { maxRetries: 2, delayMs: 500 }
      );

      toast({
        title: 'Contribution Recorded',
        description: 'Your contribution has been submitted for verification.',
      });

      showSuccess('Your contribution has been submitted for verification', 3000);

      setIsDialogOpen(false);
      setNewContribution({
        amount: '',
        contribution_type: 'welfare',
        reference_number: '',
        notes: '',
      });
      setFieldErrors({});
      fetchContributions();
    } catch (error) {
      const errorMsg = getErrorMessage(error);
      logError(error, 'ContributionsPage.handleSubmit');
      setError(errorMsg);
      showError(errorMsg, 5000);
    } finally {
      setIsSubmitting(false);
    }
  };

  

  const stats = {
    total: contributions.filter((c) => c.status === 'paid').reduce((sum, c) => sum + c.amount, 0),
    pending: contributions.filter((c) => c.status === 'pending').reduce((sum, c) => sum + c.amount, 0),
    count: contributions.length,
  };

  return (
    <div className="space-y-6">
      <AccessibleStatus
        message={status.message}
        type={status.type}
        isVisible={status.isVisible}
      />
      {!canInteract && readOnlyMessage && (
        <div className="rounded-lg border border-amber-300/70 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          {readOnlyMessage}
        </div>
      )}
      {error && (
        <div className="p-4 bg-destructive/10 border border-destructive/30 rounded-lg flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-medium text-destructive">Error</p>
            <p className="text-sm text-destructive/80 mt-1">{error}</p>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={fetchContributions}
            className="flex-shrink-0"
          >
            Retry
          </Button>
        </div>
      )}
      
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-serif font-bold text-foreground">My Contributions</h2>
          <p className="text-muted-foreground">Track your welfare and project contributions</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <AccessibleButton className="btn-primary" ariaLabel="Record a new contribution" disabled={!canInteract}>
              <Plus className="w-4 h-4 mr-2" />
              Record Contribution
            </AccessibleButton>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Record New Contribution</DialogTitle>
              <DialogDescription>Submit a new contribution record with payment details</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4 mt-4">
              <AccessibleFormField
                label="Amount (KES)"
                type="number"
                placeholder="e.g., 500"
                value={newContribution.amount}
                onChange={(e) => {
                  setNewContribution({ ...newContribution, amount: e.target.value });
                  if (fieldErrors.amount) {
                    setFieldErrors({ ...fieldErrors, amount: '' });
                  }
                }}
                error={fieldErrors.amount}
                required
              />
              <div className="space-y-2">
                <Label htmlFor="type">Contribution Type</Label>
                <Select
                  value={newContribution.contribution_type}
                  onValueChange={(value) =>
                    setNewContribution({ ...newContribution, contribution_type: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="registration">Registration Fee</SelectItem>
                    <SelectItem value="welfare">Welfare Contribution</SelectItem>
                    <SelectItem value="monthly">Monthly Dues</SelectItem>
                    <SelectItem value="project">Project Fund</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <AccessibleFormField
                label="Payment Reference"
                placeholder="Transaction reference"
                value={newContribution.reference_number}
                onChange={(e) => {
                  setNewContribution({ ...newContribution, reference_number: e.target.value });
                  if (fieldErrors.reference_number) {
                    setFieldErrors({ ...fieldErrors, reference_number: '' });
                  }
                }}
                error={fieldErrors.reference_number}
                required
              />
              <AccessibleFormField
                label="Notes (Optional)"
                placeholder="Any additional notes"
                value={newContribution.notes}
                onChange={(e) =>
                  setNewContribution({ ...newContribution, notes: e.target.value })
                }
              />
              <AccessibleButton type="submit" className="w-full btn-primary" disabled={isSubmitting || !canInteract} isLoading={isSubmitting} loadingText="Submitting...">
                Submit Contribution
              </AccessibleButton>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Contributed</p>
                <p className="text-2xl font-bold text-green-600">
                  KES {stats.total.toLocaleString()}
                </p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-green-100 flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => setIsPendingViewOpen(true)}>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Pending Verification</p>
                <p className="text-2xl font-bold text-yellow-600">
                  KES {stats.pending.toLocaleString()}
                </p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-yellow-100 flex items-center justify-center">
                <Clock className="w-6 h-6 text-yellow-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Transactions</p>
                <p className="text-2xl font-bold text-primary">{stats.count}</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Contributions Table */}
      <Card>
        <CardHeader>
          <CardTitle>Contribution History</CardTitle>
          <CardDescription>All your contribution records</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : contributions.length === 0 ? (
            <div className="text-center py-12">
              <DollarSign className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium text-foreground">No contributions yet</h3>
              <p className="text-muted-foreground mt-1">
                Start by recording your first contribution
              </p>
            </div>
          ) : (
            <>
              <div className="space-y-3 lg:hidden">
                {paginatedContributions.map((contribution) => (
                  <Card key={contribution.id} className="border border-border/60">
                    <CardContent className="p-4 space-y-3">
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <p className="font-semibold truncate">
                            {contribution.contribution_type.replace('_', ' ')}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(contribution.created_at).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold">KES {contribution.amount.toLocaleString()}</p>
                          <div className="mt-1">
                            <StatusBadge 
                              status={contribution.status} 
                              icon={
                                contribution.status === 'paid' ? <CheckCircle2 className="w-3 h-3" /> :
                                contribution.status === 'pending' ? <Clock className="w-3 h-3" /> :
                                <Clock className="w-3 h-3" />
                              }
                            />
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3 text-xs">
                        <div>
                          <p className="text-muted-foreground">Reference</p>
                          <p className="font-mono truncate">{contribution.reference_number || '-'}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Status</p>
                          <p className="capitalize">{contribution.status}</p>
                        </div>
                      </div>

                      <div className="pt-2 border-t">
                        {contribution.status !== 'paid' ? (
                          <PayWithMpesa
                            contributionId={contribution.id}
                            defaultAmount={contribution.amount}
                            trigger={<AccessibleButton size="sm" className="btn-outline w-full" ariaLabel={`Pay KES ${contribution.amount} via M-Pesa for contribution ${contribution.id}`}>Pay now</AccessibleButton>}
                          />
                        ) : (
                          <span className="text-sm text-green-600">Paid</span>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              <div className="hidden lg:block overflow-x-auto">
                <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Reference</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedContributions.map((contribution) => (
                    <TableRow key={contribution.id}>
                      <TableCell className="text-sm">
                        {new Date(contribution.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="capitalize">
                        {contribution.contribution_type.replace('_', ' ')}
                      </TableCell>
                      <TableCell className="font-medium">
                        KES {contribution.amount.toLocaleString()}
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {contribution.reference_number || '-'}
                      </TableCell>
                      <TableCell>
                        <StatusBadge 
                          status={contribution.status} 
                          icon={
                            contribution.status === 'paid' ? <CheckCircle2 className="w-3 h-3" /> :
                            contribution.status === 'pending' ? <Clock className="w-3 h-3" /> :
                            <Clock className="w-3 h-3" />
                          }
                        />
                      </TableCell>
                      <TableCell>
                        {contribution.status !== 'paid' ? (
                          <PayWithMpesa
                            contributionId={contribution.id}
                            defaultAmount={contribution.amount}
                            trigger={<AccessibleButton size="sm" className="btn-outline" ariaLabel={`Pay KES ${contribution.amount} via M-Pesa for contribution ${contribution.id}`}>Pay now</AccessibleButton>}
                          />
                        ) : (
                          <span className="text-sm text-green-600">Paid</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
                </Table>
              </div>

              {/* Pagination Controls */}
              <div className="flex items-center justify-between mt-4 pt-4 border-t">
                <div className="text-sm text-muted-foreground">
                  Showing {(pagination.page - 1) * pagination.pageSize + 1}-{Math.min(pagination.page * pagination.pageSize, contributions.length)} of {contributions.length}
                </div>
                <div className="flex items-center gap-2">
                  <AccessibleButton
                    variant="outline"
                    size="sm"
                    onClick={() => pagination.page > 1 && pagination.goToPage(pagination.page - 1)}
                    disabled={pagination.page === 1}
                    ariaLabel="Go to previous page"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </AccessibleButton>
                  <div className="text-sm">
                    Page {pagination.page} of {Math.max(1, pagination.totalPages)}
                  </div>
                  <AccessibleButton
                    variant="outline"
                    size="sm"
                    onClick={() => pagination.page < pagination.totalPages && pagination.goToPage(pagination.page + 1)}
                    disabled={pagination.page === pagination.totalPages}
                    ariaLabel="Go to next page"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </AccessibleButton>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Pending Payments Modal Dialog */}
      <Dialog open={isPendingViewOpen} onOpenChange={setIsPendingViewOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Pending Payments</DialogTitle>
            <DialogDescription>View and manage all your pending contribution payments</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Summary */}
            <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-yellow-800">Total Pending Amount</p>
                  <p className="text-3xl font-bold text-yellow-700">
                    KES {stats.pending.toLocaleString()}
                  </p>
                </div>
                <Clock className="w-12 h-12 text-yellow-500 opacity-30" />
              </div>
            </div>

            {/* Pending Contributions List */}
            {contributions.filter((c) => c.status === 'pending').length === 0 ? (
              <div className="text-center py-8">
                <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto mb-4" />
                <p className="text-lg font-medium text-foreground">No Pending Payments!</p>
                <p className="text-muted-foreground mt-1">You are all caught up</p>
              </div>
            ) : (
              <div className="space-y-3">
                {contributions
                  .filter((c) => c.status === 'pending')
                  .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                  .map((contribution) => (
                    <div
                      key={contribution.id}
                      className="p-4 border border-yellow-200 bg-yellow-50 rounded-lg hover:bg-yellow-100 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-4 mb-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <p className="font-semibold text-foreground">
                              {contribution.contribution_type.replace('_', ' ').toUpperCase()}
                            </p>
                            <Badge variant="outline" className="bg-yellow-100 text-yellow-800 border-yellow-300">
                              Pending
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {new Date(contribution.created_at).toLocaleDateString('en-US', {
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric',
                            })}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-2xl font-bold text-yellow-700">
                            KES {contribution.amount.toLocaleString()}
                          </p>
                        </div>
                      </div>

                      {contribution.notes && (
                        <p className="text-xs text-muted-foreground mb-3 p-2 bg-white rounded border border-yellow-100">
                          {contribution.notes}
                        </p>
                      )}

                      {/* Pay Button */}
                      <div className="flex justify-end">
                        <PayWithMpesa
                          contributionId={contribution.id}
                          defaultAmount={contribution.amount}
                          trigger={
                            <Button size="sm" className="bg-yellow-600 hover:bg-yellow-700">
                              <DollarSign className="w-4 h-4 mr-2" />
                              Pay Now
                            </Button>
                          }
                        />
                      </div>
                    </div>
                  ))}
              </div>
            )}

            {/* Close Button */}
            <div className="flex justify-end gap-2 pt-4 border-t">
              <Button variant="outline" onClick={() => setIsPendingViewOpen(false)}>
                Close
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Payment handled by PayWithMpesa component */}
    </div>
  );
};

export default ContributionsPage;
