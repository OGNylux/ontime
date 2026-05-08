import { supabase } from "../lib/supabase";
import { getActiveWorkspaceId } from "./workspaceContext";
import type { Database } from "../lib/database.types";

type Views = Database['public']['Views'];
type Functions = Database['public']['Functions'];

export type HoursPerProject = Views['v_hours_per_project']['Row'];
export type HoursPerTask = Views['v_hours_per_task']['Row'];
export type HoursPerClient = Views['v_hours_per_client']['Row'];
export type HoursPerDay = Views['v_hours_per_day']['Row'];
export type HoursPerUser = Views['v_hours_per_user']['Row'];
export type BillableSummary = Views['v_billable_summary']['Row'];

export type OverviewAggregateRow = Functions['get_overview_aggregates']['Returns'][number];

export const analyticsService = {
    async hoursPerProject(): Promise<HoursPerProject[]> {
        const workspaceId = await getActiveWorkspaceId();
        const { data, error } = await supabase
            .from("v_hours_per_project")
            .select("*")
            .eq("workspace_id", workspaceId);
        if (error) throw error;
        return data ?? [];
    },

    async hoursPerTask(): Promise<HoursPerTask[]> {
        const workspaceId = await getActiveWorkspaceId();
        const { data, error } = await supabase
            .from("v_hours_per_task")
            .select("*")
            .eq("workspace_id", workspaceId);
        if (error) throw error;
        return data ?? [];
    },

    async hoursPerClient(): Promise<HoursPerClient[]> {
        const workspaceId = await getActiveWorkspaceId();
        const { data, error } = await supabase
            .from("v_hours_per_client")
            .select("*")
            .eq("workspace_id", workspaceId);
        if (error) throw error;
        return data ?? [];
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
        return data ?? [];
    },

    async hoursPerUser(): Promise<HoursPerUser[]> {
        const workspaceId = await getActiveWorkspaceId();
        const { data, error } = await supabase
            .from("v_hours_per_user")
            .select("*")
            .eq("workspace_id", workspaceId);
        if (error) throw error;
        return data ?? [];
    },

    async billableSummary(): Promise<BillableSummary[]> {
        const workspaceId = await getActiveWorkspaceId();
        const { data, error } = await supabase
            .from("v_billable_summary")
            .select("*")
            .eq("workspace_id", workspaceId);
        if (error) throw error;
        return data ?? [];
    },

    async overviewAggregates(startIso: string, endIso: string): Promise<OverviewAggregateRow[]> {
        const workspaceId = await getActiveWorkspaceId();
        const { data, error } = await supabase.rpc("get_overview_aggregates", {
            p_workspace_id: workspaceId,
            p_start: startIso,
            p_end: endIso,
            p_client_ids: undefined,
            p_project_ids: undefined,
        });
        if (error) throw error;

        return (data ?? []).map((row) => ({
            ...row,
            total_minutes: Number(row.total_minutes ?? 0),
            billable_minutes: Number(row.billable_minutes ?? 0),
            revenue: Number(row.revenue ?? 0),
        }));
    },
};
