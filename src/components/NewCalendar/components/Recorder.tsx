/**
 * Recorder - live time-tracking timer widget.
 *
 * Start -> creates a DB entry -> ticks every second -> auto-saves every 60 s.
 * Stop -> finalises the entry.
 */
import { Box, IconButton, TextField, Tooltip, Typography } from "@mui/material";
import { PlayArrow, Stop, AttachMoney } from "@mui/icons-material";
import { useCallback, useEffect, useRef, useState } from "react";
import dayjs from "dayjs";
import { CalendarEntry, calendarService } from "../../../services/calendarService";
import { Project } from "../../../services/projectService";
// formatDuration is available but we use raw elapsed-seconds display instead
import { RECORDER_SAVE_INTERVAL, RECORDER_TICK_INTERVAL } from "../constants";
import ProjectSelector from "./ProjectSelector";

interface RecordingState {
    entryId: string;
    dbId: string | null;
    startTime: string;
    lastSave: number;
    title: string;
    projectId?: string;
    isBillable: boolean;
}

interface Props {
    addOrReplace: (e: CalendarEntry) => void;
    onRecordingStart?: (fn: () => void) => void;
}

export default function Recorder({ addOrReplace, onRecordingStart }: Props) {
    const [recording, setRecording] = useState(false);
    const [title, setTitle] = useState("");
    const [project, setProject] = useState<Project | null>(null);
    const [billable, setBillable] = useState(false);
    const [elapsed, setElapsed] = useState(0);
    const stateRef = useRef<RecordingState | null>(null);
    const tickRef = useRef<number | null>(null);

    // Keep refs in sync with state
    const titleRef = useRef(title);
    const projectRef = useRef(project);
    const billableRef = useRef(billable);
    useEffect(() => { titleRef.current = title; }, [title]);
    useEffect(() => { projectRef.current = project; }, [project]);
    useEffect(() => { billableRef.current = billable; }, [billable]);

    const clearTick = useCallback(() => { if (tickRef.current) { clearInterval(tickRef.current); tickRef.current = null; } }, []);

    const updateLocal = useCallback((s: RecordingState, end: string) => {
        s.title = titleRef.current;
        s.projectId = projectRef.current?.id;
        s.isBillable = billableRef.current;
        addOrReplace({
            id: s.entryId, start_time: s.startTime, end_time: end,
            is_billable: s.isBillable, project_id: s.projectId,
            task: s.title ? { name: s.title } as any : undefined,
        } as CalendarEntry);
    }, [addOrReplace]);

    const autoSave = useCallback(async (s: RecordingState, end: string) => {
        if (!s.dbId || Date.now() - s.lastSave < RECORDER_SAVE_INTERVAL) return;
        try {
            addOrReplace(await calendarService.updateEntry(s.dbId, { end_time: end }));
            s.lastSave = Date.now();
        } catch (err) { console.error("Auto-save failed:", err); }
    }, [addOrReplace]);

    const createDb = useCallback(async (s: RecordingState) => {
        try {
            const c = await calendarService.createEntry({
                start_time: s.startTime, end_time: s.startTime,
                is_billable: s.isBillable, project_id: s.projectId, task_id: undefined,
            });
            const oldId = s.entryId;
            s.dbId = c.id; s.entryId = c.id; s.lastSave = Date.now();
            addOrReplace({ ...c, id: oldId });
            setTimeout(() => addOrReplace(c), 0);
        } catch (err) { console.error("createDb failed:", err); }
    }, [addOrReplace]);

    const start = useCallback(() => {
        if (stateRef.current) return;
        const now = dayjs().toISOString();
        const s: RecordingState = {
            entryId: `recording-${Date.now()}`, dbId: null, startTime: now, lastSave: 0,
            title, projectId: project?.id, isBillable: billable,
        };
        stateRef.current = s;
        updateLocal(s, now);
        setRecording(true); setElapsed(0);

        tickRef.current = window.setInterval(() => {
            const cur = stateRef.current;
            if (!cur) return;
            const n = dayjs().toISOString();
            setElapsed(Math.floor(dayjs(n).diff(dayjs(cur.startTime), "second")));
            updateLocal(cur, n);
            autoSave(cur, n);
        }, RECORDER_TICK_INTERVAL);
        createDb(s);
    }, [updateLocal, autoSave, createDb, title, project, billable]);

    const stop = useCallback(async () => {
        clearTick(); setRecording(false);
        const s = stateRef.current; stateRef.current = null;
        if (!s) return;
        const end = dayjs().toISOString();
        const t = titleRef.current, pid = projectRef.current?.id, b = billableRef.current;
        try {
            if (s.dbId) {
                const u = await calendarService.updateEntry(s.dbId, { end_time: end, is_billable: b, project_id: pid || undefined });
                addOrReplace({ ...u, task: t ? { name: t } as any : u.task });
            } else {
                const c = await calendarService.createEntry({ start_time: s.startTime, end_time: end, is_billable: b, project_id: pid, task_id: undefined });
                addOrReplace({ ...c, task: t ? { name: t } as any : c.task });
            }
        } catch (err) { console.error("stop failed:", err); }
        setTitle(""); setProject(null); setBillable(false); setElapsed(0);
    }, [addOrReplace, clearTick]);

    useEffect(() => { onRecordingStart?.(start); }, [onRecordingStart, start]);
    useEffect(() => clearTick, [clearTick]);

    const toggle = useCallback(() => { recording ? stop() : start(); }, [recording, start, stop]);

    // seconds -> "H:MM:SS"
    const display = `${Math.floor(elapsed / 3600)}:${String(Math.floor((elapsed % 3600) / 60)).padStart(2, "0")}:${String(elapsed % 60).padStart(2, "0")}`;

    return (
        <Box sx={{ display: "flex", alignItems: "center", width: "100%", gap: 1, borderBottom: t => `1px solid ${t.palette.divider}`, pb: 1, mb: 1 }}>
            <TextField placeholder="What are you working on?" value={title} onChange={e => setTitle(e.target.value)} size="small"
                sx={{ flexGrow: 1, minWidth: 120, "& .MuiInputBase-root": { height: 36 } }} />
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
                <IconButton onClick={toggle} size="small" color={recording ? "error" : "secondary"}
                    sx={{ border: 1, borderColor: "secondary.main", transition: "transform 0.12s ease", "&:hover": { transform: "scale(1.18)" } }}>
                    {recording ? <Stop /> : <PlayArrow />}
                </IconButton>
            </Tooltip>
        </Box>
    );
}
