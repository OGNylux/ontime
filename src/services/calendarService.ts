import { supabase } from "../lib/supabase";
import dayjs from "dayjs";
import isSameOrBefore from 'dayjs/plugin/isSameOrBefore';

dayjs.extend(isSameOrBefore);
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

    async createEntry(request: CalendarEntry): Promise<CalendarEntry> {
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

    // Returns total minutes of entries overlapping the given date (ISO YYYY-MM-DD)
    async getTotalMinutesForDate(dateISO: string) {
        const startOfDay = dayjs(dateISO).startOf("day");
        const endOfDay = dayjs(dateISO).endOf("day");

        const { data, error } = await supabase
            .from('ontime_calendar_entry')
            .select('id, start_time, end_time')
            .lt('start_time', endOfDay.toISOString())
            .gt('end_time', startOfDay.toISOString());

        if (error) throw error;

        let totalMinutes = 0;
        for (const e of data || []) {
            const s = dayjs(e.start_time);
            const en = dayjs(e.end_time);
            const clampedStart = s.isBefore(startOfDay) ? startOfDay : s;
            const clampedEnd = en.isAfter(endOfDay) ? endOfDay : en;
            const diff = Math.max(0, clampedEnd.diff(clampedStart, "minute"));
            totalMinutes += diff;
        }
        return totalMinutes;
    },

    // Returns total minutes per date between startDate and endDate inclusive. Dates are ISO YYYY-MM-DD
    async getTotalMinutesForRange(startDateISO: string, endDateISO: string) {
        const start = dayjs(startDateISO).startOf("day");
        const end = dayjs(endDateISO).endOf("day");

        const { data, error } = await supabase
            .from('ontime_calendar_entry')
            .select('id, start_time, end_time')
            .lt('start_time', end.toISOString())
            .gt('end_time', start.toISOString());

        if (error) throw error;

        const map: Record<string, number> = {};
        for (let d = dayjs(startDateISO); d.isSameOrBefore(endDateISO); d = d.add(1, "day")) {
            map[d.format("YYYY-MM-DD")] = 0;
        }

        for (const e of data || []) {
            const s = dayjs(e.start_time);
            const en = dayjs(e.end_time);
            // iterate days overlapping this entry
            let cur = s.startOf("day");
            const last = en.startOf("day");
            while (cur.isSameOrBefore(last)) {
                const dayKey = cur.format("YYYY-MM-DD");
                if (dayKey in map) {
                    const dayStart = cur.startOf("day");
                    const dayEnd = cur.endOf("day");
                    const clampedStart = s.isBefore(dayStart) ? dayStart : s;
                    const clampedEnd = en.isAfter(dayEnd) ? dayEnd : en;
                    const diff = Math.max(0, clampedEnd.diff(clampedStart, "minute"));
                    map[dayKey] = (map[dayKey] || 0) + diff;
                }
                cur = cur.add(1, "day");
            }
        }

        return map;
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
