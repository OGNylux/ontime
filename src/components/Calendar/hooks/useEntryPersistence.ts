import { useCallback } from "react";
import dayjs from "dayjs";
import { CalendarEntry, calendarService } from "../../../services/calendarService";
import { taskService } from "../../../services/taskService";

interface UseEntryPersistenceProps {
    entriesByDate: Record<string, CalendarEntry[]>;
    addOrReplaceEntry: (entry: CalendarEntry) => void;
    removeEntryLocal: (id: string) => void;
    refetch: () => void;
}

export function useEntryPersistence({
    entriesByDate,
    addOrReplaceEntry,
    removeEntryLocal,
    refetch,
}: UseEntryPersistenceProps) {
    
    // Find an entry by ID across all dates
    const findEntry = useCallback((entryId: string): CalendarEntry | undefined => {
        for (const entries of Object.values(entriesByDate)) {
            const found = entries.find(e => e.id === entryId);
            if (found) return found;
        }
        return undefined;
    }, [entriesByDate]);

    // Update entry times (used by move and resize)
    const updateEntryTimes = useCallback(async (
        dateStr: string,
        entryId: string,
        startMinute: number,
        endMinute: number
    ) => {
        const startDateTime = dayjs(dateStr).startOf('day').add(startMinute, 'minute').toISOString();
        const endDateTime = dayjs(dateStr).startOf('day').add(endMinute, 'minute').toISOString();

        // Optimistic update
        const existing = findEntry(entryId);
        if (existing) {
            addOrReplaceEntry({ ...existing, start_time: startDateTime, end_time: endDateTime });
        }

        try {
            const updated = await calendarService.updateEntry(entryId, {
                start_time: startDateTime,
                end_time: endDateTime,
            });
            addOrReplaceEntry(updated);
        } catch (err) {
            console.error("Failed to update entry times:", err);
            refetch();
        }
    }, [findEntry, addOrReplaceEntry, refetch]);

    // Create a new entry
    const createEntry = useCallback(async (data: {
        dateStr: string;
        startTime: string;
        endTime: string;
        taskName?: string;
        isBillable: boolean;
        projectId?: string | null;
    }) => {
        const startDateTime = dayjs(data.dateStr)
            .hour(parseInt(data.startTime.split(":")[0]))
            .minute(parseInt(data.startTime.split(":")[1]))
            .second(0)
            .toISOString();
        const endDateTime = dayjs(data.dateStr)
            .hour(parseInt(data.endTime.split(":")[0]))
            .minute(parseInt(data.endTime.split(":")[1]))
            .second(0)
            .toISOString();

        // Resolve task
        let taskId: string | undefined;
        if (data.taskName?.trim()) {
            let task = await taskService.getTaskByName(data.taskName.trim());
            if (!task) {
                task = await taskService.createTask({ name: data.taskName.trim() });
            }
            taskId = task.id;
        }

        // Optimistic create
        const tempId = `temp-${Date.now()}`;
        const tempEntry: CalendarEntry = {
            id: tempId,
            start_time: startDateTime,
            end_time: endDateTime,
            is_billable: data.isBillable,
            task_id: taskId,
            project_id: data.projectId ?? undefined,
        } as CalendarEntry;
        addOrReplaceEntry(tempEntry);

        try {
            const created = await calendarService.createEntry({
                start_time: startDateTime,
                end_time: endDateTime,
                is_billable: data.isBillable,
                task_id: taskId,
                project_id: data.projectId ?? undefined,
            });
            addOrReplaceEntry(created);
            if (tempId !== created.id) removeEntryLocal(tempId);
        } catch (err) {
            console.error("Failed to create entry:", err);
            refetch();
        }
    }, [addOrReplaceEntry, removeEntryLocal, refetch]);

    // Update an existing entry
    const updateEntry = useCallback(async (
        entryId: string,
        data: {
            dateStr: string;
            startTime: string;
            endTime: string;
            taskName?: string;
            isBillable: boolean;
            projectId?: string | null;
        }
    ) => {
        const existing = findEntry(entryId);
        if (!existing) return;

        const startDateTime = dayjs(data.dateStr)
            .hour(parseInt(data.startTime.split(":")[0]))
            .minute(parseInt(data.startTime.split(":")[1]))
            .second(0)
            .toISOString();
        const endDateTime = dayjs(data.dateStr)
            .hour(parseInt(data.endTime.split(":")[0]))
            .minute(parseInt(data.endTime.split(":")[1]))
            .second(0)
            .toISOString();

        // Resolve task
        let taskId: string | undefined;
        if (data.taskName?.trim()) {
            let task = await taskService.getTaskByName(data.taskName.trim());
            if (!task) {
                task = await taskService.createTask({ name: data.taskName.trim() });
            }
            taskId = task.id;
        }

        // Optimistic update
        addOrReplaceEntry({
            ...existing,
            start_time: startDateTime,
            end_time: endDateTime,
            is_billable: data.isBillable,
            task_id: taskId,
            project_id: data.projectId ?? undefined,
        });

        try {
            const updated = await calendarService.updateEntry(entryId, {
                start_time: startDateTime,
                end_time: endDateTime,
                is_billable: data.isBillable,
                task_id: taskId,
                project_id: data.projectId ?? undefined,
            });
            addOrReplaceEntry(updated);
        } catch (err) {
            console.error("Failed to update entry:", err);
            refetch();
        }
    }, [findEntry, addOrReplaceEntry, refetch]);

    // Duplicate an entry
    const duplicateEntry = useCallback(async (entry: CalendarEntry) => {
        try {
            await calendarService.createEntry({
                start_time: entry.start_time,
                end_time: entry.end_time,
                is_billable: entry.is_billable || false,
                task_id: entry.task_id,
                project_id: entry.project_id,
            });
            refetch();
        } catch (err) {
            console.error("Failed to duplicate entry:", err);
        }
    }, [refetch]);

    // Delete an entry
    const deleteEntry = useCallback(async (entryId: string) => {
        try {
            await calendarService.deleteEntry(entryId);
            refetch();
        } catch (err) {
            console.error("Failed to delete entry:", err);
        }
    }, [refetch]);

    return {
        updateEntryTimes,
        createEntry,
        updateEntry,
        duplicateEntry,
        deleteEntry,
    };
}
