import { supabase } from "../lib/supabase";

interface Client {
    id: string;
    name: string;
    info_id?: string;
}

export const clientService = {
    async getClients(): Promise<Client[]> {
        const { data, error } = await supabase
            .from('ontime_client')
            .select(`
                *,
                info:ontime_client_info(*)
            `)
            .order('created_at', { ascending: false });

        if (error) throw error;

        return data as Client[];
    },

    async createClient(request: Client): Promise<Client> {
        const { data, error } = await supabase
            .from('ontime_client')
            .insert(request)
            .select(`
                *,
                info:ontime_client_info(*)
            `)
            .single();
        if (error) throw error;

        return data;
    },

    async updateClient(request: Client): Promise<Client> {
        const { data, error } = await supabase
            .from('ontime_client')
            .update({
                name: request.name,
            })
            .eq('id', request.info_id)
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
    }
};
