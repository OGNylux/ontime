/**
 * NewCalendar - top-level orchestrator.
 *
 * Wires together every hook and renders:
 *  Toolbar -> ProjectBar -> [ TimeGutter + DayColumns ] -> Dialogs
 *
 * State ownership:
 *  • useNavigation   -> date, viewMode, days
 *  • useEntries      -> fetched entries grouped by date
 *  • useEntryActions  -> CRUD helpers
 *  • useDialogs      -> dialog / menu / confirm state
 *  • useDragToMove   -> move entries between slots
 *  • useDragToResize -> resize entry edges
 *  • Zoom level and persistent-preview are local useState
 *
 * CalendarProvider pushes shared state down to DayColumn children.
 */
import { useState, useCallback, useRef, useMemo } from "react";
import { Box, useMediaQuery, useTheme } from "@mui/material";
import dayjs from "dayjs";

import type { ZoomLevel, PersistentPreview } from "./types";
import { CalendarProvider, CalendarContextValue } from "./context";
import { makeScale } from "./layout/pixelScale";
import { formatDuration } from "./layout/timeUtils";

import { useNavigation } from "./hooks/useNavigation";
import { useEntries } from "./hooks/useEntries";
import { useEntryActions } from "./hooks/useEntryActions";
import { useDialogs } from "./hooks/useDialogs";
import { useDragToMove } from "./hooks/useDragToMove";
import { useDragToResize } from "./hooks/useDragToResize";

import Toolbar from "./components/Toolbar";
import ProjectBar from "./components/ProjectBar";
import TimeGutter from "./components/TimeGutter";
import DayColumn from "./components/DayColumn";
import EntryDialog from "./components/EntryDialog";
import ContextMenu from "./components/ContextMenu";
import ConfirmDialog from "../Forms/ConfirmDialog";

export default function NewCalendar() {
    const nav = useNavigation();

    const { byDate, refetch, addOrReplace, removeLocal } = useEntries(nav.days);

    //  CRUD 
    const actions = useEntryActions({ byDate, addOrReplace, removeLocal, refetch });

    const dialogs = useDialogs();

    const { moveState, beginMove } = useDragToMove(byDate, actions.updateTimes);
    const { resizeState, beginResize } = useDragToResize(byDate, actions.updateTimes);

    const [zoom, setZoom] = useState<ZoomLevel>(30);

    const [persistPreview, setPersistPreview] = useState<PersistentPreview | null>(null);

    const startRecRef = useRef<(() => void) | null>(null);
    const handleRecordingStart = useCallback((fn: () => void) => { startRecRef.current = fn; }, []);

    const theme = useTheme();
    const isSmall = useMediaQuery(theme.breakpoints.down("md"));
    const scale = useMemo(() => makeScale(zoom, isSmall), [zoom, isSmall]);
    const isCompact = nav.days.length > 1;

    const allEntries = useMemo(() => Object.values(byDate).flat(), [byDate]);
    const totalWeekTime = useMemo(() => {
        const mins = allEntries.reduce((s, e) => s + Math.max(0, dayjs(e.end_time).diff(dayjs(e.start_time), "minute")), 0);
        return formatDuration(mins);
    }, [allEntries]);

    const handleDialogClose = useCallback(() => {
        dialogs.closeDialog();
        setPersistPreview(null);
    }, [dialogs]);

    const context: CalendarContextValue = {
        byDate, addOrReplace, removeLocal, refetch,
        actions,
        openCreate: dialogs.openCreate,
        openEdit: dialogs.openEdit,
        openMenu: dialogs.openMenu,
        moveState, beginMove,
        resizeState, beginResize,
    };

    if (nav.loading) return null;

    return (
        <CalendarProvider value={context}>
            <Box display="flex" flexDirection="column" height="100%" bgcolor="background.default">
                <Toolbar
                    onRecordingStart={handleRecordingStart}
                    addOrReplace={addOrReplace}
                    onPrev={nav.goPrev}
                    onNext={nav.goNext}
                    onToday={nav.goToday}
                    totalTime={totalWeekTime}
                    viewMode={nav.viewMode}
                    onViewModeChange={nav.setViewMode}
                />

                <ProjectBar entries={allEntries} />
                <Box
                    flex={1}
                    display="flex"
                    flexDirection="row"
                    sx={{
                        overflow: "auto",
                        "&::-webkit-scrollbar": { display: "none" },
                        msOverflowStyle: "none",
                        scrollbarWidth: "none",
                    }}
                >
                    <TimeGutter isCompact={isCompact} zoom={zoom} onZoomChange={setZoom} slotHeight={scale.slotHeight} />
                    <Box display="flex" flex={1} alignItems="stretch">
                        {nav.days.map(day => (
                            <DayColumn
                                key={day.dateStr}
                                dateStr={day.dateStr}
                                dayOfMonth={day.dayOfMonth}
                                dayOfWeek={day.dayOfWeek}
                                entries={byDate[day.dateStr] || []}
                                zoom={zoom}
                                scale={scale}
                                totalDays={nav.days.length}
                                isCompact={isCompact}
                                persistentPreview={persistPreview}
                                onPreviewSet={setPersistPreview}
                                onStartRecording={() => startRecRef.current?.()}
                            />
                        ))}
                    </Box>
                </Box>
                <EntryDialog
                    open={dialogs.dialog.open}
                    onClose={handleDialogClose}
                    anchorPosition={dialogs.dialog.anchorPosition}
                    initialStartTime={dialogs.dialog.startTime}
                    initialEndTime={dialogs.dialog.endTime}
                    dateStr={dialogs.dialog.dateStr}
                    initialTitle={dialogs.dialog.editingEntry?.task?.name}
                    initialIsBillable={dialogs.dialog.editingEntry?.is_billable ?? true}
                    initialProjectId={dialogs.dialog.editingEntry?.project_id ?? dialogs.dialog.editingEntry?.project?.id ?? null}
                    isEdit={Boolean(dialogs.dialog.editingEntry)}
                    editingEntryId={dialogs.dialog.editingEntry?.id || null}
                />

                <ContextMenu
                    state={dialogs.contextMenu}
                    onClose={dialogs.closeMenu}
                    onDuplicate={(entry) => { actions.duplicate(entry); dialogs.closeMenu(); }}
                    onDelete={dialogs.initiateDelete}
                />

                <ConfirmDialog
                    open={dialogs.confirmOpen}
                    onClose={dialogs.cancelDelete}
                    onConfirm={async () => {
                        const id = dialogs.confirmDelete();
                        if (id) await actions.remove(id);
                        dialogs.cancelDelete();
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
