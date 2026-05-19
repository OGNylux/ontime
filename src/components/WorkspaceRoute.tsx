import { useRef, useEffect, useCallback, useState } from 'react';
import { useParams, Outlet, Navigate, useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { Box, useMediaQuery, useTheme } from '@mui/material';
import { platform } from '@tauri-apps/plugin-os';
import { WorkspaceContext } from '../hooks/useWorkspace';
import { workspaceService } from '../services/workspaceService';
import { setActiveWorkspaceIdCache, clearWorkspaceCache } from '../services/workspaceContext';
import { supabase } from '../lib/supabase';
import Sidebar from './Navigation/Sidebar';
import BottomAppBar from './Navigation/BottomAppBar';

export default function WorkspaceRoute() {
    const { workspaceId } = useParams<{ workspaceId: string }>();
    const queryClient = useQueryClient();
    const navigate = useNavigate();
    const prevRef = useRef<string | null>(null);
    const muiTheme = useTheme();
    const isSmallDesktop = useMediaQuery(muiTheme.breakpoints.down('lg'));
    const [isTauriMobile, setIsTauriMobile] = useState(false);
    const [sidebarOpen, setSidebarOpen] = useState(false);

    useEffect(() => {
        try {
            const p = platform();
            setIsTauriMobile(p === 'android' || p === 'ios');
        } catch {
            setIsTauriMobile(false);
        }
    }, []);

    // Sync cache immediately so children get the right workspaceId before any query runs
    if (workspaceId && prevRef.current !== workspaceId) {
        if (prevRef.current !== null) queryClient.clear();
        setActiveWorkspaceIdCache(workspaceId);
        prevRef.current = workspaceId;
    }

    const redirectToOwnWorkspace = useCallback(async () => {
        clearWorkspaceCache();
        queryClient.clear();
        try {
            const workspaces = await workspaceService.listMine();
            navigate(workspaces[0] ? `/w/${workspaces[0].id}/timer` : '/login', { replace: true });
        } catch {
            navigate('/login', { replace: true });
        }
    }, [navigate, queryClient]);

    useEffect(() => {
        if (!workspaceId) return;
        let cancelled = false;
        let channel: ReturnType<typeof supabase.channel> | null = null;

        const run = async () => {
            // Validate membership — setActive RPC will fail if the user isn't a member
            try {
                await workspaceService.setActive(workspaceId);
            } catch {
                if (!cancelled) redirectToOwnWorkspace();
                return;
            }

            if (cancelled) return;

            const { data: { user } } = await supabase.auth.getUser();
            if (cancelled || !user) return;

            // Subscribe to membership deletions for this workspace
            channel = supabase
                .channel(`ws-membership-${workspaceId}`)
                .on(
                    'postgres_changes',
                    {
                        event: 'DELETE',
                        schema: 'public',
                        table: 'ontime_workspace_member',
                        filter: `workspace_id=eq.${workspaceId}`,
                    },
                    (payload) => {
                        // payload.old contains the deleted row — check it's this user
                        if ((payload.old as Record<string, unknown>)?.user_id === user.id) {
                            redirectToOwnWorkspace();
                        }
                    }
                )
                .subscribe();
        };

        run();

        return () => {
            cancelled = true;
            if (channel) supabase.removeChannel(channel);
        };
    }, [workspaceId, redirectToOwnWorkspace]);

    if (!workspaceId) return <Navigate to="/" replace />;

    return (
        <WorkspaceContext.Provider value={{ workspaceId }}>
            <Box
                display="flex"
                flexDirection="row"
                pb={isTauriMobile ? '80px' : 0}
                flex={1}
                minHeight={0}
                overflow="hidden"
            >
                {!isTauriMobile && (
                    <Sidebar
                        isDrawer={isSmallDesktop}
                        open={sidebarOpen}
                        onClose={() => setSidebarOpen(false)}
                    />
                )}
                <Box
                    component="main"
                    display="flex"
                    flex={1}
                    flexDirection="column"
                    overflow="auto"
                    minWidth={0}
                    minHeight={0}
                    padding={1.5}
                >
                    <Outlet />
                </Box>
            </Box>
            {isTauriMobile && <BottomAppBar />}
        </WorkspaceContext.Provider>
    );
}
