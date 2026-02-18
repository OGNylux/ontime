import { useEffect, useState } from 'react';
import { AppBar, Toolbar, IconButton, Box } from '@mui/material';
import { Link } from 'react-router-dom';
import { Menu as MenuIcon } from '@mui/icons-material';
import ThemeToggler from './ThemeToggler';
import NotificationsIcon from '@mui/icons-material/Notifications';
import Popover from '@mui/material/Popover';
import { NotificationsList } from './NotificationsDialog';
import { platform } from '@tauri-apps/plugin-os';

interface NavbarProps {
    showMenuButton?: boolean;
    onMenuClick?: () => void;
}

export default function Navbar({ showMenuButton = false, onMenuClick }: NavbarProps) {
    const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
    const [isTauriMobile, setIsTauriMobile] = useState(false);

    useEffect(() => {
        const checkPlatform = async () => {
            try {
                const platformType = await platform();
                setIsTauriMobile(platformType === 'android' || platformType === 'ios');
            } catch {
                setIsTauriMobile(false);
            }
        };
        checkPlatform();
    }, []);

    return (
        <AppBar position="fixed" sx={{ zIndex: (theme) => theme.zIndex.drawer + 1, color: 'text.primary' }}>
            <Box bgcolor="background.default" height="100%">
                <Toolbar>
                    {showMenuButton && (
                        <IconButton
                            color="inherit"
                            aria-label="open drawer"
                            edge="start"
                            onClick={onMenuClick}
                            sx={{ mr: 2, display: { xs: 'none', sm: 'inline-flex' } }}
                        >
                            <MenuIcon />
                        </IconButton>
                    )}
                    <Link to="/" style={{ textDecoration: 'none', color: 'inherit', alignItems: 'center' }}>
                        <Box
                            component="img"
                            src="/WordLogo.svg"
                            alt="OnTime"
                            sx={{
                                height: 48,
                                pt: isTauriMobile ? 1.5 : 0,
                            }}
                        />
                    </Link>
                    <Box sx={{ display: { xs: 'none', sm: 'flex' }, flexGrow: 1, alignItems: 'center', gap: 1, justifyContent: 'flex-end' }}>
                        <IconButton
                            color="inherit"
                            onClick={(e) => {
                                setAnchorEl(e.currentTarget as HTMLElement);
                            }}
                            aria-label="open notifications"
                            aria-haspopup="true"
                        >
                            <NotificationsIcon />
                        </IconButton>
                        <ThemeToggler />
                    </Box>
                    <Popover
                        open={Boolean(anchorEl)}
                        anchorEl={anchorEl}
                        onClose={() => setAnchorEl(null)}
                        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
                        PaperProps={{ sx: { p: 0 } }}
                    >
                        <NotificationsList />
                    </Popover>
                </Toolbar>
            </Box>
        </AppBar>
    );
}
