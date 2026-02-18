/**
 * TimeGutter - the left column showing time labels and zoom controls.
 */
import { Box, Paper, Typography } from "@mui/material";
import { MINUTES_PER_DAY } from "../constants";
import type { ZoomLevel } from "../types";
import { formatTimeLabel } from "../layout/timeUtils";
import ZoomControls from "./ZoomControls";

interface Props {
    isCompact: boolean;
    zoom: ZoomLevel;
    onZoomChange: (z: ZoomLevel) => void;
    slotHeight: number;
}

export default function TimeGutter({ isCompact, zoom, onZoomChange, slotHeight }: Props) {
    const slots: number[] = [];
    for (let minute = 0; minute < MINUTES_PER_DAY; minute += zoom) {
        slots.push(minute);
    }
    const totalHeight = 64 + (slots.length * slotHeight); // header + all time slots

    return (
        <Box width={{ xs: isCompact ? 62 : 64, md: 84 }} bgcolor="background.default" flexShrink={0} height={totalHeight}>
            {/* Sticky header with zoom controls */}
            <Paper elevation={0} square sx={{
                height: 64, position: "sticky", top: 0, zIndex: 100,
                display: "flex", alignItems: "center", justifyContent: "center", gap: 0.5,
                bgcolor: "background.default", borderBottom: t => `1px solid ${t.palette.divider}`,
            }}>
                <ZoomControls zoom={zoom} onChange={onZoomChange} />
            </Paper>

            {/* Time labels */}
            {slots.map((minute, i) => (
                <Box key={minute} sx={{
                    height: slotHeight, position: "relative",
                    bgcolor: "background.default", borderRight: t => `1px solid ${t.palette.divider}`,
                }}>
                    {i !== slots.length - 1 && (
                        <Typography
                            variant="caption" position="absolute" bottom={0} zIndex={2}
                            right={{ xs: 6, md: 10 }} color="text.secondary"
                            fontSize={zoom < 60 ? "0.65rem" : "0.75rem"}
                            sx={{ transform: "translateY(50%)" }}
                        >
                            {formatTimeLabel(minute + zoom)}
                        </Typography>
                    )}
                </Box>
            ))}
        </Box>
    );
}
