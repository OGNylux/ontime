import { useEffect, useState } from "react";
import {
  Box,
  TextField,
  Typography,
  Button,
  Divider,
  Grid,
} from "@mui/material";
import { useNavigate } from "react-router-dom";
import LoadingBanner from "../../../components/Loading/LoadingBanner";
import { useSnackbar } from "../../../hooks/useSnackbar";
import { userService, OntimeUser } from "../../../services/userService";

export default function SettingsAccountPage() {
  const navigate = useNavigate();
  const { showError, showSuccess } = useSnackbar();
  const [, setUser] = useState<OntimeUser | null>(null);
  const [loading, setLoading] = useState(true);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  useEffect(() => {
    const load = async () => {
      try {
        const current = await userService.getCurrentUser();
        if (current) {
          setUser(current);
          setName(current.name ?? "");
          setEmail(current.email ?? "");
        }
      } catch (e) {
        showError("Failed to load user settings", e instanceof Error ? e.message : undefined);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

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

  if (loading) return <LoadingBanner message="Loading user settings..." />;

  return (
    <Box height="100%" display="flex" flexDirection="column">
      <Box mb={1}>
        <Button size="small" onClick={() => navigate("/settings")}>Back to Settings</Button>
      </Box>
      <Box borderRadius={2} boxShadow={4} bgcolor="background.default">
        <Box pl={3} py={2}>
          <Typography variant="h4" fontWeight="bold">
            User Settings
          </Typography>
        </Box>
      </Box>

      <Box p={2} borderRadius={2} boxShadow={4} bgcolor="background.default" mt={3}>
        <Typography variant="h6" gutterBottom>Profile</Typography>
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

      <Box p={2} borderRadius={2} boxShadow={4} bgcolor="background.default" mt={3}>
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
    </Box>
  );
}
