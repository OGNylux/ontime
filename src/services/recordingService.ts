import { supabase } from "../lib/supabase";
import { getActiveWorkspaceId, requireUserId } from "./workspaceContext";
import type { Tables } from "../lib/database.types";

export type ActiveRecording = Tables<'ontime_active_recording'>;

export interface StartRecordingRequest {
    task_id?: string | null;
    title?: string | null;
    is_billable?: boolean;
    started_at?: string;
}

export const recordingService = {
    async getActiveRecording(): Promise<ActiveRecording | null> {
        const userId = await requireUserId();
        const workspaceId = await getActiveWorkspaceId();

        const { data, error } = await supabase
            .from("ontime_active_recording")
            .select("*")
            .eq("created_by", userId)
            .eq("workspace_id", workspaceId)
            .maybeSingle();
        if (error) throw error;

        return data;
    },

    async startRecording(request: StartRecordingRequest = {}): Promise<ActiveRecording> {
        const userId = await requireUserId();
        const workspaceId = await getActiveWorkspaceId();

        const { data, error } = await supabase
            .from("ontime_active_recording")
            .upsert({
                workspace_id: workspaceId,
                created_by: userId,
                task_id: request.task_id ?? null,
                calendar_entry_id: null,
                title: request.title ?? null,
                is_billable: request.is_billable ?? false,
                started_at: request.started_at ?? new Date().toISOString(),
            }, { onConflict: "created_by,workspace_id" })
            .select("*")
            .single();
        if (error) throw error;

        return data;
    },

    async updateRecording(
        id: string,
        updates: Partial<Pick<ActiveRecording, "task_id" | "title" | "is_billable" | "calendar_entry_id">>,
    ): Promise<ActiveRecording> {
        const { data, error } = await supabase
            .from("ontime_active_recording")
            .update(updates)
            .eq("id", id)
            .select("*")
            .single();
        if (error) throw error;
        return data;
    },

    async setCalendarEntryId(id: string, calendarEntryId: string | null): Promise<void> {
        const { error } = await supabase
            .from("ontime_active_recording")
            .update({ calendar_entry_id: calendarEntryId })
            .eq("id", id);
        if (error) throw error;
    },

    async stopRecording(): Promise<void> {
        const userId = await requireUserId();
        const workspaceId = await getActiveWorkspaceId();

        const { error } = await supabase
            .from("ontime_active_recording")
            .delete()
            .eq("created_by", userId)
            .eq("workspace_id", workspaceId);
        if (error) throw error;
    },

    subscribeToChanges(workspaceId: string, callbacks: {
        onUpsert: () => void;
        onDelete: () => void;
    }): () => void {
        const channel = supabase
            .channel(`ontime-active-recording-${workspaceId}`)
            .on(
                "postgres_changes",
                { event: "*", schema: "public", table: "ontime_active_recording", filter: `workspace_id=eq.${workspaceId}` },
                (payload) => {
                    if (payload.eventType === "DELETE") {
                        callbacks.onDelete();
                    } else {
                        callbacks.onUpsert();
                    }
                },
            )
            .subscribe();

        return () => { void supabase.removeChannel(channel); };
    },
};
