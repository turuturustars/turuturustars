import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Loader2 } from 'lucide-react';

interface MonthlyData {
  month: string;
  amount: number;
}

const ContributionChart = () => {
  const { profile } = useAuth();
  const [data, setData] = useState<MonthlyData[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!profile?.id) return;

    const fetchContributionData = async () => {
      try {
        const { data: contributions, error } = await supabase
          .from('contributions')
          .select('amount, paid_at, status')
          .eq('member_id', profile.id)
          .eq('status', 'paid')
          .order('paid_at', { ascending: true });

        if (error) throw error;

        // Group by month
        const monthlyData: { [key: string]: number } = {};
        const now = new Date();
        
        // Initialize last 6 months
        for (let i = 5; i >= 0; i--) {
          const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
          const monthKey = date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
          monthlyData[monthKey] = 0;
        }

        // Sum contributions by month
        contributions?.forEach(contribution => {
          if (contribution.paid_at) {
            const date = new Date(contribution.paid_at);
            const monthKey = date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
            if (monthlyData.hasOwnProperty(monthKey)) {
              monthlyData[monthKey] += Number(contribution.amount);
            }
          }
        });

        const chartData = Object.entries(monthlyData).map(([month, amount]) => ({
          month,
          amount,
        }));

        setData(chartData);
      } catch (error) {
        console.error('Error fetching contribution data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchContributionData();

    // Subscribe to real-time updates
    const channel = supabase
      .channel('contribution-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'contributions',
          filter: `member_id=eq.${profile.id}`,
        },
        () => {
          fetchContributionData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [profile?.id]);

  if (isLoading) {
    return (
      <Card>
        <CardContent className="h-[300px] flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Contribution History</CardTitle>
        <CardDescription>Your contributions over the last 6 months</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-[250px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="colorAmount" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis 
                dataKey="month" 
                tick={{ fontSize: 12 }}
                className="text-muted-foreground"
              />
              <YAxis 
                tick={{ fontSize: 12 }}
                className="text-muted-foreground"
                tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                }}
                formatter={(value: number) => [`KES ${value.toLocaleString()}`, 'Amount']}
              />
              <Area
                type="monotone"
                dataKey="amount"
                stroke="hsl(var(--primary))"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#colorAmount)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
};

export default ContributionChart;
