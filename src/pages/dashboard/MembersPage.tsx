import { useEffect, useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AccessibleButton } from '@/components/accessible/AccessibleButton';
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
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    memberId?: string;
    newStatus?: string;
  }>({ open: false });
  const { toast } = useToast();
  const { status, showSuccess } = useStatus();
  const pagination = usePaginationState(15);
  const debouncedSearchTerm = useDebounce(searchTerm, 300);

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
      <div>
        <h2 className="text-2xl font-serif font-bold text-foreground">Members Management</h2>
        <p className="text-muted-foreground">View and manage all CBO members</p>
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
              <div className="overflow-x-auto">
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
                          <Select
                            value={member.status}
                            onValueChange={(value) => handleStatusChange(member.id, value)}
                            disabled={updatingId === member.id}
                          >
                            <SelectTrigger className="w-[120px]">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="active">Activate</SelectItem>
                              <SelectItem value="pending">Pending</SelectItem>
                              <SelectItem value="dormant">Dormant</SelectItem>
                              <SelectItem value="suspended">Suspend</SelectItem>
                            </SelectContent>
                          </Select>
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