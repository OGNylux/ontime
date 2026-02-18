/**
 * Navigation - prev / next / today buttons.
 */
import { Button, IconButton, Stack } from "@mui/material";
import { ChevronLeft, ChevronRight } from "@mui/icons-material";

interface Props {
    onPrev: () => void;
    onNext: () => void;
    onToday: () => void;
}

export default function Navigation({ onPrev, onNext, onToday }: Props) {
    return (
        <Stack direction="row" spacing={1} alignItems="center" sx={{ height: 40 }}>
            <IconButton onClick={onPrev} size="small" sx={{ height: 40, width: 40 }}>
                <ChevronLeft />
            </IconButton>
            <Button onClick={onToday} variant="outlined" size="small" sx={{ minWidth: "auto", px: 2, height: 40 }}>
                Today
            </Button>
            <IconButton onClick={onNext} size="small" sx={{ height: 40, width: 40 }}>
                <ChevronRight />
            </IconButton>
        </Stack>
    );
}
