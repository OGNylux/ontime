import { Box, IconButton, Tooltip } from "@mui/material";
import { PlayArrow } from "@mui/icons-material";
import { useEffect, useState } from "react";
import dayjs from "dayjs";

interface CalendarCurrentTimeLineProps {
    pixelsPerMinute: number;
    onStartRecording?: () => void;
}

export default function CalendarCurrentTimeLine({ pixelsPerMinute, onStartRecording }: CalendarCurrentTimeLineProps) {
    const [currentMinute, setCurrentMinute] = useState(() => {
        const now = dayjs();
        return now.hour() * 60 + now.minute() + now.second() / 60;
    });

    // Update current time every second for smooth movement
    useEffect(() => {
        const updateTime = () => {
            const now = dayjs();
            setCurrentMinute(now.hour() * 60 + now.minute() + now.second() / 60);
        };

        const interval = setInterval(updateTime, 1000); // Update every second
        return () => clearInterval(interval);
    }, []);

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
                            bgcolor: "error.main",
                            color: "white",
                            width: 24,
                            height: 24,
                            transition: 'transform 0.12s ease, background-color 0.12s ease',
                            transformOrigin: 'center',
                            '&:hover': {
                                transform: 'scale(1.2)',
                                bgcolor: 'error.dark',
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
                bgcolor="error.main"
                sx={{ pointerEvents: 'none' }}
            />

            {/* Left marker */}
            <Box
                width={8}
                height={8}
                borderRadius="50%"
                bgcolor="error.main"
                flex="0 0 auto"
                sx={{ pointerEvents: 'none' }}
            />
        </Box>
    );
}
