import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    List,
    ListItemAvatar,
    Avatar,
    Typography,
    Paper,
    Box,
    useTheme,
    useMediaQuery,
} from '@mui/material';
import NotificationsIcon from '@mui/icons-material/Notifications';

interface Notification {
    id: string;
    title: string;
    body: string;
    date: string;
}

const fakeNotification: Notification = {
    id: '1',
    title: 'Welcome to OnTime',
    body: 'This is a fake notification for now. Notifications will appear here once implemented.',
    date: new Date().toISOString(),
};

    export function NotificationsList({ notifications, variant = 'popover' }: { notifications?: Notification[]; variant?: 'popover' | 'dialog' }) {
        const items = notifications ?? [fakeNotification];
        const theme = useTheme();
        const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

        const listSx = variant === 'popover'
            ? { width: isMobile ? '100%' : 360, maxWidth: '100%', p: 0, m: 0 }
            : { width: '100%', maxWidth: '100%', p: 0, m: 0 };

        return (
            <List sx={listSx}>
                {items.map((n) => {
                    const paperSx = variant === 'dialog' && isMobile
                        ? { m: 0, p: 2, border: '1px solid', borderColor: 'divider', width: '100%' }
                        : { m: 1, p: 2, border: '1px solid', borderColor: 'divider', width: 'auto' };

                    return (
                        <li key={n.id} style={{ listStyle: 'none' }}>
                            <Paper elevation={2} sx={paperSx}>
                                <Box display="flex" gap={2}>
                                    <ListItemAvatar>
                                        <Avatar>{n.title.charAt(0)}</Avatar>
                                    </ListItemAvatar>
                                    <Box>
                                        <Typography variant="subtitle1">{n.title}</Typography>
                                        <Typography variant="body2" color="text.primary" sx={{ mt: 0.5 }}>
                                            {n.body}
                                        </Typography>
                                        <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                                            {new Date(n.date).toLocaleString()}
                                        </Typography>
                                    </Box>
                                </Box>
                            </Paper>
                        </li>
                    );
                })}
            </List>
        );
    }

interface Props {
    open: boolean;
    onClose: () => void;
}

export default function NotificationsDialog({ open, onClose }: Props) {
    const notifications: Notification[] = [fakeNotification];
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

    return (
        <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm" fullScreen={isMobile}>
            <DialogTitle>
                <ListItemAvatar>
                    <Avatar>
                        <NotificationsIcon />
                    </Avatar>
                </ListItemAvatar>
                <Typography variant="h6" component="span" sx={{ ml: 1 }}>
                    Notifications
                </Typography>
            </DialogTitle>
            <DialogContent dividers>
                <NotificationsList notifications={notifications} variant="dialog" />
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose}>Close</Button>
            </DialogActions>
        </Dialog>
    );
}
