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
        return now.hour() * 60 + now.minute();
    });

    // Update current time every minute
    useEffect(() => {
        const updateTime = () => {
            const now = dayjs();
            setCurrentMinute(now.hour() * 60 + now.minute());
        };

        const interval = setInterval(updateTime, 60000); // Update every minute
        return () => clearInterval(interval);
    }, []);

    const topPosition = currentMinute * pixelsPerMinute;

    return (
        <Box
            sx={{
                position: "absolute",
                top: topPosition,
                left: 0,
                right: 0,
                height: 2,
                bgcolor: "error.main",
                zIndex: 20,
                pointerEvents: "none",
                display: "flex",
                alignItems: "center",
            }}
        >
            {/* Red line */}
            <Box
                sx={{
                    position: "absolute",
                    left: 0,
                    right: 0,
                    height: 2,
                    bgcolor: "error.main",
                }}
            />
            
            {/* Play button on the right */}
            {onStartRecording && (
                <Tooltip title="Start recording from now">
                    <IconButton
                        onClick={onStartRecording}
                        size="small"
                        sx={{
                            position: "absolute",
                            left: -4,
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
                        }}
                    >
                        <PlayArrow sx={{ fontSize: 16 }} />
                    </IconButton>
                </Tooltip>
            )}
            
            {/* Circle on the left */}
            <Box
                sx={{
                    position: "absolute",
                    right: 4,
                    width: 8,
                    height: 8,
                    borderRadius: "50%",
                    bgcolor: "error.main",
                }}
            />
        </Box>
    );
}
