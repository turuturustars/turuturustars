import { useCallback, useEffect, useState } from 'react';
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
import { formatKenyanPhoneError, normalizeKenyanPhone } from '@/utils/kenyanPhone';

interface Member {
  id: string;
  full_name: string;
  email: string | null;
  phone: string;
  id_number: string | null;
  membership_number: string | null;
  status: MemberStatus;
  is_student: boolean;
  registration_fee_paid: boolean;
  joined_at: string;
}

interface MemberRegistryStats {
  total: number;
  active: number;
  pending: number;
  dormant: number;
}

type MemberStatus = 'active' | 'dormant' | 'pending' | 'suspended';

type FunctionErrorPayload = {
  error?: string;
  details?: {
    detail?: string;
    error?: string;
    message?: string;
    response?: { message?: string };
  } | string | null;
};

type NumericValue = number | string | null | undefined;

type MemberRegistryStatsRow = {
  total?: NumericValue;
  active?: NumericValue;
  pending?: NumericValue;
  dormant?: NumericValue;
};

const toNumber = (value: NumericValue): number => {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
};

async function getFunctionErrorMessage(error: unknown): Promise<string> {
  let status: number | undefined;
  let serverMessage = '';
  let serverDetail = '';

  if (error && typeof error === 'object') {
    const context = (error as { context?: unknown }).context;
    if (context instanceof Response) {
      status = context.status;
      try {
        const payload = (await context.clone().json()) as FunctionErrorPayload;
        serverMessage = payload.error?.trim() || '';
        if (typeof payload.details === 'string') {
          serverDetail = payload.details.trim();
        } else if (payload.details) {
          serverDetail =
            payload.details.detail?.trim() ||
            payload.details.error?.trim() ||
            payload.details.message?.trim() ||
            payload.details.response?.message?.trim() ||
            '';
        }
      } catch {
        // The response was not JSON. Fall through to status-based messages.
      }
    }

    const rawMessage =
      'message' in error && typeof (error as { message?: unknown }).message === 'string'
        ? (error as { message: string }).message
        : '';

    const lowerRaw = rawMessage.toLowerCase();
    if (status === 404 || lowerRaw.includes('failed to send a request to the edge function')) {
      return 'The member registration service is not available right now. Please contact the system administrator, then try again.';
    }
    if (status === 401) {
      return 'Your session has expired. Sign out, sign in again, and retry.';
    }
    if (status === 403) {
      return 'Your account does not have permission to add members.';
    }
    if (status === 409) {
      return serverMessage || serverDetail || 'This member already exists. Check the email, phone, or National ID.';
    }

    const combined = `${serverMessage} ${serverDetail} ${rawMessage}`.toLowerCase();
    if (combined.includes('already') || combined.includes('registered') || combined.includes('duplicate')) {
      return serverMessage || serverDetail || 'This member already exists. Check the email, phone, or National ID.';
    }
    if (serverMessage) {
      return serverMessage;
    }
    if (serverDetail) {
      return serverDetail;
    }
    if (rawMessage) {
      return rawMessage;
    }
  }

  return 'The member could not be saved. Please check the details and try again.';
}

