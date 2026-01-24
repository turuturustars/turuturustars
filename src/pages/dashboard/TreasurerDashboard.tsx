import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AccessibleButton } from '@/components/accessible/AccessibleButton';
import { AccessibleStatus, useStatus } from '@/components/accessible';
import { Badge } from '@/components/ui/badge';
import { StatusBadge } from '@/components/StatusBadge';
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  CheckCircle2,
  Clock,
  AlertCircle,
  Loader2,
  Download,
  FileText,
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
  member: {
    full_name: string;
    membership_number: string | null;
  } | null;
}

interface WelfareCase {
  id: string;
  title: string;
  case_type: string;
  target_amount: number | null;
  collected_amount: number | null;
  status: string;
  created_at: string;
}

const TreasurerDashboard = () => {
  const [contributions, setContributions] = useState<ContributionWithMember[]>([]);
  const [welfareCases, setWelfareCases] = useState<WelfareCase[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('pending');
  const { toast } = useToast();
  const { status: statusMessage, showSuccess } = useStatus();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [contributionsRes, welfareRes] = await Promise.all([
        supabase
          .from('contributions')
          .select(`
            id, amount, contribution_type, status, created_at, paid_at, reference_number, notes,
            member:profiles!contributions_member_id_fkey(full_name, membership_number)
          `)
          .order('created_at', { ascending: false }),
        supabase
          .from('welfare_cases')
          .select('id, title, case_type, target_amount, collected_amount, status, created_at')
          .order('created_at', { ascending: false }),
      ]);

      if (contributionsRes.error) throw contributionsRes.error;
      if (welfareRes.error) throw welfareRes.error;

      setContributions(contributionsRes.data || []);
      setWelfareCases(welfareRes.data || []);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load treasurer data',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const verifyContribution = async (contributionId: string) => {
    try {
      const { error } = await supabase
        .from('contributions')
        .update({ status: 'paid', paid_at: new Date().toISOString() })
        .eq('id', contributionId);

      if (error) throw error;

      setContributions((prev) =>
        prev.map((c) =>
          c.id === contributionId
            ? { ...c, status: 'paid' as const, paid_at: new Date().toISOString() }
            : c
        )
      );

      toast({
        title: 'Success',
        description: 'Contribution verified successfully',
      });
    } catch (error) {
      console.error('Error verifying contribution:', error);
      toast({
        title: 'Error',
        description: 'Failed to verify contribution',
        variant: 'destructive',
      });
    }
  };

  const markAsMissed = async (contributionId: string) => {
    try {
      const { error } = await supabase
        .from('contributions')
        .update({ status: 'missed' })
        .eq('id', contributionId);

      if (error) throw error;

      setContributions((prev) =>
        prev.map((c) =>
          c.id === contributionId ? { ...c, status: 'missed' as const } : c
        )
      );

      toast({
        title: 'Marked as Missed',
        description: 'Contribution marked as missed',
      });
    } catch (error) {
      console.error('Error marking contribution:', error);
      toast({
        title: 'Error',
        description: 'Failed to update contribution',
        variant: 'destructive',
      });
    }
  };

  const filteredContributions = contributions.filter((c) =>
    statusFilter === 'all' ? true : c.status === statusFilter
  );

  const stats = {
    totalCollected: contributions
      .filter((c) => c.status === 'paid')
      .reduce((sum, c) => sum + c.amount, 0),
    pendingAmount: contributions
      .filter((c) => c.status === 'pending')
      .reduce((sum, c) => sum + c.amount, 0),
    missedAmount: contributions
      .filter((c) => c.status === 'missed')
      .reduce((sum, c) => sum + c.amount, 0),
    welfareBalance: welfareCases.reduce(
      (sum, w) => sum + (w.collected_amount || 0),
      0
    ),
  };

  const exportReport = () => {
    const csvContent = [
      ['Member', 'Membership #', 'Amount', 'Type', 'Status', 'Date', 'Reference'].join(','),
      ...contributions.map((c) =>
        [
          c.member?.full_name || 'Unknown',
          c.member?.membership_number || '-',
          c.amount,
          c.contribution_type,
          c.status,
          format(new Date(c.created_at), 'yyyy-MM-dd'),
          c.reference_number || '-',
        ].join(',')
      ),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = globalThis.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `contributions-report-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
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
          <h2 className="text-2xl font-serif font-bold text-foreground">Treasurer Dashboard</h2>
          <p className="text-muted-foreground">Fund tracking, verification, and financial reports</p>
        </div>
        <AccessibleButton onClick={exportReport} variant="outline" ariaLabel="Export financial report">
          <Download className="w-4 h-4 mr-2" />
          Export Report
        </AccessibleButton>
      </div>

      {/* Financial Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-green-50 border-green-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <TrendingUp className="w-8 h-8 text-green-600" />
              <div>
                <p className="text-2xl font-bold text-green-700">
                  KSh {stats.totalCollected.toLocaleString()}
                </p>
                <p className="text-sm text-green-600">Total Collected</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-yellow-50 border-yellow-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Clock className="w-8 h-8 text-yellow-600" />
              <div>
                <p className="text-2xl font-bold text-yellow-700">
                  KSh {stats.pendingAmount.toLocaleString()}
                </p>
                <p className="text-sm text-yellow-600">Pending Verification</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-red-50 border-red-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <TrendingDown className="w-8 h-8 text-red-600" />
              <div>
                <p className="text-2xl font-bold text-red-700">
                  KSh {stats.missedAmount.toLocaleString()}
                </p>
                <p className="text-sm text-red-600">Missed Contributions</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <DollarSign className="w-8 h-8 text-blue-600" />
              <div>
                <p className="text-2xl font-bold text-blue-700">
                  KSh {stats.welfareBalance.toLocaleString()}
                </p>
                <p className="text-sm text-blue-600">Welfare Fund Balance</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="contributions" className="space-y-4">
        <TabsList>
          <TabsTrigger value="contributions">Contributions</TabsTrigger>
          <TabsTrigger value="welfare">Welfare Cases</TabsTrigger>
          <TabsTrigger value="summary">Financial Summary</TabsTrigger>
        </TabsList>

        <TabsContent value="contributions" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Contribution Verification</CardTitle>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[150px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="paid">Verified</SelectItem>
                    <SelectItem value="missed">Missed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Member</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Reference</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Actions</TableHead>
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
                        <TableCell>
                          <StatusBadge 
                            status={contribution.status}
                            icon={
                              contribution.status === 'paid' ? <CheckCircle2 className="w-3 h-3" /> :
                              contribution.status === 'pending' ? <Clock className="w-3 h-3" /> :
                              <AlertCircle className="w-3 h-3" />
                            }
                          />
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {format(new Date(contribution.created_at), 'MMM dd, yyyy')}
                        </TableCell>
                        <TableCell>
                          {contribution.status === 'pending' && (
                            <div className="flex gap-2">
                              <AccessibleButton
                                ariaLabel="Verify contribution"
                                onClick={() => verifyContribution(contribution.id)}
                              >
                                Verify
                              </AccessibleButton>
                              <AccessibleButton
                                variant="destructive"
                                ariaLabel="Mark contribution as missed"
                                onClick={() => markAsMissed(contribution.id)}
                              >
                                Missed
                              </AccessibleButton>
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                {filteredContributions.length === 0 && (
                  <p className="text-center text-muted-foreground py-8">
                    No contributions found
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="welfare" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Active Welfare Cases</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Case Title</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Target</TableHead>
                      <TableHead>Collected</TableHead>
                      <TableHead>Progress</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {welfareCases.map((welfareCase) => {
                      const progress = welfareCase.target_amount
                        ? ((welfareCase.collected_amount || 0) / welfareCase.target_amount) * 100
                        : 0;
                      return (
                        <TableRow key={welfareCase.id}>
                          <TableCell className="font-medium">{welfareCase.title}</TableCell>
                          <TableCell>{welfareCase.case_type}</TableCell>
                          <TableCell>
                            KSh {(welfareCase.target_amount || 0).toLocaleString()}
                          </TableCell>
                          <TableCell className="font-semibold text-green-600">
                            KSh {(welfareCase.collected_amount || 0).toLocaleString()}
                          </TableCell>
                          <TableCell>
                            <div className="w-24 bg-gray-200 rounded-full h-2">
                              <div
                                className="bg-primary h-2 rounded-full"
                                style={{ width: `${Math.min(progress, 100)}%` }}
                              />
                            </div>
                            <span className="text-xs text-muted-foreground">
                              {progress.toFixed(1)}%
                            </span>
                          </TableCell>
                          <TableCell>
                            <Badge
                              className={
                                welfareCase.status === 'active'
                                  ? 'bg-green-100 text-green-800'
                                  : 'bg-gray-100 text-gray-800'
                              }
                            >
                              {welfareCase.status}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
                {welfareCases.length === 0 && (
                  <p className="text-center text-muted-foreground py-8">
                    No welfare cases found
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="summary" className="space-y-4">
          <div className="grid md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  Contribution Summary
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center py-2 border-b">
                  <span className="text-muted-foreground">Total Contributions</span>
                  <span className="font-semibold">{contributions.length}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b">
                  <span className="text-muted-foreground">Verified Payments</span>
                  <span className="font-semibold text-green-600">
                    {contributions.filter((c) => c.status === 'paid').length}
                  </span>
                </div>
                <div className="flex justify-between items-center py-2 border-b">
                  <span className="text-muted-foreground">Pending Verification</span>
                  <span className="font-semibold text-yellow-600">
                    {contributions.filter((c) => c.status === 'pending').length}
                  </span>
                </div>
                <div className="flex justify-between items-center py-2 border-b">
                  <span className="text-muted-foreground">Missed Payments</span>
                  <span className="font-semibold text-red-600">
                    {contributions.filter((c) => c.status === 'missed').length}
                  </span>
                </div>
                <div className="flex justify-between items-center py-2 bg-primary/10 px-3 rounded">
                  <span className="font-medium">Total Amount Collected</span>
                  <span className="font-bold text-primary">
                    KSh {stats.totalCollected.toLocaleString()}
                  </span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="w-5 h-5" />
                  Welfare Fund Summary
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center py-2 border-b">
                  <span className="text-muted-foreground">Total Welfare Cases</span>
                  <span className="font-semibold">{welfareCases.length}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b">
                  <span className="text-muted-foreground">Active Cases</span>
                  <span className="font-semibold text-green-600">
                    {welfareCases.filter((w) => w.status === 'active').length}
                  </span>
                </div>
                <div className="flex justify-between items-center py-2 border-b">
                  <span className="text-muted-foreground">Closed Cases</span>
                  <span className="font-semibold">
                    {welfareCases.filter((w) => w.status === 'closed').length}
                  </span>
                </div>
                <div className="flex justify-between items-center py-2 border-b">
                  <span className="text-muted-foreground">Total Target Amount</span>
                  <span className="font-semibold">
                    KSh {welfareCases.reduce((sum, w) => sum + (w.target_amount || 0), 0).toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between items-center py-2 bg-primary/10 px-3 rounded">
                  <span className="font-medium">Total Collected</span>
                  <span className="font-bold text-primary">
                    KSh {stats.welfareBalance.toLocaleString()}
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default TreasurerDashboard;
