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
import Navbar from "./components/Navigation/Navbar";
import Sidebar from "./components/Navigation/Sidebar";
import BottomAppBar from "./components/Navigation/BottomAppBar";
import { supabase } from "./lib/supabase";
import type { User } from "@supabase/supabase-js";
import { ThemeProvider } from "@mui/material/styles";
import { CssBaseline, Box, useMediaQuery, useTheme } from "@mui/material";
import theme from "./theme";
import { platform } from "@tauri-apps/plugin-os";

function AppLayout() {
  const muiTheme = useTheme();
  const isSmallDesktop = useMediaQuery(muiTheme.breakpoints.down("lg"));
  const location = useLocation();
  const navigate = useNavigate();
  const hideNav = location.pathname === "/login" || location.pathname === "/register";
  const [_, setUser] = useState<User | null>(null);
  const [isTauriMobile, setIsTauriMobile] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Check if running in Tauri mobile app
  useEffect(() => {
    const checkPlatform = async () => {
      try {
        const platformType = await platform();
        setIsTauriMobile(platformType === 'android' || platformType === 'ios');
      } catch {
        // Not running in Tauri
        setIsTauriMobile(false);
      }
    };
    checkPlatform();
  }, []);

  useEffect(() => {
    let mounted = true;
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!mounted) return;
      setUser(user);
      if (!user && location.pathname !== "/login" && location.pathname !== "/register") {
        navigate("/login", { replace: true });
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      const u = session?.user ?? null;
      setUser(u);
      if (!u && location.pathname !== "/login" && location.pathname !== "/register") {
        navigate("/login", { replace: true });
      }
    });

    return () => {
      mounted = false;
      subscription?.unsubscribe();
    };
  }, [location.pathname, navigate]);

  return (
    <Box bgcolor="background.paper" display="flex" flexDirection="column" height="100vh" overflow="hidden">
      {/* Desktop: Top Navbar */}
      {!isTauriMobile && !hideNav && <Navbar showMenuButton={isSmallDesktop} onMenuClick={() => setSidebarOpen(!sidebarOpen)} />}
      
      <Box 
        display="flex"
        flexDirection="row"
        pt={(!isTauriMobile && !hideNav) ? { xs: 7, md: 8 } : 0}
        pb={(isTauriMobile && !hideNav) ? '80px' : 0}
        flex={1}
        minHeight={0}
        overflow="hidden"
      >
        {/* Desktop: Sidebar */}
        {!isTauriMobile && !hideNav && (
          <Sidebar 
            isDrawer={isSmallDesktop} 
            open={sidebarOpen} 
            onClose={() => setSidebarOpen(false)} 
          />
        )}
        
        <Box component="main" display="flex" flex={1} flexDirection="column" overflow="hidden" minWidth={0} minHeight={0} padding={1.5}>
          <Routes>
            <Route path="/" element={<Timer />} />
            <Route path="/timer" element={<Timer />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/projects" element={<ProjectsPage />} />
            <Route path="/clients" element={<ClientsPage />} />
            <Route path="/tasks" element={<TasksPage />} />
          </Routes>
        </Box>
      </Box>

      {/* Mobile: Bottom App Bar - Only on Tauri Mobile */}
      {isTauriMobile && !hideNav && <BottomAppBar />}
    </Box>
  );
}

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <BrowserRouter>
        <AppLayout />
      </BrowserRouter>
    </ThemeProvider>
  </React.StrictMode>,
);
