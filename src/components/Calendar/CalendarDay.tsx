import { Box } from "@mui/material";
import { useState } from "react";
import CalendarEntryOverlay from "./CalendarEntry";
import CreateEntryDialog from "./EntryDialog/CreateEntryDialog";
import EditEntryDialog from "./EntryDialog/EditEntryDialog";
import CalendarDayHeader from "./CalendarDayHeader";
import CalendarDayGrid from "./CalendarDayGrid";
import {
    EntryDragStartPayload,
    MoveState,
    TimeEntry,
} from "./util/calendarTypes";
import { useCalendarDay } from "./hooks/useCalendarDay";

interface CalendarDayProps {
    dateStr: string;
    dayOfTheMonth: string;
    dayOfTheWeek: string;
    entries: TimeEntry[];
    moveState: MoveState | null;
    onCreateEntry: (dateStr: string, attributes: Omit<TimeEntry, 'id'>) => void;
    onEntryDragStart: (payload: EntryDragStartPayload) => void;
    onUpdateEntry?: (entryId: string, startMinute: number, endMinute: number, title?: string, projectId?: string, isBillable?: boolean) => void;
    onDeleteEntry?: (entryId: string) => void;
    onDuplicateEntry?: (entryId: string) => void;
    isCompact?: boolean;
    totalDays: number;
}

export default function CalendarDay({
    dateStr,
    dayOfTheMonth,
    dayOfTheWeek,
    entries,
    moveState,
    onCreateEntry,
    onEntryDragStart,
    onUpdateEntry,
    onDeleteEntry,
    onDuplicateEntry,
    isCompact = false,
    totalDays,
}: CalendarDayProps) {
    const {
        containerRef,
        hourHeight,
        handleMouseDown,
        handleEntryDragStart,
        renderedEntries,
        dragOverlayEntry,
        pendingEntry,
        setPendingEntry,
        pendingEntryAnchor,
    } = useCalendarDay({
        dateStr,
        entries,
        moveState,
        onCreateEntry,
        onEntryDragStart,
    });

    const [editingEntry, setEditingEntry] = useState<TimeEntry | null>(null);
    const [editAnchor, setEditAnchor] = useState<{ top: number; left: number } | null>(null);

    const compactWidthPercent = `${totalDays ? 100 / totalDays : 100}%`;

    // Day column layout
    // - outer box is a column flex container so the header stays sticky and
    //   the hours container fills the remaining vertical space.
    // - hour slots are rendered as flexible rows so they scale when the
    //   parent height changes (while keeping a `minHeight` for usable touch targets).
    return (
        <Box
            data-date={dateStr}
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
            <Box
                ref={containerRef}
                data-date={dateStr}
                sx={{
                    position: "relative",
                    bgcolor: "background.paper",
                }}
            >
                <CalendarDayGrid moveState={moveState} onMouseDown={handleMouseDown} />
                {renderedEntries.map(({ entry, isPreview, isDragging }) => (
                    <CalendarEntryOverlay
                        key={entry.id}
                        entry={entry}
                        hourHeight={hourHeight}
                        widthPercent={entry.widthPercent}
                        offsetPercent={entry.offsetPercent}
                        zIndex={isPreview ? entry.zIndex + 10 : entry.zIndex}
                        isPreview={isPreview}
                        isDragging={isDragging}
                        onDragStart={
                            !isPreview && !isDragging
                                ? (clientX: number, clientY: number) => handleEntryDragStart(entry, clientX, clientY)
                                : undefined
                        }
                        onResizeCommit={
                            (!isPreview && !isDragging && onUpdateEntry)
                                ? (entryId: string, newStart: number, newEnd: number) => onUpdateEntry(entryId, newStart, newEnd)
                                : undefined
                        }
                        onEntryClick={(event, entry) => {
                            setEditingEntry(entry);
                            setEditAnchor({ top: event.clientY, left: event.clientX });
                        }}
                    />
                ))}
                {dragOverlayEntry && (
                    <CalendarEntryOverlay
                        key="drag"
                        entry={dragOverlayEntry}
                        hourHeight={hourHeight}
                        widthPercent={100}
                        offsetPercent={0}
                        zIndex={3}
                        isPreview
                    />
                )}
                {pendingEntry && (
                    <CalendarEntryOverlay
                        key="pending"
                        entry={{ ...pendingEntry, id: "pending" }}
                        hourHeight={hourHeight}
                        widthPercent={100}
                        offsetPercent={0}
                        zIndex={3}
                        isPreview
                    />
                )}
            </Box>
            {pendingEntry && (
                <CreateEntryDialog
                    open={true}
                    anchorPosition={pendingEntryAnchor}
                    onClose={() => setPendingEntry(null)}
                    onSave={(title, startMinute, endMinute, taskId, task, projectId, isBillable) => {
                        onCreateEntry(dateStr, {
                            startMinute,
                            endMinute,
                            taskId,
                            title,
                            task,
                            projectId,
                            isBillable
                        });
                        setPendingEntry(null);
                    }}
                    initialStartMinute={pendingEntry.startMinute}
                    initialEndMinute={pendingEntry.endMinute}
                />
            )}
            {editingEntry && (
                <EditEntryDialog
                    open={true}
                    entry={editingEntry}
                    anchorPosition={editAnchor}
                    onClose={() => setEditingEntry(null)}
                    onSave={(entryId, title, startMinute, endMinute, projectId, isBillable) => {
                        if (onUpdateEntry) onUpdateEntry(entryId, startMinute, endMinute, title, projectId, isBillable);
                    }}
                    onDelete={(entryId) => {
                        if (onDeleteEntry) onDeleteEntry(entryId);
                    }}
                    onDuplicate={(entryId) => {
                        if (onDuplicateEntry) onDuplicateEntry(entryId);
                    }}
                />
            )}
        </Box>
    );
}
