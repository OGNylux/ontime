import {
  Box,
  Container,
  Typography,
  Button,
  Divider,
  ToggleButtonGroup,
  ToggleButton,
  ButtonBase,
} from "@mui/material";
import { authService } from "../../services/authService";
import { useNavigate } from "react-router-dom";
import { useThemeMode } from "../../hooks/useThemeMode";
import { useSnackbar } from "../../hooks/useSnackbar";

export default function SettingsPage() {
  const { showError } = useSnackbar();
  const { mode, setLightMode, setDarkMode, setSystemMode } = useThemeMode();
  const navigate = useNavigate();

  const sections = [
    {
      title: "Workspace Settings",
      description: "Timezone, currency, company details, and members.",
      path: "/settings/workspace",
    },
    {
      title: "Billing & Bank",
      description: "Billing address and bank details for invoices.",
      path: "/settings/billing",
    },
    {
      title: "User Settings",
      description: "Profile details and password changes.",
      path: "/settings/account",
    },
    {
      title: "Calendar Settings",
      description: "Start of week and time format.",
      path: "/settings/calendar",
    },
  ];

  const handleThemeChange = (_: React.MouseEvent<HTMLElement>, value: string | null) => {
    if (!value) return;
    if (value === "light") setLightMode();
    else if (value === "dark") setDarkMode();
    else if (value === "system") setSystemMode();
  };

  return (
    <Box height="100%" display="flex" flexDirection="column">
      <Box borderRadius={2} boxShadow={4} bgcolor="background.default">
        <Box pl={3} py={2}>
          <Typography variant="h4" fontWeight="bold">
            Settings
          </Typography>
        </Box>
      </Box>

      <Box display="flex" flexDirection="column" gap={1} mt={1}>
        {sections.map((section) => (
          <ButtonBase
            key={section.path}
            onClick={() => navigate(section.path)}
            sx={{ textAlign: "left", width: "100%", borderRadius: 2 }}
          >
            <Box
              width="100%"
              p={2}
              borderRadius={2}
              boxShadow={4}
              bgcolor="background.default"
              border="1px solid"
              borderColor="divider"
              sx={{
                transition: "border-color 0.2s, box-shadow 0.2s",
                "&:hover": { borderColor: "primary.main", boxShadow: 6 },
              }}
            >
              <Typography variant="h6" fontWeight={700} gutterBottom>
                {section.title}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {section.description}
              </Typography>
            </Box>
          </ButtonBase>
        ))}
      </Box>

      <Box display="flex" flexDirection="column" gap={1} mt={1}>
        <Box p={2} borderRadius={2} boxShadow={4} bgcolor="background.default" border="1px solid" borderColor="divider">
          <Typography variant="h6" gutterBottom>Appearance</Typography>
          <Divider sx={{ mb: 2 }} />

          <Typography variant="body2" color="text.secondary" mb={1}>
            Theme mode
          </Typography>
          <ToggleButtonGroup
            exclusive
            value={mode}
            onChange={handleThemeChange}
            size="small"
          >
            <ToggleButton value="light">Light</ToggleButton>
            <ToggleButton value="dark">Dark</ToggleButton>
            <ToggleButton value="system">System</ToggleButton>
          </ToggleButtonGroup>
        </Box>

        <Box
          p={2}
          borderRadius={2}
          boxShadow={4}
          bgcolor="background.default"
          display="flex"
          justifyContent="center"
          alignItems="center"
          border="1px solid"
          borderColor="divider"
        >
          <Button
            variant="outlined"
            color="error"
            onClick={async () => {
              try {
                await authService.logout();
                navigate("/login");
              } catch (e) {
                showError("Failed to logout", e instanceof Error ? e.message : undefined);
              }
            }}
          >
            Logout
          </Button>
        </Box>
      </Box>
    </Box>
  );
}
