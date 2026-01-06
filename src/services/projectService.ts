import { supabase } from "../lib/supabase";
import { CalendarEntry } from "./calendarService";
import { Client } from "./clientService";

export interface Project {
    id?: string;
    client_id: string;
    name: string;
    description?: string;
    color?: number;
    client?: Client;
    pinned?: boolean;
    start_date?: string;
    total_time?: number;
    created_at?: string;
}

export const TAILWIND_COLORS = [
    { name: 'Gray', value: 'bg-gray-500' },
    { name: 'Red', value: 'bg-red-500' },
    { name: 'Orange', value: 'bg-orange-500' },
    { name: 'Amber', value: 'bg-amber-500' },
    { name: 'Yellow', value: 'bg-yellow-500' },
    { name: 'Lime', value: 'bg-lime-500' },
    { name: 'Green', value: 'bg-green-500' },
    { name: 'Emerald', value: 'bg-emerald-500' },
    { name: 'Teal', value: 'bg-teal-500' },
    { name: 'Cyan', value: 'bg-cyan-500' },
    { name: 'Sky', value: 'bg-sky-500' },
    { name: 'Blue', value: 'bg-blue-500' },
    { name: 'Indigo', value: 'bg-indigo-500' },
    { name: 'Violet', value: 'bg-violet-500' },
    { name: 'Purple', value: 'bg-purple-500' },
    { name: 'Fuchsia', value: 'bg-fuchsia-500' },
    { name: 'Pink', value: 'bg-pink-500' },
    { name: 'Rose', value: 'bg-rose-500' },
];

export const projectService = {
    async getProjects(): Promise<Project[]> {
        const { data, error } = await supabase
            .from('ontime_project')
            .select(`
                *,
                client:ontime_client(*),
                calendar_entries:ontime_calendar_entry(start_time, end_time)
            `)
            .order('created_at', { ascending: false });
        if (error) throw error;

        // Calculate total time in minutes for each project from calendar entries
        const projectsWithTime = (data as any[]).map(project => {
            const entries = project.calendar_entries || [];
            const totalMinutes = entries.reduce((sum: number, entry: CalendarEntry) => {
                if (entry.start_time && entry.end_time) {
                    const start = new Date(entry.start_time).getTime();
                    const end = new Date(entry.end_time).getTime();
                    const durationMs = end - start;
                    return sum + (durationMs / 1000 / 60); // Convert ms to minutes
                }
                return sum;
            }, 0);

            // Remove calendar_entries from the returned object
            const { calendar_entries, ...projectData } = project;
            return {
                ...projectData,
                total_time: Math.round(totalMinutes)
            };
        });

        return projectsWithTime as Project[];
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
                start_date: request.start_date,
            })
            .eq('id', id)
            .select()
            .single();
        if (error) throw error;
        return data as Project;
    },

    async togglePin(id: string, pinned: boolean): Promise<Project> {
        const { data, error } = await supabase
            .from('ontime_project')
            .update({ pinned })
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
