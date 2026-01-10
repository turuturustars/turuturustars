import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';
import { HandHeart, Loader2, Heart, Users, DollarSign } from 'lucide-react';

interface WelfareCase {
  id: string;
  title: string;
  description: string | null;
  case_type: string;
  target_amount: number | null;
  collected_amount: number;
  status: string;
  created_at: string;
  beneficiary: {
    full_name: string;
  } | null;
}

const WelfarePage = () => {
  const [cases, setCases] = useState<WelfareCase[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchWelfareCases();
  }, []);

  const fetchWelfareCases = async () => {
    try {
      const { data, error } = await supabase
        .from('welfare_cases')
        .select(`
          *,
          beneficiary:beneficiary_id (full_name)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setCases(data || []);
    } catch (error) {
      console.error('Error fetching welfare cases:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getCaseTypeIcon = (type: string) => {
    switch (type) {
      case 'bereavement':
        return <Heart className="w-5 h-5 text-red-500" />;
      case 'medical':
        return <HandHeart className="w-5 h-5 text-blue-500" />;
      case 'education':
        return <Users className="w-5 h-5 text-green-500" />;
      default:
        return <DollarSign className="w-5 h-5 text-primary" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      active: 'bg-green-100 text-green-800',
      closed: 'bg-gray-100 text-gray-800',
      cancelled: 'bg-red-100 text-red-800',
    };
    return (
      <Badge className={colors[status] || colors.active}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  const activeCases = cases.filter((c) => c.status === 'active');
  const closedCases = cases.filter((c) => c.status !== 'active');

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-serif font-bold text-foreground">Welfare Cases</h2>
        <p className="text-muted-foreground">Support our members in times of need</p>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-green-100 flex items-center justify-center">
                <HandHeart className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{activeCases.length}</p>
                <p className="text-sm text-muted-foreground">Active Cases</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  KES {activeCases.reduce((sum, c) => sum + (c.collected_amount || 0), 0).toLocaleString()}
                </p>
                <p className="text-sm text-muted-foreground">Total Collected</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-purple-100 flex items-center justify-center">
                <Users className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{closedCases.length}</p>
                <p className="text-sm text-muted-foreground">Cases Closed</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : cases.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <HandHeart className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium text-foreground">No welfare cases</h3>
            <p className="text-muted-foreground mt-1">
              There are no active welfare cases at this time
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Active Cases */}
          {activeCases.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-foreground">Active Cases</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {activeCases.map((welfareCase) => (
                  <Card key={welfareCase.id} className="overflow-hidden">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          {getCaseTypeIcon(welfareCase.case_type)}
                          <div>
                            <CardTitle className="text-lg">{welfareCase.title}</CardTitle>
                            <p className="text-sm text-muted-foreground capitalize">
                              {welfareCase.case_type.replace('_', ' ')}
                            </p>
                          </div>
                        </div>
                        {getStatusBadge(welfareCase.status)}
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {welfareCase.description && (
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {welfareCase.description}
                        </p>
                      )}
                      {welfareCase.beneficiary && (
                        <p className="text-sm">
                          <span className="text-muted-foreground">Beneficiary:</span>{' '}
                          <span className="font-medium">{welfareCase.beneficiary.full_name}</span>
                        </p>
                      )}
                      {welfareCase.target_amount && (
                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Progress</span>
                            <span className="font-medium">
                              KES {welfareCase.collected_amount.toLocaleString()} / {welfareCase.target_amount.toLocaleString()}
                            </span>
                          </div>
                          <Progress
                            value={(welfareCase.collected_amount / welfareCase.target_amount) * 100}
                            className="h-2"
                          />
                        </div>
                      )}
                      <p className="text-xs text-muted-foreground">
                        Created {new Date(welfareCase.created_at).toLocaleDateString()}
                      </p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Past Cases */}
          {closedCases.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-foreground">Past Cases</h3>
              <Card>
                <CardContent className="p-0">
                  <div className="divide-y divide-border">
                    {closedCases.map((welfareCase) => (
                      <div key={welfareCase.id} className="p-4 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          {getCaseTypeIcon(welfareCase.case_type)}
                          <div>
                            <p className="font-medium">{welfareCase.title}</p>
                            <p className="text-sm text-muted-foreground">
                              Collected: KES {welfareCase.collected_amount.toLocaleString()}
                            </p>
                          </div>
                        </div>
                        {getStatusBadge(welfareCase.status)}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default WelfarePage;