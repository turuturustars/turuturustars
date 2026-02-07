import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AccessibleButton } from '@/components/accessible/AccessibleButton';
import { AccessibleStatus, useStatus } from '@/components/accessible';
import { Input } from '@/components/ui/input';
import { StatusBadge } from '@/components/StatusBadge';
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import {
  Search,
  DollarSign,
  Plus,
  Loader2,
  TrendingUp,
  Clock,
  AlertCircle,
} from 'lucide-react';
import { format } from 'date-fns';

interface ContributionWithMember {
  id: string;
  amount: number;
  contribution_type: string;
  status: 'paid' | 'pending' | 'missed';
  created_at: string;
  paid_at: string | null;
  reference_number: string | null;
  notes: string | null;
  due_date: string | null;
  member_id: string;
  member: {
    full_name: string;
    membership_number: string | null;
  } | null;
}

interface Member {
  id: string;
  full_name: string;
  membership_number: string | null;
}

interface WelfareCase {
  id: string;
  title: string;
}

const AllContributionsPage = () => {
  const [contributions, setContributions] = useState<ContributionWithMember[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [welfareCases, setWelfareCases] = useState<WelfareCase[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [showAddDialog, setShowAddDialog] = useState(false);
  const { toast } = useToast();
  const { status: statusMessage, showSuccess } = useStatus();

  // New contribution form
  const [newContribution, setNewContribution] = useState({
    member_id: '',
    amount: '',
    contribution_type: 'monthly',
    welfare_case_id: '',
    reference_number: '',
    notes: '',
    status: 'pending' as 'paid' | 'pending' | 'missed',
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [contributionsRes, membersRes, welfareRes] = await Promise.all([
        supabase
          .from('contributions')
          .select(`
            *,
            member:profiles!contributions_member_id_fkey(full_name, membership_number)
          `)
          .order('created_at', { ascending: false }),
        supabase
          .from('profiles')
          .select('id, full_name, membership_number')
          .eq('status', 'active'),
        supabase
          .from('welfare_cases')
          .select('id, title')
          .eq('status', 'active'),
      ]);

      if (contributionsRes.error) throw contributionsRes.error;
      if (membersRes.error) throw membersRes.error;
      if (welfareRes.error) throw welfareRes.error;

      setContributions(contributionsRes.data || []);
      setMembers(membersRes.data || []);
      setWelfareCases(welfareRes.data || []);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load contributions',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const addContribution = async () => {
    if (!newContribution.member_id || !newContribution.amount) {
      toast({
        title: 'Error',
        description: 'Please select a member and enter an amount',
        variant: 'destructive',
      });
      return;
    }

    try {
      const { data, error } = await supabase
        .from('contributions')
        .insert({
          member_id: newContribution.member_id,
          amount: parseFloat(newContribution.amount),
          contribution_type: newContribution.contribution_type,
          welfare_case_id: newContribution.welfare_case_id || null,
          reference_number: newContribution.reference_number || null,
          notes: newContribution.notes || null,
          status: newContribution.status,
          paid_at: newContribution.status === 'paid' ? new Date().toISOString() : null,
        })
        .select(`
          *,
          member:profiles!contributions_member_id_fkey(full_name, membership_number)
        `)
        .single();

      if (error) throw error;

      setContributions((prev) => [data, ...prev]);
      setShowAddDialog(false);
      setNewContribution({
        member_id: '',
        amount: '',
        contribution_type: 'monthly',
        welfare_case_id: '',
        reference_number: '',
        notes: '',
        status: 'pending',
      });

      showSuccess('Contribution added successfully', 5000);
    } catch (error) {
      console.error('Error adding contribution:', error);
      toast({
        title: 'Error',
        description: 'Failed to add contribution',
        variant: 'destructive',
      });
    }
  };

  const filteredContributions = contributions.filter((c) => {
    const matchesSearch =
      !searchTerm ||
      c.member?.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.member?.membership_number?.includes(searchTerm) ||
      c.reference_number?.includes(searchTerm);

    const matchesStatus = statusFilter === 'all' || c.status === statusFilter;
    const matchesType = typeFilter === 'all' || c.contribution_type === typeFilter;

    return matchesSearch && matchesStatus && matchesType;
  });

  const contributionTypes = [...new Set(contributions.map((c) => c.contribution_type))];

  const stats = {
    total: contributions.reduce((sum, c) => sum + c.amount, 0),
    paid: contributions.filter((c) => c.status === 'paid').reduce((sum, c) => sum + c.amount, 0),
    pending: contributions.filter((c) => c.status === 'pending').reduce((sum, c) => sum + c.amount, 0),
    missed: contributions.filter((c) => c.status === 'missed').reduce((sum, c) => sum + c.amount, 0),
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
      <AccessibleStatus message={statusMessage.message} type={statusMessage.type} isVisible={statusMessage.isVisible} />
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-serif font-bold text-foreground">All Contributions</h2>
          <p className="text-muted-foreground">Manage and track all member contributions</p>
        </div>
        <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
          <DialogTrigger asChild>
            <AccessibleButton ariaLabel="Open dialog to add new contribution">
              <Plus className="w-4 h-4 mr-2" />
              Add Contribution
            </AccessibleButton>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Add New Contribution</DialogTitle>
              <DialogDescription>
                Record a new contribution for a member
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Member *</Label>
                <Select
                  value={newContribution.member_id}
                  onValueChange={(value) =>
                    setNewContribution((prev) => ({ ...prev, member_id: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select member" />
                  </SelectTrigger>
                  <SelectContent>
                    {members.map((member) => (
                      <SelectItem key={member.id} value={member.id}>
                        {member.full_name} ({member.membership_number || 'No ID'})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Amount (KSh) *</Label>
                <Input
                  type="number"
                  placeholder="500"
                  value={newContribution.amount}
                  onChange={(e) =>
                    setNewContribution((prev) => ({ ...prev, amount: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Contribution Type</Label>
                <Select
                  value={newContribution.contribution_type}
                  onValueChange={(value) =>
                    setNewContribution((prev) => ({ ...prev, contribution_type: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="monthly">Monthly Contribution</SelectItem>
                    <SelectItem value="welfare">Welfare Contribution</SelectItem>
                    <SelectItem value="registration">Registration Fee</SelectItem>
                    <SelectItem value="special">Special Contribution</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {newContribution.contribution_type === 'welfare' && (
                <div className="space-y-2">
                  <Label>Welfare Case</Label>
                  <Select
                    value={newContribution.welfare_case_id}
                    onValueChange={(value) =>
                      setNewContribution((prev) => ({ ...prev, welfare_case_id: value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select welfare case" />
                    </SelectTrigger>
                    <SelectContent>
                      {welfareCases.map((wc) => (
                        <SelectItem key={wc.id} value={wc.id}>
                          {wc.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div className="space-y-2">
                <Label>Reference Number</Label>
                <Input
                  placeholder="Transaction reference, etc."
                  value={newContribution.reference_number}
                  onChange={(e) =>
                    setNewContribution((prev) => ({ ...prev, reference_number: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select
                  value={newContribution.status}
                  onValueChange={(value: 'paid' | 'pending' | 'missed') =>
                    setNewContribution((prev) => ({ ...prev, status: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pending Verification</SelectItem>
                    <SelectItem value="paid">Verified/Paid</SelectItem>
                    <SelectItem value="missed">Missed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Notes</Label>
                <Textarea
                  placeholder="Additional notes..."
                  value={newContribution.notes}
                  onChange={(e) =>
                    setNewContribution((prev) => ({ ...prev, notes: e.target.value }))
                  }
                />
              </div>
            </div>
            <DialogFooter>
              <AccessibleButton variant="outline" ariaLabel="Cancel adding contribution" onClick={() => setShowAddDialog(false)}>
                Cancel
              </AccessibleButton>
              <AccessibleButton ariaLabel="Submit new contribution" onClick={addContribution}>Add Contribution</AccessibleButton>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <DollarSign className="w-8 h-8 text-primary" />
              <div>
                <p className="text-2xl font-bold">KSh {stats.total.toLocaleString()}</p>
                <p className="text-sm text-muted-foreground">Total Amount</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <TrendingUp className="w-8 h-8 text-green-600" />
              <div>
                <p className="text-2xl font-bold">KSh {stats.paid.toLocaleString()}</p>
                <p className="text-sm text-muted-foreground">Verified</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Clock className="w-8 h-8 text-yellow-600" />
              <div>
                <p className="text-2xl font-bold">KSh {stats.pending.toLocaleString()}</p>
                <p className="text-sm text-muted-foreground">Pending</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <AlertCircle className="w-8 h-8 text-red-600" />
              <div>
                <p className="text-2xl font-bold">KSh {stats.missed.toLocaleString()}</p>
                <p className="text-sm text-muted-foreground">Missed</p>
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
                placeholder="Search by member, reference number..."
                className="pl-9"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="paid">Paid</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="missed">Missed</SelectItem>
              </SelectContent>
            </Select>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {contributionTypes.map((type) => (
                  <SelectItem key={type} value={type}>
                    {type}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Contributions Table */}
      <Card>
        <CardHeader>
          <CardTitle>Contributions ({filteredContributions.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 lg:hidden">
            {filteredContributions.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">No contributions found</p>
            ) : (
              filteredContributions.map((contribution) => (
                <Card key={contribution.id} className="border border-border/60">
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-semibold truncate">
                          {contribution.member?.full_name || 'Unknown'}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {contribution.member?.membership_number || '-'}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold">KSh {contribution.amount.toLocaleString()}</p>
                        <div className="mt-1">
                          <StatusBadge status={contribution.status} />
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div>
                        <p className="text-muted-foreground">Type</p>
                        <p className="capitalize">{contribution.contribution_type}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Date</p>
                        <p>{format(new Date(contribution.created_at), 'MMM dd, yyyy')}</p>
                      </div>
                      <div className="col-span-2">
                        <p className="text-muted-foreground">Reference</p>
                        <p className="font-mono truncate">{contribution.reference_number || '-'}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>

          <div className="hidden lg:block overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Member</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Reference</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredContributions.map((contribution) => (
                  <TableRow key={contribution.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{contribution.member?.full_name || 'Unknown'}</p>
                        <p className="text-xs text-muted-foreground">
                          {contribution.member?.membership_number || '-'}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell className="font-semibold">
                      KSh {contribution.amount.toLocaleString()}
                    </TableCell>
                    <TableCell>{contribution.contribution_type}</TableCell>
                    <TableCell className="font-mono text-sm">
                      {contribution.reference_number || '-'}
                    </TableCell>
                    <TableCell><StatusBadge status={contribution.status} /></TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {format(new Date(contribution.created_at), 'MMM dd, yyyy')}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {filteredContributions.length === 0 && (
              <p className="text-center text-muted-foreground py-8">No contributions found</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AllContributionsPage;
