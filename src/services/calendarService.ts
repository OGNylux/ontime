import { supabase } from "../lib/supabase";
import dayjs from "dayjs";
import { getActiveWorkspaceId, requireUserId } from "./workspaceContext";
import { Task } from "./taskService";
import type { Tables } from "../lib/database.types";

type CalendarEntryRow = Tables<'ontime_calendar_entry'>;

export interface CalendarEntry extends Omit<CalendarEntryRow, 'workspace_id' | 'created_by' | 'is_billable' | 'created_at' | 'invoice_id' | 'project_id' | 'task_id'> {
    workspace_id?: string;
    created_by?: string;
    is_billable?: boolean;
    created_at?: string;
    invoice_id?: string | null;
    project_id?: string | null;
    task_id?: string | null;
    task?: Task | null;
}

const ENTRY_SELECT = `
    *,
    task:ontime_task(*, project:ontime_project(*, client:ontime_client(*)))
`;

export const calendarService = {
    async getEntries(startDate: string, endDate: string): Promise<CalendarEntry[]> {
        const workspaceId = await getActiveWorkspaceId();
        const start = dayjs(startDate).startOf("day").toISOString();
        const end = dayjs(endDate).endOf("day").toISOString();

        const { data, error } = await supabase
            .from("ontime_calendar_entry")
            .select(ENTRY_SELECT)
            .eq("workspace_id", workspaceId)
            .gte("start_time", start)
            .lte("start_time", end)
            .order("start_time", { ascending: true })
            .returns<CalendarEntry[]>();
        if (error) throw error;

        return data ?? [];
    },

    async getEntryById(id: string): Promise<CalendarEntry> {
        const { data, error } = await supabase
            .from("ontime_calendar_entry")
            .select(ENTRY_SELECT)
            .eq("id", id)
            .returns<CalendarEntry>()
            .single();
        if (error) throw error;
        return data;
    },

    async createEntry(request: Omit<CalendarEntry, "id">): Promise<CalendarEntry> {
        const userId = await requireUserId();
        const workspaceId = await getActiveWorkspaceId();

        const { data, error } = await supabase
            .from("ontime_calendar_entry")
            .insert({
                workspace_id: workspaceId,
                created_by: userId,
                task_id: request.task_id ?? null,
                is_billable: request.is_billable ?? false,
                start_time: request.start_time,
                end_time: request.end_time,
            })
            .select(ENTRY_SELECT)
            .returns<CalendarEntry>()
            .single();
        if (error) throw error;

        return data;
    },

    async updateEntry(id: string, request: Partial<CalendarEntry>): Promise<CalendarEntry> {
        const payload: Record<string, unknown> = {};
        if (request.task_id !== undefined) payload.task_id = request.task_id;
        if (request.is_billable !== undefined) payload.is_billable = request.is_billable;
        if (request.start_time !== undefined) payload.start_time = request.start_time;
        if (request.end_time !== undefined) payload.end_time = request.end_time;

        const { data, error } = await supabase
            .from("ontime_calendar_entry")
            .update(payload)
            .eq("id", id)
            .select(ENTRY_SELECT)
            .returns<CalendarEntry>()
            .single();
        if (error) throw error;

        return data;
    },

    async deleteEntry(id: string): Promise<void> {
        const { error } = await supabase
            .from("ontime_calendar_entry")
            .delete()
            .eq("id", id);
        if (error) throw error;
    },

    subscribeToChanges(
        workspaceId: string,
        callbacks: {
            onInsertOrUpdate: (id: string, startTime: string, eventType: "INSERT" | "UPDATE") => void;
            onDelete: (id: string) => void;
        },
    ): () => void {
        const channel = supabase
            .channel(`ontime-calendar-${workspaceId}`)
            .on(
                "postgres_changes",
                {
                    event: "*",
                    schema: "public",
                    table: "ontime_calendar_entry",
                    filter: `workspace_id=eq.${workspaceId}`,
                },
                (payload) => {
                    if (payload.eventType === "DELETE") {
                        callbacks.onDelete((payload.old as { id: string }).id);
                    } else {
                        const row = payload.new as { id: string; start_time: string };
                        callbacks.onInsertOrUpdate(row.id, row.start_time, payload.eventType);
                    }
                },
            )
            .subscribe();

        return () => { void supabase.removeChannel(channel); };
    },
};
