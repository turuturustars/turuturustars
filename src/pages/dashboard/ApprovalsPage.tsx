import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AccessibleButton } from '@/components/accessible/AccessibleButton';
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
import { AccessibleStatus, useStatus } from '@/components/accessible';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
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
  registration_fee_paid: boolean;
  is_student: boolean;
  joined_at: string;
}

interface MemberRegistration {
  id: string;
  full_name: string;
  email: string;
  phone: string;
  location: string;
  occupation: string | null;
  message: string | null;
  created_at: string;
}

const ApprovalsPage = () => {
  const [pendingMembers, setPendingMembers] = useState<PendingMember[]>([]);
  const [registrations, setRegistrations] = useState<MemberRegistration[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedMember, setSelectedMember] = useState<PendingMember | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const { toast } = useToast();
  const { status, showSuccess } = useStatus();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [membersRes, registrationsRes] = await Promise.all([
        supabase
          .from('profiles')
          .select('id, full_name, email, phone, joined_at, status')
          .eq('status', 'pending')
          .order('joined_at', { ascending: false }),
        supabase
          .from('members')
          .select('id, first_name, last_name, email, status, created_at')
          .order('created_at', { ascending: false }),
      ]);

      if (membersRes.error) throw membersRes.error;
      if (registrationsRes.error) throw registrationsRes.error;

      setPendingMembers(membersRes.data || []);
      setRegistrations(registrationsRes.data || []);
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

      // Create a notification for the rejected member
      await supabase.from('notifications').insert({
        user_id: selectedMember.id,
        type: 'membership_rejected',
        title: 'Membership Application Rejected',
        message: rejectReason || 'Your membership application has been rejected. Please contact the CBO for more information.',
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

  const deleteRegistration = async (registrationId: string) => {
    try {
      const { error } = await supabase
        .from('members')
        .delete()
        .eq('id', registrationId);

      if (error) throw error;

      setRegistrations((prev) => prev.filter((r) => r.id !== registrationId));

      toast({
        title: 'Deleted',
        description: 'Registration removed',
      });
    } catch (error) {
      console.error('Error deleting registration:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete registration',
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
      <AccessibleStatus 
        message={status.message} 
        type={status.type} 
        isVisible={status.isVisible} 
      />
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
                <p className="text-2xl font-bold">{registrations.length}</p>
                <p className="text-sm text-muted-foreground">Interest Registrations</p>
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
          <TabsTrigger value="registrations">
            Interest Forms ({registrations.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pending">
          <Card>
            <CardHeader>
              <CardTitle>Pending Member Approvals</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
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
                          {format(new Date(member.joined_at), 'MMM dd, yyyy')}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <AccessibleButton
                              size="sm"
                              ariaLabel={`Approve membership for ${member.full_name}`}
                              onClick={() => {
                                approveMember(member.id);
                                showSuccess(`${member.full_name} approved successfully`, 2000);
                              }}
                            >
                              <CheckCircle2 className="w-4 h-4 mr-1" />
                              Approve
                            </AccessibleButton>
                            <AccessibleButton
                              size="sm"
                              variant="destructive"
                              ariaLabel={`Reject membership for ${member.full_name}`}
                              onClick={() => {
                                setSelectedMember(member);
                                setShowRejectDialog(true);
                              }}
                            >
                              <XCircle className="w-4 h-4 mr-1" />
                              Reject
                            </AccessibleButton>
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

        <TabsContent value="registrations">
          <Card>
            <CardHeader>
              <CardTitle>Interest Registration Forms</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Contact</TableHead>
                      <TableHead>Location</TableHead>
                      <TableHead>Occupation</TableHead>
                      <TableHead>Message</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {registrations.map((reg) => (
                      <TableRow key={reg.id}>
                        <TableCell className="font-medium">{reg.full_name}</TableCell>
                        <TableCell>
                          <div className="text-sm">
                            <p>{reg.phone}</p>
                            <p className="text-muted-foreground">{reg.email}</p>
                          </div>
                        </TableCell>
                        <TableCell>{reg.location}</TableCell>
                        <TableCell>{reg.occupation || '-'}</TableCell>
                        <TableCell className="max-w-[200px] truncate">
                          {reg.message || '-'}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {format(new Date(reg.created_at), 'MMM dd, yyyy')}
                        </TableCell>
                        <TableCell>
                          <AccessibleButton
                            size="sm"
                            variant="destructive"
                            ariaLabel={`Delete registration for ${reg.full_name}`}
                            onClick={() => {
                              deleteRegistration(reg.id);
                              showSuccess(`Registration deleted`, 2000);
                            }}
                          >
                            <UserX className="w-4 h-4" />
                          </AccessibleButton>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                {registrations.length === 0 && (
                  <p className="text-center text-muted-foreground py-8">
                    No interest registrations found
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
            <AccessibleButton 
              variant="outline" 
              ariaLabel="Cancel rejection dialog"
              onClick={() => setShowRejectDialog(false)}
            >
              Cancel
            </AccessibleButton>
            <AccessibleButton 
              variant="destructive" 
              ariaLabel={`Confirm rejection of ${selectedMember?.full_name}'s application`}
              onClick={() => {
                rejectMember();
                showSuccess(`${selectedMember?.full_name} rejected`, 2000);
              }}
            >
              Reject Application
            </AccessibleButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ApprovalsPage;
