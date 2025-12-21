import { IconButton, Tooltip, Stack } from "@mui/material";
import { Add, Remove } from "@mui/icons-material";

export type GapSize = 5 | 15 | 30 | 60 | 120;

interface CalendarZoomProps {
    gapSize: GapSize;
    onGapSizeChange: (gapSize: GapSize) => void;
}

const GAP_OPTIONS: GapSize[] = [5, 15, 30, 60, 120];

export default function CalendarZoom({ gapSize, onGapSizeChange }: CalendarZoomProps) {
    const currentIndex = GAP_OPTIONS.findIndex(opt => opt === gapSize);
    const canZoomIn = currentIndex > 0;
    const canZoomOut = currentIndex < GAP_OPTIONS.length - 1;

    const handleZoomIn = () => {
        if (canZoomIn) {
            onGapSizeChange(GAP_OPTIONS[currentIndex - 1]);
        }
    };

    const handleZoomOut = () => {
        if (canZoomOut) {
            onGapSizeChange(GAP_OPTIONS[currentIndex + 1]);
        }
    };

    return (
        <Stack direction="row" spacing={0.5}>
            <Tooltip title="Zoom in">
                <span>
                    <IconButton
                        onClick={handleZoomIn}
                        disabled={!canZoomIn}
                        size="small"
                        sx={{ border: 1, borderColor: 'divider' }}
                    >
                        <Add fontSize="small" />
                    </IconButton>
                </span>
            </Tooltip>
            <Tooltip title="Zoom out">
                <span>
                    <IconButton
                        onClick={handleZoomOut}
                        disabled={!canZoomOut}
                        size="small"
                        sx={{ border: 1, borderColor: 'divider' }}
                    >
                        <Remove fontSize="small" />
                    </IconButton>
                </span>
            </Tooltip>
        </Stack>
    );
}
