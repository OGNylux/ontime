import { Box, useMediaQuery, useTheme } from "@mui/material";
import { useMemo } from "react";
import { dayjs, toUserTimezone } from "../../lib/timezone";
import { useUserTimezone } from "../../hooks/useUserTimezone";
import CalendarEntryBlock, { EntryLayout } from "./Entry/CalendarEntryBlock";
import CalendarEntryPreview from "./Entry/CalendarEntryPreview";
import CalendarCurrentTimeLine from "./CalendarCurrentTimeLine";

import { CalendarEntry } from "../../services/calendarService";
import { MINUTES_PER_DAY, assignEntryLayout } from "./util/calendarUtility";
import { useCalendarDrag } from "./hooks/useCalendarDrag";
import { GapSize } from "./TopBar/CalendarZoom";
import { BASE_CELL_HEIGHT, SMALL_CELL_HEIGHT } from "./util/calendarConfig";
import CalendarDayHeader from "./CalendarDayHeader";
import { useCalendarContext } from "./CalendarContext";


interface CalendarDayProps {
    dayOfTheMonth: string;
    dayOfTheWeek: string;
    dateStr: string;
    isCompact?: boolean;
    totalDays: number;
    entries?: CalendarEntry[];
    gapSize: GapSize;
    onStartRecording?: () => void;
    persistentDragPreview?: { startMinute: number; endMinute: number } | null;
    isPersistentPreviewActive?: boolean;
    onDragEnd?: (preview: { startMinute: number; endMinute: number } | null) => void;
}

function computeTotalMinutes(entries: CalendarEntry[], dateStr: string, timezone: string): number {
    const dayStart = dayjs.tz(dateStr, timezone).startOf("day");
    const dayEnd = dayStart.endOf("day");

    return entries.reduce((total, entry) => {
        const start = toUserTimezone(entry.start_time, timezone);
        const end = toUserTimezone(entry.end_time, timezone);
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

export default function CalendarDay({
    dayOfTheMonth,
    dayOfTheWeek,
    dateStr,
    isCompact = false,
    totalDays,
    entries = [],
    gapSize,
    onStartRecording,
    persistentDragPreview,
    isPersistentPreviewActive,
    onDragEnd,
}: CalendarDayProps) {
    const { timezone } = useUserTimezone();
    const { openCreateDialog, openEditDialog, openContextMenu, moveState, beginMove, resizeState, beginResize } = useCalendarContext();
    const theme = useTheme();
    const isSmallWindow = useMediaQuery(theme.breakpoints.down("md"));
    const isPointerCoarse = useMediaQuery("(pointer: coarse)");
    const isHoverNone = useMediaQuery("(hover: none)");
    const isTouchDevice = isPointerCoarse || isHoverNone;
    const isToday = dayjs().tz(timezone).format("YYYY-MM-DD") === dateStr;


    const baseHourHeight = isSmallWindow ? SMALL_CELL_HEIGHT : BASE_CELL_HEIGHT;
    const pixelsPerMinute = baseHourHeight / gapSize;
    const pixelsPerHour = pixelsPerMinute * 60;
    const slotHeight = baseHourHeight;

    const timeSlots = useMemo(() => generateTimeSlots(gapSize), [gapSize]);
    const totalMinutes = useMemo(() => computeTotalMinutes(entries, dateStr, timezone), [entries, dateStr, timezone]);
    const laidOutEntries = useMemo(
        () => assignEntryLayout(entries, pixelsPerHour, 30, dateStr),
        [entries, pixelsPerHour, dateStr]
    );


    const { containerRef, dragPreview, isDragging, handlers } = useCalendarDrag({
        hourHeight: pixelsPerHour,
        dateStr,
        isTouchDevice,
        gapSize,
        onCreateEntry: (dateStr, startMinute, endMinute, anchorPosition) => {
            openCreateDialog(dateStr, startMinute, endMinute, anchorPosition);
        },
        onDragEnd: info => onDragEnd?.(info ? { startMinute: info.startMinute, endMinute: info.endMinute } : null),
    });


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

        if (currentDateStr === dateStr) {
            const clampedStart = Math.max(0, startMinute);
            const clampedEnd = Math.min(MINUTES_PER_DAY, endMinute);
            if (clampedStart < MINUTES_PER_DAY && clampedEnd > 0) {
                return renderBlock(clampedStart, Math.max(clampedEnd - clampedStart, 0));
            }
        }

        if (nextDay === dateStr && endMinute > MINUTES_PER_DAY) {
            const overflowEnd = endMinute - MINUTES_PER_DAY;
            return renderBlock(0, Math.max(overflowEnd, 0));
        }

        if (prevDay === dateStr && startMinute < 0) {
            const underflowStart = MINUTES_PER_DAY + startMinute;
            const underflowEnd = Math.min(MINUTES_PER_DAY, MINUTES_PER_DAY + endMinute);
            if (underflowEnd > underflowStart) {
                return renderBlock(underflowStart, Math.max(underflowEnd - underflowStart, 0));
            }
        }

        return null;
    };


    const renderEntry = (entry: CalendarEntry & { widthPercent?: number; offsetPercent?: number }) => {
        const isMoving = moveState?.entry.id === entry.id;
        const isResizing = resizeState?.entry.id === entry.id;

        // Show ghost of original position when moving
        if (isMoving) {
            return (
                <CalendarEntryBlock
                    key={entry.id}
                    entry={entry}
                    hourHeight={pixelsPerHour}
                    isDragging={true}
                    widthPercent={entry.widthPercent}
                    offsetPercent={entry.offsetPercent}
                />
            );
        }

        let displayEntry = entry;

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

        const handleDragStart = (clientX: number, clientY: number) => {
            const container = containerRef.current;
            if (!container) return;

            const rect = container.getBoundingClientRect();
            const pointerMinute = (clientY - rect.top) / pixelsPerMinute;
            const dayStart = dayjs(dateStr).startOf("day");
            const pointerOffset = dayStart.add(pointerMinute, "minute").diff(dayjs(entry.start_time), "minute");

            beginMove({ dateStr, entryId: entry.id, pointerOffset, clientX, clientY });
        };

        const handleContextMenu = (e: CalendarEntry, ev?: React.MouseEvent) => {
            if (ev && openContextMenu) {
                openContextMenu(e, { top: ev.clientY, left: ev.clientX });
            } else {
                openEditDialog(e, ev ? { top: ev.clientY, left: ev.clientX } : null);
            }
        };

        return (
            <CalendarEntryBlock
                key={entry.id}
                entry={displayEntry}
                hourHeight={pixelsPerHour}
                onClick={(e, ev) => openEditDialog(e, ev ? { top: ev.clientY, left: ev.clientX } : null)}
                onContextMenu={handleContextMenu}
                isDragging={isResizing}
                widthPercent={entry.widthPercent}
                offsetPercent={entry.offsetPercent}
                onDragStart={handleDragStart}
                onResizeStart={(handle, clientY) => beginResize({ dateStr, entryId: entry.id, handle, clientY })}
            />
        );
    };


    const widthPercent = totalDays ? 100 / totalDays : 100;

    return (
        <Box
            flex="1 1 0"
            bgcolor="background.default"
            position="relative"
            overflow="visible"
            minWidth={0}
            {...(isCompact && {
                flexBasis: `${widthPercent}%`,
                maxWidth: `${widthPercent}%`,
            })}
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
