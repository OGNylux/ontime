import { Box, Paper, Typography } from "@mui/material";
import { formatTime, HOURS_PER_DAY } from "./calendarUtility";

interface CalendarTimeProps {
    isCompact?: boolean;
}

export default function CalendarTime({ isCompact = false }: CalendarTimeProps) {
    const hours = Array.from({ length: HOURS_PER_DAY }).map((_, i) => i);

    return (
        <Box
            sx={{
                width: { xs: isCompact ? 62 : 64, md: 84 },
                bgcolor: "grey.50",
                borderRight: theme => `1px solid ${theme.palette.divider}`,
                position: "sticky",
                flexShrink: 0,
            }}
        >
            <Paper
                elevation={0}
                square
                sx={{
                    height: 64,
                    position: "sticky",
                    top: 0,
                    zIndex: 3,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 0.5,
                    bgcolor: "grey.50",
                    borderBottom: theme => `1px solid ${theme.palette.divider}`,
                }}
            >
            </Paper>
            {hours.map(hour => (
                <Box
                    key={hour}
                    sx={{
                        height: { xs: 40, md: 48 },
                        position: "relative",
                        bgcolor: "background.paper",
                    }}
                >
                    {hour !== HOURS_PER_DAY - 1 && (
                        <Typography
                            variant="caption"
                            sx={{
                                position: "absolute",
                                bottom: 0,
                                zIndex: 2,
                                transform: "translateY(50%)",
                                right: { xs: 6, md: 10 },
                                color: "text.secondary",
                            }}
                        >
                            {formatTime(hour + 1)}
                        </Typography>
                    )}
                </Box>
            ))}
        </Box>
    );
}
