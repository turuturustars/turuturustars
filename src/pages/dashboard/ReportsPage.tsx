import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
  Users,
  DollarSign,
  HandHeart,
  TrendingUp,
  Download,
  FileText,
  Loader2,
  BarChart3,
  PieChart,
} from 'lucide-react';
import { format, subMonths, startOfMonth, endOfMonth } from 'date-fns';

interface ReportData {
  members: {
    total: number;
    active: number;
    pending: number;
    dormant: number;
    students: number;
    newThisMonth: number;
  };
  contributions: {
    total: number;
    paid: number;
    pending: number;
    missed: number;
    totalAmount: number;
    paidAmount: number;
    byType: Record<string, { count: number; amount: number }>;
  };
  welfare: {
    totalCases: number;
    activeCases: number;
    closedCases: number;
    targetAmount: number;
    collectedAmount: number;
  };
}

const ReportsPage = () => {
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [reportPeriod, setReportPeriod] = useState('all');
  const { toast } = useToast();

  useEffect(() => {
    fetchReportData();
  }, [reportPeriod]);

  const getDateRange = () => {
    const now = new Date();
    switch (reportPeriod) {
      case 'month':
        return { start: startOfMonth(now), end: endOfMonth(now) };
      case '3months':
        return { start: startOfMonth(subMonths(now, 2)), end: endOfMonth(now) };
      case '6months':
        return { start: startOfMonth(subMonths(now, 5)), end: endOfMonth(now) };
      case 'year':
        return { start: startOfMonth(subMonths(now, 11)), end: endOfMonth(now) };
      default:
        return null;
    }
  };

  const fetchReportData = async () => {
    setIsLoading(true);
    try {
      const dateRange = getDateRange();
      
      let membersQuery = supabase.from('profiles').select('*');
      let contributionsQuery = supabase.from('contributions').select('*');
      let welfareQuery = supabase.from('welfare_cases').select('*');

      if (dateRange) {
        membersQuery = membersQuery
          .gte('joined_at', dateRange.start.toISOString())
          .lte('joined_at', dateRange.end.toISOString());
        contributionsQuery = contributionsQuery
          .gte('created_at', dateRange.start.toISOString())
          .lte('created_at', dateRange.end.toISOString());
        welfareQuery = welfareQuery
          .gte('created_at', dateRange.start.toISOString())
          .lte('created_at', dateRange.end.toISOString());
      }

      const [membersRes, contributionsRes, welfareRes, allMembersRes] = await Promise.all([
        membersQuery,
        contributionsQuery,
        welfareQuery,
        supabase.from('profiles').select('*'), // Get all members for total count
      ]);

      if (membersRes.error) throw membersRes.error;
      if (contributionsRes.error) throw contributionsRes.error;
      if (welfareRes.error) throw welfareRes.error;

      const members = dateRange ? membersRes.data || [] : allMembersRes.data || [];
      const allMembers = allMembersRes.data || [];
      const contributions = contributionsRes.data || [];
      const welfare = welfareRes.data || [];

      // Calculate contribution types
      const byType: Record<string, { count: number; amount: number }> = {};
      contributions.forEach((c) => {
        if (!byType[c.contribution_type]) {
          byType[c.contribution_type] = { count: 0, amount: 0 };
        }
        byType[c.contribution_type].count++;
        byType[c.contribution_type].amount += c.amount;
      });

      setReportData({
        members: {
          total: allMembers.length,
          active: allMembers.filter((m) => m.status === 'active').length,
          pending: allMembers.filter((m) => m.status === 'pending').length,
          dormant: allMembers.filter((m) => m.status === 'dormant').length,
          students: allMembers.filter((m) => m.is_student).length,
          newThisMonth: members.length,
        },
        contributions: {
          total: contributions.length,
          paid: contributions.filter((c) => c.status === 'paid').length,
          pending: contributions.filter((c) => c.status === 'pending').length,
          missed: contributions.filter((c) => c.status === 'missed').length,
          totalAmount: contributions.reduce((sum, c) => sum + c.amount, 0),
          paidAmount: contributions
            .filter((c) => c.status === 'paid')
            .reduce((sum, c) => sum + c.amount, 0),
          byType,
        },
        welfare: {
          totalCases: welfare.length,
          activeCases: welfare.filter((w) => w.status === 'active').length,
          closedCases: welfare.filter((w) => w.status === 'closed').length,
          targetAmount: welfare.reduce((sum, w) => sum + (w.target_amount || 0), 0),
          collectedAmount: welfare.reduce((sum, w) => sum + (w.collected_amount || 0), 0),
        },
      });
    } catch (error) {
      console.error('Error fetching report data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load report data',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const exportReport = (type: string) => {
    if (!reportData) return;

    let content = '';
    const date = format(new Date(), 'yyyy-MM-dd');

    if (type === 'members') {
      content = `Turuturu Stars CBO - Members Report (${date})\n\n`;
      content += `Total Members: ${reportData.members.total}\n`;
      content += `Active Members: ${reportData.members.active}\n`;
      content += `Pending Approval: ${reportData.members.pending}\n`;
      content += `Dormant Members: ${reportData.members.dormant}\n`;
      content += `Student Members: ${reportData.members.students}\n`;
      content += `New This Period: ${reportData.members.newThisMonth}\n`;
    } else if (type === 'contributions') {
      content = `Turuturu Stars CBO - Contributions Report (${date})\n\n`;
      content += `Total Contributions: ${reportData.contributions.total}\n`;
      content += `Verified Payments: ${reportData.contributions.paid}\n`;
      content += `Pending Verification: ${reportData.contributions.pending}\n`;
      content += `Missed Payments: ${reportData.contributions.missed}\n`;
      content += `Total Amount: KSh ${reportData.contributions.totalAmount.toLocaleString()}\n`;
      content += `Amount Collected: KSh ${reportData.contributions.paidAmount.toLocaleString()}\n\n`;
      content += `By Type:\n`;
      Object.entries(reportData.contributions.byType).forEach(([type, data]) => {
        content += `  ${type}: ${data.count} contributions, KSh ${data.amount.toLocaleString()}\n`;
      });
    } else if (type === 'welfare') {
      content = `Turuturu Stars CBO - Welfare Report (${date})\n\n`;
      content += `Total Cases: ${reportData.welfare.totalCases}\n`;
      content += `Active Cases: ${reportData.welfare.activeCases}\n`;
      content += `Closed Cases: ${reportData.welfare.closedCases}\n`;
      content += `Target Amount: KSh ${reportData.welfare.targetAmount.toLocaleString()}\n`;
      content += `Collected Amount: KSh ${reportData.welfare.collectedAmount.toLocaleString()}\n`;
    }

    const blob = new Blob([content], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `turuturu-${type}-report-${date}.txt`;
    a.click();
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!reportData) return null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-serif font-bold text-foreground">Reports & Analytics</h2>
          <p className="text-muted-foreground">Comprehensive CBO reports and statistics</p>
        </div>
        <Select value={reportPeriod} onValueChange={setReportPeriod}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Report Period" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Time</SelectItem>
            <SelectItem value="month">This Month</SelectItem>
            <SelectItem value="3months">Last 3 Months</SelectItem>
            <SelectItem value="6months">Last 6 Months</SelectItem>
            <SelectItem value="year">Last Year</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Users className="w-8 h-8 text-primary" />
              <div>
                <p className="text-2xl font-bold">{reportData.members.total}</p>
                <p className="text-sm text-muted-foreground">Total Members</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <DollarSign className="w-8 h-8 text-green-600" />
              <div>
                <p className="text-2xl font-bold">
                  KSh {(reportData.contributions.paidAmount / 1000).toFixed(0)}K
                </p>
                <p className="text-sm text-muted-foreground">Collected</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <HandHeart className="w-8 h-8 text-blue-600" />
              <div>
                <p className="text-2xl font-bold">{reportData.welfare.activeCases}</p>
                <p className="text-sm text-muted-foreground">Active Cases</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <TrendingUp className="w-8 h-8 text-yellow-600" />
              <div>
                <p className="text-2xl font-bold">{reportData.members.newThisMonth}</p>
                <p className="text-sm text-muted-foreground">New Members</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="members" className="space-y-4">
        <TabsList>
          <TabsTrigger value="members">Members Report</TabsTrigger>
          <TabsTrigger value="contributions">Contributions Report</TabsTrigger>
          <TabsTrigger value="welfare">Welfare Report</TabsTrigger>
        </TabsList>

        <TabsContent value="members">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5" />
                Members Report
              </CardTitle>
              <Button variant="outline" onClick={() => exportReport('members')}>
                <Download className="w-4 h-4 mr-2" />
                Export
              </Button>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h4 className="font-semibold flex items-center gap-2">
                    <BarChart3 className="w-4 h-4" />
                    Membership Statistics
                  </h4>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center py-2 border-b">
                      <span className="text-muted-foreground">Total Members</span>
                      <span className="font-semibold">{reportData.members.total}</span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b">
                      <span className="text-muted-foreground">Active Members</span>
                      <span className="font-semibold text-green-600">
                        {reportData.members.active}
                      </span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b">
                      <span className="text-muted-foreground">Pending Approval</span>
                      <span className="font-semibold text-yellow-600">
                        {reportData.members.pending}
                      </span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b">
                      <span className="text-muted-foreground">Dormant Members</span>
                      <span className="font-semibold text-red-600">
                        {reportData.members.dormant}
                      </span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b">
                      <span className="text-muted-foreground">Student Members</span>
                      <span className="font-semibold">{reportData.members.students}</span>
                    </div>
                  </div>
                </div>
                <div className="space-y-4">
                  <h4 className="font-semibold flex items-center gap-2">
                    <PieChart className="w-4 h-4" />
                    Membership Distribution
                  </h4>
                  <div className="space-y-3">
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Active</span>
                        <span>
                          {((reportData.members.active / reportData.members.total) * 100).toFixed(1)}%
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-3">
                        <div
                          className="bg-green-500 h-3 rounded-full"
                          style={{
                            width: `${(reportData.members.active / reportData.members.total) * 100}%`,
                          }}
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Pending</span>
                        <span>
                          {((reportData.members.pending / reportData.members.total) * 100).toFixed(1)}%
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-3">
                        <div
                          className="bg-yellow-500 h-3 rounded-full"
                          style={{
                            width: `${(reportData.members.pending / reportData.members.total) * 100}%`,
                          }}
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Dormant</span>
                        <span>
                          {((reportData.members.dormant / reportData.members.total) * 100).toFixed(1)}%
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-3">
                        <div
                          className="bg-red-500 h-3 rounded-full"
                          style={{
                            width: `${(reportData.members.dormant / reportData.members.total) * 100}%`,
                          }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="contributions">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="w-5 h-5" />
                Contributions Report
              </CardTitle>
              <Button variant="outline" onClick={() => exportReport('contributions')}>
                <Download className="w-4 h-4 mr-2" />
                Export
              </Button>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h4 className="font-semibold">Financial Summary</h4>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center py-2 border-b">
                      <span className="text-muted-foreground">Total Contributions</span>
                      <span className="font-semibold">{reportData.contributions.total}</span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b">
                      <span className="text-muted-foreground">Verified Payments</span>
                      <span className="font-semibold text-green-600">
                        {reportData.contributions.paid}
                      </span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b">
                      <span className="text-muted-foreground">Pending Verification</span>
                      <span className="font-semibold text-yellow-600">
                        {reportData.contributions.pending}
                      </span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b">
                      <span className="text-muted-foreground">Missed Payments</span>
                      <span className="font-semibold text-red-600">
                        {reportData.contributions.missed}
                      </span>
                    </div>
                    <div className="flex justify-between items-center py-2 bg-primary/10 px-3 rounded">
                      <span className="font-medium">Total Collected</span>
                      <span className="font-bold text-primary">
                        KSh {reportData.contributions.paidAmount.toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="space-y-4">
                  <h4 className="font-semibold">By Contribution Type</h4>
                  <div className="space-y-3">
                    {Object.entries(reportData.contributions.byType).map(([type, data]) => (
                      <div key={type} className="flex justify-between items-center py-2 border-b">
                        <div>
                          <p className="font-medium">{type}</p>
                          <p className="text-xs text-muted-foreground">{data.count} contributions</p>
                        </div>
                        <span className="font-semibold">KSh {data.amount.toLocaleString()}</span>
                      </div>
                    ))}
                    {Object.keys(reportData.contributions.byType).length === 0 && (
                      <p className="text-muted-foreground text-center py-4">
                        No contribution data available
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="welfare">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <HandHeart className="w-5 h-5" />
                Welfare Report
              </CardTitle>
              <Button variant="outline" onClick={() => exportReport('welfare')}>
                <Download className="w-4 h-4 mr-2" />
                Export
              </Button>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h4 className="font-semibold">Case Summary</h4>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center py-2 border-b">
                      <span className="text-muted-foreground">Total Welfare Cases</span>
                      <span className="font-semibold">{reportData.welfare.totalCases}</span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b">
                      <span className="text-muted-foreground">Active Cases</span>
                      <span className="font-semibold text-green-600">
                        {reportData.welfare.activeCases}
                      </span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b">
                      <span className="text-muted-foreground">Closed Cases</span>
                      <span className="font-semibold">{reportData.welfare.closedCases}</span>
                    </div>
                  </div>
                </div>
                <div className="space-y-4">
                  <h4 className="font-semibold">Financial Summary</h4>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center py-2 border-b">
                      <span className="text-muted-foreground">Target Amount</span>
                      <span className="font-semibold">
                        KSh {reportData.welfare.targetAmount.toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b">
                      <span className="text-muted-foreground">Collected Amount</span>
                      <span className="font-semibold text-green-600">
                        KSh {reportData.welfare.collectedAmount.toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between items-center py-2 bg-primary/10 px-3 rounded">
                      <span className="font-medium">Collection Rate</span>
                      <span className="font-bold text-primary">
                        {reportData.welfare.targetAmount > 0
                          ? (
                              (reportData.welfare.collectedAmount / reportData.welfare.targetAmount) *
                              100
                            ).toFixed(1)
                          : 0}
                        %
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ReportsPage;
