import { Box, useMediaQuery, useTheme, Typography } from "@mui/material";
import { useMemo, useState, useRef, useLayoutEffect } from "react";
import dayjs from "dayjs";
import CalendarDayHeader from "./CalendarDayHeader";
import CalendarEntryBlock from "./CalendarEntryBlock";
import CalendarEntryPreview from "./CalendarEntryPreview";
import { CalendarEntry } from "../../services/calendarService";
import { HOURS_PER_DAY, MINUTES_PER_HOUR, MINUTES_PER_DAY, assignEntryLayout } from "./util/calendarUtility";
import { useCalendarDrag } from "./hooks/useCalendarDrag";
import { MoveState } from "./hooks/useEntryMove";
import { ResizeState } from "./hooks/useEntryResize";

interface CalendarDayProps {
    dayOfTheMonth: string;
    dayOfTheWeek: string;
    dateStr: string;
    isCompact?: boolean;
    totalDays: number;
    entries?: CalendarEntry[];
    onCreateEntry: (dateStr: string, startMinute: number, endMinute: number, anchorPosition: { top: number; left: number }) => void;
    onEntryClick?: (entry: CalendarEntry, ev?: React.MouseEvent) => void;
    onEntryContextMenu?: (entry: CalendarEntry, anchor?: { top: number; left: number } | null) => void;
    persistentDragPreview?: { startMinute: number; endMinute: number } | null;
    isPersistentPreviewActive?: boolean;
    onDragEnd?: (preview: { startMinute: number; endMinute: number } | null) => void;
    // Move support
    moveState?: MoveState | null;
    onEntryDragStart?: (dateStr: string, entryId: string, pointerOffset: number, clientX: number, clientY: number) => void;
    // Resize support
    resizeState?: ResizeState | null;
    onEntryResizeStart?: (dateStr: string, entryId: string, handle: 'start' | 'end', clientY: number) => void;
}

