import { supabase } from "../lib/supabase";
import { Client } from "./clientService";

export interface Project {
    id: string;
    client_id?: string;
    name: string;
    description?: string;
    color?: string;
    client: Client;
}

export const projectService = {
    async getProjects(): Promise<Project[]> {
        const { data, error } = await supabase
            .from('ontime_project')
            .select(`
                *,
                client:ontime_client(*)
            `)
            .order('created_at', { ascending: false });
        if (error) throw error;

        return data as Project[];
    },

    async createProject(request: Project): Promise<Project> {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("User not authenticated");
        
        const { data, error } = await supabase
            .from('ontime_project')
            .insert({ ...request, created_by: user.id })
            .select(`
                *,
                client:ontime_client(*)
            `)
            .single();
        if (error) throw error;

        return data as Project;
    },

    async updateProject(id: string, request: Project): Promise<Project> {
        const { data, error } = await supabase
            .from('ontime_project')
            .update({
                client_id: request.client_id,
                name: request.name,
                description: request.description,
                color: request.color,
            })
            .eq('id', id)
            .select(`
                *,
                client:ontime_client(*)
            `)
            .single();

        if (error) throw error;
        return data as Project;
    },

    async deleteProject(id: string): Promise<void> {
        const { error } = await supabase
            .from('ontime_project')
            .delete()
            .eq('id', id);

        if (error) throw error;
    }
};
