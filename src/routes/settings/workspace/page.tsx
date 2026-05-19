import { useEffect, useState } from "react";
import {
  Box,
  TextField,
  Typography,
  Button,
  Divider,
  Autocomplete,
} from "@mui/material";
import { useNavigate } from "react-router-dom";
import { useWorkspace } from "../../../hooks/useWorkspace";
import LoadingBanner from "../../../components/Loading/LoadingBanner";
import { useSnackbar } from "../../../hooks/useSnackbar";
import { userService, OntimeUser } from "../../../services/userService";
import { workspaceService, WorkspaceBilling } from "../../../services/workspaceService";
import { TIMEZONE_OPTIONS, getBrowserTimezone } from "../../../lib/timezone";
import { notifyTimezoneChange } from "../../../hooks/useUserTimezone";
import WorkspaceMembersCard from "../WorkspaceMembersCard";

export default function SettingsWorkspacePage() {
  const navigate = useNavigate();
  const { path, workspaceId: urlWorkspaceId } = useWorkspace();
  const { showError, showSuccess } = useSnackbar();
  const [, setUser] = useState<OntimeUser | null>(null);
  const [loading, setLoading] = useState(true);

  const [timezone, setTimezone] = useState("");
  const [currency, setCurrency] = useState(() => localStorage.getItem("ontime_currency") ?? "EUR");
  const [billing, setBilling] = useState<WorkspaceBilling>({});

  useEffect(() => {
    const load = async () => {
      try {
        const [current, billingData] = await Promise.all([
          userService.getCurrentUser(),
          workspaceService.getBilling(urlWorkspaceId),
        ]);
        if (current) {
          setUser(current);
          setTimezone(current.timezone ?? getBrowserTimezone() ?? "UTC");
        }
        if (billingData) setBilling(billingData);
      } catch (e) {
        showError("Failed to load workspace settings", e instanceof Error ? e.message : undefined);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [urlWorkspaceId]);

  const handleSave = async () => {
    try {
      const wid = urlWorkspaceId ?? urlWorkspaceId;
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

  if (loading) return <LoadingBanner message="Loading workspace settings..." />;

  return (
    <Box height="100%" display="flex" flexDirection="column">
      <Box mb={1}>
        <Button size="small" onClick={() => navigate(path("/settings"))}>Back to Settings</Button>
      </Box>
      <Box borderRadius={2} boxShadow={4} bgcolor="background.default">
        <Box pl={3} py={2}>
          <Typography variant="h4" fontWeight="bold">
            Workspace Settings
          </Typography>
        </Box>
      </Box>

      <Box display="flex" flexDirection="column" gap={3} mt={3}>
        <Box p={2} borderRadius={2} boxShadow={4} bgcolor="background.default">
          <Typography variant="h6" gutterBottom>Workspace Details</Typography>
          <Divider sx={{ mb: 2 }} />

          <Box display="grid" gridTemplateColumns={{ xs: "1fr", sm: "1fr 1fr" }} gap={2}>
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
                />
              )}
              freeSolo
              autoHighlight
            />
            <TextField
              label="Default Currency"
              fullWidth
              value={currency}
              onChange={(e) => setCurrency(e.target.value.toUpperCase())}
              slotProps={{ htmlInput: { maxLength: 3 } }}
              helperText="ISO code — e.g. EUR, USD, GBP"
            />

            <TextField
              label="Company Name"
              fullWidth
              value={billing.company_name ?? ""}
              onChange={(e) => setBilling((b) => ({ ...b, company_name: e.target.value }))}
            />
            <TextField
              label="VAT Number"
              fullWidth
              value={billing.vat_number ?? ""}
              onChange={(e) => setBilling((b) => ({ ...b, vat_number: e.target.value }))}
            />
          </Box>

          <Box mt={3} display="flex" justifyContent="flex-end">
            <Button variant="contained" onClick={handleSave}>
              Save Workspace Settings
            </Button>
          </Box>
        </Box>

        {urlWorkspaceId && <WorkspaceMembersCard workspaceId={urlWorkspaceId} />}
      </Box>
    </Box>
  );
}
