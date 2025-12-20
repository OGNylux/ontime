import { IconButton, Tooltip } from "@mui/material";
import { PlayArrow, Stop } from "@mui/icons-material";
import { useCallback, useRef, useState } from "react";
import dayjs from "dayjs";
import { CalendarEntry, calendarService } from "../../../services/calendarService";

interface RecorderProps {
    addOrReplaceEntry: (entry: CalendarEntry) => void;
    entriesByDate: Record<string, CalendarEntry[]>;
}

export default function Recorder({ addOrReplaceEntry, entriesByDate }: RecorderProps) {
    const [isRecording, setIsRecording] = useState(false);
    const recordingEntryIdRef = useRef<string | null>(null); // may be temp id or real db id
    const dbEntryIdRef = useRef<string | null>(null); // real db id once created
    const recordingTimerRef = useRef<number | null>(null);
    const startTimeRef = useRef<string | null>(null);
    const lastSaveRef = useRef<number | null>(null);

    const startRecording = useCallback(() => {
        const start = dayjs().toISOString();
        const tempId = `recording-temp-${Date.now()}`;
        startTimeRef.current = start;
        const tempEntry: CalendarEntry = {
            id: tempId,
            start_time: start,
            end_time: start,
            is_billable: false,
        } as CalendarEntry;
        // show optimistic temp entry immediately
        recordingEntryIdRef.current = tempId;
        addOrReplaceEntry(tempEntry);
        setIsRecording(true);

        // Start UI tick every second (updates preview locally)
        recordingTimerRef.current = window.setInterval(() => {
            const now = dayjs().toISOString();
            const id = recordingEntryIdRef.current;
            const startTime = startTimeRef.current;
            if (!id || !startTime) return;
            addOrReplaceEntry({ id, start_time: startTime, end_time: now, is_billable: false } as CalendarEntry);

            // Persist to DB only every minute (once we have a DB id)
            const dbId = dbEntryIdRef.current;
            const lastSave = lastSaveRef.current ?? 0;
            if (dbId && Date.now() - lastSave >= 60_000) {
                // fire-and-forget update
                calendarService.updateEntry(dbId, { end_time: now })
                    .then(updated => {
                        addOrReplaceEntry(updated);
                        lastSaveRef.current = Date.now();
                    })
                    .catch(err => console.error('Failed to autosave recording', err));
            }
        }, 1000) as unknown as number;

        // Create DB entry in background so we have a real id to update periodically
        (async () => {
            try {
                const created = await calendarService.createEntry({
                    start_time: start,
                    end_time: start,
                    is_billable: false,
                });
                // replace temp entry with persisted entry
                dbEntryIdRef.current = created.id;
                recordingEntryIdRef.current = created.id;
                addOrReplaceEntry(created);
                lastSaveRef.current = Date.now();
            } catch (err) {
                console.error('Failed to create recording entry', err);
            }
        })();
    }, [addOrReplaceEntry]);

    const stopRecording = useCallback(async () => {
        setIsRecording(false);
        const finalId = recordingEntryIdRef.current;
        if (recordingTimerRef.current) {
            clearInterval(recordingTimerRef.current as any);
            recordingTimerRef.current = null;
        }
        // capture final end_time from local entries or startTime
        const nowIso = dayjs().toISOString();

        // If we have a DB id, update it; otherwise attempt to create
        const dbId = dbEntryIdRef.current;
        if (dbId) {
            try {
                const updated = await calendarService.updateEntry(dbId, { end_time: nowIso });
                addOrReplaceEntry(updated);
            } catch (err) {
                console.error('Failed to finalize recording update', err);
            }
        } else if (finalId) {
            // no db id yet — try to find local entry to create
            const temp = Object.values(entriesByDate).flat().find(e => e.id === finalId);
            const start = temp?.start_time ?? startTimeRef.current ?? nowIso;
            try {
                const created = await calendarService.createEntry({
                    start_time: start,
                    end_time: nowIso,
                    is_billable: temp?.is_billable,
                    task_id: temp?.task_id,
                    project_id: temp?.project_id,
                });
                addOrReplaceEntry(created);
            } catch (err) {
                console.error('Failed to persist recording on stop', err);
            }
        }

        // cleanup refs
        recordingEntryIdRef.current = null;
        dbEntryIdRef.current = null;
        startTimeRef.current = null;
        lastSaveRef.current = null;
    }, [addOrReplaceEntry, entriesByDate]);

    return (
        <Tooltip title={isRecording ? "Stop recording" : "Start recording"}>
            <IconButton
                onClick={() => {
                    if (!isRecording) startRecording(); else stopRecording();
                }}
                size="small"
                color={isRecording ? 'error' : 'primary'}
                sx={{ mr: 1, border: 1, borderColor: 'divider' }}
            >
                {isRecording ? <Stop /> : <PlayArrow />}
            </IconButton>
        </Tooltip>
    );
}
