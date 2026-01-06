import { useState } from 'react';
import {
    Box,
    BottomNavigation,
    BottomNavigationAction,
    Fab,
    Paper,
    Collapse,
    IconButton,
    Stack,
    Typography,
} from '@mui/material';
import {
    Home as HomeIcon,
    CalendarMonth as TimerIcon,
    Notifications as NotificationsIcon,
    Settings as SettingsIcon,
    Add as AddIcon,
    Close as CloseIcon,
    People as PeopleIcon,
    Folder as FolderIcon,
    Task as TaskIcon,
} from '@mui/icons-material';
import { useNavigate, useLocation } from 'react-router-dom';

export default function BottomAppBar() {
    const navigate = useNavigate();
    const location = useLocation();
    const [fabOpen, setFabOpen] = useState(false);

    // Map paths to nav values
    const getNavValue = () => {
        if (location.pathname === '/' || location.pathname === '/home') return 0;
        if (location.pathname === '/timer') return 1;
        if (location.pathname === '/notifications') return 3;
        if (location.pathname === '/settings') return 4;
        return -1;
    };

    const handleNavChange = (_: React.SyntheticEvent, newValue: number) => {
        setFabOpen(false);
        switch (newValue) {
            case 0:
                navigate('/');
                break;
            case 1:
                navigate('/timer');
                break;
            case 3:
                navigate('/notifications');
                break;
            case 4:
                navigate('/settings');
                break;
        }
    };

    const handleFabClick = () => {
        setFabOpen(!fabOpen);
    };

    const handleQuickAction = (path: string) => {
        setFabOpen(false);
        navigate(path);
    };

    return (
        <Paper
            sx={{
                position: 'fixed',
                bottom: 0,
                left: 0,
                right: 0,
                zIndex: (theme) => theme.zIndex.appBar,
                pb: 'env(safe-area-inset-bottom)',
                borderTopLeftRadius: 12,
                borderTopRightRadius: 12,
            }}
            elevation={3}
        >
            {/* Quick Actions Overlay */}
            <Collapse in={fabOpen}>
                <Box
                    sx={{
                        display: 'flex',
                        justifyContent: 'center',
                        gap: 3,
                        py: 2,
                        px: 2,
                        bgcolor: 'background.paper',
                        borderTop: 1,
                        borderColor: 'divider',
                        borderTopLeftRadius: 12,
                        borderTopRightRadius: 12,
                        overflow: 'hidden',
                    }}
                >
                    <Stack alignItems="center" spacing={0.5}>
                        <IconButton
                            onClick={() => handleQuickAction('/clients')}
                            sx={{
                                bgcolor: 'primary.light',
                                color: 'primary.contrastText',
                                '&:hover': { bgcolor: 'primary.main' },
                            }}
                        >
                            <PeopleIcon />
                        </IconButton>
                        <Typography variant="caption">Client</Typography>
                    </Stack>

                    <Stack alignItems="center" spacing={0.5}>
                        <IconButton
                            onClick={() => handleQuickAction('/projects')}
                            sx={{
                                bgcolor: 'primary.light',
                                color: 'primary.contrastText',
                                '&:hover': { bgcolor: 'primary.main' },
                            }}
                        >
                            <FolderIcon />
                        </IconButton>
                        <Typography variant="caption">Project</Typography>
                    </Stack>

                    <Stack alignItems="center" spacing={0.5}>
                        <IconButton
                            onClick={() => handleQuickAction('/tasks')}
                            sx={{
                                bgcolor: 'primary.light',
                                color: 'primary.contrastText',
                                '&:hover': { bgcolor: 'primary.main' },
                            }}
                        >
                            <TaskIcon />
                        </IconButton>
                        <Typography variant="caption">Task</Typography>
                    </Stack>
                </Box>
            </Collapse>

            {/* Bottom Navigation */}
            <Box sx={{ position: 'relative' }}>
                <BottomNavigation
                    value={getNavValue()}
                    onChange={handleNavChange}
                    showLabels
                    sx={{
                        height: 64,
                        '& .MuiBottomNavigationAction-root': {
                            minWidth: 'auto',
                            px: 1,
                        },
                    }}
                >
                    <BottomNavigationAction label="Home" icon={<HomeIcon />} />
                    <BottomNavigationAction label="Timer" icon={<TimerIcon />} />
                    {/* Spacer for FAB */}
                    <Box sx={{ width: 72 }} />
                    <BottomNavigationAction label="Notifications" icon={<NotificationsIcon />} />
                    <BottomNavigationAction label="Settings" icon={<SettingsIcon />} />
                </BottomNavigation>

                {/* Floating Action Button */}
                <Fab
                    color="primary"
                    onClick={handleFabClick}
                    sx={(theme) => ({
                        position: 'absolute',
                        top: -4,
                        left: '50%',
                        transform: 'translateX(-50%)',
                        width: 56,
                        height: 56,
                        boxShadow: 3,
                        transition: 'transform 0.2s',
                        border: `2px solid ${theme.palette.background.paper}`,
                    })}
                >
                    {fabOpen ? <CloseIcon /> : <AddIcon />}
                </Fab>
            </Box>
        </Paper>
    );
}
