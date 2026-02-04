import { useEffect, useState } from "react";
import { Box, Container, TextField, Typography, Button, Divider, Grid, Alert, ToggleButtonGroup, ToggleButton, Autocomplete } from "@mui/material";
import PageHeader from "../../components/PageHeader";
import LoadingBanner from "../../components/Loading/LoadingBanner";
import { userService, OntimeUser } from "../../services/userService";
import { authService } from "../../services/authService";
import { useNavigate } from 'react-router-dom';
import { useThemeMode } from "../../hooks/useThemeMode";
import { TIMEZONE_OPTIONS, getBrowserTimezone } from "../../lib/timezone";
import { notifyTimezoneChange } from "../../hooks/useUserTimezone";

export default function SettingsPage() {
  const [, setUser] = useState<OntimeUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [timezone, setTimezone] = useState("");

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const { mode, setLightMode, setDarkMode, setSystemMode } = useThemeMode();
  const navigate = useNavigate();

  useEffect(() => {
    const load = async () => {
      try {
        const current = await userService.getCurrentUser();
        if (current) {
          setUser(current);
          setName(current.name ?? "");
          setEmail(current.email ?? "");
          setTimezone(current.timezone ?? getBrowserTimezone() ?? "UTC");
        }
      } catch (e: any) {
        setError(e.message || "Failed to load user settings");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const handleProfileSave = async () => {
    setError(null);
    setSuccess(null);
    try {
      const updated = await userService.updateProfile({ name, email, timezone });
      setUser(updated);
      setSuccess("Profile updated successfully");
            if (updated.timezone) {
        notifyTimezoneChange(updated.timezone);
      }
    } catch (e: any) {
      setError(e.message || "Failed to update profile");
    }
  };

  const handlePasswordSave = async () => {
    setError(null);
    setSuccess(null);
    if (!currentPassword) {
      setError("Please enter your current password");
      return;
    }
    if (!newPassword || newPassword !== confirmPassword) {
      setError("New passwords do not match");
      return;
    }
    try {
      await userService.updatePassword(currentPassword, newPassword);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setSuccess("Password updated successfully");
    } catch (e: any) {
      setError(e.message || "Failed to update password");
    }
  };

  const handleThemeChange = (_: React.MouseEvent<HTMLElement>, value: string | null) => {
    if (!value) return;
    if (value === "light") setLightMode();
    else if (value === "dark") setDarkMode();
    else if (value === "system") setSystemMode();
  };

  if (loading) {
    return (
      <LoadingBanner message="Loading settings..." />
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 3 }}>
      <PageHeader title="Settings" />

      <Grid container spacing={3}>
        <Grid size={{ xs: 12, md: 8 }}>
          <Box p={2} borderRadius={2} boxShadow={4} bgcolor="background.default" mb={3}>
            <Typography variant="h6" gutterBottom>
              User Settings
            </Typography>
            <Divider sx={{ mb: 2 }} />

            {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
            {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}

            <Grid container spacing={2}>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  label="Name"
                  fullWidth
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  label="Email"
                  type="email"
                  fullWidth
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <Autocomplete
                  options={TIMEZONE_OPTIONS}
                  getOptionLabel={(option) => typeof option === 'string' ? option : option.label}
                  value={TIMEZONE_OPTIONS.find((opt) => opt.value === timezone) || { value: timezone, label: timezone }}
                  onChange={(_, newValue) => {
                    if (newValue) {
                      setTimezone(typeof newValue === 'string' ? newValue : newValue.value);
                    }
                  }}
                  isOptionEqualToValue={(option, value) => option.value === value.value}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="Timezone"
                      helperText="Select your timezone"
                    />
                  )}
                  freeSolo
                  autoHighlight
                />
              </Grid>
            </Grid>

            <Box mt={3} display="flex" justifyContent="flex-end">
              <Button variant="contained" onClick={handleProfileSave}>
                Save Profile
              </Button>
            </Box>
          </Box>

          <Box p={2} borderRadius={2} boxShadow={4} bgcolor="background.default">
            <Typography variant="h6" gutterBottom>
              Change Password
            </Typography>
            <Divider sx={{ mb: 2 }} />

            <Grid container spacing={2}>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  label="Current Password"
                  type="password"
                  fullWidth
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  label="New Password"
                  type="password"
                  fullWidth
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  label="Confirm Password"
                  type="password"
                  fullWidth
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
              </Grid>
            </Grid>

            <Box mt={3} display="flex" justifyContent="flex-end">
              <Button variant="contained" onClick={handlePasswordSave}>
                Update Password
              </Button>
            </Box>
          </Box>
        </Grid>

        <Grid size={{ xs: 12, md: 4 }}>
          <Box p={2} borderRadius={2} boxShadow={4} bgcolor="background.default">
            <Typography variant="h6" gutterBottom>
              Appearance
            </Typography>
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
        </Grid>
        
          
        <Grid size={{ xs: 12, sm: 8 }}>
          <Box p={2} borderRadius={2} boxShadow={4} bgcolor="background.default" display="flex" justifyContent="center" alignItems="center" height="100%">
              <Button
                variant="outlined"
                color="error"
                onClick={async () => {
                  try {
                    await authService.logout();
                    navigate('/login');
                  } catch (e: any) {
                    setError(e.message || 'Failed to logout');
                  }
                }}
              >
                Logout
              </Button>
            </Box>
        </Grid>
      </Grid>
    </Container>
  );
}
