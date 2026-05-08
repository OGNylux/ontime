import { supabase } from "../lib/supabase";
import { getActiveWorkspaceId, requireUserId } from "./workspaceContext";
import { CalendarEntry } from "./calendarService";
import type { Project } from "./projectService";
import type { Tables } from "../lib/database.types";

type TaskRow = Tables<'ontime_task'>;

export interface Task extends Omit<TaskRow, 'id' | 'workspace_id' | 'created_by' | 'created_at' | 'pinned' | 'color' | 'deleted_at' | 'project_id'> {
    id?: string;
    workspace_id?: string;
    created_by?: string;
    created_at?: string;
    pinned?: boolean;
    color?: number | null;
    project_id?: string | null;
    project?: Project | null;
    calendar_entries?: CalendarEntry[];
    total_time?: number;
}

const TASK_SELECT = `
    *,
    calendar_entries:ontime_calendar_entry(*)
`;

const TASK_WITH_ENTRIES_SELECT = `
    *,
    calendar_entries:ontime_calendar_entry(start_time, end_time)
`;

const TASK_LIGHT_SELECT = `*`;

export const taskService = {
    async getTasks(): Promise<Task[]> {
        return this.getTasksWithEntries();
    },

    async getTasksWithTotals(): Promise<Task[]> {
        const workspaceId = await getActiveWorkspaceId();

        const { data, error } = await supabase
            .from("ontime_task")
            .select(TASK_WITH_ENTRIES_SELECT)
            .eq("workspace_id", workspaceId)
            .is("deleted_at", null)
            .order("pinned", { ascending: false })
            .order("created_at", { ascending: false })
            .returns<TaskWithEntries[]>();
        if (error) throw error;

        return (data ?? []).map(rowToTask);
    },

    async getTasksWithEntries(): Promise<Task[]> {
        const workspaceId = await getActiveWorkspaceId();

        const { data, error } = await supabase
            .from("ontime_task")
            .select(TASK_SELECT)
            .eq("workspace_id", workspaceId)
            .is("deleted_at", null)
            .order("pinned", { ascending: false })
            .order("created_at", { ascending: false })
            .returns<TaskWithEntries[]>();
        if (error) throw error;

        return (data ?? []).map(rowToTask);
    },

    async getTasksLight(): Promise<Task[]> {
        const workspaceId = await getActiveWorkspaceId();

        const { data, error } = await supabase
            .from("ontime_task")
            .select(TASK_LIGHT_SELECT)
            .eq("workspace_id", workspaceId)
            .is("deleted_at", null)
            .order("pinned", { ascending: false })
            .order("created_at", { ascending: false });
        if (error) throw error;

        return data ?? [];
    },

    async getTasksForProject(projectId: string): Promise<Task[]> {
        const { data, error } = await supabase
            .from("ontime_task")
            .select("*")
            .eq("project_id", projectId)
            .is("deleted_at", null)
            .order("pinned", { ascending: false })
            .order("created_at", { ascending: false });
        if (error) throw error;
        return data ?? [];
    },

    async createTask(request: Task): Promise<Task> {
        const userId = await requireUserId();
        const workspaceId = request.workspace_id ?? await getActiveWorkspaceId();

        const { data, error } = await supabase
            .from("ontime_task")
            .insert({
                workspace_id: workspaceId,
                project_id: request.project_id ?? '',
                name: request.name,
                color: request.color ?? null,
                pinned: request.pinned ?? false,
                created_by: userId,
            })
            .select()
            .returns<Task>()
            .single();
        if (error) throw error;
        return data;
    },

    async updateTask(id: string, request: Task): Promise<Task> {
        const { data, error } = await supabase
            .from("ontime_task")
            .update({
                project_id: request.project_id ?? undefined,
                name: request.name,
                color: request.color ?? null,
                pinned: request.pinned,
            })
            .eq("id", id)
            .select()
            .returns<Task>()
            .single();
        if (error) throw error;
        return data;
    },

    async deleteTask(id: string): Promise<void> {
        const { error } = await supabase
            .from("ontime_task")
            .update({ deleted_at: new Date().toISOString() })
            .eq("id", id);
        if (error) throw error;
    },

    async restoreTask(id: string): Promise<Task> {
        const { data, error } = await supabase
            .from("ontime_task")
            .update({ deleted_at: null })
            .eq("id", id)
            .select()
            .returns<Task>()
            .single();
        if (error) throw error;
        return data;
    },

    async searchTasks(query: string): Promise<Task[]> {
        const workspaceId = await getActiveWorkspaceId();

        const { data, error } = await supabase
            .from("ontime_task")
            .select("*, project:ontime_project(*, client:ontime_client(*))")
            .eq("workspace_id", workspaceId)
            .is("deleted_at", null)
            .ilike("name", `%${query}%`)
            .limit(10);
        if (error) throw error;

        return data ?? [];
    },

    async getTaskByName(name: string, projectId?: string | null): Promise<Task | null> {
        const workspaceId = await getActiveWorkspaceId();
        let query = supabase
            .from("ontime_task")
            .select("*")
            .eq("workspace_id", workspaceId)
            .eq("name", name);

        if (projectId) {
            query = query.eq("project_id", projectId);
        } else {
            query = query.is("project_id", null);
        }
        query = query.is("deleted_at", null);

        const { data, error } = await query.returns<Task>().maybeSingle();
        if (error) throw error;
        return data;
    },

    async togglePin(id: string, pinned: boolean): Promise<Task> {
        const { data, error } = await supabase
            .from("ontime_task")
            .update({ pinned })
            .eq("id", id)
            .select()
            .returns<Task>()
            .single();
        if (error) throw error;
        return data;
    },

    async bulkSetPinned(ids: string[], pinned: boolean): Promise<void> {
        if (ids.length === 0) return;
        const { error } = await supabase
            .from("ontime_task")
            .update({ pinned })
            .in("id", ids);
        if (error) throw error;
    },

    async bulkDeleteTasks(ids: string[]): Promise<void> {
        if (ids.length === 0) return;
        const { error } = await supabase
            .from("ontime_task")
            .update({ deleted_at: new Date().toISOString() })
            .in("id", ids);
        if (error) throw error;
    },

    async bulkRestoreTasks(ids: string[]): Promise<void> {
        if (ids.length === 0) return;
        const { error } = await supabase
            .from("ontime_task")
            .update({ deleted_at: null })
            .in("id", ids);
        if (error) throw error;
    },
};

type TaskWithEntries = Task & { calendar_entries?: Pick<CalendarEntry, "start_time" | "end_time">[] };

function rowToTask(row: TaskWithEntries): Task {
    const entries = row.calendar_entries ?? [];
    const totalMinutes = entries.reduce((sum, entry) => {
        if (!entry.start_time || !entry.end_time) return sum;
        const ms = new Date(entry.end_time).getTime() - new Date(entry.start_time).getTime();
        return sum + ms / 1000 / 60;
    }, 0);

    const { calendar_entries: _drop, project: _proj, ...rest } = row as TaskWithEntries & { project?: unknown };
    return { ...rest, total_time: Math.round(totalMinutes) };
}
