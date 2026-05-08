/**
 * Recorder - live time-tracking timer widget.
 *
 * Start -> creates a DB entry -> ticks every second -> auto-saves every 60 s.
 * Stop -> finalises the entry.
 */
import { Box, IconButton, Tooltip, Typography } from "@mui/material";
import { PlayArrow, Stop, AttachMoney } from "@mui/icons-material";
import { useCallback, useEffect, useRef, useState } from "react";
import dayjs from "dayjs";
import { CalendarEntry, calendarService } from "../../../services/calendarService";
import { Project } from "../../../services/projectService";
import { recordingService, ActiveRecording } from "../../../services/recordingService";
import { getActiveWorkspaceId } from "../../../services/workspaceContext";
import { resolveTaskId } from "../hooks/useEntryActions";
// Uses raw elapsed-seconds display; formatDuration also accepts seconds now
import { RECORDER_SAVE_INTERVAL, RECORDER_TICK_INTERVAL } from "../constants";
import ProjectSelector from "./ProjectSelector";
import TaskAutocomplete from "./TaskAutocomplete";

interface RecordingState {
    entryId: string;
    dbId: string | null;
    startTime: string;
    lastSave: number;
    title: string;
    isBillable: boolean;
}

interface Props {
    addOrReplace: (e: CalendarEntry) => void;
    removeLocal: (id: string) => void;
    refetch: () => void;
    onRecordingStart?: (fn: () => void) => void;
    onRecordingChange?: (isRecording: boolean) => void;
    onActiveEntryId?: (id: string | null, dbId: string | null) => void;
    onSyncRecording?: (fn: (title: string, project: Project | null, billable: boolean, startTimeISO?: string) => void) => void;
}

