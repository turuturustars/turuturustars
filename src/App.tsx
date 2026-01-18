import { Suspense, lazy } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ErrorBoundary } from "react-error-boundary";

// Loading component for suspense fallback
const PageLoader = () => (
  <div className="flex h-screen w-full items-center justify-center">
    <div className="flex flex-col items-center gap-4">
      <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      <p className="text-sm text-muted-foreground">Loading...</p>
    </div>
  </div>
);

// Error fallback component
const ErrorFallback = ({ error, resetErrorBoundary }: any) => (
  <div className="flex h-screen w-full flex-col items-center justify-center gap-4 p-4">
    <div className="text-center">
      <h1 className="text-2xl font-bold text-destructive">Something went wrong</h1>
      <p className="mt-2 text-sm text-muted-foreground">{error.message}</p>
    </div>
    <button
      onClick={resetErrorBoundary}
      className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary-hover"
    >
      Try again
    </button>
  </div>
);

// Lazy-loaded components
const Index = lazy(() => import("./pages/Index"));
const Home = lazy(() => import("./pages/Home"));
const About = lazy(() => import("./pages/About"));
const Pillars = lazy(() => import("./pages/Pillars"));
const Careers = lazy(() => import("./pages/Careers"));
const Leadership = lazy(() => import("./pages/Leadership"));
const Register = lazy(() => import("./pages/Register"));
const Auth = lazy(() => import("./pages/Auth"));
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

// Feature pages
const ContributionsPage = lazy(() => import("./pages/dashboard/ContributionsPage"));
const WelfarePage = lazy(() => import("./pages/dashboard/WelfarePage"));
const WelfareManagement = lazy(() => import("./pages/dashboard/WelfareManagement"));
const ProfilePage = lazy(() => import("./pages/dashboard/ProfilePage"));
const AnnouncementsPage = lazy(() => import("./pages/dashboard/AnnouncementsPage"));
const MembersPage = lazy(() => import("./pages/dashboard/MembersPage"));
const ApprovalsPage = lazy(() => import("./pages/dashboard/ApprovalsPage"));
const AllContributionsPage = lazy(() => import("./pages/dashboard/AllContributionsPage"));
const ReportsPage = lazy(() => import("./pages/dashboard/ReportsPage"));
const TreasurerDashboard = lazy(() => import("./pages/dashboard/TreasurerDashboard"));
const SecretaryDashboard = lazy(() => import("./pages/dashboard/SecretaryDashboard"));
const MpesaManagement = lazy(() => import("./pages/dashboard/MpesaManagement"));
const MeetingsPage = lazy(() => import("./pages/dashboard/MeetingsPage"));
const DisciplinePage = lazy(() => import("./pages/dashboard/DisciplinePage"));
const VotingPage = lazy(() => import("./pages/dashboard/VotingPage"));
const RoleHandoverPage = lazy(() => import("./pages/dashboard/RoleHandoverPage"));
const PrivateMessagesPage = lazy(() => import("./pages/dashboard/PrivateMessagesPage"));

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
  return (
    <ErrorBoundary FallbackComponent={ErrorFallback} onReset={() => globalThis.location.href = "/"}>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider delayDuration={300}>
          <Toaster />
          <Sonner />
          <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
            <Suspense fallback={<PageLoader />}>
              <Routes>
                {/* Public routes */}
                <Route path="/" element={<Index />} />
                <Route path="/home" element={<Home />} />
                <Route path="/about" element={<About />} />
                <Route path="/pillars" element={<Pillars />} />
                <Route path="/careers" element={<Careers />} />
                <Route path="/leadership" element={<Leadership />} />
                <Route path="/register" element={<Register />} />
                <Route path="/auth" element={<Auth />} />

                {/* Dashboard routes */}
                <Route path="/dashboard" element={<DashboardLayout />}>
                  {/* Default dashboard route */}
                  <Route index element={<Navigate to="home" replace />} />
                  <Route path="home" element={<DashboardHome />} />

                  {/* Role-specific dashboards - organized by hierarchy */}
                  <Route path="roles">
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
                    <Route path="mpesa" element={<MpesaManagement />} />
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
                  </Route>

                  {/* Admin functions */}
                  <Route path="admin-panel">
                    <Route path="approvals" element={<ApprovalsPage />} />
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
                  <Route path="approvals" element={<Navigate to="/dashboard/admin-panel/approvals" replace />} />
                </Route>

                {/* 404 - Not Found */}
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