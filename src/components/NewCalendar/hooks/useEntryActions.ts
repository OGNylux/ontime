/**
 * useEntryActions - CRUD for calendar entries with optimistic updates.
 *
 * Each method does:
 *  1. Optimistic local update via addOrReplace / removeLocal
 *  2. Server call
 *  3. On failure -> refetch
 *
 * Handles auto-creating tasks when a name is provided without an ID.
 */
import { useCallback } from "react";
import { dayjs, parseAsUserTimezone } from "../../../lib/timezone";
import { CalendarEntry, calendarService } from "../../../services/calendarService";
import { useUserTimezone } from "../../../hooks/useUserTimezone";
import { taskService } from "../../../services/taskService";
import { projectService } from "../../../services/projectService";

interface Deps {
    byDate: Record<string, CalendarEntry[]>;
    addOrReplace: (e: CalendarEntry) => void;
    removeLocal: (id: string) => void;
    refetch: () => void;
}

export interface EntryFormData {
    dateStr: string;
    startTime: string;   // "HH:mm"
    endTime: string;     // "HH:mm"
    taskName?: string;
    isBillable: boolean;
    projectId?: string | null;
    taskId?: string;
}

//  Helper: resolve taskId from name (auto-create if needed) 

async function resolveTaskId(
    taskName: string | undefined,
    taskId: string | undefined,
    projectId: string | null | undefined,
): Promise<string | undefined> {
    if (taskId) return taskId;
    if (!taskName?.trim()) return undefined;

    let task = await taskService.getTaskByName(taskName.trim(), projectId);
    if (!task) {
        let color: number | undefined;
        if (projectId) {
            try { 
                color = (await projectService.getProject(projectId)).color; 
            } 
            catch { }
        }
        task = await taskService.createTask({
            name: taskName.trim(),
            project_id: projectId ?? undefined,
            color,
        });
    }
    return task.id;
}

//  Hook 

export function useEntryActions({ byDate, addOrReplace, removeLocal, refetch }: Deps) {
    const { timezone } = useUserTimezone();

    // Find an entry anywhere in the grouped map
    const find = useCallback((id: string): CalendarEntry | undefined => {
        for (const arr of Object.values(byDate)) {
            const hit = arr.find(e => e.id === id);
            if (hit) return hit;
        }
        return undefined;
    }, [byDate]);

    //  Update start/end times only (move / resize) 
    const updateTimes = useCallback(async (
        dateStr: string, entryId: string, startMin: number, endMin: number,
    ) => {
        const base = parseAsUserTimezone(`${dateStr}T00:00:00`, timezone);
        const startUTC = dayjs.utc(base).add(startMin, "minute").toISOString();
        const endUTC   = dayjs.utc(base).add(endMin, "minute").toISOString();

        // optimistic
        const existing = find(entryId);
        if (existing) addOrReplace({ ...existing, start_time: startUTC, end_time: endUTC });

        try {
            addOrReplace(await calendarService.updateEntry(entryId, { start_time: startUTC, end_time: endUTC }));
        } catch (err) {
            console.error("updateTimes failed:", err);
            refetch();
        }
    }, [find, addOrReplace, refetch, timezone]);

    //  Create 
    const create = useCallback(async (data: EntryFormData) => {
        const start_time = parseAsUserTimezone(`${data.dateStr}T${data.startTime}:00`, timezone);
        const end_time   = parseAsUserTimezone(`${data.dateStr}T${data.endTime}:00`, timezone);
        const taskId = await resolveTaskId(data.taskName, data.taskId, data.projectId);

        // optimistic temp entry
        const tempId = `temp-${Date.now()}`;
        addOrReplace({
            id: tempId, start_time, end_time,
            is_billable: data.isBillable, task_id: taskId, project_id: data.projectId ?? undefined,
        } as CalendarEntry);

        try {
            const created = await calendarService.createEntry({
                start_time, end_time,
                is_billable: data.isBillable, task_id: taskId, project_id: data.projectId ?? undefined,
            });
            addOrReplace(created);
            if (tempId !== created.id) removeLocal(tempId);
        } catch (err) {
            console.error("create failed:", err);
            refetch();
        }
    }, [addOrReplace, removeLocal, refetch, timezone]);

    //  Update (from dialog) 
    const update = useCallback(async (entryId: string, data: EntryFormData) => {
        const existing = find(entryId);
        if (!existing) return;

        const start_time = parseAsUserTimezone(`${data.dateStr}T${data.startTime}:00`, timezone);
        const end_time   = parseAsUserTimezone(`${data.dateStr}T${data.endTime}:00`, timezone);
        const taskId = await resolveTaskId(data.taskName, data.taskId, data.projectId);

        addOrReplace({
            ...existing,
            start_time, end_time,
            is_billable: data.isBillable, task_id: taskId, project_id: data.projectId ?? undefined,
        });

        try {
            addOrReplace(await calendarService.updateEntry(entryId, {
                start_time, end_time,
                is_billable: data.isBillable, task_id: taskId, project_id: data.projectId ?? undefined,
            }));
        } catch (err) {
            console.error("update failed:", err);
            refetch();
        }
    }, [find, addOrReplace, refetch, timezone]);

    //  Duplicate 
    const duplicate = useCallback(async (entry: CalendarEntry) => {
        try {
            await calendarService.createEntry({
                start_time: entry.start_time, end_time: entry.end_time,
                is_billable: entry.is_billable || false,
                task_id: entry.task_id, project_id: entry.project_id,
            });
            refetch();
        } catch (err) {
            console.error("duplicate failed:", err);
        }
    }, [refetch]);

    //  Delete 
    const remove = useCallback(async (entryId: string) => {
        try {
            await calendarService.deleteEntry(entryId);
            refetch();
        } catch (err) {
            console.error("delete failed:", err);
        }
    }, [refetch]);

    return { updateTimes, create, update, duplicate, remove };
}
