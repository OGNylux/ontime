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
            .select('*')
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
                title: entry.title || 'Untitled',
                color: entry.color
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
                start_time: startTime,
                end_time: endTime,
                title: request.title,
                color: request.color
            })
            .select()
            .single();

        if (error) throw error;

        // Map back to response DTO
        const createdStart = dayjs(data.start_time);
        const createdEnd = dayjs(data.end_time);
        const createdStartOfDay = createdStart.startOf('day');

        return {
            id: data.id.toString(),
            date: createdStart.format('YYYY-MM-DD'),
            start_minute: createdStart.diff(createdStartOfDay, 'minute'),
            end_minute: createdEnd.diff(createdStartOfDay, 'minute'),
            title: data.title || 'Untitled',
            color: data.color
        };
    },

    async updateEntry(id: string, request: CalendarUpdateEntryRequestDTO): Promise<void> {
        const updateData: any = {};
        
        if (request.title !== undefined) updateData.title = request.title;
        if (request.color !== undefined) updateData.color = request.color;
        
        // If date or times are updated, we need to recalculate timestamps
        // Note: This logic assumes if you update time, you provide the date, or we need to fetch existing first.
        // For simplicity, if date is provided, we recalculate. 
        // Ideally, we should fetch the existing entry if only partial time info is provided, 
        // but usually the frontend sends the full new state or we can assume date is present if times are.
        
        if (request.date && request.start_minute !== undefined && request.end_minute !== undefined) {
            const date = dayjs(request.date);
            updateData.start_time = date.startOf('day').add(request.start_minute, 'minute').toISOString();
            updateData.end_time = date.startOf('day').add(request.end_minute, 'minute').toISOString();
        }

        const { error } = await supabase
            .from('ontime_calendar_entry')
            .update(updateData)
            .eq('id', id);

        if (error) throw error;
    },

    async deleteEntry(id: string): Promise<void> {
        const { error } = await supabase
            .from('ontime_calendar_entry')
            .delete()
            .eq('id', id);

        if (error) throw error;
    }
};
