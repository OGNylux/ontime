/**
 * EntryBlock - renders one calendar entry as a positioned rectangle.
 *
 * Handles:
 *  - Click -> open edit dialog
 *  - Right-click -> context menu
 *  - Mouse-drag -> begin move (desktop)
 *  - Long-press -> begin move (touch)
 *  - Resize handles (top/bottom)
 */
import { Box, Typography } from "@mui/material";
import { MouseEvent, useCallback, useEffect, useRef } from "react";
import { toUserTimezone } from "../../../lib/timezone";
import { useUserTimezone } from "../../../hooks/useUserTimezone";
import { CalendarEntry } from "../../../services/calendarService";
import { TAILWIND_COLORS } from "../../../services/projectService";
import { MINUTES_PER_HOUR, DRAG_THRESHOLD_SQ } from "../constants";
import { formatDuration } from "../layout/timeUtils";
import { useLongPress } from "../hooks/useDragToMove";
import type { ResizeEdge, LayoutEntry } from "../types";
import ResizeHandle from "./ResizeHandle";

interface Props {
    entry: LayoutEntry;
    hourHeight: number;
    onClick?: (entry: CalendarEntry, e?: MouseEvent) => void;
    onContextMenu?: (entry: CalendarEntry, e?: MouseEvent) => void;
    onDragStart?: (cx: number, cy: number) => void;
    onResizeStart?: (edge: ResizeEdge, clientY: number) => void;
    isDragging?: boolean;
    isPreview?: boolean;
}

function computeLayout(entry: LayoutEntry, hourHeight: number, timezone: string) {
    const st = toUserTimezone(entry.start_time, timezone);
    const sm = entry.startMinute ?? (st.hour() * MINUTES_PER_HOUR + st.minute() + st.second() / 60);
    const dur = entry.durationMinutes ?? toUserTimezone(entry.end_time, timezone).diff(st, "minute", true);
    const pxPerMin = hourHeight / MINUTES_PER_HOUR;
    return { top: sm * pxPerMin, height: Math.max(dur * pxPerMin, 5), durationMinutes: Math.max(0, Math.round(dur)) };
}

