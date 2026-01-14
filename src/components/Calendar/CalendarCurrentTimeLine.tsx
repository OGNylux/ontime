import { Box, IconButton, Tooltip } from "@mui/material";
import { PlayArrow } from "@mui/icons-material";
import { useEffect, useState } from "react";
import { dayjs } from "../../lib/timezone";
import { useUserTimezone } from "../../hooks/useUserTimezone";

interface CalendarCurrentTimeLineProps {
    pixelsPerMinute: number;
    onStartRecording?: () => void;
}

export default function CalendarCurrentTimeLine({ pixelsPerMinute, onStartRecording }: CalendarCurrentTimeLineProps) {
    const { timezone, loading } = useUserTimezone();
    const [currentMinute, setCurrentMinute] = useState<number | null>(null);

    // Update current time every second for smooth movement
    useEffect(() => {
        if (loading) return;
        
        const updateTime = () => {
            // Get current time in user's timezone
            const now = dayjs().tz(timezone);
            setCurrentMinute(now.hour() * 60 + now.minute() + now.second() / 60);
        };
        
        // Initial update
        updateTime();

        const interval = setInterval(updateTime, 1000); // Update every second
        return () => clearInterval(interval);
    }, [timezone, loading]);

    // Don't render until timezone is loaded and we have a valid minute
    if (loading || currentMinute === null) {
        return null;
    }

    const topPosition = currentMinute * pixelsPerMinute;
    const containerHeight = 28;
    // Offset to center the container on the actual time position
    const centeredTop = topPosition - containerHeight / 2;

    return (
        <Box
            position="absolute"
            top={centeredTop}
            left={0}
            right={0}
            height={containerHeight}
            zIndex={20}
            display="flex"
            alignItems="center"
            flexDirection="row"
            sx={{ pointerEvents: "none" }}
        >
            
            {/* Play button */}
            {onStartRecording && (
                <Tooltip title="Start recording from now">
                    <IconButton
                        onClick={onStartRecording}
                        size="small"
                        sx={{
                            pointerEvents: "auto",
                            bgcolor: "secondary.main",
                            color: "white",
                            width: 24,
                            height: 24,
                            transition: 'transform 0.12s ease, background-color 0.12s ease',
                            transformOrigin: 'center',
                            '&:hover': {
                                transform: 'scale(1.2)',
                                bgcolor: 'secondary.dark',
                            },
                            boxShadow: 1,
                            flex: '0 0 auto',
                        }}
                    >
                        <PlayArrow sx={{ fontSize: 16 }} />
                    </IconButton>
                </Tooltip>
            )}

            {/* Line that stretches between marker and button */}
            <Box
                flex={1}
                height={2}
                bgcolor="secondary.main"
                sx={{ pointerEvents: 'none' }}
            />

            {/* Left marker */}
            <Box
                width={8}
                height={8}
                borderRadius="50%"
                bgcolor="secondary.main"
                flex="0 0 auto"
                sx={{ pointerEvents: 'none' }}
            />
        </Box>
    );
}
