import { Button, IconButton, Stack, Typography } from "@mui/material";
import { ChevronLeft, ChevronRight, PlayArrow, Stop } from "@mui/icons-material";

interface CalendarNavigationProps {
    onPrev: () => void;
    onNext: () => void;
    onToday: () => void;
    isRecording?: boolean;
    onToggleRecording?: () => void;
    totalWeekTime?: string;
}

export default function CalendarNavigation({ onPrev, onNext, onToday, isRecording, onToggleRecording, totalWeekTime }: CalendarNavigationProps) {
    return (
        <Stack direction="row" spacing={1} alignItems="center" sx={{ height: 40 }}>
            {onToggleRecording && (
                <IconButton 
                    onClick={onToggleRecording} 
                    size="small" 
                    color={isRecording ? "error" : "primary"}
                    sx={{ mr: 1, border: 1, borderColor: 'divider' }}
                >
                    {isRecording ? <Stop /> : <PlayArrow />}
                </IconButton>
            )}
            <IconButton onClick={onPrev} size="small" sx={{ height: 40, width: 40 }}>
                <ChevronLeft />
            </IconButton>
            <Button 
                onClick={onToday} 
                variant="outlined" 
                size="small" 
                sx={{ minWidth: 'auto', px: 2, height: 40 }}
            >
                Today
            </Button>
            <IconButton onClick={onNext} size="small" sx={{ height: 40, width: 40 }}>
                <ChevronRight />
            </IconButton>
            {totalWeekTime && (
                <Typography variant="body2" color="textSecondary" sx={{ ml: 2 }}>
                    WEEK TOTAL: {totalWeekTime}
                </Typography>
            )}
        </Stack>
    );
}
