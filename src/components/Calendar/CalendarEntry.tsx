import { Paper, Stack, Typography } from "@mui/material";
import { alpha, useTheme } from "@mui/material/styles";
import { useRef, useEffect, type MouseEvent } from "react";
import { ENTRY_MARGIN_PERCENT, formatTime, MINUTES_PER_HOUR } from "./calendarUtility";
import { TimeEntry } from "./calendarTypes";

interface CalendarEntryOverlayProps {
    entry: TimeEntry;
    hourHeight: number;
    widthPercent?: number;
    offsetPercent?: number;
    zIndex?: number;
    isPreview?: boolean;
    isDragging?: boolean;
    onDragStart?: (clientX: number, clientY: number) => void;
}

const MIN_RENDER_WIDTH = 6;

export default function CalendarEntryOverlay({ entry, hourHeight, widthPercent = 100, offsetPercent = 0, zIndex = 100, isPreview = false, isDragging = false, onDragStart }: CalendarEntryOverlayProps) {
    const pxPerMinute = hourHeight / MINUTES_PER_HOUR;
    const theme = useTheme();
    const clampPercent = (value: number) => Math.max(0, Math.min(value, 100));
    const clampedWidth = clampPercent(widthPercent);
    const clampedOffset = clampPercent(offsetPercent);

    const longPressTimerRef = useRef<number | null>(null);
    const touchStartPosRef = useRef<{ x: number; y: number } | null>(null);
    const paperRef = useRef<HTMLDivElement>(null);
    const onDragStartRef = useRef(onDragStart);
    onDragStartRef.current = onDragStart;

    const handleMouseDown = (event: MouseEvent<HTMLDivElement>) => {
        if (onDragStart) onDragStart(event.clientX, event.clientY);
    };

    useEffect(() => {
        const element = paperRef.current;
        if (!element) return;

        const handleTouchStart = (event: TouchEvent) => {
            if (!onDragStartRef.current) return;
            
            const touch = event.touches[0];
            touchStartPosRef.current = { x: touch.clientX, y: touch.clientY };

            longPressTimerRef.current = window.setTimeout(() => {
                if (onDragStartRef.current && touchStartPosRef.current) {
                    onDragStartRef.current(touch.clientX, touch.clientY);
                }
                longPressTimerRef.current = null;
            }, 400);
        };

        const handleTouchMove = (event: TouchEvent) => {
            // If waiting for long press timer
            if (longPressTimerRef.current && touchStartPosRef.current) {
                const touch = event.touches[0];
                const dx = touch.clientX - touchStartPosRef.current.x;
                const dy = touch.clientY - touchStartPosRef.current.y;
                const distanceSq = dx * dx + dy * dy;

                // Cancel if moved more than 10px before long press triggers
                if (distanceSq > 100) {
                    clearTimeout(longPressTimerRef.current);
                    longPressTimerRef.current = null;
                    touchStartPosRef.current = null;
                }
            }
        };

        const handleTouchEnd = () => {
            if (longPressTimerRef.current) {
                clearTimeout(longPressTimerRef.current);
                longPressTimerRef.current = null;
            }
            touchStartPosRef.current = null;
        };

        element.addEventListener("touchstart", handleTouchStart);
        element.addEventListener("touchmove", handleTouchMove);
        element.addEventListener("touchend", handleTouchEnd);
        element.addEventListener("touchcancel", handleTouchEnd);

        return () => {
            element.removeEventListener("touchstart", handleTouchStart);
            element.removeEventListener("touchmove", handleTouchMove);
            element.removeEventListener("touchend", handleTouchEnd);
            element.removeEventListener("touchcancel", handleTouchEnd);
        };
    }, []);

    let renderOffset = clampedOffset;
    let renderWidth = clampedWidth;

    if (renderWidth >= 100 && renderOffset === 0) {
        renderOffset = ENTRY_MARGIN_PERCENT;
        renderWidth = Math.max(MIN_RENDER_WIDTH, 100 - ENTRY_MARGIN_PERCENT * 2);
    } else {
        if (renderOffset + renderWidth > 100) renderWidth = Math.max(MIN_RENDER_WIDTH, 100 - renderOffset);
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
            ref={paperRef}
            elevation={6}
            onMouseDown={handleMouseDown}
            onContextMenu={(e) => e.preventDefault()}
            sx={{
                position: "absolute",
                userSelect: "none",
                WebkitUserSelect: "none",
                WebkitTouchCallout: "none",
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
                opacity: isDragging ? 0 : isPreview ? 0.9 : 1,
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
