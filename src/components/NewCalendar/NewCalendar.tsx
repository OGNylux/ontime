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
import { useState, useCallback, useRef, useMemo, useEffect } from "react";
import { Box, useMediaQuery, useTheme } from "@mui/material";
import { dayjs, parseAsUserTimezone } from "../../lib/timezone";
import { Project } from "../../services/projectService";
import { calendarService, CalendarEntry } from "../../services/calendarService";
import { resolveTaskId } from "./hooks/useEntryActions";
import { useUserTimezone } from "../../hooks/useUserTimezone";

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

    const { byDate, refetch, addOrReplace, removeLocal, prefetch } = useEntries(nav.days);

    // Pre-load adjacent weeks so navigation feels instant
    useEffect(() => {
        if (nav.days.length === 0) return;
        const step = nav.days.length;
        const firstDay = dayjs(nav.days[0].dateStr);
        const lastDay = dayjs(nav.days[nav.days.length - 1].dateStr);

        prefetch(
            firstDay.subtract(step, "day").format("YYYY-MM-DD"),
            lastDay.subtract(step, "day").format("YYYY-MM-DD"),
        );
        prefetch(
            firstDay.add(step, "day").format("YYYY-MM-DD"),
            lastDay.add(step, "day").format("YYYY-MM-DD"),
        );
    }, [nav.days, prefetch]);

    const actions = useEntryActions({ byDate, addOrReplace, removeLocal, refetch });

    const dialogs = useDialogs();

    const { moveState, beginMove } = useDragToMove(byDate, actions.updateTimes);
    const { resizeState, beginResize } = useDragToResize(byDate, actions.updateTimes);

    const [zoom, setZoom] = useState<ZoomLevel>(30);

    const [persistPreview, setPersistPreview] = useState<PersistentPreview | null>(null);

    const startRecRef = useRef<(() => void) | null>(null);
    const handleRecordingStart = useCallback((fn: () => void) => { startRecRef.current = fn; }, []);
    const [isRecording, setIsRecording] = useState(false);

    const [activeRecordingEntryId, setActiveRecordingEntryId] = useState<string | null>(null);
    const activeRecordingDbIdRef = useRef<string | null>(null);
    const recordingSyncRef = useRef<(title: string, project: Project | null, billable: boolean, startTimeISO?: string) => void>(() => {});
    const [isEditingRecording, setIsEditingRecording] = useState(false);

    const { timezone } = useUserTimezone();

    const handleActiveEntryId = useCallback((id: string | null, dbId: string | null) => {
        setActiveRecordingEntryId(id);
        activeRecordingDbIdRef.current = dbId;
    }, []);

    const handleSyncRecordingReady = useCallback((fn: (title: string, project: Project | null, billable: boolean, startTimeISO?: string) => void) => {
        recordingSyncRef.current = fn;
    }, []);

    const theme = useTheme();
    const isSmall = useMediaQuery(theme.breakpoints.down("md"));
    const scale = useMemo(() => makeScale(zoom, isSmall), [zoom, isSmall]);
    const isCompact = nav.days.length > 1;

    const scrollRef = useRef<HTMLDivElement>(null);
    const scrollToNow = useCallback((behavior: ScrollBehavior = "smooth") => {
        if (!scrollRef.current) return;
        const now = dayjs().tz(timezone);
        const minuteOfDay = now.hour() * 60 + now.minute();
        const topPx = minuteOfDay * scale.pxPerMin;
        const viewH = scrollRef.current.clientHeight;
        scrollRef.current.scrollTo({ top: Math.max(0, topPx - viewH * 0.3), behavior });
    }, [timezone, scale.pxPerMin]);

    // Keep a stable ref so the load/record effects always call the latest version
    const scrollToNowRef = useRef(scrollToNow);
    useEffect(() => { scrollToNowRef.current = scrollToNow; }, [scrollToNow]);

    // Scroll to now once nav finishes loading (ref is null while nav.loading is true)
    useEffect(() => {
        if (nav.loading) return;
        const t = setTimeout(() => scrollToNowRef.current("instant"), 50);
        return () => clearTimeout(t);
    }, [nav.loading]);

    // Scroll to now when recording starts
    const prevIsRecordingRef = useRef(false);
    useEffect(() => {
        if (isRecording && !prevIsRecordingRef.current) scrollToNowRef.current();
        prevIsRecordingRef.current = isRecording;
    }, [isRecording]);

    const allEntries = useMemo(() => Object.values(byDate).flat(), [byDate]);
    const totalWeekTime = useMemo(() => {
        const secs = allEntries.reduce((sum, entry) => sum + Math.max(0, dayjs(entry.end_time).diff(dayjs(entry.start_time), "second")), 0);
        return formatDuration(secs);
    }, [allEntries]);

    const handleRecordingEditSave = useCallback(async (data: { taskName?: string; isBillable: boolean; projectId?: string; taskId?: string; project: Project | null; dateStr: string; startTime: string }) => {
        const startTimeISO = parseAsUserTimezone(`${data.dateStr}T${data.startTime}:00`, timezone);
        // Update recorder state and visual immediately — the tick owns the entry display while recording.
        recordingSyncRef.current(data.taskName ?? "", data.project, data.isBillable, startTimeISO);
        const dbId = activeRecordingDbIdRef.current;
        if (dbId) {
            const effectiveTaskName = data.taskName || data.project?.name || '';
            const taskId = await resolveTaskId(effectiveTaskName, data.taskId, data.projectId);
            await calendarService.updateEntry(dbId, { start_time: startTimeISO, is_billable: data.isBillable, task_id: taskId ?? null });
            // Re-sync after async work so the tick-managed entry state stays correct.
            recordingSyncRef.current(data.taskName ?? "", data.project, data.isBillable, startTimeISO);
        }
    }, [timezone]);

    const openEditOrRecording = useCallback((entry: CalendarEntry, pos: { top: number; left: number } | null) => {
        if (activeRecordingEntryId && entry.id === activeRecordingEntryId) {
            setIsEditingRecording(true);
        } else {
            setIsEditingRecording(false);
        }
        dialogs.openEdit(entry, pos);
    }, [activeRecordingEntryId, dialogs]);

    const handleDialogClose = useCallback(() => {
        dialogs.closeDialog();
        setPersistPreview(null);
        setIsEditingRecording(false);
    }, [dialogs]);

    const context: CalendarContextValue = {
        byDate, addOrReplace, removeLocal, refetch,
        actions,
        openCreate: dialogs.openCreate,
        openEdit: openEditOrRecording,
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
                    onRecordingChange={setIsRecording}
                    onActiveEntryId={handleActiveEntryId}
                    onSyncRecording={handleSyncRecordingReady}
                    addOrReplace={addOrReplace}
                    removeLocal={removeLocal}
                    refetch={refetch}
                    onPrev={nav.goPrev}
                    onNext={nav.goNext}
                    onToday={() => { nav.goToday(); setTimeout(() => scrollToNow(), 0); }}
                    totalTime={totalWeekTime}
                    viewMode={nav.viewMode}
                    onViewModeChange={nav.setViewMode}
                />

                <ProjectBar entries={allEntries} />
                <Box
                    ref={scrollRef}
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
                                isRecording={isRecording}
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
                    initialProjectId={dialogs.dialog.editingEntry?.task?.project_id ?? null}
                    initialProject={dialogs.dialog.editingEntry?.task?.project ?? null}
                    isEdit={Boolean(dialogs.dialog.editingEntry)}
                    editingEntryId={dialogs.dialog.editingEntry?.id || null}
                    isLiveRecording={isEditingRecording}
                    onSaveOverride={isEditingRecording ? handleRecordingEditSave : undefined}
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
