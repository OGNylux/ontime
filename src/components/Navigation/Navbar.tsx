import { useEffect, useState } from 'react';
import { AppBar, Toolbar, Typography, IconButton, Box } from '@mui/material';
import { Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { User } from '@supabase/supabase-js';
import { Menu as MenuIcon } from '@mui/icons-material';
import ThemeToggler from './ThemeToggler';
import NotificationsIcon from '@mui/icons-material/Notifications';
import Popover from '@mui/material/Popover';
import { NotificationsList } from './NotificationsDialog';

interface NavbarProps {
    showMenuButton?: boolean;
    onMenuClick?: () => void;
}

export default function Navbar({ showMenuButton = false, onMenuClick }: NavbarProps) {
    const [_, setUser] = useState<User | null>(null);
    const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);

    useEffect(() => {
        // Get initial session
        supabase.auth.getUser().then(({ data: { user } }) => {
            setUser(user);
        });

        // Listen for changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setUser(session?.user ?? null);
        });

        return () => subscription.unsubscribe();
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
                        sx={{ mr: 2 }}
                    >
                        <MenuIcon />
                    </IconButton>
                )}
                <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
                    <Link to="/" style={{ textDecoration: 'none' }}>
                        OnTime
                    </Link>
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
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
