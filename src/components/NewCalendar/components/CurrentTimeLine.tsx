/**
 * CurrentTimeLine - red horizontal line showing "now" within today's column.
 * Includes a small play button to start the recorder.
 */
import { Box, IconButton, Tooltip } from "@mui/material";
import { PlayArrow } from "@mui/icons-material";
import { useEffect, useState } from "react";
import { dayjs } from "../../../lib/timezone";
import { useUserTimezone } from "../../../hooks/useUserTimezone";

interface Props {
    pxPerMin: number;
    onStartRecording?: () => void;
}

export default function CurrentTimeLine({ pxPerMin, onStartRecording }: Props) {
    const { timezone, loading } = useUserTimezone();
    const [minute, setMinute] = useState<number | null>(null);

    useEffect(() => {
        if (loading) return;
        const update = () => {
            const now = dayjs().tz(timezone);
            setMinute(now.hour() * 60 + now.minute() + now.second() / 60);
        };
        update();
        const id = setInterval(update, 1000);
        return () => clearInterval(id);
    }, [timezone, loading]);

    if (loading || minute === null) return null;

    const top = minute * pxPerMin;
    const h = 28;

    return (
        <Box position="absolute" top={top - h / 2} left={0} right={0} height={h} zIndex={20}
            display="flex" alignItems="center" sx={{ pointerEvents: "none" }}>
            {onStartRecording && (
                <Tooltip title="Start recording from now">
                    <IconButton onClick={onStartRecording} size="small" sx={{
                        pointerEvents: "auto", bgcolor: "secondary.main", color: "white",
                        width: 24, height: 24, boxShadow: 1, flex: "0 0 auto",
                        transition: "transform 0.12s ease, background-color 0.12s ease",
                        "&:hover": { transform: "scale(1.2)", bgcolor: "secondary.dark" },
                    }}>
                        <PlayArrow sx={{ fontSize: 16 }} />
                    </IconButton>
                </Tooltip>
            )}
            <Box flex={1} height={2} bgcolor="secondary.main" sx={{ pointerEvents: "none" }} />
            <Box width={8} height={8} borderRadius="50%" bgcolor="secondary.main" flex="0 0 auto" sx={{ pointerEvents: "none" }} />
        </Box>
    );
}
