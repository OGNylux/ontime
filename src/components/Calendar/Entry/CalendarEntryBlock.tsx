import { Box, Typography } from "@mui/material";
import { MouseEvent, useEffect, useRef, useCallback } from "react";
import dayjs from "dayjs";

// Components
import CalendarEntryResizeHandle from "./CalendarEntryResizeHandle";

// Types & Utils
import { CalendarEntry } from "../../../services/calendarService";
import { MINUTES_PER_HOUR, formatDuration } from "../util/calendarUtility";
import { useEntryTouch } from "../hooks/useEntryTouch";
import { useEntryPointer } from "../hooks/useEntryPointer";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface CalendarEntryBlockProps {
    entry: CalendarEntry;
    hourHeight: number;
    onClick?: (entry: CalendarEntry, ev?: MouseEvent) => void;
    onContextMenu?: (entry: CalendarEntry, ev?: MouseEvent) => void;
    onDragStart?: (clientX: number, clientY: number) => void;
    onResizeStart?: (handle: "top" | "bottom", clientY: number) => void;
    isDragging?: boolean;
    isPreview?: boolean;
    widthPercent?: number;
    offsetPercent?: number;
}

interface EntryLayout {
    visualStartMinute?: number;
    visualDuration?: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function computeLayout(entry: CalendarEntry & EntryLayout, hourHeight: number) {
    const startTime = dayjs(entry.start_time);
    const endTime = dayjs(entry.end_time);

    const startMinutes = entry.visualStartMinute ?? startTime.hour() * MINUTES_PER_HOUR + startTime.minute();
    const durationMinutes = entry.visualDuration ?? endTime.diff(startTime, "minute");

    const pixelsPerMinute = hourHeight / MINUTES_PER_HOUR;

    return {
        top: startMinutes * pixelsPerMinute,
        height: Math.max(durationMinutes * pixelsPerMinute, 20),
        durationMinutes: Math.max(0, Math.round(durationMinutes)),
    };
}

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

export default function CalendarEntryBlock({
    entry,
    hourHeight,
    onClick,
    onContextMenu,
    onDragStart,
    onResizeStart,
    isDragging = false,
    isPreview = false,
    widthPercent = 100,
    offsetPercent = 0,
}: CalendarEntryBlockProps) {
    const paperRef = useRef<HTMLDivElement>(null);
    const dragStartPos = useRef<{ x: number; y: number } | null>(null);
    const isDraggingRef = useRef(false);
    const isResizingRef = useRef(false);
    const resizeTimestamp = useRef<number>(0);

    // ─────────────────────────────────────────────────────────────────────────
    // Click Suppression (after resize)
    // ─────────────────────────────────────────────────────────────────────────

    useEffect(() => {
        const el = paperRef.current;
        if (!el) return;

        const suppressClick = (e: Event) => {
            if (isResizingRef.current || Date.now() - resizeTimestamp.current < 500) {
                e.stopPropagation();
                e.preventDefault();
                setTimeout(() => {
                    isResizingRef.current = false;
                    resizeTimestamp.current = 0;
                }, 0);
            }
        };

        el.addEventListener("click", suppressClick, true);
        return () => el.removeEventListener("click", suppressClick, true);
    }, []);

    // ─────────────────────────────────────────────────────────────────────────
    // Drag Hooks (pointer + touch fallback)
    // ─────────────────────────────────────────────────────────────────────────

    useEntryPointer({ paperRef: paperRef as React.RefObject<HTMLDivElement>, onDragStart });
    useEntryTouch({ paperRef: paperRef as React.RefObject<HTMLDivElement>, onDragStart });

    // ─────────────────────────────────────────────────────────────────────────
    // Event Handlers
    // ─────────────────────────────────────────────────────────────────────────

    const handleMouseDown = useCallback((e: MouseEvent<HTMLDivElement>) => {
        e.stopPropagation();
        if (e.button !== 0 || isPreview || isDragging) return;

        dragStartPos.current = { x: e.clientX, y: e.clientY };
        isDraggingRef.current = false;

        const onMove = (ev: globalThis.MouseEvent) => {
            if (!dragStartPos.current) return;
            const dx = ev.clientX - dragStartPos.current.x;
            const dy = ev.clientY - dragStartPos.current.y;

            if (dx * dx + dy * dy > 25 && !isDraggingRef.current) {
                isDraggingRef.current = true;
                onDragStart?.(dragStartPos.current.x, dragStartPos.current.y);
                cleanup();
            }
        };

        const onUp = () => {
            cleanup();
            dragStartPos.current = null;
        };

        const cleanup = () => {
            window.removeEventListener("mousemove", onMove);
            window.removeEventListener("mouseup", onUp);
        };

        window.addEventListener("mousemove", onMove);
        window.addEventListener("mouseup", onUp);
    }, [isPreview, isDragging, onDragStart]);

    const handleResize = useCallback((handle: "top" | "bottom", clientY: number) => {
        isResizingRef.current = true;
        resizeTimestamp.current = Date.now();
        onResizeStart?.(handle, clientY);
    }, [onResizeStart]);

    const handleClick = useCallback((e: MouseEvent<HTMLDivElement>) => {
        e.stopPropagation();
        if (isResizingRef.current) {
            isResizingRef.current = false;
            return;
        }
        if (!isDraggingRef.current) {
            onClick?.(entry, e);
        }
        isDraggingRef.current = false;
    }, [entry, onClick]);

    const handleContextMenu = useCallback((e: MouseEvent<HTMLDivElement>) => {
        e.stopPropagation();
        e.preventDefault();
        onContextMenu?.(entry, e);
    }, [entry, onContextMenu]);

    // ─────────────────────────────────────────────────────────────────────────
    // Layout Calculations
    // ─────────────────────────────────────────────────────────────────────────

    const { top, height, durationMinutes } = computeLayout(entry as CalendarEntry & EntryLayout, hourHeight);
    const backgroundColor = entry.task?.color || "#1976d2";
    const title = entry.task?.name || "";
    const duration = formatDuration(durationMinutes);
    const showDuration = height >= 40;
    const showResizeHandles = !isPreview && !isDragging;

    // ─────────────────────────────────────────────────────────────────────────
    // Render
    // ─────────────────────────────────────────────────────────────────────────

    return (
        <Box
            ref={paperRef}
            onMouseDown={handleMouseDown}
            onClick={handleClick}
            onContextMenu={handleContextMenu}
            sx={{
                touchAction: "none",
                position: "absolute",
                top,
                left: `${offsetPercent}%`,
                width: `${widthPercent}%`,
                height,
                backgroundColor,
                borderRadius: 1,
                padding: 0.5,
                overflow: "hidden",
                boxSizing: "border-box",
                cursor: isDragging ? "grabbing" : "pointer",
                zIndex: isDragging || isPreview ? 100 : 10,
                boxShadow: isDragging ? 4 : 1,
                opacity: isDragging ? 0.3 : isPreview ? 0.8 : 1,
                transition: isDragging ? "none" : "box-shadow 0.2s",
                "&:hover": {
                    boxShadow: isDragging ? 4 : 3,
                    filter: isDragging ? "none" : "brightness(0.95)",
                },
                "&:hover > .resize-handle, &:focus-within > .resize-handle": {
                    opacity: showResizeHandles ? 1 : 0,
                },
            }}
        >
            {showResizeHandles && (
                <CalendarEntryResizeHandle
                    position="top"
                    onMouseDown={e => { e.stopPropagation(); e.preventDefault(); handleResize("top", e.clientY); }}
                    onTouchStart={e => { e.stopPropagation(); e.preventDefault(); handleResize("top", e.touches[0]?.clientY); }}
                />
            )}

            <Typography
                variant="caption"
                sx={{
                    color: "white",
                    fontWeight: 600,
                    display: "block",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                    fontSize: height < 40 ? "0.65rem" : "0.75rem",
                }}
            >
                {title}
            </Typography>

            {showDuration && (
                <Typography
                    variant="caption"
                    sx={{
                        color: "rgba(255, 255, 255, 0.9)",
                        display: "block",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                        fontSize: "0.65rem",
                    }}
                >
                    {duration}
                </Typography>
            )}

            {showResizeHandles && (
                <CalendarEntryResizeHandle
                    position="bottom"
                    onMouseDown={e => { e.stopPropagation(); e.preventDefault(); handleResize("bottom", e.clientY); }}
                    onTouchStart={e => { e.stopPropagation(); e.preventDefault(); handleResize("bottom", e.touches[0]?.clientY); }}
                />
            )}
        </Box>
    );
}
