import { useState, useEffect, useCallback, useRef } from "react";
import { EntriesByDay, TimeEntry, WeekDayInfo } from "../util/calendarTypes";
import { calendarService } from "../../../services/calendarService";
import { taskService } from "../../../services/taskService";
import { clampMinute } from "../util/calendarUtility";
import { addTimeEntryToMap, convertDtoToTimeEntry } from "../util/entryUtils";
import { supabase } from "../../../lib/supabase";
import dayjs from "dayjs";

// Helper: Remove an entry from all days
const removeEntryFromMap = (entries: EntriesByDay, entryId: string): EntriesByDay => {
    const next = { ...entries };
    Object.keys(next).forEach(key => {
        next[key] = next[key].filter(e => e.id !== entryId);
    });
    return next;
};

// Helper: Find an entry across all days
const findEntryInMap = (entries: EntriesByDay, entryId: string): TimeEntry | null => {
    for (const dayEntries of Object.values(entries)) {
        const found = dayEntries.find(e => e.id === entryId);
        if (found) return found;
    }
    return null;
};

// Helper: Get or create a task by title
const getOrCreateTask = async (title: string, projectId?: string): Promise<string> => {
    const existingTask = await taskService.getTaskByName(title);
    if (existingTask) return existingTask.id;
    const newTask = await taskService.createTask({ name: title, project_id: projectId });
    return newTask.id;
};

