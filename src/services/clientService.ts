import { supabase } from "../lib/supabase";
import { ClientResponseDTO } from "../dtos/response/Client.response.dto";
import { ClientCreateRequestDTO } from "../dtos/request/ClientCreate.request.dto";
import { ClientUpdateRequestDTO } from "../dtos/request/ClientUpdate.request.dto";

export const clientService = {
    async getClients(): Promise<ClientResponseDTO[]> {
        const { data, error } = await supabase
            .from('ontime_client')
            .select(`
                *,
                info:ontime_client_info(*)
            `)
            .order('created_at', { ascending: false });

        if (error) throw error;

        return data as ClientResponseDTO[];
    },

    async createClient(request: ClientCreateRequestDTO): Promise<ClientResponseDTO> {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("User not authenticated");

        let infoId = null;

        if (request.info) {
            const { data: infoData, error: infoError } = await supabase
                .from('ontime_client_info')
                .insert({
                    ...request.info,
                    created_by: user.id
                })
                .select()
                .single();
            
            if (infoError) throw infoError;
            infoId = infoData.id;
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

        return data as ClientResponseDTO;
    },

    async updateClient(request: ClientUpdateRequestDTO): Promise<ClientResponseDTO> {
        const { id, name, info } = request;

        // Fetch current client to get info_id
        const { data: currentClient, error: fetchError } = await supabase
            .from('ontime_client')
            .select('info_id')
            .eq('id', id)
            .single();
            
        if (fetchError) throw fetchError;

        let infoId = currentClient.info_id;

        if (info) {
            if (infoId) {
                // Update existing info
                const { error: infoUpdateError } = await supabase
                    .from('ontime_client_info')
                    .update(info)
                    .eq('id', infoId);
                
                if (infoUpdateError) throw infoUpdateError;
            } else {
                // Create new info
                const { data: { user } } = await supabase.auth.getUser();
                if (!user) throw new Error("User not authenticated");

                const { data: newInfo, error: infoCreateError } = await supabase
                    .from('ontime_client_info')
                    .insert({
                        ...info,
                        created_by: user.id
                    })
                    .select()
                    .single();
                
                if (infoCreateError) throw infoCreateError;
                infoId = newInfo.id;
            }
        }

        // Update Client
        const updates: any = {};
        if (name !== undefined) updates.name = name;
        if (infoId !== currentClient.info_id) updates.info_id = infoId;

        if (Object.keys(updates).length > 0) {
             const { error: updateError } = await supabase
                .from('ontime_client')
                .update(updates)
                .eq('id', id);
            
            if (updateError) throw updateError;
        }

        // Return updated client with info
        const { data, error } = await supabase
            .from('ontime_client')
            .select(`
                *,
                info:ontime_client_info(*)
            `)
            .eq('id', id)
            .single();

        if (error) throw error;

        return data as ClientResponseDTO;
    },

    async deleteClient(id: string): Promise<void> {
        const { data: client } = await supabase.from('ontime_client').select('info_id').eq('id', id).single();
        
        const { error } = await supabase
            .from('ontime_client')
            .delete()
            .eq('id', id);

        if (error) throw error;

        if (client?.info_id) {
             await supabase
                .from('ontime_client_info')
                .delete()
                .eq('id', client.info_id);
        }
    }
};
