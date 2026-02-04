import { supabase } from "../lib/supabase";
import dayjs from "dayjs";
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
        const start = dayjs(startDate).startOf('day').toISOString();
        const end = dayjs(endDate).endOf('day').toISOString();

        const { data, error } = await supabase
            .from('ontime_calendar_entry')
            .select(`
                *,
                task:ontime_task(*),
                project:ontime_project(*, client:ontime_client(*))
            `)
            .gte('start_time', start)
            .lte('start_time', end);

        if (error) throw error;

        return data as CalendarEntry[];
    },

    async createEntry(request: Omit<CalendarEntry, 'id'>): Promise<CalendarEntry> {
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
                task:ontime_task(*),
                project:ontime_project(*, client:ontime_client(*))
            `)
            .single();

        if (error) throw error;

        const entry = data as CalendarEntry;

                try {
            if (request.task_id && request.project_id) {
                const { error: taskError } = await supabase
                    .from('ontime_task')
                    .update({ project_id: request.project_id })
                    .eq('id', request.task_id);

                if (taskError) console.error('Failed to update task project_id for task', request.task_id, taskError);
            }
        } catch (e) {
            console.error('Error updating task project_id after creating calendar entry', e);
        }

        return entry;
    },


    async updateEntry(id: string, request: Partial<CalendarEntry>): Promise<CalendarEntry> {
        const { data, error } = await supabase
            .from('ontime_calendar_entry')
            .update({
                task_id: request.task_id,
                project_id: request.project_id,
                is_billable: request.is_billable,
                start_time: request.start_time,
                end_time: request.end_time,
            })
            .eq('id', id)
            .select(`
                *,
                task:ontime_task(*),
                project:ontime_project(*, client:ontime_client(*))
            `)
            .single();
        if (error) throw error;
        const entry = data as CalendarEntry;

                try {
            if (request.task_id && request.project_id) {
                const { error: taskError } = await supabase
                    .from('ontime_task')
                    .update({ project_id: request.project_id })
                    .eq('id', request.task_id);

                if (taskError) console.error('Failed to update task project_id for task', request.task_id, taskError);
            }
        } catch (e) {
            console.error('Error updating task project_id after updating calendar entry', e);
        }

        return entry;
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
                project:ontime_project(*, client:ontime_client(*))
            `)
            .eq('id', id)
            .single();

        if (error) throw error;

        return data as CalendarEntry;
    }
};
