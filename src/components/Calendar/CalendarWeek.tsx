import { Box, Stack, useMediaQuery } from "@mui/material";
import { useTheme } from "@mui/material/styles";
import { useState, useCallback, useRef, useEffect, useMemo } from "react";
import dayjs from "dayjs";

// Components
import CalendarDay from "./CalendarDay";
import CalendarTime from "./CalendarTime";
import CalendarNavigation from "./TopBar/CalendarNavigation";
import CalendarViewSelector from "./TopBar/CalendarViewSelector";
import Recorder from "./TopBar/Recorder";
import CreateEntryDialog from "./EntryDialog/CreateEntryDialog";
import EntryContextMenu from "./EntryDialog/EntryContextMenu";
import ConfirmDialog from "../Forms/ConfirmDialog";
import ProjectTimelineBar from "./ProjectTimelineBar";

// Hooks
import { useCalendarWeekState } from "./hooks/useCalendarWeek";
import { useCalendarEntries } from "./hooks/useCalendarEntries";
import { useEntryMove } from "./hooks/useEntryMove";
import { useEntryResize } from "./hooks/useEntryResize";
import { useEntryPersistence } from "./hooks/useEntryPersistence";

// Types & Utils
import { CalendarEntry } from "../../services/calendarService";
import { formatDuration, minutesToTime, ResizeHandlePosition } from "./util/calendarUtility";
import { GapSize } from "./TopBar/CalendarZoom";

// Types

interface DialogState {
    open: boolean;
    dateStr: string;
    startTime: string;
    endTime: string;
    anchorPosition: { top: number; left: number } | null;
    editingEntry?: CalendarEntry | null;
}

interface DragPreview {
    day: string;
    startMinute: number;
    endMinute: number;
}

interface ContextMenuState {
    mouseX: number;
    mouseY: number;
    entry: CalendarEntry;
}

const INITIAL_DIALOG_STATE: DialogState = {
    open: false,
    dateStr: "",
    startTime: "09:00",
    endTime: "10:00",
    anchorPosition: null,
    editingEntry: null,
};

// Component

