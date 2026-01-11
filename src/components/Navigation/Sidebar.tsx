import { useState, useEffect, useMemo } from 'react';
import { Drawer, Box, IconButton, Divider, Typography, Theme } from '@mui/material';
import {
  Timer,
  Add,
  ChevronLeft,
  ChevronRight,
  Home,
  Settings,
} from '@mui/icons-material';
import { useNavigate, useLocation } from 'react-router-dom';
import { userService } from '../../services/userService';
import SidebarContent, { NavItem, NavSection } from './SidebarContent';

interface SidebarProps {
  isDrawer?: boolean;
  open?: boolean;
  onClose?: () => void;
}

// Navigation configuration
const NAV_ITEMS: NavItem[] = [
  { label: 'Overview', path: '/overview', icon: <Home /> },
];

const NAV_SECTIONS: NavSection[] = [
  {
    label: 'Timer',
    icon: <Timer />,
    paths: ['/timer'],
    subItems: [
      { label: 'Calendar', path: '/timer', pathMatch: 'exact' }
    ],
  },
  {
    label: 'Create',
    icon: <Add />,
    paths: ['/clients', '/projects', '/tasks'],
    subItems: [
      { label: 'Clients', path: '/clients', pathMatch: 'startsWith' },
      { label: 'Projects', path: '/projects', pathMatch: 'startsWith' },
      { label: 'Tasks', path: '/tasks', pathMatch: 'startsWith' },
    ],
  },
];

const drawerPaperSx = {
  width: 280,
  top: { xs: '56px', md: '64px' },
  height: { xs: 'calc(100% - 56px)', md: 'calc(100% - 64px)' },
  background: (theme: Theme) =>
    `linear-gradient(90deg, ${theme.palette.primary.main} -150%, ${theme.palette.background.default} 70%)`,
  borderTopRightRadius: 12,
  borderBottomRightRadius: 12,
  borderTopLeftRadius: 0,
  borderBottomLeftRadius: 0,
};

export default function Sidebar({ isDrawer = false, open = false, onClose }: SidebarProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const [userName, setUserName] = useState('');
  const [sectionStates, setSectionStates] = useState<Record<string, boolean>>({});

  // Auto-expand sections based on current path
  useEffect(() => {
    const newStates: Record<string, boolean> = {};
    NAV_SECTIONS.forEach((section) => {
      if (section.paths.some((path: string) => location.pathname.startsWith(path))) {
        newStates[section.label] = true;
      }
    });
    setSectionStates((prev) => ({ ...prev, ...newStates }));
  }, [location.pathname]);

  useEffect(() => {
    userService.getCurrentUserName().then((name) => {
      if (name) setUserName(name);
    });
  }, []);

  const handleSectionToggle = (label: string) => {
    if (collapsed) {
      setCollapsed(false);
      setSectionStates((prev) => ({ ...prev, [label]: true }));
    } else {
      setSectionStates((prev) => ({ ...prev, [label]: !prev[label] }));
    }
  };

  const handleNavigate = (path: string) => {
    navigate(path);
    if (isDrawer && onClose) onClose();
  };

  const handleDrawerToggle = () => {
    setCollapsed(!collapsed);
    if (!collapsed) setSectionStates({});
  };

  const sidebarContent = useMemo(
    () => (
      <SidebarContent
        navItems={NAV_ITEMS}
        navSections={NAV_SECTIONS}
        currentPath={location.pathname}
        collapsed={collapsed}
        sectionStates={sectionStates}
        onSectionToggle={handleSectionToggle}
        onNavigate={handleNavigate}
      />
    ),
    [location.pathname, collapsed, sectionStates]
  );

  // Drawer mode (mobile/small screens)
  if (isDrawer) {
    return (
      <Drawer
        variant="temporary"
        open={open}
        onClose={onClose}
        ModalProps={{ keepMounted: true }}
        slotProps={{ paper: { sx: drawerPaperSx } }}
        sx={{ '& .MuiBackdrop-root': { top: { xs: '56px', md: '64px' } } }}
      >
        <Box display="flex" alignItems="center" px={2} py={2}>
          <Typography
            variant="h5"
            fontWeight="bold"
            color="text.primary"
            noWrap
            sx={{
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              maxWidth: '100%',
            }}
          >
            {userName}'s Workspace
          </Typography>
        </Box>
        <Divider />
        <Box display="flex" flexDirection="column" height="100%">
          <Box flex={1} overflow="auto">
            <SidebarContent
              navItems={NAV_ITEMS}
              navSections={NAV_SECTIONS}
              currentPath={location.pathname}
              sectionStates={sectionStates}
              onSectionToggle={(label: string) =>
                setSectionStates((prev) => ({ ...prev, [label]: !prev[label] }))
              }
              onNavigate={handleNavigate}
            />
          </Box>
          <Divider />
          <Box px={1} py={1}>
            <SidebarContent
              navItems={[{ label: 'Settings', path: '/settings', icon: <Settings /> }]}
              navSections={[]}
              currentPath={location.pathname}
              sectionStates={{}}
              onSectionToggle={() => {}}
              onNavigate={handleNavigate}
            />
          </Box>
        </Box>
      </Drawer>
    );
  }

  // Permanent sidebar (desktop)
  return (
    <Drawer
      variant="permanent"
      className={`h-full shrink-0 transition-all duration-300 pb-2 ${collapsed ? 'w-16' : 'w-72'}`}
      slotProps={{
        paper: {
          className: `h-full transition-all duration-300 overflow-x-hidden mt-19 rounded-tr-xl rounded-br-xl ${collapsed ? 'w-16' : 'w-72'}`,
          sx: {
            height: 'calc(100vh - 78px)',
            background: (theme) =>
              `linear-gradient(90deg, ${theme.palette.primary.main} -250%, ${theme.palette.background.default} 70%)`,
            boxShadow: 4,
            borderTopLeftRadius: 0,
            borderBottomLeftRadius: 0,
            borderTopRightRadius: 12,
            borderBottomRightRadius: 12,
          },
        },
      }}
    >
      <Box display="flex" alignItems="center" justifyContent="space-between" px={2} py={2}>
        {!collapsed && (
          <Typography
            variant="h5"
            fontWeight="bold"
            color="text.primary"
            noWrap
            sx={{
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              maxWidth: '100%',
            }}
          >
            {userName}'s Workspace
          </Typography>
        )}
        <IconButton onClick={handleDrawerToggle} sx={{ ml: 1 }}>
          {collapsed ? <ChevronRight /> : <ChevronLeft />}
        </IconButton>
      </Box>
      <Divider />
      <Box display="flex" flexDirection="column" height="100%">
        <Box flex={1} overflow={collapsed ? 'hidden' : 'auto'}>{sidebarContent}</Box>
        <Divider />
        <Box px={1} py={1}>
          <SidebarContent
            navItems={[{ label: 'Settings', path: '/settings', icon: <Settings /> }]}
            navSections={[]}
            currentPath={location.pathname}
            collapsed={collapsed}
            sectionStates={{}}
            onSectionToggle={() => {}}
            onNavigate={handleNavigate}
          />
        </Box>
      </Box>
    </Drawer>
  );
}
