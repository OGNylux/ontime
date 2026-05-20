import { useState, useEffect } from 'react';
import { Box, Collapse, List, ListItemButton, ListItemText, Typography } from '@mui/material';
import { ExpandLess, ExpandMore } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { workspaceService, type Workspace } from '../../services/workspaceService';
import { useWorkspace } from '../../hooks/useWorkspace';
import TreeConnector from './TreeConnector';
import { is } from 'zod/v4/locales';

export default function WorkspaceSwitcher() {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const { workspaceId } = useWorkspace();

  useEffect(() => {
    let cancelled = false;
    workspaceService.listMine()
      .then((ws) => { if (!cancelled) setWorkspaces(ws); })
      .catch((err) => console.error('Failed to load workspaces:', err));
    return () => { cancelled = true; };
  }, []);

  const activeWorkspace = workspaces.find((w) => w.id === workspaceId);

  const handleSwitch = (id: string) => {
    setOpen(false);
    if (id !== workspaceId) navigate(`/w/${id}/timer`);
  };

  return (
    <Box mb={2}>
      <ListItemButton
        onClick={() => setOpen((prev) => !prev)}
        sx={{
          bgcolor: 'background.default',
          borderRadius: 2,
          borderBottom: 3,
          borderColor: 'primary.main',
          mx: 1,
          mt: 1,
          '&:hover': { bgcolor: 'action.hover' },
        }}
      >
        <ListItemText
          primary={
            <Typography variant="h6" fontWeight="bold" noWrap>
              {activeWorkspace?.name ?? '...'}
            </Typography>
          }
        />
        {open ? <ExpandLess /> : <ExpandMore />}
      </ListItemButton>

      <Collapse in={open} timeout="auto" unmountOnExit>
        <List component="div" disablePadding>
          {workspaces.map((ws, index) => {
            const isActive = ws.id === workspaceId;
            const isLast = index === workspaces.length - 1;
            const hasActiveBelow = workspaces.slice(index + 1).some((w) => w.id === workspaceId);
            return (
              <Box
                key={ws.id}
                sx={{ display: 'flex', alignItems: 'center', px: 1, my: 0.5 }}
              >
                <TreeConnector
                  isLast={isLast}
                  isActive={isActive}
                  hasActiveBelow={hasActiveBelow}
                />
                <ListItemButton
                  onClick={() => handleSwitch(ws.id)}
                  sx={{
                    flex: 1,
                    bgcolor: isActive ? 'primary.main' : 'transparent',
                    borderRadius: 2,
                    '&:hover': {
                      bgcolor: isActive ? 'primary.dark' : 'action.hover',
                    },
                  }}
                >
                  <ListItemText
                    primary={ws.name}
                    sx={{ color: isActive ? 'primary.contrastText' : 'text.primary' }}
                  />
                </ListItemButton>
              </Box>
            );
          })}
        </List>
      </Collapse>
    </Box>
  );
}
