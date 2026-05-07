import { supabase } from '../lib/supabase';
import { requireUserId } from './workspaceContext';

export type NotificationType = 'workspace_invite' | 'workspace_removed' | 'entry_updated' | 'entry_deleted';

export interface AppNotification {
    id: string;
    user_id: string;
    workspace_id?: string | null;
    type: NotificationType;
    title: string;
    body: string;
    read: boolean;
    ref_id?: string | null;
    metadata?: {
        token?: string;
        workspace_name?: string;
        invited_by_name?: string;
        role?: string;
        modifier_name?: string;
        task_name?: string;
        entry_date?: string;
    } | null;
    created_at: string;
}

export const notificationService = {
    async list(): Promise<AppNotification[]> {
        const { data, error } = await supabase
            .from('ontime_notification')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(50);
        if (error) throw error;
        return (data ?? []) as AppNotification[];
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
