import { supabase } from "../lib/supabase";
import { TaskResponseDTO } from "../dtos/response/Task.response.dto";
import { TaskCreateRequestDTO } from "../dtos/request/TaskCreate.request.dto";
import { TaskUpdateRequestDTO } from "../dtos/request/TaskUpdate.request.dto";

export const taskService = {
    async getTasks(): Promise<TaskResponseDTO[]> {
        const { data, error } = await supabase
            .from('ontime_task')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;

        return data as TaskResponseDTO[];
    },

    async createTask(request: TaskCreateRequestDTO): Promise<TaskResponseDTO> {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("User not authenticated");

        const { data, error } = await supabase
            .from('ontime_task')
            .insert({
                ...request,
                created_by: user.id
            })
            .select()
            .single();

        if (error) throw error;

        return data as TaskResponseDTO;
    },

    async updateTask(request: TaskUpdateRequestDTO): Promise<TaskResponseDTO> {
        const { id, ...updates } = request;
        const { data, error } = await supabase
            .from('ontime_task')
            .update(updates)
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;

        return data as TaskResponseDTO;
    },

    async deleteTask(id: string): Promise<void> {
        const { error } = await supabase
            .from('ontime_task')
            .delete()
            .eq('id', id);

        if (error) throw error;
    }
};
