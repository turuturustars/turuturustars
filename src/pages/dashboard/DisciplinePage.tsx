
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertTriangle, Plus, DollarSign, CheckCircle, Clock, Loader2, Gavel } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

interface DisciplineRecord {
  id: string;
  member_id: string;
  incident_type: string;
  description: string;
  incident_date: string;
  fine_amount: number;
  fine_paid: boolean;
  paid_at: string | null;
  status: string;
  recorded_by: string;
  resolved_by: string | null;
  resolution_notes: string | null;
  created_at: string;
  member?: {
    full_name: string;
    membership_number: string | null;
  };
}

interface Profile {
  id: string;
  full_name: string;
  membership_number: string | null;
}

const INCIDENT_TYPES = [
  'Missed meeting',
  'Late contribution',
  'Misconduct at meeting',
  'Breach of constitution',
  'Disruptive behavior',
  'Unauthorized disclosure',
  'Other'
];

export default function DisciplinePage() {
  const { user, hasRole } = useAuth();
  const [records, setRecords] = useState<DisciplineRecord[]>([]);
  const [members, setMembers] = useState<Profile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showResolveDialog, setShowResolveDialog] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<DisciplineRecord | null>(null);
  const [resolutionNotes, setResolutionNotes] = useState('');

  const [newRecord, setNewRecord] = useState({
    member_id: '',
    incident_type: '',
    description: '',
    incident_date: '',
    fine_amount: 0
  });

  const canManage = hasRole('admin') || hasRole('organizing_secretary') || hasRole('chairperson');

  useEffect(() => {
    fetchRecords();
    if (canManage) {
      fetchMembers();
    }
  }, [canManage]);

  const fetchRecords = async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from('discipline_records')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      toast.error('Failed to fetch discipline records');
    } else {
      // Fetch member names separately
      const memberIds = [...new Set((data || []).map(r => r.member_id))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name, membership_number')
        .in('id', memberIds);
      
      const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);
      const recordsWithMembers = (data || []).map(r => ({
        ...r,
        member: profileMap.get(r.member_id) || { full_name: 'Unknown', membership_number: null }
      }));
      setRecords(recordsWithMembers as DisciplineRecord[]);
    }
    setIsLoading(false);
  };

  const fetchMembers = async () => {
    const { data } = await supabase
      .from('profiles')
      .select('id, full_name, membership_number')
      .eq('status', 'active');
    setMembers(data || []);
  };

  const createRecord = async () => {
    if (!newRecord.member_id || !newRecord.incident_type || !newRecord.description || !newRecord.incident_date) {
      toast.error('Please fill in all required fields');
      return;
    }

    const { error } = await supabase.from('discipline_records').insert({
      member_id: newRecord.member_id,
      incident_type: newRecord.incident_type,
      description: newRecord.description,
      incident_date: newRecord.incident_date,
      fine_amount: newRecord.fine_amount,
      recorded_by: user?.id
    });

    if (error) {
      toast.error('Failed to create record');
    } else {
      toast.success('Discipline record created');
      setShowCreateDialog(false);
      setNewRecord({ member_id: '', incident_type: '', description: '', incident_date: '', fine_amount: 0 });
      fetchRecords();
    }
  };

  const markFinePaid = async (recordId: string) => {
    const { error } = await supabase
      .from('discipline_records')
      .update({ fine_paid: true, paid_at: new Date().toISOString() })
      .eq('id', recordId);

    if (error) {
      toast.error('Failed to update payment status');
    } else {
      toast.success('Fine marked as paid');
      fetchRecords();
    }
  };

  const resolveRecord = async () => {
    if (!selectedRecord) return;

    const { error } = await supabase
      .from('discipline_records')
      .update({
        status: 'resolved',
        resolved_by: user?.id,
        resolution_notes: resolutionNotes
      })
      .eq('id', selectedRecord.id);

    if (error) {
      toast.error('Failed to resolve record');
    } else {
      toast.success('Record resolved');
      setShowResolveDialog(false);
      setSelectedRecord(null);
      setResolutionNotes('');
      fetchRecords();
    }
  };

  const dismissRecord = async (recordId: string) => {
    const { error } = await supabase
      .from('discipline_records')
      .update({ status: 'dismissed', resolved_by: user?.id })
      .eq('id', recordId);

    if (error) {
      toast.error('Failed to dismiss record');
    } else {
      toast.success('Record dismissed');
      fetchRecords();
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, string> = {
      pending: 'bg-yellow-100 text-yellow-800',
      resolved: 'bg-green-100 text-green-800',
      appealed: 'bg-blue-100 text-blue-800',
      dismissed: 'bg-gray-100 text-gray-800'
    };
    return <Badge className={variants[status] || 'bg-gray-100'}>{status}</Badge>;
  };

  const pendingRecords = records.filter(r => r.status === 'pending');
  const resolvedRecords = records.filter(r => r.status === 'resolved' || r.status === 'dismissed');
  const totalFines = records.filter(r => r.status !== 'dismissed').reduce((sum, r) => sum + Number(r.fine_amount), 0);
  const collectedFines = records.filter(r => r.fine_paid).reduce((sum, r) => sum + Number(r.fine_amount), 0);
  const pendingFines = totalFines - collectedFines;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Discipline & Fines</h1>
          <p className="text-muted-foreground">Manage misconduct records and penalty collection</p>
        </div>
        {canManage && (
          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogTrigger asChild>
              <Button><Plus className="h-4 w-4 mr-2" />Record Incident</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Record Discipline Incident</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <Select value={newRecord.member_id} onValueChange={(v) => setNewRecord({ ...newRecord, member_id: v })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select Member" />
                  </SelectTrigger>
                  <SelectContent>
                    {members.map(m => (
                      <SelectItem key={m.id} value={m.id}>
                        {m.full_name} ({m.membership_number || 'No #'})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={newRecord.incident_type} onValueChange={(v) => setNewRecord({ ...newRecord, incident_type: v })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Incident Type" />
                  </SelectTrigger>
                  <SelectContent>
                    {INCIDENT_TYPES.map(type => (
                      <SelectItem key={type} value={type}>{type}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input
                  type="date"
                  value={newRecord.incident_date}
                  onChange={(e) => setNewRecord({ ...newRecord, incident_date: e.target.value })}
                />
                <Textarea
                  placeholder="Description of incident"
                  value={newRecord.description}
                  onChange={(e) => setNewRecord({ ...newRecord, description: e.target.value })}
                />
                <div className="space-y-2">
                  <label className="text-sm font-medium">Fine Amount (KES)</label>
                  <Input
                    type="number"
                    placeholder="0"
                    value={newRecord.fine_amount}
                    onChange={(e) => setNewRecord({ ...newRecord, fine_amount: Number(e.target.value) })}
                  />
                </div>
                <Button onClick={createRecord} className="w-full">Record Incident</Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <AlertTriangle className="h-8 w-8 text-yellow-500" />
              <div>
                <p className="text-2xl font-bold">{pendingRecords.length}</p>
                <p className="text-sm text-muted-foreground">Pending Cases</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <CheckCircle className="h-8 w-8 text-green-500" />
              <div>
                <p className="text-2xl font-bold">{resolvedRecords.length}</p>
                <p className="text-sm text-muted-foreground">Resolved</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <DollarSign className="h-8 w-8 text-green-500" />
              <div>
                <p className="text-2xl font-bold">KES {collectedFines.toLocaleString()}</p>
                <p className="text-sm text-muted-foreground">Fines Collected</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <Clock className="h-8 w-8 text-orange-500" />
              <div>
                <p className="text-2xl font-bold">KES {pendingFines.toLocaleString()}</p>
                <p className="text-sm text-muted-foreground">Fines Pending</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="pending">
        <TabsList>
          <TabsTrigger value="pending">Pending Cases ({pendingRecords.length})</TabsTrigger>
          <TabsTrigger value="resolved">Resolved ({resolvedRecords.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="pending">
          <Card>
            <CardContent className="pt-6">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Member</TableHead>
                    <TableHead>Incident Type</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Fine</TableHead>
                    <TableHead>Fine Status</TableHead>
                    <TableHead>Status</TableHead>
                    {canManage && <TableHead>Actions</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pendingRecords.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-muted-foreground">
                        No pending cases
                      </TableCell>
                    </TableRow>
                  ) : (
                    pendingRecords.map(record => (
                      <TableRow key={record.id}>
                        <TableCell className="font-medium">{record.member?.full_name}</TableCell>
                        <TableCell>{record.incident_type}</TableCell>
                        <TableCell>{format(new Date(record.incident_date), 'PP')}</TableCell>
                        <TableCell>KES {Number(record.fine_amount).toLocaleString()}</TableCell>
                        <TableCell>
                          {record.fine_paid ? (
                            <Badge className="bg-green-100 text-green-800">Paid</Badge>
                          ) : record.fine_amount > 0 ? (
                            <Badge className="bg-red-100 text-red-800">Unpaid</Badge>
                          ) : (
                            <Badge className="bg-gray-100 text-gray-800">N/A</Badge>
                          )}
                        </TableCell>
                        <TableCell>{getStatusBadge(record.status)}</TableCell>
                        {canManage && (
                          <TableCell>
                            <div className="flex gap-2">
                              {!record.fine_paid && record.fine_amount > 0 && (
                                <Button variant="outline" size="sm" onClick={() => markFinePaid(record.id)}>
                                  Mark Paid
                                </Button>
                              )}
                              <Button variant="outline" size="sm" onClick={() => {
                                setSelectedRecord(record);
                                setShowResolveDialog(true);
                              }}>
                                Resolve
                              </Button>
                              <Button variant="ghost" size="sm" onClick={() => dismissRecord(record.id)}>
                                Dismiss
                              </Button>
                            </div>
                          </TableCell>
                        )}
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="resolved">
          <Card>
            <CardContent className="pt-6">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Member</TableHead>
                    <TableHead>Incident Type</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Fine</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Resolution</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {resolvedRecords.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground">
                        No resolved cases
                      </TableCell>
                    </TableRow>
                  ) : (
                    resolvedRecords.map(record => (
                      <TableRow key={record.id}>
                        <TableCell className="font-medium">{record.member?.full_name}</TableCell>
                        <TableCell>{record.incident_type}</TableCell>
                        <TableCell>{format(new Date(record.incident_date), 'PP')}</TableCell>
                        <TableCell>KES {Number(record.fine_amount).toLocaleString()}</TableCell>
                        <TableCell>{getStatusBadge(record.status)}</TableCell>
                        <TableCell className="max-w-xs truncate">{record.resolution_notes || '-'}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={showResolveDialog} onOpenChange={setShowResolveDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Resolve Case</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Resolving case for: <strong>{selectedRecord?.member?.full_name}</strong>
            </p>
            <Textarea
              placeholder="Resolution notes..."
              value={resolutionNotes}
              onChange={(e) => setResolutionNotes(e.target.value)}
            />
            <Button onClick={resolveRecord} className="w-full">Resolve Case</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
