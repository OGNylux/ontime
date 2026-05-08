import React, { useEffect, useState } from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route, useLocation, useNavigate } from "react-router-dom";
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
import Sidebar from "./components/Navigation/Sidebar";
import BottomAppBar from "./components/Navigation/BottomAppBar";
import { ThemeProvider } from "@mui/material/styles";
import { CssBaseline, Box, useMediaQuery, useTheme } from "@mui/material";
import theme from "./theme";
import { platform } from "@tauri-apps/plugin-os";
import NotificationsPage from "./routes/notifications/page";
import InvoicesPage from "./routes/invoices/page";
import { NotificationsProvider } from "./hooks/useNotifications";
import { SnackbarProvider } from "./hooks/useSnackbar";
import AppSnackbar from "./components/AppSnackbar";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider, useAuth } from "./hooks/useAuth";
import { ProtectedRoute } from "./components/ProtectedRoute";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

function AppLayout() {
  const muiTheme = useTheme();
  const isSmallDesktop = useMediaQuery(muiTheme.breakpoints.down("lg"));
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const hideNav = location.pathname === "/login" || location.pathname === "/register";
  const [isTauriMobile, setIsTauriMobile] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    try {
      const platformType = platform();
      setIsTauriMobile(platformType === 'android' || platformType === 'ios');
    } catch {
      setIsTauriMobile(false);
    }
  }, []);

  useEffect(() => {
    if (user && location.pathname === "/") navigate("/timer", { replace: true });
  }, [user, location.pathname, navigate]);

  return (
    <SnackbarProvider>
    <AppSnackbar />
    <NotificationsProvider>
    <Box bgcolor="background.paper" display="flex" flexDirection="column" height="100vh" overflow="hidden">
      <Box
        display="flex"
        flexDirection="row"
        pb={(isTauriMobile && !hideNav) ? '80px' : 0}
        flex={1}
        minHeight={0}
        overflow="hidden"
      >
        {!isTauriMobile && !hideNav && (
          <Sidebar
            isDrawer={isSmallDesktop}
            open={sidebarOpen}
            onClose={() => setSidebarOpen(false)}
          />
        )}

        <Box component="main" display="flex" flex={1} flexDirection="column" overflow="auto" minWidth={0} minHeight={0} padding={1.5}>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route element={<ProtectedRoute />}>
              <Route path="/" element={<Timer />} />
              <Route path="/timer" element={<Timer />} />
              <Route path="/projects" element={<ProjectsPage />} />
              <Route path="/clients" element={<ClientsPage />} />
              <Route path="/tasks" element={<TasksPage />} />
              <Route path="/overview" element={<OverviewPage />} />
              <Route path="/settings" element={<SettingsPage />} />
              <Route path="/settings/calendar" element={<SettingsCalendarPage />} />
              <Route path="/settings/workspace" element={<SettingsWorkspacePage />} />
              <Route path="/settings/billing" element={<SettingsBillingPage />} />
              <Route path="/settings/account" element={<SettingsAccountPage />} />
              <Route path="/notifications" element={<NotificationsPage />} />
              <Route path="/invoices" element={<InvoicesPage />} />
            </Route>
          </Routes>
        </Box>
      </Box>

      {isTauriMobile && !hideNav && <BottomAppBar />}
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
