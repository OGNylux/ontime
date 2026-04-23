import { supabase } from "../lib/supabase";
import { getActiveWorkspaceId, requireUserId } from "./workspaceContext";
import { Project } from "./projectService";

export interface ClientInfo {
    id?: string;
    street?: string | null;
    house_number?: string | null;
    postal_code?: string | null;
    city?: string | null;
    state?: string | null;
    country?: string | null;
}

export interface Client {
    id?: string;
    workspace_id?: string;
    name: string;
    info_id?: string | null;
    info?: ClientInfo | null;
    pinned?: boolean;
    projects?: Project[];
    created_by?: string;
    created_at?: string;
}

const CLIENT_SELECT = `
    *,
    info:ontime_client_info(*),
    projects:ontime_project(*)
`;

const CLIENT_LIGHT_SELECT = `
    *,
    info:ontime_client_info(*)
`;

export const clientService = {
    async getClients(): Promise<Client[]> {
        return this.getClientsWithProjects();
    },

    async getClientsWithProjects(): Promise<Client[]> {
        const workspaceId = await getActiveWorkspaceId();

        const { data, error } = await supabase
            .from("ontime_client")
            .select(CLIENT_SELECT)
            .eq("workspace_id", workspaceId)
            .order("pinned", { ascending: false })
            .order("created_at", { ascending: false });
        if (error) throw error;

        return data as Client[];
    },

    async getClientsLight(): Promise<Client[]> {
        const workspaceId = await getActiveWorkspaceId();

        const { data, error } = await supabase
            .from("ontime_client")
            .select(CLIENT_LIGHT_SELECT)
            .eq("workspace_id", workspaceId)
            .order("pinned", { ascending: false })
            .order("created_at", { ascending: false });
        if (error) throw error;

        return data as Client[];
    },

    async getClient(id: string): Promise<Client> {
        const { data, error } = await supabase
            .from("ontime_client")
            .select(CLIENT_SELECT)
            .eq("id", id)
            .single();
        if (error) throw error;
        return data as Client;
    },

    async createClient(request: Client): Promise<Client> {
        const userId = await requireUserId();
        const workspaceId = await getActiveWorkspaceId();

        let infoId = request.info_id ?? null;

        if (request.info && hasInfoFields(request.info)) {
            const { id: _omit, ...infoData } = request.info;
            const { data: info, error: infoError } = await supabase
                .from("ontime_client_info")
                .insert({ ...infoData, created_by: userId })
                .select()
                .single();
            if (infoError) throw infoError;
            infoId = info.id;
        }

        const { data, error } = await supabase
            .from("ontime_client")
            .insert({
                workspace_id: workspaceId,
                name: request.name,
                info_id: infoId,
                pinned: request.pinned ?? false,
                created_by: userId,
            })
            .select(CLIENT_SELECT)
            .single();
        if (error) throw error;

        return data as Client;
    },

    async updateClient(request: Client): Promise<Client> {
        if (!request.id) throw new Error("Client id is required");
        const userId = await requireUserId();

        let infoId = request.info_id ?? null;

        if (request.info && hasInfoFields(request.info)) {
            const { id: _omit, ...infoData } = request.info;

            if (infoId) {
                const { error: infoError } = await supabase
                    .from("ontime_client_info")
                    .update(infoData)
                    .eq("id", infoId);
                if (infoError) throw infoError;
            } else {
                const { data: info, error: infoError } = await supabase
                    .from("ontime_client_info")
                    .insert({ ...infoData, created_by: userId })
                    .select()
                    .single();
                if (infoError) throw infoError;
                infoId = info.id;
            }
        }

        const { data, error } = await supabase
            .from("ontime_client")
            .update({
                name: request.name,
                info_id: infoId,
                pinned: request.pinned,
            })
            .eq("id", request.id)
            .select(CLIENT_SELECT)
            .single();
        if (error) throw error;

        return data as Client;
    },

    async deleteClient(id: string): Promise<void> {
        const { error } = await supabase
            .from("ontime_client")
            .update({ deleted_at: new Date().toISOString() })
            .eq("id", id);
        if (error) throw error;
    },

    async togglePin(id: string, pinned: boolean): Promise<Client> {
        const { data, error } = await supabase
            .from("ontime_client")
            .update({ pinned })
            .eq("id", id)
            .select(CLIENT_SELECT)
            .single();
        if (error) throw error;
        return data as Client;
    },

    async bulkSetPinned(ids: string[], pinned: boolean): Promise<void> {
        if (ids.length === 0) return;
        const { error } = await supabase
            .from("ontime_client")
            .update({ pinned })
            .in("id", ids);
        if (error) throw error;
    },

    async bulkDeleteClients(ids: string[]): Promise<void> {
        if (ids.length === 0) return;
        const { error } = await supabase
            .from("ontime_client")
            .update({ deleted_at: new Date().toISOString() })
            .in("id", ids);
        if (error) throw error;
    },
};

function hasInfoFields(info: ClientInfo): boolean {
    return Boolean(
        info.street || info.house_number || info.postal_code ||
        info.city || info.state || info.country,
    );
}
