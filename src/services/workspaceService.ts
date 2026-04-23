import { supabase } from "../lib/supabase";
import { requireUserId, setActiveWorkspaceIdCache } from "./workspaceContext";

export type WorkspaceRole = "owner" | "admin" | "member";

export interface Workspace {
    id: string;
    name: string;
    created_by: string;
    created_at: string;
}

export interface WorkspaceMember {
    user_id: string;
    workspace_id: string;
    role: WorkspaceRole;
    created_at: string;
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

        return data as Workspace;
    },

    async rename(id: string, name: string): Promise<Workspace> {
        const { data, error } = await supabase
            .from("ontime_workspace")
            .update({ name })
            .eq("id", id)
            .select()
            .single();
        if (error) throw error;
        return data as Workspace;
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
            .order("created_at", { ascending: true });
        if (error) throw error;
        return data as WorkspaceMember[];
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
};