const MembersPage = () => {
  const [members, setMembers] = useState<Member[]>([]);
  const [memberStats, setMemberStats] = useState<MemberRegistryStats>({
    total: 0,
    active: 0,
    pending: 0,
    dormant: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [sendingResetId, setSendingResetId] = useState<string | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    memberId?: string;
    newStatus?: MemberStatus;
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
    idNumber: string;
    isStudent: string;
    feePaid: string;
    status: 'active' | 'pending';
    isSubmitting: boolean;
    submitError: string | null;
  }>({
    open: false,
    fullName: '',
    email: '',
    phone: '',
    idNumber: '',
    isStudent: 'no',
    feePaid: 'no',
    status: 'active',
    isSubmitting: false,
    submitError: null,
  });
  const { toast } = useToast();
  const { status, showSuccess } = useStatus();
  const pagination = usePaginationState(15);
  const { getOffset, pageSize, updateTotal } = pagination;
  const debouncedSearchTerm = useDebounce(searchTerm, 300);
  const { user, hasRole, isOfficial } = useAuth();
  const canDelete =
    hasRole('admin') || hasRole('chairperson') || hasRole('vice_chairman') || hasRole('organizing_secretary');
  const canPermanentDelete = hasRole('admin');
  const canManageMembers = isOfficial(); // all officials (including admin) can add/manage
  const officialCanAssist = isOfficial();

  const fetchMembers = useCallback(async () => {
    setIsLoading(true);
    try {
      setError(null);
      
      // Use retry logic for network resilience
      await retryAsync(
        async () => {
          const offset = getOffset();
          let query = supabase
            .from('profiles')
            .select('id, full_name, email, phone, id_number, membership_number, status, is_student, registration_fee_paid, joined_at', {
              count: 'exact',
            })
            .order('joined_at', { ascending: false })
            .range(offset, offset + pageSize - 1);

          const term = debouncedSearchTerm.trim().replace(/[%,()]/g, '');
          if (term) {
            const pattern = `%${term}%`;
            query = query.or(
              `full_name.ilike.${pattern},email.ilike.${pattern},phone.ilike.${pattern},id_number.ilike.${pattern},membership_number.ilike.${pattern}`
            );
          }

          if (statusFilter !== 'all') {
            query = query.eq('status', statusFilter as MemberStatus);
          }

          const [{ data, error: fetchError, count }, statsRes] = await Promise.all([
            query,
            supabase.rpc('get_member_registry_stats' as never).maybeSingle(),
          ]);

          if (fetchError) throw fetchError;
          if (statsRes.error) throw statsRes.error;

          const statsRow = statsRes.data as MemberRegistryStatsRow | null;
          setMembers(data || []);
          setMemberStats({
            total: toNumber(statsRow?.total),
            active: toNumber(statsRow?.active),
            pending: toNumber(statsRow?.pending),
            dormant: toNumber(statsRow?.dormant),
          });
          updateTotal(count ?? data?.length ?? 0);
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
  }, [debouncedSearchTerm, getOffset, pageSize, statusFilter, toast, updateTotal]);

  useEffect(() => {
    fetchMembers();
  }, [fetchMembers]);

  const handleStatusChange = (memberId: string, newStatus: MemberStatus) => {
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
            .update({ status: newStatus })
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
          m.id === memberId ? { ...m, status: newStatus } : m
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
    const fullName = addDialog.fullName.trim();
    const email = addDialog.email.trim().toLowerCase();
    const idNumber = addDialog.idNumber.replace(/\s+/g, '').trim();
    const normalizedPhone = normalizeKenyanPhone(addDialog.phone);
    const failValidation = (description: string) => {
      setAddDialog((prev) => ({ ...prev, submitError: description }));
      toast({ title: 'Check member details', description, variant: 'destructive' });
    };

    if (!fullName || !addDialog.phone.trim() || !idNumber) {
      failValidation('Name, phone, and National ID are required.');
      return;
    }
    if (!normalizedPhone) {
      failValidation(formatKenyanPhoneError());
      return;
    }
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      failValidation('Enter a valid email address, or leave email blank.');
      return;
    }
    if (idNumber.length < 6) {
      failValidation('National ID must be at least 6 characters because it becomes the first password.');
      return;
    }

    setAddDialog((prev) => ({ ...prev, isSubmitting: true, submitError: null }));
    try {
      const { data, error } = await supabase.functions.invoke('admin-ops', {
        body: {
          action: 'create_member',
          full_name: fullName,
          email: email || null,
          phone: normalizedPhone,
          id_number: idNumber,
          status: addDialog.status,
          is_student: addDialog.isStudent === 'yes',
          registration_fee_paid: addDialog.feePaid === 'yes',
        },
      });

      if (error) throw new Error(await getFunctionErrorMessage(error));
      if (data?.error) throw new Error(data.error);

      const member = data?.member as Member | undefined;
      if (member) {
        setMembers((prev) => [member, ...prev]);
        logAuditAction({
          actionType: 'CREATE_MEMBER',
          description: `Admin added member ${member.full_name} (${member.membership_number ?? 'no number'})`,
          entityType: 'profile',
          entityId: member.id,
          metadata: { actor_id: user?.id },
        });
      } else {
        // refresh list as a fallback
        fetchMembers();
      }

      toast({
        title: 'Member created',
        description: 'New member profile added successfully. Their first password is their National ID.',
      });
      setAddDialog({
        open: false,
        fullName: '',
        email: '',
        phone: '',
        idNumber: '',
        isStudent: 'no',
        feePaid: 'no',
        status: 'active',
        isSubmitting: false,
        submitError: null,
      });
    } catch (err) {
      const msg = getErrorMessage(err);
      logError(err, 'MembersPage.handleAddMember');
      toast({ title: 'Member not saved', description: msg, variant: 'destructive' });
      setAddDialog((prev) => ({ ...prev, isSubmitting: false, submitError: msg }));
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
    total: memberStats.total,
    active: memberStats.active,
    pending: memberStats.pending,
    dormant: memberStats.dormant,
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
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  pagination.goToPage(1);
                }}
              />
            </div>
            <Select
              value={statusFilter}
              onValueChange={(value) => {
                setStatusFilter(value);
                pagination.goToPage(1);
              }}
            >
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="dormant">Dormant</SelectItem>
                <SelectItem value="suspended">Suspended</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Members List */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>All Members ({pagination.totalItems})</CardTitle>
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
          ) : members.length === 0 ? (
            <EmptyState
              title="No members found"
              description="Try adjusting your filters or search term"
            />
          ) : (
            <>
              <div className="space-y-3 lg:hidden">
                {members.map((member) => (
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
                          onValueChange={(value) => handleStatusChange(member.id, value as MemberStatus)}
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
                    {members.map((member) => (
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
                              onValueChange={(value) => handleStatusChange(member.id, value as MemberStatus)}
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
                  Showing {pagination.getOffset() + 1}-{Math.min(pagination.getOffset() + pagination.pageSize, pagination.totalItems)} of {pagination.totalItems}
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
      <Dialog open={addDialog.open} onOpenChange={(open) => setAddDialog((prev) => ({ ...prev, open, submitError: open ? prev.submitError : null }))}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Member</DialogTitle>
            <DialogDescription>
              Admins and officials can register members who need assistance. The National ID becomes the first password.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div className="grid gap-2">
              <label className="text-sm font-medium">Full name</label>
              <Input
                value={addDialog.fullName}
                onChange={(e) => setAddDialog((prev) => ({ ...prev, fullName: e.target.value, submitError: null }))}
                placeholder="Jane Doe"
              />
            </div>
            <div className="grid gap-2">
              <label className="text-sm font-medium">Email (optional)</label>
              <Input
                type="email"
                value={addDialog.email}
                onChange={(e) => setAddDialog((prev) => ({ ...prev, email: e.target.value, submitError: null }))}
                placeholder="jane@example.com"
              />
            </div>
            <div className="grid gap-2">
              <label className="text-sm font-medium">Phone</label>
              <Input
                value={addDialog.phone}
                onChange={(e) => setAddDialog((prev) => ({ ...prev, phone: e.target.value, submitError: null }))}
                placeholder="+2547..."
              />
            </div>
            <div className="grid gap-2">
              <label className="text-sm font-medium">National ID</label>
              <Input
                value={addDialog.idNumber}
                onChange={(e) => setAddDialog((prev) => ({ ...prev, idNumber: e.target.value, submitError: null }))}
                placeholder="12345678"
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

          {addDialog.submitError && (
            <div className="mt-4 flex gap-2 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-950">
              <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-red-700" />
              <p>{addDialog.submitError}</p>
            </div>
          )}

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
