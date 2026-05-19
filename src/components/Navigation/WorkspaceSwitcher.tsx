import { useState, useEffect } from 'react';
import { Button, Menu, MenuItem, ListItemIcon, Typography } from '@mui/material';
import { Check, ExpandMore } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { workspaceService, type Workspace } from '../../services/workspaceService';
import { useWorkspace } from '../../hooks/useWorkspace';

export default function WorkspaceSwitcher() {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
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

  const handleOpen = (e: React.MouseEvent<HTMLElement>) => setAnchorEl(e.currentTarget);
  const handleClose = () => setAnchorEl(null);

  const handleSwitch = (id: string) => {
    handleClose();
    if (id !== workspaceId) navigate(`/w/${id}/timer`);
  };

  return (
    <>
      <Button
        onClick={handleOpen}
        endIcon={<ExpandMore />}
        sx={{
          textTransform: 'none',
          justifyContent: 'flex-start',
          color: 'text.primary',
          px: 0,
          minWidth: 0,
          '&:hover': { background: 'transparent' },
        }}
        disableRipple
      >
        <Typography variant="h5" fontWeight="bold" color="text.primary" noWrap sx={{ maxWidth: 180 }}>
          {activeWorkspace?.name ?? '…'}
        </Typography>
      </Button>
      <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={handleClose}>
        {workspaces.map((ws) => (
          <MenuItem key={ws.id} onClick={() => handleSwitch(ws.id)} selected={ws.id === workspaceId}>
            <ListItemIcon sx={{ minWidth: 32 }}>
              {ws.id === workspaceId && <Check fontSize="small" />}
            </ListItemIcon>
            {ws.name}
          </MenuItem>
        ))}
      </Menu>
    </>
  );
}
