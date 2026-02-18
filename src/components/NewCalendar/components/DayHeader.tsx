/**
 * DayHeader - sticky header at the top of each day column.
 * Shows day-of-month, day-of-week, and total tracked time.
 */
import { Box, Paper, Typography } from "@mui/material";
import { formatDuration } from "../layout/timeUtils";

interface Props {
    dayOfWeek: string;
    dayOfMonth: string;
    totalMinutes?: number;
    isToday?: boolean;
}

export default function DayHeader({ dayOfWeek, dayOfMonth, totalMinutes = 0, isToday = false }: Props) {
    return (
        <Paper elevation={0} square sx={{
            height: 64, position: "sticky", top: 0, zIndex: 100,
            display: "flex", flexDirection: "column", alignItems: "flex-start", justifyContent: "center",
            gap: 0.5, bgcolor: "background.default", borderBottom: t => `1px solid ${t.palette.divider}`,
        }}>
            <Box display="flex" alignItems="center">
                <Box sx={{ position: "relative", mr: 1, width: { xs: 32, sm: 36, md: 45 }, height: { xs: 32, sm: 36, md: 45 }, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    {isToday && (
                        <Box sx={{ position: "absolute", inset: 0, borderRadius: "50%", bgcolor: "primary.main", opacity: 0.25, zIndex: 1 }} />
                    )}
                    <Typography variant="subtitle2" color={isToday ? "primary.main" : "text.secondary"}
                        fontSize={{ xs: "1.4rem", sm: "1.6rem", md: "2rem" }} lineHeight={1}
                        textAlign="center"
                        sx={{ position: "relative", zIndex: 2, display: "flex", alignItems: "center", justifyContent: "center", width: "100%", height: "100%" }}>
                        {dayOfMonth}
                    </Typography>
                </Box>
                <Box display="flex" flexDirection="column" alignItems="flex-start">
                    <Typography variant="subtitle2" noWrap color={isToday ? "primary.main" : "text.secondary"}
                        fontSize={{ xs: "0.7rem", sm: "0.85rem" }} lineHeight={1}>
                        {dayOfWeek}
                    </Typography>
                    <Typography variant="subtitle2" color="text.secondary"
                        fontSize={{ xs: "0.7rem", sm: "0.85rem" }} mt={-0.3} lineHeight={1}>
                        {formatDuration(totalMinutes)}
                    </Typography>
                </Box>
            </Box>
        </Paper>
    );
}
