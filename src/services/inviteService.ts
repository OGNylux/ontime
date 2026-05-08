import { supabase } from "../lib/supabase";
import type { Tables } from "../lib/database.types";

type InviteRow = Tables<'ontime_workspace_invite'>;

export type InviteRole = "admin" | "member";

export interface WorkspaceInvite extends Omit<InviteRow, 'role'> {
    role: InviteRole;
}

export interface CreateInviteRequest {
    workspaceId: string;
    email: string;
    role?: InviteRole;
    ttlHours?: number;
}

export const inviteService = {
    async create(request: CreateInviteRequest): Promise<string> {
        const { data, error } = await supabase.rpc("create_workspace_invite", {
            p_workspace_id: request.workspaceId,
            p_email: request.email,
            p_role: request.role ?? "member",
            p_ttl_hours: request.ttlHours ?? 72,
        });
        if (error) throw error;
        return data;
    },

    async accept(token: string): Promise<void> {
        const { error } = await supabase.rpc("accept_workspace_invite", { p_token: token });
        if (error) throw error;
    },

    async listForWorkspace(workspaceId: string): Promise<WorkspaceInvite[]> {
        const { data, error } = await supabase
            .from("ontime_workspace_invite")
            .select("*")
            .eq("workspace_id", workspaceId)
            .order("created_at", { ascending: false })
            .returns<WorkspaceInvite[]>();
        if (error) throw error;
        return data ?? [];
    },

    async revoke(id: string): Promise<void> {
        const { error } = await supabase
            .from("ontime_workspace_invite")
            .delete()
            .eq("id", id);
        if (error) throw error;
    },
};
