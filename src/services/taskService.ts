import { supabase } from "../lib/supabase";
import { CalendarEntry } from "./calendarService";

export interface Task {
    id?: string;
    project_id?: string;
    name: string;
    color?: number;
    calendar_entries?: CalendarEntry[];
    pinned?: boolean;
}

export const taskService = {
    async getTasks(): Promise<Task[]> {
        const { data, error } = await supabase
            .from('ontime_task')
            .select(`
                *,
                calendar_entries:ontime_calendar_entry(*)
            `)
            .order('created_at', { ascending: false });
        if (error) throw error;

        return data as Task[];
    },

    async createTask(request: Task): Promise<Task> {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("User not authenticated");

        const { data, error } = await supabase
            .from('ontime_task')
            .insert({
                ...request,
                created_by: user.id,
            })
            .select()
            .single();
        if (error) throw error;
        return data as Task;
    },

    async updateTask(id: string, request: Task): Promise<Task> {
        const { data, error } = await supabase
            .from('ontime_task')
            .update({
                project_id: request.project_id,
                name: request.name,
                color: request.color,
            })
            .eq('id', id)
            .select()
            .single();
        if (error) throw error;
        return data as Task;
    },

    async deleteTask(id: string): Promise<void> {
        const { error } = await supabase
            .from('ontime_task')
            .delete()
            .eq('id', id);

        if (error) throw error;
    },

    async searchTasks(query: string): Promise<Task[]> {
        const { data, error } = await supabase
            .from('ontime_task')
            .select('*')
            .ilike('name', `%${query}%`)
            .limit(10);

        if (error) throw error;

        return data as Task[];
    },

    async getTaskByName(name: string, projectId?: string | null): Promise<Task | null> {
        let query = supabase
            .from('ontime_task')
            .select('*')
            .eq('name', name);
        
        if (projectId) {
            query = query.eq('project_id', projectId);
        } else {
            query = query.is('project_id', null);
        }

        const { data, error } = await query.maybeSingle();
        
        if (error) throw error;
        return data as Task | null;
    },

    async togglePin(id: string, pinned: boolean): Promise<Task> {
        const { data, error } = await supabase
            .from('ontime_task')
            .update({ pinned })
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        return data as Task;
    }
};
