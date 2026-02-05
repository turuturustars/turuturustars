import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AccessibleButton, AccessibleStatus, useStatus } from '@/components/accessible';
import { useAuth } from '@/hooks/useAuth';
import { getPrimaryRole } from '@/lib/rolePermissions';
import { supabase } from '@/integrations/supabase/client';
import { useRealtimeAnnouncements } from '@/hooks/useRealtimeAnnouncements';
import ContributionChart from '@/components/dashboard/ContributionChart';
import WelfareParticipationChart from '@/components/dashboard/WelfareParticipationChart';
import PayWithMpesa from '@/components/dashboard/PayWithMpesa';
import { 
  DollarSign, 
  HandHeart, 
  Bell, 
  Users,
  TrendingUp,
  AlertCircle,
  CheckCircle2,
  Clock,
  ArrowRight,
  Sparkles,
  Calendar,
  MessageSquare,
  TrendingDown,
  Loader2,
  ChevronRight,
  Zap,
  Shield,
  Activity
} from 'lucide-react';

interface DashboardStats {
  totalContributions: number;
  pendingContributions: number;
  activeWelfareCases: number;
  unreadNotifications: number;
}

interface PendingMembershipFee {
  amount: number;
  due_date: string | null;
}

const DashboardHome = () => {
  const navigate = useNavigate();
  const { profile, isOfficial, roles } = useAuth();
  const { status, showSuccess } = useStatus();
  const { announcements } = useRealtimeAnnouncements();
  const [stats, setStats] = useState<DashboardStats>({
    totalContributions: 0,
    pendingContributions: 0,
    activeWelfareCases: 0,
    unreadNotifications: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [greeting, setGreeting] = useState('');
  const [dayOfWeek, setDayOfWeek] = useState('');
  const [currentTime, setCurrentTime] = useState('');
  const [pendingMembershipFee, setPendingMembershipFee] = useState<PendingMembershipFee | null>(null);

  // Dynamic greeting with day, time, and name
  useEffect(() => {
    const updateGreeting = () => {
      const now = new Date();
      const hour = now.getHours();
      const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      const day = days[now.getDay()];
      const time = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
      
      let greeting = '';
      if (hour < 12) greeting = 'Good Morning';
      else if (hour < 17) greeting = 'Good Afternoon';
      else greeting = 'Good Evening';
      
      setGreeting(greeting);
      setDayOfWeek(day);
      setCurrentTime(time);
    };
    
    updateGreeting();
    const interval = setInterval(updateGreeting, 60000); // Update every minute
    return () => clearInterval(interval);
  }, []);

  // Redirect officials to role-specific dashboards
  useEffect(() => {
    if (roles.length === 0) return;
    
    const userRoles = roles.map(r => r.role);
    const primaryRole = getPrimaryRole(userRoles);

    const roleDashboards: Record<string, string> = {
      'chairperson': '/dashboard/roles/chairperson',
      'vice_chairman': '/dashboard/roles/vice-chairperson',
      'secretary': '/dashboard/roles/secretary',
      'vice_secretary': '/dashboard/roles/vice-secretary',
      'treasurer': '/dashboard/roles/treasurer',
      'organizing_secretary': '/dashboard/roles/organizing-secretary',
      'patron': '/dashboard/roles/patron',
      'admin': '/dashboard/roles/admin',
    };

    const targetDashboard = roleDashboards[primaryRole];
    if (targetDashboard && !window.location.pathname.includes('/dashboard/home')) {
      navigate(targetDashboard, { replace: true });
    }
  }, [roles, navigate]);

  useEffect(() => {
    fetchDashboardData();
  }, [profile?.id]);

  const fetchDashboardData = async () => {
    if (!profile?.id) {
      setIsLoading(false);
      return;
    }

    try {
      const fetchPromise = Promise.all([
        supabase.from('contributions').select('status, amount').eq('member_id', profile.id),
        supabase.from('welfare_cases').select('id').eq('status', 'active'),
        supabase.from('notifications').select('id').eq('user_id', profile.id).eq('read', false),
        supabase
          .from('contributions')
          .select('amount, due_date')
          .eq('member_id', profile.id)
          .eq('contribution_type', 'membership_fee')
          .eq('status', 'pending')
          .order('created_at', { ascending: false })
          .limit(1),
      ]);

      const timeoutPromise = new Promise<'timeout'>((resolve) => {
        setTimeout(() => resolve('timeout'), 4500);
      });

      const result = await Promise.race([fetchPromise, timeoutPromise]);

      if (result === 'timeout') {
        setIsLoading(false);
        return;
      }

      const [contributionsRes, welfareCasesRes, notificationsRes, membershipFeeRes] = result;

      if (contributionsRes.error || welfareCasesRes.error || notificationsRes.error) {
        console.error('Dashboard data errors:', {
          contributions: contributionsRes.error,
          welfareCases: welfareCasesRes.error,
          notifications: notificationsRes.error,
        });
      }

      if (membershipFeeRes?.data && membershipFeeRes.data.length > 0) {
        setPendingMembershipFee({
          amount: Number(membershipFeeRes.data[0].amount),
          due_date: membershipFeeRes.data[0].due_date || null,
        });
      } else {
        setPendingMembershipFee(null);
      }

      const totalPaid = contributionsRes.data
        ?.filter((c) => c.status === 'paid')
        .reduce((sum, c) => sum + Number(c.amount), 0) || 0;

      const pendingCount = contributionsRes.data?.filter((c) => c.status === 'pending').length || 0;

      setStats({
        totalContributions: totalPaid,
        pendingContributions: pendingCount,
        activeWelfareCases: welfareCasesRes.data?.length || 0,
        unreadNotifications: notificationsRes.data?.length || 0,
      });
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
      change: '+12.5%',
      trend: 'up',
      icon: DollarSign,
      color: 'text-green-600 dark:text-green-400',
      bgColor: 'bg-green-50 dark:bg-green-950/50',
      gradient: 'from-green-500 to-emerald-500',
      action: { label: 'Add Contribution', path: '/dashboard/finance/contributions' }
    },
    {
      title: 'Pending Payments',
      value: stats.pendingContributions,
      change: '-3 from last month',
      trend: 'down',
      icon: Clock,
      color: 'text-amber-600 dark:text-amber-400',
      bgColor: 'bg-amber-50 dark:bg-amber-950/50',
      gradient: 'from-amber-500 to-orange-500',
      action: { label: 'Pay Now', path: '/dashboard/finance/mpesa' }
    },
    {
      title: 'Active Welfare Cases',
      value: stats.activeWelfareCases,
      change: '2 this month',
      trend: 'neutral',
      icon: HandHeart,
      color: 'text-blue-600 dark:text-blue-400',
      bgColor: 'bg-blue-50 dark:bg-blue-950/50',
      gradient: 'from-blue-500 to-cyan-500',
      action: { label: 'View Cases', path: '/dashboard/members/welfare' }
    },
    {
      title: 'Notifications',
      value: stats.unreadNotifications,
      change: 'New updates',
      trend: 'neutral',
      icon: Bell,
      color: 'text-purple-600 dark:text-purple-400',
      bgColor: 'bg-purple-50 dark:bg-purple-950/50',
      gradient: 'from-purple-500 to-pink-500',
      action: { label: 'View All', path: '/dashboard/communication/messages' }
    },
  ];

  const quickActions = [
    { 
      label: 'Make Contribution', 
      path: '/dashboard/contributions', 
      icon: DollarSign,
      color: 'from-green-500 to-emerald-500',
      description: 'Add to your savings'
    },
    { 
      label: 'View Welfare Cases', 
      path: '/dashboard/welfare', 
      icon: HandHeart,
      color: 'from-blue-500 to-cyan-500',
      description: 'Support members'
    },
    { 
      label: 'Update Profile', 
      path: '/dashboard/profile', 
      icon: Users,
      color: 'from-purple-500 to-pink-500',
      description: 'Edit your details'
    },
    { 
      label: 'View Meetings', 
      path: '/dashboard/meetings', 
      icon: Calendar,
      color: 'from-amber-500 to-orange-500',
      description: 'Upcoming events'
    },
  ];

  const getStatusConfig = (status: string | undefined) => {
    const configs = {
      active: {
        icon: CheckCircle2,
        color: 'text-green-600 dark:text-green-400',
        bgColor: 'bg-green-50 dark:bg-green-950/50',
        borderColor: 'border-green-200 dark:border-green-800',
        message: 'Your membership is active and in good standing',
      },
      pending: {
        icon: Clock,
        color: 'text-amber-600 dark:text-amber-400',
        bgColor: 'bg-amber-50 dark:bg-amber-950/50',
        borderColor: 'border-amber-200 dark:border-amber-800',
        message: 'Your membership is pending approval',
      },
      dormant: {
        icon: AlertCircle,
        color: 'text-red-600 dark:text-red-400',
        bgColor: 'bg-red-50 dark:bg-red-950/50',
        borderColor: 'border-red-200 dark:border-red-800',
        message: 'Your membership requires attention',
      },
    };
    return configs[status as keyof typeof configs] || configs.pending;
  };

  const statusConfig = getStatusConfig(profile?.status);
  const StatusIcon = statusConfig.icon;

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Loader2 className="w-10 h-10 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground animate-pulse">Loading your dashboard...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-8">
      <AccessibleStatus 
        message={status.message} 
        type={status.type} 
        isVisible={status.isVisible} 
      />

      {pendingMembershipFee && (
        <div className="relative overflow-hidden rounded-xl border-2 border-amber-200/70 bg-gradient-to-r from-amber-50 via-orange-50 to-amber-50 px-4 py-4 sm:px-6 shadow-sm">
          <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-amber-200/40 blur-2xl" />
          <div className="absolute bottom-0 left-10 h-20 w-20 rounded-full bg-orange-200/30 blur-2xl" />
          <div className="relative flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs uppercase tracking-wide text-amber-700">Membership Fee</p>
              <h3 className="text-lg font-semibold text-amber-900">
                KES {pendingMembershipFee.amount.toLocaleString()} due
              </h3>
              <p className="text-xs text-amber-700">
                {pendingMembershipFee.due_date
                  ? `Due by ${new Date(pendingMembershipFee.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`
                  : 'Due now'}
              </p>
            </div>
            <AccessibleButton
              asChild
              className="bg-amber-600 hover:bg-amber-700 text-white"
              ariaLabel="Pay membership fee"
            >
              <Link to="/dashboard/finance/membership-fees">Pay Membership Fee</Link>
            </AccessibleButton>
          </div>
        </div>
      )}
      {/* Welcome Header - Compact & Responsive */}
      <div className="relative overflow-hidden rounded-xl bg-gradient-to-r from-primary via-purple-500 to-pink-500 px-4 py-3.5 sm:px-6 sm:py-4 lg:px-8 lg:py-5 shadow-lg hover:shadow-xl transition-shadow duration-300">
        {/* Animated background elements */}
        <div className="absolute inset-0 opacity-30">
          <div className="absolute top-0 right-0 w-32 sm:w-48 h-32 sm:h-48 bg-white/10 rounded-full blur-2xl" />
          <div className="absolute bottom-0 left-0 w-24 sm:w-40 h-24 sm:h-40 bg-purple-300/10 rounded-full blur-2xl" />
        </div>
        
        <div className="relative">
          {/* Top row: Badge + Time */}
          <div className="flex items-center justify-between gap-2 mb-2.5">
            <div className="flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 sm:w-4.5 sm:h-4.5 text-white/90 animate-pulse" />
              <Badge className="bg-white/25 backdrop-blur-sm text-white border-white/40 text-xs sm:text-sm px-2.5 sm:px-3 py-0.5">
                Dashboard
              </Badge>
            </div>
            <span className="text-xs sm:text-sm text-white/85 font-medium">
              {currentTime}
            </span>
          </div>
          
          {/* Main greeting - Inline layout */}
          <div className="flex flex-col xs:flex-row xs:items-baseline xs:gap-2">
            <h1 className="text-xl xs:text-2xl sm:text-3xl font-bold text-white leading-tight">
              Happy {dayOfWeek}!
            </h1>
            <p className="text-xs xs:text-sm text-white/80 mt-0.5 xs:mt-0">
              Welcome back, <span className="font-semibold text-white">{profile?.full_name?.split(' ')[0] || 'Member'}</span>
            </p>
          </div>
          
          {/* Subtitle */}
          <p className="text-xs xs:text-sm text-white/75 mt-1 sm:mt-1.5">
            Active member of Turuturu Stars CBO
          </p>
        </div>
      </div>

      {/* Membership Status - Compact Badge */}
      <div className="flex flex-col xs:flex-row xs:items-center xs:justify-between gap-2 xs:gap-3">
        <div className="flex items-center gap-2 xs:gap-3 group">
          {/* Status Icon */}
          <div className="relative">
            <div className="absolute inset-0 bg-emerald-400/30 rounded-full blur-lg group-hover:blur-xl group-hover:bg-emerald-400/40 transition-all duration-300" />
            <div className={`relative p-2 rounded-full ${statusConfig.bgColor} border-2 ${statusConfig.borderColor} group-hover:scale-110 transition-transform duration-300`}>
              <StatusIcon className={`w-4 h-4 xs:w-5 xs:h-5 ${statusConfig.color}`} />
            </div>
          </div>
          
          {/* Status Text */}
          <div className="min-w-0">
            <h3 className="font-bold text-sm xs:text-base text-foreground leading-tight">
              Membership Status
            </h3>
            <p className="text-xs xs:text-sm text-muted-foreground truncate">
              {statusConfig.message}
            </p>
          </div>
        </div>
        
        {/* Status Badges - Compact */}
        <div className="flex items-center gap-1.5 xs:gap-2">
          <div className={`inline-flex items-center gap-1.5 px-2.5 xs:px-3 py-1.5 rounded-full text-xs xs:text-sm font-semibold transition-all duration-300 ${
            profile?.registration_fee_paid 
              ? 'bg-emerald-100 text-emerald-700 border border-emerald-200/50' 
              : 'bg-red-100 text-red-700 border border-red-200/50'
          }`}>
            <span className={`w-1.5 h-1.5 rounded-full ${profile?.registration_fee_paid ? 'bg-emerald-600 animate-pulse' : 'bg-red-600'}`} />
            <span className="whitespace-nowrap">{profile?.registration_fee_paid ? 'Fee Paid' : 'Fee Pending'}</span>
          </div>
          
          <div className="px-2.5 xs:px-3 py-1.5 rounded-full text-xs xs:text-sm font-semibold bg-blue-100 text-blue-700 border border-blue-200/50">
            {profile?.status?.charAt(0).toUpperCase()}{profile?.status?.slice(1)}
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6">
        {statCards.map((stat, idx) => {
          const Icon = stat.icon;
          const isUp = stat.trend === 'up';
          const isDown = stat.trend === 'down';
          
          return (
            <Card 
              key={stat.title}
              className="group hover:shadow-xl transition-all duration-300 border-2 hover:border-primary/50 cursor-pointer overflow-hidden"
            >
              <CardContent className="p-3 sm:p-4 md:p-5 lg:p-6">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs sm:text-sm md:text-sm text-muted-foreground mb-2 truncate">
                      {stat.title}
                    </p>
                    <p className="text-2xl sm:text-2xl md:text-3xl lg:text-3xl font-bold text-foreground">
                      {stat.value}
                    </p>
                  </div>
                  <div className={`p-2 sm:p-2.5 md:p-3 rounded-lg sm:rounded-xl ${stat.bgColor} group-hover:scale-110 transition-transform flex-shrink-0`}>
                    <Icon className={`w-4 h-4 sm:w-5 sm:h-5 md:w-5 md:h-5 ${stat.color}`} />
                  </div>
                </div>
                {stat.change && (
                  <div className={`flex items-center gap-1 text-xs font-medium mb-3 ${
                    isUp ? 'text-green-600 dark:text-green-400' : 
                    isDown ? 'text-red-600 dark:text-red-400' : 
                    'text-muted-foreground'
                  }`}>
                    {isUp && <TrendingUp className="w-3 h-3" />}
                    {isDown && <TrendingDown className="w-3 h-3" />}
                    <span className="truncate">{stat.change}</span>
                  </div>
                )}
                {stat.action && (
                  <AccessibleButton 
                    asChild 
                    variant="outline" 
                    className="w-full text-xs group-hover:border-primary group-hover:text-primary transition-all"
                    ariaLabel={`Navigate to ${stat.action.label}`}
                  >
                    <Link to={stat.action.path} className="flex items-center gap-1">
                      {stat.action.label}
                      <ArrowRight className="w-3 h-3 ml-1" />
                    </Link>
                  </AccessibleButton>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-5 lg:gap-6">
        <ContributionChart />
        <WelfareParticipationChart />
      </div>

      {/* Quick Actions & Announcements */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-5 lg:gap-6">
        {/* Quick Actions */}
        <Card className="border-2 shadow-lg">
          <CardHeader className="pb-4">
            <div className="flex items-center gap-2">
              <Zap className="w-5 h-5 text-primary" />
              <CardTitle className="text-lg">Quick Actions</CardTitle>
            </div>
            <CardDescription className="text-xs">Common tasks at your fingertips</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {quickActions.map((action) => {
              const ActionIcon = action.icon;
              return (
                <AccessibleButton
                  key={action.path}
                  asChild
                  variant="outline"
                  className="w-full justify-start h-auto py-3 border-2 hover:border-primary group"
                  ariaLabel={`Quick action: ${action.label}`}
                >
                  <Link to={action.path}>
                    <div className="flex items-center gap-3 flex-1">
                      <div className={`p-2 rounded-lg bg-gradient-to-br ${action.color} bg-opacity-10`}>
                        <ActionIcon className="w-4 h-4" />
                      </div>
                      <div className="text-left flex-1">
                        <div className="font-semibold text-sm">{action.label}</div>
                        <div className="text-xs text-muted-foreground">{action.description}</div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
                    </div>
                  </Link>
                </AccessibleButton>
              );
            })}
            
            <div className="pt-2">
              <PayWithMpesa
                defaultAmount={100}
                trigger={
                  <AccessibleButton className="w-full justify-start h-auto py-3 gap-3 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700" ariaLabel="Pay with M-Pesa for quick mobile payment">
                    <div className="p-2 rounded-lg bg-white/20">
                      <DollarSign className="w-4 h-4" />
                    </div>
                    <div className="text-left flex-1">
                      <div className="font-semibold text-sm">Pay with M-Pesa</div>
                      <div className="text-xs opacity-90">Quick mobile payment</div>
                    </div>
                    <ArrowRight className="w-4 h-4" />
                  </AccessibleButton>
                }
              />
            </div>

            {isOfficial() && (
              <AccessibleButton
                asChild
                className="w-full justify-start h-auto py-3 gap-3 bg-gradient-to-r from-primary to-purple-600 hover:from-primary/90 hover:to-purple-700 mt-3"
                ariaLabel="Manage members: Official access"
              >
                <Link to="/dashboard/members">
                  <div className="p-2 rounded-lg bg-white/20">
                    <Shield className="w-4 h-4" />
                  </div>
                  <div className="text-left flex-1">
                    <div className="font-semibold text-sm">Manage Members</div>
                    <div className="text-xs opacity-90">Official access</div>
                  </div>
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </AccessibleButton>
            )}
          </CardContent>
        </Card>

        {/* Announcements */}
        <Card className="lg:col-span-2 border-2 shadow-lg">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Bell className="w-5 h-5 text-primary" />
                <CardTitle className="text-lg">Latest Announcements</CardTitle>
              </div>
              <AccessibleButton variant="ghost" size="sm" asChild ariaLabel="View all announcements">
                <Link to="/dashboard/announcements">
                  View All
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Link>
              </AccessibleButton>
            </div>
            <CardDescription className="text-xs">Stay updated with organization news</CardDescription>
          </CardHeader>
          <CardContent>
            {announcements.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center mb-3">
                  <Bell className="w-8 h-8 text-muted-foreground/50" />
                </div>
                <h4 className="font-semibold text-foreground mb-1">No Announcements</h4>
                <p className="text-sm text-muted-foreground">
                  Check back later for updates
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {announcements.slice(0, 3).map((announcement) => (
                  <div
                    key={announcement.id}
                    className="group p-4 rounded-xl bg-gradient-to-br from-accent/50 to-accent/30 border-2 border-border hover:border-primary transition-all duration-300 cursor-pointer hover:shadow-lg"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <h4 className="font-semibold text-foreground text-sm sm:text-base group-hover:text-primary transition-colors line-clamp-2">
                        {announcement.title}
                      </h4>
                      {announcement.priority === 'urgent' && (
                        <Badge variant="destructive" className="ml-2 flex-shrink-0 animate-pulse">
                          Urgent
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs sm:text-sm text-muted-foreground line-clamp-2 mb-2">
                      {announcement.content}
                    </p>
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        <span>
                          {announcement.published_at 
                            ? new Date(announcement.published_at).toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric'
                              })
                            : 'Recently'}
                        </span>
                      </div>
                      <ChevronRight className="w-4 h-4 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
                    </div>
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
