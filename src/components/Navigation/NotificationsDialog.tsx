import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    List,
    ListItem,
    ListItemText,
    ListItemAvatar,
    Avatar,
    Typography,
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

interface Props {
    open: boolean;
    onClose: () => void;
}

export function NotificationsList({ notifications }: { notifications?: Notification[] }) {
    const items = notifications ?? [fakeNotification];
    return (
        <List sx={{ width: 360, maxWidth: '100%' }}>
            {items.map((n) => (
                <ListItem key={n.id} alignItems="flex-start">
                    <ListItemAvatar>
                        <Avatar>{n.title.charAt(0)}</Avatar>
                    </ListItemAvatar>
                    <ListItemText
                        primary={n.title}
                        secondary={
                            <>
                                <Typography variant="body2" color="text.primary">
                                    {n.body}
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                    {new Date(n.date).toLocaleString()}
                                </Typography>
                            </>
                        }
                    />
                </ListItem>
            ))}
        </List>
    );
}

export default function NotificationsDialog({ open, onClose }: Props) {
    const notifications: Notification[] = [fakeNotification];

    return (
        <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
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
                <NotificationsList notifications={notifications} />
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose}>Close</Button>
            </DialogActions>
        </Dialog>
    );
}