export default function CalendarDay({
    dayOfTheMonth,
    dayOfTheWeek,
    dateStr,
    isCompact = false,
    totalDays,
    entries = [],
    onCreateEntry,
    persistentDragPreview,
    isPersistentPreviewActive,
    onDragEnd,
    onEntryClick,
    onEntryContextMenu,
    moveState,
    onEntryDragStart,
    resizeState,
    onEntryResizeStart,
}: CalendarDayProps) {
    const theme = useTheme();
    const isSmallWindow = useMediaQuery(theme.breakpoints.down("md"));
    const isTouchDevice = useMediaQuery("(pointer: coarse)") || useMediaQuery("(hover: none)");
    const hourHeight = isSmallWindow ? 40 : 48;
    const compactWidthPercent = `${totalDays ? 100 / totalDays : 100}%`;

    const [titleHeight, setTitleHeight] = useState(30);
    const titleRef = useRef<HTMLElement>(null);

    useLayoutEffect(() => {
        if (titleRef.current) setTitleHeight(titleRef.current.offsetHeight + 4);
    }, []);

    const { containerRef, dragPreview, isDragging, handlers } = useCalendarDrag({
        hourHeight,
        dateStr,
        isTouchDevice,
        onCreateEntry,
        onDragEnd: (info) => {
            if (onDragEnd) onDragEnd(info ? { startMinute: info.startMinute, endMinute: info.endMinute } : null);
        },
    });

    const laidOutEntries = useMemo(() => {
        return assignEntryLayout(entries, hourHeight, titleHeight, dateStr);
    }, [entries, hourHeight, titleHeight, dateStr]);

    return (
        <Box
            sx={{
                flex: 1,
                bgcolor: "grey.50",
                position: "relative",
                overflow: "visible",
                flexShrink: isCompact ? 1 : 0,
                ...(isCompact
                    ? {
                        minWidth: 0,
                        flexBasis: compactWidthPercent,
                        maxWidth: compactWidthPercent,
                        borderRight: theme => `1px solid ${theme.palette.divider}`,
                    }
                    : {
                        minWidth: { xs: 140, md: 176 },
                        borderRight: theme => `1px solid ${theme.palette.divider}`,
                    }),
            }}
        >
            <CalendarDayHeader dayOfTheWeek={dayOfTheWeek} dayOfTheMonth={dayOfTheMonth} />
            {/* Container for calendar entries */}
            <Box
                ref={containerRef}
                data-date={dateStr}
                {...handlers}
                sx={{
                    position: "relative",
                    height: hourHeight * HOURS_PER_DAY,
                    overflow: "visible",
                    cursor: isTouchDevice ? "pointer" : (isDragging ? "grabbing" : "crosshair"),
                    userSelect: "none",
                }}
            >
                {/* Hour divisions */}
                {Array.from({ length: HOURS_PER_DAY + 2 }).map((_, hour) => (
                    <Box
                        key={hour}
                            sx={{
                                position: "absolute",
                                top: hour * hourHeight,
                            left: 0,
                            right: 0,
                            height: hourHeight,
                            borderTop: hour === 0 ? undefined : theme => `1px solid ${theme.palette.divider}`,
                            pointerEvents: "none",
                            zIndex: 1,
                        }}
                    />
                ))}
                {/* Drag preview (either local or persistent from parent) */}
                {/* Drag preview: if parent provides persistent minutes, compute pixels here */}
                {isPersistentPreviewActive && persistentDragPreview ? (
                    (() => {
                        const top = (persistentDragPreview.startMinute / MINUTES_PER_HOUR) * hourHeight;
                        const height = ((persistentDragPreview.endMinute - persistentDragPreview.startMinute) / MINUTES_PER_HOUR) * hourHeight;
                        return (
                            <CalendarEntryPreview
                                title={""}
                                startIso={undefined}
                                endIso={undefined}
                                top={top}
                                height={height}
                                left={4}
                                right={4}
                                zIndex={5}
                            />
                        );
                    })()
                ) : dragPreview && (
                    <CalendarEntryPreview
                        title={""}
                        top={dragPreview.top}
                        height={Math.max(dragPreview.height, 20)}
                        left={4}
                        right={4}
                        zIndex={5}
                    />
                )}
                {/* Move preview - show where entry will be placed */}
                {moveState && moveState.currentDateStr === dateStr && (() => {
                    // Clamp preview to midnight boundary
                    const previewStart = Math.max(0, moveState.startMinute);
                    const previewEnd = Math.min(MINUTES_PER_DAY, moveState.endMinute);
                    if (previewStart >= MINUTES_PER_DAY || previewEnd <= 0) return null;
                    
                    return (
                        <CalendarEntryPreview
                            title={moveState.entry.task?.name || ""}
                            startIso={dayjs(moveState.currentDateStr).startOf('day').add(previewStart, 'minute').toISOString()}
                            endIso={dayjs(moveState.currentDateStr).startOf('day').add(previewEnd, 'minute').toISOString()}
                            top={(previewStart / MINUTES_PER_HOUR) * hourHeight}
                            height={Math.max(((previewEnd - previewStart) / MINUTES_PER_HOUR) * hourHeight, 20)}
                            left={4}
                            right={4}
                            zIndex={10}
                        />
                    );
                })()}
                {/* Move preview overflow into next day */}
                {moveState && (() => {
                    const nextDayStr = dayjs(moveState.currentDateStr).add(1, 'day').format('YYYY-MM-DD');
                    if (nextDayStr !== dateStr) return null;
                    if (moveState.endMinute <= MINUTES_PER_DAY) return null;
                    
                    const overflowStart = 0;
                    const overflowEnd = moveState.endMinute - MINUTES_PER_DAY;
                    
                    return (
                        <CalendarEntryPreview
                            title={moveState.entry.task?.name || ""}
                            startIso={dayjs(moveState.currentDateStr).startOf('day').add(0, 'minute').toISOString()}
                            endIso={dayjs(moveState.currentDateStr).startOf('day').add(overflowEnd, 'minute').toISOString()}
                            top={(overflowStart / MINUTES_PER_HOUR) * hourHeight}
                            height={Math.max(((overflowEnd - overflowStart) / MINUTES_PER_HOUR) * hourHeight, 20)}
                            left={4}
                            right={4}
                            zIndex={10}
                        />
                    );
                })()}
                {/* Move preview underflow from previous day */}
                {moveState && (() => {
                    const prevDayStr = dayjs(moveState.currentDateStr).subtract(1, 'day').format('YYYY-MM-DD');
                    if (prevDayStr !== dateStr) return null;
                    if (moveState.startMinute >= 0) return null;
                    
                    const underflowStart = MINUTES_PER_DAY + moveState.startMinute;
                    const underflowEnd = Math.min(MINUTES_PER_DAY, MINUTES_PER_DAY + moveState.endMinute);
                    
                    if (underflowStart >= MINUTES_PER_DAY || underflowEnd <= underflowStart) return null;
                    
                    return (
                        <CalendarEntryPreview
                            title={moveState.entry.task?.name || ""}
                            startIso={dayjs(moveState.currentDateStr).startOf('day').add(underflowStart, 'minute').toISOString()}
                            endIso={dayjs(moveState.currentDateStr).startOf('day').add(underflowEnd, 'minute').toISOString()}
                            top={(underflowStart / MINUTES_PER_HOUR) * hourHeight}
                            height={Math.max(((underflowEnd - underflowStart) / MINUTES_PER_HOUR) * hourHeight, 20)}
                            left={4}
                            right={4}
                            zIndex={10}
                        />
                    );
                })()}
                {/* Calendar entries */}
                {laidOutEntries.map((entry) => {
                    const isMoving = moveState?.entry.id === entry.id;
                    const isResizing = resizeState?.entry.id === entry.id;
                    
                    // If moving, we hide the original entry (it's being dragged)
                    if (isMoving) return null;

                    // If resizing, we might want to show the entry being resized with updated dimensions
                    // Or we can hide the original and show a preview.
                    // Let's try to update the entry in place if it's being resized.
                    let displayEntry = entry;
                    let visualStart = (entry as any).visualStartMinute;
                    let visualDuration = (entry as any).visualDuration;

                    if (isResizing && resizeState) {
                        // Calculate visual start/duration for the resizing entry
                        // We need to map the absolute minutes back to this day's visual range
                        const dayStart = dayjs(dateStr).startOf('day');
                        const resizeStart = dayjs(resizeState.dateStr).startOf('day').add(resizeState.newStartMinute, 'minute');
                        const resizeEnd = dayjs(resizeState.dateStr).startOf('day').add(resizeState.newEndMinute, 'minute');

                        // Check if the resized entry still overlaps with this day
                        const dayEnd = dayStart.add(1, 'day');
                        
                        if (resizeEnd.isBefore(dayStart) || resizeStart.isAfter(dayEnd)) {
                            // Moved out of this day completely
                            return null;
                        }

                        // Clamp to this day
                        const clampedStart = resizeStart.isBefore(dayStart) ? dayStart : resizeStart;
                        const clampedEnd = resizeEnd.isAfter(dayEnd) ? dayEnd : resizeEnd;

                        visualStart = clampedStart.diff(dayStart, 'minute');
                        visualDuration = clampedEnd.diff(clampedStart, 'minute');
                        
                        // Create a temporary entry object for display
                        displayEntry = {
                            ...entry,
                            visualStartMinute: visualStart,
                            visualDuration: visualDuration,
                            start_time: resizeStart.toISOString(),
                            end_time: resizeEnd.toISOString()
                        } as any;
                    }

                    return (
                        <CalendarEntryBlock
                            key={entry.id}
                            entry={displayEntry}
                            hourHeight={hourHeight}
                            onClick={onEntryClick}
                            onContextMenu={onEntryContextMenu ? (eEntry, ev) => {
                                const rect = containerRef.current?.getBoundingClientRect();
                                const anchor = ev ? { top: ev.clientY, left: ev.clientX } : rect ? { top: rect.top, left: rect.left } : undefined;
                                onEntryContextMenu?.(eEntry, anchor || null);
                            } : undefined}
                            isDragging={isResizing}
                            widthPercent={entry.widthPercent}
                            offsetPercent={entry.offsetPercent}
                            onDragStart={onEntryDragStart ? (clientX, clientY) => {
                                // Calculate pointer offset within the entry
                                const container = containerRef.current;
                                if (!container) return;
                                const rect = container.getBoundingClientRect();
                                const y = clientY - rect.top;
                                const pointerMinute = (y / hourHeight) * MINUTES_PER_HOUR;
                                
                                // Calculate absolute offset in minutes from entry start
                                const dayStart = dayjs(dateStr).startOf('day');
                                const pointerTime = dayStart.add(pointerMinute, 'minute');
                                const entryStart = dayjs(entry.start_time);
                                const pointerOffset = pointerTime.diff(entryStart, 'minute');
                                
                                onEntryDragStart(dateStr, entry.id, pointerOffset, clientX, clientY);
                            } : undefined}
                            onResizeStart={(handle, clientY) => {
                                if (onEntryResizeStart) {
                                    onEntryResizeStart(dateStr, entry.id, handle, clientY);
                                }
                            }}
                        />
                    );
                })}

                {/* Hidden measurement element for title height */}
                <Typography
                    ref={titleRef}
                    variant="caption"
                    sx={{
                        position: "absolute",
                        visibility: "hidden",
                        pointerEvents: "none",
                        fontWeight: 600,
                        display: "block",
                        whiteSpace: "nowrap",
                        fontSize: "0.75rem",
                        lineHeight: 1.5,
                        top: 0,
                        left: 0,
                    }}
                >
                    Test Title
                </Typography>
            </Box>
        </Box>
    );
}
