import { Box, useMediaQuery, useTheme } from "@mui/material";
import { useMemo } from "react";
import dayjs from "dayjs";
import CalendarEntryBlock, { EntryLayout } from "./Entry/CalendarEntryBlock";
import CalendarEntryPreview from "./Entry/CalendarEntryPreview";
import CalendarCurrentTimeLine from "./CalendarCurrentTimeLine";

// Hooks & Types
import { CalendarEntry } from "../../services/calendarService";
import { MINUTES_PER_DAY, ResizeHandlePosition, assignEntryLayout } from "./util/calendarUtility";
import { useCalendarDrag } from "./hooks/useCalendarDrag";
import { MoveState } from "./hooks/useEntryMove";
import { ResizeState } from "./hooks/useEntryResize";
import { GapSize } from "./TopBar/CalendarZoom";
import { BASE_CELL_HEIGHT, SMALL_CELL_HEIGHT } from "./util/calendarConfig";
import CalendarDayHeader from "./CalendarDayHeader";

// Types

interface CalendarDayProps {
    dayOfTheMonth: string;
    dayOfTheWeek: string;
    dateStr: string;
    isCompact?: boolean;
    totalDays: number;
    entries?: CalendarEntry[];
    gapSize: GapSize;
    // Callbacks
    onCreateEntry: (dateStr: string, startMinute: number, endMinute: number, anchorPosition: { top: number; left: number }) => void;
    onEntryClick?: (entry: CalendarEntry, ev?: React.MouseEvent) => void;
    onEntryContextMenu?: (entry: CalendarEntry, anchor?: { top: number; left: number } | null) => void;
    onDragEnd?: (preview: { startMinute: number; endMinute: number } | null) => void;
    onEntryDragStart?: (dateStr: string, entryId: string, pointerOffset: number, clientX: number, clientY: number) => void;
    onEntryResizeStart?: (dateStr: string, entryId: string, handle: ResizeHandlePosition, clientY: number) => void;
    onStartRecording?: () => void;
    // Preview state
    persistentDragPreview?: { startMinute: number; endMinute: number } | null;
    isPersistentPreviewActive?: boolean;
    moveState?: MoveState | null;
    resizeState?: ResizeState | null;
}

// Helpers

function computeTotalMinutes(entries: CalendarEntry[], dateStr: string): number {
    const dayStart = dayjs(dateStr).startOf("day");
    const dayEnd = dayStart.endOf("day");

    return entries.reduce((total, entry) => {
        const start = dayjs(entry.start_time);
        const end = dayjs(entry.end_time);
        if (end.isBefore(dayStart) || start.isAfter(dayEnd)) return total;

        const clampedStart = start.isBefore(dayStart) ? dayStart : start;
        const clampedEnd = end.isAfter(dayEnd) ? dayEnd : end;
        return total + Math.max(0, clampedEnd.diff(clampedStart, "minute"));
    }, 0);
}

function generateTimeSlots(gapSize: GapSize): number[] {
    const slots: number[] = [];
    for (let minute = 0; minute < MINUTES_PER_DAY; minute += gapSize) {
        slots.push(minute);
    }
    return slots;
}

// Component