export default function Recorder({ addOrReplace, removeLocal, refetch, onRecordingStart, onRecordingChange, onActiveEntryId, onSyncRecording }: Props) {
    const [recording, setRecording] = useState(false);
    const [title, setTitle] = useState("");
    const [project, setProject] = useState<Project | null>(null);
    const [billable, setBillable] = useState(false);
    const [elapsed, setElapsed] = useState(0);
    const stateRef = useRef<RecordingState | null>(null);
    const tickRef = useRef<number | null>(null);
    const activeRecordingIdRef = useRef<string | null>(null);
    const createDbPromiseRef = useRef<Promise<void> | null>(null);

    // Keep refs in sync with state
    const titleRef = useRef(title);
    const billableRef = useRef(billable);
    const projectRef = useRef<Project | null>(project);
    useEffect(() => { titleRef.current = title; }, [title]);
    useEffect(() => { billableRef.current = billable; }, [billable]);
    useEffect(() => { projectRef.current = project; }, [project]);

    const onActiveEntryIdRef = useRef(onActiveEntryId);
    useEffect(() => { onActiveEntryIdRef.current = onActiveEntryId; }, [onActiveEntryId]);

    const clearTick = useCallback(() => { if (tickRef.current) { clearInterval(tickRef.current); tickRef.current = null; } }, []);

    const updateLocal = useCallback((s: RecordingState, end: string) => {
        s.title = titleRef.current;
        s.isBillable = billableRef.current;
        const proj = projectRef.current;
        const taskShape = (s.title || proj)
            ? ({ name: s.title || proj?.name || '', color: proj?.color, project: proj ?? undefined, project_id: proj?.id ?? null } as any)
            : undefined;
        addOrReplace({
            id: s.entryId, start_time: s.startTime, end_time: end,
            is_billable: s.isBillable,
            task: taskShape,
        } as CalendarEntry);
    }, [addOrReplace]);

    const syncFromExternal = useCallback((newTitle: string, newProject: Project | null, newBillable: boolean, newStartTimeISO?: string) => {
        setTitle(newTitle);
        setProject(newProject);
        setBillable(newBillable);
        titleRef.current = newTitle;
        projectRef.current = newProject;
        billableRef.current = newBillable;
        if (stateRef.current) {
            stateRef.current.title = newTitle;
            stateRef.current.isBillable = newBillable;
            if (newStartTimeISO) {
                stateRef.current.startTime = newStartTimeISO;
                setElapsed(Math.floor((Date.now() - new Date(newStartTimeISO).getTime()) / 1000));
            }
            updateLocal(stateRef.current, dayjs().toISOString());
        }
    }, [updateLocal]);
    useEffect(() => { onSyncRecording?.(syncFromExternal); }, [onSyncRecording, syncFromExternal]);

    const autoSave = useCallback(async (s: RecordingState, end: string) => {
        if (!s.dbId || Date.now() - s.lastSave < RECORDER_SAVE_INTERVAL) return;
        try {
            addOrReplace(await calendarService.updateEntry(s.dbId, { end_time: end }));
            s.lastSave = Date.now();
        } catch (err) { console.error("Auto-save failed:", err); }
    }, [addOrReplace]);

    const beginTickRef = useRef<() => void>(() => { });
    const beginTick = useCallback(() => {
        clearTick();
        tickRef.current = window.setInterval(() => {
            const cur = stateRef.current;
            if (!cur) return;
            const n = dayjs().toISOString();
            setElapsed(Math.floor(dayjs(n).diff(dayjs(cur.startTime), "second")));
            updateLocal(cur, n);
            autoSave(cur, n);
        }, RECORDER_TICK_INTERVAL);
    }, [clearTick, updateLocal, autoSave]);
    useEffect(() => { beginTickRef.current = beginTick; }, [beginTick]);

    // Reusable: given a persisted ActiveRecording row, restore all UI state and
    // start ticking. Used by the mount effect AND the realtime handler.
    const applyRecordingRef = useRef<(rec: ActiveRecording) => Promise<void>>(async () => { });
    const applyRecording = useCallback(async (rec: ActiveRecording) => {
        if (stateRef.current) return; // already recording locally
        activeRecordingIdRef.current = rec.id;
        const s: RecordingState = {
            entryId: rec.calendar_entry_id ?? `recording-${Date.now()}`,
            dbId: rec.calendar_entry_id ?? null,
            startTime: rec.started_at,
            lastSave: Date.now(),
            title: rec.title ?? "",
            isBillable: rec.is_billable,
        };
        stateRef.current = s;
        onActiveEntryIdRef.current?.(s.entryId, s.dbId);
        titleRef.current = rec.title ?? "";
        billableRef.current = rec.is_billable;
        setTitle(rec.title ?? "");
        setBillable(rec.is_billable);
        setElapsed(Math.floor((Date.now() - new Date(rec.started_at).getTime()) / 1000));
        setRecording(true);
        beginTickRef.current();
    }, []); // eslint-disable-line react-hooks/exhaustive-deps
    useEffect(() => { applyRecordingRef.current = applyRecording; }, [applyRecording]);

    const createDb = useCallback((s: RecordingState) => {
        const p = (async () => {
            try {
                const c = await calendarService.createEntry({
                    start_time: s.startTime, end_time: s.startTime,
                    is_billable: s.isBillable, task_id: undefined,
                });
                const oldId = s.entryId;
                s.dbId = c.id; s.entryId = c.id; s.lastSave = Date.now();
                onActiveEntryIdRef.current?.(c.id, c.id);
                removeLocal(oldId);
                addOrReplace(c);
                if (activeRecordingIdRef.current) {
                    recordingService.setCalendarEntryId(activeRecordingIdRef.current, c.id)
                        .catch(err => console.error("Failed to update calendar_entry_id:", err));
                }
            } catch (err) { console.error("createDb failed:", err); }
        })();
        createDbPromiseRef.current = p;
        p.finally(() => {
            if (createDbPromiseRef.current === p) createDbPromiseRef.current = null;
        });
    }, [addOrReplace, removeLocal]);

    const start = useCallback(() => {
        if (stateRef.current) return;
        const now = dayjs().toISOString();
        // Sync refs so updateLocal (and any tick that races) sees the latest values.
        titleRef.current = title;
        billableRef.current = billable;
        projectRef.current = project;
        const s: RecordingState = {
            entryId: `recording-${Date.now()}`, dbId: null, startTime: now, lastSave: 0,
            title, isBillable: billable,
        };
        stateRef.current = s;
        updateLocal(s, now);
        setRecording(true); setElapsed(0);
        onActiveEntryIdRef.current?.(s.entryId, null);
        beginTick();
        recordingService.startRecording({
            is_billable: billable,
            title: title || null,
            started_at: now,
        }).then(rec => { activeRecordingIdRef.current = rec.id; })
            .catch(err => console.error("Failed to persist recording start:", err));
        createDb(s);
    }, [updateLocal, beginTick, createDb, title, billable, project]);

    const stop = useCallback(async () => {
        clearTick(); setRecording(false);
        const s = stateRef.current; stateRef.current = null;
        activeRecordingIdRef.current = null;
        onActiveEntryIdRef.current?.(null, null);
        recordingService.stopRecording().catch(err => console.error("Failed to clear active recording:", err));
        if (!s) return;

        // If createDb is still running, wait for it so s.dbId is populated and we
        // take the update path below (otherwise stop would create a duplicate row).
        if (createDbPromiseRef.current) {
            await createDbPromiseRef.current;
        }

        const end = dayjs().toISOString();
        const t = titleRef.current, b = billableRef.current;
        const proj = projectRef.current;
        let taskId: string | undefined;
        try {
            taskId = await resolveTaskId(t || proj?.name || '', undefined, proj?.id ?? undefined);
        } catch (err) { console.error("Failed to resolve task:", err); }

        try {
            if (s.dbId) {
                const u = await calendarService.updateEntry(s.dbId, {
                    end_time: end, is_billable: b, task_id: taskId ?? null,
                });
                addOrReplace(u);
            } else {
                const c = await calendarService.createEntry({
                    start_time: s.startTime, end_time: end, is_billable: b, task_id: taskId,
                });
                addOrReplace(c);
            }
        } catch (err) { console.error("stop failed:", err); }
        // Belt-and-braces: if createDb errored and left the placeholder behind, drop it.
        // Then refetch so local state matches the DB regardless of any race we missed.
        if (s.entryId && s.entryId !== s.dbId) removeLocal(s.entryId);
        refetch();
        setTitle(""); setProject(null); setBillable(false); setElapsed(0);
    }, [addOrReplace, removeLocal, refetch, clearTick]);

    // Restore active recording from DB on mount - survives page reload and other devices
    useEffect(() => {
        let cancelled = false;
        recordingService.getActiveRecording()
            .then(rec => { if (!cancelled && rec) applyRecordingRef.current(rec); })
            .catch(console.error);
        return () => { cancelled = true; };
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    // Real-time: pick up recordings started / stopped on another device
    useEffect(() => {
        let cancelled = false;
        let unsubscribe = () => {};
        getActiveWorkspaceId()
            .then((workspaceId) => {
                if (cancelled) return;
                unsubscribe = recordingService.subscribeToChanges(workspaceId, {
                    onUpsert: () => {
                        if (stateRef.current) return;
                        recordingService.getActiveRecording()
                            .then(rec => { if (rec) applyRecordingRef.current(rec); })
                            .catch(console.error);
                    },
                    onDelete: () => {
                        if (!stateRef.current) return;
                        clearTick();
                        stateRef.current = null;
                        activeRecordingIdRef.current = null;
                        onActiveEntryIdRef.current?.(null, null);
                        setRecording(false);
                        setTitle('');
                        setProject(null);
                        setBillable(false);
                        setElapsed(0);
                    },
                });
            })
            .catch(console.error);
        return () => {
            cancelled = true;
            unsubscribe();
        };
    }, [clearTick]); // eslint-disable-line react-hooks/exhaustive-deps

    const toggle = useCallback(() => { recording ? stop() : start(); }, [recording, start, stop]);

    useEffect(() => { onRecordingStart?.(toggle); }, [onRecordingStart, toggle]);
    useEffect(() => { onRecordingChange?.(recording); }, [onRecordingChange, recording]);
    useEffect(() => clearTick, [clearTick]);

    // seconds -> "H:MM:SS"
    const display = `${Math.floor(elapsed / 3600)}:${String(Math.floor((elapsed % 3600) / 60)).padStart(2, "0")}:${String(elapsed % 60).padStart(2, "0")}`;

    return (
        <Box sx={{ display: "flex", alignItems: "center", width: "100%", gap: 1, borderBottom: t => `1px solid ${t.palette.divider}`, pb: 1, mb: 1 }}>
            <Box sx={{ flexGrow: 1, minWidth: 120 }}>
                <TaskAutocomplete
                    value={title}
                    onValueChange={setTitle}
                    onTaskSelect={(task) => {
                        if (task.project_id) setProject({ id: task.project_id } as Project);
                    }}
                    placeholder="What are you working on?"
                    size="small"
                />
            </Box>
            <ProjectSelector selectedProjectId={project?.id} onSelect={setProject} />
            <Typography variant="body2" sx={{
                minWidth: 70, fontFamily: "monospace", fontSize: "0.95rem", fontWeight: 500,
                color: recording ? "secondary.main" : "text.secondary",
            }}>{display}</Typography>
            <Tooltip title="Billable">
                <IconButton color={billable ? "secondary" : "default"} onClick={() => setBillable(!billable)} size="small">
                    <AttachMoney />
                </IconButton>
            </Tooltip>
            <Tooltip title={recording ? "Stop recording" : "Start recording"}>
                <IconButton onClick={toggle} size="small" color="secondary"
                    sx={{ border: 1, borderColor: "secondary.main", transition: "transform 0.12s ease", "&:hover": { transform: "scale(1.18)" } }}>
                    {recording ? <Stop /> : <PlayArrow />}
                </IconButton>
            </Tooltip>
        </Box>
    );
}
