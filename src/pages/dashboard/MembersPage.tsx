import { useEffect, useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AccessibleButton } from '@/components/accessible/AccessibleButton';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { AccessibleStatus, useStatus } from '@/components/accessible';
import { Search, Users, UserCheck, UserX, Loader2, ChevronLeft, ChevronRight, AlertCircle } from 'lucide-react';
import { StatusBadge } from '@/components/StatusBadge';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { EmptyState } from '@/components/ui/empty-state';
import { usePaginationState } from '@/hooks/usePaginationState';
import { useDebounce } from '@/hooks/useDebounce';
import { getErrorMessage, logError, retryAsync } from '@/lib/errorHandling';
import { logAuditAction } from '@/lib/auditLogger';
import { useAuth } from '@/hooks/useAuth';

interface Member {
  id: string;
  full_name: string;
  email: string | null;
  phone: string;
  membership_number: string | null;
  status: 'active' | 'dormant' | 'pending' | 'suspended';
  is_student: boolean;
  registration_fee_paid: boolean;
  joined_at: string;
}

const MembersPage = () => {
  const [members, setMembers] = useState<Member[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [sendingResetId, setSendingResetId] = useState<string | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    memberId?: string;
    newStatus?: string;
  }>({ open: false });
  const [deleteDialog, setDeleteDialog] = useState<{
    step: 'idle' | 'prompt' | 'confirm';
    member?: Member;
    mode?: 'suspend' | 'permanent';
    confirmText?: string;
    isDeleting?: boolean;
  }>({ step: 'idle' });
  const [addDialog, setAddDialog] = useState<{
    open: boolean;
    fullName: string;
    email: string;
    phone: string;
    isStudent: string;
    feePaid: string;
    status: 'active' | 'pending';
    isSubmitting: boolean;
  }>({
    open: false,
    fullName: '',
    email: '',
    phone: '',
    isStudent: 'no',
    feePaid: 'no',
    status: 'active',
    isSubmitting: false,
  });
  const { toast } = useToast();
  const { status, showSuccess } = useStatus();
  const pagination = usePaginationState(15);
  const debouncedSearchTerm = useDebounce(searchTerm, 300);
  const { user, hasRole, isOfficial } = useAuth();
  const canDelete =
    hasRole('admin') || hasRole('chairperson') || hasRole('vice_chairman') || hasRole('organizing_secretary');
  const canPermanentDelete = hasRole('admin');
  const canManageMembers = isOfficial(); // all officials (including admin) can add/manage
  const officialCanAssist = isOfficial();

  useEffect(() => {
    fetchMembers();
  }, []);

  const filteredMembers = useMemo(() => {
    let filtered = members;

    if (debouncedSearchTerm) {
      const term = debouncedSearchTerm.toLowerCase();
      filtered = filtered.filter(
        (m) =>
          m.full_name.toLowerCase().includes(term) ||
          m.email?.toLowerCase().includes(term) ||
          m.phone.includes(term) ||
          m.membership_number?.includes(term)
      );
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter((m) => m.status === statusFilter);
    }

    return filtered;
  }, [members, debouncedSearchTerm, statusFilter]);

  // Update pagination when filtered members change
  useEffect(() => {
    pagination.updateTotal(filteredMembers.length);
  }, [filteredMembers.length, pagination]);

  const paginatedMembers = useMemo(() => {
    const offset = pagination.getOffset();
    return filteredMembers.slice(offset, offset + pagination.pageSize);
  }, [filteredMembers, pagination]);

  const fetchMembers = async () => {
    setIsLoading(true);
    try {
      setError(null);
      
      // Use retry logic for network resilience
      await retryAsync(
        async () => {
          const { data, error: fetchError } = await supabase
            .from('profiles')
            .select('id, full_name, email, phone, membership_number, status, is_student, registration_fee_paid, joined_at')
            .order('joined_at', { ascending: false });

          if (fetchError) throw fetchError;
          setMembers(data || []);
          return data;
        },
        {
          maxRetries: 3,
          delayMs: 1000,
          backoffMultiplier: 2,
          onRetry: (attempt) => {
            logError(`Retrying fetch members (attempt ${attempt})`, 'MembersPage', 'warn');
          },
        }
      );
    } catch (err) {
      const errorMsg = getErrorMessage(err);
      logError(err, 'MembersPage.fetchMembers');
      setError(errorMsg);
      toast({
        title: 'Failed to load members',
        description: errorMsg,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleStatusChange = (memberId: string, newStatus: string) => {
    setConfirmDialog({
      open: true,
      memberId,
      newStatus,
    });
  };

  const openDeleteFlow = (member: Member) => {
    if (!canDelete) return;
    setDeleteDialog({ step: 'prompt', member, mode: undefined, confirmText: '', isDeleting: false });
  };

  const requiredPhrase = (member?: Member) => {
    if (!member) return '';
    return `DELETE ${(member.membership_number ?? member.id).toUpperCase()}`;
  };

  const performDelete = async () => {
    const member = deleteDialog.member;
    const mode = deleteDialog.mode ?? 'suspend';
    if (!member || !canDelete) return;
    setDeleteDialog((prev) => ({ ...prev, isDeleting: true }));

    const snapshot = {
      id: member.id,
      full_name: member.full_name,
      email: member.email,
      phone: member.phone,
      membership_number: member.membership_number,
      status: member.status,
      joined_at: member.joined_at,
    };

    try {
      await retryAsync(
        async () => {
          const { data, error } = await supabase.functions.invoke('admin-ops', {
            body: {
              action: 'delete_member',
              member_id: member.id,
              mode,
              confirmation: deleteDialog.confirmText?.trim(),
              reason: mode === 'suspend' ? 'Suspended by official from members dashboard' : undefined,
            },
          });

          if (error) throw error;
          if (data?.error) throw new Error(data.error);
          return true;
        },
        { maxRetries: 2, delayMs: 600 }
      );

      if (mode === 'permanent') {
        setMembers((prev) => prev.filter((m) => m.id !== member.id));
      } else {
        setMembers((prev) =>
          prev.map((m) => (m.id === member.id ? { ...m, status: 'suspended' } : m))
        );
      }

      logAuditAction({
        actionType: mode === 'permanent' ? 'DELETE_MEMBER' : 'SUSPEND_MEMBER',
        description:
          mode === 'permanent'
            ? `Permanently deleted member ${member.full_name} (${member.membership_number ?? member.id})`
            : `Suspended member ${member.full_name} (${member.membership_number ?? member.id})`,
        entityType: 'profile',
        entityId: member.id,
        metadata: { snapshot, actor_id: user?.id, mode },
      });

      toast({
        title: mode === 'permanent' ? 'Member permanently deleted' : 'Member suspended',
        description:
          mode === 'permanent'
            ? `${member.full_name}'s account and data were removed.`
            : `${member.full_name}'s account is now suspended.`,
      });
    } catch (err) {
      const errorMsg = getErrorMessage(err);
      logError(err, 'MembersPage.performDelete');
      toast({
        title: 'Delete failed',
        description: errorMsg,
        variant: 'destructive',
      });
    } finally {
      setDeleteDialog({ step: 'idle', member: undefined, mode: undefined, confirmText: '', isDeleting: false });
    }
  };

  const updateMemberStatus = async () => {
    const { memberId, newStatus } = confirmDialog;
    if (!memberId || !newStatus) return;

    try {
      setUpdatingId(memberId);
      
      // Use retry logic for updates
      await retryAsync(
        async () => {
          const { error: updateError } = await supabase
            .from('profiles')
            .update({ status: newStatus as any })
            .eq('id', memberId);

          if (updateError) throw updateError;
          return true;
        },
        {
          maxRetries: 2,
          delayMs: 500,
        }
      );

      setMembers((prev) =>
        prev.map((m) =>
          m.id === memberId ? { ...m, status: newStatus as any } : m
        )
      );

      toast({
        title: 'Success',
        description: 'Member status updated successfully',
      });
    } catch (err) {
      const errorMsg = getErrorMessage(err);
      logError(err, 'MembersPage.updateMemberStatus');
      toast({
        title: 'Error',
        description: errorMsg,
        variant: 'destructive',
      });
    } finally {
      setUpdatingId(null);
      setConfirmDialog({ open: false });
    }
  };

  const generateMembershipNumber = async () => {
    try {
      const { data, error } = await supabase.rpc('generate_membership_number');
      if (error) throw error;
      return (data as string) || null;
    } catch (err) {
      logError(err, 'MembersPage.generateMembershipNumber');
      return null;
    }
  };

  const handleAddMember = async () => {
    if (!canManageMembers) return;
    if (!addDialog.fullName || !addDialog.phone) {
      toast({ title: 'Missing details', description: 'Name and phone are required', variant: 'destructive' });
      return;
    }

    setAddDialog((prev) => ({ ...prev, isSubmitting: true }));
    try {
      const membershipNumber = await generateMembershipNumber();
      const { data, error } = await supabase
        .from('profiles')
        .insert({
          full_name: addDialog.fullName,
          email: addDialog.email || null,
          phone: addDialog.phone,
          membership_number: membershipNumber,
          status: addDialog.status,
          is_student: addDialog.isStudent === 'yes',
          registration_fee_paid: addDialog.feePaid === 'yes',
        })
        .select('id, full_name, email, phone, membership_number, status, is_student, registration_fee_paid, joined_at')
        .single();

      if (error) throw error;

      if (data) {
        setMembers((prev) => [data as Member, ...prev]);
        logAuditAction({
          actionType: 'CREATE_MEMBER',
          description: `Admin added member ${data.full_name} (${membershipNumber ?? 'no number'})`,
          entityType: 'profile',
          entityId: data.id,
          metadata: { actor_id: user?.id },
        });
      }

      toast({ title: 'Member created', description: 'New member profile added successfully' });
      setAddDialog({
        open: false,
        fullName: '',
        email: '',
        phone: '',
        isStudent: 'no',
        feePaid: 'no',
        status: 'active',
        isSubmitting: false,
      });
    } catch (err) {
      const msg = getErrorMessage(err);
      toast({ title: 'Create failed', description: msg, variant: 'destructive' });
      setAddDialog((prev) => ({ ...prev, isSubmitting: false }));
    }
  };

  const sendResetEmail = async (member: Member) => {
    if (!member.email || !officialCanAssist) {
      toast({ title: 'No email on file', description: 'Cannot send reset link without an email', variant: 'destructive' });
      return;
    }
    setSendingResetId(member.id);
    try {
      await supabase.auth.resetPasswordForEmail(member.email, {
        redirectTo: `${window.location.origin}/auth/reset-password`,
      });
      logAuditAction({
        actionType: 'RESET_PASSWORD_LINK',
        description: `Password reset email triggered for ${member.email}`,
        entityType: 'profile',
        entityId: member.id,
        metadata: { actor_id: user?.id },
      });
      toast({ title: 'Reset link sent', description: `Password reset email sent to ${member.email}` });
    } catch (err) {
      toast({ title: 'Failed to send reset', description: getErrorMessage(err), variant: 'destructive' });
    } finally {
      setSendingResetId(null);
    }
  };

  const stats = {
    total: members.length,
    active: members.filter((m) => m.status === 'active').length,
    pending: members.filter((m) => m.status === 'pending').length,
    dormant: members.filter((m) => m.status === 'dormant').length,
  };

  return (
    <div className="space-y-6">
      <AccessibleStatus 
        message={status.message} 
        type={status.type} 
        isVisible={status.isVisible} 
      />
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-2xl font-serif font-bold text-foreground">Members Management</h2>
          <p className="text-muted-foreground">View and manage all CBO members</p>
        </div>
        {canManageMembers && (
          <Button onClick={() => setAddDialog((prev) => ({ ...prev, open: true }))} className="w-full md:w-auto">
            Add Member
          </Button>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Users className="w-8 h-8 text-primary" />
              <div>
                <p className="text-2xl font-bold">{stats.total}</p>
                <p className="text-sm text-muted-foreground">Total Members</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <UserCheck className="w-8 h-8 text-green-600" />
              <div>
                <p className="text-2xl font-bold">{stats.active}</p>
                <p className="text-sm text-muted-foreground">Active</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Users className="w-8 h-8 text-yellow-600" />
              <div>
                <p className="text-2xl font-bold">{stats.pending}</p>
                <p className="text-sm text-muted-foreground">Pending</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <UserX className="w-8 h-8 text-red-600" />
              <div>
                <p className="text-2xl font-bold">{stats.dormant}</p>
                <p className="text-sm text-muted-foreground">Dormant</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, email, phone, or membership number..."
                className="pl-9"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Members List */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>All Members ({filteredMembers.length})</CardTitle>
          <AccessibleButton
            variant="outline"
            size="sm"
            onClick={fetchMembers}
            disabled={isLoading}
            ariaLabel="Refresh members list"
          >
            Refresh
          </AccessibleButton>
        </CardHeader>
        <CardContent>
          {error && (
            <div className="mb-4 p-4 bg-destructive/10 text-destructive rounded-lg text-sm">
              {error}
              <AccessibleButton
                size="sm"
                variant="outline"
                onClick={fetchMembers}
                className="ml-2"
                ariaLabel="Retry fetching members"
              >
                Retry
              </AccessibleButton>
            </div>
          )}
          
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : paginatedMembers.length === 0 ? (
            <EmptyState
              title="No members found"
              description={filteredMembers.length === 0 ? 'Try adjusting your filters or search term' : 'Loading...'}
            />
          ) : (
            <>
              <div className="space-y-3 lg:hidden">
                {paginatedMembers.map((member) => (
                  <Card key={member.id} className="border border-border/60">
                    <CardContent className="p-4 space-y-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-accent flex items-center justify-center">
                          <span className="text-sm font-medium">
                            {member.full_name.charAt(0)}
                          </span>
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold truncate">{member.full_name}</p>
                          <p className="text-xs text-muted-foreground truncate">{member.email}</p>
                        </div>
                        <div className="ml-auto">
                          <StatusBadge status={member.status} />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3 text-xs">
                        <div>
                          <p className="text-muted-foreground">Membership #</p>
                          <p className="font-mono">{member.membership_number || '-'}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Joined</p>
                          <p>{new Date(member.joined_at).toLocaleDateString()}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Phone</p>
                          <p>{member.phone || '-'}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Student</p>
                          {member.is_student ? (
                            <Badge variant="outline" className="text-[10px]">Student</Badge>
                          ) : (
                            <p>-</p>
                          )}
                        </div>
                      </div>

                      <div className="pt-2 border-t">
                        <Select
                          value={member.status}
                          onValueChange={(value) => handleStatusChange(member.id, value)}
                          disabled={updatingId === member.id}
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="active">Activate</SelectItem>
                            <SelectItem value="pending">Pending</SelectItem>
                            <SelectItem value="dormant">Dormant</SelectItem>
                            <SelectItem value="suspended">Suspend</SelectItem>
                          </SelectContent>
                        </Select>
                        <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {officialCanAssist && member.email && (
                            <AccessibleButton
                              variant="secondary"
                              size="sm"
                              disabled={sendingResetId === member.id}
                              onClick={() => sendResetEmail(member)}
                              icon={<UserCheck className="w-4 h-4" />}
                            >
                              {sendingResetId === member.id ? 'Sending…' : 'Send Reset'}
                            </AccessibleButton>
                          )}
                          {canDelete && (
                            <AccessibleButton
                              variant="destructive"
                              size="sm"
                              className="w-full"
                              onClick={() => openDeleteFlow(member)}
                              icon={<AlertCircle className="w-4 h-4" />}
                            >
                              Delete Member
                            </AccessibleButton>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              <div className="hidden lg:block overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Member</TableHead>
                      <TableHead>Membership #</TableHead>
                      <TableHead>Contact</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Joined</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedMembers.map((member) => (
                      <TableRow key={member.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-accent flex items-center justify-center">
                              <span className="text-sm font-medium">
                                {member.full_name.charAt(0)}
                              </span>
                            </div>
                            <div>
                              <p className="font-medium">{member.full_name}</p>
                              {member.is_student && (
                                <Badge variant="outline" className="text-xs">
                                  Student
                                </Badge>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="font-mono text-sm">
                            {member.membership_number || '-'}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            <p>{member.phone}</p>
                            <p className="text-muted-foreground">{member.email}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <StatusBadge status={member.status} />
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {new Date(member.joined_at).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap items-center gap-2">
                            <Select
                              value={member.status}
                              onValueChange={(value) => handleStatusChange(member.id, value)}
                              disabled={updatingId === member.id}
                            >
                              <SelectTrigger className="w-[140px]">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="active">Activate</SelectItem>
                                <SelectItem value="pending">Pending</SelectItem>
                                <SelectItem value="dormant">Dormant</SelectItem>
                                <SelectItem value="suspended">Suspend</SelectItem>
                              </SelectContent>
                            </Select>

                            {officialCanAssist && member.email && (
                              <AccessibleButton
                                size="sm"
                                variant="secondary"
                                disabled={sendingResetId === member.id}
                                onClick={() => sendResetEmail(member)}
                                icon={<UserCheck className="w-4 h-4" />}
                              >
                                {sendingResetId === member.id ? 'Sending…' : 'Send Reset'}
                              </AccessibleButton>
                            )}

                            {canDelete && (
                              <AccessibleButton
                                size="sm"
                                variant="outline"
                                className="border-destructive text-destructive hover:bg-destructive/10"
                                icon={<AlertCircle className="w-4 h-4" />}
                                onClick={() => openDeleteFlow(member)}
                              >
                                Delete
                              </AccessibleButton>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination Controls */}
              <div className="flex items-center justify-between mt-4 pt-4 border-t">
                <div className="text-sm text-muted-foreground">
                  Showing {pagination.getOffset() + 1}-{Math.min(pagination.getOffset() + pagination.pageSize, filteredMembers.length)} of {filteredMembers.length}
                </div>
                <div className="flex items-center gap-2">
                  <AccessibleButton
                    variant="outline"
                    ariaLabel="Go to previous page"
                    onClick={pagination.prevPage}
                    disabled={pagination.page === 1}
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </AccessibleButton>
                  <div className="text-sm">
                    Page {pagination.page} of {Math.max(1, pagination.totalPages)}
                  </div>
                  <AccessibleButton
                    variant="outline"
                    ariaLabel="Go to next page"
                    onClick={pagination.nextPage}
                    disabled={pagination.page === pagination.totalPages}
                  >
                    <ChevronRight className="w-4 h-4" />
                  </AccessibleButton>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Delete Flow - Step 1 */}
      <Dialog open={deleteDialog.step === 'prompt'} onOpenChange={(open) => !open && setDeleteDialog({ step: 'idle' })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Member</DialogTitle>
            <DialogDescription>
              Choose how to handle {deleteDialog.member?.full_name}. Suspension is reversible, permanent deletion is not.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDeleteDialog({ step: 'idle' })}>
              Cancel
            </Button>
            <Button
              variant="secondary"
              onClick={() =>
                setDeleteDialog((prev) => ({ ...prev, step: 'confirm', mode: 'suspend', confirmText: '' }))
              }
            >
              Suspend Member
            </Button>
            {canPermanentDelete && (
              <Button
                variant="destructive"
                onClick={() =>
                  setDeleteDialog((prev) => ({ ...prev, step: 'confirm', mode: 'permanent', confirmText: '' }))
                }
              >
                Permanently Delete
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Flow - Step 2 */}
      <Dialog open={deleteDialog.step === 'confirm'} onOpenChange={(open) => !open && setDeleteDialog({ step: 'idle' })}>
        <DialogContent className="space-y-4">
          <DialogHeader>
            <DialogTitle className={deleteDialog.mode === 'permanent' ? 'text-destructive' : ''}>
              {deleteDialog.mode === 'permanent' ? 'Permanent Deletion Confirmation' : 'Suspension Confirmation'}
            </DialogTitle>
            <DialogDescription>
              {deleteDialog.mode === 'permanent'
                ? 'This will permanently remove the member account and linked records.'
                : 'This will suspend the member account while preserving records for possible reinstatement.'}
            </DialogDescription>
          </DialogHeader>

          <div className="rounded-lg border border-border/60 bg-muted/30 p-4 text-sm space-y-2">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <span className="font-semibold text-foreground">{deleteDialog.member?.full_name}</span>
              <Badge variant="outline">{deleteDialog.member?.membership_number || 'No Membership #'}</Badge>
            </div>
            <p className="text-muted-foreground">
              Email: {deleteDialog.member?.email || 'N/A'} | Phone: {deleteDialog.member?.phone}
            </p>
            <p className="text-muted-foreground">
              Current status: <strong className="text-foreground">{deleteDialog.member?.status}</strong>
            </p>
            <p className="text-[13px] text-yellow-700 bg-yellow-50 border border-yellow-200 rounded-md px-3 py-2">
              {deleteDialog.mode === 'permanent'
                ? 'This is irreversible and deletes profile/account data from Supabase.'
                : 'Suspension is safer. You can reactivate this member later if needed.'}
            </p>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground block">
              Type <span className="font-mono">{requiredPhrase(deleteDialog.member)}</span> to confirm
            </label>
            <Input
              value={deleteDialog.confirmText}
              onChange={(e) => setDeleteDialog((prev) => ({ ...prev, confirmText: e.target.value }))}
              placeholder={requiredPhrase(deleteDialog.member)}
            />
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDeleteDialog({ step: 'idle' })}>
              Cancel
            </Button>
            <Button
              variant={deleteDialog.mode === 'permanent' ? 'destructive' : 'secondary'}
              disabled={
                deleteDialog.isDeleting ||
                deleteDialog.confirmText?.trim() !== requiredPhrase(deleteDialog.member)
              }
              onClick={performDelete}
            >
              {deleteDialog.isDeleting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {deleteDialog.mode === 'permanent' ? 'Permanently Delete' : 'Confirm Suspension'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Member */}
      <Dialog open={addDialog.open} onOpenChange={(open) => setAddDialog((prev) => ({ ...prev, open }))}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Member</DialogTitle>
            <DialogDescription>Admins and officials can register members who need assistance.</DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div className="grid gap-2">
              <label className="text-sm font-medium">Full name</label>
              <Input
                value={addDialog.fullName}
                onChange={(e) => setAddDialog((prev) => ({ ...prev, fullName: e.target.value }))}
                placeholder="Jane Doe"
              />
            </div>
            <div className="grid gap-2">
              <label className="text-sm font-medium">Email (optional)</label>
              <Input
                type="email"
                value={addDialog.email}
                onChange={(e) => setAddDialog((prev) => ({ ...prev, email: e.target.value }))}
                placeholder="jane@example.com"
              />
            </div>
            <div className="grid gap-2">
              <label className="text-sm font-medium">Phone</label>
              <Input
                value={addDialog.phone}
                onChange={(e) => setAddDialog((prev) => ({ ...prev, phone: e.target.value }))}
                placeholder="+2547..."
              />
            </div>
            <div className="grid gap-2">
              <label className="text-sm font-medium">Status</label>
              <Select
                value={addDialog.status}
                onValueChange={(value: 'active' | 'pending') => setAddDialog((prev) => ({ ...prev, status: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <label className="text-sm font-medium">Student?</label>
              <Select
                value={addDialog.isStudent}
                onValueChange={(value) => setAddDialog((prev) => ({ ...prev, isStudent: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="no">No</SelectItem>
                  <SelectItem value="yes">Yes</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <label className="text-sm font-medium">Registration fee paid?</label>
              <Select
                value={addDialog.feePaid}
                onValueChange={(value) => setAddDialog((prev) => ({ ...prev, feePaid: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="no">No</SelectItem>
                  <SelectItem value="yes">Yes</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setAddDialog((prev) => ({ ...prev, open: false }))}>
              Cancel
            </Button>
            <Button onClick={handleAddMember} disabled={addDialog.isSubmitting}>
              {addDialog.isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Save Member
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={confirmDialog.open}
        title="Change Member Status"
        description={`Are you sure you want to change this member's status to "${confirmDialog.newStatus}"?`}
        action="Update"
        actionVariant={confirmDialog.newStatus === 'suspended' ? 'destructive' : 'default'}
        onConfirm={updateMemberStatus}
        onCancel={() => setConfirmDialog({ open: false })}
        isLoading={updatingId !== null}
      />
    </div>
  );
};

export default MembersPage;
