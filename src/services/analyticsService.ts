import { supabase } from "../lib/supabase";
import { getActiveWorkspaceId } from "./workspaceContext";

export interface HoursPerProject {
    workspace_id: string;
    created_by: string;
    project_id: string;
    total_hours: number;
    billable_hours: number;
}

export interface HoursPerTask {
    workspace_id: string;
    created_by: string;
    project_id: string;
    task_id: string | null;
    total_hours: number;
    billable_hours: number;
}

export interface HoursPerClient {
    workspace_id: string;
    client_id: string;
    total_hours: number;
    billable_hours: number;
}

export interface HoursPerDay {
    workspace_id: string;
    created_by: string;
    day: string;
    total_hours: number;
    billable_hours: number;
}

export interface HoursPerUser {
    workspace_id: string;
    created_by: string;
    total_hours: number;
    billable_hours: number;
}

export interface BillableSummary {
    workspace_id: string;
    is_billable: boolean;
    total_hours: number;
}

export interface OverviewAggregateRow {
    day: string;
    client_id: string | null;
    project_id: string;
    project_name: string;
    project_color: number | null;
    task_id: string | null;
    task_name: string | null;
    total_minutes: number;
    billable_minutes: number;
    revenue: number;
}

export const analyticsService = {
    async hoursPerProject(): Promise<HoursPerProject[]> {
        const workspaceId = await getActiveWorkspaceId();
        const { data, error } = await supabase
            .from("v_hours_per_project")
            .select("*")
            .eq("workspace_id", workspaceId);
        if (error) throw error;
        return data as HoursPerProject[];
    },

    async hoursPerTask(): Promise<HoursPerTask[]> {
        const workspaceId = await getActiveWorkspaceId();
        const { data, error } = await supabase
            .from("v_hours_per_task")
            .select("*")
            .eq("workspace_id", workspaceId);
        if (error) throw error;
        return data as HoursPerTask[];
    },

    async hoursPerClient(): Promise<HoursPerClient[]> {
        const workspaceId = await getActiveWorkspaceId();
        const { data, error } = await supabase
            .from("v_hours_per_client")
            .select("*")
            .eq("workspace_id", workspaceId);
        if (error) throw error;
        return data as HoursPerClient[];
    },

    async hoursPerDay(start?: string, end?: string): Promise<HoursPerDay[]> {
        const workspaceId = await getActiveWorkspaceId();
        let query = supabase
            .from("v_hours_per_day")
            .select("*")
            .eq("workspace_id", workspaceId)
            .order("day", { ascending: true });
        if (start) query = query.gte("day", start);
        if (end) query = query.lte("day", end);

        const { data, error } = await query;
        if (error) throw error;
        return data as HoursPerDay[];
    },

    async hoursPerUser(): Promise<HoursPerUser[]> {
        const workspaceId = await getActiveWorkspaceId();
        const { data, error } = await supabase
            .from("v_hours_per_user")
            .select("*")
            .eq("workspace_id", workspaceId);
        if (error) throw error;
        return data as HoursPerUser[];
    },

    async billableSummary(): Promise<BillableSummary[]> {
        const workspaceId = await getActiveWorkspaceId();
        const { data, error } = await supabase
            .from("v_billable_summary")
            .select("*")
            .eq("workspace_id", workspaceId);
        if (error) throw error;
        return data as BillableSummary[];
    },

    async overviewAggregates(startIso: string, endIso: string): Promise<OverviewAggregateRow[]> {
        const workspaceId = await getActiveWorkspaceId();
        const { data, error } = await supabase.rpc("get_overview_aggregates", {
            p_workspace_id: workspaceId,
            p_start: startIso,
            p_end: endIso,
            p_client_ids: null,
            p_project_ids: null,
        });
        if (error) throw error;

        return (data ?? []).map((row: OverviewAggregateRow) => ({
            ...row,
            total_minutes: Number(row.total_minutes ?? 0),
            billable_minutes: Number(row.billable_minutes ?? 0),
            revenue: Number(row.revenue ?? 0),
        }));
    },
};
