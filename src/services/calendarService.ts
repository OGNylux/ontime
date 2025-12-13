import { supabase } from "../lib/supabase";
import dayjs from "dayjs";
import { Task } from "./taskService";

export interface CalendarEntry {
    id: string;
    user_id?: string;
    project_id?: string;
    task_id?: string;
    start_time: string;
    end_time: string;
    is_billable?: boolean;
    created_at?: string;
    task?: Task;
}

export const calendarService = {
    async getEntries(startDate: string, endDate: string): Promise<CalendarEntry[]> {
        // Convert YYYY-MM-DD to ISO timestamps for querying
        const start = dayjs(startDate).startOf('day').toISOString();
        const end = dayjs(endDate).endOf('day').toISOString();

        const { data, error } = await supabase
            .from('ontime_calendar_entry')
            .select(`
                *,
                task:ontime_task(*)
            `)
            .gte('start_time', start)
            .lte('start_time', end);
            
        if (error) throw error;

        return data as CalendarEntry[];
    },

    async createEntry(request: Omit<CalendarEntry, 'id' | 'created_at' | 'user_id' | 'task'>): Promise<CalendarEntry> {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("User not authenticated");

        const { data, error } = await supabase
            .from('ontime_calendar_entry')
            .insert({ 
                user_id: user.id,
                task_id: request.task_id,
                project_id: request.project_id,
                is_billable: request.is_billable,
                start_time: request.start_time,
                end_time: request.end_time,
            })
            .select(`
                *,
                task:ontime_task(*)
            `)
            .single();

        if (error) throw error;

        return data as CalendarEntry;
    },

    async updateEntry(id: string, request: Partial<CalendarEntry>): Promise<CalendarEntry> {
        const updateData: any = {};
        
        if (request.task_id !== undefined) updateData.task_id = request.task_id;
        if (request.project_id !== undefined) updateData.project_id = request.project_id;
        if (request.is_billable !== undefined) updateData.is_billable = request.is_billable;
        if (request.start_time !== undefined) updateData.start_time = request.start_time;
        if (request.end_time !== undefined) updateData.end_time = request.end_time;

        const { data, error } = await supabase
            .from('ontime_calendar_entry')
            .update(updateData)
            .eq('id', id)
            .select(`
                *,
                task:ontime_task(*)
            `)
            .single();

        if (error) throw error;
        if (!data) throw new Error("Entry not found after update");

        return data as CalendarEntry;
    },

    async deleteEntry(id: string): Promise<void> {
        const { error } = await supabase
            .from('ontime_calendar_entry')
            .delete()
            .eq('id', id);

        if (error) throw error;
    },

    async getEntryById(id: string): Promise<CalendarEntry> {
        const { data, error } = await supabase
            .from('ontime_calendar_entry')
            .select(`
                *,
                task:ontime_task(*)
            `)
            .eq('id', id)
            .single();

        if (error) throw error;

        return data as CalendarEntry;
    }
};
