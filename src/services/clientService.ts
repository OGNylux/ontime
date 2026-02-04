import { supabase } from "../lib/supabase";
import { Project } from "./projectService";

export interface ClientInfo {
    id?: string;
    address?: string;
    postal_code?: string;
    city?: string;
    state?: string;
    country?: string;
}

export interface Client {
    id?: string;
    name: string;
    info_id?: string;
    info?: ClientInfo;
    projects?: Project[];
    pinned?: boolean;
}

export const clientService = {
    async getClients(): Promise<Client[]> {
        const { data, error } = await supabase
            .from('ontime_client')
            .select(`
                *,
                info:ontime_client_info(*),
                projects:ontime_project(*)
            `)
            .order('created_at', { ascending: false });

        if (error) throw error;

        return data as Client[];
    },

    async createClient(request: Client): Promise<Client> {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("User not authenticated");

        let infoId = request.info_id;

        if (request.info) {
            const { ...infoData } = request.info;
            const { data: newInfo, error: infoError } = await supabase
                .from('ontime_client_info')
                .insert({ ...infoData, created_by: user.id })
                .select()
                .single();
            
            if (infoError) throw infoError;
            infoId = newInfo.id;
        }

        const { data, error } = await supabase
            .from('ontime_client')
            .insert({
                name: request.name,
                info_id: infoId,
                created_by: user.id
            })
            .select(`
                *,
                info:ontime_client_info(*)
            `)
            .single();
        if (error) throw error;

        return data;
    },

    async updateClient(request: Client): Promise<Client> {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("User not authenticated");

        let infoId = request.info_id;

                if (request.info) {
            const { id, ...infoData } = request.info;
            
            if (request.info_id) {
                                const { error: infoError } = await supabase
                    .from('ontime_client_info')
                    .update(infoData)
                    .eq('id', request.info_id);
                if (infoError) throw infoError;
            } else {
                                const { data: newInfo, error: infoError } = await supabase
                    .from('ontime_client_info')
                    .insert({ ...infoData, created_by: user.id })
                    .select()
                    .single();
                
                if (infoError) throw infoError;
                infoId = newInfo.id;
            }
        }

        const { data, error } = await supabase
            .from('ontime_client')
            .update({
                name: request.name,
                info_id: infoId,
            })
            .eq('id', request.id)
            .select(`
                *,
                info:ontime_client_info(*)
            `)
            .single();
        if (error) throw error;

        return data;
    },

    async deleteClient(id: string): Promise<void> {
        const { error } = await supabase
            .from('ontime_client')
            .delete()
            .eq('id', id);
        if (error) throw error;
    },

    async togglePin(id: string, pinned: boolean): Promise<Client> {
        const { data, error } = await supabase
            .from('ontime_client')
            .update({ pinned })
            .eq('id', id)
            .select(`
                *,
                info:ontime_client_info(*),
                projects:ontime_project(*)
            `)
            .single();

        if (error) throw error;
        return data as Client;
    }
};
