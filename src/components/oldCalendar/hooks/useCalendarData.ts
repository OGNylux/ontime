import { useState, useEffect, useCallback, useRef } from "react";
import { EntriesByDay, CalendarEntry, WeekDayInfo } from "../util/calendarTypes";
import { calendarService } from "../../../services/calendarService";
import { taskService } from "../../../services/taskService";
import { addCalendarEntryToMap } from "../util/entryUtils";
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
const findEntryInMap = (entries: EntriesByDay, entryId: string): CalendarEntry | null => {
    for (const dayEntries of Object.values(entries)) {
        const found = dayEntries.find(e => e.id === entryId);
        if (found) return found;
    }
    return null;
};

// Helper: Get or create a task by title
const getOrCreateTask = async (title: string, projectId?: string): Promise<string> => {
    const existingTask = await taskService.getTaskByName(title);
    if (existingTask?.id) return existingTask.id;
    const newTask = await taskService.createTask({ name: title, project_id: projectId });
    if (!newTask.id) throw new Error("Failed to create task: ID missing");
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
                    addCalendarEntryToMap(newEntriesByDay, dbEntry);
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
            const entryStart = dayjs(record.start_time);
            const entryEnd = dayjs(record.end_time);
            const weekStart = dayjs(weekRange.start);
            const weekEnd = dayjs(weekRange.end).endOf('day');

            if (entryEnd.isBefore(weekStart) || entryStart.isAfter(weekEnd)) return;

            try {
                const fullEntry = await calendarService.getEntryById(entryId);
                if (fullEntry) {
                    setEntriesByDay(prev => {
                        const next = removeEntryFromMap(prev, entryId);
                        addCalendarEntryToMap(next, fullEntry);
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

    const addEntry = useCallback(async (dateStr: string, attributes: { 
        startMinute: number; 
        endMinute: number; 
        title?: string; 
        projectId?: string; 
        isBillable?: boolean;
        taskId?: string;
        task?: any;
    }) => {
        const tempId = `temp-${Date.now()}`;
        
        const startTime = dayjs(dateStr).startOf('day').add(attributes.startMinute, 'minute').toISOString();
        const endTime = dayjs(dateStr).startOf('day').add(attributes.endMinute, 'minute').toISOString();

        const tempTask = attributes.taskId ? undefined : (attributes.title ? {
            id: 'temp-task', name: attributes.title, project_id: attributes.projectId
        } : undefined);

        const tempEntry: CalendarEntry = {
            id: tempId,
            start_time: startTime,
            end_time: endTime,
            project_id: attributes.projectId,
            is_billable: attributes.isBillable,
            task_id: attributes.taskId,
            task: tempTask as any
        };

        setEntriesByDay(prev => {
            const next = { ...prev };
            addCalendarEntryToMap(next, tempEntry);
            return next;
        });

        try {
            const taskId = attributes.taskId || (attributes.title ? await getOrCreateTask(attributes.title, attributes.projectId) : undefined);

            const newEntry = await calendarService.createEntry({
                start_time: startTime,
                end_time: endTime,
                task_id: taskId,
                project_id: attributes.projectId,
                is_billable: attributes.isBillable
            });

            markPending(newEntry.id);

            // Replace temp entry with real one
            setEntriesByDay(prev => {
                const next = removeEntryFromMap(prev, tempId);
                addCalendarEntryToMap(next, newEntry);
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

        const startTime = dayjs(dateStr).startOf('day').add(startMinute, 'minute').toISOString();
        const endTime = dayjs(dateStr).startOf('day').add(endMinute, 'minute').toISOString();

        // Optimistic update
        setEntriesByDay(prev => {
            const next = removeEntryFromMap(prev, entryId);
            const updated: CalendarEntry = {
                ...foundEntry,
                start_time: startTime,
                end_time: endTime,
                project_id: projectId ?? foundEntry.project_id,
                is_billable: isBillable ?? foundEntry.is_billable,
                task: title && foundEntry.task ? { ...foundEntry.task, name: title } : foundEntry.task
            };
            addCalendarEntryToMap(next, updated);
            return next;
        });

        try {
            let taskId = foundEntry.task_id;

            if (title?.trim()) {
                if (taskId && foundEntry.task && title !== foundEntry.task.name) {
                    await taskService.updateTask(taskId, { name: title });
                } else if (!taskId) {
                    taskId = await getOrCreateTask(title, projectId || foundEntry.project_id);
                }
            }

            await calendarService.updateEntry(entryId, {
                start_time: startTime,
                end_time: endTime,
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
            const taskId = entryToDuplicate.task_id || 
                (entryToDuplicate.task?.name ? await getOrCreateTask(entryToDuplicate.task.name) : undefined);

            // Calculate duration
            const start = dayjs(entryToDuplicate.start_time);
            const end = dayjs(entryToDuplicate.end_time);
            const duration = end.diff(start, 'minute');

            // New start time on the target date (keeping time of day)
            const newStart = dayjs(dateStr).hour(start.hour()).minute(start.minute()).second(start.second());
            const newEnd = newStart.add(duration, 'minute');

            const newEntry = await calendarService.createEntry({
                start_time: newStart.toISOString(),
                end_time: newEnd.toISOString(),
                task_id: taskId,
                project_id: entryToDuplicate.project_id,
                is_billable: entryToDuplicate.is_billable
            });

            setEntriesByDay(prev => {
                const next = { ...prev };
                addCalendarEntryToMap(next, newEntry);
                return next;
            });
        } catch (e) {
            console.error("Failed to duplicate entry", e);
        }
    }, [entriesByDay]);

    return { entriesByDay, setEntriesByDay, addEntry, updateEntry, deleteEntry, duplicateEntry };
}