export function useCalendarData(weekDays: WeekDayInfo[]) {
    const [entriesByDay, setEntriesByDay] = useState<EntriesByDay>({});
    const weekRangeRef = useRef<{ start: string; end: string } | null>(null);
    const pendingLocalChangesRef = useRef<Record<string, number>>({});

    // Mark entry as pending local change (skip realtime for it)
    const markPending = (id: string) => {
        pendingLocalChangesRef.current[id] = Date.now();
    };

    const clearPending = (id: string) => {
        delete pendingLocalChangesRef.current[id];
    };

    const isPending = (id: string): boolean => {
        const timestamp = pendingLocalChangesRef.current[id];
        if (!timestamp) return false;
        
        // If entry has been pending for more than 5 seconds, consider it stale and clear it
        if (Date.now() - timestamp > 5000) {
            clearPending(id);
            return false;
        }
        return true;
    };

    // Fetch entries when week changes
    useEffect(() => {
        if (weekDays.length === 0) return;
        
        const start = weekDays[0].dateStr;
        const end = weekDays[weekDays.length - 1].dateStr;
        weekRangeRef.current = { start, end };

        calendarService.getEntries(start, end)
            .then(dbEntries => {
                const newEntriesByDay: EntriesByDay = {};
                dbEntries.forEach(dbEntry => {
                    addTimeEntryToMap(newEntriesByDay, dbEntry.date, convertDtoToTimeEntry(dbEntry));
                });
                setEntriesByDay(newEntriesByDay);
            })
            .catch(err => console.error("Failed to fetch entries", err));
    }, [weekDays]);

    // Realtime subscription
    useEffect(() => {
        const handleRealtimeChange = async (payload: any) => {
            const weekRange = weekRangeRef.current;
            if (!weekRange) return;

            const eventType = payload.eventType;
            const record = payload.new || payload.old;
            const entryId = record?.id?.toString();

            if (!entryId) return;

            // Skip realtime events for entries with pending local changes
            if (isPending(entryId)) {
                return;
            }

            if (eventType === 'DELETE') {
                setEntriesByDay(prev => removeEntryFromMap(prev, entryId));
                return;
            }

            // For INSERT/UPDATE: fetch the full entry first, then update state
            // This avoids removing the entry and causing a brief flicker
            const entryDate = dayjs(record.start_time).format('YYYY-MM-DD');
            if (entryDate < weekRange.start || entryDate > weekRange.end) return;

            try {
                const fullEntry = await calendarService.getEntryById(entryId);
                if (fullEntry) {
                    setEntriesByDay(prev => {
                        const next = removeEntryFromMap(prev, entryId);
                        addTimeEntryToMap(next, fullEntry.date, convertDtoToTimeEntry(fullEntry));
                        return next;
                    });
                }
            } catch (e) {
                console.error('Failed to fetch updated entry:', e);
            }
        };

        if (!weekRangeRef.current) return;

        const channel = supabase
            .channel(`calendar-entries-realtime-${Date.now()}`)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'ontime_calendar_entry' }, handleRealtimeChange)
            .subscribe((_status, err) => {
                if (err) console.error('Realtime subscription error:', err);
            });

        return () => { supabase.removeChannel(channel); };
    }, [weekDays]);

    const addEntry = useCallback(async (dateStr: string, attributes: Omit<TimeEntry, 'id'>) => {
        const tempId = `temp-${Date.now()}`;
        
        // Optimistic update with temp entry
        const tempTask = attributes.task || (attributes.title ? {
            id: 'temp-task', name: attributes.title, color: '#1976d2',
            created_at: new Date().toISOString(), created_by: 'temp', project_id: ''
        } : undefined);

        setEntriesByDay(prev => {
            const next = { ...prev };
            addTimeEntryToMap(next, dateStr, { id: tempId, ...attributes, task: tempTask });
            return next;
        });

        try {
            const taskId = attributes.taskId || (attributes.title ? await getOrCreateTask(attributes.title) : undefined);

            const newEntry = await calendarService.createEntry({
                date: dateStr,
                start_minute: attributes.startMinute,
                end_minute: attributes.endMinute,
                task_id: taskId,
                project_id: attributes.projectId,
                is_billable: attributes.isBillable
            });

            markPending(newEntry.id);

            // Replace temp entry with real one
            setEntriesByDay(prev => {
                const next = { ...prev };
                Object.keys(next).forEach(key => {
                    next[key] = next[key].map(e => e.id === tempId ? {
                        ...e, id: newEntry.id, taskId: newEntry.task_id,
                        task: newEntry.task, projectId: newEntry.project_id, isBillable: newEntry.is_billable
                    } : e);
                });
                return next;
            });
            
            // Wait a bit for realtime events to arrive, then clear pending
            setTimeout(() => clearPending(newEntry.id), 1500);
            return newEntry;
        } catch (e) {
            console.error("Failed to create entry", e);
            setEntriesByDay(prev => removeEntryFromMap(prev, tempId));
            return null;
        }
    }, []);

    const updateEntry = useCallback(async (
        dateStr: string, entryId: string, startMinute: number, endMinute: number,
        title?: string, projectId?: string, isBillable?: boolean
    ) => {
        const previousEntries = { ...entriesByDay };
        const foundEntry = findEntryInMap(entriesByDay, entryId);
        if (!foundEntry) return;

        markPending(entryId);

        // Optimistic update
        setEntriesByDay(prev => {
            const next = removeEntryFromMap(prev, entryId);
            const updated: TimeEntry = {
                ...foundEntry,
                startMinute: clampMinute(startMinute),
                endMinute: clampMinute(endMinute),
                title: title ?? foundEntry.title,
                task: title && foundEntry.task ? { ...foundEntry.task, name: title } : foundEntry.task,
                projectId: projectId ?? foundEntry.projectId,
                isBillable: isBillable ?? foundEntry.isBillable
            };
            addTimeEntryToMap(next, dateStr, updated);
            return next;
        });

        try {
            let taskId = foundEntry.taskId;

            if (title?.trim()) {
                if (taskId && title !== foundEntry.title) {
                    await taskService.updateTask({ id: taskId, name: title });
                } else if (!taskId) {
                    taskId = await getOrCreateTask(title, projectId || foundEntry.projectId);
                }
            }

            await calendarService.updateEntry(entryId, {
                date: dateStr,
                start_minute: clampMinute(startMinute),
                end_minute: clampMinute(endMinute),
                project_id: projectId,
                is_billable: isBillable,
                task_id: taskId
            });
            
            // Wait a bit for realtime events to arrive, then clear pending
            setTimeout(() => clearPending(entryId), 1500);
        } catch (e) {
            console.error("Failed to update entry", e);
            clearPending(entryId);
            setEntriesByDay(previousEntries);
        }
    }, [entriesByDay]);

    const deleteEntry = useCallback(async (_dateStr: string, entryId: string) => {
        const previousEntries = { ...entriesByDay };
        markPending(entryId);
        setEntriesByDay(prev => removeEntryFromMap(prev, entryId));

        try {
            await calendarService.deleteEntry(entryId);
            // Wait a bit for realtime events to arrive, then clear pending
            setTimeout(() => clearPending(entryId), 1500);
        } catch (e) {
            console.error("Failed to delete entry", e);
            clearPending(entryId);
            setEntriesByDay(previousEntries);
        }
    }, [entriesByDay]);

    const duplicateEntry = useCallback(async (dateStr: string, entryId: string) => {
        const entryToDuplicate = findEntryInMap(entriesByDay, entryId);
        if (!entryToDuplicate) return;

        try {
            const taskId = entryToDuplicate.taskId || 
                (entryToDuplicate.title ? await getOrCreateTask(entryToDuplicate.title) : undefined);

            const newEntry = await calendarService.createEntry({
                date: dateStr,
                start_minute: entryToDuplicate.startMinute,
                end_minute: entryToDuplicate.endMinute,
                task_id: taskId
            });

            setEntriesByDay(prev => {
                const next = { ...prev };
                addTimeEntryToMap(next, dateStr, convertDtoToTimeEntry(newEntry));
                return next;
            });
        } catch (e) {
            console.error("Failed to duplicate entry", e);
        }
    }, [entriesByDay]);

    return { entriesByDay, setEntriesByDay, addEntry, updateEntry, deleteEntry, duplicateEntry };
}
