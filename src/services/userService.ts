import { supabase } from "../lib/supabase";
import { requireUserId, setActiveWorkspaceIdCache } from "./workspaceContext";
import type { Tables } from "../lib/database.types";

type UserRow = Tables<'ontime_user'>;

export interface OntimeUser extends Omit<UserRow, 'active_workspace_id' | 'created_at'> {
    active_workspace_id?: string | null;
    created_at?: string;
    email?: string;
}

export interface ProfileUpdate {
    name?: string;
    email?: string;
    timezone?: string | null;
}

export const userService = {
    async getCurrentUser(): Promise<OntimeUser | null> {
        const { data: { session } } = await supabase.auth.getSession();
        const user = session?.user;
        if (!user) return null;

        const { data, error } = await supabase
            .from("ontime_user")
            .select("*")
            .eq("id", user.id)
            .single();
        if (error) throw error;

        // Prime the workspace cache so subsequent getActiveWorkspaceId() calls are free.
        if (data?.active_workspace_id) setActiveWorkspaceIdCache(data.active_workspace_id);

        return { ...data, email: user.email ?? undefined };
    },

    async getCurrentUserName(): Promise<string | null> {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return null;

        const { data, error } = await supabase
            .from("ontime_user")
            .select("name")
            .eq("id", user.id)
            .maybeSingle();
        if (error) throw error;
        return data?.name ?? null;
    },

    async updateProfile(updates: ProfileUpdate): Promise<OntimeUser> {
        const userId = await requireUserId();
        const { data: { user } } = await supabase.auth.getUser();

        if (updates.email && updates.email !== user?.email) {
            const { error } = await supabase.auth.updateUser({ email: updates.email });
            if (error) throw error;
        }

        const payload: Record<string, unknown> = {};
        if (updates.name !== undefined) payload.name = updates.name;
        if (updates.timezone !== undefined) payload.timezone = updates.timezone;

        if (Object.keys(payload).length === 0) {
            const current = await this.getCurrentUser();
            if (!current) throw new Error("Not authenticated");
            return current;
        }

        const { data, error } = await supabase
            .from("ontime_user")
            .update(payload)
            .eq("id", userId)
            .select("*")
            .single();
        if (error) throw error;

        return { ...data, email: updates.email ?? user?.email };
    },

    async updatePassword(currentPassword: string, newPassword: string): Promise<void> {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user?.email) throw new Error("Not authenticated");

        const { error: signInError } = await supabase.auth.signInWithPassword({
            email: user.email,
            password: currentPassword,
        });
        if (signInError) throw new Error("Current password is incorrect");

        const { error } = await supabase.auth.updateUser({ password: newPassword });
        if (error) throw error;
    },

    async setActiveWorkspace(workspaceId: string): Promise<void> {
        const { error } = await supabase.rpc("set_active_workspace", {
            p_workspace_id: workspaceId,
        });
        if (error) throw error;
        setActiveWorkspaceIdCache(workspaceId);
    },
};
