import { IconButton, Tooltip } from "@mui/material";
import { PlayArrow, Stop } from "@mui/icons-material";
import { useCallback, useEffect, useRef, useState } from "react";
import dayjs from "dayjs";
import { CalendarEntry, calendarService } from "../../../services/calendarService";

const AUTO_SAVE_INTERVAL_MS = 60_000;
const UI_UPDATE_INTERVAL_MS = 1_000;

interface RecordingState {
    entryId: string;
    dbId: string | null;
    startTime: string;
    lastSaveTime: number;
}

interface RecorderProps {
    addOrReplaceEntry: (entry: CalendarEntry) => void;
    onRecordingStart?: (startRecording: () => void) => void;
}

export default function Recorder({ addOrReplaceEntry, onRecordingStart }: RecorderProps) {
    const [isRecording, setIsRecording] = useState(false);
    const recordingRef = useRef<RecordingState | null>(null);
    const timerRef = useRef<number | null>(null);

    const clearTimer = useCallback(() => {
        if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
        }
    }, []);

    const updateLocalEntry = useCallback((state: RecordingState, endTime: string) => {
        addOrReplaceEntry({
            id: state.entryId,
            start_time: state.startTime,
            end_time: endTime,
            is_billable: false,
        } as CalendarEntry);
    }, [addOrReplaceEntry]);

    const autoSaveToDb = useCallback(async (state: RecordingState, endTime: string) => {
        if (!state.dbId) return;
        
        const timeSinceLastSave = Date.now() - state.lastSaveTime;
        if (timeSinceLastSave < AUTO_SAVE_INTERVAL_MS) return;

        try {
            const updated = await calendarService.updateEntry(state.dbId, { end_time: endTime });
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
                is_billable: false,
            });
            state.dbId = created.id;
            state.entryId = created.id;
            state.lastSaveTime = Date.now();
            addOrReplaceEntry(created);
        } catch (err) {
            console.error("Failed to create recording entry:", err);
        }
    }, [addOrReplaceEntry]);

    const startRecording = useCallback(() => {
        const startTime = dayjs().toISOString();
        const tempId = `recording-${Date.now()}`;

        const state: RecordingState = {
            entryId: tempId,
            dbId: null,
            startTime,
            lastSaveTime: 0,
        };
        recordingRef.current = state;

        updateLocalEntry(state, startTime);
        setIsRecording(true);

        timerRef.current = window.setInterval(() => {
            const currentState = recordingRef.current;
            if (!currentState) return;

            const now = dayjs().toISOString();
            updateLocalEntry(currentState, now);
            autoSaveToDb(currentState, now);
        }, UI_UPDATE_INTERVAL_MS);

        createDbEntry(state);
    }, [updateLocalEntry, autoSaveToDb, createDbEntry]);

    const stopRecording = useCallback(async () => {
        clearTimer();
        setIsRecording(false);

        const state = recordingRef.current;
        recordingRef.current = null;

        if (!state) return;

        const endTime = dayjs().toISOString();

        try {
            if (state.dbId) {
                const updated = await calendarService.updateEntry(state.dbId, { end_time: endTime });
                addOrReplaceEntry(updated);
            } else {
                const created = await calendarService.createEntry({
                    start_time: state.startTime,
                    end_time: endTime,
                    is_billable: false,
                });
                addOrReplaceEntry(created);
            }
        } catch (err) {
            console.error("Failed to save recording:", err);
        }
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
        <Tooltip title={isRecording ? "Stop recording" : "Start recording"}>
            <IconButton
                onClick={handleClick}
                size="small"
                color={isRecording ? "error" : "primary"}
                sx={{
                    mr: 1,
                    border: 1,
                    borderColor: "divider",
                    transition: "transform 0.12s ease",
                    "&:hover": { transform: "scale(1.18)" },
                }}
            >
                {isRecording ? <Stop /> : <PlayArrow />}
            </IconButton>
        </Tooltip>
    );
}
