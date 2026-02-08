import { Suspense, lazy } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { LocalOrganizationSchema } from "@/components/StructuredData";
import { Logger } from "@/utils/errorHandler";
import { ProtectedRoute, PublicRoute } from "@/components/auth/ProtectedRoute";

// Loading component for suspense fallback
const PageLoader = () => (
  <div className="flex h-screen w-full items-center justify-center">
    <div className="flex flex-col items-center gap-4">
      <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      <p className="text-sm text-muted-foreground">Loading...</p>
    </div>
  </div>
);



// Lazy-loaded components
const Index = lazy(() => import("./pages/Index"));
const Home = lazy(() => import("./pages/Home"));
const Donate = lazy(() => import("./pages/Donate"));
const PesapalCallback = lazy(() => import("./pages/PesapalCallback"));
const About = lazy(() => import("./pages/About"));
const Pillars = lazy(() => import("./pages/Pillars"));
const Careers = lazy(() => import("./pages/Careers"));
const Leadership = lazy(() => import("./pages/Leadership"));
const Register = lazy(() => import("./pages/Register"));
const AuthFlow = lazy(() => import("./components/auth/AuthFlow"));
const Benefits = lazy(() => import("./pages/Benefits"));
const HowItWorks = lazy(() => import("./pages/HowItWorks"));
const PrivacyPolicy = lazy(() => import("./pages/PrivacyPolicy"));
const TermsOfService = lazy(() => import("./pages/TermsOfService"));
const Constitution = lazy(() => import("./pages/Constitution"));
const Help = lazy(() => import("./pages/Help"));
const FAQPage = lazy(() => import("./pages/FAQ"));
const Support = lazy(() => import("./pages/Support"));
const AuthDiagnostics = lazy(() => import("./pages/AuthDiagnostics"));
const EmailDiagnostics = lazy(() => import("./pages/EmailDiagnostics"));
const ProfileSetup = lazy(() => import("./pages/ProfileSetup"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const AuthCallback = lazy(() => import("./pages/auth/AuthCallback"));
const EmailConfirmation = lazy(() => import("./pages/auth/EmailConfirmation"));
const DashboardLayout = lazy(() => import("./layouts/DashboardLayout"));
const DashboardHome = lazy(() => import("./pages/dashboard/DashboardHome"));
const NotFound = lazy(() => import("./pages/NotFound"));

// Role-specific dashboards
const ChairpersonDashboard = lazy(() => import("./pages/dashboard/ChairpersonDashboard"));
const ViceChairmanDashboard = lazy(() => import("./pages/dashboard/ViceChairmanDashboard"));
const SecretaryRole = lazy(() => import("./pages/dashboard/SecretaryRole"));
const TreasurerRole = lazy(() => import("./pages/dashboard/TreasurerRole"));
const OrganizingSecretaryDashboard = lazy(() => import("./pages/dashboard/OrganizingSecretaryDashboard"));
const PatronDashboard = lazy(() => import("./pages/dashboard/PatronDashboard"));
const AdminDashboard = lazy(() => import("./pages/dashboard/AdminDashboard"));
const RolesPage = lazy(() => import("./pages/dashboard/RolesPage"));

// Feature pages
const ContributionsPage = lazy(() => import("./pages/dashboard/ContributionsPage"));
const WelfarePage = lazy(() => import("./pages/dashboard/WelfarePage"));
const WelfareManagement = lazy(() => import("./pages/dashboard/WelfareManagement"));
const ProfilePage = lazy(() => import("./pages/dashboard/ProfilePage"));
const AnnouncementsPage = lazy(() => import("./pages/dashboard/AnnouncementsPage"));
const MembersPage = lazy(() => import("./pages/dashboard/MembersPage"));
const ApprovalsPage = lazy(() => import("./pages/dashboard/ApprovalsPage"));
const JobsModerationPage = lazy(() => import("./pages/dashboard/JobsModerationPage"));
const AllContributionsPage = lazy(() => import("./pages/dashboard/AllContributionsPage"));
const ReportsPage = lazy(() => import("./pages/dashboard/ReportsPage"));
const TreasurerDashboard = lazy(() => import("./pages/dashboard/TreasurerDashboard"));
const SecretaryDashboard = lazy(() => import("./pages/dashboard/SecretaryDashboard"));
const PaymentsManagement = lazy(() => import("./pages/dashboard/PaymentsManagement"));
const MembershipFeesPage = lazy(() => import("./pages/dashboard/MembershipFeesPage"));
const MeetingsPage = lazy(() => import("./pages/dashboard/MeetingsPage"));
const DisciplinePage = lazy(() => import("./pages/dashboard/DisciplinePage"));
const VotingPage = lazy(() => import("./pages/dashboard/VotingPage"));
const RoleHandoverPage = lazy(() => import("./pages/dashboard/RoleHandoverPage"));
const PrivateMessagesPage = lazy(() => import("./pages/dashboard/PrivateMessagesPage"));
const NotificationsPage = lazy(() => import("./pages/dashboard/NotificationsPage"));

// QueryClient configuration with better defaults
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: 1000 * 60 * 30, // 30 minutes (formerly cacheTime)
      refetchOnWindowFocus: false,
      retry: 1,
    },
    mutations: {
      retry: 1,
    },
  },
});

