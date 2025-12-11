import { CalendarCreateEntryRequestDTO } from "../dtos/request/CalendarCreateEntry.request.dto";
import { CalendarUpdateEntryRequestDTO } from "../dtos/request/CalendarUpdateEntry.request.dto";
import { CalendarEntryResponseDTO } from "../dtos/response/CalendarEntry.response.dto";
import { supabase } from "../lib/supabase";
import dayjs from "dayjs";

export const calendarService = {
    async getEntries(startDate: string, endDate: string): Promise<CalendarEntryResponseDTO[]> {
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

        return (data || []).map((entry: any) => {
            const startTime = dayjs(entry.start_time);
            const endTime = dayjs(entry.end_time);
            const startOfDay = startTime.startOf('day');

            return {
                id: entry.id.toString(),
                date: startTime.format('YYYY-MM-DD'),
                start_minute: startTime.diff(startOfDay, 'minute'),
                end_minute: endTime.diff(startOfDay, 'minute'),
                task_id: entry.task_id,
                project_id: entry.project_id,
                is_billable: entry.is_billable,
                task: entry.task
            };
        });
    },

    async createEntry(request: CalendarCreateEntryRequestDTO): Promise<CalendarEntryResponseDTO> {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("User not authenticated");

        const date = dayjs(request.date);
        const startTime = date.startOf('day').add(request.start_minute, 'minute').toISOString();
        const endTime = date.startOf('day').add(request.end_minute, 'minute').toISOString();

        const { data, error } = await supabase
            .from('ontime_calendar_entry')
            .insert({ 
                user_id: user.id,
                task_id: request.task_id,
                project_id: request.project_id,
                is_billable: request.is_billable,
                start_time: startTime,
                end_time: endTime,
            })
            .select(`
                *,
                task:ontime_task(*)
            `)
            .single();

        if (error) throw error;

        // Map response
        const entry = data;
        const entryStartTime = dayjs(entry.start_time);
        const entryEndTime = dayjs(entry.end_time);
        const startOfDay = entryStartTime.startOf('day');

        return {
            id: entry.id.toString(),
            date: entryStartTime.format('YYYY-MM-DD'),
            start_minute: entryStartTime.diff(startOfDay, 'minute'),
            end_minute: entryEndTime.diff(startOfDay, 'minute'),
            task_id: entry.task_id,
            project_id: entry.project_id,
            is_billable: entry.is_billable,
            task: entry.task
        };
    },

    async updateEntry(id: string, request: CalendarUpdateEntryRequestDTO): Promise<CalendarEntryResponseDTO> {
        const updateData: any = {};
        
        if (request.task_id !== undefined) updateData.task_id = request.task_id;
        if (request.project_id !== undefined) updateData.project_id = request.project_id;
        if (request.is_billable !== undefined) updateData.is_billable = request.is_billable;
        
        // If date or times are updated, we need to recalculate timestamps
        if (request.date && request.start_minute !== undefined && request.end_minute !== undefined) {
            const date = dayjs(request.date);
            updateData.start_time = date.startOf('day').add(request.start_minute, 'minute').toISOString();
            updateData.end_time = date.startOf('day').add(request.end_minute, 'minute').toISOString();
        } else if (request.start_minute !== undefined && request.end_minute !== undefined) {
             // If only times are updated, we need to fetch the current date or assume it's passed?
             // The current implementation of updateEntry in useCalendarWeek passes dateStr to updateEntry?
             // No, useCalendarWeek calls updateEntry(entryId, { start_minute, end_minute }).
             // But we need the date to calculate start_time/end_time.
             // The current service implementation assumes `request.date` is present if `start_minute` is present?
             // Let's check the read file of calendarService.ts again.
        }

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

        const entry = data;
        const entryStartTime = dayjs(entry.start_time);
        const entryEndTime = dayjs(entry.end_time);
        const startOfDay = entryStartTime.startOf('day');

        return {
            id: entry.id.toString(),
            date: entryStartTime.format('YYYY-MM-DD'),
            start_minute: entryStartTime.diff(startOfDay, 'minute'),
            end_minute: entryEndTime.diff(startOfDay, 'minute'),
            task_id: entry.task_id,
            project_id: entry.project_id,
            is_billable: entry.is_billable,
            task: entry.task
        };
    },

    async deleteEntry(id: string): Promise<void> {
        const { error } = await supabase
            .from('ontime_calendar_entry')
            .delete()
            .eq('id', id);

        if (error) throw error;
    },

    async getEntryById(id: string): Promise<CalendarEntryResponseDTO | null> {
        const { data, error } = await supabase
            .from('ontime_calendar_entry')
            .select(`
                *,
                task:ontime_task(*)
            `)
            .eq('id', id)
            .single();

        if (error) {
            if (error.code === 'PGRST116') return null; // Not found
            throw error;
        }
        if (!data) return null;

        const entry = data;
        const startTime = dayjs(entry.start_time);
        const endTime = dayjs(entry.end_time);
        const startOfDay = startTime.startOf('day');

        return {
            id: entry.id.toString(),
            date: startTime.format('YYYY-MM-DD'),
            start_minute: startTime.diff(startOfDay, 'minute'),
            end_minute: endTime.diff(startOfDay, 'minute'),
            task_id: entry.task_id,
            project_id: entry.project_id,
            is_billable: entry.is_billable,
            task: entry.task
        };
    }
};
