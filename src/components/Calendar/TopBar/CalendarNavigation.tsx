import { Button, IconButton, Stack } from "@mui/material";
import { ChevronLeft, ChevronRight } from "@mui/icons-material";

interface CalendarNavigationProps {
    onPrev: () => void;
    onNext: () => void;
    onToday: () => void;
}

export default function CalendarNavigation({ onPrev, onNext, onToday }: CalendarNavigationProps) {
    return (
        <Stack direction="row" spacing={1} alignItems="center">
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
