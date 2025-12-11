import { useState, useEffect, useCallback, useRef } from "react";
import dayjs from "dayjs";
import { TimeEntry } from "../util/calendarTypes";
import { CalendarEntryResponseDTO } from "../../../dtos/response/CalendarEntry.response.dto";

export function useCalendarRecorder(
    addEntry: (dateStr: string, attributes: Omit<TimeEntry, 'id'>) => Promise<CalendarEntryResponseDTO | null>,
    updateEntry: (dateStr: string, entryId: string, startMinute: number, endMinute: number) => Promise<void>
) {
    const [isRecording, setIsRecording] = useState(false);
    const [recordingEntryId, setRecordingEntryId] = useState<string | null>(null);
    const [recordingDate, setRecordingDate] = useState<string | null>(null);
    const [recordingStartMinute, setRecordingStartMinute] = useState<number | null>(null);
    const intervalRef = useRef<number | null>(null);

    const updateEntryRef = useRef(updateEntry);
    useEffect(() => {
        updateEntryRef.current = updateEntry;
    }, [updateEntry]);

    const startRecording = useCallback(async () => {
        const now = dayjs();
        const dateStr = now.format("YYYY-MM-DD");
        const startMinute = now.hour() * 60 + now.minute();
        const endMinute = startMinute; // Initial block

        const newEntry = await addEntry(dateStr, {
            startMinute,
            endMinute,
            title: "",
            isBillable: false
        });

        if (newEntry) {
            setIsRecording(true);
            setRecordingEntryId(newEntry.id);
            setRecordingDate(dateStr);
            setRecordingStartMinute(startMinute);
        }
    }, [addEntry]);

    const stopRecording = useCallback(() => {
        setIsRecording(false);
        setRecordingEntryId(null);
        setRecordingDate(null);
        setRecordingStartMinute(null);
        if (intervalRef.current) {
            window.clearInterval(intervalRef.current);
            intervalRef.current = null;
        }
    }, []);

    useEffect(() => {
        if (isRecording && recordingEntryId && recordingDate && recordingStartMinute !== null) {
            // Run immediately to update?
            
            intervalRef.current = window.setInterval(() => {
                const now = dayjs();
                const currentMinute = now.hour() * 60 + now.minute();
                
                let endMinute = currentMinute;
                if (endMinute < recordingStartMinute) {
                    // Crossed midnight
                    endMinute += 24 * 60;
                }
                
                if (endMinute <= recordingStartMinute) {
                    endMinute = recordingStartMinute + 1;
                }

                updateEntryRef.current(recordingDate, recordingEntryId, recordingStartMinute, endMinute);
            }, 60000);
        }

        return () => {
            if (intervalRef.current) {
                window.clearInterval(intervalRef.current);
                intervalRef.current = null;
            }
        };
    }, [isRecording, recordingEntryId, recordingDate, recordingStartMinute]);

    return {
        isRecording,
        startRecording,
        stopRecording
    };
}
