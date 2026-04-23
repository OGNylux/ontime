import { supabase } from "../lib/supabase";
import { getActiveWorkspaceId, requireUserId } from "./workspaceContext";
import { CalendarEntry } from "./calendarService";

export interface Task {
    id?: string;
    project_id: string;
    name: string;
    color?: number | null;
    pinned?: boolean;
    total_time?: number;
    calendar_entries?: CalendarEntry[];
    created_by?: string;
    created_at?: string;
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
            .select(`${TASK_WITH_ENTRIES_SELECT}, project:ontime_project!inner(workspace_id)`)
            .eq("project.workspace_id", workspaceId)
            .order("pinned", { ascending: false })
            .order("created_at", { ascending: false });
        if (error) throw error;

        return (data ?? []).map(rowToTask);
    },

    async getTasksWithEntries(): Promise<Task[]> {
        const workspaceId = await getActiveWorkspaceId();

        const { data, error } = await supabase
            .from("ontime_task")
            .select(`${TASK_SELECT}, project:ontime_project!inner(workspace_id)`)
            .eq("project.workspace_id", workspaceId)
            .order("pinned", { ascending: false })
            .order("created_at", { ascending: false });
        if (error) throw error;

        return (data ?? []).map(({ project: _drop, ...rest }) => rest as Task);
    },

    async getTasksLight(): Promise<Task[]> {
        const workspaceId = await getActiveWorkspaceId();

        const { data, error } = await supabase
            .from("ontime_task")
            .select(`${TASK_LIGHT_SELECT}, project:ontime_project!inner(workspace_id)`)
            .eq("project.workspace_id", workspaceId)
            .order("pinned", { ascending: false })
            .order("created_at", { ascending: false });
        if (error) throw error;

        return (data ?? []).map(({ project: _drop, ...rest }) => rest as Task);
    },

    async getTasksForProject(projectId: string): Promise<Task[]> {
        const { data, error } = await supabase
            .from("ontime_task")
            .select("*")
            .eq("project_id", projectId)
            .order("pinned", { ascending: false })
            .order("created_at", { ascending: false });
        if (error) throw error;
        return data as Task[];
    },

    async createTask(request: Task): Promise<Task> {
        if (!request.project_id) throw new Error("project_id is required");
        const userId = await requireUserId();

        const { data, error } = await supabase
            .from("ontime_task")
            .insert({
                project_id: request.project_id,
                name: request.name,
                color: request.color ?? null,
                pinned: request.pinned ?? false,
                created_by: userId,
            })
            .select()
            .single();
        if (error) throw error;
        return data as Task;
    },

    async updateTask(id: string, request: Task): Promise<Task> {
        const { data, error } = await supabase
            .from("ontime_task")
            .update({
                project_id: request.project_id,
                name: request.name,
                color: request.color ?? null,
                pinned: request.pinned,
            })
            .eq("id", id)
            .select()
            .single();
        if (error) throw error;
        return data as Task;
    },

    async deleteTask(id: string): Promise<void> {
        const { error } = await supabase
            .from("ontime_task")
            .update({ deleted_at: new Date().toISOString() })
            .eq("id", id);
        if (error) throw error;
    },

    async searchTasks(query: string): Promise<Task[]> {
        const workspaceId = await getActiveWorkspaceId();

        const { data, error } = await supabase
            .from("ontime_task")
            .select(`*, project:ontime_project!inner(workspace_id)`)
            .eq("project.workspace_id", workspaceId)
            .ilike("name", `%${query}%`)
            .limit(10);
        if (error) throw error;

        return (data ?? []).map(({ project: _drop, ...rest }) => rest as Task);
    },

    async getTaskByName(name: string, projectId: string): Promise<Task | null> {
        const { data, error } = await supabase
            .from("ontime_task")
            .select("*")
            .eq("name", name)
            .eq("project_id", projectId)
            .maybeSingle();
        if (error) throw error;
        return data as Task | null;
    },

    async togglePin(id: string, pinned: boolean): Promise<Task> {
        const { data, error } = await supabase
            .from("ontime_task")
            .update({ pinned })
            .eq("id", id)
            .select()
            .single();
        if (error) throw error;
        return data as Task;
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
};

type TaskRow = Task & { calendar_entries?: Pick<CalendarEntry, "start_time" | "end_time">[] };

function rowToTask(row: TaskRow): Task {
    const entries = row.calendar_entries ?? [];
    const totalMinutes = entries.reduce((sum, entry) => {
        if (!entry.start_time || !entry.end_time) return sum;
        const ms = new Date(entry.end_time).getTime() - new Date(entry.start_time).getTime();
        return sum + ms / 1000 / 60;
    }, 0);

    const { calendar_entries: _drop, project: _proj, ...rest } = row as TaskRow & { project?: unknown };
    return { ...rest, total_time: Math.round(totalMinutes) };
}
