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
    const timeSlots: number[] = [];
    for (let minute = 0; minute < MINUTES_PER_DAY; minute += gapSize) {
        timeSlots.push(minute);
    }

    const baseHeight = isCompact ? SMALL_CELL_HEIGHT : BASE_CELL_HEIGHT;

    const formatTimeLabel = (minute: number) => {
        const hour = Math.floor(minute / 60);
        const min = minute % 60;

        return dayjs().hour(hour).minute(min).format("h:mm A");
    };

    return (
        <Box
            width={{ xs: isCompact ? 62 : 64, md: 84 }}
            bgcolor="background.paper"
            flexShrink={0}
            position="relative"
        >
            {/* Time column */}
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
                    bgcolor: "background.default",
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
                        borderRight: t => `1px solid ${t.palette.divider}`
                    }}
                >
                    {index !== timeSlots.length - 1 && (
                        <Typography
                            variant="caption"
                            position="absolute"
                            bottom={0}
                            zIndex={2}
                            right={{xs: 6, md: 10}}
                            color="text.secondary"
                            fontSize={gapSize < 60 ? '0.65rem' : '0.75rem'}
                            sx={{ transform: "translateY(50%)" }}
                        >
                            {formatTimeLabel(minute + gapSize)}
                        </Typography>
                    )}
                </Box>
            ))}
        </Box>
    );
}
