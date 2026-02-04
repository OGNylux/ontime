import { Box, Stack, Typography, useMediaQuery } from "@mui/material";
import { useTheme } from "@mui/material/styles";
import { useState, useCallback, useRef, useMemo } from "react";
import dayjs from "dayjs";

import CalendarDay from "./CalendarDay";
import CalendarTime from "./CalendarTime";
import CalendarNavigation from "./TopBar/CalendarNavigation";
import CalendarViewSelector from "./TopBar/CalendarViewSelector";
import Recorder from "./TopBar/Recorder";
import CreateEntryDialog from "./EntryDialog/CreateEntryDialog";
import EntryContextMenu from "./EntryDialog/EntryContextMenu";
import ConfirmDialog from "../Forms/ConfirmDialog";
import ProjectTimelineBar from "./ProjectTimelineBar";
import LoadingBanner from "../Loading/LoadingBanner";

import { useCalendarNavigation } from "./hooks/useCalendarNavigation";
import { useCalendarEntries } from "./hooks/useCalendarEntries";
import { useEntryPersistence } from "./hooks/useEntryPersistence";
import { useEntryUI } from "./hooks/useEntryUI";
import { useEntryMove } from "./hooks/useEntryMove";
import { useEntryResize } from "./hooks/useEntryResize";
import { CalendarProvider } from "./CalendarContext";

import { formatDuration } from "./util/calendarUtility";
import { GapSize } from "./TopBar/CalendarZoom";


interface DragPreview {
    day: string;
    startMinute: number;
    endMinute: number;
}


