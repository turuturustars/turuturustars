import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { hasPermission } from '@/lib/rolePermissions';
import { HandHeart, Loader2, Heart, Users, DollarSign, Plus, Edit2, Trash2, AlertCircle } from 'lucide-react';

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
  } | null;
}

const WelfarePage = () => {
  const { user, roles } = useAuth();
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

  const userRoles = roles.map(r => r.role);
  const canCreateWelfare = hasPermission(userRoles, 'create_welfare');
  const canManageWelfare = hasPermission(userRoles, 'manage_welfare');

  useEffect(() => {
    fetchWelfareCases();
    fetchBeneficiaries();
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
        setSuccess('Welfare case updated successfully!');
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
        setSuccess('Welfare case created successfully!');
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
      beneficiary_id: welfareCase.beneficiary?.id || '',
    });
    setIsEditingId(welfareCase.id);
    setIsDialogOpen(true);
    setError(null);
    setSuccess(null);
  };

  const handleDeleteWelfareCase = async (caseId: string) => {
    if (!window.confirm('Are you sure you want to delete this welfare case?')) {
      return;
    }

    setIsDeleting(caseId);
    try {
      const { error: deleteError } = await supabase
        .from('welfare_cases')
        .delete()
        .eq('id', caseId);

      if (deleteError) throw deleteError;
      setSuccess('Welfare case deleted successfully!');
      await fetchWelfareCases();
    } catch (error) {
      console.error('Error deleting welfare case:', error);
      setError('Failed to delete welfare case. Please try again.');
    } finally {
      setIsDeleting(null);
    }
  };

  const fetchWelfareCases = async () => {
    try {
      const { data, error } = await supabase
        .from('welfare_cases')
        .select(`
          *,
          beneficiary:beneficiary_id (full_name, id)
        `)
        .eq('status', 'active')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setCases(data || []);
    } catch (error) {
      console.error('Error fetching welfare cases:', error);
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

  const getStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      active: 'bg-green-100 text-green-800',
      closed: 'bg-gray-100 text-gray-800',
      cancelled: 'bg-red-100 text-red-800',
    };
    return (
      <Badge className={colors[status] || colors.active}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
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
      {/* Active Cases */}
      {activeCases.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-foreground">Active Cases</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {activeCases.map((welfareCase) => (
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
                      {getStatusBadge(welfareCase.status)}
                      {canManageWelfare && (
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEditWelfareCase(welfareCase)}
                            className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                          >
                            <Edit2 className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteWelfareCase(welfareCase.id)}
                            disabled={isDeleting === welfareCase.id}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            {isDeleting === welfareCase.id ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <Trash2 className="w-4 h-4" />
                            )}
                          </Button>
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
                          KES {welfareCase.collected_amount.toLocaleString()} / {welfareCase.target_amount!.toLocaleString()}
                        </span>
                      </div>
                      <Progress
                        value={(welfareCase.collected_amount / welfareCase.target_amount!) * 100}
                        className="h-2"
                      />
                    </div>
                  )}
                  <p className="text-xs text-muted-foreground">
                    Created {new Date(welfareCase.created_at).toLocaleDateString()}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Past Cases */}
      {closedCases.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-foreground">Past Cases</h3>
          <Card>
            <CardContent className="p-0">
              <div className="divide-y divide-border">
                {closedCases.map((welfareCase) => (
                  <div key={welfareCase.id} className="p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {getCaseTypeIcon(welfareCase.case_type)}
                      <div>
                        <p className="font-medium">{welfareCase.title}</p>
                        <p className="text-sm text-muted-foreground">
                          Collected: KES {welfareCase.collected_amount.toLocaleString()}
                        </p>
                      </div>
                    </div>
                    {getStatusBadge(welfareCase.status)}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </>
  );

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-serif font-bold text-foreground">Welfare Cases</h2>
            <p className="text-muted-foreground">Support our members in times of need</p>
          </div>
          {canCreateWelfare && (
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button className="gap-2">
                  <Plus className="w-4 h-4" />
                  New Welfare Case
                </Button>
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
                  <div className="flex gap-2 pt-2">
                    <Button
                      onClick={handleSaveWelfareCase}
                      disabled={isSaving}
                      className="flex-1"
                    >
                      {isSaving ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          {isEditingId ? 'Updating...' : 'Creating...'}
                        </>
                      ) : (
                        isEditingId ? 'Update Case' : 'Create Case'
                      )}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setIsDialogOpen(false);
                        setIsEditingId(null);
                        setFormData({ title: '', description: '', case_type: 'medical', target_amount: '', beneficiary_id: '' });
                        setError(null);
                        setSuccess(null);
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-green-100 flex items-center justify-center">
                <HandHeart className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{activeCases.length}</p>
                <p className="text-sm text-muted-foreground">Active Cases</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  KES {activeCases.reduce((sum, c) => sum + (c.collected_amount || 0), 0).toLocaleString()}
                </p>
                <p className="text-sm text-muted-foreground">Total Collected</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-purple-100 flex items-center justify-center">
                <Users className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{closedCases.length}</p>
                <p className="text-sm text-muted-foreground">Cases Closed</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      )}
      {!isLoading && cases.length === 0 && renderEmptyState()}
      {!isLoading && cases.length > 0 && renderCasesList()}
    </div>
  );
};

export default WelfarePage;