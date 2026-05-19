import { useState, useEffect, useMemo } from 'react';
import { Drawer, Box, IconButton, Divider, Theme, Badge } from '@mui/material';
import {
  Timer,
  Add,
  ChevronLeft,
  ChevronRight,
  Home,
  Settings,
  Notifications as NotificationsIcon,
} from '@mui/icons-material';
import { useNavigate, useLocation } from 'react-router-dom';
import SidebarContent, { NavItem, NavSection } from './SidebarContent';
import WorkspaceSwitcher from './WorkspaceSwitcher';
import { useNotificationsContext } from '../../hooks/useNotifications';
import { useWorkspace } from '../../hooks/useWorkspace';

interface SidebarProps {
  isDrawer?: boolean;
  open?: boolean;
  onClose?: () => void;
}

const drawerPaperSx = {
  width: 280,
  top: { xs: '56px', md: '64px' },
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
  const [sectionStates, setSectionStates] = useState<Record<string, boolean>>({});
  const { unreadCount } = useNotificationsContext();
  const { path } = useWorkspace();

  const NAV_ITEMS: NavItem[] = [
    { label: 'Overview', path: path('/overview'), icon: <Home /> },
    { label: 'Calendar', path: path('/timer'), icon: <Timer /> },
  ];

  const NAV_SECTIONS: NavSection[] = [
    {
      label: 'Create',
      icon: <Add />,
      paths: [path('/clients'), path('/projects'), path('/tasks'), path('/invoices')],
      subItems: [
        { label: 'Clients', path: path('/clients'), pathMatch: 'startsWith' },
        { label: 'Projects', path: path('/projects'), pathMatch: 'startsWith' },
        { label: 'Tasks', path: path('/tasks'), pathMatch: 'startsWith' },
        { label: 'Invoices', path: path('/invoices'), pathMatch: 'startsWith' },
      ],
    },
  ];

  useEffect(() => {
    const newStates: Record<string, boolean> = {};
    NAV_SECTIONS.forEach((section) => {
      if (section.paths.some((path: string) => location.pathname.startsWith(path))) {
        newStates[section.label] = true;
      }
    });
    setSectionStates((prev) => ({ ...prev, ...newStates }));
  }, [location.pathname]);

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

  const bottomNavItems: NavItem[] = [
    {
      label: 'Notifications',
      path: path('/notifications'),
      icon: (
        <Badge badgeContent={unreadCount > 0 ? unreadCount : undefined} color="error" max={99}>
          <NotificationsIcon />
        </Badge>
      ),
    },
    { label: 'Settings', path: path('/settings'), icon: <Settings /> },
  ];

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

  if (isDrawer) {
    return (
      <Drawer
        variant="temporary"
        open={open}
        onClose={onClose}
        ModalProps={{ keepMounted: true }}
        slotProps={{ paper: { sx: drawerPaperSx } }}
      >
        <Box display="flex" alignItems="center" px={2} py={2}>
          <WorkspaceSwitcher />
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
          <Box px={0} py={1}>
            <SidebarContent
              navItems={bottomNavItems}
              navSections={[]}
              currentPath={location.pathname}
              sectionStates={{}}
              onSectionToggle={() => { }}
              onNavigate={handleNavigate}
            />
          </Box>
        </Box>
      </Drawer>
    );
  }

  return (
    <Drawer
      variant="permanent"
      className={`h-full shrink-0 transition-all duration-300 pb-2 ${collapsed ? 'w-16' : 'w-72'}`}
      slotProps={{
        paper: {
          className: `h-full transition-all duration-300 overflow-x-hidden rounded-tr-xl rounded-br-xl ${collapsed ? 'w-16' : 'w-72'}`,
          sx: {
            height: '100%',
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
        {!collapsed && <WorkspaceSwitcher />}
        <IconButton onClick={handleDrawerToggle} sx={{ ml: 1 }}>
          {collapsed ? <ChevronRight /> : <ChevronLeft />}
        </IconButton>
      </Box>
      <Divider />
      <Box display="flex" flexDirection="column" height="100%">
        <Box flex={1} overflow={collapsed ? 'hidden' : 'auto'}>{sidebarContent}</Box>
        <Divider />
        <Box py={1}>
          <SidebarContent
            navItems={bottomNavItems}
            navSections={[]}
            currentPath={location.pathname}
            collapsed={collapsed}
            sectionStates={{}}
            onSectionToggle={() => { }}
            onNavigate={handleNavigate}
          />
        </Box>
      </Box>
    </Drawer>
  );
}
