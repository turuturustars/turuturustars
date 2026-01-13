import { useEffect, useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface MonthlyData {
  month: string;
  amount: number;
  count: number;
  formattedMonth: string;
}

interface ContributionStats {
  totalAmount: number;
  averageMonthly: number;
  trend: 'up' | 'down' | 'stable';
  lastMonthAmount: number;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: { value: number; payload: MonthlyData }[];
  label?: string;
}

// Move tooltip out of main component
const CustomTooltip = ({ active, payload, label }: CustomTooltipProps) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-card border border-border rounded-lg shadow-lg p-3">
        <p className="font-semibold text-sm">{label}</p>
        <p className="text-primary font-medium">
          Amount: {new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES', minimumFractionDigits: 0 }).format(payload[0].value)}
        </p>
        <p className="text-muted-foreground text-sm">
          Contributions: {payload[0].payload.count}
        </p>
      </div>
    );
  }
  return null;
};

const ContributionChart = () => {
  const { profile } = useAuth();
  const [data, setData] = useState<MonthlyData[]>([]);
  const [stats, setStats] = useState<ContributionStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const generateLastMonths = useCallback((months: number = 6): string[] => {
    const monthsArray: string[] = [];
    const now = new Date();

    for (let i = months - 1; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      monthsArray.push(date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' }));
    }

    return monthsArray;
  }, []);

  const calculateStats = useCallback((chartData: MonthlyData[]): ContributionStats => {
    const validData = chartData.filter(d => d.amount > 0);
    const totalAmount = validData.reduce((sum, item) => sum + item.amount, 0);
    const averageMonthly = validData.length > 0 ? totalAmount / validData.length : 0;

    const lastTwoMonths = validData.slice(-2);
    let trend: 'up' | 'down' | 'stable' = 'stable';
    if (lastTwoMonths.length === 2) {
      const [prevMonth, lastMonth] = lastTwoMonths;
      trend = lastMonth.amount > prevMonth.amount ? 'up' : lastMonth.amount < prevMonth.amount ? 'down' : 'stable';
    }

    return {
      totalAmount,
      averageMonthly,
      trend,
      lastMonthAmount: validData.at(-1)?.amount ?? 0,
    };
  }, []);

  const fetchContributionData = useCallback(async () => {
    if (!profile?.id) return;

    setIsLoading(true);
    setError(null);

    try {
      const { data: contributions, error: fetchError } = await supabase
        .from('contributions')
        .select('amount, paid_at, status')
        .eq('member_id', profile.id)
        .eq('status', 'paid')
        .order('paid_at', { ascending: true });

      if (fetchError) throw fetchError;

      const last6Months = generateLastMonths(6);
      const monthlyMap = new Map<string, { amount: number; count: number }>();
      last6Months.forEach(month => monthlyMap.set(month, { amount: 0, count: 0 }));

      contributions?.forEach(contribution => {
        if (contribution.paid_at) {
          const monthKey = new Date(contribution.paid_at).toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
          if (monthlyMap.has(monthKey)) {
            const current = monthlyMap.get(monthKey)!;
            monthlyMap.set(monthKey, { amount: current.amount + Number(contribution.amount), count: current.count + 1 });
          }
        }
      });

      const chartData = Array.from(monthlyMap.entries()).map(([month, values]) => ({
        month,
        amount: values.amount,
        count: values.count,
        formattedMonth: month,
      }));

      setData(chartData);
      setStats(calculateStats(chartData));
    } catch (err) {
      console.error('Error fetching contribution data:', err);
      setError('Failed to load contribution data. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [profile?.id, generateLastMonths, calculateStats]);

  useEffect(() => {
    fetchContributionData();

    let timeoutId: NodeJS.Timeout;
    const channel = supabase
      .channel(`contribution-updates-${profile?.id}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'contributions', filter: `member_id=eq.${profile?.id}` },
        payload => {
          clearTimeout(timeoutId);
          timeoutId = setTimeout(() => {
            if (payload.new?.status === 'paid') fetchContributionData();
          }, 500);
        }
      )
      .subscribe();

    return () => {
      clearTimeout(timeoutId);
      supabase.removeChannel(channel);
    };
  }, [fetchContributionData, profile?.id]);

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Contribution History</CardTitle>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="space-y-2">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-64" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[250px] w-full" />
        </CardContent>
      </Card>
    );
  }

  const hasData = data.some(item => item.amount > 0);

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-xl">Contribution History</CardTitle>
            <CardDescription>Your contributions over the last 6 months</CardDescription>
          </div>
          {stats && hasData && (
            <div className="flex items-center space-x-2">
              {stats.trend === 'up' && <TrendingUp className="w-5 h-5 text-green-500" />}
              {stats.trend === 'down' && <TrendingDown className="w-5 h-5 text-red-500" />}
              <span className="text-sm font-medium text-muted-foreground">
                {new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES', minimumFractionDigits: 0 }).format(stats.lastMonthAmount)} last month
              </span>
            </div>
          )}
        </div>

        {stats && hasData && (
          <div className="grid grid-cols-3 gap-4 pt-4">
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Total (6 months)</p>
              <p className="text-xl font-semibold">
                {new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES', minimumFractionDigits: 0 }).format(stats.totalAmount)}
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Average Monthly</p>
              <p className="text-xl font-semibold">
                {new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES', minimumFractionDigits: 0 }).format(stats.averageMonthly)}
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Total Contributions</p>
              <p className="text-xl font-semibold">{data.reduce((sum, item) => sum + item.count, 0)}</p>
            </div>
          </div>
        )}
      </CardHeader>

      <CardContent>
        <div className="h-[300px]">
          {hasData ? (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 20 }}>
                <defs>
                  <linearGradient id="gradientAmount" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0.05} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis
                  dataKey="month"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
                  padding={{ left: 10, right: 10 }}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
                  tickFormatter={value => (value >= 1000 ? `${(value / 1000).toFixed(0)}k` : value.toString())}
                  width={40}
                />
                <Tooltip content={<CustomTooltip />} />
                <Area
                  type="monotone"
                  dataKey="amount"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                  fill="url(#gradientAmount)"
                  activeDot={{ r: 6, strokeWidth: 2, stroke: 'hsl(var(--background))', fill: 'hsl(var(--primary))' }}
                  isAnimationActive
                  animationDuration={800}
                  animationEasing="ease-in-out"
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center p-8">
              <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
                <TrendingUp className="w-8 h-8 text-muted-foreground" />
              </div>
              <h3 className="font-semibold text-lg mb-2">No Contributions Yet</h3>
              <p className="text-muted-foreground text-sm">
                Your contribution history will appear here once you make your first payment.
              </p>
            </div>
          )}
        </div>

        {hasData && (
          <div className="mt-4 pt-4 border-t border-border text-center">
            <p className="text-sm text-muted-foreground">
              View detailed statements in your contribution history page
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ContributionChart;
