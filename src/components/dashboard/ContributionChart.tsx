import { useEffect, useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { TrendingUp, TrendingDown, ArrowRight, Minus, DollarSign, Calendar, Activity } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { cn } from '@/lib/utils';

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
  percentageChange: number;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: { value: number; payload: MonthlyData }[];
  label?: string;
}

const CustomTooltip = ({ active, payload, label }: CustomTooltipProps) => {
  if (active && payload && payload.length) {
    return (
      <div className="relative bg-gradient-to-br from-card via-card to-card/95 border-2 border-primary/20 rounded-2xl shadow-2xl p-4 backdrop-blur-xl">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent rounded-2xl" />
        <div className="relative space-y-2">
          <p className="font-bold text-sm text-foreground/90 flex items-center gap-2">
            <Calendar className="w-3.5 h-3.5 text-primary" />
            {label}
          </p>
          <div className="space-y-1">
            <p className="text-primary font-bold text-lg flex items-center gap-2">
              <DollarSign className="w-4 h-4" />
              {new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES', minimumFractionDigits: 0 }).format(payload[0].value)}
            </p>
            <p className="text-muted-foreground text-xs flex items-center gap-2">
              <Activity className="w-3 h-3" />
              {payload[0].payload.count} contribution{payload[0].payload.count !== 1 ? 's' : ''}
            </p>
          </div>
        </div>
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
    let percentageChange = 0;
    
    if (lastTwoMonths.length === 2) {
      const [prevMonth, lastMonth] = lastTwoMonths;
      if (prevMonth.amount > 0) {
        percentageChange = ((lastMonth.amount - prevMonth.amount) / prevMonth.amount) * 100;
      }
      trend = lastMonth.amount > prevMonth.amount ? 'up' : lastMonth.amount < prevMonth.amount ? 'down' : 'stable';
    }

    return {
      totalAmount,
      averageMonthly,
      trend,
      lastMonthAmount: validData.at(-1)?.amount ?? 0,
      percentageChange,
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
      <Card className="border-destructive/50 bg-destructive/5">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Activity className="w-5 h-5" />
            Contribution History
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive" className="border-2">
            <AlertDescription className="text-sm">{error}</AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <Card className="overflow-hidden">
        <CardHeader className="space-y-3 pb-4">
          <div className="flex items-center justify-between">
            <div className="space-y-2 flex-1">
              <Skeleton className="h-7 w-52" />
              <Skeleton className="h-4 w-72" />
            </div>
            <Skeleton className="h-10 w-32 rounded-full" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4">
            <Skeleton className="h-20 rounded-xl" />
            <Skeleton className="h-20 rounded-xl" />
            <Skeleton className="h-20 rounded-xl" />
          </div>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[300px] w-full rounded-xl" />
        </CardContent>
      </Card>
    );
  }

  const hasData = data.some(item => item.amount > 0);

  return (
    <Card className="overflow-hidden border-border/50 bg-gradient-to-br from-card via-card to-card/95 shadow-lg hover:shadow-xl transition-all duration-300">
      <CardHeader className="pb-4 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div className="space-y-1.5">
            <CardTitle className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent flex items-center gap-2">
              <Activity className="w-6 h-6 text-primary" />
              Contribution History
            </CardTitle>
            <CardDescription className="text-sm sm:text-base">
              Track your contributions over the last 6 months
            </CardDescription>
          </div>
          
          {stats && hasData && (
            <div className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-full transition-all duration-300",
              "border-2 backdrop-blur-sm",
              stats.trend === 'up' && "bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400",
              stats.trend === 'down' && "bg-rose-500/10 border-rose-500/30 text-rose-600 dark:text-rose-400",
              stats.trend === 'stable' && "bg-amber-500/10 border-amber-500/30 text-amber-600 dark:text-amber-400"
            )}>
              {stats.trend === 'up' && <TrendingUp className="w-5 h-5" />}
              {stats.trend === 'down' && <TrendingDown className="w-5 h-5" />}
              {stats.trend === 'stable' && <Minus className="w-5 h-5" />}
              <div className="flex flex-col items-end">
                <span className="text-xs font-semibold whitespace-nowrap">
                  {new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES', minimumFractionDigits: 0 }).format(stats.lastMonthAmount)}
                </span>
                {stats.percentageChange !== 0 && (
                  <span className="text-[10px] font-medium opacity-80">
                    {stats.percentageChange > 0 ? '+' : ''}{stats.percentageChange.toFixed(1)}%
                  </span>
                )}
              </div>
            </div>
          )}
        </div>

        {stats && hasData && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 pt-2">
            <div className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary/10 via-primary/5 to-transparent p-4 border border-primary/20 hover:border-primary/40 transition-all duration-300 hover:shadow-lg hover:shadow-primary/10">
              <div className="absolute top-0 right-0 w-20 h-20 bg-primary/5 rounded-full blur-2xl" />
              <div className="relative space-y-2">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <DollarSign className="w-4 h-4" />
                  <p className="text-xs sm:text-sm font-medium">Total (6 months)</p>
                </div>
                <p className="text-xl sm:text-2xl font-bold text-foreground">
                  {new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES', minimumFractionDigits: 0 }).format(stats.totalAmount)}
                </p>
              </div>
            </div>

            <div className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-500/10 via-blue-500/5 to-transparent p-4 border border-blue-500/20 hover:border-blue-500/40 transition-all duration-300 hover:shadow-lg hover:shadow-blue-500/10">
              <div className="absolute top-0 right-0 w-20 h-20 bg-blue-500/5 rounded-full blur-2xl" />
              <div className="relative space-y-2">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <TrendingUp className="w-4 h-4" />
                  <p className="text-xs sm:text-sm font-medium">Average Monthly</p>
                </div>
                <p className="text-xl sm:text-2xl font-bold text-foreground">
                  {new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES', minimumFractionDigits: 0 }).format(stats.averageMonthly)}
                </p>
              </div>
            </div>

            <div className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-violet-500/10 via-violet-500/5 to-transparent p-4 border border-violet-500/20 hover:border-violet-500/40 transition-all duration-300 hover:shadow-lg hover:shadow-violet-500/10">
              <div className="absolute top-0 right-0 w-20 h-20 bg-violet-500/5 rounded-full blur-2xl" />
              <div className="relative space-y-2">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Activity className="w-4 h-4" />
                  <p className="text-xs sm:text-sm font-medium">Total Contributions</p>
                </div>
                <p className="text-xl sm:text-2xl font-bold text-foreground">
                  {data.reduce((sum, item) => sum + item.count, 0)}
                </p>
              </div>
            </div>
          </div>
        )}
      </CardHeader>

      <CardContent className="pb-6">
        <div className="h-[280px] sm:h-[320px] md:h-[350px] rounded-2xl overflow-hidden bg-gradient-to-br from-accent/30 to-transparent p-2 sm:p-4">
          {hasData ? (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <defs>
                  <linearGradient id="gradientAmount" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.5} />
                    <stop offset="50%" stopColor="hsl(var(--primary))" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0.05} />
                  </linearGradient>
                  <filter id="glow">
                    <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
                    <feMerge>
                      <feMergeNode in="coloredBlur"/>
                      <feMergeNode in="SourceGraphic"/>
                    </feMerge>
                  </filter>
                </defs>
                <CartesianGrid 
                  strokeDasharray="3 3" 
                  stroke="hsl(var(--border))" 
                  strokeOpacity={0.3}
                  vertical={false} 
                />
                <XAxis
                  dataKey="month"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                  padding={{ left: 20, right: 20 }}
                  height={40}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                  tickFormatter={value => (value >= 1000 ? `${(value / 1000).toFixed(0)}k` : value.toString())}
                  width={45}
                />
                <Tooltip content={<CustomTooltip />} cursor={{ stroke: 'hsl(var(--primary))', strokeWidth: 2, strokeDasharray: '5 5', strokeOpacity: 0.3 }} />
                <Area
                  type="monotone"
                  dataKey="amount"
                  stroke="hsl(var(--primary))"
                  strokeWidth={3}
                  fill="url(#gradientAmount)"
                  activeDot={{ 
                    r: 8, 
                    strokeWidth: 3, 
                    stroke: 'hsl(var(--background))', 
                    fill: 'hsl(var(--primary))',
                    filter: 'url(#glow)'
                  }}
                  dot={{ 
                    r: 4, 
                    strokeWidth: 2, 
                    stroke: 'hsl(var(--background))', 
                    fill: 'hsl(var(--primary))' 
                  }}
                  isAnimationActive
                  animationDuration={1000}
                  animationEasing="ease-out"
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 sm:p-8">
              <div className="relative mb-6">
                <div className="absolute inset-0 bg-primary/20 rounded-full blur-2xl" />
                <div className="relative w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-br from-primary/20 via-primary/10 to-transparent rounded-2xl flex items-center justify-center border-2 border-primary/20">
                  <TrendingUp className="w-8 h-8 sm:w-10 sm:h-10 text-primary/60" />
                </div>
              </div>
              <h3 className="font-bold text-base sm:text-lg mb-2 text-foreground">No Contributions Yet</h3>
              <p className="text-muted-foreground text-xs sm:text-sm max-w-sm">
                Your contribution history will appear here once you make your first payment. Start contributing to see your progress!
              </p>
            </div>
          )}
        </div>

        {hasData && (
          <div className="mt-6 pt-4 border-t border-border/50">
            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors group cursor-pointer">
              <p>View detailed statements in your contribution history</p>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ContributionChart;