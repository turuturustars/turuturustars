import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AccessibleButton } from '@/components/accessible/AccessibleButton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { AccessibleStatus, useStatus } from '@/components/accessible';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { enqueueBackgroundJob, shortJobId } from '@/lib/backgroundJobs';
import {
  Users,
  DollarSign,
  HandHeart,
  TrendingUp,
  Download,
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

type NumericValue = number | string | null | undefined;

interface ReportSummaryRpc {
  members?: {
    total?: NumericValue;
    active?: NumericValue;
    pending?: NumericValue;
    dormant?: NumericValue;
    students?: NumericValue;
    newThisMonth?: NumericValue;
  };
  contributions?: {
    total?: NumericValue;
    paid?: NumericValue;
    pending?: NumericValue;
    missed?: NumericValue;
    totalAmount?: NumericValue;
    paidAmount?: NumericValue;
    byType?: Record<string, { count?: NumericValue; amount?: NumericValue }>;
  };
  welfare?: {
    totalCases?: NumericValue;
    activeCases?: NumericValue;
    closedCases?: NumericValue;
    targetAmount?: NumericValue;
    collectedAmount?: NumericValue;
  };
}

const toNumber = (value: NumericValue): number => {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
};

const mapReportSummary = (summary: ReportSummaryRpc | null): ReportData => {
  const byType = Object.fromEntries(
    Object.entries(summary?.contributions?.byType || {}).map(([type, item]) => [
      type,
      {
        count: toNumber(item?.count),
        amount: toNumber(item?.amount),
      },
    ])
  );

  return {
    members: {
      total: toNumber(summary?.members?.total),
      active: toNumber(summary?.members?.active),
      pending: toNumber(summary?.members?.pending),
      dormant: toNumber(summary?.members?.dormant),
      students: toNumber(summary?.members?.students),
      newThisMonth: toNumber(summary?.members?.newThisMonth),
    },
    contributions: {
      total: toNumber(summary?.contributions?.total),
      paid: toNumber(summary?.contributions?.paid),
      pending: toNumber(summary?.contributions?.pending),
      missed: toNumber(summary?.contributions?.missed),
      totalAmount: toNumber(summary?.contributions?.totalAmount),
      paidAmount: toNumber(summary?.contributions?.paidAmount),
      byType,
    },
    welfare: {
      totalCases: toNumber(summary?.welfare?.totalCases),
      activeCases: toNumber(summary?.welfare?.activeCases),
      closedCases: toNumber(summary?.welfare?.closedCases),
      targetAmount: toNumber(summary?.welfare?.targetAmount),
      collectedAmount: toNumber(summary?.welfare?.collectedAmount),
    },
  };
};

const ReportsPage = () => {
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [reportPeriod, setReportPeriod] = useState('all');
  const { toast } = useToast();
  const { status, showSuccess } = useStatus();

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

      const { data, error } = await supabase.rpc('get_reports_summary' as never, {
        p_start: dateRange?.start.toISOString() ?? null,
        p_end: dateRange?.end.toISOString() ?? null,
      } as never);

      if (error) throw error;

      setReportData(mapReportSummary(data as ReportSummaryRpc | null));
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

  const exportReport = async (type: string) => {
    if (!reportData) return;

    const date = format(new Date(), 'yyyy-MM-dd');
    const dateRange = getDateRange();
    const jobId = await enqueueBackgroundJob({
      jobType: 'report_export',
      payload: {
        reportType: type,
        format: 'txt',
        period: reportPeriod,
        start: dateRange?.start.toISOString() ?? null,
        end: dateRange?.end.toISOString() ?? null,
        requestedAt: new Date().toISOString(),
      },
      priority: 7,
      dedupeKey: `report_export:${type}:${reportPeriod}:${date}`,
    });

    showSuccess(`${type} report queued. Job ${shortJobId(jobId)}`, 2500);
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
      <AccessibleStatus 
        message={status.message} 
        type={status.type} 
        isVisible={status.isVisible} 
      />
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
              <AccessibleButton variant="outline" ariaLabel="Queue members report export" onClick={() => void exportReport('members')}>
                <Download className="w-4 h-4 mr-2" />
                Export
              </AccessibleButton>
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
              <AccessibleButton variant="outline" ariaLabel="Queue contributions report export" onClick={() => void exportReport('contributions')}>
                <Download className="w-4 h-4 mr-2" />
                Export
              </AccessibleButton>
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
              <AccessibleButton variant="outline" ariaLabel="Queue welfare report export" onClick={() => void exportReport('welfare')}>
                <Download className="w-4 h-4 mr-2" />
                Export
              </AccessibleButton>
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
