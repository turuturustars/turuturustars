
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AccessibleButton } from '@/components/accessible/AccessibleButton';
import { AccessibleStatus, useStatus } from '@/components/accessible';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { StatusBadge } from '@/components/StatusBadge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { UserCog, Plus, Clock, CheckCircle, XCircle, Loader2, ArrowRight } from 'lucide-react';
import { format, isFuture, isPast, isWithinInterval } from 'date-fns';
import { toast } from 'sonner';

interface RoleHandover {
  id: string;
  original_user_id: string;
  acting_user_id: string;
  role: string;
  start_date: string;
  end_date: string | null;
  reason: string | null;
  status: string;
  created_by: string;
  created_at: string;
  original_user?: { full_name: string };
  acting_user?: { full_name: string };
}

interface Profile {
  id: string;
  full_name: string;
  membership_number: string | null;
}

interface UserRole {
  user_id: string;
  role: string;
  profiles?: { full_name: string };
}

const ROLE_LABELS: Record<string, string> = {
  admin: 'Admin',
  chairperson: 'Chairman',
  vice_chairman: 'Vice Chairman',
  secretary: 'Secretary',
  vice_secretary: 'Vice Secretary',
  treasurer: 'Treasurer',
  organizing_secretary: 'Organizing Secretary',
  coordinator: 'Coordinator',
  committee_member: 'Committee Member',
  patron: 'Patron',
  member: 'Member'
};