export default function CalendarDay({
    dayOfTheMonth,
    dayOfTheWeek,
    dateStr,
    isCompact = false,
    totalDays,
    entries = [],
    gapSize,
    onCreateEntry,
    onEntryClick,
    onEntryContextMenu,
    onDragEnd,
    onEntryDragStart,
    onEntryResizeStart,
    onStartRecording,
    persistentDragPreview,
    isPersistentPreviewActive,
    moveState,
    resizeState,
}: CalendarDayProps) {
    const theme = useTheme();
    const isSmallWindow = useMediaQuery(theme.breakpoints.down("md"));
    const isTouchDevice = useMediaQuery("(pointer: coarse)") || useMediaQuery("(hover: none)");
    const isToday = dayjs().format("YYYY-MM-DD") === dateStr;

    // Zoom/Layout Calculations

    const baseHourHeight = isSmallWindow ? SMALL_CELL_HEIGHT : BASE_CELL_HEIGHT;
    const pixelsPerMinute = baseHourHeight / gapSize;
    const pixelsPerHour = pixelsPerMinute * 60;
    const slotHeight = baseHourHeight;

    const timeSlots = useMemo(() => generateTimeSlots(gapSize), [gapSize]);
    const totalMinutes = useMemo(() => computeTotalMinutes(entries, dateStr), [entries, dateStr]);
    const laidOutEntries = useMemo(
        () => assignEntryLayout(entries, pixelsPerHour, 30, dateStr),
        [entries, pixelsPerHour, dateStr]
    );

    // Drag Hook

    const { containerRef, dragPreview, isDragging, handlers } = useCalendarDrag({
        hourHeight: pixelsPerHour,
        dateStr,
        isTouchDevice,
        gapSize,
        onCreateEntry,
        onDragEnd: info => onDragEnd?.(info ? { startMinute: info.startMinute, endMinute: info.endMinute } : null),
    });

    // Preview Renderers

    const renderDragPreview = () => {
        if (isPersistentPreviewActive && persistentDragPreview) {
            return (
                <CalendarEntryPreview
                    title=""
                    top={persistentDragPreview.startMinute * pixelsPerMinute}
                    height={(persistentDragPreview.endMinute - persistentDragPreview.startMinute) * pixelsPerMinute}
                    left={4}
                    right={4}
                    zIndex={5}
                />
            );
        }
        if (dragPreview) {
            return (
                <CalendarEntryPreview
                    title=""
                    top={dragPreview.top}
                    height={Math.max(dragPreview.height, 5)}
                    left={4}
                    right={4}
                    zIndex={5}
                />
            );
        }
        return null;
    };

    const renderMovePreview = () => {
        if (!moveState) return null;

        const { currentDateStr, startMinute, endMinute, entry } = moveState;
        const nextDay = dayjs(currentDateStr).add(1, "day").format("YYYY-MM-DD");
        const prevDay = dayjs(currentDateStr).subtract(1, "day").format("YYYY-MM-DD");

        // Helper to render a CalendarEntryBlock preview for a given start/duration
        const renderBlock = (visualStart: number, visualDur: number) => {
            const displayEntry = {
                ...entry,
                visualStartMinute: visualStart,
                visualDuration: visualDur,
            } as EntryLayout;

            return (
                <CalendarEntryBlock
                    entry={displayEntry}
                    hourHeight={pixelsPerHour}
                    isPreview={true}
                    widthPercent={100}
                    offsetPercent={0}
                />
            );
        };

        // Main preview on current day
        if (currentDateStr === dateStr) {
            const clampedStart = Math.max(0, startMinute);
            const clampedEnd = Math.min(MINUTES_PER_DAY, endMinute);
            if (clampedStart < MINUTES_PER_DAY && clampedEnd > 0) {
                return renderBlock(clampedStart, Math.max(clampedEnd - clampedStart, 0));
            }
        }

        // Overflow into next day
        if (nextDay === dateStr && endMinute > MINUTES_PER_DAY) {
            const overflowEnd = endMinute - MINUTES_PER_DAY;
            return renderBlock(0, Math.max(overflowEnd, 0));
        }

        // Underflow from previous day
        if (prevDay === dateStr && startMinute < 0) {
            const underflowStart = MINUTES_PER_DAY + startMinute;
            const underflowEnd = Math.min(MINUTES_PER_DAY, MINUTES_PER_DAY + endMinute);
            if (underflowEnd > underflowStart) {
                return renderBlock(underflowStart, Math.max(underflowEnd - underflowStart, 0));
            }
        }

        return null;
    };

    // Entry Renderer

    const renderEntry = (entry: CalendarEntry & { widthPercent?: number; offsetPercent?: number }) => {
        const isMoving = moveState?.entry.id === entry.id;
        const isResizing = resizeState?.entry.id === entry.id;

        if (isMoving) return null;

        let displayEntry = entry;

        // Update entry visuals if being resized
        if (isResizing && resizeState) {
            const dayStart = dayjs(dateStr).startOf("day");
            const dayEnd = dayStart.add(1, "day");
            const resizeStart = dayjs(resizeState.dateStr).startOf("day").add(resizeState.newStartMinute, "minute");
            const resizeEnd = dayjs(resizeState.dateStr).startOf("day").add(resizeState.newEndMinute, "minute");

            if (resizeEnd.isBefore(dayStart) || resizeStart.isAfter(dayEnd)) return null;

            const clampedStart = resizeStart.isBefore(dayStart) ? dayStart : resizeStart;
            const clampedEnd = resizeEnd.isAfter(dayEnd) ? dayEnd : resizeEnd;

            displayEntry = {
                ...entry,
                visualStartMinute: clampedStart.diff(dayStart, "minute"),
                visualDuration: clampedEnd.diff(clampedStart, "minute"),
                start_time: resizeStart.toISOString(),
                end_time: resizeEnd.toISOString(),
            } as EntryLayout;
        }

        const handleDragStart = onEntryDragStart
            ? (clientX: number, clientY: number) => {
                const container = containerRef.current;
                if (!container) return;

                const rect = container.getBoundingClientRect();
                const pointerMinute = (clientY - rect.top) / pixelsPerMinute;
                const dayStart = dayjs(dateStr).startOf("day");
                const pointerOffset = dayStart.add(pointerMinute, "minute").diff(dayjs(entry.start_time), "minute");

                onEntryDragStart(dateStr, entry.id, pointerOffset, clientX, clientY);
            }
            : undefined;

        const handleContextMenu = onEntryContextMenu
            ? (e: CalendarEntry, ev?: React.MouseEvent) => {
                const anchor = ev ? { top: ev.clientY, left: ev.clientX } : null;
                onEntryContextMenu(e, anchor);
            }
            : undefined;

        return (
            <CalendarEntryBlock
                key={entry.id}
                entry={displayEntry}
                hourHeight={pixelsPerHour}
                onClick={onEntryClick}
                onContextMenu={handleContextMenu}
                isDragging={isResizing}
                widthPercent={entry.widthPercent}
                offsetPercent={entry.offsetPercent}
                onDragStart={handleDragStart}
                onResizeStart={(handle, clientY) => onEntryResizeStart?.(dateStr, entry.id, handle, clientY)}
            />
        );
    };

    // Render

    const widthPercent = totalDays ? 100 / totalDays : 100;

    return (
        <Box
            flex={1}
            bgcolor="background.default"
            position="relative"
            overflow="visible"
            flexShrink={isCompact ? 1 : 0}
            {...(!isCompact && {
                minWidth: { xs: 140, md: 176 },
            })
            }
            {...(isCompact && {
                minWidth: 0,
                flexBasis: `${widthPercent}%`,
                maxWidth: `${widthPercent}%`,
            })
            }
        >
            <CalendarDayHeader
                dayOfTheWeek={dayOfTheWeek}
                dayOfTheMonth={dayOfTheMonth}
                totalMinutes={totalMinutes}
            />

            <Box
                ref={containerRef}
                data-date={dateStr}
                {...handlers}
                position="relative"
                height={slotHeight * timeSlots.length}
                overflow="visible"
                borderRight={t => `1px solid ${t.palette.divider}`}
                sx={{
                    cursor: isTouchDevice ? "pointer" : isDragging ? "grabbing" : "crosshair",
                    userSelect: "none",
                }}
            >
                {/* Time slot dividers */}
                {timeSlots.map((minute, i) => (
                    <Box
                        key={minute}
                        data-minute={minute}
                        position="absolute"
                        top={i * slotHeight}
                        left={0}
                        right={0}
                        height={slotHeight}
                        borderTop={i > 0 ? t => `1px solid ${t.palette.divider}` : undefined}
                        zIndex={1}
                        sx={{ pointerEvents: "none" }}
                    />
                ))}

                {/* Previews */}
                {renderDragPreview()}
                {renderMovePreview()}

                {/* Entries */}
                {laidOutEntries.map(renderEntry)}

                {/* Current time line (only on today) */}
                {isToday && (
                    <CalendarCurrentTimeLine
                        pixelsPerMinute={pixelsPerMinute}
                        onStartRecording={onStartRecording}
                    />
                )}
            </Box>
        </Box>
    );
}
