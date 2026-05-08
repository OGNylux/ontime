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
import { workspaceService, WorkspaceBilling } from "../../../services/workspaceService";
import { getActiveWorkspaceId } from "../../../services/workspaceContext";

export default function SettingsBillingPage() {
  const navigate = useNavigate();
  const { showError, showSuccess } = useSnackbar();
  const [loading, setLoading] = useState(true);
  const [workspaceId, setWorkspaceId] = useState<string | null>(null);
  const [billing, setBilling] = useState<WorkspaceBilling>({});

  useEffect(() => {
    const load = async () => {
      try {
        const wid = await getActiveWorkspaceId();
        setWorkspaceId(wid);
        const billingData = await workspaceService.getBilling(wid);
        if (billingData) setBilling(billingData);
      } catch (e) {
        showError("Failed to load billing settings", e instanceof Error ? e.message : undefined);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const handleSave = async () => {
    try {
      const wid = workspaceId ?? (await getActiveWorkspaceId());
      await workspaceService.saveBilling(wid, billing);
      showSuccess("Billing settings saved");
    } catch (e) {
      showError("Failed to save billing settings", e instanceof Error ? e.message : undefined);
    }
  };

  if (loading) return <LoadingBanner message="Loading billing settings..." />;

  return (
    <Box height="100%" display="flex" flexDirection="column">
      <Box mb={1}>
        <Button size="small" onClick={() => navigate("/settings")}>Back to Settings</Button>
      </Box>
      <Box borderRadius={2} boxShadow={4} bgcolor="background.default">
        <Box pl={3} py={2}>
          <Typography variant="h4" fontWeight="bold">
            Billing & Bank
          </Typography>
        </Box>
      </Box>

      <Box p={2} borderRadius={2} boxShadow={4} bgcolor="background.default" mt={3}>
        <Typography variant="h6" gutterBottom>Billing Address</Typography>
        <Divider sx={{ mb: 2 }} />

        <Grid container spacing={2}>
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
        </Grid>
      </Box>

      <Box p={2} borderRadius={2} boxShadow={4} bgcolor="background.default" mt={3}>
        <Typography variant="h6" gutterBottom>Bank Details</Typography>
        <Divider sx={{ mb: 2 }} />

        <Grid container spacing={2}>
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
              slotProps={{ htmlInput: { style: { fontFamily: "monospace" } } }}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 4 }}>
            <TextField
              label="SWIFT / BIC"
              fullWidth
              value={billing.swift ?? ""}
              onChange={(e) => setBilling((b) => ({ ...b, swift: e.target.value.toUpperCase() }))}
              slotProps={{ htmlInput: { style: { fontFamily: "monospace" } } }}
            />
          </Grid>
        </Grid>

        <Box mt={3} display="flex" justifyContent="flex-end">
          <Button variant="contained" onClick={handleSave}>
            Save Billing Settings
          </Button>
        </Box>
      </Box>
    </Box>
  );
}
