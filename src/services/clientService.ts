import { supabase } from "../lib/supabase";
import { getActiveWorkspaceId, requireUserId } from "./workspaceContext";
import { Project } from "./projectService";
import type { Tables } from "../lib/database.types";

type ClientRow = Tables<'ontime_client'>;
type ClientInfoRow = Tables<'ontime_client_info'>;

export interface ClientInfo extends Omit<ClientInfoRow, 'id' | 'created_by' | 'created_at'> {
    id?: string;
    created_by?: string;
    created_at?: string;
}

export interface Client extends Omit<ClientRow, 'id' | 'workspace_id' | 'created_by' | 'created_at' | 'pinned' | 'deleted_at' | 'info_id'> {
    id?: string;
    workspace_id?: string;
    created_by?: string;
    created_at?: string;
    pinned?: boolean;
    info_id?: string | null;
    info?: ClientInfo | null;
    projects?: Project[];
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
            .is("deleted_at", null)
            .order("pinned", { ascending: false })
            .order("created_at", { ascending: false })
            .returns<Client[]>();
        if (error) throw error;

        return data ?? [];
    },

    async getClientsLight(): Promise<Client[]> {
        const workspaceId = await getActiveWorkspaceId();

        const { data, error } = await supabase
            .from("ontime_client")
            .select(CLIENT_LIGHT_SELECT)
            .eq("workspace_id", workspaceId)
            .is("deleted_at", null)
            .order("pinned", { ascending: false })
            .order("created_at", { ascending: false })
            .returns<Client[]>();
        if (error) throw error;

        return data ?? [];
    },

    async getClient(id: string): Promise<Client> {
        const { data, error } = await supabase
            .from("ontime_client")
            .select(CLIENT_SELECT)
            .eq("id", id)
            .is("deleted_at", null)
            .returns<Client>()
            .single();
        if (error) throw error;
        return data;
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
            .returns<Client>()
            .single();
        if (error) throw error;

        return data;
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
            .returns<Client>()
            .single();
        if (error) throw error;

        return data;
    },

    async deleteClient(id: string): Promise<void> {
        const { error } = await supabase
            .from("ontime_client")
            .update({ deleted_at: new Date().toISOString() })
            .eq("id", id);
        if (error) throw error;
    },

    async restoreClient(id: string): Promise<Client> {
        const { data, error } = await supabase
            .from("ontime_client")
            .update({ deleted_at: null })
            .eq("id", id)
            .select(CLIENT_SELECT)
            .returns<Client>()
            .single();
        if (error) throw error;
        return data;
    },

    async togglePin(id: string, pinned: boolean): Promise<Client> {
        const { data, error } = await supabase
            .from("ontime_client")
            .update({ pinned })
            .eq("id", id)
            .select(CLIENT_SELECT)
            .returns<Client>()
            .single();
        if (error) throw error;
        return data;
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

    async bulkRestoreClients(ids: string[]): Promise<void> {
        if (ids.length === 0) return;
        const { error } = await supabase
            .from("ontime_client")
            .update({ deleted_at: null })
            .in("id", ids);
        if (error) throw error;
    },
};

function hasInfoFields(info: ClientInfo): boolean {
    return Boolean(
        info.street || info.house_number || info.postal_code ||
        info.city || info.state || info.country ||
        info.email || info.phone || info.vat_number,
    );
}
