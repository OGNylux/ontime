import { Box, Typography } from "@mui/material";
import { MouseEvent, useEffect, useRef, useCallback } from "react";
import { toUserTimezone } from "../../../lib/timezone";
import { useUserTimezone } from "../../../hooks/useUserTimezone";
import CalendarEntryResizeHandle from "./CalendarEntryResizeHandle";
import { CalendarEntry } from "../../../services/calendarService";
import { MINUTES_PER_HOUR, ResizeHandlePosition, formatDuration } from "../util/calendarUtility";
import { useEntryLongPress } from "../hooks/useEntryLongPress";
import { TAILWIND_COLORS } from "../../../services/projectService";

interface CalendarEntryBlockProps {
    entry: CalendarEntry;
    hourHeight: number;
    onClick?: (entry: CalendarEntry, ev?: MouseEvent) => void;
    onContextMenu?: (entry: CalendarEntry, ev?: MouseEvent) => void;
    onDragStart?: (clientX: number, clientY: number) => void;
    onResizeStart?: (handle: ResizeHandlePosition, clientY: number) => void;
    isDragging?: boolean;
    isPreview?: boolean;
    widthPercent?: number;
    offsetPercent?: number;
}

export interface EntryLayout extends CalendarEntry {
    visualStartMinute?: number;
    visualDuration?: number;
}


function computeLayout(entry: CalendarEntry & EntryLayout, hourHeight: number, timezone: string) {
    const startTime = toUserTimezone(entry.start_time, timezone);
    const endTime = toUserTimezone(entry.end_time, timezone);

    const startMinutes = entry.visualStartMinute ??
        (startTime.hour() * MINUTES_PER_HOUR + startTime.minute() + startTime.second() / 60);
    const durationMinutes = entry.visualDuration ?? endTime.diff(startTime, "minute", true);

    const pixelsPerMinute = hourHeight / MINUTES_PER_HOUR;

    return {
        top: startMinutes * pixelsPerMinute,
        height: Math.max(durationMinutes * pixelsPerMinute, 5),
        durationMinutes: Math.max(0, Math.round(durationMinutes)),
    };
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
    const { timezone } = useUserTimezone();
    const paperRef = useRef<HTMLDivElement>(null);
    const dragStartPos = useRef<{ x: number; y: number } | null>(null);
    const isDraggingRef = useRef(false);
    const isResizingRef = useRef(false);
    const resizeTimestamp = useRef<number>(0);

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

    useEntryLongPress({ paperRef: paperRef as React.RefObject<HTMLDivElement>, onDragStart });

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

    const handleResize = useCallback((handle: ResizeHandlePosition, clientY: number) => {
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

    const handleResizeHandleClick = useCallback((e: React.MouseEvent) => {
        e.stopPropagation();
        onClick?.(entry, e as MouseEvent<HTMLDivElement>);
    }, [entry, onClick]);

    const { top, height, durationMinutes } = computeLayout(entry as CalendarEntry & EntryLayout, hourHeight, timezone);
    const backgroundColor = entry.task?.color || 0;
    const title = entry.task?.name || "";
    const duration = formatDuration(durationMinutes);
    const showDuration = height >= 40;
    const showTitle = height >= 15;
    const showResizeHandles = !isPreview && !isDragging;

    return (
        <Box
            ref={paperRef}
            onMouseDown={handleMouseDown}
            onClick={handleClick}
            onContextMenu={handleContextMenu}
            borderLeft={`3px solid ${TAILWIND_COLORS[backgroundColor].value}`}
            bgcolor={`${TAILWIND_COLORS[backgroundColor].secondary}`}
            position="absolute"
            top={top}
            height={height}
            left={`${offsetPercent}%`}
            width={`${widthPercent}%`}
            borderRadius={1}
            padding={height < 15 ? 0 : 0.5}
            overflow="hidden"
            boxSizing="border-box"
            zIndex={isDragging || isPreview ? 100 : 10}
            boxShadow={isDragging ? 4 : 1}
            sx={{
                touchAction: "none",
                cursor: isDragging ? "grabbing" : "pointer",
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
                    onClick={handleResizeHandleClick}
                />
            )}

            {showTitle && (
                <Typography
                    variant="caption"
                    color="background.default"
                    fontWeight={600}
                    display="block"
                    overflow="hidden"
                    textOverflow="ellipsis"
                    whiteSpace="nowrap"
                    fontSize={height < 40 ? "0.65rem" : "0.75rem"}
                >
                    {title}
                </Typography>
            )}
            {(entry.project?.name && entry.project?.client?.name) && showTitle && (
                <Typography
                    variant="caption"
                    color="background.default"
                    display="block"
                    overflow="hidden"
                    textOverflow="ellipsis"
                    whiteSpace="nowrap"
                    fontSize={height < 40 ? "0.6rem" : "0.7rem"}
                    sx={{ opacity: 0.9 }}
                >
                    {`${entry.project?.name}  • ${entry.project?.client?.name}`}
                </Typography>
            )}
            {showDuration && (
                <Typography
                    variant="caption"
                    color="background.default"
                    display="block"
                    overflow="hidden"
                    textOverflow="ellipsis"
                    whiteSpace="nowrap"
                    fontSize="0.65rem"
                    sx={{ position: 'absolute', bottom: 4, left: 6 }}
                >
                    {duration}
                </Typography>
            )}

            {showResizeHandles && (
                <CalendarEntryResizeHandle
                    position="bottom"
                    onMouseDown={e => { e.stopPropagation(); e.preventDefault(); handleResize("bottom", e.clientY); }}
                    onClick={handleResizeHandleClick}
                    onTouchStart={e => { e.stopPropagation(); e.preventDefault(); handleResize("bottom", e.touches[0]?.clientY); }}
                />
            )}
        </Box>
    );
}
