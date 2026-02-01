import { useCallback } from "react";
import { dayjs, parseAsUserTimezone } from "../../../lib/timezone";
import { CalendarEntry, calendarService } from "../../../services/calendarService";
import { useUserTimezone } from "../../../hooks/useUserTimezone";
import { taskService } from "../../../services/taskService";
import { projectService } from "../../../services/projectService";

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
    const { timezone } = useUserTimezone();
    
    const findEntry = useCallback((entryId: string): CalendarEntry | undefined => {
        for (const entries of Object.values(entriesByDate)) {
            const found = entries.find(e => e.id === entryId);
            if (found) return found;
        }
        return undefined;
    }, [entriesByDate]);

    const updateEntryTimes = useCallback(async (
        dateStr: string,
        entryId: string,
        startMinute: number,
        endMinute: number
    ) => {
        const startDateTime = parseAsUserTimezone(`${dateStr}T00:00:00`, timezone);
        const endDateTime = parseAsUserTimezone(`${dateStr}T00:00:00`, timezone);
        const startUTC = dayjs.utc(startDateTime).add(startMinute, 'minute').toISOString();
        const endUTC = dayjs.utc(endDateTime).add(endMinute, 'minute').toISOString();

        
        const existing = findEntry(entryId);
        if (existing) {
            addOrReplaceEntry({ ...existing, start_time: startUTC, end_time: endUTC });
        }

        try {
            const updated = await calendarService.updateEntry(entryId, {
                start_time: startUTC,
                end_time: endUTC,
            });
            addOrReplaceEntry(updated);
        } catch (err) {
            console.error("Failed to update entry times:", err);
            refetch();
        }
    }, [findEntry, addOrReplaceEntry, refetch, timezone]);

    
    const createEntry = useCallback(async (data: {
        dateStr: string;
        startTime: string;
        endTime: string;
        taskName?: string;
        isBillable: boolean;
        projectId?: string | null;
        taskId?: string;
    }) => {
        const startDateTime = parseAsUserTimezone(
            `${data.dateStr}T${data.startTime}:00`,
            timezone
        );
        const endDateTime = parseAsUserTimezone(
            `${data.dateStr}T${data.endTime}:00`,
            timezone
        );

        let taskId: string | undefined = data.taskId;
        if (!taskId && data.taskName?.trim()) {
            let task = await taskService.getTaskByName(data.taskName.trim(), data.projectId);
            
            if (!task) {
                let projectColor: number | undefined = undefined;
                if (data.projectId) {
                    try {
                        const project = await projectService.getProject(data.projectId);
                        projectColor = project.color;
                    } catch (err) {
                        console.error("Failed to fetch project color:", err);
                    }
                }
                
                task = await taskService.createTask({ 
                    name: data.taskName.trim(),
                    project_id: data.projectId ?? undefined,
                    color: projectColor
                });
            }
            taskId = task.id;
        }

        
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
    }, [addOrReplaceEntry, removeEntryLocal, refetch, timezone]);

    const updateEntry = useCallback(async (
        entryId: string,
        data: {
            dateStr: string;
            startTime: string;
            endTime: string;
            taskName?: string;
            isBillable: boolean;
            projectId?: string | null;
            taskId?: string;
        }
    ) => {
        const existing = findEntry(entryId);
        if (!existing) return;

        const startDateTime = parseAsUserTimezone(
            `${data.dateStr}T${data.startTime}:00`,
            timezone
        );
        const endDateTime = parseAsUserTimezone(
            `${data.dateStr}T${data.endTime}:00`,
            timezone
        );

        let taskId: string | undefined = data.taskId;
        if (!taskId && data.taskName?.trim()) {
            let task = await taskService.getTaskByName(data.taskName.trim(), data.projectId);
            
            if (!task) {
                let projectColor: number | undefined = undefined;
                if (data.projectId) {
                    try {
                        const project = await projectService.getProject(data.projectId);
                        projectColor = project.color;
                    } catch (err) {
                        console.error("Failed to fetch project color:", err);
                    }
                }
                
                task = await taskService.createTask({ 
                    name: data.taskName.trim(),
                    project_id: data.projectId ?? undefined,
                    color: projectColor
                });
            }
            taskId = task.id;
        }

        
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
    }, [findEntry, addOrReplaceEntry, refetch, timezone]);

    
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
