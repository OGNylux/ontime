import {
  Box,
  Container,
  Typography,
  Divider,
  Grid,
  ToggleButtonGroup,
  ToggleButton,
  Button,
} from "@mui/material";
import { useNavigate } from "react-router-dom";
import { useCalendarPreferences } from "../../../hooks/useCalendarPreferences";

export default function SettingsCalendarPage() {
  const navigate = useNavigate();
  const { prefs, update: updatePrefs } = useCalendarPreferences();

  return (
    <Box height="100%" display="flex" flexDirection="column">
      <Box mb={1}>
        <Button size="small" onClick={() => navigate("/settings")}>Back to Settings</Button>
      </Box>
      <Box borderRadius={2} boxShadow={4} bgcolor="background.default">
        <Box pl={3} py={2}>
          <Typography variant="h4" fontWeight="bold">
            Calendar Settings
          </Typography>
        </Box>
      </Box>

      <Box p={2} borderRadius={2} boxShadow={4} bgcolor="background.default" mt={3}>
        <Typography variant="h6" gutterBottom>Preferences</Typography>
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
        </Grid>
      </Box>
    </Box>
  );
}
