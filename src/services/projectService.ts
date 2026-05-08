import { supabase } from "../lib/supabase";
import { getActiveWorkspaceId, requireUserId } from "./workspaceContext";
import { Client } from "./clientService";
import { CalendarEntry } from "./calendarService";
import type { Tables } from "../lib/database.types";

type ProjectRow = Tables<'ontime_project'>;

export interface Project extends Omit<ProjectRow, 'id' | 'workspace_id' | 'created_by' | 'created_at' | 'pinned' | 'color' | 'description' | 'deleted_at'> {
    id?: string;
    workspace_id?: string;
    created_by?: string;
    created_at?: string;
    pinned?: boolean;
    color?: number | null;
    description?: string | null;
    client?: Client | null;
    total_time?: number;
}

export const TAILWIND_COLORS = [
    { name: "Gray", value: "#6b7280", secondary: "#d1d5db" },
    { name: "Red", value: "#ef4444", secondary: "#fca5a5" },
    { name: "Orange", value: "#f97316", secondary: "#fdba74" },
    { name: "Amber", value: "#f59e0b", secondary: "#fde68a" },
    { name: "Yellow", value: "#eab308", secondary: "#fef3c7" },
    { name: "Lime", value: "#84cc16", secondary: "#d9f99d" },
    { name: "Green", value: "#22c55e", secondary: "#bbf7d0" },
    { name: "Emerald", value: "#10b981", secondary: "#99f6e4" },
    { name: "Teal", value: "#14b8a6", secondary: "#99fff6" },
    { name: "Cyan", value: "#06b6d4", secondary: "#cffafe" },
    { name: "Sky", value: "#0ea5e9", secondary: "#bae6fd" },
    { name: "Blue", value: "#3b82f6", secondary: "#bfdbfe" },
    { name: "Indigo", value: "#6366f1", secondary: "#c7d2fe" },
    { name: "Violet", value: "#8b5cf6", secondary: "#e9d5ff" },
    { name: "Purple", value: "#a855f7", secondary: "#ede9fe" },
    { name: "Fuchsia", value: "#d946ef", secondary: "#f5d0fe" },
    { name: "Pink", value: "#ec4899", secondary: "#fbcfe8" },
    { name: "Rose", value: "#f43f5e", secondary: "#fecdd3" },
];

const PROJECT_SELECT = `
    *,
    client:ontime_client(*)
`;

const PROJECT_WITH_ENTRIES_SELECT = `
    *,
    client:ontime_client(*),
    calendar_entries:ontime_calendar_entry(start_time, end_time)
`;

const PROJECT_LIGHT_SELECT = `*`;

export const projectService = {
    async getProjects(): Promise<Project[]> {
        return this.getProjectsWithTotals();
    },

    async getProjectsWithTotals(): Promise<Project[]> {
        const workspaceId = await getActiveWorkspaceId();

        const { data, error } = await supabase
            .from("ontime_project")
            .select(PROJECT_WITH_ENTRIES_SELECT)
            .eq("workspace_id", workspaceId)
            .is("deleted_at", null)
            .order("pinned", { ascending: false })
            .order("created_at", { ascending: false })
            .returns<ProjectWithEntries[]>();
        if (error) throw error;

        return (data ?? []).map(rowToProject);
    },

    async getProjectsLight(): Promise<Project[]> {
        const workspaceId = await getActiveWorkspaceId();

        const { data, error } = await supabase
            .from("ontime_project")
            .select(PROJECT_LIGHT_SELECT)
            .eq("workspace_id", workspaceId)
            .is("deleted_at", null)
            .order("pinned", { ascending: false })
            .order("created_at", { ascending: false });
        if (error) throw error;

        return data ?? [];
    },

    async getProject(id: string): Promise<Project> {
        const { data, error } = await supabase
            .from("ontime_project")
            .select(PROJECT_SELECT)
            .eq("id", id)
            .is("deleted_at", null)
            .returns<Project>()
            .single();
        if (error) throw error;
        return data;
    },

    async createProject(request: Project): Promise<Project> {
        const userId = await requireUserId();
        const workspaceId = await getActiveWorkspaceId();

        const { data, error } = await supabase
            .from("ontime_project")
            .insert({
                workspace_id: workspaceId,
                client_id: request.client_id ?? null,
                name: request.name,
                description: request.description ?? null,
                color: request.color ?? null,
                hourly_rate: request.hourly_rate ?? null,
                start_date: request.start_date ?? null,
                pinned: request.pinned ?? false,
                created_by: userId,
            })
            .select(PROJECT_SELECT)
            .returns<Project>()
            .single();
        if (error) throw error;

        return data;
    },

    async updateProject(id: string, request: Project): Promise<Project> {
        const { data, error } = await supabase
            .from("ontime_project")
            .update({
                client_id: request.client_id ?? null,
                name: request.name,
                description: request.description ?? null,
                color: request.color ?? null,
                hourly_rate: request.hourly_rate ?? null,
                start_date: request.start_date ?? null,
                pinned: request.pinned,
            })
            .eq("id", id)
            .select(PROJECT_SELECT)
            .returns<Project>()
            .single();
        if (error) throw error;
        return data;
    },

    async togglePin(id: string, pinned: boolean): Promise<Project> {
        const { data, error } = await supabase
            .from("ontime_project")
            .update({ pinned })
            .eq("id", id)
            .select(PROJECT_SELECT)
            .returns<Project>()
            .single();
        if (error) throw error;
        return data;
    },

    async deleteProject(id: string): Promise<void> {
        const { error } = await supabase
            .from("ontime_project")
            .update({ deleted_at: new Date().toISOString() })
            .eq("id", id);
        if (error) throw error;
    },

    async restoreProject(id: string): Promise<Project> {
        const { data, error } = await supabase
            .from("ontime_project")
            .update({ deleted_at: null })
            .eq("id", id)
            .select(PROJECT_SELECT)
            .returns<Project>()
            .single();
        if (error) throw error;
        return data;
    },

    async bulkSetPinned(ids: string[], pinned: boolean): Promise<void> {
        if (ids.length === 0) return;
        const { error } = await supabase
            .from("ontime_project")
            .update({ pinned })
            .in("id", ids);
        if (error) throw error;
    },

    async bulkDeleteProjects(ids: string[]): Promise<void> {
        if (ids.length === 0) return;
        const { error } = await supabase
            .from("ontime_project")
            .update({ deleted_at: new Date().toISOString() })
            .in("id", ids);
        if (error) throw error;
    },

    async bulkRestoreProjects(ids: string[]): Promise<void> {
        if (ids.length === 0) return;
        const { error } = await supabase
            .from("ontime_project")
            .update({ deleted_at: null })
            .in("id", ids);
        if (error) throw error;
    },
};

type ProjectWithEntries = Project & { calendar_entries?: Pick<CalendarEntry, "start_time" | "end_time">[] };

function rowToProject(row: ProjectWithEntries): Project {
    const entries = row.calendar_entries ?? [];
    const totalMinutes = entries.reduce((sum, entry) => {
        if (!entry.start_time || !entry.end_time) return sum;
        const ms = new Date(entry.end_time).getTime() - new Date(entry.start_time).getTime();
        return sum + ms / 1000 / 60;
    }, 0);

    const { calendar_entries: _drop, ...rest } = row;
    return { ...rest, total_time: Math.round(totalMinutes) };
}
