import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { hasPermission } from '@/lib/rolePermissions';
import { 
  HandHeart, Loader2, Heart, Users, DollarSign, Plus, Edit2, Trash2, AlertCircle, 
  TrendingUp, ArrowRight, RotateCcw, Eye, EyeOff, Send, X, Check
} from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

interface WelfareCase {
  id: string;
  title: string;
  description: string | null;
  case_type: string;
  target_amount: number | null;
  collected_amount: number;
  status: string;
  created_at: string;
  beneficiary: {
    full_name: string;
    id: string;
  } | null;
  created_by: string;
}

interface WelfareTransaction {
  id: string;
  welfare_case_id: string;
  amount: number;
  transaction_type: 'contribution' | 'refund';
  mpesa_code: string | null;
  recorded_by_id: string;
  recorded_by: {
    full_name: string;
  } | null;
  notes: string | null;
  created_at: string;
  status: 'completed' | 'pending' | 'failed';
}

const WelfareManagement = () => {
  const { user, roles } = useAuth();
  const [cases, setCases] = useState<WelfareCase[]>([]);
  const [transactions, setTransactions] = useState<WelfareTransaction[]>([]);
  const [selectedCase, setSelectedCase] = useState<WelfareCase | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isTransactionDialogOpen, setIsTransactionDialogOpen] = useState(false);
  const [showTransactionDetails, setShowTransactionDetails] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const [transactionForm, setTransactionForm] = useState({
    amount: '',
    mpesa_code: '',
    notes: '',
    transaction_type: 'contribution' as 'contribution' | 'refund',
  });

  const userRoles = roles.map(r => r.role);
  const canManageTransactions = hasPermission(userRoles, 'manage_welfare_transactions');
  const canRefund = hasPermission(userRoles, 'refund_welfare');
  const canRecordPayment = hasPermission(userRoles, 'record_welfare_payment');

  useEffect(() => {
    fetchWelfareCases();
  }, []);

  useEffect(() => {
    if (selectedCase) {
      fetchTransactions(selectedCase.id);
    }
  }, [selectedCase]);

  const fetchWelfareCases = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('welfare_cases')
        .select(`
          *,
          beneficiary:beneficiary_id (full_name, id)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setCases(data || []);
    } catch (error) {
      console.error('Error fetching welfare cases:', error);
      toast.error('Failed to load welfare cases');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchTransactions = async (caseId: string) => {
    try {
      const { data, error } = await supabase
        .from('welfare_transactions')
        .select(`
          id, welfare_case_id, amount, transaction_type, mpesa_code, recorded_by_id, notes, created_at, status,
          recorded_by:recorded_by_id (full_name)
        `)
        .eq('welfare_case_id', caseId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTransactions((data as WelfareTransaction[]) || []);
    } catch (error) {
      console.error('Error fetching transactions:', error);
      toast.error('Failed to load transactions');
    }
  };

  const handleAddTransaction = async () => {
    if (!selectedCase) {
      toast.error('Please select a welfare case');
      return;
    }

    if (!transactionForm.amount || parseFloat(transactionForm.amount) <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    setIsSaving(true);
    try {
      const amount = parseFloat(transactionForm.amount);
      let newCollected = selectedCase.collected_amount;

      if (transactionForm.transaction_type === 'contribution') {
        newCollected += amount;
      } else if (transactionForm.transaction_type === 'refund' && canRefund) {
        newCollected = Math.max(0, newCollected - amount);
      }

      // Insert transaction
      const { error: transactionError } = await supabase
        .from('welfare_transactions')
        .insert({
          welfare_case_id: selectedCase.id,
          amount: amount,
          transaction_type: transactionForm.transaction_type,
          mpesa_code: transactionForm.mpesa_code || null,
          recorded_by_id: user?.id,
          notes: transactionForm.notes || null,
          status: 'completed',
        });

      if (transactionError) throw transactionError;

      // Update case collected amount
      const { error: updateError } = await supabase
        .from('welfare_cases')
        .update({ collected_amount: newCollected })
        .eq('id', selectedCase.id);

      if (updateError) throw updateError;

      toast.success(`${transactionForm.transaction_type === 'contribution' ? 'Contribution' : 'Refund'} recorded successfully!`);
      setTransactionForm({ amount: '', mpesa_code: '', notes: '', transaction_type: 'contribution' });
      setIsTransactionDialogOpen(false);
      await fetchWelfareCases();
      await fetchTransactions(selectedCase.id);
    } catch (error) {
      console.error('Error adding transaction:', error);
      toast.error('Failed to record transaction');
    } finally {
      setIsSaving(false);
    }
  };

  const handleRemoveTransaction = async (transactionId: string) => {
    if (!selectedCase || !window.confirm('Are you sure you want to remove this transaction?')) {
      return;
    }

    try {
      const transaction = transactions.find(t => t.id === transactionId);
      if (!transaction) return;

      // Calculate new collected amount
      let newCollected = selectedCase.collected_amount;
      if (transaction.transaction_type === 'contribution') {
        newCollected = Math.max(0, newCollected - transaction.amount);
      } else if (transaction.transaction_type === 'refund') {
        newCollected += transaction.amount;
      }

      // Delete transaction
      const { error: deleteError } = await supabase
        .from('welfare_transactions')
        .delete()
        .eq('id', transactionId);

      if (deleteError) throw deleteError;

      // Update case collected amount
      const { error: updateError } = await supabase
        .from('welfare_cases')
        .update({ collected_amount: newCollected })
        .eq('id', selectedCase.id);

      if (updateError) throw updateError;

      toast.success('Transaction removed successfully');
      await fetchWelfareCases();
      await fetchTransactions(selectedCase.id);
    } catch (error) {
      console.error('Error removing transaction:', error);
      toast.error('Failed to remove transaction');
    }
  };

  const getTransactionIcon = (type: string) => {
    return type === 'contribution' ? 
      <TrendingUp className="w-4 h-4 text-green-500" /> : 
      <RotateCcw className="w-4 h-4 text-orange-500" />;
  };

  const getCaseTypeIcon = (type: string) => {
    switch (type) {
      case 'bereavement':
        return <Heart className="w-5 h-5 text-red-500" />;
      case 'medical':
        return <HandHeart className="w-5 h-5 text-blue-500" />;
      case 'education':
        return <Users className="w-5 h-5 text-green-500" />;
      default:
        return <DollarSign className="w-5 h-5 text-primary" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      active: 'bg-green-100 text-green-800',
      closed: 'bg-gray-100 text-gray-800',
      cancelled: 'bg-red-100 text-red-800',
      completed: 'bg-green-100 text-green-800',
      pending: 'bg-yellow-100 text-yellow-800',
      failed: 'bg-red-100 text-red-800',
    };
    return (
      <Badge className={colors[status] || colors.active}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-serif font-bold text-foreground">Welfare Management</h1>
          <p className="text-muted-foreground">Manage welfare cases and track contributions</p>
        </div>
        {(canManageTransactions || canRecordPayment) && (
          <Button className="gap-2" onClick={() => window.location.href = '/dashboard/members/welfare'}>
            <Plus className="w-4 h-4" />
            Create Welfare Case
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Cases List */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">Active Cases</h2>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {cases.filter(c => c.status === 'active').map(welfareCase => (
              <Card 
                key={welfareCase.id}
                className={`cursor-pointer transition-all ${selectedCase?.id === welfareCase.id ? 'ring-2 ring-primary bg-primary/5' : 'hover:border-primary/50'}`}
                onClick={() => setSelectedCase(welfareCase)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start gap-2 mb-2">
                    {getCaseTypeIcon(welfareCase.case_type)}
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm truncate">{welfareCase.title}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {welfareCase.beneficiary?.full_name || 'Unassigned'}
                      </p>
                    </div>
                  </div>
                  {welfareCase.target_amount && (
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>KES {welfareCase.collected_amount.toLocaleString()}</span>
                        <span>KES {welfareCase.target_amount.toLocaleString()}</span>
                      </div>
                      <Progress 
                        value={(welfareCase.collected_amount / welfareCase.target_amount) * 100}
                        className="h-1.5"
                      />
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Transaction Details */}
        <div className="lg:col-span-2 space-y-4">
          {selectedCase ? (
            <>
              <Card>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      {getCaseTypeIcon(selectedCase.case_type)}
                      <div>
                        <CardTitle>{selectedCase.title}</CardTitle>
                        <CardDescription>
                          {selectedCase.beneficiary?.full_name || 'No beneficiary assigned'}
                        </CardDescription>
                      </div>
                    </div>
                    {getStatusBadge(selectedCase.status)}
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {selectedCase.description && (
                    <p className="text-sm text-muted-foreground">{selectedCase.description}</p>
                  )}

                  {/* Financial Summary */}
                  {selectedCase.target_amount && (
                    <div className="space-y-3 p-4 bg-blue-50 rounded-lg border border-blue-200">
                      <div className="grid grid-cols-3 gap-4 text-center">
                        <div>
                          <p className="text-xs text-muted-foreground">Collected</p>
                          <p className="text-xl font-bold text-green-600">
                            KES {selectedCase.collected_amount.toLocaleString()}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Target</p>
                          <p className="text-xl font-bold text-blue-600">
                            KES {selectedCase.target_amount.toLocaleString()}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Remaining</p>
                          <p className="text-xl font-bold text-orange-600">
                            KES {Math.max(0, selectedCase.target_amount - selectedCase.collected_amount).toLocaleString()}
                          </p>
                        </div>
                      </div>
                      <Progress 
                        value={(selectedCase.collected_amount / selectedCase.target_amount) * 100}
                        className="h-2"
                      />
                      <p className="text-xs text-center text-muted-foreground">
                        {((selectedCase.collected_amount / selectedCase.target_amount) * 100).toFixed(1)}% funded
                      </p>
                    </div>
                  )}

                  {/* Add Transaction Button */}
                  {(canManageTransactions || canRecordPayment) && (
                    <Dialog open={isTransactionDialogOpen} onOpenChange={setIsTransactionDialogOpen}>
                      <DialogTrigger asChild>
                        <Button className="w-full gap-2">
                          <Plus className="w-4 h-4" />
                          Record Transaction
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Record Welfare Transaction</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div>
                            <label className="text-sm font-medium">Transaction Type</label>
                            <div className="grid grid-cols-2 gap-2 mt-2">
                              <Button
                                variant={transactionForm.transaction_type === 'contribution' ? 'default' : 'outline'}
                                onClick={() => setTransactionForm({ ...transactionForm, transaction_type: 'contribution' })}
                                className="gap-2"
                              >
                                <TrendingUp className="w-4 h-4" />
                                Contribution
                              </Button>
                              <Button
                                variant={transactionForm.transaction_type === 'refund' ? 'default' : 'outline'}
                                onClick={() => setTransactionForm({ ...transactionForm, transaction_type: 'refund' })}
                                disabled={!canRefund}
                                className="gap-2"
                              >
                                <RotateCcw className="w-4 h-4" />
                                Refund
                              </Button>
                            </div>
                          </div>

                          <div>
                            <label htmlFor="amount" className="text-sm font-medium">Amount (KES) *</label>
                            <Input
                              id="amount"
                              type="number"
                              placeholder="0"
                              value={transactionForm.amount}
                              onChange={(e) => setTransactionForm({ ...transactionForm, amount: e.target.value })}
                              className="mt-1"
                            />
                          </div>

                          <div>
                            <label htmlFor="mpesa_code" className="text-sm font-medium">M-Pesa Code (Transaction ID)</label>
                            <Input
                              id="mpesa_code"
                              placeholder="e.g., LIL51IRF52"
                              value={transactionForm.mpesa_code}
                              onChange={(e) => setTransactionForm({ ...transactionForm, mpesa_code: e.target.value })}
                              className="mt-1"
                            />
                          </div>

                          <div>
                            <label htmlFor="notes" className="text-sm font-medium">Notes</label>
                            <textarea
                              id="notes"
                              placeholder="Add any notes about this transaction..."
                              value={transactionForm.notes}
                              onChange={(e) => setTransactionForm({ ...transactionForm, notes: e.target.value })}
                              className="w-full p-2 border border-input rounded-md bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary mt-1 min-h-20"
                            />
                          </div>

                          <div className="flex gap-2 pt-2">
                            <Button
                              onClick={handleAddTransaction}
                              disabled={isSaving}
                              className="flex-1"
                            >
                              {isSaving ? (
                                <>
                                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                  Recording...
                                </>
                              ) : (
                                <>
                                  <Send className="w-4 h-4 mr-2" />
                                  Record Transaction
                                </>
                              )}
                            </Button>
                            <Button
                              variant="outline"
                              onClick={() => {
                                setIsTransactionDialogOpen(false);
                                setTransactionForm({ amount: '', mpesa_code: '', notes: '', transaction_type: 'contribution' });
                              }}
                            >
                              Cancel
                            </Button>
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>
                  )}
                </CardContent>
              </Card>

              {/* Transactions History */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="w-5 h-5" />
                    Transaction History
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {transactions.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-6">No transactions yet</p>
                  ) : (
                    <div className="space-y-2">
                      {transactions.map(transaction => (
                        <div key={transaction.id}>
                          <div className="flex items-center justify-between p-3 border border-border rounded-lg">
                            <div className="flex items-center gap-3 flex-1 min-w-0">
                              <div className="flex-shrink-0">
                                {getTransactionIcon(transaction.transaction_type)}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <p className="font-medium text-sm">
                                    {transaction.transaction_type === 'contribution' ? 'Contribution' : 'Refund'}
                                  </p>
                                  {transaction.mpesa_code && (
                                    <Badge variant="outline" className="text-xs">
                                      {transaction.mpesa_code}
                                    </Badge>
                                  )}
                                </div>
                                <p className="text-xs text-muted-foreground">
                                  {transaction.recorded_by?.full_name} • {format(new Date(transaction.created_at), 'MMM dd, yyyy HH:mm')}
                                </p>
                              </div>
                            </div>

                            <div className="flex items-center gap-2">
                              <p className={`font-bold text-sm ${transaction.transaction_type === 'contribution' ? 'text-green-600' : 'text-orange-600'}`}>
                                {transaction.transaction_type === 'contribution' ? '+' : '-'}KES {transaction.amount.toLocaleString()}
                              </p>
                              {getStatusBadge(transaction.status)}
                            </div>
                          </div>

                          {/* Transaction Details */}
                          {(transaction.notes || transaction.mpesa_code) && (
                            <button
                              onClick={() => setShowTransactionDetails(showTransactionDetails === transaction.id ? null : transaction.id)}
                              className="text-xs text-primary hover:underline ml-11 mt-1"
                            >
                              {showTransactionDetails === transaction.id ? 'Hide' : 'Show'} Details
                            </button>
                          )}

                          {showTransactionDetails === transaction.id && (
                            <div className="ml-11 mt-2 p-3 bg-muted rounded-lg space-y-2 text-sm">
                              {transaction.mpesa_code && (
                                <p><span className="text-muted-foreground">M-Pesa Code:</span> {transaction.mpesa_code}</p>
                              )}
                              {transaction.notes && (
                                <p><span className="text-muted-foreground">Notes:</span> {transaction.notes}</p>
                              )}
                              {canManageTransactions && (
                                <Button
                                  variant="destructive"
                                  size="sm"
                                  onClick={() => handleRemoveTransaction(transaction.id)}
                                  className="mt-2 w-full gap-2"
                                >
                                  <X className="w-4 h-4" />
                                  Remove Transaction
                                </Button>
                              )}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </>
          ) : (
            <Card className="h-full flex items-center justify-center">
              <CardContent className="text-center py-12">
                <HandHeart className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">Select a welfare case to view details</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default WelfareManagement;
