import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import Index from "./pages/Index.tsx";
import LoginPage from "./pages/LoginPage.tsx";
import Dashboard from "./pages/Dashboard.tsx";
import MembersPage from "./pages/MembersPage.tsx";
import GroupsPage from "./pages/GroupsPage.tsx";
import LogsPage from "./pages/LogsPage.tsx";
import ResponsesPage from "./pages/ResponsesPage.tsx";
import QuestionsPage from "./pages/QuestionsPage.tsx";
import NotificationsPage from "./pages/NotificationsPage.tsx";
import NotFound from "./pages/NotFound.tsx";

const queryClient = new QueryClient();

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

const AppRoutes = () => (
  <Routes>
    <Route path="/" element={<Index />} />
    <Route path="/login" element={<LoginPage />} />
    <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
    <Route path="/members" element={<ProtectedRoute><MembersPage /></ProtectedRoute>} />
    <Route path="/groups" element={<ProtectedRoute><GroupsPage /></ProtectedRoute>} />
    <Route path="/logs" element={<ProtectedRoute><LogsPage /></ProtectedRoute>} />
    <Route path="/responses" element={<ProtectedRoute><ResponsesPage /></ProtectedRoute>} />
    <Route path="/questions" element={<ProtectedRoute><QuestionsPage /></ProtectedRoute>} />
    <Route path="/notifications" element={<ProtectedRoute><NotificationsPage /></ProtectedRoute>} />
    <Route path="*" element={<NotFound />} />
  </Routes>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <AuthProvider>
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
