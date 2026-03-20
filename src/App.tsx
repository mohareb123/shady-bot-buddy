import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Index from "./pages/Index.tsx";
import Dashboard from "./pages/Dashboard.tsx";
import MembersPage from "./pages/MembersPage.tsx";
import GroupsPage from "./pages/GroupsPage.tsx";
import LogsPage from "./pages/LogsPage.tsx";
import ResponsesPage from "./pages/ResponsesPage.tsx";
import QuestionsPage from "./pages/QuestionsPage.tsx";
import NotFound from "./pages/NotFound.tsx";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/members" element={<MembersPage />} />
          <Route path="/groups" element={<GroupsPage />} />
          <Route path="/logs" element={<LogsPage />} />
          <Route path="/responses" element={<ResponsesPage />} />
          <Route path="/questions" element={<QuestionsPage />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