const App = () => {
  const handleError = (error: Error, errorInfo: React.ErrorInfo) => {
    Logger.error('Application error boundary caught error', error, {
      componentStack: errorInfo.componentStack,
    });
  };

  return (
    <ErrorBoundary onError={handleError}>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider delayDuration={300}>
          <LocalOrganizationSchema />
          <Toaster />
          <Sonner />
          <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
            <Suspense fallback={<PageLoader />}>
              <Routes>
                {/* ==================== PUBLIC ROUTES ==================== */}
                
                {/* Landing Pages */}
                <Route path="/" element={<Index />} />
                <Route path="/home" element={<Home />} />
                <Route path="/donate" element={<Donate />} />
                <Route path="/payment/pesapal/callback" element={<PesapalCallback />} />
                
                {/* Information Pages */}
                <Route path="/about" element={<About />} />
                <Route path="/pillars" element={<Pillars />} />
                <Route path="/careers" element={<Careers />} />
                <Route path="/leadership" element={<Leadership />} />
                <Route path="/benefits" element={<Benefits />} />
                <Route path="/how-it-works" element={<HowItWorks />} />
                
                {/* Legal & Support */}
                <Route path="/privacy-policy" element={<PrivacyPolicy />} />
                <Route path="/terms-of-service" element={<TermsOfService />} />
                <Route path="/constitution" element={<Constitution />} />
                <Route path="/help" element={<Help />} />
                <Route path="/faq" element={<FAQPage />} />
                <Route path="/support" element={<Support />} />
                
                {/* Auth Routes */}
                <Route path="/register" element={<Register />} />
                <Route path="/reset-password" element={<ResetPassword />} />
                <Route path="/auth/reset-password" element={<ResetPassword />} />
                <Route path="/auth-diagnostics" element={<AuthDiagnostics />} />
                <Route path="/email-diagnostics" element={<EmailDiagnostics />} />
                <Route
                  path="/profile-setup"
                  element={
                    <ProtectedRoute>
                      <ProfileSetup />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/auth"
                  element={
                    <PublicRoute>
                      <AuthFlow />
                    </PublicRoute>
                  }
                />
                <Route path="/auth/callback" element={<AuthCallback />} />
                <Route path="/auth/confirm" element={<EmailConfirmation />} />
                <Route path="/auth/email-confirmation" element={<EmailConfirmation />} />
                
                {/* ==================== PROTECTED DASHBOARD ROUTES ==================== */}
                <Route
                  path="/dashboard"
                  element={
                    <ProtectedRoute>
                      <DashboardLayout />
                    </ProtectedRoute>
                  }
                >
                  {/* Default dashboard route */}
                  <Route index element={<Navigate to="home" replace />} />
                  <Route path="home" element={<DashboardHome />} />

                  {/* Role-specific dashboards - organized by hierarchy */}
                  <Route path="roles" element={<RolesPage />}>
                    <Route path="chairperson" element={<ChairpersonDashboard />} />
                    <Route path="vice-chairperson" element={<ViceChairmanDashboard />} />
                    <Route path="secretary" element={<SecretaryRole />} />
                    <Route path="vice-secretary" element={<SecretaryRole />} />
                    <Route path="treasurer" element={<TreasurerRole />} />
                    <Route path="organizing-secretary" element={<OrganizingSecretaryDashboard />} />
                    <Route path="patron" element={<PatronDashboard />} />
                    <Route path="admin" element={<AdminDashboard />} />
                  </Route>

                  {/* Legacy role routes - redirect to new structure */}
                  <Route path="chairperson" element={<Navigate to="/dashboard/roles/chairperson" replace />} />
                  <Route path="vice-chairperson" element={<Navigate to="/dashboard/roles/vice-chairperson" replace />} />
                  <Route path="secretary-role" element={<Navigate to="/dashboard/roles/secretary" replace />} />
                  <Route path="vice-secretary" element={<Navigate to="/dashboard/roles/vice-secretary" replace />} />
                  <Route path="treasurer-role" element={<Navigate to="/dashboard/roles/treasurer" replace />} />
                  <Route path="organizing-secretary" element={<Navigate to="/dashboard/roles/organizing-secretary" replace />} />
                  <Route path="patron" element={<Navigate to="/dashboard/roles/patron" replace />} />
                  <Route path="admin" element={<Navigate to="/dashboard/roles/admin" replace />} />

                  {/* Financial management */}
                  <Route path="finance">
                    <Route path="contributions" element={<ContributionsPage />} />
                    <Route path="all-contributions" element={<AllContributionsPage />} />
                    <Route path="treasurer-dashboard" element={<TreasurerDashboard />} />
                    <Route path="mpesa" element={<PaymentsManagement />} />
                    <Route path="membership-fees" element={<MembershipFeesPage />} />
                    <Route path="reports" element={<ReportsPage />} />
                  </Route>

                  {/* Member management */}
                  <Route path="members">
                    <Route index element={<MembersPage />} />
                    <Route path="welfare" element={<WelfarePage />} />
                    <Route path="welfare-management" element={<WelfareManagement />} />
                    <Route path="discipline" element={<DisciplinePage />} />
                  </Route>

                  {/* Governance */}
                  <Route path="governance">
                    <Route path="meetings" element={<MeetingsPage />} />
                    <Route path="voting" element={<VotingPage />} />
                    <Route path="handover" element={<RoleHandoverPage />} />
                    <Route path="secretary-dashboard" element={<SecretaryDashboard />} />
                  </Route>

                  {/* Communication */}
                  <Route path="communication">
                    <Route path="announcements" element={<AnnouncementsPage />} />
                    <Route path="messages" element={<PrivateMessagesPage />} />
                    <Route path="notifications" element={<NotificationsPage />} />
                  </Route>

                  {/* Admin functions */}
                  <Route path="admin-panel">
                    <Route path="approvals" element={<ApprovalsPage />} />
                    <Route path="jobs" element={<JobsModerationPage />} />
                  </Route>

                  {/* User profile */}
                  <Route path="profile" element={<ProfilePage />} />

                  {/* Legacy routes - redirect to new structure */}
                  <Route path="contributions" element={<Navigate to="/dashboard/finance/contributions" replace />} />
                  <Route path="all-contributions" element={<Navigate to="/dashboard/finance/all-contributions" replace />} />
                  <Route path="treasurer" element={<Navigate to="/dashboard/finance/treasurer-dashboard" replace />} />
                  <Route path="mpesa-management" element={<Navigate to="/dashboard/finance/mpesa" replace />} />
                  <Route path="reports" element={<Navigate to="/dashboard/finance/reports" replace />} />
                  <Route path="welfare" element={<Navigate to="/dashboard/members/welfare" replace />} />
                  <Route path="discipline" element={<Navigate to="/dashboard/members/discipline" replace />} />
                  <Route path="members" element={<Navigate to="/dashboard/members" replace />} />
                  <Route path="meetings" element={<Navigate to="/dashboard/governance/meetings" replace />} />
                  <Route path="voting" element={<Navigate to="/dashboard/governance/voting" replace />} />
                  <Route path="role-handover" element={<Navigate to="/dashboard/governance/handover" replace />} />
                  <Route path="secretary" element={<Navigate to="/dashboard/governance/secretary-dashboard" replace />} />
                  <Route path="announcements" element={<Navigate to="/dashboard/communication/announcements" replace />} />
                  <Route path="notifications" element={<Navigate to="/dashboard/communication/notifications" replace />} />
                  <Route path="community" element={<Navigate to="/dashboard/communication/messages" replace />} />
                  <Route path="chat" element={<Navigate to="/dashboard/communication/messages" replace />} />
                  <Route path="approvals" element={<Navigate to="/dashboard/admin-panel/approvals" replace />} />
                  <Route path="jobs" element={<Navigate to="/dashboard/admin-panel/jobs" replace />} />
                </Route>

                {/* ==================== ERROR PAGES ==================== */}
                <Route path="*" element={<NotFound />} />
              </Routes>
            </Suspense>
          </BrowserRouter>
        </TooltipProvider>

        {/* React Query DevTools - only in development */}
        {import.meta.env.DEV && <ReactQueryDevtools initialIsOpen={false} />}
      </QueryClientProvider>
    </ErrorBoundary>
  );
};

export default App;