export default function CalendarWeek() {
    const theme = useTheme();
    const isCompact = useMediaQuery(theme.breakpoints.down("md"));
    const scrollContainerRef = useRef<HTMLDivElement>(null);


    const [gapSize, setGapSize] = useState<GapSize>(60);
    const [dragPreview, setDragPreview] = useState<DragPreview | null>(null);
    const [startRecordingFn, setStartRecordingFn] = useState<(() => void) | null>(null);

    const entryUI = useEntryUI();

    const { weekDays, handleNext: nextWeek, handlePrev: prevWeek, goToToday, viewMode, setViewMode, loading: calendarLoading } = useCalendarNavigation();
    const { entriesByDate, refetch, addOrReplaceEntry, removeEntryLocal } = useCalendarEntries(weekDays);

    const persistence = useEntryPersistence({
        entriesByDate,
        addOrReplaceEntry,
        removeEntryLocal,
        refetch,
    });

    const { moveState, beginMove } = useEntryMove(entriesByDate, persistence.updateEntryTimes);
    const { resizeState, beginResize } = useEntryResize(entriesByDate, persistence.updateEntryTimes);

    const openCreateDialog = useCallback((
        dateStr: string,
        startMinute: number,
        endMinute: number,
        anchorPosition: { top: number; left: number }
    ) => {
        const preview = dragPreview?.day === dateStr ? dragPreview : null;
        const start = preview?.startMinute ?? startMinute;
        const end = preview?.endMinute ?? endMinute;
        entryUI.openCreateDialog(dateStr, start, end, anchorPosition);
    }, [dragPreview, entryUI]);

    const closeDialog = useCallback(() => {
        entryUI.closeDialog();
        setDragPreview(null);
    }, [entryUI]);

    const handleDragEnd = useCallback((dateStr: string, preview: { startMinute: number; endMinute: number } | null) => {
        if (preview) {
            setDragPreview({ day: dateStr, ...preview });
        }
    }, []);

    const totalWeekTime = useMemo(() => {
        const allEntries = Object.values(entriesByDate).flat();
        const totalMinutes = allEntries.reduce((sum, entry) => {
            const start = dayjs(entry.start_time);
            const end = dayjs(entry.end_time);
            return sum + end.diff(start, 'minute');
        }, 0);

        return formatDuration(totalMinutes);
    }, [entriesByDate]);


    if (calendarLoading) {
        return (
            <Box display="flex" flexDirection="column" height="100%" bgcolor="background.default" alignItems="center" justifyContent="center">
                <LoadingBanner message="Loading calendar..." />
            </Box>
        );
    }

    return (
        <CalendarProvider value={{
            entriesByDate,
            addOrReplaceEntry,
            removeEntryLocal,
            refetch,
            persistence,
            openCreateDialog,
            openEditDialog: entryUI.openEditDialog,
            openContextMenu: entryUI.openContextMenu,
            moveState,
            beginMove,
            resizeState,
            beginResize,
        }}>
            <Box sx={{ display: "flex", flexDirection: "column", height: "100%", bgcolor: "background.default" }}>

                <Box sx={{ display: "flex", px: 1, pt: 1 }}>
                    <Recorder
                        addOrReplaceEntry={addOrReplaceEntry}
                        onRecordingStart={(fn) => setStartRecordingFn(() => fn)}
                    />
                </Box>
                <Box
                    display="flex"
                    alignItems="flex-start"
                    justifyContent="space-between"
                    gap={2}
                    pb={1}
                    px={1}
                    flexWrap={{ xs: "wrap", lg: "nowrap" }}
                    mx={1}
                    borderBottom={t => `1px solid ${t.palette.divider}`}
                >
                    <Box sx={{ display: "flex", flexDirection: { xs: "column", md: "row" }, alignItems: { xs: "flex-start", md: "center" }, gap: { xs: 0, md: 2 }, minWidth: 0 }}>
                        <CalendarNavigation
                            onPrev={prevWeek}
                            onNext={nextWeek}
                            onToday={goToToday}
                        />
                        {totalWeekTime && (
                            <Typography
                                variant="caption"
                                color="text.secondary"
                                sx={{
                                    mt: { xs: 0.5, md: 0 },
                                    fontSize: { xs: '0.75rem', md: '0.875rem' },
                                    fontWeight: { md: 500 }
                                }}
                            >
                                {`WEEK TOTAL: ${totalWeekTime}`}
                            </Typography>
                        )}
                    </Box>

                    <Box sx={{ display: "flex", justifyContent: "flex-end", flexShrink: 0, alignSelf: "flex-start" }}>
                        <CalendarViewSelector viewMode={viewMode} onChange={setViewMode} />
                    </Box>
                </Box>

                <ProjectTimelineBar
                    entries={Object.values(entriesByDate).flat()}
                />

                <Box
                    ref={scrollContainerRef}
                    className="scrollbar-hide"
                    flex={1}
                    overflow="auto"
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
                                    persistentDragPreview={dragPreview?.day === day.dateStr ? dragPreview : null}
                                    isPersistentPreviewActive={dragPreview?.day === day.dateStr}
                                    onDragEnd={preview => handleDragEnd(day.dateStr, preview)}
                                    onStartRecording={startRecordingFn || undefined}
                                />
                            ))}
                        </Box>
                    </Stack>
                </Box>

                <CreateEntryDialog
                    open={entryUI.dialogState.open}
                    onClose={closeDialog}
                    anchorPosition={entryUI.dialogState.anchorPosition}
                    initialStartTime={entryUI.dialogState.startTime}
                    initialEndTime={entryUI.dialogState.endTime}
                    dateStr={entryUI.dialogState.dateStr}
                    initialTitle={entryUI.dialogState.editingEntry?.task?.name}
                    initialIsBillable={entryUI.dialogState.editingEntry?.is_billable ?? true}
                    initialProjectId={entryUI.dialogState.editingEntry?.project_id ?? entryUI.dialogState.editingEntry?.project?.id ?? null}
                    isEdit={Boolean(entryUI.dialogState.editingEntry)}
                    editingEntryId={entryUI.dialogState.editingEntry?.id || null}
                />

                <EntryContextMenu
                    contextMenu={entryUI.contextMenu}
                    onClose={entryUI.closeContextMenu}
                    onDuplicate={(entry) => {
                        persistence.duplicateEntry(entry);
                        entryUI.closeContextMenu();
                    }}
                    onDelete={entryUI.initiateDelete}
                />

                <ConfirmDialog
                    open={entryUI.confirmDeleteOpen}
                    onClose={entryUI.cancelDelete}
                    onConfirm={async () => {
                        const entryId = entryUI.confirmDelete();
                        if (entryId) {
                            await persistence.deleteEntry(entryId);
                        }
                        entryUI.cancelDelete();
                    }}
                    title="Delete Entry"
                    message="Are you sure you want to delete this entry?"
                    confirmLabel="Delete"
                    confirmColor="error"
                />
            </Box>
        </CalendarProvider>
    );
}
