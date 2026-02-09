import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { logAuditAction } from '@/lib/auditLogger';
import {
  UserCheck,
  UserX,
  Clock,
  CheckCircle2,
  XCircle,
  Loader2,
  Users,
} from 'lucide-react';
import { format } from 'date-fns';

interface PendingMember {
  id: string;
  full_name: string;
  email: string | null;
  phone: string;
  membership_number: string | null;
  status: string;
  registration_fee_paid: boolean | null;
  is_student: boolean | null;
  joined_at: string | null;
}

const ApprovalsPage = () => {
  const [pendingMembers, setPendingMembers] = useState<PendingMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedMember, setSelectedMember] = useState<PendingMember | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const { toast } = useToast();
  const { user, roles } = useAuth();
  const actorRole = roles?.[0]?.role || 'member';

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, email, phone, joined_at, status, membership_number, registration_fee_paid, is_student')
        .eq('status', 'pending')
        .order('joined_at', { ascending: false });

      if (error) throw error;

      setPendingMembers(data || []);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load pending approvals',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const approveMember = async (memberId: string) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ status: 'active' })
        .eq('id', memberId);

      if (error) throw error;

      setPendingMembers((prev) => prev.filter((m) => m.id !== memberId));

      logAuditAction({
        actionType: 'APPROVE_MEMBER',
        description: `Approved membership for ${memberId}`,
        entityType: 'profile',
        entityId: memberId,
        metadata: { actor_id: user?.id, actor_role: actorRole },
      });

      toast({
        title: 'Success',
        description: 'Member approved successfully',
      });
    } catch (error) {
      console.error('Error approving member:', error);
      toast({
        title: 'Error',
        description: 'Failed to approve member',
        variant: 'destructive',
      });
    }
  };

  const rejectMember = async () => {
    if (!selectedMember) return;

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ status: 'suspended' })
        .eq('id', selectedMember.id);

      if (error) throw error;

      await supabase.from('notifications').insert({
        user_id: selectedMember.id,
        type: 'membership_rejected',
        title: 'Membership Application Rejected',
        message: rejectReason || 'Your membership application has been rejected.',
      });

      logAuditAction({
        actionType: 'REJECT_MEMBER',
        description: `Rejected membership for ${selectedMember.id}`,
        entityType: 'profile',
        entityId: selectedMember.id,
        metadata: { actor_id: user?.id, actor_role: actorRole, reason: rejectReason },
      });

      setPendingMembers((prev) => prev.filter((m) => m.id !== selectedMember.id));
      setShowRejectDialog(false);
      setSelectedMember(null);
      setRejectReason('');

      toast({
        title: 'Member Rejected',
        description: 'Member has been rejected and notified',
      });
    } catch (error) {
      console.error('Error rejecting member:', error);
      toast({
        title: 'Error',
        description: 'Failed to reject member',
        variant: 'destructive',
      });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-serif font-bold text-foreground">Pending Approvals</h2>
        <p className="text-muted-foreground">Review and approve new member applications</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Clock className="w-8 h-8 text-yellow-600" />
              <div>
                <p className="text-2xl font-bold">{pendingMembers.length}</p>
                <p className="text-sm text-muted-foreground">Pending Approval</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Users className="w-8 h-8 text-blue-600" />
              <div>
                <p className="text-2xl font-bold">{pendingMembers.length}</p>
                <p className="text-sm text-muted-foreground">Applications</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <UserCheck className="w-8 h-8 text-green-600" />
              <div>
                <p className="text-2xl font-bold">
                  {pendingMembers.filter((m) => m.registration_fee_paid).length}
                </p>
                <p className="text-sm text-muted-foreground">Fee Paid</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="pending" className="space-y-4">
        <TabsList>
          <TabsTrigger value="pending">
            Pending Members ({pendingMembers.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pending">
          <Card>
            <CardHeader>
              <CardTitle>Pending Member Approvals</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 lg:hidden">
                {pendingMembers.map((member) => (
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
                          <Badge
                            className={
                              member.registration_fee_paid
                                ? 'bg-green-100 text-green-800'
                                : 'bg-red-100 text-red-800'
                            }
                          >
                            {member.registration_fee_paid ? 'Paid' : 'Unpaid'}
                          </Badge>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3 text-xs">
                        <div>
                          <p className="text-muted-foreground">Membership #</p>
                          <p className="font-mono">{member.membership_number || '-'}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Joined</p>
                          <p>{member.joined_at ? format(new Date(member.joined_at), 'MMM dd, yyyy') : '-'}</p>
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

                      <div className="pt-2 border-t flex gap-2">
                        <Button
                          size="sm"
                          className="flex-1"
                          onClick={() => approveMember(member.id)}
                        >
                          <CheckCircle2 className="w-4 h-4 mr-1" />
                          Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          className="flex-1"
                          onClick={() => {
                            setSelectedMember(member);
                            setShowRejectDialog(true);
                          }}
                        >
                          <XCircle className="w-4 h-4 mr-1" />
                          Reject
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
                {pendingMembers.length === 0 && (
                  <p className="text-center text-muted-foreground py-8">
                    No pending approvals
                  </p>
                )}
              </div>

              <div className="hidden lg:block overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Member</TableHead>
                      <TableHead>Membership #</TableHead>
                      <TableHead>Contact</TableHead>
                      <TableHead>Fee Paid</TableHead>
                      <TableHead>Student</TableHead>
                      <TableHead>Joined</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pendingMembers.map((member) => (
                      <TableRow key={member.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-accent flex items-center justify-center">
                              <span className="text-sm font-medium">
                                {member.full_name.charAt(0)}
                              </span>
                            </div>
                            <p className="font-medium">{member.full_name}</p>
                          </div>
                        </TableCell>
                        <TableCell className="font-mono text-sm">
                          {member.membership_number || '-'}
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            <p>{member.phone}</p>
                            <p className="text-muted-foreground">{member.email}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge
                            className={
                              member.registration_fee_paid
                                ? 'bg-green-100 text-green-800'
                                : 'bg-red-100 text-red-800'
                            }
                          >
                            {member.registration_fee_paid ? 'Paid' : 'Unpaid'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {member.is_student ? (
                            <Badge variant="outline">Student</Badge>
                          ) : (
                            '-'
                          )}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {member.joined_at ? format(new Date(member.joined_at), 'MMM dd, yyyy') : '-'}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              onClick={() => approveMember(member.id)}
                            >
                              <CheckCircle2 className="w-4 h-4 mr-1" />
                              Approve
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => {
                                setSelectedMember(member);
                                setShowRejectDialog(true);
                              }}
                            >
                              <XCircle className="w-4 h-4 mr-1" />
                              Reject
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                {pendingMembers.length === 0 && (
                  <p className="text-center text-muted-foreground py-8">
                    No pending approvals
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Reject Dialog */}
      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Member Application</DialogTitle>
            <DialogDescription>
              Are you sure you want to reject {selectedMember?.full_name}'s membership
              application? Please provide a reason.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            placeholder="Reason for rejection (optional)..."
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
          />
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setShowRejectDialog(false)}
            >
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={rejectMember}
            >
              Reject Application
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ApprovalsPage;