export default function EntryBlock({
    entry, hourHeight, onClick, onContextMenu, onDragStart, onResizeStart,
    isDragging = false, isPreview = false,
}: Props) {
    const { timezone } = useUserTimezone();
    const paperRef = useRef<HTMLDivElement>(null);
    const dragStart = useRef<{ x: number; y: number } | null>(null);
    const isDraggingRef = useRef(false);
    const isResizingRef = useRef(false);
    const resizeStamp = useRef(0);

    // Suppress stale click after resize
    useEffect(() => {
        const el = paperRef.current;
        if (!el) return;
        const suppress = (e: Event) => {
            if (isResizingRef.current || Date.now() - resizeStamp.current < 500) {
                e.stopPropagation(); e.preventDefault();
                setTimeout(() => { isResizingRef.current = false; resizeStamp.current = 0; }, 0);
            }
        };
        el.addEventListener("click", suppress, true);
        return () => el.removeEventListener("click", suppress, true);
    }, []);

    useLongPress(paperRef, onDragStart);

    const handleMouseDown = useCallback((e: MouseEvent<HTMLDivElement>) => {
        e.stopPropagation();
        if (e.button !== 0 || isPreview || isDragging) return;
        dragStart.current = { x: e.clientX, y: e.clientY };
        isDraggingRef.current = false;

        const onMove = (ev: globalThis.MouseEvent) => {
            if (!dragStart.current) return;
            const dx = ev.clientX - dragStart.current.x, dy = ev.clientY - dragStart.current.y;
            if (dx * dx + dy * dy > DRAG_THRESHOLD_SQ && !isDraggingRef.current) {
                isDraggingRef.current = true;
                onDragStart?.(dragStart.current.x, dragStart.current.y);
                cleanup();
            }
        };
        const onUp = () => { cleanup(); dragStart.current = null; };
        const cleanup = () => { window.removeEventListener("mousemove", onMove); window.removeEventListener("mouseup", onUp); };
        window.addEventListener("mousemove", onMove);
        window.addEventListener("mouseup", onUp);
    }, [isPreview, isDragging, onDragStart]);

    const handleResize = useCallback((edge: ResizeEdge, clientY: number) => {
        isResizingRef.current = true;
        resizeStamp.current = Date.now();
        onResizeStart?.(edge, clientY);
    }, [onResizeStart]);

    const handleClick = useCallback((e: MouseEvent<HTMLDivElement>) => {
        e.stopPropagation();
        if (isResizingRef.current) { isResizingRef.current = false; return; }
        if (!isDraggingRef.current) onClick?.(entry, e);
        isDraggingRef.current = false;
    }, [entry, onClick]);

    const handleCtxMenu = useCallback((e: MouseEvent<HTMLDivElement>) => {
        e.stopPropagation(); e.preventDefault();
        onContextMenu?.(entry, e);
    }, [entry, onContextMenu]);

    const handleResizeClick = useCallback((e: React.MouseEvent) => {
        e.stopPropagation();
        onClick?.(entry, e as MouseEvent<HTMLDivElement>);
    }, [entry, onClick]);

    // Layout
    const { top, height, durationMinutes } = computeLayout(entry, hourHeight, timezone);
    const colorIdx = entry.task?.color ?? 0;
    const color = TAILWIND_COLORS[colorIdx];
    const title = entry.task?.name || "";
    const showTitle = height >= 15;
    const showDuration = height >= 40;
    const showResize = !isPreview && !isDragging;

    return (
        <Box
            ref={paperRef}
            onMouseDown={handleMouseDown}
            onClick={handleClick}
            onContextMenu={handleCtxMenu}
            borderLeft={`3px solid ${color.value}`}
            bgcolor={color.secondary}
            position="absolute"
            top={top} height={height}
            left={`${entry.offsetPct}%`}
            width={`${entry.widthPct}%`}
            borderRadius={1}
            padding={height < 15 ? 0 : 0.5}
            overflow="hidden"
            boxSizing="border-box"
            zIndex={isDragging || isPreview ? 100 : entry.zIndex ?? 10}
            boxShadow={isDragging ? 4 : 1}
            sx={{
                touchAction: "none",
                cursor: isDragging ? "grabbing" : "pointer",
                opacity: isDragging ? 0.3 : isPreview ? 0.8 : 1,
                transition: isDragging ? "none" : "box-shadow 0.2s",
                "&:hover": { boxShadow: isDragging ? 4 : 3, filter: isDragging ? "none" : "brightness(0.95)" },
                "&:hover > .resize-handle, &:focus-within > .resize-handle": { opacity: showResize ? 1 : 0 },
            }}
        >
            {showResize && <ResizeHandle edge="top" onResize={handleResize} onClick={handleResizeClick} />}

            {showTitle && (
                <Typography variant="caption" color="background.default" fontWeight={600} display="block" noWrap fontSize={height < 40 ? "0.65rem" : "0.75rem"}>
                    {title}
                </Typography>
            )}
            {showTitle && entry.project?.name && entry.project?.client?.name && (
                <Typography variant="caption" color="background.default" display="block" noWrap fontSize={height < 40 ? "0.6rem" : "0.7rem"} sx={{ opacity: 0.9 }}>
                    {`${entry.project.name}  • ${entry.project.client.name}`}
                </Typography>
            )}
            {showDuration && (
                <Typography variant="caption" color="background.default" display="block" noWrap fontSize="0.65rem" sx={{ position: "absolute", bottom: 4, left: 6 }}>
                    {formatDuration(durationMinutes)}
                </Typography>
            )}

            {showResize && <ResizeHandle edge="bottom" onResize={handleResize} onClick={handleResizeClick} />}
        </Box>
    );
}
