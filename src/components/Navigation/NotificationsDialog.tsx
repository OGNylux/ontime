import { Fragment } from 'react';
import {
    List,
    ListItemAvatar,
    Avatar,
    Typography,
    Paper,
    Box,
    IconButton,
    Button,
    Chip,
    CircularProgress,
    Alert,
} from '@mui/material';
import {
    Notifications as NotificationsIcon,
    PersonRemove,
    EditCalendar,
    DeleteSweep,
    GroupAdd,
    Close,
    DoneAll,
} from '@mui/icons-material';
import { useNotificationsContext } from '../../hooks/useNotifications';
import type { AppNotification } from '../../services/notificationService';

function NotificationAvatar({ type, read }: { type: AppNotification['type']; read: boolean }) {
    const icon = {
        workspace_invite: <GroupAdd />,
        workspace_removed: <PersonRemove />,
        entry_updated: <EditCalendar />,
        entry_deleted: <DeleteSweep />,
    }[type] ?? <NotificationsIcon />;

    return (
        <Avatar sx={{ bgcolor: read ? 'action.disabledBackground' : 'primary.main', width: 36, height: 36 }}>
            {icon}
        </Avatar>
    );
}

function NotificationItem({ notification }: { notification: AppNotification }) {
    const { markRead, remove, acceptInvite } = useNotificationsContext();
    const { id, type, title, body, read, metadata, created_at } = notification;

    const handleClick = () => {
        if (!read) {
            markRead(id).catch(err => console.error('Failed to mark notification read:', err));
        }
    };

    const inviteToken = type === 'workspace_invite' ? metadata?.token : undefined;

    return (
        <Paper
            elevation={read ? 0 : 2}
            onClick={handleClick}
            sx={{
                m: 1,
                p: 2,
                border: '1px solid',
                borderColor: read ? 'divider' : 'primary.main',
                opacity: read ? 0.72 : 1,
                cursor: read ? 'default' : 'pointer',
                transition: 'opacity 0.2s, border-color 0.2s',
                '&:hover': { opacity: 1 },
            }}
        >
            <Box display="flex" gap={1.5}>
                <ListItemAvatar sx={{ minWidth: 40, mt: 0.5 }}>
                    <NotificationAvatar type={type} read={read} />
                </ListItemAvatar>
                <Box flex={1} minWidth={0}>
                    <Box display="flex" alignItems="flex-start" justifyContent="space-between" gap={1}>
                        <Typography variant="subtitle2" fontWeight={read ? 'normal' : 'bold'}>
                            {title}
                        </Typography>
                        <IconButton
                            size="small"
                            onClick={(e) => {
                                e.stopPropagation();
                                remove(id).catch(err => console.error('Failed to remove notification:', err));
                            }}
                            sx={{ flexShrink: 0, mt: -0.5 }}
                        >
                            <Close fontSize="small" />
                        </IconButton>
                    </Box>

                    <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25 }}>
                        {body}
                    </Typography>

                    {inviteToken && (
                        <Box display="flex" gap={1} mt={1.5} onClick={e => e.stopPropagation()}>
                            <Button
                                size="small"
                                variant="contained"
                                onClick={() => acceptInvite(id, inviteToken).catch(err => console.error('Failed to accept invite:', err))}
                            >
                                Accept
                            </Button>
                            <Button
                                size="small"
                                variant="outlined"
                                color="error"
                                onClick={() => remove(id).catch(err => console.error('Failed to decline invite:', err))}
                            >
                                Decline
                            </Button>
                        </Box>
                    )}

                    <Box display="flex" alignItems="center" gap={1} mt={0.75}>
                        <Typography variant="caption" color="text.secondary">
                            {new Date(created_at).toLocaleString()}
                        </Typography>
                        {!read && (
                            <Chip label="New" size="small" color="primary" sx={{ height: 16, fontSize: 10 }} />
                        )}
                    </Box>
                </Box>
            </Box>
        </Paper>
    );
}

export function NotificationsList() {
    const { notifications, loading, error, unreadCount, markAllRead } = useNotificationsContext();

    if (loading) {
        return (
            <Box display="flex" justifyContent="center" py={6}>
                <CircularProgress size={32} />
            </Box>
        );
    }

    if (error) {
        return (
            <Box px={2} py={2}>
                <Alert severity="error">Failed to load notifications: {error}</Alert>
            </Box>
        );
    }

    return (
        <>
            {unreadCount > 0 && (
                <Box display="flex" justifyContent="flex-end" px={2} pt={1}>
                    <Button size="small" startIcon={<DoneAll />} onClick={markAllRead}>
                        Mark all as read
                    </Button>
                </Box>
            )}
            {notifications.length === 0 ? (
                <Box display="flex" flexDirection="column" alignItems="center" py={8} gap={2} color="text.secondary">
                    <NotificationsIcon sx={{ fontSize: 52, opacity: 0.25 }} />
                    <Typography variant="body2">No notifications</Typography>
                </Box>
            ) : (
                <List sx={{ p: 0, m: 0 }}>
                    {notifications.map((n, i) => (
                        <Fragment key={n.id}>
                            <li style={{ listStyle: 'none' }}>
                                <NotificationItem notification={n} />
                            </li>
                            {i < notifications.length - 1 && (
                                <Box component="li" sx={{ listStyle: 'none', mx: 2, borderBottom: '1px solid', borderColor: 'divider' }} />
                            )}
                        </Fragment>
                    ))}
                </List>
            )}
        </>
    );
}
