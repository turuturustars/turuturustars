import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { StatusBadge } from '@/components/StatusBadge';
import { Progress } from '@/components/ui/progress';
import { AccessibleButton } from '@/components/accessible/AccessibleButton';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AccessibleStatus, useStatus } from '@/components/accessible';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { hasPermission } from '@/lib/rolePermissions';
import { 
  HandHeart, Loader2, Heart, Users, DollarSign, Plus, Trash2, 
  TrendingUp, RotateCcw, Eye, EyeOff
} from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import WelfareContributeDialog from '@/components/dashboard/WelfareContributeDialog';

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

interface WelfareContribution {
  id: string;
  welfare_case_id: string;
  amount: number;
  member_id: string;
  notes: string | null;
  created_at: string;
  status: string;
  member: {
    full_name: string;
  } | null;
}

const WelfareManagement = () => {
  const { user, roles } = useAuth();
  const { status, showSuccess } = useStatus();
  const [cases, setCases] = useState<WelfareCase[]>([]);
  const [contributions, setContributions] = useState<WelfareContribution[]>([]);
  const [selectedCase, setSelectedCase] = useState<WelfareCase | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isContributionDialogOpen, setIsContributionDialogOpen] = useState(false);
  const [showContributionDetails, setShowContributionDetails] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const [contributionForm, setContributionForm] = useState({
    amount: '',
    notes: '',
    contribution_type: 'welfare' as const,
  });

  const userRoles = roles.map(r => r.role);
  const canManageContributions = hasPermission(userRoles, 'manage_welfare_transactions');
  const canRefund = hasPermission(userRoles, 'refund_welfare');
  const canRecordPayment = hasPermission(userRoles, 'record_welfare_payment');

  useEffect(() => {
    fetchWelfareCases();
  }, []);

  useEffect(() => {
    if (selectedCase) {
      fetchContributions(selectedCase.id);
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

  const fetchContributions = async (caseId: string) => {
    try {
      const { data, error } = await supabase
        .from('contributions')
        .select(`
          id, welfare_case_id, amount, member_id, notes, created_at, status,
          member:member_id (full_name)
        `)
        .eq('welfare_case_id', caseId)
        .eq('contribution_type', 'welfare')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setContributions((data as unknown as WelfareContribution[]) || []);
    } catch (error) {
      console.error('Error fetching contributions:', error);
      toast.error('Failed to load contributions');
    }
  };

  const handleAddContribution = async () => {
    if (!selectedCase) {
      toast.error('Please select a welfare case');
      return;
    }

    if (!contributionForm.amount || parseFloat(contributionForm.amount) <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    setIsSaving(true);
    try {
      const amount = parseFloat(contributionForm.amount);
      const newCollected = (selectedCase.collected_amount || 0) + amount;

      // Insert contribution
      const { error: contributionError } = await supabase
        .from('contributions')
        .insert({
          welfare_case_id: selectedCase.id,
          amount: amount,
          member_id: user?.id,
          contribution_type: 'welfare',
          notes: contributionForm.notes || null,
          status: 'paid',
        });

      if (contributionError) throw contributionError;

      // Update case collected amount
      const { error: updateError } = await supabase
        .from('welfare_cases')
        .update({ collected_amount: newCollected })
        .eq('id', selectedCase.id);

      if (updateError) throw updateError;

      toast.success('Contribution recorded successfully!');
      setContributionForm({ amount: '', notes: '', contribution_type: 'welfare' });
      setIsContributionDialogOpen(false);
      await fetchWelfareCases();
      await fetchContributions(selectedCase.id);
    } catch (error) {
      console.error('Error adding contribution:', error);
      toast.error('Failed to record contribution');
    } finally {
      setIsSaving(false);
    }
  };

  const handleRemoveContribution = async (contributionId: string) => {
    if (!selectedCase || !window.confirm('Are you sure you want to remove this contribution?')) {
      return;
    }

    try {
      const contribution = contributions.find(t => t.id === contributionId);
      if (!contribution) return;

      const newCollected = Math.max(0, (selectedCase.collected_amount || 0) - contribution.amount);

      // Delete contribution
      const { error: deleteError } = await supabase
        .from('contributions')
        .delete()
        .eq('id', contributionId);

      if (deleteError) throw deleteError;

      // Update case collected amount
      const { error: updateError } = await supabase
        .from('welfare_cases')
        .update({ collected_amount: newCollected })
        .eq('id', selectedCase.id);

      if (updateError) throw updateError;

      toast.success('Contribution removed successfully');
      await fetchWelfareCases();
      await fetchContributions(selectedCase.id);
    } catch (error) {
      console.error('Error removing contribution:', error);
      toast.error('Failed to remove contribution');
    }
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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <AccessibleStatus 
        message={status.message} 
        type={status.type} 
        isVisible={status.isVisible} 
      />
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-serif font-bold text-foreground">Welfare Management</h1>
          <p className="text-muted-foreground">Manage welfare cases and track contributions</p>
        </div>
        {(canManageContributions || canRecordPayment) && (
          <AccessibleButton 
            className="gap-2" 
            ariaLabel="Create new welfare case"
            onClick={() => window.location.href = '/dashboard/members/welfare'}
          >
            <Plus className="w-4 h-4" />
            Create Welfare Case
          </AccessibleButton>
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
                        <span>KES {(welfareCase.collected_amount || 0).toLocaleString()}</span>
                        <span>KES {welfareCase.target_amount.toLocaleString()}</span>
                      </div>
                      <Progress 
                        value={((welfareCase.collected_amount || 0) / welfareCase.target_amount) * 100}
                        className="h-1.5"
                      />
                    </div>
                  )}
                  {/* Contribute Button */}
                  <div className="mt-3 pt-2 border-t border-border">
                    <WelfareContributeDialog
                      welfareCaseId={welfareCase.id}
                      welfareCaseTitle={welfareCase.title}
                      targetAmount={welfareCase.target_amount}
                      collectedAmount={welfareCase.collected_amount}
                      onContributionSuccess={() => {
                        fetchWelfareCases();
                        setSelectedCase(welfareCase);
                      }}
                    />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Contribution Details */}
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
                    <StatusBadge status={selectedCase.status} />
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
                            KES {(selectedCase.collected_amount || 0).toLocaleString()}
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
                            KES {Math.max(0, selectedCase.target_amount - (selectedCase.collected_amount || 0)).toLocaleString()}
                          </p>
                        </div>
                      </div>
                      <Progress 
                        value={((selectedCase.collected_amount || 0) / selectedCase.target_amount) * 100}
                        className="h-2"
                      />
                      <p className="text-xs text-center text-muted-foreground">
                        {(((selectedCase.collected_amount || 0) / selectedCase.target_amount) * 100).toFixed(1)}% funded
                      </p>
                    </div>
                  )}

                  {/* Add Contribution Button */}
                  {(canManageContributions || canRecordPayment) && (
                    <Dialog open={isContributionDialogOpen} onOpenChange={setIsContributionDialogOpen}>
                      <DialogTrigger asChild>
                        <AccessibleButton className="w-full gap-2" ariaLabel="Record new welfare contribution">
                          <Plus className="w-4 h-4" />
                          Record Contribution
                        </AccessibleButton>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Record Welfare Contribution</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div>
                            <label htmlFor="amount" className="text-sm font-medium">Amount (KES) *</label>
                            <Input
                              id="amount"
                              type="number"
                              placeholder="0"
                              value={contributionForm.amount}
                              onChange={(e) => setContributionForm({ ...contributionForm, amount: e.target.value })}
                              className="mt-1"
                            />
                          </div>

                          <div>
                            <label htmlFor="notes" className="text-sm font-medium">Notes</label>
                            <textarea
                              id="notes"
                              placeholder="Add any notes about this contribution..."
                              value={contributionForm.notes}
                              onChange={(e) => setContributionForm({ ...contributionForm, notes: e.target.value })}
                              className="w-full p-2 border border-input rounded-md bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary min-h-20 mt-1"
                            />
                          </div>

                          <AccessibleButton
                            onClick={handleAddContribution}
                            className="w-full gap-2"
                            disabled={isSaving}
                            ariaLabel="Confirm contribution record"
                          >
                            {isSaving ? (
                              <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                Recording...
                              </>
                            ) : (
                              <>
                                <TrendingUp className="w-4 h-4" />
                                Record Contribution
                              </>
                            )}
                          </AccessibleButton>
                        </div>
                      </DialogContent>
                    </Dialog>
                  )}
                </CardContent>
              </Card>

              {/* Contributions List */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Contributions</CardTitle>
                  <CardDescription>{contributions.length} contributions recorded</CardDescription>
                </CardHeader>
                <CardContent>
                  {contributions.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">No contributions yet</p>
                  ) : (
                    <div className="space-y-2">
                      {contributions.map(contribution => (
                        <div
                          key={contribution.id}
                          className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                        >
                          <div className="flex items-center gap-3">
                            <TrendingUp className="w-4 h-4 text-green-500" />
                            <div>
                              <p className="font-medium text-sm">
                                KES {contribution.amount.toLocaleString()}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {contribution.member?.full_name || 'Unknown'} • {format(new Date(contribution.created_at), 'MMM d, yyyy')}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <StatusBadge status={contribution.status} />
                            {canManageContributions && (
                              <AccessibleButton
                                variant="ghost"
                                ariaLabel={`Remove contribution of KES ${contribution.amount.toLocaleString()}`}
                                onClick={() => {
                                  handleRemoveContribution(contribution.id);
                                  showSuccess('Contribution removed', 1500);
                                }}
                                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                              >
                                <Trash2 className="w-4 h-4" />
                              </AccessibleButton>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </>
          ) : (
            <Card>
              <CardContent className="py-12 text-center">
                <HandHeart className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium text-foreground">Select a Welfare Case</h3>
                <p className="text-muted-foreground mt-1">
                  Click on a case from the list to view and manage contributions
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default WelfareManagement;
