import { supabase } from "../lib/supabase";
import { ProjectResponseDTO } from "../dtos/response/Project.response.dto";
import { ProjectCreateRequestDTO } from "../dtos/request/ProjectCreate.request.dto";
import { ProjectUpdateRequestDTO } from "../dtos/request/ProjectUpdate.request.dto";

export const projectService = {
    async getProjects(): Promise<ProjectResponseDTO[]> {
        const { data, error } = await supabase
            .from('ontime_project')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;

        return data as ProjectResponseDTO[];
    },

    async createProject(request: ProjectCreateRequestDTO): Promise<ProjectResponseDTO> {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("User not authenticated");

        const { data, error } = await supabase
            .from('ontime_project')
            .insert({
                ...request,
                created_by: user.id
            })
            .select()
            .single();

        if (error) throw error;

        return data as ProjectResponseDTO;
    },

    async updateProject(request: ProjectUpdateRequestDTO): Promise<ProjectResponseDTO> {
        const { id, ...updates } = request;
        const { data, error } = await supabase
            .from('ontime_project')
            .update(updates)
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;

        return data as ProjectResponseDTO;
    },

    async deleteProject(id: string): Promise<void> {
        const { error } = await supabase
            .from('ontime_project')
            .delete()
            .eq('id', id);

        if (error) throw error;
    }
};
