import { supabase } from "../lib/supabase";
import dayjs from "dayjs";
import isSameOrBefore from 'dayjs/plugin/isSameOrBefore';

dayjs.extend(isSameOrBefore);
import { Task } from "./taskService";
import { Project } from "./projectService";

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
    project?: Project;
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
                task:ontime_task(*),
                project:ontime_project(*)
            `)
            .gte('start_time', start)
            .lte('start_time', end);

        if (error) throw error;

        return data as CalendarEntry[];
    },

    async createEntry(request: Omit<CalendarEntry, 'id'>): Promise<CalendarEntry> {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("User not authenticated");

        // Debug: log incoming project_id to help track why projects aren't being saved
        // (remove this log after debugging)
        // eslint-disable-next-line no-console
        console.log('calendarService.createEntry project_id:', request.project_id);

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
                task:ontime_task(*),
                project:ontime_project(*)
            `)
            .single();

        if (error) throw error;

        return data as CalendarEntry;
    },

    async updateEntry(id: string, updates: Partial<{
        task_id: string | null;
        project_id: string | null;
        is_billable: boolean | null;
        start_time: string | null;
        end_time: string | null;
    }>): Promise<CalendarEntry> {
        const payload: Record<string, any> = {};
        if (updates.task_id !== undefined) payload.task_id = updates.task_id;
        if (updates.project_id !== undefined) payload.project_id = updates.project_id;
        if (updates.is_billable !== undefined) payload.is_billable = updates.is_billable;
        if (updates.start_time !== undefined) payload.start_time = updates.start_time;
        if (updates.end_time !== undefined) payload.end_time = updates.end_time;

        const { data, error } = await supabase
            .from('ontime_calendar_entry')
            .update(payload)
            .eq('id', id)
            .select(`
                *,
                task:ontime_task(*),
                project:ontime_project(*)
            `)
            .single();

        if (error) throw error;

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
                task:ontime_task(*),
                project:ontime_project(*)
            `)
            .eq('id', id)
            .single();

        if (error) throw error;

        return data as CalendarEntry;
    }
};