export default function CalendarWeek() {
    const theme = useTheme();
    const isCompact = useMediaQuery(theme.breakpoints.down("md"));
    const scrollContainerRef = useRef<HTMLDivElement>(null);

    // State
    
    const [gapSize, setGapSize] = useState<GapSize>(60);
    const [dialogState, setDialogState] = useState<DialogState>(INITIAL_DIALOG_STATE);
    const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
    const [confirmContextDeleteOpen, setConfirmContextDeleteOpen] = useState(false);
    const [contextDeleteTargetId, setContextDeleteTargetId] = useState<string | null>(null);
    const [dragPreview, setDragPreview] = useState<DragPreview | null>(null);
    const [startRecordingFn, setStartRecordingFn] = useState<(() => void) | null>(null);

    // Data Hooks
    
    const { weekDays, nextWeek, prevWeek, goToToday, viewMode, setViewMode } = useCalendarWeekState();
    const { entriesByDate, refetch, addOrReplaceEntry, removeEntryLocal } = useCalendarEntries(weekDays);
    
    const persistence = useEntryPersistence({
        entriesByDate,
        addOrReplaceEntry,
        removeEntryLocal,
        refetch,
    });

    const { moveState, beginMove } = useEntryMove(entriesByDate, persistence.updateEntryTimes);
    const { resizeState, beginResize } = useEntryResize(entriesByDate, persistence.updateEntryTimes);

    // Scroll Lock (during drag/resize)
    
    useEffect(() => {
        if (!moveState && !resizeState) return;

        const lockedElements: HTMLElement[] = [];
        let el = scrollContainerRef.current?.parentElement;
        
        while (el) {
            const overflow = window.getComputedStyle(el).overflow;
            if (overflow === "auto" || overflow === "scroll" || el === document.body) {
                lockedElements.push(el);
                el.style.overflow = "hidden";
            }
            el = el.parentElement;
        }

        if (scrollContainerRef.current) {
            scrollContainerRef.current.style.overflow = "hidden";
            scrollContainerRef.current.style.touchAction = "none";
        }

        return () => {
            lockedElements.forEach(e => (e.style.overflow = ""));
            if (scrollContainerRef.current) {
                scrollContainerRef.current.style.overflow = "";
                scrollContainerRef.current.style.touchAction = "";
            }
        };
    }, [moveState, resizeState]);

    // Dialog Handlers
    
    const openCreateDialog = useCallback((
        dateStr: string,
        startMinute: number,
        endMinute: number,
        anchorPosition: { top: number; left: number }
    ) => {
        // Use persistent drag preview if available for this day
        const preview = dragPreview?.day === dateStr ? dragPreview : null;
        const start = preview?.startMinute ?? startMinute;
        const end = preview?.endMinute ?? endMinute;

        setDialogState({
            open: true,
            dateStr,
            startTime: minutesToTime(start),
            endTime: minutesToTime(end),
            anchorPosition,
            editingEntry: null,
        });
    }, [dragPreview]);

    const openEditDialog = useCallback((entry: CalendarEntry, position: { top: number; left: number } | null) => {
        const start = dayjs(entry.start_time);
        const end = dayjs(entry.end_time);
        
        setDialogState({
            open: true,
            dateStr: start.format("YYYY-MM-DD"),
            startTime: start.format("HH:mm"),
            endTime: end.format("HH:mm"),
            anchorPosition: position,
            editingEntry: entry,
        });
    }, []);

    const closeDialog = useCallback(() => {
        setDialogState(prev => ({ ...prev, open: false }));
        setDragPreview(null);
    }, []);

    const handleSave = useCallback(async (data: {
        startTime: string;
        endTime: string;
        taskName: string;
        isBillable: boolean;
        projectId?: string | null;
        taskId?: string;
    }) => {
        try {
            if (dialogState.editingEntry) {
                await persistence.updateEntry(dialogState.editingEntry.id, {
                    dateStr: dialogState.dateStr,
                    ...data,
                });
            } else {
                await persistence.createEntry({
                    dateStr: dialogState.dateStr,
                    ...data,
                });
            }
            closeDialog();
        } catch (error) {
            console.error("Failed to save entry:", error);
        }
    }, [dialogState, persistence, closeDialog]);

    const handleDelete = useCallback(async (id: string) => {
        await persistence.deleteEntry(id);
        closeDialog();
    }, [persistence, closeDialog]);

    const handleDuplicate = useCallback(async (data: {
        startTime: string;
        endTime: string;
        taskName: string;
        isBillable: boolean;
        projectId?: string | null;
    }) => {
        await persistence.createEntry({
            dateStr: dialogState.dateStr,
            ...data,
        });
        closeDialog();
    }, [dialogState.dateStr, persistence, closeDialog]);

    // Entry Interaction Handlers
    
    const handleEntryClick = useCallback((entry: CalendarEntry, ev?: React.MouseEvent) => {
        openEditDialog(entry, ev ? { top: ev.clientY, left: ev.clientX } : null);
    }, [openEditDialog]);

    const handleEntryContextMenu = useCallback((entry: CalendarEntry, anchor?: { top: number; left: number } | null) => {
        if (anchor) {
            setContextMenu({ mouseX: anchor.left, mouseY: anchor.top, entry });
        }
    }, []);

    const handleDragStart = useCallback((dateStr: string, entryId: string, pointerOffset: number, clientX: number, clientY: number) => {
        beginMove({ dateStr, entryId, pointerOffset, clientX, clientY });
    }, [beginMove]);

    const handleResizeStart = useCallback((dateStr: string, entryId: string, handle: ResizeHandlePosition, clientY: number) => {
        beginResize({ dateStr, entryId, handle, clientY });
    }, [beginResize]);

    const handleDragEnd = useCallback((dateStr: string, preview: { startMinute: number; endMinute: number } | null) => {
        if (preview) {
            setDragPreview({ day: dateStr, ...preview });
        }
    }, []);

    // Calculate total week time
    const totalWeekTime = useMemo(() => {
        const allEntries = Object.values(entriesByDate).flat();
        const totalMinutes = allEntries.reduce((sum, entry) => {
            const start = dayjs(entry.start_time);
            const end = dayjs(entry.end_time);
            return sum + end.diff(start, 'minute');
        }, 0);
        
        return formatDuration(totalMinutes);
    }, [entriesByDate]);

    // Render

    return (
        <Box sx={{ display: "flex", flexDirection: "column", height: "100%", bgcolor: "background.default" }}>
            {/* Top Bar */}
            
                <Box sx={{ display: "flex", px: 1, pt: 1 }}>
                    <Recorder 
                        addOrReplaceEntry={addOrReplaceEntry} 
                        onRecordingStart={(fn) => setStartRecordingFn(() => fn)}
                    />
                </Box>
            <Box
                display="flex"
                alignItems="center"
                justifyContent="space-between"
                gap={2}
                pb={1}
                px={1}
                flexWrap={{ xs: "wrap", lg: "nowrap"}}
                mx={1}
                borderBottom={t => `1px solid ${t.palette.divider}`}
            >
                <Stack direction="row" spacing={1} alignItems="center" sx={{ minWidth: 0 }}>
                    <CalendarNavigation 
                        onPrev={prevWeek} 
                        onNext={nextWeek} 
                        onToday={goToToday}
                        totalWeekTime={totalWeekTime}
                    />
                </Stack>

                <Box sx={{ display: "flex", justifyContent: "flex-end" }}>
                    <CalendarViewSelector viewMode={viewMode} onChange={setViewMode} />
                </Box>
            </Box>

            {/* Project Timeline Bar */}
            <ProjectTimelineBar
                entries={Object.values(entriesByDate).flat()}
            />

            {/* Calendar Grid */}
            <Box
                ref={scrollContainerRef}
                className="scrollbar-hide"
                flex={1}
                overflow="auto"
                {...(moveState && { overflow: "hidden", touchAction: "none" })}
                sx={{ WebkitOverflowScrolling: "touch" }}
            >
                <Stack direction="row" sx={{ minHeight: "100%" }}>
                    <CalendarTime isCompact={isCompact} gapSize={gapSize} onGapSizeChange={setGapSize} />
                    
                    <Box sx={{ display: "flex", flex: 1, minWidth: 0, overflow: "visible", pb: { xs: 1, md: 0 } }}>
                        {weekDays.map(day => (
                            <CalendarDay
                                key={day.id}
                                dayOfTheMonth={day.dayOfTheMonth}
                                dayOfTheWeek={day.dayOfTheWeek}
                                dateStr={day.dateStr}
                                isCompact={isCompact}
                                totalDays={weekDays.length}
                                entries={entriesByDate[day.dateStr] || []}
                                gapSize={gapSize}
                                // Create
                                onCreateEntry={openCreateDialog}
                                persistentDragPreview={dragPreview?.day === day.dateStr ? dragPreview : null}
                                isPersistentPreviewActive={dragPreview?.day === day.dateStr}
                                onDragEnd={preview => handleDragEnd(day.dateStr, preview)}
                                // Entry interactions
                                onEntryClick={handleEntryClick}
                                onEntryContextMenu={handleEntryContextMenu}
                                // Move
                                moveState={moveState}
                                onEntryDragStart={handleDragStart}
                                // Resize
                                resizeState={resizeState}
                                onEntryResizeStart={handleResizeStart}
                                // Recording
                                onStartRecording={startRecordingFn || undefined}
                            />
                        ))}
                    </Box>
                </Stack>
            </Box>

            {/* Dialogs */}
            <CreateEntryDialog
                open={dialogState.open}
                onClose={closeDialog}
                onSave={handleSave}
                anchorPosition={dialogState.anchorPosition}
                initialStartTime={dialogState.startTime}
                initialEndTime={dialogState.endTime}
                dateStr={dialogState.dateStr}
                initialTitle={dialogState.editingEntry?.task?.name}
                initialIsBillable={dialogState.editingEntry?.is_billable || false}
                initialProjectId={dialogState.editingEntry?.project_id ?? dialogState.editingEntry?.project?.id ?? null}
                isEdit={Boolean(dialogState.editingEntry)}
                editingEntryId={dialogState.editingEntry?.id || null}
                onDelete={handleDelete}
                onDuplicate={handleDuplicate}
            />

            <EntryContextMenu
                contextMenu={contextMenu}
                onClose={() => setContextMenu(null)}
                onDuplicate={persistence.duplicateEntry}
                onDelete={(id: string) => {
                    setContextDeleteTargetId(id);
                    setConfirmContextDeleteOpen(true);
                }}
            />

            <ConfirmDialog
                open={confirmContextDeleteOpen}
                onClose={() => { setConfirmContextDeleteOpen(false); setContextDeleteTargetId(null); }}
                onConfirm={async () => {
                    if (contextDeleteTargetId) {
                        await persistence.deleteEntry(contextDeleteTargetId);
                    }
                    setConfirmContextDeleteOpen(false);
                    setContextDeleteTargetId(null);
                    setContextMenu(null);
                }}
                title="Delete Entry"
                message="Are you sure you want to delete this entry?"
                confirmLabel="Delete"
                confirmColor="error"
            />
        </Box>
    );
}
