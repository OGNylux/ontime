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
import { useSnackbar } from "../../../hooks/useSnackbar";
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
    projectId?: string;
    taskId?: string;
}

async function resolveTaskId(
    taskName: string | undefined,
    taskId: string | undefined,
    projectId: string | undefined,
): Promise<string | undefined> {
    if (taskId) return taskId;
    if (!taskName?.trim()) return undefined;

    let task = await taskService.getTaskByName(taskName.trim(), projectId);
    if (!task) {
        let color: number | undefined;
        if (projectId) {
            try {
                color = (await projectService.getProject(projectId)).color;
            } catch (err) {
                // Color lookup is best-effort; fall back to undefined.
                console.error('Failed to fetch project color:', err);
            }
        }
        task = await taskService.createTask({
            name: taskName.trim(),
            project_id: projectId ?? null,
            color,
        });
    }
    return task.id;
}

export function useEntryActions({ byDate, addOrReplace, removeLocal, refetch }: Deps) {
    const { timezone } = useUserTimezone();
    const { showWithAction, showError } = useSnackbar();

    const entryLabel = (entry: CalendarEntry | undefined): string =>
        entry?.task?.name?.trim() || "Calendar entry";

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
        const endUTC = dayjs.utc(base).add(endMin, "minute").toISOString();

        // optimistic
        const existing = find(entryId);
        if (existing) addOrReplace({ ...existing, start_time: startUTC, end_time: endUTC });

        try {
            addOrReplace(await calendarService.updateEntry(entryId, { start_time: startUTC, end_time: endUTC }));
            if (existing && (existing.start_time !== startUTC || existing.end_time !== endUTC)) {
                const previous = existing;
                showWithAction(
                    `Moved "${entryLabel(previous)}"`,
                    {
                        label: 'Undo',
                        onClick: async () => {
                            try {
                                addOrReplace(await calendarService.updateEntry(entryId, {
                                    start_time: previous.start_time,
                                    end_time: previous.end_time,
                                }));
                            } catch (err) {
                                console.error("Failed to revert move:", err);
                                showError("Failed to revert move", err instanceof Error ? err.message : undefined);
                                refetch();
                            }
                        },
                    },
                    { severity: 'info' },
                );
            }
        } catch (err) {
            console.error("updateTimes failed:", err);
            refetch();
            throw err;
        }
    }, [find, addOrReplace, refetch, timezone, showWithAction, showError]);

    //  Create
    const create = useCallback(async (data: EntryFormData) => {
        const start_time = parseAsUserTimezone(`${data.dateStr}T${data.startTime}:00`, timezone);
        const end_time = parseAsUserTimezone(`${data.dateStr}T${data.endTime}:00`, timezone);
        const taskId = await resolveTaskId(data.taskName, data.taskId, data.projectId);

        // optimistic temp entry
        const tempId = `temp-${Date.now()}`;
        addOrReplace({
            id: tempId, start_time, end_time,
            is_billable: data.isBillable, task_id: taskId,
        } as CalendarEntry);

        try {
            const created = await calendarService.createEntry({
                start_time, end_time,
                is_billable: data.isBillable, task_id: taskId,
            });
            addOrReplace(created);
            if (tempId !== created.id) removeLocal(tempId);
        } catch (err) {
            console.error("create failed:", err);
            removeLocal(tempId);
            refetch();
            throw err;
        }
    }, [addOrReplace, removeLocal, refetch, timezone]);

    const update = useCallback(async (entryId: string, data: EntryFormData) => {
        const existing = find(entryId);
        if (!existing) return;
        const previous = existing;

        const start_time = parseAsUserTimezone(`${data.dateStr}T${data.startTime}:00`, timezone);
        const end_time = parseAsUserTimezone(`${data.dateStr}T${data.endTime}:00`, timezone);
        const taskId = await resolveTaskId(data.taskName, data.taskId, data.projectId);

        addOrReplace({
            ...existing,
            start_time, end_time,
            is_billable: data.isBillable, task_id: taskId,
        });

        try {
            addOrReplace(await calendarService.updateEntry(entryId, {
                start_time, end_time,
                is_billable: data.isBillable, task_id: taskId,
            }));
            showWithAction(
                `Updated "${entryLabel(previous)}"`,
                {
                    label: 'Undo',
                    onClick: async () => {
                        try {
                            addOrReplace(await calendarService.updateEntry(entryId, {
                                start_time: previous.start_time,
                                end_time: previous.end_time,
                                is_billable: previous.is_billable,
                                task_id: previous.task_id ?? null,
                            }));
                        } catch (err) {
                            console.error("Failed to revert entry:", err);
                            showError("Failed to revert entry", err instanceof Error ? err.message : undefined);
                            refetch();
                        }
                    },
                },
                { severity: 'info' },
            );
        } catch (err) {
            console.error("update failed:", err);
            refetch();
            throw err;
        }
    }, [find, addOrReplace, refetch, timezone, showWithAction, showError]);

    const duplicate = useCallback(async (entry: CalendarEntry) => {
        try {
            await calendarService.createEntry({
                start_time: entry.start_time, end_time: entry.end_time,
                is_billable: entry.is_billable || false,
                task_id: entry.task_id,
            });
            refetch();
        } catch (err) {
            console.error("duplicate failed:", err);
            throw err;
        }
    }, [refetch]);

    const remove = useCallback(async (entryId: string) => {
        const existing = find(entryId);
        removeLocal(entryId);
        try {
            await calendarService.deleteEntry(entryId);
            if (existing) {
                const snapshot = existing;
                showWithAction(
                    `Deleted "${entryLabel(snapshot)}"`,
                    {
                        label: 'Undo',
                        onClick: async () => {
                            try {
                                const recreated = await calendarService.createEntry({
                                    start_time: snapshot.start_time,
                                    end_time: snapshot.end_time,
                                    is_billable: snapshot.is_billable ?? false,
                                    task_id: snapshot.task_id ?? null,
                                });
                                addOrReplace(recreated);
                            } catch (err) {
                                console.error("Failed to restore entry:", err);
                                showError("Failed to restore entry", err instanceof Error ? err.message : undefined);
                                refetch();
                            }
                        },
                    },
                    { severity: 'info' },
                );
            }
        } catch (err) {
            console.error("delete failed:", err);
            if (existing) addOrReplace(existing);
            throw err;
        }
    }, [find, removeLocal, addOrReplace, refetch, showWithAction, showError]);

    return { updateTimes, create, update, duplicate, remove };
}
