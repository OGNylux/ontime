import { supabase } from "../lib/supabase";

export type InviteRole = "admin" | "member";

export interface WorkspaceInvite {
    id: string;
    workspace_id: string;
    email: string;
    role: InviteRole;
    token: string;
    invited_by: string;
    accepted_at: string | null;
    expires_at: string;
    created_at: string;
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
        return data as string;
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
            .order("created_at", { ascending: false });
        if (error) throw error;
        return data as WorkspaceInvite[];
    },

    async revoke(id: string): Promise<void> {
        const { error } = await supabase
            .from("ontime_workspace_invite")
            .delete()
            .eq("id", id);
        if (error) throw error;
    },
};
