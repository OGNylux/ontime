import { Box, Typography, Container, AppBar, Toolbar, IconButton } from '@mui/material';
import ArrowBack from '@mui/icons-material/ArrowBack';
import { useNavigate } from 'react-router-dom';
import { NotificationsList } from '../../components/Navigation/NotificationsDialog';

export default function NotificationsPage() {
    const navigate = useNavigate();

    return (
        <Box>
            <AppBar position="static" color="default" elevation={1}>
                <Toolbar>
                    <IconButton edge="start" onClick={() => navigate(-1)} aria-label="back">
                        <ArrowBack />
                    </IconButton>
                    <Typography variant="h6">Notifications</Typography>
                </Toolbar>
            </AppBar>
            <Container sx={{ py: 2 }}>
                <NotificationsList />
            </Container>
        </Box>
    );
}
