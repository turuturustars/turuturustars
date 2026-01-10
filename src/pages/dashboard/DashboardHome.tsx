import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { 
  DollarSign, 
  HandHeart, 
  Bell, 
  Users,
  TrendingUp,
  AlertCircle,
  CheckCircle2,
  Clock
} from 'lucide-react';
import { Link } from 'react-router-dom';

interface DashboardStats {
  totalContributions: number;
  pendingContributions: number;
  activeWelfareCases: number;
  unreadNotifications: number;
}

interface Announcement {
  id: string;
  title: string;
  content: string;
  priority: string;
  published_at: string;
}

const DashboardHome = () => {
  const { profile, isOfficial } = useAuth();
  const [stats, setStats] = useState<DashboardStats>({
    totalContributions: 0,
    pendingContributions: 0,
    activeWelfareCases: 0,
    unreadNotifications: 0,
  });
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, [profile?.id]);

  const fetchDashboardData = async () => {
    if (!profile?.id) return;

    try {
      // Fetch contributions stats
      const { data: contributions } = await supabase
        .from('contributions')
        .select('status, amount')
        .eq('member_id', profile.id);

      const totalPaid = contributions
        ?.filter((c) => c.status === 'paid')
        .reduce((sum, c) => sum + Number(c.amount), 0) || 0;

      const pendingCount = contributions?.filter((c) => c.status === 'pending').length || 0;

      // Fetch welfare cases
      const { data: welfareCases } = await supabase
        .from('welfare_cases')
        .select('id')
        .eq('status', 'active');

      // Fetch unread notifications
      const { data: notifications } = await supabase
        .from('notifications')
        .select('id')
        .eq('user_id', profile.id)
        .eq('read', false);

      // Fetch announcements
      const { data: announcementData } = await supabase
        .from('announcements')
        .select('*')
        .eq('published', true)
        .order('published_at', { ascending: false })
        .limit(3);

      setStats({
        totalContributions: totalPaid,
        pendingContributions: pendingCount,
        activeWelfareCases: welfareCases?.length || 0,
        unreadNotifications: notifications?.length || 0,
      });

      setAnnouncements(announcementData || []);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const statCards = [
    {
      title: 'Total Contributions',
      value: `KES ${stats.totalContributions.toLocaleString()}`,
      icon: DollarSign,
      color: 'text-green-600',
      bgColor: 'bg-green-100',
    },
    {
      title: 'Pending Payments',
      value: stats.pendingContributions,
      icon: Clock,
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-100',
    },
    {
      title: 'Active Welfare Cases',
      value: stats.activeWelfareCases,
      icon: HandHeart,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100',
    },
    {
      title: 'Notifications',
      value: stats.unreadNotifications,
      icon: Bell,
      color: 'text-purple-600',
      bgColor: 'bg-purple-100',
    },
  ];

  const getStatusIcon = (status: string | undefined) => {
    switch (status) {
      case 'active':
        return <CheckCircle2 className="w-5 h-5 text-green-500" />;
      case 'pending':
        return <Clock className="w-5 h-5 text-yellow-500" />;
      case 'dormant':
        return <AlertCircle className="w-5 h-5 text-red-500" />;
      default:
        return <Clock className="w-5 h-5 text-muted-foreground" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Member Status Card */}
      <Card className="border-l-4 border-l-primary">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {getStatusIcon(profile?.status)}
              <div>
                <h3 className="font-semibold text-foreground">Membership Status</h3>
                <p className="text-sm text-muted-foreground">
                  {profile?.status === 'active' 
                    ? 'Your membership is active and in good standing'
                    : profile?.status === 'pending'
                    ? 'Your membership is pending approval'
                    : 'Your membership requires attention'}
                </p>
              </div>
            </div>
            <Badge variant={profile?.registration_fee_paid ? 'default' : 'destructive'}>
              {profile?.registration_fee_paid ? 'Fee Paid' : 'Fee Pending'}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.title}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">{stat.title}</p>
                    <p className="text-2xl font-bold text-foreground mt-1">{stat.value}</p>
                  </div>
                  <div className={`w-12 h-12 rounded-xl ${stat.bgColor} flex items-center justify-center`}>
                    <Icon className={`w-6 h-6 ${stat.color}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Quick Actions & Announcements */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button asChild className="w-full justify-start" variant="outline">
              <Link to="/dashboard/contributions">
                <DollarSign className="w-4 h-4 mr-2" />
                Make a Contribution
              </Link>
            </Button>
            <Button asChild className="w-full justify-start" variant="outline">
              <Link to="/dashboard/welfare">
                <HandHeart className="w-4 h-4 mr-2" />
                View Welfare Cases
              </Link>
            </Button>
            <Button asChild className="w-full justify-start" variant="outline">
              <Link to="/dashboard/profile">
                <Users className="w-4 h-4 mr-2" />
                Update Profile
              </Link>
            </Button>
            {isOfficial() && (
              <Button asChild className="w-full justify-start btn-primary">
                <Link to="/dashboard/members">
                  <TrendingUp className="w-4 h-4 mr-2" />
                  Manage Members
                </Link>
              </Button>
            )}
          </CardContent>
        </Card>

        {/* Announcements */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg">Latest Announcements</CardTitle>
            <CardDescription>Stay updated with CBO news</CardDescription>
          </CardHeader>
          <CardContent>
            {announcements.length === 0 ? (
              <p className="text-muted-foreground text-sm text-center py-8">
                No announcements at this time
              </p>
            ) : (
              <div className="space-y-4">
                {announcements.map((announcement) => (
                  <div
                    key={announcement.id}
                    className="p-4 rounded-lg bg-accent/50 border border-border"
                  >
                    <div className="flex items-start justify-between">
                      <h4 className="font-medium text-foreground">{announcement.title}</h4>
                      {announcement.priority === 'urgent' && (
                        <Badge variant="destructive">Urgent</Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                      {announcement.content}
                    </p>
                    <p className="text-xs text-muted-foreground mt-2">
                      {new Date(announcement.published_at).toLocaleDateString()}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default DashboardHome;