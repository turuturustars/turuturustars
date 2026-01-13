import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Loader2 } from 'lucide-react';

interface WelfareData {
  name: string;
  value: number;
  color: string;
}

const COLORS = [
  'hsl(var(--primary))',
  'hsl(142, 76%, 36%)', // green
  'hsl(38, 92%, 50%)', // amber
  'hsl(262, 83%, 58%)', // purple
  'hsl(199, 89%, 48%)', // sky
];

const WelfareParticipationChart = () => {
  const { profile } = useAuth();
  const [data, setData] = useState<WelfareData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [totalParticipation, setTotalParticipation] = useState(0);

  useEffect(() => {
    if (!profile?.id) return;

    const fetchWelfareData = async () => {
      try {
        // Fetch welfare contributions by case type
        const { data: contributions, error } = await supabase
          .from('contributions')
          .select(`
            amount,
            status,
            welfare_cases (
              case_type
            )
          `)
          .eq('member_id', profile.id)
          .eq('contribution_type', 'welfare')
          .eq('status', 'paid');

        if (error) throw error;

        // Group by case type
        const typeData: { [key: string]: number } = {};
        let total = 0;

        contributions?.forEach(contribution => {
          const caseType = contribution.welfare_cases?.case_type || 'General';
          const amount = Number(contribution.amount);
          typeData[caseType] = (typeData[caseType] || 0) + amount;
          total += amount;
        });

        // Convert to chart data
        const chartData = Object.entries(typeData).map(([name, value], index) => ({
          name: name.charAt(0).toUpperCase() + name.slice(1),
          value,
          color: COLORS[index % COLORS.length],
        }));

        setData(chartData);
        setTotalParticipation(total);
      } catch (error) {
        console.error('Error fetching welfare data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchWelfareData();
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

  if (data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Welfare Participation</CardTitle>
          <CardDescription>Your welfare contributions by category</CardDescription>
        </CardHeader>
        <CardContent className="h-[250px] flex items-center justify-center">
          <p className="text-muted-foreground text-sm">No welfare contributions yet</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Welfare Participation</CardTitle>
        <CardDescription>
          Total: KES {totalParticipation.toLocaleString()}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-[250px]">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={80}
                paddingAngle={5}
                dataKey="value"
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                }}
                formatter={(value: number) => [`KES ${value.toLocaleString()}`, 'Amount']}
              />
              <Legend
                verticalAlign="bottom"
                height={36}
                formatter={(value) => (
                  <span className="text-sm text-foreground">{value}</span>
                )}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
};

export default WelfareParticipationChart;
