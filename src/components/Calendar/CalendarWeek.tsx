import { Box, Container, Stack, useMediaQuery, Menu, MenuItem, ListItemIcon, ListItemText } from "@mui/material";
import { useTheme } from "@mui/material/styles";
import DeleteIcon from "@mui/icons-material/Delete";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import { useState, useCallback, useRef, useEffect } from "react";
import CalendarDay from "./CalendarDay";
import CalendarTime from "./CalendarTime";
import { useCalendarWeekState } from "./hooks/useCalendarWeek";
import { useCalendarEntries } from "./hooks/useCalendarEntries";
import { useEntryMove } from "./hooks/useEntryMove";
import { useEntryResize } from "./hooks/useEntryResize";
import CreateEntryDialog from "./EntryDialog/CreateEntryDialog";
import { CalendarEntry } from "../../services/calendarService";
import { minutesToTime } from "./util/calendarUtility";
import { calendarService } from "../../services/calendarService";
import { taskService } from "../../services/taskService";
import dayjs from "dayjs";

interface DialogState {
    open: boolean;
    dateStr: string;
    startTime: string;
    endTime: string;
    anchorPosition: { top: number; left: number } | null;
    editingEntry?: CalendarEntry | null;
}

export default function Calendar() {
    const {
        weekDays,
    } = useCalendarWeekState();
    const { entriesByDate, refetch, addOrReplaceEntry, removeEntryLocal } = useCalendarEntries(weekDays);
    const theme = useTheme();
    const isCompact = useMediaQuery(theme.breakpoints.down("md"));

    // Entry move (drag to reposition)
    const handleMoveCommit = useCallback(async (dateStr: string, entryId: string, startMinute: number, endMinute: number) => {
        try {
            const startDateTime = dayjs(dateStr)
                .startOf('day')
                .add(startMinute, 'minute')
                .toISOString();
            const endDateTime = dayjs(dateStr)
                .startOf('day')
                .add(endMinute, 'minute')
                .toISOString();

            // optimistic update: find existing entry and update locally immediately
            // try to locate the existing entry from entriesByDate
            let found: CalendarEntry | undefined;
            Object.values(entriesByDate).forEach(dayEntries => {
                const f = dayEntries.find(e => e.id === entryId);
                if (f) found = f;
            });

            if (found) {
                const optimistic = { ...found, start_time: startDateTime, end_time: endDateTime } as CalendarEntry;
                addOrReplaceEntry(optimistic);
            }

            try {
                const updated = await calendarService.updateEntry(entryId, {
                    start_time: startDateTime,
                    end_time: endDateTime,
                });
                addOrReplaceEntry(updated);
            } catch (err) {
                console.error("Failed to move entry, refetching:", err);
                refetch();
            }
        } catch (error) {
            console.error("Failed to move entry:", error);
        }
    }, [refetch, entriesByDate, addOrReplaceEntry]);

    const { moveState, beginMove } = useEntryMove(entriesByDate, handleMoveCommit);

    const handleEntryDragStart = useCallback((dateStr: string, entryId: string, pointerOffset: number, clientX: number, clientY: number) => {
        beginMove({ dateStr, entryId, pointerOffset, clientX, clientY });
    }, [beginMove]);

    // Entry resize
    const handleResizeCommit = useCallback(async (dateStr: string, entryId: string, startMinute: number, endMinute: number) => {
        // Reuse the same logic as move commit
        await handleMoveCommit(dateStr, entryId, startMinute, endMinute);
    }, [handleMoveCommit]);

    const { resizeState, beginResize } = useEntryResize(entriesByDate, handleResizeCommit);

    const handleEntryResizeStart = useCallback((dateStr: string, entryId: string, handle: 'start' | 'end', clientY: number) => {
        beginResize({ dateStr, entryId, handle, clientY });
    }, [beginResize]);

    const [dialogState, setDialogState] = useState<DialogState>({
        open: false,
        dateStr: "",
        startTime: "09:00",
        endTime: "10:00",
        anchorPosition: null,
    });
    
    const [contextMenu, setContextMenu] = useState<{ mouseX: number; mouseY: number; entry: CalendarEntry } | null>(null);
    
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    
    // Lock scroll on all parent elements when dragging (same as oldCalendar)
    useEffect(() => {
        if (moveState || resizeState) {
            const scrollableParents: HTMLElement[] = [];
            let element = scrollContainerRef.current?.parentElement;
            while (element) {
                const overflow = window.getComputedStyle(element).overflow;
                if (overflow === 'auto' || overflow === 'scroll' || element === document.body) {
                    scrollableParents.push(element);
                    element.style.overflow = 'hidden';
                }
                element = element.parentElement;
            }
            
            // Also lock the container itself
            if (scrollContainerRef.current) {
                scrollContainerRef.current.style.overflow = 'hidden';
                scrollContainerRef.current.style.touchAction = 'none';
            }
            
            return () => {
                scrollableParents.forEach(el => el.style.overflow = '');
                if (scrollContainerRef.current) {
                    scrollContainerRef.current.style.overflow = '';
                    scrollContainerRef.current.style.touchAction = '';
                }
            };
        }
    }, [moveState, resizeState]);
    
    // Persistent drag preview state
    const [persistentPreview, setPersistentPreview] = useState<{ day: string; startMinute: number; endMinute: number } | null>(null);
    const [isPersistentPreviewActive, setIsPersistentPreviewActive] = useState(false);

    const handleCreateEntry = useCallback((
        dateStr: string,
        startMinute: number,
        endMinute: number,
        anchorPosition: { top: number; left: number }
    ) => {
        // If persistent preview exists for this day, prefer those minutes
        let s = startMinute;
        let e = endMinute;
        if (persistentPreview && persistentPreview.day === dateStr) {
            s = persistentPreview.startMinute;
            e = persistentPreview.endMinute;
        }
        setDialogState({
            open: true,
            dateStr,
            startTime: minutesToTime(s),
            endTime: minutesToTime(e),
            anchorPosition,
            editingEntry: null,
        });
    }, [persistentPreview]);

    const handleEntryClick = useCallback((entry: CalendarEntry, anchorPosition: { top: number; left: number } | null) => {
        // Open dialog in edit mode
        const start = dayjs(entry.start_time);
        const end = dayjs(entry.end_time);
        setDialogState({
            open: true,
            dateStr: start.format('YYYY-MM-DD'),
            startTime: start.format('HH:mm'),
            endTime: end.format('HH:mm'),
            anchorPosition,
            editingEntry: entry,
        });
    }, []);

    // Called by CalendarDay's onDragEnd with minutes
    const handleDragEnd = useCallback((dateStr: string, info: { startMinute: number; endMinute: number } | null) => {
        if (info) {
            setPersistentPreview({ day: dateStr, startMinute: info.startMinute, endMinute: info.endMinute });
            setIsPersistentPreviewActive(true);
        }
    }, []);

    const handleCloseDialog = useCallback(() => {
        setDialogState(prev => ({ ...prev, open: false }));
        setIsPersistentPreviewActive(false);
        setPersistentPreview(null);
    }, []);

    const handleSaveEntry = useCallback(async (data: { 
        startTime: string; 
        endTime: string; 
        taskName: string; 
        isBillable: boolean;
        projectId?: string | null;
    }) => {
        try {
            const startDateTime = dayjs(dialogState.dateStr)
                .hour(parseInt(data.startTime.split(":")[0]))
                .minute(parseInt(data.startTime.split(":")[1]))
                .second(0)
                .toISOString();
            
            const endDateTime = dayjs(dialogState.dateStr)
                .hour(parseInt(data.endTime.split(":")[0]))
                .minute(parseInt(data.endTime.split(":")[1]))
                .second(0)
                .toISOString();

            // Find or create task if taskName is provided
            let taskId: string | undefined;
            if (data.taskName && data.taskName.trim()) {
                let task = await taskService.getTaskByName(data.taskName.trim());
                if (!task) {
                    task = await taskService.createTask({ name: data.taskName.trim() });
                }
                taskId = task.id;
            }

            if (dialogState.editingEntry) {
                // optimistic update for edit
                const optimistic = { ...dialogState.editingEntry, start_time: startDateTime, end_time: endDateTime, is_billable: data.isBillable, task_id: taskId, project_id: data.projectId ?? undefined };
                addOrReplaceEntry(optimistic);
                try {
                    const updated = await calendarService.updateEntry(dialogState.editingEntry.id, {
                        start_time: startDateTime,
                        end_time: endDateTime,
                        is_billable: data.isBillable,
                        task_id: taskId,
                        project_id: data.projectId ?? undefined,
                    });
                    addOrReplaceEntry(updated);
                } catch (err) {
                    console.error('Failed to update entry, refetching', err);
                    refetch();
                }
            } else {
                // optimistic create: show a temporary entry immediately
                const tempId = `temp-${Date.now()}`;
                const tempEntry: CalendarEntry = {
                    id: tempId,
                    start_time: startDateTime,
                    end_time: endDateTime,
                    is_billable: data.isBillable,
                    task_id: taskId,
                    project_id: data.projectId ?? undefined,
                    // minimal fields; real task info will arrive from server
                } as CalendarEntry;
                addOrReplaceEntry(tempEntry);
                try {
                    const created = await calendarService.createEntry({
                        start_time: startDateTime,
                        end_time: endDateTime,
                        is_billable: data.isBillable,
                        task_id: taskId,
                        project_id: data.projectId ?? undefined,
                    });
                    // replace temp with real
                    addOrReplaceEntry(created);
                    if (tempId !== created.id) removeEntryLocal(tempId);
                } catch (err) {
                    console.error('Failed to create entry, refetching', err);
                    refetch();
                }
            }

            handleCloseDialog();
            // ensure data is fresh
            refetch();
        } catch (error) {
            console.error("Failed to save entry:", error);
        }
    }, [dialogState, handleCloseDialog, refetch, addOrReplaceEntry, removeEntryLocal]);

    const handleDeleteEntry = useCallback(async (id: string) => {
        try {
            await calendarService.deleteEntry(id);
            handleCloseDialog();
            refetch();
        } catch (error) {
            console.error("Failed to delete entry:", error);
        }
    }, [handleCloseDialog, refetch]);

    const handleDuplicateEntry = useCallback(async (data: { startTime: string; endTime: string; taskName: string; isBillable: boolean; projectId?: string | null }) => {
        try {
            const startDateTime = dayjs(dialogState.dateStr)
                .hour(parseInt(data.startTime.split(":")[0]))
                .minute(parseInt(data.startTime.split(":")[1]))
                .second(0)
                .toISOString();
            const endDateTime = dayjs(dialogState.dateStr)
                .hour(parseInt(data.endTime.split(":")[0]))
                .minute(parseInt(data.endTime.split(":")[1]))
                .second(0)
                .toISOString();

            // Find or create task if taskName is provided
            let taskId: string | undefined;
            if (data.taskName && data.taskName.trim()) {
                let task = await taskService.getTaskByName(data.taskName.trim());
                if (!task) {
                    task = await taskService.createTask({ name: data.taskName.trim() });
                }
                taskId = task.id;
            }

            await calendarService.createEntry({
                start_time: startDateTime,
                end_time: endDateTime,
                task_id: taskId,
                project_id: data.projectId ?? undefined,
                is_billable: data.isBillable,
            });

            handleCloseDialog();
            refetch();
        } catch (error) {
            console.error("Failed to duplicate entry:", error);
        }
    }, [dialogState.dateStr, handleCloseDialog, refetch]);

    return (
        <Box sx={{ display: "flex", flexDirection: "column", height: "100%", bgcolor: "background.default" }}>
            <Container
                ref={scrollContainerRef}
                className="scrollbar-hide"
                disableGutters
                maxWidth={false}
                sx={{
                    flex: 1,
                    overflowX: "auto",
                    overflowY: "auto",
                    px: { xs: 1, md: 2 },
                    pb: { xs: 1, md: 2 },
                    WebkitOverflowScrolling: "touch",
                    ...(moveState && { overflow: "hidden", touchAction: "none" })
                }}
            >
                <Stack direction="row" sx={{ minHeight: "100%" }}>
                <CalendarTime isCompact={isCompact} />
                <Box
                    sx={{
                        display: "flex",
                        flex: 1,
                        minWidth: 0,
                        overflow: "visible",
                        pb: { xs: 1, md: 0 },
                    }}
                >
                    {weekDays.map(day => (
                        <CalendarDay
                            key={day.id}
                            dayOfTheMonth={day.dayOfTheMonth}
                            dayOfTheWeek={day.dayOfTheWeek}
                            dateStr={day.dateStr}
                            isCompact={isCompact}
                            totalDays={weekDays.length}
                            entries={entriesByDate[day.dateStr] || []}
                            onCreateEntry={handleCreateEntry}
                            onEntryClick={(entry, ev) => handleEntryClick(entry, ev ? { top: ev.clientY, left: ev.clientX } : null)}
                            onEntryContextMenu={(entry, anchor) => {
                                if (anchor) {
                                    setContextMenu({
                                        mouseX: anchor.left,
                                        mouseY: anchor.top,
                                        entry: entry,
                                    });
                                }
                            }}
                            persistentDragPreview={persistentPreview && persistentPreview.day === day.dateStr ? { startMinute: persistentPreview.startMinute, endMinute: persistentPreview.endMinute } : null}
                            isPersistentPreviewActive={Boolean(isPersistentPreviewActive && persistentPreview && persistentPreview.day === day.dateStr)}
                            onDragEnd={(preview) => handleDragEnd(day.dateStr, preview)}
                            moveState={moveState}
                            onEntryDragStart={handleEntryDragStart}
                            resizeState={resizeState}
                            onEntryResizeStart={handleEntryResizeStart}
                        />
                    ))}
                </Box>
            </Stack>
        </Container>
        <CreateEntryDialog
            open={dialogState.open}
            onClose={handleCloseDialog}
            onSave={handleSaveEntry}
            anchorPosition={dialogState.anchorPosition}
            initialStartTime={dialogState.startTime}
            initialEndTime={dialogState.endTime}
            dateStr={dialogState.dateStr}
            initialTitle={dialogState.editingEntry?.task?.name || undefined}
            initialIsBillable={dialogState.editingEntry?.is_billable || false}
            isEdit={Boolean(dialogState.editingEntry)}
            editingEntryId={dialogState.editingEntry?.id || null}
            onDelete={handleDeleteEntry}
            onDuplicate={handleDuplicateEntry}
        />
        
        <Menu
            open={contextMenu !== null}
            onClose={() => setContextMenu(null)}
            anchorReference="anchorPosition"
            anchorPosition={
                contextMenu !== null
                    ? { top: contextMenu.mouseY, left: contextMenu.mouseX }
                    : undefined
            }
        >
            <MenuItem
                onClick={async () => {
                    if (contextMenu?.entry) {
                        const entry = contextMenu.entry;
                        setContextMenu(null);
                        
                        try {
                            const startDateTime = dayjs(entry.start_time).toISOString();
                            const endDateTime = dayjs(entry.end_time).toISOString();

                            await calendarService.createEntry({
                                start_time: startDateTime,
                                end_time: endDateTime,
                                is_billable: entry.is_billable || false,
                                task_id: entry.task_id,
                                project_id: entry.project_id,
                            });

                            refetch();
                        } catch (error) {
                            console.error("Failed to duplicate entry:", error);
                        }
                    }
                }}
            >
                <ListItemIcon>
                    <ContentCopyIcon fontSize="small" />
                </ListItemIcon>
                <ListItemText>Duplicate</ListItemText>
            </MenuItem>
            <MenuItem
                onClick={() => {
                    if (contextMenu?.entry?.id) {
                        handleDeleteEntry(contextMenu.entry.id);
                        setContextMenu(null);
                    }
                }}
            >
                <ListItemIcon>
                    <DeleteIcon fontSize="small" />
                </ListItemIcon>
                <ListItemText>Delete</ListItemText>
            </MenuItem>
        </Menu>
        </Box>
    );
}