export default function RoleHandoverPage() {
  const { user, hasRole } = useAuth();
  const { status: statusMessage, showSuccess } = useStatus();
  const [handovers, setHandovers] = useState<RoleHandover[]>([]);
  const [officials, setOfficials] = useState<UserRole[]>([]);
  const [members, setMembers] = useState<Profile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);

  const [newHandover, setNewHandover] = useState({
    original_user_id: '',
    acting_user_id: '',
    role: '',
    start_date: '',
    end_date: '',
    reason: ''
  });

  const canManage = hasRole('admin') || hasRole('chairperson');

  useEffect(() => {
    fetchHandovers();
    if (canManage) {
      fetchOfficials();
      fetchMembers();
    }
  }, [canManage]);

  const fetchHandovers = async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from('role_handovers')
      .select('id, original_user_id, acting_user_id, role, start_date, end_date, reason, status, created_at')
      .order('created_at', { ascending: false });

    if (error) {
      toast.error('Failed to fetch handovers');
    } else if (data && data.length > 0) {
      const userIds = [...new Set([...data.map(h => h.original_user_id), ...data.map(h => h.acting_user_id)])];
      const { data: profiles } = await supabase.from('profiles').select('id, full_name').in('id', userIds);
      const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);
      
      const handoversWithUsers = data.map(h => ({
        ...h,
        original_user: profileMap.get(h.original_user_id) || { full_name: 'Unknown' },
        acting_user: profileMap.get(h.acting_user_id) || { full_name: 'Unknown' }
      }));
      setHandovers(handoversWithUsers as RoleHandover[]);
    } else {
      setHandovers([]);
    }
    setIsLoading(false);
  };

  const fetchOfficials = async () => {
    const { data: roles } = await supabase.from('user_roles').select('user_id, role').neq('role', 'member');
    if (roles && roles.length > 0) {
      const userIds = roles.map(r => r.user_id);
      const { data: profiles } = await supabase.from('profiles').select('id, full_name').in('id', userIds);
      const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);
      const officialsWithProfiles = roles.map(r => ({
        ...r,
        profiles: profileMap.get(r.user_id) || { full_name: 'Unknown' }
      }));
      setOfficials(officialsWithProfiles as UserRole[]);
    }
  };

  const fetchMembers = async () => {
    const { data } = await supabase.from('profiles').select('id, full_name, membership_number').eq('status', 'active');
    setMembers(data || []);
  };

  const createHandover = async () => {
    if (!newHandover.original_user_id || !newHandover.acting_user_id || !newHandover.role || !newHandover.start_date) {
      toast.error('Please fill in all required fields');
      return;
    }
    if (newHandover.original_user_id === newHandover.acting_user_id) {
      toast.error('Original and acting user cannot be the same');
      return;
    }
    const insertData: any = {
      original_user_id: newHandover.original_user_id,
      acting_user_id: newHandover.acting_user_id,
      role: newHandover.role,
      start_date: newHandover.start_date,
      created_by: user?.id
    };
    if (newHandover.end_date) insertData.end_date = newHandover.end_date;
    if (newHandover.reason) insertData.reason = newHandover.reason;

    const { error } = await supabase.from('role_handovers').insert(insertData);

    if (error) {
      toast.error('Failed to create handover');
    } else {
      toast.success('Role handover created successfully');
      setShowCreateDialog(false);
      setNewHandover({ original_user_id: '', acting_user_id: '', role: '', start_date: '', end_date: '', reason: '' });
      fetchHandovers();
    }
  };

  const completeHandover = async (handoverId: string) => {
    const { error } = await supabase
      .from('role_handovers')
      .update({ status: 'completed', end_date: new Date().toISOString() })
      .eq('id', handoverId);

    if (error) {
      toast.error('Failed to complete handover');
    } else {
      toast.success('Handover completed');
      fetchHandovers();
    }
  };

  const cancelHandover = async (handoverId: string) => {
    const { error } = await supabase
      .from('role_handovers')
      .update({ status: 'cancelled' })
      .eq('id', handoverId);

    if (error) {
      toast.error('Failed to cancel handover');
    } else {
      toast.success('Handover cancelled');
      fetchHandovers();
    }
  };

  const getStatusBadge = (handover: RoleHandover) => {
    if (handover.status === 'cancelled') {
      return <StatusBadge status="cancelled" />;
    }
    if (handover.status === 'completed') {
      return <StatusBadge status="active" />;
    }
    
    const now = new Date();
    const start = new Date(handover.start_date);
    const end = handover.end_date ? new Date(handover.end_date) : null;

    if (isFuture(start)) {
      return <StatusBadge status="pending" />;
    }
    if (end && isPast(end)) {
      return <StatusBadge status="closed" />;
    }
    if (!end || isWithinInterval(now, { start, end })) {
      return <StatusBadge status="active" />;
    }
    return <StatusBadge status="pending" />;
  };

  const activeHandovers = handovers.filter(h => {
    if (h.status !== 'active') return false;
    const now = new Date();
    const start = new Date(h.start_date);
    const end = h.end_date ? new Date(h.end_date) : null;
    return !isFuture(start) && (!end || !isPast(end));
  });

  const scheduledHandovers = handovers.filter(h => {
    if (h.status !== 'active') return false;
    return isFuture(new Date(h.start_date));
  });

  const completedHandovers = handovers.filter(h => 
    h.status === 'completed' || h.status === 'cancelled' || 
    (h.end_date && isPast(new Date(h.end_date)))
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <AccessibleStatus message={statusMessage.message} type={statusMessage.type} isVisible={statusMessage.isVisible} />
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Role Handovers</h1>
          <p className="text-muted-foreground">Manage acting appointments and temporary role assignments</p>
        </div>
        {canManage && (
          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogTrigger asChild>
                <AccessibleButton ariaLabel="Create new role handover"><Plus className="h-4 w-4 mr-2" />Create Handover</AccessibleButton>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create Role Handover</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Original Role Holder</label>
                  <Select value={newHandover.original_user_id} onValueChange={(v) => {
                    const official = officials.find(o => o.user_id === v);
                    setNewHandover({ 
                      ...newHandover, 
                      original_user_id: v,
                      role: official?.role || ''
                    });
                  }}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select Official" />
                    </SelectTrigger>
                    <SelectContent>
                      {officials.map(o => (
                        <SelectItem key={o.user_id} value={o.user_id}>
                          {o.profiles?.full_name} ({ROLE_LABELS[o.role] || o.role})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center justify-center">
                  <ArrowRight className="h-6 w-6 text-muted-foreground" />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Acting Appointment</label>
                  <Select value={newHandover.acting_user_id} onValueChange={(v) => setNewHandover({ ...newHandover, acting_user_id: v })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select Member" />
                    </SelectTrigger>
                    <SelectContent>
                      {members.filter(m => m.id !== newHandover.original_user_id).map(m => (
                        <SelectItem key={m.id} value={m.id}>
                          {m.full_name} ({m.membership_number || 'No #'})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {newHandover.role && (
                  <div className="p-3 bg-muted rounded-lg">
                    <p className="text-sm">Role being transferred: <strong>{ROLE_LABELS[newHandover.role] || newHandover.role}</strong></p>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Start Date</label>
                    <Input
                      type="datetime-local"
                      value={newHandover.start_date}
                      onChange={(e) => setNewHandover({ ...newHandover, start_date: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">End Date (Optional)</label>
                    <Input
                      type="datetime-local"
                      value={newHandover.end_date}
                      onChange={(e) => setNewHandover({ ...newHandover, end_date: e.target.value })}
                    />
                  </div>
                </div>

                <Textarea
                  placeholder="Reason for handover (e.g., travel, illness)"
                  value={newHandover.reason}
                  onChange={(e) => setNewHandover({ ...newHandover, reason: e.target.value })}
                />

                <AccessibleButton onClick={createHandover} className="w-full" ariaLabel="Submit role handover creation">Create Handover</AccessibleButton>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <UserCog className="h-8 w-8 text-green-500" />
              <div>
                <p className="text-2xl font-bold">{activeHandovers.length}</p>
                <p className="text-sm text-muted-foreground">Active Handovers</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <Clock className="h-8 w-8 text-blue-500" />
              <div>
                <p className="text-2xl font-bold">{scheduledHandovers.length}</p>
                <p className="text-sm text-muted-foreground">Scheduled</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <CheckCircle className="h-8 w-8 text-gray-500" />
              <div>
                <p className="text-2xl font-bold">{completedHandovers.length}</p>
                <p className="text-sm text-muted-foreground">Completed</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="active">
        <TabsList>
          <TabsTrigger value="active">Active ({activeHandovers.length})</TabsTrigger>
          <TabsTrigger value="scheduled">Scheduled ({scheduledHandovers.length})</TabsTrigger>
          <TabsTrigger value="history">History ({completedHandovers.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="active" className="space-y-4">
          {activeHandovers.length === 0 ? (
            <Card><CardContent className="pt-6 text-center text-muted-foreground">No active handovers</CardContent></Card>
          ) : (
            activeHandovers.map(handover => (
              <Card key={handover.id}>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="text-center">
                        <p className="font-medium">{handover.original_user?.full_name}</p>
                        <p className="text-sm text-muted-foreground">Original</p>
                      </div>
                      <ArrowRight className="h-6 w-6 text-muted-foreground" />
                      <div className="text-center">
                        <p className="font-medium">{handover.acting_user?.full_name}</p>
                        <p className="text-sm text-muted-foreground">Acting</p>
                      </div>
                      <Badge className="bg-primary/10 text-primary ml-4">
                        {ROLE_LABELS[handover.role] || handover.role}
                      </Badge>
                      {getStatusBadge(handover)}
                    </div>
                    {canManage && (
                      <div className="flex gap-2">
                        <AccessibleButton variant="outline" ariaLabel="Complete this handover" onClick={() => completeHandover(handover.id)}>
                          <CheckCircle className="h-4 w-4 mr-1" />Complete
                        </AccessibleButton>
                        <AccessibleButton variant="ghost" ariaLabel="Cancel this handover" onClick={() => cancelHandover(handover.id)}>
                          <XCircle className="h-4 w-4 mr-1" />Cancel
                        </AccessibleButton>
                      </div>
                    )}
                  </div>
                  <div className="mt-4 text-sm text-muted-foreground">
                    <p>Started: {format(new Date(handover.start_date), 'PPp')}</p>
                    {handover.end_date && <p>Ends: {format(new Date(handover.end_date), 'PPp')}</p>}
                    {handover.reason && <p className="mt-2">Reason: {handover.reason}</p>}
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="scheduled" className="space-y-4">
          {scheduledHandovers.length === 0 ? (
            <Card><CardContent className="pt-6 text-center text-muted-foreground">No scheduled handovers</CardContent></Card>
          ) : (
            scheduledHandovers.map(handover => (
              <Card key={handover.id}>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="text-center">
                        <p className="font-medium">{handover.original_user?.full_name}</p>
                        <p className="text-sm text-muted-foreground">Original</p>
                      </div>
                      <ArrowRight className="h-6 w-6 text-muted-foreground" />
                      <div className="text-center">
                        <p className="font-medium">{handover.acting_user?.full_name}</p>
                        <p className="text-sm text-muted-foreground">Acting</p>
                      </div>
                      <Badge className="bg-primary/10 text-primary ml-4">
                        {ROLE_LABELS[handover.role] || handover.role}
                      </Badge>
                      {getStatusBadge(handover)}
                    </div>
                    {canManage && (
                      <Button variant="ghost" size="sm" onClick={() => cancelHandover(handover.id)}>
                        <XCircle className="h-4 w-4 mr-1" />Cancel
                      </Button>
                    )}
                  </div>
                  <div className="mt-4 text-sm text-muted-foreground">
                    <p>Starts: {format(new Date(handover.start_date), 'PPp')}</p>
                    {handover.end_date && <p>Ends: {format(new Date(handover.end_date), 'PPp')}</p>}
                    {handover.reason && <p className="mt-2">Reason: {handover.reason}</p>}
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="history">
          <Card>
            <CardContent className="pt-6">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Original</TableHead>
                    <TableHead>Acting</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Period</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {completedHandovers.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground">
                        No handover history
                      </TableCell>
                    </TableRow>
                  ) : (
                    completedHandovers.map(handover => (
                      <TableRow key={handover.id}>
                        <TableCell>{handover.original_user?.full_name}</TableCell>
                        <TableCell>{handover.acting_user?.full_name}</TableCell>
                        <TableCell>{ROLE_LABELS[handover.role] || handover.role}</TableCell>
                        <TableCell>
                          {format(new Date(handover.start_date), 'PP')} - {handover.end_date ? format(new Date(handover.end_date), 'PP') : 'N/A'}
                        </TableCell>
                        <TableCell>{getStatusBadge(handover)}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
