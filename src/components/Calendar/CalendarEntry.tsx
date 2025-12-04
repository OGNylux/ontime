import { Paper, Stack, Typography } from "@mui/material";
import { alpha, useTheme } from "@mui/material/styles";
import { useRef, useEffect, useState, type MouseEvent } from "react";
import { ENTRY_MARGIN_PERCENT, formatTime, MINUTES_PER_HOUR, INTERVAL_MINUTES, MINUTES_PER_DAY } from "./calendarUtility";
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
    // Called when a resize operation (top or bottom handle) is committed.
    onResizeCommit?: (entryId: string, startMinute: number, endMinute: number) => void;
}

const MIN_RENDER_WIDTH = 6;

export default function CalendarEntryOverlay({ entry, hourHeight, widthPercent = 100, offsetPercent = 0, zIndex = 100, isPreview = false, isDragging = false, onDragStart, onResizeCommit }: CalendarEntryOverlayProps) {
    const pxPerMinute = hourHeight / MINUTES_PER_HOUR;
    const theme = useTheme();
    // Ensure percentages are within 0..100 for layout calculations
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

    // Touch long-press support for initiating drag on touch devices.
    // We listen for touchstart and if the user holds for ~400ms we trigger
    // the drag start callback. Moving more than ~10px before the timer
    // fires cancels the long-press so normal scrolling/interaction isn't
    // interrupted.
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

    // While dragging or showing a preview for a move, render the entry
    // at full column width so it doesn't shrink when overlapping other items.
    if (isDragging || isPreview) {
        renderOffset = 0;
        renderWidth = 100;
    }

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
    // Local state for live-resize preview while dragging a handle.
    const resizeRef = useRef<{
        edge: "top" | "bottom" | null;
        startMinute: number;
        endMinute: number;
        startClientY: number;
    }>({ edge: null, startMinute: entry.startMinute, endMinute: entry.endMinute, startClientY: 0 });
    const [previewStart, setPreviewStart] = useState<number | null>(null);
    const [previewEnd, setPreviewEnd] = useState<number | null>(null);

    const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));
    const snap = (value: number) => Math.round(value / INTERVAL_MINUTES) * INTERVAL_MINUTES;

    const startResize = (edge: "top" | "bottom", clientY: number) => {
        // initialize resize reference state
        resizeRef.current = {
            edge,
            startMinute: previewStart ?? entry.startMinute,
            endMinute: previewEnd ?? entry.endMinute,
            startClientY: clientY,
        };

        let raf: number | null = null;

        const handleMove = (e: MouseEvent | TouchEvent) => {
            let clientYPos = 0;
            if ((e as TouchEvent).touches) {
                clientYPos = (e as TouchEvent).touches[0]?.clientY ?? (e as TouchEvent).changedTouches[0]?.clientY ?? 0;
            } else {
                clientYPos = (e as MouseEvent).clientY;
            }

            if (raf) return;
            raf = requestAnimationFrame(() => {
                const r = resizeRef.current;
                if (!r.edge) {
                    raf = null;
                    return;
                }
                const deltaY = clientYPos - r.startClientY;
                const deltaMinutes = Math.round(deltaY / pxPerMinute);

                if (r.edge === "top") {
                    let newStart = snap(r.startMinute + deltaMinutes);
                    newStart = clamp(newStart, 0, r.endMinute - INTERVAL_MINUTES);
                    setPreviewStart(newStart);
                    setPreviewEnd(null);
                } else {
                    let newEnd = snap(r.endMinute + deltaMinutes);
                    newEnd = clamp(newEnd, r.startMinute + INTERVAL_MINUTES, MINUTES_PER_DAY);
                    setPreviewEnd(newEnd);
                    setPreviewStart(null);
                }
                raf = null;
            });
        };

        const handleUp = () => {
            // commit and cleanup
            const finalStart = previewStart ?? resizeRef.current.startMinute;
            const finalEnd = previewEnd ?? resizeRef.current.endMinute;
            if (typeof onResizeCommit === "function") {
                onResizeCommit(entry.id, finalStart, finalEnd);
            }
            setPreviewStart(null);
            setPreviewEnd(null);
            resizeRef.current.edge = null;
            window.removeEventListener("mousemove", handleMove as any);
            window.removeEventListener("mouseup", handleUp as any);
            window.removeEventListener("touchmove", handleMove as any);
            window.removeEventListener("touchend", handleUp as any);
            if (raf) {
                cancelAnimationFrame(raf);
            }
        };

        window.addEventListener("mousemove", handleMove as any);
        window.addEventListener("mouseup", handleUp as any);
        window.addEventListener("touchmove", handleMove as any, { passive: false } as any);
        window.addEventListener("touchend", handleUp as any);
    };

    // display values: if preview values exist use them for live feedback
    const displayStart = previewStart ?? entry.startMinute;
    const displayEnd = previewEnd ?? entry.endMinute;

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
                top: `${displayStart * pxPerMinute}px`,
                height: `${(displayEnd - displayStart) * pxPerMinute}px`,
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
            {/* Top resize handle */}
            {!isPreview && !isDragging && (
                <div
                    onMouseDown={(e) => { e.stopPropagation(); startResize("top", e.clientY); }}
                    onTouchStart={(e) => { e.stopPropagation(); startResize("top", e.touches[0].clientY); }}
                    style={{
                        position: "absolute",
                        top: 0,
                        left: 0,
                        right: 0,
                        height: 12,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        cursor: "ns-resize",
                        zIndex: 260,
                        pointerEvents: "auto",
                        userSelect: "none",
                    }}
                >
                    <span style={{ fontSize: 12, opacity: 0.7 }}>--</span>
                </div>
            )}

            <Stack spacing={0.5} sx={{ minWidth: 0 }}>
                <Typography variant="caption" sx={{ fontSize: { xs: "0.65rem", md: "0.85rem" } }}>
                    {entry.title || "New Entry"}
                </Typography>
                <Typography variant="subtitle2" noWrap sx={{ fontSize: { xs: "0.55rem", md: "0.75rem" }, opacity: 0.9 }}>
                    {formatTime(displayStart, true)} - {formatTime(displayEnd, true)}
                </Typography>
            </Stack>

            {/* Bottom resize handle */}
            {!isPreview && !isDragging && (
                <div
                    onMouseDown={(e) => { e.stopPropagation(); startResize("bottom", e.clientY); }}
                    onTouchStart={(e) => { e.stopPropagation(); startResize("bottom", e.touches[0].clientY); }}
                    style={{
                        position: "absolute",
                        bottom: 0,
                        left: 0,
                        right: 0,
                        height: 12,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        cursor: "ns-resize",
                        zIndex: 260,
                        pointerEvents: "auto",
                        userSelect: "none",
                    }}
                >
                    <span style={{ fontSize: 12, opacity: 0.7 }}>--</span>
                </div>
            )}
        </Paper>
    );
}
