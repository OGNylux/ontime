/**
 * ZoomControls - +/- buttons that change the time-grid density.
 */
import { IconButton, Tooltip, Stack } from "@mui/material";
import { Add, Remove } from "@mui/icons-material";
import { ZOOM_OPTIONS } from "../constants";
import type { ZoomLevel } from "../types";

interface Props {
    zoom: ZoomLevel;
    onChange: (z: ZoomLevel) => void;
}

export default function ZoomControls({ zoom, onChange }: Props) {
    const idx = ZOOM_OPTIONS.indexOf(zoom);
    const canIn  = idx > 0;
    const canOut = idx < ZOOM_OPTIONS.length - 1;

    return (
        <Stack direction="row" spacing={0.5}>
            <Tooltip title="Zoom out"><span>
                <IconButton onClick={() => canOut && onChange(ZOOM_OPTIONS[idx + 1])} disabled={!canOut} size="small"
                    sx={{ border: 1, borderColor: "divider", p: 0.4, width: { xs: 24, sm: 28, md: 32 }, height: { xs: 24, sm: 28, md: 32 } }}>
                    <Remove sx={{ fontSize: 18 }} />
                </IconButton>
            </span></Tooltip>
            <Tooltip title="Zoom in"><span>
                <IconButton onClick={() => canIn && onChange(ZOOM_OPTIONS[idx - 1])} disabled={!canIn} size="small"
                    sx={{ border: 1, borderColor: "divider", p: 0.4, width: { xs: 24, sm: 28, md: 32 }, height: { xs: 24, sm: 28, md: 32 } }}>
                    <Add sx={{ fontSize: 18 }} />
                </IconButton>
            </span></Tooltip>
        </Stack>
    );
}
