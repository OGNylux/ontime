import { supabase } from '../lib/supabase';
import { requireUserId } from './workspaceContext';
import type { Tables } from '../lib/database.types';

type NotificationRow = Tables<'ontime_notification'>;

export type NotificationType = 'workspace_invite' | 'workspace_removed' | 'entry_updated' | 'entry_deleted';

export interface AppNotification extends Omit<NotificationRow, 'type' | 'metadata'> {
    type: NotificationType;
    metadata?: {
        token?: string;
        workspace_name?: string;
        invited_by_name?: string;
        role?: string;
        modifier_name?: string;
        task_name?: string;
        entry_date?: string;
    } | null;
}

export const notificationService = {
    async list(): Promise<AppNotification[]> {
        const { data, error } = await supabase
            .from('ontime_notification')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(50)
            .returns<AppNotification[]>();
        if (error) throw error;
        return data ?? [];
    },

    async markRead(id: string): Promise<void> {
        const { error } = await supabase
            .from('ontime_notification')
            .update({ read: true })
            .eq('id', id);
        if (error) throw error;
    },

    async markAllRead(): Promise<void> {
        const userId = await requireUserId();
        const { error } = await supabase
            .from('ontime_notification')
            .update({ read: true })
            .eq('user_id', userId)
            .eq('read', false);
        if (error) throw error;
    },

    async remove(id: string): Promise<void> {
        const { error } = await supabase
            .from('ontime_notification')
            .delete()
            .eq('id', id);
        if (error) throw error;
    },

    async acceptInvite(token: string): Promise<void> {
        const { error } = await supabase.rpc('accept_workspace_invite', { p_token: token });
        if (error) throw error;
    },

    subscribeToNew(userId: string, callback: (notification: AppNotification) => void): () => void {
        const channel = supabase
            .channel(`ontime-notifications-${userId}`)
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'ontime_notification',
                    filter: `user_id=eq.${userId}`,
                },
                (payload) => callback(payload.new as AppNotification),
            )
            .subscribe();
        return () => { void supabase.removeChannel(channel); };
    },
};
