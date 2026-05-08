import { supabase } from "../lib/supabase";
import { requireUserId, setActiveWorkspaceIdCache } from "./workspaceContext";
import type { Tables } from "../lib/database.types";

type WorkspaceRow = Tables<'ontime_workspace'>;
type WorkspaceBillingRow = Tables<'ontime_workspace_billing'>;
type WorkspaceMemberRow = Tables<'ontime_workspace_member'>;

export type WorkspaceBilling = Partial<WorkspaceBillingRow>;

export type WorkspaceRole = "owner" | "admin" | "member";

export type Workspace = WorkspaceRow;

export interface WorkspaceMember extends Omit<WorkspaceMemberRow, 'role'> {
    role: WorkspaceRole;
    user?: {
        id: string;
        name: string;
    };
}

export const workspaceService = {
    async listMine(): Promise<Workspace[]> {
        const userId = await requireUserId();

        const { data, error } = await supabase
            .from("ontime_workspace_member")
            .select("workspace:ontime_workspace(*)")
            .eq("user_id", userId)
            .order("created_at", { ascending: true });
        if (error) throw error;

        return (data ?? [])
            .map(row => (row as unknown as { workspace: Workspace }).workspace)
            .filter(Boolean);
    },

    async create(name: string): Promise<Workspace> {
        const userId = await requireUserId();

        const { data, error } = await supabase
            .from("ontime_workspace")
            .insert({ name, created_by: userId })
            .select()
            .single();
        if (error) throw error;

        return data;
    },

    async rename(id: string, name: string): Promise<Workspace> {
        const { data, error } = await supabase
            .from("ontime_workspace")
            .update({ name })
            .eq("id", id)
            .select()
            .single();
        if (error) throw error;
        return data;
    },

    async setActive(workspaceId: string): Promise<void> {
        const { error } = await supabase.rpc("set_active_workspace", {
            p_workspace_id: workspaceId,
        });
        if (error) throw error;
        setActiveWorkspaceIdCache(workspaceId);
    },

    async listMembers(workspaceId: string): Promise<WorkspaceMember[]> {
        const { data, error } = await supabase
            .from("ontime_workspace_member")
            .select("*, user:ontime_user(id, name)")
            .eq("workspace_id", workspaceId)
            .order("created_at", { ascending: true })
            .returns<WorkspaceMember[]>();
        if (error) throw error;
        return data ?? [];
    },

    async updateMemberRole(
        workspaceId: string,
        userId: string,
        role: WorkspaceRole,
    ): Promise<void> {
        const { error } = await supabase
            .from("ontime_workspace_member")
            .update({ role })
            .eq("workspace_id", workspaceId)
            .eq("user_id", userId);
        if (error) throw error;
    },

    async removeMember(workspaceId: string, userId: string): Promise<void> {
        const { error } = await supabase
            .from("ontime_workspace_member")
            .delete()
            .eq("workspace_id", workspaceId)
            .eq("user_id", userId);
        if (error) throw error;
    },

    async getBilling(workspaceId: string): Promise<WorkspaceBilling | null> {
        const { data, error } = await supabase
            .from("ontime_workspace_billing")
            .select("*")
            .eq("workspace_id", workspaceId)
            .returns<WorkspaceBilling>()
            .maybeSingle();
        if (error) throw error;
        return data;
    },

    async saveBilling(workspaceId: string, billing: Partial<WorkspaceBilling>): Promise<WorkspaceBilling> {
        const payload = { ...billing, workspace_id: workspaceId };
        delete payload.id;

        const { data, error } = await supabase
            .from("ontime_workspace_billing")
            .upsert(payload, { onConflict: "workspace_id" })
            .select("*")
            .returns<WorkspaceBilling>()
            .single();
        if (error) throw error;
        return data;
    },
};
