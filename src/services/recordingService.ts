import { supabase } from "../lib/supabase";

export interface ActiveRecording {
    id: string;
    user_id: string;
    task_id: string | null;
    project_id: string | null;
    is_billable: boolean;
    title: string | null;
    started_at: string;
    calendar_entry_id: string | null;
    created_at?: string;
}

export const recordingService = {
    async getActiveRecording(): Promise<ActiveRecording | null> {
        const { data, error } = await supabase
            .from('ontime_active_recording')
            .select('*')
            .maybeSingle();

        if (error) throw error;
        return data as ActiveRecording | null;
    },

    async startRecording(request: {
        project_id?: string | null;
        is_billable?: boolean;
        title?: string | null;
        started_at: string;
    }): Promise<ActiveRecording> {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("User not authenticated");

        const { data, error } = await supabase
            .from('ontime_active_recording')
            .upsert({
                user_id: user.id,
                task_id: null,
                project_id: request.project_id ?? null,
                is_billable: request.is_billable ?? false,
                title: request.title ?? null,
                started_at: request.started_at,
                calendar_entry_id: null,
            }, { onConflict: 'user_id' })
            .select('*')
            .single();

        if (error) throw error;
        return data as ActiveRecording;
    },

    async updateCalendarEntryId(recordingId: string, calendarEntryId: string): Promise<void> {
        const { error } = await supabase
            .from('ontime_active_recording')
            .update({ calendar_entry_id: calendarEntryId })
            .eq('id', recordingId);

        if (error) throw error;
    },

    async stopRecording(): Promise<void> {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("User not authenticated");

        const { error } = await supabase
            .from('ontime_active_recording')
            .delete()
            .eq('user_id', user.id);

        if (error) throw error;
    },

    subscribeToChanges(callbacks: {
        onUpsert: () => void;
        onDelete: () => void;
    }): () => void {
        const channel = supabase
            .channel('ontime-active-recording')
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'ontime_active_recording' },
                (payload) => {
                    if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
                        callbacks.onUpsert();
                    } else if (payload.eventType === 'DELETE') {
                        callbacks.onDelete();
                    }
                },
            )
            .subscribe();

        return () => { void supabase.removeChannel(channel); };
    },
};
