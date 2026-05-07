import { useState, useEffect } from 'react';
import { Button, Menu, MenuItem, ListItemIcon, Typography, CircularProgress } from '@mui/material';
import { Check, ExpandMore } from '@mui/icons-material';
import { workspaceService, type Workspace } from '../../services/workspaceService';
import { getActiveWorkspaceId } from '../../services/workspaceContext';

export default function WorkspaceSwitcher() {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const [switching, setSwitching] = useState(false);

  useEffect(() => {
    let cancelled = false;
    Promise.all([workspaceService.listMine(), getActiveWorkspaceId()])
      .then(([ws, id]) => {
        if (cancelled) return;
        setWorkspaces(ws);
        setActiveId(id);
      })
      .catch((err) => {
        console.error('Failed to load workspaces:', err);
      });
    return () => { cancelled = true; };
  }, []);

  const activeWorkspace = workspaces.find((w) => w.id === activeId);

  const handleOpen = (e: React.MouseEvent<HTMLElement>) => setAnchorEl(e.currentTarget);
  const handleClose = () => setAnchorEl(null);

  const handleSwitch = async (id: string) => {
    if (id === activeId) { handleClose(); return; }
    setSwitching(true);
    try {
      await workspaceService.setActive(id);
      window.location.reload();
    } catch (err) {
      console.error('Failed to switch workspace:', err);
      setSwitching(false);
      handleClose();
    }
  };

  return (
    <>
      <Button
        onClick={handleOpen}
        endIcon={switching ? <CircularProgress size={14} color="inherit" /> : <ExpandMore />}
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
          <MenuItem key={ws.id} onClick={() => handleSwitch(ws.id)} selected={ws.id === activeId}>
            <ListItemIcon sx={{ minWidth: 32 }}>
              {ws.id === activeId && <Check fontSize="small" />}
            </ListItemIcon>
            {ws.name}
          </MenuItem>
        ))}
      </Menu>
    </>
  );
}
