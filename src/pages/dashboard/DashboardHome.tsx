import { useEffect, useState } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AccessibleButton, AccessibleStatus, useStatus } from '@/components/accessible';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { getPrimaryRole, normalizeRoles } from '@/lib/rolePermissions';
import { supabase } from '@/integrations/supabase/client';
import { useRealtimeAnnouncements } from '@/hooks/useRealtimeAnnouncements';
import ContributionChart from '@/components/dashboard/ContributionChart';
import WelfareParticipationChart from '@/components/dashboard/WelfareParticipationChart';
import PayWithPesapal from '@/components/dashboard/PayWithPesapal';
import { buildSiteUrl } from '@/utils/siteUrl';
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

const encouragements = [
  'Small, steady contributions build big change.',
  'Progress loves consistency. One action today matters.',
  'Your community feels stronger because you showed up.',
  'Keep the streak alive. Future you will thank you.',
  'Tiny steps add up. You are moving the needle.',
  'Energy flows where effort goes. You got this.',
  'Give yourself credit. You are doing the work.'
];

const DashboardHome = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { profile, isOfficial, roles } = useAuth();
  const { status, showSuccess } = useStatus();
  const { toast } = useToast();
  const { announcements } = useRealtimeAnnouncements();
  const [stats, setStats] = useState<DashboardStats>({
    totalContributions: 0,
    pendingContributions: 0,
    activeWelfareCases: 0,
    unreadNotifications: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState('');
  const [encouragement, setEncouragement] = useState(encouragements[0]);
  const [pendingMembershipFee, setPendingMembershipFee] = useState<PendingMembershipFee | null>(null);
  const [emailVerified, setEmailVerified] = useState<boolean | null>(null);
  const [emailAddress, setEmailAddress] = useState<string | null>(null);
  const [isResendingEmail, setIsResendingEmail] = useState(false);

  // Dynamic greeting with day, time, and name
  useEffect(() => {
    const updateGreeting = () => {
      const now = new Date();
      const hour = now.getHours();
      const time = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
      setCurrentTime(time);
      setEncouragement(encouragements[now.getDay() % encouragements.length]);
    };
    
    updateGreeting();
    const interval = setInterval(updateGreeting, 60000); // Update every minute
    return () => clearInterval(interval);
  }, []);

  // Redirect officials to their own dashboard only.
  useEffect(() => {
    if (roles.length === 0) return;
    
    const userRoles = normalizeRoles(roles);
    const primaryRole = getPrimaryRole(userRoles);

    const roleDashboards: Record<string, string> = {
      'chairperson': '/dashboard/chairperson',
      'vice_chairman': '/dashboard/vice-chairperson',
      'secretary': '/dashboard/secretary',
      'vice_secretary': '/dashboard/vice-secretary',
      'treasurer': '/dashboard/treasurer',
      'organizing_secretary': '/dashboard/organizing-secretary',
      'patron': '/dashboard/patron',
      'admin': '/dashboard/admin',
    };

    const targetDashboard = roleDashboards[primaryRole];
    if (targetDashboard && location.pathname === '/dashboard/home') {
      navigate(targetDashboard, { replace: true });
    }
  }, [roles, navigate, location.pathname]);

  useEffect(() => {
    fetchDashboardData();
  }, [profile?.id]);

  useEffect(() => {
    const checkEmailVerification = async () => {
      try {
        const { data: { user }, error } = await supabase.auth.getUser();
        if (error || !user) {
          setEmailVerified(null);
          return;
        }
        setEmailVerified(!!user.email_confirmed_at);
        setEmailAddress(user.email ?? null);
      } catch (error) {
        console.error('Failed to check email verification:', error);
        setEmailVerified(null);
      }
    };

    checkEmailVerification();
  }, []);

  const handleResendVerification = async () => {
    if (!emailAddress) return;
    setIsResendingEmail(true);
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: emailAddress,
        options: {
          emailRedirectTo: buildSiteUrl('/auth/confirm'),
        },
      });

      if (error) {
        toast({
          title: 'Failed to resend email',
          description: error.message,
          variant: 'destructive',
        });
        return;
      }

      toast({
        title: 'Verification email sent',
        description: 'Check your inbox and spam folder.',
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to resend email';
      toast({
        title: 'Failed to resend email',
        description: message,
        variant: 'destructive',
      });
    } finally {
      setIsResendingEmail(false);
    }
  };

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
      action: { label: 'Pay Now', path: '/dashboard/finance/contributions' }
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
      action: { label: 'View All', path: '/dashboard/communication/notifications' }
    },
  ];

  const quickActions = [
    { 
      label: 'Make Contribution', 
      path: '/dashboard/finance/contributions', 
      icon: DollarSign,
      color: 'from-green-500 to-emerald-500',
      description: 'Add to your savings'
    },
    { 
      label: 'Membership Fees', 
      path: '/dashboard/finance/membership-fees', 
      icon: Activity,
      color: 'from-amber-500 to-orange-500',
      description: 'Track and renew'
    },
    { 
      label: 'View Welfare Cases', 
      path: '/dashboard/members/welfare', 
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
      path: '/dashboard/governance/meetings', 
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

      {emailVerified === false && (
        <div className="relative overflow-hidden rounded-xl border-2 border-amber-200/80 bg-amber-50 px-4 py-4 sm:px-6 shadow-sm">
          <div className="absolute -right-10 -top-10 h-28 w-28 rounded-full bg-amber-200/40 blur-2xl" />
          <div className="relative flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-amber-800">
                <AlertCircle className="w-4 h-4" />
                <p className="text-xs font-semibold uppercase tracking-wide">Email Verification Required</p>
              </div>
              <p className="text-sm text-amber-900">
                Please confirm your email to unlock full access.
              </p>
              {emailAddress && (
                <p className="text-xs text-amber-700">Sent to {emailAddress}</p>
              )}
            </div>
            <AccessibleButton
              onClick={handleResendVerification}
              className="bg-amber-600 hover:bg-amber-700 text-white"
              ariaLabel="Resend verification email"
              disabled={isResendingEmail}
            >
              {isResendingEmail ? 'Sending...' : 'Resend Email'}
            </AccessibleButton>
          </div>
        </div>
      )}

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
      {/* Welcome Header - compact, gradient, encouraging */}
      <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-primary/90 via-blue-700 to-cyan-500 px-4 py-4 sm:px-6 shadow-[0_18px_60px_-32px_rgba(12,105,147,0.9)]">
        <div className="absolute inset-0 opacity-55">
          <div className="absolute -top-14 -right-10 h-52 w-52 rounded-full bg-white/12 blur-3xl" />
          <div className="absolute -bottom-16 left-0 h-48 w-48 rounded-full bg-blue-200/20 blur-3xl" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_22%,rgba(255,255,255,0.18),transparent_55%),radial-gradient(circle_at_78%_65%,rgba(255,255,255,0.18),transparent_52%)]" />
          <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/30 to-transparent" />
        </div>

        <div className="relative grid gap-4 lg:grid-cols-[1fr_auto] lg:items-center">
          <div className="space-y-2.5">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/12 px-3 py-1 text-[11px] font-semibold text-white/80 backdrop-blur-sm">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-200" />
              On track
            </div>
            <h1 className="text-2xl sm:text-3xl font-semibold leading-tight bg-gradient-to-r from-white via-cyan-100 to-violet-100 bg-clip-text text-transparent drop-shadow">
              Hello, {profile?.full_name?.split(' ')[0] || 'Member'}
            </h1>
            <p className="text-sm sm:text-base text-white/90">
              {encouragement}
            </p>
            <div className="flex flex-wrap items-center gap-2 text-[11px] sm:text-xs text-white/85">
              <span className="inline-flex items-center gap-1 rounded-full bg-white/15 px-3 py-1">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-200" />
                {profile?.status ? profile.status.charAt(0).toUpperCase() + profile.status.slice(1) : 'Pending'} member
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-white/12 px-3 py-1">
                <Sparkles className="h-3.5 w-3.5" />
                Streak ready - make today count
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3 rounded-xl bg-white/12 px-4 py-3 text-white/90 backdrop-blur-lg shadow-inner shadow-white/10">
            <div>
              <p className="text-[10px] uppercase tracking-[0.25em] text-white/60">Time</p>
              <p className="text-lg font-semibold text-white">{currentTime}</p>
            </div>
            <div className="h-10 w-px bg-white/20" />
            <div className="text-right">
              <p className="text-[10px] uppercase tracking-[0.25em] text-white/60">Today</p>
              <p className="text-sm font-medium text-white">
                {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </p>
            </div>
          </div>
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
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-foreground">At a Glance</h2>
          <p className="text-xs text-muted-foreground">Your latest activity and totals</p>
        </div>
      </div>
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
              <PayWithPesapal
                defaultAmount={100}
                trigger={
                  <AccessibleButton className="w-full justify-start h-auto py-3 gap-3 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700" ariaLabel="Make a secure payment">
                    <div className="p-2 rounded-lg bg-white/20">
                      <DollarSign className="w-4 h-4" />
                    </div>
                    <div className="text-left flex-1">
                      <div className="font-semibold text-sm">Pay Now</div>
                      <div className="text-xs opacity-90">Secure checkout (Mobile Money / Card)</div>
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
                <Link to="/dashboard/communication/announcements">
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

