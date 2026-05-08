import { supabase } from "../lib/supabase";

let cachedWorkspaceId: string | null = null;
let inflight: Promise<string> | null = null;

export async function getActiveWorkspaceId(): Promise<string> {
    if (cachedWorkspaceId) return cachedWorkspaceId;
    if (inflight) return inflight;

    inflight = (async () => {
        const { data: { session } } = await supabase.auth.getSession();
        const user = session?.user;
        if (!user) throw new Error("Not authenticated");

        const { data, error } = await supabase
            .from("ontime_user")
            .select("active_workspace_id")
            .eq("id", user.id)
            .single();
        if (error) throw error;

        let workspaceId = data?.active_workspace_id as string | null;

        if (!workspaceId) {
            const { data: membership, error: memberError } = await supabase
                .from("ontime_workspace_member")
                .select("workspace_id")
                .eq("user_id", user.id)
                .order("created_at", { ascending: true })
                .limit(1)
                .maybeSingle();
            if (memberError) throw memberError;
            if (!membership) throw new Error("User has no workspace");

            workspaceId = membership.workspace_id as string;
            await supabase.rpc("set_active_workspace", { p_workspace_id: workspaceId });
        }

        cachedWorkspaceId = workspaceId;
        return workspaceId;
    })();

    try {
        return await inflight;
    } finally {
        inflight = null;
    }
}

export function setActiveWorkspaceIdCache(id: string | null) {
    cachedWorkspaceId = id;
}

export function clearWorkspaceCache() {
    cachedWorkspaceId = null;
    inflight = null;
}

export async function requireUserId(): Promise<string> {
    const { data: { session } } = await supabase.auth.getSession();
    const user = session?.user;
    if (!user) throw new Error("Not authenticated");
    return user.id;
}
