import { Box, Typography } from "@mui/material";
import { MouseEvent, useEffect, useRef } from "react";
import dayjs from "dayjs";
import { CalendarEntry } from "../../services/calendarService";
import { MINUTES_PER_HOUR } from "./util/calendarUtility";
import { useEntryTouch } from "./hooks/useEntryTouch";
import { useEntryPointer } from "./hooks/useEntryPointer";
import CalendarEntryResizeHandle from "./CalendarEntryResizeHandle";

interface CalendarEntryBlockProps {
    entry: CalendarEntry;
    hourHeight: number;
    onClick?: (entry: CalendarEntry, ev?: MouseEvent) => void;
    onContextMenu?: (entry: CalendarEntry, ev?: MouseEvent) => void;
    onDragStart?: (clientX: number, clientY: number) => void;
    onResizeStart?: (handle: 'start' | 'end', clientY: number) => void;
    isDragging?: boolean;
    isPreview?: boolean;
    widthPercent?: number;
    offsetPercent?: number;
}

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
    const dragStartPosRef = useRef<{ x: number; y: number } | null>(null);
    const isDraggingRef = useRef(false);
    const isResizingRef = useRef(false);
    const resizeStartTsRef = useRef<number | null>(null);

    // Prevent click events from triggering immediately after a resize interaction.
    // Use a native capture listener so we can stop clicks before React's synthetic
    // handlers run.
    useEffect(() => {
        const el = paperRef.current;
        if (!el) return;

        const handleClickCapture = (e: Event) => {
            const ts = resizeStartTsRef.current;
            try { console.debug('[CalendarEntryBlock] click-capture, isResizing=', isResizingRef.current, 'tsAge=', ts ? Date.now() - ts : null); } catch (_) {}
            if (isResizingRef.current || (ts && Date.now() - ts < 500)) {
                try {
                    console.debug('[CalendarEntryBlock] suppressing click due to resize');
                } catch (_) {}
                try {
                    e.stopPropagation();
                    e.preventDefault();
                } catch (_) {}
                // reset flag on next tick to allow normal clicks afterwards
                setTimeout(() => { isResizingRef.current = false; resizeStartTsRef.current = null; }, 0);
            }
        };

        el.addEventListener('click', handleClickCapture, true);
        return () => el.removeEventListener('click', handleClickCapture, true);
    }, []);

    // Handle touch interactions (long press to drag)
    // Prefer pointer-based long-press (works better for pointer capture on mobile)
    useEntryPointer({
        paperRef: paperRef as React.RefObject<HTMLDivElement>,
        onDragStart
    });

    // Keep older touch fallback for environments without pointer events
    useEntryTouch({
        paperRef: paperRef as React.RefObject<HTMLDivElement>,
        onDragStart
    });

    const handleMouseDown = (event: MouseEvent<HTMLDivElement>) => {
        event.stopPropagation();
        if (event.button !== 0) return; // Only left click
        if (isPreview || isDragging) return;
        
        dragStartPosRef.current = { x: event.clientX, y: event.clientY };
        isDraggingRef.current = false;

        const handleWindowMouseMove = (e: globalThis.MouseEvent) => {
            if (!dragStartPosRef.current) return;
            const dx = e.clientX - dragStartPosRef.current.x;
            const dy = e.clientY - dragStartPosRef.current.y;
            const distSq = dx * dx + dy * dy;

            if (distSq > 25 && !isDraggingRef.current) {
                isDraggingRef.current = true;
                if (onDragStart) {
                    onDragStart(dragStartPosRef.current.x, dragStartPosRef.current.y);
                }
                window.removeEventListener("mousemove", handleWindowMouseMove);
                window.removeEventListener("mouseup", handleWindowMouseUp);
            }
        };

        const handleWindowMouseUp = () => {
            window.removeEventListener("mousemove", handleWindowMouseMove);
            window.removeEventListener("mouseup", handleWindowMouseUp);
            dragStartPosRef.current = null;
        };

        window.addEventListener("mousemove", handleWindowMouseMove);
        window.addEventListener("mouseup", handleWindowMouseUp);
    };

    const handleResizeMouseDown = (e: MouseEvent<HTMLDivElement>, handle: 'start' | 'end') => {
        e.stopPropagation();
        e.preventDefault(); // Prevent text selection
        try { console.debug('[CalendarEntryBlock] handleResizeMouseDown', handle); } catch (_) {}
        isResizingRef.current = true;
        resizeStartTsRef.current = Date.now();
        if (onResizeStart) {
            onResizeStart(handle, e.clientY);
        }
    };

    const handleResizeTouchStart = (e: React.TouchEvent<HTMLDivElement>, handle: 'start' | 'end') => {
        e.stopPropagation();
        e.preventDefault();
        try { console.debug('[CalendarEntryBlock] handleResizeTouchStart', handle); } catch (_) {}
        isResizingRef.current = true;
        resizeStartTsRef.current = Date.now();
        if (onResizeStart && e.touches && e.touches[0]) {
            onResizeStart(handle, e.touches[0].clientY);
        }
    };

    const handleClick = (e: MouseEvent<HTMLDivElement>) => {
        e.stopPropagation();
        try { console.debug('[CalendarEntryBlock] handleClick, isResizing=', isResizingRef.current, 'isDragging=', isDraggingRef.current); } catch (_) {}
        // Suppress click when a resize just started
        if (isResizingRef.current) {
            isResizingRef.current = false;
            return;
        }

        // Only trigger click if we didn't just drag
        if (!isDraggingRef.current && onClick) {
            onClick(entry, e);
        }
        isDraggingRef.current = false;
    };

    const handleContextMenu = (e: MouseEvent<HTMLDivElement>) => {
        e.stopPropagation();
        e.preventDefault();
        if (onContextMenu) {
            onContextMenu(entry, e);
        }
    };
    const startTime = dayjs(entry.start_time);
    const endTime = dayjs(entry.end_time);

    // Calculate position and height based on time
    // Prefer visual layout props if available (from assignEntryLayout)
    const visualStart = (entry as any).visualStartMinute;
    const visualDuration = (entry as any).visualDuration;
    
    let startMinutes: number;
    let durationMinutes: number;

    if (typeof visualStart === 'number' && typeof visualDuration === 'number') {
        startMinutes = visualStart;
        durationMinutes = visualDuration;
    } else {
        startMinutes = startTime.hour() * MINUTES_PER_HOUR + startTime.minute();
        durationMinutes = endTime.diff(startTime, 'minute');
    }

    // Calculate pixel values
    const pixelsPerMinute = hourHeight / MINUTES_PER_HOUR;
    const topOffset = startMinutes * pixelsPerMinute;
    const height = Math.max(durationMinutes * pixelsPerMinute, 20); // Minimum height of 20px

    // Get color from task or use default
    const backgroundColor = entry.task?.color || "#1976d2";

    // Format time display
    const timeDisplay = `${startTime.format("h:mm A")} - ${endTime.format("h:mm A")}`;
    const title = entry.task?.name || "";

    return (
        <Box
            ref={paperRef}
            onMouseDown={handleMouseDown}
            onClick={handleClick}
            onContextMenu={handleContextMenu}
            sx={{
                touchAction: 'none',
                position: "absolute",
                top: topOffset,
                left: `${offsetPercent}%`,
                width: `${widthPercent}%`,
                height: height,
                backgroundColor: backgroundColor,
                borderRadius: 1,
                padding: 0.5,
                overflow: "hidden",
                cursor: isDragging ? "grabbing" : "pointer",
                zIndex: isDragging || isPreview ? 100 : 10,
                boxShadow: isDragging ? 4 : 1,
                opacity: isDragging ? 0.3 : isPreview ? 0.8 : 1,
                transition: isDragging ? "none" : "box-shadow 0.2s",
                boxSizing: "border-box",
                "&:hover": {
                    boxShadow: isDragging ? 4 : 3,
                    filter: isDragging ? "none" : "brightness(0.95)",
                },
                "&:hover > .resize-handle, &:focus-within > .resize-handle": {
                    opacity: isDragging || isPreview ? 0 : 1,
                }
            }}
        >
            {/* Resize Handle Top */}
            {!isPreview && !isDragging && (
                <CalendarEntryResizeHandle
                    position="top"
                    zIndex={12}
                    onMouseDown={(e: React.MouseEvent) => handleResizeMouseDown(e as any, 'start')}
                    onTouchStart={(e: React.TouchEvent) => handleResizeTouchStart(e as any, 'start')}
                    className=""
                    style={{}}
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
            {height >= 40 && (
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
                    {timeDisplay}
                </Typography>
            )}

            {/* Resize Handle Bottom */}
            {!isPreview && !isDragging && (
                <CalendarEntryResizeHandle
                    position="bottom"
                    zIndex={12}
                    onMouseDown={(e: React.MouseEvent) => handleResizeMouseDown(e as any, 'end')}
                    onTouchStart={(e: React.TouchEvent) => handleResizeTouchStart(e as any, 'end')}
                    className=""
                    style={{}}
                />
            )}
        </Box>
    );
}
