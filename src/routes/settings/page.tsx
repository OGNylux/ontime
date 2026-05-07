import { useEffect, useState } from "react";
import {
  Box, Container, TextField, Typography, Button, Divider,
  Grid, ToggleButtonGroup, ToggleButton, Autocomplete,
  Switch, FormControlLabel,
} from "@mui/material";
import { useSnackbar } from "../../hooks/useSnackbar";
import PageHeader from "../../components/PageHeader";
import LoadingBanner from "../../components/Loading/LoadingBanner";
import { userService, OntimeUser } from "../../services/userService";
import { authService } from "../../services/authService";
import { useNavigate } from "react-router-dom";
import { useThemeMode } from "../../hooks/useThemeMode";
import { TIMEZONE_OPTIONS, getBrowserTimezone } from "../../lib/timezone";
import { notifyTimezoneChange } from "../../hooks/useUserTimezone";
import { useCalendarPreferences } from "../../hooks/useCalendarPreferences";
import { workspaceService, WorkspaceBilling } from "../../services/workspaceService";
import { getActiveWorkspaceId } from "../../services/workspaceContext";
import WorkspaceMembersCard from "./WorkspaceMembersCard";

export default function SettingsPage() {
  const { showError, showSuccess } = useSnackbar();
  const [, setUser] = useState<OntimeUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [workspaceId, setWorkspaceId] = useState<string | null>(null);

  const [timezone, setTimezone] = useState("");
  const [currency, setCurrency] = useState(() => localStorage.getItem("ontime_currency") ?? "EUR");
  const [billing, setBilling] = useState<WorkspaceBilling>({});

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const { mode, setLightMode, setDarkMode, setSystemMode } = useThemeMode();
  const { prefs, update: updatePrefs } = useCalendarPreferences();
  const navigate = useNavigate();

  useEffect(() => {
    const load = async () => {
      try {
        const [current, wid] = await Promise.all([
          userService.getCurrentUser(),
          getActiveWorkspaceId(),
        ]);
        if (current) {
          setUser(current);
          setName(current.name ?? "");
          setEmail(current.email ?? "");
          setTimezone(current.timezone ?? getBrowserTimezone() ?? "UTC");
        }
        setWorkspaceId(wid);
        const billingData = await workspaceService.getBilling(wid);
        if (billingData) setBilling(billingData);
      } catch (e) {
        showError("Failed to load settings", e instanceof Error ? e.message : undefined);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const handleInvoiceSave = async () => {
    try {
      const wid = workspaceId ?? (await getActiveWorkspaceId());
      const [updated] = await Promise.all([
        userService.updateProfile({ timezone }),
        workspaceService.saveBilling(wid, billing),
      ]);
      if (updated.timezone) notifyTimezoneChange(updated.timezone);
      localStorage.setItem("ontime_currency", currency);
      showSuccess("Workspace settings saved");
    } catch (e) {
      showError("Failed to save workspace settings", e instanceof Error ? e.message : undefined);
    }
  };

  const handleProfileSave = async () => {
    try {
      const updated = await userService.updateProfile({ name, email });
      setUser(updated);
      showSuccess("Profile updated");
    } catch (e) {
      showError("Failed to update profile", e instanceof Error ? e.message : undefined);
    }
  };

  const handlePasswordSave = async () => {
    if (!currentPassword) {
      showError("Please enter your current password");
      return;
    }
    if (!newPassword || newPassword !== confirmPassword) {
      showError("New passwords do not match");
      return;
    }
    try {
      await userService.updatePassword(currentPassword, newPassword);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      showSuccess("Password updated");
    } catch (e) {
      showError("Failed to update password", e instanceof Error ? e.message : undefined);
    }
  };

  const handleThemeChange = (_: React.MouseEvent<HTMLElement>, value: string | null) => {
    if (!value) return;
    if (value === "light") setLightMode();
    else if (value === "dark") setDarkMode();
    else if (value === "system") setSystemMode();
  };

  if (loading) return <LoadingBanner message="Loading settings..." />;

  return (
    <Container maxWidth="lg" sx={{ py: 3 }}>
      <PageHeader title="Settings" />

      <Grid container spacing={3}>
        {/* ── Left column ── */}
        <Grid size={{ xs: 12, md: 8 }}>

          {/* Calendar Settings */}
          <Box p={2} borderRadius={2} boxShadow={4} bgcolor="background.default" mb={3}>
            <Typography variant="h6" gutterBottom>Calendar Settings</Typography>
            <Divider sx={{ mb: 2 }} />

            <Grid container spacing={2} alignItems="center">
              <Grid size={{ xs: 12, sm: 6 }}>
                <Typography variant="body2" color="text.secondary" mb={1}>Start of week</Typography>
                <ToggleButtonGroup
                  exclusive
                  value={prefs.startOfWeek}
                  onChange={(_, v) => v && updatePrefs({ startOfWeek: v })}
                  size="small"
                >
                  <ToggleButton value="monday">Monday</ToggleButton>
                  <ToggleButton value="sunday">Sunday</ToggleButton>
                </ToggleButtonGroup>
              </Grid>

              <Grid size={{ xs: 12, sm: 6 }}>
                <Typography variant="body2" color="text.secondary" mb={1}>Time format</Typography>
                <ToggleButtonGroup
                  exclusive
                  value={prefs.timeFormat}
                  onChange={(_, v) => v && updatePrefs({ timeFormat: v })}
                  size="small"
                >
                  <ToggleButton value="24h">24h</ToggleButton>
                  <ToggleButton value="12h">AM / PM</ToggleButton>
                </ToggleButtonGroup>
              </Grid>

              <Grid size={{ xs: 12 }}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={prefs.showWeekBar}
                      onChange={(e) => updatePrefs({ showWeekBar: e.target.checked })}
                    />
                  }
                  label="Show percentage bar for current / hovered week"
                />
              </Grid>
            </Grid>
          </Box>

          {/* ── WORKSPACE SETTINGS ── */}

          {/* Invoice Info */}
          <Box p={2} borderRadius={2} boxShadow={4} bgcolor="background.default" mb={3}>
            <Typography variant="h6" gutterBottom>Workspace Settings</Typography>
            <Divider sx={{ mb: 2 }} />

            <Grid container spacing={2}>
              {/* Timezone & Currency */}
              <Grid size={{ xs: 12, sm: 6 }}>
                <Autocomplete
                  options={TIMEZONE_OPTIONS}
                  getOptionLabel={(option) =>
                    typeof option === "string" ? option : option.label
                  }
                  value={
                    TIMEZONE_OPTIONS.find((opt) => opt.value === timezone) || {
                      value: timezone,
                      label: timezone,
                    }
                  }
                  onChange={(_, newValue) => {
                    if (newValue)
                      setTimezone(typeof newValue === "string" ? newValue : newValue.value);
                  }}
                  isOptionEqualToValue={(option, value) => option.value === value.value}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="Timezone"
                      helperText="Affects how times appear on invoices"
                    />
                  )}
                  freeSolo
                  autoHighlight
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  label="Default Currency"
                  fullWidth
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value.toUpperCase())}
                  slotProps={{ htmlInput: { maxLength: 3 } }}
                  helperText="ISO code — e.g. EUR, USD, GBP"
                />
              </Grid>

              {/* Company */}
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  label="Company Name"
                  fullWidth
                  value={billing.company_name ?? ""}
                  onChange={(e) => setBilling((b) => ({ ...b, company_name: e.target.value }))}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  label="VAT Number"
                  fullWidth
                  value={billing.vat_number ?? ""}
                  onChange={(e) => setBilling((b) => ({ ...b, vat_number: e.target.value }))}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  label="Invoice Email"
                  type="email"
                  fullWidth
                  value={billing.email ?? ""}
                  onChange={(e) => setBilling((b) => ({ ...b, email: e.target.value }))}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  label="Phone"
                  fullWidth
                  value={billing.phone ?? ""}
                  onChange={(e) => setBilling((b) => ({ ...b, phone: e.target.value }))}
                />
              </Grid>

              {/* Address */}
              <Grid size={{ xs: 12, sm: 8 }}>
                <TextField
                  label="Street"
                  fullWidth
                  value={billing.street ?? ""}
                  onChange={(e) => setBilling((b) => ({ ...b, street: e.target.value }))}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 4 }}>
                <TextField
                  label="House Number"
                  fullWidth
                  value={billing.house_number ?? ""}
                  onChange={(e) => setBilling((b) => ({ ...b, house_number: e.target.value }))}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 4 }}>
                <TextField
                  label="Postal Code"
                  fullWidth
                  value={billing.postal_code ?? ""}
                  onChange={(e) => setBilling((b) => ({ ...b, postal_code: e.target.value }))}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 8 }}>
                <TextField
                  label="City"
                  fullWidth
                  value={billing.city ?? ""}
                  onChange={(e) => setBilling((b) => ({ ...b, city: e.target.value }))}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  label="State / Province"
                  fullWidth
                  value={billing.state ?? ""}
                  onChange={(e) => setBilling((b) => ({ ...b, state: e.target.value }))}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  label="Country"
                  fullWidth
                  value={billing.country ?? ""}
                  onChange={(e) => setBilling((b) => ({ ...b, country: e.target.value }))}
                />
              </Grid>

              {/* Bank */}
              <Grid size={{ xs: 12 }}>
                <Divider sx={{ mt: 1 }} />
                <Typography variant="body2" color="text.secondary" mt={2} mb={1}>Bank Details</Typography>
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  label="Bank Name"
                  fullWidth
                  value={billing.bank_name ?? ""}
                  onChange={(e) => setBilling((b) => ({ ...b, bank_name: e.target.value }))}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  label="Account Holder"
                  fullWidth
                  value={billing.account_holder ?? ""}
                  onChange={(e) => setBilling((b) => ({ ...b, account_holder: e.target.value }))}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 8 }}>
                <TextField
                  label="IBAN"
                  fullWidth
                  value={billing.iban ?? ""}
                  onChange={(e) => setBilling((b) => ({ ...b, iban: e.target.value }))}
                  slotProps={{ htmlInput: { style: { fontFamily: 'monospace' } } }}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 4 }}>
                <TextField
                  label="SWIFT / BIC"
                  fullWidth
                  value={billing.swift ?? ""}
                  onChange={(e) => setBilling((b) => ({ ...b, swift: e.target.value.toUpperCase() }))}
                  slotProps={{ htmlInput: { style: { fontFamily: 'monospace' } } }}
                />
              </Grid>
            </Grid>

            <Box mt={3} display="flex" justifyContent="flex-end">
              <Button variant="contained" onClick={handleInvoiceSave}>
                Save Workspace Settings
              </Button>
            </Box>
          </Box>

          {/* Members & Invites */}
          {workspaceId && <WorkspaceMembersCard workspaceId={workspaceId} />}

          {/* ── USER SETTINGS ── */}

          {/* Profile */}
          <Box p={2} borderRadius={2} boxShadow={4} bgcolor="background.default" mb={3}>
            <Typography variant="h6" gutterBottom>User Settings</Typography>
            <Divider sx={{ mb: 2 }} />

            <Grid container spacing={2}>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  label="Username"
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
            </Grid>

            <Box mt={3} display="flex" justifyContent="flex-end">
              <Button variant="contained" onClick={handleProfileSave}>
                Save Profile
              </Button>
            </Box>
          </Box>

          {/* Change Password */}
          <Box p={2} borderRadius={2} boxShadow={4} bgcolor="background.default" mb={3}>
            <Typography variant="h6" gutterBottom>Change Password</Typography>
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

        {/* ── Right column ── */}
        <Grid size={{ xs: 12, md: 4 }}>

          {/* Appearance */}
          <Box p={2} borderRadius={2} boxShadow={4} bgcolor="background.default" mb={3}>
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

          {/* Logout */}
          <Box
            p={2}
            borderRadius={2}
            boxShadow={4}
            bgcolor="background.default"
            display="flex"
            justifyContent="center"
            alignItems="center"
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

        </Grid>
      </Grid>
    </Container>
  );
}
