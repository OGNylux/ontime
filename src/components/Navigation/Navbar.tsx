import { useEffect, useState } from 'react';
import { AppBar, Toolbar, Typography, IconButton, Box } from '@mui/material';
import { Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { User } from '@supabase/supabase-js';
import { Menu as MenuIcon } from '@mui/icons-material';
import ThemeToggler from './ThemeToggler';

interface NavbarProps {
    showMenuButton?: boolean;
    onMenuClick?: () => void;
}

export default function Navbar({ showMenuButton = false, onMenuClick }: NavbarProps) {
    const [_, setUser] = useState<User | null>(null);

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
        <AppBar position="fixed" className='shadow-md' sx={{ zIndex: (theme) => theme.zIndex.drawer + 1, bgcolor: 'background.default', color: 'text.primary' }}>
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
                <Box>
                    <ThemeToggler />
                </Box>
            </Toolbar>
        </AppBar>
    );
}
