import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Search, Users, UserCheck, UserX, Loader2 } from 'lucide-react';

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
  const [filteredMembers, setFilteredMembers] = useState<Member[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const { toast } = useToast();

  useEffect(() => {
    fetchMembers();
  }, []);

  useEffect(() => {
    filterMembers();
  }, [members, searchTerm, statusFilter]);

  const fetchMembers = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('joined_at', { ascending: false });

      if (error) throw error;
      setMembers(data || []);
    } catch (error) {
      console.error('Error fetching members:', error);
      toast({
        title: 'Error',
        description: 'Failed to load members',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const filterMembers = () => {
    let filtered = members;

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
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

    setFilteredMembers(filtered);
  };

  const updateMemberStatus = async (memberId: string, newStatus: 'active' | 'dormant' | 'pending' | 'suspended') => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ status: newStatus })
        .eq('id', memberId);

      if (error) throw error;

      setMembers((prev) =>
        prev.map((m) =>
          m.id === memberId ? { ...m, status: newStatus as 'active' | 'dormant' | 'pending' | 'suspended' } : m
        )
      );

      toast({
        title: 'Success',
        description: 'Member status updated',
      });
    } catch (error) {
      console.error('Error updating status:', error);
      toast({
        title: 'Error',
        description: 'Failed to update member status',
        variant: 'destructive',
      });
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, string> = {
      active: 'bg-green-100 text-green-800',
      pending: 'bg-yellow-100 text-yellow-800',
      dormant: 'bg-red-100 text-red-800',
      suspended: 'bg-gray-100 text-gray-800',
    };
    return (
      <Badge className={variants[status] || variants.pending}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  const stats = {
    total: members.length,
    active: members.filter((m) => m.status === 'active').length,
    pending: members.filter((m) => m.status === 'pending').length,
    dormant: members.filter((m) => m.status === 'dormant').length,
  };

  return (
    <div className="space-y-6">
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
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="dormant">Dormant</SelectItem>
                <SelectItem value="suspended">Suspended</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Members Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Members ({filteredMembers.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : (
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
                  {filteredMembers.map((member) => (
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
                      <TableCell>{getStatusBadge(member.status)}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {new Date(member.joined_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <Select
                          value={member.status}
                          onValueChange={(value: 'active' | 'dormant' | 'pending' | 'suspended') => updateMemberStatus(member.id, value)}
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
              {filteredMembers.length === 0 && (
                <p className="text-center text-muted-foreground py-8">
                  No members found
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default MembersPage;