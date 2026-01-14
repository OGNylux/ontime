import { Box, IconButton, TextField, Tooltip, Typography } from "@mui/material";
import { PlayArrow, Stop, AttachMoney } from "@mui/icons-material";
import { useCallback, useEffect, useRef, useState } from "react";
import dayjs from "dayjs";
import { CalendarEntry, calendarService } from "../../../services/calendarService";
import ProjectSelector from "../EntryDialog/ProjectSelector";
import { Project } from "../../../services/projectService";
import { formatDuration } from "../util/calendarUtility";

const AUTO_SAVE_INTERVAL_MS = 60_000;
const UI_UPDATE_INTERVAL_MS = 1_000;

interface RecordingState {
    entryId: string;
    dbId: string | null;
    startTime: string;
    lastSaveTime: number;
    title: string;
    projectId?: string;
    isBillable: boolean;
}

interface RecorderProps {
    addOrReplaceEntry: (entry: CalendarEntry) => void;
    onRecordingStart?: (startRecording: () => void) => void;
}

export default function Recorder({ addOrReplaceEntry, onRecordingStart }: RecorderProps) {
    const [isRecording, setIsRecording] = useState(false);
    const [title, setTitle] = useState("");
    const [selectedProject, setSelectedProject] = useState<Project | null>(null);
    const [isBillable, setIsBillable] = useState(false);
    const [elapsedSeconds, setElapsedSeconds] = useState(0);
    const recordingRef = useRef<RecordingState | null>(null);
    const timerRef = useRef<number | null>(null);
    
    // Refs to always have current values accessible in callbacks
    const titleRef = useRef(title);
    const selectedProjectRef = useRef(selectedProject);
    const isBillableRef = useRef(isBillable);
    
    // Keep refs in sync with state
    useEffect(() => { titleRef.current = title; }, [title]);
    useEffect(() => { selectedProjectRef.current = selectedProject; }, [selectedProject]);
    useEffect(() => { isBillableRef.current = isBillable; }, [isBillable]);

    const clearTimer = useCallback(() => {
        if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
        }
    }, []);

    const updateLocalEntry = useCallback((state: RecordingState, endTime: string) => {
        // Use refs to get current values
        const currentTitle = titleRef.current;
        const currentProjectId = selectedProjectRef.current?.id;
        const currentIsBillable = isBillableRef.current;
        
        // Update state object
        state.title = currentTitle;
        state.projectId = currentProjectId;
        state.isBillable = currentIsBillable;
        
        addOrReplaceEntry({
            id: state.entryId,
            start_time: state.startTime,
            end_time: endTime,
            is_billable: currentIsBillable,
            project_id: currentProjectId,
            task: currentTitle ? { name: currentTitle } as any : undefined,
        } as CalendarEntry);
    }, [addOrReplaceEntry]);

    const autoSaveToDb = useCallback(async (state: RecordingState, endTime: string) => {
        if (!state.dbId) return;
        
        const timeSinceLastSave = Date.now() - state.lastSaveTime;
        if (timeSinceLastSave < AUTO_SAVE_INTERVAL_MS) return;

        try {
            const updated = await calendarService.updateEntry(state.dbId, { 
                end_time: endTime,
            });
            addOrReplaceEntry(updated);
            state.lastSaveTime = Date.now();
        } catch (err) {
            console.error("Auto-save failed:", err);
        }
    }, [addOrReplaceEntry]);

    const createDbEntry = useCallback(async (state: RecordingState) => {
        try {
            const created = await calendarService.createEntry({
                start_time: state.startTime,
                end_time: state.startTime,
                is_billable: state.isBillable,
                project_id: state.projectId,
                task_id: undefined,
            });
            
            // Update state with DB id
            const oldId = state.entryId;
            state.dbId = created.id;
            state.entryId = created.id;
            state.lastSaveTime = Date.now();
            
            // Replace temp entry with DB entry
            addOrReplaceEntry({
                ...created,
                id: oldId, // Use old ID so it replaces the temp entry
            });
            
            // Then update with real ID
            setTimeout(() => {
                addOrReplaceEntry(created);
            }, 0);
        } catch (err) {
            console.error("Failed to create recording entry:", err);
        }
    }, [addOrReplaceEntry]);

    const startRecording = useCallback(() => {
        // Guard against double-start
        if (recordingRef.current) return;
        
        const startTime = dayjs().toISOString();
        const tempId = `recording-${Date.now()}`;

        const state: RecordingState = {
            entryId: tempId,
            dbId: null,
            startTime,
            lastSaveTime: 0,
            title,
            projectId: selectedProject?.id,
            isBillable,
        };
        recordingRef.current = state;

        updateLocalEntry(state, startTime);
        setIsRecording(true);
        setElapsedSeconds(0);

        timerRef.current = window.setInterval(() => {
            const currentState = recordingRef.current;
            if (!currentState) return;

            const now = dayjs().toISOString();
            const elapsed = Math.floor(dayjs(now).diff(dayjs(currentState.startTime), 'second'));
            setElapsedSeconds(elapsed);
            updateLocalEntry(currentState, now);
            autoSaveToDb(currentState, now);
        }, UI_UPDATE_INTERVAL_MS);

        createDbEntry(state);
    }, [updateLocalEntry, autoSaveToDb, createDbEntry, title, selectedProject, isBillable]);

    const stopRecording = useCallback(async () => {
        clearTimer();
        setIsRecording(false);

        const state = recordingRef.current;
        recordingRef.current = null;

        if (!state) return;

        const endTime = dayjs().toISOString();

        // Use refs to get current form values (avoids stale closure)
        const currentTitle = titleRef.current;
        const currentProjectId = selectedProjectRef.current?.id;
        const currentIsBillable = isBillableRef.current;

        try {
            if (state.dbId) {
                const updated = await calendarService.updateEntry(state.dbId, { 
                    end_time: endTime,
                    is_billable: currentIsBillable,
                    project_id: currentProjectId || undefined,
                });
                // Add title for local display
                addOrReplaceEntry({
                    ...updated,
                    task: currentTitle ? { name: currentTitle } as any : updated.task,
                });
            } else {
                const created = await calendarService.createEntry({
                    start_time: state.startTime,
                    end_time: endTime,
                    is_billable: currentIsBillable,
                    project_id: currentProjectId,
                    task_id: undefined,
                });
                // Add title for local display
                addOrReplaceEntry({
                    ...created,
                    task: currentTitle ? { name: currentTitle } as any : created.task,
                });
            }
        } catch (err) {
            console.error("Failed to save recording:", err);
        }

        // Reset fields after recording stops
        setTitle("");
        setSelectedProject(null);
        setIsBillable(false);
        setElapsedSeconds(0);
    }, [addOrReplaceEntry, clearTimer]);

    // Expose startRecording to parent
    useEffect(() => {
        onRecordingStart?.(startRecording);
    }, [onRecordingStart, startRecording]);

    // Cleanup timer on unmount
    useEffect(() => clearTimer, [clearTimer]);

    const handleClick = useCallback(() => {
        isRecording ? stopRecording() : startRecording();
    }, [isRecording, startRecording, stopRecording]);

    return (
        <Box sx={{ display: "flex", alignItems: "center", width: "100%", gap: 1, borderBottom: theme => `1px solid ${theme.palette.divider}`, pb: 1, mb: 1 }}>
            <TextField
                placeholder="What are you working on?"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                size="small"
                sx={{ 
                    flexGrow: 1,
                    minWidth: 120,
                    "& .MuiInputBase-root": {
                        height: 36,
                    }
                }}
            />

            <ProjectSelector
                selectedProjectId={selectedProject?.id}
                onSelect={setSelectedProject}
            />

            <Typography 
                variant="body2" 
                sx={{ 
                    minWidth: 70,
                    fontFamily: 'monospace',
                    fontSize: '0.95rem',
                    fontWeight: 500,
                    color: isRecording ? 'secondary.main' : 'text.secondary'
                }}
            >
                {formatDuration(elapsedSeconds)}
            </Typography>

            <Tooltip title="Billable">
                <IconButton
                    color={isBillable ? "secondary" : "default"}
                    onClick={() => setIsBillable(!isBillable)}
                    size="small"
                >
                    <AttachMoney />
                </IconButton>
            </Tooltip>
            
            <Tooltip title={isRecording ? "Stop recording" : "Start recording"}>
                <IconButton
                    onClick={handleClick}
                    disabled={!!recordingRef.current && !isRecording}
                    size="small"
                    color={isRecording ? "error" : "secondary"}
                    sx={{
                        border: 1,
                        borderColor: "secondary.main",
                        transition: "transform 0.12s ease",
                        "&:hover": { transform: "scale(1.18)" },
                    }}
                >
                    {isRecording ? <Stop /> : <PlayArrow />}
                </IconButton>
            </Tooltip>
        </Box>
    );
}
