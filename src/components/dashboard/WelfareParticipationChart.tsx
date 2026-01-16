import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Loader2, TrendingUp, Heart } from 'lucide-react';

interface WelfareData {
  name: string;
  value: number;
  color: string;
  percentage?: number;
}

const COLORS = [
  'hsl(262, 83%, 58%)', // purple
  'hsl(199, 89%, 48%)', // sky
  'hsl(142, 76%, 36%)', // green
  'hsl(38, 92%, 50%)', // amber
  'hsl(346, 77%, 50%)', // rose
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

        const typeData: { [key: string]: number } = {};
        let total = 0;

        contributions?.forEach(contribution => {
          const caseType = contribution.welfare_cases?.case_type || 'General';
          const amount = Number(contribution.amount);
          typeData[caseType] = (typeData[caseType] || 0) + amount;
          total += amount;
        });

        const chartData = Object.entries(typeData).map(([name, value], index) => ({
          name: name.charAt(0).toUpperCase() + name.slice(1),
          value,
          color: COLORS[index % COLORS.length],
          percentage: total > 0 ? (value / total) * 100 : 0,
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

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-card border border-border rounded-lg shadow-lg p-3 backdrop-blur-sm">
          <p className="font-semibold text-sm mb-1">{payload[0].name}</p>
          <p className="text-primary font-bold text-base">
            KES {payload[0].value.toLocaleString()}
          </p>
          <p className="text-muted-foreground text-xs mt-1">
            {payload[0].payload.percentage?.toFixed(1)}% of total
          </p>
        </div>
      );
    }
    return null;
  };

  const CustomLegend = ({ payload }: any) => {
    return (
      <div className="flex flex-wrap justify-center gap-3 mt-4 px-2">
        {payload.map((entry: any, index: number) => (
          <div
            key={`legend-${index}`}
            className="flex items-center gap-2 text-sm hover:opacity-80 transition-opacity"
          >
            <div
              className="w-3 h-3 rounded-full shadow-sm"
              style={{ backgroundColor: entry.color }}
            />
            <span className="text-foreground font-medium">{entry.value}</span>
          </div>
        ))}
      </div>
    );
  };

  if (isLoading) {
    return (
      <Card className="overflow-hidden border-muted/50 shadow-sm hover:shadow-md transition-shadow">
        <CardContent className="h-[400px] flex items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Loading welfare data...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (data.length === 0) {
    return (
      <Card className="overflow-hidden border-muted/50 shadow-sm hover:shadow-md transition-shadow">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Heart className="w-5 h-5 text-primary" />
            <CardTitle className="text-xl">Welfare Participation</CardTitle>
          </div>
          <CardDescription>Your welfare contributions by category</CardDescription>
        </CardHeader>
        <CardContent className="h-[300px] flex items-center justify-center">
          <div className="text-center space-y-2">
            <div className="w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center mx-auto mb-3">
              <Heart className="w-8 h-8 text-muted-foreground/50" />
            </div>
            <p className="text-muted-foreground font-medium">No welfare contributions yet</p>
            <p className="text-xs text-muted-foreground">
              Start contributing to see your impact
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden border-muted/50 shadow-sm hover:shadow-md transition-shadow">
      <CardHeader className="pb-3 space-y-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <Heart className="w-5 h-5 text-primary" />
            <CardTitle className="text-xl">Welfare Participation</CardTitle>
          </div>
          <div className="flex items-center gap-1 text-green-600 bg-green-50 dark:bg-green-950 px-2 py-1 rounded-md">
            <TrendingUp className="w-3.5 h-3.5" />
            <span className="text-xs font-semibold">Active</span>
          </div>
        </div>
        <div className="bg-gradient-to-br from-primary/10 to-primary/5 rounded-lg p-4 border border-primary/20">
          <p className="text-sm text-muted-foreground mb-1">Total Contributions</p>
          <p className="text-3xl font-bold text-primary">
            KES {totalParticipation.toLocaleString()}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Across {data.length} {data.length === 1 ? 'category' : 'categories'}
          </p>
        </div>
      </CardHeader>
      <CardContent className="pb-6">
        <div className="h-[280px] sm:h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <defs>
                {data.map((entry, index) => (
                  <filter key={`shadow-${index}`} id={`shadow-${index}`}>
                    <feDropShadow dx="0" dy="2" stdDeviation="3" floodOpacity="0.15" />
                  </filter>
                ))}
              </defs>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius="55%"
                outerRadius="85%"
                paddingAngle={3}
                dataKey="value"
                animationBegin={0}
                animationDuration={800}
              >
                {data.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={entry.color}
                    filter={`url(#shadow-${index})`}
                    className="hover:opacity-80 transition-opacity cursor-pointer"
                  />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
              <Legend content={<CustomLegend />} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-6 pt-6 border-t border-border">
          {data.slice(0, 3).map((item, index) => (
            <div
              key={index}
              className="bg-muted/30 rounded-lg p-3 hover:bg-muted/50 transition-colors"
            >
              <div className="flex items-center gap-2 mb-1">
                <div
                  className="w-2.5 h-2.5 rounded-full"
                  style={{ backgroundColor: item.color }}
                />
                <p className="text-xs text-muted-foreground truncate">{item.name}</p>
              </div>
              <p className="text-sm font-bold text-foreground">
                KES {item.value.toLocaleString()}
              </p>
              <p className="text-xs text-muted-foreground">
                {item.percentage?.toFixed(1)}%
              </p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default WelfareParticipationChart;