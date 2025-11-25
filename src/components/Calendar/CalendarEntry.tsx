import { Paper, Stack, Typography } from "@mui/material";
import { alpha, useTheme } from "@mui/material/styles";
import type { MouseEvent } from "react";
import { ENTRY_MARGIN_PERCENT, formatTime, MINUTES_PER_HOUR } from "./calendarUtility";
import { TimeEntry } from "./calendarTypes";

interface CalendarEntryOverlayProps {
    entry: TimeEntry;
    hourHeight: number;
    widthPercent?: number;
    offsetPercent?: number;
    zIndex?: number;
    isPreview?: boolean;
    onDragStart?: (event: MouseEvent<HTMLDivElement>) => void;
}

const MIN_RENDER_WIDTH = 6;

export default function CalendarEntryOverlay({ entry, hourHeight, widthPercent = 100, offsetPercent = 0, zIndex = 100, isPreview = false, onDragStart }: CalendarEntryOverlayProps) {
    const pxPerMinute = hourHeight / MINUTES_PER_HOUR;
    const theme = useTheme();
    const clampPercent = (value: number) => Math.max(0, Math.min(value, 100));
    const clampedWidth = clampPercent(widthPercent);
    const clampedOffset = clampPercent(offsetPercent);

    let renderOffset = clampedOffset;
    let renderWidth = clampedWidth;

    if (renderWidth >= 100 && renderOffset === 0) {
        renderOffset = ENTRY_MARGIN_PERCENT;
        renderWidth = Math.max(MIN_RENDER_WIDTH, 100 - ENTRY_MARGIN_PERCENT * 2);
    } else {
        if (renderOffset + renderWidth > 100) {
            renderWidth = Math.max(MIN_RENDER_WIDTH, 100 - renderOffset);
        }
        if (renderWidth < MIN_RENDER_WIDTH) {
            renderWidth = MIN_RENDER_WIDTH;
            renderOffset = Math.max(0, Math.min(renderOffset, 100 - renderWidth));
        }
    }

    const baseColor = entry.color ?? theme.palette.primary.main;
    const backgroundColor = isPreview ? alpha(baseColor, 0.85) : baseColor;
    const textColor = theme.palette.getContrastText(backgroundColor);

    return (
        <Paper
            elevation={6}
            onMouseDown={onDragStart}
            sx={{
                position: "absolute",
                top: `${entry.startMinute * pxPerMinute}px`,
                height: `${(entry.endMinute - entry.startMinute) * pxPerMinute}px`,
                width: `${renderWidth}%`,
                left: `${renderOffset}%`,
                zIndex,
                bgcolor: backgroundColor,
                color: textColor,
                display: "flex",
                flexDirection: "column",
                px: { xs: 0.75, md: 1 },
                py: 0.75,
                cursor: isPreview ? "default" : "grab",
                pointerEvents: isPreview ? "none" : "auto",
                opacity: isPreview ? 0.9 : 1,
                transition: theme.transitions.create(["transform", "box-shadow", "opacity"], {
                    duration: theme.transitions.duration.shortest,
                }),
                borderRadius: 1,
                overflow: "hidden",
            }}
        >
            <Stack spacing={0.5} sx={{ minWidth: 0 }}>
                <Typography variant="caption" sx={{ fontSize: { xs: "0.65rem", md: "0.85rem" } }}>
                    {entry.title || "New Entry"}
                </Typography>
                <Typography variant="subtitle2" noWrap sx={{ fontSize: { xs: "0.55rem", md: "0.75rem" }, opacity: 0.9 }}>
                    {formatTime(entry.startMinute, true)} - {formatTime(entry.endMinute, true)}
                </Typography>
            </Stack>
        </Paper>
    );
}
