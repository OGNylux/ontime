/**
 * DayColumn - renders one day: header -> grid -> entries -> previews -> current-time line.
 *
 * Handles drag-to-create via `useDragToCreate`.
 * All entry interactions (move, resize) flow through CalendarContext.
 */
import { Box, useMediaQuery } from "@mui/material";
import { MouseEvent, useMemo, useCallback } from "react";
import { dayjs, toUserTimezone } from "../../../lib/timezone";
import { useUserTimezone } from "../../../hooks/useUserTimezone";
import { CalendarEntry } from "../../../services/calendarService";
import type { LayoutEntry, ZoomLevel, PixelScale, PersistentPreview, ResizeEdge } from "../types";
import { layoutEntries } from "../layout/layoutEntries";
import { useDragToCreate } from "../hooks/useDragToCreate";
import { useCalendar } from "../context";

import DayHeader from "./DayHeader";
import TimeGrid from "./TimeGrid";
import EntryBlock from "./EntryBlock";
import EntryPreview from "./EntryPreview";
import CurrentTimeLine from "./CurrentTimeLine";

interface Props {
    dateStr: string;
    dayOfMonth: string;
    dayOfWeek: string;
    entries: CalendarEntry[];
    zoom: ZoomLevel;
    scale: PixelScale;
    totalDays: number;
    isCompact: boolean;
    persistentPreview: PersistentPreview | null;
    onPreviewSet?: (p: PersistentPreview | null) => void;
    onStartRecording?: () => void;
}

function calcTotalMinutes(entries: CalendarEntry[], dateStr: string, tz: string): number {
    const dayStart = dayjs.tz(dateStr, tz).startOf("day");
    const dayEnd = dayStart.endOf("day");
    return entries.reduce((t, e) => {
        const s = toUserTimezone(e.start_time, tz);
        const end = toUserTimezone(e.end_time, tz);
        if (end.isBefore(dayStart) || s.isAfter(dayEnd)) return t;
        return t + Math.max(0, (end.isAfter(dayEnd) ? dayEnd : end).diff(s.isBefore(dayStart) ? dayStart : s, "minute"));
    }, 0);
}

export default function DayColumn({
    dateStr, dayOfMonth, dayOfWeek, entries, zoom, scale, totalDays,
    isCompact, persistentPreview, onPreviewSet, onStartRecording,
}: Props) {
    const { timezone } = useUserTimezone();
    const { openCreate, openEdit, openMenu, moveState, beginMove, resizeState, beginResize } = useCalendar();
    const isTouch = useMediaQuery("(pointer: coarse)") || useMediaQuery("(hover: none)");
    const isToday = dayjs().tz(timezone).format("YYYY-MM-DD") === dateStr;

    const totalMins = useMemo(() => calcTotalMinutes(entries, dateStr, timezone), [entries, dateStr, timezone]);
    const laidOut = useMemo(() => layoutEntries(entries, scale.pxPerHour, 30, dateStr), [entries, scale.pxPerHour, dateStr]);

    const { ref, preview, isDragging, handlers } = useDragToCreate({
        pxPerMin: scale.pxPerMin, dateStr, isTouch, zoom, onOpen: openCreate, onPreviewSet,
    });

    //  Entry interaction callbacks 
    const onEntryClick = useCallback((entry: CalendarEntry, ev?: MouseEvent) => {
        openEdit(entry, ev ? { top: ev.clientY, left: ev.clientX } : null);
    }, [openEdit]);

    const onEntryCtx = useCallback((entry: CalendarEntry, ev?: MouseEvent) => {
        if (ev) openMenu?.(entry, { top: ev.clientY, left: ev.clientX });
    }, [openMenu]);

    const makeOnDragStart = useCallback((le: LayoutEntry) => (x: number, y: number) => {
        if (!ref.current) return;
        const rect = ref.current.getBoundingClientRect();
        const offsetY = y - rect.top;
        const pointerMinute = (offsetY / rect.height) * 1440;
        const offset = pointerMinute - le.startMinute;
        beginMove({ dateStr, entryId: le.id, pointerOffset: offset, clientX: x, clientY: y });
    }, [beginMove, dateStr, ref]);

    const makeOnResizeStart = useCallback((le: LayoutEntry) => (edge: ResizeEdge, clientY: number) => {
        beginResize({ dateStr, entryId: le.id, edge, clientY });
    }, [beginResize, dateStr]);

    const isEntryBeingMoved = (id: string) => moveState?.entry.id === id;
    //  Render 
    const wp = totalDays ? 100 / totalDays : 100;
    const totalColumnHeight = 64 + scale.totalHeight; // header (64px) + grid height

    return (
        <Box flex="1 1 0" minWidth={0} alignSelf="stretch" height={totalColumnHeight}
            {...(isCompact && { flexBasis: `${wp}%`, maxWidth: `${wp}%` })}>
            <DayHeader dayOfWeek={dayOfWeek} dayOfMonth={dayOfMonth} totalMinutes={totalMins} isToday={isToday} />

            <Box ref={ref} data-date={dateStr} {...handlers}
                position="relative" height={scale.totalHeight}
                bgcolor="background.default"
                borderRight={t => `1px solid ${t.palette.divider}`}
                sx={{ cursor: isTouch ? "pointer" : isDragging ? "grabbing" : "crosshair", userSelect: "none" }}>

                <TimeGrid slotHeight={scale.slotHeight} zoom={zoom} />

                {preview && <Box position="absolute" top={preview.topPx} left={4} right={4}
                    height={Math.max(preview.heightPx, 5)} bgcolor="secondary.main" borderRadius={1}
                    sx={{ opacity: 0.35, pointerEvents: "none" }} />}

                {persistentPreview && persistentPreview.dateStr === dateStr && (
                    <Box position="absolute" top={persistentPreview.startMinute * scale.pxPerMin} left={4} right={4}
                        height={Math.max((persistentPreview.endMinute - persistentPreview.startMinute) * scale.pxPerMin, 5)}
                        bgcolor="secondary.main" borderRadius={1} sx={{ opacity: 0.25, pointerEvents: "none" }} />
                )}

                {moveState && moveState.currentDateStr === dateStr && (
                    <EntryPreview
                        title={moveState.entry.task?.name || ""}
                        startIso={moveState.entry.start_time}
                        endIso={moveState.entry.end_time}
                        top={moveState.startMinute * scale.pxPerMin}
                        height={moveState.durationMinutes * scale.pxPerMin}
                    />
                )}

                {laidOut.map(le => (
                    <EntryBlock
                        key={le.id}
                        entry={le}
                        hourHeight={scale.pxPerHour}
                        onClick={onEntryClick}
                        onContextMenu={onEntryCtx}
                        onDragStart={makeOnDragStart(le)}
                        onResizeStart={makeOnResizeStart(le)}
                        isDragging={isEntryBeingMoved(le.id)}
                        isPreview={false}
                    />
                ))}

                {resizeState && resizeState.dateStr === dateStr && (
                    <Box position="absolute" left={4} right={4}
                        top={resizeState.newStart * scale.pxPerMin}
                        height={Math.max((resizeState.newEnd - resizeState.newStart) * scale.pxPerMin, 5)}
                        bgcolor="secondary.main" borderRadius={1}
                        sx={{ opacity: 0.3, pointerEvents: "none", zIndex: 50 }} />
                )}

                {isToday && <CurrentTimeLine pxPerMin={scale.pxPerMin} onStartRecording={onStartRecording} />}
            </Box>
        </Box>
    );
}
