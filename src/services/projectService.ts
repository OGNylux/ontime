import { supabase } from "../lib/supabase";
import { CalendarEntry } from "./calendarService";
import { Client } from "./clientService";

export interface Project {
    id?: string;
    client_id: string;
    name: string;
    description?: string;
    color?: number;
    hourly_rate?: number;
    client?: Client;
    pinned?: boolean;
    start_date?: string;
    total_time?: number;
    created_at?: string;
}

export const TAILWIND_COLORS = [
    { name: 'Gray', value: '#6b7280', secondary: '#d1d5db' },
    { name: 'Red', value: '#ef4444', secondary: '#fca5a5'},
    { name: 'Orange', value: '#f97316', secondary: '#fdbA74' },
    { name: 'Amber', value: '#f59e0b', secondary: '#fde68a' },
    { name: 'Yellow', value: '#eab308', secondary: '#fef3c7' },
    { name: 'Lime', value: '#84cc16', secondary: '#d9f99d' },
    { name: 'Green', value: '#22c55e', secondary: '#bbf7d0' },
    { name: 'Emerald', value: '#10b981', secondary: '#99f6e4' },
    { name: 'Teal', value: '#14b8a6', secondary: '#99fff6' },
    { name: 'Cyan', value: '#06b6d4', secondary: '#cffafe' },
    { name: 'Sky', value: '#0ea5e9', secondary: '#bae6fd' },
    { name: 'Blue', value: '#3b82f6', secondary: '#bfdbfe' },
    { name: 'Indigo', value: '#6366f1', secondary: '#c7d2fe' },
    { name: 'Violet', value: '#8b5cf6', secondary: '#e9d5ff' },
    { name: 'Purple', value: '#a855f7', secondary: '#ede9fe' },
    { name: 'Fuchsia', value: '#d946ef', secondary: '#f5d0fe' },
    { name: 'Pink', value: '#ec4899', secondary: '#fbcfe8' },
    { name: 'Rose', value: '#f43f5e', secondary: '#fecdd3' },
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

    async getProject(id: string): Promise<Project> {
        const { data, error } = await supabase
            .from('ontime_project')
            .select(`
                *,
                client:ontime_client(*)
            `)
            .eq('id', id)
            .single();

        if (error) throw error;
        return data as Project;
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
                hourly_rate: request.hourly_rate,
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
