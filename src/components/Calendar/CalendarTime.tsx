import { Box, Paper, Typography } from "@mui/material";
import { formatTime } from "./calendarUtility";

interface CalendarTimeProps {
    isCompact?: boolean;
}

export default function CalendarTime({ isCompact = false }: CalendarTimeProps) {
    const hours = Array.from({ length: 23 }).map((_, i) => i);

    return (
        <Box
            sx={{
                width: { xs: isCompact ? 56 : 64, md: 84 },
                bgcolor: "grey.50",
                borderRight: theme => `1px solid ${theme.palette.divider}`,
                position: "sticky",
                left: 0,
                top: 0,
                zIndex: 4,
                boxShadow: isCompact ? theme => theme.shadows[2] : "none",
                flexShrink: 0,
            }}
        >
            <Paper
                elevation={0}
                sx={{
                    height: 64,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    px: { xs: 1, md: 2 },
                    position: "sticky",
                    top: 0,
                    zIndex: 2,
                    bgcolor: "grey.50",
                }}
            >
                <Typography variant="subtitle2" noWrap>
                    Time
                </Typography>
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
                </Box>
            ))}
        </Box>
    );
}
