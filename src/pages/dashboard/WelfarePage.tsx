import { useEffect, useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { StatusBadge } from '@/components/StatusBadge';
import { Progress } from '@/components/ui/progress';
import { AccessibleButton } from '@/components/accessible/AccessibleButton';
import { AccessibleStatus, useStatus } from '@/components/accessible';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { hasPermission } from '@/lib/rolePermissions';
import { usePaginationState } from '@/hooks/usePaginationState';
import { getErrorMessage, logError, retryAsync } from '@/lib/errorHandling';
import { HandHeart, Loader2, Heart, Users, DollarSign, Plus, Edit2, Trash2, AlertCircle, ChevronLeft, ChevronRight } from 'lucide-react';
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
  beneficiary_id: string | null;
  beneficiary: {
    full_name: string;
  } | null;
}

const WelfarePage = () => {
  const { user, roles } = useAuth();
  const { status: statusMessage, showSuccess } = useStatus();
  const [cases, setCases] = useState<WelfareCase[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isEditingId, setIsEditingId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    case_type: 'medical',
    target_amount: '',
    beneficiary_id: '',
  });
  const [beneficiaries, setBeneficiaries] = useState<Array<{id: string; full_name: string}>>([]);
  const pagination = usePaginationState(12);

  const userRoles = roles.map(r => r.role);
  const canCreateWelfare = hasPermission(userRoles, 'create_welfare');
  const canManageWelfare = hasPermission(userRoles, 'manage_welfare');

  // Paginate cases
  const paginatedCases = useMemo(() => {
    const offset = (pagination.page - 1) * pagination.pageSize;
    return cases.slice(offset, offset + pagination.pageSize);
  }, [cases, pagination.page, pagination.pageSize]);

  // Update pagination when cases change
  useEffect(() => {
    pagination.updateTotal(cases.length);
  }, [cases.length, pagination]);

  useEffect(() => {
    fetchWelfareCases();
    fetchBeneficiaries();

    // Real-time subscription for new welfare cases
    const channel = supabase
      .channel('welfare_cases_updates')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'welfare_cases' }, () => {
        fetchWelfareCases();
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'welfare_cases' }, () => {
        fetchWelfareCases();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchBeneficiaries = async () => {
    try {
      const { data } = await supabase
        .from('profiles')
        .select('id, full_name')
        .order('full_name');
      
      setBeneficiaries(data || []);
    } catch (error) {
      console.error('Error fetching beneficiaries:', error);
    }
  };

  const handleSaveWelfareCase = async () => {
    if (!formData.title.trim()) {
      setError('Please fill in required fields');
      return;
    }

    setIsSaving(true);
    setError(null);
    setSuccess(null);

    try {
      if (isEditingId) {
        // Update welfare case
        const { error: updateError } = await supabase
          .from('welfare_cases')
          .update({
            title: formData.title,
            description: formData.description || null,
            case_type: formData.case_type,
            target_amount: formData.target_amount ? parseInt(formData.target_amount) : null,
            beneficiary_id: formData.beneficiary_id || null,
          })
          .eq('id', isEditingId);

        if (updateError) throw updateError;
        showSuccess('Welfare case updated successfully!', 5000);
      } else {
        // Create new welfare case
        const { error: createError } = await supabase
          .from('welfare_cases')
          .insert({
            title: formData.title,
            description: formData.description || null,
            case_type: formData.case_type,
            target_amount: formData.target_amount ? parseInt(formData.target_amount) : null,
            beneficiary_id: formData.beneficiary_id || null,
            status: 'active',
            collected_amount: 0,
          });

        if (createError) throw createError;
        showSuccess('Welfare case created successfully!', 5000);
      }

      setFormData({ title: '', description: '', case_type: 'medical', target_amount: '', beneficiary_id: '' });
      setIsEditingId(null);
      setIsDialogOpen(false);
      await fetchWelfareCases();
    } catch (error) {
      console.error('Error saving welfare case:', error);
      setError('Failed to save welfare case. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleEditWelfareCase = (welfareCase: WelfareCase) => {
    setFormData({
      title: welfareCase.title,
      description: welfareCase.description || '',
      case_type: welfareCase.case_type,
      target_amount: welfareCase.target_amount ? welfareCase.target_amount.toString() : '',
      beneficiary_id: welfareCase.beneficiary_id || '',
    });
    setIsEditingId(welfareCase.id);
    setIsDialogOpen(true);
    setError(null);
    setSuccess(null);
  };

  const handleDeleteWelfareCase = async (caseId: string) => {
    if (!globalThis.confirm('Are you sure you want to delete this welfare case?')) {
      return;
    }

    setIsDeleting(caseId);
    try {
      // Check if there are linked contributions
      const { data: linkedContributions, error: checkError } = await supabase
        .from('contributions')
        .select('id', { count: 'exact', head: true })
        .eq('welfare_case_id', caseId);
      
      if (checkError) throw checkError;
      
      if (linkedContributions && linkedContributions.length > 0) {
        setError(`Cannot delete this welfare case as it has ${linkedContributions.length} linked contribution(s). Please remove the contributions first.`);
        return;
      }
      
      const { error: deleteError } = await supabase
        .from('welfare_cases')
        .delete()
        .eq('id', caseId);

      if (deleteError) throw deleteError;
      showSuccess('Welfare case deleted successfully!', 5000);
      await fetchWelfareCases();
    } catch (error) {
      const errorMsg = getErrorMessage(error);
      logError(error, 'WelfarePage.handleDeleteWelfareCase');
      setError(errorMsg);
    } finally {
      setIsDeleting(null);
    }
  };

  const fetchWelfareCases = async () => {
    setIsLoading(true);
    try {
      setError(null);
      
      await retryAsync(
        async () => {
          // Fetch ALL welfare cases regardless of status to ensure visibility
          const { data, error: fetchError } = await supabase
            .from('welfare_cases')
            .select('id, title, description, case_type, target_amount, collected_amount, status, created_at, beneficiary_id, beneficiary:beneficiary_id(full_name)')
            .order('created_at', { ascending: false });

          if (fetchError) throw fetchError;
          setCases(data || []);
          return data;
        },
        {
          maxRetries: 3,
          delayMs: 1000,
          backoffMultiplier: 2,
          onRetry: (attempt) => {
            logError(`Retrying fetch welfare cases (attempt ${attempt})`, 'WelfarePage', 'warn');
          },
        }
      );
    } catch (error) {
      const errorMsg = getErrorMessage(error);
      logError(error, 'WelfarePage.fetchWelfareCases');
      setError(errorMsg);
    } finally {
      setIsLoading(false);
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

  const activeCases = cases.filter((c) => c.status === 'active');
  const closedCases = cases.filter((c) => c.status !== 'active');

  const renderEmptyState = () => (
    <Card>
      <CardContent className="py-12 text-center">
        <HandHeart className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
        <h3 className="text-lg font-medium text-foreground">No welfare cases</h3>
        <p className="text-muted-foreground mt-1">
          There are no active welfare cases at this time
        </p>
      </CardContent>
    </Card>
  );

  const renderCasesList = () => (
    <>
      {/* All Cases with Pagination */}
      {paginatedCases.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-foreground">
            Welfare Cases ({cases.length})
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {paginatedCases.map((welfareCase) => (
              <Card key={welfareCase.id} className="overflow-hidden">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-3">
                      {getCaseTypeIcon(welfareCase.case_type)}
                      <div>
                        <CardTitle className="text-lg">{welfareCase.title}</CardTitle>
                        <p className="text-sm text-muted-foreground capitalize">
                          {welfareCase.case_type.replace('_', ' ')}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <StatusBadge status={welfareCase.status} />
                      {canManageWelfare && (
                        <div className="flex gap-1">
                          <AccessibleButton
                            variant="ghost"
                            ariaLabel={`Edit welfare case ${welfareCase.title}`}
                            onClick={() => handleEditWelfareCase(welfareCase)}
                            className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                          >
                            <Edit2 className="w-4 h-4" />
                          </AccessibleButton>
                          <AccessibleButton
                            variant="ghost"
                            ariaLabel={`Delete welfare case ${welfareCase.title}`}
                            onClick={() => handleDeleteWelfareCase(welfareCase.id)}
                            disabled={isDeleting === welfareCase.id}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            {isDeleting === welfareCase.id ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <Trash2 className="w-4 h-4" />
                            )}
                          </AccessibleButton>
                        </div>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {welfareCase.description && (
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {welfareCase.description}
                    </p>
                  )}
                  {welfareCase.beneficiary && (
                    <p className="text-sm">
                      <span className="text-muted-foreground">Beneficiary:</span>{' '}
                      <span className="font-medium">{welfareCase.beneficiary.full_name}</span>
                    </p>
                  )}
                  {welfareCase.target_amount !== null && welfareCase.target_amount !== undefined && (
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Progress</span>
                        <span className="font-medium">
                          KES {(welfareCase.collected_amount || 0).toLocaleString()} / {welfareCase.target_amount!.toLocaleString()}
                        </span>
                      </div>
                      <Progress
                        value={((welfareCase.collected_amount || 0) / welfareCase.target_amount!) * 100}
                        className="h-2"
                      />
                    </div>
                  )}
                  <p className="text-xs text-muted-foreground">
                    Created {new Date(welfareCase.created_at).toLocaleDateString()}
                  </p>
                  {/* Contribute Button */}
                  <div className="pt-2">
                    <WelfareContributeDialog
                      welfareCaseId={welfareCase.id}
                      welfareCaseTitle={welfareCase.title}
                      targetAmount={welfareCase.target_amount}
                      collectedAmount={welfareCase.collected_amount}
                      onContributionSuccess={() => fetchWelfareCases()}
                    />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Pagination Controls */}
          <div className="flex items-center justify-between mt-6 pt-4 border-t">
            <div className="text-sm text-muted-foreground">
              Showing {(pagination.page - 1) * pagination.pageSize + 1}-{Math.min(pagination.page * pagination.pageSize, cases.length)} of {cases.length}
            </div>
            <div className="flex items-center gap-2">
              <AccessibleButton
                variant="outline"
                size="sm"
                ariaLabel="Previous page"
                onClick={() => pagination.page > 1 && pagination.goToPage(pagination.page - 1)}
                disabled={pagination.page === 1}
              >
                <ChevronLeft className="w-4 h-4" />
              </AccessibleButton>
              <div className="text-sm">
                Page {pagination.page} of {Math.max(1, pagination.totalPages)}
              </div>
              <AccessibleButton
                variant="outline"
                size="sm"
                ariaLabel="Next page"
                onClick={() => pagination.page < pagination.totalPages && pagination.goToPage(pagination.page + 1)}
                disabled={pagination.page === pagination.totalPages}
              >
                <ChevronRight className="w-4 h-4" />
              </AccessibleButton>
            </div>
          </div>
        </div>
      )}
    </>
  );

  return (
    <div className="space-y-6">
      <AccessibleStatus message={statusMessage.message} type={statusMessage.type} isVisible={statusMessage.isVisible} />
      <div>
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-serif font-bold text-foreground">Welfare Cases</h2>
            <p className="text-muted-foreground">Support our members in times of need</p>
          </div>
          {canCreateWelfare && (
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <AccessibleButton className="gap-2" ariaLabel="Open dialog to create new welfare case">
                  <Plus className="w-4 h-4" />
                  New Welfare Case
                </AccessibleButton>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>{isEditingId ? 'Edit Welfare Case' : 'Create Welfare Case'}</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  {error && (
                    <div className="p-3 bg-destructive/10 border border-destructive/30 rounded-lg flex gap-2">
                      <AlertCircle className="w-4 h-4 text-destructive flex-shrink-0 mt-0.5" />
                      <p className="text-sm text-destructive">{error}</p>
                    </div>
                  )}
                  {success && (
                    <div className="p-3 bg-green-100 border border-green-300 rounded-lg">
                      <p className="text-sm text-green-800">{success}</p>
                    </div>
                  )}
                  <div>
                    <label htmlFor="title" className="text-sm font-medium">Title *</label>
                    <Input
                      id="title"
                      placeholder="Case title"
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <label htmlFor="description" className="text-sm font-medium">Description</label>
                    <textarea
                      id="description"
                      placeholder="Case description"
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      className="w-full p-2 border border-input rounded-md bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary min-h-20 mt-1"
                    />
                  </div>
                  <div>
                    <label htmlFor="case_type" className="text-sm font-medium">Case Type</label>
                    <select
                      id="case_type"
                      value={formData.case_type}
                      onChange={(e) => setFormData({ ...formData, case_type: e.target.value })}
                      className="w-full p-2 border border-input rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary mt-1"
                    >
                      <option value="medical">Medical</option>
                      <option value="bereavement">Bereavement</option>
                      <option value="education">Education</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                  <div>
                    <label htmlFor="beneficiary" className="text-sm font-medium">Beneficiary</label>
                    <select
                      id="beneficiary"
                      value={formData.beneficiary_id}
                      onChange={(e) => setFormData({ ...formData, beneficiary_id: e.target.value })}
                      className="w-full p-2 border border-input rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary mt-1"
                    >
                      <option value="">Select a beneficiary</option>
                      {beneficiaries.map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.full_name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label htmlFor="target_amount" className="text-sm font-medium">Target Amount (KES)</label>
                    <Input
                      id="target_amount"
                      type="number"
                      placeholder="0"
                      value={formData.target_amount}
                      onChange={(e) => setFormData({ ...formData, target_amount: e.target.value })}
                      className="mt-1"
                    />
                  </div>
                  <AccessibleButton
                    ariaLabel={isEditingId ? 'Update welfare case' : 'Create welfare case'}
                    onClick={handleSaveWelfareCase}
                    disabled={isSaving}
                    className="w-full"
                  >
                    {isSaving ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      isEditingId ? 'Update Case' : 'Create Case'
                    )}
                  </AccessibleButton>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : cases.length === 0 ? (
        renderEmptyState()
      ) : (
        renderCasesList()
      )}
    </div>
  );
};

export default WelfarePage;
