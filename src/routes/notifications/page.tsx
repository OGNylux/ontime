import { Box, Typography, Container } from '@mui/material';
import { NotificationsList } from '../../components/Navigation/NotificationsDialog';

export default function NotificationsPage() {
    return (
        <Box
            height="100%"
            display="flex"
            flexDirection="column"
            >
            <Box
                borderRadius={2}
                boxShadow={4}
                bgcolor="background.default"
            >
                <Box pl={3} py={2}>
                    <Typography variant="h4" fontWeight="bold">
                        Notifications
                    </Typography>
                </Box>
            </Box>

            <Box sx={{ pb: 2, width: '100%' }}>
                <NotificationsList />
            </Box>
        </Box>

    );
}