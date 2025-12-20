import { Button, IconButton, Stack } from "@mui/material";
import { ChevronLeft, ChevronRight, PlayArrow, Stop } from "@mui/icons-material";

interface CalendarNavigationProps {
    onPrev: () => void;
    onNext: () => void;
    onToday: () => void;
    isRecording?: boolean;
    onToggleRecording?: () => void;
}

export default function CalendarNavigation({ onPrev, onNext, onToday, isRecording, onToggleRecording }: CalendarNavigationProps) {
    return (
        <Stack direction="row" spacing={1} alignItems="center">
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
            <IconButton onClick={onPrev} size="small">
                <ChevronLeft />
            </IconButton>
            <Button 
                onClick={onToday} 
                variant="outlined" 
                size="small" 
                sx={{ minWidth: 'auto', px: 2 }}
            >
                Today
            </Button>
            <IconButton onClick={onNext} size="small">
                <ChevronRight />
            </IconButton>
        </Stack>
    );
}
