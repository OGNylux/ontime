import { Box, Paper, Typography } from "@mui/material";
import { MINUTES_PER_DAY } from "./util/calendarUtility";
import dayjs from "dayjs";
import CalendarZoom, { GapSize } from "./TopBar/CalendarZoom";
import { BASE_CELL_HEIGHT, SMALL_CELL_HEIGHT } from "./util/calendarConfig";

interface CalendarTimeProps {
    isCompact?: boolean;
    gapSize: GapSize;
    onGapSizeChange: (gapSize: GapSize) => void;
}

export default function CalendarTime({ isCompact = false, gapSize, onGapSizeChange }: CalendarTimeProps) {
    // Generate time slots based on gap size
    const timeSlots: number[] = [];
    for (let minute = 0; minute < MINUTES_PER_DAY; minute += gapSize) {
        timeSlots.push(minute);
    }

    // Use a constant base slot height (pixels per hour at baseline).
    // The day grid computes positions using the same `baseHeight`,
    // and zooming changes pixels-per-minute so entries grow/shrink.
    const baseHeight = isCompact ? SMALL_CELL_HEIGHT : BASE_CELL_HEIGHT;

    const formatTimeLabel = (minute: number) => {
        const hour = Math.floor(minute / 60);
        const min = minute % 60;
        if (gapSize >= 60) {
            // For 1h or 2h gaps, show just the hour
            return dayjs().hour(hour).minute(min).format("h:mm A");
        }
        // For smaller gaps, show hour:minute
        return dayjs().hour(hour).minute(min).format("h:mm A");
    };
    // headerHeight reserved if needed for absolute positioning

    return (
        <Box
            sx={{
                width: { xs: isCompact ? 62 : 64, md: 84 },
                bgcolor: "grey.50",
                borderRight: theme => `1px solid ${theme.palette.divider}`,
                flexShrink: 0,
                // allow absolute children positioned under the header
                position: "relative",
            }}
        >
            {/*
                Time column:
                - Renders a label row per hour.
                - Each hour is a flex item so it grows/shrinks with the day
                  column's available height. `minHeight` keeps the rows usable
                  on small viewports.
            */}
            <Paper
                elevation={0}
                square
                sx={{
                    height: 64,
                    position: "sticky",
                    top: 0,
                    zIndex: 50,
                    display: "flex",
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 0.5,
                    bgcolor: "grey.50",
                    borderBottom: theme => `1px solid ${theme.palette.divider}`,
                }}
            >
                <CalendarZoom gapSize={gapSize} onGapSizeChange={onGapSizeChange} />
            </Paper>
            {timeSlots.map((minute, index) => (
                <Box
                    key={minute}
                    sx={{
                        height: baseHeight,
                        position: "relative",
                        bgcolor: "background.paper",
                    }}
                >
                    {index !== timeSlots.length - 1 && (
                        <Typography
                            variant="caption"
                            sx={{
                                position: "absolute",
                                bottom: 0,
                                zIndex: 2,
                                transform: "translateY(50%)",
                                right: { xs: 6, md: 10 },
                                color: "text.secondary",
                                fontSize: gapSize < 60 ? '0.65rem' : '0.75rem',
                            }}
                        >
                            {formatTimeLabel(minute + gapSize)}
                        </Typography>
                    )}
                </Box>
            ))}
            {/* no current-time indicator in the time column; shown within each day instead */}
        </Box>
    );
}
