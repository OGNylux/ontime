import React, { useEffect } from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route, useNavigate, Navigate } from "react-router-dom";
import Timer from "./routes/timer/page";
import LoginPage from "./routes/login/page";
import "./App.css";
import RegisterPage from "./routes/register/page";
import ProjectsPage from "./routes/projects/page";
import ClientsPage from "./routes/clients/page";
import TasksPage from "./routes/tasks/page";
import OverviewPage from "./routes/overview/page";
import SettingsPage from "./routes/settings/page";
import SettingsCalendarPage from "./routes/settings/calendar/page";
import SettingsWorkspacePage from "./routes/settings/workspace/page";
import SettingsBillingPage from "./routes/settings/billing/page";
import SettingsAccountPage from "./routes/settings/account/page";
import { ThemeProvider } from "@mui/material/styles";
import { CssBaseline, Box } from "@mui/material";
import theme from "./theme";
import NotificationsPage from "./routes/notifications/page";
import InvoicesPage from "./routes/invoices/page";
import { NotificationsProvider } from "./hooks/useNotifications";
import { SnackbarProvider } from "./hooks/useSnackbar";
import AppSnackbar from "./components/AppSnackbar";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider, useAuth } from "./hooks/useAuth";
import { ProtectedRoute } from "./components/ProtectedRoute";
import WorkspaceRoute from "./components/WorkspaceRoute";
import { getActiveWorkspaceId } from "./services/workspaceContext";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

function WorkspaceBootstrap() {
  const { user, isLoading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (isLoading) return;
    if (!user) { navigate("/login", { replace: true }); return; }
    getActiveWorkspaceId()
      .then((id) => navigate(`/w/${id}/timer`, { replace: true }))
      .catch(() => navigate("/login", { replace: true }));
  }, [user, isLoading, navigate]);

  return null;
}

function AppLayout() {
  return (
    <SnackbarProvider>
      <AppSnackbar />
      <NotificationsProvider>
        <Box bgcolor="background.paper" display="flex" flexDirection="column" height="100vh" overflow="hidden">
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/" element={<WorkspaceBootstrap />} />
            <Route element={<ProtectedRoute />}>
              <Route path="/w/:workspaceId" element={<WorkspaceRoute />}>
                <Route path="timer" element={<Timer />} />
                <Route path="projects" element={<ProjectsPage />} />
                <Route path="clients" element={<ClientsPage />} />
                <Route path="tasks" element={<TasksPage />} />
                <Route path="overview" element={<OverviewPage />} />
                <Route path="notifications" element={<NotificationsPage />} />
                <Route path="invoices" element={<InvoicesPage />} />
                <Route path="settings" element={<SettingsPage />} />
                <Route path="settings/calendar" element={<SettingsCalendarPage />} />
                <Route path="settings/workspace" element={<SettingsWorkspacePage />} />
                <Route path="settings/billing" element={<SettingsBillingPage />} />
                <Route path="settings/account" element={<SettingsAccountPage />} />
              </Route>
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Box>
      </NotificationsProvider>
    </SnackbarProvider>
  );
}

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <BrowserRouter basename={import.meta.env.BASE_URL}>
          <AuthProvider>
            <AppLayout />
          </AuthProvider>
        </BrowserRouter>
      </ThemeProvider>
    </QueryClientProvider>
  </React.StrictMode>,
);
