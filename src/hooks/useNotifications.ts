import { createContext, useContext, useState, useEffect, useCallback, ReactNode, createElement } from 'react';
import { notificationService, type AppNotification } from '../services/notificationService';
import { requireUserId } from '../services/workspaceContext';
import { useSnackbar } from './useSnackbar';

interface NotificationsContextValue {
    notifications: AppNotification[];
    loading: boolean;
    error: string | null;
    unreadCount: number;
    markRead: (id: string) => Promise<void>;
    markAllRead: () => Promise<void>;
    remove: (id: string) => Promise<void>;
    acceptInvite: (notificationId: string, token: string) => Promise<void>;
}

const NotificationsContext = createContext<NotificationsContextValue | null>(null);

export function NotificationsProvider({ children }: { children: ReactNode }) {
    const value = useNotifications();
    return createElement(NotificationsContext.Provider, { value }, children);
}

export function useNotificationsContext(): NotificationsContextValue {
    const ctx = useContext(NotificationsContext);
    if (!ctx) throw new Error('useNotificationsContext must be used within NotificationsProvider');
    return ctx;
}

function errorMessage(err: unknown): string {
    return err instanceof Error ? err.message : 'Unknown error';
}

export function useNotifications(): NotificationsContextValue {
    const { showInfo } = useSnackbar();
    const [notifications, setNotifications] = useState<AppNotification[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let mounted = true;
        let unsub: (() => void) | undefined;

        const init = async () => {
            try {
                const [userId, data] = await Promise.all([
                    requireUserId(),
                    notificationService.list(),
                ]);
                if (!mounted) return;
                setNotifications(data);
                setError(null);
                setLoading(false);
                unsub = notificationService.subscribeToNew(userId, n => {
                    if (!mounted) return;
                    setNotifications(prev => [n, ...prev]);
                    showInfo(n.title, n.body);
                });
            } catch (err) {
                if (!mounted) return;
                console.error('Failed to load notifications:', err);
                setError(errorMessage(err));
                setLoading(false);
            }
        };

        init();

        return () => { mounted = false; unsub?.(); };
    }, []);

    const markRead = useCallback(async (id: string) => {
        // Optimistic update; revert on failure.
        setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
        try {
            await notificationService.markRead(id);
        } catch (err) {
            console.error('Failed to mark notification read:', err);
            setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: false } : n));
            throw err;
        }
    }, []);

    const markAllRead = useCallback(async () => {
        const previous = notifications;
        setNotifications(prev => prev.map(n => ({ ...n, read: true })));
        try {
            await notificationService.markAllRead();
        } catch (err) {
            console.error('Failed to mark all notifications read:', err);
            setNotifications(previous);
            throw err;
        }
    }, [notifications]);

    const remove = useCallback(async (id: string) => {
        const removed = notifications.find(n => n.id === id);
        setNotifications(prev => prev.filter(n => n.id !== id));
        try {
            await notificationService.remove(id);
        } catch (err) {
            console.error('Failed to remove notification:', err);
            if (removed) setNotifications(prev => [removed, ...prev]);
            throw err;
        }
    }, [notifications]);

    const acceptInvite = useCallback(async (notificationId: string, token: string) => {
        await notificationService.acceptInvite(token);
        await notificationService.remove(notificationId);
        setNotifications(prev => prev.filter(n => n.id !== notificationId));
        window.location.reload();
    }, []);

    const unreadCount = notifications.filter(n => !n.read).length;

    return { notifications, loading, error, unreadCount, markRead, markAllRead, remove, acceptInvite };
}
