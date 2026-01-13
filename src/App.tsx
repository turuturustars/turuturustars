import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import DashboardLayout from "./layouts/DashboardLayout";
import DashboardHome from "./pages/dashboard/DashboardHome";
import ContributionsPage from "./pages/dashboard/ContributionsPage";
import WelfarePage from "./pages/dashboard/WelfarePage";
import ProfilePage from "./pages/dashboard/ProfilePage";
import AnnouncementsPage from "./pages/dashboard/AnnouncementsPage";
import MembersPage from "./pages/dashboard/MembersPage";
import ApprovalsPage from "./pages/dashboard/ApprovalsPage";
import AllContributionsPage from "./pages/dashboard/AllContributionsPage";
import ReportsPage from "./pages/dashboard/ReportsPage";
import TreasurerDashboard from "./pages/dashboard/TreasurerDashboard";
import SecretaryDashboard from "./pages/dashboard/SecretaryDashboard";
import MpesaManagement from "./pages/dashboard/MpesaManagement";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/dashboard" element={<DashboardLayout />}>
            <Route index element={<DashboardHome />} />
            <Route path="contributions" element={<ContributionsPage />} />
            <Route path="welfare" element={<WelfarePage />} />
            <Route path="profile" element={<ProfilePage />} />
            <Route path="announcements" element={<AnnouncementsPage />} />
            <Route path="members" element={<MembersPage />} />
            <Route path="approvals" element={<ApprovalsPage />} />
            <Route path="all-contributions" element={<AllContributionsPage />} />
            <Route path="reports" element={<ReportsPage />} />
            <Route path="treasurer" element={<TreasurerDashboard />} />
            <Route path="secretary" element={<SecretaryDashboard />} />
            <Route path="mpesa" element={<MpesaManagement />} />
          </Route>
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
