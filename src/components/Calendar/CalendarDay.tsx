import { Box, Paper, Typography } from "@mui/material";
import { useState } from "react";
import CalendarEntryOverlay from "./CalendarEntry";
import CreateEntryDialog from "./CreateEntryDialog";
import EditEntryDialog from "./EditEntryDialog";
import { HOUR_ARRAY, HOURS_PER_DAY } from "./calendarUtility";
import {
    EntryAttributes,
    EntryDragStartPayload,
    MoveState,
    TimeEntry,
} from "./calendarTypes";
import { useCalendarDay } from "./useCalendarDay";

interface CalendarDayProps {
    dayIndex: number;
    dayOfTheMonth: string;
    dayOfTheWeek: string;
    entries: TimeEntry[];
    moveState: MoveState | null;
    onCreateEntry: (dayIndex: number, attributes: EntryAttributes) => void;
    onEntryDragStart: (payload: EntryDragStartPayload) => void;
    onUpdateEntry?: (entryId: string, startMinute: number, endMinute: number) => void;
    onDeleteEntry?: (entryId: string) => void;
    onDuplicateEntry?: (entryId: string) => void;
    onUpdateEntryTitle?: (entryId: string, title: string) => void;
    isCompact?: boolean;
    totalDays: number;
}

export default function CalendarDay({
    dayIndex,
    dayOfTheMonth,
    dayOfTheWeek,
    entries,
    moveState,
    onCreateEntry,
    onEntryDragStart,
    onUpdateEntry,
    onDeleteEntry,
    onDuplicateEntry,
    onUpdateEntryTitle,
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
        dayIndex,
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
            data-day-index={dayIndex}
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
            <Paper
                elevation={0}
                square
                sx={{
                    height: 64,
                    position: "sticky",
                    top: 0,
                    zIndex: 3,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 0.5,
                    bgcolor: "grey.50",
                    borderBottom: theme => `1px solid ${theme.palette.divider}`,
                }}
            >
                <Typography variant="subtitle2" noWrap>
                    {dayOfTheWeek}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                    {dayOfTheMonth}
                </Typography>
            </Paper>
            <Box
                ref={containerRef}
                data-day-index={dayIndex}
                sx={{
                    position: "relative",
                    bgcolor: "background.paper",
                }}
            >
                {HOUR_ARRAY.map(hour => (
                    <Box
                        key={hour}
                        data-hour={hour}
                        onMouseDown={handleMouseDown(hour)}
                        sx={{
                            height: { xs: 40, md: 48 },
                            borderBottom: theme => hour === HOURS_PER_DAY - 1 ? "none" : `1px solid ${theme.palette.divider}`,
                            cursor: moveState ? "default" : "crosshair",
                            bgcolor: "background.paper",
                            transition: theme =>
                                theme.transitions.create("background-color", {
                                    duration: theme.transitions.duration.shortest,
                                }),
                            "&:hover": {
                                bgcolor: moveState ? "background.paper" : "action.hover",
                            },
                        }}
                    />
                ))}
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
                        zIndex={250}
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
                        zIndex={250}
                        isPreview
                    />
                )}
            </Box>
            {pendingEntry && (
                <CreateEntryDialog
                    open={true}
                    anchorPosition={pendingEntryAnchor}
                    onClose={() => setPendingEntry(null)}
                    onSave={(title, startMinute, endMinute) => {
                        onCreateEntry(dayIndex, {
                            startMinute,
                            endMinute,
                            title,
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
                    onSave={(entryId, title, startMinute, endMinute) => {
                        if (onUpdateEntryTitle) onUpdateEntryTitle(entryId, title);
                        if (onUpdateEntry) onUpdateEntry(entryId, startMinute, endMinute);
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
